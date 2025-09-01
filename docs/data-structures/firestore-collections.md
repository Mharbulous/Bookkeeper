# Firestore Collections Schema

Last Updated: 2025-08-31

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