<template>
  <div class="tags-section">
    <!-- Tag Editor (when not readonly) -->
    <FileListItemTagsEditor
      v-if="!readonly"
      :evidence="evidence"
      :loading="tagUpdateLoading"
      :tag-input-placeholder="tagInputPlaceholder"
      @tags-updated="handleTagsUpdated"
      @migrate-legacy="handleMigrateLegacy"
      @tag-error="handleTagError"
    />
    
    <!-- Tag Display (readonly mode) -->
    <FileListItemTagsDisplay
      v-else
      :structured-human-tags="structuredHumanTags"
      :structured-ai-tags="structuredAITags"
      :pending-tags="pendingTags"
      @tag-context-menu="handleTagContextMenu"
    />
    
    <!-- Tag Management (handles context menu and data loading) -->
    <FileListItemTagsManager
      ref="tagsManagerRef"
      :evidence="evidence"
      :readonly="readonly"
      @tags-data-loaded="handleTagsDataLoaded"
      @tag-error="handleTagError"
      @show-in-folders="handleShowInFolders"
      @filter-by-tag="handleFilterByTag"
      @tag-action="handleTagAction"
      @tag-context-menu="$emit('tag-context-menu', $event)"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import FileListItemTagsDisplay from './FileListItemTagsDisplay.vue';
import FileListItemTagsEditor from './FileListItemTagsEditor.vue';
import FileListItemTagsManager from './FileListItemTagsManager.vue';

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

// Refs
const tagsManagerRef = ref(null);

// Data loaded from manager
const pendingTags = ref([]);
const approvedTags = ref([]);
const rejectedTags = ref([]);

// Computed properties for structured tags
const structuredHumanTags = computed(() => {
  // Get manually added tags (source: 'manual') and approved AI tags that should show as approved
  return approvedTags.value.filter(tag => tag.source === 'manual');
});

const structuredAITags = computed(() => {
  // Get all AI tags (pending, approved, rejected) with proper status mapping
  const allAITags = [
    ...pendingTags.value.map(tag => ({ ...tag, displayStatus: 'pending' })),
    ...approvedTags.value.filter(tag => tag.source === 'ai').map(tag => ({ ...tag, displayStatus: 'approved' })),
    ...rejectedTags.value.map(tag => ({ ...tag, displayStatus: 'rejected' }))
  ];
  
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

// Event handlers
const handleTagsUpdated = () => {
  emit('tags-updated');
};

const handleMigrateLegacy = (evidenceId) => {
  emit('migrate-legacy', evidenceId);
};

const handleTagError = (error) => {
  emit('tag-error', error);
};

const handleTagsDataLoaded = (data) => {
  pendingTags.value = data.pendingTags;
  approvedTags.value = data.approvedTags;
  rejectedTags.value = data.rejectedTags;
};

const handleTagContextMenu = (data) => {
  // Forward context menu handling to the manager
  if (tagsManagerRef.value) {
    tagsManagerRef.value.handleTagContextMenu(data);
  }
};

const handleShowInFolders = (data) => {
  emit('show-in-folders', data);
};

const handleFilterByTag = (data) => {
  emit('filter-by-tag', data);
};

const handleTagAction = (data) => {
  emit('tag-action', data);
};
</script>

<style scoped>
.tags-section {
  flex: 2;
  min-width: 200px;
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
</style>