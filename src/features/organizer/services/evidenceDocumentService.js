import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { useCategoryStore } from '../stores/categoryStore.js';
import tagSubcollectionService from './tagSubcollectionService.js';

/**
 * Evidence Document Service - Handles evidence document operations and Firestore data retrieval
 * Provides document access, category management, and AI suggestion storage with subcollection support
 */
export class EvidenceDocumentService {
  constructor(teamId = null) {
    this.teamId = teamId;
    this.tagService = tagSubcollectionService;
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
      console.error('[EvidenceDocumentService] Failed to get evidence document:', error);
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
      console.error('[EvidenceDocumentService] Failed to get user categories:', error);
      throw error;
    }
  }

  /**
   * Store AI suggestions as subcollection tags with confidence-based auto-approval
   * @param {string} evidenceId - Evidence document ID
   * @param {string} teamId - Team ID
   * @param {Array} suggestions - AI tag suggestions
   * @returns {Promise<void>}
   */
  async storeAISuggestions(evidenceId, teamId, suggestions) {
    try {
      // Convert AI suggestions to new subcollection tag format
      const aiTagsData = suggestions.map(suggestion => ({
        tagName: suggestion.tagName || suggestion.name,
        confidence: Math.round((suggestion.confidence || 0.8) * 100), // Convert to 0-100 scale
        source: 'ai',
        metadata: {
          categoryId: suggestion.categoryId,
          categoryName: suggestion.categoryName,
          color: suggestion.color,
          reasoning: suggestion.reasoning,
          model: 'vertex-ai',
          processingTime: suggestion.processingTime || 0,
          context: suggestion.reasoning || 'AI suggested based on document content'
        }
      }));

      // Add tags to subcollection with auto-approval logic
      if (aiTagsData.length > 0) {
        const storedTags = await this.tagService.addTagsBatch(evidenceId, aiTagsData);
        
        // Get stats to log approval information
        const stats = await this.tagService.getTagStats(evidenceId);
        console.log(`[EvidenceDocumentService] Stored ${suggestions.length} AI suggestions: ${stats.autoApproved} auto-approved, ${stats.pending} pending review`);
      }

      // Update evidence document with AI processing metadata
      const evidenceRef = doc(db, 'teams', teamId, 'evidence', evidenceId);
      await updateDoc(evidenceRef, {
        lastAIProcessed: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.error('[EvidenceDocumentService] Failed to store AI suggestions:', error);
      throw error;
    }
  }

  /**
   * Update evidence document with tag changes
   * @param {string} evidenceId - Evidence document ID
   * @param {string} teamId - Team ID
   * @param {Object} updates - Updates to apply to the document
   * @returns {Promise<void>}
   */
  async updateEvidenceDocument(evidenceId, teamId, updates) {
    try {
      const evidenceRef = doc(db, 'teams', teamId, 'evidence', evidenceId);
      
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(evidenceRef, updateData);

      console.log(`[EvidenceDocumentService] Updated evidence document ${evidenceId}`);
    } catch (error) {
      console.error('[EvidenceDocumentService] Failed to update evidence document:', error);
      throw error;
    }
  }

  /**
   * Get evidence document with validation
   * @param {string} evidenceId - Evidence document ID
   * @param {string} teamId - Team ID
   * @returns {Promise<Object>} - Evidence document data
   * @throws {Error} - If document not found
   */
  async getEvidenceDocumentWithValidation(evidenceId, teamId) {
    const evidence = await this.getEvidenceDocument(evidenceId, teamId);
    if (!evidence) {
      throw new Error(`Evidence document not found: ${evidenceId}`);
    }
    return evidence;
  }

  /**
   * Validate categories exist for AI processing
   * @param {string} teamId - Team ID
   * @returns {Promise<Array>} - Array of categories
   * @throws {Error} - If no categories found
   */
  async validateAndGetCategories(teamId) {
    const categories = await this.getUserCategories(teamId);
    if (categories.length === 0) {
      throw new Error('No categories found. Please create categories before using AI tagging.');
    }
    return categories;
  }

  /**
   * Get all tags grouped by status from subcollection
   * @param {string} evidenceId - Evidence document ID
   * @returns {Promise<Object>} - Tags grouped by status {pending, approved, rejected}
   */
  async getTagsByStatus(evidenceId) {
    try {
      return await this.tagService.getTagsByStatus(evidenceId);
    } catch (error) {
      console.error('[EvidenceDocumentService] Failed to get tags by status:', error);
      throw error;
    }
  }

  /**
   * Get approved tags from subcollection (replaces embedded tagsByHuman and approved AI tags)
   * @param {string} evidenceId - Evidence document ID
   * @returns {Promise<Array>} - Array of approved tags
   */
  async getApprovedTags(evidenceId) {
    try {
      return await this.tagService.getApprovedTags(evidenceId);
    } catch (error) {
      console.error('[EvidenceDocumentService] Failed to get approved tags:', error);
      throw error;
    }
  }

  /**
   * Get pending AI tags from subcollection
   * @param {string} evidenceId - Evidence document ID
   * @returns {Promise<Array>} - Array of pending AI tags
   */
  async getPendingAITags(evidenceId) {
    try {
      return await this.tagService.getPendingTags(evidenceId);
    } catch (error) {
      console.error('[EvidenceDocumentService] Failed to get pending AI tags:', error);
      throw error;
    }
  }

  /**
   * Get tag statistics for a document
   * @param {string} evidenceId - Evidence document ID
   * @returns {Promise<Object>} - Tag statistics
   */
  async getTagStats(evidenceId) {
    try {
      return await this.tagService.getTagStats(evidenceId);
    } catch (error) {
      console.error('[EvidenceDocumentService] Failed to get tag stats:', error);
      throw error;
    }
  }

  /**
   * Legacy compatibility: Get AI suggestions (now returns pending tags)
   * @param {string} evidenceId - Evidence document ID
   * @param {string} teamId - Team ID (unused but kept for compatibility)
   * @returns {Promise<Array>} - Array of pending AI tag suggestions
   */
  async getAISuggestions(evidenceId, teamId) {
    try {
      return await this.tagService.getPendingTags(evidenceId);
    } catch (error) {
      console.error('[EvidenceDocumentService] Failed to get AI suggestions:', error);
      throw error;
    }
  }

  /**
   * Legacy compatibility: Get human tags (now returns approved manual tags)
   * @param {string} evidenceId - Evidence document ID
   * @param {string} teamId - Team ID (unused but kept for compatibility)
   * @returns {Promise<Array>} - Array of approved manual tags
   */
  async getHumanTags(evidenceId, teamId) {
    try {
      const approvedTags = await this.tagService.getApprovedTags(evidenceId);
      return approvedTags.filter(tag => tag.source === 'manual');
    } catch (error) {
      console.error('[EvidenceDocumentService] Failed to get human tags:', error);
      throw error;
    }
  }
}

export default EvidenceDocumentService;