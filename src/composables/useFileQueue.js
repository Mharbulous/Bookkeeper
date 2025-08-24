import { ref, shallowRef, nextTick } from 'vue'
import { logProcessingTime } from '../utils/processingTimer.js'

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
    return files.map(fileRef => {
      const queueItem = {
        id: crypto.randomUUID(),
        file: fileRef.file,
        metadata: fileRef.metadata,
        status: fileRef.status,
        name: fileRef.file.name,
        size: fileRef.file.size,
        type: fileRef.file.type,
        lastModified: fileRef.file.lastModified,
        path: fileRef.path || getFilePath(fileRef),
        isDuplicate: fileRef.status === 'duplicate'
      }
      
      // Only include hash if it was calculated during deduplication process
      if (fileRef.hash) {
        queueItem.hash = fileRef.hash
      }
      
      return queueItem
    })
  }
  
  // Instant Upload Queue initialization - show immediately with first 100 files
  const initializeQueueInstantly = async (files) => {
    const totalFiles = files.length
    
    // Show Upload Queue immediately
    isProcessingUIUpdate.value = true
    uiUpdateProgress.value = {
      current: 0,
      total: totalFiles,
      percentage: 0,
      phase: 'loading'
    }
    
    // Force Vue reactivity update
    await nextTick()
    
    // Process first 100 files instantly for immediate display
    const initialFiles = files.slice(0, 100).map(file => ({
      id: crypto.randomUUID(),
      file: file,
      metadata: {},
      status: 'ready',
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      path: file.path,
      isDuplicate: false
    }))
    
    uploadQueue.value = initialFiles
    
    if (totalFiles <= 100) {
      uiUpdateProgress.value = {
        current: totalFiles,
        total: totalFiles,
        percentage: 100,
        phase: 'complete'
      }
      isProcessingUIUpdate.value = false
    } else {
      uiUpdateProgress.value = {
        current: 100,
        total: totalFiles,
        percentage: Math.round((100 / totalFiles) * 100),
        phase: 'loading'
      }
    }
  }

  // Simple 2-chunk UI updates for optimal user feedback
  const updateFromWorkerResults = async (readyFiles, duplicateFiles) => {
    const allFiles = [...readyFiles, ...duplicateFiles]
    const totalFiles = allFiles.length
    
    // Start UI update process (if not already started by initializeQueueInstantly)
    if (!isProcessingUIUpdate.value) {
      isProcessingUIUpdate.value = true
      uiUpdateProgress.value = {
        current: 0,
        total: totalFiles,
        percentage: 0,
        phase: 'loading'
      }
    }
    
    if (totalFiles <= 100) {
      // For small file sets, just load everything at once
      uploadQueue.value = processFileChunk(allFiles)
      
      uiUpdateProgress.value = {
        current: totalFiles,
        total: totalFiles,
        percentage: 100,
        phase: 'complete'
      }
      
      // Wait for Vue to complete DOM rendering for single chunk
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
    } else {
      // For large file sets, check if queue was already initialized instantly
      if (uploadQueue.value.length > 0) {
        // Queue was already initialized with first 100 files
        // Ensure minimum loading display time (at least 1.5 seconds for spinner visibility)
        const minLoadingTime = 1500
        const elapsedTime = window.instantQueueStartTime ? Date.now() - window.instantQueueStartTime : 0
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime)
        
        
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime))
        }
        
        // Then replace with full processed results
        uploadQueue.value = processFileChunk(allFiles)
        
        uiUpdateProgress.value = {
          current: totalFiles,
          total: totalFiles,
          percentage: 100,
          phase: 'complete'
        }
        
        // Clean up timestamp
        window.instantQueueStartTime = null
      } else {
        // Fallback to original 2-chunk strategy if queue wasn't pre-initialized
        // CHUNK 1: Initial batch (first 100 files) - immediate user feedback
        const chunk1Size = 100
        const chunk1Files = allFiles.slice(0, chunk1Size)
        uploadQueue.value = processFileChunk(chunk1Files)
        
        uiUpdateProgress.value = {
          current: chunk1Size,
          total: totalFiles,
          percentage: Math.round((chunk1Size / totalFiles) * 100),
          phase: 'loading'
        }
        
        // Brief delay to let user see the initial files and get visual feedback
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // CHUNK 2: Full render of ALL files
        uploadQueue.value = processFileChunk(allFiles)
        
        uiUpdateProgress.value = {
          current: totalFiles,
          total: totalFiles,
          percentage: 100,
          phase: 'complete'
        }
      }
      
      // Wait for Vue to complete DOM rendering
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    
    logProcessingTime('ALL_FILES_DISPLAYED')
    
    // Clean up legacy timing variables
    if (window.endToEndStartTime) {
      window.endToEndStartTime = null
    }
    if (window.folderProcessingStartTime) {
      window.folderProcessingStartTime = null
    }
    
    // Complete the UI update process
    isProcessingUIUpdate.value = false
    
    // Reset processing progress when complete
    resetProgress()
  }

  // Legacy method - maintains backward compatibility
  const updateUploadQueue = async (readyFiles, duplicateFiles) => {
    await updateFromWorkerResults(readyFiles, duplicateFiles)
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
    initializeQueueInstantly, // New method for instant queue display
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