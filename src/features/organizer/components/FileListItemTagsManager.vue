<template>
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
</template>

<script setup>
import { ref, watch, onMounted, onBeforeMount } from 'vue';
import { useAuthStore } from '../../../core/stores/auth.js';
import TagContextMenu from './TagContextMenu.vue';
import tagSubcollectionService from '../services/tagSubcollectionService.js';

// Debug logging helper
const debugLog = (message, data = null) => {
  const timestamp = new Date().toISOString().substring(11, 23);
  console.log(`[${timestamp}] [FileListItemTagsManager] ${message}`, data || '');
};

// Performance tracking
const renderStart = performance.now();
let setupComplete = null;
let beforeMountTime = null;

// Props
const props = defineProps({
  evidence: {
    type: Object,
    required: true,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits([
  'tags-data-loaded',
  'tag-error',
  'show-in-folders',
  'filter-by-tag',
  'tag-action',
  'tag-context-menu'
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

// Context menu handlers
const handleTagContextMenu = (data) => {
  const { event, tag, tagType } = data;
  
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
    handleTagAction('approve-ai', tagInfo);
    await loadSubcollectionTags();
  } catch (error) {
    console.error('Failed to approve AI tag:', error);
    emit('tag-error', error);
  }
};

const handleRejectAI = async (tagInfo) => {
  try {
    handleTagAction('reject-ai', tagInfo);
    await loadSubcollectionTags();
  } catch (error) {
    console.error('Failed to reject AI tag:', error);
    emit('tag-error', error);
  }
};

// Lifecycle hooks
onMounted(async () => {
  await loadSubcollectionTags();
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
      console.error('[FileListItemTagsManager] No team ID available');
      return;
    }
    
    const tagsByStatus = await tagService.getTagsByStatus(props.evidence.id, teamId);
    
    pendingTags.value = tagsByStatus.pending || [];
    approvedTags.value = tagsByStatus.approved || [];
    rejectedTags.value = tagsByStatus.rejected || [];
    
    loadingTags.value = false;
    
    // Emit loaded data to parent
    emit('tags-data-loaded', {
      pendingTags: pendingTags.value,
      approvedTags: approvedTags.value,
      rejectedTags: rejectedTags.value
    });
    
  } catch (error) {
    console.error('Failed to load subcollection tags:', error);
    loadingTags.value = false;
    // Fallback to empty arrays in case of error
    pendingTags.value = [];
    approvedTags.value = [];
    rejectedTags.value = [];
    emit('tag-error', error);
  }
};

// Expose the context menu handler for parent component
defineExpose({
  handleTagContextMenu
});

// Performance tracking - mark setup completion
setupComplete = performance.now();

// Lifecycle performance tracking (disabled - optimization complete)
onBeforeMount(() => {
  beforeMountTime = performance.now();
});

onMounted(() => {
  // Performance tracking disabled - optimization complete
});
</script>

<style scoped>
/* Manager component has no visual styling - purely functional */
</style>