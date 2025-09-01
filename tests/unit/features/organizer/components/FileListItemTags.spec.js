import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import FileListItemTags from '../../../../../src/features/organizer/components/FileListItemTags.vue';
import { useAuthStore } from '../../../../../src/core/stores/auth.js';

// Mock components that are not the focus of these tests
vi.mock('../../../../../src/features/organizer/components/TagSelector.vue', () => ({
  default: {
    name: 'TagSelector',
    template: '<div class="tag-selector-mock">TagSelector Mock</div>',
    props: ['evidence', 'loading'],
    emits: ['tags-updated', 'migrate-legacy']
  }
}));

vi.mock('../../../../../src/features/organizer/components/AITagChip.vue', () => ({
  default: {
    name: 'AITagChip',
    template: '<div class="ai-tag-chip-mock" :class="$attrs.class">AITagChip Mock: {{ tag.tagName }}</div>',
    props: ['tag', 'showStatusActions']
  }
}));

vi.mock('../../../../../src/features/organizer/components/TagContextMenu.vue', () => ({
  default: {
    name: 'TagContextMenu',
    template: '<div class="tag-context-menu-mock">TagContextMenu Mock</div>',
    props: ['tagInfo', 'evidence', 'isEditable'],
    emits: ['show-in-folders', 'filter-by-tag', 'tag-action'],
    methods: {
      openMenu: vi.fn(),
      closeMenu: vi.fn()
    }
  }
}));

// Mock tagSubcollectionService
const mockTagService = {
  getTagsByStatus: vi.fn()
};
vi.mock('../../../../../src/features/organizer/services/tagSubcollectionService.js', () => ({
  default: mockTagService
}));

