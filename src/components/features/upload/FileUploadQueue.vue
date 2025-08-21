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
          :disabled="files.length === 0 || isProcessing"
        >
          Clear All
        </v-btn>
        
        <v-btn
          v-if="isProcessing"
          color="warning"
          variant="elevated"
          size="small"
          prepend-icon="mdi-stop"
          @click="$emit('cancel-processing')"
        >
          Cancel Processing
        </v-btn>
        
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-upload"
          @click="$emit('start-upload')"
          :disabled="uploadableFiles.length === 0 || hasErrors || isProcessing"
        >
          Start Upload
        </v-btn>
      </div>
    </v-card-title>

    <v-divider />

    <!-- File List -->
    <div class="pa-4">
      <!-- Upload Status Categories -->
      <div class="mb-4 d-flex flex-wrap gap-2">
        <v-chip
          v-if="queueingFiles.length > 0"
          variant="outlined"
          size="default"
          prepend-icon="mdi-dots-horizontal"
          class="text-grey-darken-2"
        >
          {{ queueingFiles.length }} {{ queueingFiles.length === 1 ? 'queueing' : 'queueing' }}
        </v-chip>
        <v-chip
          v-if="pendingFiles.length > 0"
          color="primary"
          size="default"
          prepend-icon="mdi-clock-outline"
        >
          {{ pendingFiles.length }} {{ pendingFiles.length === 1 ? 'pending' : 'pending' }}
        </v-chip>
        <v-chip
          v-if="queueDuplicates.length > 0"
          color="warning"
          size="default"
          prepend-icon="mdi-content-duplicate"
        >
          {{ queueDuplicates.length }} {{ queueDuplicates.length === 1 ? 'queue duplicate' : 'queue duplicates' }}
        </v-chip>
        <v-chip
          v-if="previouslyUploaded.length > 0"
          color="grey"
          size="default"
          prepend-icon="mdi-history"
        >
          {{ previouslyUploaded.length }} {{ previouslyUploaded.length === 1 ? 'previously uploaded' : 'previously uploaded' }}
        </v-chip>
        <v-chip
          v-if="successfulUploads.length > 0"
          color="success"
          size="default"
          prepend-icon="mdi-check-circle"
        >
          {{ successfulUploads.length }} {{ successfulUploads.length === 1 ? 'uploaded' : 'uploaded' }}
        </v-chip>
        <v-chip
          v-if="failedUploads.length > 0"
          color="error"
          size="default"
          prepend-icon="mdi-alert-circle"
        >
          {{ failedUploads.length }} {{ failedUploads.length === 1 ? 'failed' : 'failed' }}
        </v-chip>
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
              
              <!-- Duplicate indicators -->
              <v-chip
                v-if="file.isDuplicate"
                size="x-small"
                color="warning"
                variant="flat"
                class="me-1"
              >
                Duplicate
              </v-chip>
              
              <v-chip
                v-if="file.isExactDuplicate"
                size="x-small"
                color="error"
                variant="flat"
                class="me-1"
              >
                Will Skip
              </v-chip>
            </v-list-item-title>

            <v-list-item-subtitle>
              <div class="d-flex align-center text-caption text-grey-darken-1">
                <span>{{ formatFileSize(file.size) }}</span>
                <v-divider vertical class="mx-2" />
                <span>{{ formatDate(file.lastModified) }}</span>
                <v-divider vertical class="mx-2" />
                <span>{{ file.type || 'Unknown type' }}</span>
              </div>
              
              <!-- Path for folder uploads -->
              <div v-if="file.path && file.path !== file.name" class="text-caption text-grey-darken-2 mt-1">
                <v-icon icon="mdi-folder-outline" size="12" class="me-1" />
                {{ file.path }}
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
                  :color="getStatusColor(file.status)"
                  size="small"
                  variant="flat"
                  class="me-2"
                >
                  {{ getStatusText(file.status) }}
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
  },
  isProcessing: {
    type: Boolean,
    default: false
  }
})

// Emits
defineEmits(['remove-file', 'start-upload', 'clear-queue', 'cancel-processing'])

// Computed properties for six categories based on status and duplicates
const queueingFiles = computed(() => {
  // Files that are still being processed (no duplicate analysis completed yet)
  // This could be files with status 'queueing' or files without hash/duplicate analysis
  return props.files.filter(file => file.status === 'queueing')
})
const pendingFiles = computed(() => {
  // Track seen hashes to identify queue duplicates
  const seenHashes = new Set()
  
  return props.files.filter(file => {
    // Only include pending files
    if (file.status !== 'pending') {
      return false
    }
    
    // Skip exact duplicates (historical)
    if (file.isExactDuplicate) {
      return false
    }
    
    // For queue duplicates, only keep the first occurrence
    if (seenHashes.has(file.hash)) {
      return false // This is a queue duplicate
    }
    
    seenHashes.add(file.hash)
    return true // This is the first occurrence and pending
  })
})

const queueDuplicates = computed(() => {
  const seenHashes = new Set()
  
  return props.files.filter(file => {
    // Skip exact duplicates (historical) - they're in their own category
    if (file.isExactDuplicate) {
      return false
    }
    
    // Skip completed/failed files - they're in their own categories
    if (file.status === 'completed' || file.status === 'error') {
      return false
    }
    
    // For queue duplicates, skip the first occurrence but include subsequent ones
    if (seenHashes.has(file.hash)) {
      return true // This is a queue duplicate (2nd, 3rd, etc. occurrence)
    }
    
    seenHashes.add(file.hash)
    return false // This is the first occurrence, so it's not a queue duplicate
  })
})

const previouslyUploaded = computed(() => {
  return props.files.filter(file => file.isExactDuplicate)
})

const successfulUploads = computed(() => {
  return props.files.filter(file => file.status === 'completed')
})

const failedUploads = computed(() => {
  return props.files.filter(file => file.status === 'error')
})

// Keep these for backward compatibility with existing logic
const uploadableFiles = computed(() => {
  return pendingFiles.value
})

const skippableFiles = computed(() => {
  return [...queueDuplicates.value, ...previouslyUploaded.value]
})

const totalSize = computed(() => {
  return uploadableFiles.value.reduce((total, file) => total + file.size, 0)
})

const hasErrors = computed(() => {
  return props.files.some(file => file.status === 'error')
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

const getStatusColor = (status) => {
  const statusColors = {
    pending: 'grey',
    uploading: 'primary',
    completed: 'success',
    error: 'error',
    skipped: 'warning'
  }
  return statusColors[status] || 'grey'
}

const getStatusText = (status) => {
  const statusTexts = {
    pending: 'Pending',
    uploading: 'Uploading',
    completed: 'Completed',
    error: 'Error',
    skipped: 'Skipped'
  }
  return statusTexts[status] || 'Unknown'
}

const getDuplicateMessageClass = (file) => {
  if (file.isExactDuplicate) return 'text-error'
  if (file.isDuplicate) return 'text-warning'
  return 'text-info'
}

const getDuplicateIcon = (file) => {
  if (file.isExactDuplicate) return 'mdi-close-circle'
  if (file.isDuplicate) return 'mdi-alert-circle'
  return 'mdi-information'
}
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>