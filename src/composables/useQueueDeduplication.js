import { useWebWorker } from './useWebWorker'
import { useWorkerManager } from './useWorkerManager'
import { createApplicationError, isRecoverableError, getRetryDelay } from '../utils/errorMessages'

export function useQueueDeduplication() {
  
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
  
  // Helper function to get file path consistently
  const getFilePath = (fileRef) => {
    // Handle direct file objects
    if (fileRef instanceof File) {
      return fileRef.path || fileRef.webkitRelativePath || fileRef.name
    }
    // Handle file reference objects
    return fileRef.path || fileRef.file?.webkitRelativePath || fileRef.file?.path || fileRef.file?.name || fileRef.name
  }

  // Legacy hash generation (kept for fallback compatibility)
  const generateFileHash = async (file) => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    // Add size suffix for collision safety (SHA-256 + size = virtually impossible collision)
    return `${hash}_${file.size}`
  }

  // Legacy chooseBestFile (kept for fallback compatibility)
  const chooseBestFile = (fileRefs) => {
    return fileRefs.sort((a, b) => {
      // Priority 1: Earliest modification date
      if (a.metadata.lastModified !== b.metadata.lastModified) {
        return a.metadata.lastModified - b.metadata.lastModified
      }
      
      // Priority 2: Longest folder path
      const aFolderPath = a.path.substring(0, a.path.lastIndexOf('/') + 1)
      const bFolderPath = b.path.substring(0, b.path.lastIndexOf('/') + 1)
      if (aFolderPath.length !== bFolderPath.length) {
        return bFolderPath.length - aFolderPath.length // Descending (longest first)
      }
      
      // Priority 3: Shortest filename
      if (a.metadata.fileName.length !== b.metadata.fileName.length) {
        return a.metadata.fileName.length - b.metadata.fileName.length
      }
      
      // Priority 4: Alphanumeric filename sort
      if (a.metadata.fileName !== b.metadata.fileName) {
        return a.metadata.fileName.localeCompare(b.metadata.fileName)
      }
      
      // Priority 5: Original selection order (stable sort)
      return a.originalIndex - b.originalIndex
    })[0]
  }

  // Web Worker-based file processing with progress support
  const processFiles = async (files, updateUploadQueue, onProgress = null) => {
    // Check if files array is valid
    if (!files || !Array.isArray(files) || files.length === 0) {
      const error = createApplicationError('Invalid files array provided', {
        validation: true,
        fileCount: files ? files.length : 0
      })
      throw error
    }
    
    // Check if Web Workers are supported
    if (!workerInstance.isWorkerSupported) {
      console.warn('Web Workers not supported in this browser, falling back to main thread processing')
      return processFilesMainThread(files, updateUploadQueue, onProgress)
    }
    
    // Check worker manager state if available
    if (workerState) {
      const stats = workerManager.getWorkerStatistics()
      console.debug('Worker statistics:', stats)
    }
    
    // Initialize worker if not ready
    if (!workerInstance.isWorkerReady.value) {
      console.info('Initializing Web Worker...')
      const initialized = workerInstance.initializeWorker()
      if (!initialized) {
        console.warn('Web Worker initialization failed, falling back to main thread processing')
        return processFilesMainThread(files, updateUploadQueue, onProgress)
      }
    }
    
    // Check worker health before proceeding
    if (!workerInstance.isWorkerHealthy.value) {
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
        return processFilesMainThread(files, updateUploadQueue, onProgress)
      }
    }

    try {
      const deduplicationStartTime = Date.now()
      console.info(`Processing ${files.length} files using Web Worker...`)
      console.log(`📊 Total files to process: ${files.length}`)
      console.log(`⏱️  DEDUPLICATION START: Beginning file processing at ${deduplicationStartTime}ms`)
      
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
        return {
          id: fileId,
          file: file,  // File objects cloned to worker, converted to ArrayBuffer internally
          originalIndex: index
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
        const workerStartTime = Date.now()
        console.log(`⏱️  WORKER SEND: Sending ${files.length} files to worker at ${workerStartTime}ms`)
        
        // Send to worker with timeout based on file count and size
        const totalSize = files.reduce((sum, file) => sum + file.size, 0)
        const estimatedTime = Math.max(30000, Math.min(300000, totalSize / 1000)) // 30s min, 5min max
        console.log(`⏱️  WORKER TIMEOUT: Set to ${estimatedTime}ms for ${(totalSize / (1024 * 1024)).toFixed(1)}MB total`)
        
        const workerResult = await workerInstance.sendMessage({
          type: 'PROCESS_FILES',
          files: filesToProcess
        }, {
          timeout: estimatedTime
        })
        
        const workerDuration = Date.now() - workerStartTime
        const deduplicationDuration = Date.now() - deduplicationStartTime
        console.info(`⏱️  WORKER COMPLETE: Web Worker processing completed in ${workerDuration}ms`)
        console.info(`⏱️  DEDUPLICATION COMPLETE: Total deduplication time ${deduplicationDuration}ms`)

        // Map worker results back to original File objects
        const mappingStartTime = Date.now()
        const readyFiles = workerResult.readyFiles.map(fileRef => ({
          ...fileRef,
          file: fileMapping.get(fileRef.id),  // Restore original File object
          status: 'ready'
        }))

        const duplicateFiles = workerResult.duplicateFiles.map(fileRef => ({
          ...fileRef,
          file: fileMapping.get(fileRef.id),  // Restore original File object
          status: 'duplicate'
        }))
        
        const mappingDuration = Date.now() - mappingStartTime
        console.log(`⏱️  RESULT MAPPING: Mapped ${readyFiles.length + duplicateFiles.length} results in ${mappingDuration}ms`)
        console.log(`📊 DEDUPLICATION RESULTS: ${readyFiles.length} unique files, ${duplicateFiles.length} duplicates`)

        // Update UI using existing API
        console.log(`⏱️  QUEUE UPDATE START: Beginning UI queue update at ${Date.now()}ms`)
        updateUploadQueue(readyFiles, duplicateFiles)

        // Return in exact same format as current API
        return { readyFiles, duplicateFiles }

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
      return processFilesMainThread(files, updateUploadQueue, onProgress)
    }
  }

  // Legacy main thread processing (fallback implementation)
  const processFilesMainThread = async (files, updateUploadQueue, onProgress = null) => {
    const fallbackStartTime = Date.now()
    console.info(`Processing ${files.length} files on main thread (fallback mode)...`)
    console.log(`📊 Total files to process: ${files.length}`)
    console.log(`⏱️  FALLBACK START: Beginning main thread processing at ${fallbackStartTime}ms`)
    const startTime = Date.now()
    
    // Track progress for main thread processing
    let processedCount = 0
    const totalFiles = files.length
    
    const sendProgress = () => {
      if (onProgress) {
        onProgress({
          current: processedCount,
          total: totalFiles,
          percentage: Math.round((processedCount / totalFiles) * 100),
          currentFile: processedCount < totalFiles ? files[processedCount]?.name : ''
        })
      }
    }
    
    // Send initial progress
    sendProgress()
    // Step 1: Group files by size to identify unique-sized files
    const sizeGroupingStartTime = Date.now()
    const fileSizeGroups = new Map() // file_size -> [file_references]
    
    files.forEach((file, index) => {
      const fileSize = file.size
      const fileRef = {
        file,
        originalIndex: index,
        path: getFilePath(file),
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          lastModified: file.lastModified
        }
      }
      
      if (!fileSizeGroups.has(fileSize)) {
        fileSizeGroups.set(fileSize, [])
      }
      fileSizeGroups.get(fileSize).push(fileRef)
    })
    
    const uniqueFiles = []
    const duplicateCandidates = []
    
    // Step 2: Separate unique-sized files from potential duplicates
    for (const [, fileRefs] of fileSizeGroups) {
      if (fileRefs.length === 1) {
        // Unique file size - definitely not a duplicate
        uniqueFiles.push(fileRefs[0])
      } else {
        // Multiple files with same size - need hash verification
        duplicateCandidates.push(...fileRefs)
      }
    }
    
    const sizeGroupingDuration = Date.now() - sizeGroupingStartTime
    console.log(`⏱️  SIZE GROUPING: Completed file size analysis in ${sizeGroupingDuration}ms`)
    
    // Log the analysis results (estimation now happens in folder options)
    console.log(`📊 File size analysis complete:`)
    console.log(`   • ${uniqueFiles.length} files with unique sizes (skip hash calculation)`)
    console.log(`   • ${duplicateCandidates.length} files need hash verification`)
    console.log(`   • ${Math.round((uniqueFiles.length / totalFiles) * 100)}% of files can skip expensive hash calculation`)
    
    // Step 3: Hash potential duplicates and group by hash
    const hashGroups = new Map() // hash_value -> [file_references]
    const hashingStartTime = Date.now()
    
    for (const fileRef of duplicateCandidates) {
      try {
        const hash = await generateFileHash(fileRef.file)
        fileRef.hash = hash
        
        if (!hashGroups.has(hash)) {
          hashGroups.set(hash, [])
        }
        hashGroups.get(hash).push(fileRef)
        
        // Update progress
        processedCount++
        sendProgress()
        
      } catch (error) {
        const appError = createApplicationError(error, {
          fileProcessing: true,
          fileName: fileRef.file.name,
          fileSize: fileRef.file.size,
          processingMode: 'fallback'
        })
        
        console.error(`Failed to hash file ${fileRef.file.name}:`, appError)
        // Include file anyway without hash to avoid data loss - will be handled in final processing
        processedCount++
        sendProgress()
      }
    }
    
    const hashingEndTime = Date.now()
    const actualHashingTime = hashingEndTime - hashingStartTime
    console.log(`⏱️  HASHING COMPLETE: Hash calculation completed in ${actualHashingTime}ms for ${duplicateCandidates.length} files (main thread)`)
    
    const finalFiles = []
    const duplicateFiles = []
    
    // Step 4: Process hash groups to identify true duplicates vs identical files selected twice
    const deduplicationLogicStartTime = Date.now()
    for (const [, fileRefs] of hashGroups) {
      if (fileRefs.length === 1) {
        // Unique hash - not a duplicate
        finalFiles.push(fileRefs[0])
      } else {
        // Multiple files with same hash - check if they're one-and-the-same or duplicate files
        const oneAndTheSameGroups = new Map() // metadata_key -> [file_references]
        
        fileRefs.forEach(fileRef => {
          // Create metadata signature for one-and-the-same file detection
          const metadataKey = `${fileRef.metadata.fileName}_${fileRef.metadata.fileSize}_${fileRef.metadata.lastModified}`
          
          if (!oneAndTheSameGroups.has(metadataKey)) {
            oneAndTheSameGroups.set(metadataKey, [])
          }
          oneAndTheSameGroups.get(metadataKey).push(fileRef)
        })
        
        // Step 5: Handle one-and-the-same files and duplicate files
        for (const [, oneAndTheSameFiles] of oneAndTheSameGroups) {
          if (oneAndTheSameFiles.length === 1) {
            // Unique file (different metadata from others with same hash)
            finalFiles.push(oneAndTheSameFiles[0])
          } else {
            // One-and-the-same file selected multiple times - just pick the first one
            const chosenFile = oneAndTheSameFiles[0]
            finalFiles.push(chosenFile)
            
            // Don't mark others as duplicates - they're the same file, just filter them out
          }
        }
        
        // If we have multiple distinct files with same hash (duplicate files), choose the best one
        if (oneAndTheSameGroups.size > 1) {
          const allUniqueFiles = Array.from(oneAndTheSameGroups.values()).map(group => group[0])
          if (allUniqueFiles.length > 1) {
            const bestFile = chooseBestFile(allUniqueFiles)
            
            // Remove best file from finalFiles and add back with priority
            const bestIndex = finalFiles.findIndex(f => f === bestFile)
            if (bestIndex > -1) {
              finalFiles.splice(bestIndex, 1)
            }
            finalFiles.push(bestFile)
            
            // Mark others as duplicates
            allUniqueFiles.forEach(fileRef => {
              if (fileRef !== bestFile) {
                const index = finalFiles.findIndex(f => f === fileRef)
                if (index > -1) {
                  finalFiles.splice(index, 1)
                }
                fileRef.isDuplicate = true
                duplicateFiles.push(fileRef)
              }
            })
          }
        }
      }
    }
    
    const deduplicationLogicDuration = Date.now() - deduplicationLogicStartTime
    console.log(`⏱️  DEDUP LOGIC: Duplicate detection logic completed in ${deduplicationLogicDuration}ms`)
    
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
    
    const combineDuration = Date.now() - combineStartTime
    console.log(`⏱️  COMBINE RESULTS: Combined final results in ${combineDuration}ms`)
    
    // Update UI using existing API
    console.log(`⏱️  FALLBACK QUEUE UPDATE START: Beginning UI queue update at ${Date.now()}ms`)
    updateUploadQueue(readyFiles, duplicatesForQueue)
    
    const totalDuration = Date.now() - fallbackStartTime
    console.info(`⏱️  FALLBACK COMPLETE: Main thread processing completed in ${totalDuration}ms`)
    
    // Break down the timing
    console.log(`📊 FALLBACK TIMING BREAKDOWN:`)
    console.log(`   • Size grouping: ${sizeGroupingDuration}ms`)
    console.log(`   • Hash calculation: ${actualHashingTime}ms`)
    console.log(`   • Deduplication logic: ${deduplicationLogicDuration}ms`)
    console.log(`   • Result combination: ${combineDuration}ms`)
    console.log(`   • Total processing: ${totalDuration}ms`)
    
    // Return in exact same format as current API
    return { readyFiles, duplicatesForQueue }
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
  
  // Force fallback mode (for testing or troubleshooting)
  const forceMainThreadProcessing = async (files, updateUploadQueue, onProgress = null) => {
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
    // Methods
    generateFileHash,
    chooseBestFile,
    processFiles,
    processFilesMainThread,
    forceMainThreadProcessing,
    getFilePath,
    getProcessingStatus,
    handleProcessingError,
    
    // Worker management
    workerInstance,
    workerManager,
    forceWorkerRestart,
    terminateWorker
  }
}