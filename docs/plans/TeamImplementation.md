# Team Invitation System Implementation Plan

## Overview

This document outlines the implementation plan for the "solo user as team of one" design, which eliminates special cases by treating users without teams as teams with `teamId === userId`. This design enables seamless team invitations, mergers, and eliminates the "No team ID available" error.

## Core Design Principles

1. **Solo users are teams of one**: `teamId === userId` 
2. **Consistent storage pattern**: `/teams/{teamId}/matters/{matterId}/{sha256}.{ext}`
3. **No special cases**: All logic works the same for solo and multi-user teams
4. **Clean team growth**: Solo → duo → team via simple invitation system
5. **Team merging**: Founding members can merge entire teams

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal**: Make solo users work with existing system

#### 1.1 Update User Registration
- [ ] Modify auth service to set `teamId = userId` for new users
- [ ] Create solo team document on registration  
- [ ] Set `isPersonal: true` flag for solo teams
- [ ] Update custom claims to use userId as teamId

**Files to modify:**
- `src/services/authService.js`
- `src/stores/auth.js`
- `src/services/teamService.js`

#### 1.2 Fix Console Warning
- [ ] Update duplicate detection to use solo user's teamId
- [ ] Test file uploads with solo users
- [ ] Verify storage paths work correctly

**Files to modify:**
- `src/components/features/upload/FileUploadQueue.vue`
- Upload-related services

#### 1.3 Update Team Store
- [ ] Handle solo teams in team store
- [ ] Display "Personal Workspace" for solo teams
- [ ] Update team name formatting

**Files to modify:**
- `src/stores/team.js`

### Phase 2: Invitation System (Week 2)
**Goal**: Enable solo users to invite others and accept invitations

#### 2.1 Invitation Core Logic
- [ ] Create invitation service
- [ ] Add pending invites to team documents
- [ ] Email invitation system (optional for MVP)
- [ ] Invitation acceptance workflow

**New files:**
- `src/services/invitationService.js`
- `src/composables/useInvitations.js`

#### 2.2 Invitation UI Components
- [ ] Invite user modal/form
- [ ] Pending invitations list
- [ ] Accept/decline invitation interface
- [ ] Team member management page

**New files:**
- `src/components/team/InviteUserModal.vue`
- `src/components/team/PendingInvitations.vue`
- `src/components/team/TeamMembersList.vue`
- `src/views/TeamManagement.vue`

#### 2.3 Login Flow Integration
- [ ] Check for pending invitations on login
- [ ] Auto-process solo user invitations
- [ ] Handle team merger scenarios
- [ ] Update auth initialization

**Files to modify:**
- `src/stores/auth.js`
- `src/services/authService.js`

### Phase 3: Data Migration (Week 3)
**Goal**: Handle data migration when users change teams

#### 3.1 Solo User Migration
- [ ] Migrate Firestore data between teams
- [ ] Update document references
- [ ] Clean up old team documents
- [ ] Handle migration errors gracefully

**New files:**
- `src/services/migrationService.js`

#### 3.2 Storage Migration Strategy
- [ ] Design lazy storage migration approach
- [ ] Update upload service to handle old paths
- [ ] Create background migration job (optional)
- [ ] Storage cleanup utilities

#### 3.3 Team Merger Logic
- [ ] Multi-team merger workflow
- [ ] Conflict resolution (duplicate clients, matters)
- [ ] Member role reconciliation
- [ ] Rollback mechanisms

### Phase 4: Advanced Features (Week 4)
**Goal**: Polish and edge cases

#### 4.1 Team Management UI
- [ ] Team settings page
- [ ] Member role management
- [ ] Team dissolution/leaving
- [ ] Transfer team ownership

#### 4.2 Conflict Resolution
- [ ] Handle duplicate data during mergers
- [ ] Client/matter name conflicts
- [ ] User role conflicts
- [ ] Data reconciliation UI

#### 4.3 Edge Cases & Error Handling
- [ ] Failed migrations recovery
- [ ] Partial team mergers
- [ ] Network interruption handling
- [ ] Data consistency validation

## Implementation Details

### Solo User Registration Flow

```javascript
// New user registration
async function createNewUser(uid, email, displayName) {
  try {
    // 1. Set custom claims (teamId = userId)
    await admin.auth().setCustomUserClaims(uid, {
      teamId: uid,
      role: 'admin'
    })
    
    // 2. Create user document
    await db.collection('users').doc(uid).set({
      defaultTeamId: uid,
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en'
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    })
    
    // 3. Create solo team
    await db.collection('teams').doc(uid).set({
      name: `${displayName}'s Workspace`,
      description: 'Personal workspace',
      members: {
        [uid]: {
          email: email,
          role: 'admin',
          joinedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      },
      pendingInvites: {},
      apps: ['intranet', 'bookkeeper'],
      settings: {
        timezone: 'UTC',
        maxMembers: 100
      },
      isPersonal: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: uid
    })
    
    // 4. Create default matters
    await createDefaultMatters(uid)
    
  } catch (error) {
    console.error('Failed to create solo user:', error)
    throw error
  }
}

