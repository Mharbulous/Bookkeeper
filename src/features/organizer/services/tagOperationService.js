import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { EvidenceDocumentService } from './evidenceDocumentService.js';
import tagSubcollectionService from './tagSubcollectionService.js';

/**
 * Tag Operation Service - Handles tag approval/rejection workflow operations
 * Provides operations for managing AI suggested tags and their lifecycle
 */
export class TagOperationService {
  constructor(teamId = null) {
    this.teamId = teamId;
    this.evidenceService = new EvidenceDocumentService(teamId);
    this.tagService = tagSubcollectionService;
  }

  /**
   * Approve an AI suggested tag - converts AI tag to human tag in subcollection
   * @param {string} evidenceId - Evidence document ID
   * @param {string} teamId - Team ID
   * @param {Object} aiTag - AI tag to approve (must have id from subcollection)
   * @returns {Promise<Object>} - Operation result
   */
  async approveAITag(evidenceId, teamId, aiTag) {
    try {
      if (!aiTag.id) {
        throw new Error('AI tag must have subcollection ID for approval');
      }

      // Get current AI tag from subcollection
      const aiTags = await this.tagService.getAITags(evidenceId);
      const currentAITag = aiTags.find(tag => tag.id === aiTag.id);
      
      if (!currentAITag) {
        throw new Error('AI tag not found in subcollection');
      }

      // Update the AI tag to mark it as approved and change source to human
      const approvedTagData = {
        source: 'human',
        createdBy: 'user-approved', // TODO: Get actual user ID
        approvedAt: serverTimestamp(),
        metadata: {
          ...currentAITag.metadata,
          originallyFromAI: true,
          approvedFromAI: true,
          originalConfidence: currentAITag.confidence
        }
      };

      // Remove confidence since it's now a human tag
      delete approvedTagData.confidence;

      const updatedTag = await this.tagService.updateTag(evidenceId, aiTag.id, approvedTagData);

      console.log(`[TagOperationService] Approved AI tag: ${aiTag.tagName} for ${evidenceId}`);

      return {
        success: true,
        approvedTag: updatedTag,
        evidenceId
      };

    } catch (error) {
      console.error('[TagOperationService] Failed to approve AI tag:', error);
      throw error;
    }
  }

  /**
   * Reject an AI suggested tag - updates its status to rejected in subcollection
   * @param {string} evidenceId - Evidence document ID
   * @param {string} teamId - Team ID
   * @param {Object} aiTag - AI tag to reject (must have id from subcollection)
   * @returns {Promise<Object>} - Operation result
   */
  async rejectAITag(evidenceId, teamId, aiTag) {
    try {
      if (!aiTag.id) {
        throw new Error('AI tag must have subcollection ID for rejection');
      }

      // Update the AI tag status to rejected
      const rejectedTagData = {
        metadata: {
          status: 'rejected',
          rejectedAt: serverTimestamp(),
          rejectedBy: 'user-rejected' // TODO: Get actual user ID
        }
      };

      const updatedTag = await this.tagService.updateTag(evidenceId, aiTag.id, rejectedTagData);

      console.log(`[TagOperationService] Rejected AI tag: ${aiTag.tagName} for ${evidenceId}`);

      return {
        success: true,
        rejectedTag: updatedTag,
        evidenceId
      };

    } catch (error) {
      console.error('[TagOperationService] Failed to reject AI tag:', error);
      throw error;
    }
  }

  /**
   * Process review changes from the AI review modal
   * @param {string} evidenceId - Evidence document ID
   * @param {string} teamId - Team ID
   * @param {Object} changes - Changes object with approved and rejected arrays
   * @returns {Promise<Object>} - Operation result
   */
  async processReviewChanges(evidenceId, teamId, changes) {
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
          await this.approveAITag(evidenceId, teamId, aiTag);
          results.approvedCount++;
        } catch (error) {
          console.error(`Failed to approve tag ${aiTag.tagName}:`, error);
          results.errors.push({ tag: aiTag, error: error.message, action: 'approve' });
        }
      }

      for (const aiTag of rejected) {
        try {
          await this.rejectAITag(evidenceId, teamId, aiTag);
          results.rejectedCount++;
        } catch (error) {
          console.error(`Failed to reject tag ${aiTag.tagName}:`, error);
          results.errors.push({ tag: aiTag, error: error.message, action: 'reject' });
        }
      }

      console.log(`[TagOperationService] Processed review changes: ${results.approvedCount} approved, ${results.rejectedCount} rejected`);

      return {
        success: true,
        results,
        evidenceId
      };

    } catch (error) {
      console.error('[TagOperationService] Failed to process review changes:', error);
      throw error;
    }
  }

  /**
   * Get AI tags with specific status from subcollection
   * @param {string} evidenceId - Evidence document ID
   * @param {string} teamId - Team ID
   * @param {string} status - Tag status to filter by (optional)
   * @returns {Promise<Array>} - Array of AI tags
   */
  async getAITagsByStatus(evidenceId, teamId, status = null) {
    try {
      const aiTags = await this.tagService.getAITags(evidenceId);
      
      if (status) {
        return aiTags.filter(tag => 
          tag.metadata?.status === status || 
          (status === 'suggested' && !tag.metadata?.status)
        );
      }
      
      return aiTags;
    } catch (error) {
      console.error('[TagOperationService] Failed to get AI tags by status:', error);
      throw error;
    }
  }
}

export default TagOperationService;