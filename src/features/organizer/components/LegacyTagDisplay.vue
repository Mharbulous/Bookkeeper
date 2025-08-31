<template>
  <div v-if="hasLegacyTags" class="legacy-tags-display mb-2">
    <v-chip
      v-for="tag in legacyTags"
      :key="`legacy-${tag}`"
      size="small"
      closable
      variant="outlined"
      color="grey"
      class="ma-1"
      @click:close="handleRemoveTag(tag)"
    >
      <v-icon start size="14">mdi-tag-outline</v-icon>
      {{ tag }}
      <v-tooltip activator="parent" location="top">
        Legacy tag (v1.0) - Consider migrating to categories
      </v-tooltip>
    </v-chip>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  legacyTags: {
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

const emit = defineEmits(['remove-legacy-tag']);

// Computed properties
const hasLegacyTags = computed(() => props.legacyTags.length > 0);

// Methods
const handleRemoveTag = (tag) => {
  if (props.disabled || props.loading) return;
  emit('remove-legacy-tag', tag);
};
</script>

<style scoped>
.legacy-tags-display {
  min-height: 40px;
}
</style>