import { defineStore } from 'pinia';
import { computed, watch } from 'vue';
import { db } from '../../../services/firebase.js';
import { useAuthStore } from '../../../core/stores/auth.js';

// Import decomposed stores
import { useOrganizerCoreStore } from './organizerCore.js';
import { useOrganizerQueryStore } from './organizerQueryStore.js';
import { useCategoryStore } from './categoryStore.js';
import { useVirtualFolderStore } from './virtualFolderStore.js';

/**
 * Main Organizer Store - Facade pattern combining decomposed stores
 * Maintains backward compatibility while providing structured functionality
 */
export const useOrganizerStore = defineStore('organizer', () => {
  // Get store instances
  const coreStore = useOrganizerCoreStore();
  const queryStore = useOrganizerQueryStore();
  const categoryStore = useCategoryStore();
  const virtualFolderStore = useVirtualFolderStore();
  const authStore = useAuthStore();

  // Watch core store evidence changes to update query store and clear folder cache
  watch(
    () => coreStore.evidenceList,
    () => {
      queryStore.initializeFilters();
      virtualFolderStore.clearFolderCache();
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
      console.log(`[DEBUG ORGANIZER LOADING] Organizer initialization started at: ${new Date().toISOString()} (${Date.now()})`);
      
      // Load evidence and categories in parallel
      const [evidenceUnsubscribe, categoryUnsubscribe] = await Promise.all([
        coreStore.loadEvidence(),
        categoryStore.loadCategories()
      ]);
      
      console.log(`[DEBUG ORGANIZER LOADING] Organizer initialization completed at: ${new Date().toISOString()} (${Date.now()})`);
      
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
    virtualFolderStore.reset();
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
    refreshEvidenceTags: coreStore.refreshEvidenceTags,

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
    
    // === NEW v1.3 FEATURES - Virtual Folder System ===
    // Virtual folder state
    viewMode: computed(() => virtualFolderStore.viewMode),
    isFolderMode: computed(() => virtualFolderStore.isFolderMode),
    folderHierarchy: computed(() => virtualFolderStore.folderHierarchy),
    currentPath: computed(() => virtualFolderStore.currentPath),
    breadcrumbPath: computed(() => virtualFolderStore.breadcrumbPath),
    isAtRoot: computed(() => virtualFolderStore.isAtRoot),
    currentDepth: computed(() => virtualFolderStore.currentDepth),
    
    // Virtual folder navigation
    setViewMode: virtualFolderStore.setViewMode,
    setFolderHierarchy: virtualFolderStore.setFolderHierarchy,
    navigateToFolder: virtualFolderStore.navigateToFolder,
    navigateToDepth: virtualFolderStore.navigateToDepth,
    navigateBack: virtualFolderStore.navigateBack,
    navigateToRoot: virtualFolderStore.navigateToRoot,
    
    // Virtual folder structure generation
    generateFolderStructure: virtualFolderStore.generateFolderStructure,
    filterEvidenceByPath: virtualFolderStore.filterEvidenceByPath,
    getFolderContext: virtualFolderStore.getFolderContext,

    // Store references for advanced usage
    stores: {
      core: coreStore,
      query: queryStore,
      category: categoryStore,
      virtualFolder: virtualFolderStore,
    }
  };
});