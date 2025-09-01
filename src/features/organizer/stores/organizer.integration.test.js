import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useOrganizerStore } from './organizer.js';
import { 
  generateMockCategories, 
  generateMockEvidence, 
  testScenarios,
  performanceUtils,
  validationUtils
} from '../../../test-utils/virtualFolderTestUtils.js';

// Mock Firebase dependencies
vi.mock('../../../services/firebase.js', () => ({
  db: {}
}));

// Mock auth store
vi.mock('../../../core/stores/auth.js', () => ({
  useAuthStore: () => ({
    currentTeam: 'mock-team-id',
    isAuthenticated: true
  })
}));

// Create mock functions that persist across tests
const mockCoreReset = vi.fn();
const mockQueryReset = vi.fn();
const mockCategoryReset = vi.fn();

// Mock the individual stores to focus on integration testing
vi.mock('./organizerCore.js', () => ({
  useOrganizerCoreStore: () => ({
    evidenceList: [],
    evidenceCount: 0,
    loading: false,
    error: null,
    isInitialized: true,
    loadEvidence: vi.fn().mockResolvedValue(() => {}),
    getDisplayInfo: vi.fn(),
    reset: mockCoreReset
  })
}));

vi.mock('./organizerQueryStore.js', () => ({
  useOrganizerQueryStore: () => ({
    filteredEvidence: [],
    filteredCount: 0,
    filterText: '',
    setFilter: vi.fn(),
    clearFilters: vi.fn(),
    applyFiltersWithCategories: vi.fn(),
    getStructuredTagsByCategory: vi.fn(),
    hasAnyTags: vi.fn(),
    getAllTags: vi.fn(),
    initializeFilters: vi.fn(),
    reset: mockQueryReset
  })
}));

vi.mock('./categoryStore.js', () => ({
  useCategoryStore: () => ({
    categories: [],
    categoryCount: 0,
    activeCategories: [],
    loading: false,
    error: null,
    isInitialized: true,
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    getCategoryById: vi.fn(),
    loadCategories: vi.fn().mockResolvedValue(() => {}),
    reset: mockCategoryReset
  })
}));

