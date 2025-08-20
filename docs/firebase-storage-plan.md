# Simplified Firebase Storage Plan (KISS Edition)

## Overview

**Core Simplification**: ALL files go through matters. No exceptions.

This eliminates confusion about where files belong and simplifies security rules. Teams that need general storage simply create a "General" matter for non-client documents.

**Key Principles:**
- One storage pattern to rule them all: `/teams/{teamId}/matters/{matterId}/{sha256}.{ext}`
- Every upload attempt is logged (successful or duplicate)
- Simple, consistent security rules
- Clear audit trail for compliance
- Handles multi-client matters and pre-matter intake documents

## Naming Conventions

To keep things organized and queryable:
- **Team general**: `matter-general`
- **Client intake**: `matter-client-{clientId}-general`  
- **Regular matters**: `matter-{clientId}-{sequentialNumber}` or custom IDs
- **Multi-client matters**: Use primary client or descriptive ID like `matter-smith-estate-001`

## Storage Structure (Simplified)

```
Firebase Storage Root
└── /teams/{teamId}/matters/{matterId}/{sha256}.{ext}
```

That's it. One pattern. Every file follows this structure.

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

Matters can have multiple clients (stored in Firestore):
```javascript
// In Firestore: /teams/{teamId}/matters/{matterId}
{
  matterId: 'matter-smith-estate-001',
  title: 'Smith Estate Planning',
  clients: [
    { clientId: 'client-john-smith', name: 'John Smith', role: 'primary' },
    { clientId: 'client-jane-smith', name: 'Jane Smith', role: 'primary' }
  ],
  status: 'active'
}

## File Storage Implementation

### 1. Upload Service (Simple & Complete)

```javascript
class StorageService {
  async uploadFile(file, teamId, matterId, metadata = {}) {
    // 1. Calculate hash
    const fileHash = await this.calculateSHA256(file)
    const extension = file.name.split('.').pop().toLowerCase()
    const fileName = `${fileHash}.${extension}`
    const storagePath = `teams/${teamId}/matters/${matterId}/${fileName}`
    
    // 2. Create upload log record (ALWAYS, even for duplicates)
    const logId = await this.logUploadAttempt({
      teamId,
      matterId,
      fileName: file.name,
      fileHash,
      storagePath,
      fileSize: file.size,
      mimeType: file.type,
      metadata,
      uploadedBy: auth.currentUser.uid,
      loggedAt: new Date()
    })
    
    // 3. Check if file exists
    const fileRef = storage.ref(storagePath)
    const exists = await this.checkFileExists(fileRef)
    
    if (exists) {
      // 4a. File exists - just create a reference
      await this.createFileReference({
        ...metadata,
        fileHash,
        storagePath,
        isDuplicate: true,
        originalUploadLogId: logId
      })
      
      return { 
        success: true, 
        isDuplicate: true,
        storagePath,
        logId
      }
    }
    
    // 4b. New file - upload it
    await fileRef.put(file)
    
    // 5. Create file reference
    const docId = await this.createFileReference({
      ...metadata,
      fileHash,
      storagePath,
      isDuplicate: false,
      originalUploadAttemptId: attemptId
    })
    
    return { 
      success: true, 
      isDuplicate: false,
      storagePath,
      documentId: docId,
      attemptId
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

### 2. Firestore Collections (Simplified)

#### Main Document Registry: `/teams/{teamId}/documents/{documentId}`
```javascript
{
  // Core identifiers
  fileHash: 'abc123...',           // SHA-256 hash
  storagePath: 'teams/xyz/matters/m123/abc123.pdf',
  
  // User-friendly info
  displayName: 'Contract_2024.pdf', // What users see
  originalFileName: 'Contract ABC Corp.pdf',
  
  // Organization
  matterId: 'matter-123',
  clientIds: ['client-456', 'client-789'],  // Array for multi-client matters
  
  // Metadata
  fileSize: 1048576,
  mimeType: 'application/pdf',
  uploadedBy: 'user-123',
  uploadedAt: Timestamp,
  
  // Simple categorization
  tags: ['contract', 'draft'],     // Simple array of tags
  documentType: 'client-provided'  // 'client-provided', 'firm-generated', 'court-filing', 'correspondence'
}
```

#### Upload Logs: `/teams/{teamId}/upload_logs/{logId}`
```javascript
{
  // What was attempted
  fileName: 'Contract ABC Corp.pdf',
  fileHash: 'abc123...',
  fileSize: 1048576,
  mimeType: 'application/pdf',
  
  // Where it was going
  matterId: 'matter-123',
  targetPath: 'teams/xyz/matters/m123/abc123.pdf',
  
  // Who and when
  uploadedBy: 'user-123',
  loggedAt: Timestamp,
  
  // Result
  wasSuccessful: true,              // false if error
  wasDuplicate: false,              // true if file already existed
  error: null,                      // Error message if failed
  
  // User metadata from upload
  userMetadata: {
    notes: 'Initial draft version'
  }
}
```

## Security Rules (Dead Simple)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // One rule: Team members can access their team's files
    match /teams/{teamId}/matters/{matterId}/{fileName} {
      allow read, write: if request.auth != null && 
                           request.auth.token.teamId == teamId;
    }
  }
}
```

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Team members can read all team documents and upload logs
    match /teams/{teamId}/documents/{doc} {
      allow read: if request.auth != null && 
                     request.auth.token.teamId == teamId;
      allow create: if request.auth != null && 
                       request.auth.token.teamId == teamId;
      allow update, delete: if false;  // Documents are immutable
    }
    
    match /teams/{teamId}/upload_logs/{log} {
      allow read: if request.auth != null && 
                     request.auth.token.teamId == teamId;
      allow create: if request.auth != null && 
                       request.auth.token.teamId == teamId;
      allow update, delete: if false;  // Logs are immutable
    }
  }
}
```

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

### Useful Queries

```javascript
// Find all documents for a specific client (across all matters)
const clientDocs = await db
  .collection('teams').doc(teamId)
  .collection('documents')
  .where('clientIds', 'array-contains', clientId)
  .orderBy('uploadedAt', 'desc')
  .get()

// Find intake documents for a client (pre-matter)
const intakeDocs = await db
  .collection('teams').doc(teamId)
  .collection('documents')
  .where('matterId', '==', `matter-client-${clientId}-general`)
  .orderBy('uploadedAt', 'desc')
  .get()

// Find all uploads by a user
const userUploads = await db
  .collection('teams').doc(teamId)
  .collection('upload_logs')
  .where('uploadedBy', '==', userId)
  .orderBy('loggedAt', 'desc')
  .get()

// Find duplicate uploads
const duplicates = await db
  .collection('teams').doc(teamId)
  .collection('upload_logs')
  .where('wasDuplicate', '==', true)
  .get()

// Get upload history for a specific file hash
const fileHistory = await db
  .collection('teams').doc(teamId)
  .collection('upload_logs')
  .where('fileHash', '==', fileHash)
  .orderBy('loggedAt', 'desc')
  .get()

// Find all documents for a multi-client matter
const matterDocs = await db
  .collection('teams').doc(teamId)
  .collection('documents')
  .where('matterId', '==', matterId)
  .orderBy('uploadedAt', 'desc')
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
// Upload initial consultation documents (no matter yet)
await storageService.uploadFile(
  file, 
  teamId, 
  'matter-client-abc-general',  // Client's general intake folder
  { 
    displayName: 'Initial Tax Returns',
    clientIds: ['client-abc'],
    tags: ['intake', 'tax'],
    documentType: 'client-provided'
  }
)

// Upload to a multi-client matter (husband & wife)
await storageService.uploadFile(
  file,
  teamId,
  'matter-smith-estate-001',
  {
    displayName: 'Joint Asset Declaration',
    clientIds: ['client-john-smith', 'client-jane-smith'],
    tags: ['estate', 'assets'],
    documentType: 'client-provided'
  }
)

// Upload a team resource
await storageService.uploadFile(
  file,
  teamId,
  'matter-general',  // Team's general matter
  {
    displayName: 'Team Handbook 2024',
    clientIds: [],  // No clients for team documents
    tags: ['handbook', 'policy'],
    documentType: 'firm-generated'
  }
)

// Move document reference from intake to formal matter (just update Firestore)
async function associateDocumentWithMatter(documentId, fromMatterId, toMatterId) {
  // Note: File stays in original location (no need to move in Storage)
  // Just create a new document reference pointing to same file
  const doc = await db
    .collection('teams').doc(teamId)
    .collection('documents').doc(documentId)
    .get()
  
  // Create new reference for the formal matter
  await db
    .collection('teams').doc(teamId)
    .collection('documents').add({
      ...doc.data(),
      matterId: toMatterId,
      associatedFrom: fromMatterId,
      associatedAt: new Date(),
      notes: 'Moved from client intake to formal matter'
    })
}
```

## Required Indexes (Minimal)

```javascript
// Just the essentials
[
  {
    collection: 'teams/{teamId}/documents',
    fields: [
      { field: 'matterId', order: 'ASCENDING' },
      { field: 'uploadedAt', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'teams/{teamId}/documents',
    fields: [
      { field: 'clientIds', mode: 'ARRAY_CONTAINS' },
      { field: 'uploadedAt', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'teams/{teamId}/upload_logs',
    fields: [
      { field: 'uploadedBy', order: 'ASCENDING' },
      { field: 'attemptedAt', order: 'DESCENDING' }
    ]
  }
]
```

Remember: **Start simple, add complexity only when real usage patterns demand it.**