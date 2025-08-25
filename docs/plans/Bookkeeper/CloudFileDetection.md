# Cloud File Detection Implementation Plan

## Overview
Implement sophisticated cloud file detection with graceful partial processing and selective real-time user feedback.

## Problem Statement
When users drag OneDrive cloud folders into the application, the folder analysis gets stuck because `reader.readEntries()` hangs waiting for cloud files to download. This creates a poor user experience with indefinite loading states.

## Solution: Two-Tier Timeout System

### Core Architecture
- **Local timeouts**: 1 second per directory (prevents individual stuck folders)  
- **Global timeout**: 15 seconds total (extended because users can cancel manually)
- **Global timer resets**: Every time ANY directory is successfully processed
- **Cascade prevention**: Child timeouts cancel parent timers to avoid multiple timeout messages

### Real-Time UI Feedback Strategy
- **Initial message**: "Scanning folders..." (shown immediately)
- **Skip notifications**: Only update when folders are skipped: `⚠️ Skipped "folder-name"`
- **Completion message**: `✅ Analysis complete: Estimated deduplication time is ___ seconds.`
- **Display location**: Replace "Calculating estimate..." in time estimate area of FolderOptionsDialog

## Technical Implementation

### State Management (useFolderOptions.js)
```javascript
// New reactive state
const currentProgressMessage = ref('Scanning folders...')
const skippedFolders = ref([])  // Array of skipped folder paths for deduplication reference
const globalTimeoutId = ref(null)
const activeLocalTimeouts = ref(new Set())

// Message update function
const updateProgressMessage = (message) => {
  currentProgressMessage.value = message
}

// Helper function to check if a file path is in a skipped folder
const isFileInSkippedFolder = (filePath) => {
  return skippedFolders.value.some(skippedPath => 
    filePath.startsWith(skippedPath)
  )
}
```

### Modified readDirectoryRecursive Function
```javascript
const readDirectoryRecursive = (dirEntry, parentTimeoutClearer = null) => {
  return new Promise((resolve) => {
    const files = []
    const reader = dirEntry.createReader()
    
    // Local timeout (1 second per directory)
    const myTimeoutId = setTimeout(() => {
      const folderName = dirEntry.fullPath.split('/').pop() || 'folder'
      
      // Update UI with skip notification
      updateProgressMessage(`⚠️ Skipped "${folderName}"`)
      
      // Track skipped folder
      skippedFolders.value.push(dirEntry.fullPath)
      
      // Cancel parent timeout (prevent cascade)
      if (parentTimeoutClearer) parentTimeoutClearer()
      
      // Clean up
      activeLocalTimeouts.value.delete(myTimeoutId)
      resolve([])
    }, 1000)
    
    activeLocalTimeouts.value.add(myTimeoutId)
    
    const clearMyTimeout = () => {
      if (myTimeoutId) {
        clearTimeout(myTimeoutId)
        activeLocalTimeouts.value.delete(myTimeoutId)
      }
    }
    
    const readEntries = () => {
      reader.readEntries(async (entries) => {
        clearMyTimeout()
        
        // Reset global timer - we made progress!
        resetGlobalTimeout()
        
        if (entries.length === 0) {
          resolve(files)
          return
        }
        
        // Process entries recursively
        for (const entry of entries) {
          if (entry.isFile) {
            const file = await new Promise(resolve => entry.file(resolve))
            files.push({ file, path: entry.fullPath })
          } else if (entry.isDirectory) {
            const subFiles = await readDirectoryRecursive(entry, clearMyTimeout)
            files.push(...subFiles)
          }
        }
        
        readEntries()
      })
    }
    
    readEntries()
  })
}
```

### Global Timer Management
```javascript
const resetGlobalTimeout = () => {
  if (globalTimeoutId.value) {
    clearTimeout(globalTimeoutId.value)
  }
  
  globalTimeoutId.value = setTimeout(() => {
    // Clear all active local timeouts
    activeLocalTimeouts.value.forEach(clearTimeout)
    activeLocalTimeouts.value.clear()
    
    // Trigger complete operation failure
    analysisTimedOut.value = true
    timeoutError.value = "Analysis timed out after 15 seconds - likely contains cloud files"
  }, 15000) // 15 seconds
}

const startGlobalTimeout = () => {
  resetGlobalTimeout() // Initial start
}
```

### Integration Points

#### When Analysis Starts
```javascript
const processFolderEntry = (dirEntry, callback) => {
  // Set initial message
  updateProgressMessage('Scanning folders...')
  
  // Start global timeout
  startGlobalTimeout()
  
  // Begin recursive analysis
  const files = await readDirectoryRecursive(dirEntry)
  // ... continue with existing logic
}
```

#### When Analysis Completes
```javascript
// After successful analysis completion
const timeSeconds = allFilesAnalysis.value.timeSeconds
updateProgressMessage(`✅ Analysis complete: Estimated deduplication time is ${formatTime(timeSeconds)}.`)
```

### UI Integration (FolderOptionsDialog.vue)

