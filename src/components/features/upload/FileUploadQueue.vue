<template>
  <v-card class="mt-6" variant="outlined">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon icon="mdi-format-list-bulleted" class="me-2" />
        Upload Queue
      </div>
      
      <div class="d-flex gap-2">
        <v-btn
          variant="text"
          size="small"
          prepend-icon="mdi-delete-sweep"
          @click="$emit('clear-queue')"
          :disabled="files.length === 0"
        >
          Clear All
        </v-btn>
        
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-upload"
          @click="$emit('start-upload')"
          :disabled="files.length === 0 || hasErrors"
        >
          Start Upload
        </v-btn>
      </div>
    </v-card-title>

    <v-divider />

    <!-- File List -->
    <div class="pa-4">
      <!-- Status Tags -->
      <div v-if="files.length > 0" class="mb-4">
        <div class="d-flex gap-2 flex-wrap">
          <v-chip
            size="large"
            variant="flat"
            color="grey"
            class="text-white"
          >
            {{ pendingCount }} new
          </v-chip>
          
          <v-chip
            size="large"
            variant="flat"
            color="orange"
          >
            {{ queueDuplicatesCount }} duplicates
          </v-chip>
          
          <v-chip
            size="large"
            variant="flat"
            color="blue"
          >
            {{ previouslyUploadedCount }} previous uploads
          </v-chip>
          
          <v-chip
            size="large"
            variant="flat"
            color="green"
          >
            {{ successfulCount }} successful uploads
          </v-chip>
          
          <v-chip
            size="large"
            variant="flat"
            color="red"
          >
            {{ failedCount }} failed uploads
          </v-chip>
        </div>
      </div>

      <!-- Files List -->
      <v-list lines="two" density="comfortable">
        <template v-for="(file, index) in files" :key="file.id">
          <v-list-item class="px-0">
            <template #prepend>
              <v-avatar color="grey-lighten-3" size="48">
                <v-icon :icon="getFileIcon(file.type)" size="24" />
              </v-avatar>
            </template>

            <v-list-item-title class="d-flex align-center">
              <span class="text-truncate me-2">{{ file.name }}</span>
            </v-list-item-title>

            <v-list-item-subtitle>
              <div class="d-flex align-center text-caption text-grey-darken-1">
                <span>{{ formatFileSize(file.size) }}</span>
                <v-divider vertical class="mx-2" />
                <span>{{ formatDate(file.lastModified) }}</span>
                <v-divider vertical class="mx-2" />
                <span>{{ getRelativePath(file) }}</span>
              </div>
              
              <!-- Duplicate messages -->
              <div v-if="file.duplicateMessage" class="text-caption mt-1" :class="getDuplicateMessageClass(file)">
                <v-icon :icon="getDuplicateIcon(file)" size="12" class="me-1" />
                {{ file.duplicateMessage }}
              </div>
            </v-list-item-subtitle>

            <template #append>
              <div class="d-flex align-center">
                <!-- Status indicator -->
                <v-chip
                  :color="getStatusColor(file.status, file)"
                  size="small"
                  variant="flat"
                  class="me-2"
                >
                  {{ getStatusText(file.status, file) }}
                </v-chip>
                
                <!-- Remove button -->
                <v-btn
                  icon="mdi-close"
                  size="small"
                  variant="text"
                  @click="$emit('remove-file', file.id)"
                />
              </div>
            </template>
          </v-list-item>
          
          <v-divider v-if="index < files.length - 1" />
        </template>
      </v-list>

      <!-- Empty state -->
      <div v-if="files.length === 0" class="text-center py-8">
        <v-icon icon="mdi-file-outline" size="48" color="grey-lighten-1" class="mb-2" />
        <p class="text-body-1 text-grey-darken-1">No files in queue</p>
        <p class="text-caption text-grey-darken-2">Drag and drop files or use the upload buttons above</p>
      </div>
    </div>

    <!-- Upload Summary -->
    <v-card-actions v-if="files.length > 0" class="bg-grey-lighten-5">
      <div class="d-flex w-100 justify-space-between align-center">
        <div class="text-body-2 text-grey-darken-1">
          <strong>{{ uploadableFiles.length }}</strong> files ready for upload
          <span v-if="skippableFiles.length > 0">
            • <strong>{{ skippableFiles.length }}</strong> will be skipped
          </span>
        </div>
        
        <div class="text-body-2 text-grey-darken-1">
          Total size: <strong>{{ formatFileSize(totalSize) }}</strong>
        </div>
      </div>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

