import { useAuthStore } from '../../../core/stores/auth.js';
import { AIProcessingService } from './aiProcessingService.js';
import { EvidenceDocumentService } from './evidenceDocumentService.js';
import { TagOperationService } from './tagOperationService.js';
import { FileProcessingService } from './fileProcessingService.js';
import tagSubcollectionService from './tagSubcollectionService.js';

/**
 * AI Tag Service - Handles AI-powered document categorization using Firebase Vertex AI
 * Orchestrates between specialized services for single document processing with confidence-based auto-approval
 * Uses subcollection-based tag storage for improved scalability and performance
 */
export class AITagService {
  constructor(teamId = null) {
    this.teamId = teamId;
    this.aiProcessingService = new AIProcessingService();
    this.evidenceService = new EvidenceDocumentService(teamId);
    this.tagOperationService = new TagOperationService(teamId);
    this.fileProcessingService = new FileProcessingService(teamId);
  }

  /**
   * Check if AI features are enabled and properly configured
   * @returns {boolean} - True if AI features are available
   */
  isAIEnabled() {
    return this.aiProcessingService.isAIEnabled();
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
   * Process a single document with AI to suggest tags with confidence-based auto-approval
   * @param {string} evidenceId - Evidence document ID
   * @returns {Promise<Object>} - Processing result with suggested tags and approval stats
   */
  async processSingleDocument(evidenceId) {
    try {
      if (!this.isAIEnabled()) {
        throw new Error('AI features are not enabled or properly configured');
      }

      const teamId = this.getTeamId();
      
      // Get evidence document
      const evidence = await this.evidenceService.getEvidenceDocumentWithValidation(evidenceId, teamId);

      // Validate file size
      this.aiProcessingService.validateFileSize(evidence);

      // Get file content from Firebase Storage
      const fileContent = await this.fileProcessingService.getFileForProcessing(evidence, teamId);
      
      // Get user's categories for AI context
      const categories = await this.evidenceService.validateAndGetCategories(teamId);

      // Generate AI suggestions (pass file extension as fallback)
      const extension = this.fileProcessingService.getFileExtension(evidence);
      const aiSuggestions = await this.aiProcessingService.generateTagSuggestions(fileContent, categories, evidence, extension);

      // Store AI suggestions in subcollection with confidence-based auto-approval
      const storedTags = await this.storeAISuggestionsWithConfidence(evidenceId, aiSuggestions);

      // Get approval statistics
      const stats = await tagSubcollectionService.getTagStats(evidenceId, teamId);

      console.log(`[AITagService] Processed document ${evidenceId}: ${aiSuggestions.length} suggestions, ${stats.autoApproved} auto-approved`);

      return {
        success: true,
        evidenceId,
        suggestedTags: storedTags,
        stats,
        processedAt: new Date(),
        categories: categories.length,
        autoApprovalThreshold: tagSubcollectionService.getConfidenceThreshold()
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
    return this.evidenceService.getEvidenceDocument(evidenceId, teamId);
  }

  /**
   * Retrieve file content from Firebase Storage for AI processing
   * @param {Object} evidence - Evidence document
   * @returns {Promise<string>} - Base64 encoded file content for AI processing
   */
  async getFileForProcessing(evidence) {
    const teamId = this.getTeamId();
    return this.fileProcessingService.getFileForProcessing(evidence, teamId);
  }

  /**
   * Get user's categories to provide context for AI suggestions
   * @param {string} teamId - Team ID
   * @returns {Promise<Array>} - Array of category objects
   */
  async getUserCategories(teamId) {
    return this.evidenceService.getUserCategories(teamId);
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
    return this.aiProcessingService.generateTagSuggestions(base64Data, categories, evidence, extension);
  }

  /**
   * Parse AI response and validate suggestions
   * @param {string} aiResponse - AI response text
   * @param {Array} categories - Available categories
   * @returns {Array} - Validated suggested tags
   */
  parseAIResponse(aiResponse, categories) {
    return this.aiProcessingService.parseAIResponse(aiResponse, categories);
  }

  /**
   * Store AI suggestions in subcollection with confidence-based approval
   * @param {string} evidenceId - Evidence document ID
   * @param {Array} suggestions - AI tag suggestions with confidence scores
   * @returns {Promise<Array>} - Array of stored tag documents
   */
  async storeAISuggestionsWithConfidence(evidenceId, suggestions) {
    try {
      const teamId = this.getTeamId();
      
      // Transform suggestions to include confidence and metadata with proper constraint fields
      const tagData = suggestions.map(suggestion => {
        // Convert decimal confidence (0.9) to percentage (90)
        let confidence = suggestion.confidence || 0;
        if (confidence <= 1) {
          confidence = Math.round(confidence * 100);
        } else {
          confidence = Math.round(confidence);
        }
        
        // Determine auto-approval based on confidence threshold
        const autoApproved = confidence >= tagSubcollectionService.getConfidenceThreshold();
        
        return {
          categoryId: suggestion.categoryId,           // Required for constraint-based deduplication
          categoryName: suggestion.categoryName,       // Category display name
          tagName: suggestion.tagName || suggestion.name,
          // Removed color field - use category color as single source of truth
          confidence: confidence,
          source: 'ai',
          autoApproved: autoApproved,
          reviewRequired: !autoApproved,               // High confidence tags don't need review
          createdBy: this.getTeamId(),                 // Use team ID as creator for AI tags
          metadata: {
            model: 'gemini-pro',                       // Updated to match actual model
            processingTime: suggestion.processingTime || 0,
            context: suggestion.reasoning || ''
          }
        };
      });

      // Store tags in subcollection (auto-approval handled by service)
      const storedTags = await tagSubcollectionService.addTagsBatch(evidenceId, tagData, teamId);
      
      return storedTags;
    } catch (error) {
      console.error('[AITagService] Error storing AI suggestions:', error);
      throw error;
    }
  }

  /**
   * Store AI suggestions in evidence document (legacy method for compatibility)
   * @param {string} evidenceId - Evidence document ID
   * @param {string} teamId - Team ID
   * @param {Array} suggestions - AI tag suggestions
   * @returns {Promise<void>}
   */
  async storeAISuggestions(evidenceId, teamId, suggestions) {
    return this.evidenceService.storeAISuggestions(evidenceId, teamId, suggestions);
  }

  /**
   * Get MIME type from filename
   * @param {string} filename - File name
   * @returns {string} - MIME type
   */
  getMimeType(filename) {
    return this.aiProcessingService.getMimeType(filename);
  }

  /**
   * Get all tags for a document grouped by status
   * @param {string} evidenceId - Evidence document ID
   * @returns {Promise<Object>} - Tags grouped by status (pending, approved, rejected)
   */
  async getTagsByStatus(evidenceId) {
    const teamId = this.getTeamId();
    return tagSubcollectionService.getTagsByStatus(evidenceId, teamId);
  }

  /**
   * Get approved tags for a document
   * @param {string} evidenceId - Evidence document ID
   * @returns {Promise<Array>} - Array of approved tags
   */
  async getApprovedTags(evidenceId) {
    const teamId = this.getTeamId();
    return tagSubcollectionService.getApprovedTags(evidenceId, teamId);
  }

  /**
   * Get pending tags for a document
   * @param {string} evidenceId - Evidence document ID
   * @returns {Promise<Array>} - Array of pending tags
   */
  async getPendingTags(evidenceId) {
    const teamId = this.getTeamId();
    return tagSubcollectionService.getPendingTags(evidenceId, teamId);
  }

  /**
   * Approve an AI suggested tag using subcollection service
   * @param {string} evidenceId - Evidence document ID
   * @param {string} tagId - Tag ID to approve
   * @returns {Promise<Object>} - Operation result
   */
  async approveAITag(evidenceId, tagId) {
    const teamId = this.getTeamId();
    return tagSubcollectionService.approveTag(evidenceId, tagId, teamId);
  }

  /**
   * Reject an AI suggested tag using subcollection service
   * @param {string} evidenceId - Evidence document ID  
   * @param {string} tagId - Tag ID to reject
   * @returns {Promise<Object>} - Operation result
   */
  async rejectAITag(evidenceId, tagId) {
    const teamId = this.getTeamId();
    return tagSubcollectionService.rejectTag(evidenceId, tagId, teamId);
  }

  /**
   * Bulk approve multiple tags
   * @param {string} evidenceId - Evidence document ID
   * @param {Array} tagIds - Array of tag IDs to approve
   * @returns {Promise<Object>} - Operation result
   */
  async approveTagsBatch(evidenceId, tagIds) {
    const teamId = this.getTeamId();
    return tagSubcollectionService.approveTagsBatch(evidenceId, tagIds, teamId);
  }

  /**
   * Bulk reject multiple tags
   * @param {string} evidenceId - Evidence document ID
   * @param {Array} tagIds - Array of tag IDs to reject
   * @returns {Promise<Object>} - Operation result
   */
  async rejectTagsBatch(evidenceId, tagIds) {
    const teamId = this.getTeamId();
    return tagSubcollectionService.rejectTagsBatch(evidenceId, tagIds, teamId);
  }

  /**
   * Get tag statistics for a document
   * @param {string} evidenceId - Evidence document ID
   * @returns {Promise<Object>} - Tag statistics
   */
  async getTagStats(evidenceId) {
    const teamId = this.getTeamId();
    return tagSubcollectionService.getTagStats(evidenceId, teamId);
  }

  /**
   * Set confidence threshold for auto-approval
   * @param {number} threshold - Confidence threshold (0-100)
   */
  setConfidenceThreshold(threshold) {
    tagSubcollectionService.setConfidenceThreshold(threshold);
  }

  /**
   * Get current confidence threshold
   * @returns {number} - Current confidence threshold
   */
  getConfidenceThreshold() {
    return tagSubcollectionService.getConfidenceThreshold();
  }

  /**
   * Process review changes from the AI review modal (legacy compatibility)
   * @param {string} evidenceId - Evidence document ID
   * @param {Object} changes - Changes object with approved and rejected arrays
   * @returns {Promise<Object>} - Operation result
   */
  async processReviewChanges(evidenceId, changes) {
    const teamId = this.getTeamId();
    return this.tagOperationService.processReviewChanges(evidenceId, teamId, changes);
  }
}

export default AITagService;