# Evidence Document Structure v1.1 - Subcollection-Based Tags with Confidence Workflow

## Overview

This document defines the Evidence document structure for Organizer v1.1, featuring subcollection-based tagging with confidence-based auto-approval. Since we are starting with a clean slate (all data and documents have been deleted), this version implements the optimal subcollection architecture from the start.

## Database Location

```
/teams/{teamId}/evidence/{evidenceId}
```

## Evidence Document Structure

```javascript
{
  // === FILE REFERENCES ===
  storageRef: {
    storage: 'uploads',
    fileHash: string,  // SHA-256 hash of file content
    fileTypes: string  // File extension/type (e.g., '.pdf')
  },

  displayCopy: string,  // Metadata hash - reference to originalMetadata document

  // === FILE PROPERTIES ===
  fileSize: number,

  // === PROCESSING STATUS ===
  isProcessed: boolean,
  hasAllPages: boolean | null,
  processingStage: 'uploaded' | 'splitting' | 'merging' | 'complete',

  // === TAG SUBCOLLECTION COUNTERS ===
  tagCount: number,                // Total tags across all categories
  autoApprovedCount: number,       // AI tags auto-approved (confidence >= 85%)
  reviewRequiredCount: number,     // AI tags needing human review (confidence < 85%)

  // === TIMESTAMPS ===
  updatedAt: timestamp
}
```

## Tag Subcollection Structure

```
/teams/{teamId}/evidence/{evidenceId}/tags/{categoryId}
```

```javascript
{
  // === CATEGORY IDENTIFICATION ===
  categoryId: string,              // Same as document ID (enforces one tag per category)
  categoryName: string,            // Display name for category

  // === SELECTED TAG ===
  tagName: string,                 // The chosen tag within this category
  color: string,                   // Category color for UI display (#4CAF50)

  // === TAG SOURCE AND CONFIDENCE ===
  source: 'ai' | 'ai-auto' | 'human',    // How this tag was applied
  confidence: number,              // AI confidence (0-1), 1.0 for human tags

  // === AUTO-APPROVAL WORKFLOW ===
  autoApproved: boolean,           // Whether AI auto-approved (confidence >= 85%)
  reviewRequired: boolean,         // Whether human review is needed

  // === HUMAN REVIEW TRACKING ===
  reviewedAt: timestamp | null,    // When human reviewed (if applicable)
  reviewedBy: string | null,       // Who reviewed it (if applicable)
  humanApproved: boolean | null,   // Whether human approved AI suggestion

  // === TIMESTAMPS AND ATTRIBUTION ===
  createdAt: timestamp,            // When tag was created
  createdBy: string,               // Who/what created it ('ai-system' | userId)

  // === AI ANALYSIS AND EXTENDED METADATA ===
  AIanalysis: {
    // AI processing details
    aiSelection: string,                   // AI's selected tag
    originalConfidence: number,            // Original AI confidence score
    aiAlternatives: string[],               // All alternative tags AI considered, rank-ordered by confidence (excludes chosen tag)
    processingModel: string,               // AI model used ('claude-3-sonnet')
    contentMatch: string,                  // Why AI suggested this

    // Human interaction
    reviewReason: string,                  // Why review was needed
    reviewNote: string,                    // Human reviewer note
    userNote: string                       // User-added note
  }
}
```

## Implementation Notes

Since we are starting with a clean database:

1. **All new evidence documents** will use the subcollection architecture from the start
2. **No migration required** - this is the optimal implementation
3. **Tag counters** will be maintained in evidence documents for quick access
4. **Clean, scalable data structure** across all documents

### AI Alternatives Architecture

The `aiAlternatives` field implements a no-cap approach that balances UX simplicity with AI transparency:

**Data Storage:**
- Stores ALL alternative tags the AI considered (no arbitrary limit)
- Rank-ordered by AI confidence/relevance score
- Excludes the AI's final selected tag (stored separately in `aiSelection`)

**UI Implementation:**
- Displays only top 2 alternatives as quick-click options
- "Other" button shows all category options with smart ordering:
  - Remaining aiAlternatives (3rd, 4th, 5th, etc.) in rank order
  - Followed by all other category options not in aiAlternatives
- Optimal decision tree: AI choice → Alt 1 → Alt 2 → Other (full category)

**Benefits:**
- Maximum AI transparency for debugging and analysis
- Optimal user experience with minimal cognitive load
- Future-proof for multi-select categories and advanced features
- Rich data for machine learning and system improvements

## Validation Rules

### Tag Subcollection Validation

```javascript
// Tag document validation
{
  categoryId: {
    required: true,
    type: 'string',
    pattern: /^[a-zA-Z0-9_-]+$/ // Valid Firestore document ID
  },
  categoryName: {
    required: true,
    type: 'string',
    maxLength: 50
  },
  tagName: {
    required: true,
    type: 'string',
    maxLength: 30
  },
  color: {
    required: true,
    type: 'string',
    pattern: /^#[0-9A-Fa-f]{6}$/ // Valid hex color
  },
  source: {
    required: true,
    type: 'string',
    enum: ['ai', 'ai-auto', 'human']
  },
  confidence: {
    required: true,
    type: 'number',
    minimum: 0.0,
    maximum: 1.0
  },
  autoApproved: {
    required: true,
    type: 'boolean'
  },
  reviewRequired: {
    required: true,
    type: 'boolean'
  },
  AIanalysis: {
    required: true,
    type: 'object',
    properties: {
      aiSelection: { type: 'string' },
      originalConfidence: { type: 'number', minimum: 0.0, maximum: 1.0 },
      aiAlternatives: { type: 'array', items: { type: 'string' } },
      processingModel: { type: 'string' }
    }
  }
}
```

