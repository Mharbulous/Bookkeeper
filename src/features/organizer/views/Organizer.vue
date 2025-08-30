<template>
  <div class="organizer-container">
    <!-- Header with title and search -->
    <div class="organizer-header">
      <div class="header-content">
        <h1 class="text-h4 font-weight-medium text-primary">
          Document Organizer
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Organize and tag your uploaded documents for easy discovery
        </p>
      </div>
      
      <!-- Search and filter controls -->
      <div class="search-controls">
        <v-text-field
          v-model="searchText"
          placeholder="Search files by name or tags..."
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-magnify"
          hide-details
          clearable
          class="search-field"
          @input="handleSearch"
        />
        <div class="filter-stats">
          <v-chip
            v-if="filteredCount !== evidenceCount"
            size="small"
            variant="outlined"
            color="primary"
          >
            {{ filteredCount }} of {{ evidenceCount }} documents
          </v-chip>
          <v-chip
            v-else
            size="small"
            variant="text"
            color="medium-emphasis"
          >
            {{ evidenceCount }} documents
          </v-chip>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading && !isInitialized" class="loading-container">
      <v-progress-circular indeterminate size="48" />
      <p class="text-body-1 mt-4">Loading documents...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error-container">
      <v-icon size="48" color="error" class="mb-4">mdi-alert-circle</v-icon>
      <p class="text-body-1 text-error mb-4">{{ error }}</p>
      <v-btn color="primary" @click="retryLoad">
        <v-icon start>mdi-refresh</v-icon>
        Retry
      </v-btn>
    </div>

    <!-- Empty state (no documents) -->
    <div v-else-if="!loading && evidenceCount === 0" class="empty-state">
      <v-icon size="64" color="medium-emphasis" class="mb-4">mdi-file-outline</v-icon>
      <h3 class="text-h6 mb-2">No documents found</h3>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Upload some files to get started with organizing your documents.
      </p>
      <v-btn color="primary" to="/upload">
        <v-icon start>mdi-upload</v-icon>
        Go to Uploads
      </v-btn>
    </div>

    <!-- Empty filter state (no matches) -->
    <div v-else-if="!loading && evidenceCount > 0 && filteredCount === 0" class="empty-filter-state">
      <v-icon size="64" color="medium-emphasis" class="mb-4">mdi-file-search-outline</v-icon>
      <h3 class="text-h6 mb-2">No matches found</h3>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Try adjusting your search terms or clearing the filter.
      </p>
      <v-btn variant="outlined" @click="clearSearch">
        <v-icon start>mdi-filter-off</v-icon>
        Clear Search
      </v-btn>
    </div>

    <!-- File list -->
    <div v-else class="file-list-container">

      <!-- File list header -->
      <div class="list-header">
        <div class="list-title">
          <h3 class="text-h6">Documents</h3>
        </div>
        <div class="list-controls">
          <v-btn-toggle
            v-model="viewMode"
            mandatory
            variant="outlined"
            size="small"
          >
            <v-btn value="list">
              <v-icon>mdi-view-list</v-icon>
            </v-btn>
            <v-btn value="grid">
              <v-icon>mdi-view-grid</v-icon>
            </v-btn>
          </v-btn-toggle>
        </div>
      </div>

      <!-- File list/grid -->
      <div class="file-display">
        <!-- List view -->
        <div v-if="viewMode === 'list'" class="file-list">
          <v-card
            v-for="evidence in filteredEvidence"
            :key="evidence.id"
            variant="outlined"
            class="file-item mb-3"
          >
            <v-card-text class="pa-4">
              <div class="file-item-content">
                <!-- File info section -->
                <div class="file-info">
                  <div class="file-icon">
                    <v-icon size="32" :color="getFileIconColor(evidence.displayName)">
                      {{ getFileIcon(evidence.displayName) }}
                    </v-icon>
                  </div>
                  <div class="file-details">
                    <h4 class="file-name text-subtitle-1 font-weight-medium">
                      {{ evidence.displayName }}
                    </h4>
                    <p class="file-metadata text-body-2 text-medium-emphasis">
                      {{ formatFileSize(evidence.fileSize) }} • 
                      {{ getFileExtension(evidence.displayName).toUpperCase() }} • 
                      {{ formatDate(evidence.createdAt) }}
                    </p>
                  </div>
                </div>

                <!-- Tags section -->
                <div class="tags-section">
                  <TagInput
                    :model-value="organizerStore.getAllTags(evidence)"
                    :loading="getTagUpdateLoading(evidence.id)"
                    placeholder="Add tags..."
                    class="tag-input"
                    @update:model-value="handleTagsUpdate(evidence.id, $event)"
                  />
                </div>

                <!-- Actions section -->
                <div class="file-actions">
                  <v-btn
                    icon
                    variant="text"
                    size="small"
                    @click="downloadFile(evidence)"
                  >
                    <v-icon>mdi-download</v-icon>
                    <v-tooltip activator="parent">Download</v-tooltip>
                  </v-btn>
                  <v-menu>
                    <template #activator="{ props }">
                      <v-btn
                        icon
                        variant="text"
                        size="small"
                        v-bind="props"
                      >
                        <v-icon>mdi-dots-vertical</v-icon>
                      </v-btn>
                    </template>
                    <v-list>
                      <v-list-item @click="renameFile(evidence)">
                        <template #prepend>
                          <v-icon>mdi-pencil</v-icon>
                        </template>
                        <v-list-item-title>Rename</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="viewDetails(evidence)">
                        <template #prepend>
                          <v-icon>mdi-information</v-icon>
                        </template>
                        <v-list-item-title>Details</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- Grid view placeholder -->
        <div v-else class="file-grid">
          <p class="text-body-2 text-center text-medium-emphasis pa-8">
            Grid view coming in future updates
          </p>
        </div>
      </div>
    </div>

    <!-- Loading overlay for updates -->
    <v-overlay
      v-model="showUpdateOverlay"
      class="d-flex align-center justify-center"
      contained
    >
      <v-progress-circular indeterminate size="48" />
      <p class="ml-4">Updating tags...</p>
    </v-overlay>

    <!-- Snackbar for notifications -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { useOrganizerStore } from '../stores/organizer.js';
