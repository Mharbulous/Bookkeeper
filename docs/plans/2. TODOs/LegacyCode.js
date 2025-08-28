/**
 * Legacy Code Tracking Log
 * This file tracks moved, deprecated, or deprecated code paths
 * to aid in future refactoring and code cleanup efforts.
 */

const legacyCodeLog = [
  {
    filename: 'src/composables/useFileDragDrop.js',
    newLocation: 'src/features/file-upload/composables/useFileDragDrop.js',
    dateOfMove: '2024-08-28',
    reason: 'File relocated during file upload feature modularization',
    notes: 'Part of file upload feature restructuring'
  }
];

export default legacyCodeLog;