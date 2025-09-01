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
import { onMounted, onBeforeMount } from 'vue';
import TagSelector from './TagSelector.vue';

// Debug logging helper
const debugLog = (message, data = null) => {
  const timestamp = new Date().toISOString().substring(11, 23);
  console.log(`[${timestamp}] [FileListItemTagsEditor] ${message}`, data || '');
};

// Performance tracking
const renderStart = performance.now();
let setupComplete = null;
let beforeMountTime = null;

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