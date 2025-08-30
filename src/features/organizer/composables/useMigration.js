import { ref, computed } from 'vue';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { useAuthStore } from '../../../core/stores/auth.js';
import { EvidenceService } from '../services/evidenceService.js';
import { useOrganizerStore } from '../stores/organizer.js';

/**
 * Composable for migrating existing upload metadata to evidence documents
 */
export function useMigration() {
  const authStore = useAuthStore();
  const organizerStore = useOrganizerStore();
  
  // State
  const isRunning = ref(false);
  const progress = ref({
    current: 0,
    total: 0,
    percentage: 0,
    stage: '',
    message: ''
  });
  
  const results = ref({
    successful: [],
    skipped: [],
    failed: []
  });
  
  const error = ref(null);
  
  // Computed
  const canRunMigration = computed(() => {
    return authStore.isAuthenticated && !isRunning.value;
  });
  
  const hasResults = computed(() => {
    return results.value.successful.length > 0 || 
           results.value.skipped.length > 0 || 
           results.value.failed.length > 0;
  });

  /**
   * Check if migration is needed by comparing upload metadata count vs evidence count
   */
  const checkMigrationNeeded = async () => {
    try {
      if (!authStore.isAuthenticated) {
        throw new Error('User not authenticated');
      }

      const teamId = authStore.currentTeam;
      if (!teamId) {
        throw new Error('No team ID available');
      }

      // Count existing evidence documents
      const evidenceCount = organizerStore.evidenceCount;

      // Count upload metadata documents
      const metadataRef = collection(db, 'teams', teamId, 'matters', 'general', 'metadata');
      const metadataSnapshot = await getDocs(metadataRef);
      const uploadCount = metadataSnapshot.size;

      console.log(`[Migration] Evidence: ${evidenceCount}, Uploads: ${uploadCount}`);

      // Migration needed if there are uploads but no evidence, or significantly fewer evidence docs
      return {
        needed: uploadCount > 0 && (evidenceCount === 0 || evidenceCount < uploadCount * 0.8),
        uploadCount,
        evidenceCount,
        message: uploadCount > evidenceCount 
          ? `${uploadCount - evidenceCount} documents need to be organized`
          : 'All documents are already organized'
      };
    } catch (err) {
      console.error('[Migration] Failed to check migration status:', err);
      throw err;
    }
  };

  /**
   * Fetch all upload metadata documents from Firestore
   */
  const fetchUploadMetadata = async () => {
    try {
      const teamId = authStore.currentTeam;
      if (!teamId) {
        throw new Error('No team ID available');
      }

      progress.value = {
        current: 0,
        total: 0,
        percentage: 0,
        stage: 'fetching',
        message: 'Fetching upload metadata...'
      };

      // Get all metadata documents from the upload system
      const metadataRef = collection(db, 'teams', teamId, 'matters', 'general', 'metadata');
      const metadataSnapshot = await getDocs(metadataRef);

      const uploadMetadata = [];
      metadataSnapshot.forEach((doc) => {
        const data = doc.data();
        uploadMetadata.push({
          id: doc.id,
          hash: data.fileHash || data.hash, // Support both field names
          originalName: data.originalName,
          lastModified: data.lastModified,
          size: data.size || 0,
          folderPaths: data.folderPaths || '',
          ...data
        });
      });

      console.log(`[Migration] Fetched ${uploadMetadata.length} upload metadata documents`);
      return uploadMetadata;
    } catch (err) {
      console.error('[Migration] Failed to fetch upload metadata:', err);
      throw err;
    }
  };

  /**
   * Run the complete migration process
   */
  const runMigration = async () => {
    if (!canRunMigration.value) {
      throw new Error('Cannot run migration: user not authenticated or migration already running');
    }

    try {
      isRunning.value = true;
      error.value = null;
      results.value = { successful: [], skipped: [], failed: [] };

      const teamId = authStore.currentTeam;
      const evidenceService = new EvidenceService(teamId);

      // Stage 1: Fetch upload metadata
      progress.value = {
        current: 0,
        total: 1,
        percentage: 0,
        stage: 'fetching',
        message: 'Fetching upload metadata...'
      };

      const uploadMetadata = await fetchUploadMetadata();
      
      if (uploadMetadata.length === 0) {
        progress.value = {
          current: 1,
          total: 1,
          percentage: 100,
          stage: 'complete',
          message: 'No uploads found to migrate'
        };
        return results.value;
      }

      // Stage 2: Check existing evidence documents
      progress.value = {
        current: 0,
        total: uploadMetadata.length,
        percentage: 5,
        stage: 'checking',
        message: 'Checking existing evidence documents...'
      };

      const existingEvidence = new Set();
      for (const evidence of organizerStore.evidenceList) {
        if (evidence.storageRef?.fileHash) {
          existingEvidence.add(evidence.storageRef.fileHash);
        }
      }

      // Stage 3: Create evidence documents
      progress.value = {
        current: 0,
        total: uploadMetadata.length,
        percentage: 10,
        stage: 'creating',
        message: 'Creating evidence documents...'
      };

      let processed = 0;
      const batchSize = 10; // Process in batches to avoid overwhelming Firestore

      for (let i = 0; i < uploadMetadata.length; i += batchSize) {
        const batch = uploadMetadata.slice(i, i + batchSize);
        
        for (const upload of batch) {
          try {
            processed++;
            
            // Update progress
            progress.value = {
              current: processed,
              total: uploadMetadata.length,
              percentage: Math.round(10 + (processed / uploadMetadata.length) * 85),
              stage: 'creating',
              message: `Processing ${upload.originalName}...`
            };

            // Skip if evidence already exists for this file hash
            if (existingEvidence.has(upload.hash)) {
              results.value.skipped.push({
                hash: upload.hash,
                originalName: upload.originalName,
                reason: 'Evidence already exists'
              });
              continue;
            }

            // Create evidence document
            const evidenceId = await evidenceService.createEvidenceFromUpload(upload);
            
            results.value.successful.push({
              evidenceId,
              hash: upload.hash,
              originalName: upload.originalName
            });

            // Add to existing set to avoid duplicates in same batch
            existingEvidence.add(upload.hash);

          } catch (err) {
            console.error(`[Migration] Failed to migrate ${upload.originalName}:`, err);
            results.value.failed.push({
              hash: upload.hash,
              originalName: upload.originalName,
              error: err.message
            });
          }
        }

        // Small delay between batches to be nice to Firestore
        if (i + batchSize < uploadMetadata.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Stage 4: Complete
      progress.value = {
        current: uploadMetadata.length,
        total: uploadMetadata.length,
        percentage: 100,
        stage: 'complete',
        message: `Migration complete: ${results.value.successful.length} created, ${results.value.skipped.length} skipped, ${results.value.failed.length} failed`
      };

      console.log('[Migration] Migration complete:', {
        successful: results.value.successful.length,
        skipped: results.value.skipped.length,
        failed: results.value.failed.length
      });

      // Reload evidence to show new documents
      await organizerStore.loadEvidence();

      return results.value;

    } catch (err) {
      console.error('[Migration] Migration failed:', err);
      error.value = err.message;
      throw err;
    } finally {
      isRunning.value = false;
    }
  };

  /**
   * Reset migration state
   */
  const reset = () => {
    progress.value = {
      current: 0,
      total: 0,
      percentage: 0,
      stage: '',
      message: ''
    };
    results.value = { successful: [], skipped: [], failed: [] };
    error.value = null;
  };

  /**
   * Get a summary of migration results
   */
  const getSummary = () => {
    if (!hasResults.value) {
      return null;
    }

    return {
      total: results.value.successful.length + results.value.skipped.length + results.value.failed.length,
      successful: results.value.successful.length,
      skipped: results.value.skipped.length,
      failed: results.value.failed.length,
      successRate: results.value.successful.length / (results.value.successful.length + results.value.failed.length) * 100
    };
  };

  return {
    // State
    isRunning,
    progress,
    results,
    error,

    // Computed
    canRunMigration,
    hasResults,

    // Methods
    checkMigrationNeeded,
    runMigration,
    reset,
    getSummary
  };
}