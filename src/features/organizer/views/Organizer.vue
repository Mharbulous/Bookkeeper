<template>
  <div class="organizer-container">
    <!-- Header with title and search -->
    <OrganizerHeader
      v-model:search-text="searchText"
      :evidence-count="evidenceCount"
      :filtered-count="filteredCount"
      @search="handleSearch"
    />

    <!-- States (loading, error, empty) -->
    <OrganizerStates
      :loading="loading"
      :is-initialized="isInitialized"
      :error="error"
      :evidence-count="evidenceCount"
      :filtered-count="filteredCount"
      @retry="retryLoad"
      @clear-search="clearSearch"
    />

    <!-- File list display -->
    <FileListDisplay
      v-if="showFileList"
      v-model:view-mode="viewMode"
      :filtered-evidence="filteredEvidence"
      :get-evidence-tags="getEvidenceTags"
      :get-tag-update-loading="getTagUpdateLoading"
      @tags-update="handleTagsUpdate"
      @download="downloadFile"
      @rename="renameFile"
      @view-details="viewDetails"
    />

    <!-- Loading overlay for updates -->
    <v-overlay
      v-model="showUpdateOverlay"
      class="d-flex align-center justify-center"
      contained
    >
      <v-progress-circular indeterminate size="48" />
      <p class="ml-4">Updating tags...</p>
    </v-overlay>

    <!-- Snackbar for notifications -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { useOrganizerStore } from '../stores/organizer.js';
import OrganizerHeader from '../components/OrganizerHeader.vue';
import OrganizerStates from '../components/OrganizerStates.vue';
import FileListDisplay from '../components/FileListDisplay.vue';

// Store
const organizerStore = useOrganizerStore();

// State
const searchText = ref('');
const viewMode = ref('list');
const showUpdateOverlay = ref(false);
const tagUpdateLoading = ref(new Set());
const unsubscribe = ref(null);

const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 4000
});

// Computed - use storeToRefs for reactive properties
const {
  filteredEvidence,
  loading,
  error,
  evidenceCount,
  filteredCount,
  isInitialized
} = storeToRefs(organizerStore);

// Computed for conditional display
const showFileList = computed(() => {
  return !loading.value && !error.value && evidenceCount.value > 0 && filteredCount.value > 0 && isInitialized.value;
});

// Methods
const handleSearch = (value) => {
  organizerStore.setFilter(value || '');
};

const clearSearch = () => {
  searchText.value = '';
  organizerStore.clearFilters();
};

const retryLoad = async () => {
  await organizerStore.loadEvidence();
};

// Helper methods for child components
const getEvidenceTags = (evidence) => {
  return organizerStore.getAllTags(evidence);
};

const getTagUpdateLoading = (evidenceId) => {
  return tagUpdateLoading.value.has(evidenceId);
};

const handleTagsUpdate = async (evidenceId, newTags) => {
  try {
    tagUpdateLoading.value.add(evidenceId);
    await organizerStore.updateEvidenceTags(evidenceId, newTags);
    
    showNotification('Tags updated successfully', 'success');
  } catch (error) {
    console.error('Failed to update tags:', error);
    showNotification('Failed to update tags', 'error');
  } finally {
    tagUpdateLoading.value.delete(evidenceId);
  }
};

const downloadFile = () => {
  showNotification('Download functionality coming soon', 'info');
};

const renameFile = () => {
  showNotification('Rename functionality coming soon', 'info');
};

const viewDetails = () => {
  showNotification('Details view coming soon', 'info');
};

const showNotification = (message, color = 'success') => {
  snackbar.value = {
    show: true,
    message,
    color,
    timeout: 4000
  };
};

// Lifecycle
onMounted(async () => {
  try {
    // Load evidence documents
    unsubscribe.value = await organizerStore.loadEvidence();
  } catch (error) {
    console.error('Failed to initialize organizer:', error);
    showNotification('Failed to load documents', 'error');
  }
});

onBeforeUnmount(() => {
  // Clean up listeners
  if (unsubscribe.value) {
    unsubscribe.value();
  }
  organizerStore.reset();
});
</script>

<style scoped>
.organizer-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Simplified styles - component-specific styles moved to respective components */
</style>