**Replace time estimate display section:**
```vue
<!-- Time Estimate Display with Real-time Progress -->
<div v-if="analysisTimedOut" class="text-h6 font-weight-medium text-error">
  Analysis failed
</div>
<div v-else-if="isAnalyzing" class="text-body-1 text-grey-darken-1">
  {{ currentProgressMessage }}
</div>
<div v-else-if="!isAnalyzing && getSelectedAnalysis" class="text-h6 font-weight-medium text-primary">
  Time estimate: {{ formatTime(getSelectedAnalysis.timeSeconds) }}
</div>
```

**Add currentProgressMessage prop:**
```javascript
const props = defineProps({
  // ... existing props
  currentProgressMessage: {
    type: String,
    default: ''
  }
})
```

### FileUpload.vue Integration
```vue
<!-- Pass both progress message and skipped folders to dialog -->
<FolderOptionsDialog
  :current-progress-message="currentProgressMessage"
  :skipped-folders="skippedFolders"
  // ... other props
/>
```

### Skipped Folders Usage in Later Operations

#### During Deduplication Phase
```javascript
// In useQueueDeduplication.js or similar
const processFiles = async (files, updateCallback) => {
  // Filter out files from skipped folders before deduplication
  const validFiles = files.filter(file => !isFileInSkippedFolder(file.webkitRelativePath || file.name))
  
  console.log(`Filtered out ${files.length - validFiles.length} files from skipped cloud folders`)
  
  // Continue with normal deduplication on valid files only
  // ... existing deduplication logic
}
```

#### During File Upload Phase
```javascript
// In file upload operations
const uploadFiles = async (files) => {
  // Double-check: exclude any files that might be from skipped folders
  const safeFiles = files.filter(file => !isFileInSkippedFolder(file.path || file.webkitRelativePath))
  
  // Proceed with upload for safe files only
  // ... existing upload logic
}
```

#### Exposing Skipped Folders from Composable
```javascript
// In useFolderOptions.js return statement
return {
  // ... existing returns
  skippedFolders: readonly(skippedFolders),
  isFileInSkippedFolder,
  clearSkippedFolders: () => { skippedFolders.value = [] }
}
```

## User Experience Flow

1. **User drops folder** → "Scanning folders..." appears immediately
2. **Analysis proceeds** → Message stays "Scanning folders..." for successful directories
3. **Cloud folder detected** → Message updates: "⚠️ Skipped 'OneDrive-vacation'"
4. **More cloud folders** → Message updates: "⚠️ Skipped 'work-docs'"
5. **User sees pattern** → Can click Cancel if desired
6. **Analysis completes** → "✅ Analysis complete: Estimated deduplication time is 45 seconds."
7. **User proceeds** → Deduplication phase skips known cloud folder paths

## Benefits

### Technical Benefits
- **Extended global timeout** (15 seconds) - safe because users control cancellation
- **No cascading timeouts** - clean single warnings per stuck directory
- **Partial processing** - skip cloud folders, process local files successfully
- **Resource efficient** - timers cleaned up promptly

### User Experience Benefits
- **Selective feedback** - only show important updates (skipped folders and completion)
- **User control** - clear information to make cancellation decisions
- **Seamless UI** - progress messages appear in expected location
- **Transparency** - users understand what was processed vs skipped

## Edge Cases Handled

1. **All cloud files** → Global timeout fires after 15 seconds
2. **Mixed local/cloud** → Skip cloud folders, process local ones
3. **Nested cloud folders** → Parent timeout cancelled when child times out
4. **Large folder structures** → Global timeout only fires if no progress for 15 seconds
5. **User cancellation** → All timeouts cleaned up properly

## Files to Modify

1. **useFolderOptions.js**: Replace current timeout/progress logic with two-tier system + add skipped folders tracking
2. **FolderOptionsDialog.vue**: Update time estimate display area for selective real-time messages
3. **FileUpload.vue**: Pass currentProgressMessage and skippedFolders props to dialog
4. **useQueueDeduplication.js**: Add filtering logic to exclude files from skipped folders
5. **Remove**: Current progress monitoring code (checkProgress functions and related logic)

## Integration with Existing Systems

### Skipped Folders Reference System
The `skippedFolders` array serves as a persistent reference throughout the file processing pipeline:

1. **Folder Analysis Phase**: Populates array with paths of timed-out directories
2. **Deduplication Phase**: Filters out files from skipped paths before hash processing  
3. **Upload Phase**: Double-check exclusion of files from problematic folders
4. **UI Display**: Show user which folders were excluded and why

This prevents the system from attempting to process cloud files in later operations, avoiding additional hangs during deduplication or upload phases.

## Testing Scenarios

1. **Small local folder** → "Scanning folders..." → completion message quickly
2. **Large local folder** → "Scanning folders..." → completion message after processing
3. **OneDrive cloud folder** → "Scanning folders..." → multiple skip messages → completion or timeout
4. **Mixed folder** → "Scanning folders..." → some skip messages → completion with partial results

## Future Enhancements

- Could add folder counts to skip messages: "⚠️ Skipped 'vacation' (OneDrive folder)"
- Could show total skipped count in completion message: "Analysis complete (2 folders skipped)"
- Could persist skipped folders list for user review after completion