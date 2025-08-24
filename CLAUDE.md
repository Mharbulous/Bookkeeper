# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**Bookkeeper** - A Vue 3 bookkeeping/accounting application with file upload and processing capabilities, built with Firebase Authentication and Vuetify components. This is part of a multi-app SSO architecture with shared authentication across related applications.

## Essential Commands

### Development Commands
User will run test server:
- **Development server**: http://localhost:5173/

### Multi-App SSO Development Commands
For testing SSO functionality across multiple apps:
- **Intranet**: `npm run dev:intranet` (intranet.localhost:3000)
- **Bookkeeper**: `npm run dev:bookkeeping` (bookkeeping.localhost:3001) 
- **Files**: `npm run dev:files` (files.localhost:3002)

### Before Committing
Do not run these commands unless specifical requested
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
Core feature for uploading and processing files with sophisticated time estimation and deduplication:

**Key Components**:
- `views/FileUpload.vue` - Main upload interface
- `components/features/upload/` - Upload-related components
  - `FileUploadQueue.vue` - Queue management and progress display
  - `FolderOptionsDialog.vue` - Upload configuration with time estimates
  - `ProcessingProgressModal.vue` - Real-time progress tracking
  - `UploadDropzone.vue` - Drag/drop interface
- `composables/` - Reusable logic
  - `useFileQueue.js` - File queue management and processing coordination
  - `useQueueDeduplication.js` - Duplicate detection and hash processing
  - `useFolderOptions.js` - Folder analysis and path parsing optimization
  - `useWebWorker.js` & `useWorkerManager.js` - Worker management
- `workers/fileHashWorker.js` - Background SHA-256 hash calculation
- `utils/fileAnalysis.js` - 3-phase time estimation and file metrics

**Processing Pipeline**:
1. **File Selection** → Folder analysis and preprocessing
2. **Estimation** → 3-phase time prediction with directory complexity
3. **Queueing** → Size-based filtering and duplicate detection  
4. **Processing** → Background hash calculation with progress tracking
5. **Upload** → Firebase storage with deduplication

### Component Architecture
- **Layout**: `AppSidebar.vue`, `AppHeader.vue` provide main navigation
- **Base Components**: Reusable UI components in `components/base/`
- **Feature Components**: Domain-specific components in `components/features/`
- **Views**: Page-level components in `views/`

### Data Flow Patterns
1. **Authentication**: Firebase Auth → Auth Store → Route Guards → Components
2. **File Processing**: File Selection → Folder Analysis → Time Estimation → Queue → Deduplication → Worker Processing → Upload
3. **State Management**: Pinia stores manage global state, composables handle component-level logic

### File Processing Flow Details
1. **File/Folder Selection**: User drops files or selects folder
2. **Folder Options Analysis** (if folder):
   - Single-pass path parsing for all files
   - Directory statistics calculation (depth, count)
   - Size-based duplicate candidate identification
   - 3-phase time estimation with directory complexity
3. **Queue Management**: Files added to processing queue with metadata
4. **Deduplication Processing**:
   - Size-based pre-filtering (unique sizes skip hashing)
   - Web Worker hash calculation for duplicate candidates
   - Progress tracking with phase-based updates
5. **Upload Coordination**: Processed files uploaded to Firebase Storage

## Demo Organization System

The codebase includes a structured development demonstration system in `src/dev-demos/` for testing and showcasing features:

- **Demo Views**: Full-page demos in `src/dev-demos/views/` (e.g., LazyLoadingDemo.vue)
- **Demo Routes**: Development-only routes under `/dev/*` (e.g., `/dev/lazy-loading`)
- **Demo Components**: Reusable demo infrastructure (`DemoContainer.vue`, performance tracking)
- **Environment-Aware**: Demos only load in development mode
- **Access**: Navigate to `http://localhost:5174/#/dev` for demo index

Key demos include lazy loading performance testing with <0.01ms placeholder rendering verification and realistic test data generation.

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

### File Processing & Estimation System

**3-Phase Enhanced Prediction Model (Trial 5 Optimization):**
The system uses a sophisticated multi-factor prediction model achieving 88.4% accuracy:

1. **Phase 1: File Analysis** (Multi-factor with directory structure)
   - Formula: `172.48 + (0.657 × files) + (-88.60 × avgDepth) + (-2.05 × dirCount)`
   - Path parsing and directory structure analysis
   - Size-based grouping and filtering
   - Duplicate candidate identification

2. **Phase 2: Hash Processing** (Combined optimal using duplicate metrics)
   - Formula: `-75.22 + (5.14 × duplicateCandidates) + (0.73 × duplicateSizeMB)`
   - SHA-256 calculation for duplicate detection
   - Optimized using actual duplicate candidates rather than total file metrics
   - Accounts for both candidate count and data size requiring hashing

3. **Phase 3: UI Rendering** (Enhanced multi-factor with directory complexity)
   - Formula: `-218.69 + (3.44 × files) + (133.74 × avgDepth) + (1.68 × dirCount)`
   - DOM updates and progress visualization
   - Directory structure complexity significantly impacts rendering performance

