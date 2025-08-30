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
        <div class="file-info">
          <div class="file-icon">
            <v-icon size="32" :color="fileIconColor">
              {{ fileIcon }}
            </v-icon>
          </div>
          <div class="file-details">
            <h4 class="file-name text-subtitle-1 font-weight-medium">
              {{ displayName }}
            </h4>
            <p class="file-metadata text-body-2 text-medium-emphasis">
              {{ formattedFileSize }} • 
              {{ fileExtension.toUpperCase() }} • 
              {{ formattedDate }}
            </p>
            <div v-if="showProcessingStage && processingStage !== 'uploaded'" class="processing-stage">
              <v-chip
                size="x-small"
                :color="processingStageColor"
                variant="tonal"
              >
                {{ processingStageText }}
              </v-chip>
            </div>
          </div>
        </div>

        <!-- Tags section -->
        <div class="tags-section">
          <TagInput
            v-if="!readonly"
            :model-value="tags"
            :loading="tagUpdateLoading"
            :placeholder="tagInputPlaceholder"
            class="tag-input"
            @update:model-value="handleTagsUpdate"
            @error="handleTagError"
          />
          <div v-else-if="tags && tags.length > 0" class="tags-readonly">
            <v-chip
              v-for="tag in tags"
              :key="tag"
              size="small"
              variant="outlined"
              color="primary"
              class="ma-1"
            >
              {{ tag }}
            </v-chip>
          </div>
          <div v-else-if="readonly" class="no-tags">
            <small class="text-medium-emphasis">No tags</small>
          </div>
        </div>

        <!-- Actions section -->
        <div v-if="showActions" class="file-actions">
          <v-btn
            icon
            variant="text"
            size="small"
            :disabled="actionLoading"
            @click.stop="handleDownload"
          >
            <v-icon>mdi-download</v-icon>
            <v-tooltip activator="parent">Download</v-tooltip>
          </v-btn>
          <v-menu>
            <template #activator="{ props }">
              <v-btn
                icon
                variant="text"
                size="small"
                :disabled="actionLoading"
                v-bind="props"
                @click.stop
              >
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list>
              <v-list-item @click="handleRename">
                <template #prepend>
                  <v-icon>mdi-pencil</v-icon>
                </template>
                <v-list-item-title>Rename</v-list-item-title>
              </v-list-item>
              <v-list-item @click="handleViewDetails">
                <template #prepend>
                  <v-icon>mdi-information</v-icon>
                </template>
                <v-list-item-title>Details</v-list-item-title>
              </v-list-item>
              <v-divider />
              <v-list-item
                v-if="!readonly"
                @click="handleDelete"
                class="text-error"
              >
                <template #prepend>
                  <v-icon color="error">mdi-delete</v-icon>
                </template>
                <v-list-item-title>Delete</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
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
import TagInput from './TagInput.vue';

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
  
  // Customization
  tagInputPlaceholder: {
    type: String,
    default: 'Add tags...',
  },
});

// Emits
const emit = defineEmits([
  'tags-update',
  'tag-error',
  'click',
  'download',
  'rename',
  'view-details',
  'delete',
  'selection-change',
]);

// Computed properties
const displayName = computed(() => {
  return props.evidence?.displayName || 'Unnamed file';
});

const fileExtension = computed(() => {
  const filename = props.evidence?.displayName || '';
  return filename.includes('.')
    ? '.' + filename.split('.').pop().toLowerCase()
    : '';
});

const tags = computed(() => {
  return props.evidence?.tags || [];
});

const processingStage = computed(() => {
  return props.evidence?.processingStage || 'uploaded';
});

const formattedFileSize = computed(() => {
  const bytes = props.evidence?.fileSize || 0;
  if (!bytes) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
});

const formattedDate = computed(() => {
  const timestamp = props.evidence?.createdAt;
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString();
});

const fileIcon = computed(() => {
  const ext = fileExtension.value.toLowerCase();
  const iconMap = {
    '.pdf': 'mdi-file-pdf-box',
    '.doc': 'mdi-file-word-box',
    '.docx': 'mdi-file-word-box',
    '.xls': 'mdi-file-excel-box',
    '.xlsx': 'mdi-file-excel-box',
    '.ppt': 'mdi-file-powerpoint-box',
    '.pptx': 'mdi-file-powerpoint-box',
    '.txt': 'mdi-file-document-outline',
    '.jpg': 'mdi-file-image-outline',
    '.jpeg': 'mdi-file-image-outline',
    '.png': 'mdi-file-image-outline',
    '.gif': 'mdi-file-image-outline',
    '.zip': 'mdi-folder-zip-outline',
    '.rar': 'mdi-folder-zip-outline'
  };
  return iconMap[ext] || 'mdi-file-outline';
});

const fileIconColor = computed(() => {
  const ext = fileExtension.value.toLowerCase();
  const colorMap = {
    '.pdf': 'red-darken-1',
    '.doc': 'blue-darken-1',
    '.docx': 'blue-darken-1',
    '.xls': 'green-darken-1',
    '.xlsx': 'green-darken-1',
    '.ppt': 'orange-darken-1',
    '.pptx': 'orange-darken-1',
    '.jpg': 'purple-darken-1',
    '.jpeg': 'purple-darken-1',
    '.png': 'purple-darken-1',
    '.gif': 'purple-darken-1'
  };
  return colorMap[ext] || 'grey-darken-1';
});

const processingStageColor = computed(() => {
  const stageColors = {
    'uploaded': 'grey',
    'splitting': 'blue',
    'merging': 'orange',
    'complete': 'green'
  };
  return stageColors[processingStage.value] || 'grey';
});

const processingStageText = computed(() => {
  const stageTexts = {
    'uploaded': 'Uploaded',
    'splitting': 'Processing',
    'merging': 'Merging',
    'complete': 'Complete'
  };
  return stageTexts[processingStage.value] || processingStage.value;
});

// Event handlers
const handleClick = () => {
  emit('click', props.evidence);
};

const handleTagsUpdate = (newTags) => {
  emit('tags-update', props.evidence.id, newTags);
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

.file-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.file-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  margin-bottom: 4px;
  word-break: break-word;
  line-height: 1.2;
}

.file-metadata {
  margin: 0 0 4px 0;
  line-height: 1.2;
}

.processing-stage {
  margin-top: 4px;
}

.tags-section {
  flex: 2;
  min-width: 200px;
}

.tags-readonly {
  min-height: 32px;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 4px;
}

.no-tags {
  min-height: 32px;
  display: flex;
  align-items: center;
}

.file-actions {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  gap: 4px;
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
  
  .file-info {
    gap: 16px;
  }
  
  .tags-section {
    min-width: 0;
  }
  
  .file-actions {
    align-self: stretch;
    justify-content: flex-end;
  }
}

/* Compact mode */
.file-list-item.compact .file-item-content {
  gap: 12px;
}

.file-list-item.compact .file-icon {
  width: 32px;
  height: 32px;
}

.file-list-item.compact .file-details {
  gap: 2px;
}

.file-list-item.compact .tags-section {
  min-width: 150px;
}
</style>