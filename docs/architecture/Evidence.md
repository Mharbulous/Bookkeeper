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

## Tag Subcollection System

**Note**: For complete documentation of the tag subcollection architecture, validation rules, query patterns, and implementation details, see [CategoryTags.md](CategoryTags.md).

**Database Location**: `/teams/{teamId}/evidence/{evidenceId}/tags/{categoryId}`

## Implementation Notes

Since we are starting with a clean database:

1. **All new evidence documents** will use the subcollection architecture from the start
2. **No migration required** - this is the optimal implementation
3. **Tag counters** will be maintained in evidence documents for quick access
4. **Clean, scalable data structure** across all documents


## Evidence Document Validation

**Note**: For tag subcollection validation rules and document-level constraints, see [CategoryTags.md](CategoryTags.md).

## Firestore Security Rules

### Security Rules for Evidence Documents

```javascript
// Evidence document access
match /teams/{teamId}/evidence/{evidenceId} {
  allow read, write: if
    request.auth != null &&
    request.auth.token.teamId == teamId;
}
```

**Note**: For tag subcollection security rules and validation functions, see [CategoryTags.md](CategoryTags.md).

## Query Patterns

### Get Evidence Document with Counters

```javascript
// Get evidence document (includes tag counters)
const evidenceDoc = await db
  .collection('teams')
  .doc(teamId)
  .collection('evidence')
  .doc(evidenceId)
  .get();

const evidence = evidenceDoc.data();
const tagCounts = {
  total: evidence.tagCount || 0,
  autoApproved: evidence.autoApprovedCount || 0,
  reviewRequired: evidence.reviewRequiredCount || 0
};
```

**Note**: For tag-specific query patterns and search operations, see [CategoryTags.md](CategoryTags.md).

## Performance Considerations

### Evidence Document Optimization

- **Counter fields** in evidence document provide quick access to tag metrics without subcollection queries
- **File metadata references** use hash-based lookups for deduplication
- **Processing stage tracking** enables efficient workflow management

**Note**: For tag subcollection performance considerations and indexing strategies, see [CategoryTags.md](CategoryTags.md).

## Feature Integration

**Note**: For confidence-based auto-approval feature flags and tag counter helpers, see [CategoryTags.md](CategoryTags.md).

## Testing Requirements

### Evidence Document Tests

- [ ] Evidence document creation with tag counters
- [ ] File reference validation and deduplication
- [ ] Processing stage transitions
- [ ] Storage reference integrity
- [ ] Metadata hash lookups

**Note**: For tag subcollection testing requirements, see [CategoryTags.md](CategoryTags.md).
