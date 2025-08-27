# Firestore Data Structure Design (KISS Edition)

## Overview

This document defines a **simple, scalable** Firestore data structure for our multi-tenant team-based architecture supporting Multi-App SSO. Following the KISS principle, we've eliminated unnecessary complexity while maintaining all essential functionality.

**Key Design Decisions:**
- Teams typically have 3-10 members (max 100)
- All apps share the same role-based permissions
- No denormalization needed for queries
- No audit trails in MVP
- Flat structure for simplicity

## Core Data Structure

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
  createdAt: Timestamp,
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

### 3. Team Data Collections: `/teams/{teamId}/{collection}/{documentId}`
**Purpose**: All team data lives in flat collections under the team

#### Clients Collection: `/teams/{teamId}/clients/{clientId}`
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
  status: 'active',  // 'active' | 'inactive'
  createdAt: Timestamp,
  createdBy: 'user-john-123'
}
```

#### Matters Collection: `/teams/{teamId}/matters/{matterId}`

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
  dueDate: Timestamp,
  createdAt: Timestamp,
  createdBy: 'user-john-123'
}
```

#### Upload Events: `/teams/{teamId}/matters/{matterId}/uploadEvents/{documentId}`
**Purpose**: Track all upload-related events including individual file uploads and session summaries

This collection contains two types of events:

##### File Upload Events
**Document ID Strategy for Interrupted Uploads**:
- **Interrupted uploads**: Use deterministic ID: `{timestamp}_{fileHash16}` 
- **Completion events**: Overwrite interrupted event using same deterministic ID
- **Skipped files**: Use auto-generated Firestore IDs (no overwriting needed)
- **Power outage detection**: Interrupted events remain if never overwritten

```javascript
{
  uploadedAt: Timestamp,
  uploadedBy: 'user-john-123',
  sessionId: 'session_uuid_abc123',
  
  // Event type identifier
  eventType: 'file_upload',
  
  // File details
  fileName: 'document.pdf',
  fileHash: 'abc123def456789abcdef012345...',  // SHA-256 of file content
  fileSize: 1234567,                          // Bytes
  lastModified: 1703123456789,                // Original file timestamp
  
  // Upload event details
  status: 'uploaded',           // 'uploaded' | 'skipped' | 'failed' | 'interrupted'
  reason: 'upload_complete',    // 'upload_complete' | 'already_exists' | 'queue_duplicate' | 'upload_error' | 'upload_started'
  uploadDurationMs: 2340,       // Only for successful uploads
  error: null,                  // Only for failed uploads (error message)
  
  createdAt: Timestamp
}
```

##### Session Summary Events
**Purpose**: Track upload session aggregate statistics

```javascript
{
  uploadedAt: Timestamp,
  uploadedBy: 'user-john-123',
  sessionId: 'session_uuid_abc123',
  
  // Event type identifier
  eventType: 'session_summary',
  
  // Session aggregate statistics
  filesProcessed: 45,
  successful: 38,
  failed: 2,
  duplicatesSkipped: 5,
  totalSizeMB: 127.8,
  uploadDurationMs: 45230,
  hardwareCalibration: 1.85,  // H-factor for performance tracking
  
  createdAt: Timestamp
}
```

**Upload Event Flow**:
1. **Start upload** → Create `interrupted` event with deterministic ID
2. **Upload succeeds** → Overwrite with `uploaded` event using same ID  
3. **Upload fails** → Overwrite with `failed` event using same ID
4. **Power outage/crash** → `interrupted` event remains as evidence
5. **Skip existing file** → Create `skipped` event (`already_exists`) with auto-generated ID
6. **Skip queue duplicate** → Create `skipped` event (`queue_duplicate`) with auto-generated ID

#### File Metadata Records: `/teams/{teamId}/matters/{matterId}/metadata/{metadataHash}`
**Purpose**: Store unique combinations of file metadata using metadata hash as document ID

**Hash Generation**: 
- **File Hash**: SHA-256 of file content (`abc123def456789abcdef012345...`)
- **Metadata Hash**: SHA-256 of concatenated string: `originalName|lastModified|fileHash`

```javascript
{
  // Core metadata (only what varies between identical files)
  originalName: 'document.pdf',
  lastModified: 1703123456789,  // File's original timestamp
  fileHash: 'abc123def456789abcdef012345...',  // Standard SHA-256 reference to actual file content
  
  // Upload context
  uploadedAt: Timestamp,
  uploadedBy: 'user-john-123',
  sessionId: 'session_uuid_abc123',
  
  // Computed fields for convenience
  metadataHash: 'xyz789abc123',  // SHA-256 of concatenated metadata string
  storagePath: '/teams/team-abc-123/matters/matter-001/files/abc123def456789abcdef012345.pdf',
  
  createdAt: Timestamp
}
```

## Firebase Storage Structure

### File Storage Paths
**Purpose**: Store actual file content with automatic deduplication based on file hash

```
/teams/{teamId}/matters/{matterId}/files/{fileHash}.{extension}
```

**Key Features**:
- **Content Deduplication**: Identical files (same hash) stored only once
- **Multi-Reference**: Single storage file can be referenced by multiple metadata records
- **Matter-Scoped**: Files organized under specific matters for proper access control
- **Extension Preservation**: Original file extensions maintained for proper file handling

**Examples**:
```
/teams/team-abc-123/matters/general/files/abc123def456789abcdef012345.pdf
/teams/team-abc-123/matters/matter-001/files/xyz789ghi012345fedcba678901.docx
/teams/solo-user-789/matters/general/files/def456abc123789012345abcdef.jpg
```

**Storage Efficiency**:
- Same file uploaded to multiple matters = single storage file + multiple metadata records
- Same file with different original names = single storage file + multiple metadata records
- Perfect deduplication while preserving all metadata variations

