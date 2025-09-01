import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { collection, query, orderBy, limit, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { useAuthStore } from '../../../core/stores/auth.js';
import tagSubcollectionService from '../services/tagSubcollectionService.js';
import { useCategoryStore } from './categoryStore.js';

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

  // Computed
  const evidenceCount = computed(() => evidenceList.value.length);

  /**
   * Load tags for an evidence document and structure them for both query and virtual folder stores
   */
  const loadTagsForEvidence = async (evidenceId, teamId) => {
    try {
      const tags = await tagService.getTags(evidenceId, {}, teamId);
      
      // Create both data structures for compatibility
      const subcollectionTags = []; // For organizerQueryStore (flat array)
      const groupedTags = {}; // For virtualFolderStore (category-grouped)
      
      tags.forEach(tag => {
        const categoryId = tag.id; // The document ID is the categoryId
        const category = categoryStore.getCategoryById(categoryId);
        const categoryName = category?.name || categoryId;
        
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
      });
      
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
        const displayInfo = {
          displayName: data.originalName || 'Unknown File',
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
          const evidence = [];
          
          // Process each evidence document
          for (const doc of snapshot.docs) {
            const evidenceData = doc.data();
            
            // Fetch display information from referenced metadata
            const displayInfo = await getDisplayInfo(evidenceData.displayCopy?.metadataHash, teamId);
            
            // Load tags for this evidence document
            const tagData = await loadTagsForEvidence(doc.id, teamId);
            
            evidence.push({
              id: doc.id,
              ...evidenceData,
              // Add computed display fields
              displayName: displayInfo.displayName,
              createdAt: displayInfo.createdAt,
              // Add tag data for both store compatibility
              subcollectionTags: tagData.subcollectionTags,
              tags: tagData.tags,
            });
          }

          evidenceList.value = evidence;
          loading.value = false;
          isInitialized.value = true;

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
    
    // Cache management
    clearDisplayCache,
    getCacheStats,
    
    // Data change notification
    notifyDataChange,
    
    // Utility
    reset
  };
});