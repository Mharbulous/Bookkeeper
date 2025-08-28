# Modular Restructuring Checklist

## File Moves Tracking

### Completed Moves
- [x] `QueueTimeProgress.vue` moved from `src/components/features/upload/` to `src/features/file-upload/components/`
  - No references found to old location
  - File appears to have been already migrated

## Completed Moves
- [x] `useFileQueue.js` moved from `src/composables/` to `src/features/file-upload/composables/`
  - Updated import in `src/views/FileUpload.vue`
  - Verified no other references to old location

## Next Steps
- Continue reviewing and moving file-upload related components
- Verify component imports and references after each move