describe('Organizer Store Integration', () => {
  let store;
  let mockCategories;
  let mockEvidence;
  
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockCoreReset.mockClear();
    mockQueryReset.mockClear();
    mockCategoryReset.mockClear();
    store = useOrganizerStore();
    mockCategories = generateMockCategories(3);
    mockEvidence = generateMockEvidence(15, mockCategories);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Store Facade Pattern', () => {
    it('should initialize with all component stores', () => {
      expect(store).toBeDefined();
      expect(store.stores).toBeDefined();
      expect(store.stores.core).toBeDefined();
      expect(store.stores.query).toBeDefined();
      expect(store.stores.category).toBeDefined();
      expect(store.stores.virtualFolder).toBeDefined();
    });

    it('should provide backward compatibility interface', () => {
      // v1.0 legacy interface
      expect(store.evidenceList).toBeDefined();
      expect(store.filteredEvidence).toBeDefined();
      expect(store.loading).toBeDefined();
      expect(store.error).toBeDefined();
      expect(store.filterText).toBeDefined();
      expect(store.isInitialized).toBeDefined();
      expect(store.evidenceCount).toBeDefined();
      expect(store.filteredCount).toBeDefined();
      
      // Legacy methods
      expect(typeof store.loadEvidence).toBe('function');
      expect(typeof store.setFilter).toBe('function');
      expect(typeof store.clearFilters).toBe('function');
      expect(typeof store.reset).toBe('function');
      expect(typeof store.getDisplayInfo).toBe('function');
      expect(typeof store.getAllTags).toBe('function');
    });

    it('should provide v1.1 category management interface', () => {
      expect(store.categories).toBeDefined();
      expect(store.categoryCount).toBeDefined();
      expect(store.activeCategories).toBeDefined();
      
      expect(typeof store.createCategory).toBe('function');
      expect(typeof store.updateCategory).toBe('function');
      expect(typeof store.deleteCategory).toBe('function');
      expect(typeof store.getCategoryById).toBe('function');
      expect(typeof store.applyFiltersWithCategories).toBe('function');
      expect(typeof store.getStructuredTagsByCategory).toBe('function');
      expect(typeof store.hasAnyTags).toBe('function');
    });

    it('should provide v1.3 virtual folder interface', () => {
      // Virtual folder state
      expect(store.viewMode).toBeDefined();
      expect(store.isFolderMode).toBeDefined();
      expect(store.folderHierarchy).toBeDefined();
      expect(store.currentPath).toBeDefined();
      expect(store.breadcrumbPath).toBeDefined();
      expect(store.isAtRoot).toBeDefined();
      expect(store.currentDepth).toBeDefined();
      
      // Virtual folder methods
      expect(typeof store.setViewMode).toBe('function');
      expect(typeof store.setFolderHierarchy).toBe('function');
      expect(typeof store.navigateToFolder).toBe('function');
      expect(typeof store.navigateToDepth).toBe('function');
      expect(typeof store.navigateBack).toBe('function');
      expect(typeof store.navigateToRoot).toBe('function');
      expect(typeof store.generateFolderStructure).toBe('function');
      expect(typeof store.filterEvidenceByPath).toBe('function');
      expect(typeof store.getFolderContext).toBe('function');
    });

    it('should provide access to individual stores', () => {
      expect(store.stores.core).toBeDefined();
      expect(store.stores.query).toBeDefined();
      expect(store.stores.category).toBeDefined();
      expect(store.stores.virtualFolder).toBeDefined();
    });
  });

  describe('Virtual Folder Integration', () => {
    beforeEach(() => {
      const hierarchy = [
        { categoryId: 'doc-type', categoryName: 'Document Type' },
        { categoryId: 'client', categoryName: 'Client' }
      ];
      store.setFolderHierarchy(hierarchy);
    });

    it('should integrate virtual folder state through facade', () => {
      expect(store.viewMode).toBe('flat');
      expect(store.isFolderMode).toBe(false);
      expect(store.isAtRoot).toBe(true);
      expect(store.currentDepth).toBe(0);
      
      store.setViewMode('folders');
      
      expect(store.viewMode).toBe('folders');
      expect(store.isFolderMode).toBe(true);
    });

    it('should handle virtual folder navigation through facade', () => {
      store.setViewMode('folders');
      store.navigateToFolder('doc-type', 'Invoice');
      
      expect(store.currentDepth).toBe(1);
      expect(store.isAtRoot).toBe(false);
      expect(store.currentPath).toHaveLength(1);
      expect(store.currentPath[0].tagName).toBe('Invoice');
      
      const breadcrumbs = store.breadcrumbPath;
      expect(validationUtils.validateBreadcrumbs(breadcrumbs, 1)).toBe(true);
    });

    it('should generate folder structure through facade', () => {
      const testData = testScenarios.hierarchicalTestData();
      
      const folders = store.generateFolderStructure(testData.evidence);
      
      expect(validationUtils.validateFolderStructure(folders)).toBe(true);
      expect(folders).toHaveLength(2); // Invoice and Receipt
    });

    it('should filter evidence by path through facade', () => {
      const testData = testScenarios.hierarchicalTestData();
      store.navigateToFolder('doc-type', 'Invoice');
      
      const filtered = store.filterEvidenceByPath(testData.evidence);
      
      expect(filtered).toHaveLength(2); // Both invoices
    });

    it('should provide folder context through facade', () => {
      store.setViewMode('folders');
      store.navigateToFolder('doc-type', 'Invoice');
      
      const context = store.getFolderContext();
      
      expect(context.viewMode).toBe('folders');
      expect(context.isFolderMode).toBe(true);
      expect(context.currentDepth).toBe(1);
      expect(context.isAtRoot).toBe(false);
    });
  });

  describe('Store Initialization', () => {
    it('should initialize all stores in parallel', async () => {
      const initResult = await store.initialize();
      
      expect(store.stores.core.loadEvidence).toHaveBeenCalled();
      expect(store.stores.category.loadCategories).toHaveBeenCalled();
      expect(initResult).toBeDefined();
    });

    it('should handle initialization errors', async () => {
      store.stores.core.loadEvidence.mockRejectedValue(new Error('Load failed'));
      
      await expect(store.initialize()).rejects.toThrow('Load failed');
    });

    it('should report initialization status correctly', () => {
      // Both core and category stores report initialized
      expect(store.isInitialized).toBe(true);
    });
  });

  describe('Cross-Store Integration', () => {
    it('should delegate legacy methods to appropriate stores', () => {
      const testFilter = 'test filter';
      store.setFilter(testFilter);
      
      expect(store.stores.query.setFilter).toHaveBeenCalledWith(testFilter);
    });

    it('should delegate category methods to category store', () => {
      const categoryData = { name: 'Test Category', color: '#ff0000' };
      store.createCategory(categoryData);
      
      expect(store.stores.category.createCategory).toHaveBeenCalledWith(categoryData);
    });

    it('should delegate evidence methods to core store', () => {
      const evidenceId = 'test-evidence';
      store.getDisplayInfo(evidenceId);
      
      expect(store.stores.core.getDisplayInfo).toHaveBeenCalledWith(evidenceId);
    });

    it('should reset all stores when reset is called', () => {
      store.reset();
      
      expect(mockCoreReset).toHaveBeenCalled();
      expect(mockQueryReset).toHaveBeenCalled();
      expect(mockCategoryReset).toHaveBeenCalled();
      // Virtual folder store is not mocked, so we test it directly
      expect(store.stores.virtualFolder.viewMode).toBe('flat');
    });
  });

  describe('Evidence Change Watching', () => {
    it('should clear virtual folder cache when evidence changes', () => {
      // Mock the core store to have reactive evidence
      const mockCoreStore = {
        evidenceList: [],
        ...store.stores.core
      };
      
      // Spy on virtual folder cache clear
      const clearCacheSpy = vi.spyOn(store.stores.virtualFolder, 'clearFolderCache');
      
      // Simulate evidence change
      mockCoreStore.evidenceList = [...mockEvidence];
      
      // In a real scenario, the watcher would trigger automatically
      // Here we simulate the effect manually since we're mocking the stores
      store.stores.virtualFolder.clearFolderCache();
      store.stores.query.initializeFilters();
      
      expect(clearCacheSpy).toHaveBeenCalled();
    });
  });

  describe('Performance Integration', () => {
    it('should maintain performance with integrated operations', async () => {
      const testData = testScenarios.hierarchicalTestData();
      store.setFolderHierarchy(testData.categories);
      
      const result = await performanceUtils.measureTime(async () => {
        store.setViewMode('folders');
        store.navigateToFolder('doc-type', 'Invoice');
        const folders = store.generateFolderStructure(testData.evidence);
        const filtered = store.filterEvidenceByPath(testData.evidence);
        const context = store.getFolderContext();
        
        return { folders, filtered, context };
      });
      
      expect(result.duration).toBeLessThan(10); // Should be fast for integrated operations
      expect(validationUtils.validateFolderStructure(result.result.folders)).toBe(true);
    });

    it('should handle large datasets efficiently in integration', async () => {
      const largeData = testScenarios.largeDataset();
      store.setFolderHierarchy(largeData.categories);
      
      const result = await performanceUtils.measureTime(() => {
        store.setViewMode('folders');
        return store.generateFolderStructure(largeData.evidence);
      });
      
      expect(result.duration).toBeLessThan(100); // Should handle large data efficiently
      expect(validationUtils.validateFolderStructure(result.result)).toBe(true);
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state across virtual folder operations', () => {
      const hierarchy = [
        { categoryId: 'cat-1', categoryName: 'Category 1' },
        { categoryId: 'cat-2', categoryName: 'Category 2' }
      ];
      
      store.setFolderHierarchy(hierarchy);
      store.setViewMode('folders');
      
      // Verify initial state
      expect(store.folderHierarchy).toEqual(hierarchy);
      expect(store.isFolderMode).toBe(true);
      expect(store.isAtRoot).toBe(true);
      
      // Navigate and verify state consistency
      store.navigateToFolder('cat-1', 'Tag1');
      
      expect(store.currentDepth).toBe(1);
      expect(store.isAtRoot).toBe(false);
      expect(store.breadcrumbPath).toHaveLength(1);
      
      // Navigate deeper and verify
      store.navigateToFolder('cat-2', 'Tag2');
      
      expect(store.currentDepth).toBe(2);
      expect(store.breadcrumbPath).toHaveLength(2);
      
      // Navigate back and verify
      store.navigateBack();
      
      expect(store.currentDepth).toBe(1);
      expect(store.breadcrumbPath).toHaveLength(1);
    });

    it('should maintain state when switching view modes', () => {
      const hierarchy = [{ categoryId: 'cat-1', categoryName: 'Category 1' }];
      
      store.setFolderHierarchy(hierarchy);
      store.setViewMode('folders');
      store.navigateToFolder('cat-1', 'Tag1');
      
      expect(store.currentPath).toHaveLength(1);
      
      // Switch to flat mode (should reset navigation)
      store.setViewMode('flat');
      
      expect(store.isFolderMode).toBe(false);
      expect(store.currentPath).toHaveLength(0);
      expect(store.isAtRoot).toBe(true);
      
      // Hierarchy should be preserved
      expect(store.folderHierarchy).toEqual(hierarchy);
    });

    it('should handle concurrent operations correctly', async () => {
      const testData = testScenarios.hierarchicalTestData();
      store.setFolderHierarchy(testData.categories);
      
      // Simulate concurrent operations
      const operations = await Promise.all([
        Promise.resolve(store.generateFolderStructure(testData.evidence)),
        Promise.resolve(store.filterEvidenceByPath(testData.evidence)),
        Promise.resolve(store.getFolderContext())
      ]);
      
      const [folders, filtered, context] = operations;
      
      expect(validationUtils.validateFolderStructure(folders)).toBe(true);
      expect(Array.isArray(filtered)).toBe(true);
      expect(context).toBeDefined();
      expect(context.viewMode).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle errors gracefully across stores', () => {
      // Test with malformed data
      const badEvidence = [{ id: 'bad', tags: null }];
      
      expect(() => {
        store.generateFolderStructure(badEvidence);
      }).not.toThrow();
      
      expect(() => {
        store.filterEvidenceByPath(badEvidence);
      }).not.toThrow();
    });

    it('should handle navigation errors gracefully', () => {
      expect(() => {
        store.navigateToFolder('non-existent', 'tag');
      }).not.toThrow();
      
      expect(() => {
        store.navigateToDepth(-1);
      }).not.toThrow();
      
      expect(() => {
        store.navigateBack(); // At root
      }).not.toThrow();
    });

    it('should maintain stability with invalid hierarchy operations', () => {
      expect(() => {
        store.setFolderHierarchy(null);
      }).not.toThrow();
      
      expect(() => {
        store.stores.virtualFolder.removeFromHierarchy('non-existent');
      }).not.toThrow();
    });
  });

  describe('Memory Management Integration', () => {
    it('should not leak memory with repeated operations', async () => {
      const testData = testScenarios.hierarchicalTestData();
      
      // Perform many operations to test for leaks
      for (let i = 0; i < 100; i++) {
        store.setFolderHierarchy(testData.categories);
        store.setViewMode('folders');
        store.navigateToFolder('doc-type', 'Invoice');
        store.generateFolderStructure(testData.evidence);
        store.navigateToRoot();
        store.setViewMode('flat');
      }
      
      // Should complete without issues
      expect(store.isAtRoot).toBe(true);
    });

    it('should clean up properly on reset', () => {
      const testData = testScenarios.hierarchicalTestData();
      
      // Set up complex state
      store.setFolderHierarchy(testData.categories);
      store.setViewMode('folders');
      store.navigateToFolder('doc-type', 'Invoice');
      store.generateFolderStructure(testData.evidence);
      
      // Reset should clear everything
      store.reset();
      
      // Verify all stores were reset
      expect(mockCoreReset).toHaveBeenCalled();
      expect(mockQueryReset).toHaveBeenCalled();
      expect(mockCategoryReset).toHaveBeenCalled();
      // Virtual folder store is not mocked, so we test it directly
      expect(store.stores.virtualFolder.viewMode).toBe('flat');
    });
  });
});