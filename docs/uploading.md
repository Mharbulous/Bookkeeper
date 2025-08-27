# File Upload System Documentation

## Overview

The Bookkeeper application features a sophisticated file upload system designed for law firms and professional services. It provides efficient file processing, deduplication, real-time progress tracking, and comprehensive audit logging with power-outage detection capabilities.

## System Architecture

### Core Components

- **Upload Queue Management**: Real-time file processing with lazy loading UI
- **Deduplication Engine**: SHA-256 hash-based duplicate detection 
- **Progress Tracking**: Hardware-calibrated time estimation with 3-phase prediction
- **Event Logging**: Individual file upload events with interruption detection
- **Metadata Recording**: Constraint-based deduplication using metadata hashes
- **Storage Management**: Team-scoped Firebase Storage with automatic deduplication

## File Storage and Data Paths

For complete documentation of all file storage paths and Firestore data structures, please refer to the single source of truth: **[docs/data-structures.md](./data-structures.md)**

### Quick Reference
- **File Storage**: `/teams/{teamId}/matters/{matterId}/files/{fileHash}.{extension}`
- **Upload Session Logs**: `/teams/{teamId}/matters/{matterId}/logs/{documentId}`
- **Individual Upload Events**: `/teams/{teamId}/matters/{matterId}/uploadEvents/{documentId}`
- **File Metadata Records**: `/teams/{teamId}/matters/{matterId}/metadata/{metadataHash}`

**Note**: All data structure schemas, field definitions, and storage strategies are maintained in `data-structures.md` to ensure consistency across the system.

## Upload Process Flow

### 1. File Selection & Analysis
```
User drops files/folder → Folder analysis → Time estimation → Queue initialization
```

- **Instant Queue Display**: First 100 files shown immediately (< 60ms)
- **Background Processing**: Remaining files processed in web workers
- **Hardware Calibration**: System measures performance for accurate time predictions

### 2. Deduplication Processing

#### Size-Based Pre-filtering
```javascript
// Files with unique sizes skip hash calculation entirely
uniqueSizeFiles = files.filter(file => sizeCount[file.size] === 1)
duplicateCandidates = files.filter(file => sizeCount[file.size] > 1)
```

#### Hash-Based Verification
```javascript
// Only duplicate candidates undergo SHA-256 hashing
for (const file of duplicateCandidates) {
  file.hash = await calculateSHA256(file)
  if (existingHashes.has(file.hash)) {
    file.isDuplicate = true
  }
}
```

**Efficiency**: Typically 60-80% of files skip expensive hash calculation

### 3. Upload Execution

#### Interrupted Upload Detection System

