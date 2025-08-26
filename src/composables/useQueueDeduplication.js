import { useQueueCore } from './useQueueCore';
import { useQueueWorkers } from './useQueueWorkers';
import { useQueueProgress } from './useQueueProgress';

export function useQueueDeduplication() {
  // Initialize component modules
  const queueCore = useQueueCore();
  const queueWorkers = useQueueWorkers();
  const queueProgress = useQueueProgress();

  // Time monitoring integration
  let timeMonitoringCallback = null;

  // Create main thread processing function with core logic
  const processFilesMainThread = async (
    files,
    updateUploadQueue,
    onProgress = null,
    skippedFolders = [],
  ) => {
    return queueProgress.processFilesMainThread(
      files,
      updateUploadQueue,
      queueCore.processMainThreadDeduplication,
      queueCore.processDuplicateGroups,
      onProgress,
      skippedFolders,
    );
  };

  // Main processFiles function that coordinates worker vs main thread
  const processFiles = async (files, updateUploadQueue, onProgress = null) => {
    // Start time monitoring if callback is set
    if (timeMonitoringCallback) {
      timeMonitoringCallback.onProcessingStart?.();
    }

    try {
      const result = await queueProgress.processFiles(
        files,
        updateUploadQueue,
        queueWorkers.processFilesWithWorker,
        processFilesMainThread,
        onProgress,
      );

      // Stop time monitoring on successful completion
      if (timeMonitoringCallback) {
        if (import.meta.env.DEV) {
          console.debug('[QueueDeduplication] Calling onProcessingComplete callback');
        }

        timeMonitoringCallback.onProcessingComplete?.();

        if (import.meta.env.DEV) {
          console.debug('[QueueDeduplication] onProcessingComplete callback completed');
        }
      } else {
        if (import.meta.env.DEV) {
          console.warn(
            '[QueueDeduplication] No timeMonitoringCallback available for onProcessingComplete',
          );
        }
      }

      return result;
    } catch (error) {
      // Stop time monitoring on error
      if (timeMonitoringCallback) {
        timeMonitoringCallback.onProcessingError?.(error);
      }
      throw error;
    }
  };

  // Time monitoring methods
  const setTimeMonitoringCallback = (callback) => {
    timeMonitoringCallback = callback;
  };

  const clearTimeMonitoringCallback = () => {
    timeMonitoringCallback = null;
  };

  const abortProcessing = () => {
    // Terminate any running workers
    queueWorkers.terminateWorker();

    // Clear monitoring callback
    if (timeMonitoringCallback) {
      timeMonitoringCallback.onProcessingAborted?.();
      timeMonitoringCallback = null;
    }
  };

  return {
    // Core methods (from useQueueCore)
    generateFileHash: queueCore.generateFileHash,
    chooseBestFile: queueCore.chooseBestFile,
    getFilePath: queueCore.getFilePath,

    // Main processing methods (coordinated)
    processFiles,
    processFilesMainThread,
    forceMainThreadProcessing: (files, updateUploadQueue, onProgress = null, skippedFolders = []) =>
      queueProgress.forceMainThreadProcessing(
        files,
        updateUploadQueue,
        (files, updateUploadQueue, onProgress) =>
          processFilesMainThread(files, updateUploadQueue, onProgress, skippedFolders),
        onProgress,
      ),

    // Status and management (from useQueueWorkers)
    getProcessingStatus: queueWorkers.getProcessingStatus,
    forceWorkerRestart: queueWorkers.forceWorkerRestart,
    terminateWorker: queueWorkers.terminateWorker,

    // Error handling (from useQueueProgress)
    handleProcessingError: queueProgress.handleProcessingError,

    // Worker access (for backwards compatibility)
    workerInstance: queueWorkers.workerInstance,
    workerManager: queueWorkers.workerManager,

    // Time monitoring integration
    setTimeMonitoringCallback,
    clearTimeMonitoringCallback,
    abortProcessing,
  };
}
