<template>
  <div class="tags-section">
    <TagSelector
      v-if="!readonly"
      :evidence="evidence"
      :loading="tagUpdateLoading"
      class="tag-selector"
      @tags-updated="handleTagsUpdated"
      @migrate-legacy="handleMigrateLegacy"
    />
    
    <!-- Readonly view with confidence-based visual indicators -->
    <div v-else-if="hasAnyTags" class="tags-readonly">
      <!-- Pending AI tags notification (if any high confidence tags) -->
      <div v-if="hasHighConfidencePendingTags && readonly" class="pending-tags-indicator">
        <v-chip
          size="small"
          color="orange-lighten-1"
          variant="tonal"
          class="ma-1"
        >
          <v-icon size="14" class="mr-1">mdi-clock-fast</v-icon>
          {{ pendingAITagsCount }} pending
        </v-chip>
      </div>
      
      <!-- Manual/Human tags -->
      <v-chip
        v-for="tag in structuredHumanTags"
        :key="`human-${tag.metadata?.categoryId || 'manual'}-${tag.tagName}`"
        size="small"
        variant="outlined"
        :color="tag.metadata?.color || 'primary'"
        class="ma-1 human-tag"
        @contextmenu.prevent="handleTagContextMenu($event, tag, 'human')"
      >
        {{ tag.tagName }}
      </v-chip>
      
      
      <!-- AI tags with confidence-based styling -->
      <div
        v-for="tag in structuredAITags"
        :key="`ai-${tag.id || tag.tagName}-${tag.confidence}`"
        class="ai-tag-wrapper"
        @contextmenu.prevent="handleTagContextMenu($event, tag, 'ai')"
      >
        <AITagChip
          :tag="tag"
          :show-status-actions="!readonly"
          class="ma-1 ai-tag-item"
          :class="{
            'high-confidence': tag.confidence >= 85,
            'medium-confidence': tag.confidence >= 70 && tag.confidence < 85,
            'low-confidence': tag.confidence < 70
          }"
        />
      </div>
    </div>
    
    <div v-else-if="readonly" class="no-tags">
      <small class="text-medium-emphasis">No tags</small>
    </div>
    
    <!-- Context Menu -->
    <TagContextMenu
      v-if="currentContextTag"
      ref="contextMenuRef"
      :tag-info="currentContextTag"
      :evidence="evidence"
      :is-editable="!readonly"
      @show-in-folders="handleShowInFolders"
      @filter-by-tag="handleFilterByTag"
      @search-similar="(data) => handleTagAction('search-similar', data)"
      @edit-tag="(data) => handleTagAction('edit-tag', data)"
      @copy-tag="(data) => handleTagAction('copy-tag', data)"
      @show-statistics="(data) => handleTagAction('show-statistics', data)"
      @approve-ai="handleApproveAI"
      @reject-ai="handleRejectAI"
      @remove-from-hierarchy="(data) => handleTagAction('remove-from-hierarchy', data)"
      @menu-closed="currentContextTag = null"
    />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useAuthStore } from '../../../core/stores/auth.js';
import TagSelector from './TagSelector.vue';
import AITagChip from './AITagChip.vue';
import TagContextMenu from './TagContextMenu.vue';
import tagSubcollectionService from '../services/tagSubcollectionService.js';

// Props
const props = defineProps({
  // Evidence/file data
  evidence: {
    type: Object,
    required: true,
  },
  
  // Display options
  readonly: {
    type: Boolean,
    default: false,
  },
  
  // Loading states
  tagUpdateLoading: {
    type: Boolean,
    default: false,
  },
  
  // Customization
  tagInputPlaceholder: {
    type: String,
    default: 'Add tags...',
  },
});

// Emits
const emit = defineEmits([
  'tags-updated',
  'migrate-legacy', 
  'tag-error',
  'tag-context-menu',
  'show-in-folders',
  'filter-by-tag',
  'tag-action'
]);

