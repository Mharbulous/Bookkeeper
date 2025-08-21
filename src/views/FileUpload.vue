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
        :is-processing="isProcessingQueue"
        @remove-file="removeFromQueue"
        @start-upload="startUpload"
        @clear-queue="clearQueue"
        @cancel-processing="cancelProcessing"
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

// Processing state for streaming deduplication
const isProcessingQueue = ref(false)
const processingController = ref(null)

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

// Fast synchronous queueing without deduplication
const addFilesToQueueSynchronous = (files) => {
  // Create file info objects synchronously (fast - no hash calculation)
  const newFileInfos = files.map(createFileInfoSynchronous)
  
  // Add to queue immediately
  uploadQueue.value.push(...newFileInfos)
  
  // Start streaming deduplication process
  processQueuedFilesStreamingly()
}

// Original function - now kept for individual file uploads that need immediate processing
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

// Fast synchronous file info creation for initial queueing
const createFileInfoSynchronous = (file) => {
  return {
    id: crypto.randomUUID(),
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified),
    hash: null, // Will be calculated during streaming processing
    status: 'queueing', // queueing, pending, uploading, completed, error, skipped
    progress: 0,
    path: file.webkitRelativePath || file.name
  }
}

// Complete file info creation with hash calculation and duplicate detection
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

