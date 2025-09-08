<template>
  <div class="list-config-form">
    <h3 class="text-h6 mb-4">{{ categoryType === 'fixed-list' ? 'Fixed List' : 'Open List' }} Configuration</h3>
    <p class="text-body-2 text-medium-emphasis mb-6">
      {{ categoryType === 'open-list' 
        ? 'Add some initial tags. AI can create more tags automatically when processing documents.' 
        : 'Add tags for the dropdown options. These will be the only available choices.' 
      }}
    </p>

    <!-- Tag Input -->
    <v-row class="mb-4">
      <v-col cols="12" md="8">
        <v-text-field
          v-model="newTagName"
          label="Add a tag"
          variant="outlined"
          density="compact"
          placeholder="e.g., Invoice, Receipt, Statement..."
          :error-messages="tagInputError"
          @keydown.enter="addTag"
          @input="clearTagError"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-btn
          color="primary"
          :disabled="!canAddTag"
          @click="addTag"
          block
        >
          <v-icon start>mdi-plus</v-icon>
          Add Tag
        </v-btn>
      </v-col>
    </v-row>

    <!-- Tags List -->
    <div class="tags-container">
      <div v-if="localConfig.tags.length === 0" class="no-tags">
        <v-icon size="48" color="grey-lighten-1">mdi-tag-outline</v-icon>
        <p class="text-body-2 text-medium-emphasis mt-2">
          No tags added yet. Add some tags above.
        </p>
      </div>

      <div v-else class="tags-list">
        <v-chip
          v-for="(tag, index) in localConfig.tags"
          :key="tag.id"
          :color="getTagColor(index)"
          closable
          size="default"
          class="ma-1"
          @click:close="removeTag(index)"
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
    default: () => ({
      allowAIExpansion: false,
      maxTags: 100,
      aiConfidenceThreshold: 0.7,
      requireHumanReview: false,
      tags: []
    })
  },
  categoryType: {
    type: String,
    required: true,
    validator: value => ['fixed-list', 'open-list'].includes(value)
  }
});

const emit = defineEmits(['update:modelValue']);

// Local reactive config with sensible defaults
const localConfig = ref({
  allowAIExpansion: props.categoryType === 'open-list',
  maxTags: 100,
  aiConfidenceThreshold: 0.75,
  requireHumanReview: false,
  tags: [],
  ...props.modelValue
});

// Tag input state
const newTagName = ref('');
const tagInputError = ref('');

// Methods
const getTagColor = (index) => {
  const colors = ['blue', 'green', 'purple', 'orange', 'red', 'teal', 'indigo', 'pink'];
  return colors[index % colors.length];
};

const addTag = () => {
  const name = newTagName.value.trim();
  
  // Basic validation
  if (!name) {
    tagInputError.value = 'Tag name cannot be empty';
    return;
  }
  
  if (name.length > 50) {
    tagInputError.value = 'Tag name must be 50 characters or less';
    return;
  }
  
  // Check for duplicates
  if (localConfig.value.tags.some(tag => tag.name.toLowerCase() === name.toLowerCase())) {
    tagInputError.value = 'This tag already exists';
    return;
  }
  
  // Add tag
  localConfig.value.tags.push({
    id: crypto.randomUUID(),
    name: name,
    aiGenerated: false,
    usageCount: 0
  });
  
  // Clear input
  newTagName.value = '';
  tagInputError.value = '';
};

const removeTag = (index) => {
  localConfig.value.tags.splice(index, 1);
};

const clearTagError = () => {
  tagInputError.value = '';
};

// Computed
const canAddTag = computed(() => {
  return newTagName.value.trim().length > 0;
});

// Watch for changes
watch(localConfig, (newConfig) => {
  // Ensure allowAIExpansion matches category type
  newConfig.allowAIExpansion = props.categoryType === 'open-list';
  
  emit('update:modelValue', { ...newConfig });
}, { deep: true });

// Initialize with props
watch(() => props.modelValue, (newValue) => {
  localConfig.value = { 
    ...localConfig.value, 
    ...newValue,
    allowAIExpansion: props.categoryType === 'open-list'
  };
}, { immediate: true });

// Watch category type changes
watch(() => props.categoryType, (newType) => {
  localConfig.value.allowAIExpansion = newType === 'open-list';
});
</script>

<style scoped>
.list-config-form {
  width: 100%;
}

.ai-settings {
  border-radius: 8px;
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

.tags-summary {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 12px;
  margin-top: 12px;
}

.preview-container {
  padding: 20px;
  background: rgba(var(--v-theme-surface-variant), 0.5);
  border-radius: 8px;
  border: 2px dashed rgba(var(--v-border-color), var(--v-border-opacity));
}

.dropdown-preview {
  max-width: 400px;
}

.dropdown-preview-field {
  pointer-events: none;
}

.preview-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .preview-container {
    padding: 16px;
  }
  
  .dropdown-preview {
    max-width: 100%;
  }
  
  .tags-container {
    padding: 12px;
  }
}
</style>