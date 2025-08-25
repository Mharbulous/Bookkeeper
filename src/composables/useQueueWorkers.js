import { useWebWorker } from './useWebWorker'
import { useWorkerManager } from './useWorkerManager'
import { createApplicationError, isRecoverableError } from '../utils/errorMessages'

export function useQueueWorkers() {
  
  // Initialize Worker Manager
  const workerManager = useWorkerManager()
  
  // Create dedicated deduplication worker
  const WORKER_ID = 'file-deduplication-worker'
  const workerState = workerManager.createWorker(
    WORKER_ID, 
    '../workers/fileHashWorker.js',
    {
      autoRestart: true,
      maxRestartAttempts: 3,
      enableMonitoring: true
    }
  )
  
  // Get worker instance for direct usage (fallback to direct worker if manager fails)
  const workerInstance = workerState?.instance || useWebWorker('../workers/fileHashWorker.js')

  // Initialize worker if needed
  const initializeWorkerIfNeeded = async () => {
    let workerJustInitialized = false
    
    if (!workerInstance.isWorkerReady.value) {
      console.info('Initializing Web Worker...')
      const initialized = workerInstance.initializeWorker()
      if (!initialized) {
        console.warn('Web Worker initialization failed, falling back to main thread processing')
        return { success: false, fallback: true }
      }
      workerJustInitialized = true
    }
    
    return { success: true, justInitialized: workerJustInitialized }
  }

  // Check and restart unhealthy worker
  const checkWorkerHealth = async (workerJustInitialized = false) => {
    // Check worker health before proceeding (skip for newly initialized workers)
    if (!workerJustInitialized && !workerInstance.isWorkerHealthy.value) {
      console.warn('Web Worker is unhealthy, attempting restart...')
      
      // Use worker manager for restart if available
      let restarted = false
      if (workerState) {
        restarted = await workerManager.restartWorker(WORKER_ID)
      } else {
        restarted = workerInstance.restartWorker()
      }
      
      if (!restarted) {
        console.warn('Web Worker restart failed, falling back to main thread processing')
        return { healthy: false, fallback: true }
      }
    }
    
    return { healthy: true, fallback: false }
  }

  // Process files using web worker
  const processFilesWithWorker = async (files, onProgress = null) => {
    // Check if Web Workers are supported
    if (!workerInstance.isWorkerSupported) {
      console.warn('Web Workers not supported in this browser, falling back to main thread processing')
      return { success: false, fallback: true }
    }
    
    // Check worker manager state if available
    if (workerState) {
      const stats = workerManager.getWorkerStatistics()
      console.debug('Worker statistics:', stats)
    }
    
    // Initialize worker if needed
    const initResult = await initializeWorkerIfNeeded()
    if (!initResult.success) {
      return { success: false, fallback: true }
    }
    
    // Check worker health
    const healthResult = await checkWorkerHealth(initResult.justInitialized)
    if (!healthResult.healthy) {
      return { success: false, fallback: true }
    }

    try {
      // Create mapping structure that preserves original File objects
      const fileMapping = new Map()
      const filesToProcess = files.map((file, index) => {
        // Validate individual file
        if (!(file instanceof File)) {
          const error = createApplicationError(`Invalid file at index ${index}: expected File object`, {
            validation: true,
            fileIndex: index,
            fileType: typeof file
          })
          throw error
        }
        
        const fileId = `file_${index}_${Date.now()}`
        
        // Store original File object in mapping
        fileMapping.set(fileId, file)
        
        // Send file data to worker (File objects are cloned via structured clone)
        // Include path separately since File.path custom property doesn't survive structured cloning
        return {
          id: fileId,
          file: file,  // File objects cloned to worker, converted to ArrayBuffer internally
          originalIndex: index,
          customPath: file.path // Pass path separately to survive worker transfer
        }
      })

      // Set up progress listener if provided
      let progressUnsubscribe = null
      if (onProgress) {
        progressUnsubscribe = workerInstance.addMessageListener('PROGRESS_UPDATE', (data) => {
          onProgress(data.progress)
        })
      }

      try {
        // Send to worker with timeout based on file count and size
        const totalSize = files.reduce((sum, file) => sum + file.size, 0)
        const estimatedTime = Math.max(30000, Math.min(300000, totalSize / 1000)) // 30s min, 5min max
        
        const workerResult = await workerInstance.sendMessage({
          type: 'PROCESS_FILES',
          files: filesToProcess
        }, {
          timeout: estimatedTime
        })

        // Map worker results back to original File objects
        const readyFiles = workerResult.readyFiles.map(fileRef => ({
          ...fileRef,
          file: fileMapping.get(fileRef.id),  // Restore original File object
          path: fileRef.path,  // Preserve path from worker result
          status: 'ready'
        }))

        const duplicateFiles = workerResult.duplicateFiles.map(fileRef => ({
          ...fileRef,
          file: fileMapping.get(fileRef.id),  // Restore original File object
          path: fileRef.path,  // Preserve path from worker result
          status: 'duplicate'
        }))

        return {
          success: true,
          result: { readyFiles, duplicateFiles }
        }

      } finally {
        // Clean up progress listener
        if (progressUnsubscribe) {
          progressUnsubscribe()
        }
      }

    } catch (error) {
      const appError = createApplicationError(error, {
        source: 'worker',
        fileCount: files.length,
        processingMode: 'worker'
      })
      
      console.error('Web Worker processing failed:', appError)
      
      // Determine if we should restart the worker or just fallback
      if (isRecoverableError(appError.type)) {
        console.warn('Worker appears to be stuck, restarting...')
        
        // Use worker manager for restart if available
        if (workerState) {
          await workerManager.restartWorker(WORKER_ID)
        } else {
          workerInstance.restartWorker()
        }
      }
      
      console.info('Falling back to main thread processing...')
      return { success: false, fallback: true, error: appError }
    }
  }
  
  // Get processing status
  const getProcessingStatus = () => {
    const workerStatus = workerInstance.getWorkerStatus()
    const managerStats = workerState ? workerManager.getWorkerStatistics() : null
    
    return {
      ...workerStatus,
      fallbackAvailable: true,
      recommendedMode: workerStatus.supported && workerStatus.healthy ? 'worker' : 'fallback',
      workerManager: managerStats,
      managedWorker: workerState ? {
        id: WORKER_ID,
        restartAttempts: workerState.restartAttempts,
        lastRestart: workerState.lastRestart,
        errors: workerState.errors.length,
        stats: workerState.stats
      } : null
    }
  }
  
  // Force worker restart
  const forceWorkerRestart = async () => {
    if (workerState) {
      return await workerManager.restartWorker(WORKER_ID)
    } else {
      return workerInstance.restartWorker()
    }
  }
  
  // Terminate worker (cleanup)
  const terminateWorker = () => {
    if (workerState) {
      return workerManager.terminateWorker(WORKER_ID)
    } else {
      workerInstance.terminateWorker()
      return true
    }
  }

  return {
    // Worker management
    workerInstance,
    workerManager,
    workerState,
    WORKER_ID,
    
    // Worker operations
    initializeWorkerIfNeeded,
    checkWorkerHealth,
    processFilesWithWorker,
    getProcessingStatus,
    forceWorkerRestart,
    terminateWorker
  }
}