import { db } from '../../../services/firebase.js';
import { 
  collection, 
  getDocs,
  query, 
  where, 
  orderBy,
  limit
} from 'firebase/firestore';
import { EvidenceService } from './evidenceService.js';

/**
 * Evidence Query Service - Handles complex queries, searches, and migrations for evidence documents
 * Focuses on read operations, finding evidence, and data migration tasks
 */
export class EvidenceQueryService {
  constructor(teamId) {
    this.teamId = teamId;
    this.evidenceService = new EvidenceService(teamId);
  }

  /**
   * Find evidence documents by file hash
   * @param {string} fileHash - File hash from upload system
   * @returns {Promise<Array>} - Array of evidence documents
   */
  async findEvidenceByHash(fileHash) {
    try {
      const evidenceRef = collection(db, 'teams', this.teamId, 'evidence');
      const q = query(
        evidenceRef,
        where('storageRef.fileHash', '==', fileHash),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const evidenceList = [];

      querySnapshot.forEach((doc) => {
        evidenceList.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return evidenceList;
    } catch (error) {
      console.error('[EvidenceQueryService] Failed to find evidence by hash:', error);
      throw error;
    }
  }

  /**
   * Find evidence documents by tags
   * @param {Array} tags - Array of tag strings to search for
   * @param {boolean} matchAll - Whether to match all tags (AND) or any tag (OR)
   * @returns {Promise<Array>} - Array of evidence documents
   */
  async findEvidenceByTags(tags, matchAll = false) {
    try {
      if (!Array.isArray(tags) || tags.length === 0) return [];

      const evidenceRef = collection(db, 'teams', this.teamId, 'evidence');
      const q = query(evidenceRef, where('tagsByHuman', 'array-contains-any', tags), orderBy('updatedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const evidenceList = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        if (matchAll) {
          const docTags = [...(data.tagsByHuman || []), ...(data.tagsByAI || [])];
          if (!tags.every(tag => docTags.includes(tag))) return;
        }

        evidenceList.push({ id: doc.id, ...data });
      });

      return evidenceList;
    } catch (error) {
      console.error('[EvidenceQueryService] Failed to find evidence by tags:', error);
      throw error;
    }
  }

  /**
   * Find evidence documents by processing stage
   * @param {string} stage - Processing stage to filter by
   * @returns {Promise<Array>} - Array of evidence documents
   */
  async findEvidenceByProcessingStage(stage) {
    try {
      const validStages = ['uploaded', 'splitting', 'merging', 'complete'];
      if (!validStages.includes(stage)) throw new Error(`Invalid processing stage: ${stage}`);

      const evidenceRef = collection(db, 'teams', this.teamId, 'evidence');
      const q = query(evidenceRef, where('processingStage', '==', stage), orderBy('updatedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const evidenceList = [];

      querySnapshot.forEach((doc) => {
        evidenceList.push({ id: doc.id, ...doc.data() });
      });

      return evidenceList;
    } catch (error) {
      console.error('[EvidenceQueryService] Failed to find evidence by processing stage:', error);
      throw error;
    }
  }

  /**
   * Find unprocessed evidence documents
   * @returns {Promise<Array>} - Array of evidence documents that haven't been processed
   */
  async findUnprocessedEvidence() {
    try {
      const evidenceRef = collection(db, 'teams', this.teamId, 'evidence');
      const q = query(evidenceRef, where('isProcessed', '==', false), orderBy('updatedAt', 'asc'));
      const querySnapshot = await getDocs(q);
      const evidenceList = [];

      querySnapshot.forEach((doc) => {
        evidenceList.push({ id: doc.id, ...doc.data() });
      });

      return evidenceList;
    } catch (error) {
      console.error('[EvidenceQueryService] Failed to find unprocessed evidence:', error);
      throw error;
    }
  }

  /**
   * Get available original names for a file hash (for displayName dropdown)
   * @param {string} fileHash - File hash from upload system
   * @param {string} matterId - Matter ID (defaults to 'general')
   * @returns {Promise<Array<string>>} - Array of original filenames
   */
  async getAvailableOriginalNames(fileHash, matterId = 'general') {
    try {
      const originalMetadataRef = collection(db, 'teams', this.teamId, 'matters', matterId, 'originalMetadata');
      const q = query(
        originalMetadataRef,
        where('fileHash', '==', fileHash)
      );

      const querySnapshot = await getDocs(q);
      const originalNames = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.originalName && !originalNames.includes(data.originalName)) {
          originalNames.push(data.originalName);
        }
      });

      return originalNames;
    } catch (error) {
      console.error('[EvidenceQueryService] Failed to get available original names:', error);
      return [];
    }
  }

  /**
   * Get evidence statistics
   * @returns {Promise<Object>} - Statistics about evidence documents
   */
  async getEvidenceStatistics() {
    try {
      const evidenceRef = collection(db, 'teams', this.teamId, 'evidence');
      const querySnapshot = await getDocs(evidenceRef);

      const stats = {
        total: 0, processed: 0, unprocessed: 0,
        byStage: { uploaded: 0, splitting: 0, merging: 0, complete: 0 },
        totalFileSize: 0, taggedDocuments: 0
      };

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        stats.total++;
        data.isProcessed ? stats.processed++ : stats.unprocessed++;
        
        if (data.processingStage && Object.prototype.hasOwnProperty.call(stats.byStage, data.processingStage)) {
          stats.byStage[data.processingStage]++;
        }
        
        if (data.fileSize) stats.totalFileSize += data.fileSize;
        if ((data.tagsByHuman?.length > 0) || (data.tagsByAI?.length > 0)) stats.taggedDocuments++;
      });

      return stats;
    } catch (error) {
      console.error('[EvidenceQueryService] Failed to get evidence statistics:', error);
      throw error;
    }
  }

  /**
   * Search evidence documents by text content
   * @param {string} searchTerm - Text to search for
   * @returns {Promise<Array>} - Array of evidence documents
   */
  async searchEvidenceByText(searchTerm) {
    try {
      if (!searchTerm?.trim()) return [];

      const evidenceRef = collection(db, 'teams', this.teamId, 'evidence');
      const querySnapshot = await getDocs(evidenceRef);
      const results = [];
      const searchTermLower = searchTerm.toLowerCase().trim();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const isMatch = data.displayName?.toLowerCase().includes(searchTermLower) ||
                       [...(data.tagsByHuman || []), ...(data.tagsByAI || [])]
                         .some(tag => tag.toLowerCase().includes(searchTermLower)) ||
                       data.displayCopy?.folderPath?.toLowerCase().includes(searchTermLower);

        if (isMatch) results.push({ id: doc.id, ...data });
      });

      return results.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
    } catch (error) {
      console.error('[EvidenceQueryService] Failed to search evidence by text:', error);
      throw error;
    }
  }

  /**
   * Migrate existing upload metadata to evidence documents
   * @param {Array} uploadMetadataList - List of existing upload metadata
   * @returns {Promise<Object>} - Migration results
   */
  async migrateUploadsToEvidence(uploadMetadataList) {
    try {
      console.log(`[EvidenceQueryService] Starting migration of ${uploadMetadataList.length} uploads`);
      const results = { successful: [], skipped: [], failed: [] };

      for (const uploadMeta of uploadMetadataList) {
        try {
          const existingEvidence = await this.findEvidenceByHash(uploadMeta.hash);
          
          if (existingEvidence.length > 0) {
            results.skipped.push({ hash: uploadMeta.hash, reason: 'Evidence already exists' });
            continue;
          }

          const evidenceId = await this.evidenceService.createEvidenceFromUpload(uploadMeta);
          results.successful.push({ evidenceId, hash: uploadMeta.hash, originalName: uploadMeta.originalName });

        } catch (error) {
          console.error(`[EvidenceQueryService] Failed to migrate ${uploadMeta.originalName}:`, error);
          results.failed.push({ hash: uploadMeta.hash, originalName: uploadMeta.originalName, error: error.message });
        }
      }

      console.log(`[EvidenceQueryService] Migration complete:`, results);
      return results;
    } catch (error) {
      console.error('[EvidenceQueryService] Migration failed:', error);
      throw error;
    }
  }

  /**
   * Get all evidence documents with pagination
   * @param {number} documentLimit - Maximum number of documents to return
   * @returns {Promise<Array>} - Array of evidence documents
   */
  async getAllEvidence(documentLimit = 50) {
    try {
      const evidenceRef = collection(db, 'teams', this.teamId, 'evidence');
      const q = query(evidenceRef, orderBy('updatedAt', 'desc'), limit(documentLimit));
      const querySnapshot = await getDocs(q);
      const evidenceList = [];

      querySnapshot.forEach((doc) => evidenceList.push({ id: doc.id, ...doc.data() }));
      return evidenceList;
    } catch (error) {
      console.error('[EvidenceQueryService] Failed to get all evidence:', error);
      throw error;
    }
  }
}

export default EvidenceQueryService;