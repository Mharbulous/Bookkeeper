# Firestore Collections Schema

Last Updated: 2025-09-07

## Overview

This document defines specialized Firestore collection schemas for categories, file metadata, and database indexes within our multi-tenant team-based architecture. For core user/team/matter architecture documentation, see **[SoloTeamMatters.md](./SoloTeamMatters.md)**.

**Key Design Decisions:**

- Specialized collections support the core Solo Team Architecture
- Categories use soft-delete patterns for data integrity
- File metadata leverages comprehensive deduplication
- Minimal database indexes for optimal performance
- Flat structure for simplicity

## Specialized Collections

### File Upload Event Tracking

Upload events and file metadata management are comprehensively documented in **[FileMetadata.md](./FileMetadata.md)**.

### File Metadata Management

File metadata collections, including detailed schemas, deduplication architecture, and upload tracking, are comprehensively documented in **[FileMetadata.md](./FileMetadata.md)**.


### Categories Collection: `/teams/{teamId}/categories/{categoryId}`

**Purpose**: Store categorization system for organizing and tagging evidence documents using soft-delete pattern

```javascript
{
  // Category information
  name: 'Document Type',
  color: '#1976d2',                      // Primary category color for UI display

  // Soft-delete pattern with backward compatibility
  isActive: true,                        // Controls visibility (false = soft deleted, undefined = treated as true)
  deletedAt: Timestamp,                  // Set when isActive becomes false (optional field)

  // Available tags for this category
  tags: [
    {
      id: 'tag-uuid-1',
      name: 'Invoice',
      color: '#1976d2'                   // Inherits or varies from category color
    },
    {
      id: 'tag-uuid-2', 
      name: 'Statement',
      color: '#1565c0'                   // Darker shade of category color
    }
  ],

  // Metadata
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Key Design Features:**

- **Soft Delete Pattern**: Uses `isActive: false` instead of hard deletion to preserve data integrity
- **Graceful Degradation**: Queries attempt `isActive` filtering but fall back to unfiltered queries if indexes don't exist
- **Background Migration**: Categories missing the `isActive` field are automatically migrated to `isActive: true`
- **Backward Compatibility**: Treats undefined `isActive` field as `true` (active) for legacy data
- **Query Filtering**: Queries prefer `where('isActive', '==', true)` but handle fallback scenarios
- **Tag Nesting**: Tags are embedded within categories for atomic operations
- **Color Inheritance**: Tags can inherit or vary from category colors for consistent theming

**Common Operations:**

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

**Implementation Notes:**

The `isActive` field implementation demonstrates the difference between **ideal state documentation** and **production-ready robustness**:

- **Ideal State**: All categories have `isActive: true/false`, all queries use `where('isActive', '==', true)`, required Firestore index exists
- **Real-World Robustness**: Code handles missing fields, missing indexes, and legacy data gracefully
- **Migration Strategy**: Background migrations occur transparently without blocking user operations
- **Fallback Behavior**: If `isActive` queries fail (missing index), falls back to unfiltered queries with client-side filtering
- **Default Assumption**: Missing `isActive` fields are treated as `true` to maintain backward compatibility

This robust approach ensures the application works in all deployment scenarios while gradually migrating toward the ideal state.



## Required Firestore Indexes

Keep indexes minimal:

```javascript
// Just the basics needed for common queries
[
  {
    collection: 'teams/{teamId}/matters',
    fields: [
      { field: 'clientId', order: 'ASCENDING' },
      { field: 'status', order: 'ASCENDING' },
    ],
  },
  {
    collection: 'teams/{teamId}/categories',
    fields: [
      { field: 'isActive', order: 'ASCENDING' },
      { field: 'createdAt', order: 'ASCENDING' },
    ],
  },
  {
    collection: 'teams/{teamId}/invoices',
    fields: [
      { field: 'clientId', order: 'ASCENDING' },
      { field: 'lastLogin', order: 'DESCENDING' },
    ],
  },
  {
    collection: 'teams/{teamId}/time-entries',
    fields: [
      { field: 'invoiceId', order: 'ASCENDING' },
      { field: 'billable', order: 'ASCENDING' },
    ],
  },
];
```