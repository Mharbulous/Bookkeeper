import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  writeBatch, 
  query, 
  limit,
  startAfter,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { useAuthStore } from '../../../core/stores/auth.js';
import { TagSubcollectionService } from './tagSubcollectionService.js';

/**
 * Migration Service - Handles migration from embedded tag arrays to subcollections
 * Provides batch migration, progress tracking, and data integrity verification
 */
export class MigrationService {
  constructor(teamId = null) {
    this.teamId = teamId;
    this.tagService = new TagSubcollectionService(teamId);
    this.batchSize = 10; // Process 10 documents at a time
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
   * Analyze evidence collection to determine migration scope
   * @returns {Promise<Object>} - Migration analysis results
   */
  async analyzeMigrationScope() {
    try {
      const teamId = this.getTeamId();
      const evidenceRef = collection(db, 'teams', teamId, 'evidence');
      const snapshot = await getDocs(evidenceRef);
      
      let totalDocuments = 0;
      let documentsWithEmbeddedTags = 0;
      let documentsWithSubcollections = 0;
      let totalEmbeddedTags = 0;
      let documentsToMigrate = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        totalDocuments++;

        const hasEmbeddedTags = (data.tagsByHuman && data.tagsByHuman.length > 0) || 
                               (data.tagsByAI && data.tagsByAI.length > 0);
        const hasSubcollection = data.tagCount && data.tagCount > 0 && data.lastTaggedAt;

        if (hasEmbeddedTags) {
          documentsWithEmbeddedTags++;
          const embeddedTagCount = (data.tagsByHuman?.length || 0) + (data.tagsByAI?.length || 0);
          totalEmbeddedTags += embeddedTagCount;
          
          documentsToMigrate.push({
            id: docSnap.id,
            displayName: data.displayName || 'Unknown',
            embeddedTagCount,
            hasExistingSubcollection: hasSubcollection
          });
        }

        if (hasSubcollection) {
          documentsWithSubcollections++;
        }
      }

      return {
        totalDocuments,
        documentsWithEmbeddedTags,
        documentsWithSubcollections,
        totalEmbeddedTags,
        documentsToMigrate,
        estimatedBatches: Math.ceil(documentsToMigrate.length / this.batchSize)
      };
    } catch (error) {
      console.error('[MigrationService] Failed to analyze migration scope:', error);
      throw error;
    }
  }

  /**
   * Migrate a single evidence document from embedded arrays to subcollections
   * @param {string} evidenceId - Evidence document ID
   * @param {Object} options - Migration options
   * @returns {Promise<Object>} - Migration result for this document
   */
  async migrateSingleDocument(evidenceId, options = {}) {
    try {
      const teamId = this.getTeamId();
      const evidenceRef = doc(db, 'teams', teamId, 'evidence', evidenceId);
      const evidenceSnap = await getDoc(evidenceRef);

      if (!evidenceSnap.exists()) {
        throw new Error(`Evidence document ${evidenceId} not found`);
      }

      const evidenceData = evidenceSnap.data();
      const humanTags = evidenceData.tagsByHuman || [];
      const aiTags = evidenceData.tagsByAI || [];
      const allEmbeddedTags = [...humanTags, ...aiTags];

      if (allEmbeddedTags.length === 0) {
        return {
          evidenceId,
          status: 'skipped',
          reason: 'No embedded tags to migrate',
          migratedTags: 0
        };
      }

      // Check if subcollection already exists
      if (options.skipExisting) {
        const existingTags = await this.tagService.getTagsForEvidence(evidenceId);
        if (existingTags.length > 0) {
          return {
            evidenceId,
            status: 'skipped',
            reason: 'Subcollection already exists',
            existingTags: existingTags.length,
            migratedTags: 0
          };
        }
      }

      // Create batch for atomic migration
      const batch = writeBatch(db);
      const migratedTags = [];

      // Migrate human tags
      for (const tag of humanTags) {
        const tagData = {
          categoryId: tag.categoryId,
          categoryName: tag.categoryName,
          tagName: tag.tagName,
          color: tag.color,
          source: 'human',
          createdAt: tag.createdAt || serverTimestamp(),
          createdBy: tag.createdBy || 'migration',
          metadata: { 
            migratedFromEmbedded: true,
            originalTagId: tag.tagId
          }
        };

        const newTagRef = doc(collection(db, 'teams', teamId, 'evidence', evidenceId, 'tags'));
        batch.set(newTagRef, tagData);
        migratedTags.push({ ...tagData, id: newTagRef.id });
      }

      // Migrate AI tags
      for (const tag of aiTags) {
        const tagData = {
          categoryId: tag.categoryId,
          categoryName: tag.categoryName,
          tagName: tag.tagName,
          color: tag.color,
          source: 'ai',
          confidence: tag.confidence || 0.8,
          createdAt: tag.suggestedAt || serverTimestamp(),
          createdBy: 'ai-system',
          metadata: {
            migratedFromEmbedded: true,
            originalStatus: tag.status || 'suggested',
            reasoning: tag.reasoning
          }
        };

        const newTagRef = doc(collection(db, 'teams', teamId, 'evidence', evidenceId, 'tags'));
        batch.set(newTagRef, tagData);
        migratedTags.push({ ...tagData, id: newTagRef.id });
      }

      // Update evidence document with new metadata
      const evidenceUpdate = {
        tagCount: migratedTags.length,
        lastTaggedAt: serverTimestamp(),
        migratedAt: serverTimestamp(),
        migrationVersion: '1.0'
      };

      // Optionally preserve embedded arrays for rollback
      if (options.preserveEmbedded) {
        evidenceUpdate.tagsByHuman_backup = humanTags;
        evidenceUpdate.tagsByAI_backup = aiTags;
      } else {
        // Remove embedded arrays
        evidenceUpdate.tagsByHuman = [];
        evidenceUpdate.tagsByAI = [];
      }

      batch.update(evidenceRef, evidenceUpdate);

      // Commit batch
      await batch.commit();

      console.log(`[MigrationService] Migrated ${migratedTags.length} tags for document ${evidenceId}`);

      return {
        evidenceId,
        status: 'success',
        migratedTags: migratedTags.length,
        humanTags: humanTags.length,
        aiTags: aiTags.length,
        preservedEmbedded: options.preserveEmbedded
      };

    } catch (error) {
      console.error(`[MigrationService] Failed to migrate document ${evidenceId}:`, error);
      return {
        evidenceId,
        status: 'error',
        error: error.message,
        migratedTags: 0
      };
    }
  }

