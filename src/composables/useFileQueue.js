import { ref, nextTick } from 'vue'
import { logProcessingTime } from '../utils/processingTimer.js'
import { useFileQueueCore } from './useFileQueueCore'

export function useFileQueue() {
  // Initialize core queue management
  const queueCore = useFileQueueCore()

  // Time monitoring for cloud file detection
  let timeWarningInstance = null

  // UI-specific reactive data
  const showSingleFileNotification = ref(false)
  const singleFileNotification = ref({ message: '', color: 'info' })
  
  // Progress state tracking
  const processingProgress = ref({
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
    phase: 'loading' // 'loading', 'awaiting-upload', 'complete'
  })

  // Upload status tracking
  const uploadStatus = ref({
    successful: 0,
    failed: 0,
    previouslyUploaded: 0,
    isUploading: false,
    isPaused: false,
    pauseRequested: false,
    currentFile: null,
    currentAction: null, // 'calculating_hash', 'checking_existing', 'uploading'
    currentUploadIndex: 0
  })

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

  // Set phase to complete (called when upload actually starts)
  const setPhaseComplete = () => {
    uiUpdateProgress.value.phase = 'complete'
  }

  // Upload status management
  const resetUploadStatus = () => {
    uploadStatus.value = {
      successful: 0,
      failed: 0,
      previouslyUploaded: 0,
      isUploading: false,
      isPaused: false,
      pauseRequested: false,
      currentFile: null,
      currentAction: null,
      currentUploadIndex: 0
    }
  }

  // Individual file status update function
  const updateFileStatus = (fileReference, status) => {
    // Support both file object and filename for backward compatibility
    let file;
    if (typeof fileReference === 'string') {
      // Legacy filename-based lookup (less reliable but kept for compatibility)
      file = queueCore.uploadQueue.value.find(f => f.name === fileReference)
    } else if (fileReference && typeof fileReference === 'object') {
      // Direct file object reference (preferred approach)
      file = fileReference
    }
    
    if (file) {
      file.status = status
    }
  }

  // Update all ready files to "ready" status after deduplication completes
  const updateAllFilesToReady = () => {
    queueCore.uploadQueue.value.forEach(file => {
      if (!file.isDuplicate && (!file.status || file.status === 'pending')) {
        file.status = 'ready'
      }
    })
  }

  const updateUploadStatus = (type, fileName = null, action = null) => {
    switch (type) {
      case 'start':
        uploadStatus.value.isUploading = true
        uploadStatus.value.isPaused = false
        uploadStatus.value.pauseRequested = false
        break
      case 'complete':
        uploadStatus.value.isUploading = false
        uploadStatus.value.isPaused = false
        uploadStatus.value.pauseRequested = false
        uploadStatus.value.currentFile = null
        uploadStatus.value.currentAction = null
        uploadStatus.value.currentUploadIndex = 0
        break
      case 'pause':
        uploadStatus.value.isPaused = true
        uploadStatus.value.isUploading = false
        uploadStatus.value.pauseRequested = false
        break
      case 'resume':
        uploadStatus.value.isPaused = false
        uploadStatus.value.isUploading = true
        uploadStatus.value.pauseRequested = false
        break
      case 'requestPause':
        uploadStatus.value.pauseRequested = true
        break
      case 'successful':
        uploadStatus.value.successful++
        break
      case 'failed':
        uploadStatus.value.failed++
        break
      case 'previouslyUploaded':
        uploadStatus.value.previouslyUploaded++
        break
      case 'currentFile':
        uploadStatus.value.currentFile = fileName
        uploadStatus.value.currentAction = action
        break
      case 'setUploadIndex':
        uploadStatus.value.currentUploadIndex = fileName // reusing fileName param for index
        break
    }
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
    
    queueCore.uploadQueue.value = initialFiles
    
    if (totalFiles <= 100) {
      uiUpdateProgress.value = {
        current: totalFiles,
        total: totalFiles,
        percentage: 100,
        phase: 'awaiting-upload'
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
      queueCore.uploadQueue.value = queueCore.processFileChunk(allFiles)
      
      uiUpdateProgress.value = {
        current: totalFiles,
        total: totalFiles,
        percentage: 100,
        phase: 'awaiting-upload'
      }
      
      // Wait for Vue to complete DOM rendering for single chunk
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
    } else {
      // For large file sets, check if queue was already initialized instantly
      if (queueCore.uploadQueue.value.length > 0) {
        // Queue was already initialized with first 100 files
        // Ensure minimum loading display time (at least 1.5 seconds for spinner visibility)
        const minLoadingTime = 1500
        const elapsedTime = window.instantQueueStartTime ? Date.now() - window.instantQueueStartTime : 0
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime)
        
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime))
        }
        
        // Then replace with full processed results
        queueCore.uploadQueue.value = queueCore.processFileChunk(allFiles)
        
        uiUpdateProgress.value = {
          current: totalFiles,
          total: totalFiles,
          percentage: 100,
          phase: 'awaiting-upload'
        }
        
        // Clean up timestamp
        window.instantQueueStartTime = null
      } else {
        // Fallback to original 2-chunk strategy if queue wasn't pre-initialized
        // CHUNK 1: Initial batch (first 100 files) - immediate user feedback
        const chunk1Size = 100
        const chunk1Files = allFiles.slice(0, chunk1Size)
        queueCore.uploadQueue.value = queueCore.processFileChunk(chunk1Files)
        
        uiUpdateProgress.value = {
          current: chunk1Size,
          total: totalFiles,
          percentage: Math.round((chunk1Size / totalFiles) * 100),
          phase: 'loading'
        }
        
        // Brief delay to let user see the initial files and get visual feedback
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // CHUNK 2: Full render of ALL files
        queueCore.uploadQueue.value = queueCore.processFileChunk(allFiles)
        
        uiUpdateProgress.value = {
          current: totalFiles,
          total: totalFiles,
          percentage: 100,
          phase: 'awaiting-upload'
        }
      }
      
      // Wait for Vue to complete DOM rendering
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    
    logProcessingTime('ALL_FILES_DISPLAYED')
    
    // Clean up timing variables
    if (window.endToEndStartTime) {
      window.endToEndStartTime = null
    }
    if (window.folderProcessingStartTime) {
      window.folderProcessingStartTime = null
    }
    
    // Complete the UI update process
    isProcessingUIUpdate.value = false
    
    // Stop time monitoring when processing completes
    if (timeWarningInstance) {
      timeWarningInstance.stopMonitoring()
    }
    
    // Reset processing progress when complete
    resetProgress()
  }

  // Legacy method - maintains backward compatibility
  const updateUploadQueue = async (readyFiles, duplicateFiles) => {
    await updateFromWorkerResults(readyFiles, duplicateFiles)
  }

  // Time monitoring integration
  const setTimeWarningInstance = (instance) => {
    timeWarningInstance = instance
  }
  
  const startTimeMonitoring = (estimatedDurationMs) => {
    if (timeWarningInstance && estimatedDurationMs > 0) {
      timeWarningInstance.startMonitoring(estimatedDurationMs)
    }
  }
  
  const stopTimeMonitoring = () => {
    if (timeWarningInstance) {
      timeWarningInstance.stopMonitoring()
    }
  }
  
  const abortProcessing = () => {
    if (timeWarningInstance) {
      timeWarningInstance.abortProcessing()
    }
    resetProgress()
    resetUIProgress()
  }

  // Utility functions
  const showNotification = (message, color = 'info') => {
    singleFileNotification.value = { message, color }
    showSingleFileNotification.value = true
  }

  // Enhanced clearQueue with comprehensive cleanup
  const clearQueue = () => {
    try {
      console.log('Starting comprehensive cleanup...')
      
      // 1. Stop time monitoring and progress bar
      try {
        if (timeWarningInstance) {
          timeWarningInstance.abortProcessing()
        }
      } catch (error) {
        console.warn('Error stopping time monitoring:', error)
      }
      
      // 2. Reset processing states (idempotent operations)
      try {
        resetProgress()
        resetUIProgress()
        isProcessingUIUpdate.value = false
      } catch (error) {
        console.warn('Error resetting progress states:', error)
      }
      
      // 3. Clear timing variables (safe operations)
      try {
        if (window.endToEndStartTime) window.endToEndStartTime = null
        if (window.folderProcessingStartTime) window.folderProcessingStartTime = null
        if (window.instantQueueStartTime) window.instantQueueStartTime = null
      } catch (error) {
        console.warn('Error clearing timing variables:', error)
      }
      
      // 4. Clear file queue (delegate to core) - always attempt this
      try {
        queueCore.clearQueue()
      } catch (error) {
        console.error('Error clearing file queue:', error)
        // Fallback: directly clear uploadQueue if core fails
        try {
          queueCore.uploadQueue.value = []
        } catch (fallbackError) {
          console.error('Fallback clearQueue also failed:', fallbackError)
        }
      }
      
      console.log('Comprehensive cleanup completed successfully')
    } catch (error) {
      console.error('Error during comprehensive clearQueue cleanup:', error)
      // Ensure basic cleanup even if advanced cleanup fails
      try {
        queueCore.clearQueue()
      } catch (fallbackError) {
        console.error('Fallback clearQueue failed:', fallbackError)
      }
    }
  }

  return {
    // Reactive data (from core + UI-specific)
    uploadQueue: queueCore.uploadQueue,
    showSingleFileNotification,
    singleFileNotification,
    fileInput: queueCore.fileInput,
    folderInput: queueCore.folderInput,
    processingProgress,
    isProcessingUIUpdate,
    uiUpdateProgress,
    uploadStatus,

    // Core methods (delegated to core)
    getFilePath: queueCore.getFilePath,
    triggerFileSelect: queueCore.triggerFileSelect,
    triggerFolderSelect: queueCore.triggerFolderSelect,
    processSingleFile: queueCore.processSingleFile,
    addFilesToQueue: queueCore.addFilesToQueue,
    processFileChunk: queueCore.processFileChunk,
    removeFromQueue: queueCore.removeFromQueue,
    clearQueue, // Use our enhanced clearQueue instead of delegating
    startUpload: queueCore.startUpload,

    // UI coordination methods
    initializeQueueInstantly, // New method for instant queue display
    updateUploadQueue, // Legacy compatibility
    updateFromWorkerResults, // New worker-optimized method
    updateProgress,
    resetProgress,
    resetUIProgress,
    showNotification,
    
    // Time monitoring methods
    setTimeWarningInstance,
    startTimeMonitoring,
    stopTimeMonitoring,
    abortProcessing,
    setPhaseComplete,

    // Upload status methods
    resetUploadStatus,
    updateUploadStatus,
    updateFileStatus,
    updateAllFilesToReady
  }
}