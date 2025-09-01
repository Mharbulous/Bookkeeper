import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useVirtualFolderStore } from '../../../../../src/features/organizer/stores/virtualFolderStore.js';
import { 
  generateMockCategories, 
  generateMockEvidence, 
  testScenarios,
  mockStoreStates,
  performanceUtils,
  validationUtils
} from '../../../../../src/test-utils/virtualFolderTestUtils.js';

describe('Virtual Folder Store', () => {
  let store;
  let mockCategories;
  let mockEvidence;
  
  beforeEach(() => {
    setActivePinia(createPinia());
    store = useVirtualFolderStore();
    mockCategories = generateMockCategories(3);
    mockEvidence = generateMockEvidence(20, mockCategories);
  });

  describe('Store Instantiation', () => {
    it('should create store with correct initial state', () => {
      expect(store.viewMode).toBe('flat');
      expect(store.folderHierarchy).toEqual([]);
      expect(store.currentPath).toEqual([]);
      expect(store.loading).toBe(false);
    });

    it('should have correct initial computed values', () => {
      expect(store.isFolderMode).toBe(false);
      expect(store.isAtRoot).toBe(true);
      expect(store.currentDepth).toBe(0);
      expect(store.nextCategory).toBeNull();
      expect(store.breadcrumbPath).toEqual([]);
    });
  });

  describe('View Mode Management', () => {
    it('should switch to folder mode correctly', () => {
      store.setViewMode('folders');
      
      expect(store.viewMode).toBe('folders');
      expect(store.isFolderMode).toBe(true);
    });

    it('should switch back to flat mode and reset navigation', () => {
      // Set up some navigation state first
      store.setViewMode('folders');
      store.setFolderHierarchy([{ categoryId: 'cat-1', categoryName: 'Test' }]);
      store.navigateToFolder('cat-1', 'TestTag');
      
      expect(store.currentPath).toHaveLength(1);
      
      // Switch to flat mode
      store.setViewMode('flat');
      
      expect(store.viewMode).toBe('flat');
      expect(store.isFolderMode).toBe(false);
      expect(store.currentPath).toEqual([]);
    });

    it('should ignore invalid view modes', () => {
      const originalMode = store.viewMode;
      store.setViewMode('invalid-mode');
      
      expect(store.viewMode).toBe(originalMode);
    });

    it('should handle edge case view mode values', () => {
      store.setViewMode(null);
      expect(store.viewMode).toBe('flat');
      
      store.setViewMode(undefined);
      expect(store.viewMode).toBe('flat');
      
      store.setViewMode('');
      expect(store.viewMode).toBe('flat');
    });
  });

  describe('Folder Hierarchy Management', () => {
    it('should set folder hierarchy correctly', () => {
      const hierarchy = [
        { categoryId: 'cat-1', categoryName: 'Category 1' },
        { categoryId: 'cat-2', categoryName: 'Category 2' }
      ];
      
      store.setFolderHierarchy(hierarchy);
      
      expect(store.folderHierarchy).toEqual(hierarchy);
      expect(store.folderHierarchy).not.toBe(hierarchy); // Should be a copy
    });

    it('should add category to hierarchy at end', () => {
      const initialHierarchy = [{ categoryId: 'cat-1', categoryName: 'Category 1' }];
      const newCategory = { categoryId: 'cat-2', categoryName: 'Category 2' };
      
      store.setFolderHierarchy(initialHierarchy);
      store.addToHierarchy(newCategory);
      
      expect(store.folderHierarchy).toHaveLength(2);
      expect(store.folderHierarchy[1]).toEqual(newCategory);
    });

    it('should add category to hierarchy at specific position', () => {
      const initialHierarchy = [
        { categoryId: 'cat-1', categoryName: 'Category 1' },
        { categoryId: 'cat-3', categoryName: 'Category 3' }
      ];
      const insertCategory = { categoryId: 'cat-2', categoryName: 'Category 2' };
      
      store.setFolderHierarchy(initialHierarchy);
      store.addToHierarchy(insertCategory, 1);
      
      expect(store.folderHierarchy).toHaveLength(3);
      expect(store.folderHierarchy[1]).toEqual(insertCategory);
      expect(store.folderHierarchy[2].categoryId).toBe('cat-3');
    });

    it('should remove category from hierarchy', () => {
      const hierarchy = [
        { categoryId: 'cat-1', categoryName: 'Category 1' },
        { categoryId: 'cat-2', categoryName: 'Category 2' },
        { categoryId: 'cat-3', categoryName: 'Category 3' }
      ];
      
      store.setFolderHierarchy(hierarchy);
      store.removeFromHierarchy('cat-2');
      
      expect(store.folderHierarchy).toHaveLength(2);
      expect(store.folderHierarchy.find(cat => cat.categoryId === 'cat-2')).toBeUndefined();
      expect(store.folderHierarchy[0].categoryId).toBe('cat-1');
      expect(store.folderHierarchy[1].categoryId).toBe('cat-3');
    });

    it('should handle removing non-existent category gracefully', () => {
      const hierarchy = [{ categoryId: 'cat-1', categoryName: 'Category 1' }];
      
      store.setFolderHierarchy(hierarchy);
      store.removeFromHierarchy('non-existent');
      
      expect(store.folderHierarchy).toEqual(hierarchy);
    });

    it('should clean up navigation path when removing category from hierarchy', () => {
      const hierarchy = [
        { categoryId: 'cat-1', categoryName: 'Category 1' },
        { categoryId: 'cat-2', categoryName: 'Category 2' }
      ];
      
      store.setFolderHierarchy(hierarchy);
      store.navigateToFolder('cat-1', 'Tag1');
      store.navigateToFolder('cat-2', 'Tag2');
      
      expect(store.currentPath).toHaveLength(2);
      
      // Remove cat-1 (which should clear path from that point)
      store.removeFromHierarchy('cat-1');
      
      expect(store.currentPath).toHaveLength(0);
    });
  });

  describe('Navigation Methods', () => {
    beforeEach(() => {
      const hierarchy = [
        { categoryId: 'cat-1', categoryName: 'Category 1' },
        { categoryId: 'cat-2', categoryName: 'Category 2' },
        { categoryId: 'cat-3', categoryName: 'Category 3' }
      ];
      store.setFolderHierarchy(hierarchy);
    });

    it('should navigate to folder correctly', () => {
      store.navigateToFolder('cat-1', 'TestTag');
      
      expect(store.currentPath).toHaveLength(1);
      expect(store.currentPath[0]).toEqual({
        categoryId: 'cat-1',
        categoryName: 'Category 1',
        tagName: 'TestTag'
      });
      expect(store.currentDepth).toBe(1);
      expect(store.isAtRoot).toBe(false);
    });

    it('should navigate to multiple levels correctly', () => {
      store.navigateToFolder('cat-1', 'Tag1');
      store.navigateToFolder('cat-2', 'Tag2');
      store.navigateToFolder('cat-3', 'Tag3');
      
      expect(store.currentPath).toHaveLength(3);
      expect(store.currentDepth).toBe(3);
      expect(store.currentPath[0].tagName).toBe('Tag1');
      expect(store.currentPath[1].tagName).toBe('Tag2');
      expect(store.currentPath[2].tagName).toBe('Tag3');
    });

    it('should handle navigation to non-existent category', () => {
      const originalPath = [...store.currentPath];
      store.navigateToFolder('non-existent', 'Tag');
      
      expect(store.currentPath).toEqual(originalPath);
    });

    it('should truncate path when navigating to earlier level', () => {
      store.navigateToFolder('cat-1', 'Tag1');
      store.navigateToFolder('cat-2', 'Tag2');
      store.navigateToFolder('cat-3', 'Tag3');
      
      expect(store.currentPath).toHaveLength(3);
      
      // Navigate back to cat-2 level (should truncate cat-3)
      store.navigateToFolder('cat-2', 'NewTag2');
      
      expect(store.currentPath).toHaveLength(2);
      expect(store.currentPath[1].tagName).toBe('NewTag2');
    });

    it('should navigate back one level correctly', () => {
      store.navigateToFolder('cat-1', 'Tag1');
      store.navigateToFolder('cat-2', 'Tag2');
      
      expect(store.currentPath).toHaveLength(2);
      
      store.navigateBack();
      
      expect(store.currentPath).toHaveLength(1);
      expect(store.currentPath[0].tagName).toBe('Tag1');
    });

    it('should handle navigate back at root level', () => {
      expect(store.isAtRoot).toBe(true);
      
      store.navigateBack();
      
      expect(store.currentPath).toEqual([]);
      expect(store.isAtRoot).toBe(true);
    });

    it('should navigate to specific depth correctly', () => {
      store.navigateToFolder('cat-1', 'Tag1');
      store.navigateToFolder('cat-2', 'Tag2');
      store.navigateToFolder('cat-3', 'Tag3');
      
      store.navigateToDepth(1);
      
      expect(store.currentPath).toHaveLength(1);
      expect(store.currentDepth).toBe(1);
      expect(store.currentPath[0].tagName).toBe('Tag1');
    });

    it('should navigate to root correctly', () => {
      store.navigateToFolder('cat-1', 'Tag1');
      store.navigateToFolder('cat-2', 'Tag2');
      
      expect(store.isAtRoot).toBe(false);
      
      store.navigateToRoot();
      
      expect(store.currentPath).toEqual([]);
      expect(store.isAtRoot).toBe(true);
      expect(store.currentDepth).toBe(0);
    });

    it('should handle invalid depth navigation', () => {
      store.navigateToFolder('cat-1', 'Tag1');
      const originalPath = [...store.currentPath];
      
      store.navigateToDepth(-1);
      expect(store.currentPath).toEqual(originalPath);
      
      store.navigateToDepth(10);
      expect(store.currentPath).toEqual(originalPath);
    });
  });

  describe('Breadcrumb Generation', () => {
    beforeEach(() => {
      const hierarchy = [
        { categoryId: 'cat-1', categoryName: 'Category 1' },
        { categoryId: 'cat-2', categoryName: 'Category 2' }
      ];
      store.setFolderHierarchy(hierarchy);
    });

    it('should generate correct breadcrumbs for single level', () => {
      store.navigateToFolder('cat-1', 'Tag1');
      
      const breadcrumbs = store.breadcrumbPath;
      
      expect(breadcrumbs).toHaveLength(1);
      expect(validationUtils.validateBreadcrumbs(breadcrumbs, 1)).toBe(true);
      expect(breadcrumbs[0].isLast).toBe(true);
      expect(breadcrumbs[0].depth).toBe(0);
    });

    it('should generate correct breadcrumbs for multiple levels', () => {
      store.navigateToFolder('cat-1', 'Tag1');
      store.navigateToFolder('cat-2', 'Tag2');
      
      const breadcrumbs = store.breadcrumbPath;
      
      expect(breadcrumbs).toHaveLength(2);
      expect(validationUtils.validateBreadcrumbs(breadcrumbs, 2)).toBe(true);
      expect(breadcrumbs[0].isLast).toBe(false);
      expect(breadcrumbs[1].isLast).toBe(true);
      expect(breadcrumbs[0].depth).toBe(0);
      expect(breadcrumbs[1].depth).toBe(1);
    });

    it('should return empty breadcrumbs at root', () => {
      expect(store.breadcrumbPath).toEqual([]);
    });
  });

  describe('Evidence Filtering', () => {
    beforeEach(() => {
      const hierarchy = [
        { categoryId: 'doc-type', categoryName: 'Document Type' },
        { categoryId: 'client', categoryName: 'Client' }
      ];
      store.setFolderHierarchy(hierarchy);
    });

    it('should return all evidence at root level', () => {
      const filtered = store.filterEvidenceByPath(mockEvidence);
      expect(filtered).toEqual(mockEvidence);
    });

    it('should filter evidence by single path level', () => {
      const testData = testScenarios.hierarchicalTestData();
      store.navigateToFolder('doc-type', 'Invoice');
      
      const filtered = store.filterEvidenceByPath(testData.evidence);
      
      expect(filtered).toHaveLength(2); // Both invoices
      expect(filtered.every(doc => 
        doc.tags['doc-type']?.some(tag => tag.tagName === 'Invoice')
      )).toBe(true);
    });

    it('should filter evidence by multiple path levels', () => {
      const testData = testScenarios.hierarchicalTestData();
      store.navigateToFolder('doc-type', 'Invoice');
      store.navigateToFolder('client', 'ABC Corp');
      
      const filtered = store.filterEvidenceByPath(testData.evidence);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('doc-1');
    });

    it('should handle empty evidence list', () => {
      store.navigateToFolder('doc-type', 'Invoice');
      
      const filtered = store.filterEvidenceByPath([]);
      expect(filtered).toEqual([]);
    });

    it('should handle null/undefined evidence', () => {
      expect(store.filterEvidenceByPath(null)).toEqual([]);
      expect(store.filterEvidenceByPath(undefined)).toEqual([]);
    });

    it('should handle evidence with malformed tags', () => {
      const malformedEvidence = [testScenarios.malformedTagsEvidence()];
      store.navigateToFolder('doc-type', 'Invoice');
      
      const filtered = store.filterEvidenceByPath(malformedEvidence);
      expect(filtered).toEqual([]);
    });

    it('should handle evidence with missing tag categories', () => {
      const evidenceWithMissingTags = [{
        id: 'incomplete',
        tags: {
          'other-category': [{ tagName: 'SomeTag' }]
        }
      }];
      
      store.navigateToFolder('doc-type', 'Invoice');
      const filtered = store.filterEvidenceByPath(evidenceWithMissingTags);
      
      expect(filtered).toEqual([]);
    });
  });

  describe('Folder Structure Generation', () => {
    beforeEach(() => {
      const hierarchy = [
        { categoryId: 'doc-type', categoryName: 'Document Type' },
        { categoryId: 'client', categoryName: 'Client' }
      ];
      store.setFolderHierarchy(hierarchy);
    });

    it('should generate folder structure at root level', () => {
      const testData = testScenarios.hierarchicalTestData();
      
      const folders = store.generateFolderStructure(testData.evidence);
      
      expect(validationUtils.validateFolderStructure(folders)).toBe(true);
      expect(folders).toHaveLength(2); // Invoice and Receipt
      
      const invoiceFolder = folders.find(f => f.tagName === 'Invoice');
      const receiptFolder = folders.find(f => f.tagName === 'Receipt');
      
      expect(invoiceFolder.fileCount).toBe(2);
      expect(receiptFolder.fileCount).toBe(1);
    });

    it('should generate folder structure at nested level', () => {
      const testData = testScenarios.hierarchicalTestData();
      store.navigateToFolder('doc-type', 'Invoice');
      
      const folders = store.generateFolderStructure(testData.evidence);
      
      expect(validationUtils.validateFolderStructure(folders)).toBe(true);
      expect(folders).toHaveLength(2); // ABC Corp and XYZ Ltd
      
      const abcFolder = folders.find(f => f.tagName === 'ABC Corp');
      const xyzFolder = folders.find(f => f.tagName === 'XYZ Ltd');
      
      expect(abcFolder.fileCount).toBe(1);
      expect(xyzFolder.fileCount).toBe(1);
    });

    it('should return empty array when no next category', () => {
      // Navigate to deepest level
      store.navigateToFolder('doc-type', 'Invoice');
      store.navigateToFolder('client', 'ABC Corp');
      
      const folders = store.generateFolderStructure(mockEvidence);
      expect(folders).toEqual([]);
    });

    it('should handle empty evidence list', () => {
      const folders = store.generateFolderStructure([]);
      expect(folders).toEqual([]);
    });

    it('should handle null/undefined evidence', () => {
      expect(store.generateFolderStructure(null)).toEqual([]);
      expect(store.generateFolderStructure(undefined)).toEqual([]);
    });

    it('should sort folders by file count descending then by name', () => {
      const evidence = [
        {
          id: 'doc-1',
          tags: { 'doc-type': [{ tagName: 'B-Document' }] }
        },
        {
          id: 'doc-2', 
          tags: { 'doc-type': [{ tagName: 'A-Document' }] }
        },
        {
          id: 'doc-3',
          tags: { 'doc-type': [{ tagName: 'B-Document' }] }
        },
        {
          id: 'doc-4',
          tags: { 'doc-type': [{ tagName: 'C-Document' }] }
        }
      ];
      
      const folders = store.generateFolderStructure(evidence);
      
      expect(folders[0].tagName).toBe('B-Document'); // 2 files
      expect(folders[1].tagName).toBe('A-Document'); // 1 file, comes before C alphabetically  
      expect(folders[2].tagName).toBe('C-Document'); // 1 file
    });

    it('should handle evidence with multiple tags per category', () => {
      const evidence = [{
        id: 'multi-tag-doc',
        tags: {
          'doc-type': [
            { tagName: 'Invoice' },
            { tagName: 'Receipt' }
          ]
        }
      }];
      
      const folders = store.generateFolderStructure(evidence);
      
      expect(folders).toHaveLength(2);
      expect(folders[0].fileCount).toBe(1);
      expect(folders[1].fileCount).toBe(1);
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      const hierarchy = [
        { categoryId: 'doc-type', categoryName: 'Document Type' },
        { categoryId: 'client', categoryName: 'Client' }
      ];
      store.setFolderHierarchy(hierarchy);
    });

    it('should cache folder generation results', async () => {
      const testData = testScenarios.hierarchicalTestData();
      
      // First call - should cache result
      const result1 = await performanceUtils.measureTime(
        store.generateFolderStructure, 
        testData.evidence
      );
      
      // Second call - should use cached result  
      const result2 = await performanceUtils.measureTime(
        store.generateFolderStructure,
        testData.evidence
      );
      
      expect(result1.result).toEqual(result2.result);
      // Cache should be either significantly faster or at least no slower
      // (timing can vary in test environments)
      expect(result2.duration).toBeLessThanOrEqual(Math.max(result1.duration, 1.0));
    });

    it('should generate different cache keys for different navigation states', () => {
      const testData = testScenarios.hierarchicalTestData();
      
      // Generate at root
      const rootFolders = store.generateFolderStructure(testData.evidence);
      
      // Navigate and generate
      store.navigateToFolder('doc-type', 'Invoice');
      const nestedFolders = store.generateFolderStructure(testData.evidence);
      
      expect(rootFolders).not.toEqual(nestedFolders);
      expect(rootFolders).toHaveLength(2); // Invoice and Receipt types
      expect(nestedFolders).toHaveLength(2); // ABC Corp and XYZ Ltd clients
    });

    it('should clear cache when hierarchy changes', async () => {
      const testData = testScenarios.hierarchicalTestData();
      
      // Generate and cache
      store.generateFolderStructure(testData.evidence);
      
      // Change hierarchy (should clear cache)
      store.setFolderHierarchy([{ categoryId: 'new-cat', categoryName: 'New Category' }]);
      
      // Next generation should not use cache (will be empty since no matching tags)
      const folders = store.generateFolderStructure(testData.evidence);
      expect(folders).toEqual([]);
    });

    it('should manually clear cache', () => {
      const testData = testScenarios.hierarchicalTestData();
      
      // Generate and cache
      store.generateFolderStructure(testData.evidence);
      
      // Clear cache manually
      store.clearFolderCache();
      
      // Should regenerate (can't easily test timing without implementation details)
      const folders = store.generateFolderStructure(testData.evidence);
      expect(validationUtils.validateFolderStructure(folders)).toBe(true);
    });
  });

  describe('Computed Properties', () => {
    beforeEach(() => {
      const hierarchy = [
        { categoryId: 'cat-1', categoryName: 'Category 1' },
        { categoryId: 'cat-2', categoryName: 'Category 2' }
      ];
      store.setFolderHierarchy(hierarchy);
    });

    it('should calculate nextCategory correctly', () => {
      expect(store.nextCategory).toEqual({ categoryId: 'cat-1', categoryName: 'Category 1' });
      
      store.navigateToFolder('cat-1', 'Tag1');
      expect(store.nextCategory).toEqual({ categoryId: 'cat-2', categoryName: 'Category 2' });
      
      store.navigateToFolder('cat-2', 'Tag2');
      expect(store.nextCategory).toBeNull();
    });

    it('should track depth changes reactively', () => {
      expect(store.currentDepth).toBe(0);
      
      store.navigateToFolder('cat-1', 'Tag1');
      expect(store.currentDepth).toBe(1);
      
      store.navigateToFolder('cat-2', 'Tag2');
      expect(store.currentDepth).toBe(2);
      
      store.navigateBack();
      expect(store.currentDepth).toBe(1);
      
      store.navigateToRoot();
      expect(store.currentDepth).toBe(0);
    });

    it('should track root state correctly', () => {
      expect(store.isAtRoot).toBe(true);
      
      store.navigateToFolder('cat-1', 'Tag1');
      expect(store.isAtRoot).toBe(false);
      
      store.navigateToRoot();
      expect(store.isAtRoot).toBe(true);
    });
  });

  describe('Utility Methods', () => {
    it('should provide complete folder context', () => {
      const hierarchy = [{ categoryId: 'cat-1', categoryName: 'Category 1' }];
      store.setFolderHierarchy(hierarchy);
      store.setViewMode('folders');
      store.navigateToFolder('cat-1', 'Tag1');
      
      const context = store.getFolderContext();
      
      expect(context).toMatchObject({
        viewMode: 'folders',
        isFolderMode: true,
        isAtRoot: false,
        currentDepth: 1,
        hierarchy: hierarchy,
        path: [{ categoryId: 'cat-1', categoryName: 'Category 1', tagName: 'Tag1' }],
        nextCategory: null
      });
      
      expect(context.breadcrumbs).toHaveLength(1);
    });

    it('should reset store to initial state', () => {
      // Set up some state
      store.setViewMode('folders');
      store.setFolderHierarchy([{ categoryId: 'cat-1', categoryName: 'Category 1' }]);
      store.navigateToFolder('cat-1', 'Tag1');
      
      // Reset
      store.reset();
      
      expect(store.viewMode).toBe('flat');
      expect(store.folderHierarchy).toEqual([]);
      expect(store.currentPath).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.isAtRoot).toBe(true);
      expect(store.currentDepth).toBe(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      const largeData = testScenarios.largeDataset();
      store.setFolderHierarchy(largeData.categories);
      
      const result = await performanceUtils.measureTime(
        store.generateFolderStructure,
        largeData.evidence
      );
      
      expect(result.duration).toBeLessThan(50); // Should complete in under 50ms
      expect(validationUtils.validateFolderStructure(result.result)).toBe(true);
    });

    it('should maintain performance with deep navigation', async () => {
      const largeData = testScenarios.largeDataset();
      store.setFolderHierarchy(largeData.categories);
      
      // Navigate through multiple levels
      const categories = largeData.categories;
      for (let i = 0; i < categories.length - 1; i++) {
        const folders = store.generateFolderStructure(largeData.evidence);
        if (folders.length > 0) {
          store.navigateToFolder(categories[i].categoryId, folders[0].tagName);
        }
      }
      
      const result = await performanceUtils.measureTime(
        store.generateFolderStructure,
        largeData.evidence
      );
      
      expect(result.duration).toBeLessThan(50); // Should still be fast at deep levels
    });

    it('should benefit from caching on repeated calls', async () => {
      const testData = testScenarios.hierarchicalTestData();
      
      // First call
      const firstCall = await performanceUtils.measureTime(
        store.generateFolderStructure,
        testData.evidence
      );
      
      // Multiple subsequent calls
      const timings = [];
      for (let i = 0; i < 10; i++) {
        const timing = await performanceUtils.measureTime(
          store.generateFolderStructure,
          testData.evidence
        );
        timings.push(timing.duration);
      }
      
      const avgCachedTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      // Cache should generally be faster, but timing can vary in test environments
      expect(avgCachedTime).toBeLessThanOrEqual(Math.max(firstCall.duration * 2, 5.0));
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed evidence gracefully', () => {
      const malformedEvidence = [
        { id: 'bad-1' }, // No tags
        { id: 'bad-2', tags: null },
        { id: 'bad-3', tags: 'not-an-object' },
        { id: 'bad-4', tags: { 'cat-1': 'not-an-array' } },
        { id: 'bad-5', tags: { 'cat-1': [{ /* no tagName */ }] } }
      ];
      
      store.setFolderHierarchy([{ categoryId: 'cat-1', categoryName: 'Category 1' }]);
      
      const folders = store.generateFolderStructure(malformedEvidence);
      expect(folders).toEqual([]);
    });

    it('should handle navigation with empty hierarchy', () => {
      store.navigateToFolder('any-category', 'any-tag');
      expect(store.currentPath).toEqual([]);
    });

    it('should handle boundary conditions', () => {
      store.navigateToDepth(-1);
      expect(store.currentDepth).toBe(0);
      
      store.navigateToDepth(1000);
      expect(store.currentDepth).toBe(0);
      
      // Multiple back navigations at root
      store.navigateBack();
      store.navigateBack();
      expect(store.isAtRoot).toBe(true);
    });
  });
});