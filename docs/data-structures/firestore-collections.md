# Firestore Collections Schema

Last Updated: 2025-09-07

## Overview

This document defines the Firestore collection schemas for our multi-tenant team-based architecture supporting Multi-App SSO. Following the KISS principle, we've eliminated unnecessary complexity while maintaining all essential functionality.

**Key Design Decisions:**

- Teams typically have 3-10 members (max 100)
- All apps share the same role-based permissions
- No denormalization needed for queries
- No audit trails in MVP
- Flat structure for simplicity

## Core Collections

### 1. Users Collection: `/users/{userId}`

**Purpose**: Store user preferences and app-specific settings

```javascript
{
  // User preferences only (identity comes from Firebase Auth)
  defaultTeamId: 'team-abc-123',  // Primary team for quick access (could be userId for solo users)
  preferences: {
    theme: 'light',
    notifications: true,
    language: 'en'
  },

  // Activity tracking
  lastLogin: Timestamp
}
```

### 2. Teams Collection: `/teams/{teamId}`

**Purpose**: Store team info and embedded member list

**Solo User Design**: New users automatically get a team where `teamId === userId`, making them a "team of one". This eliminates special cases in storage, security, and duplicate detection.

```javascript
{
  // Team information
  name: 'ACME Law Firm',  // For solo users: "John's Workspace"
  description: 'Full-service law firm',  // For solo users: "Personal workspace"

  // Embedded members (perfect for 3-10 users, or 1 for solo users)
  members: {
    'user-john-123': {
      email: 'john@acme.com',
      role: 'admin',  // 'admin' | 'member' (solo users are always admin)
      joinedAt: Timestamp
    },
    'user-jane-456': {
      email: 'jane@acme.com',
      role: 'member',
      joinedAt: Timestamp
    }
  },

  // Simple pending invitations
  pendingInvites: {
    'newuser@acme.com': {
      invitedBy: 'user-john-123',
      invitedAt: Timestamp,
      role: 'member',
      fromTeam: 'team-abc-123'  // Track which team invited them
    }
  },

  // Which apps this team has access to
  apps: ['intranet', 'bookkeeper'],  // Simple array

  // Basic settings
  settings: {
    timezone: 'America/New_York',
    maxMembers: 100
  },

  // Team type flags
  isPersonal: false,  // true for solo users (teamId === userId)

  // Metadata
  createdAt: Timestamp,
  createdBy: 'user-john-123'
}
```

## Team Data Collections: `/teams/{teamId}/{collection}/{documentId}`

**Purpose**: All team data lives in flat collections under the team

### Clients Collection: `/teams/{teamId}/clients/{clientId}`

```javascript
{
  name: 'ABC Corporation',
  email: 'contact@abc.com',
  phone: '+1-555-0123',
  address: {
    street: '123 Business Ave',
    city: 'New York',
    state: 'NY',
    zip: '10001'
  },
  status: 'active'  // 'active' | 'inactive'
}
```

### Matters Collection: `/teams/{teamId}/matters/{matterId}`

**Reserved Matter ID**: Every team has a reserved `matterId` called **"general"** where the firm stores general information about the firm, company policies, and non-client-specific documents.

```javascript
{
  title: 'ABC Corp - Contract Review',
  description: 'Software licensing agreement review',
  clientId: 'client-abc-123',  // Reference to client (null for 'general' matter)
  matterNumber: '2024-001',
  status: 'active',  // 'active' | 'closed' | 'on-hold'
  priority: 'high',  // 'high' | 'medium' | 'low'
  assignedTo: ['user-john-123', 'user-jane-456'],
  openedDate: Timestamp,
  dueDate: Timestamp
}
```

### Upload Events: `/teams/{teamId}/matters/{matterId}/uploadEvents/{documentId}`

**Purpose**: Track essential upload events with minimal information

This collection logs only the 4 essential upload events with basic information:

- **upload_interrupted**: Upload started but not completed
- **upload_success**: Upload completed successfully
- **upload_failed**: Upload failed
- **upload_skipped_metadata_recorded**: File skipped but metadata recorded

```javascript
{
  eventType: 'upload_success',                    // Event type
  timestamp: Timestamp,                           // When event occurred
  fileName: 'document.pdf',                       // Original file name
  fileHash: 'abc123def456789abcdef012345...',     // SHA-256 of file content
  metadataHash: 'xyz789abc123def456...',          // SHA-256 of metadata
  teamId: 'team-abc-123',                         // Team identifier
  userId: 'user-john-123'                         // User identifier
}
```

**Event Types**:

- `upload_interrupted`: Upload started (may remain if process interrupted)
- `upload_success`: Upload completed successfully
- `upload_failed`: Upload failed for any reason
- `upload_skipped_metadata_recorded`: File skipped but metadata was recorded

### File Metadata Records: `/teams/{teamId}/matters/{matterId}/originalMetadata/{metadataHash}`

