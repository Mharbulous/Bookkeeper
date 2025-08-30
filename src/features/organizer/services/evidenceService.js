import { db } from '../../../services/firebase.js';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs,
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

/**
 * Evidence Service - Manages evidence documents in Firestore
 * Handles creation, updating, and management of evidence entries that reference uploaded files
 */
export class EvidenceService {
  constructor(teamId) {
    this.teamId = teamId;
  }

  /**
   * Create a new evidence document from uploaded file metadata
   * @param {Object} uploadMetadata - Metadata from the upload system
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Evidence document ID
   */
  async createEvidenceFromUpload(uploadMetadata, options = {}) {
    try {
      if (!uploadMetadata.hash || !uploadMetadata.originalName) {
        throw new Error('Missing required upload metadata: hash and originalName');
      }

      // Use the metadataHash from uploadMetadata (created during upload process)
      const metadataHash = uploadMetadata.metadataHash;
      
      // Create evidence document with refined structure
      const evidenceData = {
        // Reference to actual file in Storage
        storageRef: {
          storage: 'uploads',
          fileHash: uploadMetadata.hash
        },
        
        // Display configuration (references specific metadata record)
        displayCopy: {
          metadataHash: metadataHash,
          folderPath: uploadMetadata.folderPath || '/' // Default to root if no folder path
        },
        
        // File properties (for quick access)
        fileSize: uploadMetadata.size || 0,
        
        // Processing status (for future Document Processing Workflow)
        isProcessed: false,
        hasAllPages: null, // null = unknown, true/false after processing
        processingStage: 'uploaded', // uploaded|splitting|merging|complete
        
        // Organization tags (separated by source)
        tagsByAI: [], // Empty initially - populated by AI processing
        tagsByHuman: options.tags || [], // User-provided tags if any
        
        // Timestamps
        updatedAt: serverTimestamp()
      };

      // Add to evidence collection
      const evidenceRef = collection(db, 'teams', this.teamId, 'evidence');
      const docRef = await addDoc(evidenceRef, evidenceData);

      console.log(`[EvidenceService] Created evidence document: ${docRef.id}`, {
        metadataHash: metadataHash.substring(0, 8) + '...',
        fileHash: uploadMetadata.hash.substring(0, 8) + '...',
        tagsByHuman: evidenceData.tagsByHuman,
      });

      return docRef.id;
    } catch (error) {
      console.error('[EvidenceService] Failed to create evidence:', error);
      throw error;
    }
  }

  /**
   * Batch create evidence documents from multiple uploaded files
   * @param {Array} uploadMetadataList - Array of upload metadata objects
   * @returns {Promise<Array>} - Array of evidence document IDs
   */
  async createEvidenceFromUploads(uploadMetadataList) {
    try {
      if (!Array.isArray(uploadMetadataList) || uploadMetadataList.length === 0) {
        return [];
      }

      const batch = writeBatch(db);
      const evidenceIds = [];

      for (const uploadMetadata of uploadMetadataList) {
        const evidenceRef = doc(collection(db, 'teams', this.teamId, 'evidence'));
        evidenceIds.push(evidenceRef.id);

        const evidenceData = {
          storageRef: {
            storage: 'uploads',
            fileHash: uploadMetadata.hash
          },
          
          displayCopy: {
            metadataHash: uploadMetadata.metadataHash || 'temp-hash', // Should be provided by upload process
            folderPath: uploadMetadata.folderPath || '/'
          },
          
          fileSize: uploadMetadata.size || 0,
          
          isProcessed: false,
          hasAllPages: null,
          processingStage: 'uploaded',
          
          tagsByAI: [],
          tagsByHuman: [],
          
          updatedAt: serverTimestamp()
        };

        batch.set(evidenceRef, evidenceData);
      }

      await batch.commit();

      console.log(`[EvidenceService] Batch created ${evidenceIds.length} evidence documents`);
      return evidenceIds;
    } catch (error) {
      console.error('[EvidenceService] Failed to batch create evidence:', error);
      throw error;
    }
  }

  /**
   * Update tags for an evidence document
   * @param {string} evidenceId - Evidence document ID
   * @param {Array} tags - Array of tag strings
   * @returns {Promise<void>}
   */
  async updateTags(evidenceId, tags) {
    try {
      if (!Array.isArray(tags)) {
        throw new Error('Tags must be an array');
      }

      // Clean and deduplicate tags
      const cleanedTags = [...new Set(
        tags
          .map(tag => tag.toString().trim())
          .filter(tag => tag.length > 0)
      )];

      const evidenceRef = doc(db, 'teams', this.teamId, 'evidence', evidenceId);
      await updateDoc(evidenceRef, {
        tags: cleanedTags,
        tagCount: cleanedTags.length,
        lastTaggedAt: serverTimestamp(),
        taggedBy: 'manual',
        updatedAt: serverTimestamp(),
      });

      console.log(`[EvidenceService] Updated tags for ${evidenceId}:`, cleanedTags);
    } catch (error) {
      console.error('[EvidenceService] Failed to update tags:', error);
      throw error;
    }
  }

