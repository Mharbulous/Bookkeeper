# Categories and Tags System

Last Updated: 2025-09-07

## Overview

This document defines the Categories and Tags system used for organizing and classifying documents within our multi-tenant team-based architecture. Categories provide the primary organizational structure, while tags offer granular classification within each category.

The system supports multiple category types to handle different kinds of data:
- **Date Categories**: Calendar-based date selection with date picker interface
- **Currency Categories**: Monetary amounts with currency type and numerical value
- **Fixed-List Categories**: Traditional dropdown with predefined, immutable tag options
- **Open-List Categories**: Dynamic dropdown that allows AI to create new tags as needed

## Categories Collection

**Database Location**: `/teams/{teamId}/categories/{categoryId}`

**Purpose**: Store categorization system for organizing and tagging evidence documents using soft-delete pattern

```javascript
{
  // Category information
  name: 'Document Type',
  color: '#1976d2',                      // Primary category color for UI display

  // Category type and configuration
  categoryType: 'fixed-list',            // 'date', 'currency', 'fixed-list', or 'open-list'
  typeConfig: {
    // Date type configuration
    dateFormat: 'YYYY-MM-DD',            // Default date format (for date type)
    allowFuture: true,                   // Allow future dates (for date type)
    allowPast: true,                     // Allow past dates (for date type)
    
    // Currency type configuration
    defaultCurrency: 'USD',              // Default currency code (for currency type)
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'BTC'], // Available currencies (for currency type)
    
    // List type configuration
    allowAIExpansion: false,             // true for open-list, false for fixed-list
    maxTags: 100,                        // Maximum number of tags (for list types)
    aiConfidenceThreshold: 0.7           // Minimum confidence for AI to create new tags (open-list only)
  },

  // Soft-delete pattern with backward compatibility
  isActive: true,                        // Controls visibility (false = soft deleted, undefined = treated as true)
  deletedAt: Timestamp,                  // Set when isActive becomes false (optional field)

  // Available tags for this category (only for list types)
  tags: [
    {
      id: 'tag-uuid-1',
      name: 'Invoice',
      color: '#1976d2',                  // Inherits or varies from category color
      aiGenerated: false,                // Whether this tag was created by AI (open-list only)
      usageCount: 5                      // How many times this tag has been used (optional)
    },
    {
      id: 'tag-uuid-2', 
      name: 'Statement',
      color: '#1565c0',                  // Darker shade of category color
      aiGenerated: false,
      usageCount: 3
    }
  ],

  // Metadata
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Category Types

### Date Categories (`categoryType: 'date'`)

Date categories use a calendar date picker interface instead of dropdown lists. The tag value stores the selected date in ISO format.

**Use Cases**: Document dates, due dates, period end dates, transaction dates

**Data Structure**:
```javascript
// Category configuration
{
  name: 'Transaction Date',
  categoryType: 'date',
  typeConfig: {
    dateFormat: 'YYYY-MM-DD',           // Display format
    allowFuture: true,                  // Allow future dates
    allowPast: true,                    // Allow past dates
    defaultToToday: true                // Pre-select today's date
  }
}

// Tag value (stored in evidence document tags subcollection)
{
  categoryId: 'date-category-id',
  categoryName: 'Transaction Date',
  tagName: '2024-03-15',               // ISO date string
  tagValue: '2024-03-15T00:00:00.000Z', // Full timestamp for querying
  displayValue: 'March 15, 2024'       // User-friendly display
}
```

### Currency Categories (`categoryType: 'currency'`)

Currency categories combine a currency selector with a numeric amount input field.

**Use Cases**: Transaction amounts, invoice totals, account balances, fees

**Data Structure**:
```javascript
// Category configuration
{
  name: 'Amount',
  categoryType: 'currency',
  typeConfig: {
    defaultCurrency: 'USD',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'BTC', 'ETH'],
    allowNegative: true,                // Allow negative amounts
    decimalPlaces: 2                    // Number of decimal places
  }
}

// Tag value (stored in evidence document tags subcollection)
{
  categoryId: 'currency-category-id',
  categoryName: 'Amount',
  tagName: '$1,234.56 USD',            // Display format
  tagValue: {
    amount: 1234.56,                   // Numeric amount for calculations
    currency: 'USD',                   // Currency code
    formatted: '$1,234.56'             // Formatted amount without currency
  },
  displayValue: '$1,234.56 USD'        // User-friendly display
}
```

### Fixed-List Categories (`categoryType: 'fixed-list'`)

Traditional dropdown categories with a predefined, immutable list of options. AI cannot add new tags to these categories.

**Use Cases**: Document types, status values, priority levels, boolean choices

**Data Structure**:
```javascript
// Category configuration
{
  name: 'Document Type',
  categoryType: 'fixed-list',
  typeConfig: {
    allowAIExpansion: false,           // Prevents AI from adding new tags
    maxTags: 50                        // Maximum predefined tags
  },
  tags: [
    { id: 'uuid-1', name: 'Invoice', color: '#1976d2' },
    { id: 'uuid-2', name: 'Receipt', color: '#1565c0' },
    { id: 'uuid-3', name: 'Statement', color: '#0d47a1' }
  ]
}

