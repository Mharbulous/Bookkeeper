<template>
  <v-container fluid class="pa-6">
    <div class="max-w-4xl mx-auto mt-16">

      <!-- Main Upload Area -->
      <v-card
        v-if="uploadQueue.length === 0"
        class="upload-dropzone pa-8 mb-6"
        :class="{ 'dropzone-active': isDragOver }"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleDrop"
        variant="outlined"
        :style="{ height: '60vh', width: '60vw', minHeight: '400px', minWidth: '600px', margin: '0 auto' }"
      >
        <div class="text-center h-100 d-flex flex-column justify-center align-center">
          <v-icon
            :icon="isDragOver ? 'mdi-cloud-upload' : 'mdi-cloud-upload-outline'"
            size="64"
            :color="isDragOver ? 'primary' : 'grey-lighten-1'"
            class="mb-4"
          />
          
          <h3 class="text-h5 mb-2" :class="isDragOver ? 'text-primary' : 'text-grey-darken-2'">
            {{ isDragOver ? 'Drop files or folders here!' : 'Drag and drop files or folders here' }}
          </h3>
          
          <p class="text-body-1 text-grey-darken-1 mb-4">
            or choose files using the buttons below
          </p>

          <!-- Upload Buttons -->
          <div class="d-flex flex-wrap gap-3 justify-center">
            <!-- Individual File Upload -->
            <v-btn
              color="primary"
              size="large"
              variant="elevated"
              prepend-icon="mdi-file-plus"
              @click="triggerFileSelect"
            >
              Select Files
            </v-btn>

            <!-- Folder Upload -->
            <v-btn
              color="secondary"
              size="large"
              variant="elevated"
              prepend-icon="mdi-folder-plus"
              @click="triggerFolderSelect"
            >
              Select Folder
            </v-btn>
          </div>
        </div>
      </v-card>

      <!-- Hidden file inputs -->
      <input
        ref="fileInput"
        type="file"
        multiple
        @change="handleFileSelect"
        style="display: none"
      />
      
      <input
        ref="folderInput"
        type="file"
        webkitdirectory
        multiple
        @change="handleFolderSelect"
        style="display: none"
      />

      <!-- Upload Options (for folders) -->
      <v-dialog v-model="showFolderOptions" max-width="500">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon icon="mdi-folder-open" class="me-2" />
            Folder Upload Options
          </v-card-title>
          
          <v-card-text>
            <p class="mb-4">
              This folder contains {{ subfolderCount }} subfolder(s). 
              How would you like to proceed?
            </p>
            
            <v-radio-group v-model="includeSubfolders">
              <v-radio
                :value="false"
                color="primary"
              >
                <template #label>
                  <div>
                    <div class="font-weight-medium">Main folder only</div>
                    <div class="text-caption text-grey-darken-1">
                      Upload only files in the main folder
                    </div>
                  </div>
                </template>
              </v-radio>
              
              <v-radio
                :value="true"
                color="primary"
              >
                <template #label>
                  <div>
                    <div class="font-weight-medium">Include subfolders</div>
                    <div class="text-caption text-grey-darken-1">
                      Upload all files including those in subfolders
                    </div>
                  </div>
                </template>
              </v-radio>
            </v-radio-group>
          </v-card-text>
          
          <v-card-actions>
            <v-spacer />
            <v-btn
              variant="text"
              @click="cancelFolderUpload"
            >
              Cancel
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              @click="confirmFolderOptions"
            >
              Continue
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>


      <!-- Upload Queue/Preview -->
      <FileUploadQueue
        v-if="uploadQueue.length > 0"
        :files="uploadQueue"
        @remove-file="removeFromQueue"
        @start-upload="startUpload"
        @clear-queue="clearQueue"
      />

      <!-- Single File Upload Notification -->
      <v-snackbar
        v-model="showSingleFileNotification"
        :timeout="3000"
        :color="singleFileNotification.color"
        location="top"
      >
        {{ singleFileNotification.message }}
        <template #actions>
          <v-btn
            color="white"
            variant="text"
            @click="showSingleFileNotification = false"
          >
            Close
          </v-btn>
        </template>
      </v-snackbar>
    </div>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import FileUploadQueue from '../components/features/upload/FileUploadQueue.vue'

// Component configuration
defineOptions({
  name: 'FileUploadView'
})

// No file size constraints - all files accepted

// Reactive data
const isDragOver = ref(false)
const uploadQueue = ref([])
const showFolderOptions = ref(false)
const includeSubfolders = ref(true)
const pendingFolderFiles = ref([])
const subfolderCount = ref(0)
const showSingleFileNotification = ref(false)
const singleFileNotification = ref({ message: '', color: 'info' })

// Template refs
const fileInput = ref(null)
const folderInput = ref(null)

// Drag and drop handlers
const handleDragOver = () => {
  isDragOver.value = true
}

const handleDragLeave = (event) => {
  // Only set to false if we're leaving the dropzone entirely
  if (!event.currentTarget.contains(event.relatedTarget)) {
    isDragOver.value = false
  }
}