async function createDefaultMatters(teamId) {
  const batch = db.batch()
  
  // General matter for team documents
  const generalMatterRef = db
    .collection('teams').doc(teamId)
    .collection('matters').doc('matter-general')
  
  batch.set(generalMatterRef, {
    title: 'General Team Documents',
    description: 'Non-client documents and team resources',
    clientId: null,
    matterNumber: 'GEN-001',
    status: 'active',
    priority: 'low',
    assignedTo: [teamId],
    openedDate: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: teamId,
    isSystemMatter: true
  })
  
  await batch.commit()
}
```

### Invitation System

```javascript
// Invitation service
class InvitationService {
  static async inviteUser(inviterTeamId, email, role = 'member') {
    const inviterTeam = await db.collection('teams').doc(inviterTeamId).get()
    
    if (!inviterTeam.exists) {
      throw new Error('Inviter team not found')
    }
    
    // Add pending invitation
    await inviterTeam.ref.update({
      [`pendingInvites.${email}`]: {
        invitedBy: auth.currentUser.uid,
        invitedAt: admin.firestore.FieldValue.serverTimestamp(),
        role: role,
        fromTeam: inviterTeamId,
        teamName: inviterTeam.data().name
      }
    })
    
    // Optional: Send email notification
    // await this.sendInvitationEmail(email, inviterTeam.data(), role)
    
    return true
  }
  
  static async checkPendingInvitations(userId, userEmail) {
    const teamsSnapshot = await db.collection('teams')
      .where(`pendingInvites.${userEmail}`, '!=', null)
      .get()
    
    const invitations = []
    teamsSnapshot.forEach(doc => {
      const team = doc.data()
      const invite = team.pendingInvites[userEmail]
      invitations.push({
        teamId: doc.id,
        teamName: team.name,
        invitedBy: invite.invitedBy,
        invitedAt: invite.invitedAt,
        role: invite.role
      })
    })
    
    return invitations
  }
  
  static async acceptInvitation(userId, userEmail, inviterTeamId) {
    // Get user's current team
    const currentTeam = await db.collection('teams').doc(userId).get()
    const currentTeamData = currentTeam.data()
    
    if (currentTeamData.isPersonal && Object.keys(currentTeamData.members).length === 1) {
      // Solo user joining team - simple migration
      await this.migrateSoloUser(userId, userEmail, inviterTeamId)
    } else {
      // Team founder with members - requires team merger workflow
      throw new Error('TEAM_MERGER_REQUIRED')
    }
  }
  
  static async migrateSoloUser(userId, userEmail, newTeamId) {
    const batch = db.batch()
    
    try {
      // Get invitation details
      const newTeam = await db.collection('teams').doc(newTeamId).get()
      const invite = newTeam.data().pendingInvites[userEmail]
      
      // 1. Update custom claims
      await admin.auth().setCustomUserClaims(userId, {
        teamId: newTeamId,
        role: invite.role
      })
      
      // 2. Add user to new team
      batch.update(db.collection('teams').doc(newTeamId), {
        [`members.${userId}`]: {
          email: userEmail,
          role: invite.role,
          joinedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        [`pendingInvites.${userEmail}`]: admin.firestore.FieldValue.delete()
      })
      
      // 3. Update user's default team
      batch.update(db.collection('users').doc(userId), {
        defaultTeamId: newTeamId
      })
      
      await batch.commit()
      
      // 4. Migrate data (separate transaction)
      await this.migrateTeamData(userId, newTeamId)
      
      // 5. Clean up old team
      await this.cleanupSoloTeam(userId)
      
    } catch (error) {
      console.error('Migration failed:', error)
      throw error
    }
  }
  
  static async migrateTeamData(fromTeamId, toTeamId) {
    const collections = ['clients', 'matters', 'documents', 'upload_logs']
    
    for (const collectionName of collections) {
      const docs = await db
        .collection('teams').doc(fromTeamId)
        .collection(collectionName)
        .get()
      
      if (docs.size > 0) {
        const batch = db.batch()
        docs.forEach(doc => {
          const newDocRef = db
            .collection('teams').doc(toTeamId)
            .collection(collectionName).doc(doc.id)
          
          batch.set(newDocRef, {
            ...doc.data(),
            migratedFrom: fromTeamId,
            migratedAt: admin.firestore.FieldValue.serverTimestamp()
          })
        })
        await batch.commit()
      }
    }
  }
  
  static async cleanupSoloTeam(teamId) {
    // Delete team document and all subcollections
    const teamRef = db.collection('teams').doc(teamId)
    
    // Note: In production, use Firebase Functions to recursively delete
    // For now, just delete the main team document
    await teamRef.delete()
  }
}
```

### UI Components

```vue
<!-- InviteUserModal.vue -->
<template>
  <div class="modal">
    <form @submit.prevent="sendInvitation">
      <h2>Invite Team Member</h2>
      
