<template>
  <v-list-item class="px-0" :class="{ 'bg-purple-lighten-5': file.isDuplicate }">
    <template #prepend>
      <v-tooltip location="bottom" transition="fade-transition" :open-delay="0" :close-delay="0">
        <template #activator="{ props: tooltipProps }">
          <v-avatar
            v-bind="tooltipProps"
            @mouseenter="onTooltipHover(file.id || file.name, file.file || file)"
            @mouseleave="onTooltipLeave(file.id || file.name)"
            color="grey-lighten-3"
            size="48"
            class="cursor-help"
          >
            <v-icon :icon="getFileIcon(file.type)" size="24" />
          </v-avatar>
        </template>
        {{ getHashDisplay(file.id || file.name) }}
      </v-tooltip>
    </template>

    <v-list-item-title class="d-flex align-center">
      <span class="text-truncate me-2">{{ file.name }}</span>
      <!-- Duplicate indicator next to filename (only for files being skipped) -->
      <v-chip
        v-if="group.isDuplicateGroup && file.isDuplicate"
        color="purple"
        size="x-small"
        variant="flat"
        class="ms-2"
      >
        duplicate
      </v-chip>
    </v-list-item-title>

    <v-list-item-subtitle>
      <div class="d-flex align-center text-caption text-grey-darken-1">
        <span>{{ formatFileSize(file.size) }}</span>
        <v-divider vertical class="mx-2" />
        <span>{{ formatDate(file.lastModified) }}</span>
        <v-divider vertical class="mx-2" />
        <span>{{ getRelativePath(file) }}</span>
      </div>

      <!-- Duplicate messages -->
      <div
        v-if="file.duplicateMessage"
        class="text-caption mt-1"
        :class="getDuplicateMessageClass(file)"
      >
        <v-icon :icon="getDuplicateIcon(file)" size="12" class="me-1" />
        {{ file.duplicateMessage }}
      </div>
    </v-list-item-subtitle>

    <template #append>
      <div class="d-flex align-center">
        <!-- Status indicator for existing files and processing only -->
        <v-chip
          v-if="file.isDuplicate || file.status === 'processing'"
          :color="getStatusColor(file.status, file)"
          size="small"
          variant="flat"
          class="me-2"
        >
          {{ getStatusText(file.status, file) }}
        </v-chip>

        <!-- Status icon -->
        <div class="text-h6">
          <v-tooltip v-if="file.status === 'processing'" text="Processing..." location="bottom">
            <template #activator="{ props }">
              <v-progress-circular
                v-bind="props"
                size="20"
                width="2"
                color="purple"
                indeterminate
              />
            </template>
          </v-tooltip>
          <v-tooltip v-else-if="file.status === 'uploading'" text="Uploading..." location="bottom">
            <template #activator="{ props }">
              <span v-bind="props">🟡</span>
            </template>
          </v-tooltip>
          <v-tooltip
            v-else-if="file.status === 'completed'"
            text="Successfully uploaded"
            location="bottom"
          >
            <template #activator="{ props }">
              <span v-bind="props">🟢</span>
            </template>
          </v-tooltip>
          <v-tooltip v-else-if="file.status === 'error'" text="Failed upload" location="bottom">
            <template #activator="{ props }">
              <span v-bind="props">🔴</span>
            </template>
          </v-tooltip>
          <v-tooltip
            v-else-if="file.status === 'skipped'"
            text="Skipped"
            location="bottom"
          >
            <template #activator="{ props }">
              <span v-bind="props">🟠</span>
            </template>
          </v-tooltip>
          <v-tooltip
            v-else-if="file.status === 'ready' && !file.isDuplicate"
            text="Ready for upload"
            location="bottom"
          >
            <template #activator="{ props }">
              <span v-bind="props">🔵</span>
            </template>
          </v-tooltip>
          <v-tooltip v-else-if="file.isDuplicate" text="Upload metadata only" location="bottom">
            <template #activator="{ props }">
              <span v-bind="props">⚪</span>
            </template>
          </v-tooltip>
          <v-tooltip v-else text="Unknown status" location="bottom">
            <template #activator="{ props }">
              <span v-bind="props">⚫</span>
            </template>
          </v-tooltip>
        </div>
      </div>
    </template>
  </v-list-item>