// Tag value (stored in evidence document tags subcollection)
{
  categoryId: 'fixed-list-category-id',
  categoryName: 'Document Type',
  tagName: 'Invoice',                  // Must match existing tag name exactly
  tagValue: 'Invoice',                 // Same as tagName for fixed lists
  displayValue: 'Invoice'              // User-friendly display
}
```

### Open-List Categories (`categoryType: 'open-list'`)

Dynamic dropdown categories where AI can intelligently add new tags when confident matches aren't found in existing options.

**Use Cases**: Institution names, vendor names, project names, location tags

**Data Structure**:
```javascript
// Category configuration
{
  name: 'Institution',
  categoryType: 'open-list',
  typeConfig: {
    allowAIExpansion: true,            // Allows AI to create new tags
    maxTags: 200,                      // Maximum total tags (including AI-generated)
    aiConfidenceThreshold: 0.7,        // Minimum confidence to create new tag
    requireHumanReview: false          // Whether new AI tags need approval
  },
  tags: [
    { id: 'uuid-1', name: 'Bank of America', aiGenerated: false, usageCount: 15 },
    { id: 'uuid-2', name: 'Chase Bank', aiGenerated: true, usageCount: 3 },
    { id: 'uuid-3', name: 'Wells Fargo', aiGenerated: false, usageCount: 8 }
  ]
}

// Tag value (stored in evidence document tags subcollection)
{
  categoryId: 'open-list-category-id',
  categoryName: 'Institution',
  tagName: 'Chase Bank',               // May be existing or newly created
  tagValue: 'Chase Bank',              // Same as tagName for list types
  displayValue: 'Chase Bank',          // User-friendly display
  aiGenerated: true,                   // Whether this specific assignment was AI-created
  confidence: 0.85                     // AI confidence for this assignment
}
```

## Key Design Features

- **Type-Specific Validation**: Each category type has its own validation rules and constraints
- **AI Integration**: Open-list categories enable intelligent tag expansion with confidence scoring
- **Backwards Compatibility**: Existing categories default to `fixed-list` type during migration
- **Soft Delete Pattern**: Uses `isActive: false` instead of hard deletion to preserve data integrity
- **Graceful Degradation**: Queries attempt `isActive` filtering but fall back to unfiltered queries if indexes don't exist
- **Background Migration**: Categories missing the `isActive` field are automatically migrated to `isActive: true`
- **Backward Compatibility**: Treats undefined `isActive` field as `true` (active) for legacy data
- **Query Filtering**: Queries prefer `where('isActive', '==', true)` but handle fallback scenarios
- **Tag Nesting**: Tags are embedded within categories for atomic operations
- **Color Inheritance**: Tags can inherit or vary from category colors for consistent theming

## Common Operations

```javascript
// Get all active categories (robust implementation with fallback)
const categoriesRef = db.collection('teams').doc(teamId).collection('categories');
let categoriesQuery, snapshot;

try {
  // Try querying with isActive filter first
  categoriesQuery = query(
    categoriesRef,
    where('isActive', '==', true),
    orderBy('createdAt', 'asc')
  );
  snapshot = await getDocs(categoriesQuery);
} catch (queryError) {
  console.log('isActive query failed, using fallback query:', queryError.message);
  // Fallback: Query without isActive filter
  categoriesQuery = query(categoriesRef, orderBy('createdAt', 'asc'));
  snapshot = await getDocs(categoriesQuery);
}

// Process results with migration handling
const loadedCategories = [];
const categoriesToMigrate = [];

snapshot.docs.forEach(doc => {
  const data = doc.data();
  
  // Handle missing isActive field
  if (data.isActive === undefined) {
    // Mark for migration and include as active
    categoriesToMigrate.push({ id: doc.id, data });
    loadedCategories.push({ id: doc.id, ...data, isActive: true });
  } else if (data.isActive === true) {
    // Include active categories
    loadedCategories.push({ id: doc.id, ...data });
  }
  // Skip categories where isActive === false
});

// Background migration for categories missing isActive field
if (categoriesToMigrate.length > 0) {
  console.log(`Migrating ${categoriesToMigrate.length} categories to add isActive field`);
  // Migrate in background without blocking main operation
  migrationPromises = categoriesToMigrate.map(async ({ id }) => {
    const categoryRef = doc(db, 'teams', teamId, 'categories', id);
    return updateDoc(categoryRef, {
      isActive: true,
      updatedAt: serverTimestamp()
    });
  });
  Promise.all(migrationPromises).catch(err => console.error('Migration failed:', err));
}

