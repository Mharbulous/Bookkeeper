# Solo Team Architecture

Last Updated: 2025-09-07

## Overview

The Solo Team Architecture is a design pattern that treats solo users as single-member teams rather than having separate code paths for individual vs team users. This eliminates special cases in storage, security, and duplicate detection while providing a clear upgrade path to multi-user teams.

**Key Design Principle**: New users automatically get a team where `teamId === userId`, making them a "team of one".

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

## Architecture Benefits

### Design Advantages

- **Eliminates Special Cases**: No separate code paths for solo vs team users
- **Simplified Security**: All data access uses team-scoped security rules
- **Easy Upgrades**: Solo users can invite others without data migration
- **Consistent Patterns**: All queries follow the same team-based structure
- **Duplicate Detection**: Unified deduplication across all user types

### Key Design Decisions

- Teams typically have 3-10 members (max 100)
- All apps share the same role-based permissions
- No denormalization needed for queries
- No audit trails in MVP
- Flat structure for simplicity
- Solo users are always admins of their personal team

## Implementation Notes

### Solo User Creation Flow

1. New user signs up via Firebase Auth
2. System automatically creates a team document with `teamId === userId`
3. Team is marked as personal (`isPersonal: true`)
4. User is added as the sole admin member
5. Custom claims are set with `teamId` and `role: 'admin'`

### Team Expansion

When a solo user invites others:
1. Add invitation to `pendingInvites` in team document
2. When accepted, add new member to embedded `members` object
3. Update `isPersonal: false` if desired
4. No data migration required - all existing data remains accessible

This architecture provides a seamless path from individual use to team collaboration while maintaining consistency throughout the application.