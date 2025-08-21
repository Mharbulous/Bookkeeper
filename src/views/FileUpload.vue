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

      <!-- Batch Processing Progress -->
      <v-card
        v-if="isProcessingHashes"
        class="mb-6"
        variant="outlined"
      >
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-fingerprint" class="me-2" />
          Calculating File Fingerprints
        </v-card-title>
        <v-card-text>
          <v-progress-linear
            :model-value="(hashingProgress / hashingTotal) * 100"
            color="primary"
            height="8"
            class="mb-2"
          />
          <div class="text-body-2 text-grey-darken-1">
            Processing {{ Math.floor(hashingProgress) }} of {{ hashingTotal }} files...
            <!-- UX: Show processing speed indicator -->
            <span v-if="hashingProgress > 0 && hashingTotal > 0">
              ({{ Math.round((hashingProgress / hashingTotal) * 100) }}% complete)
            </span>
          </div>
        </v-card-text>
      </v-card>

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
import { ref, onMounted, onUnmounted } from 'vue'
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
  if (files.length === 0) {
    console.log('⚠️ DEBUG: addFilesToQueue called with 0 files')
    return
  }
  
  // Performance measurement: Start detailed timing for each step
  const stepTimes = {}
  const overallStartTime = performance.now()
  
  // Variables for tracking optimization metrics
  let uniqueSizeCount = 0
  let filesToHash = []
  let fileSizeGroups = new Map()
  
  console.log('⚡ PERFORMANCE: Starting addFilesToQueue', {
    fileCount: files.length,
    fileNames: files.map(f => f.name),
    currentQueueSize: uploadQueue.value.length,
    timestamp: new Date().toISOString()
  })
  
  // Step 1: Add files to queue immediately with "processing" status for instant feedback
  stepTimes.step1Start = performance.now()
  const fileInfos = files.map(file => createFileInfoSync(file))
  fileInfos.forEach(fileInfo => {
    fileInfo.status = 'processing'  // Show immediate feedback
    uploadQueue.value.push(fileInfo)
  })
  stepTimes.step1End = performance.now()
  console.log('📋 PERFORMANCE: Step 1 - Immediate queue addition', {
    timeMs: Math.round(stepTimes.step1End - stepTimes.step1Start),
    filesAdded: fileInfos.length,
    queueSizeAfterAdd: uploadQueue.value.length,
    queueFileNames: uploadQueue.value.map(f => f.name)
  })
  
  try {
    // Step 1.5: Pre-filter by file size (following optimal deduplication algorithm)
    stepTimes.step1_5Start = performance.now()
    fileSizeGroups.clear() // Reset the map
    filesToHash.length = 0 // Clear the array
    const filesWithUniqueSize = []
    
    // Group files by size
    files.forEach((file, index) => {
      const fileSize = file.size
      if (!fileSizeGroups.has(fileSize)) {
        fileSizeGroups.set(fileSize, [])
      }
      fileSizeGroups.get(fileSize).push({ file, index })
    })
    
    // Separate files that need hashing vs those with unique sizes
    uniqueSizeCount = 0
    fileSizeGroups.forEach((filesGroup) => {
      if (filesGroup.length === 1) {
        // Unique size - no need to hash
        filesWithUniqueSize.push(filesGroup[0])
        uniqueSizeCount++
      } else {
        // Multiple files with same size - need to hash for deduplication
        filesToHash.push(...filesGroup)
      }
    })
    
    stepTimes.step1_5End = performance.now()
    console.log('🎯 PERFORMANCE: Step 1.5 - File size pre-filtering', {
      timeMs: Math.round(stepTimes.step1_5End - stepTimes.step1_5Start),
      totalFiles: files.length,
      uniqueSizeFiles: uniqueSizeCount,
      filesToHash: filesToHash.length,
      hashingReduction: Math.round((uniqueSizeCount / files.length) * 100) + '%',
      sizeGroups: fileSizeGroups.size
    })

    // Step 2: Calculate hashes only for files that need it (major optimization!)
    stepTimes.step2Start = performance.now()
    console.log('🔢 PERFORMANCE: Step 2 - Starting optimized hash calculation', { 
      fileCount: filesToHash.length,
      skippedFiles: uniqueSizeCount 
    })
    
    const hashes = new Array(files.length)
    
    if (filesToHash.length > 0) {
      const hashResults = await calculateFileHashesBatch(filesToHash.map(item => item.file))
      // Map hash results back to original file positions
      filesToHash.forEach((item, hashIndex) => {
        hashes[item.index] = hashResults[hashIndex]
      })
    }
    
    // Generate deterministic pseudo-hashes for unique size files (for consistency)
    filesWithUniqueSize.forEach(item => {
      hashes[item.index] = `unique_size_${item.file.size}_${item.file.name}_${item.file.lastModified}`
    })
    
    stepTimes.step2End = performance.now()
    console.log('🔢 PERFORMANCE: Step 2 - Optimized hash calculation completed', {
      timeMs: Math.round(stepTimes.step2End - stepTimes.step2Start),
      avgHashTime: filesToHash.length > 0 ? Math.round((stepTimes.step2End - stepTimes.step2Start) / filesToHash.length) : 0,
      filesHashed: filesToHash.length,
      filesSkipped: uniqueSizeCount,
      optimizationSavings: uniqueSizeCount > 0 ? Math.round((uniqueSizeCount / files.length) * 100) + '% reduction' : 'No savings'
    })
    
    // Step 3: Update file infos with calculated hashes
    stepTimes.step3Start = performance.now()
    fileInfos.forEach((fileInfo, index) => {
      fileInfo.hash = hashes[index]
    })
    stepTimes.step3End = performance.now()
    
    // Step 4: Process exact queue duplicates first (before expensive Firestore queries)
    stepTimes.step4Start = performance.now()
    const uniqueFiles = []
    let exactDuplicatesRemoved = 0
    
    // Get existing queue files (exclude the newly added files from this batch)
    const newFileIds = new Set(fileInfos.map(f => f.id))
    const existingQueueFiles = uploadQueue.value.filter(queueFile => !newFileIds.has(queueFile.id))
    
    for (const fileInfo of fileInfos) {
      const exactQueueMatch = existingQueueFiles.find(queueFile => 
        areExactDuplicates(fileInfo, queueFile)
      )
      
      if (exactQueueMatch) {
        // Update existing file with longer folder path and remove duplicate
        exactQueueMatch.path = getLongerPath(exactQueueMatch.path, fileInfo.path)
        const index = uploadQueue.value.findIndex(f => f.id === fileInfo.id)
        if (index !== -1) {
          console.log('🗑️ DEBUG: Removing exact duplicate from queue', {
            fileName: fileInfo.name,
            originalPath: exactQueueMatch.path,
            duplicatePath: fileInfo.path
          })
          uploadQueue.value.splice(index, 1)
        }
        exactDuplicatesRemoved++
        continue
      }
      
      uniqueFiles.push(fileInfo)
    }
    stepTimes.step4End = performance.now()
    console.log('🔍 PERFORMANCE: Step 4 - Queue duplicate filtering', {
      timeMs: Math.round(stepTimes.step4End - stepTimes.step4Start),
      exactDuplicatesRemoved,
      uniqueFilesRemaining: uniqueFiles.length
    })
    
    if (uniqueFiles.length === 0) {
      const overallEndTime = performance.now()
      console.log('✅ PERFORMANCE: All files were exact duplicates - processing complete', {
        totalTimeMs: Math.round(overallEndTime - overallStartTime),
        finalQueueSize: uploadQueue.value.length,
        finalQueueFiles: uploadQueue.value.map(f => ({ name: f.name, status: f.status }))
      })
      return
    }
    
    // Step 5: Batch duplicate detection with single Firestore query
    stepTimes.step5Start = performance.now()
    console.log('🔥 PERFORMANCE: Step 5 - Starting batch Firestore duplicate detection', {
      uniqueFiles: uniqueFiles.length,
      uniqueFileNames: uniqueFiles.map(f => f.name)
    })
    await checkForDuplicatesBatch(uniqueFiles)
    stepTimes.step5End = performance.now()
    console.log('🔥 PERFORMANCE: Step 5 - Firestore duplicate detection completed', {
      timeMs: Math.round(stepTimes.step5End - stepTimes.step5Start),
      filesChecked: uniqueFiles.length,
      duplicateResults: uniqueFiles.map(f => ({
        name: f.name,
        isDuplicate: f.duplicateResult?.isDuplicate || false,
        type: f.duplicateResult?.type
      }))
    })
    
    // Step 6: Process results and update queue positions
    const processedFiles = []
    
    for (const fileInfo of uniqueFiles) {
      const duplicateResult = fileInfo.duplicateResult
      
      if (duplicateResult.isDuplicate && duplicateResult.exactDuplicate) {
        // Previous exact upload found
        fileInfo.status = 'existing'
        fileInfo.isPreviousUpload = true
        fileInfo.isDuplicate = false
        const uploadDate = duplicateResult.exactDuplicate.uploadDate?.toDate?.() || new Date(duplicateResult.exactDuplicate.uploadDate)
        const formattedDate = uploadDate.toLocaleDateString()
        fileInfo.duplicateMessage = `Previously uploaded by ${duplicateResult.exactDuplicate.uploaderName} on ${formattedDate}.`
      } else {
        // Check for queue duplicates (same hash, different metadata)  
        const queueDuplicateIndex = uploadQueue.value.findIndex(queueFile => 
          !newFileIds.has(queueFile.id) && queueFile.hash === fileInfo.hash && !areExactDuplicates(fileInfo, queueFile)
        )
        
        if (queueDuplicateIndex !== -1) {
          // This is a queue duplicate - position after the original
          fileInfo.status = 'duplicate'
          fileInfo.isQueueDuplicate = true
          fileInfo.isDuplicate = true
          
          // Remove from current position and insert after original
          const currentIndex = uploadQueue.value.findIndex(f => f.id === fileInfo.id)
          if (currentIndex !== -1) {
            uploadQueue.value.splice(currentIndex, 1)
            uploadQueue.value.splice(queueDuplicateIndex + 1, 0, fileInfo)
          }
        } else {
          // This is a new file
          fileInfo.status = 'pending'
          fileInfo.isDuplicate = false
          
          // Check for metadata duplicates from previous uploads
          if (duplicateResult.isDuplicate && duplicateResult.metadataDuplicate) {
            const uploadDate = duplicateResult.metadataDuplicate.uploadDate?.toDate?.() || new Date(duplicateResult.metadataDuplicate.uploadDate)
            const formattedDate = uploadDate.toLocaleDateString()
            fileInfo.duplicateMessage = `Similar file uploaded by ${duplicateResult.metadataDuplicate.uploaderName} on ${formattedDate}. Proceeding with upload to enable comparison.`
          }
        }
      }
      
      processedFiles.push(fileInfo)
    }
    
    // Step 7: Update final status for all remaining files
    stepTimes.step7Start = performance.now()
    uploadQueue.value.forEach(file => {
      if (file.status === 'processing') {
        // Convert 'pending' status to 'ready'
        file.status = 'ready'
      } else if (file.status === 'pending') {
        // Convert 'pending' status to 'ready'
        file.status = 'ready'
      }
      // Note: 'existing' and 'duplicate' statuses are already set correctly in Step 6
    })
    stepTimes.step7End = performance.now()
    
    // Final completion logging
    const overallEndTime = performance.now()
    const totalTime = overallEndTime - overallStartTime
    console.log('🎉 PERFORMANCE: Complete processing pipeline finished', {
      totalTimeMs: Math.round(totalTime),
      totalTimeSec: Math.round(totalTime / 1000 * 100) / 100,
      originalFileCount: files.length,
      processedFileCount: processedFiles.length,
      exactDuplicatesRemoved,
      finalQueueSize: uploadQueue.value.length,
      finalQueueStatus: uploadQueue.value.map(f => ({ 
        name: f.name, 
        status: f.status, 
        isDuplicate: f.isDuplicate,
        isPreviousUpload: f.isPreviousUpload 
      })),
      avgTimePerFile: Math.round(totalTime / files.length * 100) / 100 + 'ms',
      stepBreakdown: {
        queueAddition: Math.round(stepTimes.step1End - stepTimes.step1Start) + 'ms',
        sizePrefiltering: Math.round(stepTimes.step1_5End - stepTimes.step1_5Start) + 'ms',
        optimizedHashCalculation: Math.round(stepTimes.step2End - stepTimes.step2Start) + 'ms',
        queueFiltering: Math.round(stepTimes.step4End - stepTimes.step4Start) + 'ms',
        firestoreQueries: Math.round(stepTimes.step5End - stepTimes.step5Start) + 'ms',
        statusUpdate: Math.round(stepTimes.step7End - stepTimes.step7Start) + 'ms'
      },
      optimizationMetrics: {
        filesWithUniqueSize: uniqueSizeCount,
        hashingReduction: Math.round((uniqueSizeCount / files.length) * 100) + '%',
        totalFilesToHash: filesToHash.length,
        sizeGroups: fileSizeGroups.size
      }
    })
    
  } catch (error) {
    const overallEndTime = performance.now()
    const totalTime = overallEndTime - overallStartTime
    console.error('❌ PERFORMANCE: Processing failed', {
      error: error.message,
      totalTimeBeforeFailure: Math.round(totalTime) + 'ms',
      fileCount: files.length
    })
    
    // Update failed files with error status
    fileInfos.forEach(fileInfo => {
      if (fileInfo.status === 'processing') {
        fileInfo.status = 'error'
        fileInfo.error = 'Processing failed'
      }
    })
  }
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