const handleDrop = async (event) => {
  isDragOver.value = false
  const items = Array.from(event.dataTransfer.items)
  
  const files = []
  const folders = []
  
  for (const item of items) {
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry()
      if (entry) {
        if (entry.isFile) {
          const file = item.getAsFile()
          files.push(file)
        } else if (entry.isDirectory) {
          folders.push(entry)
        }
      }
    }
  }
  
  // Handle dropped files
  if (files.length > 0) {
    if (files.length === 1) {
      // Single file - show notification and upload immediately
      await processSingleFile(files[0])
    } else {
      // Multiple files - add to queue
      addFilesToQueue(files)
    }
  }
  
  // Handle dropped folders
  if (folders.length > 0) {
    for (const folder of folders) {
      await processFolderEntry(folder)
    }
  }
}

// File input handlers
const triggerFileSelect = () => {
  fileInput.value.click()
}

const triggerFolderSelect = () => {
  folderInput.value.click()
}

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files)
  if (files.length === 1) {
    processSingleFile(files[0])
  } else {
    addFilesToQueue(files)
  }
  // Reset input
  event.target.value = ''
}

const handleFolderSelect = (event) => {
  const files = Array.from(event.target.files)
  processFolderFiles(files)
  // Reset input
  event.target.value = ''
}

// File processing functions
const processSingleFile = async (file) => {
  // For single files, add to queue and show notification
  await addFilesToQueue([file])
  showNotification('File ready for upload', 'success')
}

// Simple hash generation with collision safety
const generateFileHash = async (file) => {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  // Add size suffix for collision safety (SHA-256 + size = virtually impossible collision)
  return `${hash}_${file.size}`
}

// Improved constraint-based deduplication using JavaScript Maps
const processFiles = async (files) => {
  // Step 1: Group files by size to identify unique-sized files
  const fileSizeGroups = new Map() // file_size -> [file_references]
  
  files.forEach((file, index) => {
    const fileSize = file.size
    const fileRef = {
      file,
      originalIndex: index,
      path: file.path || file.webkitRelativePath || file.name,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        lastModified: file.lastModified
      }
    }
    
    if (!fileSizeGroups.has(fileSize)) {
      fileSizeGroups.set(fileSize, [])
    }
    fileSizeGroups.get(fileSize).push(fileRef)
  })
  
  const uniqueFiles = []
  const duplicateCandidates = []
  
  // Step 2: Separate unique-sized files from potential duplicates
  for (const [, fileRefs] of fileSizeGroups) {
    if (fileRefs.length === 1) {
      // Unique file size - definitely not a duplicate
      uniqueFiles.push(fileRefs[0])
    } else {
      // Multiple files with same size - need hash verification
      duplicateCandidates.push(...fileRefs)
    }
  }
  
  // Step 3: Hash potential duplicates and group by hash
  const hashGroups = new Map() // hash_value -> [file_references]
  
  for (const fileRef of duplicateCandidates) {
    const hash = await generateFileHash(fileRef.file)
    fileRef.hash = hash
    
    if (!hashGroups.has(hash)) {
      hashGroups.set(hash, [])
    }
    hashGroups.get(hash).push(fileRef)
  }
  
  const finalFiles = []
  const duplicateFiles = []
  
  // Step 4: Process hash groups to identify true duplicates vs or the identical files selected twice
  for (const [, fileRefs] of hashGroups) {
    if (fileRefs.length === 1) {
      // Unique hash - not a duplicate
      finalFiles.push(fileRefs[0])
    } else {
      // Multiple files with same hash - check if they're identical or true duplicates
      const identicalGroups = new Map() // metadata_key -> [file_references]
      
      fileRefs.forEach(fileRef => {
        // Create metadata signature for identical file detection
        const metadataKey = `${fileRef.metadata.fileName}_${fileRef.metadata.fileSize}_${fileRef.metadata.lastModified}`
        
        if (!identicalGroups.has(metadataKey)) {
          identicalGroups.set(metadataKey, [])
        }
        identicalGroups.get(metadataKey).push(fileRef)
      })
      
      // Step 5: Handle identical files and true duplicates
      for (const [, identicalFiles] of identicalGroups) {
        if (identicalFiles.length === 1) {
          // Unique file (different metadata from others with same hash)
          finalFiles.push(identicalFiles[0])
        } else {
          // Identical files selected multiple times - just pick the first one
          const chosenFile = identicalFiles[0]
          finalFiles.push(chosenFile)
          
          // Mark others as duplicates
          identicalFiles.slice(1).forEach(fileRef => {
            fileRef.isDuplicate = true
            duplicateFiles.push(fileRef)
          })
        }
      }
      
      // If we have multiple distinct files with same hash (true duplicates), choose the best one
      if (identicalGroups.size > 1) {
        const allUniqueFiles = Array.from(identicalGroups.values()).map(group => group[0])
        if (allUniqueFiles.length > 1) {
          const bestFile = chooseBestFile(allUniqueFiles)
          
          // Remove best file from finalFiles and add back with priority
          const bestIndex = finalFiles.findIndex(f => f === bestFile)
          if (bestIndex > -1) {
            finalFiles.splice(bestIndex, 1)
          }
          finalFiles.push(bestFile)
          
          // Mark others as duplicates
          allUniqueFiles.forEach(fileRef => {
            if (fileRef !== bestFile) {
              const index = finalFiles.findIndex(f => f === fileRef)
              if (index > -1) {
                finalFiles.splice(index, 1)
              }
              fileRef.isDuplicate = true
              duplicateFiles.push(fileRef)
            }
          })
        }
      }
    }
  }
  
  // Step 6: Combine unique and non-duplicate files
  const allFinalFiles = [...uniqueFiles, ...finalFiles]
  
  // Prepare for queue
  const readyFiles = allFinalFiles.map(fileRef => ({
    ...fileRef,
    status: 'ready'
  }))
  
  const duplicatesForQueue = duplicateFiles.map(fileRef => ({
    ...fileRef,
    status: 'duplicate'
  }))
  
  // Update UI
  updateUploadQueue(readyFiles, duplicatesForQueue)
}

