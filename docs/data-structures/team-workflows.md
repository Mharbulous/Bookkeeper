# Team Workflows and User Management

Last Updated: 2025-08-31

## Overview

This document describes the workflows for user registration, team invitations, and team data migration in our multi-tenant team-based architecture. The system supports both solo users and collaborative teams with seamless transitions between modes.

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

### Solo User Characteristics

**Automatic Setup**:
- Every new user gets a personal team where `teamId === userId`
- User is automatically assigned 'admin' role for their team
- Team name defaults to "{Name}'s Workspace"
- `isPersonal: true` flag distinguishes solo teams

**Solo User Benefits**:
- Eliminates special cases in data storage and security
- Consistent team-based architecture from day one
- Easy upgrade path to collaborative teams
- Perfect deduplication works the same way

## Team Invitation Process

### 1. Admin Sends Invitation

```javascript
async function inviteUserToTeam(teamId, inviteeEmail, role = 'member') {
  const teamRef = db.collection('teams').doc(teamId);
  
  await teamRef.update({
    [`pendingInvites.${inviteeEmail}`]: {
      invitedBy: auth.currentUser.uid,
      invitedAt: new Date(),
      role: role,
      fromTeam: teamId
    }
  });
  
  // Send invitation email (implementation dependent)
  await sendInvitationEmail(inviteeEmail, teamId, role);
}
```

### 2. User Signs Up or Logs In

When a user with a pending invitation authenticates:

```javascript
async function checkAndProcessInvitations(userId, userEmail) {
  const teamsSnapshot = await db
    .collection('teams')
    .where(`pendingInvites.${userEmail}`, '!=', null)
    .get();

  if (!teamsSnapshot.empty) {
    const invitingTeam = teamsSnapshot.docs[0];
    const invite = invitingTeam.data().pendingInvites[userEmail];

    // Get user's current team (their solo team)
    const currentTeam = await db.collection('teams').doc(userId).get();
    const currentTeamData = currentTeam.data();

    if (currentTeamData.isPersonal && Object.keys(currentTeamData.members).length === 1) {
      // Solo user joining another team - migrate data
      await migrateSoloUserToTeam(userId, invitingTeam.id, invite.role);
    } else {
      // Team founder with members - team merger scenario
      await promptForTeamMerger(userId, invitingTeam.id, invite);
    }
  }
}
```

### 3. Team Invitation Acceptance

```javascript
async function migrateSoloUserToTeam(userId, newTeamId, role) {
  // 1. Update custom claims
  await setCustomClaims(userId, {
    teamId: newTeamId,
    role: role,
  });

  // 2. Add user to new team
  await db
    .collection('teams')
    .doc(newTeamId)
    .update({
      [`members.${userId}`]: {
        email: auth.currentUser.email,
        role: role,
        joinedAt: new Date(),
      },
      [`pendingInvites.${auth.currentUser.email}`]: firebase.firestore.FieldValue.delete(),
    });

  // 3. Migrate data from solo team to new team
  await migrateTeamData(userId, newTeamId);

  // 4. Clean up solo team
  await db.collection('teams').doc(userId).delete();
}
```

## Team Data Migration

### Complete Data Migration Process

```javascript
async function migrateTeamData(fromTeamId, toTeamId) {
  // Migrate all subcollections: clients, matters, logs, originalMetadata, etc.
  const collections = ['clients', 'matters', 'logs', 'originalMetadata'];

  for (const collectionName of collections) {
    const docs = await db.collection('teams').doc(fromTeamId).collection(collectionName).get();

    // Copy documents to new team
    const batch = db.batch();
    docs.forEach((doc) => {
      const newDocRef = db.collection('teams').doc(toTeamId).collection(collectionName).doc(doc.id);
      batch.set(newDocRef, {
        ...doc.data(),
        migratedFrom: fromTeamId,
        migratedAt: new Date(),
      });
    });
    await batch.commit();
  }

  // Note: Firebase Storage files don't need to move -
  // we'll update storage paths in future uploads
  // or create a background job for this
}
```

### Migration Tracking

**Migration Metadata**:
Each migrated document includes:
```javascript
{
  // Original document data
  ...originalData,
  
  // Migration tracking
  migratedFrom: 'user-123',  // Original team ID
  migratedAt: Timestamp      // When migration occurred
}
```

### Storage File Migration

**Current Approach**: Files remain in original storage paths
- File references in metadata remain valid
- New uploads use new team paths
- Background job can relocate files later if needed

**Future Enhancement**: Background storage migration
```javascript
async function migrateStorageFiles(fromTeamId, toTeamId) {
  // List all files in old team path
  const listRef = storage.ref(`teams/${fromTeamId}`);
  const files = await listRef.listAll();
  
  // Copy files to new team path
  for (const fileRef of files.items) {
    const newPath = fileRef.fullPath.replace(`teams/${fromTeamId}`, `teams/${toTeamId}`);
    await fileRef.copy(storage.ref(newPath));
  }
  
  // Delete old files after successful copy
  for (const fileRef of files.items) {
    await fileRef.delete();
  }
}
```

## Team Management Workflows

### Adding Team Members

```javascript
async function addTeamMember(teamId, userId, email, role = 'member') {
  // Update team document
  await db.collection('teams').doc(teamId).update({
    [`members.${userId}`]: {
      email: email,
      role: role,
      joinedAt: new Date()
    }
  });
  
  // Update user's custom claims
  await setCustomClaims(userId, {
    teamId: teamId,
    role: role
  });
  
  // Update user's default team
  await db.collection('users').doc(userId).update({
    defaultTeamId: teamId
  });
}
```

### Removing Team Members

