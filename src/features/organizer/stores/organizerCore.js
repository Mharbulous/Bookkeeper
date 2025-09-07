import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { collection, query, orderBy, limit, onSnapshot, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { useAuthStore } from '../../../core/stores/auth.js';
import tagSubcollectionService from '../services/tagSubcollectionService.js';
import { useCategoryStore } from './categoryStore.js';
import { FileProcessingService } from '../services/fileProcessingService.js';

export const useOrganizerCoreStore = defineStore('organizerCore', () => {
  // State
  const evidenceList = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const isInitialized = ref(false);
  
  // Cache for display information
  const displayInfoCache = ref(new Map());

  // Store references
  const authStore = useAuthStore();
  const categoryStore = useCategoryStore();
  
  // Tag service instance (use imported singleton)
  const tagService = tagSubcollectionService;
  
  // File processing service for file size fallback
  const fileProcessingService = new FileProcessingService();

  // Computed
  const evidenceCount = computed(() => evidenceList.value.length);

  /**
   * Load tags for an evidence document and structure them for both query and virtual folder stores
   * Includes category validation and orphaned tag cleanup
   */
  const loadTagsForEvidence = async (evidenceId, teamId) => {
    try {
      const tags = await tagService.getTags(evidenceId, {}, teamId);
      
      // If no tags exist, return early
      if (!tags || tags.length === 0) {
        return {
          subcollectionTags: [],
          tags: {}
        };
      }
      
      // Ensure category store is initialized before validation
      if (!categoryStore.isInitialized) {
        console.warn(`[OrganizerCore] Category store not initialized, skipping tag validation for evidence ${evidenceId}`);
        // Return tags without validation if category store isn't ready
        return {
          subcollectionTags: tags.map(tag => ({
            categoryId: tag.id,
            categoryName: tag.id,
            tagName: tag.tagName,
            name: tag.tagName,
            confidence: tag.confidence,
            status: tag.status,
            autoApproved: tag.autoApproved
          })),
          tags: {}
        };
      }
      
      // Create both data structures for compatibility
      const subcollectionTags = []; // For organizerQueryStore (flat array)
      const groupedTags = {}; // For virtualFolderStore (category-grouped)
      const tagsToDelete = []; // Track orphaned tags for cleanup
      
      for (const tag of tags) {
        const categoryId = tag.id; // The document ID is the categoryId
        const category = categoryStore.getCategoryById(categoryId);
        
        // Check category validation
        if (!category) {
          // Category doesn't exist - delete the orphaned tag
          console.warn(`[OrganizerCore] Found orphaned tag for deleted category ${categoryId}, marking for deletion`);
          tagsToDelete.push(categoryId);
          continue;
        }
        
        if (category.isActive === false) {
          // Category exists but is inactive - skip display but don't delete tag
          console.log(`[OrganizerCore] Skipping tag for inactive category ${categoryId} (${category.name})`);
          continue;
        }
        
        // Category is valid and active - include the tag
        const categoryName = category.name || categoryId;
        
        const tagData = {
          categoryId,
          categoryName,
          tagName: tag.tagName,
          name: tag.tagName, // Add 'name' property for backward compatibility
          confidence: tag.confidence,
          status: tag.status,
          autoApproved: tag.autoApproved
        };
        
        // Add to flat array for queryStore
        subcollectionTags.push(tagData);
        
        // Add to grouped structure for virtualFolderStore
        if (!groupedTags[categoryId]) {
          groupedTags[categoryId] = [];
        }
        groupedTags[categoryId].push(tagData);
      }
      
      // Clean up orphaned tags in background
      if (tagsToDelete.length > 0) {
        cleanupOrphanedTags(evidenceId, teamId, tagsToDelete).catch(error => {
          console.error(`[OrganizerCore] Failed to cleanup orphaned tags for evidence ${evidenceId}:`, error);
        });
      }
      
      return {
        subcollectionTags,
        tags: groupedTags
      };
    } catch (error) {
      console.warn(`[OrganizerCore] Failed to load tags for evidence ${evidenceId}:`, error);
      return {
        subcollectionTags: [],
        tags: {}
      };
    }
  };

  /**
   * Clean up orphaned tags (tags belonging to deleted categories)
   */
  const cleanupOrphanedTags = async (evidenceId, teamId, categoryIdsToDelete) => {
    try {
      console.log(`[OrganizerCore] Cleaning up ${categoryIdsToDelete.length} orphaned tags for evidence ${evidenceId}`);
      
      for (const categoryId of categoryIdsToDelete) {
        await tagService.deleteTag(evidenceId, categoryId, teamId);
        console.log(`[OrganizerCore] Deleted orphaned tag for category ${categoryId}`);
      }
      
      console.log(`[OrganizerCore] Successfully cleaned up orphaned tags`);
    } catch (error) {
      console.error('[OrganizerCore] Failed to cleanup orphaned tags:', error);
      // Don't throw - this is background cleanup
    }
  };

  /**
   * Fetch display information from originalMetadata collection
   */
  const getDisplayInfo = async (metadataHash, teamId) => {
    try {
      // Check cache first
      if (displayInfoCache.value.has(metadataHash)) {
        return displayInfoCache.value.get(metadataHash);
      }

      // Fetch from Firestore
      const metadataRef = doc(db, 'teams', teamId, 'matters', 'general', 'originalMetadata', metadataHash);
      const metadataDoc = await getDoc(metadataRef);
      
      if (metadataDoc.exists()) {
        const data = metadataDoc.data();
        
        // Normalize display name to use lowercase extension for consistency
        let displayName = data.originalName || 'Unknown File';
        if (displayName !== 'Unknown File') {
          const parts = displayName.split('.');
          if (parts.length > 1) {
            parts[parts.length - 1] = parts[parts.length - 1].toLowerCase();
            displayName = parts.join('.');
          }
        }
        
        const displayInfo = {
          displayName: displayName,
          createdAt: data.lastModified || null
        };
        
        // Cache the result
        displayInfoCache.value.set(metadataHash, displayInfo);
        return displayInfo;
      } else {
        console.warn(`[OrganizerCore] Metadata not found for hash: ${metadataHash}`);
        return {
          displayName: 'Unknown File',
          createdAt: null
        };
      }
    } catch (error) {
      console.error(`[OrganizerCore] Failed to fetch display info for ${metadataHash}:`, error);
      return {
        displayName: 'Unknown File',
        createdAt: null
      };
    }
  };

  /**
   * Load evidence documents from Firestore with real-time updates
   */
  const loadEvidence = async () => {
    if (!authStore.isAuthenticated) {
      error.value = 'User not authenticated';
      return;
    }

    try {
      loading.value = true;
      error.value = null;
      
      // DEBUG: Log when loading starts
      console.log(`[DEBUG ORGANIZER LOADING] Core store loading started at: ${new Date().toISOString()} (${Date.now()})`);

      const teamId = authStore.currentTeam;
      if (!teamId) {
        throw new Error('No team ID available');
      }

      // Create query for evidence collection
      const evidenceRef = collection(db, 'teams', teamId, 'evidence');
      const evidenceQuery = query(
        evidenceRef,
        orderBy('updatedAt', 'desc'),
        limit(1000) // Reasonable limit for v1.0
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        evidenceQuery,
        async (snapshot) => {
          console.log(`[DEBUG ORGANIZER LOADING] Firestore snapshot received at: ${new Date().toISOString()} (${Date.now()}) with ${snapshot.docs.length} documents`);
          
          const evidence = [];
          
          // Process each evidence document
          let processedCount = 0;
          for (const docSnapshot of snapshot.docs) {
            const evidenceData = docSnapshot.data();
            
            // Fetch display information from referenced metadata
            const displayInfo = await getDisplayInfo(evidenceData.displayCopy?.metadataHash, teamId);
            
            // Load tags for this evidence document
            const tagData = await loadTagsForEvidence(docSnapshot.id, teamId);
            
            // File size fallback and auto-migration
            let finalFileSize = evidenceData.fileSize || 0;
            if (!finalFileSize && evidenceData.storageRef?.fileHash) {
              try {
                const storageFileSize = await fileProcessingService.getFileSize(evidenceData, teamId);
                if (storageFileSize > 0) {
                  finalFileSize = storageFileSize;
                  
                  // Auto-migrate: Update Evidence document with correct file size
                  const evidenceDocRef = doc(db, 'teams', teamId, 'evidence', docSnapshot.id);
                  await updateDoc(evidenceDocRef, {
                    fileSize: storageFileSize
                  });
                  console.log(`[OrganizerCore] Auto-migrated file size for evidence ${docSnapshot.id}: ${storageFileSize} bytes`);
                }
              } catch (error) {
                console.warn(`[OrganizerCore] Failed to get file size fallback for evidence ${docSnapshot.id}:`, error);
              }
            }
            
            processedCount++;
            if (processedCount % 10 === 0 || processedCount === snapshot.docs.length) {
              console.log(`[DEBUG ORGANIZER LOADING] Processed ${processedCount}/${snapshot.docs.length} documents at: ${new Date().toISOString()}`);
            }
            
            evidence.push({
              id: docSnapshot.id,
              ...evidenceData,
              // Add computed display fields
              displayName: displayInfo.displayName,
              createdAt: displayInfo.createdAt,
              fileSize: finalFileSize,
              // Add tag data for both store compatibility
              subcollectionTags: tagData.subcollectionTags,
              tags: tagData.tags,
            });
          }

          evidenceList.value = evidence;
          loading.value = false;
          isInitialized.value = true;

          console.log(`[DEBUG ORGANIZER LOADING] Core store loading completed at: ${new Date().toISOString()} (${Date.now()})`);
          console.log(`[OrganizerCore] Loaded ${evidence.length} evidence documents with display info`);
          
          // Notify query store to update filters if it exists
          notifyDataChange();
        },
        (err) => {
          console.error('[OrganizerCore] Error loading evidence:', err);
          error.value = err.message;
          loading.value = false;
        }
      );

      // Return unsubscribe function for cleanup
      return unsubscribe;
    } catch (err) {
      console.error('[OrganizerCore] Failed to load evidence:', err);
      error.value = err.message;
      loading.value = false;
    }
  };

  /**
   * Notify external stores that data has changed
   * This allows the query store to update its filters
   */
  const notifyDataChange = () => {
    // This will be called when evidence data changes
    // Query store can watch evidenceList to respond to changes
    console.log(`[OrganizerCore] Data change notification sent`);
  };




  /**
   * Get evidence document by ID
   */
  const getEvidenceById = (evidenceId) => {
    return evidenceList.value.find(evidence => evidence.id === evidenceId);
  };

  /**
   * Update evidence data after external changes
   * Called when evidence documents are modified externally
   */
  const refreshEvidence = async (evidenceId) => {
    try {
      const teamId = authStore.currentTeam;
      if (!teamId || !evidenceId) return;

      // Find the evidence in current list
      const evidenceIndex = evidenceList.value.findIndex(e => e.id === evidenceId);
      if (evidenceIndex === -1) return;

      // Re-fetch display info to ensure cache is fresh
      const evidence = evidenceList.value[evidenceIndex];
      const displayInfo = await getDisplayInfo(evidence.displayCopy?.metadataHash, teamId);
      
      // Update the evidence with fresh display info
      evidenceList.value[evidenceIndex] = {
        ...evidence,
        displayName: displayInfo.displayName,
        createdAt: displayInfo.createdAt
      };
      
      notifyDataChange();
      console.log(`[OrganizerCore] Refreshed evidence ${evidenceId}`);
    } catch (err) {
      console.error('[OrganizerCore] Failed to refresh evidence:', err);
    }
  };

  /**
   * Refresh tags for a specific evidence document after external changes
   * Called when tags are modified externally (e.g., after AI processing)
   */
  const refreshEvidenceTags = async (evidenceId) => {
    try {
      const teamId = authStore.currentTeam;
      if (!teamId || !evidenceId) return;

      // Find the evidence in current list
      const evidenceIndex = evidenceList.value.findIndex(e => e.id === evidenceId);
      if (evidenceIndex === -1) {
        console.warn(`[OrganizerCore] Evidence ${evidenceId} not found for tag refresh`);
        return;
      }

      // Re-load tags for this evidence document
      const tagData = await loadTagsForEvidence(evidenceId, teamId);
      
      // Update the evidence with fresh tag data
      evidenceList.value[evidenceIndex] = {
        ...evidenceList.value[evidenceIndex],
        subcollectionTags: tagData.subcollectionTags,
        tags: tagData.tags,
      };
      
      notifyDataChange();
      console.log(`[OrganizerCore] Refreshed tags for evidence ${evidenceId}`);
    } catch (err) {
      console.error('[OrganizerCore] Failed to refresh evidence tags:', err);
    }
  };

  /**
   * Clear display info cache
   */
  const clearDisplayCache = () => {
    displayInfoCache.value.clear();
    console.log('[OrganizerCore] Display info cache cleared');
  };

  /**
   * Get cache statistics for monitoring
   */
  const getCacheStats = () => {
    return {
      size: displayInfoCache.value.size,
      entries: Array.from(displayInfoCache.value.keys())
    };
  };

  /**
   * Reset store to initial state
   */
  const reset = () => {
    evidenceList.value = [];
    loading.value = false;
    error.value = null;
    isInitialized.value = false;
    displayInfoCache.value.clear();
  };

  return {
    // State
    evidenceList,
    loading,
    error,
    isInitialized,

    // Computed
    evidenceCount,

    // Core data management actions
    loadEvidence,
    getDisplayInfo,
    getEvidenceById,
    refreshEvidence,
    refreshEvidenceTags,
    
    // Cache management
    clearDisplayCache,
    getCacheStats,
    
    // Data change notification
    notifyDataChange,
    
    // Utility
    reset
  };
});