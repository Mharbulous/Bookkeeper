# Modular Restructuring Checklist

| Original File Path (relative to src) | New File Path (relative to src) | File Moved? | Old File Cleaned up? | References Updated Throughout Codebase? | Validated Functionality? |
|---------------------------------------|----------------------------------|-------------|---------------------|----------------------------------------|-------------------------|
| `components/features/upload/CloudFileWarningModal.vue` | `features/file-upload/components/CloudFileWarningModal.vue` | ☑ | ☑ | ☑ | ☐ |
| `components/features/upload/FileQueueChips.vue` | `features/file-upload/components/FileQueueChips.vue` | ☑ | ☑ | ☑ | ☐ |
| `components/features/upload/FileQueuePlaceholder.vue` | `features/file-upload/components/FileQueuePlaceholder.vue` | ☑ | ☑ | ☑ | ☐ |
| `components/features/upload/FileUploadQueue.vue` | `features/file-upload/components/FileUploadQueue.vue` | ☑ | ☑ | ☑ | ☐ |
| `components/features/upload/FileUploadStatus.vue` | `features/file-upload/components/FileUploadStatus.vue` | ☑ | ☑ | ☑ | ☐ |
| `components/features/upload/FolderOptionsDialog.vue` | `features/file-upload/components/FolderOptionsDialog.vue` | ☑ | ☑ | ☑ | ☐ |
| `components/features/upload/LazyFileItem.vue` | `features/file-upload/components/LazyFileItem.vue` | ☑ | ☑ | ☑ | ☐ |
| `components/features/upload/ProcessingProgressModal.vue` | `features/file-upload/components/ProcessingProgressModal.vue` | ☑ | ☑ | ☑ | ☐ |
| `components/features/upload/QueueTimeProgress.vue` | `features/file-upload/components/QueueTimeProgress.vue` | ☑ | ☑ | ☑ | ☐ |
| `components/features/upload/UploadDropzone.vue` | `features/file-upload/components/UploadDropzone.vue` | ✓ | ✓ | ✓ | ✓ |
| `components/features/upload/UploadProgressModal.vue` | `features/file-upload/components/UploadProgressModal.vue` | ☐ | ☐ | ☐ | ☐ |
| `components/features/upload/UploadSummaryCard.vue` | `features/file-upload/components/UploadSummaryCard.vue` | ☐ | ☐ | ☐ | ☐ |
| `composables/useFileDragDrop.js` | `features/file-upload/composables/useFileDragDrop.js` | ☐ | ☐ | ☐ | ☐ |
| `composables/useFileMetadata.js` | `features/file-upload/composables/useFileMetadata.js` | ✅ | ✅ | ✅ | ✅ |
| `composables/useFileQueue.js` | `features/file-upload/composables/useFileQueue.js` | ☐ | ☐ | ☐ | ☐ |
| `composables/useFileQueueCore.js` | `features/file-upload/composables/useFileQueueCore.js` | ☐ | ☐ | ☐ | ☐ |
| `composables/useFolderAnalysis.js` | `features/file-upload/composables/useFolderAnalysis.js` | ☐ | ☐ | ☐ | ☐ |
| `composables/useFolderOptions.js` | `features/file-upload/composables/useFolderOptions.js` | ☐ | ☐ | ☐ | ☐ |
| `composables/useFolderProgress.js` | `features/file-upload/composables/useFolderProgress.js` | ☐ | ☐ | ☐ | ☐ |
| `composables/useFolderTimeouts.js` | `features/file-upload/composables/useFolderTimeouts.js` | ☐ | ☐ | ☐ | ☐ |
| `composables/useLazyFileList.js` | `features/file-upload/composables/useLazyFileList.js` | ☑ | ☑ | ☑ | ☐ |
| `composables/useLazyHashTooltip.js` | `features/file-upload/composables/useLazyHashTooltip.js` | ☑ | ☑ | ☑ | ☐ |
| `composables/useQueueCore.js` | `features/file-upload/composables/useQueueCore.js` | ☐ | ☐ | ☐ | ☐ |
| `composables/useQueueDeduplication.js` | `features/file-upload/composables/useQueueDeduplication.js` | ☐ | ☐ | ☐ | ☐ |
| `composables/useQueueProgress.js` | `features/file-upload/composables/useQueueProgress.js` | ☐ | ☐ | ☐ | ☐ |
| `composables/useQueueWorkers.js` | `features/file-upload/composables/useQueueWorkers.js` | ☐ | ☐ | ☐ | ☐ |
| `composables/useTimeBasedWarning.js` | `features/file-upload/composables/useTimeBasedWarning.js` | ☐ | ☐ | ☐ | ☐ |
| `composables/useUploadLogger.js` | `features/file-upload/composables/useUploadLogger.js` | ☐ | ☐ | ☐ | ☐ |
| `composables/useUploadManager.js` | `features/file-upload/composables/useUploadManager.js` | ☐ | ☐ | ☐ | ☐ |
| `composables/useWebWorker.js` | `features/file-upload/composables/useWebWorker.js` | ☐ | ☐ | ☐ | ☐ |
| `composables/useWorkerManager.js` | `features/file-upload/composables/useWorkerManager.js` | ☐ | ☐ | ☐ | ☐ |
| `utils/fileAnalysis.js` | `features/file-upload/utils/fileAnalysis.js` | ☑ | ☑ | ☑ | ☐ |
| `utils/folderPathUtils.js` | `features/file-upload/utils/folderPathUtils.js` | ☐ | ☐ | ☐ | ☐ |
| `utils/hardwareCalibration.js` | `features/file-upload/utils/hardwareCalibration.js` | ☐ | ☐ | ☐ | ☐ |
| `utils/processingTimer.js` | `features/file-upload/utils/processingTimer.js` | ☐ | ☐ | ☐ | ☐ |
| `workers/fileHashWorker.js` | `features/file-upload/workers/fileHashWorker.js` | ☐ | ☐ | ☐ | ☐ |
| `views/FileUpload.vue` | `features/file-upload/views/FileUpload.vue` | ☐ | ☐ | ☐ | ☐ |
| `components/base/ClearAllButton.vue` | `shared/components/ClearAllButton.vue` | ☑ | ☑ | ☑ | ☐ |
| `stores/auth.js` | `core/stores/auth.js` | ☐ | ☐ | ☐ | ☐ |
| `services/firebase.js` | `core/services/firebase.js` | ☐ | ☐ | ☐ | ☐ |
| **NEW FILE** | `features/file-upload/index.js` | ☐ | N/A | ☐ | ☐ |
| **NEW FILE** | `features/file-viewer/index.js` | ☐ | N/A | ☐ | ☐ |

## Additional Tasks

| Task | Completed? |
|------|------------|
| Create `features/file-upload/` directory structure | ☑ |
| Create `features/file-viewer/` directory structure | ☐ |
| Create `shared/components/` directory | ☐ |
| Create `shared/composables/` directory | ☐ |
| Create `core/stores/` directory | ☐ |
| Create `core/services/` directory | ☐ |
| Update router configuration to point to new FileUpload.vue location | ☐ |
| Update any demo files that reference upload components | ☐ |
| Test complete file upload functionality after restructure | ☐ |
| Delete old empty directories after successful migration | ☐ |