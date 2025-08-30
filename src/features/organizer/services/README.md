# Evidence Services Decomposition

This directory contains the decomposed evidence services, split from the original monolithic `evidenceService.js` file (395 lines) into two focused services.

## Services Overview

### 1. evidenceService.js (269 lines)
**Core CRUD operations for evidence documents**

**Responsibilities:**
- Creating evidence documents from upload metadata
- Updating evidence properties (tags, display name, processing stage)
- Deleting evidence documents  
- Basic document retrieval by ID
- Batch operations

**Key Methods:**
- `createEvidenceFromUpload()` - Create single evidence document
- `createEvidenceFromUploads()` - Batch create evidence documents
- `updateTags()` - Update document tags
- `updateDisplayName()` - Update display name
- `updateProcessingStage()` - Update processing workflow stage
- `deleteEvidence()` - Delete evidence document
- `getEvidence()` - Get evidence by ID

### 2. evidenceQueryService.js (287 lines)
**Query, search, and migration operations**

**Responsibilities:**
- Finding and searching evidence documents
- Complex queries by various criteria
- Statistics and analytics
- Data migration operations
- Bulk retrieval operations

**Key Methods:**
- `findEvidenceByHash()` - Find documents by file hash
- `findEvidenceByTags()` - Find documents by tags (AND/OR logic)
- `findEvidenceByProcessingStage()` - Find documents by processing stage
- `findUnprocessedEvidence()` - Get unprocessed documents queue
- `getAvailableOriginalNames()` - Get original filenames for dropdown
- `getEvidenceStatistics()` - Get collection statistics
- `searchEvidenceByText()` - Text search across document fields
- `migrateUploadsToEvidence()` - Migrate existing upload metadata
- `getAllEvidence()` - Get all evidence with pagination

### 3. index.js (83 lines)
**Unified access and convenience wrapper**

**Features:**
- Exports both services for individual use
- `EvidenceManager` class providing unified API
- Maintains backward compatibility for consumers
- Delegates methods to appropriate underlying service

## Usage Patterns

### Individual Service Usage
```javascript
import { EvidenceService } from './services/evidenceService.js';
import { EvidenceQueryService } from './services/evidenceQueryService.js';

const evidenceService = new EvidenceService(teamId);
const evidenceQuery = new EvidenceQueryService(teamId);

// Create evidence
const evidenceId = await evidenceService.createEvidenceFromUpload(metadata);

// Search evidence
const results = await evidenceQuery.findEvidenceByHash(fileHash);
```

### Unified Manager Usage
```javascript
import { EvidenceManager } from './services/index.js';

const manager = new EvidenceManager(teamId);

// Create evidence (delegates to evidenceService)
const evidenceId = await manager.createEvidenceFromUpload(metadata);

// Search evidence (delegates to evidenceQueryService)
const results = await manager.findEvidenceByHash(fileHash);
```

### Direct Exports Usage  
```javascript
import { EvidenceService, EvidenceQueryService } from './services/index.js';
// Same as individual imports but from single entry point
```

## Design Principles

### Separation of Concerns
- **EvidenceService**: Write operations and basic retrieval
- **EvidenceQueryService**: Read operations and complex queries

### Interface Consistency
- Maintained exact same method signatures as original service
- Existing consumers require no changes
- All error handling and logging patterns preserved

### Service Composition
- EvidenceQueryService imports and uses EvidenceService for migration operations
- Clean dependency flow: Query service depends on Core service
- No circular dependencies

## Performance Benefits

### Reduced Bundle Size
- Applications only need to import required functionality
- Query-heavy apps can skip CRUD service imports
- CRUD-only apps can skip query service imports

### Better Code Organization
- Easier to locate specific functionality
- Clearer separation of responsibilities
- Simplified testing and maintenance

## Backward Compatibility

All existing imports and usage patterns continue to work:
- `useFileMetadata.js` continues to work unchanged
- Method signatures and return types identical
- Error handling and logging patterns preserved
- Firebase collection patterns maintained

## Future Extensibility

The decomposed structure makes it easy to:
- Add new query methods without affecting CRUD operations
- Extend CRUD operations without impacting query performance
- Implement caching strategies per service type
- Add specialized services (e.g., EvidenceAnalyticsService)