## Custom Claims (Firebase Auth)

Keep it **dead simple**. Solo users have `teamId === userId`:

```javascript
{
  teamId: 'team-abc-123',  // For solo users: equals their userId
  role: 'admin'            // Solo users are always 'admin', team members can be 'admin' | 'member'
}
```

## Security Rules

### Simple, Consistent Pattern

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && 
                            request.auth.uid == userId;
    }
    
    // Team members can read team, admins can write
    match /teams/{teamId} {
      allow read: if request.auth != null && 
                     request.auth.token.teamId == teamId;
      allow write: if request.auth != null && 
                      request.auth.token.teamId == teamId &&
                      request.auth.token.role == 'admin';
    }
    
    // All team data follows same pattern
    match /teams/{teamId}/{collection}/{document} {
      allow read: if request.auth != null && 
                     request.auth.token.teamId == teamId;
      allow write: if request.auth != null && 
                      request.auth.token.teamId == teamId;
    }
  }
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

## Solo User to Team Workflow

### New User Registration
```javascript
async function createNewUser(userId, email, displayName) {
  // 1. Set custom claims (solo user is their own team)
  await setCustomClaims(userId, {
    teamId: userId,  // teamId === userId for solo users
    role: 'admin'    // Solo users are admin of their own team
  })
  
  // 2. Create user document
  await db.collection('users').doc(userId).set({
    defaultTeamId: userId,
    preferences: { theme: 'light', notifications: true },
    createdAt: new Date(),
    lastLogin: new Date()
  })
  
  // 3. Create solo team
  await db.collection('teams').doc(userId).set({
    name: `${displayName}'s Workspace`,
    description: 'Personal workspace',
    members: {
      [userId]: {
        email: email,
        role: 'admin',
        joinedAt: new Date()
      }
    },
    pendingInvites: {},
    apps: ['intranet', 'bookkeeper'],
    settings: { timezone: 'UTC', maxMembers: 100 },
    isPersonal: true,  // Flag for solo teams
    createdAt: new Date(),
    createdBy: userId
  })
}
```

## Handling Team Invitations and Mergers

### Invitation Process
1. **Admin adds email to `pendingInvites`** in team document
2. **User signs up** with that email (creates solo team)
3. **On login**, check all teams for pending invites
4. **User accepts** → migrate solo team data or merge teams

### Team Migration Logic

```javascript
// Check for pending invitations on login
async function checkAndProcessInvitations(userId, userEmail) {
  const teamsSnapshot = await db.collection('teams')
    .where(`pendingInvites.${userEmail}`, '!=', null)
    .get()

  if (!teamsSnapshot.empty) {
    const invitingTeam = teamsSnapshot.docs[0]
    const invite = invitingTeam.data().pendingInvites[userEmail]
    
    // Get user's current team (their solo team)
    const currentTeam = await db.collection('teams').doc(userId).get()
    const currentTeamData = currentTeam.data()
    
    if (currentTeamData.isPersonal && Object.keys(currentTeamData.members).length === 1) {
      // Solo user joining another team - migrate data
      await migrateSoloUserToTeam(userId, invitingTeam.id, invite.role)
    } else {
      // Team founder with members - team merger scenario
      await promptForTeamMerger(userId, invitingTeam.id, invite)
    }
  }
}

async function migrateSoloUserToTeam(userId, newTeamId, role) {
  // 1. Update custom claims
  await setCustomClaims(userId, {
    teamId: newTeamId,
    role: role
  })
  
  // 2. Add user to new team
  await db.collection('teams').doc(newTeamId).update({
    [`members.${userId}`]: {
      email: auth.currentUser.email,
      role: role,
      joinedAt: new Date()
    },
    [`pendingInvites.${auth.currentUser.email}`]: firebase.firestore.FieldValue.delete()
  })
  
  // 3. Migrate data from solo team to new team
  await migrateTeamData(userId, newTeamId)
  
  // 4. Clean up solo team
  await db.collection('teams').doc(userId).delete()
}

async function migrateTeamData(fromTeamId, toTeamId) {
  // Migrate all subcollections: clients, matters, logs, metadata, etc.
  const collections = ['clients', 'matters', 'logs', 'metadata']
  
  for (const collectionName of collections) {
    const docs = await db
      .collection('teams').doc(fromTeamId)
      .collection(collectionName)
      .get()
    
    // Copy documents to new team
    const batch = db.batch()
    docs.forEach(doc => {
      const newDocRef = db
        .collection('teams').doc(toTeamId)
        .collection(collectionName).doc(doc.id)
      batch.set(newDocRef, {
        ...doc.data(),
        migratedFrom: fromTeamId,
        migratedAt: new Date()
      })
    })
    await batch.commit()
  }
  
  // Note: Firebase Storage files don't need to move - 
  // we'll update storage paths in future uploads
  // or create a background job for this
}
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
      { field: 'status', order: 'ASCENDING' }
    ]
  },
  {
    collection: 'teams/{teamId}/invoices',
    fields: [
      { field: 'clientId', order: 'ASCENDING' },
      { field: 'createdAt', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'teams/{teamId}/time-entries',
    fields: [
      { field: 'invoiceId', order: 'ASCENDING' },
      { field: 'billable', order: 'ASCENDING' }
    ]
  }
]
```

## Future Considerations (Only If Needed)

**Don't add these until you actually need them:**

1. **If teams grow beyond 100 members**: Move members to subcollection
2. **If you need audit trails**: Add `history` array to documents
3. **If you need per-app permissions**: Extend custom claims
4. **If queries get complex**: Add specific denormalization

Remember: **You can always add complexity later**. Keep it simple and add complexity only if the need arises based on real usage patterns.