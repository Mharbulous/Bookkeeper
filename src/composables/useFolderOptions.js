import { ref, watch, nextTick } from 'vue'
import { analyzeFiles } from '../utils/fileAnalysis.js'
import { startProcessingTimer } from '../utils/processingTimer.js'
import { storeHardwarePerformanceFactor } from '../utils/hardwareCalibration.js'

export function useFolderOptions() {
  // Reactive data
  const showFolderOptions = ref(false)
  const includeSubfolders = ref(false)
  const pendingFolderFiles = ref([])
  const subfolderCount = ref(0)
  
  // Analysis state
  const isAnalyzing = ref(false)
  const mainFolderAnalysis = ref(null)
  const allFilesAnalysis = ref(null)
  
  // Progress tracking for chunked processing
  const mainFolderProgress = ref({ filesProcessed: 0, totalFiles: 0 })
  const allFilesProgress = ref({ filesProcessed: 0, totalFiles: 0 })
  const mainFolderComplete = ref(false)
  const allFilesComplete = ref(false)
  const isAnalyzingMainFolder = ref(false)
  const isAnalyzingAllFiles = ref(false)

  // Single preprocessing function to parse all paths once and extract all needed information
  const preprocessFileData = (files) => {
    const directories = new Map() // directory path -> depth
    const fileDepths = []
    const rootFolders = new Set()
    const preprocessedFiles = []
    let hasSubfolders = false
    
    files.forEach(fileData => {
      // Parse path once and extract all information
      const pathParts = fileData.path.split('/').filter(part => part !== '')
      const fileDepth = pathParts.length - 1 // Subtract 1 because last part is filename
      const isMainFolder = pathParts.length === 2 // Exactly 2 parts: folder/file (no subfolders)
      
      // Track root folders and subfolder detection
      rootFolders.add(pathParts[0])
      if (pathParts.length > 2) {
        hasSubfolders = true
      }
      
      // Collect file depth for file depth stats
      fileDepths.push(fileDepth)
      
      // Add unique directory paths (all levels) with their depths
      const dirParts = pathParts.slice(0, -1) // Remove filename
      for (let i = 1; i <= dirParts.length; i++) {
        const dirPath = dirParts.slice(0, i).join('/')
        const dirDepth = i // Directory depth is its level in the hierarchy
        directories.set(dirPath, dirDepth)
      }
      
      // Store preprocessed file data
      preprocessedFiles.push({
        ...fileData,
        pathParts,
        fileDepth,
        isMainFolder,
        dirParts
      })
    })
    
    // Calculate directory and file depth statistics
    const maxFileDepth = fileDepths.length > 0 ? Math.max(...fileDepths) : 0
    const avgFileDepth = fileDepths.length > 0 ? fileDepths.reduce((sum, d) => sum + d, 0) / fileDepths.length : 0
    
    const directoryDepths = Array.from(directories.values())
    const avgDirectoryDepth = directoryDepths.length > 0 ? directoryDepths.reduce((sum, d) => sum + d, 0) / directoryDepths.length : 0
    
    return {
      preprocessedFiles,
      directoryStats: {
        totalDirectoryCount: directories.size,
        maxFileDepth: maxFileDepth,
        avgFileDepth: Math.round(avgFileDepth * 10) / 10,
        avgDirectoryDepth: Math.round(avgDirectoryDepth * 10) / 10
      },
      folderStats: {
        rootFolderCount: rootFolders.size,
        hasSubfolders
      }
    }
  }

  const calculateFileSizeMetrics = (files) => {
    const fileSizes = files.map(f => f.file.size)
    const totalSizeMB = fileSizes.reduce((sum, size) => sum + size, 0) / (1024 * 1024)
    
    // Group files by size to find identical sizes
    const sizeGroups = new Map()
    fileSizes.forEach(size => {
      sizeGroups.set(size, (sizeGroups.get(size) || 0) + 1)
    })
    
    const uniqueFiles = Array.from(sizeGroups.values()).filter(count => count === 1).length
    const identicalSizeFiles = fileSizes.length - uniqueFiles
    const zeroByteFiles = fileSizes.filter(size => size === 0).length
    
    // Get top 5 largest files
    const sortedSizes = [...fileSizes].sort((a, b) => b - a)
    const largestFileSizesMB = sortedSizes.slice(0, 5).map(size => Math.round((size / (1024 * 1024)) * 10) / 10)
    
    return {
      totalSizeMB: Math.round(totalSizeMB * 10) / 10,
      uniqueFiles,
      identicalSizeFiles,
      zeroByteFiles,
      largestFileSizesMB
    }
  }

  const calculateFilenameStats = (files) => {
    const filenameLengths = files.map(f => f.path.length)
    const avgFilenameLength = filenameLengths.length > 0 
      ? Math.round((filenameLengths.reduce((sum, len) => sum + len, 0) / filenameLengths.length) * 10) / 10 
      : 0
    
    return { avgFilenameLength }
  }

  // Chunked analysis function for better UI responsiveness
  const analyzeFilesChunked = async (files, fileData, directoryStats, chunkSize = 1000, progressRef, isAnalyzingRef, resultRef) => {
    if (!files || files.length === 0) {
      resultRef.value = analyzeFiles([], 0, 0, 0)
      return
    }

    isAnalyzingRef.value = true
    progressRef.value = { filesProcessed: 0, totalFiles: files.length }
    
    try {
      // For small sets, process all at once
      if (files.length <= chunkSize) {
        resultRef.value = analyzeFiles(files, directoryStats.totalDirectoryCount, directoryStats.avgDirectoryDepth, directoryStats.avgFileDepth)
        progressRef.value = { filesProcessed: files.length, totalFiles: files.length }
        return
      }
      
      // For larger sets, process in chunks to allow UI updates
      let processedFiles = []
      for (let i = 0; i < files.length; i += chunkSize) {
        const chunk = files.slice(i, i + chunkSize)
        processedFiles.push(...chunk)
        
        // Update progress
        progressRef.value = { filesProcessed: processedFiles.length, totalFiles: files.length }
        
        // Calculate analysis on processed files so far
        resultRef.value = analyzeFiles(processedFiles, directoryStats.totalDirectoryCount, directoryStats.avgDirectoryDepth, directoryStats.avgFileDepth)
        
        // Allow UI to update between chunks
        if (i + chunkSize < files.length) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }
      
    } catch (error) {
      console.error('Error in chunked analysis:', error)
      resultRef.value = analyzeFiles([], 0, 0, 0)
    }
  }
  
  // Main analysis function that coordinates both main folder and all files analysis
  const analyzeFilesForOptions = async () => {
    if (pendingFolderFiles.value.length === 0) return
    
    isAnalyzing.value = true
    mainFolderComplete.value = false
    allFilesComplete.value = false
    
    try {
      // Single preprocessing pass - parse all paths once and extract everything
      const { preprocessedFiles, directoryStats: allFilesDirectoryStats } = preprocessFileData(pendingFolderFiles.value)
      
      // Separate files based on preprocessed data (no more path parsing!)
      const allFiles = []
      const mainFolderFiles = []
      const mainFolderFileData = []
      
      preprocessedFiles.forEach(fileData => {
        allFiles.push(fileData.file)
        
        if (fileData.isMainFolder) {
          mainFolderFiles.push(fileData.file)
          mainFolderFileData.push(fileData)
        }
      })
      
      // Calculate directory stats for main folder subset using preprocessed data
      const mainFolderDirectoryStats = preprocessFileData(mainFolderFileData).directoryStats
      
      // Calculate other metrics for logging
      const allFilesMetrics = calculateFileSizeMetrics(pendingFolderFiles.value)
      const filenameStats = calculateFilenameStats(pendingFolderFiles.value)
      
      // Start main folder analysis first (faster, enables Continue button sooner)
      const mainFolderPromise = analyzeFilesChunked(
        mainFolderFiles, 
        mainFolderFileData, 
        mainFolderDirectoryStats, 
        1000, 
        mainFolderProgress, 
        isAnalyzingMainFolder, 
        mainFolderAnalysis
      ).then(() => {
        mainFolderComplete.value = true
      })
      
      // Start all files analysis in parallel (slower, but starts immediately)
      const allFilesPromise = analyzeFilesChunked(
        allFiles, 
        preprocessedFiles, 
        allFilesDirectoryStats, 
        1000, 
        allFilesProgress, 
        isAnalyzingAllFiles, 
        allFilesAnalysis
      ).then(() => {
        allFilesComplete.value = true
        
        // Log analysis data when all files analysis is complete
        const analysisData = {
          timestamp: Date.now(),
          totalFiles: allFilesAnalysis.value.totalFiles,
          duplicateCandidateCount: allFilesAnalysis.value.duplicateCandidates,
          duplicateCandidatePercent: allFilesAnalysis.value.estimatedDuplicationPercent,
          uniqueFilesSizeMB: allFilesAnalysis.value.uniqueFilesSizeMB,
          duplicateCandidatesSizeMB: allFilesAnalysis.value.duplicateCandidatesSizeMB,
          totalSizeMB: allFilesAnalysis.value.totalSizeMB,
          totalDirectoryCount: allFilesAnalysis.value.totalDirectoryCount,
          avgDirectoryDepth: allFilesDirectoryStats.avgDirectoryDepth,
          maxDirectoryDepth: allFilesDirectoryStats.maxDirectoryDepth,
          uniqueFilesTotal: allFilesAnalysis.value.uniqueFiles,
          maxFileDepth: allFilesDirectoryStats.maxFileDepth,
          avgFileDepth: allFilesDirectoryStats.avgFileDepth,
          avgFilenameLength: filenameStats.avgFilenameLength,
          zeroByteFiles: allFilesMetrics.zeroByteFiles,
          largestFileSizesMB: allFilesMetrics.largestFileSizesMB
        }
        
        // Hardware calibration data stored automatically during analysis
      })
      
      // Wait for both analyses to complete
      await Promise.all([mainFolderPromise, allFilesPromise])
      
      // Log elapsed time when all calculations are complete
      if (window.folderOptionsStartTime) {
        const elapsedTime = Math.round(performance.now() - window.folderOptionsStartTime)
        console.log(`T = ${elapsedTime}`)
        
        // Store hardware performance factor for calibration
        const totalFiles = allFilesAnalysis.value?.totalFiles || pendingFolderFiles.value.length
        if (totalFiles > 0 && elapsedTime > 0) {
          storeHardwarePerformanceFactor(totalFiles, elapsedTime, {
            totalSizeMB: allFilesAnalysis.value?.totalSizeMB || 0,
            duplicateCandidates: allFilesAnalysis.value?.duplicateCandidates || 0,
            avgDirectoryDepth: allFilesAnalysis.value?.breakdown?.avgDirectoryDepth || 0,
            timestamp: Date.now(),
            source: 'folder_analysis'
          })
        }
      }
      
      // Update subfolder count
      const { folderStats } = preprocessFileData(pendingFolderFiles.value)
      subfolderCount.value = folderStats.rootFolderCount
      
    } catch (error) {
      console.error('Error analyzing files for folder options:', error)
      // Set fallback analysis
      allFilesAnalysis.value = analyzeFiles([], 0, 0, 0)
      mainFolderAnalysis.value = analyzeFiles([], 0, 0, 0)
      mainFolderComplete.value = true
      allFilesComplete.value = true
    } finally {
      isAnalyzing.value = false
      isAnalyzingMainFolder.value = false
      isAnalyzingAllFiles.value = false
    }
  }

  // Background analysis chain - runs after modal is displayed
  const performBackgroundAnalysis = async (files, addFilesToQueueCallback = null) => {
    try {
      // Step 1: Quick subfolder detection (can hide modal if no subfolders)
      const subfolderResult = hasSubfoldersQuick(files)
      
      if (!subfolderResult) {
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
      isAnalyzing.value = false
    }
    
    return { hasSubfolders: true }
  }

  // Show modal immediately, calculate later - KISS solution  
  const showFolderOptionsWithAnalysis = (files, addFilesToQueueCallback = null) => {
    // SHOW MODAL FIRST - no conditions, no calculations
    showFolderOptions.value = true
    console.log("T = 0")
    window.folderOptionsStartTime = performance.now()
    isAnalyzing.value = true
    
    // Reset all values to show initial state
    mainFolderAnalysis.value = null
    allFilesAnalysis.value = null
    mainFolderProgress.value = { filesProcessed: 0, totalFiles: 0 }
    allFilesProgress.value = { filesProcessed: 0, totalFiles: 0 }
    mainFolderComplete.value = false
    allFilesComplete.value = false
    isAnalyzingMainFolder.value = false
    isAnalyzingAllFiles.value = false
    includeSubfolders.value = false
    
    // Store files for analysis
    if (files) {
      pendingFolderFiles.value = files
    }
    
    // Use a brief delay to ensure modal renders first
    setTimeout(() => {
      performBackgroundAnalysis(pendingFolderFiles.value, addFilesToQueueCallback)
    }, 100)
  }

  const readDirectoryRecursive = (dirEntry) => {
    return new Promise((resolve) => {
      const files = []
      const reader = dirEntry.createReader()
      
      const readEntries = () => {
        reader.readEntries(async (entries) => {
          if (entries.length === 0) {
            resolve(files)
            return
          }
          
          for (const entry of entries) {
            if (entry.isFile) {
              const file = await new Promise((resolve) => entry.file(resolve))
              files.push({ file, path: entry.fullPath })
            } else if (entry.isDirectory) {
              const subFiles = await readDirectoryRecursive(entry)
              files.push(...subFiles)
            }
          }
          
          readEntries() // Continue reading
        })
      }
      
      readEntries()
    })
  }

  // Lightweight subfolder detection - check only first few files
  const hasSubfoldersQuick = (files, maxCheck = 10) => {
    const checkCount = Math.min(files.length, maxCheck)
    for (let i = 0; i < checkCount; i++) {
      const pathParts = files[i].path.split('/').filter(part => part !== '')
      if (pathParts.length > 2) {
        return true
      }
    }
    return false
  }

  const processFolderEntry = async (dirEntry, addFilesToQueue) => {
    // SHOW MODAL IMMEDIATELY - don't wait for file reading
    showFolderOptions.value = true
    console.log("T = 0")
    window.folderOptionsStartTime = performance.now()
    isAnalyzing.value = true
    
    // Reset all values to show initial state
    mainFolderAnalysis.value = null
    allFilesAnalysis.value = null
    mainFolderProgress.value = { filesProcessed: 0, totalFiles: 0 }
    allFilesProgress.value = { filesProcessed: 0, totalFiles: 0 }
    mainFolderComplete.value = false
    allFilesComplete.value = false
    isAnalyzingMainFolder.value = false
    isAnalyzingAllFiles.value = false
    includeSubfolders.value = false
    
    // Read files in background
    const files = await readDirectoryRecursive(dirEntry)
    
    // Store files and start analysis
    pendingFolderFiles.value = files
    performBackgroundAnalysis(files, addFilesToQueue)
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
    
    // Progress tracking
    mainFolderProgress,
    allFilesProgress,
    mainFolderComplete,
    allFilesComplete,
    isAnalyzingMainFolder,
    isAnalyzingAllFiles,

    // Methods
    readDirectoryRecursive,
    processFolderEntry,
    processFolderFiles,
    confirmFolderOptions,
    cancelFolderUpload,
    analyzeFilesForOptions,
    showFolderOptionsWithAnalysis,
    performBackgroundAnalysis,
    hasSubfoldersQuick
  }
}