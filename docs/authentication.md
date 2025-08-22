# Authentication System Documentation
Updated: 2025-08-21

## Overview

This document provides a comprehensive reference for the authentication system implemented in this Vue 3 template. The system uses Firebase Authentication with Firestore for user data, implemented through a Pinia store with a robust state machine pattern that handles timing and reactivity issues common in Firebase Auth integrations.

## Architecture

### Core Components

1. **Firebase Auth**: Primary authentication service providing identity verification
2. **Firestore Users Collection**: Stores application-specific user data (`preferences`, timestamps)  
3. **Firestore Teams Collection**: Stores team data (including "solo teams" for individual users)
4. **Pinia Auth Store**: Centralized reactive state management with explicit state machine
5. **Auth Service**: Authentication operations (login, logout, user document management)
6. **User Service**: User profile data management and caching

### Data Sources & Single Source of Truth

Following the single source of truth principle:

- **Firebase Auth**: Authoritative source for identity data (`uid`, `email`, `displayName`, `photoURL`)
- **Firestore Users Collection**: Only stores user preferences and settings
- **Firestore Teams Collection**: Stores team membership and permissions (including solo teams where `teamId === userId`)

This eliminates data duplication and synchronization issues between Firebase Auth and Firestore.

## Solo User as Team Architecture

### Design Philosophy
Every user in the system belongs to a team. Users without explicit team membership automatically have a "solo team" where `teamId === userId`. This eliminates special cases throughout the codebase and provides a seamless upgrade path to multi-user teams.

### Benefits
- **Consistent storage patterns**: All files follow `/teams/{teamId}/matters/{matterId}/...`
- **No special cases**: Same logic works for solo users and teams
- **Future-proof**: Easy transition from solo → team via invitations
- **Simplified security rules**: One pattern for all users

### Solo Team Structure
```javascript
// Solo team document at /teams/{userId}
{
  name: "User's Workspace",
  description: "Personal workspace",
  members: {
    [userId]: {
      email: userEmail,
      role: 'admin',
      joinedAt: Timestamp
    }
  },
  isPersonal: true,  // Flag to identify solo teams
  createdAt: Timestamp
}
```

## State Machine Implementation

### Auth States

The authentication system uses an explicit state machine with five states:

```javascript
authState: 'uninitialized' // Initial state
authState: 'initializing'  // Checking authentication status
authState: 'authenticated' // User is logged in
authState: 'unauthenticated' // No user logged in
authState: 'error'        // Authentication error occurred
```

### State Transitions

```
uninitialized → initializing → authenticated | unauthenticated | error
```

### State Getters

The auth store provides convenient getters for checking state:

- `isUninitialized`: Initial state before auth check
- `isInitializing`: Currently checking auth status  
- `isAuthenticated`: User is logged in
- `isUnauthenticated`: No user logged in
- `isError`: Authentication error occurred
- `isInitialized`: Auth state has been determined (not uninitialized/initializing)

## Timing Issues & Solutions

### The Firebase Auth Race Condition Problem

Firebase Auth exhibits intentional but problematic behavior that creates race conditions:

#### The Issue
1. **Page refresh/initial load**: `onAuthStateChanged` fires **first with `null` user**
2. **Short delay** (100-500ms): `onAuthStateChanged` fires **again with actual user data** 

This happens because Firebase:
- Restores user credentials from local storage
- Validates credentials with server asynchronously  
- Starts with `null` state until server confirms validity
- Fires multiple state change events during this process

#### Problems This Creates
- **UI Flickering**: Components show "not logged in" then "logged in" 
- **Route Guard Issues**: Navigation guards evaluate before auth is confirmed
- **State Management Confusion**: Reactive state changes multiple times rapidly
- **User Experience**: Loading states that resolve inconsistently

### Our Solutions

#### 1. Explicit State Machine
Instead of relying on Firebase Auth's binary authenticated/unauthenticated state, we implement explicit states:

