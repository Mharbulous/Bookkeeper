# File Upload User Stories - Post Start Upload

This document outlines user stories describing what happens from a user perspective after completing the deduplication and upload queue process and clicking the "Start Upload" button.

## User Stories

### 1. Upload Progress Visibility
**As a user**, when I click "Start Upload", **I want** to see immediate visual feedback that the upload process has begun, **so that** I know my action was registered and the system is working.

### 2. Real-Time Upload Progress
**As a user**, **I want** to see a progress bar or percentage showing how many files have been uploaded versus the total, **so that** I can estimate how long the remaining upload will take.

### 3. Individual File Upload Status
**As a user**, **I want** to see the status of individual files (uploading, completed, failed) in the queue, **so that** I can identify any problematic files that need attention.

### 4. Upload Speed Information
**As a user**, **I want** to see the current upload speed (MB/s or files/min), **so that** I can understand if my connection is performing well and estimate completion time.

### 5. Pause and Resume Capability
**As a user**, **I want** to be able to pause the upload process if needed, **so that** I can manage my bandwidth or stop the process without losing progress.

### 6. Error Handling and Recovery
**As a user**, when a file fails to upload, **I want** to see clear error messages and have options to retry, **so that** I can resolve issues without restarting the entire process.

### 7. Duplicate File Handling
**As a user**, when the system encounters files that already exist in storage, **I want** to identify and log differences in file names, folder path, and meta data for files with identical SHA256 hash values **so that** all metadata information is preserved.

### 8. Interruption Recovery
**As a user**, if my upload is interrupted during upload, **I want** the system to pickup from where we left off **so that** we don't repeat the same work.

### 9. Thorough and reliable bulk uploading
**As a user**, if a file upload starts, **I want** the database to track whether the upload completed successfully **so that** we can ensure that all files are uploaded.

### 10. Upload Completion Notification
**As a user**, when all files have been successfully uploaded, **I want** to receive a clear completion message with a summary of results, **so that** I know the process finished and can see what was accomplished.

### 11. Failed Upload Summary
**As a user**, after the upload process completes, **I want** to see a summary of any failed uploads with reasons, **so that** I can address issues and retry if needed.

### 12. Batch Upload Cancellation
**As a user**, **I want** the ability to cancel the entire upload process if needed, **so that** I can stop unwanted uploads without waiting for completion.

### 13. Post-Upload Detailed Review
**As a user**, after uploading completes, **I want** the ability to review the upload results file by file, **so that** I can see details of the upload results..

### 14. Cleanup and Reset
**As a user**, after uploading completes, **I want** the ability to control clearing of the upload the upload queue, **so that** I can begin a new upload session without confusion from previous data.

## Solution Brainstorming

### 1. Upload Progress Visibility Solutions
- **🏆⚡❤️ Immediate UI State Change**: Toggle button to "Uploading..." state with spinner, disable interaction, show progress modal immediately

### 2. Real-Time Upload Progress Solutions
- **🏆⚡❤️ Simple Progress Bar**: Linear progress bar showing completed/total files with percentage, updated via Firebase upload progress callbacks

### 3. Individual File Upload Status Solutions
- **🏆⚡❤️ Real-time List Updates**: Live-updating file list with status badges and progress indicators per file

### 4. Upload Speed Information Solutions
- **🏆⚡❤️ Running Average Display**: Calculate and display MB/s or files/min using rolling window of recent upload times

### 5. Pause and Resume Capability Solutions
- **🏆⚡❤️ Graceful Interruption**: Complete current file upload before pausing to avoid partial uploads and data corruption.  Pause/Resume toggle button.  If Pause toggle is true, then pause further uploads when current upload completes.


### 6. Error Handling and Recovery Solutions
- **🏆⚡❤️ Two-Pass Upload Strategy**: Failed uploads move to retry queue.  After first pass on all files, iterate through retry queue making one retry attempt on each file in the retry queue. Repeatedly cycle through the retry queue until you complete a full run through the retry queue with zero successful retries.  If Retry queu still has failed uploads, go to Failed Upload Summary.

### 7. Duplicate File Handling Solutions
- **🏆⚡❤️ Metadata Logging System**: Store file metadata (original path, name, timestamps) in Firestore even when content is duplicate, but do not store file metadata if there is already a data entry for the same file with the exact same metadata.


### 8. Interruption Recovery Solutions
- **🏆⚡❤️ Browser Session Recovery**: Use beforeunload event and localStorage to detect interrupted uploads and offer resume


### 9. Thorough and Reliable Bulk Uploading Solutions
- **🏆❤️ Atomic Upload Operations**: Ensure both file storage and metadata database writes succeed together or both fail

### 10. Upload Completion Notification Solutions
- **🏆❤️ Success Modal with Summary**: Detailed completion modal showing total files, data uploaded, time elapsed, any issues encountered

### 11. Failed Upload Summary Solutions
- **🏆❤️ Categorized Error Report**: Group failures by error type (network, permission, size, etc.) with actionable solutions


### 12. Batch Upload Cancellation Solutions
- **🏆❤️ Two button Cancellation**: Cancellation button, or "Clear All" button becomes visible only when Pause button toggle is true.  Clear all button triggers immediate page refresh, making it possible to interrupt currently uploading file.

### 13. Post-Upload Detailed Review Solutions
- **🏆❤️ Searchable Upload Results Table**: Sortable, filterable table of all uploaded files with status, errors, metadata

### 14. Cleanup and Reset Solutions
- **🏆❤️ Single Clear All button**: "Clear All" button trigger browser refresh.
