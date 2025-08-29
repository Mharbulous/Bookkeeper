# Minimalist Async Tracker: Implementation Plan

## Executive Summary

**Problem Statement**: The Bookkeeper application has 33 distinct async processes across the codebase that lack centralized tracking and emergency cleanup capabilities. While 29 processes have verified cleanup mechanisms, there is no visibility into active async operations or safety net for hanging processes during errors or route changes.

**Proposed Solution**: Implement a lightweight, non-intrusive async process registry that provides visibility and safety net capabilities without disrupting existing, well-functioning AbortController patterns. The tracker acts as a bookkeeping layer alongside current code rather than replacing it.

## Key Files

- `src/composables/useFolderTimeouts.js` (312 lines) - Enhanced with minimal registry integration
- `src/composables/useWebWorker.js` (365 lines) - Enhanced with registry tracking  
- `src/main.js` (22 lines) - App-level integration and safety net
- `src/App.vue` (78 lines) - Development inspector integration
- `src/composables/useAsyncRegistry.js` (NEW) - Core registry implementation
- `src/composables/useAsyncInspector.js` (NEW) - Development inspector

## Step 1: Create Core Registry Composable

**Complexity**: Medium
**Breaking Risk**: Low

Create the core async registry composable that provides process tracking and cleanup coordination.

**Tasks**:
- Create `src/composables/useAsyncRegistry.js` with global process map
- Implement register/unregister operations with metadata
- Add component-scoped process tracking
- Implement cleanup functions with error handling
- Add process statistics and inspection methods

**Success Criteria**:
- Registry can track processes with unique IDs, types, and cleanup functions
- Component-scoped cleanup works automatically on unmount
- Global registry maintains process statistics
- Debug logging works only in development environment
- All operations handle errors gracefully without throwing

**Files Modified**: None (new file creation only)

## Step 2: Create Development Inspector

**Complexity**: Low
**Breaking Risk**: Low

Create development-only inspector for process visibility and debugging.

**Tasks**:
- Create `src/composables/useAsyncInspector.js` with development checks
- Implement process statistics computation
- Add long-running and suspicious process detection
- Create console debugging helpers
- Add window global helpers for manual inspection

**Success Criteria**:
- Inspector is completely disabled in production builds
- Statistics accurately reflect active processes by type
- Long-running process detection works with configurable thresholds
- Console logging provides useful debugging information
- Window globals available for manual testing

**Rollback**: Delete the created file - no other modifications required

**Files Modified**: None (new file creation only)

## Step 3: Enhance Folder Timeouts Integration

**Complexity**: Low  
**Breaking Risk**: Low

Add minimal registry integration to existing useFolderTimeouts.js without disrupting working patterns.

**Tasks**:
- Import useAsyncRegistry in useFolderTimeouts.js
- Register timeout controllers with registry on creation
- Enhance abort methods to unregister from registry
- Add registry cleanup to existing cleanup function
- Expose registry for testing and debugging

**Success Criteria**:
- All existing functionality remains unchanged
- Timeout controllers are tracked in registry with correct metadata
- Registry cleanup happens alongside existing cleanup
- No performance impact on timeout operations
- Registry exposure allows for testing verification

**Rollback**: Remove registry imports and calls, keeping all existing code intact

**Files Modified**: 
- `src/composables/useFolderTimeouts.js` (312 lines) - Add ~10 lines of registry integration

## Step 4: Enhance Web Worker Integration

**Complexity**: Medium
**Breaking Risk**: Low

Add registry tracking to web worker lifecycle management.

**Tasks**:
- Import useAsyncRegistry in useWebWorker.js
- Register worker processes with cleanup on initialization
- Track health check intervals in registry
- Add worker termination to registry cleanup
- Store registry IDs for proper unregistration

**Success Criteria**:
- Worker lifecycle events are tracked in registry
- Health check intervals are registered for emergency cleanup
- Worker termination unregisters all associated processes
- No impact on existing worker functionality
- Registry provides visibility into worker health status

**Rollback**: Remove registry imports and calls, preserving all existing worker logic

**Files Modified**:
- `src/composables/useWebWorker.js` (365 lines) - Add ~15 lines of registry integration

## Step 5: App-Level Integration and Safety Net

**Complexity**: Low
**Breaking Risk**: Medium

Add global cleanup handlers and error boundaries for emergency async cleanup.

**Tasks**:
- Import useGlobalAsyncRegistry in main.js
- Add beforeunload event listener for page navigation cleanup
- Add router navigation cleanup (optional)
- Add error event listener for emergency cleanup
- Test cleanup integration without breaking app initialization

**Success Criteria**:
- Global cleanup executes on page unload
- Error boundary cleanup activates on uncaught errors
- Router navigation cleanup works without performance impact
- App initialization remains unaffected
- All cleanup operations handle errors gracefully

**Rollback**: Remove all event listeners and imports, restore original main.js

**Files Modified**:
- `src/main.js` (22 lines) - Add ~10 lines of event listener setup

## Step 6: Development Inspector Integration

**Complexity**: Low
**Breaking Risk**: Low

Add optional development inspector to App.vue for process monitoring.

**Tasks**:
- Import useAsyncInspector in App.vue
- Add development-only periodic stats logging
- Integrate inspector with existing setup function
- Ensure zero impact on production builds
- Add optional UI display for process statistics

**Success Criteria**:
- Inspector integration is completely transparent in production
- Development logging provides useful process insights
- No impact on existing App.vue functionality
- Statistics updates work without performance issues
- Optional UI components render correctly when enabled

**Rollback**: Remove inspector import and integration, keep existing App.vue code

**Files Modified**:
- `src/App.vue` (78 lines) - Add ~8 lines of inspector integration

## Dependencies

**No external dependencies** - uses only:
- Vue 3 Composition API (already used)
- Native JavaScript Map/Set collections
- Existing AbortController patterns

## Risk Assessment

**Low Risk Factors**:
- Additive implementation preserves all existing functionality
- Development features disabled in production
- Easy rollback for any step that causes issues
- No changes to critical authentication or routing logic

**Potential Issues**:
- Small memory overhead from process tracking maps
- Debug logging noise in development (easily configurable)
- Event listener cleanup timing on page unload

## Success Metrics

**Phase 1 Success** (Steps 1-2):
- Registry tracks and cleans up processes correctly
- Development inspector provides useful visibility
- Zero impact on existing application functionality

**Phase 2 Success** (Steps 3-6):
- Integration with existing composables preserves all functionality
- Global safety net provides emergency cleanup capabilities
- Development experience improved with process visibility

## Implementation Timeline

**Total Estimated Time**: 4-6 hours
- **Steps 1-2**: 1-2 hours (Core implementation)
- **Steps 3-4**: 1-2 hours (Composable integration)
- **Steps 5-6**: 1-2 hours (App integration and testing)

## Rollback Strategy

Each step includes specific rollback instructions. Steps 1-2 involve only new file creation and can be safely removed. Steps 3-6 involve minimal modifications to existing files and can be reverted by removing the added registry integration lines while preserving all existing code.