// Synchronous file info creation for immediate UI feedback
const createFileInfoSync = (file) => {
  return {
    id: crypto.randomUUID(),
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified),
    hash: null, // Will be calculated asynchronously
    status: 'processing', // processing, pending, uploading, completed, error, skipped
    progress: 0,
    path: file.webkitRelativePath || file.name
  }
}

// Legacy async version for compatibility
const createFileInfo = async (file) => {
  const fileInfo = createFileInfoSync(file)
  // Hash will be calculated separately in batch mode
  return fileInfo
}

// Worker pool for parallel hash calculation
const workerPool = ref([])
const WORKER_COUNT = Math.min(navigator.hardwareConcurrency || 4, 8) // Max 8 workers
const isProcessingHashes = ref(false)
const hashingProgress = ref(0)
const hashingTotal = ref(0)

// Initialize worker pool on component mount
onMounted(() => {
  initializeWorkerPool()
})

// Cleanup workers on component unmount  
onUnmounted(() => {
  cleanupWorkerPool()
})

const initializeWorkerPool = () => {
  try {
    for (let i = 0; i < WORKER_COUNT; i++) {
      const worker = new Worker('/hash-worker.js')
      workerPool.value.push(worker)
    }
    console.log(`Initialized ${WORKER_COUNT} hash calculation workers`)
  } catch (error) {
    console.warn('Web Workers not available, falling back to main thread:', error)
  }
}

