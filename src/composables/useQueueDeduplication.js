import { useWebWorker } from './useWebWorker'

export function useQueueDeduplication() {
  
  // Initialize Web Worker
  const workerInstance = useWebWorker('../workers/fileHashWorker.js')
  
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
    // Initialize worker if not ready
    if (!workerInstance.isWorkerReady.value) {
      const initialized = workerInstance.initializeWorker()
      if (!initialized) {
        console.warn('Web Worker not available, falling back to main thread processing')
        return processFilesMainThread(files, updateUploadQueue)
      }
    }

    try {
      // Create mapping structure that preserves original File objects
      const fileMapping = new Map()
      const filesToProcess = files.map((file, index) => {
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
        // Send to worker
        const workerResult = await workerInstance.sendMessage({
          type: 'PROCESS_FILES',
          files: filesToProcess
        })

        // Map worker results back to original File objects
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

        // Update UI using existing API
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
      console.error('Web Worker processing failed, falling back to main thread:', error)
      return processFilesMainThread(files, updateUploadQueue)
    }
  }

  // Legacy main thread processing (fallback implementation)
  const processFilesMainThread = async (files, updateUploadQueue) => {
    // Step 1: Group files by size to identify unique-sized files
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
    
    // Step 3: Hash potential duplicates and group by hash
    const hashGroups = new Map() // hash_value -> [file_references]
    
    for (const fileRef of duplicateCandidates) {
      const hash = await generateFileHash(fileRef.file)
      fileRef.hash = hash
      
      if (!hashGroups.has(hash)) {
        hashGroups.set(hash, [])
      }
      hashGroups.get(hash).push(fileRef)
    }
    
    const finalFiles = []
    const duplicateFiles = []
    
    // Step 4: Process hash groups to identify true duplicates vs identical files selected twice
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
    
    // Step 6: Combine unique and non-duplicate files
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
    updateUploadQueue(readyFiles, duplicatesForQueue)
    
    // Return in exact same format as current API
    return { readyFiles, duplicatesForQueue }
  }

  return {
    // Methods
    generateFileHash,
    chooseBestFile,
    processFiles,
    processFilesMainThread,
    getFilePath,
    
    // Worker management
    workerInstance
  }
}