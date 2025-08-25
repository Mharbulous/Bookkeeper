<template>
  <v-container fluid class="pa-6">
    <div class="max-w-4xl mx-auto mt-16">

      <!-- Main Upload Area -->
      <UploadDropzone
        v-if="uploadQueue.length === 0"
        ref="dropzoneRef"
        :is-drag-over="isDragOver"
        @drag-over="handleDragOver"
        @drag-leave="handleDragLeave"
        @drop="handleDrop"
        @trigger-file-select="triggerFileSelectWrapper"
        @trigger-folder-select="triggerFolderSelectWrapper"
        @file-select="handleFileSelect"
        @folder-select="handleFolderSelect"
      />

      <!-- Folder Options Dialog -->
      <FolderOptionsDialog
        :show="showFolderOptions"
        :subfolder-count="subfolderCount"
        :include-subfolders="includeSubfolders"
        :is-analyzing="isAnalyzing"
        :main-folder-analysis="mainFolderAnalysis"
        :all-files-analysis="allFilesAnalysis"
        :main-folder-progress="mainFolderProgress"
        :all-files-progress="allFilesProgress"
        :main-folder-complete="mainFolderComplete"
        :all-files-complete="allFilesComplete"
        :is-analyzing-main-folder="isAnalyzingMainFolder"
        :is-analyzing-all-files="isAnalyzingAllFiles"
        :analysis-timed-out="analysisTimedOut"
        :timeout-error="timeoutError"
        :current-progress-message="currentProgressMessage"
        @update:show="showFolderOptions = $event"
        @update:include-subfolders="includeSubfolders = $event"
        @confirm="confirmFolderOptions"
        @cancel="cancelFolderUpload"
      />



      <!-- Upload Queue/Preview -->
      <FileUploadQueue
        v-if="uploadQueue.length > 0 || isProcessingUIUpdate"
        :files="uploadQueue"
        :is-processing-ui-update="isProcessingUIUpdate"
        :ui-update-progress="uiUpdateProgress"
        :show-time-progress="timeWarning.startTime.value !== null && (uploadQueue.length === 0 || isProcessingUIUpdate)"
        :time-progress="{
          elapsedTime: timeWarning.elapsedTime.value,
          progressPercentage: timeWarning.progressPercentage.value,
          isOverdue: timeWarning.isOverdue.value,
          overdueSeconds: timeWarning.overdueSeconds.value,
          timeRemaining: timeWarning.timeRemaining.value,
          formattedElapsedTime: timeWarning.formattedElapsedTime.value,
          formattedTimeRemaining: timeWarning.formattedTimeRemaining.value,
          estimatedDuration: timeWarning.estimatedDuration.value
        }"
        @remove-file="removeFromQueue"
        @start-upload="startUpload"
        @clear-queue="clearQueue"
      />

      <!-- Single File Upload Notification -->
      <v-snackbar
        v-model="showSingleFileNotification"
        :timeout="3000"
        :color="singleFileNotification.color"
        location="top"
      >
        {{ singleFileNotification.message }}
        <template #actions>
          <v-btn
            color="white"
            variant="text"
            @click="showSingleFileNotification = false"
          >
            Close
          </v-btn>
        </template>
      </v-snackbar>

      <!-- Processing Progress Modal -->
      <ProcessingProgressModal
        v-model="processingProgress.isProcessing"
        :progress="processingProgress"
        :can-cancel="true"
        @cancel="handleCancelProcessing"
      />

      <!-- Cloud File Warning Modal -->
      <CloudFileWarningModal
        :is-visible="timeWarning.showCloudFileWarning.value"
        :formatted-elapsed-time="timeWarning.formattedElapsedTime.value"
        :estimated-duration="timeWarning.estimatedDuration.value"
        :overdue-seconds="timeWarning.overdueSeconds.value"
        @stop-upload="handleStopUpload"
        @continue-waiting="handleContinueWaiting"
        @close="handleCloseWarning"
      />
    </div>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import FileUploadQueue from '../components/features/upload/FileUploadQueue.vue'