const cleanupWorkerPool = () => {
  workerPool.value.forEach(worker => {
    worker.terminate()
  })
  workerPool.value = []
}

// Batch hash calculation using worker pool
const calculateFileHashesBatch = async (files) => {
  if (files.length === 0) return []
  
  const hashStartTime = performance.now()
  isProcessingHashes.value = true
  hashingProgress.value = 0
  hashingTotal.value = files.length
  
  console.log('⚙️ PERFORMANCE: Web Worker hash calculation started', {
    fileCount: files.length,
    workerCount: workerPool.value.length,
    usingWorkers: workerPool.value.length > 0
  })
  
  try {
    const hashPromises = files.map((file, index) => {
      return calculateFileHashWithWorker(file, index)
    })
    
    const results = await Promise.allSettled(hashPromises)
    
    // Process results and handle any failures
    const hashes = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        console.error(`Hash calculation failed for file ${index}:`, result.reason)
        // Fallback to a deterministic hash based on file metadata
        return generateFallbackHash(files[index])
      }
    })
    
    const hashEndTime = performance.now()
    const hashTime = hashEndTime - hashStartTime
    console.log('⚡ PERFORMANCE: Web Worker hash calculation completed', {
      totalTimeMs: Math.round(hashTime),
      fileCount: files.length,
      avgTimePerFile: Math.round(hashTime / files.length * 100) / 100 + 'ms',
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      workerCount: workerPool.value.length
    })
    
    return hashes
  } finally {
    isProcessingHashes.value = false
    hashingProgress.value = 0
    hashingTotal.value = 0
  }
}

