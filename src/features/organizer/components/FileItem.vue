<template>
  <v-card
    variant="outlined"
    class="file-item mb-3"
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
              {{ evidence.displayName }}
            </h4>
            <p class="file-metadata text-body-2 text-medium-emphasis">
              {{ formattedFileSize }} • 
              {{ fileExtension }} • 
              {{ formattedDate }}
            </p>
          </div>
        </div>

        <!-- Tags section -->
        <div class="tags-section">
          <TagSelector
            :evidence="evidence"
            :loading="loading"
            class="tag-selector"
            @tags-updated="$emit('tagsUpdated')"
            @migrate-legacy="$emit('migrateLegacy', evidence.id)"
          />
        </div>

        <!-- Actions section -->
        <div class="file-actions">
          <v-btn
            icon
            variant="text"
            size="small"
            @click="$emit('download', evidence)"
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
                v-bind="props"
              >
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list>
              <v-list-item @click="$emit('rename', evidence)">
                <template #prepend>
                  <v-icon>mdi-pencil</v-icon>
                </template>
                <v-list-item-title>Rename</v-list-item-title>
              </v-list-item>
              <v-list-item @click="$emit('viewDetails', evidence)">
                <template #prepend>
                  <v-icon>mdi-information</v-icon>
                </template>
                <v-list-item-title>Details</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';
import TagSelector from './TagSelector.vue';
import { getFileExtension, getFileIcon, getFileIconColor, formatFileSize, formatDate } from '../utils/fileUtils.js';

// Props
const props = defineProps({
  evidence: {
    type: Object,
    required: true,
  },
  evidenceTags: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

// Emits
defineEmits([
  'tagsUpdated',
  'download',
  'rename',
  'viewDetails',
]);

// Computed properties using utility functions
const fileExtension = computed(() => getFileExtension(props.evidence.displayName));
const fileIcon = computed(() => getFileIcon(props.evidence.displayName));
const fileIconColor = computed(() => getFileIconColor(props.evidence.displayName));
const formattedFileSize = computed(() => formatFileSize(props.evidence.fileSize));
const formattedDate = computed(() => formatDate(props.evidence.createdAt));
</script>

<style scoped>
.file-item {
  transition: all 0.2s ease-in-out;
}

.file-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
}

.file-metadata {
  margin: 0;
}

.tags-section {
  flex: 2;
  min-width: 200px;
}

.file-actions {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

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
}
</style>