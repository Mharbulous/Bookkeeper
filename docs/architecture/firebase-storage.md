# Firebase Storage Structure

Last Updated: 2025-08-31

## Overview

Firebase Storage structure for file storage with automatic deduplication based on file hash. This document describes the current storage organization and reserved folders for future processing workflows.

## File Storage Paths

**Purpose**: Store actual file content with automatic deduplication based on file hash

```
/teams/{teamId}/matters/{matterId}/uploads/{fileHash}.{extension}
```

**Key Features**:

- **Content Deduplication**: Identical files (same hash) stored only once
- **Multi-Reference**: Single storage file can be referenced by multiple metadata records
- **Matter-Scoped**: Files organized under specific matters for proper access control
- **Extension Preservation**: Original file extensions maintained for proper file handling

**Examples**:

```
/teams/team-abc-123/matters/general/uploads/abc123def456789abcdef012345.pdf
/teams/team-abc-123/matters/matter-001/uploads/xyz789ghi012345fedcba678901.docx
/teams/solo-user-789/matters/general/uploads/def456abc123789012345abcdef.jpg
```

**Storage Efficiency**:

- Same file uploaded to multiple matters = single storage file + multiple metadata records
- Same file with different original names = single storage file + multiple metadata records
- Perfect deduplication while preserving all metadata variations

## Processing Folders

**Purpose**: Organize files based on processing status and operations performed

The following folders are reserved for future file processing workflows:

### OCRed Files: `/teams/{teamId}/matters/{matterId}/OCRed/`

**Purpose**: Store files that have been processed through Optical Character Recognition

- Contains text-searchable versions of scanned documents
- Maintains original file hash for deduplication
- Enables full-text search capabilities

### Split Files: `/teams/{teamId}/matters/{matterId}/split/`

**Purpose**: Store files that have been split from larger documents

- Contains individual pages or sections from multi-page documents
- Each split file gets its own hash and metadata record
- Maintains reference to original source file

### Merged Files: `/teams/{teamId}/matters/{matterId}/merged/`

**Purpose**: Store files that have been merged from multiple source files

- Contains consolidated documents created from multiple inputs
- New hash generated for merged content
- Metadata tracks all source files used in merge operation

## Processing Workflow

```
Original Upload → /uploads/
     ↓
OCR Processing → /OCRed/
     ↓
Document Split → /split/
     ↓
File Merging → /merged/
```

**Note**: These processing folders are documented for future implementation. Current file uploads use the `/uploads/` folder exclusively.

## Storage Path Examples

### Team-Based Organization

**Corporate Team Example**:
```
/teams/team-acme-law-123/
  ├── matters/
  │   ├── general/
  │   │   └── uploads/
  │   │       ├── abc123def.pdf (company policy)
  │   │       └── xyz789ghi.docx (general memo)
  │   ├── matter-001/
  │   │   └── uploads/
  │   │       ├── def456abc.pdf (client contract)
  │   │       └── ghi789def.jpg (evidence photo)
  │   └── matter-002/
  │       └── uploads/
  │           └── jkl012mno.pdf (case filing)
```

**Solo User Example**:
```
/teams/user-john-456/  (teamId === userId for solo users)
  └── matters/
      └── general/
          └── uploads/
              ├── personal-doc-123.pdf
              ├── tax-form-456.pdf
              └── receipt-789.jpg
```

## Deduplication Examples

### Same File, Multiple Contexts

**Scenario**: Same contract uploaded to multiple matters

**Storage**: Single file at one location
```
/teams/team-abc-123/matters/matter-001/uploads/abc123def456.pdf
```

**File Metadata**: Multiple metadata records preserve different contexts as documented in **[FileMetadata.md](./FileMetadata.md)**

### Same File, Different Names

**Scenario**: File with different original names (renamed on filesystem)

**Storage**: Single file (same content hash)
```
/teams/team-abc-123/matters/general/uploads/abc123def456.pdf
```

**File Metadata**: Different metadata records for each name variation as documented in **[FileMetadata.md](./FileMetadata.md)**

## Access Control Integration

### Firebase Storage Security Rules

Storage paths align with Firestore security model:

```javascript
// Storage security rules (conceptual)
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

### Path-Based Access Control

- **Team Isolation**: Each team's files stored under `/teams/{teamId}/`
- **Matter-Scoped**: Files organized by matter for granular access
- **Solo User Support**: Solo users (`teamId === userId`) get private storage
- **Consistent Patterns**: Storage paths mirror Firestore document paths

## Storage Optimization Features

### Automatic Deduplication

1. **Content-Based**: Files with identical SHA-256 hashes stored once
2. **Metadata Preservation**: Multiple metadata records for different contexts
3. **Reference Counting**: Multiple evidence documents can reference same file
4. **Storage Efficiency**: Significant space savings for duplicate files

### Path Normalization

- **Consistent Structure**: All paths follow `/teams/{teamId}/matters/{matterId}/` pattern
- **Extension Preservation**: Original file extensions maintained for proper handling
- **Hash-Based Names**: File names use content hash to ensure uniqueness
- **Cross-Platform**: Forward slashes used regardless of client OS

## Future Processing Integration

### Document Processing Pipeline

When document processing is implemented:

1. **Original Files**: Remain in `/uploads/` for reference
2. **OCR Processing**: Text-searchable versions in `/OCRed/`
3. **Document Splitting**: Page/section splits in `/split/`
4. **File Merging**: Combined documents in `/merged/`

### Processing Status Tracking

File processing status is tracked in collections documented in **[FileMetadata.md](./FileMetadata.md)**

### Workflow Integration

Processing folders enable:
- **Audit Trails**: Track document transformations
- **Version Control**: Maintain original and processed versions
- **Quality Assurance**: Verify processing completeness
- **Rollback Capability**: Return to original files if needed