const calculateFileHashWithWorker = async (file, index) => {
  if (workerPool.value.length === 0) {
    // Fallback to main thread if workers not available
    return await calculateFileHashMainThread(file)
  }
  
  return new Promise((resolve, reject) => {
    // Select worker using round-robin
    const worker = workerPool.value[index % workerPool.value.length]
    const fileId = crypto.randomUUID()
    
    const cleanup = () => {
      worker.removeEventListener('message', messageHandler)
      worker.removeEventListener('error', errorHandler)
    }
    
    const messageHandler = (event) => {
      const { fileId: responseFileId, hash, success, isProgress, error } = event.data
      
      if (responseFileId !== fileId) return
      
      if (isProgress) {
        // Update progress for this file
        hashingProgress.value = Math.min(hashingProgress.value + 0.1, hashingTotal.value)
        return
      }
      
      cleanup()
      
      if (success && hash) {
        hashingProgress.value += 1
        resolve(hash)
      } else {
        reject(new Error(error || 'Hash calculation failed'))
      }
    }
    
    const errorHandler = (error) => {
      cleanup()
      reject(error)
    }
    
    worker.addEventListener('message', messageHandler)
    worker.addEventListener('error', errorHandler)
    
    // Convert file to ArrayBuffer and send to worker
    file.arrayBuffer().then(arrayBuffer => {
      worker.postMessage({
        fileData: arrayBuffer,
        fileId
      })
    }).catch(error => {
      cleanup()
      reject(error)
    })
  })
}

