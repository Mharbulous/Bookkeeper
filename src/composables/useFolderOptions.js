import { ref, watch } from 'vue'
import { analyzeFiles } from '../utils/fileAnalysis.js'

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

  // Analysis function
  const analyzeFilesForOptions = async () => {
    if (pendingFolderFiles.value.length === 0) return
    
    isAnalyzing.value = true
    
    try {
      // Separate files into main folder vs all files
      const allFiles = pendingFolderFiles.value.map(f => f.file)
      
      // Debug: Log path structures to understand filtering
      console.log('📁 Analyzing folder structure:')
      
      // Show path segment distribution
      const pathAnalysis = pendingFolderFiles.value.map(f => {
        const pathParts = f.path.split('/').filter(part => part !== '')
        return { path: f.path, segments: pathParts.length }
      })
      
      const segmentCounts = {}
      pathAnalysis.forEach(p => {
        segmentCounts[p.segments] = (segmentCounts[p.segments] || 0) + 1
      })
      
      console.log('📊 Path segments distribution:', segmentCounts)
      
      // Show examples of each segment type
      const examplesBySegments = {}
      pathAnalysis.forEach(p => {
        if (!examplesBySegments[p.segments]) examplesBySegments[p.segments] = []
        if (examplesBySegments[p.segments].length < 2) {
          examplesBySegments[p.segments].push(p.path)
        }
      })
      
      console.log('📄 Example paths by segment count:', examplesBySegments)
      
      const mainFolderFiles = pendingFolderFiles.value
        .filter(f => {
          const pathParts = f.path.split('/').filter(part => part !== '') // Remove empty parts
          const isMainFolder = pathParts.length === 2  // Exactly 2 parts: folder/file (no subfolders)
          return isMainFolder
        })
        .map(f => f.file)
        
      console.log(`📊 Filtering results: ${mainFolderFiles.length} main folder files, ${allFiles.length} total files`)
      
      // Debug: Show path analysis
      if (pendingFolderFiles.value.length > 0) {
        const exampleAnalysis = pendingFolderFiles.value.slice(0, 3).map(f => {
          const pathParts = f.path.split('/').filter(part => part !== '')
          return {
            path: f.path,
            parts: pathParts,
            segments: pathParts.length,
            isMainFolder: pathParts.length === 2
          }
        })
        console.log('📄 Path analysis examples:', exampleAnalysis)
      }
      
      // Analyze both sets concurrently
      const [allFilesResult, mainFolderResult] = await Promise.all([
        Promise.resolve(analyzeFiles(allFiles)),
        Promise.resolve(analyzeFiles(mainFolderFiles))
      ])
      
      allFilesAnalysis.value = allFilesResult
      mainFolderAnalysis.value = mainFolderResult
      
      // Log estimates at the same time they're calculated for the modal
      console.log(`⏱️  End-to-end time estimates:`)
      console.log(`📁 Main folder only:`)
      console.log(`   • ${mainFolderResult.uniqueFiles} files with unique sizes (skip hash calculation)`)
      console.log(`   • ${mainFolderResult.duplicateCandidates} files need hash verification`)
      console.log(`   • ${Math.round((mainFolderResult.uniqueFiles / Math.max(mainFolderResult.totalFiles, 1)) * 100)}% of files can skip expensive hash calculation`)
      console.log(`   • Hash candidates total size: ${mainFolderResult.duplicateCandidatesSizeMB} MB`)
      console.log(`   • Estimated worker time: ${mainFolderResult.breakdown.workerTimeMs}ms`)
      console.log(`   • Estimated UI update time: ${mainFolderResult.breakdown.uiTimeMs}ms`)
      console.log(`   • TOTAL END-TO-END ESTIMATE: ${mainFolderResult.estimatedTimeMs}ms (${mainFolderResult.estimatedTimeSeconds}s)`)
      
      console.log(`📂 Include subfolders:`)
      console.log(`   • ${allFilesResult.uniqueFiles} files with unique sizes (skip hash calculation)`)
      console.log(`   • ${allFilesResult.duplicateCandidates} files need hash verification`)
      console.log(`   • ${Math.round((allFilesResult.uniqueFiles / Math.max(allFilesResult.totalFiles, 1)) * 100)}% of files can skip expensive hash calculation`)
      console.log(`   • Hash candidates total size: ${allFilesResult.duplicateCandidatesSizeMB} MB`)
      console.log(`   • Estimated worker time: ${allFilesResult.breakdown.workerTimeMs}ms`)
      console.log(`   • Estimated UI update time: ${allFilesResult.breakdown.uiTimeMs}ms`)
      console.log(`   • TOTAL END-TO-END ESTIMATE: ${allFilesResult.estimatedTimeMs}ms (${allFilesResult.estimatedTimeSeconds}s)`)
      
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
    let filesToAdd = pendingFolderFiles.value
    
    if (!includeSubfolders.value) {
      // Filter to only main folder files (max 2 path segments: folder/file)
      filesToAdd = filesToAdd.filter(f => f.path.split('/').length <= 2)
    }
    
    // Preserve path information when adding files to queue
    const filesWithPath = filesToAdd.map(f => {
      f.file.path = f.path
      return f.file
    })
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