<template>
  <v-card variant="outlined" class="upload-queue">
    <v-card-title class="d-flex align-center justify-space-between queue-header">
      <div class="d-flex align-center">
        <v-icon icon="mdi-file-multiple" class="me-2" />
        Upload Queue
        <QueueTimeProgress
          v-if="showTimeProgress"
          :is-visible="showTimeProgress"
          :elapsed-time="timeProgress.elapsedTime"
          :progress-percentage="timeProgress.progressPercentage"
          :is-overdue="timeProgress.isOverdue"
          :overdue-seconds="timeProgress.overdueSeconds"
          :time-remaining="timeProgress.timeRemaining"
          :formatted-elapsed-time="timeProgress.formattedElapsedTime"
          :formatted-time-remaining="timeProgress.formattedTimeRemaining"
          :estimated-duration="timeProgress.estimatedDuration"
          class="ml-4"
        />
      </div>

      <div class="d-flex gap-2">
        <ClearAllButton
          :disabled="files.length === 0 || isUploading"
          @click="handleClearQueue"
        />

        <!-- Upload Controls -->
        <v-btn
          v-if="!isUploading && !isPaused"
          color="primary"
          variant="elevated"
          prepend-icon="mdi-upload"
          @click="$emit('start-upload')"
          :disabled="files.length === 0 || hasErrors"
          :loading="isStartingUpload"
        >
          Start Upload
        </v-btn>

        <!-- Uploading State Button -->
        <v-btn
          v-if="isUploading"
          color="warning"
          variant="elevated"
          prepend-icon="mdi-pause"
          @click="$emit('pause-upload')"
        >
          Pause Upload
        </v-btn>

        <!-- Paused State Button -->
        <v-btn
          v-if="isPaused"
          color="primary"
          variant="elevated"
          prepend-icon="mdi-play"
          @click="$emit('resume-upload')"
        >
          Resume Upload
        </v-btn>
      </div>
    </v-card-title>

    <v-divider class="queue-divider" />

    <div class="pa-4 queue-static-content">
      <!-- Status Chips -->
      <FileQueueChips
        :files="files"
        :is-processing-ui-update="isProcessingUIUpdate"
        :ui-update-progress="uiUpdateProgress"
        :total-analyzed-files="totalAnalyzedFiles"
        :has-upload-started="hasUploadStarted"
        :upload-status="uploadStatus"
      />

      <!-- UI Update Progress Indicator -->
      <v-card
        v-if="isProcessingUIUpdate"
        class="mb-4 bg-blue-lighten-5 border-blue-lighten-2"
        variant="outlined"
      >
        <v-card-text class="py-3">
          <div class="d-flex align-center">
            <v-progress-circular
              indeterminate
              color="blue"
              size="20"
              width="2"
              class="me-3"
            />
            <div class="flex-grow-1">
              <div class="text-body-2 font-weight-medium text-blue-darken-2">
                {{ getLoadingMessage() }}
              </div>
              <div class="text-caption text-blue-darken-1 mt-1">
                {{ uiUpdateProgress.current }} of {{ uiUpdateProgress.total }} files loaded ({{ uiUpdateProgress.percentage }}%)
              </div>
            </div>
            <div class="text-caption text-blue-darken-1">
              {{ getPhaseMessage() }}
            </div>
          </div>
          
          <!-- Progress bar -->
          <v-progress-linear
            :model-value="uiUpdateProgress.percentage"
            color="blue"
            bg-color="blue-lighten-4"
            height="4"
            rounded
            class="mt-3"
          />
        </v-card-text>
      </v-card>

      <!-- Current Upload Progress -->
      <v-card
        v-if="uploadStatus.isUploading && uploadStatus.currentFile"
        class="mb-4 bg-green-lighten-5 border-green-lighten-2"
        variant="outlined"
      >
        <v-card-text class="py-3">
          <div class="d-flex align-center">
            <v-progress-circular
              indeterminate
              color="green"
              size="20"
              width="2"
              class="me-3"
            />
            <div class="flex-grow-1">
              <div class="text-body-2 font-weight-medium text-green-darken-2">
                {{ getCurrentActionText() }}
              </div>
              <div class="text-body-1">{{ uploadStatus.currentFile }}</div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Files List - Grouped by duplicates -->
      <div class="scrollable-content">
        <div v-for="(group, groupIndex) in groupedFiles" :key="groupIndex">
        <!-- Files in Group -->
        <v-list lines="two" density="comfortable">
          <template v-for="(file, fileIndex) in group.files" :key="`${file.id || groupIndex + '-' + fileIndex}-${file.status || 'pending'}`">
            <!-- Conditional rendering: Placeholder or Loaded Item -->
            <FileQueuePlaceholder
              v-if="!isItemLoaded(groupIndex, fileIndex)"
              :is-duplicate="file.isDuplicate"
              @load="loadItem(groupIndex, fileIndex)"
            />
            <LazyFileItem
              v-else
              :file="file"
              :group="group"
            />
            
            <v-divider v-if="fileIndex < group.files.length - 1" />
          </template>
        </v-list>

          <!-- Spacing between groups -->
          <div v-if="groupIndex < groupedFiles.length - 1" class="my-4"></div>
        </div>

        <!-- Empty state -->
        <div v-if="files.length === 0" class="text-center py-8">
          <v-icon icon="mdi-file-outline" size="48" color="grey-lighten-1" class="mb-2" />
          <p class="text-body-1 text-grey-darken-1">No files in queue</p>
          <p class="text-caption text-grey-darken-2">Drag and drop files or use the upload buttons above</p>
        </div>
      </div>
    </div>

    <!-- Upload Summary -->
    <v-card-actions v-if="files.length > 0" class="bg-grey-lighten-5 queue-footer">
      <div class="d-flex w-100 justify-space-between align-center">
        <div class="text-body-2 text-grey-darken-1">
          <strong>{{ uploadableFiles.length }}</strong> files ready for upload
          <span v-if="skippableFiles.length > 0">
            • <strong>{{ skippableFiles.length }}</strong> will be skipped
          </span>
        </div>
        
        <div class="text-body-2 text-grey-darken-1">
          Total size: <strong>{{ formatFileSize(totalSize) }}</strong>
        </div>
      </div>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useLazyHashTooltip } from '../../../composables/useLazyHashTooltip.js'
