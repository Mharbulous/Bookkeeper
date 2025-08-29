# Organizer Version 1.0 Implementation Plan

## Executive Summary

### Problem Statement
Users currently have no way to organize, categorize, or efficiently locate previously uploaded documents in the Bookkeeper application. Files exist only as an unstructured list from the upload system, making document discovery time-consuming and inefficient, particularly for legal professionals who need to quickly locate specific documents among hundreds or thousands of uploaded files.

### Solution Overview
Implement a basic file listing interface with manual tag assignment capability, providing users with fundamental document organization through text-based tags and simple search functionality.

## Core Goal

Create a simple file list view with manual tag assignment capability, providing users with basic document organization through text-based tags.

## Architecture Overview

### Two-Database Design

1. **Storage 1: Uploads** (Existing) - Raw file storage in Firebase Storage
   - Contains actual file bytes stored by hash
   - Maintains upload metadata for deduplication
   - Single source of truth for file content

2. **Database 2: Evidence** (New) - Organizer's core database
   - References files in Storage 1 via fileHash
   - Maintains all organizational metadata (tags, categories)
   - Supports future processing workflow states
   - Enables multiple evidence entries pointing to same file

### Key Design Decisions
- Evidence database is separate from upload metadata
- One uploaded file can have multiple evidence entries (different matters, different tags)
- Evidence entries reference storage files, never duplicate them
- Processing status fields included but unused in v1.0 (future-proofing)

## Features to Implement

### 1. Basic File List View
- Display all uploaded files with metadata (filename, extension, upload date)
- Integration with existing Firebase storage system
- Simple table/list interface using Vuetify components

### 2. Manual Tag Assignment
- Tag input interface for each file (text-based input)
- Tags stored as array of strings in Firestore
- Ability to add/remove tags per file

### 3. Basic Search/Filter
- Text-based filtering by tag names
- Simple search interface at top of file list
- Real-time filtering as user types

### 4. Navigation Integration
- New "Organizer" route and navigation item
- Proper Vue Router integration
- Route guards for authenticated access

## Technical Architecture

### Data Model
```javascript
// NEW: Evidence Database Structure (Database 2: Evidence)
// Collection: /teams/{teamId}/evidence/{evidenceId}
{
  evidenceId: "auto-generated", // Firestore auto-ID
  teamId: "user-team-id",
  
  // Reference to actual file in Storage 1
  storageRef: {
    storage: "uploads", // or "split", "merged" in future versions
    fileHash: "abc123...", // Points to file in Storage 1
    matterId: "general", // Which matter folder in storage
  },
  
  // Evidence metadata
  displayName: "Bank Statement March 2024.pdf", // User-friendly name
  originalName: "statement_03_2024.pdf", // Original upload name
  fileExtension: ".pdf",
  fileSize: 245632,
  
  // Processing status (for future Document Processing Workflow)
  isProcessed: false, // Will be true after v2.0 processing
  hasAllPages: null, // null = unknown, true/false after processing
  processingStage: "uploaded", // uploaded|splitting|merging|complete
  
  // Organization (v1.0 focus)
  tags: ["bank-statement", "2024", "march"],
  tagCount: 3,
  lastTaggedAt: "2024-01-01T00:00:00.000Z",
  taggedBy: "manual", // "manual" | "auto" in future
  
  // Timestamps
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

### Component Structure
```
views/
  Organizer.vue                 // Main organizer page
components/features/organizer/
  FileList.vue                  // File list display component
  FileListItem.vue              // Individual file row component
  TagInput.vue                  // Tag input/management component
  FileFilter.vue                // Search/filter interface
