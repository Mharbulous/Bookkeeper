# Simplified Firebase Storage Plan (KISS Edition)

Last Updated: 2025-08-30

## Overview

**Core Simplification**: ALL files go through matters. No exceptions.

This eliminates confusion about where files belong and simplifies security rules. Teams that need general storage simply create a "General" matter for non-client documents.

**Key Principles:**
- One storage pattern to rule them all: `/teams/{teamId}/matters/{matterId}/uploads/{fileHash}.{ext}`
- Every upload attempt is logged (successful or duplicate)
- Simple, consistent security rules
- Clear audit trail for compliance
- Handles multi-client matters and pre-matter intake documents

**Note**: For complete data structure specifications, see [data-structures.md](./data-structures.md) as the authoritative source.

## File Extension Standardization Policy

**All file extensions MUST use lowercase format throughout the system**, with one specific exception:

### Standardization Rules

- **Display**: All file extensions shown to users use lowercase (`.pdf`, `.docx`, `.jpg`)
- **Storage Paths**: Firebase Storage paths use lowercase extensions (`{fileHash}.pdf`)
- **Processing**: All file extension handling in code uses lowercase
- **Comparisons**: File type checks and mappings use lowercase extensions

### Original Case Preservation Exception

**The `originalMetadata` collection is the ONLY place where original file extension case is preserved.**

- `originalMetadata.originalName` stores the exact filename as it appeared in the original source file
- This preserves the historical record of how files were originally named
- Example: If user uploads `Report.PDF`, the originalName field stores `Report.PDF` exactly

### Implementation Examples

```javascript
// ✅ Correct - Display uses lowercase
const fileExtension = filename.split('.').pop().toLowerCase();
return `${fileSize} • ${fileExtension} • ${date}`;

// ✅ Correct - Storage uses lowercase  
const extension = file.name.split('.').pop().toLowerCase();
const storagePath = `teams/${teamId}/uploads/${fileHash}.${extension}`;

// ✅ Correct - Original metadata preserves case
const metadataRecord = {
  originalName: file.name, // Preserves original case: "Report.PDF"
  // ... other fields
};

// ❌ Incorrect - Don't use toUpperCase() for display
return `${fileSize} • ${fileExtension.toUpperCase()} • ${date}`;
```

### Rationale

- **Consistency**: Lowercase provides uniform display and prevents case-sensitivity issues
- **Compatibility**: Most file systems and web standards expect lowercase extensions
- **Historical Accuracy**: Original filenames preserved for audit and compliance purposes
- **User Experience**: Consistent lowercase display regardless of how files were originally named

## Naming Conventions

To keep things organized and queryable:
- **Team general**: `matter-general`
- **Client intake**: `matter-client-{clientId}-general`  
- **Regular matters**: `matter-{clientId}-{sequentialNumber}` or custom IDs
- **Multi-client matters**: Use primary client or descriptive ID like `matter-smith-estate-001`

## Storage Structure (Simplified)

```
Firebase Storage Root
└── /teams/{teamId}/matters/{matterId}/uploads/{fileHash}.{ext}
```

That's it. One pattern. Every file follows this structure.

