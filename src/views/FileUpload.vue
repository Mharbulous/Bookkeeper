<template>
  <v-container fluid class="main-viewport">

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
        @clear-all="handleClearAll"
        @continue-waiting="handleContinueWaiting"
        @close="handleCloseWarning"
      />
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
import { calculateCalibratedProcessingTime, getStoredHardwarePerformanceFactor } from '../utils/hardwareCalibration.js'

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
  clearQueue: baseClearQueue,
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
    queueDeduplication.terminateWorker()
    console.log('File processing completed - time monitoring reset and workers terminated')
  },
  onProcessingError: (error) => {
    timeWarning.resetMonitoring()
    queueDeduplication.terminateWorker()
    console.log('File processing error - time monitoring reset and workers terminated:', error)
  },
  onProcessingAborted: () => {
    queueDeduplication.terminateWorker()
    console.log('File processing aborted - workers terminated')
  }
})

// Comprehensive cleanup function for all stop/cancel/clear operations
const performComprehensiveCleanup = (source = 'unknown') => {
  try {
    console.log(`Starting comprehensive cleanup from: ${source}`)
    
    // 1. Force abort any ongoing operations by setting timeout state
    try {
      analysisTimedOut.value = true // This signals all ongoing operations to abort immediately
      console.log('Forced analysis timeout to abort ongoing operations')
    } catch (error) {
      console.warn('Error setting analysis timeout:', error)
    }
    
    // 2. Cancel any ongoing folder analysis and background processes
    try {
      cancelFolderUpload() // This calls cleanup() and resets folder analysis state
      console.log('Folder analysis cancelled')
    } catch (error) {
      console.warn('Error cancelling folder analysis:', error)
    }
    
    // 3. Stop time monitoring progress updates  
    try {
      timeWarning.abortProcessing()
      console.log('Time monitoring aborted')
    } catch (error) {
      console.warn('Error aborting time monitoring:', error)
    }
    
    // 4. Reset progress state (from Stop Now button behavior)
    try {
      resetProgress()
      console.log('Progress state reset')
    } catch (error) {
      console.warn('Error resetting progress:', error)
    }
    
    // 5. Abort deduplication processing and terminate workers
    try {
      if (queueDeduplication) {
        queueDeduplication.abortProcessing()
        queueDeduplication.terminateWorker()
        queueDeduplication.clearTimeMonitoringCallback()
        console.log('Deduplication processing aborted and workers terminated')
      }
    } catch (error) {
      console.warn('Error aborting deduplication processing:', error)
    }
    
    // 6. Call the base clearQueue function (always attempt this)
    try {
      baseClearQueue()
      console.log('Base queue cleared')
    } catch (error) {
      console.error('Error in base clearQueue:', error)
    }
    
    // 7. Show notification (if requested by source)
    if (source === 'stop-now') {
      try {
        showNotification('Upload stopped', 'info')
      } catch (error) {
        console.warn('Error showing notification:', error)
      }
    } else if (source === 'clear-all') {
      try {
        showNotification('Queue cleared', 'info')
      } catch (error) {
        console.warn('Error showing notification:', error)
      }
    }
    
    console.log(`Comprehensive cleanup completed from: ${source}`)
  } catch (error) {
    console.error(`Error during comprehensive cleanup from ${source}:`, error)
    // Always attempt basic cleanup even if advanced cleanup fails
    try {
      analysisTimedOut.value = true // Force abort as fallback
      timeWarning.abortProcessing() // Stop time monitoring as fallback
      resetProgress() // Reset progress as fallback
      cancelFolderUpload() // Try to cancel folder processes
      baseClearQueue()
    } catch (fallbackError) {
      console.error('Fallback cleanup failed:', fallbackError)
    }
  }
}

// Enhanced clearQueue that uses comprehensive cleanup
const clearQueue = () => {
  performComprehensiveCleanup('clear-all')
}

