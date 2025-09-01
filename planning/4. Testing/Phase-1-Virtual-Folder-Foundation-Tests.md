# Phase 1 Virtual Folder Foundation - Functional Test Checklist

**Created**: 2025-08-31  
**Phase**: Phase 1 - Virtual Folder Foundation  
**Status**: Ready for Testing  
**Implementation Version**: v1.3

## Overview

This checklist covers functional testing for Phase 1 of the Virtual Folder implementation, focusing on the virtual folder store integration and backward compatibility verification.

## Prerequisites

- [ ] Development environment running (`npm run dev`)
- [ ] Test user authenticated and has evidence documents with tags
- [ ] Browser developer tools open for console monitoring
- [ ] At least 5-10 evidence documents with various tag combinations for meaningful testing

## Test Environment Setup

### Required Test Data
- [ ] Evidence documents with tags across multiple categories
- [ ] At least 3 different categories with 2-3 tags each
- [ ] Mix of documents with single and multiple tags per category
- [ ] Some documents with overlapping tag combinations

### Console Monitoring
- [ ] Browser DevTools Console open
- [ ] Vue DevTools extension installed and active
- [ ] No existing console errors before testing begins

---

## Store Integration Tests

### 1. Virtual Folder Store Creation ✅
**Objective**: Verify virtual folder store exists and is properly integrated

#### 1.1 Store Instantiation
- [ ] Navigate to Organizer page
- [ ] Open Vue DevTools → Pinia tab
- [ ] **PASS**: `virtualFolder` store appears in store list
- [ ] **PASS**: Store has initial state: `viewMode: 'flat'`, `folderHierarchy: []`, `currentPath: []`

#### 1.2 Main Organizer Store Integration
- [ ] In Vue DevTools → Pinia tab, select `organizer` store
- [ ] **PASS**: New v1.3 properties visible: `viewMode`, `isFolderMode`, `folderHierarchy`, etc.
- [ ] **PASS**: `stores.virtualFolder` reference exists in organizer store
- [ ] **PASS**: Virtual folder methods accessible through main organizer interface

### 2. Backward Compatibility Verification ✅
**Objective**: Ensure existing functionality remains unchanged

#### 2.1 Existing Store Interface
- [ ] **PASS**: `evidenceList` computed property still available
- [ ] **PASS**: `filteredEvidence` computed property still available  
- [ ] **PASS**: `filterText` computed property still available
- [ ] **PASS**: `setFilter()` method still functional
- [ ] **PASS**: `clearFilters()` method still functional
- [ ] **PASS**: All legacy v1.0 and v1.1 methods remain accessible

#### 2.2 Evidence Display
- [ ] Navigate to Organizer page
- [ ] **PASS**: Evidence list displays normally in flat view
- [ ] **PASS**: Existing search/filter functionality works
- [ ] **PASS**: Category tag display unchanged
- [ ] **PASS**: File actions (view, download, delete) work normally

#### 2.3 Category Management
- [ ] Navigate to Category Manager
- [ ] **PASS**: Category creation works normally
- [ ] **PASS**: Category editing works normally  
- [ ] **PASS**: Category deletion works normally
- [ ] **PASS**: Color assignment works normally

---

## Virtual Folder Store State Management Tests

### 3. View Mode Management ✅
**Objective**: Test view mode switching functionality

#### 3.1 Initial State
- [ ] Open Console, run: `const store = useOrganizerStore(); console.log(store.viewMode);`
- [ ] **PASS**: Initial view mode is `'flat'`
- [ ] **PASS**: `isFolderMode` is `false`

#### 3.2 View Mode Switching
- [ ] In Console, run: `store.setViewMode('folders')`
- [ ] **PASS**: `viewMode` changes to `'folders'`
- [ ] **PASS**: `isFolderMode` becomes `true`
- [ ] In Console, run: `store.setViewMode('flat')`  
- [ ] **PASS**: `viewMode` changes back to `'flat'`
- [ ] **PASS**: `isFolderMode` becomes `false`

#### 3.3 Invalid Mode Handling
- [ ] In Console, run: `store.setViewMode('invalid')`
- [ ] **PASS**: View mode remains unchanged (should stay at previous valid value)
- [ ] **PASS**: No console errors thrown

### 4. Folder Hierarchy Management ✅
**Objective**: Test folder hierarchy configuration

