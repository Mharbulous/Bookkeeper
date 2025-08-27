<template>
  <v-dialog
    v-model="localShow"
    persistent
    max-width="800px"
    transition="dialog-transition"
    class="upload-progress-dialog"
  >
    <v-card class="upload-progress-card">
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-6">
        <div class="d-flex align-center">
          <v-icon :icon="getHeaderIcon()" :color="getHeaderColor()" size="32" class="me-3" />
          <div>
            <h2 class="text-h6 mb-1">{{ getHeaderTitle() }}</h2>
            <div class="text-body-2 text-grey-darken-1">
              {{ getHeaderSubtitle() }}
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div class="d-flex gap-2">
          <v-btn
            v-if="canShowPauseButton"
            @click="$emit('pause')"
            variant="outlined"
            color="warning"
            prepend-icon="mdi-pause"
          >
            Pause
          </v-btn>

          <v-btn
            v-if="canShowResumeButton"
            @click="$emit('resume')"
            variant="elevated"
            color="primary"
            prepend-icon="mdi-play"
          >
            Resume
          </v-btn>

          <v-btn
            v-if="canShowCancelButton"
            @click="$emit('cancel')"
            variant="outlined"
            color="error"
            prepend-icon="mdi-close"
            :disabled="!isPaused"
          >
            {{ isPaused ? 'Cancel' : 'Cancelling...' }}
          </v-btn>

          <v-btn
            v-if="isCompleted"
            @click="$emit('close')"
            variant="elevated"
            color="success"
            prepend-icon="mdi-check"
          >
            Done
          </v-btn>
        </div>
      </v-card-title>

      <v-divider />

      <!-- Progress Overview -->
      <v-card-text class="pa-6">
        <!-- Overall Progress Bar -->
        <div class="mb-6">
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-body-1 font-weight-medium"> Overall Progress </span>
            <span class="text-body-2 text-grey-darken-1">
              {{ overallProgress.percentage.toFixed(1) }}%
            </span>
          </div>

          <v-progress-linear
            :model-value="overallProgress.percentage"
            :color="getProgressColor()"
            bg-color="grey-lighten-4"
            height="8"
            rounded
            striped
            :indeterminate="isUploading && overallProgress.percentage === 0"
          />

          <div class="d-flex justify-space-between mt-2">
            <span class="text-caption text-grey-darken-1">
              {{ overallProgress.completedFiles + overallProgress.skippedFiles }} of
              {{ overallProgress.totalFiles }} files
            </span>
            <span class="text-caption text-grey-darken-1">
              {{ getElapsedTimeText() }}
            </span>
          </div>
        </div>

        <!-- Upload Metrics -->
        <v-row class="mb-4">
          <v-col cols="12" sm="6" md="3">
            <v-card variant="outlined" class="pa-3 text-center">
              <div class="text-h6 text-primary">{{ uploadMetrics.formattedCurrentSpeed }}</div>
              <div class="text-caption text-grey-darken-1">Current Speed</div>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-card variant="outlined" class="pa-3 text-center">
              <div class="text-h6 text-blue">{{ uploadMetrics.formattedAverageSpeed }}</div>
              <div class="text-caption text-grey-darken-1">Average Speed</div>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-card variant="outlined" class="pa-3 text-center">
              <div class="text-h6 text-green">{{ uploadMetrics.formattedTimeRemaining }}</div>
              <div class="text-caption text-grey-darken-1">Time Remaining</div>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-card variant="outlined" class="pa-3 text-center">
              <div class="text-h6 text-orange">
                {{ formatBytes(uploadMetrics.totalBytesToTransfer) }}
              </div>
              <div class="text-caption text-grey-darken-1">Total Size</div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Current File (when uploading) -->
        <v-card
          v-if="isUploading && overallProgress.currentFile"
          variant="outlined"
          class="mb-4 bg-blue-lighten-5"
        >
          <v-card-text class="pa-4">
            <div class="d-flex align-center">
              <v-progress-circular
                :model-value="getCurrentFileProgress()"
                color="primary"
                size="32"
                width="3"
                class="me-3"
              >
                <template v-slot:default>
                  <v-icon icon="mdi-upload" size="16" />
                </template>
              </v-progress-circular>

              <div class="flex-grow-1">
                <div class="text-body-2 font-weight-medium text-primary">Currently uploading</div>
                <div class="text-body-1">{{ getCurrentFileName() }}</div>
                <div class="text-caption text-grey-darken-1 mt-1">
                  {{ getCurrentFileProgress().toFixed(1) }}% •
                  {{ formatBytes(getCurrentFileSize()) }}
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- File List -->
        <div class="files-container">
          <div class="d-flex justify-space-between align-center mb-3">
            <h3 class="text-subtitle-1">Files</h3>
            <v-chip :color="getStatusChipColor()" size="small" variant="flat">
              {{ getStatusText() }}
            </v-chip>
          </div>

          <!-- File Status Summary -->
          <div class="d-flex gap-4 mb-4">
            <div v-if="overallProgress.completedFiles > 0" class="d-flex align-center">
              <v-icon icon="mdi-check-circle" color="success" size="16" class="me-1" />
              <span class="text-body-2">{{ overallProgress.completedFiles }} completed</span>
            </div>

            <div v-if="overallProgress.skippedFiles > 0" class="d-flex align-center">
              <v-icon icon="mdi-skip-next" color="info" size="16" class="me-1" />
              <span class="text-body-2">{{ overallProgress.skippedFiles }} skipped</span>
            </div>

            <div v-if="overallProgress.failedFiles > 0" class="d-flex align-center">
              <v-icon icon="mdi-alert-circle" color="error" size="16" class="me-1" />
              <span class="text-body-2">{{ overallProgress.failedFiles }} failed</span>
            </div>
          </div>

          <!-- Scrollable File List -->
          <div class="file-list-scroll">
            <v-list lines="two" density="compact">
              <template v-for="[fileId, fileState] in sortedFileStates" :key="fileId">
                <FileUploadStatus
                  :file-id="fileId"
                  :file-state="fileState"
                  :file-name="getFileName(fileId)"
                  :file-size="getFileSize(fileId)"
                  @retry="$emit('retry-file', fileId)"
                />
                <v-divider />
              </template>
            </v-list>
          </div>
        </div>
      </v-card-text>

      <!-- Error Summary (when there are errors) -->
      <template v-if="hasErrors && isCompleted">
        <v-divider />
        <v-expansion-panels variant="accordion" class="error-summary-panels">
          <v-expansion-panel
            v-for="(errorGroup, errorType) in nonEmptyErrorGroups"
            :key="errorType"
            :title="`${errorType} (${errorGroup.length})`"
            :text="getErrorGroupDescription(errorType)"
          >
            <template v-slot:text>
              <div class="pa-2">
                <v-alert :color="getErrorGroupColor(errorType)" variant="tonal" class="mb-3">
                  {{ getErrorGroupDescription(errorType) }}
                </v-alert>

                <v-list density="compact">
                  <v-list-item
                    v-for="{ fileInfo, error } in errorGroup"
                    :key="fileInfo.metadata.id"
                    :title="fileInfo.metadata.originalName"
                    :subtitle="error.classified?.message || error.message"
                  >
                    <template v-slot:prepend>
                      <v-icon icon="mdi-file-alert-outline" color="error" />
                    </template>

                    <template v-slot:append>
                      <v-btn
                        v-if="error.classified?.retryable"
                        @click="$emit('retry-file', fileInfo.metadata.id)"
                        size="small"
                        variant="outlined"
                        color="primary"
                      >
                        Retry
                      </v-btn>
                    </template>
                  </v-list-item>
                </v-list>
              </div>
            </template>
          </v-expansion-panel>
        </v-expansion-panels>
      </template>

      <!-- Footer Actions -->
      <template v-if="isCompleted">
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />

          <v-btn
            v-if="canRetry && hasErrors"
            @click="$emit('retry-all')"
            variant="outlined"
            color="warning"
            prepend-icon="mdi-refresh"
            class="me-2"
          >
            Retry Failed
          </v-btn>

          <v-btn
            @click="$emit('view-results')"
            variant="outlined"
            color="primary"
            prepend-icon="mdi-table"
            class="me-2"
          >
            View Details
          </v-btn>

          <v-btn
            @click="$emit('clear-queue')"
            variant="outlined"
            color="secondary"
            prepend-icon="mdi-broom"
            class="me-2"
          >
            Clear Queue
          </v-btn>

          <v-btn
            @click="$emit('close')"
            variant="elevated"
            color="success"
            prepend-icon="mdi-check"
          >
            Done
          </v-btn>
        </v-card-actions>
      </template>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, watch } from 'vue';