// Integrate processFiles with updateUploadQueue with safety filtering
const processFilesWithQueue = async (files) => {
  // Check if analysis has been aborted before processing
  if (analysisTimedOut.value) {
    console.log('Skipping file processing - analysis was aborted')
    return
  }
  
  // Additional safety check - if queue is empty, processing was likely cancelled
  if (!files || files.length === 0) {
    console.log('Skipping file processing - no files to process')
    return
  }
  
  // Start time monitoring if not already started and we have files to process
  if (files.length > 0 && !timeWarning.startTime.value) {
    const folderAnalysis = allFilesAnalysis.value || mainFolderAnalysis.value
    let estimatedTime = 0
    
    if (folderAnalysis && folderAnalysis.timeMs && folderAnalysis.timeMs > 0) {
      // Use existing folder analysis estimate (already hardware-calibrated)
      estimatedTime = folderAnalysis.timeMs
      console.log(`Starting time monitoring with folder analysis estimate: ${estimatedTime}ms (hardware-calibrated)`)
    } else {
      // Generate hardware-calibrated estimate on-the-fly for files without folder analysis
      console.log('No folder analysis available, generating hardware-calibrated estimate for file processing')
      
      // Get stored hardware performance factor or use baseline
      let hardwarePerformanceFactor = getStoredHardwarePerformanceFactor()
      if (!hardwarePerformanceFactor || hardwarePerformanceFactor <= 0) {
        // Use baseline H-factor for new users (1.61 files/ms)
        hardwarePerformanceFactor = 1.61
        console.log('Using baseline hardware performance factor for new user: 1.61 files/ms')
      }
      
      // Create file analysis data for calibrated estimation
      const totalSizeMB = files.reduce((sum, file) => sum + (file.size || 0), 0) / (1024 * 1024)
      const sizeMap = new Map()
      files.forEach(file => {
        const size = file.size || 0
        sizeMap.set(size, (sizeMap.get(size) || 0) + 1)
      })
      const duplicateCandidates = files.filter(file => sizeMap.get(file.size || 0) > 1)
      const duplicateCandidatesSizeMB = duplicateCandidates.reduce((sum, file) => sum + (file.size || 0), 0) / (1024 * 1024)
      
      const folderData = {
        totalFiles: files.length,
        duplicateCandidates: duplicateCandidates.length,
        duplicateCandidatesSizeMB: Math.round(duplicateCandidatesSizeMB * 10) / 10,
        avgDirectoryDepth: 2.5, // Default assumption for direct file processing
        totalDirectoryCount: 1
      }
      
      // Generate hardware-calibrated estimate
      const calibratedPrediction = calculateCalibratedProcessingTime(folderData, hardwarePerformanceFactor)
      estimatedTime = calibratedPrediction.totalTimeMs
      
      console.log(`Generated hardware-calibrated estimate: ${estimatedTime}ms for ${files.length} files (${totalSizeMB.toFixed(1)}MB, H=${hardwarePerformanceFactor.toFixed(2)})`)
    }
    
    if (estimatedTime > 0) {
      timeWarning.startMonitoring(estimatedTime)
      console.log(`Time monitoring started: estimated=${estimatedTime}ms, files=${files.length}`)
    } else {
      console.warn('Time monitoring not started: Unable to generate hardware-calibrated estimate')
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
    
    // Final check before actually processing files
    if (analysisTimedOut.value) {
      console.log('Aborting file processing - analysis was cancelled during preparation')
      return
    }
    
    try {
      await processFiles(safeFiles, updateUploadQueue)
      
      // Processing completed successfully - perform cleanup
      console.log('File processing completed successfully - cleaning up time monitoring')
      timeWarning.resetMonitoring()
      queueDeduplication.clearTimeMonitoringCallback()
    } catch (error) {
      console.error('Error during file processing:', error)
      // Cleanup on error as well
      timeWarning.resetMonitoring()
      queueDeduplication.clearTimeMonitoringCallback()
      throw error // Re-throw to maintain error handling
    }
  } else {
    // Final check before actually processing files (no folder filtering path)
    if (analysisTimedOut.value) {
      console.log('Aborting file processing - analysis was cancelled during preparation')
      return
    }
    
    try {
      await processFiles(files, updateUploadQueue)
      
      // Processing completed successfully - perform cleanup
      console.log('File processing completed successfully - cleaning up time monitoring')
      timeWarning.resetMonitoring()
      queueDeduplication.clearTimeMonitoringCallback()
    } catch (error) {
      console.error('Error during file processing:', error)
      // Cleanup on error as well
      timeWarning.resetMonitoring()
      queueDeduplication.clearTimeMonitoringCallback()
      throw error // Re-throw to maintain error handling
    }
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
      // Check if analysis has been aborted
      if (analysisTimedOut.value) {
        console.log('Aborting folder processing - analysis was cancelled')
        return
      }
      
      // Show Upload Queue instantly with first 100 files
      await initializeQueueInstantly(files)
      
      // Check again before processing files for deduplication
      if (analysisTimedOut.value) {
        console.log('Aborting file queue processing - analysis was cancelled')
        return
      }
      
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
  performComprehensiveCleanup('cancel-processing')
}

// Cloud file warning modal handlers
const handleClearAll = () => {
  performComprehensiveCleanup('clear-all')
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
.main-viewport {
  background-color: #f8fafc;
  padding: 50px !important;
  height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
}

:global(body) {
  overflow: hidden;
}
</style>