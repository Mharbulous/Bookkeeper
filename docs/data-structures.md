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
  defaultTeamId: 'team-abc-123',  // Primary team for quick access
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

```javascript
{
  // Team information
  name: 'ACME Law Firm',
  description: 'Full-service law firm',
  
  // Embedded members (perfect for 3-10 users)
  members: {
    'user-john-123': {
      email: 'john@acme.com',
      role: 'admin',  // 'admin' | 'member'
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
      role: 'member'
    }
  },
  
  // Which apps this team has access to
  apps: ['intranet', 'bookkeeper'],  // Simple array
  
  // Basic settings
  settings: {
    timezone: 'America/New_York',
    maxMembers: 100
  },
  
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
```javascript
{
  title: 'ABC Corp - Contract Review',
  description: 'Software licensing agreement review',
  clientId: 'client-abc-123',  // Reference to client
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

## Custom Claims (Firebase Auth)

Keep it **dead simple**:

```javascript
{
  teamId: 'team-abc-123',
  role: 'admin'  // or 'member'
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

## Handling Team Invitations (Simple Way)

1. **Admin adds email to `pendingInvites`** in team document
2. **User signs up** with that email
3. **On first login**, check all teams for pending invites:

```javascript
// Check for pending invitations
const teamsSnapshot = await db.collection('teams')
  .where(`pendingInvites.${userEmail}`, '!=', null)
  .get()

if (!teamsSnapshot.empty) {
  const team = teamsSnapshot.docs[0]
  const invite = team.data().pendingInvites[userEmail]
  
  // Add user to team
  await team.ref.update({
    [`members.${userId}`]: {
      email: userEmail,
      role: invite.role,
      joinedAt: new Date()
    },
    [`pendingInvites.${userEmail}`]: firebase.firestore.FieldValue.delete()
  })
  
  // Set custom claims
  await setCustomClaims(userId, {
    teamId: team.id,
    role: invite.role
  })
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