<template>
  <div class="file-list-container">
    <!-- File list header -->
    <div class="list-header">
      <div class="list-title">
        <h3 class="text-h6">Documents</h3>
      </div>
      <div class="list-controls">
        <v-btn-toggle
          :model-value="props.viewMode"
          mandatory
          variant="outlined"
          size="small"
          @update:model-value="$emit('update:viewMode', $event)"
        >
          <v-btn value="list">
            <v-icon>mdi-view-list</v-icon>
          </v-btn>
          <v-btn value="grid">
            <v-icon>mdi-view-grid</v-icon>
          </v-btn>
        </v-btn-toggle>
      </div>
    </div>

    <!-- File list/grid -->
    <div class="file-display">
      <!-- List view -->
      <div v-if="props.viewMode === 'list'" class="file-list">
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
      <div v-else class="file-grid">
        <p class="text-body-2 text-center text-medium-emphasis pa-8">
          Grid view coming in future updates
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import FileListItem from './FileListItem.vue';

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

// Emits
defineEmits([
  'update:viewMode',
  'tagsUpdated',
  'process-with-ai',
  'download',
  'rename',
  'viewDetails',
]);
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

.file-grid {
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