import UploadDropzone from '../components/features/upload/UploadDropzone.vue'
import FolderOptionsDialog from '../components/features/upload/FolderOptionsDialog.vue'
import ProcessingProgressModal from '../components/features/upload/ProcessingProgressModal.vue'
import CloudFileWarningModal from '../components/features/upload/CloudFileWarningModal.vue'
import { useFileQueue } from '../composables/useFileQueue.js'
import { useFileDragDrop } from '../composables/useFileDragDrop.js'
import { useQueueDeduplication } from '../composables/useQueueDeduplication.js'
import { useFolderOptions } from '../composables/useFolderOptions.js'
import { useTimeBasedWarning } from '../composables/useTimeBasedWarning.js'

// Component configuration
defineOptions({
  name: 'FileUploadView'
})

// Template refs
const dropzoneRef = ref(null)

// Composables
const {
  uploadQueue,
  showSingleFileNotification,
  singleFileNotification,
  fileInput,
  folderInput,
  processingProgress,
  isProcessingUIUpdate,
  uiUpdateProgress,
  triggerFileSelect,
  triggerFolderSelect,
  processSingleFile,
  addFilesToQueue,
  initializeQueueInstantly,
  updateUploadQueue,
  resetProgress,
  removeFromQueue,
  clearQueue,
  startUpload,
  showNotification
} = useFileQueue()

const {
  isDragOver,
  handleDragOver,
  handleDragLeave,
  handleDrop: baseHandleDrop
} = useFileDragDrop()

const queueDeduplication = useQueueDeduplication()
const { processFiles } = queueDeduplication

const {
  showFolderOptions,
  includeSubfolders,
  subfolderCount,
  isAnalyzing,
  mainFolderAnalysis,
  allFilesAnalysis,
  // Timeout state
  analysisTimedOut,
  timeoutError,
  currentProgressMessage,
  skippedFolders,
  // Progress tracking
  mainFolderProgress,
  allFilesProgress,
  mainFolderComplete,
  allFilesComplete,
  isAnalyzingMainFolder,
  isAnalyzingAllFiles,
  processFolderEntry,
  processFolderFiles,
  confirmFolderOptions: baseConfirmFolderOptions,
  cancelFolderUpload
} = useFolderOptions()

const timeWarning = useTimeBasedWarning()

// Connect time monitoring to deduplication processing
queueDeduplication.setTimeMonitoringCallback({
  onProcessingStart: () => {
    // Time monitoring will be started when we have an estimate from folder analysis
    console.log('File processing started - waiting for time estimate')
  },
  onProcessingComplete: () => {
    timeWarning.resetMonitoring()
    console.log('File processing completed - time monitoring reset')
  },
  onProcessingError: (error) => {
    timeWarning.resetMonitoring()
    console.log('File processing error - time monitoring reset:', error)
  },
  onProcessingAborted: () => {
    console.log('File processing aborted - time monitoring stopped')
  }
})

// Integrate processFiles with updateUploadQueue with safety filtering
const processFilesWithQueue = async (files) => {
  // Start time monitoring if not already started and we have files to process
  if (files.length > 0 && !timeWarning.startTime.value) {
    // Use folder analysis estimate if available, otherwise create basic estimate
    const folderAnalysis = allFilesAnalysis.value || mainFolderAnalysis.value
    let estimatedTime = 0
    
    if (folderAnalysis && folderAnalysis.totalEstimatedTime) {
      estimatedTime = folderAnalysis.totalEstimatedTime
      console.log(`Starting time monitoring with folder analysis estimate: ${estimatedTime}ms`)
    } else {
      // Basic time estimate for deduplication: 35ms base + 6.5ms per file + size factor
      const totalSizeMB = files.reduce((sum, file) => sum + (file.size || 0), 0) / (1024 * 1024)
      estimatedTime = Math.max(1000, 35 + (6.5 * files.length) + (0.8 * totalSizeMB)) // Minimum 1 second for visibility
      console.log(`Starting time monitoring with basic deduplication estimate: ${estimatedTime}ms for ${files.length} files (${totalSizeMB.toFixed(1)}MB)`)
    }
    
    if (estimatedTime > 0) {
      timeWarning.startMonitoring(estimatedTime)
      console.log(`Time monitoring started: estimated=${estimatedTime}ms, files=${files.length}`)
    } else {
      console.warn('Time monitoring not started: estimatedTime is 0 or invalid')
    }
  }
  
  // Double-check safety filter: exclude any files from skipped folders
  if (skippedFolders.value && skippedFolders.value.length > 0) {
    const originalCount = files.length
    const safeFiles = files.filter(file => {
      const filePath = file.path || file.webkitRelativePath || file.name
      const isInSkippedFolder = skippedFolders.value.some(skippedPath => {
        const normalizedFilePath = filePath.replace(/\\/g, '/').toLowerCase()
        const normalizedSkippedPath = skippedPath.replace(/\\/g, '/').toLowerCase()
        return normalizedFilePath.startsWith(normalizedSkippedPath)
      })
      
      if (isInSkippedFolder) {
        console.log(`Upload safety filter: excluding ${filePath} from skipped folder`)
        return false
      }
      return true
    })
    
    if (safeFiles.length !== originalCount) {
      console.log(`Upload safety filter: excluded ${originalCount - safeFiles.length} files from ${skippedFolders.value.length} skipped folders`)
    }
    
    await processFiles(safeFiles, updateUploadQueue)
  } else {
    await processFiles(files, updateUploadQueue)
  }
}