```javascript
// Old approach - problematic
const isAuthenticated = computed(() => !!auth.currentUser)

// New approach - robust  
const isAuthenticated = computed(() => authStore.authState === 'authenticated')
const isInitialized = computed(() => authStore.isInitialized)
```

#### 2. Initialization Handling
The auth store properly handles the initialization sequence:

```javascript
initialize() {
  if (this._initialized) return
  
  this._initialized = true
  this.authState = 'initializing'  // Explicit loading state
  
  this._initializeFirebase()  // Sets up onAuthStateChanged listener
}
```

#### 3. Single Global Listener
One `onAuthStateChanged` listener prevents multiple subscriptions and state conflicts.

#### 4. UI Loading States
Components wait for authentication determination before rendering:

```vue
<!-- Wait for auth initialization -->
<div v-if="!authStore.isInitialized" class="loading">
  <div class="spinner"></div>
  <p>Loading...</p>
</div>

<!-- Show content only after auth state is determined -->
<div v-else-if="authStore.isAuthenticated">
  <!-- Authenticated content -->
</div>
```

## Authentication Flow

### Login Process

1. **User submits credentials** → `authStore.login(email, password)`
2. **Store delegates to auth service** → `authService.signIn()`
3. **Firebase Auth authenticates** → Returns `firebaseUser` object
4. **onAuthStateChanged fires** → `_handleUserAuthenticated()` called
5. **Solo team created if needed** → One-time creation including user document
6. **Store updates state**:
   - Sets `user` from Firebase Auth (identity data)
   - Sets `teamId` (userId for solo users, actual teamId for team members)
   - Sets `userRole` ('admin' for solo users)
   - Transitions to `authenticated` state
7. **Components react** → UI updates automatically

### New User Registration Process

1. **User registers** → Creates Firebase Auth account
2. **First login detected** → No team document exists
3. **Solo team created** → Team document with `teamId === userId`
4. **User document created** → Preferences and settings initialized during team creation
5. **Default matters created** → System matters like 'matter-general'
6. **Auth state updated** → User fully authenticated with team context

### Page Refresh/Initialization Process

1. **App starts** → Auth store initializes with `uninitialized` state
2. **Store calls initialize()** → Transitions to `initializing` state
3. **onAuthStateChanged listener set up** → Waits for Firebase Auth
4. **Firebase Auth checks stored credentials** → May fire multiple times
5. **Final auth state determined** → Transitions to `authenticated` or `unauthenticated`
6. **Components update** → UI shows appropriate content

### Logout Process

1. **User clicks logout** → `authStore.logout()`
2. **Store delegates to auth service** → `authService.signOut()`
3. **Firebase Auth signs out** → Clears session
4. **onAuthStateChanged fires with null** → `_handleUserUnauthenticated()` called
5. **Store clears state**:
   - Sets `user` to `null`
   - Sets `teamId` to `null`
   - Sets `userRole` to `null` 
   - Transitions to `unauthenticated` state
6. **Route guard redirects** → User sent to login page

## User Data Management

### Identity Data (Firebase Auth)
- `uid`: Unique user identifier
- `email`: User's email address
- `displayName`: User's display name (or email prefix fallback)
- `photoURL`: User's profile photo URL

### User Preferences (Firestore Users Collection)
```javascript
// Firestore document: /users/{uid}
{
  preferences: {
    theme: 'dark',
    notifications: true,
    language: 'en'
  },
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastLogin: Timestamp
}
```

### Team Membership (Firestore Teams Collection)
```javascript
// For solo users: /teams/{userId}
// For team members: /teams/{teamId}
{
  name: 'Team or Workspace Name',
  members: {
    [userId]: {
      email: userEmail,
      role: 'admin',  // or 'member' for team users
      joinedAt: Timestamp
    }
  },
  isPersonal: true,  // true for solo teams, false for multi-user teams
}
```

### Display Name Generation

The system generates user display names with fallback logic:

1. **Firebase Auth `displayName`** (if available)
2. **Email prefix** (part before @ symbol)
3. **"User" fallback** (if all else fails)

