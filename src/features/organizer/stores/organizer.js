import { defineStore } from 'pinia';
import { computed, watch } from 'vue';
import { db } from '../../../services/firebase.js';
import { useAuthStore } from '../../../core/stores/auth.js';

// Import decomposed stores
import { useOrganizerCoreStore } from './organizerCore.js';
import { useOrganizerQueryStore } from './organizerQueryStore.js';
import { useCategoryStore } from './categoryStore.js';

/**
 * Main Organizer Store - Facade pattern combining decomposed stores
 * Maintains backward compatibility while providing structured functionality
 */
export const useOrganizerStore = defineStore('organizer', () => {
  // Get store instances
  const coreStore = useOrganizerCoreStore();
  const queryStore = useOrganizerQueryStore();
  const categoryStore = useCategoryStore();
  const authStore = useAuthStore();

  // Watch core store evidence changes to update query store
  watch(
    () => coreStore.evidenceList,
    () => {
      queryStore.initializeFilters();
    },
    { deep: true }
  );

  // Computed properties combining data from multiple stores
  const evidenceCount = computed(() => coreStore.evidenceCount);
  const filteredCount = computed(() => queryStore.filteredCount);
  const isInitialized = computed(() => 
    coreStore.isInitialized && categoryStore.isInitialized
  );

  /**
   * Initialize all stores
   */
  const initialize = async () => {
    try {
      // Load evidence and categories in parallel
      const [evidenceUnsubscribe, categoryUnsubscribe] = await Promise.all([
        coreStore.loadEvidence(),
        categoryStore.loadCategories()
      ]);
      
      return { evidenceUnsubscribe, categoryUnsubscribe };
    } catch (err) {
      console.error('[OrganizerStore] Failed to initialize:', err);
      throw err;
    }
  };


  /**
   * Get all tags for display
   */
  const getAllTags = (evidence) => {
    return queryStore.getAllTags(evidence);
  };

  /**
   * Reset all stores
   */
  const reset = () => {
    coreStore.reset();
    queryStore.reset();
    categoryStore.reset();
  };

  // Return interface maintaining backward compatibility + new features
  return {
    // === BACKWARD COMPATIBILITY - Existing v1.0 Interface ===
    // State (delegated to stores)
    evidenceList: computed(() => coreStore.evidenceList),
    filteredEvidence: computed(() => queryStore.filteredEvidence),
    loading: computed(() => coreStore.loading || categoryStore.loading),
    error: computed(() => coreStore.error || categoryStore.error),
    filterText: computed(() => queryStore.filterText),
    isInitialized,

    // Computed (delegated)
    evidenceCount,
    filteredCount,

    // Legacy Actions (backward compatibility)
    loadEvidence: coreStore.loadEvidence,
    setFilter: queryStore.setFilter,
    clearFilters: queryStore.clearFilters,
    reset,
    getDisplayInfo: coreStore.getDisplayInfo,
    getAllTags,

    // === NEW v1.1 FEATURES ===
    // Store access
    core: coreStore,
    query: queryStore,
    
    // Category management
    categories: computed(() => categoryStore.categories),
    categoryCount: computed(() => categoryStore.categoryCount),
    activeCategories: computed(() => categoryStore.activeCategories),
    
    // Category actions
    createCategory: categoryStore.createCategory,
    updateCategory: categoryStore.updateCategory,
    deleteCategory: categoryStore.deleteCategory,
    getCategoryById: categoryStore.getCategoryById,
    
    
    // Advanced filtering
    applyFiltersWithCategories: queryStore.applyFiltersWithCategories,
    getStructuredTagsByCategory: queryStore.getStructuredTagsByCategory,
    hasAnyTags: queryStore.hasAnyTags,
    
    
    // Initialization
    initialize,
    
    // Store references for advanced usage
    stores: {
      core: coreStore,
      query: queryStore,
      category: categoryStore,
    }
  };
});