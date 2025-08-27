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
      :total-directory-entry-count="totalDirectoryEntryCount"
      @update:show="showFolderOptions = $event"
      @update:include-subfolders="includeSubfolders = $event"
      @confirm="confirmFolderOptions"
      @cancel="cancelFolderUpload"
    />

    <!-- Upload Queue/Preview -->
    <FileUploadQueue
      v-if="uploadQueue.length > 0 || isProcessingUIUpdate"
      class="flex-grow-1"
      :files="uploadQueue"
      :is-processing-ui-update="isProcessingUIUpdate"
      :ui-update-progress="uiUpdateProgress"
      :total-analyzed-files="totalAnalyzedFiles"
      :upload-status="uploadStatus"
      :show-time-progress="
        timeWarning.startTime.value !== null && (uploadQueue.length === 0 || isProcessingUIUpdate)
      "
      :time-progress="{
        elapsedTime: timeWarning.elapsedTime.value,
        progressPercentage: timeWarning.progressPercentage.value,
        isOverdue: timeWarning.isOverdue.value,
        overdueSeconds: timeWarning.overdueSeconds.value,
        timeRemaining: timeWarning.timeRemaining.value,
        formattedElapsedTime: timeWarning.formattedElapsedTime.value,
        formattedTimeRemaining: timeWarning.formattedTimeRemaining.value,
        estimatedDuration: timeWarning.estimatedDuration.value,
      }"
      :is-uploading="uploadStatus.isUploading"
      :is-paused="false"
      :is-starting-upload="isStartingUpload"
      @remove-file="removeFromQueue"
      @start-upload="handleStartUpload"
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
        <v-btn color="white" variant="text" @click="showSingleFileNotification = false">
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

    <!-- Simple upload progress is now handled in the FileUploadQueue component directly -->
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue';
import FileUploadQueue from '../components/features/upload/FileUploadQueue.vue';
import UploadDropzone from '../components/features/upload/UploadDropzone.vue';
import FolderOptionsDialog from '../components/features/upload/FolderOptionsDialog.vue';
import ProcessingProgressModal from '../components/features/upload/ProcessingProgressModal.vue';
import CloudFileWarningModal from '../components/features/upload/CloudFileWarningModal.vue';
import { useFileQueue } from '../composables/useFileQueue.js';
import { useFileDragDrop } from '../composables/useFileDragDrop.js';
import { useQueueDeduplication } from '../composables/useQueueDeduplication.js';
import { useFolderOptions } from '../composables/useFolderOptions.js';
import { useTimeBasedWarning } from '../composables/useTimeBasedWarning.js';
import {
  calculateCalibratedProcessingTime,
  getStoredHardwarePerformanceFactor,
} from '../utils/hardwareCalibration.js';
import { storage } from '../services/firebase.js';
import { ref as storageRef, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { useAuthStore } from '../stores/auth.js';
import { useLazyHashTooltip } from '../composables/useLazyHashTooltip.js';

// Component configuration
defineOptions({
  name: 'FileUploadView',
});

// Template refs
const dropzoneRef = ref(null);

// Auth store
const authStore = useAuthStore();

// Hash tooltip system for cache management
const { populateExistingHash } = useLazyHashTooltip();

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
  uploadStatus,
  triggerFileSelect,
  triggerFolderSelect,
  processSingleFile,
  addFilesToQueue,
  initializeQueueInstantly,
  updateUploadQueue,
  removeFromQueue,
  showNotification,
  setPhaseComplete,
  resetUploadStatus,
  updateUploadStatus,
} = useFileQueue();

const {
  isDragOver,
  handleDragOver,
  handleDragLeave,
  handleDrop: baseHandleDrop,
} = useFileDragDrop();

const queueDeduplication = useQueueDeduplication();
const { processFiles } = queueDeduplication;

const {
  showFolderOptions,
  includeSubfolders,
  subfolderCount,
  isAnalyzing,
  mainFolderAnalysis,
  allFilesAnalysis,
  totalDirectoryEntryCount,
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
  cancelFolderUpload,
} = useFolderOptions();

