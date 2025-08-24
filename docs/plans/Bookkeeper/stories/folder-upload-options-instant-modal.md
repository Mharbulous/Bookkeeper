# User Story: Instant Folder Upload Options Modal

## Story ID
`folder-upload-options-instant-modal`

## User Story
**As a** user  
**I want** to see the "Folder Upload Options" modal appear instantly when I drag and drop a folder  
**So that** I know that my action has been received and progress is being made.

## Acceptance Criteria

### Modal Appearance
- [✅] Modal appears instantly upon folder drag and drop
- [✅] No delay or loading state before modal visibility

### Default State
- [✅] Radio buttons default to "This folder only" option selected
- [✅] Continue button initially shows disabled state with spinner icon
- [✅] "Include subfolders" radio button initially disabled during calculations

### Real-time Updates
- [ ] Predictor data points update in real time as calculations are performed
- [ ] Progress indicators show calculation status for both options

### "This Folder Only" Flow
- [ ] When "This folder only" calculations complete:
  - [ ] Continue button becomes enabled
  - [ ] Spinner icon is replaced with "Continue" text
  - [ ] Button remains enabled only while "This folder only" is selected

### "Include Subfolders" Flow
- [ ] "Include subfolders" radio button remains disabled during calculations
- [ ] When "Include subfolders" calculations complete:
  - [ ] Radio button becomes enabled/active
  - [ ] Selection automatically switches from "This folder only" to "Include subfolders"
  - [ ] After ~1 second delay, Continue button becomes enabled (spinner → "Continue" text)

## Technical Context

### Related Files
- `src/components/features/upload/FolderOptionsDialog.vue` - Main modal component
- `src/composables/useFolderOptions.js` - Folder analysis logic
- `src/views/FileUpload.vue` - Upload interface
- `src/utils/fileAnalysis.js` - 3-phase time estimation system

### Current Implementation Status
Based on recent commits, the modal has been debugged to appear instantly with spinner icons as placeholders for predictors. This story builds on that foundation to refine the user experience.

## Definition of Done
- [ ] Modal appears instantly without delay
- [ ] All acceptance criteria are met
- [ ] Real-time updates work smoothly
- [ ] Continue button state management works correctly
- [ ] Radio button enabling/selection flow works as specified
- [ ] User experience feels responsive and intuitive

## Priority
**High** - Core user experience improvement for folder upload workflow

## Estimated Complexity
**Medium** - Requires coordination between UI state management and background calculation processes

## Notes
- This story focuses on the immediate user experience and perceived performance
- The underlying calculation system (3-phase estimation) is already implemented
- Main work involves UI state management and timing coordination
- Consider user feedback and testing for the 1-second delay timing