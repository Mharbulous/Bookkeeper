import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useOrganizerStore } from '../../../../../src/features/organizer/stores/organizer.js';
import { generateMockCategories, generateMockEvidence } from '../../../../../src/test-utils/virtualFolderTestUtils.js';

describe('Backward Compatibility Tests', () => {
  let organizer;
  let mockCategories;
  let mockEvidence;

  beforeEach(() => {
    setActivePinia(createPinia());
    organizer = useOrganizerStore();
    mockCategories = generateMockCategories(3);
    mockEvidence = generateMockEvidence(20, mockCategories);
  });

  describe('Legacy Organizer Store Methods', () => {
    it('should preserve all v1.0/v1.1/v1.2 methods', () => {
      // Core v1.0 methods
      expect(typeof organizer.setFilter).toBe('function');
      expect(typeof organizer.clearFilters).toBe('function');
      expect(typeof organizer.reset).toBe('function');
      
      // v1.1 category methods  
      expect(typeof organizer.addCategory).toBe('function');
      expect(typeof organizer.updateCategory).toBe('function');
      expect(typeof organizer.deleteCategory).toBe('function');
      
      // v1.2 AI categorization methods
      expect(typeof organizer.processAICategorization).toBe('function');
      expect(typeof organizer.approveAITag).toBe('function');
      expect(typeof organizer.rejectAITag).toBe('function');
    });

    it('should maintain setFilter method behavior', () => {
      const filterValue = 'test filter';
      
      organizer.setFilter(filterValue);
      
      expect(organizer.filterText).toBe(filterValue);
      // Verify filtered evidence updates accordingly
      expect(organizer.filteredEvidence).toBeDefined();
    });

    it('should maintain clearFilters method behavior', () => {
      // Set up some filters first
      organizer.setFilter('test');
      
      organizer.clearFilters();
      
      expect(organizer.filterText).toBe('');
      expect(organizer.filteredEvidence.length).toBeGreaterThanOrEqual(0);
    });

    it('should maintain reset method behavior', () => {
      // Set up some state
      organizer.setFilter('test');
      organizer.setViewMode('folders');
      
      organizer.reset();
      
      // Verify all stores reset to initial state
      expect(organizer.filterText).toBe('');
      expect(organizer.viewMode).toBe('flat');
      expect(organizer.folderHierarchy).toEqual([]);
      expect(organizer.currentPath).toEqual([]);
    });
  });

  describe('Legacy Computed Properties', () => {
    it('should preserve evidenceList computed property', () => {
      expect(organizer.evidenceList).toBeDefined();
      expect(Array.isArray(organizer.evidenceList)).toBe(true);
    });

    it('should preserve filteredEvidence computed property', () => {
      expect(organizer.filteredEvidence).toBeDefined();
      expect(Array.isArray(organizer.filteredEvidence)).toBe(true);
    });

    it('should preserve filterText computed property', () => {
      expect(organizer.filterText).toBeDefined();
      expect(typeof organizer.filterText).toBe('string');
    });

    it('should preserve categories computed property', () => {
      expect(organizer.categories).toBeDefined();
      expect(Array.isArray(organizer.categories)).toBe(true);
    });

    it('should maintain filteredEvidence filtering behavior', () => {
      // Mock evidence data
      organizer.stores.organizerCore.evidence = mockEvidence;
      
      const allEvidence = organizer.filteredEvidence;
      const initialCount = allEvidence.length;
      
      // Apply filter
      organizer.setFilter('invoice');
      const filteredCount = organizer.filteredEvidence.length;
      
      // Filtered results should be less than or equal to total
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    });
  });

  describe('Store Interface Compatibility', () => {
    it('should maintain existing store structure access patterns', () => {
      // Test direct store access patterns used by components
      expect(organizer.stores).toBeDefined();
      expect(organizer.stores.organizerCore).toBeDefined();
      expect(organizer.stores.categoryStore).toBeDefined();
      expect(organizer.stores.organizerQuery).toBeDefined();
      
      // New v1.3 store should be accessible too
      expect(organizer.stores.virtualFolder).toBeDefined();
    });

    it('should maintain computed property reactivity', () => {
      let reactiveCalled = false;
      
      // Watch for reactivity
      organizer.$subscribe(() => {
        reactiveCalled = true;
      });
      
      // Trigger a change
      organizer.setFilter('test');
      
      expect(reactiveCalled).toBe(true);
    });
  });

  describe('Category Management Compatibility', () => {
    it('should preserve category CRUD operations', async () => {
      const newCategory = {
        name: 'Test Category',
        color: '#FF0000',
        description: 'Test description'
      };
      
      // Test category creation
      const createdCategory = await organizer.addCategory(newCategory);
      expect(createdCategory).toBeDefined();
      expect(createdCategory.name).toBe(newCategory.name);
      
      // Test category update
      const updatedData = { ...createdCategory, name: 'Updated Category' };
      const updatedCategory = await organizer.updateCategory(createdCategory.id, updatedData);
      expect(updatedCategory.name).toBe('Updated Category');
      
      // Test category deletion
      const deleteResult = await organizer.deleteCategory(createdCategory.id);
      expect(deleteResult).toBe(true);
    });

    // Color validation test removed - colors are now automatically assigned by UI
  });

  describe('Data Structure Compatibility', () => {
    it('should handle legacy evidence data format', () => {
      const legacyEvidence = {
        id: 'test-evidence-1',
        filename: 'test.pdf',
        metadata: { size: 1000 },
        tags: {}, // Legacy format without subcollectionTags
        uploadedAt: new Date()
      };
      
      organizer.stores.organizerCore.evidence = [legacyEvidence];
      
      expect(() => {
        const filtered = organizer.filteredEvidence;
        expect(Array.isArray(filtered)).toBe(true);
      }).not.toThrow();
    });

    it('should handle new evidence data format with subcollectionTags', () => {
      const newEvidence = {
        id: 'test-evidence-2',
        filename: 'test2.pdf',
        metadata: { size: 2000 },
        tags: {},
        subcollectionTags: mockEvidence[0]?.subcollectionTags || {},
        uploadedAt: new Date()
      };
      
      organizer.stores.organizerCore.evidence = [newEvidence];
      
      expect(() => {
        const filtered = organizer.filteredEvidence;
        expect(Array.isArray(filtered)).toBe(true);
      }).not.toThrow();
    });
  });

  describe('Event System Compatibility', () => {
    it('should maintain existing event handling patterns', () => {
      let eventFired = false;
      
      // Mock event listener pattern used by components
      const unsubscribe = organizer.$subscribe((mutation, state) => {
        if (mutation.type === 'setFilter') {
          eventFired = true;
        }
      });
      
      organizer.setFilter('test');
      
      expect(eventFired).toBe(true);
      unsubscribe();
    });

    it('should not break existing watchers when adding v1.3 functionality', () => {
      let filterWatcherCalled = false;
      let viewModeWatcherCalled = false;
      
      // Set up watchers similar to existing components
      const filterUnwatch = organizer.$subscribe((mutation, state) => {
        if (mutation.storeId === 'organizerQuery' || mutation.events?.key === 'filterText') {
          filterWatcherCalled = true;
        }
      });
      
      const viewModeUnwatch = organizer.$subscribe((mutation, state) => {
        if (mutation.storeId === 'virtualFolder' || mutation.events?.key === 'viewMode') {
          viewModeWatcherCalled = true;
        }
      });
      
      // Trigger both old and new functionality
      organizer.setFilter('test');
      organizer.setViewMode('folders');
      
      expect(filterWatcherCalled).toBe(true);
      expect(viewModeWatcherCalled).toBe(true);
      
      filterUnwatch();
      viewModeUnwatch();
    });
  });

  describe('API Contract Preservation', () => {
    it('should maintain method signatures for existing methods', () => {
      // Test setFilter method signature
      expect(() => organizer.setFilter('string')).not.toThrow();
      expect(() => organizer.setFilter()).not.toThrow(); // Should handle undefined
      
      // Test clearFilters method signature  
      expect(() => organizer.clearFilters()).not.toThrow();
      
      // Test reset method signature
      expect(() => organizer.reset()).not.toThrow();
    });

    it('should return expected data types from legacy methods', () => {
      const filterResult = organizer.setFilter('test');
      expect(filterResult).toBeUndefined(); // setFilter doesn't return value
      
      const clearResult = organizer.clearFilters();
      expect(clearResult).toBeUndefined(); // clearFilters doesn't return value
      
      const resetResult = organizer.reset();
      expect(resetResult).toBeUndefined(); // reset doesn't return value
    });
  });

  describe('Performance Regression Prevention', () => {
    it('should maintain performance of legacy computed properties', () => {
      // Set up larger dataset
      const largeEvidenceSet = generateMockEvidence(100, mockCategories);
      organizer.stores.organizerCore.evidence = largeEvidenceSet;
      
      const startTime = performance.now();
      
      // Access legacy computed properties multiple times
      for (let i = 0; i < 10; i++) {
        const _ = organizer.filteredEvidence;
        const __ = organizer.evidenceList;
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(50); // 50ms threshold
    });

    it('should not significantly increase memory usage for legacy operations', () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Perform typical legacy operations
      organizer.setFilter('test');
      organizer.clearFilters();
      organizer.setFilter('another test');
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal for these operations
      if (initialMemory > 0) { // Only test if memory API available
        expect(memoryIncrease).toBeLessThan(1000000); // Less than 1MB increase
      }
    });
  });
});