const timeWarning = useTimeBasedWarning();

// Upload state tracking  
const isStartingUpload = ref(false);

// Simple hash calculation function (same as worker)
const calculateFileHash = async (file) => {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Add size suffix for collision safety (SHA-256 + size = virtually impossible collision)
    return `${hash}_${file.size}`;
  } catch (error) {
    throw new Error(`Failed to generate hash for file ${file.name}: ${error.message}`);
  }
};

// Simple upload helper functions
const generateStoragePath = (fileHash, originalFileName) => {
  const extension = originalFileName.split('.').pop();
  return `teams/${authStore.currentTeam}/files/${fileHash}.${extension}`;
};

const checkFileExists = async (fileHash, originalFileName) => {
  try {
    const storagePath = generateStoragePath(fileHash, originalFileName);
    const storageReference = storageRef(storage, storagePath);
    await getDownloadURL(storageReference);
    return true;
  } catch {
    return false;
  }
};

const uploadSingleFile = async (file, fileHash, originalFileName) => {
    const storagePath = generateStoragePath(fileHash, originalFileName);
    const storageReference = storageRef(storage, storagePath);
    
    const uploadTask = uploadBytesResumable(storageReference, file, {
      customMetadata: {
        teamId: authStore.currentTeam,
        userId: authStore.user.uid,
        originalName: originalFileName,
        hash: fileHash,
      },
    });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        () => {
          // Progress updates could be added here if needed
        },
        (error) => {
          reject(error);
        },
        async () => {
          // Upload completed successfully
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ success: true, downloadURL });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
};

// Connect time monitoring to deduplication processing
queueDeduplication.setTimeMonitoringCallback({
  onProcessingStart: () => {
    // Time monitoring will be started when we have an estimate from folder analysis
  },
  onProcessingComplete: () => {
    timeWarning.resetMonitoring();
    queueDeduplication.terminateWorker();
  },
  onProcessingError: (error) => {
    timeWarning.resetMonitoring();
    queueDeduplication.terminateWorker();
    console.log('File processing error - time monitoring reset and workers terminated:', error);
  },
  onProcessingAborted: () => {
    queueDeduplication.terminateWorker();
    console.log('File processing aborted - workers terminated');
  },
});

// Legacy: Complex cleanup function replaced by simple page refresh

// Enhanced clearQueue that uses comprehensive cleanup
const clearQueue = () => {
  // Simple and reliable: just refresh the page
  console.log('🔄 Clear All: Refreshing page to reset all state');
  window.location.reload();
};


