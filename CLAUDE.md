# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Vue 3 template with Multi-App SSO (Single Sign-On) capabilities, originally designed for the BDLC (Brahm Dorst Law Corporation) Intranet. The template enables seamless authentication across multiple applications using Firebase Auth with team-based multi-tenant architecture. Users can navigate between different apps without re-authentication, while maintaining data isolation through team contexts.

## Development Commands

### Essential Commands
- **Development server**: `npm run dev`
- **Build production**: `npm run build`
- **Preview build**: `npm run preview`
- **Lint code**: `npm run lint`
- **Format code**: `npm run format`

### Testing Commands
- **Run tests**: `npm run test`
- **Run tests once**: `npm run test:run`
- **Test UI**: `npm run test:ui`

### Before Committing
Always run these commands before committing changes:
1. `npm run lint` - Fix linting issues
2. `npm run test:run` - Ensure all tests pass
3. `npm run build` - Verify the build works

## Architecture Overview

### Core Technology Stack
- **Frontend**: Vue 3 with Composition API
- **Build Tool**: Vite
- **State Management**: Pinia stores
- **Routing**: Vue Router 4 with hash-based routing
- **Authentication**: Firebase Auth with Firestore
- **Styling**: Tailwind CSS with custom design system
- **Testing**: Vitest with jsdom

### Key Design Patterns

#### Authentication State Machine with SSO
The application implements an explicit auth state machine with five states:
- `uninitialized` → `initializing` → `authenticated` | `unauthenticated` | `error`

This pattern solves Firebase Auth timing issues and enables cross-domain persistence for Multi-App SSO.

#### Single Source of Truth Architecture
- **Firebase Auth**: Identity data (`uid`, `email`, `displayName`, `photoURL`) + Custom Claims (`teamId`, `role`)
- **Firestore**: Application-specific data (`role`, `department`, `teamId`, `preferences`)

This prevents data duplication and enables efficient team-based access controls.

#### Multi-Tenant Team Architecture
- Teams provide data isolation between organizations
- Custom claims enable efficient authorization without database calls
- Flat team structure optimized for performance and simplicity

#### Error Handling
The application provides clear error handling for Firebase configuration, team access, and SSO issues.

## Project Structure

### Core Directories
```
src/
├── components/          # Reusable Vue components
│   └── AppSwitcher.vue  # Multi-app navigation component
├── views/              # Page-level components
├── router/             # Vue Router configuration and guards
├── stores/             # Pinia state management
│   ├── auth.js         # Authentication with SSO support
│   └── team.js         # Team management and context
├── services/           # External service integrations
│   ├── firebase.js     # Firebase configuration
│   ├── authService.js  # Authentication operations
│   ├── teamService.js  # Team CRUD operations
│   └── userService.js  # User data management
├── styles/             # Tailwind CSS and component styles
└── assets/             # Static assets and images
```

### Key Files
- `src/stores/auth.js` - Authentication with SSO and team context
- `src/stores/team.js` - Team management and multi-tenant support
- `src/services/teamService.js` - Team CRUD operations
- `src/components/AppSwitcher.vue` - Multi-app navigation
- `firestore.rules` - Team-based security rules
- `docs/authentication.md` - Comprehensive auth system documentation
- `docs/plans/Multi-App-SSO/simplified-sso-roadmap.md` - SSO implementation guide
- `.env.example` - Environment configuration with SSO variables

## Authentication System

### State Management
Always use the auth store getters instead of direct checks:
```javascript
// ✅ Correct approach
if (authStore.isAuthenticated) { /* user is logged in */ }
if (!authStore.isInitialized) { /* still loading */ }

// ❌ Avoid - timing issues
if (authStore.user) { /* user might be null during initialization */ }
```

### Component Integration
```vue
<template>
  <!-- Wait for auth initialization -->
  <div v-if="!authStore.isInitialized" class="loading">
    Loading...
  </div>
  <div v-else-if="authStore.isAuthenticated">
    Welcome, {{ authStore.userDisplayName }}
  </div>
  <div v-else>
    Please log in
  </div>
</template>
```

### Common Auth Operations
- **Login**: `await authStore.login(email, password)`
- **Logout**: `await authStore.logout()`
- **Check auth state**: Use `authStore.isAuthenticated` getter
- **Get user info**: Use `authStore.userDisplayName` or `authStore.userInitials`

## Design System

### Colors
- **Brand Blue**: `#3b82f6` (primary actions, links)
- **Brand Blue Dark**: `#1d4ed8` (hover states)
- **Neutrals**: Tailwind slate scale (50-800)

### Component Patterns
- **Buttons**: Use `py-3 px-4` padding with `rounded-lg`
- **Form Inputs**: Include focus states with `focus:border-brand-blue`
- **Cards**: Use `bg-white border border-gray-200 rounded-lg shadow-md p-6`

