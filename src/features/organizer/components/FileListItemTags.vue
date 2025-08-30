<template>
  <div class="tags-section">
    <TagSelector
      v-if="!readonly"
      :evidence="evidence"
      :loading="tagUpdateLoading"
      class="tag-selector"
      @tags-updated="handleTagsUpdate"
      @migrate-legacy="handleMigrateLegacy"
    />
    
    <!-- Readonly view with both human and AI tags -->
    <div v-else-if="hasAnyTags" class="tags-readonly">
      <!-- Human tags -->
      <v-chip
        v-for="tag in structuredHumanTags"
        :key="`human-${tag.categoryId}-${tag.tagName}`"
        size="small"
        variant="outlined"
        :color="tag.color || 'primary'"
        class="ma-1 human-tag"
      >
        {{ tag.tagName }}
      </v-chip>
      
      <!-- Legacy tags (for backward compatibility) -->
      <v-chip
        v-for="tag in legacyTags"
        :key="`legacy-${tag}`"
        size="small"
        variant="outlined"
        color="primary"
        class="ma-1 legacy-tag"
      >
        {{ tag }}
      </v-chip>
      
      <!-- AI tags with special styling -->
      <AITagChip
        v-for="tag in structuredAITags"
        :key="`ai-${tag.categoryId}-${tag.tagName}`"
        :tag="tag"
        class="ma-1"
      />
    </div>
    
    <div v-else-if="readonly" class="no-tags">
      <small class="text-medium-emphasis">No tags</small>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import TagSelector from './TagSelector.vue';
import AITagChip from './AITagChip.vue';

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
  'tags-update',
  'migrate-legacy',
  'tag-error',
]);

// Computed properties
const structuredHumanTags = computed(() => {
  return props.evidence?.tagsByHuman || [];
});

const structuredAITags = computed(() => {
  return props.evidence?.tagsByAI || [];
});

const legacyTags = computed(() => {
  // Support legacy tags for backward compatibility
  return props.evidence?.tags || props.evidence?.legacyTags || [];
});

const hasAnyTags = computed(() => {
  return structuredHumanTags.value.length > 0 || 
         structuredAITags.value.length > 0 || 
         legacyTags.value.length > 0;
});

// Event handlers
const handleTagsUpdate = () => {
  // TagSelector handles the update internally, just emit for refresh
  emit('tags-update', props.evidence.id, []);
};

const handleMigrateLegacy = () => {
  // TODO: Implement migration dialog
  console.log('Legacy tag migration requested for:', props.evidence.id);
  emit('migrate-legacy', props.evidence.id);
};

const handleTagError = (error) => {
  emit('tag-error', error);
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
</style>