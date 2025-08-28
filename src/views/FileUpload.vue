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
      :is-paused="uploadStatus.isPaused"
      :is-starting-upload="isStartingUpload"
      @remove-file="removeFromQueue"
      @start-upload="handleStartUpload"
      @pause-upload="handlePauseUpload"
      @resume-upload="handleResumeUpload"
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
import FileUploadQueue from '../features/file-upload/components/FileUploadQueue.vue';
import UploadDropzone from '../features/file-upload/components/UploadDropzone.vue';
import FolderOptionsDialog from '../features/file-upload/components/FolderOptionsDialog.vue';
import ProcessingProgressModal from '../features/file-upload/components/ProcessingProgressModal.vue';
import CloudFileWarningModal from '../features/file-upload/components/CloudFileWarningModal.vue';
import { useFileQueue } from '../features/file-upload/composables/useFileQueue.js';
import { useFileDragDrop } from '../features/file-upload/composables/useFileDragDrop.js';
import { useQueueDeduplication } from '../features/file-upload/composables/useQueueDeduplication.js';
import { useFolderOptions } from '../composables/useFolderOptions.js';
import { useTimeBasedWarning } from '../composables/useTimeBasedWarning.js';
import {
  calculateCalibratedProcessingTime,
  getStoredHardwarePerformanceFactor,
} from '../utils/hardwareCalibration.js';
import { storage } from '../services/firebase.js';
import { ref as storageRef, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { useAuthStore } from '../stores/auth.js';
import { useLazyHashTooltip } from '../features/file-upload/composables/useLazyHashTooltip.js';
import { useUploadLogger } from '../composables/useUploadLogger.js';
import { useFileMetadata } from '../features/file-upload/composables/useFileMetadata.js';

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

// Upload logging system
const { logUploadEvent } = useUploadLogger();

// File metadata system
const { createMetadataRecord, generateMetadataHash } = useFileMetadata();

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
  updateFileStatus,
  updateAllFilesToReady,
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
const isPaused = ref(false);
const pauseRequested = ref(false);
const currentUploadIndex = ref(0);
let uploadAbortController = null;

// Session ID management
const currentSessionId = ref(null);
const getCurrentSessionId = () => {
  if (!currentSessionId.value) {
    currentSessionId.value = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return currentSessionId.value;
};

// Simple hash calculation function (same as worker)
const calculateFileHash = async (file) => {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Return standard SHA-256 hash of file content
    return hash;
  } catch (error) {
    throw new Error(`Failed to generate hash for file ${file.name}: ${error.message}`);
  }
};

// Simple upload helper functions
const generateStoragePath = (fileHash, originalFileName) => {
  const extension = originalFileName.split('.').pop();
  return `teams/${authStore.currentTeam}/matters/general/uploads/${fileHash}.${extension}`;
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

const uploadSingleFile = async (file, fileHash, originalFileName, abortSignal = null) => {
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
    // Handle abort signal
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        uploadTask.cancel();
        reject(new Error('AbortError'));
      });
    }

    uploadTask.on(
      'state_changed',
      () => {
        // Check if aborted during progress
        if (abortSignal && abortSignal.aborted) {
          uploadTask.cancel();
          reject(new Error('AbortError'));
          return;
        }
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
        hardwarePerformanceFactor
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
        `Upload safety filter: excluded ${originalCount - safeFiles.length} files from ${skippedFolders.value.length} skipped folders`
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
          `❌ [${processId}] EXIT ABORT: processing aborted after completion - skipping cleanup`
        );
        return;
      }

      // Processing completed successfully - perform cleanup
      updateAllFilesToReady(); // Update all ready files to show blue dots
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
          `❌ [${processId}] EXIT ABORT: processing aborted after completion - skipping cleanup`
        );
        return;
      }

      // Processing completed successfully - perform cleanup
      updateAllFilesToReady(); // Update all ready files to show blue dots
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

// Pause/Resume upload handlers
const handlePauseUpload = () => {
  console.log('Pause upload requested');
  pauseRequested.value = true;
  updateUploadStatus('requestPause');
};

const handleResumeUpload = () => {
  console.log('Resume upload requested');
  isPaused.value = false;
  updateUploadStatus('resume');

  // Continue upload from where we left off
  continueUpload();
};