#### 4.1 Hierarchy Setting
- [ ] In Console, get available categories: `console.log(store.categories)`
- [ ] Note 2-3 category IDs and names for testing
- [ ] Set hierarchy: `store.setFolderHierarchy([{categoryId: 'cat1', categoryName: 'Category 1'}, {categoryId: 'cat2', categoryName: 'Category 2'}])`
- [ ] **PASS**: `folderHierarchy` updates with provided categories
- [ ] **PASS**: Hierarchy order matches input order

#### 4.2 Add to Hierarchy
- [ ] Run: `store.addToHierarchy({categoryId: 'cat3', categoryName: 'Category 3'})`
- [ ] **PASS**: Category appended to end of hierarchy
- [ ] Run: `store.addToHierarchy({categoryId: 'cat0', categoryName: 'Category 0'}, 0)`
- [ ] **PASS**: Category inserted at specified position (index 0)

#### 4.3 Remove from Hierarchy  
- [ ] Run: `store.removeFromHierarchy('cat0')`
- [ ] **PASS**: Category removed from hierarchy
- [ ] **PASS**: Hierarchy array length decreased by 1

### 5. Navigation State Management ✅
**Objective**: Test folder navigation functionality

#### 5.1 Initial Navigation State
- [ ] Check: `console.log(store.currentPath, store.isAtRoot, store.currentDepth)`
- [ ] **PASS**: `currentPath` is empty array `[]`
- [ ] **PASS**: `isAtRoot` is `true`  
- [ ] **PASS**: `currentDepth` is `0`

#### 5.2 Folder Navigation
- [ ] Set test hierarchy: `store.setFolderHierarchy([{categoryId: 'cat1', categoryName: 'Document Type'}])`
- [ ] Navigate: `store.navigateToFolder('cat1', 'Invoice')`
- [ ] **PASS**: `currentPath` contains navigation item: `[{categoryId: 'cat1', categoryName: 'Document Type', tagName: 'Invoice'}]`
- [ ] **PASS**: `isAtRoot` becomes `false`
- [ ] **PASS**: `currentDepth` becomes `1`

#### 5.3 Multi-Level Navigation
- [ ] Set hierarchy: `store.setFolderHierarchy([{categoryId: 'cat1', categoryName: 'Type'}, {categoryId: 'cat2', categoryName: 'Date'}])`
- [ ] Navigate level 1: `store.navigateToFolder('cat1', 'Invoice')`
- [ ] Navigate level 2: `store.navigateToFolder('cat2', '2024')`
- [ ] **PASS**: `currentPath` has 2 items
- [ ] **PASS**: `currentDepth` is `2`
- [ ] **PASS**: Path order matches navigation order

#### 5.4 Navigation Back Operations
- [ ] From 2-level path, run: `store.navigateBack()`
- [ ] **PASS**: `currentPath` has 1 item (last item removed)
- [ ] **PASS**: `currentDepth` decreased by 1
- [ ] Run: `store.navigateToRoot()`
- [ ] **PASS**: `currentPath` is empty
- [ ] **PASS**: `isAtRoot` is `true`

#### 5.5 Breadcrumb Generation
- [ ] Set path: Navigate to 2-level path as above
- [ ] Check: `console.log(store.breadcrumbPath)`
- [ ] **PASS**: Array contains path items with `isLast` and `depth` properties
- [ ] **PASS**: Only the final item has `isLast: true`
- [ ] **PASS**: `depth` values are sequential (0, 1, ...)

---

## Folder Structure Generation Tests

### 6. Evidence Filtering by Path ✅
**Objective**: Test evidence filtering based on navigation context

#### 6.1 Full Evidence List (Root Level)
- [ ] Navigate to root: `store.navigateToRoot()`
- [ ] Check: `const filtered = store.filterEvidenceByPath(store.evidenceList); console.log(filtered.length, store.evidenceList.length)`
- [ ] **PASS**: Filtered count equals total evidence count (no filtering at root)

#### 6.2 Single-Level Filtering
- [ ] Set hierarchy with real category: `store.setFolderHierarchy([{categoryId: 'REAL_CATEGORY_ID', categoryName: 'Real Category'}])`
- [ ] Navigate: `store.navigateToFolder('REAL_CATEGORY_ID', 'REAL_TAG_NAME')`
- [ ] Check: `const filtered = store.filterEvidenceByPath(store.evidenceList); console.log('Filtered:', filtered.length)`
- [ ] **PASS**: Filtered count is less than or equal to total count
- [ ] **PASS**: All filtered items contain the specified tag for the specified category

