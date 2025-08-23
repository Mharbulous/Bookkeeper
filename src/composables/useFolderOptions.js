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
  const calculateDirectoryDepthStats = (files) => {
    const depths = files.map(f => {
      const pathParts = f.path.split('/').filter(part => part !== '')
      return pathParts.length - 1 // Subtract 1 because last part is filename
    })
    
    const maxDepth = depths.length > 0 ? Math.max(...depths) : 0
    const avgDepth = depths.length > 0 ? depths.reduce((sum, d) => sum + d, 0) / depths.length : 0
    
    return {
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
      // Separate files into main folder vs all files
      const allFiles = pendingFolderFiles.value.map(f => f.file)
      
      
      const mainFolderFiles = pendingFolderFiles.value
        .filter(f => {
          const pathParts = f.path.split('/').filter(part => part !== '') // Remove empty parts
          const isMainFolder = pathParts.length === 2  // Exactly 2 parts: folder/file (no subfolders)
          return isMainFolder
        })
        .map(f => f.file)
        
      
      
      // Calculate predictive metrics for all files and main folder files
      const allFilesMetrics = calculateFileSizeMetrics(pendingFolderFiles.value)
      const mainFolderMetrics = calculateFileSizeMetrics(pendingFolderFiles.value.filter(f => {
        const pathParts = f.path.split('/').filter(part => part !== '')
        return pathParts.length === 2 // main folder files only
      }))
      const depthStats = calculateDirectoryDepthStats(pendingFolderFiles.value)
      const filenameStats = calculateFilenameStats(pendingFolderFiles.value)
      
      // Log streamlined data focused on time prediction
      console.log(`🔬 FOLDER_ANALYSIS_DATA:`, {
        timestamp: Date.now(),
        
        // File counts
        totalFiles: allFiles.length,
        mainFolderFiles: mainFolderFiles.length,
        subfolderFiles: allFiles.length - mainFolderFiles.length,
        
        // File sizes
        totalSizeMB: allFilesMetrics.totalSizeMB,
        mainFolderSizeMB: mainFolderMetrics.totalSizeMB,
        
        // Duplication indicators
        uniqueFilesMainFolder: mainFolderMetrics.uniqueFiles,
        uniqueFilesTotal: allFilesMetrics.uniqueFiles,
        identicalSizeFiles: allFilesMetrics.identicalSizeFiles,
        
        // Processing hints
        zeroByteFiles: allFilesMetrics.zeroByteFiles,
        avgFilenameLength: filenameStats.avgFilenameLength,
        maxDirectoryDepth: depthStats.maxDirectoryDepth,
        avgDirectoryDepth: depthStats.avgDirectoryDepth,
        largestFileSizesMB: allFilesMetrics.largestFileSizesMB
      })
      // Analyze both sets concurrently (these will log TIME_ESTIMATION_FORMULA for each)
      const [allFilesResult, mainFolderResult] = await Promise.all([
        Promise.resolve(analyzeFiles(allFiles)),
        Promise.resolve(analyzeFiles(mainFolderFiles))
      ])
      
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
    const hasSubfolders = files.some(file => file.path.includes('/'))
    
    if (hasSubfolders) {
      pendingFolderFiles.value = files
      subfolderCount.value = new Set(files.map(f => f.path.split('/')[0])).size
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