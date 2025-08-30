# Organizer Feature Reference Document

## Overview

The **Organizer** is an AI-powered document discovery and organization system designed to help users find previously uploaded files through intelligent categorization and flexible viewing interfaces. Rather than traditional folder storage, it uses a tag-based flat storage system with virtual folder presentations optimized for legal document management workflows.

## Core Purpose

**Primary Goal**: Enable users to quickly locate previously uploaded documents through intuitive search and categorization methods.

**Target Use Cases**:
- Finding bank statements by institution and account details
- Locating photographs by location and date
- Tracking document relationships (amendments, responses to letters)
- Organizing documents for legal disclosure and trial preparation

## Architecture Overview

### Storage Strategy
- **File Storage**: Continues using Storage 1 (existing Firebase Storage)
- **Evidence Database**: New Firestore collection for organization metadata
- **Reference Architecture**: Evidence entries point to files via fileHash
- **No File Duplication**: Multiple evidence entries can reference same stored file
- **Processing States**: Evidence tracks document through processing workflow

### Processing Workflow
1. **Manual Trigger**: Users select folders/batches for AI processing (not automatic)
2. **AI Categorization**: Gemini multimodal API processes all file types uniformly
3. **Confidence-Based Routing**: High confidence → auto-categorized, low confidence → human review
4. **Context-Enhanced Processing**: Medium confidence files use previously categorized documents as examples

## Tag System Design

### Category Structure
- **Categories**: User-defined groupings (e.g., "Document Type", "Date", "Institution")
- **Tags**: Mutually exclusive options within each category (e.g., "Invoice", "Statement", "Contract")
- **Color Coding**: Each category assigned distinct colors with gradient/border variations for scalability

### Tag Management
- **User-Defined Categories**: Users create custom categories with their own tag options
- **Configurable Mutual Exclusivity**: Categories can be set as mutually exclusive (one tag per document) or allow multiple tags
  - Examples: Document Type (mutually exclusive), Keywords (multiple allowed)
  - User configurable per category during creation/editing
- **Add/Delete Operations**: 
  - Adding tags prompts for reprocessing existing documents
  - Deleting tags requires reassignment decision for affected files
- **Merge Capability**: Achieved through delete operations with reprocessing options

### AI Processing Approach
- **Unified Processing**: All file types processed through Gemini's multimodal capabilities
- **No File-Type Optimization**: Avoid premature optimization that becomes obsolete as AI improves
- **No Size Limits**: Large files processed normally; testing will determine practical constraints
- **Enhanced AI Suggestions**: AI provides up to 3 tag suggestions per category with individual confidence levels
- **Rich Data Structure**: AI suggestions stored with confidence levels, human overrides, and reviewer attribution
- **Priority-Based Processing**: All processed documents enter review queue ordered by confidence (lowest first)
- **Context-Enhanced Processing**: Uses previously reviewed examples to improve accuracy over time

## User Interface Design

### Flat View (Default)
- **File List**: Filename, file extension, document date, all applicable tags
- **Color-Coded Tags**: Tags colored by category for visual grouping
- **Progressive Disclosure**: Right-click any tag → "Show in Folders" creates virtual folder structure

### Virtual Folder View
- **Dynamic Hierarchy**: User-selected tag categories become folder levels
- **Filtered Display**: Only relevant tags shown (folder context already established)
- **Navigation**: Breadcrumbs + back buttons for easy hierarchy traversal
- **Instant Reorganization**: Change folder hierarchy instantly (just re-presenting same tag data)

### File Actions (KISS Principle)
- **View**: Document viewer with zoom, pagination (PDFs)
- **Print to PDF**: BATES-stamped output (not raw download)
- **No Thumbnails**: Keep interface fast and simple for document-focused workflow

## Human Review System

