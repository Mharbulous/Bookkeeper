# New Feature-Based Folder Structure - File Upload Center

```
📁 src/
├── 📁 features/
│   ├── 📁 file-upload/
│   │   ├── 📁 components/
│   │   │   ├── 📄 CloudFileWarningModal.vue (from: components/features/upload/CloudFileWarningModal.vue)
│   │   │   ├── 📄 FileQueueChips.vue (from: components/features/upload/FileQueueChips.vue)
│   │   │   ├── 📄 FileQueuePlaceholder.vue (from: components/features/upload/FileQueuePlaceholder.vue)
│   │   │   ├── 📄 FileUploadQueue.vue (from: components/features/upload/FileUploadQueue.vue)
│   │   │   ├── 📄 FileUploadStatus.vue (from: components/features/upload/FileUploadStatus.vue)
│   │   │   ├── 📄 FolderOptionsDialog.vue (from: components/features/upload/FolderOptionsDialog.vue)
│   │   │   ├── 📄 LazyFileItem.vue (from: components/features/upload/LazyFileItem.vue)
│   │   │   ├── 📄 ProcessingProgressModal.vue (from: components/features/upload/ProcessingProgressModal.vue)
│   │   │   ├── 📄 QueueTimeProgress.vue (from: components/features/upload/QueueTimeProgress.vue)
│   │   │   ├── 📄 UploadDropzone.vue (from: components/features/upload/UploadDropzone.vue)
│   │   │   ├── 📄 UploadProgressModal.vue (from: components/features/upload/UploadProgressModal.vue)
│   │   │   └── 📄 UploadSummaryCard.vue (from: components/features/upload/UploadSummaryCard.vue)
│   │   ├── 📁 composables/
│   │   │   ├── 📄 useFileDragDrop.js (from: composables/useFileDragDrop.js)
│   │   │   ├── 📄 useFileMetadata.js (from: composables/useFileMetadata.js)
│   │   │   ├── 📄 useFileQueue.js (from: composables/useFileQueue.js)
│   │   │   ├── 📄 useFileQueueCore.js (from: composables/useFileQueueCore.js)
│   │   │   ├── 📄 useFolderAnalysis.js (from: composables/useFolderAnalysis.js)
│   │   │   ├── 📄 useFolderOptions.js (from: composables/useFolderOptions.js)
│   │   │   ├── 📄 useFolderProgress.js (from: composables/useFolderProgress.js)
│   │   │   ├── 📄 useFolderTimeouts.js (from: composables/useFolderTimeouts.js)
│   │   │   ├── 📄 useLazyFileList.js (from: composables/useLazyFileList.js)
│   │   │   ├── 📄 useLazyHashTooltip.js (from: composables/useLazyHashTooltip.js)
│   │   │   ├── 📄 useQueueCore.js (from: composables/useQueueCore.js)
│   │   │   ├── 📄 useQueueDeduplication.js (from: composables/useQueueDeduplication.js)
│   │   │   ├── 📄 useQueueProgress.js (from: composables/useQueueProgress.js)
│   │   │   ├── 📄 useQueueWorkers.js (from: composables/useQueueWorkers.js)
│   │   │   ├── 📄 useTimeBasedWarning.js (from: composables/useTimeBasedWarning.js)
│   │   │   ├── 📄 useUploadLogger.js (from: composables/useUploadLogger.js)
│   │   │   ├── 📄 useUploadManager.js (from: composables/useUploadManager.js)
│   │   │   ├── 📄 useWebWorker.js (from: composables/useWebWorker.js)
│   │   │   └── 📄 useWorkerManager.js (from: composables/useWorkerManager.js)
│   │   ├── 📁 utils/
│   │   │   ├── 📄 fileAnalysis.js (from: utils/fileAnalysis.js)
│   │   │   ├── 📄 folderPathUtils.js (from: utils/folderPathUtils.js)
│   │   │   ├── 📄 hardwareCalibration.js (from: utils/hardwareCalibration.js)
│   │   │   └── 📄 processingTimer.js (from: utils/processingTimer.js)
│   │   ├── 📁 workers/
│   │   │   └── 📄 fileHashWorker.js (from: workers/fileHashWorker.js)
│   │   ├── 📁 views/
│   │   │   └── 📄 FileUpload.vue (from: views/FileUpload.vue)
│   │   └── 📄 index.js (from: NEW FILE)
│   └── 📁 file-viewer/
│       ├── 📁 components/
│       ├── 📁 composables/
│       ├── 📁 utils/
│       ├── 📁 views/
│       └── 📄 index.js (from: NEW FILE)
├── 📁 shared/
│   ├── 📁 components/
│   │   └── 📄 ClearAllButton.vue (from: components/base/ClearAllButton.vue)
│   └── 📁 composables/
└── 📁 core/
    ├── 📁 stores/
    │   └── 📄 auth.js (from: stores/auth.js)
    └── 📁 services/
        └── 📄 firebase.js (from: services/firebase.js)
```
