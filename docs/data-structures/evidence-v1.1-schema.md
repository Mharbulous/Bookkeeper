# Evidence Document Structure v1.1 - Category-Based Tags

## Overview

This document defines the updated Evidence document structure for Organizer v1.1, which introduces structured category-based tagging while maintaining full backward compatibility with v1.0.

## Database Location
```
/teams/{teamId}/evidence/{evidenceId}
```

## Updated Evidence Document Structure

### Current v1.0 Structure (Preserved)
```javascript
{
  // === FILE REFERENCES (Unchanged) ===
  storageRef: {
    storage: 'uploads',
    fileHash: string  // SHA-256 hash of file content
  },
  
  displayCopy: {
    metadataHash: string,  // Reference to originalMetadata document
    folderPath: string     // Original folder path from upload
  },
  
  // === FILE PROPERTIES (Unchanged) ===
  fileSize: number,
  
  // === PROCESSING STATUS (Unchanged) ===
  isProcessed: boolean,
  hasAllPages: boolean | null,
  processingStage: 'uploaded' | 'splitting' | 'merging' | 'complete',
  
  // === LEGACY TAGS (Preserved for Compatibility) ===
  tags: string[],           // v1.0 free-form tags - PRESERVED
  tagCount: number,         // Total count of all tags
  lastTaggedAt: timestamp,
  taggedBy: 'manual' | 'ai' | 'migration',
  
  // === TIMESTAMPS (Unchanged) ===
  updatedAt: timestamp
}
```

### New v1.1 Structured Tags
```javascript
{
  // === NEW STRUCTURED TAGS ===
  tagsByHuman: [            // Human-assigned structured tags
    {
      categoryId: string,      // Reference to category document ID
      categoryName: string,    // Denormalized category name for performance
      tagId: string,          // Unique identifier for this tag instance
      tagName: string,        // Display name of the tag
      color: string          // Hex color code (e.g., '#1976d2')
    }
  ],
  
  tagsByAI: [               // AI-assigned structured tags (v1.2 preparation)
    {
      categoryId: string,
      categoryName: string,
      tagId: string,
      tagName: string,
      color: string,
      confidence: number     // AI confidence score (0.0 - 1.0)
    }
  ],
  
  // === MIGRATION SUPPORT ===
  legacyTags: string[],     // Explicit storage of original v1.0 tags
  migrationStatus: 'pending' | 'completed' | 'skipped',
  migratedAt: timestamp,    // When migration was performed
  
  // === UPDATED COMPUTED FIELDS ===
  tagCount: number         // Total: tagsByHuman.length + tagsByAI.length + legacyTags.length
}
```

## Complete v1.1 Evidence Document Schema

```javascript
{
  // === FILE REFERENCES ===
  storageRef: {
    storage: 'uploads',
    fileHash: string
  },
  
  displayCopy: {
    metadataHash: string,
    folderPath: string
  },
  
  // === FILE PROPERTIES ===
  fileSize: number,
  
  // === PROCESSING STATUS ===
  isProcessed: boolean,
  hasAllPages: boolean | null,
  processingStage: 'uploaded' | 'splitting' | 'merging' | 'complete',
  
  // === STRUCTURED TAGGING SYSTEM (v1.1) ===
  tagsByHuman: [
    {
      categoryId: string,
      categoryName: string,
      tagId: string,
      tagName: string,
      color: string
    }
  ],
  
  tagsByAI: [
    {
      categoryId: string,
      categoryName: string,
      tagId: string,
      tagName: string,
      color: string,
      confidence: number
    }
  ],
  
  // === BACKWARD COMPATIBILITY ===
  tags: string[],              // v1.0 tags - preserved for compatibility
  legacyTags: string[],        // Explicit legacy tag storage
  
  // === METADATA ===
  tagCount: number,            // Total count of all tags
  lastTaggedAt: timestamp,
  taggedBy: 'manual' | 'ai' | 'migration',
  migrationStatus: 'pending' | 'completed' | 'skipped',
  migratedAt: timestamp,
  
  // === TIMESTAMPS ===
  updatedAt: timestamp
}
```

## Migration Strategy

### Phase 1: Non-Breaking Schema Extension
1. **Add new fields** without removing existing fields
2. **Preserve `tags` array** for v1.0 compatibility  
3. **Add `legacyTags` array** for explicit legacy storage
4. **Initialize structured arrays** as empty (`tagsByHuman: [], tagsByAI: []`)

### Phase 2: Data Population  
1. **Copy `tags` to `legacyTags`** for all existing documents
2. **User-initiated migration** converts legacy tags to structured format
3. **Preserve original `tags` array** until user confirms migration

### Phase 3: Gradual Transition
1. **New tags** created using structured format
2. **Search** includes both structured and legacy tags
3. **Display** prioritizes structured tags, falls back to legacy

