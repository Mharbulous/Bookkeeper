import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import TagContextMenu from '../../../../../src/features/organizer/components/TagContextMenu.vue';
import { useOrganizerStore } from '../../../../../src/features/organizer/stores/organizer.js';

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(),
};
Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true
});

// Mock console for error testing
const originalConsoleError = console.error;

describe('TagContextMenu.vue', () => {
  let wrapper;
  let vuetify;
  let pinia;
  let organizerStore;
  let mockTagInfo;
  let mockEvidence;

  beforeEach(() => {
    // Create fresh instances for each test
    vuetify = createVuetify();
    pinia = createPinia();
    setActivePinia(pinia);
    organizerStore = useOrganizerStore();

    // Set up mock data
    mockTagInfo = {
      tagName: 'Invoice',
      categoryId: 'doc-type',
      categoryName: 'Document Type',
      color: 'primary',
      source: 'manual',
      status: 'approved'
    };

    mockEvidence = {
      id: 'evidence-1',
      fileName: 'test-document.pdf',
      tags: {
        'doc-type': [{ tagName: 'Invoice', categoryId: 'doc-type' }]
      }
    };

    // Set up store state
    organizerStore.setViewMode('folders');
    organizerStore.setFolderHierarchy([
      { categoryId: 'doc-type', categoryName: 'Document Type' },
      { categoryId: 'client', categoryName: 'Client' }
    ]);

    // Mock getCategoryById method
    vi.spyOn(organizerStore, 'getCategoryById').mockReturnValue({
      categoryId: 'doc-type',
      categoryName: 'Document Type',
      color: 'primary'
    });

    // Clear clipboard mock
    mockClipboard.writeText.mockClear();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.clearAllMocks();
    console.error = originalConsoleError;
  });

  const createWrapper = (props = {}) => {
    return mount(TagContextMenu, {
      global: {
        plugins: [vuetify, pinia]
      },
      props: {
        tagInfo: mockTagInfo,
        evidence: mockEvidence,
        isEditable: true,
        showAIOptions: true,
        ...props
      }
    });
  };

  describe('Component Mounting & Props', () => {
    it('should mount successfully with required props', () => {
      wrapper = createWrapper();
      expect(wrapper.vm).toBeTruthy();
    });

    it('should validate tagInfo prop correctly', () => {
      expect(() => {
        createWrapper({ tagInfo: { tagName: 'Valid Tag' } });
      }).not.toThrow();

      expect(() => {
        createWrapper({ tagInfo: { /* missing tagName */ } });
      }).toThrow();
    });

    it('should accept and apply custom props', () => {
      wrapper = createWrapper({
        isEditable: false,
        showAIOptions: false
      });
      
      expect(wrapper.vm.props.isEditable).toBe(false);
      expect(wrapper.vm.props.showAIOptions).toBe(false);
    });

    it('should initialize reactive state correctly', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.showMenu).toBe(false);
      expect(wrapper.vm.activatorElement).toBeNull();
      expect(wrapper.vm.menuPosition).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Store Integration', () => {
    it('should access store computed properties correctly', () => {
      wrapper = createWrapper();
      
      expect(wrapper.vm.isFolderMode).toBe(true);
      expect(wrapper.vm.folderHierarchy).toHaveLength(2);
    });

    it('should determine canShowInFolders correctly when category is in hierarchy', () => {
      wrapper = createWrapper();
      
      expect(wrapper.vm.canShowInFolders).toBe(true);
    });

    it('should determine canShowInFolders correctly when category is not in hierarchy', () => {
      const tagInfo = {
        ...mockTagInfo,
        categoryId: 'non-existent',
        categoryName: 'Non-existent Category'
      };
      
      wrapper = createWrapper({ tagInfo });
      
      expect(wrapper.vm.canShowInFolders).toBe(false);
    });

    it('should determine isInHierarchy correctly', () => {
      wrapper = createWrapper();
      
      expect(wrapper.vm.isInHierarchy).toBe(true);
    });
  });

  describe('Menu Opening & Closing', () => {
    it('should open menu with mouse event', () => {
      wrapper = createWrapper();
      
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        clientX: 100,
        clientY: 200,
        target: document.createElement('div')
      };
      
      wrapper.vm.openMenu(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(wrapper.vm.showMenu).toBe(true);
      expect(wrapper.vm.menuPosition).toEqual({ x: 100, y: 200 });
      expect(wrapper.emitted('menu-opened')).toHaveLength(1);
    });

    it('should open menu with touch event', () => {
      wrapper = createWrapper();
      
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        touches: [{ clientX: 150, clientY: 250 }],
        target: document.createElement('div')
      };
      
      wrapper.vm.openMenu(mockEvent);
      
      expect(wrapper.vm.showMenu).toBe(true);
      expect(wrapper.vm.menuPosition).toEqual({ x: 150, y: 250 });
    });

    it('should close menu', () => {
      wrapper = createWrapper();
      
      wrapper.vm.showMenu = true;
      wrapper.vm.closeMenu();
      
      expect(wrapper.vm.showMenu).toBe(false);
      expect(wrapper.emitted('menu-closed')).toHaveLength(1);
    });

    it('should handle activator element correctly', () => {
      wrapper = createWrapper();
      
      const mockElement = document.createElement('button');
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        clientX: 100,
        clientY: 200,
        target: document.createElement('div')
      };
      
      wrapper.vm.openMenu(mockEvent, mockElement);
      
      expect(wrapper.vm.activatorElement).toBe(mockElement);
    });
  });

  describe('Show in Folders Action', () => {
    it('should switch to folder mode and navigate to tag', async () => {
      organizerStore.setViewMode('flat');
      wrapper = createWrapper();
      
      const setViewModeSpy = vi.spyOn(organizerStore, 'setViewMode');
      const navigateToFolderSpy = vi.spyOn(organizerStore, 'navigateToFolder');
      
      await wrapper.vm.handleShowInFolders();
      
      expect(setViewModeSpy).toHaveBeenCalledWith('folders');
      expect(navigateToFolderSpy).toHaveBeenCalledWith('doc-type', 'Invoice');
      expect(wrapper.emitted('show-in-folders')).toHaveLength(1);
      expect(wrapper.vm.showMenu).toBe(false);
    });

    it('should not switch mode when already in folder mode', async () => {
      wrapper = createWrapper();
      
      const setViewModeSpy = vi.spyOn(organizerStore, 'setViewMode');
      const navigateToFolderSpy = vi.spyOn(organizerStore, 'navigateToFolder');
      
      await wrapper.vm.handleShowInFolders();
      
      expect(setViewModeSpy).not.toHaveBeenCalled();
      expect(navigateToFolderSpy).toHaveBeenCalledWith('doc-type', 'Invoice');
    });

    it('should add category to hierarchy if not present', async () => {
      const tagInfo = {
        ...mockTagInfo,
        categoryId: 'client',
        categoryName: 'Client'
      };
      
      organizerStore.setFolderHierarchy([
        { categoryId: 'doc-type', categoryName: 'Document Type' }
      ]);
      
      wrapper = createWrapper({ tagInfo });
      
      const addToHierarchySpy = vi.spyOn(organizerStore, 'addToHierarchy');
      
      await wrapper.vm.handleShowInFolders();
      
      expect(addToHierarchySpy).toHaveBeenCalledWith({
        categoryId: 'client',
        categoryName: 'Client',
        color: 'primary'
      });
    });

    it('should handle missing category gracefully', async () => {
      const tagInfo = {
        ...mockTagInfo,
        categoryId: null
      };
      
      wrapper = createWrapper({ tagInfo });
      
      const navigateToFolderSpy = vi.spyOn(organizerStore, 'navigateToFolder');
      
      await wrapper.vm.handleShowInFolders();
      
      expect(navigateToFolderSpy).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      wrapper = createWrapper();
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(organizerStore, 'navigateToFolder').mockImplementation(() => {
        throw new Error('Navigation failed');
      });
      
      await wrapper.vm.handleShowInFolders();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[TagContextMenu] Failed to show in folders:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Filter by Tag Action', () => {
    it('should apply tag filter to store', () => {
      wrapper = createWrapper();
      
      const setFilterSpy = vi.spyOn(organizerStore, 'setFilter');
      
      wrapper.vm.handleFilterByTag();
      
      expect(setFilterSpy).toHaveBeenCalledWith('tag:"Invoice"');
      expect(wrapper.emitted('filter-by-tag')).toHaveLength(1);
      expect(wrapper.emitted('filter-by-tag')[0][0]).toMatchObject({
        tagName: 'Invoice',
        categoryId: 'doc-type',
        filterQuery: 'tag:"Invoice"'
      });
      expect(wrapper.vm.showMenu).toBe(false);
    });

    it('should handle special characters in tag names', () => {
      const tagInfo = {
        ...mockTagInfo,
        tagName: 'Tag with "quotes" and spaces'
      };
      
      wrapper = createWrapper({ tagInfo });
      
      const setFilterSpy = vi.spyOn(organizerStore, 'setFilter');
      
      wrapper.vm.handleFilterByTag();
      
      expect(setFilterSpy).toHaveBeenCalledWith('tag:"Tag with "quotes" and spaces"');
    });
  });

  describe('Search Similar Action', () => {
    it('should apply search filter to store', () => {
      wrapper = createWrapper();
      
      const setFilterSpy = vi.spyOn(organizerStore, 'setFilter');
      
      wrapper.vm.handleSearchSimilar();
      
      expect(setFilterSpy).toHaveBeenCalledWith('Invoice');
      expect(wrapper.emitted('search-similar')).toHaveLength(1);
      expect(wrapper.emitted('search-similar')[0][0]).toMatchObject({
        tagName: 'Invoice',
        searchQuery: 'Invoice'
      });
      expect(wrapper.vm.showMenu).toBe(false);
    });
  });

  describe('Copy Tag Action', () => {
    it('should copy tag name to clipboard successfully', async () => {
      wrapper = createWrapper();
      
      await wrapper.vm.handleCopyTagName();
      
      expect(mockClipboard.writeText).toHaveBeenCalledWith('Invoice');
      expect(wrapper.emitted('copy-tag')).toHaveLength(1);
      expect(wrapper.emitted('copy-tag')[0][0]).toMatchObject({
        tagName: 'Invoice',
        success: true
      });
      expect(wrapper.vm.showMenu).toBe(false);
    });

    it('should handle clipboard write failure', async () => {
      wrapper = createWrapper();
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const clipboardError = new Error('Clipboard access denied');
      mockClipboard.writeText.mockRejectedValueOnce(clipboardError);
      
      await wrapper.vm.handleCopyTagName();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[TagContextMenu] Failed to copy tag name:',
        clipboardError
      );
      expect(wrapper.emitted('copy-tag')[0][0]).toMatchObject({
        tagName: 'Invoice',
        success: false,
        error: clipboardError
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Edit Tag Action', () => {
    it('should emit edit-tag event', () => {
      wrapper = createWrapper();
      
      wrapper.vm.handleEditTag();
      
      expect(wrapper.emitted('edit-tag')).toHaveLength(1);
      expect(wrapper.emitted('edit-tag')[0][0]).toEqual(mockTagInfo);
      expect(wrapper.vm.showMenu).toBe(false);
    });
  });

  describe('Statistics Action', () => {
    it('should emit show-statistics event', () => {
      wrapper = createWrapper();
      
      wrapper.vm.handleShowStatistics();
      
      expect(wrapper.emitted('show-statistics')).toHaveLength(1);
      expect(wrapper.emitted('show-statistics')[0][0]).toEqual(mockTagInfo);
      expect(wrapper.vm.showMenu).toBe(false);
    });
  });

  describe('Remove from Hierarchy Action', () => {
    it('should remove category from hierarchy', () => {
      wrapper = createWrapper();
      
      const removeFromHierarchySpy = vi.spyOn(organizerStore, 'removeFromHierarchy');
      
      wrapper.vm.handleRemoveFromHierarchy();
      
      expect(removeFromHierarchySpy).toHaveBeenCalledWith('doc-type');
      expect(wrapper.emitted('remove-from-hierarchy')).toHaveLength(1);
      expect(wrapper.emitted('remove-from-hierarchy')[0][0]).toMatchObject({
        categoryId: 'doc-type',
        tagInfo: mockTagInfo
      });
      expect(wrapper.vm.showMenu).toBe(false);
    });

    it('should handle missing categoryId gracefully', () => {
      const tagInfo = {
        ...mockTagInfo,
        categoryId: null
      };
      
      wrapper = createWrapper({ tagInfo });
      
      const removeFromHierarchySpy = vi.spyOn(organizerStore, 'removeFromHierarchy');
      
      wrapper.vm.handleRemoveFromHierarchy();
      
      expect(removeFromHierarchySpy).not.toHaveBeenCalled();
      expect(wrapper.emitted('remove-from-hierarchy')).toBeUndefined();
    });
  });

  describe('AI Tag Actions', () => {
    const aiTagInfo = {
      ...mockTagInfo,
      source: 'ai',
      status: 'pending',
      confidence: 85,
      reasoning: 'AI analysis based on content'
    };

    it('should handle AI tag approval', () => {
      wrapper = createWrapper({ tagInfo: aiTagInfo });
      
      wrapper.vm.handleApproveAI();
      
      expect(wrapper.emitted('approve-ai')).toHaveLength(1);
      expect(wrapper.emitted('approve-ai')[0][0]).toEqual(aiTagInfo);
      expect(wrapper.vm.showMenu).toBe(false);
    });

    it('should handle AI tag rejection', () => {
      wrapper = createWrapper({ tagInfo: aiTagInfo });
      
      wrapper.vm.handleRejectAI();
      
      expect(wrapper.emitted('reject-ai')).toHaveLength(1);
      expect(wrapper.emitted('reject-ai')[0][0]).toEqual(aiTagInfo);
      expect(wrapper.vm.showMenu).toBe(false);
    });
  });

  describe('Menu Rendering', () => {
    beforeEach(() => {
      wrapper = createWrapper();
      wrapper.vm.showMenu = true;
    });

    it('should render menu header with tag information', async () => {
      await nextTick();
      
      const cardTitle = wrapper.find('.v-card-title');
      expect(cardTitle.exists()).toBe(true);
      expect(cardTitle.text()).toContain('Invoice');
      expect(cardTitle.text()).toContain('Document Type');
    });

    it('should render Show in Folders option when canShowInFolders is true', async () => {
      await nextTick();
      
      const showInFoldersItem = wrapper.find('[title="Show in Folders"]');
      expect(showInFoldersItem.exists()).toBe(true);
    });

    it('should not render Show in Folders option when canShowInFolders is false', async () => {
      const tagInfo = {
        ...mockTagInfo,
        categoryId: 'non-existent'
      };
      
      wrapper = createWrapper({ tagInfo });
      wrapper.vm.showMenu = true;
      await nextTick();
      
      const showInFoldersItem = wrapper.find('[title="Show in Folders"]');
      expect(showInFoldersItem.exists()).toBe(false);
    });

    it('should render standard actions', async () => {
      await nextTick();
      
      expect(wrapper.find('[title="Filter by Tag"]').exists()).toBe(true);
      expect(wrapper.find('[title="Search Similar Tags"]').exists()).toBe(true);
      expect(wrapper.find('[title="Copy Tag Name"]').exists()).toBe(true);
      expect(wrapper.find('[title="Tag Statistics"]').exists()).toBe(true);
    });

    it('should render edit action when isEditable is true', async () => {
      await nextTick();
      
      const editItem = wrapper.find('[title="Edit Tag"]');
      expect(editItem.exists()).toBe(true);
    });

    it('should not render edit action when isEditable is false', async () => {
      wrapper = createWrapper({ isEditable: false });
      wrapper.vm.showMenu = true;
      await nextTick();
      
      const editItem = wrapper.find('[title="Edit Tag"]');
      expect(editItem.exists()).toBe(false);
    });

    it('should render remove from hierarchy option when in folder mode and in hierarchy', async () => {
      await nextTick();
      
      const removeItem = wrapper.find('[title="Remove from Folders"]');
      expect(removeItem.exists()).toBe(true);
    });

    it('should render AI-specific actions for AI tags', async () => {
      const aiTagInfo = {
        ...mockTagInfo,
        source: 'ai',
        status: 'pending',
        confidence: 85
      };
      
      wrapper = createWrapper({ tagInfo: aiTagInfo });
      wrapper.vm.showMenu = true;
      await nextTick();
      
      expect(wrapper.find('[title="Approve AI Tag"]').exists()).toBe(true);
      expect(wrapper.find('[title="Reject AI Tag"]').exists()).toBe(true);
    });

    it('should render AI confidence information', async () => {
      const aiTagInfo = {
        ...mockTagInfo,
        source: 'ai',
        confidence: 85,
        reasoning: 'AI analysis based on content'
      };
      
      wrapper = createWrapper({ tagInfo: aiTagInfo });
      wrapper.vm.showMenu = true;
      await nextTick();
      
      const confidenceItem = wrapper.find('[title*="Confidence: 85%"]');
      expect(confidenceItem.exists()).toBe(true);
    });
  });

  describe('Event Handling', () => {
    it('should handle click outside to close menu', () => {
      wrapper = createWrapper();
      wrapper.vm.showMenu = true;
      
      wrapper.vm.handleClickOutside();
      
      expect(wrapper.vm.showMenu).toBe(false);
    });

    it('should handle escape key globally', () => {
      wrapper = createWrapper();
      wrapper.vm.showMenu = true;
      
      const mockEvent = { key: 'Escape' };
      wrapper.vm.handleGlobalKeydown(mockEvent);
      
      expect(wrapper.vm.showMenu).toBe(false);
    });

    it('should not handle non-escape keys', () => {
      wrapper = createWrapper();
      wrapper.vm.showMenu = true;
      
      const mockEvent = { key: 'Enter' };
      wrapper.vm.handleGlobalKeydown(mockEvent);
      
      expect(wrapper.vm.showMenu).toBe(true);
    });

    it('should not handle escape when menu is closed', () => {
      wrapper = createWrapper();
      wrapper.vm.showMenu = false;
      
      const mockEvent = { key: 'Escape' };
      wrapper.vm.handleGlobalKeydown(mockEvent);
      
      expect(wrapper.vm.showMenu).toBe(false); // No change
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should add global keydown listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      
      wrapper = createWrapper();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', wrapper.vm.handleGlobalKeydown);
      
      addEventListenerSpy.mockRestore();
    });

    it('should remove global keydown listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      wrapper = createWrapper();
      const keydownHandler = wrapper.vm.handleGlobalKeydown;
      
      wrapper.unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', keydownHandler);
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Exposed Methods', () => {
    it('should expose openMenu method', () => {
      wrapper = createWrapper();
      
      expect(wrapper.vm.openMenu).toBeInstanceOf(Function);
    });

    it('should expose closeMenu method', () => {
      wrapper = createWrapper();
      
      expect(wrapper.vm.closeMenu).toBeInstanceOf(Function);
    });

    it('should expose isOpen computed property', () => {
      wrapper = createWrapper();
      
      expect(wrapper.vm.isOpen).toBe(false);
      
      wrapper.vm.showMenu = true;
      expect(wrapper.vm.isOpen).toBe(true);
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle undefined tagInfo properties gracefully', () => {
      const incompleteTagInfo = {
        tagName: 'TestTag'
        // Missing other properties
      };
      
      expect(() => {
        wrapper = createWrapper({ tagInfo: incompleteTagInfo });
      }).not.toThrow();
    });

    it('should handle missing store methods gracefully', () => {
      vi.spyOn(organizerStore, 'setFilter').mockImplementation(() => {
        throw new Error('Store method failed');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      wrapper = createWrapper();
      
      expect(() => {
        wrapper.vm.handleFilterByTag();
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should handle null evidence prop', () => {
      expect(() => {
        wrapper = createWrapper({ evidence: null });
      }).not.toThrow();
    });

    it('should handle empty folderHierarchy', () => {
      organizerStore.setFolderHierarchy([]);
      
      wrapper = createWrapper();
      
      expect(wrapper.vm.canShowInFolders).toBe(false);
      expect(wrapper.vm.isInHierarchy).toBe(false);
    });

    it('should handle missing categoryId in various actions', async () => {
      const tagInfo = {
        tagName: 'TestTag'
        // Missing categoryId
      };
      
      wrapper = createWrapper({ tagInfo });
      
      // These should all complete without errors
      await wrapper.vm.handleShowInFolders();
      wrapper.vm.handleFilterByTag();
      wrapper.vm.handleRemoveFromHierarchy();
      
      // Should not crash but may not perform the expected actions
      expect(wrapper.vm.canShowInFolders).toBe(false);
    });
  });

  describe('Menu Positioning', () => {
    it('should position menu at mouse coordinates', () => {
      wrapper = createWrapper();
      
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        clientX: 250,
        clientY: 350,
        target: document.createElement('div')
      };
      
      wrapper.vm.openMenu(mockEvent);
      
      expect(wrapper.vm.menuPosition).toEqual({ x: 250, y: 350 });
    });

    it('should position menu at touch coordinates', () => {
      wrapper = createWrapper();
      
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        touches: [{ clientX: 180, clientY: 280 }],
        target: document.createElement('div')
      };
      
      wrapper.vm.openMenu(mockEvent);
      
      expect(wrapper.vm.menuPosition).toEqual({ x: 180, y: 280 });
    });

    it('should prefer touch coordinates over mouse coordinates when both present', () => {
      wrapper = createWrapper();
      
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        clientX: 100,
        clientY: 200,
        touches: [{ clientX: 150, clientY: 250 }],
        target: document.createElement('div')
      };
      
      wrapper.vm.openMenu(mockEvent);
      
      expect(wrapper.vm.menuPosition).toEqual({ x: 150, y: 250 });
    });
  });

  describe('Performance', () => {
    it('should not cause memory leaks with event listeners', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      wrapper = createWrapper();
      const handler = addEventListenerSpy.mock.calls[0]?.[1];
      
      wrapper.unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', handler);
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should handle rapid menu open/close operations', () => {
      wrapper = createWrapper();
      
      for (let i = 0; i < 10; i++) {
        const mockEvent = {
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
          clientX: i * 10,
          clientY: i * 10,
          target: document.createElement('div')
        };
        
        wrapper.vm.openMenu(mockEvent);
        wrapper.vm.closeMenu();
      }
      
      expect(wrapper.vm.showMenu).toBe(false);
      expect(wrapper.emitted('menu-opened')).toHaveLength(10);
      expect(wrapper.emitted('menu-closed')).toHaveLength(10);
    });
  });
});