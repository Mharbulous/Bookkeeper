<template>
  <!-- Loading state -->
  <div v-if="showLoading" class="loading-container">
    <v-progress-circular indeterminate size="48" />
    <p class="text-body-1 mt-4">Loading documents...</p>
  </div>

  <!-- Error state -->
  <div v-else-if="showError" class="error-container">
    <v-icon size="48" color="error" class="mb-4">mdi-alert-circle</v-icon>
    <p class="text-body-1 text-error mb-4">{{ error }}</p>
    <v-btn color="primary" @click="$emit('retry')">
      <v-icon start>mdi-refresh</v-icon>
      Retry
    </v-btn>
  </div>

  <!-- Empty state (no documents) -->
  <div v-else-if="showEmptyState" class="empty-state">
    <v-icon size="64" color="medium-emphasis" class="mb-4">mdi-file-outline</v-icon>
    <h3 class="text-h6 mb-2">No documents found</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Upload some files to get started with organizing your documents.
    </p>
    <v-btn color="primary" to="/upload">
      <v-icon start>mdi-upload</v-icon>
      Go to Uploads
    </v-btn>
  </div>

  <!-- Empty filter state (no matches) -->
  <div v-else-if="showEmptyFilterState" class="empty-filter-state">
    <v-icon size="64" color="medium-emphasis" class="mb-4">mdi-file-search-outline</v-icon>
    <h3 class="text-h6 mb-2">No matches found</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Try adjusting your search terms or clearing the filter.
    </p>
    <v-btn variant="outlined" @click="$emit('clearSearch')">
      <v-icon start>mdi-filter-off</v-icon>
      Clear Search
    </v-btn>
  </div>
</template>

<script setup>
import { computed } from 'vue';

// Props
const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  isInitialized: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: null,
  },
  evidenceCount: {
    type: Number,
    default: 0,
  },
  filteredCount: {
    type: Number,
    default: 0,
  },
});

// Emits
defineEmits([
  'retry',
  'clearSearch',
]);

// Computed state conditions
const showLoading = computed(() => props.loading && !props.isInitialized);
const showError = computed(() => props.error && !props.loading);
const showEmptyState = computed(() => 
  !props.loading && props.evidenceCount === 0 && props.isInitialized && !props.error
);
const showEmptyFilterState = computed(() => 
  !props.loading && props.evidenceCount > 0 && props.filteredCount === 0 && props.isInitialized && !props.error
);
</script>

<style scoped>
.loading-container,
.error-container,
.empty-state,
.empty-filter-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
}
</style>