import FileUploadStatus from './FileUploadStatus.vue';

// Component props
const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  uploadState: {
    type: String,
    required: true,
  },
  overallProgress: {
    type: Object,
    required: true,
  },
  uploadMetrics: {
    type: Object,
    required: true,
  },
  fileStates: {
    type: Map,
    required: true,
  },
  errorSummary: {
    type: Object,
    required: true,
  },
  canShowPauseButton: {
    type: Boolean,
    default: false,
  },
  canShowResumeButton: {
    type: Boolean,
    default: false,
  },
  canShowCancelButton: {
    type: Boolean,
    default: false,
  },
  canRetry: {
    type: Boolean,
    default: false,
  },
  // File data lookup (should be provided by parent)
  files: {
    type: Array,
    default: () => [],
  },
});

// Emits
const emit = defineEmits([
  'update:show',
  'pause',
  'resume',
  'cancel',
  'retry-file',
  'retry-all',
  'close',
  'view-results',
  'clear-queue',
]);

// Local reactive state
const localShow = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
});

// Upload states (imported from composable)
const UPLOAD_STATES = {
  IDLE: 'idle',
  PREPARING: 'preparing',
  UPLOADING: 'uploading',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ERROR: 'error',
  CANCELLED: 'cancelled',
};

const FILE_STATES = {
  QUEUED: 'queued',
  UPLOADING: 'uploading',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  RETRYING: 'retrying',
};