</template>

<script setup>
import { useLazyHashTooltip } from '../../../composables/useLazyHashTooltip.js';

// Props
const props = defineProps({
  // eslint-disable-line no-unused-vars
  file: {
    type: Object,
    required: true,
  },
  group: {
    type: Object,
    required: true,
  },
});

// Hash tooltip functionality
const { onTooltipHover, onTooltipLeave, getHashDisplay } = useLazyHashTooltip();

// File icon mapping
const getFileIcon = (mimeType) => {
  if (!mimeType) return 'mdi-file-outline';

  const iconMap = {
    'image/': 'mdi-file-image-outline',
    'video/': 'mdi-file-video-outline',
    'audio/': 'mdi-file-music-outline',
    'application/pdf': 'mdi-file-pdf-box',
    'application/msword': 'mdi-file-word-outline',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      'mdi-file-word-outline',
    'application/vnd.ms-excel': 'mdi-file-excel-outline',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'mdi-file-excel-outline',
    'application/vnd.ms-powerpoint': 'mdi-file-powerpoint-outline',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      'mdi-file-powerpoint-outline',
    'text/': 'mdi-file-document-outline',
    'application/zip': 'mdi-folder-zip-outline',
    'application/x-rar': 'mdi-folder-zip-outline',
    'application/x-7z-compressed': 'mdi-folder-zip-outline',
  };

  // Check for exact match first
  if (iconMap[mimeType]) {
    return iconMap[mimeType];
  }

  // Check for prefix match
  for (const [prefix, icon] of Object.entries(iconMap)) {
    if (mimeType.startsWith(prefix)) {
      return icon;
    }
  }

  return 'mdi-file-outline';
};

// File size formatting
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Date formatting
const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// Status color mapping
const getStatusColor = (status, file) => {
  const statusColors = {
    processing: 'purple',
    pending: 'grey',
    uploading: 'primary',
    completed: 'success',
    error: 'error',
    skipped: 'orange',
    uploadMetadataOnly: 'purple',
    existing: 'blue',
  };

  // Handle special cases based on file properties
  if (file?.isQueueDuplicate) return 'purple';

  return statusColors[status] || 'grey';
};

// Status text mapping
const getStatusText = (status, file) => {
  const statusTexts = {
    processing: 'Processing',
    pending: 'Ready',
    uploading: 'Uploading',
    completed: 'Completed',
    error: 'Error',
    skipped: 'Skipped',
    uploadMetadataOnly: 'Upload metadata only',
    existing: 'Existing',
  };

  // Handle special cases based on file properties
  if (file?.isQueueDuplicate) return 'Duplicate';

  return statusTexts[status] || 'Unknown';
};

// Duplicate message styling
const getDuplicateMessageClass = (file) => {
  if (file.isPreviousUpload) return 'text-blue';
  if (file.isQueueDuplicate) return 'text-purple';
  return 'text-info';
};

// Duplicate icon mapping
const getDuplicateIcon = (file) => {
  if (file.isPreviousUpload) return 'mdi-cloud-check';
  if (file.isQueueDuplicate) return 'mdi-content-duplicate';
  return 'mdi-information';
};

// Relative path extraction
const getRelativePath = (file) => {
  if (!file.path || file.path === file.name) {
    return '\\';
  }

  // Normalize path separators to forward slashes for consistent processing
  const normalizedPath = file.path.replace(/\\/g, '/');

  // Extract the folder path by removing the filename
  const pathParts = normalizedPath.split('/').filter((part) => part !== '');
  pathParts.pop(); // Remove the filename

  if (pathParts.length === 0) {
    return '\\';
  }

  // Join path parts and ensure single leading slash
  const folderPath = pathParts.join('/');
  return folderPath.startsWith('/') ? folderPath : '/' + folderPath;
};
</script>
