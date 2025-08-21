# Deduplication System Refactor Plan
Overview
Refactor the deduplication system to use built-in database constraints while keeping the existing UI. This will reduce code complexity by ~80% while maintaining all functionality.
Phase 1: Preparation (30 minutes)
1.1 Create Safety Backup
bash# Create a feature branch
git checkout -b refactor/constraint-based-dedup

# Tag current version for easy rollback
git tag pre-refactor-backup
1.2 Document Current State

Screenshot the current UI for reference
Note any custom business logic to preserve
List all UI components that will be kept

1.3 Files to Keep (UI Layer)
✅ Keep these files unchanged:

src/components/features/upload/FileUploadQueue.vue - UI component
src/views/FileUpload.vue - UI layout and CSS only
All Vuetify components and styling

Phase 2: Strip Out Old Logic (1 hour)
2.1 Clean FileUpload.vue
Remove from src/views/FileUpload.vue:

❌ All hash calculation logic (lines ~490-692)
❌ processQueuedFilesStreamingly() function
❌ checkForDuplicatesBatch() function
❌ Complex duplicate detection logic
❌ Worker pool management
❌ Cache management
❌ Performance tracking code

Keep in src/views/FileUpload.vue:

✅ Template structure
✅ Drag/drop handlers
✅ File/folder selection UI
✅ Modal dialogs
✅ Basic file info creation

2.2 Simplify UploadLogService.js
Replace entire src/services/uploadLogService.js with minimal version:
javascriptimport { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase.js'

export class UploadLogService {
  // Simple file registry using hash as ID
  static async registerFile(hash, metadata, teamId) {
    const fileRef = doc(db, 'teams', teamId, 'files', hash)
    const indexRef = doc(db, 'teams', teamId, 'fileIndex', hash)
    
    try {
      // This will fail if document exists (built-in dedup!)
      await setDoc(fileRef, {
        ...metadata,
        hash,
        teamId,
        uploadedAt: serverTimestamp()
      }, { merge: false })
      
      // Also update index for fast queries
      await setDoc(indexRef, {
        fileName: metadata.fileName,
        fileSize: metadata.fileSize,
        uploadedAt: serverTimestamp()
      })
      
      return { status: 'new', hash }
    } catch (error) {
      if (error.code === 'permission-denied') {
        // Document exists - it's a duplicate
        const existingDoc = await getDoc(fileRef)
        return { 
          status: 'duplicate', 
          hash,
          existing: existingDoc.data()
        }
      }
      throw error
    }
  }
}
2.3 Remove Unnecessary Files
Delete these files entirely:

❌ public/hash-worker.js - No longer needed
❌ Any cache-related utilities
❌ Complex deduplication services

Phase 3: Implement New Simple Logic (2 hours)
3.1 Create New Constants
Add to src/views/FileUpload.vue:
javascript// File size limits
const MAX_BATCH_SIZE = 100 * 1024 * 1024  // 100MB for batch
const MAX_VIDEO_SIZE = 500 * 1024 * 1024  // 500MB for single video
const VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo']

// Validate file sizes
const validateFileSize = (files) => {
  // Single video file gets larger limit
  if (files.length === 1 && VIDEO_TYPES.includes(files[0].type)) {
    return files[0].size <= MAX_VIDEO_SIZE
  }
  
  // Batch upload limit
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  return totalSize <= MAX_BATCH_SIZE
}
3.2 Implement Simple Hash Generation
Add to src/views/FileUpload.vue:
javascript// Simple hash generation with collision safety
const generateFileHash = async (file) => {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  // Add size suffix for collision safety (SHA-256 + size = virtually impossible collision)
  return `${hash}_${file.size}`
}

// Process files for upload
const processFiles = async (files) => {
  // Step 1: Validate size limits
  if (!validateFileSize(files)) {
    const limit = files.length === 1 && VIDEO_TYPES.includes(files[0].type) 
      ? '500MB' : '100MB'
    showNotification(`File size exceeds ${limit} limit`, 'error')
    return
  }
  
  // Step 2: Generate hashes for all files
  const hashedFiles = await Promise.all(
    files.map(async (file) => ({
      file,
      hash: await generateFileHash(file),
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        lastModified: file.lastModified
      }
    }))
  )
  
  // Step 3: Client-side deduplication
  const uniqueFiles = new Map()
  const duplicates = []
  
  hashedFiles.forEach(item => {
    if (uniqueFiles.has(item.hash)) {
      duplicates.push(item)
    } else {
      uniqueFiles.set(item.hash, item)
    }
  })
  
  // Step 4: Check against database
  const results = await checkDatabaseDuplicates(Array.from(uniqueFiles.values()))
  
  // Step 5: Update UI
  updateUploadQueue(results, duplicates)
}
3.3 Implement Database Check
Add to src/views/FileUpload.vue:
javascriptconst checkDatabaseDuplicates = async (uniqueFiles) => {
  const teamId = authStore.currentTeam
  if (!teamId) {
    console.warn('No team context for deduplication')
    return uniqueFiles.map(f => ({ ...f, status: 'ready' }))
  }
  
  // Check each file against database
  const results = await Promise.all(
    uniqueFiles.map(async (fileData) => {
      const result = await UploadLogService.registerFile(
        fileData.hash,
        fileData.metadata,
        teamId
      )
      
      return {
        ...fileData,
        status: result.status === 'duplicate' ? 'existing' : 'ready',
        existingData: result.existing
      }
    })
  )
  
  return results
}
3.4 Update Queue Display Logic
Modify the queue update to show proper status:
javascriptconst updateUploadQueue = (checkedFiles, clientDuplicates) => {
  // Clear and rebuild queue
  uploadQueue.value = []
  
  // Add checked files with their status
  checkedFiles.forEach(file => {
    uploadQueue.value.push({
      id: crypto.randomUUID(),
      ...file,
      status: file.status,
      isDuplicate: false,
      isPreviousUpload: file.status === 'existing',
      duplicateMessage: file.existingData 
        ? `Previously uploaded on ${new Date(file.existingData.uploadedAt).toLocaleDateString()}`
        : null
    })
  })
  
  // Add client duplicates
  clientDuplicates.forEach(file => {
    uploadQueue.value.push({
      id: crypto.randomUUID(),
      ...file,
      status: 'duplicate',
      isDuplicate: true,
      isPreviousUpload: false,
      duplicateMessage: 'Duplicate file in current selection'
    })
  })
}
Phase 4: Update Firestore Structure (1 hour)
4.1 Update Security Rules
Update firestore.rules:
javascriptrules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Files use hash as document ID for automatic dedup
    match /teams/{teamId}/files/{hash} {
      allow read: if request.auth != null && 
                     (request.auth.uid == teamId || 
                      request.auth.token.teamId == teamId);
      
      // Create only if document doesn't exist (no merge)
      allow create: if request.auth != null && 
                       (request.auth.uid == teamId || 
                        request.auth.token.teamId == teamId);
      
      // No updates or deletes for immutability
      allow update, delete: if false;
    }
    
    // File index for queries
    match /teams/{teamId}/fileIndex/{hash} {
      allow read, write: if request.auth != null && 
                            (request.auth.uid == teamId || 
                             request.auth.token.teamId == teamId);
    }
  }
}
4.2 Deploy Rules
bashfirebase deploy --only firestore:rules
Phase 5: Testing (1 hour)
5.1 Test Cases

