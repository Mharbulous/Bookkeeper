# Security Rules and Access Control

Last Updated: 2025-08-31

## Overview

This document defines the security rules for Firestore and Firebase Storage, ensuring proper access control for our multi-tenant team-based architecture. The security model follows the principle of least privilege with clear team-based isolation.

## Firestore Security Rules

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

## Firebase Storage Security Rules

### Team-Based File Access

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Team members can access their team's files
    match /teams/{teamId}/{allPaths=**} {
      allow read, write: if request.auth != null &&
                            request.auth.token.teamId == teamId;
    }
  }
}
```

## Custom Claims Structure

### Authentication Claims

Keep it **dead simple**. Solo users have `teamId === userId`:

```javascript
{
  teamId: 'team-abc-123',  // For solo users: equals their userId
  role: 'admin'            // Solo users are always 'admin', team members can be 'admin' | 'member'
}
```

### Role-Based Access Control

**Admin Role Permissions**:
- Full read/write access to team data
- Can modify team settings and member roles
- Can invite new team members
- Can delete team data

**Member Role Permissions**:
- Full read/write access to team data (clients, matters, files)
- Cannot modify team settings
- Cannot manage team members
- Cannot delete the team

**Solo User Special Case**:
- Always assigned 'admin' role for their personal team
- Full control over their workspace
- Can invite others (converting to multi-user team)

## Access Control Matrix

### Collection-Level Permissions

| Collection | Solo User (Admin) | Team Admin | Team Member |
|------------|-------------------|------------|-------------|
| `/users/{userId}` | Own document only | Own document only | Own document only |
| `/teams/{teamId}` | Full access | Read all, Write settings | Read only |
| `/teams/{teamId}/clients` | Full access | Full access | Full access |
| `/teams/{teamId}/matters` | Full access | Full access | Full access |
| File metadata collections (see [FileMetadata.md](./FileMetadata.md)) | Full access | Full access | Full access |

### Data Isolation Guarantees

**Team Isolation**:
- Users can only access data from their assigned team
- `teamId` in custom claims enforces this at the security rule level
- Solo users have `teamId === userId` for complete isolation

**User Privacy**:
- User documents (`/users/{userId}`) only accessible by the user themselves
- No cross-user data access regardless of team membership

**Multi-App Consistency**:
- Same security rules apply across all apps (Intranet, Bookkeeper, etc.)
- Consistent team-based access control model

## Security Implementation Details

### Custom Claims Validation

```javascript
// Custom claims are set server-side only
async function setCustomClaims(userId, claims) {
  await admin.auth().setCustomUserClaims(userId, {
    teamId: claims.teamId,
    role: claims.role
  });
}

// Client-side claim access
const token = await auth.currentUser.getIdTokenResult();
const teamId = token.claims.teamId;
const role = token.claims.role;
```

### Security Rule Testing

**Valid Access Examples**:

```javascript
// User accessing their own document ✓
match /users/user-123 with auth.uid === 'user-123'

// Team member accessing team data ✓
match /teams/team-abc/clients/client-1 with token.teamId === 'team-abc'

// Admin modifying team settings ✓
match /teams/team-abc with token.teamId === 'team-abc' && token.role === 'admin'
```

**Blocked Access Examples**:

```javascript
// User accessing another user's document ✗
match /users/user-456 with auth.uid === 'user-123'

// User accessing different team's data ✗
match /teams/team-xyz/clients with token.teamId === 'team-abc'

// Member trying to modify team settings ✗
match /teams/team-abc with token.teamId === 'team-abc' && token.role === 'member'
```

## Security Best Practices

### Token Management

**Automatic Token Refresh**:
- Firebase SDK handles token refresh automatically
- Custom claims included in refreshed tokens
- No manual token management required

**Claim Validation**:
- Always validate claims exist before using them
- Handle cases where claims might be null during initialization
- Use defensive programming for claim access

### Solo User to Team Transition

**Security During Migration**:

1. **Before Migration**: User has `teamId === userId`
2. **During Migration**: Claims updated atomically
3. **After Migration**: User has `teamId === newTeamId`
4. **Data Access**: Security rules automatically enforce new access

```javascript
// Secure migration process
async function migrateSoloUserToTeam(userId, newTeamId, role) {
  // 1. Update custom claims first
  await setCustomClaims(userId, {
    teamId: newTeamId,
    role: role
  });
  
  // 2. User now has access to new team data
  // 3. Migrate data using admin SDK (bypasses security rules)
  // 4. Clean up old solo team
}
```

### Error Handling

**Common Security Errors**:

```javascript
// Permission denied - user not authenticated
{
  code: "permission-denied",
  message: "Missing or insufficient permissions"
}

// Invalid team access
{
  code: "permission-denied", 
  message: "User cannot access this team's data"
}

// Admin-only operation attempted by member
{
  code: "permission-denied",
  message: "Admin role required for this operation" 
}
```

**Client-Side Handling**:

```javascript
try {
  const doc = await db.collection('teams').doc(teamId).get();
} catch (error) {
  if (error.code === 'permission-denied') {
    // Handle unauthorized access
    console.log('User does not have access to this team');
  }
}
```

## Development and Testing

### Security Rule Testing

```javascript
// Test authenticated user access
const testEnv = initializeTestEnvironment({
  projectId: 'demo-project',
  rules: rulesContent
});

const authedDb = testEnv.authenticatedContext('user-123', {
  teamId: 'team-abc',
  role: 'admin'
}).firestore();

// Should succeed
await assertSucceeds(authedDb.doc('teams/team-abc').get());

// Should fail
await assertFails(authedDb.doc('teams/team-xyz').get());
```

### Emulator Configuration

**Firebase Emulator Setup**:
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "auth": {
    "port": 9099
  }
}
```

## Security Monitoring

### Access Logging

**Important Access Events**:
- Failed authentication attempts
- Permission denied errors
- Team membership changes
- Admin privilege escalation

**Monitoring Setup**:
```javascript
// Log security events
db.collection('security-log').add({
  event: 'permission-denied',
  userId: auth.currentUser.uid,
  resource: '/teams/team-xyz/clients',
  timestamp: new Date(),
  userAgent: navigator.userAgent
});
```

### Audit Trail

**Key Security Events to Track**:
- Team invitation acceptance
- Role changes (member ↔ admin)
- Solo user to team migrations
- Team data access attempts
- Custom claims modifications

**Implementation Note**: Audit logging is not implemented in MVP but should be added for production systems handling sensitive data.