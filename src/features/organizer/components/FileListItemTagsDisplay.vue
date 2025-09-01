<template>
  <div v-if="hasAnyTags" class="tags-readonly">
    <!-- Pending AI tags notification (if any high confidence tags) -->
    <div v-if="hasHighConfidencePendingTags" class="pending-tags-indicator">
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
        :show-status-actions="false"
        class="ma-1 ai-tag-item"
        :class="{
          'high-confidence': tag.confidence >= 85,
          'medium-confidence': tag.confidence >= 70 && tag.confidence < 85,
          'low-confidence': tag.confidence < 70
        }"
      />
    </div>
  </div>
  
  <div v-else class="no-tags">
    <small class="text-medium-emphasis">No tags</small>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeMount } from 'vue';
import AITagChip from './AITagChip.vue';

// Debug logging helper
const debugLog = (message, data = null) => {
  const timestamp = new Date().toISOString().substring(11, 23);
  console.log(`[${timestamp}] [FileListItemTagsDisplay] ${message}`, data || '');
};

// Performance tracking
const renderStart = performance.now();
let setupComplete = null;
let beforeMountTime = null;

// Props
const props = defineProps({
  structuredHumanTags: {
    type: Array,
    required: true,
  },
  structuredAITags: {
    type: Array,
    required: true,
  },
  pendingTags: {
    type: Array,
    required: true,
  },
});

// Emits
const emit = defineEmits([
  'tag-context-menu',
]);

// Computed properties for display logic
const pendingAITagsCount = computed(() => props.pendingTags.length);

const hasAnyTags = computed(() => {
  return props.structuredHumanTags.length > 0 || 
         props.structuredAITags.length > 0;
});

const hasHighConfidencePendingTags = computed(() => {
  return props.pendingTags.some(tag => tag.confidence >= 85);
});

// Event handlers
const handleTagContextMenu = (event, tag, tagType) => {
  event.preventDefault();
  event.stopPropagation();
  
  emit('tag-context-menu', {
    event,
    tag,
    tagType
  });
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