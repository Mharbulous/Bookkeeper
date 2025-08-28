# Current Folder Structure - File Upload Center Dependencies

```
📁 src/
├── 📁 components/
│   ├── 📁 features/
│   │   └── 📁 upload/
│   │       ├── 📄 CloudFileWarningModal.vue
│   │       ├── 📄 FileQueueChips.vue
│   │       ├── 📄 FileQueuePlaceholder.vue
│   │       ├── 📄 FileUploadQueue.vue
│   │       ├── 📄 FileUploadStatus.vue
│   │       ├── 📄 FolderOptionsDialog.vue
│   │       ├── 📄 LazyFileItem.vue
│   │       ├── 📄 ProcessingProgressModal.vue
│   │       ├── 📄 QueueTimeProgress.vue
│   │       ├── 📄 UploadDropzone.vue
│   │       ├── 📄 UploadProgressModal.vue
│   │       └── 📄 UploadSummaryCard.vue
│   └── 📁 base/
│       └── 📄 ClearAllButton.vue
├── 📁 composables/
│   ├── 📄 useFileDragDrop.js
│   ├── 📄 useFileMetadata.js
│   ├── 📄 useFileQueue.js
│   ├── 📄 useFileQueueCore.js
│   ├── 📄 useFolderAnalysis.js
│   ├── 📄 useFolderOptions.js
│   ├── 📄 useFolderProgress.js
│   ├── 📄 useFolderTimeouts.js
│   ├── 📄 useLazyFileList.js
│   ├── 📄 useLazyHashTooltip.js
│   ├── 📄 useQueueCore.js
│   ├── 📄 useQueueDeduplication.js
│   ├── 📄 useQueueProgress.js
│   ├── 📄 useQueueWorkers.js
│   ├── 📄 useTimeBasedWarning.js
│   ├── 📄 useUploadLogger.js
│   ├── 📄 useUploadManager.js
│   ├── 📄 useWebWorker.js
│   └── 📄 useWorkerManager.js
├── 📁 utils/
│   ├── 📄 fileAnalysis.js
│   ├── 📄 folderPathUtils.js
│   ├── 📄 hardwareCalibration.js
│   └── 📄 processingTimer.js
├── 📁 workers/
│   └── 📄 fileHashWorker.js
├── 📁 views/
│   └── 📄 FileUpload.vue
├── 📁 stores/
│   └── 📄 auth.js
└── 📁 services/
    └── 📄 firebase.js
```