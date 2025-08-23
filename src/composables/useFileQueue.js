import { ref, shallowRef, nextTick } from 'vue'

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
    console.log(`🚀 USER ACTION: Files selected/dropped - Starting end-to-end processing at ${Date.now()}ms`)
    const startTime = Date.now()
    await processFiles(files)
    // Note: Total time will be logged when UI update completes
    window.endToEndStartTime = startTime
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
  
  // Simple 2-chunk UI updates for optimal user feedback
  const updateFromWorkerResults = async (readyFiles, duplicateFiles) => {
    const uiUpdateStartTime = Date.now()
    console.log(`⏱️  UI UPDATE START: Beginning UI update process at ${uiUpdateStartTime}ms`)
    
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
    
    console.info(`Starting 2-chunk UI update for ${totalFiles} files...`)
    console.log(`📊 UI UPDATE DATA: ${readyFiles.length} ready files, ${duplicateFiles.length} duplicate files`)
    const startTime = Date.now()
    
    if (totalFiles <= 100) {
      // For small file sets, just load everything at once
      const chunk1Start = Date.now()
      console.log(`⏱️  SINGLE CHUNK START: Processing all ${totalFiles} files at once`)
      uploadQueue.value = processFileChunk(allFiles)
      const chunk1Duration = Date.now() - chunk1Start
      
      uiUpdateProgress.value = {
        current: totalFiles,
        total: totalFiles,
        percentage: 100,
        phase: 'complete'
      }
      
      console.info(`⏱️  SINGLE CHUNK COMPLETE: Loaded ${totalFiles} files in ${chunk1Duration}ms`)
      console.log(`📊 SINGLE CHUNK PERFORMANCE: ${(totalFiles / chunk1Duration * 1000).toFixed(1)} files/second`)
    } else {
      // Simple 2-chunk strategy for large file sets
      
      // CHUNK 1: Initial batch (first 100 files) - immediate user feedback
      const chunk1Start = Date.now()
      const chunk1Size = 100
      const chunk1Files = allFiles.slice(0, chunk1Size)
      console.log(`⏱️  CHUNK 1 START: Processing first ${chunk1Size} files for immediate feedback`)
      uploadQueue.value = processFileChunk(chunk1Files)
      
      uiUpdateProgress.value = {
        current: chunk1Size,
        total: totalFiles,
        percentage: Math.round((chunk1Size / totalFiles) * 100),
        phase: 'loading'
      }
      
      const chunk1Duration = Date.now() - chunk1Start
      console.info(`⏱️  CHUNK 1 COMPLETE: Displayed first ${chunk1Size} files in ${chunk1Duration}ms`)
      console.log(`📊 CHUNK 1 PERFORMANCE: ${(chunk1Size / chunk1Duration * 1000).toFixed(1)} files/second`)
      
      // Delay to let user see the first chunk
      const delayStart = Date.now()
      await new Promise(resolve => setTimeout(resolve, 200))
      const delayDuration = Date.now() - delayStart
      console.log(`⏱️  USER FEEDBACK DELAY: ${delayDuration}ms delay for user perception`)
      
      // CHUNK 2: Complete the rest - all remaining files
      const chunk2Start = Date.now()
      const remainingFiles = totalFiles - chunk1Size
      console.log(`⏱️  CHUNK 2 START: Processing remaining ${remainingFiles} files`)
      
      uploadQueue.value = processFileChunk(allFiles) // All files
      
      uiUpdateProgress.value = {
        current: totalFiles,
        total: totalFiles,
        percentage: 100,
        phase: 'complete'
      }
      
      // Wait for Vue to complete DOM rendering
      const renderStart = Date.now()
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0)) // Additional frame wait
      const renderDuration = Date.now() - renderStart
      
      const chunk2Duration = Date.now() - chunk2Start
      console.info(`⏱️  CHUNK 2 COMPLETE: Displayed final ${remainingFiles} files in ${chunk2Duration}ms`)
      console.log(`📊 CHUNK 2 PERFORMANCE: ${(remainingFiles / chunk2Duration * 1000).toFixed(1)} files/second`)
      console.log(`⏱️  DOM RENDERING: Vue render completion took ${renderDuration}ms`)
    }
    
    const uiUpdateTotalDuration = Date.now() - uiUpdateStartTime
    const chunkingDuration = Date.now() - startTime
    
    console.info(`⏱️  UI UPDATE COMPLETE: 2-chunk UI update completed in ${chunkingDuration}ms`)
    console.log(`⏱️  UI UPDATE TOTAL: Complete UI update process took ${uiUpdateTotalDuration}ms`)
    
    // Performance metrics
    if (totalFiles > 0) {
      console.log(`📊 UI UPDATE PERFORMANCE:`)
      console.log(`   • Total files processed: ${totalFiles}`)
      console.log(`   • Processing rate: ${(totalFiles / uiUpdateTotalDuration * 1000).toFixed(1)} files/second`)
      console.log(`   • Average time per file: ${(uiUpdateTotalDuration / totalFiles).toFixed(2)}ms`)
    }
    
    // Log end-to-end timing from user action to UI completion
    if (window.endToEndStartTime) {
      const endToEndDuration = Date.now() - window.endToEndStartTime
      console.info(`🎯 END-TO-END COMPLETE: From file selection to UI display in ${endToEndDuration}ms (${(endToEndDuration/1000).toFixed(1)}s)`)
      
      window.endToEndStartTime = null // Clean up
    }
    
    // Log folder processing timing (from Continue button to queue display)
    if (window.folderProcessingStartTime) {
      const folderProcessingDuration = Date.now() - window.folderProcessingStartTime
      console.log(`📊 FOLDER_PROCESSING_COMPLETE:`, {
        timestamp: Date.now(),
        processingTimeMs: folderProcessingDuration,
        processingTimeSeconds: Math.round(folderProcessingDuration / 1000 * 10) / 10,
        filesProcessed: totalFiles,
        avgTimePerFileMs: Math.round((folderProcessingDuration / Math.max(totalFiles, 1)) * 100) / 100,
        filesPerSecond: Math.round((totalFiles / Math.max(folderProcessingDuration, 1) * 1000) * 10) / 10
      })
      
      window.folderProcessingStartTime = null // Clean up
    }
    
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