// Event handlers with composable integration
const handleFileSelect = async (event) => {
  updateRefs()
  const files = Array.from(event.target.files)
  if (files.length === 1) {
    await processSingleFile(files[0], processFilesWithQueue)
    showNotification('File ready for upload', 'success')
  } else {
    await addFilesToQueue(files, processFilesWithQueue)
  }
  // Reset input
  event.target.value = ''
}

const handleFolderSelect = (event) => {
  updateRefs()
  const files = Array.from(event.target.files)
  
  // File Explorer count will be compared automatically in processing
  // Pass callback to handle no-subfolder case automatically
  processFolderFiles(files, async (files) => {
    // Show Upload Queue instantly with first 100 files
    await initializeQueueInstantly(files)
    // Then process all files for deduplication
    addFilesToQueue(files, processFilesWithQueue)
  })
  // Reset input
  event.target.value = ''
}

const handleDrop = async (event) => {
  await baseHandleDrop(event, {
    processSingleFile: async (file) => {
      await processSingleFile(file, processFilesWithQueue)
      showNotification('File ready for upload', 'success')
    },
    addFilesToQueue: (files) => addFilesToQueue(files, processFilesWithQueue),
    processFolderEntry: (folder) => processFolderEntry(folder, async (files) => {
      // Show Upload Queue instantly with first 100 files
      await initializeQueueInstantly(files)
      // Then process all files for deduplication
      addFilesToQueue(files, processFilesWithQueue)
    })
  })
}

const confirmFolderOptions = () => {
  baseConfirmFolderOptions(async (files) => {
    // Show Upload Queue instantly with first 100 files
    await initializeQueueInstantly(files)
    // Then process all files for deduplication (time monitoring will start automatically)
    addFilesToQueue(files, processFilesWithQueue)
  })
}

// Update refs to use composable integration
const updateRefs = () => {
  if (dropzoneRef.value) {
    fileInput.value = dropzoneRef.value.fileInput
    folderInput.value = dropzoneRef.value.folderInput
  }
}

// Ensure refs are updated after component mount
const triggerFileSelectWrapper = () => {
  updateRefs()
  triggerFileSelect()
}

const triggerFolderSelectWrapper = () => {
  updateRefs()
  triggerFolderSelect()
}

// Handle cancel processing for progress modal
const handleCancelProcessing = () => {
  // Stop time monitoring when cancelling
  timeWarning.abortProcessing()
  resetProgress()
}

// Cloud file warning modal handlers
const handleStopUpload = () => {
  // User chose to stop upload due to cloud file warning
  timeWarning.abortProcessing()
  resetProgress()
  clearQueue()
  showNotification('Upload stopped', 'info')
}

const handleContinueWaiting = () => {
  // User chose to wait 1 more minute
  timeWarning.snoozeWarning()
  showNotification('Continuing upload - will check again in 1 minute', 'info')
}

const handleCloseWarning = () => {
  // User closed warning without choosing action
  timeWarning.dismissWarning()
}
</script>

<style scoped>
/* Styles moved to individual components */
</style>