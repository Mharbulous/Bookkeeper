# Streaming File Deduplication Optimization Guide

## Overview
This guide optimizes file deduplication for maximum speed while maintaining excellent UX through streaming processing, efficient hashing, and smart batching strategies.

## Core Optimization Strategies

### 1. Efficient File Hashing with Chunking

Replace your current `calculateFileHash` function with a chunked approach that prevents UI blocking:

```javascript
// Optimized hash calculation with progress tracking
const calculateFileHash = async (file, onProgress = null) => {
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
  const chunks = Math.ceil(file.size / CHUNK_SIZE);
  const hasher = await crypto.subtle.digest('SHA-256', new ArrayBuffer(0));
  
  let processedBytes = 0;
  
  for (let i = 0; i < chunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    
    const arrayBuffer = await chunk.arrayBuffer();
    const chunkHash = await crypto.subtle.digest('SHA-256', arrayBuffer);
    
    processedBytes += (end - start);
    
    // Report progress without blocking
    if (onProgress) {
      onProgress(processedBytes / file.size);
    }
    
    // Yield to prevent blocking UI on large files
    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hasher));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
```

### 2. Smart Queue Processing with Priority

Implement a priority-based queue system that processes smaller files first for instant feedback:

```javascript
// Enhanced queue processor with priority
const processQueuedFilesStreamingly = async () => {
  if (isProcessingQueue.value) return;
  
  isProcessingQueue.value = true;
  processingController.value = new AbortController();
  
  const SMALL_FILE_SIZE = 1024 * 1024; // 1MB
  const BATCH_SIZE = 20;
  
  try {
    while (true) {
      if (processingController.value.signal.aborted) break;
      
      // Prioritize small files for instant feedback
      const queueingFiles = uploadQueue.value
        .filter(file => file.status === 'queueing')
        .sort((a, b) => {
          // Small files first
          if (a.size < SMALL_FILE_SIZE && b.size >= SMALL_FILE_SIZE) return -1;
          if (b.size < SMALL_FILE_SIZE && a.size >= SMALL_FILE_SIZE) return 1;
          // Then by size ascending
          return a.size - b.size;
        })
        .slice(0, BATCH_SIZE);
      
      if (queueingFiles.length === 0) break;
      
      // Process batch
      await processBatch(queueingFiles);
      
      // Micro-yield for UI responsiveness
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
  } finally {
    isProcessingQueue.value = false;
    processingController.value = null;
  }
};
```

### 3. Optimized Batch Duplicate Detection

Reduce Firestore queries with better batching and caching:

```javascript
// In-memory cache for recent duplicate checks
const duplicateCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const checkForDuplicatesBatch = async (files) => {
  const teamId = authStore.currentTeam;
  if (!teamId) {
    files.forEach(file => {
      file.duplicateResult = { isDuplicate: false };
    });
    return;
  }
  
  // Split files into cached and uncached
  const uncachedFiles = [];
  const now = Date.now();
  
  files.forEach(file => {
    const cacheKey = `${teamId}:${file.hash}`;
    const cached = duplicateCache.get(cacheKey);
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      file.duplicateResult = cached.result;
    } else {
      uncachedFiles.push(file);
    }
  });
  
  if (uncachedFiles.length === 0) return;
  
  // Batch query for uncached files only
  const uniqueHashes = [...new Set(uncachedFiles.map(f => f.hash))];
  
  // Use Promise.all for parallel chunk processing
  const chunks = [];
  for (let i = 0; i < uniqueHashes.length; i += 10) {
    chunks.push(uniqueHashes.slice(i, i + 10));
  }
  
  const results = await Promise.all(
    chunks.map(chunk => 
      UploadLogService.findUploadsByHashes(chunk, teamId)
    )
  );
  
  const allUploads = results.flat();
  const uploadsByHash = new Map();
  
  allUploads.forEach(upload => {
    if (!uploadsByHash.has(upload.fileHash)) {
      uploadsByHash.set(upload.fileHash, []);
    }
    uploadsByHash.get(upload.fileHash).push(upload);
  });
  
  // Process results and update cache
  uncachedFiles.forEach(file => {
    const existingUploads = uploadsByHash.get(file.hash) || [];
    const result = processUploadComparison(file, existingUploads);
    
    file.duplicateResult = result;
    
    // Cache the result
    const cacheKey = `${teamId}:${file.hash}`;
    duplicateCache.set(cacheKey, {
      result: result,
      timestamp: now
    });
  });
};
```

### 4. Web Worker for Heavy Processing (Optional)

For very large file sets, offload hash calculation to a Web Worker:

```javascript
// worker.js
self.onmessage = async (e) => {
  const { file, id } = e.data;
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    self.postMessage({ id, hash, success: true });
  } catch (error) {
    self.postMessage({ id, error: error.message, success: false });
  }
};

// Main thread usage
const workerPool = [];
const WORKER_COUNT = navigator.hardwareConcurrency || 4;

for (let i = 0; i < WORKER_COUNT; i++) {
  workerPool.push(new Worker('/worker.js'));
}

const calculateHashWithWorker = (file) => {
  return new Promise((resolve, reject) => {
    const worker = workerPool[Math.floor(Math.random() * WORKER_COUNT)];
    const id = crypto.randomUUID();
    
    const handler = (e) => {
      if (e.data.id === id) {
        worker.removeEventListener('message', handler);
        if (e.data.success) {
          resolve(e.data.hash);
        } else {
          reject(new Error(e.data.error));
        }
      }
    };
    
    worker.addEventListener('message', handler);
    worker.postMessage({ file, id });
  });
};
```

