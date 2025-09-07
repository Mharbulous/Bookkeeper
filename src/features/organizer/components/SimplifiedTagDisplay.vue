<template>
  <div v-if="hasAnyTags" class="tags-readonly">
    <!-- Pending AI tags notification (if any high confidence tags) -->
    <div v-if="hasHighConfidencePendingTags" class="pending-tags-indicator">
      <div class="smart-tag pending-indicator" style="border-color: #ff9800; color: #ff9800;">
        <div class="tag-button">
          <i class="tag-icon mdi mdi-clock-fast" />
          <span class="tag-text">{{ pendingAITagsCount }} pending</span>
        </div>
      </div>
    </div>

    <!-- Manual/Human tags -->
    <div
      v-for="(tag, index) in humanTags"
      :key="`human-${tag.metadata?.categoryId || 'manual'}-${tag.tagName}`"
      class="smart-tag"
      :style="{ borderColor: getTagColor(tag, index), color: getTagColor(tag, index) }"
    >
      <div class="tag-button">
        <i class="tag-icon mdi mdi-tag" />
        <span class="tag-text">{{ tag.tagName }}</span>
      </div>
    </div>

    <!-- AI tags -->
    <div
      v-for="(tag, index) in aiTags"
      :key="`ai-${tag.id || tag.tagName}-${tag.confidence}`"
      class="smart-tag"
      :style="{ borderColor: getTagColor(tag, index + humanTags.length), color: getTagColor(tag, index + humanTags.length) }"
    >
      <div class="tag-button">
        <i class="tag-icon mdi mdi-robot" />
        <span class="tag-text">{{ tag.tagName }}</span>
      </div>
    </div>
  </div>

  <div v-else class="no-tags">
    <small class="text-medium-emphasis">No tags</small>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getAutomaticTagColor } from '@/features/organizer/utils/automaticTagColors.js';

const props = defineProps({
  evidence: {
    type: Object,
    required: true,
  },
  // For backward compatibility, accept structured tags directly
  structuredHumanTags: {
    type: Array,
    default: () => [],
  },
  structuredAITags: {
    type: Array,
    default: () => [],
  },
  pendingTags: {
    type: Array,
    default: () => [],
  },
  // Function to get tags from evidence (for organizer store integration)
  getEvidenceTags: {
    type: Function,
    default: null,
  },
});

// Computed properties to extract and organize tags
const allTags = computed(() => {
  // If a function is provided to get tags, use it
  if (props.getEvidenceTags) {
    return props.getEvidenceTags(props.evidence) || [];
  }

  // Otherwise, combine structured tags
  return [
    ...props.structuredHumanTags,
    ...props.structuredAITags,
    ...props.pendingTags.map((tag) => ({ ...tag, displayStatus: 'pending' })),
  ];
});

const humanTags = computed(() => {
  return allTags.value.filter(
    (tag) => tag.source === 'manual' || (tag.source !== 'ai' && !tag.confidence)
  );
});

const aiTags = computed(() => {
  return allTags.value.filter(
    (tag) =>
      tag.source === 'ai' ||
      tag.confidence ||
      tag.displayStatus === 'pending' ||
      tag.status === 'pending' ||
      tag.status === 'approved' ||
      tag.status === 'rejected'
  );
});

const pendingAITagsCount = computed(() => {
  return aiTags.value.filter((tag) => getTagStatus(tag) === 'pending').length;
});

const hasAnyTags = computed(() => {
  return humanTags.value.length > 0 || aiTags.value.length > 0;
});

const hasHighConfidencePendingTags = computed(() => {
  return aiTags.value.some(
    (tag) => getTagStatus(tag) === 'pending' && (tag.confidence || 80) >= 85
  );
});

// Helper function to determine tag status
const getTagStatus = (tag) => {
  if (tag.displayStatus) return tag.displayStatus;
  if (tag.status) return tag.status;

  // For backward compatibility, check various status indicators
  if (tag.approved === true) return 'approved';
  if (tag.rejected === true) return 'rejected';
  if (tag.source === 'ai' && tag.approved !== true && tag.rejected !== true) return 'pending';

  return 'approved'; // Default for manual tags
};

// Helper function to get tag color - using triadic color scheme
const getTagColor = (tag, index) => {
  // Use metadata color if available, otherwise use automatic triadic colors
  if (tag.metadata?.color) {
    return tag.metadata.color;
  }
  
  // Use automatic triadic color based on index
  return getAutomaticTagColor(index);
};
</script>

<style scoped>
.tags-readonly {
  flex: 1;
  min-width: 200px;
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

.pending-tags-indicator {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

/* Copy exact styling from EditableTag.vue */
.smart-tag {
  display: inline-block;
  margin: 4px;
}

.tag-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid;
  border-color: inherit;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: default;
  outline: none;
}

.tag-icon {
  font-size: 14px;
}

/* Responsive design */
@media (max-width: 768px) {
  .tags-readonly {
    min-width: 0;
  }
}
</style>
