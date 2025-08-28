<template>
  <v-list-item class="file-upload-status-item">
    <!-- File Icon and Status Indicator -->
    <template v-slot:prepend>
      <div class="position-relative">
        <v-icon :icon="getFileIcon()" :color="getFileIconColor()" size="24" />

        <!-- Status overlay -->
        <v-badge
          :color="getStatusColor()"
          :icon="getStatusIcon()"
          offset-x="8"
          offset-y="8"
          class="status-badge"
        />
      </div>
    </template>

    <!-- File Information -->
    <v-list-item-title class="file-name">
      {{ fileName }}
    </v-list-item-title>

    <v-list-item-subtitle class="file-details">
      <div class="d-flex align-center justify-space-between">
        <span class="file-size text-grey-darken-1">
          {{ formatFileSize(fileSize) }}
        </span>

        <div class="status-info d-flex align-center">
          <!-- Progress for uploading files -->
          <template v-if="isUploading">
            <v-progress-circular
              :model-value="fileState.progress"
              :color="getStatusColor()"
              size="16"
              width="2"
              class="me-2"
            />
            <span class="text-caption">{{ fileState.progress.toFixed(1) }}%</span>
          </template>

          <!-- Status text for other states -->
          <template v-else>
            <span class="text-caption" :class="getStatusTextClass()">
              {{ getStatusText() }}
            </span>
          </template>
        </div>
      </div>

      <!-- Error message (if failed) -->
      <div v-if="isFailed && fileState.error" class="error-message mt-1">
        <span class="text-caption text-error">
          {{ getErrorMessage() }}
        </span>
      </div>

      <!-- Transfer details (if uploading) -->
      <div v-if="isUploading && fileState.bytesTransferred" class="transfer-details mt-1">
        <span class="text-caption text-grey-darken-1">
          {{ formatFileSize(fileState.bytesTransferred) }} of
          {{ formatFileSize(fileState.totalBytes) }}
          <template v-if="fileState.speed"> • {{ formatSpeed(fileState.speed) }} </template>
        </span>
      </div>
    </v-list-item-subtitle>

    <!-- Action Buttons -->
    <template v-slot:append>
      <div class="d-flex align-center gap-1">
        <!-- Retry button for failed files -->
        <v-btn
          v-if="isFailed && isRetryable"
          @click="$emit('retry')"
          size="small"
          variant="outlined"
          color="warning"
          icon="mdi-refresh"
          density="compact"
          :loading="isRetrying"
        />

        <!-- View error details button -->
        <v-btn
          v-if="isFailed"
          @click="showErrorDetails = !showErrorDetails"
          size="small"
          variant="text"
          :icon="showErrorDetails ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          density="compact"
        />

        <!-- Success checkmark -->
        <v-icon v-if="isCompleted" icon="mdi-check-circle" color="success" size="20" />

        <!-- Skipped indicator -->
        <v-icon v-if="isSkipped" icon="mdi-skip-next" color="info" size="20" />
      </div>
    </template>
  </v-list-item>

  <!-- Error Details Expansion -->
  <v-expand-transition>
    <div v-if="showErrorDetails && isFailed" class="error-details pa-3 bg-error-lighten-5">
      <v-alert type="error" variant="tonal" density="compact" class="mb-2">
        <div class="text-body-2 font-weight-medium">{{ getErrorTitle() }}</div>
        <div class="text-caption mt-1">{{ getErrorMessage() }}</div>
      </v-alert>

      <div v-if="fileState.error.classified?.userAction" class="text-caption text-grey-darken-1">
        <strong>Suggested action:</strong> {{ fileState.error.classified.userAction }}
      </div>

      <!-- Technical details (collapsed by default) -->
      <v-expansion-panels variant="accordion" class="mt-2">
        <v-expansion-panel title="Technical Details" text="">
          <template v-slot:text>
            <div class="text-caption font-mono bg-grey-lighten-4 pa-2 rounded">
              <div><strong>Error Code:</strong> {{ fileState.error.code || 'Unknown' }}</div>
              <div>
                <strong>Error Type:</strong> {{ fileState.error.classified?.type || 'unknown' }}
              </div>
              <div>
                <strong>Retryable:</strong>
                {{ fileState.error.classified?.retryable ? 'Yes' : 'No' }}
              </div>
              <div v-if="fileState.error.message">
                <strong>Message:</strong> {{ fileState.error.message }}
              </div>
            </div>
          </template>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
  </v-expand-transition>
</template>

<script setup>
import { ref, computed } from 'vue';

// Component props
const props = defineProps({
  fileId: {
    type: String,
    required: true,
  },
  fileState: {
    type: Object,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    default: 0,
  },
});

// Emits
defineEmits(['retry']);

// Local state
const showErrorDetails = ref(false);

// File states (should match useUploadManager)
const FILE_STATES = {
  QUEUED: 'queued',
  UPLOADING: 'uploading',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  RETRYING: 'retrying',
};

// Computed properties for file state
const isUploading = computed(() => props.fileState.state === FILE_STATES.UPLOADING);
const isCompleted = computed(() => props.fileState.state === FILE_STATES.COMPLETED);
const isFailed = computed(() => props.fileState.state === FILE_STATES.FAILED);
const isSkipped = computed(() => props.fileState.state === FILE_STATES.SKIPPED);
const isRetrying = computed(() => props.fileState.state === FILE_STATES.RETRYING);
const isRetryable = computed(() => props.fileState.error?.classified?.retryable || false);

