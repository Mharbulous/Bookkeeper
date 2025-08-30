import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { collection, query, orderBy, limit, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { useAuthStore } from '../../../core/stores/auth.js';

export const useOrganizerCoreStore = defineStore('organizerCore', () => {
  // State
  const evidenceList = ref([]);
  const filteredEvidence = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const filterText = ref('');
  const isInitialized = ref(false);
  
  // Cache for display information
  const displayInfoCache = ref(new Map());

  // Auth store reference
  const authStore = useAuthStore();

  // Computed
  const evidenceCount = computed(() => evidenceList.value.length);
  const filteredCount = computed(() => filteredEvidence.value.length);

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
            
            evidence.push({
              id: doc.id,
              ...evidenceData,
              // Add computed display fields
              displayName: displayInfo.displayName,
              createdAt: displayInfo.createdAt,
            });
          }

          evidenceList.value = evidence;
          applyFilters(); // Update filtered results
          loading.value = false;
          isInitialized.value = true;

          console.log(`[OrganizerCore] Loaded ${evidence.length} evidence documents with display info`);
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
   * Apply text-based filtering to evidence list
   */
  const applyFilters = () => {
    if (!filterText.value.trim()) {
      filteredEvidence.value = [...evidenceList.value];
      return;
    }

    const searchTerm = filterText.value.toLowerCase().trim();
    
    filteredEvidence.value = evidenceList.value.filter((evidence) => {
      // Search in display name
      if (evidence.displayName?.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Extract and search in file extension from displayName
      const fileExtension = evidence.displayName?.includes('.')
        ? '.' + evidence.displayName.split('.').pop().toLowerCase()
        : '';
      
      if (fileExtension.includes(searchTerm)) {
        return true;
      }

      // Search in structured tags (tagsByHuman and tagsByAI)
      const structuredTags = [...(evidence.tagsByHuman || []), ...(evidence.tagsByAI || [])];
      if (structuredTags.some(tag => 
        tag.tagName?.toLowerCase().includes(searchTerm) ||
        tag.categoryName?.toLowerCase().includes(searchTerm)
      )) {
        return true;
      }

      // Search in legacy tags for backward compatibility
      if (evidence.tags && Array.isArray(evidence.tags)) {
        if (evidence.tags.some(tag => 
          tag.toLowerCase().includes(searchTerm)
        )) {
          return true;
        }
      }

      // Search in legacy tags array
      if (evidence.legacyTags && Array.isArray(evidence.legacyTags)) {
        if (evidence.legacyTags.some(tag => 
          tag.toLowerCase().includes(searchTerm)
        )) {
          return true;
        }
      }

      return false;
    });

    console.log(`[OrganizerCore] Filtered ${filteredEvidence.value.length} from ${evidenceList.value.length} documents`);
  };

  /**
   * Apply category-based filtering
   */
  const applyFiltersWithCategories = (categoryFilters = {}) => {
    if (!filterText.value.trim() && Object.keys(categoryFilters).length === 0) {
      filteredEvidence.value = [...evidenceList.value];
      return;
    }

    let filtered = [...evidenceList.value];

    // Apply text search first
    if (filterText.value.trim()) {
      const searchTerm = filterText.value.toLowerCase().trim();
      filtered = filtered.filter((evidence) => {
        return evidence.displayName?.toLowerCase().includes(searchTerm) ||
          getAllTags(evidence).some(tag => tag.toLowerCase().includes(searchTerm));
      });
    }

    // Apply category filters
    Object.entries(categoryFilters).forEach(([categoryId, selectedTags]) => {
      if (selectedTags.length > 0) {
        filtered = filtered.filter(evidence => {
          const structuredTags = [...(evidence.tagsByHuman || []), ...(evidence.tagsByAI || [])];
          return structuredTags.some(tag => 
            tag.categoryId === categoryId && selectedTags.includes(tag.tagName)
          );
        });
      }
    });

    filteredEvidence.value = filtered;
    console.log(`[OrganizerCore] Applied category filters: ${filtered.length} results`);
  };

  /**
   * Set filter text and apply filters
   */
  const setFilter = (text) => {
    filterText.value = text;
    applyFilters();
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    filterText.value = '';
    applyFilters();
  };

  /**
   * Get all tags (structured + legacy) for display purposes
   */
  const getAllTags = (evidence) => {
    const structuredTags = [...(evidence.tagsByHuman || []), ...(evidence.tagsByAI || [])];
    const structuredTagNames = structuredTags.map(tag => tag.tagName);
    const legacyTags = evidence.legacyTags || evidence.tags || [];
    
    return [...structuredTagNames, ...legacyTags];
  };

  /**
   * Get structured tags grouped by category for an evidence document
   */
  const getStructuredTagsByCategory = (evidence) => {
    const allStructuredTags = [...(evidence.tagsByHuman || []), ...(evidence.tagsByAI || [])];
    const grouped = {};
    
    allStructuredTags.forEach(tag => {
      if (!grouped[tag.categoryId]) {
        grouped[tag.categoryId] = {
          categoryName: tag.categoryName,
          tags: []
        };
      }
      grouped[tag.categoryId].tags.push(tag);
    });
    
    return grouped;
  };

  /**
   * Check if evidence has any tags (structured or legacy)
   */
  const hasAnyTags = (evidence) => {
    const hasStructured = (evidence.tagsByHuman?.length || 0) + (evidence.tagsByAI?.length || 0) > 0;
    const hasLegacy = (evidence.legacyTags?.length || 0) + (evidence.tags?.length || 0) > 0;
    return hasStructured || hasLegacy;
  };

  /**
   * Get evidence document by ID
   */
  const getEvidenceById = (evidenceId) => {
    return evidenceList.value.find(evidence => evidence.id === evidenceId);
  };

  /**
   * Reset store to initial state
   */
  const reset = () => {
    evidenceList.value = [];
    filteredEvidence.value = [];
    loading.value = false;
    error.value = null;
    filterText.value = '';
    isInitialized.value = false;
    displayInfoCache.value.clear();
  };

  return {
    // State
    evidenceList,
    filteredEvidence,
    loading,
    error,
    filterText,
    isInitialized,

    // Computed
    evidenceCount,
    filteredCount,

    // Actions
    loadEvidence,
    applyFilters,
    applyFiltersWithCategories,
    setFilter,
    clearFilters,
    getDisplayInfo,
    getAllTags,
    getStructuredTagsByCategory,
    hasAnyTags,
    getEvidenceById,
    reset
  };
});