// Integrate processFiles with updateUploadQueue with safety filtering
const processFilesWithQueue = async (files) => {
  const processId = Math.random().toString(36).substr(2, 9);

  // Check if analysis has been aborted before processing
  if (analysisTimedOut.value) {
    console.log('Skipping file processing - analysis was aborted');
    return;
  }

  // Additional safety check - if queue is empty, processing was likely cancelled
  if (!files || files.length === 0) {
    console.log('Skipping file processing - no files to process');
    return;
  }

  // Start time monitoring if not already started and we have files to process
  if (files.length > 0 && !timeWarning.startTime.value) {
    const folderAnalysis = allFilesAnalysis.value || mainFolderAnalysis.value;
    let estimatedTime = 0;

    if (folderAnalysis && folderAnalysis.timeMs && folderAnalysis.timeMs > 0) {
      // Use existing folder analysis estimate (already hardware-calibrated)
      estimatedTime = folderAnalysis.timeMs;
    } else {
      // Generate hardware-calibrated estimate on-the-fly for files without folder analysis
      // No folder analysis available, generating hardware-calibrated estimate for file processing

      // Get stored hardware performance factor or use baseline
      let hardwarePerformanceFactor = getStoredHardwarePerformanceFactor();
      if (!hardwarePerformanceFactor || hardwarePerformanceFactor <= 0) {
        // Use baseline H-factor for new users (1.61 files/ms)
        hardwarePerformanceFactor = 1.61;
      }

      // Create file analysis data for calibrated estimation
      const sizeMap = new Map();
      files.forEach((file) => {
        const size = file.size || 0;
        sizeMap.set(size, (sizeMap.get(size) || 0) + 1);
      });
      const duplicateCandidates = files.filter((file) => sizeMap.get(file.size || 0) > 1);
      const duplicateCandidatesSizeMB =
        duplicateCandidates.reduce((sum, file) => sum + (file.size || 0), 0) / (1024 * 1024);

      const folderData = {
        totalFiles: files.length,
        duplicateCandidates: duplicateCandidates.length,
        duplicateCandidatesSizeMB: Math.round(duplicateCandidatesSizeMB * 10) / 10,
        avgDirectoryDepth: 2.5, // Default assumption for direct file processing
        totalDirectoryCount: 1,
      };

      // Generate hardware-calibrated estimate
      const calibratedPrediction = calculateCalibratedProcessingTime(
        folderData,
        hardwarePerformanceFactor,
      );
      estimatedTime = calibratedPrediction.totalTimeMs;

    }

    if (estimatedTime > 0) {
      timeWarning.startMonitoring(estimatedTime);
    } else {
      console.warn('Time monitoring not started: Unable to generate hardware-calibrated estimate');
    }
  }

  // Check if processing was aborted after time monitoring setup
  if (analysisTimedOut.value) {
    console.log('Aborting file processing - analysis was cancelled after time monitoring setup');
    return;
  }

  // Double-check safety filter: exclude any files from skipped folders
  if (skippedFolders.value && skippedFolders.value.length > 0) {
    const originalCount = files.length;
    const safeFiles = files.filter((file) => {
      const filePath = file.path || file.webkitRelativePath || file.name;
      const isInSkippedFolder = skippedFolders.value.some((skippedPath) => {
        const normalizedFilePath = filePath.replace(/\\/g, '/').toLowerCase();
        const normalizedSkippedPath = skippedPath.replace(/\\/g, '/').toLowerCase();
        return normalizedFilePath.startsWith(normalizedSkippedPath);
      });

      if (isInSkippedFolder) {
        console.log(`Upload safety filter: excluding ${filePath} from skipped folder`);
        return false;
      }
      return true;
    });

    if (safeFiles.length !== originalCount) {
      console.log(
        `Upload safety filter: excluded ${originalCount - safeFiles.length} files from ${skippedFolders.value.length} skipped folders`,
      );
    }

    // Final check before actually processing files
    if (analysisTimedOut.value) {
      console.log(`❌ [${processId}] EXIT EARLY: aborted during file preparation`);
      return;
    }

    try {
      // Final abort check immediately before processFiles call
      if (analysisTimedOut.value) {
        console.log(`❌ [${processId}] EXIT EARLY: aborted right before processFiles call`);
        return;
      }

      await processFiles(safeFiles, updateUploadQueue);

      // Check if processing was aborted after processFiles completed
      if (analysisTimedOut.value) {
        console.log(
          `❌ [${processId}] EXIT ABORT: processing aborted after completion - skipping cleanup`,
        );
        return;
      }

      // Processing completed successfully - perform cleanup
      timeWarning.resetMonitoring();
      queueDeduplication.clearTimeMonitoringCallback();
    } catch (error) {
      console.error('Error during file processing:', error);

      // Check if error was due to abort
      if (analysisTimedOut.value) {
        console.log(`❌ [${processId}] EXIT ERROR ABORT: processing aborted during error handling`);
        return;
      }

      // Cleanup on error as well
      timeWarning.resetMonitoring();
      queueDeduplication.clearTimeMonitoringCallback();
      throw error; // Re-throw to maintain error handling
    }
  } else {
    // Final check before actually processing files (no folder filtering path)
    if (analysisTimedOut.value) {
      console.log('Aborting file processing - analysis was cancelled during preparation');
      return;
    }

    try {
      // Final abort check immediately before processFiles call
      if (analysisTimedOut.value) {
        console.log(`❌ [${processId}] EXIT EARLY: aborted right before processFiles call`);
        return;
      }

      await processFiles(files, updateUploadQueue);

      // Check if processing was aborted after processFiles completed
      if (analysisTimedOut.value) {
        console.log(
          `❌ [${processId}] EXIT ABORT: processing aborted after completion - skipping cleanup`,
        );
        return;
      }

      // Processing completed successfully - perform cleanup
      timeWarning.resetMonitoring();
      queueDeduplication.clearTimeMonitoringCallback();
    } catch (error) {
      console.error('Error during file processing:', error);

      // Check if error was due to abort
      if (analysisTimedOut.value) {
        console.log(`❌ [${processId}] EXIT ERROR ABORT: processing aborted during error handling`);
        return;
      }

      // Cleanup on error as well
      timeWarning.resetMonitoring();
      queueDeduplication.clearTimeMonitoringCallback();
      throw error; // Re-throw to maintain error handling
    }
  }

  // 🔍 DEBUG: Log AsyncTracker state at successful exit
  if (window.__asyncTracker) {
    const exitStats = window.__asyncTracker.stats();
    console.log(`📊 [${processId}] AsyncTracker at EXIT:`, exitStats);
  }
};

