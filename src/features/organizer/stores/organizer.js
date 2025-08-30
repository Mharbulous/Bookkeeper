import { defineStore } from 'pinia';
import { computed, watch } from 'vue';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { useAuthStore } from '../../../core/stores/auth.js';

// Import decomposed stores
import { useOrganizerCoreStore } from './organizerCore.js';
import { useOrganizerQueryStore } from './organizerQueryStore.js';
import { useCategoryStore } from './categoryStore.js';
import { useTagStore } from './tagStore.js';
import { useMigrationStore } from './migrationStore.js';

/**
 * Main Organizer Store - Facade pattern combining decomposed stores
 * Maintains backward compatibility while providing structured functionality
 */
export const useOrganizerStore = defineStore('organizer', () => {
  // Get store instances
  const coreStore = useOrganizerCoreStore();
  const queryStore = useOrganizerQueryStore();
  const categoryStore = useCategoryStore();
  const tagStore = useTagStore();
  const migrationStore = useMigrationStore();
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
   * Legacy method: Update evidence tags (backward compatibility)
   * Now handles both legacy and structured tags
   */
  const updateEvidenceTags = async (evidenceId, newTags) => {
    try {
      if (!authStore.isAuthenticated) {
        throw new Error('User not authenticated');
      }

      const teamId = authStore.currentTeam;
      if (!teamId) {
        throw new Error('No team ID available');
      }

      // Validate tags
      if (!Array.isArray(newTags)) {
        throw new Error('Tags must be an array');
      }

      // Clean and deduplicate tags
      const cleanedTags = [...new Set(
        newTags
          .map(tag => tag.toString().trim())
          .filter(tag => tag.length > 0)
      )];

      // Get current evidence to preserve structured tags
      const evidence = coreStore.getEvidenceById(evidenceId);
      if (!evidence) {
        throw new Error('Evidence document not found');
      }

      // Update in Firestore - preserve structured tags, update legacy tags
      const evidenceRef = doc(db, 'teams', teamId, 'evidence', evidenceId);
      await updateDoc(evidenceRef, {
        tags: cleanedTags, // Legacy tags for backward compatibility
        legacyTags: cleanedTags, // Explicit legacy tags storage
        tagCount: (evidence.tagsByHuman?.length || 0) + (evidence.tagsByAI?.length || 0) + cleanedTags.length,
        lastTaggedAt: serverTimestamp(),
        taggedBy: 'manual',
        updatedAt: serverTimestamp(),
      });

      console.log(`[OrganizerStore] Updated legacy tags for evidence ${evidenceId}:`, cleanedTags);
      return true;
    } catch (err) {
      console.error('[OrganizerStore] Failed to update tags:', err);
      throw err;
    }
  };

  /**
   * Legacy method: Add a single tag (backward compatibility)
   */
  const addTag = async (evidenceId, tagText) => {
    try {
      const evidence = coreStore.getEvidenceById(evidenceId);
      if (!evidence) {
        throw new Error('Evidence document not found');
      }

      const currentTags = evidence.tags || evidence.legacyTags || [];
      const newTag = tagText.toString().trim();
      
      if (!newTag) {
        throw new Error('Tag cannot be empty');
      }

      if (currentTags.includes(newTag)) {
        return; // Tag already exists
      }

      const updatedTags = [...currentTags, newTag];
      await updateEvidenceTags(evidenceId, updatedTags);
    } catch (err) {
      console.error('[OrganizerStore] Failed to add tag:', err);
      throw err;
    }
  };

  /**
   * Legacy method: Remove a single tag (backward compatibility)
   */
  const removeTag = async (evidenceId, tagText) => {
    try {
      const evidence = coreStore.getEvidenceById(evidenceId);
      if (!evidence) {
        throw new Error('Evidence document not found');
      }

      const currentTags = evidence.tags || evidence.legacyTags || [];
      const updatedTags = currentTags.filter(tag => tag !== tagText);
      
      await updateEvidenceTags(evidenceId, updatedTags);
    } catch (err) {
      console.error('[OrganizerStore] Failed to remove tag:', err);
      throw err;
    }
  };

  /**
   * Legacy method: Get all tags for display (backward compatibility)
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
    migrationStore.reset();
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
    updateEvidenceTags,
    addTag,
    removeTag,
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
    
    // Tag management (structured)
    updateEvidenceStructuredTags: tagStore.updateEvidenceStructuredTags,
    addStructuredTag: tagStore.addStructuredTag,
    removeStructuredTag: tagStore.removeStructuredTag,
    replaceTagsInCategory: tagStore.replaceTagsInCategory,
    createStructuredTag: tagStore.createStructuredTag,
    groupTagsByCategory: tagStore.groupTagsByCategory,
    
    // Advanced filtering
    applyFiltersWithCategories: queryStore.applyFiltersWithCategories,
    getStructuredTagsByCategory: queryStore.getStructuredTagsByCategory,
    hasAnyTags: queryStore.hasAnyTags,
    
    // Migration features
    migrationStatus: computed(() => migrationStore.migrationStatus),
    migrationProgress: computed(() => migrationStore.migrationProgress),
    migrationResults: computed(() => migrationStore.migrationResults),
    analyzeLegacyTags: migrationStore.analyzeLegacyTags,
    performAutoMigration: migrationStore.performAutoMigration,
    rollbackMigration: migrationStore.rollbackMigration,
    
    // Initialization
    initialize,
    
    // Store references for advanced usage
    stores: {
      core: coreStore,
      query: queryStore,
      category: categoryStore,
      tag: tagStore,
      migration: migrationStore
    }
  };
});