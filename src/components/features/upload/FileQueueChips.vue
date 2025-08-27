<template>
  <div v-if="files.length > 0" class="mb-4">
    <div class="d-flex gap-2 flex-wrap">
      <!-- Total Files chip (first) -->
      <v-chip
        size="large"
        variant="flat"
        color="white"
        class="text-black border-black"
        style="border-width: 1px;"
      >
        {{ totalCount }}
        total
      </v-chip>

      <!-- Duplicates chip (second) -->
      <v-chip
        size="large"
        variant="flat"
        color="purple"
        class="text-white"
      >
        <v-progress-circular
          v-if="uiUpdateProgress.phase === 'loading'"
          indeterminate
          size="16"
          width="2"
          class="me-1"
        />
        <template v-else>{{ queueDuplicatesCount }}</template>
        duplicates
      </v-chip>

      <!-- Blocked chip (third, conditional) -->
      <v-chip
        v-if="blockedCount > 0"
        size="large"
        variant="flat"
        color="black"
        class="text-white"
      >
        {{ blockedCount }}
        blocked
      </v-chip>

      <!-- Previous uploads chip (fourth) -->
      <v-chip
        size="large"
        variant="flat"
        color="orange"
        class="text-white"
      >
        <v-progress-circular
          v-if="uiUpdateProgress.phase === 'loading'"
          indeterminate
          size="16"
          width="2"
          class="me-1"
        />
        <template v-else>{{ previouslyUploadedCount }}</template>
        previous uploads
      </v-chip>

      <!-- New files chip (fifth) -->
      <v-chip
        size="large"
        variant="flat"
        color="blue"
        class="text-white"
      >
        <v-progress-circular
          v-if="uiUpdateProgress.phase === 'loading'"
          indeterminate
          size="16"
          width="2"
          class="me-1"
        />
        <template v-else>{{ pendingCount }}</template>
        new
      </v-chip>

      <!-- Failed uploads chip (sixth) -->
      <v-chip
        size="large"
        variant="flat"
        color="red"
      >
        <v-progress-circular
          v-if="uiUpdateProgress.phase === 'loading'"
          indeterminate
          size="16"
          width="2"
          class="me-1"
        />
        <template v-else>{{ failedCount }}</template>
        failed uploads
      </v-chip>

      <!-- Successful uploads chip (seventh) -->
      <v-chip
        size="large"
        variant="flat"
        color="green"
      >
        <v-progress-circular
          v-if="uiUpdateProgress.phase === 'loading'"
          indeterminate
          size="16"
          width="2"
          class="me-1"
        />
        <template v-else>{{ successfulCount }}</template>
        successful uploads
      </v-chip>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'

// Props
const props = defineProps({
  files: {
    type: Array,
    required: true,
    default: () => []
  },
  isProcessingUIUpdate: {
    type: Boolean,
    default: false
  },
  uiUpdateProgress: {
    type: Object,
    default: () => ({
      current: 0,
      total: 0,
      percentage: 0,
      phase: 'loading'
    })
  },
  totalAnalyzedFiles: {
    type: Number,
    default: null
  }
})

// Computed properties for file counts
const totalCount = computed(() => {
  // Use analyzed files total if available, otherwise fall back to current queue length
  return props.totalAnalyzedFiles !== null ? props.totalAnalyzedFiles : props.files.length
})

const uploadableFiles = computed(() => {
  return props.files.filter(file => !file.isDuplicate)
})

const pendingCount = computed(() => {
  return props.files.filter(file =>
    file.status === 'ready' ||
    file.status === 'pending' ||
    (!file.status && !file.isQueueDuplicate && !file.isPreviousUpload)
  ).length
})

const processingCount = computed(() => {
  return props.files.filter(file => file.status === 'processing').length
})

const queueDuplicatesCount = computed(() => {
  return props.files.filter(file => file.isDuplicate).length
})

const previouslyUploadedCount = computed(() => {
  return props.files.filter(file => file.isPreviousUpload).length
})

const successfulCount = computed(() => {
  return props.files.filter(file => file.status === 'completed').length
})

const failedCount = computed(() => {
  return props.files.filter(file => file.status === 'error').length
})

const blockedCount = computed(() => {
  return props.files.filter(file => file.status === 'blocked').length
})
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>