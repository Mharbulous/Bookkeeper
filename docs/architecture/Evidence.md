# Evidence Document Structure

## Database Path

```
/teams/{teamId}/evidence/{evidenceId}
```

## Document Schema

### Required Fields

```javascript
{
  // File References - REQUIRED
  storageRef: {
    storage: 'uploads',           // MUST be 'uploads'
    fileHash: string,            // SHA-256 hash - REQUIRED, 64 chars
    fileTypes: string            // File extension with dot (e.g., '.pdf')
  },

  displayCopy: string,           // Metadata hash - REQUIRED, references originalMetadata

  // File Properties - REQUIRED
  fileSize: number,              // Bytes, must be > 0

  // Processing Status - REQUIRED
  isProcessed: boolean,          // Default: false
  hasAllPages: boolean | null,   // null until processing complete
  processingStage: string,       // ENUM: 'uploaded' | 'splitting' | 'merging' | 'complete'

  // Tag Counters - REQUIRED
  tagCount: number,              // Default: 0, increment on tag add
  autoApprovedCount: number,     // Default: 0, tags with confidence >= 85%
  reviewRequiredCount: number,   // Default: 0, tags with confidence < 85%

  // Timestamps - REQUIRED
  updatedAt: timestamp           // Server timestamp, update on any change
}
```

### Field Constraints

**storageRef:**

- **ALWAYS** verify fileHash exists in uploads collection before creating document
- **NEVER** create evidence without valid storageRef
- **MUST** use SHA-256 hash (64 character string)

**displayCopy:**

- **ALWAYS** verify hash exists in originalMetadata collection
- **NEVER** store actual metadata in evidence document
- **USE** hash-based lookup for deduplication

**Note**: For understanding the critical distinction between original file metadata and storage file references, including the three-collection deduplication system, see [FileMetadata.md](FileMetadata.md).

**processingStage:**

- **MUST** follow this progression: 'uploaded' → 'splitting' → 'merging' → 'complete'
- **NEVER** skip stages or move backwards
- **UPDATE** isProcessed to true only when stage = 'complete'

**Tag Counters:**

- **INCREMENT** counters atomically using FieldValue.increment()
- **NEVER** manually calculate from subcollection
- **UPDATE** updatedAt whenever counters change

**Note**: For complete tag subcollection architecture, validation rules, and category management patterns, see [CategoryTags.md](CategoryTags.md).

## Tag Subcollection

### Path Structure

```
/teams/{teamId}/evidence/{evidenceId}/tags/{categoryId}
```

### Tag Document Schema

```javascript
{
  // Tag Identity - REQUIRED
  categoryId: string,            // Must match document ID
  tags: string[],                // Array of tag values for this category

  // AI Processing - REQUIRED
  confidence: number,            // 0-100, decimal allowed
  aiSource: string,              // Model identifier (e.g., 'gpt-4')

  // Approval Status - REQUIRED
  status: string,                // ENUM: 'auto_approved' | 'pending_review' | 'human_approved' | 'rejected'

  // Optional Metadata
  reviewedBy: string | null,     // User ID if human reviewed
  reviewedAt: timestamp | null,  // Timestamp of human review

  // Timestamps - REQUIRED
  createdAt: timestamp,          // Server timestamp
  updatedAt: timestamp           // Server timestamp
}
```

### Tag Status Rules

**ALWAYS** set status based on confidence:

- confidence >= 85: status = 'auto_approved'
- confidence < 85: status = 'pending_review'

**NEVER** allow:

- Empty tags array
- Duplicate categoryId within same evidence
- Confidence values outside 0-100 range
- Manual status changes without updating reviewedBy/reviewedAt

## Firestore Security Rules

```javascript
match /teams/{teamId}/evidence/{evidenceId} {
  // Evidence document access
  allow read: if request.auth != null &&
                 request.auth.token.teamId == teamId;

  allow create: if request.auth != null &&
                   request.auth.token.teamId == teamId &&
                   validateEvidenceCreate(request.resource.data);

  allow update: if request.auth != null &&
                   request.auth.token.teamId == teamId &&
                   validateEvidenceUpdate(request.resource.data, resource.data);

  allow delete: if false; // NEVER allow deletion

  // Tag subcollection
  match /tags/{categoryId} {
    allow read: if request.auth != null &&
                   request.auth.token.teamId == teamId;

    allow write: if request.auth != null &&
                    request.auth.token.teamId == teamId &&
                    request.resource.id == request.resource.data.categoryId &&
                    validateTagDocument(request.resource.data);
  }
}

// Validation Functions
function validateEvidenceCreate(data) {
  return data.keys().hasAll(['storageRef', 'displayCopy', 'fileSize',
                              'isProcessed', 'processingStage', 'tagCount',
                              'autoApprovedCount', 'reviewRequiredCount', 'updatedAt']) &&
         data.storageRef.storage == 'uploads' &&
         data.storageRef.fileHash.size() == 64 &&
         data.fileSize > 0 &&
         data.processingStage in ['uploaded', 'splitting', 'merging', 'complete'] &&
         data.tagCount >= 0 &&
         data.autoApprovedCount >= 0 &&
         data.reviewRequiredCount >= 0;
}

function validateTagDocument(data) {
  return data.confidence >= 0 &&
         data.confidence <= 100 &&
         data.tags.size() > 0 &&
         data.status in ['auto_approved', 'pending_review', 'human_approved', 'rejected'] &&
         (data.confidence >= 85 ? data.status == 'auto_approved' : true) &&
         (data.confidence < 85 ? data.status == 'pending_review' : true);
}
```

