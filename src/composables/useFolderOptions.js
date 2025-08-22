import { ref } from 'vue'

export function useFolderOptions() {
  // Reactive data
  const showFolderOptions = ref(false)
  const includeSubfolders = ref(true)
  const pendingFolderFiles = ref([])
  const subfolderCount = ref(0)

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

    // Methods
    readDirectoryRecursive,
    processFolderEntry,
    processFolderFiles,
    confirmFolderOptions,
    cancelFolderUpload
  }
}