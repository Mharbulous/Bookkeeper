# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**Bookkeeper** - A Vue 3 bookkeeping/accounting application with file upload and processing capabilities, built with Firebase Authentication and Vuetify components. This is part of a multi-app SSO architecture with shared authentication across related applications.

## Essential Commands

### Development Commands
- **Development server**: `npm run dev`
- **Build production**: `npm run build`
- **Preview build**: `npm run preview`
- **Lint code**: `npm run lint`
- **Format code**: `npm run format`

### Testing Commands  
- **Run tests**: `npm run test`
- **Run tests once**: `npm run test:run`
- **Test UI**: `npm run test:ui`
- **SSO E2E tests**: `npm run test:sso`

### Multi-App SSO Development Commands
For testing SSO functionality across multiple apps:
- **Intranet**: `npm run dev:intranet` (intranet.localhost:3000)
- **Bookkeeper**: `npm run dev:bookkeeping` (bookkeeping.localhost:3001) 
- **Files**: `npm run dev:files` (files.localhost:3002)

### Before Committing
Always run these commands in order:
1. `npm run lint` - Fix linting issues
2. `npm run test:run` - Ensure all tests pass  
3. `npm run build` - Verify the build works

## Technology Stack

- **Frontend**: Vue 3 with Composition API
- **Build Tool**: Vite 
- **UI Framework**: Vuetify 3 (beta) with Material Design Icons
- **State Management**: Pinia stores
- **Routing**: Vue Router 4 with hash-based routing
- **Authentication**: Firebase Auth with Firestore
- **Styling**: Tailwind CSS + custom CSS
- **Testing**: Vitest with jsdom environment

## High-Level Architecture

### Authentication System
The app uses a sophisticated Firebase Auth system with explicit state machine pattern to handle timing issues common in Firebase Auth integrations:

**Auth States**: `uninitialized` → `initializing` → `authenticated` | `unauthenticated` | `error`

**Key Components**:
- `stores/auth.js` - Pinia store with state machine for auth
- `services/authService.js` - Firebase Auth operations
- `router/guards/auth.js` - Route protection
- `components/features/auth/LoginForm.vue` - Login interface

**Solo Team Architecture**: Every user automatically gets a "solo team" where `teamId === userId`, providing consistent data patterns and easy upgrade path to multi-user teams.

### File Upload & Processing System
Core feature for uploading and processing files with deduplication:

**Key Components**:
- `views/FileUpload.vue` - Main upload interface
- `components/features/upload/` - Upload-related components
  - `FileUploadQueue.vue` - Queue management
  - `FolderOptionsDialog.vue` - Upload configuration
  - `ProcessingProgressModal.vue` - Progress tracking
  - `UploadDropzone.vue` - Drag/drop interface
- `composables/` - Reusable logic
  - `useFileQueue.js` - File queue management
  - `useQueueDeduplication.js` - Duplicate detection
  - `useWebWorker.js` & `useWorkerManager.js` - Worker management
- `workers/fileHashWorker.js` - Background hash calculation

### Component Architecture
- **Layout**: `AppSidebar.vue`, `AppHeader.vue` provide main navigation
- **Base Components**: Reusable UI components in `components/base/`
- **Feature Components**: Domain-specific components in `components/features/`
- **Views**: Page-level components in `views/`

### Data Flow Patterns
1. **Authentication**: Firebase Auth → Auth Store → Route Guards → Components
2. **File Processing**: File Selection → Queue → Deduplication → Worker Processing → Upload
3. **State Management**: Pinia stores manage global state, composables handle component-level logic

## Key Implementation Details

### Authentication Timing Solutions
The auth system solves Firebase Auth's race condition issues where `onAuthStateChanged` fires multiple times during initialization:

```javascript
// Proper auth state checking
if (!authStore.isInitialized) {
  return // Wait for auth determination
}

if (authStore.isAuthenticated) {
  // User is definitely logged in
}
```

### File Deduplication Strategy  
Files are deduplicated using SHA-256 hashes as Firestore document IDs, ensuring automatic deduplication at the database level without additional logic.

### Multi-App SSO Integration
Part of a larger SSO architecture - when testing multi-app features, use the `dev:*` commands with proper localhost domain mapping. All apps share identical Firebase configuration for seamless authentication.

### Route Structure
- Hash-based routing for Firebase hosting compatibility
- Route guards protect authenticated areas
- Meta flags control authentication requirements
- Lazy loading for all route components

## Development Workflow

### Local SSO Testing Setup
Add to hosts file for multi-app development:
```
127.0.0.1 intranet.localhost
127.0.0.1 bookkeeping.localhost  
127.0.0.1 files.localhost
```

### Key Files to Understand
- `docs/authentication.md` - Comprehensive auth system documentation
- `src/main.js` - App initialization and auth store setup
- `src/App.vue` - Main layout with auth state handling
- `vite.config.js` - Build configuration with Vuetify integration
- `package.json` - Dependencies and script commands

### Testing Strategy
- Unit tests with Vitest for composables and utilities
- E2E tests specifically for SSO functionality across apps
- Manual testing checklist includes cross-app authentication flows

### Environment Configuration
Firebase configuration required in `.env` file (see `.env.example` template). All related apps must use identical Firebase project configuration for SSO to function.

## Performance Optimizations

### Web Workers
File hashing and processing operations run in background workers to prevent UI blocking during large file uploads.

### Lazy Loading
- Route components are dynamically imported
- Auth service imports are lazy-loaded to prevent circular dependencies
- Large dependencies loaded on-demand

### Deduplication Efficiency  
Hash-based deduplication eliminates redundant storage and processing of identical files.

## Security Implementation

### Firestore Security Rules
- Users can only access their own data (`teamId === userId` for solo users)
- Files use hash-based document IDs for immutable storage
- Team-based access control ready for future multi-user features

### Authentication Security
- Firebase Auth handles all identity verification
- Automatic token refresh and session validation
- Secure logout clears all client-side data
- Route guards prevent unauthorized access

## Important Notes

- **File Processing**: Large operations run in Web Workers to maintain UI responsiveness
- **State Machine**: Always check `authStore.isInitialized` before rendering auth-dependent content
- **Team Context**: All data access is scoped by team ID (currently userId for solo users)
- **Cross-App Testing**: Use dedicated dev commands for SSO testing across multiple apps
- **Firebase Consistency**: All apps in SSO architecture must use identical Firebase configuration