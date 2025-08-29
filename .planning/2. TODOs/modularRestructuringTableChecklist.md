# Modular Restructuring Checklist

| Original File Path (relative to src)                     | New File Path (relative to src)                          | File Moved? | Old File Cleaned up? | References Updated Throughout Codebase? | Validated Functionality? |
| -------------------------------------------------------- | -------------------------------------------------------- | ----------- | -------------------- | --------------------------------------- | ------------------------ |
| `components/features/upload/CloudFileWarningModal.vue`   | `features/upload/components/CloudFileWarningModal.vue`   | ☑          | ☑                   | ☑                                      | ☐                        |
| `components/features/upload/FileQueueChips.vue`          | `features/upload/components/FileQueueChips.vue`          | ☑          | ☑                   | ☑                                      | ☐                        |
| `components/features/upload/FileQueuePlaceholder.vue`    | `features/upload/components/FileQueuePlaceholder.vue`    | ☑          | ☑                   | ☑                                      | ☐                        |
| `components/features/upload/FileUploadQueue.vue`         | `features/upload/components/FileUploadQueue.vue`         | ☑          | ☑                   | ☑                                      | ☐                        |
| `components/features/upload/FileUploadStatus.vue`        | `features/upload/components/FileUploadStatus.vue`        | ☑          | ☑                   | ☑                                      | ☐                        |
| `components/features/upload/FolderOptionsDialog.vue`     | `features/upload/components/FolderOptionsDialog.vue`     | ☑          | ☑                   | ☑                                      | ☐                        |
| `components/features/upload/LazyFileItem.vue`            | `features/upload/components/LazyFileItem.vue`            | ☑          | ☑                   | ☑                                      | ☐                        |
| `components/features/upload/ProcessingProgressModal.vue` | `features/upload/components/ProcessingProgressModal.vue` | ☑          | ☑                   | ☑                                      | ☐                        |
| `components/features/upload/QueueTimeProgress.vue`       | `features/upload/components/QueueTimeProgress.vue`       | ☑          | ☑                   | ☑                                      | ☐                        |
| `components/features/upload/UploadDropzone.vue`          | `features/upload/components/UploadDropzone.vue`          | ✓           | ✓                    | ✓                                       | ✓                        |
| `components/features/upload/UploadProgressModal.vue`     | `features/upload/components/UploadProgressModal.vue`     | ☐           | ☐                    | ☐                                       | ☐                        |
| `components/features/upload/UploadSummaryCard.vue`       | `features/upload/components/UploadSummaryCard.vue`       | ☐           | ☐                    | ☐                                       | ☐                        |
| `composables/useFileDragDrop.js`                         | `features/upload/composables/useFileDragDrop.js`         | ☐           | ☐                    | ☐                                       | ☐                        |
| `composables/useFileMetadata.js`                         | `features/upload/composables/useFileMetadata.js`         | ✅          | ✅                   | ✅                                      | ✅                       |
| `composables/useFileQueue.js`                            | `features/upload/composables/useFileQueue.js`            | ☐           | ☐                    | ☐                                       | ☐                        |
| `composables/useFileQueueCore.js`                        | `features/upload/composables/useFileQueueCore.js`        | ☐           | ☐                    | ☐                                       | ☐                        |
| `composables/useFolderAnalysis.js`                       | `features/upload/composables/useFolderAnalysis.js`       | ☐           | ☐                    | ☐                                       | ☐                        |
| `composables/useFolderOptions.js`                        | `features/upload/composables/useFolderOptions.js`        | ☐           | ☐                    | ☐                                       | ☐                        |
| `composables/useFolderProgress.js`                       | `features/upload/composables/useFolderProgress.js`       | ☐           | ☐                    | ☐                                       | ☐                        |
| `composables/useFolderTimeouts.js`                       | `features/upload/composables/useFolderTimeouts.js`       | ☐           | ☐                    | ☐                                       | ☐                        |
| `composables/useLazyFileList.js`                         | `features/upload/composables/useLazyFileList.js`         | ☑          | ☑                   | ☑                                      | ☐                        |
| `composables/useLazyHashTooltip.js`                      | `features/upload/composables/useLazyHashTooltip.js`      | ☑          | ☑                   | ☑                                      | ☐                        |
| `composables/useQueueCore.js`                            | `features/upload/composables/useQueueCore.js`            | ☐           | ☐                    | ☐                                       | ☐                        |
| `composables/useQueueDeduplication.js`                   | `features/upload/composables/useQueueDeduplication.js`   | ☐           | ☐                    | ☐                                       | ☐                        |
| `composables/useQueueProgress.js`                        | `features/upload/composables/useQueueProgress.js`        | ☐           | ☐                    | ☐                                       | ☐                        |
| `composables/useQueueWorkers.js`                         | `features/upload/composables/useQueueWorkers.js`         | ☐           | ☐                    | ☐                                       | ☐                        |
| `composables/useTimeBasedWarning.js`                     | `features/upload/composables/useTimeBasedWarning.js`     | ☐           | ☐                    | ☐                                       | ☐                        |
| `composables/useUploadLogger.js`                         | `features/upload/composables/useUploadLogger.js`         | ☐           | ☐                    | ☐                                       | ☐                        |
| `composables/useUploadManager.js`                        | `features/upload/composables/useUploadManager.js`        | ☐           | ☐                    | ☐                                       | ☐                        |
| `composables/useWebWorker.js`                            | `features/upload/composables/useWebWorker.js`            | ☐           | ☐                    | ☐                                       | ☐                        |
| `composables/useWorkerManager.js`                        | `features/upload/composables/useWorkerManager.js`        | ☐           | ☐                    | ☐                                       | ☐                        |
| `utils/fileAnalysis.js`                                  | `features/upload/utils/fileAnalysis.js`                  | ☑          | ☑                   | ☑                                      | ☐                        |
| `utils/folderPathUtils.js`                               | `features/upload/utils/folderPathUtils.js`               | ☐           | ☐                    | ☐                                       | ☐                        |
| `utils/hardwareCalibration.js`                           | `features/upload/utils/hardwareCalibration.js`           | ☐           | ☐                    | ☐                                       | ☐                        |
| `utils/processingTimer.js`                               | `features/upload/utils/processingTimer.js`               | ☐           | ☐                    | ☐                                       | ☐                        |
| `workers/fileHashWorker.js`                              | `features/upload/workers/fileHashWorker.js`              | ☐           | ☐                    | ☐                                       | ☐                        |
| `views/FileUpload.vue`                                   | `features/upload/views/FileUpload.vue`                   | ☐           | ☐                    | ☐                                       | ☐                        |
| `components/base/ClearAllButton.vue`                     | `shared/components/ClearAllButton.vue`                   | ☑          | ☑                   | ☑                                      | ☐                        |
| `stores/auth.js`                                         | `core/core/stores/auth.js`                               | ☐           | ☐                    | ☐                                       | ☐                        |
| `services/firebase.js`                                   | `core/services/firebase.js`                              | ☐           | ☐                    | ☐                                       | ☐                        |
| **NEW FILE**                                             | `features/upload/index.js`                               | ☐           | N/A                  | ☐                                       | ☐                        |
| **NEW FILE**                                             | `features/file-viewer/index.js`                          | ☐           | N/A                  | ☐                                       | ☐                        |

## Additional Tasks

| Task                                                                | Completed? |
| ------------------------------------------------------------------- | ---------- |
| Create `features/upload/` directory structure                       | ☑         |
| Create `features/file-viewer/` directory structure                  | ☐          |
| Create `shared/components/` directory                               | ☐          |
| Create `shared/composables/` directory                              | ☐          |
| Create `core/core/stores/` directory                                | ☐          |
| Create `core/services/` directory                                   | ☐          |
| Update router configuration to point to new FileUpload.vue location | ☐          |
| Update any demo files that reference upload components              | ☐          |
| Test complete file upload functionality after restructure           | ☐          |
| Delete old empty directories after successful migration             | ☐          |
