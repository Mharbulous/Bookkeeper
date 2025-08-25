import { ref } from 'vue'
import { startProcessingTimer } from '../utils/processingTimer.js'
import { useFolderAnalysis } from './useFolderAnalysis.js'
import { useFolderProgress } from './useFolderProgress.js'
import { useFolderTimeouts } from './useFolderTimeouts.js'

export function useFolderOptions() {
  // Initialize sub-composables
  const { preprocessFileData, hasSubfoldersQuick, readDirectoryRecursive } = useFolderAnalysis()
  const { 
    mainFolderProgress, allFilesProgress, mainFolderComplete, allFilesComplete,
    isAnalyzingMainFolder, isAnalyzingAllFiles, performDualAnalysis, resetProgress
  } = useFolderProgress()
  const {
    analysisTimedOut, timeoutError, initializeTimeoutForDirectoryEntry, initializeTimeoutForFiles,
    clearAnalysisTimeout, resetTimeoutState, shouldContinueAnalysis
  } = useFolderTimeouts()
  
  // Main reactive data
  const showFolderOptions = ref(false)
  const includeSubfolders = ref(false)
  const pendingFolderFiles = ref([])
  const subfolderCount = ref(0)
  
  // Analysis state
  const isAnalyzing = ref(false)
  const mainFolderAnalysis = ref(null)
  const allFilesAnalysis = ref(null)




  
  // Main analysis function that coordinates both main folder and all files analysis
  const analyzeFilesForOptions = async () => {
    if (pendingFolderFiles.value.length === 0) return
    
    // Check if already timed out before proceeding
    if (!shouldContinueAnalysis()) {
      return
    }
    
    try {
      // Use the progress module to perform dual analysis
      await performDualAnalysis(pendingFolderFiles.value, mainFolderAnalysis, allFilesAnalysis, analysisTimedOut)
      
      // Clear timeout on successful completion
      clearAnalysisTimeout()
      
      // Update subfolder count
      const { folderStats } = preprocessFileData(pendingFolderFiles.value)
      subfolderCount.value = folderStats.rootFolderCount
      
    } catch (error) {
      console.error('Error analyzing files for folder options:', error)
      clearAnalysisTimeout()
      // Fallback analysis is handled in performDualAnalysis
    } finally {
      // Only clear analyzing state if not timed out (timeout handler clears it)
      if (shouldContinueAnalysis()) {
        isAnalyzing.value = false
      }
    }
  }

  // Background analysis chain - runs after modal is displayed
  const performBackgroundAnalysis = async (files, addFilesToQueueCallback = null) => {
    try {
      // Check if already timed out before starting analysis
      if (!shouldContinueAnalysis()) {
        return { hasSubfolders: true }
      }
      
      // Step 1: Quick subfolder detection (can hide modal if no subfolders)
      const subfolderResult = hasSubfoldersQuick(files)
      
      if (!subfolderResult) {
        // Clear timeout since we're successfully completing
        clearAnalysisTimeout()
        
        showFolderOptions.value = false
        isAnalyzing.value = false
        
        // Auto-process files if callback provided
        if (addFilesToQueueCallback) {
          const filesWithPath = files.map(f => {
            f.file.path = f.path
            return f.file
          })
          addFilesToQueueCallback(filesWithPath)
          pendingFolderFiles.value = []
        }
        
        return { hasSubfolders: false }
      }
      
      // Step 2: Run the new chunked analysis
      await analyzeFilesForOptions()
      
    } catch (error) {
      console.error('Background analysis failed:', error)
      // Don't clear isAnalyzing here if timed out - let timeout handler manage state
      if (shouldContinueAnalysis()) {
        isAnalyzing.value = false
      }
    }
    
    return { hasSubfolders: true }
  }

  // Show modal immediately, calculate later - KISS solution  
  const showFolderOptionsWithAnalysis = (files, addFilesToQueueCallback = null) => {
    // SHOW MODAL FIRST - no conditions, no calculations
    showFolderOptions.value = true
    console.log("T = 0")
    console.log("DEBUG: showFolderOptionsWithAnalysis called with", files ? files.length : 'no files', 'files')
    window.folderOptionsStartTime = performance.now()
    isAnalyzing.value = true
    
    // Reset all values to show initial state
    mainFolderAnalysis.value = null
    allFilesAnalysis.value = null
    resetProgress()
    includeSubfolders.value = false
    resetTimeoutState()
    
    // Initialize timeout monitoring for file list
    initializeTimeoutForFiles(files, pendingFolderFiles, isAnalyzing, isAnalyzingMainFolder, isAnalyzingAllFiles)
    
    // Store files for analysis
    if (files) {
      pendingFolderFiles.value = files
    }
    
    // Use a brief delay to ensure modal renders first
    setTimeout(() => {
      performBackgroundAnalysis(pendingFolderFiles.value, addFilesToQueueCallback)
    }, 100)
  }



  const processFolderEntry = async (dirEntry, addFilesToQueue) => {
    // SHOW MODAL IMMEDIATELY - don't wait for file reading
    showFolderOptions.value = true
    console.log("T = 0")
    console.log("DEBUG: processFolderEntry called with dirEntry:", dirEntry.name)
    window.folderOptionsStartTime = performance.now()
    isAnalyzing.value = true
    
    // Reset all values to show initial state
    mainFolderAnalysis.value = null
    allFilesAnalysis.value = null
    resetProgress()
    includeSubfolders.value = false
    resetTimeoutState()
    
    // Initialize timeout monitoring for directory entry
    initializeTimeoutForDirectoryEntry(dirEntry, pendingFolderFiles, isAnalyzing, isAnalyzingMainFolder, isAnalyzingAllFiles)
    
    try {
      // Read files in background - this is where cloud files often get stuck
      console.log("DEBUG: Starting readDirectoryRecursive...")
      const files = await readDirectoryRecursive(dirEntry)
      console.log("DEBUG: readDirectoryRecursive completed with", files.length, "files")
      
      // Check if timeout occurred during file reading
      if (!shouldContinueAnalysis()) {
        console.log("DEBUG: Timeout already occurred, not proceeding with analysis")
        return
      }
      
      // Store files and start analysis
      console.log("DEBUG: Setting pendingFolderFiles.value to", files.length, "files")
      pendingFolderFiles.value = files
      performBackgroundAnalysis(files, addFilesToQueue)
    } catch (error) {
      console.error('Error reading directory:', error)
      // If reading fails, let the timeout handle it
    }
  }

  const processFolderFiles = (files, addFilesToQueueCallback = null) => {
    // Convert to our standard format
    const fileDataArray = files.map(file => ({
      file,
      path: file.webkitRelativePath
    }))
    
    // Show modal immediately - let background analysis determine if subfolders exist
    showFolderOptionsWithAnalysis(fileDataArray, addFilesToQueueCallback)
    
    // Return null to indicate modal handling is in progress
    // Caller should not proceed with direct file processing
    return null
  }

  // Folder options handlers
  const confirmFolderOptions = (addFilesToQueue) => {
    const processingStartTime = Date.now()
    let filesToAdd = pendingFolderFiles.value
    
    if (!includeSubfolders.value) {
      // Use preprocessed data to filter main folder files (no more path parsing!)
      const { preprocessedFiles } = preprocessFileData(pendingFolderFiles.value)
      filesToAdd = preprocessedFiles.filter(f => f.isMainFolder)
    }
    
    // Start the processing timer and log T=0
    startProcessingTimer()
    
    // Preserve path information when adding files to queue
    const filesWithPath = filesToAdd.map(f => {
      f.file.path = f.path
      return f.file
    })
    
    // Store processing start time for performance measurement
    window.folderProcessingStartTime = processingStartTime
    
    addFilesToQueue(filesWithPath)
    
    showFolderOptions.value = false
    pendingFolderFiles.value = []
  }

  const cancelFolderUpload = () => {
    showFolderOptions.value = false
    pendingFolderFiles.value = []
    
    // Clear timeout and reset state
    clearAnalysisTimeout()
    resetTimeoutState()
  }

  return {
    // Reactive data
    showFolderOptions,
    includeSubfolders,
    pendingFolderFiles,
    subfolderCount,
    
    // Analysis state
    isAnalyzing,
    mainFolderAnalysis,
    allFilesAnalysis,
    
    // Timeout state (from timeout module)
    analysisTimedOut,
    timeoutError,
    
    // Progress tracking (from progress module)
    mainFolderProgress,
    allFilesProgress,
    mainFolderComplete,
    allFilesComplete,
    isAnalyzingMainFolder,
    isAnalyzingAllFiles,

    // Methods
    processFolderEntry,
    processFolderFiles,
    confirmFolderOptions,
    cancelFolderUpload,
    analyzeFilesForOptions,
    showFolderOptionsWithAnalysis,
    performBackgroundAnalysis,
    
    // Expose methods from sub-modules
    readDirectoryRecursive,
    hasSubfoldersQuick
  }
}