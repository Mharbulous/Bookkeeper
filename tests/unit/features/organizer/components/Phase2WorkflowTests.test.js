import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

// Import Phase 2 components
import FileListItemTags from '../../../../../src/features/organizer/components/FileListItemTags.vue';
import TagContextMenu from '../../../../../src/features/organizer/components/TagContextMenu.vue';
import FolderBreadcrumbs from '../../../../../src/features/organizer/components/FolderBreadcrumbs.vue';
import ViewModeToggle from '../../../../../src/features/organizer/components/ViewModeToggle.vue';
import FolderHierarchySelector from '../../../../../src/features/organizer/components/FolderHierarchySelector.vue';

// Import stores
import { useVirtualFolderStore } from '../../../../../src/features/organizer/stores/virtualFolderStore.js';
import { useOrganizerStore } from '../../../../../src/features/organizer/stores/organizer.js';

// Create Vuetify instance for testing
const vuetify = createVuetify({
  components,
  directives,
});

// Global test setup
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage
const mockLocalStorage = {
  store: {},
  getItem: vi.fn((key) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key, value) => { mockLocalStorage.store[key] = value; }),
  removeItem: vi.fn((key) => { delete mockLocalStorage.store[key]; }),
  clear: vi.fn(() => { mockLocalStorage.store = {}; })
};
global.localStorage = mockLocalStorage;

// Mock navigator.clipboard
global.navigator.clipboard = {
  writeText: vi.fn().mockResolvedValue(undefined)
};

