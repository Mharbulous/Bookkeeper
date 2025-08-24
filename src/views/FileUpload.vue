<template>
  <v-container fluid class="pa-6">
    <div class="max-w-4xl mx-auto mt-16">

      <!-- Main Upload Area -->
      <UploadDropzone
        v-if="uploadQueue.length === 0"
        ref="dropzoneRef"
        :is-drag-over="isDragOver"
        @drag-over="handleDragOver"
        @drag-leave="handleDragLeave"
        @drop="handleDrop"
        @trigger-file-select="triggerFileSelectWrapper"
        @trigger-folder-select="triggerFolderSelectWrapper"
        @file-select="handleFileSelect"
        @folder-select="handleFolderSelect"
      />

      <!-- Folder Options Dialog -->
      <FolderOptionsDialog
        :show="showFolderOptions"
        :subfolder-count="subfolderCount"
        :include-subfolders="includeSubfolders"
        :is-analyzing="isAnalyzing"
        :main-folder-analysis="mainFolderAnalysis"
        :all-files-analysis="allFilesAnalysis"
        @update:show="showFolderOptions = $event"
        @update:include-subfolders="includeSubfolders = $event"
        @confirm="confirmFolderOptions"
        @cancel="cancelFolderUpload"
      />


      <!-- Upload Queue/Preview -->
      <FileUploadQueue
        v-if="uploadQueue.length > 0 || isProcessingUIUpdate"
        :files="uploadQueue"
        :is-processing-ui-update="isProcessingUIUpdate"
        :ui-update-progress="uiUpdateProgress"
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

      <!-- Processing Progress Modal -->
      <ProcessingProgressModal
        v-model="processingProgress.isProcessing"
        :progress="processingProgress"
        :can-cancel="true"
        @cancel="handleCancelProcessing"
      />
    </div>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import FileUploadQueue from '../components/features/upload/FileUploadQueue.vue'
import UploadDropzone from '../components/features/upload/UploadDropzone.vue'
import FolderOptionsDialog from '../components/features/upload/FolderOptionsDialog.vue'
import ProcessingProgressModal from '../components/features/upload/ProcessingProgressModal.vue'
import { useFileQueue } from '../composables/useFileQueue.js'
import { useFileDragDrop } from '../composables/useFileDragDrop.js'
import { useQueueDeduplication } from '../composables/useQueueDeduplication.js'
import { useFolderOptions } from '../composables/useFolderOptions.js'

// Component configuration
defineOptions({
  name: 'FileUploadView'
})

// Template refs
const dropzoneRef = ref(null)

// Composables
const {
  uploadQueue,
  showSingleFileNotification,
  singleFileNotification,
  fileInput,
  folderInput,
  processingProgress,
  isProcessingUIUpdate,
  uiUpdateProgress,
  triggerFileSelect,
  triggerFolderSelect,
  processSingleFile,
  addFilesToQueue,
  updateUploadQueue,
  resetProgress,
  removeFromQueue,
  clearQueue,
  startUpload,
  showNotification
} = useFileQueue()

const {
  isDragOver,
  handleDragOver,
  handleDragLeave,
  handleDrop: baseHandleDrop
} = useFileDragDrop()

const {
  processFiles
} = useQueueDeduplication()

const {
  showFolderOptions,
  includeSubfolders,
  subfolderCount,
  isAnalyzing,
  mainFolderAnalysis,
  allFilesAnalysis,
  processFolderEntry,
  processFolderFiles,
  confirmFolderOptions: baseConfirmFolderOptions,
  cancelFolderUpload
} = useFolderOptions()

// Integrate processFiles with updateUploadQueue
const processFilesWithQueue = async (files) => {
  await processFiles(files, updateUploadQueue)
}

// Event handlers with composable integration
const handleFileSelect = async (event) => {
  updateRefs()
  const files = Array.from(event.target.files)
  if (files.length === 1) {
    await processSingleFile(files[0], processFilesWithQueue)
    showNotification('File ready for upload', 'success')
  } else {
    await addFilesToQueue(files, processFilesWithQueue)
  }
  // Reset input
  event.target.value = ''
}

const handleFolderSelect = (event) => {
  updateRefs()
  const files = Array.from(event.target.files)
  // Pass callback to handle no-subfolder case automatically
  processFolderFiles(files, (files) => addFilesToQueue(files, processFilesWithQueue))
  // Reset input
  event.target.value = ''
}

const handleDrop = async (event) => {
  await baseHandleDrop(event, {
    processSingleFile: async (file) => {
      await processSingleFile(file, processFilesWithQueue)
      showNotification('File ready for upload', 'success')
    },
    addFilesToQueue: (files) => addFilesToQueue(files, processFilesWithQueue),
    processFolderEntry: (folder) => processFolderEntry(folder, (files) => addFilesToQueue(files, processFilesWithQueue))
  })
}

const confirmFolderOptions = () => {
  baseConfirmFolderOptions((files) => addFilesToQueue(files, processFilesWithQueue))
}

// Update refs to use composable integration
const updateRefs = () => {
  if (dropzoneRef.value) {
    fileInput.value = dropzoneRef.value.fileInput
    folderInput.value = dropzoneRef.value.folderInput
  }
}

// Ensure refs are updated after component mount
const triggerFileSelectWrapper = () => {
  updateRefs()
  triggerFileSelect()
}

const triggerFolderSelectWrapper = () => {
  updateRefs()
  triggerFolderSelect()
}

// Handle cancel processing for progress modal
const handleCancelProcessing = () => {
  // TODO: Implement in Step 8 - Integration
  resetProgress()
}
</script>

<style scoped>
/* Styles moved to individual components */
</style>