  /**
   * Perform batch migration with progress tracking
   * @param {Object} options - Migration options
   * @param {Function} progressCallback - Progress callback function
   * @returns {Promise<Object>} - Complete migration results
   */
  async performBatchMigration(options = {}, progressCallback = null) {
    const defaultOptions = {
      preserveEmbedded: true, // Keep embedded arrays as backup
      skipExisting: true, // Skip documents with existing subcollections
      ...options
    };

    try {
      // Analyze migration scope
      const analysis = await this.analyzeMigrationScope();
      const { documentsToMigrate, estimatedBatches } = analysis;

      if (documentsToMigrate.length === 0) {
        return {
          status: 'completed',
          message: 'No documents require migration',
          results: analysis
        };
      }

      const migrationResults = {
        totalDocuments: documentsToMigrate.length,
        successful: 0,
        skipped: 0,
        errors: 0,
        details: [],
        startTime: new Date(),
        endTime: null
      };

      // Process in batches
      for (let i = 0; i < documentsToMigrate.length; i += this.batchSize) {
        const batch = documentsToMigrate.slice(i, i + this.batchSize);
        const batchNumber = Math.floor(i / this.batchSize) + 1;

        // Progress callback
        if (progressCallback) {
          progressCallback({
            phase: 'migration',
            batchNumber,
            totalBatches: estimatedBatches,
            currentDocument: i + 1,
            totalDocuments: documentsToMigrate.length,
            completed: migrationResults.successful + migrationResults.skipped,
            message: `Processing batch ${batchNumber}/${estimatedBatches}`
          });
        }

        // Process batch documents
        const batchPromises = batch.map(doc => 
          this.migrateSingleDocument(doc.id, defaultOptions)
        );

        const batchResults = await Promise.allSettled(batchPromises);

        // Process batch results
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const docResult = result.value;
            migrationResults.details.push(docResult);

            switch (docResult.status) {
              case 'success':
                migrationResults.successful++;
                break;
              case 'skipped':
                migrationResults.skipped++;
                break;
              case 'error':
                migrationResults.errors++;
                break;
            }
          } else {
            migrationResults.errors++;
            migrationResults.details.push({
              evidenceId: batch[index].id,
              status: 'error',
              error: result.reason?.message || 'Unknown error',
              migratedTags: 0
            });
          }
        });

