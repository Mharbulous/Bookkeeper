import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { getGenerativeModel } from 'firebase/ai';
import { db, storage, firebaseAI } from '../../../services/firebase.js';
import { useAuthStore } from '../../../core/stores/auth.js';
import { useCategoryStore } from '../stores/categoryStore.js';

/**
 * AI Tag Service - Handles AI-powered document categorization using Firebase Vertex AI
 * Provides single document processing with manual triggers and approval workflow
 */
export class AITagService {
  constructor(teamId = null) {
    this.teamId = teamId;
    this.maxFileSizeMB = parseInt(import.meta.env.VITE_AI_MAX_FILE_SIZE_MB || '20');
  }

  /**
   * Check if AI features are enabled and properly configured
   * @returns {boolean} - True if AI features are available
   */
  isAIEnabled() {
    return (
      import.meta.env.VITE_ENABLE_AI_FEATURES === 'true' &&
      firebaseAI !== null
    );
  }

  /**
   * Get the current team ID from auth store if not provided in constructor
   * @returns {string} - Current team ID
   */
  getTeamId() {
    if (this.teamId) {
      return this.teamId;
    }
    
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) {
      throw new Error('User not authenticated');
    }
    
    return authStore.currentTeam;
  }

  /**
   * Process a single document with AI to suggest tags within existing categories
   * @param {string} evidenceId - Evidence document ID
   * @returns {Promise<Object>} - Processing result with suggested tags
   */
  async processSingleDocument(evidenceId) {
    try {
      if (!this.isAIEnabled()) {
        throw new Error('AI features are not enabled or properly configured');
      }

      const teamId = this.getTeamId();
      
      // Get evidence document
      const evidence = await this.getEvidenceDocument(evidenceId, teamId);
      if (!evidence) {
        throw new Error(`Evidence document not found: ${evidenceId}`);
      }

      // Validate file size
      const fileSizeMB = (evidence.fileSize || 0) / (1024 * 1024);
      if (fileSizeMB > this.maxFileSizeMB) {
        throw new Error(`File size (${fileSizeMB.toFixed(1)}MB) exceeds maximum allowed (${this.maxFileSizeMB}MB)`);
      }

      // Get file content from Firebase Storage
      const fileContent = await this.getFileForProcessing(evidence);
      
      // Get user's categories for AI context
      const categories = await this.getUserCategories(teamId);
      if (categories.length === 0) {
        throw new Error('No categories found. Please create categories before using AI tagging.');
      }

      // Generate AI suggestions
      const aiSuggestions = await this.generateTagSuggestions(fileContent, categories, evidence);

      // Store AI suggestions in evidence document
      await this.storeAISuggestions(evidenceId, teamId, aiSuggestions);

      console.log(`[AITagService] Processed document ${evidenceId}: ${aiSuggestions.length} suggestions`);

      return {
        success: true,
        evidenceId,
        suggestedTags: aiSuggestions,
        processedAt: new Date(),
        categories: categories.length
      };

    } catch (error) {
      console.error('[AITagService] Failed to process document:', error);
      throw error;
    }
  }

  /**
   * Get evidence document from Firestore
   * @param {string} evidenceId - Evidence document ID
   * @param {string} teamId - Team ID
   * @returns {Promise<Object|null>} - Evidence document or null
   */
  async getEvidenceDocument(evidenceId, teamId) {
    try {
      const evidenceRef = doc(db, 'teams', teamId, 'evidence', evidenceId);
      const evidenceSnap = await getDoc(evidenceRef);
      
      if (evidenceSnap.exists()) {
        return {
          id: evidenceSnap.id,
          ...evidenceSnap.data()
        };
      }
      
      return null;
    } catch (error) {
      console.error('[AITagService] Failed to get evidence document:', error);
      throw error;
    }
  }

  /**
   * Retrieve file content from Firebase Storage for AI processing
   * @param {Object} evidence - Evidence document
   * @returns {Promise<string>} - File download URL for AI processing
   */
  async getFileForProcessing(evidence) {
    try {
      if (!evidence.storageRef?.fileHash) {
        throw new Error('No file hash found in evidence document');
      }

      // Get file extension from displayName
      const displayName = evidence.displayName || '';
      const extension = displayName.split('.').pop()?.toLowerCase() || 'pdf';

      // Get file from actual storage path: teams/{teamId}/matters/{matterId}/uploads/{fileHash}.{ext}
      const teamId = this.getTeamId();
      
      // For now, assume files are in the 'general' matter
      // TODO: Extract actual matter ID from evidence if available
      const matterId = 'general';
      
      // Use the actual storage path format with extension
      const storagePath = `teams/${teamId}/matters/${matterId}/uploads/${evidence.storageRef.fileHash}.${extension}`;
      const fileRef = ref(storage, storagePath);
      const downloadURL = await getDownloadURL(fileRef);
      
      console.log(`[AITagService] Found file at: ${storagePath}`);
      return downloadURL;
    } catch (error) {
      console.error('[AITagService] Failed to get file for processing:', error);
      throw error;
    }
  }

  /**
   * Get user's categories to provide context for AI suggestions
   * @param {string} teamId - Team ID
   * @returns {Promise<Array>} - Array of category objects
   */
  async getUserCategories(teamId) {
    try {
      const categoryStore = useCategoryStore();
      
      // Initialize categories if not loaded
      if (!categoryStore.isInitialized) {
        await categoryStore.loadCategories();
      }

      return categoryStore.categories.map(category => ({
        id: category.id,
        name: category.name,
        color: category.color,
        tags: category.tags || []
      }));
    } catch (error) {
      console.error('[AITagService] Failed to get user categories:', error);
      throw error;
    }
  }

  /**
   * Generate tag suggestions using Firebase Vertex AI
   * @param {string} fileUrl - File download URL
   * @param {Array} categories - User's categories
   * @param {Object} evidence - Evidence document
   * @returns {Promise<Array>} - Array of suggested tags
   */
  async generateTagSuggestions(fileUrl, categories, evidence) {
    try {
      if (!firebaseAI) {
        throw new Error('Firebase AI Logic not initialized');
      }

      // Get Gemini model
      const model = getGenerativeModel(firebaseAI, { model: 'gemini-1.5-flash' });

      // Fetch file content as base64 for Gemini Developer API
      const fileBlob = await fetch(fileUrl).then(r => r.blob());
      const arrayBuffer = await fileBlob.arrayBuffer();
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Build category context for AI
      const categoryContext = categories.map(cat => {
        const tagList = cat.tags.map(tag => tag.name).join(', ');
        return `Category "${cat.name}": ${tagList || 'No existing tags'}`;
      }).join('\n');

      // Create AI prompt
      const prompt = `
You are a document categorization assistant. Analyze the provided document and suggest appropriate tags from the existing category structure.

Available Categories and Tags:
${categoryContext}

Document Information:
- Filename: ${evidence.displayName || 'Unknown'}
- File Size: ${((evidence.fileSize || 0) / 1024).toFixed(1)} KB

Instructions:
1. Analyze the document content carefully
2. ONLY suggest tags that exist within the provided categories
3. If a category has no existing tags, you may suggest new tag names that fit that category
4. Return suggestions as JSON array in this format:
[
  {
    "categoryId": "category-id",
    "categoryName": "Category Name",
    "tagName": "Suggested Tag",
    "confidence": 0.85,
    "reasoning": "Brief explanation"
  }
]
5. Limit to maximum 5 suggestions
6. Only suggest tags with confidence > 0.7

Please analyze the document and provide tag suggestions:
`;

      // Generate AI response using inline data instead of fileUri
      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { mimeType: this.getMimeType(evidence.displayName), data: base64Data } }
      ]);

      const response = await result.response;
      const text = response.text();

      // Parse AI response
      return this.parseAIResponse(text, categories);

    } catch (error) {
      console.error('[AITagService] Failed to generate AI suggestions:', error);
      throw error;
    }
  }

  /**
   * Parse AI response and validate suggestions
   * @param {string} aiResponse - AI response text
   * @param {Array} categories - Available categories
   * @returns {Array} - Validated suggested tags
   */
  parseAIResponse(aiResponse, categories) {
    try {
      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      const suggestions = JSON.parse(jsonMatch[0]);
      const validatedSuggestions = [];

      for (const suggestion of suggestions) {
        // Validate suggestion structure
        if (!suggestion.categoryName || !suggestion.tagName) {
          continue;
        }

        // Find matching category
        const category = categories.find(cat => 
          cat.name.toLowerCase() === suggestion.categoryName.toLowerCase()
        );

        if (!category) {
          continue;
        }

        // Create validated suggestion
        validatedSuggestions.push({
          categoryId: category.id,
          categoryName: category.name,
          tagName: suggestion.tagName.trim(),
          color: category.color,
          confidence: Math.min(suggestion.confidence || 0.8, 1.0),
          reasoning: suggestion.reasoning || 'AI suggested',
          suggestedAt: new Date(),
          status: 'suggested'
        });
      }

      return validatedSuggestions.slice(0, 5); // Limit to 5 suggestions
    } catch (error) {
      console.error('[AITagService] Failed to parse AI response:', error);
      return [];
    }
  }

  /**
   * Store AI suggestions in evidence document
   * @param {string} evidenceId - Evidence document ID
   * @param {string} teamId - Team ID
   * @param {Array} suggestions - AI tag suggestions
   * @returns {Promise<void>}
   */
  async storeAISuggestions(evidenceId, teamId, suggestions) {
    try {
      const evidenceRef = doc(db, 'teams', teamId, 'evidence', evidenceId);
      
      await updateDoc(evidenceRef, {
        tagsByAI: suggestions,
        lastAIProcessed: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log(`[AITagService] Stored ${suggestions.length} AI suggestions for ${evidenceId}`);
    } catch (error) {
      console.error('[AITagService] Failed to store AI suggestions:', error);
      throw error;
    }
  }

  /**
   * Get MIME type from filename
   * @param {string} filename - File name
   * @returns {string} - MIME type
   */
  getMimeType(filename) {
    if (!filename) return 'application/octet-stream';
    
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Approve an AI suggested tag - moves it from tagsByAI to tagsByHuman
   * @param {string} evidenceId - Evidence document ID
   * @param {Object} aiTag - AI tag to approve
   * @returns {Promise<Object>} - Operation result
   */
  async approveAITag(evidenceId, aiTag) {
    try {
      const teamId = this.getTeamId();
      const evidenceRef = doc(db, 'teams', teamId, 'evidence', evidenceId);
      
      // Get current evidence document
      const evidenceSnap = await getDoc(evidenceRef);
      if (!evidenceSnap.exists()) {
        throw new Error(`Evidence document not found: ${evidenceId}`);
      }

      const evidenceData = evidenceSnap.data();
      const tagsByAI = evidenceData.tagsByAI || [];
      const tagsByHuman = evidenceData.tagsByHuman || [];

      // Find the AI tag to approve
      const aiTagIndex = tagsByAI.findIndex(tag => 
        tag.categoryId === aiTag.categoryId && tag.tagName === aiTag.tagName
      );

      if (aiTagIndex === -1) {
        throw new Error('AI tag not found in document');
      }

      // Create human tag from AI tag
      const approvedTag = {
        categoryId: aiTag.categoryId,
        categoryName: aiTag.categoryName,
        tagId: aiTag.tagId || `tag-${Date.now()}`, // Generate ID if not present
        tagName: aiTag.tagName,
        color: aiTag.color,
        approvedAt: serverTimestamp(),
        originallyFromAI: true // Track that this was originally an AI suggestion
      };

      // Update the AI tag status to approved
      const updatedAITags = [...tagsByAI];
      updatedAITags[aiTagIndex] = {
        ...updatedAITags[aiTagIndex],
        status: 'approved',
        approvedAt: serverTimestamp()
      };

      // Add to human tags
      const updatedHumanTags = [...tagsByHuman, approvedTag];

      // Update document
      await updateDoc(evidenceRef, {
        tagsByAI: updatedAITags,
        tagsByHuman: updatedHumanTags,
        updatedAt: serverTimestamp()
      });

      console.log(`[AITagService] Approved AI tag: ${aiTag.tagName} for ${evidenceId}`);

      return {
        success: true,
        approvedTag,
        evidenceId
      };

    } catch (error) {
      console.error('[AITagService] Failed to approve AI tag:', error);
      throw error;
    }
  }

  /**
   * Reject an AI suggested tag - updates its status to rejected
   * @param {string} evidenceId - Evidence document ID  
   * @param {Object} aiTag - AI tag to reject
   * @returns {Promise<Object>} - Operation result
   */
  async rejectAITag(evidenceId, aiTag) {
    try {
      const teamId = this.getTeamId();
      const evidenceRef = doc(db, 'teams', teamId, 'evidence', evidenceId);
      
      // Get current evidence document
      const evidenceSnap = await getDoc(evidenceRef);
      if (!evidenceSnap.exists()) {
        throw new Error(`Evidence document not found: ${evidenceId}`);
      }

      const evidenceData = evidenceSnap.data();
      const tagsByAI = evidenceData.tagsByAI || [];

      // Find the AI tag to reject
      const aiTagIndex = tagsByAI.findIndex(tag => 
        tag.categoryId === aiTag.categoryId && tag.tagName === aiTag.tagName
      );

      if (aiTagIndex === -1) {
        throw new Error('AI tag not found in document');
      }

      // Update the AI tag status to rejected
      const updatedAITags = [...tagsByAI];
      updatedAITags[aiTagIndex] = {
        ...updatedAITags[aiTagIndex],
        status: 'rejected',
        rejectedAt: serverTimestamp()
      };

      // Update document
      await updateDoc(evidenceRef, {
        tagsByAI: updatedAITags,
        updatedAt: serverTimestamp()
      });

      console.log(`[AITagService] Rejected AI tag: ${aiTag.tagName} for ${evidenceId}`);

      return {
        success: true,
        rejectedTag: aiTag,
        evidenceId
      };

    } catch (error) {
      console.error('[AITagService] Failed to reject AI tag:', error);
      throw error;
    }
  }

  /**
   * Process review changes from the AI review modal
   * @param {string} evidenceId - Evidence document ID
   * @param {Object} changes - Changes object with approved and rejected arrays
   * @returns {Promise<Object>} - Operation result
   */
  async processReviewChanges(evidenceId, changes) {
    try {
      const { approved = [], rejected = [] } = changes;
      const results = {
        approvedCount: 0,
        rejectedCount: 0,
        errors: []
      };

      // Process approvals and rejections sequentially to avoid conflicts
      for (const aiTag of approved) {
        try {
          await this.approveAITag(evidenceId, aiTag);
          results.approvedCount++;
        } catch (error) {
          console.error(`Failed to approve tag ${aiTag.tagName}:`, error);
          results.errors.push({ tag: aiTag, error: error.message, action: 'approve' });
        }
      }

      for (const aiTag of rejected) {
        try {
          await this.rejectAITag(evidenceId, aiTag);
          results.rejectedCount++;
        } catch (error) {
          console.error(`Failed to reject tag ${aiTag.tagName}:`, error);
          results.errors.push({ tag: aiTag, error: error.message, action: 'reject' });
        }
      }

      console.log(`[AITagService] Processed review changes: ${results.approvedCount} approved, ${results.rejectedCount} rejected`);

      return {
        success: true,
        results,
        evidenceId
      };

    } catch (error) {
      console.error('[AITagService] Failed to process review changes:', error);
      throw error;
    }
  }
}

export default AITagService;