  /**
   * Update display name for an evidence document
   * @param {string} evidenceId - Evidence document ID
   * @param {string} displayName - New display name
   * @returns {Promise<void>}
   */
  async updateDisplayName(evidenceId, displayName) {
    try {
      if (!displayName || !displayName.trim()) {
        throw new Error('Display name cannot be empty');
      }

      const evidenceRef = doc(db, 'teams', this.teamId, 'evidence', evidenceId);
      await updateDoc(evidenceRef, {
        displayName: displayName.trim(),
        updatedAt: serverTimestamp(),
      });

      console.log(`[EvidenceService] Updated display name for ${evidenceId}: ${displayName}`);
    } catch (error) {
      console.error('[EvidenceService] Failed to update display name:', error);
      throw error;
    }
  }

  /**
   * Update processing stage for an evidence document
   * @param {string} evidenceId - Evidence document ID
   * @param {string} stage - Processing stage
   * @param {Object} additionalData - Additional data to update
   * @returns {Promise<void>}
   */
  async updateProcessingStage(evidenceId, stage, additionalData = {}) {
    try {
      const validStages = ['uploaded', 'splitting', 'merging', 'complete'];
      if (!validStages.includes(stage)) {
        throw new Error(`Invalid processing stage: ${stage}`);
      }

      const updateData = {
        processingStage: stage,
        updatedAt: serverTimestamp(),
        ...additionalData
      };

      const evidenceRef = doc(db, 'teams', this.teamId, 'evidence', evidenceId);
      await updateDoc(evidenceRef, updateData);

      console.log(`[EvidenceService] Updated processing stage for ${evidenceId}: ${stage}`);
    } catch (error) {
      console.error('[EvidenceService] Failed to update processing stage:', error);
      throw error;
    }
  }

  /**
   * Delete an evidence document
   * @param {string} evidenceId - Evidence document ID
   * @returns {Promise<void>}
   */
  async deleteEvidence(evidenceId) {
    try {
      const evidenceRef = doc(db, 'teams', this.teamId, 'evidence', evidenceId);
      await deleteDoc(evidenceRef);

      console.log(`[EvidenceService] Deleted evidence document: ${evidenceId}`);
    } catch (error) {
      console.error('[EvidenceService] Failed to delete evidence:', error);
      throw error;
    }
  }

  /**
   * Get evidence document by ID
   * @param {string} evidenceId - Evidence document ID
   * @returns {Promise<Object|null>} - Evidence document or null if not found
   */
  async getEvidence(evidenceId) {
    try {
      const evidenceRef = doc(db, 'teams', this.teamId, 'evidence', evidenceId);
      const docSnap = await getDoc(evidenceRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('[EvidenceService] Failed to get evidence:', error);
      throw error;
    }
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
      console.error('[EvidenceService] Failed to find evidence by hash:', error);
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
      console.log(`[EvidenceService] Starting migration of ${uploadMetadataList.length} uploads`);

      const results = {
        successful: [],
        skipped: [],
        failed: []
      };

      for (const uploadMeta of uploadMetadataList) {
        try {
          // Check if evidence already exists for this file hash
          const existingEvidence = await this.findEvidenceByHash(uploadMeta.hash);
          
          if (existingEvidence.length > 0) {
            results.skipped.push({
              hash: uploadMeta.hash,
              reason: 'Evidence already exists'
            });
            continue;
          }

          // Create evidence document
          const evidenceId = await this.createEvidenceFromUpload(uploadMeta);
          results.successful.push({
            evidenceId,
            hash: uploadMeta.hash,
            originalName: uploadMeta.originalName
          });

        } catch (error) {
          console.error(`[EvidenceService] Failed to migrate ${uploadMeta.originalName}:`, error);
          results.failed.push({
            hash: uploadMeta.hash,
            originalName: uploadMeta.originalName,
            error: error.message
          });
        }
      }

      console.log(`[EvidenceService] Migration complete:`, {
        successful: results.successful.length,
        skipped: results.skipped.length,
        failed: results.failed.length
      });

      return results;
    } catch (error) {
      console.error('[EvidenceService] Migration failed:', error);
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
      console.error('[EvidenceService] Failed to get available original names:', error);
      return [];
    }
  }
}

export default EvidenceService;