#### 6.3 Multi-Level Filtering
- [ ] Set 2-level hierarchy with real categories
- [ ] Navigate to 2-level path with real tags
- [ ] Check: `const filtered = store.filterEvidenceByPath(store.evidenceList)`
- [ ] **PASS**: Filtered items contain tags matching ALL levels of current path
- [ ] **PASS**: Filtered count decreases (or stays same) compared to single-level

### 7. Folder Structure Generation ✅
**Objective**: Test virtual folder structure creation

#### 7.1 Root Level Folders
- [ ] Navigate to root and set hierarchy: `store.navigateToRoot(); store.setFolderHierarchy([{categoryId: 'REAL_CATEGORY_ID', categoryName: 'Test Category'}])`
- [ ] Generate: `const folders = store.generateFolderStructure(store.evidenceList); console.log(folders)`
- [ ] **PASS**: Array of folder objects returned
- [ ] **PASS**: Each folder has: `categoryId`, `categoryName`, `tagName`, `fileCount`, `evidenceIds`
- [ ] **PASS**: `fileCount` matches `evidenceIds.size` for each folder
- [ ] **PASS**: Folders sorted by file count (descending) then name

#### 7.2 Nested Level Folders  
- [ ] Set 2-level hierarchy and navigate to first level
- [ ] Generate: `const folders = store.generateFolderStructure(store.evidenceList)`
- [ ] **PASS**: Folders represent second category level only
- [ ] **PASS**: File counts reflect evidence that matches first-level filter

#### 7.3 Empty Results Handling
- [ ] Navigate to non-existent path: `store.navigateToFolder('fake-category', 'fake-tag')`
- [ ] Generate: `const folders = store.generateFolderStructure(store.evidenceList)`
- [ ] **PASS**: Empty array returned (no folders)
- [ ] **PASS**: No console errors

---

## Performance and Cache Tests

### 8. Cache Management ✅
**Objective**: Test folder structure caching functionality

#### 8.1 Cache Population
- [ ] Clear cache: `store.stores.virtualFolder.clearFolderCache()`
- [ ] Generate folders twice: `store.generateFolderStructure(store.evidenceList); store.generateFolderStructure(store.evidenceList)`
- [ ] **PASS**: Second call should be faster (cached result)
- [ ] Check cache in Vue DevTools: Look for `folderCache` in virtualFolder store
- [ ] **PASS**: Cache contains entries

#### 8.2 Cache Invalidation
- [ ] With populated cache, modify evidence (add/remove tag in UI)
- [ ] **PASS**: Cache cleared automatically when evidence changes
- [ ] Generate folders again
- [ ] **PASS**: New structure reflects evidence changes

#### 8.3 Manual Cache Operations
- [ ] Clear cache: `store.stores.virtualFolder.clearFolderCache()`
- [ ] **PASS**: Cache map is empty in Vue DevTools
- [ ] Test prefix clearing (internal method verification)

---

## Error Handling and Edge Cases

### 9. Invalid Data Handling ✅
**Objective**: Test robustness with invalid or missing data

#### 9.1 Missing Evidence Data
- [ ] Test with null/undefined: `store.generateFolderStructure(null)`  
- [ ] **PASS**: Returns empty array, no errors
- [ ] Test with empty array: `store.generateFolderStructure([])`
- [ ] **PASS**: Returns empty array, no errors

#### 9.2 Invalid Navigation Attempts
- [ ] Navigate to non-existent category: `store.navigateToFolder('fake-id', 'fake-tag')`
- [ ] **PASS**: Navigation fails gracefully (path unchanged or empty path entry)
- [ ] **PASS**: No console errors

#### 9.3 Missing Category References
- [ ] Set hierarchy with non-existent category: `store.setFolderHierarchy([{categoryId: 'fake', categoryName: 'Fake'}])`
- [ ] Attempt operations
- [ ] **PASS**: Operations handle missing categories gracefully
- [ ] **PASS**: No crashes or console errors

### 10. Store Reset and Cleanup ✅  
**Objective**: Test store reset functionality

#### 10.1 Full Store Reset
- [ ] Set up complex state (hierarchy, navigation path, cache)
- [ ] Call: `store.reset()`
- [ ] **PASS**: All stores reset to initial state
- [ ] **PASS**: Virtual folder store: `viewMode: 'flat'`, empty hierarchy and path
- [ ] **PASS**: Cache cleared

#### 10.2 Individual Store Reset
- [ ] Set up virtual folder state
- [ ] Call: `store.stores.virtualFolder.reset()`
- [ ] **PASS**: Only virtual folder store reset
- [ ] **PASS**: Other stores (core, query, category) unchanged