```

### Store Integration
```javascript
// New Pinia store for organizer functionality
stores/organizer.js
- fileList: [] // Array of file objects with tags
- filteredFiles: [] // Computed filtered results
- filterText: "" // Current filter string
- actions: fetchFiles(), updateFileTags(), filterFiles()
```

## Existing Codebase Assessment

### Current Organizer Files (Lines of Code)
- `FileListItem.vue`: 16 lines (skeleton with TODO comments)
- `FileSearch.vue`: 16 lines (skeleton with TODO comments)  
- `useFileSearch.js`: 44 lines (partial implementation with basic search logic)
- Additional skeleton files: `FileGrid.vue`, `FilePreview.vue`, `FileDetails.vue`, `ViewModeToggle.vue`, `FileTypeFilters.vue` (all basic skeletons)
- Composables: `useFileViewer.js`, `useFilePreview.js`, `useViewerNavigation.js` (skeleton files)
- Utils: `fileViewerUtils.js`, `previewGenerators.js` (skeleton files)

**Total Existing**: ~15 skeleton files with approximately 200 lines of placeholder code

### Integration Points
- Existing upload system uses hash-based file identification
- Firebase Storage already configured and working
- Authentication system with team-based isolation (teamId === userId for solo users)
- Vuetify components and styling system established

## Implementation Steps

### Step 1: Data Layer Setup (High Complexity)
**Breaking Risk Level**: Medium  
**Dependencies**: None  
**Internet Research Summary**: Based on Firebase documentation and 2024 best practices, optimal Firestore collection patterns recommend using lowerCamelCase field names, avoiding sequential document IDs to prevent hotspots, and implementing subcollections for hierarchical data. For file metadata, the recommendation is to denormalize data for query performance while keeping documents under 1MB. The pattern of using hash-based IDs (already implemented in upload system) aligns with best practices for avoiding monotonically increasing IDs that can cause latency issues.

**Rollback Mechanism**: All data model changes are additive only. Evidence collection can be deleted without affecting upload functionality. Firestore security rules can be reverted to previous state if needed.

- [ ] Create new Evidence collection in Firestore at `/teams/{teamId}/evidence/`
- [ ] Design evidence document schema with storage references
- [ ] Create migration script to populate Evidence from existing uploads:
  ```javascript
  // Migration approach:
  // 1. Query all existing files in /teams/{teamId}/matters/*/metadata/
  // 2. For each unique fileHash, create one Evidence entry
  // 3. Set storageRef to point to existing file location
  // 4. Initialize with empty tags array and isProcessed: false
  ```
- [ ] Update Firestore security rules for Evidence collection
- [ ] Create Pinia store for evidence management (separate from upload store)

### Step 2: Core Components (Low Complexity)
**Breaking Risk Level**: Low  
**Dependencies**: Step 1 (data layer)  

- [ ] Enhance existing `Organizer.vue` view component  
- [ ] Build `FileList.vue` component for displaying files
- [ ] Complete implementation of existing `FileListItem.vue` skeleton (currently 16 lines)
- [ ] Create `TagInput.vue` component for tag management

### Step 3: Tag Management System (High Complexity)
**Breaking Risk Level**: Medium
**Dependencies**: Step 1, Step 2  
**Internet Research Summary**: Vue 3 tag input best practices for 2024 recommend using established UI libraries (PrimeVue, Vuetify, Shadcn/Vue) for production applications. Vuetify's chip component provides built-in accessibility with proper ARIA labels and keyboard navigation. Custom implementations should leverage Composition API with composable patterns for reusability. The recommended pattern includes reactive tag arrays, input validation, and proper event handling for add/remove operations.

**Rollback Mechanism**: Tag functionality can be disabled via feature flag. Firestore writes for tags can be wrapped in try/catch with rollback to previous tag state on failure.

- [ ] Implement tag input interface with add/remove functionality
- [ ] Create tag display with visual indicators using Vuetify chips
- [ ] Add tag persistence to Firestore
- [ ] Implement optimistic UI updates for tag changes

### Step 4: Search and Filter (Low Complexity)  
**Breaking Risk Level**: Low
**Dependencies**: Step 2, Step 3  

- [ ] Complete existing `FileSearch.vue` skeleton component (currently 16 lines)
- [ ] Enhance existing `useFileSearch.js` composable (currently 44 lines with basic logic)
- [ ] Implement real-time filtering logic in store
- [ ] Add filter state management and persistence

### Step 5: Navigation and Routing (Low Complexity)
**Breaking Risk Level**: Low  
**Dependencies**: Step 2

- [ ] Add "Organizer" route to Vue Router configuration
- [ ] Update navigation sidebar with Organizer link  
- [ ] Implement route guards for authentication
- [ ] Add proper page titles and meta information

### Step 6: Integration with Existing System (High Complexity)
**Breaking Risk Level**: High  
**Dependencies**: Step 1, Step 5  
**Internet Research Summary**: VueFire (official Vue.js Firebase bindings) provides the recommended 2024 approach for Firebase Storage integration with Vue 3. The `useStorageFile()`, `useStorageFileUrl()`, and `useStorageFileMetadata()` composables offer reactive bindings that automatically sync metadata changes. The pattern involves importing composables from VueFire and using reactive references for file operations, which aligns with our existing Firebase setup.

**Rollback Mechanism**: Integration changes can be isolated behind feature flags. Existing upload functionality remains unchanged. If metadata sync fails, system falls back to upload-only mode. Database queries can be reverted to original upload system patterns.

- [ ] Connect to existing Firebase storage system using VueFire patterns
- [ ] Leverage existing file upload metadata without breaking current functionality
- [ ] Ensure team-based data isolation maintains existing security model
- [ ] Test integration with existing authentication system

### Step 7: Testing and Polish (Medium Complexity)
**Breaking Risk Level**: Low  
**Dependencies**: All previous steps  

- [ ] Write unit tests for new components  
- [ ] Add E2E tests for organizer workflow
- [ ] Test with large file collections
- [ ] Performance optimization and loading states

## File Structure

### Files to Enhance (Already Exist as Skeletons)
```
src/features/organizer/
├── components/
│   ├── FileListItem.vue (16 lines → enhance)
│   ├── FileSearch.vue (16 lines → enhance)  
│   ├── FileGrid.vue (skeleton → enhance for list view)
│   └── FileDetails.vue (skeleton → enhance for tag display)
├── composables/
│   ├── useFileSearch.js (44 lines → enhance)
│   └── useFileViewer.js (skeleton → enhance)
└── views/
    └── FileViewer.vue (skeleton → repurpose as main Organizer view)