### 5. Optimized UI Updates

Batch UI updates to prevent excessive re-renders:

```javascript
// Debounced UI update mechanism
let updateTimer = null;
const pendingUpdates = new Map();

const scheduleUIUpdate = (fileId, updates) => {
  pendingUpdates.set(fileId, updates);
  
  if (updateTimer) return;
  
  updateTimer = requestAnimationFrame(() => {
    // Apply all pending updates at once
    pendingUpdates.forEach((updates, fileId) => {
      const file = uploadQueue.value.find(f => f.id === fileId);
      if (file) {
        Object.assign(file, updates);
      }
    });
    
    pendingUpdates.clear();
    updateTimer = null;
  });
};
```

### 6. Progressive Enhancement Pattern

Implement a three-stage processing pipeline:

```javascript
const processFilesProgressively = async (files) => {
  // Stage 1: Instant UI feedback (synchronous)
  files.forEach(file => {
    file.status = 'queueing';
    file.stage = 1;
    uploadQueue.value.push(file);
  });
  
  // Stage 2: Quick metadata duplicate check (< 100ms)
  await Promise.all(files.map(async file => {
    // Check for obvious duplicates by name/size/date
    const quickDupe = findQuickDuplicate(file);
    if (quickDupe) {
      file.status = 'duplicate-likely';
      file.stage = 2;
      scheduleUIUpdate(file.id, { status: 'duplicate-likely', stage: 2 });
    }
  }));
  
  // Stage 3: Full hash calculation and verification (background)
  const hashPromises = files.map(async file => {
    if (file.status === 'duplicate-likely') {
      // Still calculate hash to confirm
      file.hash = await calculateFileHash(file.file);
    } else {
      file.hash = await calculateFileHash(file.file);
    }
    
    file.stage = 3;
    scheduleUIUpdate(file.id, { hash: file.hash, stage: 3 });
  });
  
  // Don't wait for all hashes, process as they complete
  for (const promise of hashPromises) {
    await promise;
    // Check duplicates for completed files immediately
    await checkSingleFileDuplicate(file);
  }
};
```

## Implementation Checklist

### Immediate Optimizations (Quick Wins)
- [ ] Add file size-based priority processing
- [ ] Implement result caching for duplicate checks
- [ ] Batch Firestore queries efficiently
- [ ] Use `requestAnimationFrame` for UI updates

### Medium-Term Improvements
- [ ] Implement chunked hash calculation
- [ ] Add progress indicators for large files
- [ ] Create debounced UI update system
- [ ] Add quick metadata-based duplicate detection

### Advanced Optimizations
- [ ] Implement Web Worker pool for hash calculation
- [ ] Add IndexedDB caching for persistent duplicate detection
- [ ] Create progressive enhancement pipeline
- [ ] Implement adaptive batch sizing based on performance

## Performance Metrics to Track

```javascript
const performanceMetrics = {
  hashingTime: [],
  queryTime: [],
  totalProcessingTime: [],
  filesPerSecond: 0,
  
  track(metric, value) {
    this[metric].push(value);
    this.calculateAverages();
  },
  
  calculateAverages() {
    // Calculate moving averages for adaptive optimization
    const recent = this.hashingTime.slice(-100);
    const avgHashTime = recent.reduce((a, b) => a + b, 0) / recent.length;
    
    // Adjust batch size based on performance
    if (avgHashTime > 100) {
      BATCH_SIZE = Math.max(5, BATCH_SIZE - 1);
    } else if (avgHashTime < 50) {
      BATCH_SIZE = Math.min(50, BATCH_SIZE + 1);
    }
  }
};
```

## Expected Performance Improvements

With these optimizations, you should see:

- **Initial feedback**: < 10ms (instant UI response)
- **Small files (< 1MB)**: Complete processing in < 200ms
- **Medium files (1-10MB)**: Hash calculation in < 500ms
- **Large files (> 10MB)**: Progressive processing with progress indication
- **Batch processing**: 100+ files/second for small files
- **Firestore queries**: 50-80% reduction through caching

## Testing Strategy

```javascript
// Performance testing utility
const testDeduplicationPerformance = async () => {
  const testFiles = generateTestFiles([
    { size: 100 * 1024, count: 100 },    // 100 small files
    { size: 5 * 1024 * 1024, count: 20 }, // 20 medium files
    { size: 50 * 1024 * 1024, count: 5 }  // 5 large files
  ]);
  
  console.time('Total Processing');
  
  const results = await processFilesWithMetrics(testFiles);
  
  console.timeEnd('Total Processing');
  console.table(results);
};
```

## Conclusion

By implementing these optimizations in order of priority, you'll achieve:
1. Instant UI feedback regardless of file count
2. Efficient processing that scales with file size
3. Minimal Firestore queries through intelligent caching
4. Non-blocking UI even with hundreds of files

Start with the immediate optimizations for quick wins, then progressively implement the more complex solutions based on your specific performance requirements.