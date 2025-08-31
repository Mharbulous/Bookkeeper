import { getGenerativeModel } from 'firebase/ai';
import { firebaseAI } from '../../../services/firebase.js';

/**
 * AI Processing Service - Handles AI-powered document categorization using Firebase Vertex AI
 * Provides core AI operations, content generation, and prompt handling
 */
export class AIProcessingService {
  constructor() {
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
   * Validate file size against maximum allowed
   * @param {Object} evidence - Evidence document
   * @returns {void} - Throws error if file size exceeds limit
   */
  validateFileSize(evidence) {
    const fileSizeMB = (evidence.fileSize || 0) / (1024 * 1024);
    if (fileSizeMB > this.maxFileSizeMB) {
      throw new Error(`File size (${fileSizeMB.toFixed(1)}MB) exceeds maximum allowed (${this.maxFileSizeMB}MB)`);
    }
  }

  /**
   * Generate tag suggestions using Firebase Vertex AI
   * @param {string} base64Data - Base64 encoded file content
   * @param {Array} categories - User's categories
   * @param {Object} evidence - Evidence document
   * @param {string} extension - File extension as fallback for MIME type
   * @returns {Promise<Array>} - Array of suggested tags
   */
  async generateTagSuggestions(base64Data, categories, evidence, extension = 'pdf') {
    try {
      if (!firebaseAI) {
        throw new Error('Firebase AI Logic not initialized');
      }

      // Get Gemini model
      const model = getGenerativeModel(firebaseAI, { model: 'gemini-1.5-flash' });

      console.log('[AIProcessingService] Using full document content analysis');

      // Build category context for AI
      const categoryContext = categories.map(cat => {
        const tagList = cat.tags.map(tag => tag.name).join(', ');
        return `Category "${cat.name}": ${tagList || 'No existing tags'}`;
      }).join('\n');

      console.log(`[AIProcessingService] DEBUG: Sending ${categories.length} categories to AI:`);
      categories.forEach(cat => {
        console.log(`  - ${cat.name}: [${cat.tags.map(tag => tag.name).join(', ')}]`);
      });

      // Create AI prompt
      const prompt = this.createTagSuggestionPrompt(categoryContext, evidence);

      // Get MIME type with fallback to passed extension
      let mimeType = this.getMimeType(evidence.displayName);
      if (mimeType === 'application/octet-stream') {
        // Use passed extension as fallback
        mimeType = this.getMimeType(`dummy.${extension}`);
      }
      console.log(`[AIProcessingService] File: ${evidence.displayName}, Extension: ${extension}, MIME type: ${mimeType}`);
      
      // Generate AI response using inline data (full content analysis)
      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { mimeType: mimeType, data: base64Data } }
      ]);

      const response = await result.response;
      const text = response.text();

      console.log(`[AIProcessingService] DEBUG: Raw AI response:`, text);

      // Parse AI response
      const parsedSuggestions = this.parseAIResponse(text, categories);
      console.log(`[AIProcessingService] DEBUG: Parsed ${parsedSuggestions.length} suggestions:`);
      parsedSuggestions.forEach(suggestion => {
        console.log(`  - ${suggestion.categoryName}: ${suggestion.tagName} (confidence: ${suggestion.confidence})`);
      });

      return parsedSuggestions;

    } catch (error) {
      console.error('[AIProcessingService] Failed to generate AI suggestions:', error);
      throw error;
    }
  }

  /**
   * Create AI prompt for tag suggestions
   * @param {string} categoryContext - Formatted category and tag context
   * @param {Object} evidence - Evidence document
   * @returns {string} - Formatted prompt for AI
   */
  createTagSuggestionPrompt(categoryContext, evidence) {
    return `
You are a document categorization assistant. Analyze the provided document and suggest appropriate tags from the existing category structure.

Available Categories and Tags:
${categoryContext}

Document Information:
- Filename: ${evidence.displayName || 'Unknown'}
- File Size: ${((evidence.fileSize || 0) / 1024).toFixed(1)} KB

Instructions:
1. Analyze the document content carefully
2. Try to suggest at least one tag from EACH category when applicable
3. ONLY suggest tags that exist within the provided categories
4. If a category has no existing tags, you may suggest new tag names that fit that category
5. Return suggestions as JSON array in this format:
[
  {
    "categoryId": "category-id",
    "categoryName": "Category Name",
    "tagName": "Suggested Tag",
    "confidence": 0.85,
    "reasoning": "Brief explanation"
  }
]
6. Limit to maximum 5 suggestions
7. Only suggest tags with confidence > 0.7

Please analyze the document and provide tag suggestions:
`;
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

      console.log(`[AIProcessingService] DEBUG: Raw suggestions from AI: ${suggestions.length}`);
      suggestions.forEach(suggestion => {
        console.log(`  - Raw: ${suggestion.categoryName} → ${suggestion.tagName}`);
      });

      for (const suggestion of suggestions) {
        // Validate suggestion structure
        if (!suggestion.categoryName || !suggestion.tagName) {
          console.log(`[AIProcessingService] DEBUG: Skipped invalid suggestion:`, suggestion);
          continue;
        }

        // Find matching category
        const category = categories.find(cat => 
          cat.name.toLowerCase() === suggestion.categoryName.toLowerCase()
        );

        if (!category) {
          console.log(`[AIProcessingService] DEBUG: Skipped - category not found: "${suggestion.categoryName}"`);
          continue;
        }

        // Create validated suggestion using categoryId as constraint (no separate tagId needed)
        validatedSuggestions.push({
          categoryId: category.id,
          categoryName: category.name,
          tagName: suggestion.tagName.trim(),
          // Removed color field - use category color as single source of truth
          confidence: Math.min(suggestion.confidence || 0.8, 1.0),
          reasoning: suggestion.reasoning || 'AI suggested',
          suggestedAt: new Date(),
          status: 'suggested'
        });
      }

      return validatedSuggestions.slice(0, 5); // Limit to 5 suggestions
    } catch (error) {
      console.error('[AIProcessingService] Failed to parse AI response:', error);
      return [];
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
      'pdf': 'application/pdf', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
      'png': 'image/png', 'gif': 'image/gif', 'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

export default AIProcessingService;