import { useLazyFileList } from '../../../composables/useLazyFileList.js'
import FileQueuePlaceholder from './FileQueuePlaceholder.vue'
import LazyFileItem from './LazyFileItem.vue'
import FileQueueChips from './FileQueueChips.vue'
import QueueTimeProgress from './QueueTimeProgress.vue'
import ClearAllButton from '../../base/ClearAllButton.vue'

// Component configuration
defineOptions({
  name: 'FileUploadQueue'
})

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
  // Time progress props
  showTimeProgress: {
    type: Boolean,
    default: false
  },
  timeProgress: {
    type: Object,
    default: () => ({
      elapsedTime: 0,
      progressPercentage: 0,
      isOverdue: false,
      overdueSeconds: 0,
      timeRemaining: 0,
      formattedElapsedTime: '0s',
      formattedTimeRemaining: '0s',
      estimatedDuration: 0
    })
  },
  // Upload state props
  isUploading: {
    type: Boolean,
    default: false
  },
  isPaused: {
    type: Boolean,
    default: false
  },
  isStartingUpload: {
    type: Boolean,
    default: false
  },
  totalAnalyzedFiles: {
    type: Number,
    default: null
  },
  uploadStatus: {
    type: Object,
    default: () => ({
      successful: 0,
      failed: 0,
      skipped: 0,
      isUploading: false,
      currentFile: null,
      currentAction: null
    })
  },
})

// Emits
const emit = defineEmits([
  'remove-file', 
  'start-upload', 
  'pause-upload',
  'resume-upload',
  'clear-queue'
])

// Hash tooltip functionality (only for cache management)
const {
  populateExistingHash,
  clearCache
} = useLazyHashTooltip()

// Populate existing hashes when component mounts or props change
const populateExistingHashes = () => {
  props.files.forEach(file => {
    if (file.hash) {
      populateExistingHash(file.id || file.name, file.hash)
    }
  })
}

// Populate hashes on mount and when files change
onMounted(populateExistingHashes)

// Clean up on unmount
onUnmounted(() => {
  clearCache()
})

// Lazy file list functionality
const {
  loadItem,
  isItemLoaded,
  preloadInitialItems,
  resetLoadedItems
} = useLazyFileList(computed(() => groupedFiles.value))

// Preload initial items for better UX
onMounted(() => {
  preloadInitialItems(10)
})

// Reset loaded items when files change
watch(() => props.files, () => {
  resetLoadedItems()
  // Re-preload initial items after files change
  preloadInitialItems(10)
}, { deep: true })

// Clear queue handler with UI component cleanup
const handleClearQueue = () => {
  try {
    console.log('Clearing UI component caches...')
    
    // Clear lazy loading caches (idempotent operations)
    try {
      clearCache() // Hash tooltip cache
    } catch (error) {
      console.warn('Error clearing hash tooltip cache:', error)
    }
    
    try {
      resetLoadedItems() // Lazy file list cache
    } catch (error) {
      console.warn('Error resetting loaded items:', error)
    }
    
    // Always emit the clear-queue event to parent
    emit('clear-queue')
  } catch (error) {
    console.error('Error during UI component cleanup:', error)
    // Always emit the event even if cleanup fails
    try {
      emit('clear-queue')
    } catch (emitError) {
      console.error('Failed to emit clear-queue event:', emitError)
    }
  }
}