// Component configuration
defineOptions({
  name: 'FileUploadQueue'
})

// Props
const props = defineProps({
  files: {
    type: Array,
    required: true,
    default: () => []
  }
})

// Emits
defineEmits(['remove-file', 'start-upload', 'clear-queue'])

// Computed properties
const uploadableFiles = computed(() => {
  return props.files.filter(file => !file.isDuplicate)
})

const skippableFiles = computed(() => {
  return props.files.filter(file => file.isDuplicate)
})

const totalSize = computed(() => {
  return uploadableFiles.value.reduce((total, file) => total + file.size, 0)
})

const hasErrors = computed(() => {
  return props.files.some(file => file.status === 'error')
})


const pendingCount = computed(() => {
  return props.files.filter(file => file.status === 'pending' || (!file.status && !file.isQueueDuplicate && !file.isPreviousUpload)).length
})

const queueDuplicatesCount = computed(() => {
  return props.files.filter(file => file.isQueueDuplicate).length
})

const previouslyUploadedCount = computed(() => {
  return props.files.filter(file => file.isPreviousUpload).length
})

const successfulCount = computed(() => {
  return props.files.filter(file => file.status === 'completed').length
})

const failedCount = computed(() => {
  return props.files.filter(file => file.status === 'error').length
})

// Methods
const getFileIcon = (mimeType) => {
  if (!mimeType) return 'mdi-file-outline'
  
  const iconMap = {
    'image/': 'mdi-file-image-outline',
    'video/': 'mdi-file-video-outline',
    'audio/': 'mdi-file-music-outline',
    'application/pdf': 'mdi-file-pdf-box',
    'application/msword': 'mdi-file-word-outline',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'mdi-file-word-outline',
    'application/vnd.ms-excel': 'mdi-file-excel-outline',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'mdi-file-excel-outline',
    'application/vnd.ms-powerpoint': 'mdi-file-powerpoint-outline',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'mdi-file-powerpoint-outline',
    'text/': 'mdi-file-document-outline',
    'application/zip': 'mdi-folder-zip-outline',
    'application/x-rar': 'mdi-folder-zip-outline',
    'application/x-7z-compressed': 'mdi-folder-zip-outline'
  }
  
  // Check for exact match first
  if (iconMap[mimeType]) {
    return iconMap[mimeType]
  }
  
  // Check for prefix match
  for (const [prefix, icon] of Object.entries(iconMap)) {
    if (mimeType.startsWith(prefix)) {
      return icon
    }
  }
  
  return 'mdi-file-outline'
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const getStatusColor = (status, file) => {
  const statusColors = {
    pending: 'grey',
    uploading: 'primary',
    completed: 'success',
    error: 'error',
    duplicate: 'orange',
    existing: 'blue'
  }
  
  // Handle special cases based on file properties
  if (file?.isQueueDuplicate) return 'orange'
  if (file?.isPreviousUpload) return 'blue'
  
  return statusColors[status] || 'grey'
}

const getStatusText = (status, file) => {
  const statusTexts = {
    pending: 'Ready',
    uploading: 'Uploading',
    completed: 'Completed',
    error: 'Error',
    duplicate: 'Duplicate',
    existing: 'Existing'
  }
  
  // Handle special cases based on file properties
  if (file?.isQueueDuplicate) return 'Duplicate'
  if (file?.isPreviousUpload) return 'Existing'
  
  return statusTexts[status] || 'Unknown'
}

const getDuplicateMessageClass = (file) => {
  if (file.isPreviousUpload) return 'text-blue'
  if (file.isQueueDuplicate) return 'text-orange'
  return 'text-info'
}

const getDuplicateIcon = (file) => {
  if (file.isPreviousUpload) return 'mdi-cloud-check'
  if (file.isQueueDuplicate) return 'mdi-content-duplicate'
  return 'mdi-information'
}

const getRelativePath = (file) => {
  if (!file.path || file.path === file.name) {
    return '\\'
  }
  
  // Extract the folder path by removing the filename
  const pathParts = file.path.split('/')
  pathParts.pop() // Remove the filename
  
  if (pathParts.length === 0) {
    return '\\'
  }
  
  return '/' + pathParts.join('/')
}
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>