**Note**: Complete storage structure documentation is maintained in [data-structures.md - Firebase Storage Structure](./data-structures.md#firebase-storage-structure).

### Special System Matters

Each team automatically gets these special matters:
- `matter-general` - Team resources, templates, non-client documents
- `matter-archive` - Archived/inactive documents

### Client Intake Matters

Each client gets a special intake matter for pre-matter documents:
- `matter-client-{clientId}-general` - Documents before matter is opened, or spanning multiple matters

Example: Client ABC Corp would have:
- `matter-client-abc-general` - Initial consultations, general corporate docs
- `matter-abc-001` - Specific matter #1 (contract review)
- `matter-abc-002` - Specific matter #2 (litigation)

### Multi-Client Matters

Matters can have multiple clients. For complete matter data structure, see [data-structures.md - Matters Collection](./data-structures.md#matters-collection-teamsteamidmattersmatterid).

## File Storage Implementation

### 1. Upload Service (Simple & Complete)

```javascript
class StorageService {
  async uploadFile(file, teamId, matterId, metadata = {}) {
    // 1. Calculate hash
    const fileHash = await this.calculateSHA256(file)
    const extension = file.name.split('.').pop().toLowerCase() // Standardize to lowercase
    const fileName = `${fileHash}.${extension}`
    const storagePath = `teams/${teamId}/matters/${matterId}/uploads/${fileName}`
    
    // 2. Create upload event record (ALWAYS, even for duplicates)
    const eventId = await this.logUploadEvent({
      eventType: 'upload_success',
      timestamp: new Date(),
      fileName: file.name,
      fileHash,
      metadataHash: await this.calculateMetadataHash(file),
      teamId,
      userId: auth.currentUser.uid
    })
    
    // 3. Check if file exists
    const fileRef = storage.ref(storagePath)
    const exists = await this.checkFileExists(fileRef)
    
    if (exists) {
      // 4a. File exists - create evidence record
      const evidenceId = await this.createEvidenceRecord({
        ...metadata,
        fileHash,
        isDuplicate: true,
        uploadEventId: eventId
      })
      
      return { 
        success: true, 
        isDuplicate: true,
        storagePath,
        evidenceId,
        eventId
      }
    }
    
    // 4b. New file - upload it
    await fileRef.put(file)
    
    // 5. Create evidence record
    const evidenceId = await this.createEvidenceRecord({
      ...metadata,
      fileHash,
      isDuplicate: false,
      uploadEventId: eventId
    })
    
    return { 
      success: true, 
      isDuplicate: false,
      storagePath,
      evidenceId,
      eventId
    }
  }
  
  async calculateSHA256(file) {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
}
```

### 2. Data Storage Implementation

**Important**: All data structures are definitively documented in [data-structures.md](./data-structures.md). This implementation uses:

- **Evidence Collection**: `/teams/{teamId}/evidence/{evidenceId}` - For document management and organization
- **Upload Events**: `/teams/{teamId}/matters/{matterId}/uploadEvents/{documentId}` - For tracking upload attempts
- **Original Metadata**: `/teams/{teamId}/matters/{matterId}/originalMetadata/{metadataHash}` - For file metadata deduplication

See the data structures document for complete field specifications and examples.

## Security Rules

**Security rules are maintained in [data-structures.md - Security Rules](./data-structures.md#security-rules) as the authoritative source.**

Key security principles:
- Team members can only access their own team's files
- Matter-based file organization provides natural access boundaries
- Evidence records and upload events are immutable once created
- Original metadata records use hash-based deduplication

## Client Isolation Strategy

### Matter-Based Isolation
Since ALL files go through matters, client isolation is automatic:
- Client A intake → `matter-client-A-general`
- Client B intake → `matter-client-B-general`
- Joint clients → `matter-smith-estate-001` (both clients listed)
- Team files → `matter-general`

### Multi-Client Considerations
When matters have multiple clients (e.g., husband & wife):
1. **Documents are associated with the matter**, not individual clients
2. **All clients of a matter can access that matter's documents**
3. **Client intake folders remain separate** until formally combined in a matter

Example workflow:
```javascript
// John Smith uploads documents during initial consultation
uploadFile(file, teamId, 'matter-client-john-general')

// Jane Smith uploads documents during her consultation  
uploadFile(file, teamId, 'matter-client-jane-general')

// Lawyer opens joint matter for estate planning
createMatter('matter-smith-estate-001', {
  clients: ['client-john-smith', 'client-jane-smith']
})

// New documents go to the joint matter
uploadFile(file, teamId, 'matter-smith-estate-001')

// Optional: Associate intake documents with new matter
associateDocumentWithMatter(docId, 'matter-client-john-general', 'matter-smith-estate-001')
```

### Security Benefits
1. **Pre-matter isolation**: Intake documents are isolated until matter is formalized
2. **Clear boundaries**: Each matter is a clear security boundary
3. **No accidents**: Can't accidentally mix different clients' matters
4. **Audit trail**: Document associations are tracked
```

## Tracking & Audit Trail

### Every Upload is Logged
```javascript
// Example: User uploads same file 3 times to different matters
// Result: 1 file in storage, 3 upload_logs records

// Log 1: New file to matter-123
{
  logId: 'log-001',
  fileName: 'Contract.pdf',
  fileHash: 'abc123',
  matterId: 'matter-123',
  wasDuplicate: false,  // First upload
  wasSuccessful: true
}

// Log 2: Same file to matter-456
{
  logId: 'log-002',
  fileName: 'Contract_Final.pdf',  // Different name, same content
  fileHash: 'abc123',              // Same hash!
  matterId: 'matter-456',
  wasDuplicate: true,               // Detected duplicate
  wasSuccessful: true
}

// Log 3: Upload failed (network error)
{
  logId: 'log-003',
  fileName: 'Contract.pdf',
  fileHash: 'abc123',
  matterId: 'matter-789',
  wasDuplicate: true,
  wasSuccessful: false,
  error: 'Network timeout'
}
```

### Useful Query Patterns

```javascript
// Find all evidence records for a specific matter
const matterEvidence = await db
  .collection('teams').doc(teamId)
  .collection('evidence')
  .where('displayCopy.matterId', '==', matterId)
  .orderBy('updatedAt', 'desc')
  .get()

// Find upload events for a matter
const uploadEvents = await db
  .collection('teams').doc(teamId)
  .collection('matters').doc(matterId)
  .collection('uploadEvents')
  .orderBy('timestamp', 'desc')
  .get()

// Find evidence by file hash (for deduplication checking)
const existingEvidence = await db
  .collection('teams').doc(teamId)
  .collection('evidence')
  .where('storageRef.fileHash', '==', fileHash)
  .get()

// Find files with specific tags
const taggedFiles = await db
  .collection('teams').doc(teamId)
  .collection('evidence')
  .where('tagsByHuman', 'array-contains', 'important')
  .get()
```

## Implementation Phases

### Phase 1: Core Upload (Week 1)
- [ ] SHA-256 calculation
- [ ] Basic upload to matter folders
- [ ] Document reference creation
- [ ] Upload logging
- [ ] Create system matters (general, client-general)

### Phase 2: Search & Retrieval (Week 2)
- [ ] Document search by name/tags
- [ ] Client document aggregation across matters
- [ ] Download functionality
- [ ] Upload history viewing

### Phase 3: Nice-to-haves (If needed)
- [ ] Bulk upload
- [ ] File preview
- [ ] Document association between matters
- [ ] Intake-to-matter workflow automation

## Practical Workflows

### New Client Consultation Flow
```javascript
// 1. Client calls for consultation
const clientId = await createClient({
  name: 'John Smith',
  email: 'john@example.com'
})

// 2. System auto-creates intake matter
const intakeMatterId = `matter-client-${clientId}-general`

// 3. Upload consultation documents
await uploadFile(consulationNotes, teamId, intakeMatterId)
await uploadFile(clientProvidedDocs, teamId, intakeMatterId)

// 4. If client engages firm, create formal matter
const formalMatterId = await createMatter({
  id: 'matter-smith-divorce-001',
  clients: [clientId],
  type: 'divorce'
})

// 5. New documents go to formal matter
await uploadFile(retainerAgreement, teamId, formalMatterId)

// 6. Optionally associate intake docs with formal matter
// (creates references, doesn't move files)
```

### Joint Client Matter Flow
```javascript
// 1. Create both clients
const husbandId = await createClient({ name: 'John Smith' })
const wifeId = await createClient({ name: 'Jane Smith' })

// 2. Each may have individual intake documents
await uploadFile(husbandTaxReturn, teamId, `matter-client-${husbandId}-general`)
await uploadFile(wifeFinancials, teamId, `matter-client-${wifeId}-general`)

// 3. Create joint matter
const jointMatterId = await createMatter({
  id: 'matter-smith-estate-001',
  clients: [husbandId, wifeId],
  type: 'estate-planning'
})

// 4. Joint documents go to joint matter
await uploadFile(jointAssets, teamId, jointMatterId)
```

## Benefits of This Simplified Approach

1. **One Pattern**: Developers only learn one file path pattern
2. **Consistent Security**: Same rules apply to all files
3. **Natural Isolation**: Matter-based structure naturally isolates clients
4. **Complete Audit Trail**: Every upload attempt is logged
5. **Efficient Storage**: SHA-256 deduplication still works perfectly
6. **Simple Queries**: Flat structure makes queries straightforward
7. **Future-Proof**: Can add features without changing core structure

## Common Operations

```javascript
// Upload initial consultation documents
await storageService.uploadFile(
  file, 
  teamId, 
  'matter-client-abc-general',  // Client's general intake folder
  { 
    displayName: 'Initial Tax Returns',
    tags: ['intake', 'tax'],
    folderPath: '/intake/2025'
  }
)

// Upload to a formal matter
await storageService.uploadFile(
  file,
  teamId,
  'matter-smith-estate-001',
  {
    displayName: 'Joint Asset Declaration',
    tags: ['estate', 'assets'],
    folderPath: '/estate-planning'
  }
)

// Upload a team resource
await storageService.uploadFile(
  file,
  teamId,
  'general',  // Team's general matter
  {
    displayName: 'Team Handbook 2024',
    tags: ['handbook', 'policy'],
    folderPath: '/team-resources'
  }
)

// Create evidence record with chosen metadata
async function createEvidenceFromMetadata(fileHash, chosenMetadataHash, tags = []) {
  const evidenceId = db.collection('teams').doc(teamId)
    .collection('evidence').doc().id
  
  await db.collection('teams').doc(teamId)
    .collection('evidence').doc(evidenceId).set({
      storageRef: {
        storage: 'uploads',
        fileHash: fileHash
      },
      displayCopy: {
        metadataHash: chosenMetadataHash,
        folderPath: '/' // User-chosen from available paths
      },
      fileSize: fileSize, // From original metadata
      isProcessed: false,
      tagsByAI: [],
      tagsByHuman: tags,
      updatedAt: new Date()
    })
    
  return evidenceId
}
```

**Note**: These examples show the implementation pattern. Complete method signatures and error handling should follow the data structures defined in [data-structures.md](./data-structures.md).

## Required Indexes

**Firestore indexes are documented in [data-structures.md - Required Firestore Indexes](./data-structures.md#required-firestore-indexes) as the authoritative source.**

Key indexes needed:
- Evidence collection queries by file hash and timestamps
- Upload events by matter and timestamp
- Original metadata by hash lookups
- Tag-based searches on evidence records

Remember: **Start simple, add complexity only when real usage patterns demand it.**