## One-Time Solo Team Setup

### Implementation
Solo team creation happens **once** when a user first logs in without a team:

```javascript
async _handleUserAuthenticated(firebaseUser) {
  // Set user identity from Firebase Auth
  this.user = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    photoURL: firebaseUser.photoURL,
  }
  
  // Check if user has a team
  const teamId = await this._getUserTeamId(firebaseUser.uid)
  
  if (!teamId) {
    // First-time user - create solo team once
    await this._createSoloTeam(firebaseUser)
    this.teamId = firebaseUser.uid
    this.userRole = 'admin'
  } else {
    // Existing user - load team info
    this.teamId = teamId
    this.userRole = await this._getUserRole(teamId, firebaseUser.uid)
  }
  
  this.authState = 'authenticated'
}
```

### Solo Team Creation
```javascript
async _createSoloTeam(firebaseUser) {
  const batch = db.batch()
  
  // Create team document
  const teamRef = doc(db, 'teams', firebaseUser.uid)
  batch.set(teamRef, {
    name: `${firebaseUser.displayName || 'User'}'s Workspace`,
    description: 'Personal workspace',
    members: {
      [firebaseUser.uid]: {
        email: firebaseUser.email,
        role: 'admin',
        joinedAt: serverTimestamp()
      }
    },
    isPersonal: true,
    createdAt: serverTimestamp()
  })
  
  // Create default matter
  const matterRef = doc(db, 'teams', firebaseUser.uid, 'matters', 'matter-general')
  batch.set(matterRef, {
    title: 'General Documents',
    description: 'Non-client documents and resources',
    status: 'active',
    createdAt: serverTimestamp()
  })
  
  await batch.commit()
}
```

## Route Guards

### Implementation

Route guards use the store's state machine to control access:

```javascript
export const createAuthGuard = () => {
  return async (to, from, next) => {
    const authStore = useAuthStore()
    
    // Initialize auth if not already done
    if (authStore.isUninitialized) {
      authStore.initialize()
    }
    
    // Wait for auth state to be determined
    await authStore.waitForInit()
    
    // Check if route requires authentication
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      next('/login')
    } else if (to.path === '/login' && authStore.isAuthenticated) {
      next('/') // Redirect away from login if already authenticated
    } else {
      next()
    }
  }
}
```

## Security Rules

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && 
                           request.auth.uid == userId;
    }
    
    // Team access - works for both solo and multi-user teams
    match /teams/{teamId} {
      allow read: if request.auth != null && 
                     request.auth.uid == teamId;  // Solo team
      allow write: if request.auth != null && 
                      request.auth.uid == teamId;  // Solo team only for now
    }
    
    // Files use hash as document ID for automatic deduplication
    match /teams/{teamId}/files/{hash} {
      allow read: if request.auth != null && 
                     (request.auth.uid == teamId || 
                      request.auth.token.teamId == teamId);
      
      // Create only if document doesn't exist (no merge)
      allow create: if request.auth != null && 
                       (request.auth.uid == teamId || 
                        request.auth.token.teamId == teamId);
      
      // No updates or deletes for immutability
      allow update, delete: if false;
    }
    
    // File index for queries
    match /teams/{teamId}/fileIndex/{hash} {
      allow read, write: if request.auth != null && 
                            (request.auth.uid == teamId || 
                             request.auth.token.teamId == teamId);
    }
    
    // Team subcollections (fallback for other collections)
    match /teams/{teamId}/{collection}/{document} {
      allow read, write: if request.auth != null && 
                           request.auth.uid == teamId;  // Solo team
    }
  }
}
```

### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /teams/{teamId}/matters/{matterId}/{fileName} {
      allow read, write: if request.auth != null && 
                           request.auth.uid == teamId;  // Solo team
    }
  }
}
```

## Error Handling

### Error States
The store handles authentication errors gracefully:

```javascript
try {
  await authService.signIn(email, password)
} catch (error) {
  this.error = error.message
  this.authState = 'error'
  throw error // Re-throw for component handling
}
```

### Error Recovery
Components can check for and handle error states:

```vue
<template>
  <div v-if="authStore.isError" class="error">
    <p>Authentication Error: {{ authStore.error }}</p>
    <button @click="retry">Try Again</button>
  </div>
</template>
```

## Best Practices

### 1. Always Check Initialization State
```javascript
// ✅ Wait for auth determination
if (!authStore.isInitialized) {
  return // Don't render yet
}

// ❌ Don't assume immediate availability  
if (authStore.user) {
  // This might execute before auth is ready
}
```

### 2. Use State Machine Getters
```javascript
// ✅ Use explicit state checks
if (authStore.isAuthenticated) {
  // User is definitely logged in
}

// ❌ Don't rely on truthy checks
if (authStore.user) {
  // User might be null during initialization
}
```

### 3. Handle Loading States in UI
```vue
<!-- ✅ Show loading during initialization -->
<div v-if="!authStore.isInitialized" class="loading">
  Loading...
</div>
<div v-else-if="authStore.isAuthenticated">
  <!-- User content -->  
</div>
```

### 4. Use Store Actions for Auth Operations
```javascript
// ✅ Use store actions
await authStore.login(email, password)
await authStore.logout()

// ❌ Don't call services directly from components
await authService.signIn(email, password)
```

## Common Issues & Troubleshooting

### Issue: Components show loading state indefinitely
**Cause**: Auth initialization not called or Firebase config missing
**Solution**: Ensure `authStore.initialize()` is called in main.js or App.vue

### Issue: User data shows but components don't update
**Cause**: Reactivity broken by object spreading or incorrect ref usage
**Solution**: Use Pinia store getters and avoid spreading reactive objects

### Issue: Route guards redirect authenticated users  
**Cause**: Guards executing before auth state determined
**Solution**: Use `await authStore.waitForInit()` in guards

### Issue: Multiple auth state changes causing UI flicker
**Cause**: Multiple `onAuthStateChanged` listeners or improper state handling
**Solution**: Ensure single global listener and proper state machine usage

### Issue: Solo team not created for new users
**Cause**: Team creation logic not running or failing silently
**Solution**: Check Firestore rules and ensure batch operations complete

## Performance Considerations

### Minimized Firestore Operations
- Solo team creation happens **once** per user lifetime
- Team membership checks are cached in memory
- No validation on every login - trust existing data

### Lazy Loading
Auth service and user service are imported dynamically to avoid circular dependencies:

```javascript
async login(email, password) {
  const { authService } = await import('../services/authService')
  await authService.signIn(email, password)
}
```

## Future Team Features

The solo team architecture provides a clean upgrade path to multi-user teams:

### Team Invitations (Future)
1. Admin invites user by email
2. User accepts invitation
3. Solo team data migrates to shared team
4. User's `teamId` updates to new team

### Team Management (Future)
- Add/remove team members
- Manage member roles
- Team settings and preferences
- Team billing and subscriptions

The current architecture supports all these features without breaking changes.

## Migration Notes

### For Existing Users
Users created before the solo team architecture will have their solo team created automatically on first login after the update. This is a one-time, transparent operation.

### For New Users
All new users automatically get a solo team upon registration. No special handling required.

## Security Considerations

### Authentication Flow
- Uses Firebase Auth for identity verification
- Validates sessions on each page load
- Automatically handles token refresh
- Provides secure logout that clears all session data

### Authorization  
- Solo users are admins of their own team
- Team members have role-based permissions
- Application-specific permissions stored securely
- No sensitive data in client-side state

### Data Protection
- Identity data never duplicated to Firestore
- Team membership verified server-side via security rules
- Proper cleanup prevents data leakage

---

This authentication system provides a robust, scalable foundation for Vue 3 applications requiring Firebase Authentication with proper handling of timing issues, reactivity concerns, and a clean architecture for both individual users and future team features.