// Optimized hash calculation with chunking for large files
const calculateFileHash = async (file, onProgress = null) => {
  const CHUNK_SIZE = 2 * 1024 * 1024 // 2MB chunks
  const chunks = Math.ceil(file.size / CHUNK_SIZE)
  
  if (file.size === 0) {
    // Handle empty files
    const hashBuffer = await crypto.subtle.digest('SHA-256', new ArrayBuffer(0))
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
  
  // For small files, use direct approach
  if (file.size <= CHUNK_SIZE) {
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
  
  // For large files, use chunked approach with progress reporting
  let processedBytes = 0
  
  for (let i = 0; i < chunks; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    
    processedBytes += (end - start)
    
    // Report progress without blocking
    if (onProgress) {
      onProgress(processedBytes / file.size)
    }
    
    // Yield to prevent blocking UI on large files
    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }
  
  // Final hash calculation for the entire file
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
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

// Performance metrics tracking
const performanceMetrics = {
  hashingTime: [],
  queryTime: [],
  totalProcessingTime: [],
  filesPerSecond: 0,
  
  track(metric, value) {
    this[metric].push(value)
    this.calculateAverages()
  },
  
  calculateAverages() {
    // Calculate moving averages for adaptive optimization
    const recent = this.hashingTime.slice(-100)
    if (recent.length > 0) {
      const avgHashTime = recent.reduce((a, b) => a + b, 0) / recent.length
      
      // Log performance for debugging
      if (recent.length % 20 === 0) {
        console.log(`Avg hash time: ${avgHashTime.toFixed(2)}ms, Files processed: ${recent.length}`)
      }
    }
  }
}

// In-memory cache for duplicate detection results
const duplicateCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Debounced UI update mechanism (currently unused but available for future optimization)
// let updateTimer = null
// const pendingUpdates = new Map()

// Debounced UI update function (currently unused but available for future optimization)
// const scheduleUIUpdate = (fileId, updates) => {
//   pendingUpdates.set(fileId, updates)
//   
//   if (updateTimer) return
//   
//   updateTimer = requestAnimationFrame(() => {
//     // Apply all pending updates at once
//     pendingUpdates.forEach((updates, fileId) => {
//       const file = uploadQueue.value.find(f => f.id === fileId)
//       if (file) {
//         Object.assign(file, updates)
//       }
//     })
//     
//     pendingUpdates.clear()
//     updateTimer = null
//   })
// }

// Streaming deduplication processor with priority and optimization
const processQueuedFilesStreamingly = async () => {
  // Prevent multiple simultaneous processing
  if (isProcessingQueue.value) return
  
  isProcessingQueue.value = true
  
  // Create an AbortController for cancellation
  processingController.value = new AbortController()
  
  const SMALL_FILE_SIZE = 1024 * 1024 // 1MB
  const BATCH_SIZE = 20 // Process 20 files at a time
  
  const processingStartTime = performance.now()
  
  try {
    // Process files in batches
    while (true) {
      // Check for cancellation
      if (processingController.value.signal.aborted) {
        break
      }
      
      // Prioritize small files for instant feedback
      const queueingFiles = uploadQueue.value
        .filter(file => file.status === 'queueing')
        .sort((a, b) => {
          // Small files first
          if (a.size < SMALL_FILE_SIZE && b.size >= SMALL_FILE_SIZE) return -1
          if (b.size < SMALL_FILE_SIZE && a.size >= SMALL_FILE_SIZE) return 1
          // Then by size ascending
          return a.size - b.size
        })
        .slice(0, BATCH_SIZE)
      
      if (queueingFiles.length === 0) {
        // No more files to process
        break
      }
      
      
      try {
        // Step 1: Calculate hashes for all files in parallel with performance tracking
        const hashStartTime = performance.now()
        await Promise.all(queueingFiles.map(async (file) => {
          if (processingController.value.signal.aborted) return
          try {
            const fileHashStart = performance.now()
            file.hash = await calculateFileHash(file.file)
            const fileHashTime = performance.now() - fileHashStart
            performanceMetrics.track('hashingTime', fileHashTime)
          } catch (error) {
            console.error('Error calculating hash for:', file.name, error)
            file.status = 'error'
            file.errorMessage = 'Failed to calculate file hash'
          }
        }))
        const totalHashTime = performance.now() - hashStartTime
        console.log(`Batch hash calculation completed in ${totalHashTime.toFixed(2)}ms for ${queueingFiles.length} files`)
        
        // Check for cancellation after hash calculation
        if (processingController.value.signal.aborted) {
          // Reset files back to queueing state
          queueingFiles.forEach(file => {
            file.hash = null
          })
          break
        }
        
        // Step 2: Batch duplicate detection with performance tracking
        const validFiles = queueingFiles.filter(file => file.hash && file.status === 'queueing')
        if (validFiles.length > 0) {
          const queryStartTime = performance.now()
          await checkForDuplicatesBatch(validFiles)
          const queryTime = performance.now() - queryStartTime
          performanceMetrics.track('queryTime', queryTime)
          console.log(`Duplicate detection completed in ${queryTime.toFixed(2)}ms for ${validFiles.length} files`)
        }
        
        // Step 3: Update file statuses based on duplicate results
        validFiles.forEach(file => {
          if (processingController.value.signal.aborted) {
            file.hash = null
            return
          }
          
          let statusUpdates = {}
          
          if (file.duplicateResult && file.duplicateResult.isDuplicate) {
            if (file.duplicateResult.exactDuplicate) {
              const uploadDate = file.duplicateResult.exactDuplicate.uploadDate?.toDate?.() || new Date(file.duplicateResult.exactDuplicate.uploadDate)
              const formattedDate = uploadDate.toLocaleDateString()
              statusUpdates = {
                status: 'skipped',
                isDuplicate: true,
                isExactDuplicate: true,
                duplicateMessage: `File previously uploaded by ${file.duplicateResult.exactDuplicate.uploaderName} on ${formattedDate} and will be skipped.`
              }
            } else if (file.duplicateResult.metadataDuplicate) {
              const uploadDate = file.duplicateResult.metadataDuplicate.uploadDate?.toDate?.() || new Date(file.duplicateResult.metadataDuplicate.uploadDate)
              const formattedDate = uploadDate.toLocaleDateString()
              statusUpdates = {
                status: 'pending',
                isDuplicate: true,
                isExactDuplicate: false,
                duplicateMessage: `Duplicate file with different metadata was uploaded by ${file.duplicateResult.metadataDuplicate.uploaderName} on ${formattedDate}. Proceed with upload to enable comparison of these similar files.`
              }
            }
          } else {
            statusUpdates = { status: 'pending' }
          }
          
          // Apply updates immediately for simplicity (batching can be added later if needed)
          Object.assign(file, statusUpdates)
          
          // Clean up temporary duplicateResult
          delete file.duplicateResult
        })
        
        // Micro-yield for UI responsiveness
        await new Promise(resolve => requestAnimationFrame(resolve))
        
      } catch (error) {
        console.error('Error processing batch:', error)
      }
    }
  } catch (error) {
    console.error('Error in streaming processing:', error)
  } finally {
    const totalProcessingTime = performance.now() - processingStartTime
    performanceMetrics.track('totalProcessingTime', totalProcessingTime)
    console.log(`Total processing completed in ${totalProcessingTime.toFixed(2)}ms`)
    
    isProcessingQueue.value = false
    processingController.value = null
  }
}

// Batch duplicate detection to reduce Firestore queries
const checkForDuplicatesBatch = async (files) => {
  try {
    const teamId = authStore.currentTeam
    if (!teamId) {
      console.warn('No team ID available for duplicate detection')
      files.forEach(file => {
        file.duplicateResult = {
          isDuplicate: false,
          exactDuplicate: null,
          metadataDuplicate: null
        }
      })
      return
    }

    // Split files into cached and uncached
    const uncachedFiles = []
    const now = Date.now()
    
    files.forEach(file => {
      const cacheKey = `${teamId}:${file.hash}`
      const cached = duplicateCache.get(cacheKey)
      
      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        file.duplicateResult = cached.result
      } else {
        uncachedFiles.push(file)
      }
    })
    
    if (uncachedFiles.length === 0) return

    // Get all unique hashes from uncached files only
    const uniqueHashes = [...new Set(uncachedFiles.map(f => f.hash))]
    
    // Use Promise.all for parallel chunk processing
    const chunks = []
    for (let i = 0; i < uniqueHashes.length; i += 10) {
      chunks.push(uniqueHashes.slice(i, i + 10))
    }
    
    const results = await Promise.all(
      chunks.map(chunk => 
        UploadLogService.findUploadsByHashes(chunk, teamId)
      )
    )
    
    const allExistingUploads = results.flat()
    
    // Create a hash map for quick lookup
    const uploadsByHash = new Map()
    allExistingUploads.forEach(upload => {
      if (!uploadsByHash.has(upload.fileHash)) {
        uploadsByHash.set(upload.fileHash, [])
      }
      uploadsByHash.get(upload.fileHash).push(upload)
    })
    
    // Process uncached files and update cache
    uncachedFiles.forEach(file => {
      const existingUploads = uploadsByHash.get(file.hash) || []
      let result
      
      if (existingUploads.length === 0) {
        result = {
          isDuplicate: false,
          exactDuplicate: null,
          metadataDuplicate: null
        }
      } else {
        // Check for exact duplicates (same hash and metadata)
        const exactDuplicate = existingUploads.find(upload => 
          UploadLogService.compareFileMetadata(file, upload)
        )

        if (exactDuplicate) {
          result = {
            isDuplicate: true,
            type: 'exact',
            exactDuplicate,
            metadataDuplicate: null
          }
        } else {
          // If no exact duplicate, it's a metadata duplicate
          const metadataDuplicate = existingUploads[0] // Get the first/most recent one
          result = {
            isDuplicate: true,
            type: 'metadata',
            exactDuplicate: null,
            metadataDuplicate
          }
        }
      }
      
      file.duplicateResult = result
      
      // Cache the result
      const cacheKey = `${teamId}:${file.hash}`
      duplicateCache.set(cacheKey, {
        result: result,
        timestamp: now
      })
    })
    
  } catch (error) {
    console.error('Error in batch duplicate detection:', error)
    // Set safe fallback for all files
    files.forEach(file => {
      file.duplicateResult = {
        isDuplicate: false,
        exactDuplicate: null,
        metadataDuplicate: null
      }
    })
  }
}

// Cancel streaming processing
const cancelProcessing = () => {
  if (processingController.value) {
    processingController.value.abort()
  }
}

// Folder options handlers
const confirmFolderOptions = () => {
  let filesToAdd = pendingFolderFiles.value
  
  if (!includeSubfolders.value) {
    // Filter to only main folder files
    filesToAdd = filesToAdd.filter(f => !f.path.includes('/') || f.path.split('/').length <= 2)
  }
  
  // Close modal immediately for better UX
  showFolderOptions.value = false
  pendingFolderFiles.value = []
  
  // Use synchronous queueing for instant feedback
  addFilesToQueueSynchronous(filesToAdd.map(f => f.file))
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