```javascript
async function removeTeamMember(teamId, userId) {
  // Remove from team document
  await db.collection('teams').doc(teamId).update({
    [`members.${userId}`]: firebase.firestore.FieldValue.delete()
  });
  
  // Create new solo team for removed user
  const user = await auth.getUser(userId);
  await createNewUser(userId, user.email, user.displayName || 'User');
}
```

### Changing Member Roles

```javascript
async function changeMemberRole(teamId, userId, newRole) {
  // Update team document
  await db.collection('teams').doc(teamId).update({
    [`members.${userId}.role`]: newRole
  });
  
  // Update custom claims
  await setCustomClaims(userId, {
    teamId: teamId,
    role: newRole
  });
}
```

## Team Merger Scenarios

### When Solo User Has Built a Team

If a solo user has invited others and built a team, then receives an invitation:

```javascript
async function promptForTeamMerger(userId, invitingTeamId, invite) {
  // Present options to user:
  // 1. Join inviting team (migrate all data and members)
  // 2. Invite the inviting team to join their team
  // 3. Decline invitation
  
  const choice = await presentMergerOptions(invite);
  
  switch (choice) {
    case 'join_inviting_team':
      await mergeTeamIntoTeam(userId, invitingTeamId);
      break;
    case 'counter_invite':
      await sendCounterInvitation(userId, invitingTeamId);
      break;
    case 'decline':
      await declineInvitation(userId, invite);
      break;
  }
}
```

### Complete Team Merger

```javascript
async function mergeTeamIntoTeam(fromTeamId, toTeamId) {
  const fromTeam = await db.collection('teams').doc(fromTeamId).get();
  const fromTeamData = fromTeam.data();
  
  // Migrate all team members
  const batch = db.batch();
  for (const [userId, member] of Object.entries(fromTeamData.members)) {
    // Add to new team
    const toTeamRef = db.collection('teams').doc(toTeamId);
    batch.update(toTeamRef, {
      [`members.${userId}`]: {
        ...member,
        migratedFrom: fromTeamId,
        migratedAt: new Date()
      }
    });
    
    // Update user's custom claims
    await setCustomClaims(userId, {
      teamId: toTeamId,
      role: member.role
    });
  }
  await batch.commit();
  
  // Migrate all team data
  await migrateTeamData(fromTeamId, toTeamId);
  
  // Clean up old team
  await db.collection('teams').doc(fromTeamId).delete();
}
```

## Invitation Management

### Pending Invitation Queries

```javascript
// Find all pending invitations for a user
async function getPendingInvitations(userEmail) {
  const invitations = [];
  const teamsSnapshot = await db
    .collection('teams')
    .where(`pendingInvites.${userEmail}`, '!=', null)
    .get();
  
  teamsSnapshot.forEach(doc => {
    const team = doc.data();
    const invitation = team.pendingInvites[userEmail];
    invitations.push({
      teamId: doc.id,
      teamName: team.name,
      ...invitation
    });
  });
  
  return invitations;
}
```

### Invitation Cleanup

```javascript
// Remove expired invitations (run periodically)
async function cleanupExpiredInvitations() {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() - 30); // 30 day expiration
  
  const teamsSnapshot = await db.collection('teams').get();
  
  const batch = db.batch();
  teamsSnapshot.forEach(doc => {
    const team = doc.data();
    const updates = {};
    
    for (const [email, invite] of Object.entries(team.pendingInvites || {})) {
      if (invite.invitedAt.toDate() < expirationDate) {
        updates[`pendingInvites.${email}`] = firebase.firestore.FieldValue.delete();
      }
    }
    
    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
    }
  });
  
  await batch.commit();
}
```

## Error Handling and Edge Cases

### Common Edge Cases

**User Already in Team**:
```javascript
async function handleExistingMember(teamId, userEmail) {
  // Check if user is already a member
  const team = await db.collection('teams').doc(teamId).get();
  const members = team.data().members || {};
  
  const existingMember = Object.values(members).find(m => m.email === userEmail);
  if (existingMember) {
    throw new Error('User is already a team member');
  }
}
```

**Team Size Limits**:
```javascript
async function validateTeamSize(teamId) {
  const team = await db.collection('teams').doc(teamId).get();
  const teamData = team.data();
  const currentSize = Object.keys(teamData.members).length;
  const maxSize = teamData.settings.maxMembers || 100;
  
  if (currentSize >= maxSize) {
    throw new Error(`Team has reached maximum size of ${maxSize} members`);
  }
}
```

**Invalid Email Invitations**:
```javascript
async function validateInvitationEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email address');
  }
  
  // Check if email is already a team member
  await handleExistingMember(teamId, email);
}
```

### Transaction Safety

**Atomic Operations**:
```javascript
async function atomicTeamMigration(userId, fromTeamId, toTeamId) {
  const batch = db.batch();
  
  try {
    // All operations in single batch for atomicity
    batch.update(db.collection('teams').doc(toTeamId), {
      [`members.${userId}`]: memberData
    });
    
    batch.delete(db.collection('teams').doc(fromTeamId));
    
    await batch.commit();
    
    // Update custom claims after Firestore changes
    await setCustomClaims(userId, { teamId: toTeamId, role: newRole });
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}
```

## Future Considerations

### Scalability Enhancements

**Large Team Support** (if needed):
- Move members to subcollection when team exceeds 100 members
- Implement member pagination for large teams
- Add member search and filtering capabilities

**Advanced Permissions** (if needed):
- Role-based permissions per app
- Custom permission sets beyond admin/member
- Resource-level access control (per matter, client, etc.)

**Audit and Compliance** (if needed):
- Complete audit trail for team changes
- Member activity tracking
- Data retention policies for departed members