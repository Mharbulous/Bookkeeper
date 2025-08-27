import { ref, computed, reactive, readonly, onUnmounted, watch } from 'vue';
import { UploadService } from '../services/uploadService.js';
import { useAuthStore } from '../stores/auth.js';

/**
 * Upload Manager Composable
 * Manages file upload state, progress tracking, and coordination with UploadService
 */

// Upload states
const UPLOAD_STATES = {
  IDLE: 'idle',
  PREPARING: 'preparing',
  UPLOADING: 'uploading',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ERROR: 'error',
  CANCELLED: 'cancelled',
};

// File states
const FILE_STATES = {
  QUEUED: 'queued',
  UPLOADING: 'uploading',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  RETRYING: 'retrying',
};

export function useUploadManager() {
  const authStore = useAuthStore();

  // Core reactive state
  const uploadState = ref(UPLOAD_STATES.IDLE);
  const uploadService = ref(null);
  const uploadSession = ref(null);

  // Progress tracking
  const overallProgress = reactive({
    totalFiles: 0,
    completedFiles: 0,
    failedFiles: 0,
    skippedFiles: 0,
    currentFile: null,
    percentage: 0,
    startTime: null,
    endTime: null,
    elapsedTime: 0,
  });

  // Upload speed and metrics
  const uploadMetrics = reactive({
    currentSpeed: 0,
    averageSpeed: 0,
    formattedCurrentSpeed: '0 B/s',
    formattedAverageSpeed: '0 B/s',
    estimatedTimeRemaining: 0,
    formattedTimeRemaining: '0s',
    totalBytesTransferred: 0,
    totalBytesToTransfer: 0,
  });

  // File tracking
  const fileStates = ref(new Map()); // fileId -> { state, progress, error, result }
  const retryQueue = ref([]);
  const uploadResults = reactive({
    successful: [],
    failed: [],
    skipped: [],
  });

  // Error summary
  const errorSummary = reactive({
    networkErrors: [],
    permissionErrors: [],
    storageErrors: [],
    fileSizeErrors: [],
    serverErrors: [],
    unknownErrors: [],
  });

  // Control flags
  const canPause = ref(false);
  const canResume = ref(false);
  const canCancel = ref(false);
  const canRetry = ref(false);

  // Progress update throttling
  let lastProgressUpdate = 0;
  const PROGRESS_UPDATE_THROTTLE = 100; // ms

  /**
   * Initialize upload service for current user
   */
  const initializeService = () => {
    if (!authStore.isAuthenticated || !authStore.currentTeam) {
      throw new Error('User must be authenticated to upload files');
    }

    uploadService.value = new UploadService(authStore.currentTeam, authStore.user.uid);
    uploadSession.value = uploadService.value.session;
  };

  /**
   * Format bytes to human readable string
   */
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  /**
   * Format time duration to human readable string
   */
  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  /**
   * Update upload metrics with current speed and time estimates
   */
  const updateMetrics = (speed, totalBytes, transferredBytes) => {
    uploadMetrics.currentSpeed = speed;
    uploadMetrics.formattedCurrentSpeed = formatBytes(speed) + '/s';

    if (uploadService.value) {
      const avgSpeed = uploadService.value.speedCalculator.getAverageSpeed();
      uploadMetrics.averageSpeed = avgSpeed;
      uploadMetrics.formattedAverageSpeed = formatBytes(avgSpeed) + '/s';

      // Calculate time remaining
      if (speed > 0 && transferredBytes < totalBytes) {
        const remainingBytes = totalBytes - transferredBytes;
        const timeRemaining = remainingBytes / speed;
        uploadMetrics.estimatedTimeRemaining = timeRemaining;
        uploadMetrics.formattedTimeRemaining = formatTime(timeRemaining);
      }
    }

    uploadMetrics.totalBytesTransferred = transferredBytes;
    uploadMetrics.totalBytesToTransfer = totalBytes;
  };

  /**
   * Handle progress updates from upload service
   */
  const handleProgressUpdate = (progressData) => {
    const now = Date.now();

    // Throttle progress updates to prevent UI blocking
    if (now - lastProgressUpdate < PROGRESS_UPDATE_THROTTLE) {
      return;
    }
    lastProgressUpdate = now;

    const { fileId, progress, bytesTransferred, totalBytes, speed } = progressData;

    // Update file state
    const fileState = fileStates.value.get(fileId) || {};
    fileState.state = FILE_STATES.UPLOADING;
    fileState.progress = progress;
    fileState.bytesTransferred = bytesTransferred;
    fileState.totalBytes = totalBytes;
    fileStates.value.set(fileId, fileState);

    // Update current file in overall progress
    overallProgress.currentFile = fileId;

    // Update metrics
    updateMetrics(
      speed,
      uploadMetrics.totalBytesToTransfer,
      uploadMetrics.totalBytesTransferred + bytesTransferred
    );
  };

  /**
   * Handle file completion
   */
  const handleFileComplete = (fileInfo, result) => {
    const fileId = fileInfo.metadata.id;
    const fileState = fileStates.value.get(fileId) || {};

    if (result.skipped) {
      fileState.state = FILE_STATES.SKIPPED;
      fileState.result = result;
      overallProgress.skippedFiles++;
      uploadResults.skipped.push({ fileInfo, result });
    } else {
      fileState.state = FILE_STATES.COMPLETED;
      fileState.result = result;
      fileState.progress = 100;
      overallProgress.completedFiles++;
      uploadResults.successful.push({ fileInfo, result });
    }

    fileStates.value.set(fileId, fileState);

    // Update overall progress
    const totalProcessed =
      overallProgress.completedFiles + overallProgress.failedFiles + overallProgress.skippedFiles;
    overallProgress.percentage = (totalProcessed / overallProgress.totalFiles) * 100;
  };

  /**
   * Handle file error
   */
  const handleFileError = (fileInfo, error) => {
    const fileId = fileInfo.metadata.id;
    const fileState = fileStates.value.get(fileId) || {};

    fileState.state = FILE_STATES.FAILED;
    fileState.error = error;
    fileState.progress = 0;
    fileStates.value.set(fileId, fileState);

    overallProgress.failedFiles++;
    uploadResults.failed.push({ fileInfo, error });

    // Categorize error for summary
    const classified = error.classified || { type: 'unknown' };
    switch (classified.type) {
      case 'network':
        errorSummary.networkErrors.push({ fileInfo, error });
        break;
      case 'permission':
        errorSummary.permissionErrors.push({ fileInfo, error });
        break;
      case 'storage':
        errorSummary.storageErrors.push({ fileInfo, error });
        break;
      case 'file_size':
        errorSummary.fileSizeErrors.push({ fileInfo, error });
        break;
      case 'server':
        errorSummary.serverErrors.push({ fileInfo, error });
        break;
      default:
        errorSummary.unknownErrors.push({ fileInfo, error });
    }

    // Update overall progress
    const totalProcessed =
      overallProgress.completedFiles + overallProgress.failedFiles + overallProgress.skippedFiles;
    overallProgress.percentage = (totalProcessed / overallProgress.totalFiles) * 100;
  };

  /**
   * Prepare files for upload (convert queue items to upload format)
   */
  const prepareFiles = (queueFiles) => {
    if (!Array.isArray(queueFiles) || queueFiles.length === 0) {
      throw new Error('No files provided for upload');
    }

    const preparedFiles = queueFiles.map((queueFile) => {
      // Validate that file has required hash (should be set by deduplication process)
      if (!queueFile.hash) {
        console.error('File missing hash:', queueFile);
        throw new Error(
          `File "${queueFile.name}" is missing hash. Files must be processed through deduplication before upload.`
        );
      }


      return {
        file: queueFile.file,
        hash: queueFile.hash,
        metadata: {
          id: queueFile.id,
          originalName: queueFile.name,
          originalPath: queueFile.path,
          size: queueFile.size,
          type: queueFile.type,
          lastModified: queueFile.lastModified,
          isDuplicate: queueFile.isDuplicate,
        },
      };
    });

    console.log(
      `Prepared ${preparedFiles.length} files for upload:`,
      preparedFiles.map((f) => ({
        name: f.metadata.originalName,
        hash: f.hash?.substring(0, 8) + '...',
      }))
    );

    return preparedFiles;
  };

  /**
   * Start upload process
   */
  const startUpload = async (queueFiles, options = {}) => {
    try {
      // Validate input
      if (!Array.isArray(queueFiles) || queueFiles.length === 0) {
        throw new Error('No files to upload');
      }

      // Initialize service if needed
      if (!uploadService.value) {
        initializeService();
      }

      // Reset state
      uploadState.value = UPLOAD_STATES.PREPARING;
      fileStates.value.clear();
      retryQueue.value = [];
      uploadResults.successful = [];
      uploadResults.failed = [];
      uploadResults.skipped = [];

      // Reset error summary
      Object.keys(errorSummary).forEach((key) => {
        errorSummary[key] = [];
      });

      // Prepare files for upload
      const filesToUpload = prepareFiles(queueFiles);

      if (filesToUpload.length === 0) {
        throw new Error('No uploadable files found (all files may be duplicates)');
      }

      // Initialize progress tracking
      overallProgress.totalFiles = filesToUpload.length;
      overallProgress.completedFiles = 0;
      overallProgress.failedFiles = 0;
      overallProgress.skippedFiles = 0;
      overallProgress.percentage = 0;
      overallProgress.startTime = Date.now();
      overallProgress.endTime = null;

      // Calculate total bytes to transfer
      uploadMetrics.totalBytesToTransfer = filesToUpload.reduce(
        (total, fileInfo) => total + fileInfo.file.size,
        0
      );
      uploadMetrics.totalBytesTransferred = 0;

      // Initialize file states
      filesToUpload.forEach((fileInfo) => {
        fileStates.value.set(fileInfo.metadata.id, {
          state: FILE_STATES.QUEUED,
          progress: 0,
          error: null,
          result: null,
        });
      });

      // Update control flags
      uploadState.value = UPLOAD_STATES.UPLOADING;
      canPause.value = true;
      canResume.value = false;
      canCancel.value = true;
      canRetry.value = false;

      console.log(`Starting upload of ${filesToUpload.length} files...`);

      // Start the upload process
      const uploadOptions = {
        maxConcurrent: options.maxConcurrent || 3,
        progressCallback: handleProgressUpdate,
        onFileComplete: handleFileComplete,
        onFileError: handleFileError,
      };

      const results = await uploadService.value.uploadFiles(filesToUpload, uploadOptions);

      // Update retry queue with failed uploads
      retryQueue.value = results.failed;

      // Check if we need to retry failed uploads
      if (retryQueue.value.length > 0) {
        console.log(`${retryQueue.value.length} files failed, attempting retries...`);
        await retryFailedUploads();
      }

      // Upload completed
      overallProgress.endTime = Date.now();
      overallProgress.elapsedTime = overallProgress.endTime - overallProgress.startTime;
      uploadState.value = UPLOAD_STATES.COMPLETED;

      // Update control flags
      canPause.value = false;
      canResume.value = false;
      canCancel.value = false;
      canRetry.value = retryQueue.value.length > 0;

      console.log(
        `Upload completed: ${overallProgress.completedFiles + overallProgress.skippedFiles} successful, ${overallProgress.failedFiles} failed`
      );

      return {
        successful: uploadResults.successful,
        failed: uploadResults.failed,
        skipped: uploadResults.skipped,
        totalTime: overallProgress.elapsedTime,
      };
    } catch (error) {
      uploadState.value = UPLOAD_STATES.ERROR;
      canPause.value = false;
      canResume.value = false;
      canCancel.value = true;
      canRetry.value = false;

      console.error('Upload failed:', error);
      throw error;
    }
  };

  /**
   * Retry failed uploads using the two-pass strategy
   */
  const retryFailedUploads = async () => {
    if (!uploadService.value || retryQueue.value.length === 0) {
      return { successful: [], failed: [] };
    }

    try {
      console.log(`Retrying ${retryQueue.value.length} failed uploads...`);

      // Mark retry files as retrying
      retryQueue.value.forEach(({ fileInfo }) => {
        const fileState = fileStates.value.get(fileInfo.metadata.id) || {};
        fileState.state = FILE_STATES.RETRYING;
        fileStates.value.set(fileInfo.metadata.id, fileState);
      });

      const retryResults = await uploadService.value.retryFailedUploads(retryQueue.value, {
        progressCallback: handleProgressUpdate,
        onFileComplete: handleFileComplete,
        onFileError: handleFileError,
      });

      // Update results
      uploadResults.successful.push(...retryResults.successful);

      // Update retry queue with still-failed files
      retryQueue.value = retryResults.failed;

      console.log(
        `Retry completed: ${retryResults.successful.length} recovered, ${retryResults.failed.length} still failed`
      );

      return retryResults;
    } catch (error) {
      console.error('Retry failed:', error);
      throw error;
    }
  };

  /**
   * Pause uploads
   */
  const pauseUploads = () => {
    if (uploadService.value && uploadState.value === UPLOAD_STATES.UPLOADING) {
      uploadService.value.pauseUploads();
      uploadState.value = UPLOAD_STATES.PAUSED;
      canPause.value = false;
      canResume.value = true;
    }
  };

  /**
   * Resume uploads
   */
  const resumeUploads = () => {
    if (uploadService.value && uploadState.value === UPLOAD_STATES.PAUSED) {
      uploadService.value.resumeUploads();
      uploadState.value = UPLOAD_STATES.UPLOADING;
      canPause.value = true;
      canResume.value = false;
    }
  };

  /**
   * Cancel uploads
   */
  const cancelUploads = () => {
    if (uploadService.value) {
      uploadService.value.cancelUploads();
      uploadState.value = UPLOAD_STATES.CANCELLED;
      canPause.value = false;
      canResume.value = false;
      canCancel.value = false;
    }
  };

  /**
   * Reset upload state for new upload
   */
  const resetUpload = () => {
    uploadState.value = UPLOAD_STATES.IDLE;
    fileStates.value.clear();
    retryQueue.value = [];

    // Reset progress
    Object.assign(overallProgress, {
      totalFiles: 0,
      completedFiles: 0,
      failedFiles: 0,
      skippedFiles: 0,
      currentFile: null,
      percentage: 0,
      startTime: null,
      endTime: null,
      elapsedTime: 0,
    });

    // Reset metrics
    Object.assign(uploadMetrics, {
      currentSpeed: 0,
      averageSpeed: 0,
      formattedCurrentSpeed: '0 B/s',
      formattedAverageSpeed: '0 B/s',
      estimatedTimeRemaining: 0,
      formattedTimeRemaining: '0s',
      totalBytesTransferred: 0,
      totalBytesToTransfer: 0,
    });

    // Reset results
    uploadResults.successful = [];
    uploadResults.failed = [];
    uploadResults.skipped = [];

    // Reset error summary
    Object.keys(errorSummary).forEach((key) => {
      errorSummary[key] = [];
    });

    // Reset control flags
    canPause.value = false;
    canResume.value = false;
    canCancel.value = false;
    canRetry.value = false;
  };

  /**
   * Get upload statistics
   */
  const getUploadStats = () => {
    return {
      state: uploadState.value,
      progress: { ...overallProgress },
      metrics: { ...uploadMetrics },
      fileCount: {
        total: overallProgress.totalFiles,
        completed: overallProgress.completedFiles,
        failed: overallProgress.failedFiles,
        skipped: overallProgress.skippedFiles,
        inProgress:
          fileStates.value.size -
          overallProgress.completedFiles -
          overallProgress.failedFiles -
          overallProgress.skippedFiles,
      },
      controls: {
        canPause: canPause.value,
        canResume: canResume.value,
        canCancel: canCancel.value,
        canRetry: canRetry.value,
      },
      errors: { ...errorSummary },
    };
  };

  // Computed properties
  const isUploading = computed(() => uploadState.value === UPLOAD_STATES.UPLOADING);
  const isPaused = computed(() => uploadState.value === UPLOAD_STATES.PAUSED);
  const isCompleted = computed(() => uploadState.value === UPLOAD_STATES.COMPLETED);
  const hasErrors = computed(() => uploadResults.failed.length > 0);
  const canShowPauseButton = computed(() => isUploading.value && canPause.value);
  const canShowResumeButton = computed(() => isPaused.value && canResume.value);
  const canShowCancelButton = computed(
    () => (isUploading.value || isPaused.value) && canCancel.value
  );

  // Cleanup on unmount
  onUnmounted(() => {
    if (uploadService.value) {
      uploadService.value.destroy();
    }
  });

  // Watch for elapsed time updates
  let elapsedTimeInterval = null;
  watch([uploadState], () => {
    if (uploadState.value === UPLOAD_STATES.UPLOADING && !elapsedTimeInterval) {
      elapsedTimeInterval = setInterval(() => {
        if (overallProgress.startTime) {
          overallProgress.elapsedTime = Date.now() - overallProgress.startTime;
        }
      }, 1000);
    } else if (uploadState.value !== UPLOAD_STATES.UPLOADING && elapsedTimeInterval) {
      clearInterval(elapsedTimeInterval);
      elapsedTimeInterval = null;
    }
  });

  onUnmounted(() => {
    if (elapsedTimeInterval) {
      clearInterval(elapsedTimeInterval);
    }
  });

  return {
    // State
    uploadState: readonly(uploadState),
    uploadSession: readonly(uploadSession),
    overallProgress: readonly(overallProgress),
    uploadMetrics: readonly(uploadMetrics),
    fileStates: readonly(fileStates),
    retryQueue: readonly(retryQueue),
    uploadResults: readonly(uploadResults),
    errorSummary: readonly(errorSummary),

    // Computed
    isUploading,
    isPaused,
    isCompleted,
    hasErrors,
    canShowPauseButton,
    canShowResumeButton,
    canShowCancelButton,

    // Control flags
    canPause: readonly(canPause),
    canResume: readonly(canResume),
    canCancel: readonly(canCancel),
    canRetry: readonly(canRetry),

    // Methods
    startUpload,
    pauseUploads,
    resumeUploads,
    cancelUploads,
    retryFailedUploads,
    resetUpload,
    getUploadStats,

    // Utilities
    formatBytes,
    formatTime,

    // Constants
    UPLOAD_STATES,
    FILE_STATES,
  };
}
