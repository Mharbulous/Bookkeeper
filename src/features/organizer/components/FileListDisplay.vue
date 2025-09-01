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
        <FileListItem
          v-for="evidence in props.filteredEvidence"
          :key="evidence.id"
          :evidence="evidence"
          :tagUpdateLoading="props.getTagUpdateLoading(evidence.id)"
          :aiProcessing="props.getAIProcessing(evidence.id)"
          @tags-updated="$emit('tagsUpdated')"
          @download="$emit('download', $event)"
          @rename="$emit('rename', $event)"
          @view-details="$emit('viewDetails', $event)"
          @process-with-ai="$emit('process-with-ai', $event)"
        />
      </div>

      <!-- Grid view placeholder -->
      <div v-else-if="currentViewMode === 'grid'" class="file-grid">
        <p class="text-body-2 text-center text-medium-emphasis pa-8">
          <v-icon size="48" class="mb-2 d-block">mdi-view-grid</v-icon>
          Folder Grid view coming in future updates
        </p>
      </div>

      <!-- Tree view placeholder -->
      <div v-else-if="currentViewMode === 'tree'" class="file-tree">
        <p class="text-body-2 text-center text-medium-emphasis pa-8">
          <v-icon size="48" class="mb-2 d-block">mdi-file-tree</v-icon>
          Folder Tree view coming in future updates
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import FileListItem from './FileListItem.vue';
import ViewModeToggle from './ViewModeToggle.vue';

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

// Emits
const emit = defineEmits([
  'update:viewMode',
  'tagsUpdated',
  'process-with-ai',
  'download',
  'rename',
  'viewDetails',
]);

// Handle view mode changes from ViewModeToggle
const handleViewModeChange = (event) => {
  currentViewMode.value = event.mode;
  emit('update:viewMode', event.mode);
};
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

@media (max-width: 768px) {
  .file-list-container {
    padding: 16px 20px;
  }
}
</style>