## Validation Rules

### Structured Tag Validation
```javascript
// tagsByHuman and tagsByAI validation
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
  tagId: {
    required: true,
    type: 'string',
    format: 'uuid' // Generated using crypto.randomUUID()
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
  confidence: { // AI tags only
    type: 'number',
    minimum: 0.0,
    maximum: 1.0
  }
}
```

### Document-Level Constraints
- **Maximum 100 structured tags per document** (tagsByHuman + tagsByAI)
- **Maximum 50 tags per category** per document
- **Category must exist** and be active when adding structured tags
- **Tag names within category must be unique** per document

## Firestore Security Rules

### Updated Rules for v1.1
```javascript
// Evidence document access
match /teams/{teamId}/evidence/{evidenceId} {
  allow read, write: if 
    request.auth != null &&
    resource.data.get('teamId', teamId) == teamId &&
    isTeamMember(teamId);
  
  // Validate structured tags on write
  allow update: if
    validateStructuredTags(request.resource.data.get('tagsByHuman', [])) &&
    validateStructuredTags(request.resource.data.get('tagsByAI', [])) &&
    preserveLegacyTags(resource.data, request.resource.data);
}

function validateStructuredTags(tags) {
  return tags.size() <= 100 &&
    tags.hasAll(['categoryId', 'categoryName', 'tagId', 'tagName', 'color']);
}

function preserveLegacyTags(oldData, newData) {
  // Ensure legacyTags are not deleted during updates
  return newData.get('legacyTags', []).hasAll(oldData.get('legacyTags', []));
}
```

## Query Patterns

### Search Across All Tag Types
```javascript
// Client-side filtering for mixed tag search
const searchTerm = 'invoice';

evidence.filter(doc => {
  // Search structured tags
  const structuredTags = [...(doc.tagsByHuman || []), ...(doc.tagsByAI || [])];
  const hasStructuredMatch = structuredTags.some(tag => 
    tag.tagName.toLowerCase().includes(searchTerm) ||
    tag.categoryName.toLowerCase().includes(searchTerm)
  );
  
  // Search legacy tags
  const hasLegacyMatch = (doc.legacyTags || doc.tags || [])
    .some(tag => tag.toLowerCase().includes(searchTerm));
    
  return hasStructuredMatch || hasLegacyMatch;
});
```

### Category-Based Filtering
```javascript
// Filter by specific category and tags
const categoryFilters = {
  'cat-doc-type': ['Invoice', 'Statement'],
  'cat-institution': ['Bank of America']
};

evidence.filter(doc => {
  const structuredTags = [...(doc.tagsByHuman || []), ...(doc.tagsByAI || [])];
  
  return Object.entries(categoryFilters).every(([categoryId, selectedTags]) => {
    return structuredTags.some(tag => 
      tag.categoryId === categoryId && 
      selectedTags.includes(tag.tagName)
    );
  });
});
```

## Performance Considerations

### Indexing Strategy
```javascript
// Composite indexes for efficient queries
[
  ['tagsByHuman.categoryId', 'updatedAt'],
  ['tagsByHuman.tagName', 'updatedAt'],
  ['tagsByAI.categoryId', 'confidence', 'updatedAt']
]
```

### Denormalization Benefits
- **Category names** stored in each tag for fast display
- **Colors** stored in tags to avoid category lookups
- **Tag counts** computed and stored for quick statistics

### Memory Management
- **Lazy loading** of tag details when needed
- **Pagination** for documents with many tags
- **Caching** of frequently accessed category data

## Rollback Plan

### Emergency Rollback to v1.0
1. **Revert components** to use `tags` array only
2. **Disable structured tag features** via feature flags
3. **Preserve all data** - no data loss during rollback
4. **Migration can resume** when issues are resolved

### Rollback Implementation
```javascript
// Feature flag for emergency rollback
const USE_STRUCTURED_TAGS = process.env.VITE_ENABLE_STRUCTURED_TAGS !== 'false';

// Fallback tag display
const getDisplayTags = (evidence) => {
  if (USE_STRUCTURED_TAGS && evidence.tagsByHuman?.length > 0) {
    return evidence.tagsByHuman.map(tag => tag.tagName);
  }
  return evidence.legacyTags || evidence.tags || [];
};
```

## Testing Requirements

### Unit Tests
- [ ] Structured tag validation
- [ ] Migration utilities  
- [ ] Search across mixed tag types
- [ ] Category-based filtering

### Integration Tests
- [ ] Evidence creation with structured tags
- [ ] Legacy tag preservation during updates
- [ ] Migration from v1.0 to v1.1 format
- [ ] Rollback to v1.0 compatibility

### Performance Tests
- [ ] Query performance with 1000+ documents
- [ ] Tag assignment operations <500ms
- [ ] Search response time <300ms with mixed tags
- [ ] Memory usage with large tag datasets