### Layout Standards
- **Header height**: `h-20` (80px)
- **Sidebar**: `w-[60px]` collapsed, `w-[280px]` expanded
- **Page container**: `max-w-7xl mx-auto px-4`

## Routing Configuration

### Route Protection
Routes use meta fields for access control:
```javascript
{
  path: '/dashboard',
  component: Dashboard,
  meta: { 
    requiresAuth: true,
    roles: ['user', 'admin'] // Optional role-based access
  }
}
```

### Navigation Patterns
The application uses breadcrumb highlighting where parent categories remain highlighted when viewing sub-pages. Use `exact="false"` on router-link components for this behavior.

## Firebase Integration

### Environment Variables
Required configuration for Multi-App SSO (all must be provided):
- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain 
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID (must be same across all apps)
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID
- `VITE_APP_DOMAIN` - Base domain for multi-app navigation (e.g., 'yourdomain.com')

**Critical for SSO**: All apps must use the **same Firebase project** and have identical configuration.

### Firestore Structure
```javascript
// /users/{uid} - Application-specific user data
{
  role: 'user' | 'admin',
  department: 'Engineering',
  teamId: 'team-abc-123',  // Team association for data isolation
  preferences: { theme: 'light', notifications: true },
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastLogin: Timestamp
}

// /teams/{teamId} - Team/organization data
{
  name: 'ACME Corp',
  description: 'Engineering team',
  members: {
    userId1: { email: 'user@acme.com', role: 'admin', joinedAt: Timestamp },
    userId2: { email: 'user2@acme.com', role: 'member', joinedAt: Timestamp }
  },
  settings: { /* team-specific settings */ },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Testing Guidelines

### Test Structure
- Tests use Vitest with jsdom environment
- Mock Firebase services for unit tests
- Test authentication state transitions
- Verify component reactivity with state changes

### Critical Test Areas
1. **Auth state machine transitions**
2. **Component reactivity to auth changes**
3. **Route guard behavior**
4. **Firebase configuration validation**

## Multi-App SSO Usage

### Creating New Apps from Template
1. Use this repository as a GitHub template
2. **Critical**: Use the same Firebase project across all apps
3. Deploy each app to its own subdomain (e.g., `app1.domain.com`, `app2.domain.com`)
4. Add all domains to Firebase Console authorized domains

### App Navigation
Use the `AppSwitcher` component for seamless app navigation:
```vue
<template>
  <AppSwitcher />
</template>

<script setup>
import AppSwitcher from '@/components/AppSwitcher.vue'
</script>
```

### Team Context
Access team information in any component:
```vue
<script setup>
import { useAuthStore } from '@/stores/auth'
import { useTeamStore } from '@/stores/team'

const authStore = useAuthStore()
const teamStore = useTeamStore()

// Current user's team ID
const teamId = authStore.currentTeam

// Team details
const teamName = teamStore.teamName
const isAdmin = teamStore.isTeamAdmin
</script>
```

## Common Development Tasks

### Adding New Protected Routes
1. Add route to `src/router/index.js` with `meta: { requiresAuth: true }`
2. Create view component in `src/views/`
3. Update navigation in `src/components/Sidebar.vue` if needed

### Adding New Apps to SSO Network
1. Create new repository from this template
2. Use identical Firebase configuration
3. Update `AppSwitcher.vue` to include new app
4. Deploy to new subdomain

### Managing Teams
```javascript
import { TeamService } from '@/services/teamService'

// Create new team
await TeamService.createTeam('team-id', {
  name: 'ACME Corp',
  description: 'Engineering team'
})

// Add member to team
await TeamService.addTeamMember('team-id', 'user-id', {
  email: 'user@example.com',
  role: 'member'
})
```

### Customizing Design System
1. Update `tailwind.config.js` for new design tokens
2. Document changes in `docs/design-guidelines.md`
3. Update component examples

## Troubleshooting

### Auth Issues
- **Infinite loading**: Check if `authStore.initialize()` is called in main.js
- **Components not updating**: Ensure using Pinia store getters, not direct state
- **Route guard failures**: Verify `waitForInit()` is used in auth guard

### Build Issues
- **Vite build errors**: Check for dynamic imports in Firebase services
- **Tailwind not working**: Verify `postcss.config.js` and `tailwind.config.js`
- **Asset loading**: Check Vite base path configuration

### Firebase Issues
- **Startup errors**: Missing environment variables will prevent app initialization
- **Auth state errors**: Check Firebase console for configuration issues
- **Firestore permissions**: Verify security rules allow user document access

## Performance Considerations

### Code Splitting
- Views are lazy-loaded using dynamic imports
- Firebase services use dynamic imports to avoid circular dependencies

### State Management
- Auth store uses efficient getters for computed values
- User display names are cached to prevent repeated calculations

### Build Optimization
- Vite handles tree-shaking automatically
- Tailwind CSS purges unused styles in production