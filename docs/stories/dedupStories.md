# Deduplication User Stories

This file contains user stories that illustrate how the constraint-based deduplication system works from the user's perspective, based on the process flow diagram in `docs/diagrams/Draft3duplicationLogic.md`.

## Story 1: First-Time Upload with Mixed Files

**As a** new user  
**I want to** upload a folder of 20 files for the first time  
**So that** I can store my documents in the system  

### Scenario: Clean Upload
- **Given** I select 20 files (10 PDFs, 5 images, 5 text files)
- **When** the system generates hashes and queries the database
- **Then** I see "Ready: 20, Existing: 0, Duplicates: 0"
- **And** all files show status "ready" with green indicators
- **When** I click "Start Upload"
- **Then** all 20 files upload successfully
- **And** I see "Uploaded: 20, Skipped: 0, Failed: 0"

## Story 2: Accidental Duplicate Selection

**As a** user  
**I want to** understand when I've selected the same file multiple times  
**So that** I don't waste time uploading duplicates  

### Scenario: Duplicates Detected
- **Given** I accidentally select the same file "report.pdf" from two different folders
- **When** the system performs client-side deduplication
- **Then** one file gets tagged as "duplicate"
- **And** I see "Ready: 1, Existing: 0, Duplicates: 1"
- **And** the interface shows both file paths but indicates one will be skipped
- **When** I click "Start Upload"
- **Then** only one copy uploads
- **And** I see "Uploaded: 1, Skipped: 1, Failed: 0"

## Story 3: Re-uploading Previously Uploaded Files

**As a** returning user  
**I want to** know which files I've already uploaded  
**So that** I don't upload the same content twice  

### Scenario: Existing Files Detected
- **Given** I previously uploaded "invoice-2024.pdf" 
- **When** I try to upload the same file again (same content, same name)
- **Then** the database query finds the existing hash
- **And** the file gets tagged as "existing"
- **And** I see "Ready: 0, Existing: 1, Duplicates: 0"
- **And** the interface shows the file with a "Previously Uploaded" indicator
- **When** I click "Start Upload"
- **Then** the file is skipped automatically
- **And** I see "Uploaded: 0, Skipped: 1, Failed: 0"

## Story 4: Mixed Batch with All Scenarios

**As a** user  
**I want to** upload a complex batch of files  
**So that** I can see how the system handles different scenarios together  

### Scenario: Complex Upload Batch
- **Given** I select 15 files:
  - 8 new files I've never uploaded
  - 4 files that already exist in my account  
  - 2 files I selected twice (duplicates)
  - 1 file that will fail upload due to size limit
- **When** the system processes the selection
- **Then** I see "Ready: 8, Existing: 4, Duplicates: 2"
- **And** the file list shows each file with appropriate status indicators:
  - 8 files tagged "ready" (green)
  - 4 files tagged "existing" (blue)  
  - 2 files tagged "duplicate" (yellow)
- **When** I review the list and click "Start Upload"
- **Then** only the 8 ready files are processed
- **And** 1 file fails due to size limit
- **And** I see "Uploaded: 7, Skipped: 6, Failed: 1"

## Story 5: Network Issues During Upload

**As a** user  
**I want to** understand what happened when uploads fail  
**So that** I can retry or fix issues  

### Scenario: Partial Upload Failure
- **Given** I'm uploading 10 ready files
- **When** the upload starts, 7 files succeed but 3 fail due to network timeout
- **Then** the files are tagged appropriately:
  - 7 files tagged "successful" (green)
  - 3 files tagged "failed" (red)
- **And** I see "Uploaded: 7, Skipped: 0, Failed: 3"
- **And** the failed files show error details
- **When** I retry the upload
- **Then** only the 3 failed files are processed again
- **And** the 7 successful files remain tagged "successful"

## Story 6: Large File Upload with Progress

**As a** user  
**I want to** see real-time progress during uploads  
**So that** I know the system is working and how long it will take  

