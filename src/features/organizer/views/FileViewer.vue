<template>
  <div class="file-viewer">
    <div class="file-viewer-header">
      <h1>File Viewer</h1>
      <!-- Search and filter components -->
      <FileSearch />
      <ViewModeToggle />
      <FileTypeFilters />
    </div>
    
    <div class="file-viewer-content">
      <div class="file-list-section">
        <!-- File grid/list display -->
        <FileGrid 
          v-if="viewMode === 'grid'"
          :files="filteredFiles"
          @file-select="handleFileSelect"
        />
        
        <!-- Loading state -->
        <div v-if="loading" class="loading-container">
          <v-progress-circular indeterminate />
          <p>Loading files...</p>
        </div>
        
        <!-- Empty state -->
        <div v-if="!loading && filteredFiles.length === 0" class="empty-state">
          <v-icon size="64" color="grey lighten-1">mdi-file-outline</v-icon>
          <h3>No files found</h3>
          <p>Upload some files to get started</p>
        </div>
      </div>
      
      <div v-if="selectedFile" class="file-preview-section">
        <!-- File preview -->
        <FilePreview 
          :file="selectedFile"
          :preview-data="previewData"
          :loading="previewLoading"
          :error="previewError"
        />
        
        <!-- File details sidebar -->
        <FileDetails 
          :file="selectedFile"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import FileGrid from '../components/FileGrid.vue'
import FileSearch from '../components/FileSearch.vue'
import FilePreview from '../components/FilePreview.vue'
import FileDetails from '../components/FileDetails.vue'
import ViewModeToggle from '../components/ViewModeToggle.vue'
import FileTypeFilters from '../components/FileTypeFilters.vue'

import { useFileViewer } from '../composables/useFileViewer.js'
import { useFileSearch } from '../composables/useFileSearch.js'
import { useFilePreview } from '../composables/useFilePreview.js'
import { useViewerNavigation } from '../composables/useViewerNavigation.js'

// Main file viewer functionality
const { 
  files, 
  loading, 
  error, 
  loadFiles 
} = useFileViewer()

// Search and filtering
const { 
  filteredFiles 
} = useFileSearch(files)

// File preview
const { 
  selectedFile, 
  previewData, 
  previewLoading, 
  previewError, 
  selectFile 
} = useFilePreview()

// Navigation and view modes
const { 
  viewMode 
} = useViewerNavigation(filteredFiles)

// Event handlers
const handleFileSelect = async (file) => {
  await selectFile(file)
}

// Initialize on mount
onMounted(async () => {
  await loadFiles()
})
</script>

<style scoped>
.file-viewer {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.file-viewer-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.file-viewer-content {
  flex: 1;
  display: flex;
  min-height: 0;
}

.file-list-section {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.file-preview-section {
  width: 400px;
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 1rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  text-align: center;
  color: var(--text-color-secondary);
}

.empty-state h3 {
  margin: 1rem 0 0.5rem;
}

.empty-state p {
  margin: 0;
}
</style>