import { ref, watch } from 'vue'
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

  // Helper functions for predictive metrics
  const calculateDirectoryStats = (files) => {
    // Single pass through files to calculate all directory metrics efficiently
    const directories = new Set()
    const depths = []
    
    files.forEach(f => {
      const pathParts = f.path.split('/').filter(part => part !== '')
      const depth = pathParts.length - 1 // Subtract 1 because last part is filename
      
      // Collect depth for stats
      depths.push(depth)
      
      // Add unique directory paths (all levels)
      const dirParts = pathParts.slice(0, -1) // Remove filename
      for (let i = 1; i <= dirParts.length; i++) {
        const dirPath = dirParts.slice(0, i).join('/')
        directories.add(dirPath)
      }
    })
    
    // Calculate depth statistics
    const maxDepth = depths.length > 0 ? Math.max(...depths) : 0
    const avgDepth = depths.length > 0 ? depths.reduce((sum, d) => sum + d, 0) / depths.length : 0
    
    return {
      totalDirectoryCount: directories.size,
      maxDirectoryDepth: maxDepth,
      avgDirectoryDepth: Math.round(avgDepth * 10) / 10
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
      // Single preprocessing pass - parse all paths once and separate files
      const allFiles = []
      const mainFolderFiles = []
      const mainFolderFileData = []
      
      pendingFolderFiles.value.forEach(fileData => {
        allFiles.push(fileData.file)
        
        const pathParts = fileData.path.split('/').filter(part => part !== '')
        const isMainFolder = pathParts.length === 2  // Exactly 2 parts: folder/file (no subfolders)
        
        if (isMainFolder) {
          mainFolderFiles.push(fileData.file)
          mainFolderFileData.push(fileData)
        }
      })
      
      // Calculate predictive metrics using pre-separated file arrays
      const allFilesMetrics = calculateFileSizeMetrics(pendingFolderFiles.value)
      const mainFolderMetrics = calculateFileSizeMetrics(mainFolderFileData)
      const allFilesDirectoryStats = calculateDirectoryStats(pendingFolderFiles.value)
      const mainFolderDirectoryStats = calculateDirectoryStats(mainFolderFileData)
      const filenameStats = calculateFilenameStats(pendingFolderFiles.value)
      
      // Analyze both sets concurrently (these will log TIME_ESTIMATION_FORMULA for each)
      const [allFilesResult, mainFolderResult] = await Promise.all([
        Promise.resolve(analyzeFiles(allFiles, allFilesDirectoryStats.totalDirectoryCount)),
        Promise.resolve(analyzeFiles(mainFolderFiles, mainFolderDirectoryStats.totalDirectoryCount))
      ])
      
      // Log prediction-ready data (matches Folder Upload Options modal display)  
      console.log(`🔬 FOLDER_ANALYSIS_DATA (Modal Predictors):`, {
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
        
        // Additional predictors
        uniqueFilesTotal: allFilesResult.uniqueFiles,
        maxDirectoryDepth: allFilesDirectoryStats.maxDirectoryDepth,
        avgFilenameLength: filenameStats.avgFilenameLength,
        zeroByteFiles: allFilesMetrics.zeroByteFiles,
        largestFileSizesMB: allFilesMetrics.largestFileSizesMB
      })
      
      allFilesAnalysis.value = allFilesResult
      mainFolderAnalysis.value = mainFolderResult
      
      
    } catch (error) {
      console.error('Error analyzing files for folder options:', error)
      // Set fallback analysis
      allFilesAnalysis.value = analyzeFiles([])
      mainFolderAnalysis.value = analyzeFiles([])
    } finally {
      isAnalyzing.value = false
    }
  }

  // Watch for when folder options dialog opens to trigger analysis
  watch(showFolderOptions, (newValue) => {
    if (newValue && pendingFolderFiles.value.length > 0) {
      analyzeFilesForOptions()
    }
  })

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

  const processFolderEntry = async (dirEntry, addFilesToQueue) => {
    const files = await readDirectoryRecursive(dirEntry)
    
    // Single pass to check for subfolders and count root folders
    const rootFolders = new Set()
    let hasSubfolders = false
    
    files.forEach(f => {
      const pathParts = f.path.split('/')
      rootFolders.add(pathParts[0])
      
      if (pathParts.length > 2) { // More than folder/file means subfolders exist
        hasSubfolders = true
      }
    })
    
    if (hasSubfolders) {
      pendingFolderFiles.value = files
      subfolderCount.value = rootFolders.size
      showFolderOptions.value = true
    } else {
      // Preserve path information when adding files to queue
      const filesWithPath = files.map(f => {
        f.file.path = f.path
        return f.file
      })
      await addFilesToQueue(filesWithPath)
    }
  }

  const processFolderFiles = (files) => {
    const hasSubfolders = files.some(file => file.webkitRelativePath.split('/').length > 2)
    
    if (hasSubfolders) {
      pendingFolderFiles.value = files.map(file => ({
        file,
        path: file.webkitRelativePath
      }))
      // Count unique subfolder names
      const subfolderPaths = files.map(f => f.webkitRelativePath.split('/')[1]).filter(Boolean)
      subfolderCount.value = new Set(subfolderPaths).size
      showFolderOptions.value = true
    } else {
      return files
    }
  }

  // Folder options handlers
  const confirmFolderOptions = (addFilesToQueue) => {
    const processingStartTime = Date.now()
    let filesToAdd = pendingFolderFiles.value
    
    if (!includeSubfolders.value) {
      // Filter to only main folder files (max 2 path segments: folder/file)
      filesToAdd = filesToAdd.filter(f => f.path.split('/').length <= 2)
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
    analyzeFilesForOptions
  }
}