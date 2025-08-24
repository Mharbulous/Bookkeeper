import { ref, watch, nextTick } from 'vue'
import { analyzeFiles } from '../utils/fileAnalysis.js'
import { startProcessingTimer } from '../utils/processingTimer.js'

export function useFolderOptions() {
  // Reactive data
  const showFolderOptions = ref(false)
  const includeSubfolders = ref(true)
  const pendingFolderFiles = ref([])
  const subfolderCount = ref(0)
  
  // Analysis state
  const isAnalyzing = ref(false)
  const mainFolderAnalysis = ref(null)
  const allFilesAnalysis = ref(null)

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

  // Analysis function
  const analyzeFilesForOptions = async () => {
    if (pendingFolderFiles.value.length === 0) return
    
    isAnalyzing.value = true
    
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
      
      // Calculate other metrics using the separated file arrays
      const allFilesMetrics = calculateFileSizeMetrics(pendingFolderFiles.value)
      const filenameStats = calculateFilenameStats(pendingFolderFiles.value)
      
      // Analyze both sets concurrently (these will log TIME_ESTIMATION_FORMULA for each)
      const [allFilesResult, mainFolderResult] = await Promise.all([
        Promise.resolve(analyzeFiles(allFiles, allFilesDirectoryStats.totalDirectoryCount, allFilesDirectoryStats.avgDirectoryDepth, allFilesDirectoryStats.avgFileDepth)),
        Promise.resolve(analyzeFiles(mainFolderFiles, mainFolderDirectoryStats.totalDirectoryCount, mainFolderDirectoryStats.avgDirectoryDepth, mainFolderDirectoryStats.avgFileDepth))
      ])
      
      // Log prediction-ready data (matches Folder Upload Options modal display)
      // Using JSON.stringify to prevent browser console truncation
      const analysisData = {
        timestamp: Date.now(),
        
        // Core predictors for 3-phase estimation (from Modal Display)
        totalFiles: allFilesResult.totalFiles,
        duplicateCandidateCount: allFilesResult.duplicateCandidates,
        duplicateCandidatePercent: allFilesResult.estimatedDuplicationPercent,
        uniqueFilesSizeMB: allFilesResult.uniqueFilesSizeMB,
        duplicateCandidatesSizeMB: allFilesResult.duplicateCandidatesSizeMB,
        totalSizeMB: allFilesResult.totalSizeMB,
        totalDirectoryCount: allFilesResult.totalDirectoryCount,
        avgDirectoryDepth: allFilesDirectoryStats.avgDirectoryDepth,
        maxDirectoryDepth: allFilesDirectoryStats.maxDirectoryDepth,
        
        // Additional predictors
        uniqueFilesTotal: allFilesResult.uniqueFiles,
        maxFileDepth: allFilesDirectoryStats.maxFileDepth,
        avgFileDepth: allFilesDirectoryStats.avgFileDepth,
        avgFilenameLength: filenameStats.avgFilenameLength,
        zeroByteFiles: allFilesMetrics.zeroByteFiles,
        largestFileSizesMB: allFilesMetrics.largestFileSizesMB
      }
      
      console.log(`🔬 FOLDER_ANALYSIS_DATA: ${JSON.stringify(analysisData)}`)
      
      // Update subfolder count now that we've done full analysis
      const { folderStats } = preprocessFileData(pendingFolderFiles.value)
      subfolderCount.value = folderStats.rootFolderCount
      
      allFilesAnalysis.value = allFilesResult
      mainFolderAnalysis.value = mainFolderResult
      
      
    } catch (error) {
      console.error('Error analyzing files for folder options:', error)
      // Set fallback analysis
      allFilesAnalysis.value = analyzeFiles([], 0, 0, 0)
      mainFolderAnalysis.value = analyzeFiles([], 0, 0, 0)
    } finally {
      isAnalyzing.value = false
    }
  }

  // Background analysis chain - runs after modal is displayed
  const performBackgroundAnalysis = async (files, addFilesToQueueCallback = null) => {
    console.log('🔍 BACKGROUND: Starting analysis with', files.length, 'files')
    
    try {
      // Step 1: Quick subfolder detection (can hide modal if no subfolders)
      const subfolderResult = hasSubfoldersQuick(files)
      console.log('📁 SUBFOLDER CHECK:', subfolderResult ? 'Has subfolders' : 'No subfolders')
      
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
      
      // Step 2: Ensure spinner shows for at least 500ms before analysis completes
      console.log('📊 ANALYSIS: Starting full file analysis')
      const analysisStartTime = Date.now()
      
      // Run analysis
      await analyzeFilesForOptions()
      
      // Calculate how long analysis took
      const analysisTime = Date.now() - analysisStartTime
      const minSpinnerTime = 500 // Minimum time to show spinner
      
      if (analysisTime < minSpinnerTime) {
        const remainingTime = minSpinnerTime - analysisTime
        console.log(`⏳ SPINNER: Analysis took ${analysisTime}ms, waiting ${remainingTime}ms more for user feedback`)
        await new Promise(resolve => setTimeout(resolve, remainingTime))
      }
      
      console.log('✅ ANALYSIS: Complete - showing calculated values')
      
    } catch (error) {
      console.error('Background analysis failed:', error)
      isAnalyzing.value = false
    }
    
    return { hasSubfolders: true }
  }

  // Show modal immediately, calculate later - KISS solution
  const showFolderOptionsWithAnalysis = (files, addFilesToQueueCallback = null) => {
    console.log('🚀 INSTANT: Showing modal immediately')
    
    // SHOW MODAL FIRST - no conditions, no calculations
    showFolderOptions.value = true
    isAnalyzing.value = true
    
    // Reset all values to show spinners
    mainFolderAnalysis.value = null
    allFilesAnalysis.value = null
    
    console.log('✅ INSTANT: Modal state set, analysis values reset to null')
    
    // Store files for analysis
    if (files) {
      pendingFolderFiles.value = files
    }
    
    // Use a longer delay to ensure modal actually renders
    setTimeout(() => {
      console.log('⏰ DELAYED: Starting background analysis after 200ms')
      performBackgroundAnalysis(pendingFolderFiles.value, addFilesToQueueCallback)
    }, 200)
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
    console.log('📁 FOLDER DROP: Starting to process folder entry')
    
    // SHOW MODAL IMMEDIATELY - don't wait for file reading
    showFolderOptions.value = true
    isAnalyzing.value = true
    mainFolderAnalysis.value = null
    allFilesAnalysis.value = null
    
    console.log('✅ INSTANT: Modal shown immediately, now reading files in background')
    
    // Read files in background
    const files = await readDirectoryRecursive(dirEntry)
    console.log('📂 FILES READ: Got', files.length, 'files, starting analysis')
    
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
    
    // Store processing start time for legacy timing (can be removed later)
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