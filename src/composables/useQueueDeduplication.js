import { useQueueCore } from './useQueueCore'
import { useQueueWorkers } from './useQueueWorkers' 
import { useQueueProgress } from './useQueueProgress'

export function useQueueDeduplication() {
  
  // Initialize component modules
  const queueCore = useQueueCore()
  const queueWorkers = useQueueWorkers()
  const queueProgress = useQueueProgress()
  
  // Create main thread processing function with core logic
  const processFilesMainThread = async (files, updateUploadQueue, onProgress = null) => {
    return queueProgress.processFilesMainThread(
      files, 
      updateUploadQueue,
      queueCore.processMainThreadDeduplication,
      queueCore.processDuplicateGroups,
      onProgress
    )
  }
  
  // Main processFiles function that coordinates worker vs main thread
  const processFiles = async (files, updateUploadQueue, onProgress = null) => {
    return queueProgress.processFiles(
      files,
      updateUploadQueue,
      queueWorkers.processFilesWithWorker,
      processFilesMainThread,
      onProgress
    )
  }

  return {
    // Core methods (from useQueueCore)
    generateFileHash: queueCore.generateFileHash,
    chooseBestFile: queueCore.chooseBestFile,
    getFilePath: queueCore.getFilePath,
    
    // Main processing methods (coordinated)
    processFiles,
    processFilesMainThread,
    forceMainThreadProcessing: (files, updateUploadQueue, onProgress = null) => 
      queueProgress.forceMainThreadProcessing(files, updateUploadQueue, processFilesMainThread, onProgress),
    
    // Status and management (from useQueueWorkers)
    getProcessingStatus: queueWorkers.getProcessingStatus,
    forceWorkerRestart: queueWorkers.forceWorkerRestart,
    terminateWorker: queueWorkers.terminateWorker,
    
    // Error handling (from useQueueProgress)
    handleProcessingError: queueProgress.handleProcessingError,
    
    // Worker access (for backwards compatibility)
    workerInstance: queueWorkers.workerInstance,
    workerManager: queueWorkers.workerManager
  }
}