// Event handlers with composable integration
const handleFileSelect = async (event) => {
  updateRefs();
  const files = Array.from(event.target.files);
  if (files.length === 1) {
    await processSingleFile(files[0], processFilesWithQueue);
    showNotification('File ready for upload', 'success');
  } else {
    await addFilesToQueue(files, processFilesWithQueue);
  }
  // Reset input
  event.target.value = '';
};

const handleFolderSelect = (event) => {
  updateRefs();
  const files = Array.from(event.target.files);

  // File Explorer count will be compared automatically in processing
  // Pass callback to handle no-subfolder case automatically
  processFolderFiles(files, async (files) => {
    // Show Upload Queue instantly with first 100 files
    await initializeQueueInstantly(files);
    // Then process all files for deduplication
    addFilesToQueue(files, processFilesWithQueue);
  });
  // Reset input
  event.target.value = '';
};

const handleDrop = async (event) => {
  await baseHandleDrop(event, {
    processSingleFile: async (file) => {
      await processSingleFile(file, processFilesWithQueue);
      showNotification('File ready for upload', 'success');
    },
    addFilesToQueue: (files) => addFilesToQueue(files, processFilesWithQueue),
    processFolderEntry: (folder) =>
      processFolderEntry(folder, async (files) => {
        // Check if analysis has been aborted
        if (analysisTimedOut.value) {
          console.log('Aborting folder processing - analysis was cancelled');
          return;
        }

        // Show Upload Queue instantly with first 100 files
        await initializeQueueInstantly(files);

        // Check again before processing files for deduplication
        if (analysisTimedOut.value) {
          console.log('Aborting file queue processing - analysis was cancelled');
          return;
        }

        // Then process all files for deduplication
        addFilesToQueue(files, processFilesWithQueue);
      }),
  });
};

const confirmFolderOptions = () => {
  baseConfirmFolderOptions(async (files) => {
    // Show Upload Queue instantly with first 100 files
    await initializeQueueInstantly(files);
    // Then process all files for deduplication (time monitoring will start automatically)
    addFilesToQueue(files, processFilesWithQueue);
  });
};

// Update refs to use composable integration
const updateRefs = () => {
  if (dropzoneRef.value) {
    fileInput.value = dropzoneRef.value.fileInput;
    folderInput.value = dropzoneRef.value.folderInput;
  }
};

// Ensure refs are updated after component mount
const triggerFileSelectWrapper = () => {
  updateRefs();
  triggerFileSelect();
};

const triggerFolderSelectWrapper = () => {
  updateRefs();
  triggerFolderSelect();
};

// Handle cancel processing for progress modal
const handleCancelProcessing = () => {
  clearQueue();
};

