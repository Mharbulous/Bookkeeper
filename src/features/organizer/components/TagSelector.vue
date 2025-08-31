<template>
  <div class="tag-selector">
    <!-- Display existing structured tags as colored chips -->
    <TagDisplaySection
      :structured-tags="structuredTags"
      :disabled="disabled"
      :loading="loading"
      @remove-tag="removeStructuredTag"
    />


    <!-- Category-based tag assignment -->
    <CategoryTagSelector
      ref="categoryTagSelector"
      :categories="categories"
      :disabled="disabled"
      :loading="loading"
      @add-tag="addSelectedTag"
      @category-change="onCategoryChange"
      @tag-change="onTagChange"
    />

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useOrganizerStore } from '../stores/organizer.js';
import { useAuthStore } from '../../../core/stores/auth.js';
import tagSubcollectionService from '../services/tagSubcollectionService.js';
import TagDisplaySection from './TagDisplaySection.vue';
import CategoryTagSelector from './CategoryTagSelector.vue';

const props = defineProps({
  evidence: {
    type: Object,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'tags-updated', 
  'migrate-legacy', 
  'approve-ai-tag', 
  'reject-ai-tag', 
  'bulk-approve-ai-tags', 
  'bulk-reject-ai-tags'
]);

// Stores
const organizerStore = useOrganizerStore();
const authStore = useAuthStore();
const { categories } = storeToRefs(organizerStore);

// Services
const tagService = tagSubcollectionService;

// Local state
const hideMigrationPrompt = ref(false);
const pendingTags = ref([]);
const approvedTags = ref([]);
const rejectedTags = ref([]);
const loadingTags = ref(false);
const unsubscribeTags = ref(null);
const categoryTagSelector = ref(null);

// Computed properties
const structuredTags = computed(() => {
  // Combine approved tags (including auto-approved AI tags) with manually added tags
  const allApprovedTags = approvedTags.value;
  
  // If no subcollection tags, fallback to embedded arrays for backward compatibility
  if (allApprovedTags.length === 0 && pendingTags.value.length === 0) {
    return [
      ...(props.evidence.tagsByHuman || []),
      ...(props.evidence.tagsByAI || [])
    ];
  }
  
  return allApprovedTags;
});

// Computed property for AI pending tags (awaiting review)
const aiPendingTags = computed(() => pendingTags.value);

// Computed property for all AI tags (pending + approved + rejected)
const allAITags = computed(() => {
  return [...pendingTags.value, ...approvedTags.value.filter(tag => tag.source === 'ai'), ...rejectedTags.value];
});

// Legacy tags no longer supported - using subcollection tags only

// Methods
const onCategoryChange = (categoryId) => {
  // Category change is now handled by child component
  console.log('Category changed:', categoryId);
};

const onTagChange = (tagId) => {
  // Tag change is now handled by child component
  console.log('Tag changed:', tagId);
};

const addSelectedTag = async (selection) => {
  if (!selection || !selection.category || !selection.tag) return;
  
  const { category: selectedCategory, tag: selectedTag } = selection;
  
  // Check if tag already exists (exact same tag)
  const tagExists = structuredTags.value.some(tag => 
    tag.metadata?.categoryId === selectedCategory.id && tag.tagName === selectedTag.name
  );
  
  if (tagExists) {
    console.warn('Tag already exists:', selectedTag.name);
    return;
  }
  
  try {
    // Remove existing tags from same category (mutual exclusivity) first
    const existingTagsInCategory = structuredTags.value.filter(tag => 
      tag.metadata?.categoryId === selectedCategory.id
    );
    
    for (const existingTag of existingTagsInCategory) {
      if (existingTag.id) {
        const teamId = authStore.currentTeam;
      if (teamId) {
        await tagService.deleteTag(props.evidence.id, existingTag.id, teamId);
      }
      }
    }
    
    // Create new structured tag data (using NEW data structure from migration plan)
    const newTagData = {
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      tagName: selectedTag.name,
      color: selectedTag.color,
      source: 'human',
      confidence: 1.0, // Human tags have 100% confidence (1.0 scale)
      autoApproved: null, // Not applicable for human tags
      reviewRequired: false, // Human tags don't need review
      createdBy: authStore.user?.uid || 'unknown-user',
      metadata: {
        userNote: 'Manual tag selection',
        manuallyApplied: true,
        selectedFromOptions: [selectedTag.name] // Could be expanded to show other options
      }
    };
    
    // Add tag using subcollection service (auto-approved since it's manual)
    const teamId = authStore.currentTeam;
    if (!teamId) {
      console.error('No team ID available for tag operations');
      return;
    }
    await tagService.addTag(props.evidence.id, newTagData, teamId);
    
    // Reload tags to update UI immediately
    await loadSubcollectionTags();
    
    emit('tags-updated');
    
    // Reset selections in child component
    if (categoryTagSelector.value) {
      categoryTagSelector.value.clearSelections();
    }
    
  } catch (error) {
    console.error('Failed to add structured tag:', error);
  }
};

const removeStructuredTag = async (tagToRemove) => {
  try {
    // Use subcollection service to remove tag
    if (tagToRemove.id) {
      // Tag has subcollection ID - use subcollection service
      const teamId = authStore.currentTeam;
      if (!teamId) {
        console.error('No team ID available for tag operations');
        return;
      }
      await tagService.deleteTag(props.evidence.id, tagToRemove.id, teamId);
    } else {
      // Fallback to embedded array method for backward compatibility
      const freshEvidence = organizerStore.stores.core.getEvidenceById(props.evidence.id);
      if (!freshEvidence) {
        throw new Error('Evidence not found in store');
      }
      
      const updatedTagsByHuman = (freshEvidence.tagsByHuman || [])
        .filter(tag => !(tag.categoryId === tagToRemove.categoryId && tag.tagId === tagToRemove.tagId));
      
      await organizerStore.updateEvidenceStructuredTags(
        props.evidence.id,
        updatedTagsByHuman,
        freshEvidence.tagsByAI || []
      );
    }
    
    // Small delay to ensure Firestore operation is committed before reloading
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Reload tags to update UI immediately
    await loadSubcollectionTags();
    
    emit('tags-updated');
    
  } catch (error) {
    console.error('Failed to remove structured tag:', error);
  }
};

// New methods for handling AI tag approvals
const approveAITag = async (tagId) => {
  try {
    const teamId = authStore.currentTeam;
    if (!teamId) {
      console.error('No team ID available for tag operations');
      return;
    }
    await tagService.approveTag(props.evidence.id, tagId, teamId);
    await loadSubcollectionTags(); // Reload to update state
    emit('tags-updated');
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
    emit('tags-updated');
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
    emit('tags-updated');
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
    emit('tags-updated');
    emit('bulk-reject-ai-tags', tagIds);
  } catch (error) {
    console.error('Failed to bulk reject AI tags:', error);
  }
};

// Legacy tag removal no longer supported
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
      console.error('[TagSelector] No team ID available');
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
    // Don't clear existing tags on error - keep the current state
    // This prevents the UI from temporarily showing no tags
  }
};

// Expose methods for parent component access
defineExpose({
  approveAITag,
  rejectAITag,
  bulkApproveAITags,
  bulkRejectAITags,
  aiPendingTags,
  allAITags,
  loadSubcollectionTags
});

</script>

<style scoped>
.tag-selector {
  max-width: 100%;
}
</style>