        // Small delay between batches to avoid overwhelming Firestore
        if (i + this.batchSize < documentsToMigrate.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      migrationResults.endTime = new Date();
      migrationResults.duration = migrationResults.endTime - migrationResults.startTime;

      // Final progress callback
      if (progressCallback) {
        progressCallback({
          phase: 'completed',
          completed: migrationResults.successful + migrationResults.skipped,
          totalDocuments: migrationResults.totalDocuments,
          successful: migrationResults.successful,
          skipped: migrationResults.skipped,
          errors: migrationResults.errors,
          message: 'Migration completed'
        });
      }

      console.log('[MigrationService] Batch migration completed:', migrationResults);
      return {
        status: 'completed',
        results: migrationResults,
        analysis
      };

    } catch (error) {
      console.error('[MigrationService] Batch migration failed:', error);
      throw error;
    }
  }

  /**
   * Verify migration integrity by comparing tag counts
   * @param {string} evidenceId - Evidence document ID
   * @returns {Promise<Object>} - Verification result
   */
  async verifyMigration(evidenceId) {
    try {
      const teamId = this.getTeamId();
      const evidenceRef = doc(db, 'teams', teamId, 'evidence', evidenceId);
      const evidenceSnap = await getDoc(evidenceRef);

      if (!evidenceSnap.exists()) {
        throw new Error(`Evidence document ${evidenceId} not found`);
      }

      const evidenceData = evidenceSnap.data();
      const subcollectionTags = await this.tagService.getTagsForEvidence(evidenceId);

      // Compare with backup if available
      const backupTags = [
        ...(evidenceData.tagsByHuman_backup || []),
        ...(evidenceData.tagsByAI_backup || [])
      ];

      // Or compare with current embedded arrays
      const embeddedTags = [
        ...(evidenceData.tagsByHuman || []),
        ...(evidenceData.tagsByAI || [])
      ];

      const originalTagCount = backupTags.length > 0 ? backupTags.length : embeddedTags.length;
      const subcollectionTagCount = subcollectionTags.length;
      const documentTagCount = evidenceData.tagCount || 0;

      const isValid = originalTagCount === subcollectionTagCount && 
                     subcollectionTagCount === documentTagCount;

      return {
        evidenceId,
        isValid,
        originalTagCount,
        subcollectionTagCount,
        documentTagCount,
        hasBackup: backupTags.length > 0,
        migratedAt: evidenceData.migratedAt,
        details: isValid ? 'Migration verified successfully' : 'Tag count mismatch detected'
      };

    } catch (error) {
      console.error(`[MigrationService] Failed to verify migration for ${evidenceId}:`, error);
      return {
        evidenceId,
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Rollback migration for a document (restore from backup)
   * @param {string} evidenceId - Evidence document ID
   * @returns {Promise<Object>} - Rollback result
   */
  async rollbackMigration(evidenceId) {
    try {
      const teamId = this.getTeamId();
      const evidenceRef = doc(db, 'teams', teamId, 'evidence', evidenceId);
      const evidenceSnap = await getDoc(evidenceRef);

      if (!evidenceSnap.exists()) {
        throw new Error(`Evidence document ${evidenceId} not found`);
      }

      const evidenceData = evidenceSnap.data();
      const backupHumanTags = evidenceData.tagsByHuman_backup || [];
      const backupAITags = evidenceData.tagsByAI_backup || [];

      if (backupHumanTags.length === 0 && backupAITags.length === 0) {
        throw new Error('No backup data found for rollback');
      }

      // Delete all subcollection tags
      const subcollectionTags = await this.tagService.getTagsForEvidence(evidenceId);
      const batch = writeBatch(db);

      for (const tag of subcollectionTags) {
        const tagRef = doc(db, 'teams', teamId, 'evidence', evidenceId, 'tags', tag.id);
        batch.delete(tagRef);
      }

      // Restore embedded arrays from backup
      batch.update(evidenceRef, {
        tagsByHuman: backupHumanTags,
        tagsByAI: backupAITags,
        tagCount: backupHumanTags.length + backupAITags.length,
        rolledBackAt: serverTimestamp(),
        // Remove migration metadata
        migratedAt: null,
        migrationVersion: null,
        // Keep backup for potential re-migration
        tagsByHuman_backup: backupHumanTags,
        tagsByAI_backup: backupAITags
      });

      await batch.commit();

      console.log(`[MigrationService] Successfully rolled back migration for ${evidenceId}`);

      return {
        evidenceId,
        status: 'success',
        restoredTagCount: backupHumanTags.length + backupAITags.length,
        deletedSubcollectionTags: subcollectionTags.length
      };

    } catch (error) {
      console.error(`[MigrationService] Failed to rollback migration for ${evidenceId}:`, error);
      throw error;
    }
  }
}

export default MigrationService;