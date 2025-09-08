<!-- Streamlined from 312 lines to 166 lines on 2025-09-07 -->
<template>
  <div class="list-config-form">
    <h3 class="text-h6 mb-4">{{ listTitle }} Configuration</h3>
    <p class="text-body-2 text-medium-emphasis mb-6">{{ listDescription }}</p>

    <!-- Tag Input -->
    <v-row class="mb-4">
      <v-col cols="12" md="8">
        <v-text-field
          ref="tagInput"
          v-model="newTagName"
          label="Add a tag"
          variant="outlined"
          density="compact"
          placeholder="e.g., Invoice, Receipt, Statement..."
          :error-messages="tagInputError"
          @keydown.enter.prevent="addTag"
          @input="clearError"
          @update:model-value="capitalizeFirst"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-btn color="primary" :disabled="!newTagName.trim()" @click="addTag" block>
          <v-icon start>mdi-plus</v-icon>
          Add Tag
        </v-btn>
      </v-col>
    </v-row>

    <!-- Tags List -->
    <div class="tags-container">
      <div v-if="!localConfig.tags.length" class="no-tags">
        <v-icon size="48" color="grey-lighten-1">mdi-tag-outline</v-icon>
        <p class="text-body-2 text-medium-emphasis mt-2">No tags added yet. Add some tags above.</p>
      </div>

      <div v-else class="tags-list">
        <v-chip
          v-for="(tag, index) in localConfig.tags"
          :key="tag.id"
          :color="colors[index % colors.length]"
          closable
          class="ma-1"
          @click:close="localConfig.tags.splice(index, 1)"
        >
          <v-icon start size="16">mdi-tag</v-icon>
          {{ tag.name }}
        </v-chip>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ maxTags: 100, tags: [] }),
  },
  categoryType: {
    type: String,
    required: true,
    validator: (value) => ['fixed-list', 'open-list'].includes(value),
  },
});

const emit = defineEmits(['update:modelValue']);

// State
const localConfig = ref({ maxTags: 100, tags: [], ...props.modelValue });
const newTagName = ref('');
const tagInputError = ref('');
const tagInput = ref(null);

// Constants
const colors = ['blue', 'green', 'purple', 'orange', 'red', 'teal', 'indigo', 'pink'];

// Computed
const isFixedList = computed(() => props.categoryType === 'fixed-list');
const listTitle = computed(() => (isFixedList.value ? 'Fixed List' : 'Open List'));
const listDescription = computed(() =>
  isFixedList.value
    ? 'Add tags for the dropdown options. These will be the only available choices.'
    : 'Add some initial tags. Users can add more tags when creating documents.'
);

// Methods
const capitalizeFirst = (value) => {
  if (value?.length) {
    newTagName.value = value[0].toUpperCase() + value.slice(1);
  }
};

const clearError = () => (tagInputError.value = '');

const addTag = () => {
  const name = newTagName.value.trim();

  // Validation
  if (!name) {
    tagInputError.value = 'Tag name cannot be empty';
    return;
  }

  if (name.length > 50) {
    tagInputError.value = 'Tag name must be 50 characters or less';
    return;
  }

  if (localConfig.value.tags.some((tag) => tag.name.toLowerCase() === name.toLowerCase())) {
    tagInputError.value = 'This tag already exists';
    return;
  }

  // Add tag
  localConfig.value.tags.push({
    id: crypto.randomUUID(),
    name,
    usageCount: 0,
  });

  // Reset
  newTagName.value = '';
  tagInputError.value = '';
  tagInput.value?.focus();
};

// Watchers
watch(
  localConfig,
  (newConfig) => {
    emit('update:modelValue', { ...newConfig });
  },
  { deep: true }
);

watch(
  () => props.modelValue,
  (newValue) => {
    localConfig.value = { ...localConfig.value, ...newValue };
  },
  { immediate: true }
);
</script>

<style scoped>
.list-config-form {
  width: 100%;
}

.tags-container {
  padding: 16px;
  border: 2px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  min-height: 100px;
}

.no-tags {
  text-align: center;
  padding: 24px;
}

.tags-list {
  min-height: 50px;
}

@media (max-width: 600px) {
  .tags-container {
    padding: 12px;
  }
}
</style>