### Priority-Based Review (No Arbitrary Thresholds)
- **Smart Review Queue**: Documents ordered by AI confidence level (lowest first)
- **Natural Threshold Discovery**: Users review until errors become rare, finding their own comfort level
- **Rich AI Suggestions**: Up to 3 tag suggestions per category with individual confidence levels
- **Review Interface**: 
  - Top 3 AI suggestions with confidence percentages per category
  - "Other" option for complete misclassification
  - "Create New Category" for expanding taxonomy
  - Human override tracking with reviewer identification

### Enhanced Data Structure
- **Multi-Suggestion Support**: AI provides multiple tag options per category instead of single suggestions
- **Confidence Tracking**: Individual confidence levels for each suggested tag
- **Human Override Recording**: Tracks what humans actually chose vs AI suggestions
- **Reviewer Attribution**: Records which user made review decisions for audit trails

### Learning Approach
- **No Model Training**: System doesn't fine-tune or retrain AI models
- **Context Enhancement**: Uses human-reviewed examples as context for future medium-confidence decisions
- **Human Priority**: Human classifications weighted higher than AI classifications in context examples
- **Performance Analytics**: Rich data enables analysis of AI accuracy vs human decisions over time

## BATES Numbering System

### Legal Workflow Integration
- **Print-Only Access**: No raw downloads; only BATES-stamped PDF prints
- **Disclosure Control**: Prevent confusion about document processing status in legal proceedings
- **Format Flexibility**: [Optional Letter Prefix]-[Optional Document Number]-[Sequential Number]
  - Examples: "Roberts-0001", "1.22-0003", "Plaintiff-1.22-0003"

### Numbering Rules
- **Sequential by Matter**: Each prefix/matter maintains independent sequential numbering
- **Immutable Assignment**: BATES numbers "pencilled in" after processing, "inked" after first print
- **Reprint Consistency**: Same document always prints same BATES number
- **No Reassignment**: Once printed, BATES number permanently locked
- **Reset Protection**: New prefix required for numbering resets; old prefixes never reused

### Deduplication Integration
- **Hash-Based Prevention**: Upload system prevents duplicate file uploads
- **Near-Duplicate Handling**: Similar but different files each receive unique BATES numbers

## Integration with Document Processing Workflow

### Evidence Database Role
- **Central Registry**: All processed documents tracked in Evidence database
- **Processing Status**: Tracks files through upload → split → merge pipeline
- **Quality Tracking**: Records hasAllPages and completeness status
- **Multi-Storage Support**: References files across uploads/split/merged folders

### Version 1.0 Preparation
- Evidence schema includes processing fields (unused in v1.0)
- Storage reference structure supports future split/merged folders
- Processing status defaults to "uploaded" for all v1.0 entries
- Future versions update these fields without schema changes

## Technical Implementation Approach

### AI Integration
- **Primary API**: Google Gemini for multimodal document processing
- **Processing Strategy**: Let Gemini handle file-type optimization internally
- **Future-Proof Design**: Avoid custom optimization that becomes obsolete as AI improves

### Data Storage
- **Firebase Integration**: Leverage existing authentication and storage infrastructure
- **Evidence Database**: New Firestore collection `/teams/{teamId}/evidence/`
- **Storage References**: Evidence documents reference files via:
  - `storageRef.storage`: Which storage folder (uploads/split/merged)
  - `storageRef.fileHash`: Unique file identifier
- **Display References**: Evidence points to specific metadata records via:
  - `displayCopy.metadataHash`: Points to chosen originalMetadata record
  - `displayCopy.folderPath`: User-chosen folder path from that record
- **Processing Metadata**: Evidence tracks isProcessed, hasAllPages, processingStage
- **Tag Storage**: Separated by source (tagsByAI, tagsByHuman arrays)
- **Team Isolation**: All data scoped by team ID (solo users: teamId === userId)

### Performance Considerations
- **Background Processing**: AI calls handled asynchronously with progress tracking
- **Instant UI Updates**: Virtual folder reorganization requires no backend processing
- **Scalable Visuals**: Gradient colors and borders provide unlimited category combinations

## User Stories

### Document Discovery Stories

