export function useQueueDeduplication() {
  
  // Helper function to get file path consistently
  const getFilePath = (fileRef) => {
    // Handle direct file objects
    if (fileRef instanceof File) {
      return fileRef.path || fileRef.webkitRelativePath || fileRef.name
    }
    // Handle file reference objects
    return fileRef.path || fileRef.file?.webkitRelativePath || fileRef.file?.path || fileRef.file?.name || fileRef.name
  }

  // Simple hash generation with collision safety
  const generateFileHash = async (file) => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    // Add size suffix for collision safety (SHA-256 + size = virtually impossible collision)
    return `${hash}_${file.size}`
  }

  // Helper function to choose the best file based on priority rules
  const chooseBestFile = (fileRefs) => {
    return fileRefs.sort((a, b) => {
      // Priority 1: Earliest modification date
      if (a.metadata.lastModified !== b.metadata.lastModified) {
        return a.metadata.lastModified - b.metadata.lastModified
      }
      
      // Priority 2: Shortest filename
      if (a.metadata.fileName.length !== b.metadata.fileName.length) {
        return a.metadata.fileName.length - b.metadata.fileName.length
      }
      
      // Priority 3: Alphanumeric filename sort
      if (a.metadata.fileName !== b.metadata.fileName) {
        return a.metadata.fileName.localeCompare(b.metadata.fileName)
      }
      
      // Priority 4: Original selection order (stable sort)
      return a.originalIndex - b.originalIndex
    })[0]
  }

  // Improved constraint-based deduplication using JavaScript Maps
  const processFiles = async (files, updateUploadQueue) => {
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
        // Multiple files with same hash - check if they're identical or true duplicates
        const identicalGroups = new Map() // metadata_key -> [file_references]
        
        fileRefs.forEach(fileRef => {
          // Create metadata signature for identical file detection
          const metadataKey = `${fileRef.metadata.fileName}_${fileRef.metadata.fileSize}_${fileRef.metadata.lastModified}`
          
          if (!identicalGroups.has(metadataKey)) {
            identicalGroups.set(metadataKey, [])
          }
          identicalGroups.get(metadataKey).push(fileRef)
        })
        
        // Step 5: Handle identical files and true duplicates
        for (const [, identicalFiles] of identicalGroups) {
          if (identicalFiles.length === 1) {
            // Unique file (different metadata from others with same hash)
            finalFiles.push(identicalFiles[0])
          } else {
            // Identical files selected multiple times - just pick the first one
            const chosenFile = identicalFiles[0]
            finalFiles.push(chosenFile)
            
            // Mark others as duplicates
            identicalFiles.slice(1).forEach(fileRef => {
              fileRef.isDuplicate = true
              duplicateFiles.push(fileRef)
            })
          }
        }
        
        // If we have multiple distinct files with same hash (true duplicates), choose the best one
        if (identicalGroups.size > 1) {
          const allUniqueFiles = Array.from(identicalGroups.values()).map(group => group[0])
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
    
    // Step 5: Combine unique and non-duplicate files
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
    
    // Update UI
    updateUploadQueue(readyFiles, duplicatesForQueue)
  }

  return {
    // Methods
    generateFileHash,
    chooseBestFile,
    processFiles,
    getFilePath
  }
}