### Document-Level Constraints

- **Maximum 100 tags per evidence document** (across all categories)
- **One tag per category** (enforced by categoryId as document ID)
- **Category must exist** and be active when adding tags
- **Confidence threshold**: AI tags >= 85% auto-approved, < 85% require review

## Firestore Security Rules

### Security Rules for v1.1

```javascript
// Evidence document access
match /teams/{teamId}/evidence/{evidenceId} {
  allow read, write: if
    request.auth != null &&
    request.auth.token.teamId == teamId;
}

// Tag subcollection access
match /teams/{teamId}/evidence/{evidenceId}/tags/{categoryId} {
  allow read, write: if
    request.auth != null &&
    request.auth.token.teamId == teamId;

  // Validate tag document on write
  allow create, update: if
    validateTagDocument(request.resource.data);
}

function validateTagDocument(data) {
  return data.keys().hasAll(['categoryId', 'categoryName', 'tagName', 'color', 'source', 'confidence', 'autoApproved', 'reviewRequired', 'AIanalysis']) &&
    data.categoryId is string &&
    data.tagName is string &&
    data.source in ['ai', 'ai-auto', 'human'] &&
    data.confidence >= 0.0 && data.confidence <= 1.0 &&
    data.AIanalysis.keys().hasAny(['aiSelection', 'originalConfidence', 'aiAlternatives', 'processingModel']);
}
```

## Query Patterns

### Get All Tags for Evidence Document

```javascript
// Query tag subcollection
const tagsSnapshot = await db
  .collection('teams')
  .doc(teamId)
  .collection('evidence')
  .doc(evidenceId)
  .collection('tags')
  .get();

const tags = tagsSnapshot.docs.map((doc) => ({
  id: doc.id,
  ...doc.data(),
}));
```

### Filter Tags by Review Status

```javascript
// Get only tags requiring review
const reviewRequiredTags = await db
  .collection('teams')
  .doc(teamId)
  .collection('evidence')
  .doc(evidenceId)
  .collection('tags')
  .where('reviewRequired', '==', true)
  .get();

// Get only auto-approved tags
const autoApprovedTags = await db
  .collection('teams')
  .doc(teamId)
  .collection('evidence')
  .doc(evidenceId)
  .collection('tags')
  .where('autoApproved', '==', true)
  .get();
```

### Search Across Documents by Tag

```javascript
// Search requires client-side filtering due to subcollection structure
const searchTerm = 'invoice';

// First get all evidence documents
const evidenceSnapshot = await db.collection('teams').doc(teamId).collection('evidence').get();

// Then filter by tags (requires subcollection queries)
const matchingDocuments = [];
for (const evidenceDoc of evidenceSnapshot.docs) {
  const tagsSnapshot = await evidenceDoc.ref.collection('tags').get();
  const hasMatchingTag = tagsSnapshot.docs.some(
    (tagDoc) =>
      tagDoc.data().tagName.toLowerCase().includes(searchTerm) ||
      tagDoc.data().categoryName.toLowerCase().includes(searchTerm)
  );

  if (hasMatchingTag) {
    matchingDocuments.push(evidenceDoc);
  }
}
```

## Performance Considerations

### Indexing Strategy

```javascript
// Composite indexes for tag subcollections
[
  ['reviewRequired', 'createdAt'],
  ['autoApproved', 'confidence'],
  ['source', 'createdAt'],
  ['categoryId', 'tagName'], // Though categoryId is document ID
];
```

### Subcollection Benefits

- **Direct category access**: Access specific categories without full subcollection query
- **Mutually exclusive**: Only one tag per category (categoryId as document ID)
- **Scalable**: No document size limits as tags grow
- **Atomic updates**: Replace category tag without affecting others

### Performance Optimization

- **Counter fields** in evidence document avoid subcollection queries for counts
- **Lazy loading** of tag subcollections when needed
- **Category caching** for frequently accessed categories
- **Batch operations** for multiple tag updates

## Feature Flags

### Confidence-Based Auto-Approval Control

```javascript
// Feature flag for auto-approval (default enabled for clean slate)
const ENABLE_AUTO_APPROVAL = process.env.VITE_ENABLE_AUTO_APPROVAL !== 'false';
const CONFIDENCE_THRESHOLD = parseFloat(process.env.VITE_CONFIDENCE_THRESHOLD) || 0.85;

// Auto-approval logic helper
const shouldAutoApprove = (confidence) => {
  return ENABLE_AUTO_APPROVAL && confidence >= CONFIDENCE_THRESHOLD;
};

// Tag counter helper (uses evidence document counters)
const getTagCounts = (evidence) => {
  return {
    total: evidence.tagCount || 0,
    autoApproved: evidence.autoApprovedCount || 0,
    reviewRequired: evidence.reviewRequiredCount || 0,
  };
};
```

## Testing Requirements

### Unit Tests

- [ ] Subcollection tag validation
- [ ] Confidence-based auto-approval logic
- [ ] Tag counter increment/decrement
- [ ] Review workflow state transitions

### Integration Tests

- [ ] Evidence document creation with counters
- [ ] Tag subcollection CRUD operations
- [ ] Auto-approval workflow end-to-end
- [ ] Human review process
- [ ] Tag deletion and counter updates

### Performance Tests

- [ ] Subcollection query performance with 100+ tags per document
- [ ] Tag counter updates <100ms
- [ ] Auto-approval processing <200ms
- [ ] Review interface loading <300ms
- [ ] Memory usage with large tag subcollections