Single file upload - Should work with 500MB video limit
Batch upload - Should enforce 100MB total limit
Duplicate in batch - Should detect and mark appropriately
Previous upload - Should detect from database
Mixed scenario - Some new, some duplicates
Size limit validation - Should show appropriate errors

5.2 Performance Testing
javascript// Add simple performance logging
const testPerformance = async () => {
  console.time('Full deduplication process')
  
  // Create test files
  const testFiles = Array(100).fill(null).map((_, i) => 
    new File([`content${i}`], `file${i}.txt`)
  )
  
  await processFiles(testFiles)
  
  console.timeEnd('Full deduplication process')
  // Expected: < 2 seconds for 100 small files
}
Phase 6: Cleanup (30 minutes)
6.1 Remove Dead Code

Remove all commented-out code
Remove unused imports
Remove performance tracking code that's no longer needed
Remove complex caching logic

6.2 Update Documentation
Update inline comments to reflect new approach:
javascript/**
 * File deduplication using database constraints
 * 
 * Process:
 * 1. Generate SHA-256 hash + size suffix (collision safety)
 * 2. Use hash as Firestore document ID
 * 3. Database enforces uniqueness automatically
 * 4. No complex caching or comparison logic needed
 */
6.3 Final File Structure
Your simplified structure should look like:
src/
  views/
    FileUpload.vue (UI + simple processing logic)
  components/
    features/
      upload/
        FileUploadQueue.vue (unchanged - UI only)
  services/
    uploadLogService.js (20 lines instead of 400+)
Phase 7: Commit and Deploy
7.1 Test Thoroughly
bashnpm run dev
# Test all scenarios manually
7.2 Commit Changes
bashgit add -A
git commit -m "refactor: simplify deduplication using database constraints

- Replace complex deduplication logic with hash-as-ID pattern
- Reduce code complexity by ~80%
- Add file size limits (100MB batch, 500MB video)
- Add SHA-256 collision safety with size suffix
- Maintain all existing UI components"
7.3 Create PR
bashgit push origin refactor/constraint-based-dedup
# Create pull request for review
Expected Results
Before Refactor

~1000+ lines of deduplication logic
Complex caching systems
Worker pool management
Multiple duplicate detection algorithms
Performance tracking overhead

After Refactor

~200 lines total logic
No caching needed (database is the cache)
No workers needed (simple single-thread hashing)
One simple deduplication approach
Natural performance from platform optimization

Performance Targets

100 small files: < 2 seconds
10 large files (10MB each): < 5 seconds
Single 500MB video: < 10 seconds

Rollback Plan
If issues arise:
bashgit checkout pre-refactor-backup
git checkout -b hotfix/urgent-fix
# Apply minimal fixes
Success Metrics
✅ All existing UI remains unchanged
✅ File deduplication works correctly
✅ Size limits enforced properly
✅ Code reduced by >70%
✅ All test cases pass
✅ Performance meets or exceeds targets