describe('FileListItemTags.vue', () => {
  let wrapper;
  let vuetify;
  let pinia;
  let authStore;
  let mockEvidence;

  beforeEach(() => {
    // Create fresh instances for each test
    vuetify = createVuetify();
    pinia = createPinia();
    setActivePinia(pinia);
    authStore = useAuthStore();

    // Mock auth store
    vi.spyOn(authStore, 'currentTeam', 'get').mockReturnValue('team-123');

    // Set up mock evidence data
    mockEvidence = {
      id: 'evidence-1',
      fileName: 'test-document.pdf',
      tags: {
        'doc-type': [
          { tagName: 'Invoice', categoryId: 'doc-type', metadata: { color: 'primary' } }
        ],
        'client': [
          { tagName: 'ABC Corp', categoryId: 'client', metadata: { color: 'secondary' } }
        ]
      }
    };

    // Clear service mock
    mockTagService.getTagsByStatus.mockClear();
    mockTagService.getTagsByStatus.mockResolvedValue({
      pending: [],
      approved: [],
      rejected: []
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.clearAllMocks();
  });

  const createWrapper = (props = {}) => {
    return mount(FileListItemTags, {
      global: {
        plugins: [vuetify, pinia]
      },
      props: {
        evidence: mockEvidence,
        readonly: false,
        tagUpdateLoading: false,
        tagInputPlaceholder: 'Add tags...',
        ...props
      }
    });
  };

  describe('Component Mounting & Props', () => {
    it('should mount successfully with required props', () => {
      wrapper = createWrapper();
      expect(wrapper.vm).toBeTruthy();
      expect(wrapper.vm.props.evidence).toEqual(mockEvidence);
    });

    it('should accept and apply custom props', () => {
      wrapper = createWrapper({
        readonly: true,
        tagUpdateLoading: true,
        tagInputPlaceholder: 'Custom placeholder'
      });
      
      expect(wrapper.vm.props.readonly).toBe(true);
      expect(wrapper.vm.props.tagUpdateLoading).toBe(true);
      expect(wrapper.vm.props.tagInputPlaceholder).toBe('Custom placeholder');
    });

    it('should initialize reactive state correctly', () => {
      wrapper = createWrapper();
      expect(wrapper.vm.pendingTags).toEqual([]);
      expect(wrapper.vm.approvedTags).toEqual([]);
      expect(wrapper.vm.rejectedTags).toEqual([]);
      expect(wrapper.vm.loadingTags).toBe(false);
      expect(wrapper.vm.currentContextTag).toBeNull();
    });
  });

  describe('Tag Data Loading', () => {
    it('should load subcollection tags on mount', async () => {
      const mockTagData = {
        pending: [
          { id: 'ai-1', tagName: 'AI Tag 1', source: 'ai', status: 'pending', confidence: 85 }
        ],
        approved: [
          { id: 'manual-1', tagName: 'Manual Tag', source: 'manual', status: 'approved' }
        ],
        rejected: [
          { id: 'ai-2', tagName: 'Rejected Tag', source: 'ai', status: 'rejected' }
        ]
      };

      mockTagService.getTagsByStatus.mockResolvedValue(mockTagData);
      
      wrapper = createWrapper();
      await nextTick();

      expect(mockTagService.getTagsByStatus).toHaveBeenCalledWith('evidence-1', 'team-123');
      expect(wrapper.vm.pendingTags).toEqual(mockTagData.pending);
      expect(wrapper.vm.approvedTags).toEqual(mockTagData.approved);
      expect(wrapper.vm.rejectedTags).toEqual(mockTagData.rejected);
    });

    it('should reload tags when evidence changes', async () => {
      wrapper = createWrapper();
      await nextTick();
      
      mockTagService.getTagsByStatus.mockClear();
      
      const newEvidence = { ...mockEvidence, id: 'evidence-2' };
      await wrapper.setProps({ evidence: newEvidence });

      expect(mockTagService.getTagsByStatus).toHaveBeenCalledWith('evidence-2', 'team-123');
    });

    it('should handle loading errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockTagService.getTagsByStatus.mockRejectedValue(new Error('Service error'));
      
      wrapper = createWrapper();
      await nextTick();

      expect(wrapper.vm.pendingTags).toEqual([]);
      expect(wrapper.vm.approvedTags).toEqual([]);
      expect(wrapper.vm.rejectedTags).toEqual([]);
      expect(wrapper.vm.loadingTags).toBe(false);
      
      consoleSpy.mockRestore();
    });

    it('should not load tags when no evidence ID', async () => {
      const evidenceWithoutId = { ...mockEvidence, id: null };
      wrapper = createWrapper({ evidence: evidenceWithoutId });
      
      await nextTick();

      expect(mockTagService.getTagsByStatus).not.toHaveBeenCalled();
    });

    it('should not load tags when no team ID', async () => {
      vi.spyOn(authStore, 'currentTeam', 'get').mockReturnValue(null);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      wrapper = createWrapper();
      
      await nextTick();

      expect(mockTagService.getTagsByStatus).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('[FileListItemTags] No team ID available');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Computed Properties', () => {
    beforeEach(async () => {
      const mockTagData = {
        pending: [
          { id: 'ai-1', tagName: 'AI Pending', source: 'ai', status: 'pending', confidence: 85 }
        ],
        approved: [
          { id: 'manual-1', tagName: 'Manual Tag', source: 'manual', status: 'approved' },
          { id: 'ai-approved', tagName: 'AI Approved', source: 'ai', status: 'approved', confidence: 90 }
        ],
        rejected: [
          { id: 'ai-2', tagName: 'AI Rejected', source: 'ai', status: 'rejected', confidence: 60 }
        ]
      };

      mockTagService.getTagsByStatus.mockResolvedValue(mockTagData);
      wrapper = createWrapper();
      await nextTick();
    });

    it('should compute structuredHumanTags correctly', () => {
      const humanTags = wrapper.vm.structuredHumanTags;
      
      expect(humanTags).toHaveLength(1);
      expect(humanTags[0].tagName).toBe('Manual Tag');
      expect(humanTags[0].source).toBe('manual');
    });

    it('should compute structuredAITags correctly', () => {
      const aiTags = wrapper.vm.structuredAITags;
      
      expect(aiTags).toHaveLength(3);
      
      // Check pending tag
      const pendingTag = aiTags.find(tag => tag.displayStatus === 'pending');
      expect(pendingTag.tagName).toBe('AI Pending');
      expect(pendingTag.status).toBe('pending');
      
      // Check approved AI tag
      const approvedTag = aiTags.find(tag => tag.displayStatus === 'approved');
      expect(approvedTag.tagName).toBe('AI Approved');
      expect(approvedTag.status).toBe('approved');
      
      // Check rejected tag
      const rejectedTag = aiTags.find(tag => tag.displayStatus === 'rejected');
      expect(rejectedTag.tagName).toBe('AI Rejected');
      expect(rejectedTag.status).toBe('rejected');
    });

    it('should compute hasAnyTags correctly', () => {
      expect(wrapper.vm.hasAnyTags).toBe(true);
    });

    it('should compute hasHighConfidencePendingTags correctly', () => {
      expect(wrapper.vm.hasHighConfidencePendingTags).toBe(true); // AI Pending has 85% confidence
    });

    it('should compute pendingAITagsCount correctly', () => {
      expect(wrapper.vm.pendingAITagsCount).toBe(1);
    });
  });

  describe('Rendering Modes', () => {
    it('should render TagSelector when not readonly', () => {
      wrapper = createWrapper({ readonly: false });
      
      const tagSelector = wrapper.find('.tag-selector-mock');
      expect(tagSelector.exists()).toBe(true);
    });

    it('should not render TagSelector when readonly', () => {
      wrapper = createWrapper({ readonly: true });
      
      const tagSelector = wrapper.find('.tag-selector-mock');
      expect(tagSelector.exists()).toBe(false);
    });

    it('should render tags in readonly mode when hasAnyTags is true', async () => {
      mockTagService.getTagsByStatus.mockResolvedValue({
        pending: [],
        approved: [
          { id: 'tag-1', tagName: 'Test Tag', source: 'manual', status: 'approved' }
        ],
        rejected: []
      });
      
      wrapper = createWrapper({ readonly: true });
      await nextTick();
      
      const readonlyTags = wrapper.find('.tags-readonly');
      expect(readonlyTags.exists()).toBe(true);
    });

    it('should render no-tags message in readonly mode when no tags', async () => {
      mockTagService.getTagsByStatus.mockResolvedValue({
        pending: [],
        approved: [],
        rejected: []
      });
      
      wrapper = createWrapper({ readonly: true });
      await nextTick();
      
      const noTags = wrapper.find('.no-tags');
      expect(noTags.exists()).toBe(true);
      expect(noTags.text()).toContain('No tags');
    });
  });

  describe('Tag Rendering', () => {
    beforeEach(async () => {
      const mockTagData = {
        pending: [
          { id: 'ai-1', tagName: 'AI Pending', source: 'ai', status: 'pending', confidence: 85 }
        ],
        approved: [
          { id: 'manual-1', tagName: 'Manual Tag', source: 'manual', status: 'approved' },
          { id: 'ai-approved', tagName: 'AI Approved', source: 'ai', status: 'approved', confidence: 90 }
        ],
        rejected: []
      };

      mockTagService.getTagsByStatus.mockResolvedValue(mockTagData);
      wrapper = createWrapper({ readonly: true });
      await nextTick();
    });

    it('should render human tags with correct styling', () => {
      const humanTagChips = wrapper.findAll('.human-tag');
      expect(humanTagChips).toHaveLength(1);
      expect(humanTagChips[0].text()).toContain('Manual Tag');
    });

    it('should render AI tags with AITagChip component', () => {
      const aiTagChips = wrapper.findAll('.ai-tag-chip-mock');
      expect(aiTagChips).toHaveLength(1); // Only approved AI tag shows in readonly
    });

    it('should render pending tags indicator when high confidence pending tags exist', () => {
      const pendingIndicator = wrapper.find('.pending-tags-indicator');
      expect(pendingIndicator.exists()).toBe(true);
      expect(pendingIndicator.text()).toContain('1 pending');
    });

    it('should apply confidence-based styling to AI tags', () => {
      const highConfidenceTag = wrapper.find('.high-confidence');
      expect(highConfidenceTag.exists()).toBe(true);
    });
  });

  describe('Context Menu Integration', () => {
    beforeEach(async () => {
      mockTagService.getTagsByStatus.mockResolvedValue({
        pending: [],
        approved: [
          { 
            id: 'tag-1', 
            tagName: 'Test Tag', 
            source: 'manual', 
            status: 'approved',
            metadata: { categoryId: 'doc-type', categoryName: 'Document Type', color: 'primary' }
          }
        ],
        rejected: []
      });
      
      wrapper = createWrapper({ readonly: true });
      await nextTick();
    });

    it('should handle tag context menu events', () => {
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        currentTarget: document.createElement('div')
      };

      const tag = {
        tagName: 'Test Tag',
        metadata: { categoryId: 'doc-type', categoryName: 'Document Type', color: 'primary' }
      };

      wrapper.vm.handleTagContextMenu(mockEvent, tag, 'human');

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(wrapper.vm.currentContextTag).toMatchObject({
        tagName: 'Test Tag',
        categoryId: 'doc-type',
        categoryName: 'Document Type',
        source: 'manual'
      });
    });

    it('should emit tag-context-menu event', () => {
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        currentTarget: document.createElement('div')
      };

      const tag = { tagName: 'Test Tag' };

      wrapper.vm.handleTagContextMenu(mockEvent, tag, 'human');

      expect(wrapper.emitted('tag-context-menu')).toHaveLength(1);
      expect(wrapper.emitted('tag-context-menu')[0][0]).toMatchObject({
        tagInfo: expect.objectContaining({ tagName: 'Test Tag' }),
        tagType: 'human',
        event: mockEvent,
        evidence: mockEvidence
      });
    });

    it('should render TagContextMenu when currentContextTag is set', async () => {
      wrapper.vm.currentContextTag = {
        tagName: 'Test Tag',
        categoryId: 'doc-type'
      };

      await nextTick();

      const contextMenu = wrapper.find('.tag-context-menu-mock');
      expect(contextMenu.exists()).toBe(true);
    });
  });

  describe('Event Handlers', () => {
    it('should handle tags-updated event from TagSelector', () => {
      wrapper = createWrapper({ readonly: false });
      
      const tagSelector = wrapper.findComponent({ name: 'TagSelector' });
      tagSelector.vm.$emit('tags-updated');

      expect(wrapper.emitted('tags-updated')).toHaveLength(1);
    });

    it('should handle migrate-legacy event from TagSelector', () => {
      wrapper = createWrapper({ readonly: false });
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      wrapper.vm.handleMigrateLegacy();

      expect(consoleSpy).toHaveBeenCalledWith('Legacy tag migration requested for:', 'evidence-1');
      expect(wrapper.emitted('migrate-legacy')).toHaveLength(1);
      
      consoleSpy.mockRestore();
    });

    it('should handle show-in-folders event', () => {
      wrapper = createWrapper();
      
      const data = { tagName: 'Test Tag', categoryId: 'doc-type' };
      wrapper.vm.handleShowInFolders(data);

      expect(wrapper.emitted('show-in-folders')).toHaveLength(1);
      expect(wrapper.emitted('show-in-folders')[0][0]).toMatchObject({
        ...data,
        evidence: mockEvidence
      });
    });

    it('should handle filter-by-tag event', () => {
      wrapper = createWrapper();
      
      const data = { tagName: 'Test Tag', filterQuery: 'tag:"Test Tag"' };
      wrapper.vm.handleFilterByTag(data);

      expect(wrapper.emitted('filter-by-tag')).toHaveLength(1);
      expect(wrapper.emitted('filter-by-tag')[0][0]).toMatchObject({
        ...data,
        evidence: mockEvidence
      });
    });

    it('should handle tag-action events', () => {
      wrapper = createWrapper();
      wrapper.vm.currentContextTag = { tagName: 'Test Tag' };
      
      const data = { action: 'edit', tagName: 'Test Tag' };
      wrapper.vm.handleTagAction('edit', data);

      expect(wrapper.emitted('tag-action')).toHaveLength(1);
      expect(wrapper.emitted('tag-action')[0][0]).toMatchObject({
        action: 'edit',
        data: data,
        evidence: mockEvidence,
        tagInfo: wrapper.vm.currentContextTag
      });
    });

    it('should handle tag error events', () => {
      wrapper = createWrapper();
      
      const error = new Error('Tag operation failed');
      wrapper.vm.handleTagError(error);

      expect(wrapper.emitted('tag-error')).toHaveLength(1);
      expect(wrapper.emitted('tag-error')[0][0]).toEqual(error);
    });
  });

  describe('AI Tag Actions', () => {
    beforeEach(() => {
      wrapper = createWrapper();
    });

    it('should handle AI tag approval', async () => {
      const loadTagsSpy = vi.spyOn(wrapper.vm, 'loadSubcollectionTags').mockResolvedValue();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const tagInfo = { id: 'ai-tag-1', tagName: 'AI Tag', source: 'ai' };
      await wrapper.vm.handleApproveAI(tagInfo);

      expect(consoleSpy).toHaveBeenCalledWith('Approving AI tag:', tagInfo);
      expect(wrapper.emitted('tag-action')).toHaveLength(1);
      expect(wrapper.emitted('tag-action')[0][0].action).toBe('approve-ai');
      expect(loadTagsSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      loadTagsSpy.mockRestore();
    });

    it('should handle AI tag rejection', async () => {
      const loadTagsSpy = vi.spyOn(wrapper.vm, 'loadSubcollectionTags').mockResolvedValue();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const tagInfo = { id: 'ai-tag-1', tagName: 'AI Tag', source: 'ai' };
      await wrapper.vm.handleRejectAI(tagInfo);

      expect(consoleSpy).toHaveBeenCalledWith('Rejecting AI tag:', tagInfo);
      expect(wrapper.emitted('tag-action')).toHaveLength(1);
      expect(wrapper.emitted('tag-action')[0][0].action).toBe('reject-ai');
      expect(loadTagsSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      loadTagsSpy.mockRestore();
    });

    it('should handle AI action errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(wrapper.vm, 'loadSubcollectionTags').mockRejectedValue(new Error('Load failed'));
      
      const tagInfo = { id: 'ai-tag-1', tagName: 'AI Tag', source: 'ai' };
      await wrapper.vm.handleApproveAI(tagInfo);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to approve AI tag:', expect.any(Error));
      expect(wrapper.emitted('tag-error')).toHaveLength(1);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Service Integration', () => {
    it('should call tagService with correct parameters', async () => {
      wrapper = createWrapper();
      await nextTick();

      expect(mockTagService.getTagsByStatus).toHaveBeenCalledWith('evidence-1', 'team-123');
    });

    it('should handle service returning null data gracefully', async () => {
      mockTagService.getTagsByStatus.mockResolvedValue({
        pending: null,
        approved: null,
        rejected: null
      });
      
      wrapper = createWrapper();
      await nextTick();

      expect(wrapper.vm.pendingTags).toEqual([]);
      expect(wrapper.vm.approvedTags).toEqual([]);
      expect(wrapper.vm.rejectedTags).toEqual([]);
    });

    it('should reload tags after handleTagsUpdated', async () => {
      wrapper = createWrapper({ readonly: false });
      
      mockTagService.getTagsByStatus.mockClear();
      
      wrapper.vm.handleTagsUpdated();
      await nextTick();

      expect(mockTagService.getTagsByStatus).toHaveBeenCalled();
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle missing tag metadata gracefully', async () => {
      mockTagService.getTagsByStatus.mockResolvedValue({
        pending: [],
        approved: [
          { id: 'tag-1', tagName: 'Tag Without Metadata', source: 'manual', status: 'approved' }
        ],
        rejected: []
      });
      
      wrapper = createWrapper({ readonly: true });
      await nextTick();

      const humanTags = wrapper.vm.structuredHumanTags;
      expect(humanTags).toHaveLength(1);
      expect(humanTags[0].tagName).toBe('Tag Without Metadata');
    });

    it('should handle malformed AI tag data', async () => {
      mockTagService.getTagsByStatus.mockResolvedValue({
        pending: [
          { /* missing required fields */ },
          null,
          { id: 'valid-tag', tagName: 'Valid Tag', source: 'ai', confidence: 80 }
        ],
        approved: [],
        rejected: []
      });
      
      wrapper = createWrapper();
      await nextTick();

      // Should handle malformed data gracefully and process valid entries
      const aiTags = wrapper.vm.structuredAITags;
      expect(aiTags.length).toBeGreaterThan(0);
    });

    it('should handle context menu for tags with missing metadata', () => {
      wrapper = createWrapper({ readonly: true });
      
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        currentTarget: document.createElement('div')
      };

      const tagWithoutMetadata = { tagName: 'Minimal Tag' };

      expect(() => {
        wrapper.vm.handleTagContextMenu(mockEvent, tagWithoutMetadata, 'human');
      }).not.toThrow();

      expect(wrapper.vm.currentContextTag).toMatchObject({
        tagName: 'Minimal Tag',
        categoryId: null,
        categoryName: 'Unknown'
      });
    });

    it('should handle empty evidence gracefully', () => {
      const emptyEvidence = { id: 'empty', fileName: 'empty.pdf' };
      
      expect(() => {
        wrapper = createWrapper({ evidence: emptyEvidence });
      }).not.toThrow();
    });

    it('should provide default confidence values for AI tags', () => {
      wrapper = createWrapper();
      wrapper.vm.approvedTags = [
        { id: 'ai-no-conf', tagName: 'AI No Confidence', source: 'ai', status: 'approved' }
      ];

      const aiTags = wrapper.vm.structuredAITags;
      const tagWithoutConf = aiTags.find(tag => tag.tagName === 'AI No Confidence');
      
      expect(tagWithoutConf.confidence).toBe(80); // Default value
    });
  });

  describe('Performance Considerations', () => {
    it('should not reload tags unnecessarily when other props change', async () => {
      wrapper = createWrapper();
      await nextTick();
      
      mockTagService.getTagsByStatus.mockClear();
      
      // Change non-evidence prop
      await wrapper.setProps({ readonly: true });
      
      expect(mockTagService.getTagsByStatus).not.toHaveBeenCalled();
    });

    it('should handle large numbers of tags efficiently', async () => {
      const largePendingTags = Array.from({ length: 100 }, (_, i) => ({
        id: `ai-${i}`,
        tagName: `AI Tag ${i}`,
        source: 'ai',
        status: 'pending',
        confidence: 70 + (i % 30)
      }));

      mockTagService.getTagsByStatus.mockResolvedValue({
        pending: largePendingTags,
        approved: [],
        rejected: []
      });
      
      wrapper = createWrapper();
      await nextTick();

      expect(wrapper.vm.pendingTags).toHaveLength(100);
      expect(wrapper.vm.structuredAITags).toHaveLength(100);
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      mockTagService.getTagsByStatus.mockResolvedValue({
        pending: [],
        approved: [
          { 
            id: 'tag-1', 
            tagName: 'Test Tag', 
            source: 'manual', 
            status: 'approved',
            metadata: { categoryId: 'doc-type', color: 'primary' }
          }
        ],
        rejected: []
      });
      
      wrapper = createWrapper({ readonly: true });
      await nextTick();
    });

    it('should have proper context menu triggers', () => {
      const humanTags = wrapper.findAll('.human-tag');
      
      humanTags.forEach(tag => {
        expect(tag.attributes('role')).toBeTruthy();
      });
    });

    it('should provide visual indicators for different tag types', () => {
      const humanTags = wrapper.findAll('.human-tag');
      expect(humanTags).toHaveLength(1);
      
      // Should have distinctive styling for human vs AI tags
      expect(humanTags[0].classes()).toContain('human-tag');
    });
  });

  describe('Component Cleanup', () => {
    it('should clean up properly on unmount', () => {
      wrapper = createWrapper();
      
      expect(() => {
        wrapper.unmount();
      }).not.toThrow();
    });

    it('should handle unmount during async operations', async () => {
      // Simulate slow service response
      mockTagService.getTagsByStatus.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ pending: [], approved: [], rejected: [] }), 100))
      );
      
      wrapper = createWrapper();
      
      // Unmount before async operation completes
      wrapper.unmount();
      
      // Should not cause errors
      await new Promise(resolve => setTimeout(resolve, 150));
    });
  });
});