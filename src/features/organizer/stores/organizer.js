import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { useAuthStore } from '../../../core/stores/auth.js';

export const useOrganizerStore = defineStore('organizer', () => {
  // State
  const evidenceList = ref([]);
  const filteredEvidence = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const filterText = ref('');
  const isInitialized = ref(false);

  // Auth store reference
  const authStore = useAuthStore();

  // Computed
  const evidenceCount = computed(() => evidenceList.value.length);
  const filteredCount = computed(() => filteredEvidence.value.length);

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
        orderBy('createdAt', 'desc'),
        limit(1000) // Reasonable limit for v1.0
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        evidenceQuery,
        (snapshot) => {
          const evidence = [];
          snapshot.forEach((doc) => {
            evidence.push({
              id: doc.id,
              ...doc.data(),
            });
          });

          evidenceList.value = evidence;
          applyFilters(); // Update filtered results
          loading.value = false;
          isInitialized.value = true;

          console.log(`[Organizer] Loaded ${evidence.length} evidence documents`);
        },
        (err) => {
          console.error('[Organizer] Error loading evidence:', err);
          error.value = err.message;
          loading.value = false;
        }
      );

      // Return unsubscribe function for cleanup
      return unsubscribe;
    } catch (err) {
      console.error('[Organizer] Failed to load evidence:', err);
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

      // Search in original name
      if (evidence.originalName?.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Search in file extension
      if (evidence.fileExtension?.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Search in tags
      if (evidence.tags && Array.isArray(evidence.tags)) {
        return evidence.tags.some(tag => 
          tag.toLowerCase().includes(searchTerm)
        );
      }

      return false;
    });

    console.log(`[Organizer] Filtered ${filteredEvidence.value.length} from ${evidenceList.value.length} documents`);
  };

  /**
   * Update tags for a specific evidence document
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

      // Optimistic update - update local state immediately
      const evidenceIndex = evidenceList.value.findIndex(e => e.id === evidenceId);
      if (evidenceIndex >= 0) {
        evidenceList.value[evidenceIndex].tags = cleanedTags;
        evidenceList.value[evidenceIndex].tagCount = cleanedTags.length;
        evidenceList.value[evidenceIndex].lastTaggedAt = new Date().toISOString();
        evidenceList.value[evidenceIndex].taggedBy = 'manual';
        evidenceList.value[evidenceIndex].updatedAt = new Date().toISOString();
        
        applyFilters(); // Re-apply filters to update filtered results
      }

      // Update in Firestore
      const evidenceRef = doc(db, 'teams', teamId, 'evidence', evidenceId);
      await updateDoc(evidenceRef, {
        tags: cleanedTags,
        tagCount: cleanedTags.length,
        lastTaggedAt: serverTimestamp(),
        taggedBy: 'manual',
        updatedAt: serverTimestamp(),
      });

      console.log(`[Organizer] Updated tags for evidence ${evidenceId}:`, cleanedTags);
      return true;
    } catch (err) {
      console.error('[Organizer] Failed to update tags:', err);
      
      // Revert optimistic update on error
      const evidenceIndex = evidenceList.value.findIndex(e => e.id === evidenceId);
      if (evidenceIndex >= 0) {
        // Reload evidence to get correct state
        // In a more sophisticated implementation, we'd maintain previous state for rollback
        loadEvidence();
      }
      
      throw err;
    }
  };

  /**
   * Add a single tag to evidence document
   */
  const addTag = async (evidenceId, tagText) => {
    try {
      const evidence = evidenceList.value.find(e => e.id === evidenceId);
      if (!evidence) {
        throw new Error('Evidence document not found');
      }

      const currentTags = evidence.tags || [];
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
      console.error('[Organizer] Failed to add tag:', err);
      throw err;
    }
  };

  /**
   * Remove a single tag from evidence document
   */
  const removeTag = async (evidenceId, tagText) => {
    try {
      const evidence = evidenceList.value.find(e => e.id === evidenceId);
      if (!evidence) {
        throw new Error('Evidence document not found');
      }

      const currentTags = evidence.tags || [];
      const updatedTags = currentTags.filter(tag => tag !== tagText);
      
      await updateEvidenceTags(evidenceId, updatedTags);
    } catch (err) {
      console.error('[Organizer] Failed to remove tag:', err);
      throw err;
    }
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
   * Reset store to initial state
   */
  const reset = () => {
    evidenceList.value = [];
    filteredEvidence.value = [];
    loading.value = false;
    error.value = null;
    filterText.value = '';
    isInitialized.value = false;
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
    updateEvidenceTags,
    addTag,
    removeTag,
    setFilter,
    clearFilters,
    reset,
  };
});