import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useVirtualFolderStore } from '../../../../../src/features/organizer/stores/virtualFolderStore.js';

describe('Phase 2: Core Virtual Folder Components - Logic Testing', () => {
  let store;
  
  beforeEach(() => {
    setActivePinia(createPinia());
    store = useVirtualFolderStore();
  });

  describe('Virtual Folder Store Integration', () => {
    it('should support all required methods for breadcrumb navigation', () => {
      // Test that all the methods our components depend on are available
      expect(typeof store.navigateToRoot).toBe('function');
      expect(typeof store.navigateToDepth).toBe('function');
      expect(typeof store.setViewMode).toBe('function');
      expect(typeof store.setFolderHierarchy).toBe('function');
    });

    it('should properly track breadcrumb path for FolderBreadcrumbs component', () => {
      // Setup hierarchy
      const hierarchy = [
        { categoryId: 'type', categoryName: 'Document Type' },
        { categoryId: 'date', categoryName: 'Date' }
      ];
      store.setFolderHierarchy(hierarchy);

      // Navigate to create breadcrumb path
      store.setViewMode('folders');
      store.navigateToFolder('type', 'Invoice');
      
      expect(store.breadcrumbPath).toHaveLength(1);
      expect(store.breadcrumbPath[0]).toEqual({
        categoryId: 'type',
        categoryName: 'Document Type',
        tagName: 'Invoice',
        isLast: true,
        depth: 0
      });
    });

    it('should support hierarchy management for FolderHierarchySelector component', () => {
      const category = { categoryId: 'test', categoryName: 'Test Category', color: 'blue' };
      
      // Test adding to hierarchy
      store.addToHierarchy(category);
      expect(store.folderHierarchy).toHaveLength(1);
      expect(store.folderHierarchy[0].categoryId).toBe('test');
      
      // Test removing from hierarchy
      store.removeFromHierarchy('test');
      expect(store.folderHierarchy).toHaveLength(0);
    });

    it('should properly switch view modes for ViewModeToggle component', () => {
      // Initial state
      expect(store.viewMode).toBe('flat');
      expect(store.isFolderMode).toBe(false);
      
      // Switch to folders
      store.setViewMode('folders');
      expect(store.viewMode).toBe('folders');
      expect(store.isFolderMode).toBe(true);
      
      // Switch back to flat
      store.setViewMode('flat');
      expect(store.viewMode).toBe('flat');
      expect(store.isFolderMode).toBe(false);
      expect(store.currentPath).toEqual([]); // Should reset navigation
    });
  });

  describe('Tag Context Menu Logic Support', () => {
    it('should support navigation from tag context menu actions', () => {
      const hierarchy = [{ categoryId: 'type', categoryName: 'Document Type' }];
      store.setFolderHierarchy(hierarchy);
      
      // Simulate "Show in Folders" action
      store.setViewMode('folders');
      store.navigateToFolder('type', 'Invoice');
      
      expect(store.isFolderMode).toBe(true);
      expect(store.currentPath).toHaveLength(1);
      expect(store.currentPath[0].tagName).toBe('Invoice');
    });

    it('should support adding categories to hierarchy from context menu', () => {
      // Simulate adding a category that wasn't in hierarchy
      const newCategory = { 
        categoryId: 'priority', 
        categoryName: 'Priority',
        color: 'red' 
      };
      
      store.addToHierarchy(newCategory);
      
      expect(store.folderHierarchy).toHaveLength(1);
      expect(store.folderHierarchy[0].categoryId).toBe('priority');
    });
  });

  describe('Folder Structure Generation', () => {
    it('should generate proper folder structure for navigation components', () => {
      // Setup test data
      const categories = [{ categoryId: 'type', categoryName: 'Document Type' }];
      const evidence = [
        {
          id: 'doc1',
          tags: {
            type: [{ tagName: 'Invoice' }]
          }
        },
        {
          id: 'doc2', 
          tags: {
            type: [{ tagName: 'Receipt' }]
          }
        },
        {
          id: 'doc3',
          tags: {
            type: [{ tagName: 'Invoice' }]
          }
        }
      ];
      
      store.setFolderHierarchy(categories);
      store.setViewMode('folders');
      
      const folderStructure = store.generateFolderStructure(evidence);
      
      expect(folderStructure).toHaveLength(2); // Invoice and Receipt folders
      expect(folderStructure[0].tagName).toBe('Invoice'); // Should be first (higher count)
      expect(folderStructure[0].fileCount).toBe(2);
      expect(folderStructure[1].tagName).toBe('Receipt');
      expect(folderStructure[1].fileCount).toBe(1);
    });

    it('should properly filter evidence by current folder path', () => {
      // Setup hierarchy and navigate
      const hierarchy = [
        { categoryId: 'type', categoryName: 'Document Type' },
        { categoryId: 'year', categoryName: 'Year' }
      ];
      store.setFolderHierarchy(hierarchy);
      store.setViewMode('folders');
      store.navigateToFolder('type', 'Invoice');
      
      const evidence = [
        {
          id: 'doc1',
          tags: {
            type: [{ tagName: 'Invoice' }],
            year: [{ tagName: '2024' }]
          }
        },
        {
          id: 'doc2',
          tags: {
            type: [{ tagName: 'Receipt' }],
            year: [{ tagName: '2024' }]
          }
        }
      ];
      
      const filtered = store.filterEvidenceByPath(evidence);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('doc1'); // Only Invoice should match
    });
  });

  describe('Performance and Memory Management', () => {
    it('should efficiently cache folder structure computations', () => {
      const categories = [{ categoryId: 'type', categoryName: 'Document Type' }];
      const evidence = [{ id: 'doc1', tags: { type: [{ tagName: 'Invoice' }] } }];
      
      store.setFolderHierarchy(categories);
      store.setViewMode('folders');
      
      // First call should compute and cache
      const result1 = store.generateFolderStructure(evidence);
      
      // Second call should use cache (same result)
      const result2 = store.generateFolderStructure(evidence);
      
      expect(result1).toEqual(result2);
      expect(result1).toHaveLength(1);
    });

    it('should properly clear cache when hierarchy changes', () => {
      const categories = [{ categoryId: 'type', categoryName: 'Document Type' }];
      store.setFolderHierarchy(categories);
      
      // Generate some cached data
      const evidence = [{ id: 'doc1', tags: { type: [{ tagName: 'Invoice' }] } }];
      store.setViewMode('folders');
      store.generateFolderStructure(evidence);
      
      // Clear cache by changing hierarchy
      store.clearFolderCache();
      
      // Should still work (regenerate)
      const result = store.generateFolderStructure(evidence);
      expect(result).toHaveLength(1);
    });
  });

  describe('Component Integration Readiness', () => {
    it('should provide all required computed properties for breadcrumbs', () => {
      expect(store.breadcrumbPath).toBeDefined();
      expect(store.isAtRoot).toBeDefined();
      expect(store.currentDepth).toBeDefined();
      expect(store.isFolderMode).toBeDefined();
    });

    it('should provide all required methods for hierarchy selector', () => {
      expect(typeof store.setFolderHierarchy).toBe('function');
      expect(typeof store.addToHierarchy).toBe('function');
      expect(typeof store.removeFromHierarchy).toBe('function');
      expect(store.folderHierarchy).toBeDefined();
    });

    it('should provide all required state for view mode toggle', () => {
      expect(store.viewMode).toBeDefined();
      expect(store.isFolderMode).toBeDefined();
      expect(typeof store.setViewMode).toBe('function');
      expect(store.currentPath).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty evidence arrays gracefully', () => {
      const categories = [{ categoryId: 'type', categoryName: 'Document Type' }];
      store.setFolderHierarchy(categories);
      store.setViewMode('folders');
      
      const result = store.generateFolderStructure([]);
      expect(result).toEqual([]);
    });

    it('should handle invalid navigation gracefully', () => {
      // Try to navigate without hierarchy
      store.setViewMode('folders');
      store.navigateToFolder('nonexistent', 'test');
      
      // Should not crash and maintain valid state
      expect(store.currentPath).toEqual([]);
    });

    it('should handle malformed evidence data', () => {
      const categories = [{ categoryId: 'type', categoryName: 'Document Type' }];
      store.setFolderHierarchy(categories);
      store.setViewMode('folders');
      
      const malformedEvidence = [
        { id: 'doc1' }, // No tags
        { id: 'doc2', tags: null }, // Null tags
        { id: 'doc3', tags: { type: null } }, // Null category tags
        { id: 'doc4', tags: { type: [{ tagName: 'Invoice' }] } } // Valid
      ];
      
      const result = store.generateFolderStructure(malformedEvidence);
      expect(result).toHaveLength(1); // Should only process valid evidence
      expect(result[0].tagName).toBe('Invoice');
    });
  });
});