// Soft delete category
await updateDoc(categoryRef, {
  isActive: false,
  deletedAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});
```

## Implementation Notes

The `isActive` field implementation demonstrates the difference between **ideal state documentation** and **production-ready robustness**:

- **Ideal State**: All categories have `isActive: true/false`, all queries use `where('isActive', '==', true)`, required Firestore index exists
- **Real-World Robustness**: Code handles missing fields, missing indexes, and legacy data gracefully
- **Migration Strategy**: Background migrations occur transparently without blocking user operations
- **Fallback Behavior**: If `isActive` queries fail (missing index), falls back to unfiltered queries with client-side filtering
- **Default Assumption**: Missing `isActive` fields are treated as `true` to maintain backward compatibility

This robust approach ensures the application works in all deployment scenarios while gradually migrating toward the ideal state.

## Required Firestore Index for Categories

```javascript
{
  collection: 'teams/{teamId}/categories',
  fields: [
    { field: 'isActive', order: 'ASCENDING' },
    { field: 'createdAt', order: 'ASCENDING' },
  ],
}
```

## Tags Subcollection System

### Tags Subcollection Structure: `/teams/{teamId}/evidence/{evidenceId}/tags/{categoryId}`

**Purpose**: Store individual tag assignments for evidence documents using subcollection architecture for scalability and atomic operations.

```javascript
{
  // === CATEGORY IDENTIFICATION ===
  categoryId: string,              // Same as document ID (enforces one tag per category)
  categoryName: string,            // Display name for category

  // === SELECTED TAG ===
  tagName: string,                 // The chosen tag within this category

  // === TAG DISPLAY (UI-Only) ===
  // Note: Tag colors are automatically assigned by position in the category list
  // using the triadic color pattern: Purple (#733381) → Green (#589C48) → Orange (#F58024)

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

### Evidence Document Tag Counters

Evidence documents maintain counters for efficient tag management:

```javascript
{
  // === TAG SUBCOLLECTION COUNTERS ===
  tagCount: number,                // Total tags across all categories
  autoApprovedCount: number,       // AI tags auto-approved (confidence >= 85%)
  reviewRequiredCount: number,     // AI tags needing human review (confidence < 85%)
}
```

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

### Category Type Validation

```javascript
// Category document validation (enhanced for new types)
{
  name: {
    required: true,
    type: 'string',
    maxLength: 50
  },
  categoryType: {
    required: true,
    type: 'string',
    enum: ['date', 'currency', 'fixed-list', 'open-list']
  },
  typeConfig: {
    required: true,
    type: 'object',
    // Validation varies by category type
    validate: (config, categoryType) => {
      switch (categoryType) {
        case 'date':
          return validateDateConfig(config);
        case 'currency':
          return validateCurrencyConfig(config);
        case 'fixed-list':
        case 'open-list':
          return validateListConfig(config);
      }
    }
  }
}

// Date category type configuration validation
function validateDateConfig(config) {
  return {
    dateFormat: { type: 'string', default: 'YYYY-MM-DD' },
    allowFuture: { type: 'boolean', default: true },
    allowPast: { type: 'boolean', default: true },
    defaultToToday: { type: 'boolean', default: false }
  };
}

// Currency category type configuration validation
function validateCurrencyConfig(config) {
  return {
    defaultCurrency: { 
      type: 'string', 
      pattern: /^[A-Z]{3}$/, // ISO 4217 currency codes
      default: 'USD' 
    },
    supportedCurrencies: { 
      type: 'array', 
      items: { type: 'string', pattern: /^[A-Z]{3}$/ },
      minItems: 1,
      maxItems: 20
    },
    allowNegative: { type: 'boolean', default: true },
    decimalPlaces: { type: 'number', minimum: 0, maximum: 8, default: 2 }
  };
}

// List category type configuration validation
function validateListConfig(config) {
  return {
    allowAIExpansion: { type: 'boolean', required: true },
    maxTags: { type: 'number', minimum: 1, maximum: 500, default: 100 },
    aiConfidenceThreshold: { 
      type: 'number', 
      minimum: 0.0, 
      maximum: 1.0, 
      default: 0.7 
    },
    requireHumanReview: { type: 'boolean', default: false }
  };
}
```

### Tag Value Validation by Category Type

```javascript
// Tag document validation (enhanced for category types)
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
    validate: (value, categoryType) => {
      switch (categoryType) {
        case 'date':
          return /^\d{4}-\d{2}-\d{2}$/.test(value); // ISO date format
        case 'currency':
          return value.length <= 50; // Formatted currency string
        case 'fixed-list':
        case 'open-list':
          return value.length <= 30 && value.length > 0;
      }
    }
  },
  tagValue: {
    required: true,
    validate: (value, categoryType) => {
      switch (categoryType) {
        case 'date':
          return value instanceof Date || typeof value === 'string';
        case 'currency':
          return typeof value === 'object' && 
                 typeof value.amount === 'number' &&
                 typeof value.currency === 'string';
        case 'fixed-list':
        case 'open-list':
          return typeof value === 'string' && value.length <= 30;
      }
    }
  },
  displayValue: {
    required: true,
    type: 'string',
    maxLength: 100
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
- **Type-specific validation**: Tag values must match their category type requirements
- **Confidence threshold**: AI tags >= 85% auto-approved, < 85% require review

### AI Processing by Category Type

#### Date Categories
- AI extracts dates from document content using natural language processing
- Supports various date formats: "March 15, 2024", "03/15/2024", "2024-03-15"
- Validates against category constraints (allowFuture, allowPast)
- High confidence threshold (>90%) due to objective nature of dates

#### Currency Categories  
- AI identifies monetary amounts and currency indicators in document text
- Handles various formats: "$1,234.56", "€1.234,56", "1234.56 USD", "Bitcoin 0.5 BTC"
- Normalizes to consistent numeric format with currency code
- Confidence based on explicit currency indicators and contextual clues

#### Fixed-List Categories
- AI matches document content against predefined tag list only
- Uses fuzzy matching for slight variations ("inv" → "invoice")
- Cannot create new tags - must select from existing options or mark as uncertain
- High confidence when exact or close match found

#### Open-List Categories
- AI attempts to match against existing tags first (same as fixed-list)
- If no good match found (confidence < threshold), creates new tag
- New tag creation requires higher confidence threshold (configurable per category)
- Tracks usage statistics to promote frequently used AI-generated tags

### Migration Strategy

#### Backwards Compatibility
```javascript
// Legacy category (pre-types implementation)
{
  name: 'Document Type',
  color: '#1976d2',
  tags: [...],
  isActive: true
  // No categoryType or typeConfig fields
}

// Automatic migration on first access
{
  name: 'Document Type',
  categoryType: 'fixed-list',           // Default for existing categories
  typeConfig: {
    allowAIExpansion: false,            // Conservative default
    maxTags: 100,
    aiConfidenceThreshold: 0.85
  },
  color: '#1976d2',
  tags: [...],                          // Preserved as-is
  isActive: true,
  migrated: true,                       // Migration flag
  migratedAt: Timestamp
}
```

#### Migration Process
1. **Detect Legacy Categories**: Check for missing `categoryType` field
2. **Apply Default Type**: Set to `fixed-list` with conservative settings
3. **Preserve Existing Tags**: Keep all current tags unchanged
4. **Background Migration**: Update documents without blocking user operations
5. **Gradual Enhancement**: Users can manually upgrade categories to other types

## Firestore Security Rules

### Security Rules for Categories and Tags

```javascript
// Categories collection access
match /teams/{teamId}/categories/{categoryId} {
  allow read, write: if
    request.auth != null &&
    request.auth.token.teamId == teamId;
}

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
  return data.keys().hasAll(['categoryId', 'categoryName', 'tagName', 'source', 'confidence', 'autoApproved', 'reviewRequired', 'AIanalysis']) &&
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
- [ ] Category soft-delete functionality
- [ ] Category migration handling

### Integration Tests

- [ ] Evidence document creation with counters
- [ ] Tag subcollection CRUD operations
- [ ] Auto-approval workflow end-to-end
- [ ] Human review process
- [ ] Tag deletion and counter updates
- [ ] Category-tag relationship integrity
- [ ] Cross-system category and tag queries

### Performance Tests

- [ ] Subcollection query performance with 100+ tags per document
- [ ] Tag counter updates <100ms
- [ ] Auto-approval processing <200ms
- [ ] Review interface loading <300ms
- [ ] Memory usage with large tag subcollections
- [ ] Category loading with large tag collections

## Architecture Integration

### Categories ↔ Tags Relationship

- **Categories define available options**: Each category document contains the available tags array
- **Tags reference categories**: Each tag subcollection document references its categoryId and categoryName
- **Atomic operations**: Categories and tags can be updated independently while maintaining referential integrity
- **Color inheritance**: Tags inherit or vary from category colors using the triadic pattern
- **Validation dependencies**: Tag creation requires active category existence

### Data Flow Patterns

1. **Category Management**: Categories → Available Tags → UI Options
2. **Tag Assignment**: Evidence Document → Tag Subcollection → Category Reference
3. **AI Processing**: Content Analysis → Category Selection → Tag Assignment → Confidence Evaluation → Auto-Approval/Review
4. **User Review**: Review Queue → Tag Modification → Counter Updates → Evidence Document Sync