// Computed properties
const uploadableFiles = computed(() => {
  return props.files.filter(file => !file.isDuplicate)
})

const skippableFiles = computed(() => {
  return props.files.filter(file => file.isDuplicate)
})

// Group files for better duplicate visualization
const groupedFiles = computed(() => {
  const groups = new Map()
  
  // Group files by hash (for duplicates) or by unique ID (for singles)
  props.files.forEach(file => {
    const groupKey = file.hash || `unique_${file.name}_${file.size}_${file.lastModified}`
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        files: [],
        isDuplicateGroup: false,
        groupName: file.name
      })
    }
    
    groups.get(groupKey).files.push(file)
  })
  
  // Mark groups with multiple files as duplicate groups
  for (const group of groups.values()) {
    if (group.files.length > 1) {
      group.isDuplicateGroup = true
      // Sort within group: kept files first, then duplicates
      group.files.sort((a, b) => {
        if (a.isDuplicate !== b.isDuplicate) {
          return a.isDuplicate ? 1 : -1 // Non-duplicates first
        }
        return a.originalIndex - b.originalIndex
      })
    }
  }
  
  return Array.from(groups.values())
})

// Watch for file changes and populate existing hashes
watch(() => props.files, populateExistingHashes, { deep: true })

const totalSize = computed(() => {
  return uploadableFiles.value.reduce((total, file) => total + file.size, 0)
})

const hasErrors = computed(() => {
  return props.files.some(file => file.status === 'error')
})

const hasUploadStarted = computed(() => {
  return props.isUploading || props.isPaused || props.isStartingUpload || 
         props.uploadStatus.successful > 0 || props.uploadStatus.failed > 0 || props.uploadStatus.skipped > 0
})

// Methods
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const getCurrentActionText = () => {
  switch (props.uploadStatus.currentAction) {
    case 'calculating_hash':
      return 'Calculating file hash...'
    case 'checking_existing':
      return 'Checking if file exists...'
    case 'uploading':
      return 'Uploading file...'
    default:
      return 'Processing file...'
  }
}

// 2-chunk loading message generator
const getLoadingMessage = () => {
  if (!props.isProcessingUIUpdate) return 'Loading files into queue...'

  const { total, percentage } = props.uiUpdateProgress

  if (total <= 100) {
    return 'Loading files into queue...'
  }

  if (percentage <= 15) {
    return 'Showing initial files...'
  } else if (percentage < 100) {
    return 'Loading remaining files...'
  } else {
    return 'Complete!'
  }
}

// Phase message for 2-chunk strategy
const getPhaseMessage = () => {
  if (!props.isProcessingUIUpdate) return 'Loading...'

  const { total, percentage } = props.uiUpdateProgress

  if (total <= 100) {
    return 'Loading...'
  }

  if (percentage <= 15) {
    return 'Step 1/2'
  } else if (percentage < 100) {
    return 'Step 2/2'
  } else {
    return 'Complete!'
  }
}
</script>

<style scoped>
.upload-queue {
  width: 100%; /* Fill 100% of available width */
  max-width: 1000px; /* Maximum width of 1000px */
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  height: 100%; /* Fill available height from parent container */
}

/* Static header section */
.queue-header {
  flex-shrink: 0;
}

/* Static divider */
.queue-divider {
  flex-shrink: 0;
}

/* Container for static content and scrollable area */
.queue-static-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Scrollable file list container */
.scrollable-content {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thick; /* Firefox - always show thick scrollbar */
  -ms-overflow-style: scrollbar; /* IE/Edge - always show scrollbar */
}

/* Always visible thick scrollbar in Webkit browsers */
.scrollable-content::-webkit-scrollbar {
  width: 16px; /* Twice as thick as the original 8px */
}

.scrollable-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 8px; /* Increased border radius for thicker scrollbar */
}

.scrollable-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 8px; /* Increased border radius for thicker scrollbar */
}

.scrollable-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Static footer section */
.queue-footer {
  flex-shrink: 0;
}

.gap-2 {
  gap: 8px;
}

.cursor-help {
  cursor: help;
}

/* Allow scrolling within the scrollable content */
:deep(.v-list) {
  overflow: visible;
}

:deep(.v-list-item) {
  overflow: hidden;
}

/* Custom fade transition for tooltip popup */
:deep(.fade-transition-enter-active),
:deep(.fade-transition-leave-active) {
  transition: opacity 0.5s ease-in-out !important;
}

:deep(.fade-transition-enter-from),
:deep(.fade-transition-leave-to) {
  opacity: 0 !important;
}

:deep(.fade-transition-enter-to),
:deep(.fade-transition-leave-from) {
  opacity: 1 !important;
}
</style>