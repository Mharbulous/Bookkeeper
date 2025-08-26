# Fix Clear All Button - Properly Terminate Async Processes

## Problem
When user clicks Clear All while deduplication/queueing is running:
1. Initial 100 files get cleared from UI
2. Background async processes continue working
3. Queue gets repopulated when background processes complete
4. Clear All doesn't actually clear everything

## Root Cause
The `performComprehensiveCleanup()` function doesn't properly terminate all active async operations that can repopulate the queue.

## Current Flow (Problematic)
```
Upload Folder → initializeQueueInstantly() → shows 100 files
                ↓
                addFilesToQueue() → processFilesWithQueue() (ASYNC)
                ↓
User clicks Clear All → performComprehensiveCleanup()
                ↓
                Clears displayed files BUT async processes continue
                ↓
                Background processes complete → repopulates queue
```

## Solution Strategy
Use existing async operation tracking to properly terminate all operations.

## Investigation Needed
1. **Find existing async tracking**: What system do we already have?
2. **Identify missing terminations**: Which async operations in `performComprehensiveCleanup()` aren't being properly cancelled?
3. **Map the async chain**: 
   - `initializeQueueInstantly()` 
   - `addFilesToQueue()`
   - `processFilesWithQueue()`
   - Any other background operations

## Key Questions
- Where is the existing async operation tracking system?
- How do we register operations with it?
- How do we cancel all operations through it?
- Are we missing any async operation registrations?

## Implementation Steps (TBD)
1. Review existing async tracking system
2. Ensure all file processing operations are tracked
3. Update `performComprehensiveCleanup()` to use proper termination
4. Test Clear All properly terminates everything

## Success Criteria
- Click Clear All → queue stays empty
- No repopulation from background processes
- All async operations properly terminated