For complete documentation of upload event data structures and the interrupted upload detection system, please refer to: **[docs/data-structures.md](./data-structures.md#individual-upload-events)**

**Flow Summary**:
1. Start upload → Create "interrupted" event (deterministic ID)
2. Upload completes → Overwrite with success/failure event  
3. Power outage → "interrupted" event remains as evidence

#### Upload Loop Process
```javascript
for (const file of uploadableFiles) {
  // 1. Log interrupted event
  await logInterruptedEvent(file)
  
  // 2. Check if file exists in storage
  if (await checkFileExists(file.hash)) {
    // Skip file, log event, create metadata
    await logSkippedEvent(file)
    await createMetadataRecord(file)
    continue
  }
  
  // 3. Upload file
  await uploadToFirebase(file)
  
  // 4. Overwrite interrupted event with success
  await logSuccessEvent(file)
  await createMetadataRecord(file)
}
```

## User Interface System

### Upload Queue Components

#### Main Components
- **UploadDropzone**: Drag-and-drop interface with file/folder selection
- **FileUploadQueue**: Main queue display with lazy loading
- **LazyFileItem**: Individual file items with status indicators
- **ProcessingProgressModal**: Real-time progress during hash calculation
- **QueueTimeProgress**: Hardware-calibrated time estimation display

#### Progressive Loading Strategy
```
Small batches (≤100 files): Load all immediately
Large batches (>100 files): 
  → Show first 100 files instantly
  → Load remaining files in background
  → Update UI when complete
```

### Visual Status System (Color Dots)

| Dot | Status | Meaning | Tooltip |
|-----|--------|---------|---------|
| 🔵 | `ready` | Ready for upload | "Ready for upload" |
| 🟡 | `uploading` | Currently uploading | "Uploading..." |
| 🟢 | `completed` | Successfully uploaded | "Successfully uploaded" |
| 🟠 | `previouslyUploaded` | Already exists, skipped | "Already exists, skipped" |
| 🔴 | `error` | Upload failed | "Failed upload" |
| ⚪ | `isDuplicate` | Upload metadata only | "Upload metadata only" |
| ⚪ | `unknown` | Unknown status (fallback) | "Unknown status" |

### Real-Time Updates
- **Status changes**: Dots update immediately when status changes
- **Progress tracking**: Live progress bars during processing
- **Upload notifications**: Success/failure notifications with detailed statistics

## Metadata Hash Constraint-Based Deduplication

For complete documentation of metadata hash generation, constraint-based deduplication logic, and use case examples, please refer to the single source of truth: **[docs/data-structures.md](./data-structures.md#file-metadata-records)**

### Key Concepts
- **File Content Hash**: SHA-256 of actual file content for storage deduplication
- **Metadata Hash**: SHA-256 of `originalName|lastModified|fileHash` for metadata deduplication  
- **Automatic Constraints**: Firestore document IDs prevent duplicate metadata records
- **Multi-Level Deduplication**: Storage level (content) + metadata level (combinations)

## Performance Optimization

### Hardware-Calibrated Time Estimation

#### Calibration Process
```javascript
// Measure files processed per millisecond during folder analysis
const hFactor = filesProcessed / elapsedTimeMs

// Store performance measurements for future predictions
const predictions = {
  phase1: (60 + (candidates * 6.5) + (sizeMB * 0.8)) * hardwareMultiplier,
  phase2: (50 + (files * 0.52) + (avgDepth * 45)) * hardwareMultiplier
}
```

#### 3-Phase Time Prediction
1. **Phase 1: File Analysis** - Size-based duplicate detection (~60ms baseline)
2. **Phase 2: Hash Processing** - SHA-256 calculation (hardware calibrated)  
3. **Phase 3: UI Rendering** - DOM updates (complexity calibrated)

### Web Worker Architecture
```javascript
// Background processing prevents UI blocking
FileHashWorker → SHA-256 calculation
FileAnalysisWorker → Path parsing and statistics
UIUpdateWorker → Batch DOM updates
```

### Lazy Loading System
- **Placeholder Components**: Instant rendering with progressive enhancement
- **Virtual Scrolling**: Handle thousands of files without performance loss
- **On-Demand Loading**: Items load as they become visible

## Error Handling & Recovery

### Upload Interruption Detection
- **Power Outage**: Interrupted events remain as permanent audit trail
- **Network Failure**: Automatic retry logic with exponential backoff
- **User Cancellation**: Clean cancellation with proper cleanup

### Error Recovery Strategies
```javascript
// Upload retry logic
let retryCount = 0
const maxRetries = 3

while (retryCount < maxRetries) {
  try {
    await uploadFile(file)
    break // Success
  } catch (error) {
    retryCount++
    await delay(Math.pow(2, retryCount) * 1000) // Exponential backoff
  }
}
```

### Data Consistency
- **Transactional Operations**: Metadata and event logging use Firestore transactions
- **Rollback Capabilities**: Failed operations trigger automatic cleanup
- **Audit Trail**: Complete history of all upload attempts and outcomes

## Security Considerations

### Access Control
- **Team-Based Isolation**: Files scoped to team ID for multi-tenancy
- **Matter-Level Organization**: Files organized by legal matters
- **Firebase Security Rules**: Server-side access control enforcement

### File Validation
- **Size Limits**: Configurable per-file and per-batch limits
- **Type Restrictions**: MIME type validation and extension checking  
- **Hash Verification**: Content integrity verification using SHA-256

### Data Privacy
- **Encryption in Transit**: HTTPS for all file transfers
- **Encryption at Rest**: Firebase Storage server-side encryption
- **Audit Logging**: Complete trail of access and modification events

## API Reference

For complete data structure schemas and field definitions used by these APIs, please refer to: **[docs/data-structures.md](./data-structures.md)**

### Core Functions

#### Upload Queue Management
```javascript
const { uploadQueue, addFilesToQueue, clearQueue } = useFileQueue()
```

#### Upload Event Logging
```javascript
const { logFileUploadEvent, startUploadSession } = useUploadLogger()

// See data-structures.md for complete field definitions
await logFileUploadEvent({
  fileName: 'document.pdf',
  fileHash: 'abc123...',
  status: 'uploaded',
  reason: 'upload_complete',
  allowOverwrite: true
})
```

#### Metadata Management
```javascript
const { createMetadataRecord, generateMetadataHash } = useFileMetadata()

// See data-structures.md for complete field definitions  
await createMetadataRecord({
  originalName: 'document.pdf',
  lastModified: timestamp,
  fileHash: 'abc123...',
  sessionId: 'session_123'
})
```

### Configuration Options

#### Upload Settings
```javascript
const uploadConfig = {
  maxFileSize: 50 * 1024 * 1024,     // 50MB per file
  maxBatchSize: 500 * 1024 * 1024,   // 500MB per batch  
  allowedTypes: ['.pdf', '.docx', '.jpg'],
  enableDeduplication: true,
  enableProgressTracking: true
}
```

#### Performance Tuning
```javascript
const performanceConfig = {
  workerCount: navigator.hardwareConcurrency || 4,
  batchSize: 100,
  uiUpdateDelay: 16, // 60fps
  hashingTimeout: 30000 // 30 seconds
}
```

## Monitoring & Analytics

### Key Metrics Tracked
- **Upload Success Rate**: Percentage of successful uploads
- **Average Upload Time**: Per-file and per-session timing
- **Deduplication Efficiency**: Percentage of duplicates detected
- **Hardware Performance**: H-factor calibration measurements
- **Error Rates**: By error type and file type

### Logging Structure
```javascript
// Console logging format
console.log(`[UPLOAD] ${action}: ${fileName} (${status})`, {
  eventId: 'event_123',
  sessionId: 'session_456', 
  duration: '2.3s',
  fileSize: '1.2MB'
})
```

## Troubleshooting Guide

### Common Issues

#### Upload Failures
- **Network timeouts**: Check internet connectivity
- **File size limits**: Verify files are under size limits  
- **Storage quota**: Check Firebase Storage usage
- **Permissions**: Verify user has upload permissions

#### Performance Issues
- **Slow hash calculation**: Check hardware calibration factor
- **UI freezing**: Verify web workers are functioning
- **Memory usage**: Monitor batch sizes and file counts

#### Deduplication Problems
- **False duplicates**: Check hash calculation consistency
- **Missing duplicates**: Verify size-based pre-filtering logic
- **Metadata conflicts**: Check metadata hash generation

### Debug Commands

```javascript
// Enable verbose logging
localStorage.setItem('uploadDebug', 'true')

// Check hardware calibration
console.log('H-factor:', localStorage.getItem('hardwareCalibration'))

// Monitor queue state
console.log('Queue:', uploadQueue.value)

// Check worker status  
console.log('Workers:', workerManager.getStatus())
```

## Future Enhancements

### Planned Features
- **Resume Interrupted Uploads**: Checkpoint-based recovery
- **Batch Processing**: Background upload queuing
- **Advanced Analytics**: Upload pattern analysis
- **Content Scanning**: Automatic document classification
- **Integration APIs**: External system connectivity

### Performance Improvements
- **Streaming Uploads**: For very large files
- **CDN Integration**: Global content delivery
- **Compression**: Automatic file compression
- **Delta Sync**: Incremental file updates

---

*Last Updated: August 2025*
*Version: 2.0*
*Bookkeeper Upload System Documentation*