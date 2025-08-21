# Code Review Request: File Upload Streaming Process Performance Issues

## Project Overview

We are developing a Vue 3 file upload system with duplicate detection for a bookkeeping application. The system needs to handle large folder uploads (500-1000 files) with real-time duplicate detection against historical upload logs stored in Firestore.

## Desired Interface Features

1. **Instant Modal Closure**: When users click "Continue" in folder upload options, the modal should close immediately
2. **Immediate File Queue Display**: All selected files should appear instantly in the upload queue with "queueing" status
3. **Real-Time Progress Feedback**: Users should see files transition from "queueing" → "pending"/"skipped" in real-time
4. **Performance Requirement**: Processing 707 files should complete in ~3-4 seconds (matching original synchronous performance)
5. **Cancellation Support**: Users can interrupt the streaming process, leaving unprocessed files in "queueing" state

## Key Files Involved

### Primary Implementation Files:
- `src/views/FileUpload.vue` (Lines 490-692) - Main streaming logic
- `src/components/features/upload/FileUploadQueue.vue` - UI component showing file categories
- `src/services/uploadLogService.js` (Lines 142-170) - Firestore duplicate detection

### Core Functions:
- `confirmFolderOptions()` - Modified to close modal immediately and call synchronous queueing
- `addFilesToQueueSynchronous()` - Fast file object creation without processing
- `processQueuedFilesStreamingly()` - Background batch processor (Lines 492-599)
- `checkForDuplicatesBatch()` - Batched Firestore queries (Lines 602-692)
- `UploadLogService.findUploadsByHashes()` - New batch query method

## Original Problem

**Synchronous Process**: All files processed sequentially before showing queue
- ✅ Fast performance (3-4 seconds for 707 files)
- ❌ Poor UX (3-4 second delay, no feedback)
- ❌ UI blocking during processing

## Goal: Hybrid Approach

**Phase 1 - Synchronous Queueing** (Fast):
- Create file objects with basic metadata only
- No hash calculation or duplicate detection
- Show all files immediately in "queueing" state

**Phase 2 - Streaming Deduplication** (Background):
- Process files in batches of 20
- Calculate hashes in parallel
- Batch Firestore queries for duplicate detection
- Update UI in real-time as files transition states

## Implementation Plan vs Reality

### Our Plan
```javascript
// Batch of 20 files processed in parallel:
// 1. Calculate all hashes simultaneously
// 2. Single Firestore query for all hashes  
// 3. Process results and update all statuses
// Expected: ~200ms per batch = ~3-4 seconds total
```

### Current Implementation Structure
```javascript
const processQueuedFilesStreamingly = async () => {
  const BATCH_SIZE = 20
  
  while (true) {
    // Get next 20 files in 'queueing' state
    const queueingFiles = uploadQueue.value
      .filter(file => file.status === 'queueing')
      .slice(0, BATCH_SIZE)
    
    // Step 1: Calculate hashes in parallel
    await Promise.all(queueingFiles.map(async (file) => {
      file.hash = await calculateFileHash(file.file)
    }))
    
    // Step 2: Batch duplicate detection
    await checkForDuplicatesBatch(validFiles)
    
    // Step 3: Update all file statuses
    validFiles.forEach(file => {
      // Update status based on duplicateResult
    })
  }
}
```

### Performance Issues Discovered

1. **Initial Problem**: Individual Firestore queries (20 DB calls per batch)
   - **Fixed**: Implemented `findUploadsByHashes()` with `where('fileHash', 'in', [...])` queries

2. **Current Problem**: Queue duplicates still processing one-by-one
   - **Observation**: Files within the same batch with identical hashes are being processed individually
   - **Suspected Issue**: Vue reactivity causing individual UI updates, or logic not properly handling duplicate files within a single batch

3. **Performance Reality**: Still much slower than original 3-4 seconds
   - Expected: Batch processing should be fast
   - Actual: Individual file processing behavior observed

## Technical Questions for Review

### Queue Duplicate Detection Logic
The system needs to handle two types of duplicates:

1. **Historical Duplicates**: Files matching uploads in Firestore database
2. **Queue Duplicates**: Files with identical hashes within the current upload batch

**Current Logic**:
```javascript
// In FileUploadQueue.vue computed properties
const queueDuplicates = computed(() => {
  const seenHashes = new Set()
  return props.files.filter(file => {
    if (file.isExactDuplicate) return false // Skip historical duplicates
    if (seenHashes.has(file.hash)) {
      return true // This is a queue duplicate
    }
    seenHashes.add(file.hash)
    return false
  })
})
```

### Key Questions:

1. **Batch Processing Verification**: Is our batch processing actually working, or are files still being processed individually?

2. **Queue Duplicate Handling**: Should queue duplicates be detected and processed during the streaming phase, or handled separately?

3. **Vue Reactivity Performance**: Could Vue's reactivity system be causing performance issues when updating file statuses in batches?

4. **Hash Calculation Bottleneck**: Is the SHA-256 hash calculation (`calculateFileHash()`) creating a bottleneck even when parallelized?

5. **Firestore Query Optimization**: Are we properly utilizing Firestore's batch query capabilities, or should we implement different querying strategies?

## Code Review Requests

1. **Performance Analysis**: Review the streaming implementation for bottlenecks
2. **Batch Processing Verification**: Confirm that files are actually being processed in batches of 20
3. **Queue Duplicate Logic**: Evaluate the queue duplicate detection and suggest optimizations
4. **Alternative Approaches**: Recommend architectural improvements for better performance
5. **Vue Reactivity Optimization**: Suggest patterns for efficient bulk state updates

## Expected Outcome

A streaming file processing system that:
- Provides immediate user feedback (instant modal closure + file display)
- Matches original synchronous performance (~3-4 seconds for 700+ files)
- Handles both historical and queue duplicates efficiently
- Maintains clean cancellation behavior
- Uses optimal Firestore querying patterns

The goal is to combine the UX benefits of streaming with the performance of the original synchronous approach.