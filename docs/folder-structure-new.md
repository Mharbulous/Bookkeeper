# New Feature-Based Folder Structure - File Upload Center

```
📁 src/
├── 📁 features/
│   ├── 📁 file-upload/
│   │   ├── 📁 components/
│   │   │   ├── 📄 CloudFileWarningModal.vue (components/features/upload/CloudFileWarningModal.vue)
│   │   │   ├── 📄 FileQueueChips.vue (components/features/upload/FileQueueChips.vue)
│   │   │   ├── 📄 FileQueuePlaceholder.vue (components/features/upload/FileQueuePlaceholder.vue)
│   │   │   ├── 📄 FileUploadQueue.vue (components/features/upload/FileUploadQueue.vue)
│   │   │   ├── 📄 FileUploadStatus.vue (components/features/upload/FileUploadStatus.vue)
│   │   │   ├── 📄 FolderOptionsDialog.vue (components/features/upload/FolderOptionsDialog.vue)
│   │   │   ├── 📄 LazyFileItem.vue (components/features/upload/LazyFileItem.vue)
│   │   │   ├── 📄 ProcessingProgressModal.vue (components/features/upload/ProcessingProgressModal.vue)
│   │   │   ├── 📄 QueueTimeProgress.vue (components/features/upload/QueueTimeProgress.vue)
│   │   │   ├── 📄 UploadDropzone.vue (components/features/upload/UploadDropzone.vue)
│   │   │   ├── 📄 UploadProgressModal.vue (components/features/upload/UploadProgressModal.vue)
│   │   │   └── 📄 UploadSummaryCard.vue (components/features/upload/UploadSummaryCard.vue)
│   │   ├── 📁 composables/
│   │   │   ├── 📄 useFileDragDrop.js (composables/useFileDragDrop.js)
│   │   │   ├── 📄 useFileMetadata.js (composables/useFileMetadata.js)
│   │   │   ├── 📄 useFileQueue.js (composables/useFileQueue.js)
│   │   │   ├── 📄 useFileQueueCore.js (composables/useFileQueueCore.js)
│   │   │   ├── 📄 useFolderAnalysis.js (composables/useFolderAnalysis.js)
│   │   │   ├── 📄 useFolderOptions.js (composables/useFolderOptions.js)
│   │   │   ├── 📄 useFolderProgress.js (composables/useFolderProgress.js)
│   │   │   ├── 📄 useFolderTimeouts.js (composables/useFolderTimeouts.js)
│   │   │   ├── 📄 useLazyFileList.js (composables/useLazyFileList.js)
│   │   │   ├── 📄 useLazyHashTooltip.js (composables/useLazyHashTooltip.js)
│   │   │   ├── 📄 useQueueCore.js (composables/useQueueCore.js)
│   │   │   ├── 📄 useQueueDeduplication.js (composables/useQueueDeduplication.js)
│   │   │   ├── 📄 useQueueProgress.js (composables/useQueueProgress.js)
│   │   │   ├── 📄 useQueueWorkers.js (composables/useQueueWorkers.js)
│   │   │   ├── 📄 useTimeBasedWarning.js (composables/useTimeBasedWarning.js)
│   │   │   ├── 📄 useUploadLogger.js (composables/useUploadLogger.js)
│   │   │   ├── 📄 useUploadManager.js (composables/useUploadManager.js)
│   │   │   ├── 📄 useWebWorker.js (composables/useWebWorker.js)
│   │   │   └── 📄 useWorkerManager.js (composables/useWorkerManager.js)
│   │   ├── 📁 utils/
│   │   │   ├── 📄 fileAnalysis.js (utils/fileAnalysis.js)
│   │   │   ├── 📄 folderPathUtils.js (utils/folderPathUtils.js)
│   │   │   ├── 📄 hardwareCalibration.js (utils/hardwareCalibration.js)
│   │   │   └── 📄 processingTimer.js (utils/processingTimer.js)
│   │   ├── 📁 workers/
│   │   │   └── 📄 fileHashWorker.js (workers/fileHashWorker.js)
│   │   ├── 📁 views/
│   │   │   └── 📄 FileUpload.vue (views/FileUpload.vue)
│   │   └── 📄 index.js (NEW FILE)
│   └── 📁 file-viewer/
│       ├── 📁 components/
│       ├── 📁 composables/
│       ├── 📁 utils/
│       ├── 📁 views/
│       └── 📄 index.js (NEW FILE)
├── 📁 shared/
│   ├── 📁 components/
│   │   └── 📄 ClearAllButton.vue (components/base/ClearAllButton.vue)
│   └── 📁 composables/
└── 📁 core/
    ├── 📁 stores/
    │   └── 📄 auth.js (stores/auth.js)
    └── 📁 services/
        └── 📄 firebase.js (services/firebase.js)
```