import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useOrganizerStore } from '../../../../../src/features/organizer/stores/organizer.js';
import { generateMockCategories, generateMockEvidence } from '../../../../../src/test-utils/virtualFolderTestUtils.js';

describe('Performance Optimization Tests', () => {
  let organizer;
  let mockCategories;
  let largeEvidenceSet;

  beforeEach(() => {
    setActivePinia(createPinia());
    organizer = useOrganizerStore();
    mockCategories = generateMockCategories(5);
    largeEvidenceSet = generateMockEvidence(1000, mockCategories);
  });

  describe('Large Dataset Performance Thresholds', () => {
    it('should generate folder structure in <50ms for 1000+ documents', () => {
      // Setup large dataset
      organizer.stores.organizerCore.evidence = largeEvidenceSet;
      organizer.setFolderHierarchy([
        { categoryId: mockCategories[0].id, categoryName: mockCategories[0].name },
        { categoryId: mockCategories[1].id, categoryName: mockCategories[1].name }
      ]);
      
      const startTime = performance.now();
      
      const folderStructure = organizer.generateFolderStructure(largeEvidenceSet);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // 50ms threshold
      expect(Array.isArray(folderStructure)).toBe(true);
    });

    it('should filter evidence in <25ms for complex hierarchies', () => {
      // Setup complex hierarchy
      organizer.stores.organizerCore.evidence = largeEvidenceSet;
      organizer.setFolderHierarchy([
        { categoryId: mockCategories[0].id, categoryName: mockCategories[0].name },
        { categoryId: mockCategories[1].id, categoryName: mockCategories[1].name },
        { categoryId: mockCategories[2].id, categoryName: mockCategories[2].name }
      ]);
      
      // Navigate to create filtering context
      organizer.navigateToFolder(mockCategories[0].id, 'Tag1');
      organizer.navigateToFolder(mockCategories[1].id, 'Tag2');
      
      const startTime = performance.now();
      
      const filteredEvidence = organizer.filterEvidenceByPath(largeEvidenceSet);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(25); // 25ms threshold
      expect(Array.isArray(filteredEvidence)).toBe(true);
    });

    it('should complete navigation operations in <10ms', () => {
      organizer.stores.organizerCore.evidence = largeEvidenceSet;
      organizer.setFolderHierarchy([
        { categoryId: mockCategories[0].id, categoryName: mockCategories[0].name }
      ]);
      
      const startTime = performance.now();
      
      // Test various navigation operations
      organizer.navigateToFolder(mockCategories[0].id, 'Tag1');
      organizer.navigateBack();
      organizer.navigateToRoot();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10); // 10ms threshold
    });

    it('should perform cache operations in <5ms', () => {
      organizer.stores.organizerCore.evidence = largeEvidenceSet;
      
      // Populate cache first
      const folderStructure = organizer.generateFolderStructure(largeEvidenceSet);
      
      // Now test cached lookup performance
      const startTime = performance.now();
      
      const cachedStructure = organizer.generateFolderStructure(largeEvidenceSet);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5); // 5ms threshold for cached operations
      expect(cachedStructure).toEqual(folderStructure);
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should scale memory usage linearly with data size', () => {
      // Test with different dataset sizes
      const smallSet = generateMockEvidence(100, mockCategories);
      const mediumSet = generateMockEvidence(500, mockCategories);
      const largeSet = generateMockEvidence(1000, mockCategories);
      
      const measureMemoryUsage = (evidenceSet) => {
        const initialMemory = performance.memory?.usedJSHeapSize || 0;
        
        organizer.stores.organizerCore.evidence = evidenceSet;
        organizer.generateFolderStructure(evidenceSet);
        
        const finalMemory = performance.memory?.usedJSHeapSize || 0;
        return finalMemory - initialMemory;
      };
      
      if (performance.memory) {
        const smallMemory = measureMemoryUsage(smallSet);
        const mediumMemory = measureMemoryUsage(mediumSet);
        const largeMemory = measureMemoryUsage(largeSet);
        
        // Memory usage should scale roughly linearly
        const smallToMediumRatio = mediumMemory / smallMemory;
        const mediumToLargeRatio = largeMemory / mediumMemory;
        
        // Ratios should be within reasonable bounds (2-8x for 5-2x data increase)
        expect(smallToMediumRatio).toBeGreaterThan(2);
        expect(smallToMediumRatio).toBeLessThan(8);
        expect(mediumToLargeRatio).toBeGreaterThan(1.5);
        expect(mediumToLargeRatio).toBeLessThan(4);
      }
    });

    it('should prevent memory leaks during extended usage', () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Simulate extended usage with many operations
      for (let i = 0; i < 100; i++) {
        const evidence = generateMockEvidence(50, mockCategories);
        organizer.stores.organizerCore.evidence = evidence;
        organizer.generateFolderStructure(evidence);
        organizer.navigateToFolder(mockCategories[0].id, 'Tag1');
        organizer.navigateToRoot();
        organizer.stores.virtualFolder.clearFolderCache();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      if (initialMemory > 0) {
        // Memory increase should be minimal after cleanup
        expect(memoryIncrease).toBeLessThan(5000000); // Less than 5MB increase
      }
    });

    it('should maintain virtual folder overhead under 5MB', () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Set up maximum virtual folder state
      organizer.stores.organizerCore.evidence = largeEvidenceSet;
      organizer.setViewMode('folders');
      organizer.setFolderHierarchy(mockCategories.map(cat => ({ 
        categoryId: cat.id, 
        categoryName: cat.name 
      })));
      
      // Generate multiple folder structures
      for (let i = 0; i < 10; i++) {
        organizer.navigateToFolder(mockCategories[i % mockCategories.length].id, `Tag${i}`);
        organizer.generateFolderStructure(largeEvidenceSet);
      }
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const overhead = finalMemory - initialMemory;
      
      if (initialMemory > 0) {
        expect(overhead).toBeLessThan(5000000); // Less than 5MB overhead
      }
    });
  });

  describe('UI Responsiveness Maintenance', () => {
    it('should not block main thread during folder operations', async () => {
      let threadBlocked = false;
      
      // Set up a timer to detect thread blocking
      const timeoutId = setTimeout(() => {
        threadBlocked = true;
      }, 100); // If timer doesn't fire in 100ms, thread was blocked
      
      // Perform heavy operations
      organizer.stores.organizerCore.evidence = largeEvidenceSet;
      organizer.setFolderHierarchy(mockCategories.map(cat => ({
        categoryId: cat.id,
        categoryName: cat.name
      })));
      
      for (let i = 0; i < 5; i++) {
        organizer.generateFolderStructure(largeEvidenceSet);
        organizer.navigateToFolder(mockCategories[i].id, `Tag${i}`);
      }
      
      // Allow timer to fire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      clearTimeout(timeoutId);
      expect(threadBlocked).toBe(false);
    });

    it('should provide performance metrics for monitoring', () => {
      const performanceData = {};
      
      // Measure various operations
      const measureOperation = (name, operation) => {
        const startTime = performance.now();
        operation();
        const endTime = performance.now();
        performanceData[name] = endTime - startTime;
      };
      
      organizer.stores.organizerCore.evidence = largeEvidenceSet;
      
      measureOperation('folderGeneration', () => {
        organizer.generateFolderStructure(largeEvidenceSet);
      });
      
      measureOperation('navigation', () => {
        organizer.navigateToFolder(mockCategories[0].id, 'Tag1');
      });
      
      measureOperation('filtering', () => {
        organizer.filterEvidenceByPath(largeEvidenceSet);
      });
      
      // Verify all metrics are available and reasonable
      expect(performanceData.folderGeneration).toBeDefined();
      expect(performanceData.navigation).toBeDefined();
      expect(performanceData.filtering).toBeDefined();
      
      expect(performanceData.folderGeneration).toBeGreaterThan(0);
      expect(performanceData.navigation).toBeGreaterThan(0);
      expect(performanceData.filtering).toBeGreaterThan(0);
    });
  });

  describe('Progressive Loading Support', () => {
    it('should support incremental folder loading for very large structures', () => {
      // Create very large dataset
      const veryLargeSet = generateMockEvidence(5000, mockCategories);
      organizer.stores.organizerCore.evidence = veryLargeSet;
      
      organizer.setFolderHierarchy([
        { categoryId: mockCategories[0].id, categoryName: mockCategories[0].name }
      ]);
      
      const startTime = performance.now();
      
      // Test that initial folder load is still fast
      const initialFolders = organizer.generateFolderStructure(veryLargeSet.slice(0, 100));
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10); // Initial load should be very fast
      expect(Array.isArray(initialFolders)).toBe(true);
    });

    it('should handle incremental updates efficiently', () => {
      organizer.stores.organizerCore.evidence = largeEvidenceSet;
      
      // Initial structure generation
      const initialStructure = organizer.generateFolderStructure(largeEvidenceSet);
      
      // Add more evidence incrementally
      const additionalEvidence = generateMockEvidence(100, mockCategories);
      const combinedEvidence = [...largeEvidenceSet, ...additionalEvidence];
      
      const startTime = performance.now();
      
      // Clear cache and regenerate (simulating incremental update)
      organizer.stores.virtualFolder.clearFolderCache();
      const updatedStructure = organizer.generateFolderStructure(combinedEvidence);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(60); // Slightly higher threshold for larger dataset
      expect(updatedStructure.length).toBeGreaterThanOrEqual(initialStructure.length);
    });
  });

  describe('Cache Performance Optimization', () => {
    it('should demonstrate significant performance improvement with caching', () => {
      organizer.stores.organizerCore.evidence = largeEvidenceSet;
      
      // Clear cache to ensure cold start
      organizer.stores.virtualFolder.clearFolderCache();
      
      // First generation (cold)
      const startCold = performance.now();
      const coldStructure = organizer.generateFolderStructure(largeEvidenceSet);
      const endCold = performance.now();
      const coldDuration = endCold - startCold;
      
      // Second generation (cached)
      const startCached = performance.now();
      const cachedStructure = organizer.generateFolderStructure(largeEvidenceSet);
      const endCached = performance.now();
      const cachedDuration = endCached - startCached;
      
      // Cached should be significantly faster (at least 50% improvement)
      expect(cachedDuration).toBeLessThan(coldDuration * 0.5);
      expect(cachedStructure).toEqual(coldStructure);
    });

    it('should handle cache invalidation without performance penalty', () => {
      organizer.stores.organizerCore.evidence = largeEvidenceSet;
      
      // Populate cache
      organizer.generateFolderStructure(largeEvidenceSet);
      
      const startTime = performance.now();
      
      // Test cache invalidation operations
      organizer.stores.virtualFolder.clearFolderCache();
      organizer.generateFolderStructure(largeEvidenceSet); // Should rebuild cache
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Cache invalidation and rebuild should still be reasonably fast
      expect(duration).toBeLessThan(75); // Slightly higher threshold for rebuild
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain consistent performance across multiple runs', () => {
      const runTimes = [];
      organizer.stores.organizerCore.evidence = largeEvidenceSet;
      
      // Run the same operation multiple times
      for (let i = 0; i < 10; i++) {
        organizer.stores.virtualFolder.clearFolderCache();
        
        const startTime = performance.now();
        organizer.generateFolderStructure(largeEvidenceSet);
        const endTime = performance.now();
        
        runTimes.push(endTime - startTime);
      }
      
      // Calculate statistics
      const averageTime = runTimes.reduce((sum, time) => sum + time, 0) / runTimes.length;
      const maxTime = Math.max(...runTimes);
      const minTime = Math.min(...runTimes);
      
      // Performance should be consistent (max shouldn't be more than 3x min)
      expect(maxTime / minTime).toBeLessThan(3);
      expect(averageTime).toBeLessThan(50); // Average should meet threshold
    });

    it('should scale predictably with hierarchy complexity', () => {
      organizer.stores.organizerCore.evidence = largeEvidenceSet;
      
      const singleLevelTime = measureHierarchyPerformance(1);
      const doubleLevelTime = measureHierarchyPerformance(2);
      const tripleLevelTime = measureHierarchyPerformance(3);
      
      // Performance should scale sub-linearly with hierarchy complexity
      expect(doubleLevelTime).toBeLessThan(singleLevelTime * 2.5);
      expect(tripleLevelTime).toBeLessThan(singleLevelTime * 4);
      
      function measureHierarchyPerformance(levels) {
        const hierarchy = mockCategories.slice(0, levels).map(cat => ({
          categoryId: cat.id,
          categoryName: cat.name
        }));
        
        organizer.setFolderHierarchy(hierarchy);
        
        // Navigate to create filtering context
        for (let i = 0; i < levels; i++) {
          organizer.navigateToFolder(mockCategories[i].id, `Tag${i}`);
        }
        
        organizer.stores.virtualFolder.clearFolderCache();
        
        const startTime = performance.now();
        organizer.generateFolderStructure(largeEvidenceSet);
        organizer.filterEvidenceByPath(largeEvidenceSet);
        const endTime = performance.now();
        
        // Reset navigation
        organizer.navigateToRoot();
        
        return endTime - startTime;
      }
    });
  });
});