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

  // When worker sends results, replace entire array (triggers reactivity)
  const updateFromWorkerResults = (readyFiles, duplicateFiles) => {
    // Build new array and replace entire reference
    const newQueue = [
      ...readyFiles.map(fileRef => ({
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
        isDuplicate: false
      })),
      ...duplicateFiles.map(fileRef => ({
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
        isDuplicate: true
      }))
    ]
    
    // Replace entire array reference (triggers reactivity)
    uploadQueue.value = newQueue
    
    // Reset progress when complete
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
    removeFromQueue,
    clearQueue,
    startUpload,
    showNotification
  }
}