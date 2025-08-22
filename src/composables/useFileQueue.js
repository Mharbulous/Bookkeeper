import { ref } from 'vue'

export function useFileQueue() {
  // Reactive data
  const uploadQueue = ref([])
  const showSingleFileNotification = ref(false)
  const singleFileNotification = ref({ message: '', color: 'info' })

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

  const updateUploadQueue = (readyFiles, duplicateFiles) => {
    // Clear and rebuild queue
    uploadQueue.value = []
    
    // Add ready files (unique and chosen duplicates)
    readyFiles.forEach(fileRef => {
      uploadQueue.value.push({
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
      })
    })
    
    // Add duplicate files (to show user what was skipped)
    duplicateFiles.forEach(fileRef => {
      uploadQueue.value.push({
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
        isDuplicate: true,
      })
    })
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

    // Methods
    getFilePath,
    triggerFileSelect,
    triggerFolderSelect,
    processSingleFile,
    addFilesToQueue,
    updateUploadQueue,
    removeFromQueue,
    clearQueue,
    startUpload,
    showNotification
  }
}