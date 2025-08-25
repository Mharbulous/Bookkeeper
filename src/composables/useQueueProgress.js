import { logProcessingTime } from '../utils/processingTimer.js'
import { createApplicationError, getRetryDelay, isRecoverableError } from '../utils/errorMessages'

export function useQueueProgress() {

  // Main thread processing with progress tracking
  const processFilesMainThread = async (files, updateUploadQueue, processMainThreadDeduplication, processDuplicateGroups, onProgress = null) => {
    logProcessingTime('DEDUPLICATION_START')
    
    // Process core deduplication logic
    const { uniqueFiles, hashGroups } = await processMainThreadDeduplication(files, onProgress)
    
    // Process duplicate groups to get final results
    const { finalFiles, duplicateFiles } = processDuplicateGroups(hashGroups)
    
    // Step 6: Combine unique and non-duplicate files
    const combineStartTime = Date.now()
    const allFinalFiles = [...uniqueFiles, ...finalFiles]
    
    // Prepare for queue
    const readyFiles = allFinalFiles.map(fileRef => ({
      ...fileRef,
      status: 'ready'
    }))
    
    const duplicatesForQueue = duplicateFiles.map(fileRef => ({
      ...fileRef,
      status: 'duplicate'
    }))
    
    // Update UI using existing API
    logProcessingTime('UI_UPDATE_START')
    await updateUploadQueue(readyFiles, duplicatesForQueue)
    
    // Fallback processing complete - UI update timing will be handled by useFileQueue
    
    // Return in exact same format as current API
    return { readyFiles, duplicatesForQueue }
  }

  // Main processing controller that handles worker vs main thread
  const processFiles = async (files, updateUploadQueue, processFilesWithWorker, processFilesMainThread, onProgress = null) => {
    // Check if files array is valid
    if (!files || !Array.isArray(files) || files.length === 0) {
      const error = createApplicationError('Invalid files array provided', {
        validation: true,
        fileCount: files ? files.length : 0
      })
      throw error
    }
    
    logProcessingTime('DEDUPLICATION_START')
    
    // Try worker processing first
    const workerResult = await processFilesWithWorker(files, onProgress)
    
    if (workerResult.success) {
      // Update UI using existing API
      logProcessingTime('UI_UPDATE_START')
      await updateUploadQueue(workerResult.result.readyFiles, workerResult.result.duplicateFiles)
      
      // Return in exact same format as current API
      return workerResult.result
    }
    
    if (workerResult.fallback) {
      // Fall back to main thread processing
      console.info('Falling back to main thread processing...')
      return await processFilesMainThread(files, updateUploadQueue, onProgress)
    }
    
    // If we get here, something went wrong
    throw workerResult.error || new Error('Unknown processing error')
  }

  // Force main thread processing (for testing or troubleshooting)
  const forceMainThreadProcessing = async (files, updateUploadQueue, processFilesMainThread, onProgress = null) => {
    console.info('Force fallback: Processing files on main thread')
    return processFilesMainThread(files, updateUploadQueue, onProgress)
  }
  
  // Enhanced error handler for UI consumption
  const handleProcessingError = (error, context = {}) => {
    const appError = createApplicationError(error, context)
    
    // Add retry recommendations
    appError.canRetry = isRecoverableError(appError.type, context)
    appError.retryDelay = getRetryDelay(appError.type, context.retryAttempt || 1)
    appError.canUseFallback = context.processingMode !== 'fallback'
    
    return appError
  }

  return {
    // Progress and processing methods
    processFiles,
    processFilesMainThread,
    forceMainThreadProcessing,
    handleProcessingError
  }
}