// Computed properties
const isUploading = computed(() => props.uploadState === UPLOAD_STATES.UPLOADING);
const isPaused = computed(() => props.uploadState === UPLOAD_STATES.PAUSED);
const isCompleted = computed(() => props.uploadState === UPLOAD_STATES.COMPLETED);
const hasErrors = computed(() => props.overallProgress.failedFiles > 0);

// Create file lookup map for O(1) access
const fileMap = computed(() => {
  const map = new Map();
  props.files.forEach((file) => {
    map.set(file.id, file);
  });
  return map;
});

// Sort file states for display (active uploads first, then completed, then failed)
const sortedFileStates = computed(() => {
  return Array.from(props.fileStates.entries()).sort(([, aState], [, bState]) => {
    const stateOrder = {
      [FILE_STATES.UPLOADING]: 0,
      [FILE_STATES.RETRYING]: 1,
      [FILE_STATES.QUEUED]: 2,
      [FILE_STATES.COMPLETED]: 3,
      [FILE_STATES.SKIPPED]: 4,
      [FILE_STATES.FAILED]: 5,
    };

    return (stateOrder[aState.state] || 6) - (stateOrder[bState.state] || 6);
  });
});

// Error groups with content
const nonEmptyErrorGroups = computed(() => {
  const groups = {};
  Object.entries(props.errorSummary).forEach(([key, errors]) => {
    if (errors.length > 0) {
      const displayName = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .replace(' Errors', ' Errors');
      groups[displayName] = errors;
    }
  });
  return groups;
});

// Header content based on state
const getHeaderIcon = () => {
  switch (props.uploadState) {
    case UPLOAD_STATES.UPLOADING:
      return 'mdi-upload';
    case UPLOAD_STATES.PAUSED:
      return 'mdi-pause';
    case UPLOAD_STATES.COMPLETED:
      return hasErrors.value ? 'mdi-check-circle-outline' : 'mdi-check-circle';
    case UPLOAD_STATES.ERROR:
      return 'mdi-alert-circle';
    case UPLOAD_STATES.CANCELLED:
      return 'mdi-cancel';
    default:
      return 'mdi-upload';
  }
};

const getHeaderColor = () => {
  switch (props.uploadState) {
    case UPLOAD_STATES.UPLOADING:
      return 'primary';
    case UPLOAD_STATES.PAUSED:
      return 'warning';
    case UPLOAD_STATES.COMPLETED:
      return hasErrors.value ? 'orange' : 'success';
    case UPLOAD_STATES.ERROR:
      return 'error';
    case UPLOAD_STATES.CANCELLED:
      return 'grey';
    default:
      return 'primary';
  }
};

const getHeaderTitle = () => {
  switch (props.uploadState) {
    case UPLOAD_STATES.UPLOADING:
      return 'Uploading Files';
    case UPLOAD_STATES.PAUSED:
      return 'Upload Paused';
    case UPLOAD_STATES.COMPLETED:
      if (hasErrors.value) {
        return `Upload Complete (${props.overallProgress.failedFiles} Failed)`;
      } else {
        return 'Upload Complete';
      }
    case UPLOAD_STATES.ERROR:
      return 'Upload Error';
    case UPLOAD_STATES.CANCELLED:
      return 'Upload Cancelled';
    default:
      return 'Upload Progress';
  }
};

