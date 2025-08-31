import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { useCategoryStore } from '../stores/categoryStore.js';
import { TagSubcollectionService } from './tagSubcollectionService.js';

/**
 * Evidence Document Service - Handles evidence document operations and Firestore data retrieval
 * Provides document access, category management, and AI suggestion storage
 */
export class EvidenceDocumentService {
  constructor(teamId = null) {
    this.teamId = teamId;
    this.tagService = new TagSubcollectionService(teamId);
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
   * Store AI suggestions as subcollection tags with source: 'ai'
   * @param {string} evidenceId - Evidence document ID
   * @param {string} teamId - Team ID
   * @param {Array} suggestions - AI tag suggestions
   * @returns {Promise<void>}
   */
  async storeAISuggestions(evidenceId, teamId, suggestions) {
    try {
      // Convert AI suggestions to subcollection tag format
      const aiTagsData = suggestions.map(suggestion => ({
        categoryId: suggestion.categoryId,
        categoryName: suggestion.categoryName,
        tagName: suggestion.tagName,
        color: suggestion.color,
        source: 'ai',
        confidence: suggestion.confidence || 0.8,
        createdBy: 'ai-system',
        metadata: {
          reasoning: suggestion.reasoning,
          status: suggestion.status || 'suggested',
          suggestedAt: new Date()
        }
      }));

      // Add tags to subcollection in batch
      if (aiTagsData.length > 0) {
        await this.tagService.addTagsBatch(evidenceId, aiTagsData);
      }

      // Update evidence document with AI processing metadata
      const evidenceRef = doc(db, 'teams', teamId, 'evidence', evidenceId);
      await updateDoc(evidenceRef, {
        lastAIProcessed: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log(`[EvidenceDocumentService] Stored ${suggestions.length} AI suggestions as subcollection tags for ${evidenceId}`);
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
   * Get AI suggestions from subcollection (replaces embedded tagsByAI)
   * @param {string} evidenceId - Evidence document ID
   * @param {string} teamId - Team ID
   * @returns {Promise<Array>} - Array of AI tag suggestions
   */
  async getAISuggestions(evidenceId, teamId) {
    try {
      return await this.tagService.getAITags(evidenceId);
    } catch (error) {
      console.error('[EvidenceDocumentService] Failed to get AI suggestions:', error);
      throw error;
    }
  }

  /**
   * Get human tags from subcollection (replaces embedded tagsByHuman)
   * @param {string} evidenceId - Evidence document ID
   * @param {string} teamId - Team ID
   * @returns {Promise<Array>} - Array of human tags
   */
  async getHumanTags(evidenceId, teamId) {
    try {
      return await this.tagService.getHumanTags(evidenceId);
    } catch (error) {
      console.error('[EvidenceDocumentService] Failed to get human tags:', error);
      throw error;
    }
  }
}

export default EvidenceDocumentService;