// File type detection
const getFileIcon = () => {
  const extension = props.fileName.split('.').pop()?.toLowerCase() || '';

  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
    return 'mdi-image';
  }

  // Document files
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) {
    return 'mdi-file-document';
  }

  // Spreadsheet files
  if (['xls', 'xlsx', 'csv'].includes(extension)) {
    return 'mdi-file-excel';
  }

  // Video files
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
    return 'mdi-video';
  }

  // Audio files
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(extension)) {
    return 'mdi-music';
  }

  // Archive files
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
    return 'mdi-archive';
  }

  // Code files
  if (['js', 'html', 'css', 'json', 'xml', 'py', 'java', 'cpp', 'c'].includes(extension)) {
    return 'mdi-code-tags';
  }

  return 'mdi-file';
};

const getFileIconColor = () => {
  if (isFailed.value) return 'error';
  if (isCompleted.value) return 'success';
  if (isSkipped.value) return 'info';
  return 'grey-darken-1';
};

// Status indicator
const getStatusIcon = () => {
  switch (props.fileState.state) {
    case FILE_STATES.QUEUED:
      return 'mdi-clock-outline';
    case FILE_STATES.UPLOADING:
      return 'mdi-upload';
    case FILE_STATES.COMPLETED:
      return 'mdi-check';
    case FILE_STATES.FAILED:
      return 'mdi-alert';
    case FILE_STATES.SKIPPED:
      return 'mdi-skip-next';
    case FILE_STATES.RETRYING:
      return 'mdi-refresh';
    default:
      return 'mdi-help';
  }
};

const getStatusColor = () => {
  switch (props.fileState.state) {
    case FILE_STATES.QUEUED:
      return 'grey';
    case FILE_STATES.UPLOADING:
      return 'primary';
    case FILE_STATES.COMPLETED:
      return 'success';
    case FILE_STATES.FAILED:
      return 'error';
    case FILE_STATES.SKIPPED:
      return 'info';
    case FILE_STATES.RETRYING:
      return 'warning';
    default:
      return 'grey';
  }
};

const getStatusText = () => {
  switch (props.fileState.state) {
    case FILE_STATES.QUEUED:
      return 'Queued';
    case FILE_STATES.UPLOADING:
      return 'Uploading...';
    case FILE_STATES.COMPLETED:
      return 'Completed';
    case FILE_STATES.FAILED:
      return 'Failed';
    case FILE_STATES.SKIPPED:
      return 'Skipped (duplicate)';
    case FILE_STATES.RETRYING:
      return 'Retrying...';
    default:
      return 'Unknown';
  }
};

const getStatusTextClass = () => {
  switch (props.fileState.state) {
    case FILE_STATES.COMPLETED:
      return 'text-success';
    case FILE_STATES.FAILED:
      return 'text-error';
    case FILE_STATES.SKIPPED:
      return 'text-info';
    case FILE_STATES.RETRYING:
      return 'text-warning';
    default:
      return 'text-grey-darken-1';
  }
};

// Error handling
const getErrorTitle = () => {
  const errorType = props.fileState.error?.classified?.type || 'unknown';

  const titles = {
    network: 'Network Error',
    permission: 'Permission Denied',
    storage: 'Storage Limit Exceeded',
    file_size: 'File Too Large',
    server: 'Server Error',
    authentication: 'Authentication Error',
    client: 'Upload Cancelled',
    unknown: 'Upload Error',
  };

  return titles[errorType] || 'Upload Error';
};

const getErrorMessage = () => {
  if (props.fileState.error?.classified?.message) {
    return props.fileState.error.classified.message;
  }

  if (props.fileState.error?.message) {
    return props.fileState.error.message;
  }

  return 'An unknown error occurred during upload';
};

// Utility functions
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatSpeed = (bytesPerSecond) => {
  if (bytesPerSecond < 1024) {
    return `${bytesPerSecond.toFixed(0)} B/s`;
  } else if (bytesPerSecond < 1024 * 1024) {
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  } else {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }
};
</script>

<style scoped>
.file-upload-status-item {
  border-left: 3px solid transparent;
  transition: border-color 0.3s ease;
}

.file-upload-status-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

/* State-specific left border colors */
.file-upload-status-item:has([data-state='uploading']) {
  border-left-color: rgb(var(--v-theme-primary));
}

.file-upload-status-item:has([data-state='completed']) {
  border-left-color: rgb(var(--v-theme-success));
}

.file-upload-status-item:has([data-state='failed']) {
  border-left-color: rgb(var(--v-theme-error));
}

.file-upload-status-item:has([data-state='skipped']) {
  border-left-color: rgb(var(--v-theme-info));
}

.file-upload-status-item:has([data-state='retrying']) {
  border-left-color: rgb(var(--v-theme-warning));
}

.status-badge {
  position: absolute;
  top: -4px;
  right: -4px;
}

.file-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-details {
  margin-top: 4px;
}

.error-message {
  background-color: rgba(var(--v-theme-error), 0.1);
  border-radius: 4px;
  padding: 4px 8px;
}

.error-details {
  border-top: 1px solid rgba(var(--v-theme-error), 0.2);
  background-color: rgba(var(--v-theme-error), 0.05);
}

.transfer-details {
  color: rgb(var(--v-theme-on-surface-variant));
}

.gap-1 {
  gap: 4px;
}

.font-mono {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.75rem;
  line-height: 1.4;
}

/* Smooth animations */
.v-list-item {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.v-progress-circular {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Custom badge styling */
:deep(.v-badge__badge) {
  min-width: 16px;
  height: 16px;
  font-size: 10px;
}
</style>