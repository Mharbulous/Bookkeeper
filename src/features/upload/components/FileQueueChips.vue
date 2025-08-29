<template>
  <div v-if="files.length > 0" class="mb-4">
    <div class="d-flex gap-2 flex-wrap">
      <!-- Total Files chip (first) -->
      <v-chip
        size="large"
        variant="flat"
        color="white"
        class="text-black border-black"
        style="border-width: 1px"
      >
        {{ totalCount }}
        total
      </v-chip>

      <!-- Blocked chip (second, conditional) -->
      <v-chip
        v-if="!shouldShowSpinnerForDeduplicationChips && blockedFilesCount > 0"
        size="large"
        variant="flat"
        color="black"
        class="text-white"
      >
        {{ blockedFilesCount }}
        blocked
      </v-chip>

      <!-- Duplicates chip (third) -->
      <v-chip size="large" variant="flat" color="purple" class="text-white">
        <v-progress-circular
          v-if="shouldShowSpinnerForDeduplicationChips"
          indeterminate
          size="16"
          width="2"
          class="me-1"
        />
        <template v-else>{{ queueDuplicatesCount }}</template>
        duplicates
      </v-chip>

      <!-- Distinct files chip (fourth) -->
      <v-chip size="large" variant="flat" color="blue" class="text-white">
        <v-progress-circular
          v-if="shouldShowSpinnerForDeduplicationChips"
          indeterminate
          size="16"
          width="2"
          class="me-1"
        />
        <template v-else>{{ distinctFilesCount }}</template>
        ready to upload
      </v-chip>

      <!-- Previous uploads chip (fourth) -->
      <v-chip v-if="hasUploadStarted" size="large" variant="flat" color="orange" class="text-white">
        {{ skippedCount }}
        skipped
      </v-chip>

      <!-- Failed uploads chip (sixth) -->
      <v-chip v-if="hasUploadStarted" size="large" variant="flat" color="red">
        {{ failedCount }}
        failed
      </v-chip>

      <!-- Successful uploads chip (seventh) -->
      <v-chip v-if="hasUploadStarted" size="large" variant="flat" color="green">
        {{ successfulCount }}
        successful
      </v-chip>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

// Props
const props = defineProps({
  files: {
    type: Array,
    required: true,
    default: () => [],
  },
  isProcessingUIUpdate: {
    type: Boolean,
    default: false,
  },
  uiUpdateProgress: {
    type: Object,
    default: () => ({
      current: 0,
      total: 0,
      percentage: 0,
      phase: 'loading',
    }),
  },
  totalAnalyzedFiles: {
    type: Number,
    default: null,
  },
  hasUploadStarted: {
    type: Boolean,
    default: false,
  },
  uploadStatus: {
    type: Object,
    default: () => ({
      successful: 0,
      failed: 0,
      skipped: 0,
      isUploading: false,
      currentFile: null,
    }),
  },
});

// Computed properties for file counts
const totalCount = computed(() => {
  // Use analyzed files total if available, otherwise fall back to current queue length
  return props.totalAnalyzedFiles !== null ? props.totalAnalyzedFiles : props.files.length;
});

const uploadableFiles = computed(() => {
  return props.files.filter((file) => !file.isDuplicate);
});

const pendingCount = computed(() => {
  return props.files.filter(
    (file) =>
      file.status === 'ready' ||
      file.status === 'pending' ||
      (!file.status && !file.isQueueDuplicate && !file.isPreviousUpload)
  ).length;
});

const processingCount = computed(() => {
  return props.files.filter((file) => file.status === 'processing').length;
});

const queueDuplicatesCount = computed(() => {
  return props.files.filter((file) => file.isDuplicate).length;
});

const distinctFilesCount = computed(() => {
  const totalUploadableFiles = props.files.filter((file) => !file.isDuplicate).length;

  // If upload has started, show remaining files by subtracting processed files
  if (props.hasUploadStarted) {
    const processedFiles =
      props.uploadStatus.successful + props.uploadStatus.failed + props.uploadStatus.skipped;
    return Math.max(0, totalUploadableFiles - processedFiles);
  }

  // Before upload starts, show total uploadable files
  return totalUploadableFiles;
});

const blockedFilesCount = computed(() => {
  // Blocked files = Total - Original Uploadable Files - Duplicates
  // Use the original count of uploadable files (not the decreasing ready count)
  const originalUploadableFiles = props.files.filter((file) => !file.isDuplicate).length;
  return totalCount.value - originalUploadableFiles - queueDuplicatesCount.value;
});

const skippedCount = computed(() => {
  // Use uploadStatus if upload has started, otherwise fall back to file-based counting
  return props.hasUploadStarted
    ? props.uploadStatus.skipped
    : props.files.filter((file) => file.isPreviousUpload).length;
});

const successfulCount = computed(() => {
  // Use uploadStatus if upload has started, otherwise fall back to file-based counting
  return props.hasUploadStarted
    ? props.uploadStatus.successful
    : props.files.filter((file) => file.status === 'completed').length;
});

const failedCount = computed(() => {
  // Use uploadStatus if upload has started, otherwise fall back to file-based counting
  return props.hasUploadStarted
    ? props.uploadStatus.failed
    : props.files.filter((file) => file.status === 'error').length;
});

// Spinner logic for deduplication chips
const shouldShowSpinnerForDeduplicationChips = computed(() => {
  // Only show spinner during deduplication (loading phase)
  return props.uiUpdateProgress.phase === 'loading';
});
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>