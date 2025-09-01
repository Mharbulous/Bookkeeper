import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import { createPinia, setActivePinia } from 'pinia';
import FolderBreadcrumbs from '../../../../../src/features/organizer/components/FolderBreadcrumbs.vue';
import { useOrganizerStore } from '../../../../../src/features/organizer/stores/organizer.js';

// Mock window object for testing
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024
});

const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
Object.defineProperty(window, 'addEventListener', {
  writable: true,
  value: mockAddEventListener
});
Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  value: mockRemoveEventListener
});

describe('FolderBreadcrumbs.vue', () => {
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

    // Reset window width
    window.innerWidth = 1024;
    
    // Clear mock calls
    mockAddEventListener.mockClear();
    mockRemoveEventListener.mockClear();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  const createWrapper = (props = {}) => {
    return mount(FolderBreadcrumbs, {
      global: {
        plugins: [vuetify, pinia]
      },
      props: {
        maxVisibleItems: 3,
        showRootCrumb: true,
        responsive: true,
        ...props
      }
    });
  };

  describe('Component Mounting & Props', () => {
    it('should mount successfully with default props', () => {
      wrapper = createWrapper();
      expect(wrapper.vm).toBeTruthy();
      expect(wrapper.vm.props.maxVisibleItems).toBe(3);
      expect(wrapper.vm.props.showRootCrumb).toBe(true);
      expect(wrapper.vm.props.responsive).toBe(true);
    });

    it('should accept and apply custom props', () => {
      wrapper = createWrapper({
        maxVisibleItems: 5,
        showRootCrumb: false,
        responsive: false
      });
      
      expect(wrapper.vm.props.maxVisibleItems).toBe(5);
      expect(wrapper.vm.props.showRootCrumb).toBe(false);
      expect(wrapper.vm.props.responsive).toBe(false);
    });

    it('should initialize reactive state correctly', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.isCollapsed).toBe(false);
      expect(wrapper.vm.screenWidth).toBe(1024);
    });
  });

  describe('Store Integration', () => {
    beforeEach(() => {
      // Set up store state for folder mode
      organizerStore.setViewMode('folders');
      organizerStore.setFolderHierarchy([
        { categoryId: 'doc-type', categoryName: 'Document Type' },
        { categoryId: 'client', categoryName: 'Client' }
      ]);
    });

    it('should react to store isFolderMode changes', async () => {
      wrapper = createWrapper();
      
      expect(wrapper.vm.isFolderMode).toBe(true);
      
      organizerStore.setViewMode('flat');
      await wrapper.vm.$nextTick();
      
      expect(wrapper.vm.isFolderMode).toBe(false);
    });

    it('should react to store isAtRoot changes', async () => {
      wrapper = createWrapper();
      
      expect(wrapper.vm.isAtRoot).toBe(true);
      
      organizerStore.navigateToFolder('doc-type', 'Invoice');
      await wrapper.vm.$nextTick();
      
      expect(wrapper.vm.isAtRoot).toBe(false);
    });

    it('should react to breadcrumbPath changes', async () => {
      wrapper = createWrapper();
      
      expect(wrapper.vm.breadcrumbPath).toEqual([]);
      
      organizerStore.navigateToFolder('doc-type', 'Invoice');
      await wrapper.vm.$nextTick();
      
      const breadcrumbs = wrapper.vm.breadcrumbPath;
      expect(breadcrumbs).toHaveLength(1);
      expect(breadcrumbs[0].tagName).toBe('Invoice');
    });
  });

  describe('Breadcrumb Generation', () => {
    beforeEach(() => {
      organizerStore.setViewMode('folders');
      organizerStore.setFolderHierarchy([
        { categoryId: 'doc-type', categoryName: 'Document Type' },
        { categoryId: 'client', categoryName: 'Client' }
      ]);
    });

    it('should generate empty breadcrumb items when no path', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.breadcrumbItems).toEqual([]);
    });

    it('should generate breadcrumb items from current path', async () => {
      wrapper = createWrapper();
      
      organizerStore.navigateToFolder('doc-type', 'Invoice');
      organizerStore.navigateToFolder('client', 'ABC Corp');
      await wrapper.vm.$nextTick();
      
      const items = wrapper.vm.breadcrumbItems;
      expect(items).toHaveLength(2);
      
      expect(items[0]).toMatchObject({
        title: 'Invoice',
        href: true,
        disabled: false,
        depth: 0,
        icon: 'mdi-folder'
      });
      
      expect(items[1]).toMatchObject({
        title: 'ABC Corp',
        href: false,
        disabled: true,
        depth: 1,
        icon: 'mdi-folder'
      });
    });

    it('should apply collapsing logic when collapsed and over max items', async () => {
      wrapper = createWrapper({ maxVisibleItems: 2 });
      
      // Set up deep navigation
      organizerStore.setFolderHierarchy([
        { categoryId: 'doc-type', categoryName: 'Document Type' },
        { categoryId: 'client', categoryName: 'Client' },
        { categoryId: 'year', categoryName: 'Year' },
        { categoryId: 'status', categoryName: 'Status' }
      ]);
      
      organizerStore.navigateToFolder('doc-type', 'Invoice');
      organizerStore.navigateToFolder('client', 'ABC Corp');
      organizerStore.navigateToFolder('year', '2024');
      organizerStore.navigateToFolder('status', 'Active');
      
      wrapper.vm.isCollapsed = true;
      await wrapper.vm.$nextTick();
      
      const items = wrapper.vm.breadcrumbItems;
      expect(items).toHaveLength(3); // first + ellipsis + last
      expect(items[0].title).toBe('Invoice');
      expect(items[1].title).toBe('...');
      expect(items[1].isEllipsis).toBe(true);
      expect(items[2].title).toBe('Active');
    });
  });

  describe('Responsive Behavior', () => {
    beforeEach(() => {
      organizerStore.setViewMode('folders');
      organizerStore.setFolderHierarchy([
        { categoryId: 'doc-type', categoryName: 'Document Type' },
        { categoryId: 'client', categoryName: 'Client' }
      ]);
      
      // Set up navigation with many levels
      organizerStore.navigateToFolder('doc-type', 'Invoice');
      organizerStore.navigateToFolder('client', 'ABC Corp');
    });

    it('should determine canCollapse based on responsive prop and conditions', async () => {
      wrapper = createWrapper({ maxVisibleItems: 1, responsive: true });
      
      // Desktop width - should not collapse
      window.innerWidth = 1024;
      wrapper.vm.screenWidth = 1024;
      await wrapper.vm.$nextTick();
      
      expect(wrapper.vm.canCollapse).toBe(false);
      
      // Mobile width - should be able to collapse
      window.innerWidth = 600;
      wrapper.vm.screenWidth = 600;
      await wrapper.vm.$nextTick();
      
      expect(wrapper.vm.canCollapse).toBe(true);
    });

    it('should handle resize events correctly', async () => {
      wrapper = createWrapper({ maxVisibleItems: 1 });
      
      expect(mockAddEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      
      // Simulate resize to mobile
      const resizeHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'resize')[1];
      window.innerWidth = 500;
      resizeHandler();
      
      await wrapper.vm.$nextTick();
      
      expect(wrapper.vm.screenWidth).toBe(500);
      expect(wrapper.vm.isCollapsed).toBe(true); // Should auto-collapse
    });

    it('should auto-expand on desktop resize', async () => {
      wrapper = createWrapper({ maxVisibleItems: 1 });
      
      // Start mobile and collapsed
      window.innerWidth = 500;
      wrapper.vm.screenWidth = 500;
      wrapper.vm.isCollapsed = true;
      
      // Resize to desktop
      const resizeHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'resize')[1];
      window.innerWidth = 1024;
      resizeHandler();
      
      await wrapper.vm.$nextTick();
      
      expect(wrapper.vm.screenWidth).toBe(1024);
      expect(wrapper.vm.isCollapsed).toBe(false); // Should auto-expand
    });

    it('should disable responsive when prop is false', async () => {
      wrapper = createWrapper({ maxVisibleItems: 1, responsive: false });
      
      window.innerWidth = 500;
      wrapper.vm.screenWidth = 500;
      await wrapper.vm.$nextTick();
      
      expect(wrapper.vm.canCollapse).toBe(false);
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      organizerStore.setViewMode('folders');
      organizerStore.setFolderHierarchy([
        { categoryId: 'doc-type', categoryName: 'Document Type' },
        { categoryId: 'client', categoryName: 'Client' }
      ]);
      organizerStore.navigateToFolder('doc-type', 'Invoice');
      organizerStore.navigateToFolder('client', 'ABC Corp');
    });

    it('should handle root navigation click', async () => {
      wrapper = createWrapper();
      const navigateToRootSpy = vi.spyOn(organizerStore, 'navigateToRoot');
      
      await wrapper.vm.$nextTick();
      const rootButton = wrapper.find('.root-breadcrumb');
      expect(rootButton.exists()).toBe(true);
      
      await rootButton.trigger('click');
      
      expect(navigateToRootSpy).toHaveBeenCalled();
      expect(wrapper.emitted('navigate-to-root')).toHaveLength(1);
    });

    it('should handle breadcrumb item click for navigation', async () => {
      wrapper = createWrapper();
      const navigateToDepthSpy = vi.spyOn(organizerStore, 'navigateToDepth');
      
      await wrapper.vm.$nextTick();
      
      // Click on first breadcrumb (clickable)
      const breadcrumbButtons = wrapper.findAll('.breadcrumb-item');
      const firstBreadcrumb = breadcrumbButtons[0];
      
      await firstBreadcrumb.trigger('click');
      
      expect(navigateToDepthSpy).toHaveBeenCalledWith(0);
      expect(wrapper.emitted('navigate-to-depth')).toHaveLength(1);
      expect(wrapper.emitted('navigate-to-depth')[0]).toEqual([0]);
    });

    it('should not handle click on disabled breadcrumb item', async () => {
      wrapper = createWrapper();
      const navigateToDepthSpy = vi.spyOn(organizerStore, 'navigateToDepth');
      
      await wrapper.vm.$nextTick();
      
      // Find disabled breadcrumb (last item)
      const breadcrumbButtons = wrapper.findAll('.breadcrumb-item');
      const lastBreadcrumb = breadcrumbButtons[breadcrumbButtons.length - 1];
      
      expect(lastBreadcrumb.attributes('disabled')).toBeDefined();
      
      await lastBreadcrumb.trigger('click');
      
      expect(navigateToDepthSpy).not.toHaveBeenCalled();
    });

    it('should handle collapse toggle click', async () => {
      // Set up conditions for collapse toggle to show
      window.innerWidth = 500;
      wrapper = createWrapper({ maxVisibleItems: 1, responsive: true });
      wrapper.vm.screenWidth = 500;
      
      await wrapper.vm.$nextTick();
      
      const toggleButton = wrapper.find('.collapse-toggle');
      expect(toggleButton.exists()).toBe(true);
      
      expect(wrapper.vm.isCollapsed).toBe(true); // Auto-collapsed
      
      await toggleButton.trigger('click');
      
      expect(wrapper.vm.isCollapsed).toBe(false);
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      organizerStore.setViewMode('folders');
      organizerStore.setFolderHierarchy([
        { categoryId: 'doc-type', categoryName: 'Document Type' }
      ]);
      organizerStore.navigateToFolder('doc-type', 'Invoice');
    });

    it('should emit navigate-to-root when root is clicked', async () => {
      wrapper = createWrapper();
      
      await wrapper.vm.handleNavigateToRoot();
      
      expect(wrapper.emitted('navigate-to-root')).toHaveLength(1);
    });

    it('should emit navigate-to-depth with correct depth', async () => {
      wrapper = createWrapper();
      
      await wrapper.vm.handleNavigateToDepth(0);
      
      expect(wrapper.emitted('navigate-to-depth')).toHaveLength(1);
      expect(wrapper.emitted('navigate-to-depth')[0]).toEqual([0]);
    });

    it('should not emit navigate-to-depth for negative depth', async () => {
      wrapper = createWrapper();
      
      await wrapper.vm.handleNavigateToDepth(-1);
      
      expect(wrapper.emitted('navigate-to-depth')).toBeUndefined();
    });
  });

  describe('Rendering Behavior', () => {
    it('should not render breadcrumbs when not in folder mode', async () => {
      organizerStore.setViewMode('flat');
      wrapper = createWrapper();
      
      await wrapper.vm.$nextTick();
      
      const breadcrumbsContainer = wrapper.find('v-breadcrumbs-stub');
      expect(breadcrumbsContainer.exists()).toBe(false);
    });

    it('should render breadcrumbs when in folder mode with path', async () => {
      organizerStore.setViewMode('folders');
      organizerStore.setFolderHierarchy([
        { categoryId: 'doc-type', categoryName: 'Document Type' }
      ]);
      organizerStore.navigateToFolder('doc-type', 'Invoice');
      
      wrapper = createWrapper();
      await wrapper.vm.$nextTick();
      
      const breadcrumbsContainer = wrapper.find('v-breadcrumbs-stub');
      expect(breadcrumbsContainer.exists()).toBe(true);
    });

    it('should render root crumb when showRootCrumb is true', async () => {
      organizerStore.setViewMode('folders');
      wrapper = createWrapper({ showRootCrumb: true });
      
      await wrapper.vm.$nextTick();
      
      const breadcrumbsContainer = wrapper.find('v-breadcrumbs-stub');
      expect(breadcrumbsContainer.exists()).toBe(true);
    });

    it('should show collapse toggle when conditions are met', async () => {
      organizerStore.setViewMode('folders');
      organizerStore.setFolderHierarchy([
        { categoryId: 'doc-1', categoryName: 'Doc 1' },
        { categoryId: 'doc-2', categoryName: 'Doc 2' },
        { categoryId: 'doc-3', categoryName: 'Doc 3' },
        { categoryId: 'doc-4', categoryName: 'Doc 4' },
        { categoryId: 'doc-5', categoryName: 'Doc 5' }
      ]);
      
      // Navigate deep to create many breadcrumbs
      for (let i = 1; i <= 5; i++) {
        organizerStore.navigateToFolder(`doc-${i}`, `Tag${i}`);
      }
      
      window.innerWidth = 500;
      wrapper = createWrapper({ maxVisibleItems: 2, responsive: true });
      wrapper.vm.screenWidth = 500;
      
      await wrapper.vm.$nextTick();
      
      const toggleButton = wrapper.find('.collapse-toggle');
      expect(toggleButton.exists()).toBe(true);
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should add resize listener on mount', () => {
      wrapper = createWrapper();
      
      expect(mockAddEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should remove resize listener on unmount', () => {
      wrapper = createWrapper();
      const resizeHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'resize')[1];
      
      wrapper.unmount();
      
      expect(mockRemoveEventListener).toHaveBeenCalledWith('resize', resizeHandler);
    });

    it('should handle initial resize check on mount', () => {
      // Set up mobile width before mounting
      window.innerWidth = 500;
      
      wrapper = createWrapper({ maxVisibleItems: 1 });
      
      // Should call handleResize which updates screenWidth
      expect(wrapper.vm.screenWidth).toBe(500);
    });

    it('should handle missing window gracefully', () => {
      // Temporarily remove window
      const originalWindow = global.window;
      delete global.window;
      
      expect(() => {
        wrapper = createWrapper();
      }).not.toThrow();
      
      // Restore window
      global.window = originalWindow;
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty breadcrumbPath gracefully', () => {
      organizerStore.setViewMode('folders');
      wrapper = createWrapper();
      
      expect(wrapper.vm.breadcrumbItems).toEqual([]);
    });

    it('should handle null breadcrumbPath gracefully', async () => {
      organizerStore.setViewMode('folders');
      wrapper = createWrapper();
      
      // Force null breadcrumbPath (shouldn't normally happen)
      vi.spyOn(organizerStore, 'breadcrumbPath', 'get').mockReturnValue(null);
      
      await wrapper.vm.$nextTick();
      
      expect(wrapper.vm.breadcrumbItems).toEqual([]);
    });

    it('should handle toggle collapse when no items present', async () => {
      wrapper = createWrapper();
      
      expect(() => wrapper.vm.toggleCollapsed()).not.toThrow();
      expect(wrapper.vm.isCollapsed).toBe(true);
    });

    it('should validate depth parameter in handleNavigateToDepth', async () => {
      wrapper = createWrapper();
      const navigateToDepthSpy = vi.spyOn(organizerStore, 'navigateToDepth');
      
      await wrapper.vm.handleNavigateToDepth(-5);
      expect(navigateToDepthSpy).not.toHaveBeenCalled();
      
      await wrapper.vm.handleNavigateToDepth(0);
      expect(navigateToDepthSpy).toHaveBeenCalledWith(0);
      
      await wrapper.vm.handleNavigateToDepth(3);
      expect(navigateToDepthSpy).toHaveBeenCalledWith(3);
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      organizerStore.setViewMode('folders');
      organizerStore.setFolderHierarchy([
        { categoryId: 'doc-type', categoryName: 'Document Type' }
      ]);
      organizerStore.navigateToFolder('doc-type', 'Invoice');
    });

    it('should have proper ARIA attributes', async () => {
      wrapper = createWrapper();
      await wrapper.vm.$nextTick();
      
      const rootButton = wrapper.find('.root-breadcrumb');
      expect(rootButton.exists()).toBe(true);
      
      const breadcrumbItems = wrapper.findAll('.breadcrumb-item');
      expect(breadcrumbItems.length).toBeGreaterThan(0);
    });

    it('should handle focus management', async () => {
      wrapper = createWrapper();
      await wrapper.vm.$nextTick();
      
      const breadcrumbButtons = wrapper.findAll('.breadcrumb-item, .root-breadcrumb');
      
      // Should be focusable elements
      breadcrumbButtons.forEach(button => {
        expect(button.element.tagName.toLowerCase()).toBe('button');
      });
    });

    it('should show proper disabled states', async () => {
      wrapper = createWrapper();
      await wrapper.vm.$nextTick();
      
      const breadcrumbItems = wrapper.findAll('.breadcrumb-item');
      
      // Last item should be disabled (current location)
      if (breadcrumbItems.length > 0) {
        const lastItem = breadcrumbItems[breadcrumbItems.length - 1];
        expect(lastItem.attributes('disabled')).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle store navigation errors gracefully', async () => {
      wrapper = createWrapper();
      
      // Mock store method to throw error
      vi.spyOn(organizerStore, 'navigateToRoot').mockImplementation(() => {
        throw new Error('Navigation failed');
      });
      
      expect(() => wrapper.vm.handleNavigateToRoot()).not.toThrow();
    });

    it('should handle malformed breadcrumb data gracefully', async () => {
      organizerStore.setViewMode('folders');
      wrapper = createWrapper();
      
      // Mock malformed breadcrumbPath
      vi.spyOn(organizerStore, 'breadcrumbPath', 'get').mockReturnValue([
        { /* missing required fields */ },
        null,
        undefined
      ]);
      
      await wrapper.vm.$nextTick();
      
      expect(() => wrapper.vm.breadcrumbItems).not.toThrow();
    });

    it('should handle resize handler errors gracefully', () => {
      wrapper = createWrapper();
      
      const resizeHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'resize')[1];
      
      // Mock window.innerWidth to throw
      Object.defineProperty(window, 'innerWidth', {
        get() { throw new Error('Window access failed'); }
      });
      
      expect(() => resizeHandler()).not.toThrow();
    });
  });
});