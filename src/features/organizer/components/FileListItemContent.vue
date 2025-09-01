<template>
  <div class="file-info">
    <div class="file-icon">
      <v-icon size="32" :color="fileIconColor">
        {{ fileIcon }}
      </v-icon>
    </div>
    <div class="file-details">
      <h4 class="file-name text-subtitle-1 font-weight-medium">
        {{ displayName }}
      </h4>
      <p class="file-metadata text-body-2 text-medium-emphasis">
        {{ formattedFileSize }} • 
        {{ fileExtension.toUpperCase() }} • 
        {{ formattedDate }}
      </p>
      <div v-if="showProcessingStage && processingStage !== 'uploaded'" class="processing-stage">
        <span
          class="processing-badge"
          :class="`processing-badge--${processingStage}`"
        >
          {{ processingStageText }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeMount } from 'vue';

// Debug logging helper
const debugLog = (message, data = null) => {
  const timestamp = new Date().toISOString().substring(11, 23);
  console.log(`[${timestamp}] [FileListItemContent] ${message}`, data || '');
};

// Performance tracking
const renderStart = performance.now();
let setupComplete = null;
let beforeMountTime = null;

// Props
const props = defineProps({
  // Evidence/file data
  evidence: {
    type: Object,
    required: true,
  },
  
  // Display options
  showProcessingStage: {
    type: Boolean,
    default: false,
  },
});

// Computed properties for file display
const displayName = computed(() => {
  return props.evidence?.displayName || 'Unnamed file';
});

const fileExtension = computed(() => {
  const filename = props.evidence?.displayName || '';
  return filename.includes('.')
    ? '.' + filename.split('.').pop().toLowerCase()
    : '';
});

const processingStage = computed(() => {
  return props.evidence?.processingStage || 'uploaded';
});

const formattedFileSize = computed(() => {
  const bytes = props.evidence?.fileSize || 0;
  if (!bytes) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
});

const formattedDate = computed(() => {
  const timestamp = props.evidence?.createdAt;
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString();
});

const fileIcon = computed(() => {
  const ext = fileExtension.value.toLowerCase();
  const iconMap = {
    '.pdf': 'mdi-file-pdf-box',
    '.doc': 'mdi-file-word-box',
    '.docx': 'mdi-file-word-box',
    '.xls': 'mdi-file-excel-box',
    '.xlsx': 'mdi-file-excel-box',
    '.ppt': 'mdi-file-powerpoint-box',
    '.pptx': 'mdi-file-powerpoint-box',
    '.txt': 'mdi-file-document-outline',
    '.jpg': 'mdi-file-image-outline',
    '.jpeg': 'mdi-file-image-outline',
    '.png': 'mdi-file-image-outline',
    '.gif': 'mdi-file-image-outline',
    '.zip': 'mdi-folder-zip-outline',
    '.rar': 'mdi-folder-zip-outline'
  };
  return iconMap[ext] || 'mdi-file-outline';
});

const fileIconColor = computed(() => {
  const ext = fileExtension.value.toLowerCase();
  const colorMap = {
    '.pdf': 'red-darken-1',
    '.doc': 'blue-darken-1',
    '.docx': 'blue-darken-1',
    '.xls': 'green-darken-1',
    '.xlsx': 'green-darken-1',
    '.ppt': 'orange-darken-1',
    '.pptx': 'orange-darken-1',
    '.jpg': 'purple-darken-1',
    '.jpeg': 'purple-darken-1',
    '.png': 'purple-darken-1',
    '.gif': 'purple-darken-1'
  };
  return colorMap[ext] || 'grey-darken-1';
});

// Removed processingStageColor computed property - using CSS classes instead

const processingStageText = computed(() => {
  const stageTexts = {
    'uploaded': 'Uploaded',
    'splitting': 'Processing',
    'merging': 'Merging',
    'complete': 'Complete'
  };
  return stageTexts[processingStage.value] || processingStage.value;
});

// Performance tracking - mark setup completion
setupComplete = performance.now();

// Lifecycle performance tracking (disabled - optimization complete)
onBeforeMount(() => {
  beforeMountTime = performance.now();
  // Debugging disabled for production performance
});

onMounted(() => {
  // Performance tracking disabled - optimization complete
});
</script>

<style scoped>
.file-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.file-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  margin-bottom: 4px;
  word-break: break-word;
  line-height: 1.2;
}

.file-metadata {
  margin: 0 0 4px 0;
  line-height: 1.2;
}

.processing-stage {
  margin-top: 4px;
}

.processing-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1.2;
}

.processing-badge--splitting {
  background-color: rgba(33, 150, 243, 0.12);
  color: rgb(33, 150, 243);
  border: 1px solid rgba(33, 150, 243, 0.2);
}

.processing-badge--merging {
  background-color: rgba(255, 152, 0, 0.12);
  color: rgb(255, 152, 0);
  border: 1px solid rgba(255, 152, 0, 0.2);
}

.processing-badge--complete {
  background-color: rgba(76, 175, 80, 0.12);
  color: rgb(76, 175, 80);
  border: 1px solid rgba(76, 175, 80, 0.2);
}

.processing-badge--uploaded {
  background-color: rgba(158, 158, 158, 0.12);
  color: rgb(158, 158, 158);
  border: 1px solid rgba(158, 158, 158, 0.2);
}

/* Responsive design */
@media (max-width: 768px) {
  .file-info {
    gap: 16px;
  }
}

/* Compact mode */
.file-list-item.compact .file-icon {
  width: 32px;
  height: 32px;
}

.file-list-item.compact .file-details {
  gap: 2px;
}
</style>