<template>
  <v-container fluid class="pa-6">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-slate-800 mb-2">File Upload Center</h1>
        <p class="text-slate-600">
          Upload individual files or entire folders with drag and drop support
        </p>
      </div>

      <!-- Main Upload Area -->
      <v-card
        class="upload-dropzone pa-8 mb-6"
        :class="{ 'dropzone-active': isDragOver }"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleDrop"
        variant="outlined"
        height="300"
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
import { useAuthStore } from '../stores/auth'
import { UploadLogService } from '../services/uploadLogService'
import FileUploadQueue from '../components/features/upload/FileUploadQueue.vue'

// Component configuration
defineOptions({
  name: 'FileUploadView'
})

// Store access
const authStore = useAuthStore()

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
  // For single files, check for duplicates and show notification
  const fileInfo = await createFileInfo(file)
  
  // Check for duplicates using the real upload log service
  const duplicateResult = await checkForDuplicates(fileInfo)
  
  if (duplicateResult.isDuplicate && duplicateResult.exactDuplicate) {
    const uploadDate = duplicateResult.exactDuplicate.uploadDate?.toDate?.() || new Date(duplicateResult.exactDuplicate.uploadDate)
    const formattedDate = uploadDate.toLocaleDateString()
    showNotification(`File previously uploaded by ${duplicateResult.exactDuplicate.uploaderName} on ${formattedDate} and will be skipped.`, 'warning')
  } else if (duplicateResult.isDuplicate && duplicateResult.metadataDuplicate) {
    const uploadDate = duplicateResult.metadataDuplicate.uploadDate?.toDate?.() || new Date(duplicateResult.metadataDuplicate.uploadDate)
    const formattedDate = uploadDate.toLocaleDateString()
    showNotification(`Duplicate file with different metadata was uploaded by ${duplicateResult.metadataDuplicate.uploaderName} on ${formattedDate}. Proceeding with upload to enable comparison.`, 'info')
  } else {
    showNotification('File ready for upload', 'success')
    // Add to queue for actual upload in future steps
    addFilesToQueue([file])
  }
}

const addFilesToQueue = async (files) => {
  // Create file info objects
  const newFileInfos = await Promise.all(files.map(createFileInfo))
  
  // Check each file for duplicates and update status
  for (const fileInfo of newFileInfos) {
    const duplicateResult = await checkForDuplicates(fileInfo)
    
    if (duplicateResult.isDuplicate) {
      if (duplicateResult.exactDuplicate) {
        fileInfo.status = 'skipped'
        fileInfo.isDuplicate = true
        fileInfo.isExactDuplicate = true
        const uploadDate = duplicateResult.exactDuplicate.uploadDate?.toDate?.() || new Date(duplicateResult.exactDuplicate.uploadDate)
        const formattedDate = uploadDate.toLocaleDateString()
        fileInfo.duplicateMessage = `File previously uploaded by ${duplicateResult.exactDuplicate.uploaderName} on ${formattedDate} and will be skipped.`
      } else if (duplicateResult.metadataDuplicate) {
        fileInfo.isDuplicate = true
        fileInfo.isExactDuplicate = false
        const uploadDate = duplicateResult.metadataDuplicate.uploadDate?.toDate?.() || new Date(duplicateResult.metadataDuplicate.uploadDate)
        const formattedDate = uploadDate.toLocaleDateString()
        fileInfo.duplicateMessage = `Duplicate file with different metadata was uploaded by ${duplicateResult.metadataDuplicate.uploaderName} on ${formattedDate}. Proceed with upload to enable comparison of these similar files.`
      }
    }
  }
  
  uploadQueue.value.push(...newFileInfos)
}

const processFolderEntry = async (dirEntry) => {
  const files = await readDirectoryRecursive(dirEntry)
  const hasSubfolders = files.some(file => file.path.includes('/'))
  
  if (hasSubfolders) {
    pendingFolderFiles.value = files
    subfolderCount.value = new Set(files.map(f => f.path.split('/')[0])).size
    showFolderOptions.value = true
  } else {
    addFilesToQueue(files.map(f => f.file))
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

const createFileInfo = async (file) => {
  // Calculate file hash (placeholder - would use actual crypto in production)
  const hash = await calculateFileHash(file)
  
  return {
    id: crypto.randomUUID(),
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified),
    hash,
    status: 'pending', // pending, uploading, completed, error, skipped
    progress: 0,
    path: file.webkitRelativePath || file.name
  }
}

const calculateFileHash = async (file) => {
  // Simplified hash calculation for demo
  // In production, use Web Crypto API with SHA-256
  const text = `${file.name}-${file.size}-${file.lastModified}`
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const checkForDuplicates = async (fileInfo) => {
  try {
    // Get current team ID for multi-tenant isolation
    const teamId = authStore.currentTeam
    if (!teamId) {
      console.warn('No team ID available for duplicate detection')
      return {
        isDuplicate: false,
        exactDuplicate: null,
        metadataDuplicate: null
      }
    }

    // Check against upload logs in Firestore
    const duplicateResult = await UploadLogService.checkForDuplicates(fileInfo, teamId)
    return duplicateResult
  } catch (error) {
    console.error('Error checking for duplicates:', error)
    // Return safe fallback if service fails
    return {
      isDuplicate: false,
      exactDuplicate: null,
      metadataDuplicate: null
    }
  }
}

// Folder options handlers
const confirmFolderOptions = () => {
  let filesToAdd = pendingFolderFiles.value
  
  if (!includeSubfolders.value) {
    // Filter to only main folder files
    filesToAdd = filesToAdd.filter(f => !f.path.includes('/') || f.path.split('/').length <= 2)
  }
  
  addFilesToQueue(filesToAdd.map(f => f.file))
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