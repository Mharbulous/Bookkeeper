<template>
  <v-card
    variant="outlined"
    class="file-list-item"
    :class="{ 'file-list-item--selected': selected }"
    @click="handleClick"
  >
    <v-card-text class="pa-4">
      <div class="file-item-content">
        <!-- File info section -->
        <FileListItemContent
          :evidence="evidence"
          :show-processing-stage="showProcessingStage"
        />

        <!-- Tags section -->
        <FileListItemTags
          :evidence="evidence"
          :readonly="readonly"
          :tag-update-loading="tagUpdateLoading"
          :tag-input-placeholder="tagInputPlaceholder"
          @tags-updated="handleTagsUpdated"
          @migrate-legacy="handleMigrateLegacy"
          @tag-error="handleTagError"
        />

        <!-- Actions section -->
        <FileListItemActions
          :evidence="evidence"
          :readonly="readonly"
          :show-actions="showActions"
          :action-loading="actionLoading"
          :ai-processing="aiProcessing"
          @download="handleDownload"
          @rename="handleRename"
          @view-details="handleViewDetails"
          @delete="handleDelete"
          @process-with-ai="handleProcessWithAI"
        />
      </div>
    </v-card-text>

    <!-- Selection indicator -->
    <div v-if="selectable" class="selection-indicator">
      <v-checkbox
        :model-value="selected"
        hide-details
        @click.stop
        @update:model-value="handleSelectionChange"
      />
    </div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';
import FileListItemContent from './FileListItemContent.vue';
import FileListItemTags from './FileListItemTags.vue';
import FileListItemActions from './FileListItemActions.vue';

// Props
const props = defineProps({
  // Evidence/file data
  evidence: {
    type: Object,
    required: true,
  },
  
  // Display options
  readonly: {
    type: Boolean,
    default: false,
  },
  showActions: {
    type: Boolean,
    default: true,
  },
  showProcessingStage: {
    type: Boolean,
    default: false,
  },
  selectable: {
    type: Boolean,
    default: false,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  
  // Loading states
  tagUpdateLoading: {
    type: Boolean,
    default: false,
  },
  actionLoading: {
    type: Boolean,
    default: false,
  },
  aiProcessing: {
    type: Boolean,
    default: false,
  },
  
  // Customization
  tagInputPlaceholder: {
    type: String,
    default: 'Add tags...',
  },
});

// Emits
const emit = defineEmits([
  'tags-updated',
  'tag-error',
  'migrate-legacy',
  'click',
  'download',
  'rename',
  'view-details',
  'delete',
  'selection-change',
  'process-with-ai',
]);

// Computed properties - simplified since FileListItemContent handles file details

// Event handlers
const handleClick = () => {
  emit('click', props.evidence);
};

const handleTagsUpdated = () => {
  emit('tags-updated');
};

const handleMigrateLegacy = (evidenceId) => {
  emit('migrate-legacy', evidenceId);
};

const handleTagError = (error) => {
  emit('tag-error', error);
};

const handleDownload = () => {
  emit('download', props.evidence);
};

const handleRename = () => {
  emit('rename', props.evidence);
};

const handleViewDetails = () => {
  emit('view-details', props.evidence);
};

const handleDelete = () => {
  emit('delete', props.evidence);
};

const handleSelectionChange = (selected) => {
  emit('selection-change', props.evidence.id, selected);
};

const handleProcessWithAI = () => {
  console.log('DEBUG: handleProcessWithAI called with evidence:', props.evidence.id);
  emit('process-with-ai', props.evidence);
};
</script>

<style scoped>
.file-list-item {
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  position: relative;
}

.file-list-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.file-list-item--selected {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.2);
}

.file-item-content {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.selection-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
}

/* Responsive design */
@media (max-width: 768px) {
  .file-item-content {
    flex-direction: column;
    gap: 16px;
  }
}

/* Compact mode */
.file-list-item.compact .file-item-content {
  gap: 12px;
}
</style>