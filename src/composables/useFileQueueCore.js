import { ref, shallowRef } from 'vue'

export function useFileQueueCore() {
  
  // Reactive data - Use shallowRef for better performance with large file arrays
  const uploadQueue = shallowRef([])

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
        isDuplicate: fileRef.status === 'uploadMetadataOnly'
      }
      
      // Only include hash if it was calculated during deduplication process
      if (fileRef.hash) {
        queueItem.hash = fileRef.hash
      }
      
      return queueItem
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

  return {
    // Reactive data
    uploadQueue,
    fileInput,
    folderInput,

    // Core methods
    getFilePath,
    triggerFileSelect,
    triggerFolderSelect,
    processSingleFile,
    addFilesToQueue,
    processFileChunk,
    removeFromQueue,
    clearQueue,
    startUpload
  }
}