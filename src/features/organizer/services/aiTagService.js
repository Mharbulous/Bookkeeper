import { useAuthStore } from '../../../core/stores/auth.js';
import { AIProcessingService } from './aiProcessingService.js';
import { EvidenceDocumentService } from './evidenceDocumentService.js';
import { TagOperationService } from './tagOperationService.js';
import { FileProcessingService } from './fileProcessingService.js';

/**
 * AI Tag Service - Handles AI-powered document categorization using Firebase Vertex AI
 * Orchestrates between specialized services for single document processing with manual triggers and approval workflow
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

      // Store AI suggestions in evidence document
      await this.evidenceService.storeAISuggestions(evidenceId, teamId, aiSuggestions);

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
   * Store AI suggestions in evidence document
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
   * Approve an AI suggested tag - moves it from tagsByAI to tagsByHuman
   * @param {string} evidenceId - Evidence document ID
   * @param {Object} aiTag - AI tag to approve
   * @returns {Promise<Object>} - Operation result
   */
  async approveAITag(evidenceId, aiTag) {
    const teamId = this.getTeamId();
    return this.tagOperationService.approveAITag(evidenceId, teamId, aiTag);
  }

  /**
   * Reject an AI suggested tag - updates its status to rejected
   * @param {string} evidenceId - Evidence document ID  
   * @param {Object} aiTag - AI tag to reject
   * @returns {Promise<Object>} - Operation result
   */
  async rejectAITag(evidenceId, aiTag) {
    const teamId = this.getTeamId();
    return this.tagOperationService.rejectAITag(evidenceId, teamId, aiTag);
  }

  /**
   * Process review changes from the AI review modal
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