const getHeaderSubtitle = () => {
  if (isCompleted.value) {
    const successful = props.overallProgress.completedFiles + props.overallProgress.skippedFiles;
    const total = props.overallProgress.totalFiles;
    return `${successful} of ${total} files processed successfully`;
  } else if (isPaused.value) {
    return 'Upload paused - click Resume to continue';
  } else if (isUploading.value) {
    return `${props.overallProgress.completedFiles + props.overallProgress.skippedFiles} of ${props.overallProgress.totalFiles} files processed`;
  }
  return '';
};

// Progress bar color
const getProgressColor = () => {
  if (hasErrors.value && isCompleted.value) return 'orange';
  if (isCompleted.value) return 'success';
  if (isPaused.value) return 'warning';
  return 'primary';
};

// Status text and color
const getStatusText = () => {
  if (isCompleted.value) {
    if (hasErrors.value) {
      return `Complete with ${props.overallProgress.failedFiles} errors`;
    }
    return 'Complete';
  } else if (isPaused.value) {
    return 'Paused';
  } else if (isUploading.value) {
    return 'Uploading';
  }
  return 'Ready';
};

const getStatusChipColor = () => {
  if (isCompleted.value) return hasErrors.value ? 'orange' : 'success';
  if (isPaused.value) return 'warning';
  if (isUploading.value) return 'primary';
  return 'grey';
};

// Current file information
const getCurrentFileProgress = () => {
  if (!props.overallProgress.currentFile) return 0;
  const fileState = props.fileStates.get(props.overallProgress.currentFile);
  return fileState?.progress || 0;
};

const getCurrentFileName = () => {
  if (!props.overallProgress.currentFile) return '';
  const file = fileMap.value.get(props.overallProgress.currentFile);
  return file?.name || 'Unknown file';
};

const getCurrentFileSize = () => {
  if (!props.overallProgress.currentFile) return 0;
  const file = fileMap.value.get(props.overallProgress.currentFile);
  return file?.size || 0;
};

// File information helpers
const getFileName = (fileId) => {
  const file = fileMap.value.get(fileId);
  return file?.name || 'Unknown file';
};

const getFileSize = (fileId) => {
  const file = fileMap.value.get(fileId);
  return file?.size || 0;
};

// Error group helpers
const getErrorGroupDescription = (errorType) => {
  const descriptions = {
    'Network Errors':
      'Files that failed due to network connectivity issues. These can usually be retried.',
    'Permission Errors':
      'Files that failed due to insufficient permissions. Check your account access.',
    'Storage Errors':
      'Files that failed due to storage limitations. Free up space or upgrade your plan.',
    'File Size Errors': 'Files that are too large to upload. Consider reducing file sizes.',
    'Server Errors': 'Files that failed due to server issues. Try again later.',
    'Unknown Errors': 'Files that failed for unspecified reasons. Try uploading again.',
  };
  return descriptions[errorType] || 'Files that encountered errors during upload.';
};

const getErrorGroupColor = (errorType) => {
  const colors = {
    'Network Errors': 'orange',
    'Permission Errors': 'red',
    'Storage Errors': 'purple',
    'File Size Errors': 'blue',
    'Server Errors': 'grey',
    'Unknown Errors': 'brown',
  };
  return colors[errorType] || 'grey';
};

// Time formatting
const getElapsedTimeText = () => {
  if (!props.overallProgress.startTime) return '0s';

  const elapsed =
    props.overallProgress.elapsedTime ||
    (props.overallProgress.endTime
      ? props.overallProgress.endTime - props.overallProgress.startTime
      : Date.now() - props.overallProgress.startTime);

  return formatTime(elapsed / 1000);
};

// Utility functions
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatTime = (seconds) => {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

// Auto-close dialog when upload is cancelled
watch(
  () => props.uploadState,
  (newState) => {
    if (newState === UPLOAD_STATES.CANCELLED) {
      setTimeout(() => {
        emit('update:show', false);
      }, 2000); // Close after 2 seconds
    }
  }
);
</script>

<style scoped>
.upload-progress-dialog {
  z-index: 9999;
}

.upload-progress-card {
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.files-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.file-list-scroll {
  flex: 1;
  overflow-y: auto;
  max-height: 300px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

.error-summary-panels {
  background-color: #fafafa;
}

.gap-2 {
  gap: 8px;
}

.gap-4 {
  gap: 16px;
}

/* Smooth transitions */
.upload-progress-card * {
  transition:
    color 0.3s ease,
    background-color 0.3s ease;
}

/* Custom scrollbar for file list */
.file-list-scroll::-webkit-scrollbar {
  width: 8px;
}

.file-list-scroll::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.file-list-scroll::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.file-list-scroll::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
