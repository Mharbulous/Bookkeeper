<template>
  <div>
    <!-- This is a service component with no direct template -->
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useAuthStore } from '../../../core/stores/auth.js';
import tagSubcollectionService from '../services/tagSubcollectionService.js';

const props = defineProps({
  evidence: {
    type: Object,
    required: true
  }
});

const emit = defineEmits([
  'tags-loaded',
  'approve-ai-tag', 
  'reject-ai-tag', 
  'bulk-approve-ai-tags', 
  'bulk-reject-ai-tags'
]);

// Stores
const authStore = useAuthStore();

// Services
const tagService = tagSubcollectionService;

// Local state
const pendingTags = ref([]);
const approvedTags = ref([]);
const rejectedTags = ref([]);
const loadingTags = ref(false);
const unsubscribeTags = ref(null);

// Methods for AI tag operations
const approveAITag = async (tagId) => {
  try {
    const teamId = authStore.currentTeam;
    if (!teamId) {
      console.error('No team ID available for tag operations');
      return;
    }
    await tagService.approveTag(props.evidence.id, tagId, teamId);
    await loadSubcollectionTags(); // Reload to update state
    emit('approve-ai-tag', tagId);
  } catch (error) {
    console.error('Failed to approve AI tag:', error);
  }
};

const rejectAITag = async (tagId) => {
  try {
    const teamId = authStore.currentTeam;
    if (!teamId) {
      console.error('No team ID available for tag operations');
      return;
    }
    await tagService.rejectTag(props.evidence.id, tagId, teamId);
    await loadSubcollectionTags(); // Reload to update state
    emit('reject-ai-tag', tagId);
  } catch (error) {
    console.error('Failed to reject AI tag:', error);
  }
};

const bulkApproveAITags = async (tagIds) => {
  try {
    const teamId = authStore.currentTeam;
    if (!teamId) {
      console.error('No team ID available for tag operations');
      return;
    }
    await tagService.approveTagsBatch(props.evidence.id, tagIds, teamId);
    await loadSubcollectionTags(); // Reload to update state
    emit('bulk-approve-ai-tags', tagIds);
  } catch (error) {
    console.error('Failed to bulk approve AI tags:', error);
  }
};

const bulkRejectAITags = async (tagIds) => {
  try {
    const teamId = authStore.currentTeam;
    if (!teamId) {
      console.error('No team ID available for tag operations');
      return;
    }
    await tagService.rejectTagsBatch(props.evidence.id, tagIds, teamId);
    await loadSubcollectionTags(); // Reload to update state
    emit('bulk-reject-ai-tags', tagIds);
  } catch (error) {
    console.error('Failed to bulk reject AI tags:', error);
  }
};

/**
 * Load tags from subcollection grouped by status
 */
const loadSubcollectionTags = async () => {
  if (!props.evidence.id) return;
  
  try {
    loadingTags.value = true;
    
    // Load tags grouped by status
    const teamId = authStore.currentTeam;
    if (!teamId) {
      console.error('[TagManagementService] No team ID available');
      return;
    }
    
    const tagsByStatus = await tagService.getTagsByStatus(props.evidence.id, teamId);
    
    pendingTags.value = tagsByStatus.pending || [];
    approvedTags.value = tagsByStatus.approved || [];
    rejectedTags.value = tagsByStatus.rejected || [];
    
    loadingTags.value = false;
    
    // Emit loaded tags to parent
    emit('tags-loaded', {
      pending: pendingTags.value,
      approved: approvedTags.value,
      rejected: rejectedTags.value,
      loading: loadingTags.value
    });
    
  } catch (error) {
    console.error('Failed to load subcollection tags:', error);
    loadingTags.value = false;
    // Don't clear existing tags on error - keep the current state
    // This prevents the UI from temporarily showing no tags
  }
};

// Lifecycle hooks
onMounted(async () => {
  await loadSubcollectionTags();
});

onUnmounted(() => {
  if (unsubscribeTags.value) {
    unsubscribeTags.value();
    unsubscribeTags.value = null;
  }
});

// Watch for evidence changes to reload tags
watch(() => props.evidence.id, async () => {
  if (unsubscribeTags.value) {
    unsubscribeTags.value();
    unsubscribeTags.value = null;
  }
  await loadSubcollectionTags();
});

// Expose methods and state for parent component access
defineExpose({
  approveAITag,
  rejectAITag,
  bulkApproveAITags,
  bulkRejectAITags,
  loadSubcollectionTags,
  pendingTags,
  approvedTags,
  rejectedTags,
  loadingTags
});
</script>

<style scoped>
/* Service component - no visual styling needed */
</style>