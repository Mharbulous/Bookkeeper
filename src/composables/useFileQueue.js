import { ref, shallowRef } from 'vue'

export function useFileQueue() {
  // Reactive data - Use shallowRef for better performance with large file arrays
  const uploadQueue = shallowRef([])
  const showSingleFileNotification = ref(false)
  const singleFileNotification = ref({ message: '', color: 'info' })
  
  // Progress state tracking
  const processingProgress = shallowRef({
    current: 0,
    total: 0,
    percentage: 0,
    currentFile: '',
    isProcessing: false
  })
  
  // UI update progress tracking
  const isProcessingUIUpdate = ref(false)
  const uiUpdateProgress = ref({
    current: 0,
    total: 0,
    percentage: 0,
    phase: 'loading' // 'loading', 'complete'
  })

  // Template refs
  const fileInput = ref(null)
  const folderInput = ref(null)

  // Helper function to get file path consistently
  const getFilePath = (fileRef) => {
    // Handle direct file objects
    if (fileRef instanceof File) {
      return fileRef.path || fileRef.webkitRelativePath || fileRef.name
    }
    // Handle file reference objects
    return fileRef.path || fileRef.file?.webkitRelativePath || fileRef.file?.path || fileRef.file?.name || fileRef.name
  }

  // File input handlers
  const triggerFileSelect = () => {
    fileInput.value.click()
  }

  const triggerFolderSelect = () => {
    folderInput.value.click()
  }

  // File processing functions
  const processSingleFile = async (file, processFiles) => {
    // For single files, add to queue
    await addFilesToQueue([file], processFiles)
  }

  const addFilesToQueue = async (files, processFiles) => {
    if (files.length === 0) return
    await processFiles(files)
  }

  // Worker progress update handler
  const updateProgress = (progressData) => {
    processingProgress.value = {
      current: progressData.current || 0,
      total: progressData.total || 0,
      percentage: progressData.percentage || 0,
      currentFile: progressData.currentFile || '',
      isProcessing: true
    }
  }

  // Reset progress when processing completes
  const resetProgress = () => {
    processingProgress.value = {
      current: 0,
      total: 0,
      percentage: 0,
      currentFile: '',
      isProcessing: false
    }
  }
  
  // Reset UI update progress
  const resetUIProgress = () => {
    isProcessingUIUpdate.value = false
    uiUpdateProgress.value = {
      current: 0,
      total: 0,
      percentage: 0,
      phase: 'loading'
    }
  }

  // Helper function to process a chunk of files into queue format
  const processFileChunk = (files) => {
    return files.map(fileRef => ({
      id: crypto.randomUUID(),
      file: fileRef.file,
      metadata: fileRef.metadata,
      hash: fileRef.hash,
      status: fileRef.status,
      name: fileRef.file.name,
      size: fileRef.file.size,
      type: fileRef.file.type,
      lastModified: fileRef.file.lastModified,
      path: getFilePath(fileRef),
      isDuplicate: fileRef.status === 'duplicate'
    }))
  }
  
  // Smart 3-chunk UI updates for optimal performance with large file sets
  const updateFromWorkerResults = async (readyFiles, duplicateFiles) => {
    const allFiles = [...readyFiles, ...duplicateFiles]
    const totalFiles = allFiles.length
    
    // Start UI update process
    isProcessingUIUpdate.value = true
    uiUpdateProgress.value = {
      current: 0,
      total: totalFiles,
      percentage: 0,
      phase: 'loading'
    }
    
    console.info(`Starting 3-chunk UI update for ${totalFiles} files...`)
    const startTime = Date.now()
    
    if (totalFiles <= 50) {
      // For small file sets, just load everything at once
      const chunk1Start = Date.now()
      uploadQueue.value = processFileChunk(allFiles)
      const chunk1Duration = Date.now() - chunk1Start
      
      uiUpdateProgress.value = {
        current: totalFiles,
        total: totalFiles,
        percentage: 100,
        phase: 'complete'
      }
      
      console.info(`Single chunk: Loaded ${totalFiles} files in ${chunk1Duration}ms`)
    } else {
      // Smart 3-chunk strategy for large file sets
      
      // CHUNK 1: Instant preview (first 20 files) - immediate user feedback
      const chunk1Start = Date.now()
      const chunk1Size = 20
      const chunk1 = allFiles.slice(0, chunk1Size)
      uploadQueue.value = processFileChunk(chunk1)
      const chunk1Duration = Date.now() - chunk1Start
      
      uiUpdateProgress.value = {
        current: chunk1Size,
        total: totalFiles,
        percentage: Math.round((chunk1Size / totalFiles) * 100),
        phase: 'loading'
      }
      
      console.info(`✅ Chunk 1 COMPLETE: Displayed first ${chunk1Size} files in ${chunk1Duration}ms`)
      
      // Small delay to let the UI render the first chunk
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // CHUNK 2: Bulk loading (most of the remaining files) - efficient processing
      const chunk2Start = Date.now()
      const chunk2Size = Math.min(totalFiles - chunk1Size, Math.floor(totalFiles * 0.8))
      const chunk2EndIndex = chunk1Size + chunk2Size
      const chunk2Files = allFiles.slice(0, chunk2EndIndex)
      
      uploadQueue.value = processFileChunk(chunk2Files)
      const chunk2Duration = Date.now() - chunk2Start
      
      uiUpdateProgress.value = {
        current: chunk2EndIndex,
        total: totalFiles,
        percentage: Math.round((chunk2EndIndex / totalFiles) * 100),
        phase: 'loading'
      }
      
      console.info(`✅ Chunk 2 COMPLETE: Loaded ${chunk2Size} more files in ${chunk2Duration}ms (total: ${chunk2EndIndex})`)
      
      // Small delay before final chunk
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // CHUNK 3: Final completion (remaining files) - complete the job
      if (chunk2EndIndex < totalFiles) {
        const chunk3Start = Date.now()
        const remainingFiles = totalFiles - chunk2EndIndex
        uploadQueue.value = processFileChunk(allFiles)
        const chunk3Duration = Date.now() - chunk3Start
        
        console.info(`✅ Chunk 3 COMPLETE: Loaded final ${remainingFiles} files in ${chunk3Duration}ms`)
      }
      
      uiUpdateProgress.value = {
        current: totalFiles,
        total: totalFiles,
        percentage: 100,
        phase: 'complete'
      }
    }
    
    const duration = Date.now() - startTime
    console.info(`3-chunk UI update completed in ${duration}ms`)
    
    // Complete the UI update process
    isProcessingUIUpdate.value = false
    
    // Reset processing progress when complete
    resetProgress()
  }

  // Legacy method - maintains backward compatibility
  const updateUploadQueue = (readyFiles, duplicateFiles) => {
    updateFromWorkerResults(readyFiles, duplicateFiles)
  }

  // Queue management
  const removeFromQueue = (fileId) => {
    const index = uploadQueue.value.findIndex(f => f.id === fileId)
    if (index > -1) {
      uploadQueue.value.splice(index, 1)
    }
  }

  const clearQueue = () => {
    uploadQueue.value = []
  }

  const startUpload = () => {
    // Placeholder for actual upload implementation
    // TODO: Implement file upload logic
  }

  // Utility functions
  const showNotification = (message, color = 'info') => {
    singleFileNotification.value = { message, color }
    showSingleFileNotification.value = true
  }

  return {
    // Reactive data
    uploadQueue,
    showSingleFileNotification,
    singleFileNotification,
    fileInput,
    folderInput,
    processingProgress,
    isProcessingUIUpdate,
    uiUpdateProgress,

    // Methods
    getFilePath,
    triggerFileSelect,
    triggerFolderSelect,
    processSingleFile,
    addFilesToQueue,
    updateUploadQueue, // Legacy compatibility
    updateFromWorkerResults, // New worker-optimized method
    updateProgress,
    resetProgress,
    resetUIProgress,
    processFileChunk,
    removeFromQueue,
    clearQueue,
    startUpload,
    showNotification
  }
}