**Path Parsing Optimization:**
- Single preprocessing pass eliminates 80% of redundant path parsing
- Calculates all metrics simultaneously: directory count, depth statistics, folder detection
- Optimized from 5+ separate parsing operations to 1 consolidated operation

**File Deduplication Strategy:**
- **Size-based pre-filtering**: Files with unique sizes skip hash calculation entirely
- **Hash-based verification**: Only files with identical sizes undergo SHA-256 hashing
- **Firestore integration**: Hashes serve as document IDs for automatic database-level deduplication
- **Efficient processing**: Typically 60-80% of files skip expensive hash calculation

**Enhanced Console Logging for Analysis:**
The system now uses JSON.stringify() to prevent console truncation and capture complete data:
```javascript
🔬 FOLDER_ANALYSIS_DATA: {
  totalFiles, duplicateCandidateCount, totalSizeMB, duplicateCandidatesSizeMB,
  avgDirectoryDepth, maxDirectoryDepth, totalDirectoryCount, uniqueFilesTotal,
  avgFilenameLength, zeroByteFiles, largestFileSizesMB: [...]
}

// TIME_ESTIMATION_FORMULA console logs removed for production
// Detailed breakdown available in analyzeFiles() return object
```

### Multi-App SSO Integration
Part of a larger SSO architecture - when testing multi-app features, use the `dev:*` commands with proper localhost domain mapping. All apps share identical Firebase configuration for seamless authentication.

### Route Structure
- Hash-based routing for Firebase hosting compatibility
- Route guards protect authenticated areas
- Meta flags control authentication requirements
- Lazy loading for all route components

## Development Workflow

### Code Quality & Linting
**CRITICAL**: You MUST always delegate all linting and code beautification tasks to the specialized `beautifier` agent. When delegating to the beautifier:

1. **Always specify the exact files** that need to be reviewed/formatted
2. **Use the Task tool** with `subagent_type: "beautifier"`
3. **Provide clear file paths** - never use vague instructions like "check all files"
4. **Examples of proper delegation**:
   - "Review and format these specific files: `src/components/LoginForm.vue`, `src/stores/auth.js`"
   - "Fix linting errors in `src/utils/fileAnalysis.js` and `src/composables/useFileQueue.js`"

**Never attempt to manually fix linting or formatting issues** - always use the specialized agent.

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

## Performance Testing & Analysis

### Speed Test Data Collection
The `docs/speed_tests/` directory contains tools for analyzing file processing performance:

**Data Collection Process:**
1. Run file processing operations in the browser
2. Copy console log output from browser DevTools console
3. Save console output as `.md` file (e.g., `3_Raw_ConsoleData.md`)

**Analysis Scripts:**
- **`parse_console_log.py`**: Parses browser console logs into structured CSV data
  ```bash
  python parse_console_log.py 3_Raw_ConsoleData.md
  ```
  - Generates `3_FolderAnalysisData.csv` (file metrics)
  - Generates `3_TestSpeedData.csv` (3-stage timing data)

- **`analyze_3stage_data.py`**: Analyzes performance data and provides prediction coefficients
  ```bash
  python analyze_3stage_data.py
  ```

**Enhanced 3-Phase Performance Model (Trial 5 Optimization):**
The system implements an optimized multi-factor prediction model achieving 88.4% accuracy:

- **Phase 1: File Analysis** - Multi-factor: `172.48 + (0.657 × files) + (-88.60 × avgDepth) + (-2.05 × dirCount)`
- **Phase 2: Hash Processing** - Combined optimal: `-75.22 + (5.14 × duplicateCandidates) + (0.73 × duplicateSizeMB)`  
- **Phase 3: UI Rendering** - Enhanced complexity: `-218.69 + (3.44 × files) + (133.74 × avgDepth) + (1.68 × dirCount)`

**Key Insights from Enhanced Performance Analysis:**
- **Multi-factor models outperform simple constants**: Directory structure complexity significantly improves accuracy
- **Duplicate-specific metrics**: Using `duplicateCandidates` and `duplicateSizeMB` provides better Phase 2 predictions than total file metrics
- **Directory depth impact**: Both positive (UI complexity) and negative (analysis efficiency) effects on different phases
- **Negative base constants**: Some phases show fixed overhead savings in certain scenarios
- **R² scores of 0.997+**: Excellent model fit achieved through comprehensive calibration

**Enhanced Prediction Accuracy:**
Current optimized model performance from Trial 5 comprehensive analysis:
- **Mean Accuracy**: 88.4% (improved from 88.0%)
- **Median Accuracy**: 96.4%
- **R² Score**: 0.999 (excellent model fit)
- **Mean Absolute Error**: 168ms
- Models account for Web Worker execution and multi-factor complexity

## Important Notes

- **File Processing**: Large operations run in Web Workers to maintain UI responsiveness
- **State Machine**: Always check `authStore.isInitialized` before rendering auth-dependent content
- **Team Context**: All data access is scoped by team ID (currently userId for solo users)
- **Cross-App Testing**: Use dedicated dev commands for SSO testing across multiple apps
- **Firebase Consistency**: All apps in SSO architecture must use identical Firebase configuration