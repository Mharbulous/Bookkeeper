import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useOrganizerCoreStore } from './organizerCore.js';

export const useOrganizerQueryStore = defineStore('organizerQuery', () => {
  // State
  const filterText = ref('');
  const filteredEvidence = ref([]);

  // Get core store reference for data access
  const coreStore = useOrganizerCoreStore();

  // Computed
  const filteredCount = computed(() => filteredEvidence.value.length);

  /**
   * Apply text-based filtering to evidence list
   */
  const applyFilters = () => {
    if (!filterText.value.trim()) {
      filteredEvidence.value = [...coreStore.evidenceList];
      return;
    }

    const searchTerm = filterText.value.toLowerCase().trim();
    
    filteredEvidence.value = coreStore.evidenceList.filter((evidence) => {
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

      // Search in subcollection tags (new tag system)
      const allTags = getAllTags(evidence);
      if (allTags.some(tag => 
        tag.tagName?.toLowerCase().includes(searchTerm) ||
        tag.categoryName?.toLowerCase().includes(searchTerm)
      )) {
        return true;
      }

      return false;
    });

    console.log(`[OrganizerQuery] Filtered ${filteredEvidence.value.length} from ${coreStore.evidenceList.length} documents`);
  };

  /**
   * Apply category-based filtering
   */
  const applyFiltersWithCategories = (categoryFilters = {}) => {
    if (!filterText.value.trim() && Object.keys(categoryFilters).length === 0) {
      filteredEvidence.value = [...coreStore.evidenceList];
      return;
    }

    let filtered = [...coreStore.evidenceList];

    // Apply text search first
    if (filterText.value.trim()) {
      const searchTerm = filterText.value.toLowerCase().trim();
      filtered = filtered.filter((evidence) => {
        return evidence.displayName?.toLowerCase().includes(searchTerm) ||
          getAllTags(evidence).some(tag => 
            tag.tagName?.toLowerCase().includes(searchTerm) ||
            tag.categoryName?.toLowerCase().includes(searchTerm)
          );
      });
    }

    // Apply category filters
    Object.entries(categoryFilters).forEach(([categoryId, selectedTags]) => {
      if (selectedTags.length > 0) {
        filtered = filtered.filter(evidence => {
          const allTags = getAllTags(evidence);
          return allTags.some(tag => 
            tag.categoryId === categoryId && selectedTags.includes(tag.tagName)
          );
        });
      }
    });

    filteredEvidence.value = filtered;
    console.log(`[OrganizerQuery] Applied category filters: ${filtered.length} results`);
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
   * Get all subcollection tags for display purposes
   * Note: This now returns tag objects, not just strings
   */
  const getAllTags = (evidence) => {
    // This method should ideally load from the subcollection
    // For now, return empty array since subcollection loading
    // should be handled at the component level
    return evidence.subcollectionTags || [];
  };

  /**
   * Get subcollection tags grouped by category for an evidence document
   */
  const getStructuredTagsByCategory = (evidence) => {
    const allTags = getAllTags(evidence);
    const grouped = {};
    
    allTags.forEach(tag => {
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
   * Check if evidence has any subcollection tags
   */
  const hasAnyTags = (evidence) => {
    const subcollectionTagsCount = getAllTags(evidence).length;
    return subcollectionTagsCount > 0;
  };

  /**
   * Initialize filters based on current evidence list
   * Called when evidence data changes
   */
  const initializeFilters = () => {
    if (!filterText.value.trim()) {
      filteredEvidence.value = [...coreStore.evidenceList];
    } else {
      applyFilters();
    }
  };





  /**
   * Reset query store to initial state
   */
  const reset = () => {
    filterText.value = '';
    filteredEvidence.value = [];
  };

  return {
    // State
    filterText,
    filteredEvidence,

    // Computed
    filteredCount,

    // Basic filtering actions
    applyFilters,
    applyFiltersWithCategories,
    setFilter,
    clearFilters,
    initializeFilters,

    // Tag utility functions
    getAllTags,
    getStructuredTagsByCategory,
    hasAnyTags,


    // Utility
    reset
  };
});