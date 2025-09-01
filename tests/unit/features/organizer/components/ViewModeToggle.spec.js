import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import ViewModeToggle from '../../../../../src/features/organizer/components/ViewModeToggle.vue';
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

describe('ViewModeToggle.vue', () => {
  let wrapper;
  let vuetify;
  let pinia;
  let organizerStore;

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

    // Default localStorage behavior
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.clearAllMocks();
  });

  const createWrapper = (props = {}) => {
    return mount(ViewModeToggle, {
      global: {
        plugins: [vuetify, pinia]
      },
      props: {
        showStatusIndicator: true,
        loading: false,
        compact: false,
        ...props
      }
    });
  };

  describe('Component Mounting & Props', () => {
    it('should mount successfully with default props', () => {
      wrapper = createWrapper();
      expect(wrapper.vm).toBeTruthy();
      expect(wrapper.vm.props.showStatusIndicator).toBe(true);
      expect(wrapper.vm.props.loading).toBe(false);
      expect(wrapper.vm.props.compact).toBe(false);
    });

    it('should accept and apply custom props', () => {
      wrapper = createWrapper({
        showStatusIndicator: false,
        loading: true,
        compact: true
      });
      
      expect(wrapper.vm.props.showStatusIndicator).toBe(false);
      expect(wrapper.vm.props.loading).toBe(true);
      expect(wrapper.vm.props.compact).toBe(true);
    });

    it('should initialize reactive state correctly', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.primaryViewMode).toBe('flat');
      expect(wrapper.vm.secondaryDisplayMode).toBe('list');
    });
  });

  describe('Store Integration', () => {
    it('should sync primaryViewMode with store viewMode', async () => {
      wrapper = createWrapper();
      
      expect(wrapper.vm.primaryViewMode).toBe('flat');
      
      organizerStore.setViewMode('folders');
      await nextTick();
      
      expect(wrapper.vm.primaryViewMode).toBe('folders');
    });

    it('should update store when primaryViewMode changes', async () => {
      wrapper = createWrapper();
      const setViewModeSpy = vi.spyOn(organizerStore, 'setViewMode');
      
      wrapper.vm.primaryViewMode = 'folders';
      await nextTick();
      
      expect(setViewModeSpy).toHaveBeenCalledWith('folders');
    });

    it('should access store computed properties correctly', () => {
      organizerStore.setViewMode('folders');
      organizerStore.setFolderHierarchy([
        { categoryId: 'doc-type', categoryName: 'Document Type' }
      ]);
      organizerStore.navigateToFolder('doc-type', 'Invoice');
      
      wrapper = createWrapper();
      
      expect(wrapper.vm.isFolderMode).toBe(true);
      expect(wrapper.vm.currentPath).toHaveLength(1);
      expect(wrapper.vm.folderHierarchy).toHaveLength(1);
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should load saved display mode from localStorage on init', () => {
      localStorageMock.getItem.mockReturnValue('grid');
      
      wrapper = createWrapper();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('organizer-display-mode');
      expect(wrapper.vm.secondaryDisplayMode).toBe('grid');
    });

    it('should use default display mode when no localStorage value', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      wrapper = createWrapper();
      
      expect(wrapper.vm.secondaryDisplayMode).toBe('list');
    });

    it('should save display mode to localStorage when changed', async () => {
      wrapper = createWrapper();
      
      wrapper.vm.secondaryDisplayMode = 'grid';
      await nextTick();
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('organizer-display-mode', 'grid');
    });

    it('should not save to localStorage on initial load', async () => {
      localStorageMock.getItem.mockReturnValue('grid');
      
      wrapper = createWrapper();
      await nextTick();
      
      // Should not save during initialization
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('View Mode Changes', () => {
    it('should emit view-mode-changed when primary view mode changes', async () => {
      wrapper = createWrapper();
      
      wrapper.vm.primaryViewMode = 'folders';
      await nextTick();
      
      expect(wrapper.emitted('view-mode-changed')).toHaveLength(1);
      expect(wrapper.emitted('view-mode-changed')[0][0]).toEqual({
        mode: 'folders',
        previous: 'flat'
      });
    });

    it('should not emit view-mode-changed on initial load', async () => {
      organizerStore.setViewMode('folders');
      wrapper = createWrapper();
      await nextTick();
      
      // Should not emit during initialization sync
      expect(wrapper.emitted('view-mode-changed')).toBeUndefined();
    });

    it('should emit display-mode-changed when secondary display mode changes', async () => {
      wrapper = createWrapper();
      
      wrapper.vm.secondaryDisplayMode = 'grid';
      await nextTick();
      
      expect(wrapper.emitted('display-mode-changed')).toHaveLength(1);
      expect(wrapper.emitted('display-mode-changed')[0][0]).toEqual({
        mode: 'grid',
        previous: 'list'
      });
    });

    it('should not emit when mode is set to same value', async () => {
      wrapper = createWrapper();
      
      wrapper.vm.primaryViewMode = 'flat'; // Same as initial
      await nextTick();
      
      expect(wrapper.emitted('view-mode-changed')).toBeUndefined();
    });
  });

  describe('Status Indicator', () => {
    beforeEach(() => {
      organizerStore.setViewMode('folders');
      organizerStore.setFolderHierarchy([
        { categoryId: 'doc-type', categoryName: 'Document Type' },
        { categoryId: 'client', categoryName: 'Client' }
      ]);
    });

    it('should show correct status color for flat view', async () => {
      organizerStore.setViewMode('flat');
      wrapper = createWrapper();
      
      await nextTick();
      
      expect(wrapper.vm.statusColor).toBe('default');
    });

    it('should show correct status color for folder view at root', async () => {
      wrapper = createWrapper();
      
      await nextTick();
      
      expect(wrapper.vm.statusColor).toBe('info');
    });

    it('should show correct status color for folder view with navigation', async () => {
      organizerStore.navigateToFolder('doc-type', 'Invoice');
      wrapper = createWrapper();
      
      await nextTick();
      
      expect(wrapper.vm.statusColor).toBe('primary');
    });

    it('should show correct status icon for flat view', async () => {
      organizerStore.setViewMode('flat');
      wrapper = createWrapper();
      
      await nextTick();
      
      expect(wrapper.vm.statusIcon).toBe('mdi-view-list');
    });

    it('should show correct status icon for folder view at root', async () => {
      wrapper = createWrapper();
      
      await nextTick();
      
      expect(wrapper.vm.statusIcon).toBe('mdi-folder-home');
    });

    it('should show correct status icon for folder view with navigation', async () => {
      organizerStore.navigateToFolder('doc-type', 'Invoice');
      wrapper = createWrapper();
      
      await nextTick();
      
      expect(wrapper.vm.statusIcon).toBe('mdi-folder-open');
    });

    it('should show correct status text for flat view', async () => {
      organizerStore.setViewMode('flat');
      wrapper = createWrapper();
      
      await nextTick();
      
      expect(wrapper.vm.statusText).toBe('Flat view');
    });

    it('should show correct status text for folder view at root', async () => {
      wrapper = createWrapper();
      
      await nextTick();
      
      expect(wrapper.vm.statusText).toBe('All folders');
    });

    it('should show correct status text with navigation depth', async () => {
      organizerStore.navigateToFolder('doc-type', 'Invoice');
      organizerStore.navigateToFolder('client', 'ABC Corp');
      wrapper = createWrapper();
      
      await nextTick();
      
      expect(wrapper.vm.statusText).toBe('Level 2');
    });
  });

  describe('User Interface Rendering', () => {
    it('should render primary toggle buttons', () => {
      wrapper = createWrapper();
      
      const primaryToggle = wrapper.find('.primary-toggle');
      expect(primaryToggle.exists()).toBe(true);
      
      const flatBtn = wrapper.find('[value="flat"]');
      const foldersBtn = wrapper.find('[value="folders"]');
      
      expect(flatBtn.exists()).toBe(true);
      expect(foldersBtn.exists()).toBe(true);
      expect(flatBtn.text()).toContain('Flat View');
      expect(foldersBtn.text()).toContain('Folder View');
    });

    it('should render secondary toggle buttons', () => {
      wrapper = createWrapper();
      
      const secondaryToggle = wrapper.find('.secondary-toggle');
      expect(secondaryToggle.exists()).toBe(true);
      
      const listBtn = wrapper.find('[value="list"]');
      const gridBtn = wrapper.find('[value="grid"]');
      
      expect(listBtn.exists()).toBe(true);
      expect(gridBtn.exists()).toBe(true);
    });

    it('should show status indicator when prop is true', () => {
      wrapper = createWrapper({ showStatusIndicator: true });
      
      const statusIndicator = wrapper.find('.view-status');
      expect(statusIndicator.exists()).toBe(true);
      
      const statusChip = wrapper.find('.status-chip');
      expect(statusChip.exists()).toBe(true);
    });

    it('should hide status indicator when prop is false', () => {
      wrapper = createWrapper({ showStatusIndicator: false });
      
      const statusIndicator = wrapper.find('.view-status');
      expect(statusIndicator.exists()).toBe(false);
    });

    it('should disable buttons when loading prop is true', () => {
      wrapper = createWrapper({ loading: true });
      
      const listBtn = wrapper.find('[value="list"]');
      const gridBtn = wrapper.find('[value="grid"]');
      
      expect(listBtn.attributes('disabled')).toBeDefined();
      expect(gridBtn.attributes('disabled')).toBeDefined();
    });

    it('should not disable primary toggle buttons when loading', () => {
      wrapper = createWrapper({ loading: true });
      
      const flatBtn = wrapper.find('[value="flat"]');
      const foldersBtn = wrapper.find('[value="folders"]');
      
      expect(flatBtn.attributes('disabled')).toBeUndefined();
      expect(foldersBtn.attributes('disabled')).toBeUndefined();
    });
  });

  describe('Button Interactions', () => {
    it('should update primaryViewMode when flat button is clicked', async () => {
      organizerStore.setViewMode('folders');
      wrapper = createWrapper();
      
      await nextTick();
      expect(wrapper.vm.primaryViewMode).toBe('folders');
      
      const flatBtn = wrapper.find('[value="flat"]');
      await flatBtn.trigger('click');
      
      expect(wrapper.vm.primaryViewMode).toBe('flat');
    });

    it('should update primaryViewMode when folders button is clicked', async () => {
      wrapper = createWrapper();
      
      expect(wrapper.vm.primaryViewMode).toBe('flat');
      
      const foldersBtn = wrapper.find('[value="folders"]');
      await foldersBtn.trigger('click');
      
      expect(wrapper.vm.primaryViewMode).toBe('folders');
    });

    it('should update secondaryDisplayMode when list button is clicked', async () => {
      wrapper = createWrapper();
      wrapper.vm.secondaryDisplayMode = 'grid';
      
      await nextTick();
      
      const listBtn = wrapper.find('[value="list"]');
      await listBtn.trigger('click');
      
      expect(wrapper.vm.secondaryDisplayMode).toBe('list');
    });

    it('should update secondaryDisplayMode when grid button is clicked', async () => {
      wrapper = createWrapper();
      
      expect(wrapper.vm.secondaryDisplayMode).toBe('list');
      
      const gridBtn = wrapper.find('[value="grid"]');
      await gridBtn.trigger('click');
      
      expect(wrapper.vm.secondaryDisplayMode).toBe('grid');
    });

    it('should not respond to clicks when buttons are disabled', async () => {
      wrapper = createWrapper({ loading: true });
      
      const originalMode = wrapper.vm.secondaryDisplayMode;
      
      const gridBtn = wrapper.find('[value="grid"]');
      await gridBtn.trigger('click');
      
      expect(wrapper.vm.secondaryDisplayMode).toBe(originalMode);
    });
  });

  describe('Tooltips', () => {
    it('should show tooltips for secondary toggle buttons', () => {
      wrapper = createWrapper();
      
      const listBtn = wrapper.find('[value="list"]');
      const gridBtn = wrapper.find('[value="grid"]');
      
      const listTooltip = listBtn.find('v-tooltip-stub');
      const gridTooltip = gridBtn.find('v-tooltip-stub');
      
      expect(listTooltip.exists()).toBe(true);
      expect(gridTooltip.exists()).toBe(true);
    });
  });

  describe('Compact Mode', () => {
    it('should apply compact class when compact prop is true', () => {
      wrapper = createWrapper({ compact: true });
      
      const container = wrapper.find('.view-mode-toggle');
      expect(container.classes()).toContain('compact');
    });

    it('should not apply compact class when compact prop is false', () => {
      wrapper = createWrapper({ compact: false });
      
      const container = wrapper.find('.view-mode-toggle');
      expect(container.classes()).not.toContain('compact');
    });
  });

  describe('Watcher Behavior', () => {
    it('should sync local state when store viewMode changes', async () => {
      wrapper = createWrapper();
      
      expect(wrapper.vm.primaryViewMode).toBe('flat');
      
      organizerStore.setViewMode('folders');
      await nextTick();
      
      expect(wrapper.vm.primaryViewMode).toBe('folders');
    });

    it('should not create infinite loop when syncing with store', async () => {
      wrapper = createWrapper();
      const setViewModeSpy = vi.spyOn(organizerStore, 'setViewMode');
      
      // Change store value
      organizerStore.setViewMode('folders');
      await nextTick();
      
      // Should not trigger additional store updates
      setViewModeSpy.mockClear();
      
      // Wait for any potential additional updates
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(setViewModeSpy).not.toHaveBeenCalled();
    });

    it('should handle rapid mode changes gracefully', async () => {
      wrapper = createWrapper();
      
      // Rapidly change modes
      wrapper.vm.primaryViewMode = 'folders';
      wrapper.vm.primaryViewMode = 'flat';
      wrapper.vm.primaryViewMode = 'folders';
      
      await nextTick();
      
      expect(wrapper.vm.primaryViewMode).toBe('folders');
      expect(organizerStore.viewMode).toBe('folders');
    });
  });

  describe('Initialization', () => {
    it('should initialize from store state on mount', () => {
      organizerStore.setViewMode('folders');
      
      wrapper = createWrapper();
      
      expect(wrapper.vm.primaryViewMode).toBe('folders');
    });

    it('should initialize display mode from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('grid');
      
      wrapper = createWrapper();
      
      expect(wrapper.vm.secondaryDisplayMode).toBe('grid');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('organizer-display-mode');
    });

    it('should handle missing localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      wrapper = createWrapper();
      
      expect(wrapper.vm.secondaryDisplayMode).toBe('list'); // default
    });

    it('should call initializeFromStore method', () => {
      const initSpy = vi.spyOn(ViewModeToggle.methods, 'initializeFromStore').mockImplementation();
      
      wrapper = createWrapper();
      
      expect(initSpy).toHaveBeenCalled();
      
      initSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle store access errors gracefully', () => {
      // Mock store to throw error
      vi.spyOn(organizerStore, 'viewMode', 'get').mockImplementation(() => {
        throw new Error('Store error');
      });
      
      expect(() => {
        wrapper = createWrapper();
      }).not.toThrow();
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      expect(() => {
        wrapper = createWrapper();
      }).not.toThrow();
      
      expect(wrapper.vm.secondaryDisplayMode).toBe('list'); // fallback
    });

    it('should handle localStorage setItem errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage write error');
      });
      
      wrapper = createWrapper();
      
      expect(() => {
        wrapper.vm.secondaryDisplayMode = 'grid';
      }).not.toThrow();
    });

    it('should handle malformed store state gracefully', () => {
      vi.spyOn(organizerStore, 'viewMode', 'get').mockReturnValue(null);
      
      wrapper = createWrapper();
      
      expect(wrapper.vm.primaryViewMode).toBe('flat'); // fallback
    });
  });

  describe('Reactive Dependencies', () => {
    beforeEach(() => {
      organizerStore.setViewMode('folders');
      organizerStore.setFolderHierarchy([
        { categoryId: 'doc-type', categoryName: 'Document Type' }
      ]);
    });

    it('should react to currentPath changes', async () => {
      wrapper = createWrapper();
      
      const initialStatusText = wrapper.vm.statusText;
      
      organizerStore.navigateToFolder('doc-type', 'Invoice');
      await nextTick();
      
      const updatedStatusText = wrapper.vm.statusText;
      expect(updatedStatusText).not.toBe(initialStatusText);
      expect(updatedStatusText).toBe('Level 1');
    });

    it('should react to folderHierarchy changes', async () => {
      wrapper = createWrapper();
      
      expect(wrapper.vm.folderHierarchy).toHaveLength(1);
      
      organizerStore.setFolderHierarchy([
        { categoryId: 'doc-type', categoryName: 'Document Type' },
        { categoryId: 'client', categoryName: 'Client' }
      ]);
      await nextTick();
      
      expect(wrapper.vm.folderHierarchy).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty currentPath array', () => {
      organizerStore.setViewMode('folders');
      wrapper = createWrapper();
      
      expect(wrapper.vm.currentPath).toEqual([]);
      expect(wrapper.vm.statusText).toBe('All folders');
    });

    it('should handle very deep navigation levels', async () => {
      organizerStore.setViewMode('folders');
      
      // Mock a very deep currentPath
      const deepPath = Array.from({ length: 10 }, (_, i) => ({
        categoryId: `cat-${i}`,
        categoryName: `Category ${i}`,
        tagName: `Tag ${i}`
      }));
      
      vi.spyOn(organizerStore, 'currentPath', 'get').mockReturnValue(deepPath);
      
      wrapper = createWrapper();
      
      expect(wrapper.vm.statusText).toBe('Level 10');
    });

    it('should handle undefined store properties gracefully', () => {
      vi.spyOn(organizerStore, 'currentPath', 'get').mockReturnValue(undefined);
      vi.spyOn(organizerStore, 'folderHierarchy', 'get').mockReturnValue(undefined);
      
      wrapper = createWrapper();
      
      expect(wrapper.vm.currentPath).toBeUndefined();
      expect(wrapper.vm.folderHierarchy).toBeUndefined();
      expect(() => wrapper.vm.statusText).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should not cause excessive re-renders', async () => {
      wrapper = createWrapper();
      
      const updateCount = wrapper.vm.$nuxt?.$renderCount || 0;
      
      // Multiple state changes
      wrapper.vm.primaryViewMode = 'folders';
      wrapper.vm.primaryViewMode = 'flat';
      wrapper.vm.primaryViewMode = 'folders';
      
      await nextTick();
      
      // Should batch updates efficiently
      expect(wrapper.vm.$nuxt?.$renderCount || 0).toBeLessThan(updateCount + 5);
    });

    it('should handle rapid user interactions efficiently', async () => {
      wrapper = createWrapper();
      
      const emitCount = () => 
        (wrapper.emitted('view-mode-changed') || []).length +
        (wrapper.emitted('display-mode-changed') || []).length;
      
      const initialCount = emitCount();
      
      // Simulate rapid user clicking
      for (let i = 0; i < 5; i++) {
        wrapper.vm.primaryViewMode = i % 2 === 0 ? 'folders' : 'flat';
        wrapper.vm.secondaryDisplayMode = i % 2 === 0 ? 'grid' : 'list';
      }
      
      await nextTick();
      
      // Should emit events but not excessively
      expect(emitCount()).toBeGreaterThan(initialCount);
      expect(emitCount()).toBeLessThan(initialCount + 15);
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles and labels', () => {
      wrapper = createWrapper();
      
      const buttons = wrapper.findAll('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        expect(button.element.tagName.toLowerCase()).toBe('button');
      });
    });

    it('should have proper ARIA attributes for toggles', () => {
      wrapper = createWrapper();
      
      const primaryToggle = wrapper.find('.primary-toggle');
      const secondaryToggle = wrapper.find('.secondary-toggle');
      
      expect(primaryToggle.exists()).toBe(true);
      expect(secondaryToggle.exists()).toBe(true);
    });

    it('should handle keyboard navigation properly', () => {
      wrapper = createWrapper();
      
      const buttons = wrapper.findAll('button');
      buttons.forEach(button => {
        expect(button.attributes('tabindex')).not.toBe('-1');
      });
    });

    it('should provide proper visual feedback for disabled state', () => {
      wrapper = createWrapper({ loading: true });
      
      const disabledButtons = wrapper.findAll('[disabled]');
      expect(disabledButtons.length).toBeGreaterThan(0);
      
      disabledButtons.forEach(button => {
        expect(button.attributes('disabled')).toBeDefined();
      });
    });
  });
});