import TagInput from '../components/TagInput.vue';

// Store
const organizerStore = useOrganizerStore();

// State
const searchText = ref('');
const viewMode = ref('list');
const showUpdateOverlay = ref(false);
const tagUpdateLoading = ref(new Set());
const unsubscribe = ref(null);

const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 4000
});

// Computed - use storeToRefs for reactive properties
const {
  filteredEvidence,
  loading,
  error,
  evidenceCount,
  filteredCount,
  isInitialized
} = storeToRefs(organizerStore);

// Methods
const handleSearch = (value) => {
  organizerStore.setFilter(value || '');
};

const clearSearch = () => {
  searchText.value = '';
  organizerStore.clearFilters();
};

const retryLoad = async () => {
  await organizerStore.loadEvidence();
};

const getFileExtension = (filename) => {
  return filename.includes('.')
    ? '.' + filename.split('.').pop().toLowerCase()
    : '';
};

const getFileIcon = (filename) => {
  const ext = getFileExtension(filename);
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
};

const getFileIconColor = (filename) => {
  const ext = getFileExtension(filename);
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
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString();
};

const getTagUpdateLoading = (evidenceId) => {
  return tagUpdateLoading.value.has(evidenceId);
};

const handleTagsUpdate = async (evidenceId, newTags) => {
  try {
    tagUpdateLoading.value.add(evidenceId);
    await organizerStore.updateEvidenceTags(evidenceId, newTags);
    
    showNotification('Tags updated successfully', 'success');
  } catch (error) {
    console.error('Failed to update tags:', error);
    showNotification('Failed to update tags', 'error');
  } finally {
    tagUpdateLoading.value.delete(evidenceId);
  }
};

const downloadFile = () => {
  showNotification('Download functionality coming soon', 'info');
};

const renameFile = () => {
  showNotification('Rename functionality coming soon', 'info');
};

const viewDetails = () => {
  showNotification('Details view coming soon', 'info');
};


const showNotification = (message, color = 'success') => {
  snackbar.value = {
    show: true,
    message,
    color,
    timeout: 4000
  };
};

// Lifecycle
onMounted(async () => {
  try {
    // Load evidence documents
    unsubscribe.value = await organizerStore.loadEvidence();
  } catch (error) {
    console.error('Failed to initialize organizer:', error);
    showNotification('Failed to load documents', 'error');
  }
});

onBeforeUnmount(() => {
  // Clean up listeners
  if (unsubscribe.value) {
    unsubscribe.value();
  }
  organizerStore.reset();
});
</script>

<style scoped>
.organizer-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.organizer-header {
  flex-shrink: 0;
  padding: 24px 32px;
  border-bottom: 1px solid rgb(var(--v-theme-surface-variant));
  background: rgb(var(--v-theme-surface));
}

.header-content {
  margin-bottom: 20px;
}

.search-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-field {
  flex: 1;
  max-width: 400px;
}

.filter-stats {
  flex-shrink: 0;
}

.loading-container,
.error-container,
.empty-state,
.empty-filter-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
}

.file-list-container {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.file-display {
  min-height: 0;
}

.file-item {
  transition: all 0.2s ease-in-out;
}

.file-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.file-item-content {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

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
}

.file-metadata {
  margin: 0;
}

.tags-section {
  flex: 2;
  min-width: 200px;
}

.file-actions {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.file-grid {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .organizer-header {
    padding: 16px 20px;
  }
  
  .file-list-container {
    padding: 16px 20px;
  }
  
  .search-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .search-field {
    max-width: none;
  }
  
  .file-item-content {
    flex-direction: column;
    gap: 16px;
  }
  
  .file-info {
    gap: 16px;
  }
  
  .tags-section {
    min-width: 0;
  }
}
</style>