// Services and local state  
const authStore = useAuthStore();
const tagService = tagSubcollectionService;
const pendingTags = ref([]);
const approvedTags = ref([]);
const rejectedTags = ref([]);
const loadingTags = ref(false);
const contextMenuRef = ref(null);
const currentContextTag = ref(null);

// Computed properties
const structuredHumanTags = computed(() => {
  // Get manually added tags (source: 'manual') and approved AI tags that should show as approved
  const manualTags = approvedTags.value.filter(tag => tag.source === 'manual');
  
  // Legacy embedded arrays no longer supported
  
  return manualTags;
});

const structuredAITags = computed(() => {
  // Get all AI tags (pending, approved, rejected) with proper status mapping
  const allAITags = [
    ...pendingTags.value.map(tag => ({ ...tag, displayStatus: 'pending' })),
    ...approvedTags.value.filter(tag => tag.source === 'ai').map(tag => ({ ...tag, displayStatus: 'approved' })),
    ...rejectedTags.value.map(tag => ({ ...tag, displayStatus: 'rejected' }))
  ];
  
  // Legacy embedded arrays no longer supported
  
  // Map to format expected by AITagChip component
  return allAITags.map(tag => ({
    ...tag,
    status: tag.displayStatus || tag.status,
    confidence: tag.confidence || 80,
    reasoning: tag.metadata?.context || tag.reasoning || 'AI suggested',
    suggestedAt: tag.createdAt,
    categoryName: tag.metadata?.categoryName || 'Unknown Category'
  }));
});

// Legacy tags no longer supported

// Additional computed properties for confidence-based visual indicators
const pendingAITagsCount = computed(() => pendingTags.value.length);

const highConfidenceAITags = computed(() => {
  return structuredAITags.value.filter(tag => tag.confidence >= 85);
});

const lowConfidenceAITags = computed(() => {
  return structuredAITags.value.filter(tag => tag.confidence < 70);
});

const hasAnyTags = computed(() => {
  return structuredHumanTags.value.length > 0 || 
         structuredAITags.value.length > 0 || 
         false; // Legacy tags no longer supported
});

const hasHighConfidencePendingTags = computed(() => {
  return pendingTags.value.some(tag => tag.confidence >= 85);
});

// Event handlers
const handleTagsUpdated = () => {
  // TagSelector handles the update internally, just emit for refresh
  emit('tags-updated');
  // Reload subcollection tags after update
  loadSubcollectionTags();
};

const handleMigrateLegacy = () => {
  // TODO: Implement migration dialog
  console.log('Legacy tag migration requested for:', props.evidence.id);
  emit('migrate-legacy', props.evidence.id);
};

const handleTagError = (error) => {
  emit('tag-error', error);
};

// Context menu handlers
const handleTagContextMenu = (event, tag, tagType) => {
  event.preventDefault();
  event.stopPropagation();
  
  // Prepare tag info for context menu
  const tagInfo = {
    tagName: tag.tagName,
    categoryId: tag.metadata?.categoryId || null,
    categoryName: tag.metadata?.categoryName || tag.categoryName || 'Unknown',
    color: tag.metadata?.color || 'primary',
    source: tagType === 'ai' ? 'ai' : 'manual',
    status: tag.status || tag.displayStatus,
    confidence: tag.confidence,
    reasoning: tag.reasoning,
    id: tag.id
  };
  
  currentContextTag.value = tagInfo;
  
  // Open context menu
  if (contextMenuRef.value) {
    contextMenuRef.value.openMenu(event, event.currentTarget);
  }
  
  emit('tag-context-menu', {
    tagInfo,
    tagType,
    event,
    evidence: props.evidence
  });
};

const handleShowInFolders = (data) => {
  emit('show-in-folders', {
    ...data,
    evidence: props.evidence
  });
};

const handleFilterByTag = (data) => {
  emit('filter-by-tag', {
    ...data,
    evidence: props.evidence
  });
};