```

### New Files to Create
```
src/features/organizer/
├── components/
│   └── TagInput.vue (new)
├── stores/
│   └── organizer.js (new)
├── services/
│   └── organizerService.js (new)
└── composables/
    └── useOrganizer.js (new)
```

## User Interface Design

### Layout Structure
- Header with search/filter bar
- Main content area with file list table
- Each row shows: filename, file type icon, upload date, tags, actions
- Tag display as small chips/badges
- Inline tag editing capability

### Vuetify Components
- `v-data-table` or `v-list` for file listing
- `v-chip` for tag display
- `v-text-field` for search and tag input
- `v-icon` for file type indicators
- `v-card` for overall layout container

## Data Flow

1. **File Loading**: Organizer store fetches file metadata from Firestore on mount
2. **Tag Assignment**: User clicks tag input → opens inline editor → saves to Firestore → updates local state
3. **Filtering**: User types in search → store computes filtered results → UI updates reactively
4. **Tag Management**: Add/remove tags → optimistic UI update → Firestore write → error handling

## Testing Strategy

### Unit Tests
- Store actions and getters
- Component prop handling and events
- Tag input validation and formatting
- Filter logic correctness

### Integration Tests
- Firestore data operations
- Authentication integration
- Route navigation and guards
- Cross-component data flow

### E2E Tests
- Complete organizer workflow
- Tag assignment and search
- Integration with existing upload system
- Performance with multiple files

## Single Source of Truth Compliance

### Data Architecture
- **Primary Source**: Existing upload system hash-based file identification remains authoritative
- **Metadata Extension**: Tags stored as additional field in existing file documents, not separate collection
- **Firestore Integration**: Leverages existing file metadata structure to avoid duplication
- **No Data Duplication**: Tag data extends existing documents rather than creating parallel storage

### Reference Integration
- File metadata continues using existing Firebase Storage references
- Tag data stored in same Firestore documents as existing upload metadata
- Upload system remains unchanged and authoritative for file operations
- Organizer reads from single source rather than creating separate data stores

## Performance Considerations

### Initial Implementation (v1.0 Scope Only)
- Simple approach suitable for moderate file collections (100-1000 files)
- Client-side filtering for responsive UI
- Basic loading states during data fetch
- **No premature optimization** - defer performance enhancements to later versions

### Explicitly Deferred to Future Versions
- Virtual scrolling for large collections (planned for v1.9)
- Server-side filtering for very large datasets  
- Lazy loading of file metadata
- Caching strategies for frequently accessed data

## Security Requirements

### Firestore Rules
```javascript
// Ensure users can only access their own team's files
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fileMetadata/{fileId} {
      allow read, write: if request.auth != null 
        && resource.data.teamId == request.auth.uid;
    }
  }
}
```

### Data Validation
- Sanitize tag input to prevent XSS
- Validate file access permissions
- Ensure team isolation in all operations

## Migration Strategy

### Existing File Indexing
```javascript
// On first Organizer access:
// 1. Check if user has un-indexed files (files without taggedBy field)
// 2. Batch create/update metadata documents with empty tags array
// 3. Show one-time "Indexing files..." progress modal
// 4. Set taggedBy: "manual" and tagCount: 0 for all existing files
// 5. Cache indexing completion in localStorage to avoid re-runs
```

## Integration Points

### Existing Systems
- **Upload System**: Leverage existing file metadata and hash-based deduplication
- **Authentication**: Use existing team-based isolation (teamId === userId for solo users)
- **Storage**: Connect to existing Firebase Storage for file access
- **Routing**: Integrate with existing Vue Router and navigation

### Future Versions
- Tag structure extensible to category-based system (v1.1)
- Component architecture supports AI integration (v1.3)
- Data model compatible with confidence scoring (v1.4)
- UI framework supports virtual folder views (v1.2)

## Success Criteria

### Functional Requirements
- [ ] Users can view all uploaded files in organized list
- [ ] Users can assign text-based tags to any file
- [ ] Users can search/filter files by tag text
- [ ] System maintains existing upload functionality
- [ ] All operations respect team-based data isolation

### Performance Requirements
- [ ] File list loads within 2 seconds for 100 files
- [ ] Tag filtering responds within 500ms
- [ ] Tag assignment saves within 1 second
- [ ] UI remains responsive during all operations

### User Experience Requirements
- [ ] Intuitive interface requiring minimal learning
- [ ] Consistent with existing application design patterns
- [ ] Clear visual feedback for all user actions
- [ ] Graceful error handling and recovery

## Risk Mitigation

### Technical Risks
- **Large File Collections**: Start with client-side filtering, monitor performance
- **Concurrent Tag Updates**: Implement optimistic updates with rollback capability
- **Firestore Costs**: Monitor query patterns and implement pagination if needed

### User Experience Risks
- **Feature Discoverability**: Clear navigation and introductory help text
- **Tag Management Complexity**: Keep v1.0 simple, defer advanced features to later versions
- **Data Migration**: Ensure existing uploaded files are properly indexed

## Documentation Requirements

### Developer Documentation
- Component API documentation
- Store structure and actions
- Data model and relationships
- Testing guidelines and examples

### User Documentation
- Feature introduction and benefits
- Step-by-step usage guide
- Tag best practices
- Integration with existing workflow

## Deployment Strategy

### Development Phases
1. **Local Development**: Build and test all components in isolation
2. **Integration Testing**: Test with existing system on development Firebase
3. **User Acceptance Testing**: Deploy to staging environment for feedback
4. **Production Deployment**: Roll out with feature flag capability

### Rollback Plan
- Feature toggle for organizer navigation item
- Database schema changes are additive only
- Component lazy loading allows graceful fallback
- Separate service worker for organizer-specific functionality

## Timeline Estimation

### Week 1: Foundation
- Data model design and Firestore setup
- Basic component structure
- Store implementation and integration

### Week 2: Core Features
- File list display and tag input
- Basic search/filter functionality
- Navigation integration

### Week 3: Polish and Testing
- UI refinement and responsive design
- Comprehensive testing suite
- Performance optimization and error handling

### Total Estimated Duration: 3 weeks

This implementation plan provides the foundation for all future Organizer versions while delivering immediate value through manual document organization capabilities.