**Purpose**: Store unique combinations of file metadata using metadata hash as document ID

**Hash Generation**:

- **File Hash**: SHA-256 of file content (`abc123def456789abcdef012345...`)
- **Metadata Hash**: SHA-256 of concatenated string: `originalName|lastModified|fileHash`

```javascript
{
  // Core file metadata (only true file properties)
  originalName: 'document.pdf',
  lastModified: 1703123456789,  // Original files lastModified metadata info
  fileHash: 'abc123def456789abcdef012345...',  // SHA-256 reference to actual file content
  metadataHash: 'xyz789abc123'  // SHA-256 of concatenated metadata string (originalName|lastModified|fileHash)

  // File path information (from folder uploads)
  folderPaths: 'Documents/2023|Archive/Backup',  // Pipe-delimited paths, supports multiple contexts via pattern recognition


}
```

## Folder Path System

The `folderPaths` field stores folder path information for files uploaded through folder selection, supporting multiple organizational contexts for the same file content.

**For complete documentation of the smart metadata capturing algorithm and pattern recognition logic, see:** **[docs/uploading.md - Smart Metadata Capturing](../uploading.md#smart-metadata-capturing-algorithm)**

### Field Schema

**Field Name**: `folderPaths`  
**Type**: `string`  
**Format**: Pipe-delimited paths using `"|"` separator  
**Purpose**: Store multiple folder contexts for files uploaded via `webkitdirectory`

### Data Format Examples

**Single Path**:

```javascript
folderPaths: 'Documents/2023';
```

**Multiple Paths**:

```javascript
folderPaths: 'Documents/2023|Archive/Backup|Legal/Contracts';
```

**Root Level Files**:

```javascript
folderPaths: ''; // Empty string for files uploaded without folder context
```

### Path Extraction Rules

Folder paths are automatically extracted from the HTML5 `webkitRelativePath` property:

- `"Documents/2023/invoices/invoice.pdf"` → `folderPaths: "Documents/2023/invoices"`
- `"photos/vacation.jpg"` → `folderPaths: "photos"`
- `"readme.txt"` → `folderPaths: ""` (root level)

### Field Properties

- **Delimiter**: `"|"` character (invalid in most file systems, safe for separation)
- **Path Format**: Forward slashes (`/`) regardless of operating system
- **Normalization**: Leading slashes present, no trailing slashes (except root `"/"`)
- **Empty Values**: Empty string `""` represents root-level files
- **Multiple Contexts**: Same file content can have multiple folder contexts stored

### Folder Path Querying

The `folderPaths` field supports various query patterns for finding files by their organizational context:

**Query Examples**:

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

### Evidence Collection: `/teams/{teamId}/evidence/{evidenceId}`

**Purpose**: Store organizational and processing metadata for uploaded files, providing user-facing document management capabilities

**For complete Evidence collection schema and Tag subcollections, see:** **[evidence-v1.1-schema.md](./evidence-v1.1-schema.md)**

**Key Design Principles:**

- **Single Source of Truth**: No redundant data - all display information references original metadata records
- **Deduplication Aware**: Handles multiple original names and folder paths for identical files
- **AI/Human Separation**: Distinguishes between AI-generated and human-applied tags
- **Subcollection Architecture**: Category-based tags with confidence-based auto-approval

**Core Structure Summary:**

```javascript
{
  // File reference and display configuration
  storageRef: { storage: 'uploads', fileHash: '...', fileTypes: '.pdf' },
  displayCopy: 'metadataHash...',           // Points to chosen originalMetadata record
  fileSize: 2048576,

  // Processing status  
  isProcessed: false,
  processingStage: 'uploaded',

  // Tag subcollection counters (for efficient querying)
  tagCount: 8,
  autoApprovedCount: 5,
  reviewRequiredCount: 2,

  updatedAt: Timestamp
}
```

**Tag Subcollections:** `/teams/{teamId}/evidence/{evidenceId}/tags/{categoryId}`

Uses `categoryId` as document ID to ensure mutually exclusive categories with confidence-based auto-approval workflow for AI tags.

## Custom Claims (Firebase Auth)

Keep it **dead simple**. Solo users have `teamId === userId`:

```javascript
{
  teamId: 'team-abc-123',  // For solo users: equals their userId
  role: 'admin'            // Solo users are always 'admin', team members can be 'admin' | 'member'
}
```

## Common Query Patterns

### Simple, Efficient Queries

```javascript
// Get user's team
const team = await db.collection('teams').doc(auth.currentUser.teamId).get()

// Get team members (already embedded)
const members = team.data().members

// Get all active clients
const clients = await db
  .collection('teams').doc(teamId)
  .collection('clients')
  .where('status', '==', 'active')
  .orderBy('name')
  .get()

// Get matters for a client
const matters = await db
  .collection('teams').doc(teamId)
  .collection('matters')
  .where('clientId', '==', clientId)
  .where('status', '==', 'active')
  .get()
```

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