// Cloud file warning modal handlers
const handleClearAll = () => {
  clearQueue();
};

const handleContinueWaiting = () => {
  // User chose to continue waiting
  timeWarning.snoozeWarning();
};

const handleCloseWarning = () => {
  // User closed warning without choosing action
  timeWarning.dismissWarning();
};

// Simple upload control handler
const handleStartUpload = async () => {
  try {
    isStartingUpload.value = true;
    setPhaseComplete();
    
    // Reset upload status counters
    resetUploadStatus();
    updateUploadStatus('start');

    console.log('Starting simple upload process...');

    // Get files that are ready for upload (not duplicates)
    const filesToUpload = uploadQueue.value.filter(file => !file.isDuplicate);
    
    if (filesToUpload.length === 0) {
      showNotification('No files to upload (all are duplicates)', 'info');
      updateUploadStatus('complete');
      return;
    }

    console.log(`Processing ${filesToUpload.length} files for upload...`);

    // Process each file one by one
    for (const queueFile of filesToUpload) {
      try {
        // Calculate hash for the file (on-demand during upload)
        updateUploadStatus('currentFile', queueFile.name, 'calculating_hash');
        console.log(`Calculating hash for: ${queueFile.name}`);
        let fileHash;
        
        // Check if file already has a hash (from deduplication process)
        if (queueFile.hash) {
          fileHash = queueFile.hash;
          console.log(`Using existing hash for: ${queueFile.name}`);
        } else {
          // Calculate hash now (for files with unique sizes or not previously processed)
          fileHash = await calculateFileHash(queueFile.file);
          // Store calculated hash in the queue file for reuse by tooltip system
          queueFile.hash = fileHash;
          // Also populate the tooltip cache immediately for instant tooltips
          populateExistingHash(queueFile.id || queueFile.name, fileHash);
          console.log(`Calculated new hash for: ${queueFile.name}`);
        }

        // Check if file already exists in Firebase Storage
        updateUploadStatus('currentFile', queueFile.name, 'checking_existing');
        const fileExists = await checkFileExists(fileHash, queueFile.name);
        
        if (fileExists) {
          // File already uploaded previously
          console.log(`File already exists: ${queueFile.name}`);
          updateUploadStatus('previouslyUploaded');
        } else {
          // File needs to be uploaded
          updateUploadStatus('currentFile', queueFile.name, 'uploading');
          console.log(`Uploading file: ${queueFile.name}`);
          await uploadSingleFile(queueFile.file, fileHash, queueFile.name);
          updateUploadStatus('successful');
          console.log(`Successfully uploaded: ${queueFile.name}`);
        }
      } catch (error) {
        console.error(`Failed to upload ${queueFile.name}:`, error);
        updateUploadStatus('failed');
      }
    }

    updateUploadStatus('complete');
    console.log('Upload process completed:', {
      successful: uploadStatus.value.successful,
      failed: uploadStatus.value.failed,
      previouslyUploaded: uploadStatus.value.previouslyUploaded
    });

    // Show completion notification
    const totalProcessed = uploadStatus.value.successful + uploadStatus.value.previouslyUploaded;
    if (uploadStatus.value.failed === 0) {
      showNotification(`All ${totalProcessed} files processed successfully!`, 'success');
    } else {
      showNotification(`${totalProcessed} files processed, ${uploadStatus.value.failed} failed`, 'warning');
    }

  } catch (error) {
    console.error('Upload process failed:', error);
    showNotification('Upload failed: ' + (error.message || 'Unknown error'), 'error');
    updateUploadStatus('complete');
  } finally {
    isStartingUpload.value = false;
  }
};

// Legacy upload handlers removed - using simple upload system now

// Computed property for total analyzed files count
// Use directory entry count (File Explorer count) instead of processed files count
const totalAnalyzedFiles = computed(() => {
  // Return the directory entry count if available (shows what File Explorer sees)
  return totalDirectoryEntryCount.value > 0 ? totalDirectoryEntryCount.value : null;
});
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