// Fallback hash calculation on main thread
const calculateFileHashMainThread = async (file) => {
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Generate deterministic fallback hash from file metadata
const generateFallbackHash = (file) => {
  const metadata = `${file.name}-${file.size}-${file.lastModified}-${file.type}`
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(metadata))
    .then(buffer => Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0')).join(''))
}

// Helper function for intelligent folder path matching
const isFolderPathMatch = (path1, path2) => {
  if (!path1 || !path2) return path1 === path2
  
  // Normalize paths by removing leading/trailing slashes and converting to lowercase
  const normalize = (path) => path.replace(/^\/+|\/+$/g, '').toLowerCase()
  const normalizedPath1 = normalize(path1)
  const normalizedPath2 = normalize(path2)
  
  // Empty paths (root) match anything
  if (normalizedPath1 === '' || normalizedPath2 === '') return true
  
  // Check if one path contains the other
  return normalizedPath1.includes(normalizedPath2) || normalizedPath2.includes(normalizedPath1)
}

// Helper function to get the longer folder path
const getLongerPath = (path1, path2) => {
  if (!path1) return path2
  if (!path2) return path1
  return path1.length > path2.length ? path1 : path2
}

// Helper function to check if two files are exact duplicates
const areExactDuplicates = (file1, file2) => {
  return file1.hash === file2.hash &&
         file1.name === file2.name &&
         file1.lastModified.getTime() === file2.lastModified.getTime() &&
         isFolderPathMatch(file1.path, file2.path)
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

// Batch duplicate detection for improved performance
const checkForDuplicatesBatch = async (fileInfos) => {
  try {
    // Get current team ID for multi-tenant isolation
    const teamId = authStore.currentTeam
    if (!teamId) {
      console.warn('No team ID available for duplicate detection')
      fileInfos.forEach(fileInfo => {
        fileInfo.duplicateResult = {
          isDuplicate: false,
          exactDuplicate: null,
          metadataDuplicate: null
        }
      })
      return
    }

    // UX: Single batch query instead of N individual queries
    const hashes = fileInfos.map(f => f.hash).filter(Boolean)
    if (hashes.length === 0) {
      fileInfos.forEach(fileInfo => {
        fileInfo.duplicateResult = {
          isDuplicate: false,
          exactDuplicate: null,
          metadataDuplicate: null
        }
      })
      return
    }

    // Batch query to UploadLogService with caching
    const duplicateResults = await UploadLogService.checkForDuplicatesBatch(fileInfos, teamId)
    
    // Apply results back to file infos
    fileInfos.forEach((fileInfo, index) => {
      fileInfo.duplicateResult = duplicateResults[index] || {
        isDuplicate: false,
        exactDuplicate: null,
        metadataDuplicate: null
      }
    })

  } catch (error) {
    console.error('Error checking for duplicates in batch:', error)
    // Return safe fallback if service fails
    fileInfos.forEach(fileInfo => {
      fileInfo.duplicateResult = {
        isDuplicate: false,
        exactDuplicate: null,
        metadataDuplicate: null
      }
    })
  }
}

// Folder options handlers
const confirmFolderOptions = () => {
  // Performance measurement: Start timing
  const startTime = performance.now()
  console.log('🚀 PERFORMANCE: Folder upload processing started', {
    timestamp: new Date().toISOString(),
    totalFiles: pendingFolderFiles.value.length,
    includeSubfolders: includeSubfolders.value
  })
  
  let filesToAdd = pendingFolderFiles.value
  
  if (!includeSubfolders.value) {
    // Filter to only main folder files
    filesToAdd = filesToAdd.filter(f => !f.path.includes('/') || f.path.split('/').length <= 2)
  }
  
  console.log('📁 PERFORMANCE: Files filtered for processing', {
    originalCount: pendingFolderFiles.value.length,
    filteredCount: filesToAdd.length,
    includeSubfolders: includeSubfolders.value
  })
  
  addFilesToQueue(filesToAdd.map(f => f.file)).then(() => {
    // Performance measurement: End timing
    const endTime = performance.now()
    const totalTime = endTime - startTime
    console.log('✅ PERFORMANCE: Folder upload processing completed', {
      timestamp: new Date().toISOString(),
      totalTimeMs: Math.round(totalTime),
      totalTimeSec: Math.round(totalTime / 1000 * 100) / 100,
      filesProcessed: filesToAdd.length,
      avgTimePerFile: Math.round(totalTime / filesToAdd.length * 100) / 100 + 'ms'
    })
  })
  
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
  // Clear the duplicate detection cache when queue is cleared
  // This prevents cached results from interfering with re-adding the same files
  UploadLogService.clearCache()
  console.log('🧹 PERFORMANCE: Cache cleared along with upload queue')
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