// Resumable upload loop function
const continueUpload = async () => {
  try {
    console.log('Continuing upload process...');

    // Get all files from upload queue (including duplicates for processing)
    const filesToProcess = uploadQueue.value;

    if (filesToProcess.length === 0) {
      showNotification('No files to process', 'info');
      updateUploadStatus('complete');
      return;
    }

    // Start from current index or beginning
    const startIndex = uploadStatus.value.currentUploadIndex || 0;
    console.log(`Continuing from file ${startIndex + 1} of ${filesToProcess.length}`);

    // Process files from current index
    for (let i = startIndex; i < filesToProcess.length; i++) {
      // Check if pause was requested before processing next file
      if (pauseRequested.value) {
        console.log(`Pause requested at file ${i + 1}. Pausing...`);
        updateUploadStatus('setUploadIndex', i); // Save current position
        updateUploadStatus('pause');
        isPaused.value = true;
        pauseRequested.value = false;
        return;
      }

      const queueFile = filesToProcess[i];
      updateUploadStatus('setUploadIndex', i); // Update current position

      // Handle duplicate files - skip upload but log and save metadata
      if (queueFile.isDuplicate) {
        console.log(`Processing duplicate file: ${queueFile.name}`);
        updateUploadStatus('currentFile', queueFile.name, 'processing_duplicate');
        updateFileStatus(queueFile, 'skipped');

        try {
          // Log skipped event for duplicate file
          const metadataHash = await generateMetadataHash(
            queueFile.name,
            queueFile.lastModified,
            queueFile.hash
          );
          await logUploadEvent({
            eventType: 'upload_skipped_metadata_recorded',
            fileName: queueFile.name,
            fileHash: queueFile.hash,
            metadataHash: metadataHash,
          });

          // Create metadata record for duplicate (hash deduplication)
          await createMetadataRecord({
            originalName: queueFile.name,
            lastModified: queueFile.lastModified,
            fileHash: queueFile.hash,
            sessionId: getCurrentSessionId(),
            originalPath: queueFile.path, // webkitRelativePath for folder uploads
          });

          updateUploadStatus('skipped');
          console.log(`Duplicate file processed: ${queueFile.name}`);
        } catch (error) {
          console.error(`Failed to process duplicate file ${queueFile.name}:`, error);
          updateFileStatus(queueFile, 'failed');
          updateUploadStatus('failed');
        }

        continue; // Skip to next file
      }

      try {
        // Create abort controller for this upload
        uploadAbortController = new AbortController();

        // Calculate hash for the file (on-demand during upload)
        updateUploadStatus('currentFile', queueFile.name, 'calculating_hash');
        updateFileStatus(queueFile, 'uploading');
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

        // Check if upload was aborted during hash calculation
        if (uploadAbortController.signal.aborted) {
          console.log(`Upload aborted during hash calculation for: ${queueFile.name}`);
          break;
        }

        // Check if file already exists in Firebase Storage
        updateUploadStatus('currentFile', queueFile.name, 'checking_existing');
        const fileExists = await checkFileExists(fileHash, queueFile.name);

        if (fileExists) {
          // File already exists, skipping
          console.log(`File skipped (already exists): ${queueFile.name}`);
          updateUploadStatus('skipped');
          updateFileStatus(queueFile, 'skipped');

          // Log individual upload event for skipped file
          try {
            const metadataHash = await generateMetadataHash(
              queueFile.name,
              queueFile.lastModified,
              fileHash
            );
            await logUploadEvent({
              eventType: 'upload_skipped_metadata_recorded',
              fileName: queueFile.name,
              fileHash: fileHash,
              metadataHash: metadataHash,
            });
          } catch (logError) {
            console.error(
              `Failed to log upload event for existing file ${queueFile.name}:`,
              logError
            );
            // Don't fail the upload process for logging errors
          }

          // Create metadata record even for existing files (metadata may be different)
          try {
            await createMetadataRecord({
              originalName: queueFile.name,
              lastModified: queueFile.lastModified,
              fileHash: fileHash,
              sessionId: getCurrentSessionId(),
              originalPath: queueFile.path, // webkitRelativePath for folder uploads
            });
          } catch (metadataError) {
            console.error(
              `Failed to create metadata record for existing file ${queueFile.name}:`,
              metadataError
            );
            // Don't fail the upload process for metadata errors
          }
        } else {
          // Check if upload was aborted before uploading
          if (uploadAbortController.signal.aborted) {
            console.log(`Upload aborted before uploading: ${queueFile.name}`);
            break;
          }

          // File needs to be uploaded
          updateUploadStatus('currentFile', queueFile.name, 'uploading');
          console.log(`Uploading file: ${queueFile.name}`);

          // Log upload start event
          try {
            const metadataHash = await generateMetadataHash(
              queueFile.name,
              queueFile.lastModified,
              fileHash
            );
            await logUploadEvent({
              eventType: 'upload_interrupted',
              fileName: queueFile.name,
              fileHash: fileHash,
              metadataHash: metadataHash,
            });
          } catch (logError) {
            console.error(
              `Failed to log interrupted upload event for ${queueFile.name}:`,
              logError
            );
            // Don't fail the upload process for logging errors
          }

          const uploadStartTime = Date.now();
          await uploadSingleFile(
            queueFile.file,
            fileHash,
            queueFile.name,
            uploadAbortController.signal
          );
          const uploadDurationMs = Date.now() - uploadStartTime;
          console.log(`Upload duration for ${queueFile.name}: ${uploadDurationMs}ms`);
          updateUploadStatus('successful');
          updateFileStatus(queueFile, 'completed');
          console.log(`Successfully uploaded: ${queueFile.name}`);

          // Log successful upload completion
          try {
            const metadataHash = await generateMetadataHash(
              queueFile.name,
              queueFile.lastModified,
              fileHash
            );
            await logUploadEvent({
              eventType: 'upload_success',
              fileName: queueFile.name,
              fileHash: fileHash,
              metadataHash: metadataHash,
            });
          } catch (logError) {
            console.error(`Failed to log upload completion event for ${queueFile.name}:`, logError);
            // Don't fail the upload process for logging errors
          }

          // Create metadata record for successfully uploaded file
          try {
            await createMetadataRecord({
              originalName: queueFile.name,
              lastModified: queueFile.lastModified,
              fileHash: fileHash,
              sessionId: getCurrentSessionId(),
              originalPath: queueFile.path, // webkitRelativePath for folder uploads
            });
          } catch (metadataError) {
            console.error(`Failed to create metadata record for ${queueFile.name}:`, metadataError);
            // Don't fail the upload process for metadata errors
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log(`Upload aborted for: ${queueFile.name}`);
          break;
        }
        console.error(`Failed to upload ${queueFile.name}:`, error);
        updateUploadStatus('failed');
        updateFileStatus(queueFile, 'error');

        // Log upload failure
        try {
          let currentFileHash = queueFile.hash || 'unknown_hash';
          if (currentFileHash === 'unknown_hash') {
            try {
              currentFileHash = await calculateFileHash(queueFile.file);
            } catch (hashError) {
              console.warn(
                `Could not calculate hash for failed upload: ${queueFile.name}`,
                hashError
              );
              currentFileHash = 'unknown_hash';
            }
          }
          const metadataHash = await generateMetadataHash(
            queueFile.name,
            queueFile.lastModified,
            currentFileHash
          );
          await logUploadEvent({
            eventType: 'upload_failed',
            fileName: queueFile.name,
            fileHash: currentFileHash,
            metadataHash: metadataHash,
          });
        } catch (logError) {
          console.error(`Failed to log upload failure event for ${queueFile.name}:`, logError);
          // Don't fail the upload process for logging errors
        }
      } finally {
        uploadAbortController = null;
      }
    }

    // Check if we completed all files or were paused
    if (!isPaused.value) {
      updateUploadStatus('complete');
      console.log('Upload process completed:', {
        successful: uploadStatus.value.successful,
        failed: uploadStatus.value.failed,
        skipped: uploadStatus.value.skipped,
      });

      // Show completion notification
      const totalProcessed = uploadStatus.value.successful + uploadStatus.value.skipped;
      if (uploadStatus.value.failed === 0) {
        showNotification(`All ${totalProcessed} files processed successfully!`, 'success');
      } else {
        showNotification(
          `${totalProcessed} files processed, ${uploadStatus.value.failed} failed`,
          'warning'
        );
      }

      currentUploadIndex.value = 0;
      isStartingUpload.value = false;
    }
  } catch (error) {
    console.error('Upload process failed:', error);
    showNotification('Upload failed: ' + (error.message || 'Unknown error'), 'error');
    updateUploadStatus('complete');
    isPaused.value = false;
    currentUploadIndex.value = 0;
    isStartingUpload.value = false;
  }
};

// Simple upload control handler
const handleStartUpload = async () => {
  try {
    isStartingUpload.value = true;
    setPhaseComplete();

    // Reset upload status counters only if not resuming
    if (!isPaused.value) {
      resetUploadStatus();
      currentUploadIndex.value = 0;
      // Generate new session ID for this upload batch
      currentSessionId.value = null;
      getCurrentSessionId(); // This will generate a new ID
    }

    updateUploadStatus('start');
    console.log('Starting upload process...');

    // Start the upload loop
    await continueUpload();
  } catch (error) {
    console.error('Upload process failed:', error);
    showNotification('Upload failed: ' + (error.message || 'Unknown error'), 'error');
    updateUploadStatus('complete');
    isPaused.value = false;
    currentUploadIndex.value = 0;
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
