<template>
  <div class="tag-selector">
    <TagSelector
      :evidence="evidence"
      :loading="loading"
      class="tag-selector"
      @tags-updated="handleTagsUpdated"
      @migrate-legacy="handleMigrateLegacy"
    />
  </div>
</template>

<script setup>
import TagSelector from './TagSelector.vue';

// Props
const props = defineProps({
  // Evidence/file data
  evidence: {
    type: Object,
    required: true,
  },
  
  // Loading states
  loading: {
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
]);

// Event handlers
const handleTagsUpdated = () => {
  // TagSelector handles the update internally, just emit for refresh
  emit('tags-updated');
};

const handleMigrateLegacy = () => {
  emit('migrate-legacy', props.evidence.id);
};

const handleTagError = (error) => {
  emit('tag-error', error);
};
</script>

<style scoped>
.tag-selector {
  /* Container styling for the tag selector */
}

/* Responsive design */
@media (max-width: 768px) {
  .tag-selector {
    min-width: 0;
  }
}

/* Compact mode */
.file-list-item.compact .tag-selector {
  min-width: 150px;
}
</style>