### Scenario: Progress Tracking
- **Given** I'm uploading 5 large video files (100MB each)
- **When** I click "Start Upload"
- **Then** each file shows status "uploading" with progress indicators
- **And** the overall counter shows progress: "Uploading: 2/5 files"
- **When** files complete, they change to "successful"
- **And** the counter updates: "Uploaded: 3, In Progress: 2, Failed: 0"
- **When** all uploads finish
- **Then** I see the final summary: "Uploaded: 5, Skipped: 0, Failed: 0"

## Story 7: User Review and Decision Making

**As a** user  
**I want to** review the file status summary before uploading  
**So that** I can make informed decisions about my uploads  

### Scenario: Pre-Upload Review
- **Given** the system shows "Ready: 12, Existing: 3, Duplicates: 2"
- **When** I view the file list interface
- **Then** I can see:
  - File names and paths for all files
  - Clear status indicators (ready/existing/duplicate)
  - File sizes and types
  - Upload time estimates
- **And** I can expand details to see:
  - When existing files were previously uploaded
  - Why duplicates were detected (same path/name)
  - Which files will be skipped vs uploaded
- **When** I'm satisfied with the summary
- **Then** I click "Start Upload" to proceed
- **Or** I can go back to modify my file selection

## Story 8: Team Context and Permissions

**As a** team member  
**I want to** only see duplicates within my team's files  
**So that** my uploads don't conflict with other teams' data  

### Scenario: Team-Isolated Deduplication
- **Given** I'm a member of "Legal Team"
- **And** another team uploaded "contract.pdf" with the same content
- **When** I upload my copy of "contract.pdf"
- **Then** the system doesn't detect it as existing (different team context)
- **And** I see "Ready: 1, Existing: 0, Duplicates: 0"
- **When** I upload the file
- **Then** it uploads successfully to my team's storage
- **And** both teams have their own copy of the same content

## Story 9: Mobile Upload Experience

**As a** mobile user  
**I want to** upload photos from my phone efficiently  
**So that** I don't waste cellular data on duplicates  

### Scenario: Mobile Photo Upload
- **Given** I select 20 photos from my phone's camera roll
- **And** 5 of them are identical duplicates (burst mode photos)
- **When** the deduplication runs on my device
- **Then** the 5 duplicates are tagged as "duplicates"
- **And** I see "Ready: 15, Existing: 0, Duplicates: 5"
- **And** the interface shows data usage estimate: "Upload size: 45MB (15 photos)"
- **When** I proceed with upload
- **Then** only 15 unique photos upload, saving cellular data
- **And** I see "Uploaded: 15, Skipped: 5, Failed: 0"

## Story 10: Error Recovery and Retry

**As a** user  
**I want to** easily retry failed uploads  
**So that** I don't have to restart my entire upload process  

### Scenario: Smart Retry System
- **Given** 10 files were uploading and 3 failed due to server error
- **When** the upload completes
- **Then** I see "Uploaded: 7, Skipped: 0, Failed: 3"
- **And** a "Retry Failed Uploads" button appears
- **When** I click "Retry Failed Uploads"
- **Then** only the 3 failed files are reprocessed
- **And** the system skips re-hashing and duplicate detection
- **And** files proceed directly to upload status "uploading"
- **When** retry succeeds
- **Then** I see final status: "Uploaded: 10, Skipped: 0, Failed: 0"

---

## Technical Implementation Notes

These user stories map to the following technical components:

### Hash Generation (Steps B-C)
- Web Workers for parallel SHA-256 calculation
- Progress indicators during hash computation
- Efficient memory management for large files

### Client-Side Deduplication (Steps D-TagA)  
- JavaScript Set/Map for automatic duplicate removal
- Queue duplicate detection and tagging
- Immediate feedback on duplicate file selections

### Database Query (Steps F-TagB)
- Batch Firestore queries using `getAll(hashArray)`
- Team context isolation in queries
- Efficient categorization of ready vs existing files

### Status Counting and Display (Steps CountA-DisplayA)
- Real-time count updates as files are categorized
- Color-coded status indicators in UI
- Detailed file list with expandable information

### Upload Process (Steps L-DisplayB)
- Parallel upload processing with `Promise.all`
- Real-time progress tracking per file
- Error handling and retry mechanisms
- Final results summary with actionable next steps