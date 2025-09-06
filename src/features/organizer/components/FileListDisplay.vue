<template>
  <div class="file-list-container">
    <!-- File list header -->
    <div class="list-header">
      <div class="list-title">
        <h3 class="text-h6">Documents</h3>
      </div>
      <div class="list-controls">
        <ViewModeToggle :loading="false" @view-mode-changed="handleViewModeChange" />
      </div>
    </div>

    <!-- File display with 3 view modes -->
    <div class="file-display">
      <!-- List view -->
      <div v-if="currentViewMode === 'list'" class="file-list">
        <template v-for="(evidence, index) in props.filteredEvidence" :key="evidence.id">
          <!-- Simple placeholder when not loaded -->
          <div
            v-if="!isItemLoaded(index)"
            class="document-placeholder"
            :style="{ height: '120px' }"
            :data-index="index"
          >
            <!-- Simple loading skeleton -->
            <div class="skeleton-content"></div>
          </div>

          <!-- Actual FileListItem when loaded -->
          <FileListItem
            v-else
            :evidence="evidence"
            :allow-manual-editing="false"
            :tagUpdateLoading="props.getTagUpdateLoading(evidence.id)"
            :aiProcessing="props.getAIProcessing(evidence.id)"
            :get-evidence-tags="props.getEvidenceTags"
            @rename="$emit('rename', $event)"
            @view-details="$emit('viewDetails', $event)"
            @process-with-ai="$emit('process-with-ai', $event)"
          />
        </template>
      </div>

      <!-- Grid view placeholder -->
      <div v-else-if="currentViewMode === 'grid'" class="file-grid">
        <p class="text-body-2 text-center text-medium-emphasis pa-8">
          <v-icon size="48" class="mb-2 d-block">mdi-view-grid</v-icon>
          Folder Grid coming in future updates
        </p>
      </div>

      <!-- Tree view placeholder -->
      <div v-else-if="currentViewMode === 'tree'" class="file-tree">
        <p class="text-body-2 text-center text-medium-emphasis pa-8">
          <v-icon size="48" class="mb-2 d-block">mdi-file-tree</v-icon>
          Folder Tree coming in future updates
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import FileListItem from './FileListItem.vue';
import ViewModeToggle from './ViewModeToggle.vue';
import { useLazyDocuments } from '@/composables/useLazyDocuments.js';

// Debug logging helper
const debugLog = (message, data = null) => {
  const timestamp = new Date().toISOString().substring(11, 23);
  console.log(`[${timestamp}] [FileListDisplay] ${message}`, data || '');
};

// Props
const props = defineProps({
  filteredEvidence: {
    type: Array,
    default: () => [],
  },
  viewMode: {
    type: String,
    default: 'list',
  },
  getEvidenceTags: {
    type: Function,
    required: true,
  },
  getTagUpdateLoading: {
    type: Function,
    required: true,
  },
  getAIProcessing: {
    type: Function,
    required: true,
  },
});

// Local state for current view mode
const currentViewMode = ref('list');

// Add lazy loading composable
const { isItemLoaded, loadItem, preloadInitialItems } = useLazyDocuments(
  computed(() => props.filteredEvidence),
  { initialCount: 10 }
);

// Intersection Observer for lazy loading
let observer = null;
let renderStartTime = null;
let dataLoadTime = null; // eslint-disable-line no-unused-vars

// Emits
const emit = defineEmits([
  'update:viewMode',
  'process-with-ai',
  'rename',
  'viewDetails',
]);

// Handle view mode changes from ViewModeToggle
const handleViewModeChange = (event) => {
  debugLog(`View mode changed to: ${event.mode}`);
  currentViewMode.value = event.mode;
  emit('update:viewMode', event.mode);
};

// Debug: Watch filteredEvidence changes to track data loading timing
watch(
  () => props.filteredEvidence,
  () => {
    dataLoadTime = performance.now();
    // Data loading log removed - focusing on loop-level timing only
  },
  { immediate: true, deep: false }
);

// Debug: Track FileListItem loop start/completion
watch(
  currentViewMode,
  (newMode) => {
    if (newMode === 'list') {
      renderStartTime = performance.now();

      // Log when FileListItem loop starts
      debugLog(`🚀 Starting FileListItem loop processing...`);

      // Track render performance
      nextTick(() => {
        const loadedCount =
          props.filteredEvidence?.reduce((count, _, index) => {
            return isItemLoaded(index) ? count + 1 : count;
          }, 0) || 0;

        const renderTime = performance.now() - renderStartTime;

        // Log when FileListItem loop completes
        debugLog(
          `✅ FileListItem loop completed - rendered ${loadedCount}/${props.filteredEvidence?.length || 0} items in ${renderTime.toFixed(1)}ms`
        );
      });
    }
  },
  { immediate: true }
);

// Setup lazy loading on mount
onMounted(async () => {
  // Initialize with first 10 items
  preloadInitialItems();

  // Wait for DOM updates
  await nextTick();

  // Setup Intersection Observer for remaining items
  observer = new IntersectionObserver(
    (entries) => {
      const loadedItems = entries.filter((entry) => entry.isIntersecting).length;
      if (loadedItems > 0) {
        debugLog(`👁️ Loading ${loadedItems} more items`);
      }
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.dataset.index);
          loadItem(index);
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '50px' }
  );

  // Observe all placeholder elements
  const placeholders = document.querySelectorAll('.document-placeholder');
  placeholders.forEach((placeholder) => {
    observer.observe(placeholder);
  });
});

// Cleanup on unmount
onUnmounted(() => {
  debugLog(`🧹 Component unmounting, cleaning up observer`);
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});
</script>

<style scoped>
.file-list-container {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.file-display {
  min-height: 0;
}

.file-grid,
.file-tree {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Lazy loading placeholder styles */
.document-placeholder {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-bottom: 8px;
  position: relative;
  overflow: hidden;
}

.skeleton-content {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  height: 100%;
  border-radius: 4px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 768px) {
  .file-list-container {
    padding: 16px 20px;
  }
}
</style>
