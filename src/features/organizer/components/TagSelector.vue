<template>
  <div class="tag-selector">
    <!-- Tag Management Service (handles data loading and AI operations) -->
    <TagManagementService
      ref="tagManagementService"
      :evidence="evidence"
      @tags-loaded="handleTagsLoaded"
      @approve-ai-tag="(tagId) => emit('approve-ai-tag', tagId)"
      @reject-ai-tag="(tagId) => emit('reject-ai-tag', tagId)"
      @bulk-approve-ai-tags="(tagIds) => emit('bulk-approve-ai-tags', tagIds)"
      @bulk-reject-ai-tags="(tagIds) => emit('bulk-reject-ai-tags', tagIds)"
    />

    <!-- Tag Operations Handler (handles CRUD operations) -->
    <TagOperationsHandler
      ref="tagOperationsHandler"
      :evidence="evidence"
      :approved-tags="approvedTags"
      @tags-updated="emit('tags-updated')"
      @reload-tags="reloadTags"
    />

    <!-- Display existing structured tags as colored chips -->
    <TagDisplaySection
      :structured-tags="structuredTags"
      :disabled="disabled"
      :loading="loading || loadingTags"
    />

    <!-- Category-based tag assignment (only if manual editing is allowed) -->
    <CategoryTagSelector
      v-if="allowManualEditing"
      ref="categoryTagSelector"
      :categories="categories"
      :disabled="disabled"
      :loading="loading || loadingTags"
      @add-tag="addSelectedTag"
      @category-change="onCategoryChange"
      @tag-change="onTagChange"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useOrganizerStore } from '../stores/organizer.js';
import TagDisplaySection from './TagDisplaySection.vue';
import CategoryTagSelector from './CategoryTagSelector.vue';
import TagManagementService from './TagManagementService.vue';
import TagOperationsHandler from './TagOperationsHandler.vue';

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
  },
  allowManualEditing: {
    type: Boolean,
    default: true
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
const { categories } = storeToRefs(organizerStore);

// Component refs
const tagManagementService = ref(null);
const tagOperationsHandler = ref(null);
const categoryTagSelector = ref(null);

// Local state from child components
const pendingTags = ref([]);
const approvedTags = ref([]);
const rejectedTags = ref([]);
const loadingTags = ref(false);

// Computed properties
const structuredTags = computed(() => {
  return tagOperationsHandler.value?.structuredTags || approvedTags.value;
});

// Computed property for AI pending tags (awaiting review)
const aiPendingTags = computed(() => pendingTags.value);

// Computed property for all AI tags (pending + approved + rejected)
const allAITags = computed(() => {
  return [...pendingTags.value, ...approvedTags.value.filter(tag => tag.source === 'ai'), ...rejectedTags.value];
});

// Methods - delegate to child components
const onCategoryChange = (categoryId) => {
  tagOperationsHandler.value?.onCategoryChange(categoryId);
};

const onTagChange = (tagId) => {
  tagOperationsHandler.value?.onTagChange(tagId);
};

const addSelectedTag = async (selection) => {
  if (!props.allowManualEditing) return;
  await tagOperationsHandler.value?.addSelectedTag(selection);
  // Reset selections in child component
  if (categoryTagSelector.value) {
    categoryTagSelector.value.clearSelections();
  }
};

// Handle tags loaded from management service
const handleTagsLoaded = (tagsData) => {
  pendingTags.value = tagsData.pending;
  approvedTags.value = tagsData.approved;
  rejectedTags.value = tagsData.rejected;
  loadingTags.value = tagsData.loading;
};

// Reload tags from management service
const reloadTags = async () => {
  await tagManagementService.value?.loadSubcollectionTags();
};

// AI tag operations - delegate to management service
const approveAITag = async (tagId) => {
  await tagManagementService.value?.approveAITag(tagId);
  emit('tags-updated');
};

const rejectAITag = async (tagId) => {
  await tagManagementService.value?.rejectAITag(tagId);
  emit('tags-updated');
};

const bulkApproveAITags = async (tagIds) => {
  await tagManagementService.value?.bulkApproveAITags(tagIds);
  emit('tags-updated');
};

const bulkRejectAITags = async (tagIds) => {
  await tagManagementService.value?.bulkRejectAITags(tagIds);
  emit('tags-updated');
};

// Lifecycle and data management is handled by TagManagementService

// Expose methods for parent component access
defineExpose({
  approveAITag,
  rejectAITag,
  bulkApproveAITags,
  bulkRejectAITags,
  aiPendingTags,
  allAITags,
  loadSubcollectionTags: reloadTags
});

</script>

<style scoped>
.tag-selector {
  max-width: 100%;
}
</style>