**As a lawyer, I want to find bank statements by institution and account details**
- Given I have uploaded hundreds of financial documents
- When I need to find Royal Bank of Canada statements for account ending in 334
- Then I can use tags to filter by "Institution: RBC" and "Account: ...334"
- So that I can quickly locate the specific statements without manually searching through files

**As a legal professional, I want to locate photographs by location and date**
- Given I have uploaded many photographs as evidence
- When I need to find photos taken at Whistler Mountain in June 2017
- Then I can filter by "Location: Whistler Mountain" and "Date: June 2017" tags
- So that I can present the relevant photographic evidence

**As a lawyer, I want to track document relationships and follow-ups**
- Given I sent a letter requesting information and never received a response
- When I need to follow up on unanswered correspondence
- Then I can search for my original letter and check for any response documents
- So that I can determine how long the request has been pending and take appropriate action

**As a legal professional, I want to find all amendments to a contract**
- Given I have a promissory note with multiple amendments
- When I need to review all versions and modifications
- Then I can find the original document and all related amendment documents
- So that I have a complete view of the document's evolution

### Category Management Stories

**As a user, I want to create custom document categories**
- Given I have unique document types specific to my practice
- When I create a new "Document Type" category
- Then I can define custom tags like "Affidavit", "Motion", "Brief"
- So that my organization system matches my specific workflow needs

**As a user, I want to add new tag options to existing categories**
- Given I encounter a new type of document not in my current system
- When I add a "Receipt" tag to my "Document Type" category
- Then the system asks if I want to reprocess existing documents
- So that previously uploaded receipts can be properly categorized

**As a user, I want to merge duplicate category options**
- Given I created both "Invoice" and "Bill" tags but realize they're the same
- When I delete the "Bill" tag and choose to reprocess affected documents
- Then all documents previously tagged as "Bill" are reconsidered for "Invoice"
- So that I can consolidate my categorization scheme without losing data

### AI Processing Stories

**As a user, I want to process documents in batches by category type**
- Given I have uploaded a folder of mixed financial documents
- When I select the folder and choose "Document Type" processing
- Then the AI categorizes documents as statements, invoices, receipts, etc.
- So that I can organize large batches efficiently without manual sorting

**As a user, I want to review uncertain AI classifications**
- Given the AI is less than 90% confident about some document categorizations
- When I access the "Human Review Required" folder
- Then I see the top 3 AI suggestions with confidence percentages
- So that I can quickly correct misclassifications and improve system accuracy

**As a user, I want the system to learn from my corrections**
- Given I have manually classified several uncertain documents
- When the AI processes similar documents with medium confidence
- Then it uses my previous classifications as context examples
- So that the system becomes more accurate for my specific document types

### Interface Navigation Stories

**As a user, I want to start with a comprehensive flat view**
- Given I have many documents with various tags
- When I first access the organizer
- Then I see all files with color-coded tags by category
- So that I can understand my entire document collection at a glance

**As a user, I want to create folder views by clicking on tags**
- Given I see documents with various "Document Type" tags in flat view
- When I right-click on a "Statement" tag and select "Show in Folders"
- Then my view reorganizes into folders by document type
- So that I can browse documents in a familiar folder structure

**As a user, I want to drill down through multiple folder levels**
- Given I have organized by "Document Type" and want to sub-organize by date
- When I right-click on a "2023" tag and select "Show in Folders"
- Then I get a hierarchy like "Statement > 2023 > March"
- So that I can narrow down to very specific document sets

**As a user, I want to instantly reorganize my folder hierarchy**
- Given I have documents organized by Type > Date
- When I decide I want them organized by Date > Type instead
- Then the reorganization happens instantly without processing delays
- So that I can experiment with different organizational schemes efficiently

### BATES Numbering Stories

**As a lawyer, I want to print documents with BATES stamps for disclosure**
- Given I need to provide document disclosure for trial
- When I print any document from the organizer
- Then it includes a BATES number like "Roberts-0001" 
- So that I can track disclosed documents and prevent disclosure confusion

