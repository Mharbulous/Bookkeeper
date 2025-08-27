/**
 * Web Worker for file hash processing
 * Handles SHA-256 hash generation for file deduplication without blocking the main thread
 */

// Worker-specific timing utility
let processingStartTime = null

function logWorkerTime(eventName) {
  if (processingStartTime === null) {
    // If no start time set, use current time as baseline
    processingStartTime = Date.now()
  }
  const relativeTime = Date.now() - processingStartTime
  console.log(`${eventName}: ${relativeTime}`)
}

// Message types
const MESSAGE_TYPES = {
  PROCESS_FILES: 'PROCESS_FILES',
  PROGRESS_UPDATE: 'PROGRESS_UPDATE',
  PROCESSING_COMPLETE: 'PROCESSING_COMPLETE',
  ERROR: 'ERROR',
  HEALTH_CHECK: 'HEALTH_CHECK',
  HEALTH_CHECK_RESPONSE: 'HEALTH_CHECK_RESPONSE'
}

// Helper function to generate standard SHA-256 hash
async function generateFileHash(file) {
  try {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    // Return standard SHA-256 hash of file content
    return hash
  } catch (error) {
    throw new Error(`Failed to generate hash for file ${file.name}: ${error.message}`)
  }
}

// Helper function to get file path consistently
function getFilePath(file) {
  return file.path || file.webkitRelativePath || file.name
}

// Main file processing logic
async function processFiles(files, batchId) {
  const totalFiles = files.length
  let processedCount = 0
  let lastProgressUpdate = 0
  
  // Helper function to send throttled progress updates (max 1 per second)
  const sendProgressUpdate = () => {
    const now = Date.now()
    if (now - lastProgressUpdate >= 1000) { // 1 second throttle
      self.postMessage({
        type: MESSAGE_TYPES.PROGRESS_UPDATE,
        batchId,
        progress: {
          current: processedCount,
          total: totalFiles,
          percentage: Math.round((processedCount / totalFiles) * 100)
        }
      })
      lastProgressUpdate = now
    }
  }
  
  try {
    // Initialize worker timing from first file processing
    if (processingStartTime === null) {
      processingStartTime = Date.now()
    }
    
    // Step 1: Group files by size to identify unique-sized files
    const fileSizeGroups = new Map() // file_size -> [file_references]
    
    files.forEach((fileData) => {
      const { id, file, originalIndex, customPath } = fileData
      const fileSize = file.size
      const fileRef = {
        id,
        file,
        originalIndex,
        path: customPath || getFilePath(file), // Use customPath first, fallback to getFilePath
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
        processedCount++
        sendProgressUpdate()
      } else {
        // Multiple files with same size - need hash verification
        duplicateCandidates.push(...fileRefs)
      }
    }
    
    
    // Step 3: Hash potential duplicates and group by hash
    const hashGroups = new Map() // hash_value -> [file_references]
    const hashingStartTime = Date.now()
    
    for (const fileRef of duplicateCandidates) {
      const hash = await generateFileHash(fileRef.file)
      fileRef.hash = hash
      
      if (!hashGroups.has(hash)) {
        hashGroups.set(hash, [])
      }
      hashGroups.get(hash).push(fileRef)
      
      processedCount++
      sendProgressUpdate()
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
    
    // Prepare result - remove File objects since they can't be transferred back
    const readyFiles = allFinalFiles.map(fileRef => ({
      id: fileRef.id,
      originalIndex: fileRef.originalIndex,
      path: fileRef.path,
      metadata: fileRef.metadata,
      hash: fileRef.hash,
      status: 'ready'
    }))
    
    const duplicatesForQueue = duplicateFiles.map(fileRef => ({
      id: fileRef.id,
      originalIndex: fileRef.originalIndex,
      path: fileRef.path,
      metadata: fileRef.metadata,
      hash: fileRef.hash,
      isDuplicate: fileRef.isDuplicate,
      status: 'duplicate'
    }))
    
    // Send completion message
    self.postMessage({
      type: MESSAGE_TYPES.PROCESSING_COMPLETE,
      batchId,
      result: {
        readyFiles,
        duplicateFiles: duplicatesForQueue
      }
    })
    
  } catch (error) {
    // Send error message
    self.postMessage({
      type: MESSAGE_TYPES.ERROR,
      batchId,
      error: {
        message: error.message,
        stack: error.stack
      }
    })
  }
}

// Helper function to choose the best file based on priority rules
function chooseBestFile(fileRefs) {
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

// Worker message handler
self.onmessage = async function(event) {
  const { type, files, batchId, options, timestamp } = event.data
  
  switch (type) {
    case MESSAGE_TYPES.PROCESS_FILES:
      await processFiles(files, batchId, options)
      break
    
    case MESSAGE_TYPES.HEALTH_CHECK:
      // Respond to health check immediately
      self.postMessage({
        type: MESSAGE_TYPES.HEALTH_CHECK_RESPONSE,
        batchId,
        timestamp: timestamp,
        responseTime: Date.now(),
        status: 'healthy'
      })
      break
    
    default:
      self.postMessage({
        type: MESSAGE_TYPES.ERROR,
        batchId,
        error: {
          message: `Unknown message type: ${type}`
        }
      })
  }
}

// Export message types for use by main thread
self.MESSAGE_TYPES = MESSAGE_TYPES