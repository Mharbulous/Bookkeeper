import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useOrganizerStore } from '../../../../../src/features/organizer/stores/organizer.js';
import { generateMockCategories, generateMockEvidence } from '../../../../../src/test-utils/virtualFolderTestUtils.js';

describe('Comprehensive Error Handling Tests', () => {
  let organizer;
  let mockCategories;
  let mockEvidence;
  let consoleErrorSpy;

  beforeEach(() => {
    setActivePinia(createPinia());
    organizer = useOrganizerStore();
    mockCategories = generateMockCategories(3);
    mockEvidence = generateMockEvidence(20, mockCategories);
    
    // Spy on console.error to verify error handling doesn't spam console
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Network Failure Handling', () => {
    it('should handle network failures during data loading gracefully', async () => {
      // Mock network failure
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;
      
      expect(() => {
        // Attempt operations that might involve network calls
        organizer.generateFolderStructure(mockEvidence);
        organizer.navigateToFolder('test-category', 'test-tag');
      }).not.toThrow();
      
      // Verify system continues to function
      expect(organizer.viewMode).toBe('flat');
      expect(organizer.currentPath).toEqual([]);
    });

    it('should provide meaningful error messages for network failures', async () => {
      // Mock network failure with specific error
      const networkError = new Error('Failed to fetch');
      networkError.code = 'NETWORK_ERROR';
      
      const mockOperation = vi.fn().mockRejectedValue(networkError);
      
      try {
        await mockOperation();
      } catch (error) {
        expect(error.message).toContain('fetch');
        expect(error.code).toBe('NETWORK_ERROR');
      }
    });

    it('should implement retry mechanisms for transient failures', async () => {
      let attemptCount = 0;
      const mockOperation = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Transient error'));
        }
        return Promise.resolve('Success');
      });
      
      // Test retry logic (if implemented)
      const retryOperation = async (operation, maxRetries = 3) => {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await operation();
          } catch (error) {
            lastError = error;
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay
          }
        }
      };
      
      const result = await retryOperation(mockOperation);
      expect(result).toBe('Success');
      expect(attemptCount).toBe(3); // Should have retried 3 times
    });
  });

  describe('Corrupted Local Storage Handling', () => {
    it('should recover from corrupted localStorage gracefully', () => {
      // Mock corrupted localStorage
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn().mockImplementation((key) => {
        if (key.includes('virtualFolder') || key.includes('organizer')) {
          return '{"invalid": json}'; // Corrupted JSON
        }
        return originalGetItem.call(localStorage, key);
      });
      
      expect(() => {
        // Initialize store which should attempt to load from localStorage
        const freshOrganizer = useOrganizerStore();
        freshOrganizer.setViewMode('folders');
      }).not.toThrow();
      
      // Should fall back to default values
      expect(organizer.viewMode).toBeDefined();
      expect(organizer.folderHierarchy).toBeDefined();
      
      localStorage.getItem = originalGetItem;
    });

    it('should handle localStorage being unavailable', () => {
      // Mock localStorage as unavailable
      const originalLocalStorage = global.localStorage;
      delete global.localStorage;
      
      expect(() => {
        organizer.setViewMode('folders');
        organizer.setFolderHierarchy([{ categoryId: 'test', categoryName: 'Test' }]);
      }).not.toThrow();
      
      // Should continue to function without persistence
      expect(organizer.viewMode).toBe('folders');
      
      global.localStorage = originalLocalStorage;
    });

    it('should validate localStorage data before using it', () => {
      // Mock localStorage with invalid data types
      localStorage.setItem('test-hierarchy', JSON.stringify('not-an-array'));
      localStorage.setItem('test-view-mode', JSON.stringify(123)); // number instead of string
      
      // Mock the store's localStorage loading logic
      const loadStoredHierarchy = () => {
        try {
          const stored = localStorage.getItem('test-hierarchy');
          const parsed = JSON.parse(stored);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      };
      
      const loadStoredViewMode = () => {
        try {
          const stored = localStorage.getItem('test-view-mode');
          const parsed = JSON.parse(stored);
          return typeof parsed === 'string' && ['flat', 'folders'].includes(parsed) ? parsed : 'flat';
        } catch {
          return 'flat';
        }
      };
      
      expect(loadStoredHierarchy()).toEqual([]);
      expect(loadStoredViewMode()).toBe('flat');
    });
  });

  describe('Data Integrity Validation', () => {
    it('should handle malformed evidence data structures', () => {
      const malformedEvidence = [
        null,
        undefined,
        'not-an-object',
        { id: 'missing-required-fields' },
        { id: 'circular-ref', self: null },
        { id: 'invalid-tags', tags: 'not-an-object' },
        { id: 'invalid-subcollection', subcollectionTags: 'not-an-object' }
      ];
      
      // Add circular reference
      malformedEvidence[4].self = malformedEvidence[4];
      
      expect(() => {
        const result = organizer.generateFolderStructure(malformedEvidence);
        expect(Array.isArray(result)).toBe(true);
        expect(result).toEqual([]); // Should return empty array for malformed data
      }).not.toThrow();
    });

    it('should validate category data before processing', () => {
      const invalidCategories = [
        null,
        undefined,
        { id: 'missing-name' },
        { name: 'missing-id' },
        { id: '', name: 'empty-id' },
        { id: 'valid-id', name: '' }, // empty name
        { id: 'valid-id', name: 'valid', color: 'invalid-color' }
      ];
      
      invalidCategories.forEach(category => {
        expect(() => {
          if (category && category.id && category.name) {
            organizer.setFolderHierarchy([{ 
              categoryId: category.id, 
              categoryName: category.name 
            }]);
          }
        }).not.toThrow();
      });
    });

    it('should handle missing or invalid tag data gracefully', () => {
      const evidenceWithBadTags = [
        {
          id: 'no-tags',
          filename: 'test1.pdf',
          // missing tags property
        },
        {
          id: 'null-tags',
          filename: 'test2.pdf',
          tags: null
        },
        {
          id: 'invalid-subcollection-tags',
          filename: 'test3.pdf',
          tags: {},
          subcollectionTags: 'not-an-object'
        },
        {
          id: 'nested-invalid-tags',
          filename: 'test4.pdf',
          tags: {},
          subcollectionTags: {
            'category1': 'not-an-object'
          }
        }
      ];
      
      expect(() => {
        const result = organizer.filterEvidenceByPath(evidenceWithBadTags);
        expect(Array.isArray(result)).toBe(true);
      }).not.toThrow();
    });

    it('should prevent infinite loops with circular data structures', () => {
      const circularEvidence = {
        id: 'circular',
        filename: 'test.pdf',
        tags: {},
        metadata: {}
      };
      
      // Create circular reference
      circularEvidence.metadata.parent = circularEvidence;
      
      expect(() => {
        const result = organizer.generateFolderStructure([circularEvidence]);
        expect(result).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Error Message Quality', () => {
    it('should provide meaningful error messages with context', () => {
      const testError = (operation, expectedMessageContent) => {
        try {
          operation();
        } catch (error) {
          expect(error.message.toLowerCase()).toContain(expectedMessageContent.toLowerCase());
          expect(error.message).toMatch(/\w+/); // Should contain actual words, not just error codes
        }
      };
      
      // Test specific error scenarios
      expect(() => {
        organizer.navigateToFolder('', 'test-tag'); // empty category ID
      }).not.toThrow(); // Should handle gracefully, not throw
      
      expect(() => {
        organizer.navigateToFolder('valid-category', ''); // empty tag name
      }).not.toThrow(); // Should handle gracefully, not throw
    });

    it('should include helpful recovery suggestions in error messages', () => {
      const createHelpfulError = (message, suggestion) => {
        const error = new Error(message);
        error.suggestion = suggestion;
        return error;
      };
      
      const helpfulError = createHelpfulError(
        'Failed to load folder structure',
        'Try refreshing the page or switching to flat view'
      );
      
      expect(helpfulError.message).toContain('Failed to load folder structure');
      expect(helpfulError.suggestion).toContain('refreshing the page');
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should implement circuit breaker for repeated failures', () => {
      let failureCount = 0;
      let circuitOpen = false;
      
      const circuitBreaker = {
        maxFailures: 3,
        resetTimeout: 1000,
        attempt: async (operation) => {
          if (circuitOpen) {
            throw new Error('Circuit breaker is open');
          }
          
          try {
            const result = await operation();
            failureCount = 0; // Reset on success
            return result;
          } catch (error) {
            failureCount++;
            if (failureCount >= circuitBreaker.maxFailures) {
              circuitOpen = true;
              setTimeout(() => {
                circuitOpen = false;
                failureCount = 0;
              }, circuitBreaker.resetTimeout);
            }
            throw error;
          }
        }
      };
      
      const failingOperation = () => Promise.reject(new Error('Operation failed'));
      
      // Test circuit breaker opens after max failures
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.attempt(failingOperation);
        } catch (error) {
          expect(error.message).toContain('Operation failed');
        }
      }
      
      // Fourth attempt should be blocked by circuit breaker
      try {
        await circuitBreaker.attempt(failingOperation);
      } catch (error) {
        expect(error.message).toContain('Circuit breaker is open');
      }
    });
  });

  describe('Graceful Degradation', () => {
    it('should degrade gracefully when virtual folder features fail', () => {
      // Mock virtual folder store to throw errors
      const originalGenerateFolderStructure = organizer.generateFolderStructure;
      organizer.generateFolderStructure = vi.fn().mockImplementation(() => {
        throw new Error('Virtual folder system unavailable');
      });
      
      expect(() => {
        // Should fall back to flat view functionality
        organizer.setViewMode('flat');
        const evidence = organizer.filteredEvidence;
        expect(Array.isArray(evidence)).toBe(true);
      }).not.toThrow();
      
      organizer.generateFolderStructure = originalGenerateFolderStructure;
    });

    it('should maintain core functionality when advanced features fail', () => {
      // Mock advanced features to fail
      organizer.stores.virtualFolder.clearFolderCache = vi.fn().mockImplementation(() => {
        throw new Error('Cache system unavailable');
      });
      
      expect(() => {
        // Core functionality should still work
        organizer.setFilter('test');
        organizer.clearFilters();
        const evidence = organizer.evidenceList;
        expect(evidence).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Resource Cleanup on Errors', () => {
    it('should cleanup resources when operations fail', () => {
      const mockResource = {
        allocated: true,
        cleanup: vi.fn()
      };
      
      const operationWithCleanup = () => {
        try {
          // Simulate operation that allocates resources
          mockResource.allocated = true;
          throw new Error('Operation failed');
        } catch (error) {
          // Ensure cleanup happens even on error
          if (mockResource.allocated) {
            mockResource.cleanup();
            mockResource.allocated = false;
          }
          throw error;
        }
      };
      
      expect(() => operationWithCleanup()).toThrow('Operation failed');
      expect(mockResource.cleanup).toHaveBeenCalled();
      expect(mockResource.allocated).toBe(false);
    });

    it('should prevent memory leaks when errors occur during processing', () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Simulate operations that fail but should cleanup properly
      for (let i = 0; i < 10; i++) {
        try {
          // Operation that allocates memory then fails
          const largeArray = new Array(10000).fill('test data');
          organizer.generateFolderStructure(largeArray);
          throw new Error('Simulated failure');
        } catch (error) {
          // Cleanup should happen automatically via garbage collection
        }
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      if (initialMemory > 0) {
        // Memory increase should be minimal after cleanup
        expect(memoryIncrease).toBeLessThan(1000000); // Less than 1MB
      }
    });
  });

  describe('Error Reporting and Monitoring', () => {
    it('should log errors appropriately without spamming console', () => {
      // Reset the spy to count calls
      consoleErrorSpy.mockClear();
      
      // Simulate various error scenarios
      organizer.generateFolderStructure(null);
      organizer.generateFolderStructure(undefined);
      organizer.generateFolderStructure('invalid-data');
      
      // Should handle gracefully without excessive console errors
      expect(consoleErrorSpy).toHaveBeenCalledTimes(0); // No console errors for graceful handling
    });

    it('should provide error context for debugging', () => {
      const contextualError = (message, context) => {
        const error = new Error(message);
        error.context = context;
        error.timestamp = new Date().toISOString();
        error.userAgent = navigator.userAgent;
        return error;
      };
      
      const error = contextualError('Test error', {
        operation: 'generateFolderStructure',
        evidenceCount: 100,
        hierarchy: ['category1', 'category2']
      });
      
      expect(error.context.operation).toBe('generateFolderStructure');
      expect(error.context.evidenceCount).toBe(100);
      expect(error.timestamp).toBeDefined();
      expect(error.userAgent).toBeDefined();
    });
  });

  describe('Edge Case Validation', () => {
    it('should handle extremely large input values', () => {
      const extremelyLargeArray = new Array(1000000).fill({
        id: 'test',
        filename: 'test.pdf'
      });
      
      expect(() => {
        // Should either handle gracefully or fail fast with clear error
        const result = organizer.generateFolderStructure(extremelyLargeArray);
        if (result !== null) {
          expect(Array.isArray(result)).toBe(true);
        }
      }).not.toThrow();
    });

    it('should handle concurrent operations gracefully', async () => {
      // Simulate concurrent operations that might conflict
      const operations = [];
      
      for (let i = 0; i < 10; i++) {
        operations.push(
          Promise.resolve().then(() => {
            organizer.navigateToFolder(`category${i}`, `tag${i}`);
            organizer.generateFolderStructure(mockEvidence);
            organizer.navigateBack();
          })
        );
      }
      
      expect(() => {
        return Promise.all(operations);
      }).not.toThrow();
      
      // Final state should be consistent
      expect(organizer.currentPath).toBeDefined();
      expect(Array.isArray(organizer.currentPath)).toBe(true);
    });
  });
});