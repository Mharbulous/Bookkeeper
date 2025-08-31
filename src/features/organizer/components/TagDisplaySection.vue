<template>
  <div v-if="hasStructuredTags" class="tags-display mb-2">
    <v-chip
      v-for="tag in structuredTags"
      :key="`${tag.categoryId}-${tag.tagId}`"
      size="small"
      closable
      variant="outlined"
      :color="getTagColor(tag)"
      class="ma-1"
      @click:close="handleRemoveTag(tag)"
    >
      <v-icon start size="14" :color="getTagColor(tag)">mdi-tag</v-icon>
      {{ tag.tagName }}
    </v-chip>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useTagColor } from '../composables/useTagColor.js';

const props = defineProps({
  structuredTags: {
    type: Array,
    default: () => []
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

const emit = defineEmits(['remove-tag']);

// Use tag color composable for centralized color resolution
const { getTagColor } = useTagColor();

// Computed properties
const hasStructuredTags = computed(() => props.structuredTags.length > 0);

// Methods
const handleRemoveTag = (tag) => {
  if (props.disabled || props.loading) return;
  emit('remove-tag', tag);
};
</script>

<style scoped>
.tags-display {
  min-height: 40px;
}
</style>