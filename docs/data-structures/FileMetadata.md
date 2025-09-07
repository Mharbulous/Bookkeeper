# File Metadata Data Structures

Last Updated: 2025-09-07

## Overview

This document defines the file metadata data structures used throughout the Bookkeeper application, with particular emphasis on the **critical distinction** between metadata for original files (stored on users' desktop computers) versus metadata for files stored in Firebase Storage.

## Core Architecture Principle

The Bookkeeper application implements **constraint-based deduplication** to optimize storage while preserving complete legal metadata. This creates a fundamental architectural distinction:

### Original Files vs. Storage Files

- **Original Files**: Multiple files on users' computers that may be duplicates with different names, locations, and timestamps
- **Storage Files**: Single deduplicated copies stored in Firebase Storage, identified by SHA-256 hash

### Legal Preservation Requirements

Since this application is designed for legal purposes, we must capture and preserve metadata about **every original file**, even when multiple original files are identical in content. This ensures complete audit trails and preserves the context of how files were originally organized.

## Primary File Metadata Collections

### 1. `originalMetadata` Collection

**Location**: `/teams/{teamId}/matters/{matterId}/originalMetadata/{metadataHash}`

**Purpose**: Store metadata about **original files** on users' desktop computers

**Key Characteristics**:
- Uses `metadataHash` as document ID (SHA-256 of concatenated metadata string)
- **ONLY place** where original file extension case is preserved
- Supports multiple folder paths for files uploaded through different contexts
- Implements deduplication at metadata level while preserving all original contexts

#### Schema

```javascript
{
  // === CORE FILE METADATA ===
  originalName: 'Contract_v1.PDF',              // Exact original filename (case preserved)
  lastModified: 1703123456789,                  // Original file's lastModified timestamp
  fileHash: 'abc123def456789abcdef012345...',    // SHA-256 of file content (64 chars)
  metadataHash: 'xyz789abc123def456...',         // SHA-256 of metadata string (64 chars)

  // === FOLDER PATH INFORMATION ===
  folderPaths: 'Documents/2023|Archive/Legal',  // Pipe-delimited paths from folder uploads

  // === METADATA HASH GENERATION ===
  // metadataHash = SHA-256 of: originalName|lastModified|fileHash
}
```

#### Folder Paths System

The `folderPaths` field uses a sophisticated system to capture multiple organizational contexts:

**Format**: Pipe-delimited (`|`) paths using forward slashes
**Examples**:
- Single path: `'Documents/2023'`
- Multiple paths: `'Documents/2023|Archive/Backup|Legal/Contracts'`
- Root level: `''` (empty string)

**Path Extraction**:
- Extracted from HTML5 `webkitRelativePath` property
- `"Documents/2023/invoices/invoice.pdf"` → `folderPaths: "Documents/2023/invoices"`
- Supports complex folder structures with pattern recognition

##### Detailed Folder Path Implementation

**Field Schema**:
- **Field Name**: `folderPaths`  
- **Type**: `string`  
- **Format**: Pipe-delimited paths using `"|"` separator  
- **Purpose**: Store multiple folder contexts for files uploaded via `webkitdirectory`

**Data Format Examples**:

```javascript
// Single Path
folderPaths: 'Documents/2023';

// Multiple Paths
folderPaths: 'Documents/2023|Archive/Backup|Legal/Contracts';

// Root Level Files
folderPaths: ''; // Empty string for files uploaded without folder context
```

**Path Extraction Rules**:
- `"Documents/2023/invoices/invoice.pdf"` → `folderPaths: "Documents/2023/invoices"`
- `"photos/vacation.jpg"` → `folderPaths: "photos"`
- `"readme.txt"` → `folderPaths: ""` (root level)

**Field Properties**:
- **Delimiter**: `"|"` character (invalid in most file systems, safe for separation)
- **Path Format**: Forward slashes (`/`) regardless of operating system
- **Normalization**: Leading slashes present, no trailing slashes (except root `"/"`)
- **Empty Values**: Empty string `""` represents root-level files
- **Multiple Contexts**: Same file content can have multiple folder contexts stored

**Folder Path Querying**:

```javascript
// Find all files in a specific folder path
const docs = await db
  .collection('teams')
  .doc(teamId)
  .collection('matters')
  .doc(matterId)
  .collection('originalMetadata')
  .where('folderPaths', '==', 'Documents/2023')
  .get();

// Find files that contain a specific path (requires client-side filtering)
const docs = await db
  .collection('teams')
  .doc(teamId)
  .collection('matters')
  .doc(matterId)
  .collection('originalMetadata')
  .get();

const filtered = docs.docs.filter((doc) => {
  const paths = doc.data().folderPaths.split('|');
  return paths.some((path) => path.includes('2023'));
});
```

**Note**: Complex folder path queries may require client-side filtering due to Firestore's limited string matching capabilities. For high-performance folder-based queries, consider adding specific indexes or denormalized fields based on actual usage patterns.

#### Smart Metadata Capturing

The system implements intelligent metadata capturing to handle multiple contexts for identical file content. For complete details, see: **[docs/uploading.md - Smart Metadata Capturing](../uploading.md#smart-metadata-capturing-algorithm)**

### 2. `evidence` Collection

**Location**: `/teams/{teamId}/evidence/{evidenceId}`

**Purpose**: Store organizational and processing metadata for **files stored in Firebase Storage**

**Key Characteristics**:
- References Firebase Storage files via `storageRef`
- Points to chosen `originalMetadata` record via `displayCopy`
- Implements subcollection-based tagging architecture
- Focuses on user-facing document management capabilities

#### Schema Summary

```javascript
{
  // === FIREBASE STORAGE REFERENCE ===
  storageRef: {
    storage: 'uploads',                         // Firebase Storage bucket
    fileHash: 'abc123def456789abcdef012345...',  // SHA-256 hash (storage filename)
    fileTypes: '.pdf'                           // File extension (lowercase)
  },

  // === DISPLAY REFERENCE ===
  displayCopy: 'xyz789abc123def456...',         // Points to chosen originalMetadata record

  // === FILE PROPERTIES ===
  fileSize: 2048576,                           // File size in bytes

  // === PROCESSING STATUS ===
  isProcessed: false,                          // Whether file has been processed
  processingStage: 'uploaded',                 // Current processing stage

  // === TAG SUBCOLLECTION COUNTERS ===
  tagCount: 8,                                // Total tags across all categories
  autoApprovedCount: 5,                       // AI tags auto-approved (confidence >= 85%)
  reviewRequiredCount: 2,                     // AI tags needing human review

  // === TIMESTAMPS ===
  updatedAt: Timestamp
}
```

#### Tag Subcollections

**Location**: `/teams/{teamId}/evidence/{evidenceId}/tags/{categoryId}`

Uses `categoryId` as document ID to ensure mutually exclusive categories with confidence-based auto-approval workflow for AI tags. For complete schema details, see: **[evidence-v1.1-schema.md](./evidence-v1.1-schema.md)**

### 3. `uploadEvents` Collection

**Location**: `/teams/{teamId}/matters/{matterId}/uploadEvents/{documentId}`

**Purpose**: Track essential upload events with minimal file metadata

**Key Characteristics**:
- Logs only 4 essential upload events
- Contains basic file identification metadata
- Provides audit trail for upload operations

#### Schema

```javascript
{
  // === EVENT INFORMATION ===
  eventType: 'upload_success',                    // Event type
  timestamp: Timestamp,                           // When event occurred

  // === FILE IDENTIFICATION ===
  fileName: 'document.pdf',                       // Original file name
  fileHash: 'abc123def456789abcdef012345...',     // SHA-256 of file content
  metadataHash: 'xyz789abc123def456...',          // SHA-256 of metadata

  // === CONTEXT ===
  teamId: 'team-abc-123',                         // Team identifier
  userId: 'user-john-123'                         // User identifier
}
```

#### Event Types

This collection logs only the 4 essential upload events with basic information:

- **`upload_interrupted`**: Upload started but not completed (may remain if process interrupted)
- **`upload_success`**: Upload completed successfully
- **`upload_failed`**: Upload failed for any reason
- **`upload_skipped_metadata_recorded`**: File skipped but metadata was recorded

#### Upload Events Implementation

The uploadEvents collection provides a minimal audit trail focused on essential upload operations without storing redundant file metadata that already exists in the originalMetadata collection.

**Event Processing Pattern**:
1. **Event Creation**: Each upload operation generates exactly one uploadEvents document
2. **Basic File Info**: Contains only essential file identification (name, hashes)
3. **Context Tracking**: Records team and user context for audit purposes
4. **Minimal Storage**: Avoids duplicating detailed metadata stored elsewhere

**Usage Examples**:

```javascript
// Query successful uploads for a matter
const successfulUploads = await db
  .collection('teams').doc(teamId)
  .collection('matters').doc(matterId)
  .collection('uploadEvents')
  .where('eventType', '==', 'upload_success')
  .orderBy('timestamp', 'desc')
  .get();

// Find interrupted uploads that may need cleanup
const interruptedUploads = await db
  .collection('teams').doc(teamId)
  .collection('matters').doc(matterId)
  .collection('uploadEvents')
  .where('eventType', '==', 'upload_interrupted')
  .get();
```

#### Event Types Detail

**upload_interrupted**:
- Created when upload process begins
- May remain if browser closes or network interrupts upload
- Used for cleanup operations and retry logic

**upload_success**: 
- Created when file successfully uploaded to Firebase Storage
- Confirms originalMetadata and evidence records created
- Primary success indicator for upload operations

**upload_failed**:
- Created when upload encounters unrecoverable error
- Includes context for debugging failed operations
- Does not indicate partial success states

**upload_skipped_metadata_recorded**:
- Created when file content already exists (deduplication)
- Upload skipped but new originalMetadata record created
- Indicates successful metadata preservation without redundant storage

## Deduplication Architecture

### How Deduplication Works

1. **File Content Deduplication**: Files with identical SHA-256 hashes share the same Firebase Storage file
2. **Metadata Preservation**: Each original file gets its own `originalMetadata` record
3. **Display Selection**: Each `evidence` document chooses one `originalMetadata` record for display purposes
4. **Complete Audit Trail**: All original file contexts are preserved for legal purposes

### Example Scenario

**User has 3 duplicate files**:
- `Desktop/contract.pdf` (modified: Jan 1, 2024)
- `Documents/Legal/contract_final.pdf` (modified: Jan 2, 2024)  
- `Backup/Contracts/CONTRACT.PDF` (modified: Jan 1, 2024)

**Result**:
- **1 Firebase Storage file**: `abc123def456789abcdef012345...` (using fileHash)
- **3 originalMetadata records**: Each with different `metadataHash` values
- **1 evidence document**: References storage file and chosen display metadata

### Storage Optimization

```
Firebase Storage: 1 file (2MB)
originalMetadata: 3 documents (< 1KB each)
evidence: 1 document (< 1KB)
uploadEvents: 3 documents (< 1KB each)

Total Storage: ~2MB + ~5KB metadata
vs. Naive Approach: 6MB (3 duplicate files)
Storage Savings: ~67%
```

### Firebase Storage Deduplication Examples

#### Same File, Multiple Contexts

**Scenario**: Same contract uploaded to multiple matters

**Storage**: Single file at one location
```
/teams/team-abc-123/matters/matter-001/uploads/abc123def456.pdf
```

**Metadata**: Multiple records with different contexts
```
/teams/team-abc-123/matters/matter-001/originalMetadata/xyz789abc123
/teams/team-abc-123/matters/matter-002/originalMetadata/def456xyz789
```

**Evidence**: Multiple evidence documents referencing same file
```
/teams/team-abc-123/evidence/evidence-001 → points to abc123def456.pdf
/teams/team-abc-123/evidence/evidence-002 → points to abc123def456.pdf
```

#### Same File, Different Names

**Scenario**: File with different original names (renamed on filesystem)

**Storage**: Single file (same content hash)
```
/teams/team-abc-123/matters/general/uploads/abc123def456.pdf
```

**Metadata**: Different records for each name variation
```
originalMetadata/hash1: { originalName: "contract_v1.pdf", ... }
originalMetadata/hash2: { originalName: "final_contract.pdf", ... }
```

#### Automatic Deduplication Features

1. **Content-Based**: Files with identical SHA-256 hashes stored once
2. **Metadata Preservation**: Multiple metadata records for different contexts
3. **Reference Counting**: Multiple evidence documents can reference same file
4. **Storage Efficiency**: Significant space savings for duplicate files

## Data Flow Patterns

### Upload Process

1. **File Selection** → User selects files/folders
2. **Hash Calculation** → SHA-256 computed for content and metadata
3. **Deduplication Check** → Check existing files by fileHash
4. **Storage Upload** → Upload to Firebase Storage (if new fileHash)
5. **Metadata Recording** → Create originalMetadata record (always)
6. **Evidence Creation** → Create evidence document (if new fileHash)
7. **Event Logging** → Record uploadEvents entry

### Display Process  

1. **Evidence Query** → Retrieve evidence documents
2. **Display Reference** → Follow `displayCopy` to originalMetadata
3. **Display Information** → Extract `originalName`, `lastModified` for UI
4. **Storage Access** → Use `storageRef` for file download/viewing

### Search and Organization

1. **Tag-Based Search** → Query evidence collection tag subcollections
2. **Folder-Based Search** → Query originalMetadata `folderPaths` field
3. **Content Search** → Query evidence collection with text matching
4. **Date Range Search** → Query originalMetadata `lastModified` field

## Client-Side Temporary Structures

While the three collections above are the persistent data stores, the application also uses temporary client-side structures:

### File Upload Queue

**Purpose**: Manage files during upload process
**Lifecycle**: Temporary during upload session
**Location**: Component state and Pinia stores

**Contains**:
- File objects from browser File API
- Processing progress and status
- Hash calculation results
- Upload queue management

### Web Worker Processing

**Purpose**: Background hash calculation and file processing
**Lifecycle**: During file analysis and upload
**Location**: Web Workers and worker managers

**Contains**:
- File content for hash processing
- Progress tracking data
- Hardware calibration metrics
- Performance measurements

### Component Caches

**Purpose**: UI performance optimization
**Lifecycle**: Component mounting/unmounting
**Location**: Vue component reactive state

**Contains**:
- Display information caches
- Tag data for quick access  
- Folder path parsing results
- UI rendering optimization data

## Relationship Patterns

### One-to-Many Relationships

```
1 Firebase Storage File
├── N originalMetadata records (different contexts)
└── 1 evidence document
    └── N tag subcollection documents
```

### Reference Patterns

```
evidence.storageRef.fileHash → Firebase Storage filename
evidence.displayCopy → originalMetadata.metadataHash
originalMetadata.fileHash → Firebase Storage filename
uploadEvents.fileHash → Firebase Storage filename
uploadEvents.metadataHash → originalMetadata.metadataHash
```

## Query Optimization

### Index Requirements

**originalMetadata Collection**:
- `folderPaths` (for folder-based queries)
- `lastModified` (for date range queries) 
- `fileHash` (for deduplication queries)

**evidence Collection**:
- `storageRef.fileHash` (for file-based queries)
- `updatedAt` (for chronological queries)
- `processingStage` (for processing status)

**uploadEvents Collection**:
- `eventType` + `timestamp` (for event history)
- `fileHash` (for file tracking)
- `userId` (for user activity)

### Performance Considerations

- **Denormalization**: Display information cached in evidence documents
- **Counter Fields**: Tag counts maintained in evidence documents
- **Lazy Loading**: Metadata loaded on-demand for UI optimization
- **Batch Operations**: Multiple metadata records processed efficiently

## Security and Access Control

All file metadata collections follow the team-based security model:

```javascript
// Firestore Security Rules Pattern
allow read, write: if
  request.auth != null &&
  request.auth.token.teamId == teamId;
```

**Key Security Features**:
- Team-scoped access control
- Hash-based document IDs prevent enumeration
- Metadata separation from file content
- Audit trail through uploadEvents

## Migration and Compatibility

### Backward Compatibility

- `originalMetadata` collection is additive-only
- Missing fields treated as defaults (empty strings, false booleans)
- Graceful degradation for legacy data structures

### Team Migration Considerations

When users migrate from solo teams to collaborative teams, file metadata collections require special handling:

**Collections Subject to Migration**:
All three file metadata collections are migrated as part of team data migration:
- `originalMetadata` - Preserves original file contexts with migration tracking
- `evidence` - Maintains file organization and processing status
- `uploadEvents` - Retains upload audit trail for compliance

**Migration Process**:
```javascript
// Migrate all file metadata subcollections
const metadataCollections = ['originalMetadata', 'uploadEvents'];
const evidenceCollection = 'evidence'; // Migrated at team root level

for (const collectionName of metadataCollections) {
  const docs = await db.collection('teams').doc(fromTeamId)
    .collection('matters').doc(matterId)
    .collection(collectionName).get();

  // Copy documents to new team with migration tracking
  const batch = db.batch();
  docs.forEach((doc) => {
    const newDocRef = db.collection('teams').doc(toTeamId)
      .collection('matters').doc(matterId)
      .collection(collectionName).doc(doc.id);
    batch.set(newDocRef, {
      ...doc.data(),
      migratedFrom: fromTeamId,
      migratedAt: new Date(),
    });
  });
  await batch.commit();
}
```

**Migration Tracking**:
Each migrated metadata document includes:
```javascript
{
  // Original document data
  ...originalData,
  
  // Migration tracking
  migratedFrom: 'user-123',  // Original team ID
  migratedAt: Timestamp      // When migration occurred
}
```

**Storage File Considerations**:
- Firebase Storage files remain in original paths initially
- File references in metadata remain valid
- New uploads use new team paths
- Background job can relocate files later if needed

### Future Extensions

The metadata architecture supports future enhancements:
- Multi-user team collaboration
- Advanced folder virtualization
- Enhanced AI processing metadata
- Extended file type support
- Cross-app metadata sharing (Multi-App SSO)

## Implementation Notes

### Critical Design Decisions

1. **Single Source of Truth**: `originalMetadata` is authoritative for original file information
2. **Reference-Based Display**: `evidence` documents reference rather than duplicate metadata
3. **Hash-Based Deduplication**: SHA-256 hashes ensure reliable content identification
4. **Legal Compliance**: All original contexts preserved regardless of duplication

### Development Guidelines

- Always preserve original filename case in `originalMetadata`
- Use lowercase extensions everywhere else for consistency
- Maintain referential integrity between collections
- Implement proper error handling for missing references
- Use batch operations for metadata-heavy operations

## Related Documentation

- **[docs/uploading.md](../uploading.md)** - Complete upload process and smart metadata capturing
- **[evidence-v1.1-schema.md](./evidence-v1.1-schema.md)** - Detailed evidence collection schema
- **[firestore-collections.md](./firestore-collections.md)** - Complete Firestore schema reference
- **[firebase-storage.md](./firebase-storage.md)** - Firebase Storage organization patterns