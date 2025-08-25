import { analyzeFiles } from '../utils/fileAnalysis.js'

export function useFolderAnalysis() {
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

  // Core analysis function using fileAnalysis utility
  const performFileAnalysis = (files, directoryStats) => {
    if (!files || files.length === 0) {
      return analyzeFiles([], 0, 0, 0)
    }
    return analyzeFiles(files, directoryStats.totalDirectoryCount, directoryStats.avgDirectoryDepth, directoryStats.avgFileDepth)
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

  return {
    preprocessFileData,
    calculateFileSizeMetrics,
    calculateFilenameStats,
    hasSubfoldersQuick,
    performFileAnalysis,
    readDirectoryRecursive
  }
}