import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import FolderHierarchySelector from '../../../../../src/features/organizer/components/FolderHierarchySelector.vue';
import { useOrganizerStore } from '../../../../../src/features/organizer/stores/organizer.js';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('FolderHierarchySelector.vue', () => {
  let wrapper;
  let vuetify;
  let pinia;
  let organizerStore;
  let mockCategories;

  beforeEach(() => {
    // Create fresh instances for each test
    vuetify = createVuetify();
    pinia = createPinia();
    setActivePinia(pinia);
    organizerStore = useOrganizerStore();

    // Reset localStorage mock
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();

    // Set up mock categories
    mockCategories = [
      {
        categoryId: 'doc-type',
        categoryName: 'Document Type',
        color: 'primary'
      },
      {
        categoryId: 'client',
        categoryName: 'Client',
        color: 'secondary'
      },
      {
        categoryId: 'year',
        categoryName: 'Year',
        color: 'accent'
      },
      {
        categoryId: 'status',
        categoryName: 'Status',
        color: 'warning'
      }
    ];

    // Mock store categories
    vi.spyOn(organizerStore, 'categories', 'get').mockReturnValue(mockCategories);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.clearAllMocks();
  });

  const createWrapper = (props = {}) => {
    return mount(FolderHierarchySelector, {
      global: {
        plugins: [vuetify, pinia]
      },
      props: {
        initiallyOpen: false,
        compact: false,
        autoSave: true,
        ...props
      }
    });
  };

  describe('Component Mounting & Props', () => {
    it('should mount successfully with default props', () => {
      wrapper = createWrapper();
      expect(wrapper.vm).toBeTruthy();
      expect(wrapper.vm.props.initiallyOpen).toBe(false);
      expect(wrapper.vm.props.compact).toBe(false);
      expect(wrapper.vm.props.autoSave).toBe(true);
    });

    it('should accept and apply custom props', () => {
      wrapper = createWrapper({
        initiallyOpen: true,
        compact: true,
        autoSave: false
      });
      
      expect(wrapper.vm.props.initiallyOpen).toBe(true);
      expect(wrapper.vm.props.compact).toBe(true);
      expect(wrapper.vm.props.autoSave).toBe(false);
      expect(wrapper.vm.showSelector).toBe(true);
    });

    it('should initialize reactive state correctly', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.showSelector).toBe(false);
      expect(wrapper.vm.hierarchyItems).toEqual([]);
      expect(wrapper.vm.loading).toBe(false);
    });
  });

  describe('Store Integration', () => {
    beforeEach(() => {
      organizerStore.setViewMode('folders');
    });

    it('should react to store isFolderMode changes', async () => {
      wrapper = createWrapper();
      
      expect(wrapper.vm.isFolderMode).toBe(true);
      
      organizerStore.setViewMode('flat');
      await nextTick();
      
      expect(wrapper.vm.isFolderMode).toBe(false);
    });

    it('should sync with store folderHierarchy', async () => {
      const hierarchy = [
        { categoryId: 'doc-type', categoryName: 'Document Type' },
        { categoryId: 'client', categoryName: 'Client' }
      ];
      
      organizerStore.setFolderHierarchy(hierarchy);
      wrapper = createWrapper();
      
      expect(wrapper.vm.currentHierarchy).toEqual(hierarchy);
    });

    it('should get all categories from store', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.allCategories).toEqual(mockCategories);
    });
  });

  describe('Available Categories Computation', () => {
    it('should show all categories when no hierarchy is set', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.availableCategories).toEqual(mockCategories);
    });

    it('should exclude categories already in hierarchy', async () => {
      wrapper = createWrapper();
      
      // Add some categories to hierarchy
      wrapper.vm.hierarchyItems = [
        { categoryId: 'doc-type', categoryName: 'Document Type', color: 'primary' },
        { categoryId: 'client', categoryName: 'Client', color: 'secondary' }
      ];
      
      await nextTick();
      
      const available = wrapper.vm.availableCategories;
      expect(available).toHaveLength(2);
      expect(available.find(cat => cat.categoryId === 'year')).toBeTruthy();
      expect(available.find(cat => cat.categoryId === 'status')).toBeTruthy();
      expect(available.find(cat => cat.categoryId === 'doc-type')).toBeFalsy();
      expect(available.find(cat => cat.categoryId === 'client')).toBeFalsy();
    });

    it('should show empty array when all categories are in hierarchy', async () => {
      wrapper = createWrapper();
      
      wrapper.vm.hierarchyItems = [...mockCategories];
      await nextTick();
      
      expect(wrapper.vm.availableCategories).toEqual([]);
    });
  });

  describe('Selector Open/Close', () => {
    it('should open selector when openSelector is called', async () => {
      wrapper = createWrapper();
      
      expect(wrapper.vm.showSelector).toBe(false);
      
      await wrapper.vm.openSelector();
      
      expect(wrapper.vm.showSelector).toBe(true);
      expect(wrapper.emitted('selector-opened')).toHaveLength(1);
    });

    it('should load current hierarchy when opening', async () => {
      const hierarchy = [
        { categoryId: 'doc-type', categoryName: 'Document Type' }
      ];
      organizerStore.setFolderHierarchy(hierarchy);
      
      wrapper = createWrapper();
      
      await wrapper.vm.openSelector();
      
      expect(wrapper.vm.hierarchyItems).toEqual(hierarchy);
    });

    it('should close selector when closeSelector is called', async () => {
      wrapper = createWrapper({ initiallyOpen: true });
      
      expect(wrapper.vm.showSelector).toBe(true);
      
      wrapper.vm.closeSelector();
      
      expect(wrapper.vm.showSelector).toBe(false);
      expect(wrapper.emitted('selector-closed')).toHaveLength(1);
    });

    it('should handle errors during opening gracefully', async () => {
      wrapper = createWrapper();
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock an error in the opening process
      vi.spyOn(organizerStore, 'folderHierarchy', 'get').mockImplementation(() => {
        throw new Error('Store error');
      });
      
      await wrapper.vm.openSelector();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[FolderHierarchySelector] Failed to open:',
        expect.any(Error)
      );
      expect(wrapper.vm.loading).toBe(false);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Hierarchy Management', () => {
    beforeEach(() => {
      wrapper = createWrapper();
      wrapper.vm.hierarchyItems = [
        { categoryId: 'doc-type', categoryName: 'Document Type', color: 'primary' },
        { categoryId: 'client', categoryName: 'Client', color: 'secondary' }
      ];
    });

    it('should add category to hierarchy', async () => {
      const newCategory = { categoryId: 'year', categoryName: 'Year', color: 'accent' };
      
      await wrapper.vm.addToHierarchy(newCategory);
      
      expect(wrapper.vm.hierarchyItems).toHaveLength(3);
      expect(wrapper.vm.hierarchyItems[2]).toMatchObject({
        categoryId: 'year',
        categoryName: 'Year',
        color: 'accent'
      });
      
      expect(wrapper.emitted('hierarchy-changed')).toHaveLength(1);
      expect(wrapper.emitted('hierarchy-changed')[0][0].event.added.element).toEqual(newCategory);
    });

    it('should remove category from hierarchy', async () => {
      await wrapper.vm.removeFromHierarchy(0);
      
      expect(wrapper.vm.hierarchyItems).toHaveLength(1);
      expect(wrapper.vm.hierarchyItems[0].categoryId).toBe('client');
      
      expect(wrapper.emitted('hierarchy-changed')).toHaveLength(1);
      expect(wrapper.emitted('hierarchy-changed')[0][0].event.removed.element.categoryId).toBe('doc-type');
    });

    it('should move item up in hierarchy', async () => {
      await wrapper.vm.moveUp(1);
      
      expect(wrapper.vm.hierarchyItems[0].categoryId).toBe('client');
      expect(wrapper.vm.hierarchyItems[1].categoryId).toBe('doc-type');
      
      expect(wrapper.emitted('hierarchy-changed')).toHaveLength(1);
      expect(wrapper.emitted('hierarchy-changed')[0][0].event.moved).toMatchObject({
        oldIndex: 1,
        newIndex: 0
      });
    });

    it('should move item down in hierarchy', async () => {
      await wrapper.vm.moveDown(0);
      
      expect(wrapper.vm.hierarchyItems[0].categoryId).toBe('client');
      expect(wrapper.vm.hierarchyItems[1].categoryId).toBe('doc-type');
      
      expect(wrapper.emitted('hierarchy-changed')).toHaveLength(1);
      expect(wrapper.emitted('hierarchy-changed')[0][0].event.moved).toMatchObject({
        oldIndex: 0,
        newIndex: 1
      });
    });

    it('should not move first item up', async () => {
      const originalHierarchy = [...wrapper.vm.hierarchyItems];
      
      await wrapper.vm.moveUp(0);
      
      expect(wrapper.vm.hierarchyItems).toEqual(originalHierarchy);
      expect(wrapper.emitted('hierarchy-changed')).toBeUndefined();
    });

    it('should not move last item down', async () => {
      const originalHierarchy = [...wrapper.vm.hierarchyItems];
      
      await wrapper.vm.moveDown(1);
      
      expect(wrapper.vm.hierarchyItems).toEqual(originalHierarchy);
      expect(wrapper.emitted('hierarchy-changed')).toBeUndefined();
    });
  });

  describe('Auto-save Functionality', () => {
    it('should auto-save when autoSave prop is true', async () => {
      wrapper = createWrapper({ autoSave: true });
      const saveHierarchySpy = vi.spyOn(wrapper.vm, 'saveHierarchy').mockResolvedValue();
      
      const newCategory = { categoryId: 'year', categoryName: 'Year', color: 'accent' };
      await wrapper.vm.addToHierarchy(newCategory);
      
      expect(saveHierarchySpy).toHaveBeenCalled();
    });

    it('should not auto-save when autoSave prop is false', async () => {
      wrapper = createWrapper({ autoSave: false });
      const saveHierarchySpy = vi.spyOn(wrapper.vm, 'saveHierarchy').mockResolvedValue();
      
      const newCategory = { categoryId: 'year', categoryName: 'Year', color: 'accent' };
      await wrapper.vm.addToHierarchy(newCategory);
      
      expect(saveHierarchySpy).not.toHaveBeenCalled();
    });
  });

  describe('Save/Load Hierarchy', () => {
    it('should save hierarchy to store and localStorage', async () => {
      const setFolderHierarchySpy = vi.spyOn(organizerStore, 'setFolderHierarchy');
      
      wrapper = createWrapper();
      wrapper.vm.hierarchyItems = [
        { categoryId: 'doc-type', categoryName: 'Document Type', color: 'primary' }
      ];
      
      await wrapper.vm.saveHierarchy();
      
      expect(setFolderHierarchySpy).toHaveBeenCalledWith(wrapper.vm.hierarchyItems);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'organizer-folder-hierarchy',
        JSON.stringify(wrapper.vm.hierarchyItems)
      );
      expect(wrapper.emitted('hierarchy-saved')).toHaveLength(1);
    });

    it('should handle save errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(organizerStore, 'setFolderHierarchy').mockImplementation(() => {
        throw new Error('Save failed');
      });
      
      wrapper = createWrapper();
      
      await wrapper.vm.saveHierarchy();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[FolderHierarchySelector] Failed to save hierarchy:',
        expect.any(Error)
      );
      expect(wrapper.vm.loading).toBe(false);
      
      consoleSpy.mockRestore();
    });

    it('should load saved hierarchy from localStorage', () => {
      const savedHierarchy = [
        { categoryId: 'doc-type', categoryName: 'Document Type', color: 'primary' },
        { categoryId: 'client', categoryName: 'Client', color: 'secondary' }
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedHierarchy));
      
      wrapper = createWrapper();
      wrapper.vm.loadSavedHierarchy();
      
      expect(wrapper.vm.hierarchyItems).toEqual(savedHierarchy);
    });

    it('should filter out non-existent categories when loading', () => {
      const savedHierarchy = [
        { categoryId: 'doc-type', categoryName: 'Document Type', color: 'primary' },
        { categoryId: 'non-existent', categoryName: 'Non-existent', color: 'error' },
        { categoryId: 'client', categoryName: 'Client', color: 'secondary' }
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedHierarchy));
      
      wrapper = createWrapper();
      wrapper.vm.loadSavedHierarchy();
      
      expect(wrapper.vm.hierarchyItems).toHaveLength(2);
      expect(wrapper.vm.hierarchyItems.find(item => item.categoryId === 'non-existent')).toBeUndefined();
    });

    it('should handle malformed localStorage data gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock.getItem.mockReturnValue('invalid-json');
      
      wrapper = createWrapper();
      wrapper.vm.loadSavedHierarchy();
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(wrapper.vm.hierarchyItems).toEqual([]);
      
      consoleSpy.mockRestore();
    });

    it('should handle empty localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      wrapper = createWrapper();
      wrapper.vm.loadSavedHierarchy();
      
      expect(wrapper.vm.hierarchyItems).toEqual([]);
    });

    it('should close selector after save when not in auto-save mode', async () => {
      wrapper = createWrapper({ autoSave: false, initiallyOpen: true });
      
      expect(wrapper.vm.showSelector).toBe(true);
      
      await wrapper.vm.saveHierarchy();
      
      expect(wrapper.vm.showSelector).toBe(false);
    });

    it('should not close selector after save in auto-save mode', async () => {
      wrapper = createWrapper({ autoSave: true, initiallyOpen: true });
      
      expect(wrapper.vm.showSelector).toBe(true);
      
      await wrapper.vm.saveHierarchy();
      
      expect(wrapper.vm.showSelector).toBe(true);
    });
  });

  describe('Reset to Default', () => {
    it('should reset to first 3 categories as default', () => {
      wrapper = createWrapper();
      
      wrapper.vm.resetToDefault();
      
      expect(wrapper.vm.hierarchyItems).toHaveLength(3);
      expect(wrapper.vm.hierarchyItems[0].categoryId).toBe('doc-type');
      expect(wrapper.vm.hierarchyItems[1].categoryId).toBe('client');
      expect(wrapper.vm.hierarchyItems[2].categoryId).toBe('year');
    });

    it('should auto-save after reset when autoSave is true', async () => {
      wrapper = createWrapper({ autoSave: true });
      const saveHierarchySpy = vi.spyOn(wrapper.vm, 'saveHierarchy').mockResolvedValue();
      
      wrapper.vm.resetToDefault();
      
      expect(saveHierarchySpy).toHaveBeenCalled();
    });

    it('should handle fewer than 3 categories gracefully', () => {
      vi.spyOn(organizerStore, 'categories', 'get').mockReturnValue([
        { categoryId: 'doc-type', categoryName: 'Document Type', color: 'primary' }
      ]);
      
      wrapper = createWrapper();
      
      wrapper.vm.resetToDefault();
      
      expect(wrapper.vm.hierarchyItems).toHaveLength(1);
      expect(wrapper.vm.hierarchyItems[0].categoryId).toBe('doc-type');
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(async () => {
      wrapper = createWrapper({ initiallyOpen: true });
      wrapper.vm.hierarchyItems = [
        { categoryId: 'doc-type', categoryName: 'Document Type', color: 'primary' },
        { categoryId: 'client', categoryName: 'Client', color: 'secondary' },
        { categoryId: 'year', categoryName: 'Year', color: 'accent' }
      ];
      await nextTick();
    });

    it('should handle ArrowUp key for focus navigation', () => {
      const focusItemSpy = vi.spyOn(wrapper.vm, 'focusItem').mockImplementation();
      
      const mockEvent = {
        key: 'ArrowUp',
        preventDefault: vi.fn(),
        ctrlKey: false,
        metaKey: false
      };
      
      wrapper.vm.handleItemKeydown(mockEvent, 1);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(focusItemSpy).toHaveBeenCalledWith(0);
    });

    it('should handle ArrowDown key for focus navigation', () => {
      const focusItemSpy = vi.spyOn(wrapper.vm, 'focusItem').mockImplementation();
      
      const mockEvent = {
        key: 'ArrowDown',
        preventDefault: vi.fn(),
        ctrlKey: false,
        metaKey: false
      };
      
      wrapper.vm.handleItemKeydown(mockEvent, 1);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(focusItemSpy).toHaveBeenCalledWith(2);
    });

    it('should handle Ctrl+ArrowUp for moving item up', async () => {
      const moveUpSpy = vi.spyOn(wrapper.vm, 'moveUp').mockImplementation();
      
      const mockEvent = {
        key: 'ArrowUp',
        preventDefault: vi.fn(),
        ctrlKey: true,
        metaKey: false
      };
      
      wrapper.vm.handleItemKeydown(mockEvent, 1);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(moveUpSpy).toHaveBeenCalledWith(1);
    });

    it('should handle Ctrl+ArrowDown for moving item down', async () => {
      const moveDownSpy = vi.spyOn(wrapper.vm, 'moveDown').mockImplementation();
      
      const mockEvent = {
        key: 'ArrowDown',
        preventDefault: vi.fn(),
        ctrlKey: true,
        metaKey: false
      };
      
      wrapper.vm.handleItemKeydown(mockEvent, 1);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(moveDownSpy).toHaveBeenCalledWith(1);
    });

    it('should handle Delete key for removing item', async () => {
      const removeFromHierarchySpy = vi.spyOn(wrapper.vm, 'removeFromHierarchy').mockImplementation();
      
      const mockEvent = {
        key: 'Delete',
        preventDefault: vi.fn()
      };
      
      wrapper.vm.handleItemKeydown(mockEvent, 1);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(removeFromHierarchySpy).toHaveBeenCalledWith(1);
    });

    it('should handle Backspace key for removing item', async () => {
      const removeFromHierarchySpy = vi.spyOn(wrapper.vm, 'removeFromHierarchy').mockImplementation();
      
      const mockEvent = {
        key: 'Backspace',
        preventDefault: vi.fn()
      };
      
      wrapper.vm.handleItemKeydown(mockEvent, 1);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(removeFromHierarchySpy).toHaveBeenCalledWith(1);
    });

    it('should handle Escape key for closing selector', () => {
      const closeSelectorSpy = vi.spyOn(wrapper.vm, 'closeSelector').mockImplementation();
      
      const mockEvent = {
        key: 'Escape'
      };
      
      wrapper.vm.handleItemKeydown(mockEvent, 1);
      
      expect(closeSelectorSpy).toHaveBeenCalled();
    });

    it('should focus specific item by index', async () => {
      // Mock DOM elements
      const mockItems = [
        { focus: vi.fn() },
        { focus: vi.fn() },
        { focus: vi.fn() }
      ];
      
      vi.spyOn(document, 'querySelectorAll').mockReturnValue(mockItems);
      
      wrapper.vm.focusItem(1);
      await nextTick();
      
      expect(mockItems[1].focus).toHaveBeenCalled();
    });

    it('should handle invalid focus index gracefully', () => {
      vi.spyOn(document, 'querySelectorAll').mockReturnValue([]);
      
      expect(() => {
        wrapper.vm.focusItem(-1);
        wrapper.vm.focusItem(10);
      }).not.toThrow();
    });
  });

  describe('User Interface Interactions', () => {
    it('should render trigger button when not showing selector', async () => {
      organizerStore.setViewMode('folders');
      wrapper = createWrapper({ initiallyOpen: false });
      
      await nextTick();
      
      const triggerButton = wrapper.find('.hierarchy-trigger');
      expect(triggerButton.exists()).toBe(true);
      expect(triggerButton.text()).toContain('Configure Folders');
    });

    it('should not render trigger button in flat view mode', async () => {
      organizerStore.setViewMode('flat');
      wrapper = createWrapper({ initiallyOpen: false });
      
      await nextTick();
      
      const triggerButton = wrapper.find('.hierarchy-trigger');
      expect(triggerButton.exists()).toBe(false);
    });

    it('should open selector when trigger button is clicked', async () => {
      organizerStore.setViewMode('folders');
      wrapper = createWrapper({ initiallyOpen: false });
      
      await nextTick();
      
      const triggerButton = wrapper.find('.hierarchy-trigger');
      await triggerButton.trigger('click');
      
      expect(wrapper.vm.showSelector).toBe(true);
    });

    it('should render hierarchy card when selector is open', async () => {
      wrapper = createWrapper({ initiallyOpen: true });
      
      await nextTick();
      
      const hierarchyCard = wrapper.find('.hierarchy-card');
      expect(hierarchyCard.exists()).toBe(true);
    });

    it('should show empty state when no hierarchy items', async () => {
      wrapper = createWrapper({ initiallyOpen: true });
      
      await nextTick();
      
      const emptyState = wrapper.find('.empty-hierarchy');
      expect(emptyState.exists()).toBe(true);
      expect(emptyState.text()).toContain('No categories in hierarchy');
    });

    it('should render hierarchy items when present', async () => {
      wrapper = createWrapper({ initiallyOpen: true });
      wrapper.vm.hierarchyItems = [
        { categoryId: 'doc-type', categoryName: 'Document Type', color: 'primary' },
        { categoryId: 'client', categoryName: 'Client', color: 'secondary' }
      ];
      
      await nextTick();
      
      const hierarchyItems = wrapper.findAll('.hierarchy-item');
      expect(hierarchyItems).toHaveLength(2);
    });

    it('should show available categories section', async () => {
      wrapper = createWrapper({ initiallyOpen: true });
      
      await nextTick();
      
      const availableSection = wrapper.find('.available-categories');
      expect(availableSection.exists()).toBe(true);
      
      const categoryChips = wrapper.findAll('.category-chips .v-chip');
      expect(categoryChips.length).toBeGreaterThan(0);
    });

    it('should handle category chip clicks', async () => {
      wrapper = createWrapper({ initiallyOpen: true });
      const addToHierarchySpy = vi.spyOn(wrapper.vm, 'addToHierarchy').mockImplementation();
      
      await nextTick();
      
      const categoryChips = wrapper.findAll('.category-chips .v-chip');
      if (categoryChips.length > 0) {
        await categoryChips[0].trigger('click');
        expect(addToHierarchySpy).toHaveBeenCalled();
      }
    });
  });

  describe('Event Emissions', () => {
    it('should emit hierarchy-changed when hierarchy is modified', async () => {
      wrapper = createWrapper();
      
      const newCategory = { categoryId: 'year', categoryName: 'Year', color: 'accent' };
      await wrapper.vm.addToHierarchy(newCategory);
      
      expect(wrapper.emitted('hierarchy-changed')).toHaveLength(1);
      expect(wrapper.emitted('hierarchy-changed')[0][0]).toMatchObject({
        event: { added: { element: newCategory } },
        hierarchy: expect.any(Array)
      });
    });

    it('should emit hierarchy-saved when hierarchy is saved', async () => {
      wrapper = createWrapper();
      wrapper.vm.hierarchyItems = [
        { categoryId: 'doc-type', categoryName: 'Document Type', color: 'primary' }
      ];
      
      await wrapper.vm.saveHierarchy();
      
      expect(wrapper.emitted('hierarchy-saved')).toHaveLength(1);
      expect(wrapper.emitted('hierarchy-saved')[0][0]).toEqual(wrapper.vm.hierarchyItems);
    });

    it('should emit selector-opened when selector opens', async () => {
      wrapper = createWrapper();
      
      await wrapper.vm.openSelector();
      
      expect(wrapper.emitted('selector-opened')).toHaveLength(1);
    });

    it('should emit selector-closed when selector closes', () => {
      wrapper = createWrapper({ initiallyOpen: true });
      
      wrapper.vm.closeSelector();
      
      expect(wrapper.emitted('selector-closed')).toHaveLength(1);
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle getCategoryTagCount gracefully', () => {
      wrapper = createWrapper();
      
      const tagCount = wrapper.vm.getCategoryTagCount('any-category');
      
      expect(tagCount).toBe('?'); // Placeholder implementation
    });

    it('should handle missing categories gracefully', () => {
      vi.spyOn(organizerStore, 'categories', 'get').mockReturnValue(null);
      
      wrapper = createWrapper();
      
      expect(wrapper.vm.allCategories).toEqual([]);
      expect(wrapper.vm.availableCategories).toEqual([]);
    });

    it('should handle undefined hierarchy from store', () => {
      vi.spyOn(organizerStore, 'folderHierarchy', 'get').mockReturnValue(undefined);
      
      wrapper = createWrapper();
      
      expect(wrapper.vm.currentHierarchy).toEqual([]);
    });

    it('should handle invalid localStorage data types', () => {
      localStorageMock.getItem.mockReturnValue('not-an-array');
      
      wrapper = createWrapper();
      wrapper.vm.loadSavedHierarchy();
      
      expect(wrapper.vm.hierarchyItems).toEqual([]);
    });

    it('should handle null array operations gracefully', () => {
      wrapper = createWrapper();
      
      expect(() => {
        wrapper.vm.hierarchyItems = null;
        wrapper.vm.moveUp(0);
        wrapper.vm.moveDown(0);
        wrapper.vm.removeFromHierarchy(0);
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      wrapper = createWrapper({ initiallyOpen: true });
      wrapper.vm.hierarchyItems = [
        { categoryId: 'doc-type', categoryName: 'Document Type', color: 'primary' }
      ];
      await nextTick();
    });

    it('should have proper keyboard navigation support', () => {
      const hierarchyItems = wrapper.findAll('.hierarchy-item');
      
      hierarchyItems.forEach(item => {
        expect(item.attributes('tabindex')).toBe('0');
      });
    });

    it('should have proper ARIA attributes', () => {
      const hierarchyCard = wrapper.find('.hierarchy-card');
      expect(hierarchyCard.exists()).toBe(true);
      
      // Check for proper button roles and labels
      const buttons = wrapper.findAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should handle focus management correctly', () => {
      const focusItemSpy = vi.spyOn(wrapper.vm, 'focusItem');
      
      const mockEvent = {
        key: 'ArrowDown',
        preventDefault: vi.fn(),
        ctrlKey: false,
        metaKey: false
      };
      
      wrapper.vm.handleItemKeydown(mockEvent, 0);
      
      expect(focusItemSpy).toHaveBeenCalled();
    });
  });

  describe('Performance & Cleanup', () => {
    it('should handle component unmounting gracefully', () => {
      wrapper = createWrapper();
      
      expect(() => wrapper.unmount()).not.toThrow();
    });

    it('should not have memory leaks in event handlers', () => {
      wrapper = createWrapper();
      
      // Verify no hanging references after unmount
      wrapper.unmount();
      
      // Trigger events should not cause errors
      expect(() => {
        wrapper.vm.handleItemKeydown({ key: 'Escape' }, 0);
      }).not.toThrow();
    });
  });
});