      <div class="form-group">
        <label>Email Address</label>
        <input 
          v-model="email" 
          type="email" 
          required 
          placeholder="colleague@example.com"
        />
      </div>
      
      <div class="form-group">
        <label>Role</label>
        <select v-model="role">
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      
      <div class="form-actions">
        <button type="button" @click="$emit('close')">Cancel</button>
        <button type="submit" :disabled="isLoading">
          {{ isLoading ? 'Sending...' : 'Send Invitation' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { InvitationService } from '@/services/invitationService'

const emit = defineEmits(['close', 'invited'])

const authStore = useAuthStore()
const email = ref('')
const role = ref('member')
const isLoading = ref(false)

async function sendInvitation() {
  isLoading.value = true
  try {
    await InvitationService.inviteUser(
      authStore.currentTeam,
      email.value,
      role.value
    )
    emit('invited', { email: email.value, role: role.value })
    emit('close')
  } catch (error) {
    console.error('Invitation failed:', error)
    // Handle error (show toast, etc.)
  } finally {
    isLoading.value = false
  }
}
</script>
```

## Testing Strategy

### Unit Tests
- [ ] Solo user registration flow
- [ ] Invitation creation and acceptance
- [ ] Data migration logic
- [ ] Team merger scenarios
- [ ] Error handling and rollback

### Integration Tests
- [ ] End-to-end invitation workflow
- [ ] Multi-user team formation
- [ ] File upload with different team contexts
- [ ] Cross-app authentication with new team structure

### Edge Case Tests
- [ ] Network failures during migration
- [ ] Duplicate invitations
- [ ] Invalid email addresses
- [ ] Team size limits
- [ ] Storage quota implications

## Security Considerations

### Custom Claims Updates
- Ensure custom claims are updated atomically
- Handle failed claim updates gracefully
- Validate team membership before setting claims

### Data Migration Security
- Verify user has permission to migrate data
- Prevent unauthorized team access during migration
- Audit trail for all team changes

### Storage Access
- Update security rules to handle team transitions
- Prevent access to old team data after migration
- Handle storage path updates securely

## Performance Considerations

### Firestore Operations
- Use batched writes for atomic operations
- Minimize read operations during migration
- Index optimization for invitation queries

### Storage Migration
- Lazy migration strategy to avoid large operations
- Background jobs for storage cleanup
- Monitor storage costs during team transitions

## Rollout Strategy

### Phase 1: Existing Users
- Deploy without breaking existing teams
- Gradually migrate existing solo workflows
- Monitor for issues and performance impact

### Phase 2: New Users
- All new registrations use solo-team pattern
- Validate invitation system with limited users
- Gather feedback on invitation UX

### Phase 3: Full Rollout
- Enable team merger functionality
- Launch advanced team management features
- Scale monitoring and error handling

## Success Metrics

- [ ] Console warning eliminated for solo users
- [ ] File uploads work for all user types
- [ ] Invitation acceptance rate > 80%
- [ ] Data migration success rate > 99%
- [ ] Zero data loss incidents during team transitions
- [ ] Team formation time < 30 seconds

## Risk Mitigation

### Data Loss Prevention
- Comprehensive backup before migrations
- Rollback procedures for failed operations
- Real-time monitoring of migration success

### Performance Degradation
- Load testing with various team sizes
- Query optimization for team operations
- Caching strategies for frequently accessed data

### User Experience Issues
- Clear error messages for all failure scenarios
- Progressive disclosure for complex operations
- Help documentation for team management

## Implementation Notes

1. **Start Simple**: Implement solo user fix first, then build invitation system
2. **Incremental Rollout**: Test each phase thoroughly before proceeding
3. **Monitor Closely**: Watch for performance and data consistency issues
4. **User Communication**: Clear messaging about team changes and capabilities
5. **Backup Strategy**: Comprehensive backups before any destructive operations

This implementation plan provides a clear roadmap for transitioning from the current "users need teams" model to the more elegant "solo users are teams of one" approach, while building a robust foundation for team collaboration and growth.