**As a legal professional, I want consistent BATES numbering per matter**
- Given I'm working on multiple legal matters
- When I set different prefixes for each case (e.g., "Smith-", "Jones-")
- Then each case maintains its own sequential numbering
- So that documents are properly organized by matter

**As a lawyer, I want permanent BATES number assignment**
- Given I've printed a document with BATES number "Roberts-0001"
- When I print the same document again later
- Then it always prints with the same BATES number
- So that I maintain consistency in legal proceedings

**As a user, I want protection against BATES numbering mistakes**
- Given I need to restart my BATES numbering due to an error
- When I create a new prefix for the same matter
- Then the old prefix is permanently retired and cannot be reused
- So that there's no confusion about which numbering sequence is current

### Human Review Interface Stories

**As a user, I want simple review options for uncertain documents**
- Given the AI presents a document with uncertain classification
- When I see the 3 AI suggestions plus "Other" and "Create New Category" buttons
- Then I can quickly select the correct option or create a new one
- So that document review is fast and doesn't interrupt my workflow

**As a user, I want to create new categories during review**
- Given I encounter a document type not in my current system
- When I click "Create New Category" during human review
- Then the system asks if I want to reprocess other documents for this new category
- So that I can expand my taxonomy as I discover new document types

### Legal Workflow Stories

**As a lawyer, I want to prevent raw document downloads**
- Given clients or opposing parties might create confusion with untracked copies
- When I access any document in the organizer
- Then I can only print BATES-stamped versions, not download raw files
- So that all document copies in circulation are properly tracked and identified

**As a legal professional, I want to track document processing history**
- Given I need to verify whether documents have been properly processed
- When I review any document's metadata
- Then I can see whether it was classified by AI or human review
- So that I can ensure quality control in my document management process

## User Experience Flow

### Initial Setup
1. User uploads documents through existing upload feature
2. Documents appear in flat view with basic metadata
3. User creates categories and defines tag options
4. User selects document batches for AI processing

### Processing Workflow
1. User selects folder/batch and processing category
2. AI processes documents with confidence-based routing
3. High confidence: Auto-categorized
4. Medium confidence: Context-enhanced processing using previous examples
5. Low confidence: Routed to human review folder
6. User reviews uncertain classifications via simple 5-button interface

### Organization and Discovery
1. User starts in flat view seeing all tags
2. Right-click any tag → "Show in Folders" to create hierarchy
3. Navigate through virtual folder structure
4. Find target document and view/print with BATES numbering

## Success Metrics

### User Efficiency
- Time to locate specific documents
- Reduction in manual file organization effort
- Accuracy of AI categorization after context enhancement

### Legal Workflow Support
- Document disclosure completeness
- BATES numbering consistency
- Prevention of duplicate processing confusion

### System Performance
- AI processing accuracy by confidence threshold
- User override rates in human review
- Virtual folder reorganization response times

## Future Enhancements

### Automation Options
- Optional automatic processing mode when AI reliability improves
- User-configurable automation rules and triggers

### Advanced Features
- Cross-document relationship tracking
- Bulk download with virtual folder structure preservation
- Integration with external legal case management systems
- **Enhanced Category Configuration**: Per-category mutual exclusivity settings with visual indicators
  - UI toggle in category creation/editing forms
  - Visual badges showing category behavior (exclusive vs. multiple)
  - Bulk category behavior updates with data migration options

### Scalability
- Multi-user team support (extending solo team architecture)
- Advanced search across tag combinations
- Audit trails for document access and modifications

## Technical Dependencies

### External Services
- Google Gemini API for multimodal document processing
- Firebase Auth/Firestore/Storage for data management

### Existing Codebase Integration
- Builds on established upload feature and deduplication system
- Leverages existing Vue 3/Vuetify component architecture
- Integrates with solo team authentication model

### Development Approach
- Follow KISS principle throughout implementation
- Prefer simple solutions over premature optimization
- Focus on legal workflow requirements and user experience