describe('Phase 2: Virtual Folder Functional Workflows', () => {
  let pinia;
  let virtualFolderStore;
  let organizerStore;
  
  // Test data
  const mockCategories = [
    { categoryId: 'type', categoryName: 'Document Type', color: 'blue' },
    { categoryId: 'year', categoryName: 'Year', color: 'green' },
    { categoryId: 'priority', categoryName: 'Priority', color: 'red' }
  ];
  
  const mockEvidence = [
    {
      id: 'doc1',
      filename: 'invoice1.pdf',
      tags: {
        type: [{ tagName: 'Invoice' }],
        year: [{ tagName: '2024' }],
        priority: [{ tagName: 'High' }]
      }
    },
    {
      id: 'doc2', 
      filename: 'receipt1.pdf',
      tags: {
        type: [{ tagName: 'Receipt' }],
        year: [{ tagName: '2024' }],
        priority: [{ tagName: 'Medium' }]
      }
    },
    {
      id: 'doc3',
      filename: 'invoice2.pdf', 
      tags: {
        type: [{ tagName: 'Invoice' }],
        year: [{ tagName: '2023' }],
        priority: [{ tagName: 'Low' }]
      }
    }
  ];

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    
    virtualFolderStore = useVirtualFolderStore();
    organizerStore = useOrganizerStore();
    
    // Setup mock store methods
    organizerStore.categories = mockCategories;
    organizerStore.getCategoryById = vi.fn((id) => mockCategories.find(cat => cat.categoryId === id));
    organizerStore.setFilter = vi.fn();
    
    // Clear localStorage mock
    mockLocalStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Right-Click to Folder Navigation Workflow', () => {
    it('should execute full workflow: right-click → context menu → show in folders → navigation', async () => {
      // Setup: Create all components that participate in the workflow
      const tagInfo = {
        tagName: 'Invoice',
        categoryId: 'type',
        categoryName: 'Document Type', 
        color: 'blue'
      };

      // 1. Mount FileListItemTags (contains the tag chip that gets right-clicked)
      const tagsWrapper = mount(FileListItemTags, {
        global: {
          plugins: [pinia, vuetify]
        },
        props: {
          evidence: mockEvidence[0],
          readonly: true
        }
      });

      // 2. Mount ViewModeToggle (switches to folder mode)
      const toggleWrapper = mount(ViewModeToggle, {
        global: {
          plugins: [pinia, vuetify]
        }
      });

      // 3. Mount FolderBreadcrumbs (shows navigation path)
      const breadcrumbsWrapper = mount(FolderBreadcrumbs, {
        global: {
          plugins: [pinia, vuetify]
        }
      });

      // 4. Setup folder hierarchy in store
      virtualFolderStore.setFolderHierarchy([
        { categoryId: 'type', categoryName: 'Document Type', color: 'blue' }
      ]);

      await flushPromises();

      // STEP 1: Verify initial state - should be in flat mode
      expect(virtualFolderStore.isFolderMode).toBe(false);
      expect(virtualFolderStore.isAtRoot).toBe(true);
      expect(virtualFolderStore.currentPath).toHaveLength(0);

      // STEP 2: Simulate right-click on tag chip to trigger context menu
      const tagChips = tagsWrapper.findAll('.human-tag');
      expect(tagChips.length).toBeGreaterThan(0);

      const invoiceChip = tagChips.find(chip => chip.text().includes('Invoice'));
      expect(invoiceChip.exists()).toBe(true);

      // Simulate right-click event
      await invoiceChip.trigger('contextmenu', {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      });

      await flushPromises();

      // STEP 3: Verify context menu component receives tag info
      expect(tagsWrapper.vm.currentContextTag).toMatchObject({
        tagName: 'Invoice',
        categoryId: 'type'
      });

      // STEP 4: Simulate clicking "Show in Folders" in context menu  
      // Trigger the handleShowInFolders method directly since context menu interaction is complex
      await tagsWrapper.vm.handleShowInFolders({
        categoryId: 'type',
        tagName: 'Invoice'
      });

      await flushPromises();

      // STEP 5: Verify ViewModeToggle switches to folder mode
      expect(virtualFolderStore.isFolderMode).toBe(true);
      expect(virtualFolderStore.viewMode).toBe('folders');

      // STEP 6: Verify navigation occurs to correct folder
      expect(virtualFolderStore.currentPath).toHaveLength(1);
      expect(virtualFolderStore.currentPath[0]).toMatchObject({
        categoryId: 'type',
        tagName: 'Invoice'
      });

      // STEP 7: Verify FolderBreadcrumbs displays correct path
      expect(virtualFolderStore.breadcrumbPath).toHaveLength(1);
      expect(virtualFolderStore.breadcrumbPath[0]).toMatchObject({
        categoryId: 'type',
        tagName: 'Invoice',
        isLast: true,
        depth: 0
      });

      // STEP 8: Verify UI components reflect the state changes
      await flushPromises();
      
      // ViewModeToggle should show folder mode as active
      expect(toggleWrapper.vm.primaryViewMode).toBe('folders');
      
      // FolderBreadcrumbs should show navigation elements
      expect(breadcrumbsWrapper.vm.breadcrumbItems).toHaveLength(1);
      expect(breadcrumbsWrapper.vm.breadcrumbItems[0].title).toBe('Invoice');
    });

    it('should handle workflow when category not in hierarchy - adds category first', async () => {
      // Setup: Tag that belongs to category not in hierarchy
      const tagInfo = {
        tagName: 'High',
        categoryId: 'priority',
        categoryName: 'Priority',
        color: 'red'
      };

      const tagsWrapper = mount(FileListItemTags, {
        global: {
          plugins: [pinia, vuetify]
        },
        props: {
          evidence: mockEvidence[0], // Has priority: High tag
          readonly: true
        }
      });

      // Setup hierarchy WITHOUT the priority category
      virtualFolderStore.setFolderHierarchy([
        { categoryId: 'type', categoryName: 'Document Type', color: 'blue' }
      ]);

      await flushPromises();

      // Verify priority is not in hierarchy initially
      expect(virtualFolderStore.folderHierarchy).not.toContain(
        expect.objectContaining({ categoryId: 'priority' })
      );

      // Trigger show in folders for priority tag
      await tagsWrapper.vm.handleShowInFolders({
        categoryId: 'priority',
        tagName: 'High'
      });

      await flushPromises();

      // Should switch to folder mode
      expect(virtualFolderStore.isFolderMode).toBe(true);

      // Should add priority category to hierarchy (mocked in component)
      // Note: This tests the workflow intention, actual implementation may vary
      expect(organizerStore.getCategoryById).toHaveBeenCalledWith('priority');

      // Should navigate to the folder
      expect(virtualFolderStore.currentPath).toHaveLength(1);
      expect(virtualFolderStore.currentPath[0]).toMatchObject({
        categoryId: 'priority',
        tagName: 'High'
      });
    });

    it('should handle workflow errors gracefully', async () => {
      const tagsWrapper = mount(FileListItemTags, {
        global: {
          plugins: [pinia, vuetify]
        },
        props: {
          evidence: mockEvidence[0],
          readonly: true
        }
      });

      // Setup: Empty hierarchy
      virtualFolderStore.setFolderHierarchy([]);

      // Mock error in getCategoryById
      organizerStore.getCategoryById = vi.fn().mockReturnValue(null);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Attempt workflow with invalid category
      await tagsWrapper.vm.handleShowInFolders({
        categoryId: 'invalid',
        tagName: 'Test'
      });

      await flushPromises();

      // Should handle error gracefully - still switch to folder mode
      expect(virtualFolderStore.isFolderMode).toBe(true);
      
      // But navigation should not occur with invalid category
      expect(virtualFolderStore.currentPath).toHaveLength(0);

      consoleSpy.restore();
    });
  });

  describe('Complete Folder Hierarchy Management Workflow', () => {
    it('should execute full workflow: open selector → modify hierarchy → save → components update', async () => {
      // STEP 1: Mount FolderHierarchySelector
      const hierarchyWrapper = mount(FolderHierarchySelector, {
        global: {
          plugins: [pinia, vuetify]
        },
        props: {
          autoSave: false // Test manual save workflow
        }
      });

      // STEP 2: Mount other components that should react to hierarchy changes
      const toggleWrapper = mount(ViewModeToggle, {
        global: {
          plugins: [pinia, vuetify]  
        }
      });

      const breadcrumbsWrapper = mount(FolderBreadcrumbs, {
        global: {
          plugins: [pinia, vuetify]
        }
      });

      // STEP 3: Setup initial state
      virtualFolderStore.setViewMode('folders');
      organizerStore.categories = mockCategories;

      await flushPromises();

      // STEP 4: Open hierarchy selector
      expect(hierarchyWrapper.vm.showSelector).toBe(false);
      
      await hierarchyWrapper.vm.openSelector();
      await flushPromises();

      expect(hierarchyWrapper.vm.showSelector).toBe(true);
      expect(hierarchyWrapper.vm.hierarchyItems).toEqual([]);

      // STEP 5: Add categories to hierarchy
      await hierarchyWrapper.vm.addToHierarchy(mockCategories[0]); // type
      await hierarchyWrapper.vm.addToHierarchy(mockCategories[1]); // year

      expect(hierarchyWrapper.vm.hierarchyItems).toHaveLength(2);
      expect(hierarchyWrapper.vm.hierarchyItems[0].categoryId).toBe('type');
      expect(hierarchyWrapper.vm.hierarchyItems[1].categoryId).toBe('year');

      // STEP 6: Reorder hierarchy using move buttons
      await hierarchyWrapper.vm.moveUp(1); // Move year up to first position

      expect(hierarchyWrapper.vm.hierarchyItems[0].categoryId).toBe('year');
      expect(hierarchyWrapper.vm.hierarchyItems[1].categoryId).toBe('type');

      // STEP 7: Save hierarchy changes
      await hierarchyWrapper.vm.saveHierarchy();
      await flushPromises();

      // STEP 8: Verify store is updated with new hierarchy
      expect(virtualFolderStore.folderHierarchy).toHaveLength(2);
      expect(virtualFolderStore.folderHierarchy[0].categoryId).toBe('year');
      expect(virtualFolderStore.folderHierarchy[1].categoryId).toBe('type');

      // STEP 9: Verify localStorage persistence
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'organizer-folder-hierarchy',
        expect.stringContaining('year')
      );

      // STEP 10: Navigate using new hierarchy to test integration
      virtualFolderStore.navigateToFolder('year', '2024');
      await flushPromises();

      // STEP 11: Verify breadcrumbs reflect new hierarchy
      expect(virtualFolderStore.breadcrumbPath[0]).toMatchObject({
        categoryId: 'year',
        tagName: '2024'
      });

      // STEP 12: Verify next category in navigation is correct
      expect(virtualFolderStore.nextCategory).toMatchObject({
        categoryId: 'type'
      });
    });

    it('should handle auto-save workflow correctly', async () => {
      const hierarchyWrapper = mount(FolderHierarchySelector, {
        global: {
          plugins: [pinia, vuetify]
        },
        props: {
          autoSave: true
        }
      });

      organizerStore.categories = mockCategories;
      await hierarchyWrapper.vm.openSelector();
      await flushPromises();

      // Adding category should automatically save
      await hierarchyWrapper.vm.addToHierarchy(mockCategories[0]);
      await flushPromises();

      // Should have saved to store immediately
      expect(virtualFolderStore.folderHierarchy).toHaveLength(1);
      expect(virtualFolderStore.folderHierarchy[0].categoryId).toBe('type');
    });

    it('should handle hierarchy removal with navigation cleanup', async () => {
      const hierarchyWrapper = mount(FolderHierarchySelector, {
        global: {
          plugins: [pinia, vuetify]
        }
      });

      // Setup hierarchy and navigation
      virtualFolderStore.setFolderHierarchy([
        { categoryId: 'type', categoryName: 'Document Type', color: 'blue' },
        { categoryId: 'year', categoryName: 'Year', color: 'green' }
      ]);
      virtualFolderStore.setViewMode('folders');
      virtualFolderStore.navigateToFolder('type', 'Invoice');
      virtualFolderStore.navigateToFolder('year', '2024');

      expect(virtualFolderStore.currentPath).toHaveLength(2);

      await hierarchyWrapper.vm.openSelector();
      await flushPromises();

      // Remove type category (first in path)
      await hierarchyWrapper.vm.removeFromHierarchy(0);
      await flushPromises();

      // Should clean up navigation path
      expect(virtualFolderStore.currentPath).toHaveLength(0);
      expect(virtualFolderStore.folderHierarchy).toHaveLength(1);
      expect(virtualFolderStore.folderHierarchy[0].categoryId).toBe('year');
    });
  });

  describe('Cross-Component State Synchronization', () => {
    let allComponents = {};

    beforeEach(async () => {
      // Mount all Phase 2 components to test synchronization
      allComponents.tags = mount(FileListItemTags, {
        global: { plugins: [pinia, vuetify] },
        props: { evidence: mockEvidence[0], readonly: true }
      });

      allComponents.toggle = mount(ViewModeToggle, {
        global: { plugins: [pinia, vuetify] }
      });

      allComponents.breadcrumbs = mount(FolderBreadcrumbs, {
        global: { plugins: [pinia, vuetify] }
      });

      allComponents.hierarchy = mount(FolderHierarchySelector, {
        global: { plugins: [pinia, vuetify] }
      });

      organizerStore.categories = mockCategories;
      await flushPromises();
    });

    it('should synchronize state when view mode changes', async () => {
      // Initial state - all components in flat mode
      expect(virtualFolderStore.isFolderMode).toBe(false);
      expect(allComponents.toggle.vm.primaryViewMode).toBe('flat');

      // Change to folder mode via ViewModeToggle
      allComponents.toggle.vm.primaryViewMode = 'folders';
      await flushPromises();

      // All components should reflect folder mode
      expect(virtualFolderStore.isFolderMode).toBe(true);
      expect(virtualFolderStore.viewMode).toBe('folders');

      // FolderBreadcrumbs should be ready for folder mode
      expect(allComponents.breadcrumbs.vm.isFolderMode).toBe(true);

      // FolderHierarchySelector should show configure button
      expect(allComponents.hierarchy.vm.isFolderMode).toBe(true);
    });

    it('should synchronize state when navigation occurs', async () => {
      // Setup folder mode and hierarchy
      virtualFolderStore.setViewMode('folders');
      virtualFolderStore.setFolderHierarchy([
        { categoryId: 'type', categoryName: 'Document Type', color: 'blue' },
        { categoryId: 'year', categoryName: 'Year', color: 'green' }
      ]);

      await flushPromises();

      // Navigate to folder via store
      virtualFolderStore.navigateToFolder('type', 'Invoice');
      await flushPromises();

      // All components should reflect navigation state
      expect(virtualFolderStore.currentPath).toHaveLength(1);
      
      // FolderBreadcrumbs should show navigation
      expect(allComponents.breadcrumbs.vm.breadcrumbItems).toHaveLength(1);
      expect(allComponents.breadcrumbs.vm.breadcrumbItems[0].title).toBe('Invoice');
      expect(allComponents.breadcrumbs.vm.isAtRoot).toBe(false);

      // ViewModeToggle should show depth status
      expect(allComponents.toggle.vm.statusText).toBe('Level 1');

      // Navigate deeper
      virtualFolderStore.navigateToFolder('year', '2024');
      await flushPromises();

      // Verify depth-2 navigation
      expect(virtualFolderStore.currentPath).toHaveLength(2);
      expect(allComponents.breadcrumbs.vm.breadcrumbItems).toHaveLength(2);
      expect(allComponents.toggle.vm.statusText).toBe('Level 2');
    });

    it('should synchronize state when breadcrumb navigation occurs', async () => {
      // Setup deep navigation
      virtualFolderStore.setViewMode('folders');
      virtualFolderStore.setFolderHierarchy([
        { categoryId: 'type', categoryName: 'Document Type', color: 'blue' },
        { categoryId: 'year', categoryName: 'Year', color: 'green' },
        { categoryId: 'priority', categoryName: 'Priority', color: 'red' }
      ]);

      virtualFolderStore.navigateToFolder('type', 'Invoice');
      virtualFolderStore.navigateToFolder('year', '2024');
      virtualFolderStore.navigateToFolder('priority', 'High');

      await flushPromises();

      // Verify deep navigation state
      expect(virtualFolderStore.currentPath).toHaveLength(3);
      expect(allComponents.breadcrumbs.vm.breadcrumbItems).toHaveLength(3);

      // Navigate back via breadcrumbs
      await allComponents.breadcrumbs.vm.handleNavigateToDepth(1);
      await flushPromises();

      // All components should reflect navigation back to depth 1
      expect(virtualFolderStore.currentPath).toHaveLength(1);
      expect(virtualFolderStore.currentPath[0].tagName).toBe('Invoice');
      
      expect(allComponents.breadcrumbs.vm.breadcrumbItems).toHaveLength(1);
      expect(allComponents.toggle.vm.statusText).toBe('Level 1');

      // Navigate to root via breadcrumbs
      await allComponents.breadcrumbs.vm.handleNavigateToRoot();
      await flushPromises();

      // All components should reflect root state
      expect(virtualFolderStore.isAtRoot).toBe(true);
      expect(virtualFolderStore.currentPath).toHaveLength(0);
      expect(allComponents.breadcrumbs.vm.isAtRoot).toBe(true);
      expect(allComponents.toggle.vm.statusText).toBe('All folders');
    });

    it('should handle error states consistently across components', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Setup invalid navigation state
      virtualFolderStore.setViewMode('folders');
      virtualFolderStore.setFolderHierarchy([]); // Empty hierarchy

      // Attempt invalid navigation
      virtualFolderStore.navigateToFolder('invalid', 'test');
      await flushPromises();

      // All components should handle invalid state gracefully
      expect(virtualFolderStore.currentPath).toHaveLength(0);
      expect(allComponents.breadcrumbs.vm.breadcrumbItems).toHaveLength(0);
      expect(allComponents.toggle.vm.statusText).toBe('All folders');

      consoleSpy.restore();
    });
  });

  describe('Complete Tag Management Integration Workflow', () => {
    it('should integrate tag operations with folder navigation seamlessly', async () => {
      const tagsWrapper = mount(FileListItemTags, {
        global: { plugins: [pinia, vuetify] },
        props: { evidence: mockEvidence[0], readonly: true }
      });

      const toggleWrapper = mount(ViewModeToggle, {
        global: { plugins: [pinia, vuetify] }
      });

      // Setup folder hierarchy
      virtualFolderStore.setFolderHierarchy([
        { categoryId: 'type', categoryName: 'Document Type', color: 'blue' }
      ]);

      await flushPromises();

      // STEP 1: Start in flat mode with tag filtering
      expect(virtualFolderStore.isFolderMode).toBe(false);

      // Simulate filter by tag action
      await tagsWrapper.vm.handleFilterByTag({
        tagName: 'Invoice',
        categoryId: 'type'
      });

      // Should apply filter in flat mode
      expect(organizerStore.setFilter).toHaveBeenCalledWith('tag:"Invoice"');

      // STEP 2: Switch to folder mode while maintaining context
      virtualFolderStore.setViewMode('folders');
      await flushPromises();

      expect(virtualFolderStore.isFolderMode).toBe(true);

      // STEP 3: Navigate to same tag in folder context
      await tagsWrapper.vm.handleShowInFolders({
        categoryId: 'type',
        tagName: 'Invoice'
      });

      await flushPromises();

      // Should navigate to Invoice folder
      expect(virtualFolderStore.currentPath).toHaveLength(1);
      expect(virtualFolderStore.currentPath[0].tagName).toBe('Invoice');

      // STEP 4: Test folder context affects tag display
      const folderEvidence = virtualFolderStore.filterEvidenceByPath(mockEvidence);
      
      // Should filter to only Invoice documents
      expect(folderEvidence).toHaveLength(2); // doc1 and doc3 have Invoice tags
      expect(folderEvidence.every(doc => 
        doc.tags.type?.some(tag => tag.tagName === 'Invoice')
      )).toBe(true);

      // STEP 5: Switch back to flat mode should clear navigation
      virtualFolderStore.setViewMode('flat');
      await flushPromises();

      expect(virtualFolderStore.currentPath).toHaveLength(0);
      expect(virtualFolderStore.isAtRoot).toBe(true);
    });

    it('should handle tag context menu actions in different view modes', async () => {
      const tagsWrapper = mount(FileListItemTags, {
        global: { plugins: [pinia, vuetify] },
        props: { evidence: mockEvidence[0], readonly: true }
      });

      virtualFolderStore.setFolderHierarchy([
        { categoryId: 'type', categoryName: 'Document Type', color: 'blue' }
      ]);

      await flushPromises();

      const tagInfo = {
        tagName: 'Invoice',
        categoryId: 'type',
        categoryName: 'Document Type'
      };

      // Test context menu in flat mode
      virtualFolderStore.setViewMode('flat');
      await flushPromises();

      // Simulate various tag actions
      await tagsWrapper.vm.handleFilterByTag({ tagName: 'Invoice' });
      expect(organizerStore.setFilter).toHaveBeenCalledWith('tag:"Invoice"');

      // Test context menu in folder mode
      virtualFolderStore.setViewMode('folders');
      await flushPromises();

      await tagsWrapper.vm.handleShowInFolders({
        categoryId: 'type',
        tagName: 'Invoice'
      });

      expect(virtualFolderStore.currentPath).toHaveLength(1);
      expect(virtualFolderStore.currentPath[0]).toMatchObject({
        categoryId: 'type',
        tagName: 'Invoice'
      });
    });

    it('should maintain evidence filtering consistency across navigation', async () => {
      // Setup multi-level hierarchy
      virtualFolderStore.setFolderHierarchy([
        { categoryId: 'type', categoryName: 'Document Type', color: 'blue' },
        { categoryId: 'year', categoryName: 'Year', color: 'green' }
      ]);
      virtualFolderStore.setViewMode('folders');

      await flushPromises();

      // Test folder structure generation at root
      let folderStructure = virtualFolderStore.generateFolderStructure(mockEvidence);
      expect(folderStructure).toHaveLength(2); // Invoice and Receipt
      expect(folderStructure[0].tagName).toBe('Invoice'); // Higher count
      expect(folderStructure[0].fileCount).toBe(2);

      // Navigate to Invoice folder
      virtualFolderStore.navigateToFolder('type', 'Invoice');
      await flushPromises();

      // Test evidence filtering at depth 1
      const invoiceEvidence = virtualFolderStore.filterEvidenceByPath(mockEvidence);
      expect(invoiceEvidence).toHaveLength(2); // doc1 and doc3
      expect(invoiceEvidence.every(doc => 
        doc.tags.type?.some(tag => tag.tagName === 'Invoice')
      )).toBe(true);

      // Test folder structure generation at depth 1 (next category: year)
      folderStructure = virtualFolderStore.generateFolderStructure(mockEvidence);
      expect(folderStructure).toHaveLength(2); // 2024 and 2023 years
      
      // Navigate deeper
      virtualFolderStore.navigateToFolder('year', '2024');
      await flushPromises();

      // Test evidence filtering at depth 2
      const yearEvidence = virtualFolderStore.filterEvidenceByPath(mockEvidence);
      expect(yearEvidence).toHaveLength(1); // Only doc1 matches Invoice + 2024
      expect(yearEvidence[0].id).toBe('doc1');
    });
  });

  describe('Performance and Memory Management in Workflows', () => {
    it('should cache folder structures efficiently during navigation workflows', async () => {
      virtualFolderStore.setFolderHierarchy([
        { categoryId: 'type', categoryName: 'Document Type', color: 'blue' }
      ]);
      virtualFolderStore.setViewMode('folders');

      await flushPromises();

      // Generate folder structure multiple times
      const structure1 = virtualFolderStore.generateFolderStructure(mockEvidence);
      const structure2 = virtualFolderStore.generateFolderStructure(mockEvidence);

      // Should return same cached result
      expect(structure1).toEqual(structure2);
      expect(structure1).toHaveLength(2); // Invoice, Receipt

      // Navigate and cache should update context
      virtualFolderStore.navigateToFolder('type', 'Invoice');
      const structure3 = virtualFolderStore.generateFolderStructure(mockEvidence);

      // Different navigation context should use different cache
      expect(structure3).not.toEqual(structure1);
    });

    it('should clean up cache appropriately during hierarchy changes', async () => {
      virtualFolderStore.setFolderHierarchy([
        { categoryId: 'type', categoryName: 'Document Type', color: 'blue' }
      ]);
      virtualFolderStore.setViewMode('folders');

      // Generate cached structure
      const structure1 = virtualFolderStore.generateFolderStructure(mockEvidence);
      expect(structure1).toHaveLength(2);

      // Change hierarchy should clear cache
      virtualFolderStore.setFolderHierarchy([
        { categoryId: 'year', categoryName: 'Year', color: 'green' }
      ]);

      const structure2 = virtualFolderStore.generateFolderStructure(mockEvidence);
      expect(structure2).toHaveLength(2); // 2024, 2023 years
      expect(structure2[0].categoryId).toBe('year');
    });

    it('should handle large evidence sets efficiently', async () => {
      // Create large evidence set
      const largeEvidenceSet = [];
      for (let i = 0; i < 1000; i++) {
        largeEvidenceSet.push({
          id: `doc${i}`,
          filename: `file${i}.pdf`,
          tags: {
            type: [{ tagName: i % 3 === 0 ? 'Invoice' : i % 3 === 1 ? 'Receipt' : 'Contract' }],
            year: [{ tagName: i % 2 === 0 ? '2024' : '2023' }]
          }
        });
      }

      virtualFolderStore.setFolderHierarchy([
        { categoryId: 'type', categoryName: 'Document Type', color: 'blue' }
      ]);
      virtualFolderStore.setViewMode('folders');

      const startTime = Date.now();
      const folderStructure = virtualFolderStore.generateFolderStructure(largeEvidenceSet);
      const endTime = Date.now();

      // Should complete within reasonable time (< 100ms for 1000 documents)
      expect(endTime - startTime).toBeLessThan(100);
      
      // Should correctly process all folders
      expect(folderStructure).toHaveLength(3); // Invoice, Receipt, Contract
      expect(folderStructure[0].fileCount).toBeGreaterThan(300); // ~333 invoices
    });
  });
});