**Note**: For complete security rule patterns, custom claims structure, and team-based access control implementation, see [security-rules.md](security-rules.md).

```javascript
```

## Query Operations

### Get Evidence with Tag Counts

```javascript
const evidenceDoc = await db
  .collection('teams')
  .doc(teamId)
  .collection('evidence')
  .doc(evidenceId)
  .get();

// ALWAYS check document exists
if (!evidenceDoc.exists) throw new Error('Evidence not found');

const data = evidenceDoc.data();
// USE counters from document, DO NOT query subcollection for counts
const tagMetrics = {
  total: data.tagCount,
  autoApproved: data.autoApprovedCount,
  reviewRequired: data.reviewRequiredCount,
};
```

**Note**: For team member management and data migration workflows that affect evidence document access patterns, see [team-workflows.md](team-workflows.md).

```javascript
```

### Get Tags for Evidence

```javascript
// Get all tags
const tagsSnapshot = await db
  .collection('teams')
  .doc(teamId)
  .collection('evidence')
  .doc(evidenceId)
  .collection('tags')
  .get();

// Get pending review tags only
const pendingTags = await db
  .collection('teams')
  .doc(teamId)
  .collection('evidence')
  .doc(evidenceId)
  .collection('tags')
  .where('status', '==', 'pending_review')
  .get();
```

### Add Tag to Evidence

```javascript
// MUST use transaction to maintain counter integrity
await db.runTransaction(async (transaction) => {
  const evidenceRef = db.collection('teams').doc(teamId).collection('evidence').doc(evidenceId);

  const tagRef = evidenceRef.collection('tags').doc(categoryId);

  // Determine status based on confidence
  const status = confidence >= 85 ? 'auto_approved' : 'pending_review';

  // Create tag document
  transaction.set(tagRef, {
    categoryId,
    tags: tagArray,
    confidence,
    aiSource,
    status,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Update counters atomically
  const counterUpdates = {
    tagCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (status === 'auto_approved') {
    counterUpdates.autoApprovedCount = FieldValue.increment(1);
  } else {
    counterUpdates.reviewRequiredCount = FieldValue.increment(1);
  }

  transaction.update(evidenceRef, counterUpdates);
});
```

### Update Processing Stage

```javascript
// MUST follow stage progression rules
const validTransitions = {
  uploaded: ['splitting'],
  splitting: ['merging'],
  merging: ['complete'],
  complete: [], // Terminal state
};

// ALWAYS validate transition
const currentStage = evidenceDoc.data().processingStage;
const canTransition = validTransitions[currentStage].includes(newStage);

if (!canTransition) {
  throw new Error(`Invalid stage transition: ${currentStage} → ${newStage}`);
}

// Update stage
await evidenceRef.update({
  processingStage: newStage,
  isProcessed: newStage === 'complete',
  hasAllPages: newStage === 'complete' ? true : null,
  updatedAt: FieldValue.serverTimestamp(),
});
```

## Performance Requirements

### Indexing

**MUST** create composite indexes:

```
Collection: tags
- status ASC, confidence DESC
- categoryId ASC, createdAt DESC
- status ASC, updatedAt DESC
```

### Counter Maintenance

- **NEVER** recalculate counters from subcollection queries
- **ALWAYS** use FieldValue.increment() for atomic updates
- **USE** counters for UI display without subcollection reads

### Batch Operations

- **LIMIT** batch writes to 500 documents per batch
- **USE** BulkWriter for large tag imports
- **IMPLEMENT** exponential backoff for retries

**Note**: For complete storage path organization, processing folder architecture, and Firebase Storage optimization strategies, see [firebase-storage.md](firebase-storage.md).

## Critical Constraints

### Data Integrity

- **NEVER** delete evidence documents
- **NEVER** modify fileHash after creation
- **ALWAYS** maintain counter accuracy with transactions
- **NEVER** allow orphaned tags (evidence deleted but tags remain)

### File References

- **ALWAYS** verify file exists in storage before creating evidence
- **NEVER** store file content in Firestore
- **USE** SHA-256 hash for deduplication
- **ALWAYS** verify metadata hash exists in originalMetadata collection

**Note**: For understanding team-based data isolation including solo user patterns where teamId === userId, see [SoloTeamMatters.md](SoloTeamMatters.md).

### Processing Workflow

- **MUST** process documents in order: upload → split → merge → complete
- **NEVER** mark isProcessed=true unless processingStage='complete'
- **ALWAYS** update timestamps on any field change
- **DO NOT** allow manual stage changes without proper validation

### Tag Management

- **ENFORCE** confidence thresholds: 85% for auto-approval
- **NEVER** allow confidence values outside 0-100 range
- **ALWAYS** track reviewer identity for manual approvals
- **MAINTAIN** accurate counts through atomic transactions