const handleTagAction = (action, data) => {
  emit('tag-action', {
    action,
    data,
    evidence: props.evidence,
    tagInfo: currentContextTag.value
  });
};

// AI tag action handlers
const handleApproveAI = async (tagInfo) => {
  try {
    // TODO: Implement AI tag approval logic
    console.log('Approving AI tag:', tagInfo);
    handleTagAction('approve-ai', tagInfo);
    // Reload tags after action
    await loadSubcollectionTags();
  } catch (error) {
    console.error('Failed to approve AI tag:', error);
    handleTagError(error);
  }
};

const handleRejectAI = async (tagInfo) => {
  try {
    // TODO: Implement AI tag rejection logic
    console.log('Rejecting AI tag:', tagInfo);
    handleTagAction('reject-ai', tagInfo);
    // Reload tags after action
    await loadSubcollectionTags();
  } catch (error) {
    console.error('Failed to reject AI tag:', error);
    handleTagError(error);
  }
};

// Lifecycle hooks
onMounted(async () => {
  await loadSubcollectionTags();
});

onUnmounted(() => {
  // Cleanup handled by TagSelector component
});

// Watch for evidence changes to reload tags
watch(() => props.evidence.id, async () => {
  await loadSubcollectionTags();
});

/**
 * Load tags from subcollection grouped by status for confidence-based display
 */
const loadSubcollectionTags = async () => {
  if (!props.evidence.id) return;
  
  try {
    loadingTags.value = true;
    
    // Load tags grouped by status for better performance and organization
    const teamId = authStore.currentTeam;
    if (!teamId) {
      console.error('[FileListItemTags] No team ID available');
      return;
    }
    
    const tagsByStatus = await tagService.getTagsByStatus(props.evidence.id, teamId);
    
    pendingTags.value = tagsByStatus.pending || [];
    approvedTags.value = tagsByStatus.approved || [];
    rejectedTags.value = tagsByStatus.rejected || [];
    
    loadingTags.value = false;
    
  } catch (error) {
    console.error('Failed to load subcollection tags:', error);
    loadingTags.value = false;
    // Fallback to empty arrays in case of error
    pendingTags.value = [];
    approvedTags.value = [];
    rejectedTags.value = [];
  }
};
</script>

<style scoped>
.tags-section {
  flex: 2;
  min-width: 200px;
}

.tags-readonly {
  min-height: 32px;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 4px;
}

.no-tags {
  min-height: 32px;
  display: flex;
  align-items: center;
}

/* Responsive design */
@media (max-width: 768px) {
  .tags-section {
    min-width: 0;
  }
}

/* Compact mode */
.file-list-item.compact .tags-section {
  min-width: 150px;
}

/* Confidence-based visual indicators */
.pending-tags-indicator {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.ai-tag-item.high-confidence {
  border: 2px solid rgba(76, 175, 80, 0.3);
  box-shadow: 0 1px 3px rgba(76, 175, 80, 0.2);
}

.ai-tag-item.medium-confidence {
  border: 2px solid rgba(255, 152, 0, 0.3);
  box-shadow: 0 1px 3px rgba(255, 152, 0, 0.1);
}

.ai-tag-item.low-confidence {
  border: 2px solid rgba(244, 67, 54, 0.3);
  opacity: 0.8;
}

.ai-tag-item:hover {
  transform: translateY(-1px);
  transition: all 0.2s ease-in-out;
}

/* Visual feedback for different tag sources */
.human-tag {
  border-color: rgba(63, 81, 181, 0.5);
  background-color: rgba(63, 81, 181, 0.05);
}

.legacy-tag {
  border-style: dashed;
  opacity: 0.7;
}

/* AI tag wrapper for context menu */
.ai-tag-wrapper {
  display: inline-block;
  cursor: context-menu;
}

.ai-tag-wrapper:hover {
  /* Slight elevation on hover to indicate interactivity */
  filter: brightness(1.05);
}
</style>