---

## Integration Points Tests

### 11. Store Facade Integration ✅
**Objective**: Verify proper integration with main organizer store

#### 11.1 Method Availability
- [ ] Test all v1.3 methods through main store:
  - [ ] `store.setViewMode('folders')` ✅
  - [ ] `store.setFolderHierarchy([...])` ✅  
  - [ ] `store.navigateToFolder('cat', 'tag')` ✅
  - [ ] `store.generateFolderStructure(evidence)` ✅
- [ ] **PASS**: All methods accessible and functional

#### 11.2 Computed Properties
- [ ] Test all v1.3 computed properties:
  - [ ] `store.isFolderMode` ✅
  - [ ] `store.currentDepth` ✅
  - [ ] `store.breadcrumbPath` ✅
- [ ] **PASS**: All computeds reactive and accurate

#### 11.3 Store Reference Access
- [ ] Access: `store.stores.virtualFolder`
- [ ] **PASS**: Direct store access available
- [ ] **PASS**: All store methods accessible through direct reference

### 12. Evidence Change Watchers ✅
**Objective**: Test automatic cache clearing on evidence changes

#### 12.1 Evidence List Changes
- [ ] Set up folder cache with some data
- [ ] Modify evidence list (add/remove/edit evidence in UI)
- [ ] **PASS**: Virtual folder cache automatically cleared
- [ ] **PASS**: Subsequent folder generation uses fresh data

---

## Console Error Monitoring

### 13. Error-Free Operation ✅
**Objective**: Ensure no JavaScript errors during normal operations

#### 13.1 Store Operations
- [ ] Perform all store operations listed above
- [ ] **PASS**: No console errors during any virtual folder store operations
- [ ] **PASS**: No Vue reactivity warnings
- [ ] **PASS**: No Pinia store warnings

#### 13.2 Integration Operations  
- [ ] Test all integration points
- [ ] **PASS**: No errors from facade pattern integration
- [ ] **PASS**: No conflicts with existing store functionality

---

## Performance Benchmarks

### 14. Performance Validation ✅
**Objective**: Ensure acceptable performance for virtual folder operations

#### 14.1 Folder Generation Speed
- [ ] Time folder generation: `console.time('folders'); store.generateFolderStructure(store.evidenceList); console.timeEnd('folders')`
- [ ] **PASS**: Generation completes in <50ms for typical datasets (10-100 documents)
- [ ] **PASS**: Cache lookup completes in <5ms

#### 14.2 Memory Usage
- [ ] Monitor memory in DevTools Performance tab during operations
- [ ] **PASS**: No significant memory leaks during repeated operations
- [ ] **PASS**: Cache doesn't grow unbounded

---

## Test Completion Checklist

### Final Verification
- [ ] All test sections completed
- [ ] All individual test items marked PASS
- [ ] No unresolved console errors
- [ ] Store operates correctly in both modes
- [ ] Evidence display unchanged in flat mode
- [ ] Virtual folder operations functional
- [ ] Cache management working
- [ ] Performance acceptable

### Test Summary
- **Total Test Items**: 80+ individual test cases
- **Critical Path Tests**: Store integration, backward compatibility, navigation
- **Performance Tests**: Cache functionality, generation speed  
- **Error Handling Tests**: Invalid data, missing references, edge cases

### Sign-off
- [ ] **Phase 1 Foundation Ready**: Virtual folder store fully functional and integrated
- [ ] **Backward Compatibility Confirmed**: All existing functionality preserved  
- [ ] **Ready for Phase 2**: UI component development can proceed

---

## Notes for Testers

1. **Developer Tools Required**: Vue DevTools and Pinia tab essential for state inspection
2. **Test Data**: Ensure adequate test evidence with varied tag combinations
3. **Console Commands**: All console commands should be run in browser console with organizer page loaded
4. **Real Data**: Replace `REAL_CATEGORY_ID` and `REAL_TAG_NAME` with actual values from your test dataset
5. **Timing**: Some cache tests require observing timing differences - use browser performance tools if needed

## Troubleshooting Common Issues

- **Store not found**: Ensure you're on the Organizer page and store has initialized
- **Methods unavailable**: Check that you're using the main organizer store, not a direct store reference
- **Empty folder generation**: Verify your test data has tags that match the hierarchy setup
- **Cache not clearing**: Check evidence list watcher is properly connected (should happen automatically)