// Helper function to choose the best file based on priority rules
const chooseBestFile = (fileRefs) => {
  return fileRefs.sort((a, b) => {
    // Priority 1: Earliest modification date
    if (a.metadata.lastModified !== b.metadata.lastModified) {
      return a.metadata.lastModified - b.metadata.lastModified
    }
    
    // Priority 2: Shortest filename
    if (a.metadata.fileName.length !== b.metadata.fileName.length) {
      return a.metadata.fileName.length - b.metadata.fileName.length
    }
    
    // Priority 3: Alphanumeric filename sort
    if (a.metadata.fileName !== b.metadata.fileName) {
      return a.metadata.fileName.localeCompare(b.metadata.fileName)
    }
    
    // Priority 4: Original selection order (stable sort)
    return a.originalIndex - b.originalIndex
  })[0]
}

const addFilesToQueue = async (files) => {
  if (files.length === 0) return
  await processFiles(files)
}

const processFolderEntry = async (dirEntry) => {
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
    addFilesToQueue(filesWithPath)
  }
}

const processFolderFiles = (files) => {
  const hasSubfolders = files.some(file => file.webkitRelativePath.split('/').length > 2)
  
  if (hasSubfolders) {
    pendingFolderFiles.value = files.map(file => ({
      file,
      path: file.webkitRelativePath
    }))
    subfolderCount.value = new Set(files.map(f => f.webkitRelativePath.split('/')[1])).size
    showFolderOptions.value = true
  } else {
    addFilesToQueue(files)
  }
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


const updateUploadQueue = (readyFiles, duplicateFiles) => {
  // Clear and rebuild queue
  uploadQueue.value = []
  
  // Add ready files (unique and chosen duplicates)
  readyFiles.forEach(fileRef => {
    uploadQueue.value.push({
      id: crypto.randomUUID(),
      file: fileRef.file,
      metadata: fileRef.metadata,
      hash: fileRef.hash,
      status: fileRef.status,
      name: fileRef.file.name,
      size: fileRef.file.size,
      type: fileRef.file.type,
      lastModified: fileRef.file.lastModified,
      path: fileRef.path || fileRef.file.webkitRelativePath || fileRef.file.name,
      isDuplicate: false,
      isPreviousUpload: false,
      duplicateMessage: null
    })
  })
  
  // Add duplicate files (to show user what was skipped)
  duplicateFiles.forEach(fileRef => {
    uploadQueue.value.push({
      id: crypto.randomUUID(),
      file: fileRef.file,
      metadata: fileRef.metadata,
      hash: fileRef.hash,
      status: fileRef.status,
      name: fileRef.file.name,
      size: fileRef.file.size,
      type: fileRef.file.type,
      lastModified: fileRef.file.lastModified,
      path: fileRef.path || fileRef.file.webkitRelativePath || fileRef.file.name,
      isDuplicate: true,
      isQueueDuplicate: true,
      isPreviousUpload: false,
      duplicateMessage: null
    })
  })
}


// Folder options handlers
const confirmFolderOptions = () => {
  let filesToAdd = pendingFolderFiles.value
  
  if (!includeSubfolders.value) {
    // Filter to only main folder files
    filesToAdd = filesToAdd.filter(f => !f.path.includes('/') || f.path.split('/').length <= 2)
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
  // Placeholder for actual upload implementation (Step 6)
  console.log('Starting upload for', uploadQueue.value.length, 'files')
}

// Utility functions
const showNotification = (message, color = 'info') => {
  singleFileNotification.value = { message, color }
  showSingleFileNotification.value = true
}
</script>

<style scoped>
.upload-dropzone {
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.upload-dropzone:hover {
  border-color: #3b82f6;
  background-color: #f8fafc;
}

.dropzone-active {
  border-color: #3b82f6 !important;
  background-color: #eff6ff !important;
  transform: scale(1.02);
}

.gap-3 {
  gap: 12px;
}
</style>