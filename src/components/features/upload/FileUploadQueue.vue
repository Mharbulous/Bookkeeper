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
            size="small"
            variant="flat"
            color="grey"
            class="text-white"
          >
            {{ pendingCount }} new uploads
          </v-chip>
          
          <v-chip
            size="small"
            variant="flat"
            color="orange"
          >
            {{ queueDuplicatesCount }} queued duplicates
          </v-chip>
          
          <v-chip
            size="small"
            variant="flat"
            color="blue"
          >
            {{ previouslyUploadedCount }} previous uploads
          </v-chip>
          
          <v-chip
            size="small"
            variant="flat"
            color="green"
          >
            {{ successfulCount }} successful uploads
          </v-chip>
          
          <v-chip
            size="small"
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
  }
})

// Emits
defineEmits(['remove-file', 'start-upload', 'clear-queue'])

// Computed properties
const uploadableFiles = computed(() => {
  return props.files.filter(file => !file.isExactDuplicate)
})

const skippableFiles = computed(() => {
  return props.files.filter(file => file.isExactDuplicate)
})

const totalSize = computed(() => {
  return uploadableFiles.value.reduce((total, file) => total + file.size, 0)
})

const hasErrors = computed(() => {
  return props.files.some(file => file.status === 'error')
})

const uniqueFileCount = computed(() => {
  const uniqueHashes = new Set(props.files.map(file => file.hash))
  return uniqueHashes.size
})

const pendingCount = computed(() => {
  // Count unique files that are new uploads (first occurrence of each hash)
  const uniquePendingHashes = new Set()
  props.files
    .filter(file => file.status === 'pending' || !file.status)
    .forEach(file => uniquePendingHashes.add(file.hash))
  return uniquePendingHashes.size
})

const queueDuplicatesCount = computed(() => {
  const hashGroups = {}
  props.files.forEach(file => {
    if (!hashGroups[file.hash]) {
      hashGroups[file.hash] = []
    }
    hashGroups[file.hash].push(file)
  })
  
  // Count only the excess duplicates (total in duplicate groups minus one copy of each unique file)
  const duplicateGroups = Object.values(hashGroups).filter(group => group.length > 1)
  const totalDuplicateFiles = duplicateGroups.reduce((sum, group) => sum + group.length, 0)
  const uniqueFilesInDuplicateGroups = duplicateGroups.length
  
  return totalDuplicateFiles - uniqueFilesInDuplicateGroups
})

const previouslyUploadedCount = computed(() => {
  return props.files.filter(file => file.isExactDuplicate).length
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