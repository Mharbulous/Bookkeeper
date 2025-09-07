# Reconcile FileMetadata with Codebase - Implementation Plan

Created: 2025-09-07

## Overview

This document outlines the specific code changes needed to align the codebase with the FileMetadata.md documentation. These changes ensure consistency between documented behavior and actual implementation.

## Required Code Changes

### 1. Fix displayCopy Field Structure

**Issue**: `displayCopy` is currently an object but should be a string containing only the metadataHash.

**Files to Update**:

#### `src/features/organizer/services/evidenceService.js`

**Current Code**:

```javascript
displayCopy: {
  metadataHash: metadataHash,
  folderPath: uploadMetadata.folderPath || '/'
},
```

**Change To**:

```javascript
displayCopy: metadataHash,
```

**Note**: Remove the folderPath from displayCopy in both `createEvidenceFromUpload` and `createEvidenceFromUploads` methods.

#### `src/features/organizer/stores/organizerCore.js`

**Current Code**:

```javascript
const displayInfo = await getDisplayInfo(evidence.displayCopy?.metadataHash, teamId);
```

**Change To**:

```javascript
const displayInfo = await getDisplayInfo(evidence.displayCopy, teamId);
```

### 2. Add fileTypes Field to storageRef

**Issue**: The `storageRef` object is missing the `fileTypes` field for storing the file extension.

**Files to Update**:

#### `src/features/organizer/services/evidenceService.js`

**In `createEvidenceFromUpload` method**:

**Current Code**:

```javascript
storageRef: {
  storage: 'uploads',
  fileHash: uploadMetadata.hash
},
```

**Change To**:

```javascript
storageRef: {
  storage: 'uploads',
  fileHash: uploadMetadata.hash,
  fileTypes: this.getFileExtension(uploadMetadata.originalName)
},
```

**Add Helper Method** (at class level):

```javascript
/**
 * Extract file extension in lowercase format
 * @param {string} filename - Original filename
 * @returns {string} - Lowercase extension with dot (e.g., '.pdf')
 */
getFileExtension(filename) {
  if (!filename || !filename.includes('.')) return '';
  const extension = filename.split('.').pop().toLowerCase();
  return `.${extension}`;
}
```

### 3. Set displayName Field During Evidence Creation

**Issue**: The `displayName` field is used throughout the codebase but never initialized during evidence creation.

**Files to Update**:

#### `src/features/organizer/services/evidenceService.js`

**In `createEvidenceFromUpload` method**:

**Current Code**:

```javascript
const evidenceData = {
  storageRef: { ... },
  displayCopy: ...,
  fileSize: uploadMetadata.size || 0,
  isProcessed: false,
  hasAllPages: null,
  processingStage: 'uploaded',
  updatedAt: serverTimestamp()
};
```

**Change To**:

```javascript
const evidenceData = {
  storageRef: { ... },
  displayCopy: metadataHash,
  displayName: uploadMetadata.originalName, // Add this line
  fileSize: uploadMetadata.size || 0,
  isProcessed: false,
  hasAllPages: null,
  processingStage: 'uploaded',
  updatedAt: serverTimestamp()
};
```

### 4. Update File Processing Service

**Issue**: The file processing service needs to use the new `fileTypes` field when available.

**Files to Update**:

#### `src/features/organizer/services/fileProcessingService.js`

**In `getFileForProcessing` method**:

**Current Code**:

```javascript
const displayName = evidence.displayName || '';
const extension = displayName.split('.').pop() || 'pdf';
```

**Change To**:

```javascript
// Prefer fileTypes from storageRef, fallback to parsing displayName
let extension;
if (evidence.storageRef?.fileTypes) {
  extension = evidence.storageRef.fileTypes.substring(1); // Remove the dot
} else {
  const displayName = evidence.displayName || '';
  extension = displayName.split('.').pop() || 'pdf';
}
```

## Implementation Order

1. **Phase 1 - Core Structure Changes** (Do First)

   - Update `evidenceService.js` to fix displayCopy structure
   - Add fileTypes field to storageRef
   - Add displayName initialization

2. **Phase 2 - Consumer Updates** (Do Second)

   - Update `organizerCore.js` to handle string displayCopy
   - Update `fileProcessingService.js` to use fileTypes field

3. **Phase 3 - Testing** (Do Last)
   - Test file upload flow
   - Verify displayName appears in UI
   - Confirm fileTypes field is populated
   - Check that displayCopy correctly links to originalMetadata

## Testing Checklist

- [ ] Upload a new file and verify evidence document structure
- [ ] Check that displayCopy is a string (metadataHash only)
- [ ] Verify fileTypes field contains lowercase extension
- [ ] Confirm displayName is set to originalName initially
- [ ] Test that organizerCore correctly fetches display info
- [ ] Verify file processing works with new fileTypes field
- [ ] Check existing evidence documents still work (backward compatibility)

## Migration Considerations

Since we're in the testing phase with the 'general' matter:

1. **Existing Evidence Documents**: May have object-based displayCopy fields
2. **Backward Compatibility**: Code should handle both old and new formats during transition
3. **Optional Migration Script**: Could update existing documents to new format

**Suggested Compatibility Code** for `organizerCore.js`:

```javascript
// Handle both old object format and new string format
const metadataHash =
  typeof evidence.displayCopy === 'string'
    ? evidence.displayCopy
    : evidence.displayCopy?.metadataHash;
const displayInfo = await getDisplayInfo(metadataHash, teamId);
```

## Notes

- These changes maintain backward compatibility where possible
- The 'general' matter hardcoding remains unchanged (as intended for testing)
- File extension standardization (lowercase) is preserved except in originalMetadata.originalName
