<template>
  <div class="organizer-container">
    <!-- Header with title and search -->
    <OrganizerHeader
      v-model:search-text="searchText"
      :evidence-count="evidenceCount"
      :filtered-count="filteredCount"
      @search="handleSearch"
      @manage-categories="navigateToCategories"
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
      :getEvidenceTags="getEvidenceTags"
      :getTagUpdateLoading="getTagUpdateLoading"
      :getAIProcessing="getAIProcessing"
      @tags-update="handleTagsUpdate"
      @download="downloadFile"
      @rename="renameFile"
      @view-details="viewDetails"
      @process-with-ai="processWithAI"
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

    <!-- AI Tag Review Modal -->
    <AITagReview
      v-model="showAIReview"
      :evidence="currentReviewEvidence"
      :loading="aiReviewLoading"
      :error="aiReviewError"
      @approve-tag="handleApproveTag"
      @reject-tag="handleRejectTag"
      @approve-all="handleApproveAll"
      @reject-all="handleRejectAll"
      @save-changes="handleSaveAIReview"
      @retry-load="retryAIReview"
      @close="closeAIReview"
    />

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
import { useRouter } from 'vue-router';
import { useOrganizerStore } from '../stores/organizer.js';
import { AITagService } from '../services/aiTagService.js';
import OrganizerHeader from '../components/OrganizerHeader.vue';
import OrganizerStates from '../components/OrganizerStates.vue';
import FileListDisplay from '../components/FileListDisplay.vue';
import AITagReview from '../components/AITagReview.vue';

// Store and router
const organizerStore = useOrganizerStore();
const router = useRouter();

// State
const searchText = ref('');
const viewMode = ref('list');
const showUpdateOverlay = ref(false);
const tagUpdateLoading = ref(new Set());
const aiProcessing = ref(new Set()); // Track AI processing by evidence ID
const unsubscribe = ref(null);

// AI Review Modal State
const showAIReview = ref(false);
const currentReviewEvidence = ref(null);
const aiReviewLoading = ref(false);
const aiReviewError = ref(null);

// AI Service instance
const aiTagService = new AITagService();

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

const navigateToCategories = () => {
  router.push('/organizer/categories');
};

// Helper methods for child components
const getEvidenceTags = (evidence) => {
  return organizerStore.getAllTags(evidence);
};

const getTagUpdateLoading = (evidenceId) => {
  return tagUpdateLoading.value.has(evidenceId);
};

const getAIProcessing = (evidenceId) => {
  return aiProcessing.value.has(evidenceId);
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

const processWithAI = async (evidence) => {
  console.log('DEBUG: processWithAI called with evidence:', evidence.id);
  console.log('DEBUG: aiTagService.isAIEnabled():', aiTagService.isAIEnabled());
  
  if (!aiTagService.isAIEnabled()) {
    console.log('DEBUG: AI features not enabled');
    showNotification('AI features are not enabled', 'warning');
    return;
  }

  try {
    aiProcessing.value.add(evidence.id);
    showNotification('Processing document with AI...', 'info', 2000);

    const result = await aiTagService.processSingleDocument(evidence.id);
    
    if (result.success) {
      if (result.suggestedTags.length > 0) {
        showNotification(
          `AI processing complete! ${result.suggestedTags.length} tags applied.`, 
          'success'
        );
      } else {
        showNotification('AI processing complete, but no tags were suggested.', 'info');
      }
    } else {
      throw new Error(result.error || 'AI processing failed');
    }
  } catch (error) {
    console.error('AI processing failed:', error);
    
    // User-friendly error messages
    let errorMessage = 'AI processing failed';
    if (error.message.includes('File size')) {
      errorMessage = 'File too large for AI processing (max 20MB)';
    } else if (error.message.includes('categories')) {
      errorMessage = 'Please create categories before using AI tagging';
    } else if (error.message.includes('not found')) {
      errorMessage = 'Document not found';
    }
    
    showNotification(errorMessage, 'error');
  } finally {
    aiProcessing.value.delete(evidence.id);
  }
};

const showNotification = (message, color = 'success', timeout = 4000) => {
  snackbar.value = {
    show: true,
    message,
    color,
    timeout
  };
};

// AI Review Modal Handlers
const handleApproveTag = (tag) => {
  console.log('Tag approved:', tag);
  // Individual tag approval is handled by the modal component
  // The save operation will handle the actual database updates
};

const handleRejectTag = (tag) => {
  console.log('Tag rejected:', tag);
  // Individual tag rejection is handled by the modal component
  // The save operation will handle the actual database updates
};

const handleApproveAll = (tags) => {
  console.log('All tags approved:', tags);
  // Batch approval handled by modal component
};

const handleRejectAll = (tags) => {
  console.log('All tags rejected:', tags);
  // Batch rejection handled by modal component
};

const handleSaveAIReview = async (changes) => {
  if (!currentReviewEvidence.value) return;

  try {
    aiReviewLoading.value = true;
    
    // Process the review changes using AITagService
    const result = await aiTagService.processReviewChanges(
      currentReviewEvidence.value.id,
      changes
    );

    if (result.success) {
      const { approvedCount, rejectedCount, errors } = result.results;
      
      if (errors.length > 0) {
        showNotification(
          `Partial success: ${approvedCount} approved, ${rejectedCount} rejected. ${errors.length} failed.`,
          'warning'
        );
      } else {
        showNotification(
          `Successfully applied changes: ${approvedCount} approved, ${rejectedCount} rejected.`,
          'success'
        );
      }
    } else {
      throw new Error('Review processing failed');
    }
    
    closeAIReview();
  } catch (error) {
    console.error('Failed to save AI review changes:', error);
    showNotification('Failed to save changes. Please try again.', 'error');
  } finally {
    aiReviewLoading.value = false;
  }
};

const retryAIReview = () => {
  // Retry loading AI suggestions (if needed)
  aiReviewError.value = null;
};

const closeAIReview = () => {
  showAIReview.value = false;
  currentReviewEvidence.value = null;
  aiReviewError.value = null;
};

// Lifecycle
onMounted(async () => {
  try {
    // Initialize all stores (evidence + categories)
    const { evidenceUnsubscribe } = await organizerStore.initialize();
    unsubscribe.value = evidenceUnsubscribe;
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