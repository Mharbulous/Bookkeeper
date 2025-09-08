<template>
  <div class="list-config-form">
    <h3 class="text-h6 mb-4">{{ categoryType === 'fixed-list' ? 'Fixed List' : 'Open List' }} Configuration</h3>

    <!-- AI Expansion Settings (Open List Only) -->
    <div v-if="categoryType === 'open-list'" class="ai-settings mb-6">
      <v-card variant="tonal" color="blue">
        <v-card-text class="pa-4">
          <div class="d-flex align-center mb-3">
            <v-icon color="blue" class="mr-2">mdi-playlist-plus</v-icon>
            <h4 class="text-subtitle-1">AI Expansion Settings</h4>
          </div>
          
          <v-row>
            <v-col cols="12" md="6">
              <v-checkbox
                v-model="localConfig.allowAIExpansion"
                label="Enable AI expansion"
                color="blue"
                hint="Allow AI to create new tags when processing documents"
                persistent-hint
                readonly
                :model-value="true"
              />
              <p class="text-caption text-medium-emphasis mt-2">
                This is automatically enabled for Open List categories.
              </p>
            </v-col>

            <v-col cols="12" md="6">
              <v-slider
                v-model="localConfig.aiConfidenceThreshold"
                label="AI Confidence Threshold"
                :min="0.5"
                :max="0.95"
                :step="0.05"
                thumb-label="always"
                color="blue"
                hint="Minimum confidence required for AI to create new tags"
                persistent-hint
              >
                <template #thumb-label="{ modelValue }">
                  {{ Math.round(modelValue * 100) }}%
                </template>
              </v-slider>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" md="6">
              <v-checkbox
                v-model="localConfig.requireHumanReview"
                label="Require human review for new AI tags"
                color="orange"
                hint="New AI-created tags need approval before use"
                persistent-hint
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </div>

    <!-- Tag Limit Settings -->
    <div class="tag-limits mb-6">
      <h4 class="text-subtitle-1 mb-3">Tag Limits</h4>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Control how many tags this category can contain to maintain performance.
      </p>

      <v-row>
        <v-col cols="12" md="6">
          <v-text-field
            v-model.number="localConfig.maxTags"
            label="Maximum Tags"
            type="number"
            variant="outlined"
            density="compact"
            :min="1"
            :max="500"
            hint="Maximum number of tags allowed in this category"
            persistent-hint
          />
        </v-col>

        <v-col cols="12" md="6" class="d-flex align-center">
          <v-alert
            :type="tagLimitAlert.type"
            variant="tonal"
            density="compact"
            class="flex-grow-1"
          >
            <v-icon start size="small">{{ tagLimitAlert.icon }}</v-icon>
            {{ tagLimitAlert.message }}
          </v-alert>
        </v-col>
      </v-row>
    </div>

    <!-- Initial Tags -->
    <div class="initial-tags mb-6">
      <h4 class="text-subtitle-1 mb-3">Initial Tags</h4>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Add some starting tags to help users understand what this category is for.
        {{ categoryType === 'open-list' ? 'AI can add more tags later based on document content.' : 'These will be the only available options.' }}
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
            No tags added yet. Add some initial tags above.
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

        <div class="tags-summary mt-3">
          <v-chip
            :color="localConfig.tags.length > 0 ? 'success' : 'grey'"
            size="small"
            variant="tonal"
          >
            <v-icon start size="14">mdi-counter</v-icon>
            {{ localConfig.tags.length }} / {{ localConfig.maxTags }} tags
          </v-chip>
        </div>
      </div>
    </div>


    <!-- Validation Alerts -->
    <v-alert
      v-if="localConfig.tags.length === 0"
      type="info"
      variant="tonal"
      class="mt-4"
    >
      <v-icon start>mdi-information</v-icon>
      <strong>No initial tags:</strong> 
      {{ categoryType === 'fixed-list' 
        ? 'Users won\'t have any options to select from until you add tags.' 
        : 'Users can still type new options, and AI can create tags from document content.' 
      }}
    </v-alert>

    <v-alert
      v-if="categoryType === 'open-list' && localConfig.aiConfidenceThreshold > 0.9"
      type="warning"
      variant="tonal"
      class="mt-4"
    >
      <v-icon start>mdi-alert</v-icon>
      <strong>Very high confidence threshold:</strong> AI will rarely create new tags with confidence above 90%. Consider lowering to 70-85% for better results.
    </v-alert>
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

// Local reactive config
const localConfig = ref({
  allowAIExpansion: props.categoryType === 'open-list',
  maxTags: 100,
  aiConfidenceThreshold: 0.7,
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
  
  // Validate tag name
  if (!name) {
    tagInputError.value = 'Tag name cannot be empty';
    return;
  }
  
  if (name.length > 30) {
    tagInputError.value = 'Tag name must be 30 characters or less';
    return;
  }
  
  // Check for duplicates
  if (localConfig.value.tags.some(tag => tag.name.toLowerCase() === name.toLowerCase())) {
    tagInputError.value = 'This tag already exists';
    return;
  }
  
  // Check tag limit
  if (localConfig.value.tags.length >= localConfig.value.maxTags) {
    tagInputError.value = `Maximum of ${localConfig.value.maxTags} tags allowed`;
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
  return newTagName.value.trim().length > 0 && 
         localConfig.value.tags.length < localConfig.value.maxTags;
});

const tagLimitAlert = computed(() => {
  const count = localConfig.value.maxTags;
  if (count <= 10) {
    return {
      type: 'warning',
      icon: 'mdi-alert',
      message: 'Very low limit - may restrict functionality'
    };
  } else if (count <= 50) {
    return {
      type: 'success',
      icon: 'mdi-check',
      message: 'Good limit for most use cases'
    };
  } else if (count <= 200) {
    return {
      type: 'info',
      icon: 'mdi-information',
      message: 'High limit - good for extensive categorization'
    };
  } else {
    return {
      type: 'warning',
      icon: 'mdi-alert',
      message: 'Very high limit - may impact performance'
    };
  }
});

const previewValue = computed(() => {
  return localConfig.value.tags.length > 0 ? localConfig.value.tags[0].name : null;
});

const previewItems = computed(() => {
  const items = localConfig.value.tags.map(tag => tag.name);
  
  if (props.categoryType === 'open-list') {
    // Add some example AI-generated options
    items.push('New Institution (AI)', 'AI Suggestion Example');
  }
  
  return items;
});

const previewInfo = computed(() => {
  const info = [];
  
  if (props.categoryType === 'open-list') {
    info.push({
      text: 'AI Expandable',
      color: 'blue',
      icon: 'mdi-playlist-plus'
    });
    
    info.push({
      text: `${Math.round(localConfig.value.aiConfidenceThreshold * 100)}% confidence`,
      color: 'blue',
      icon: 'mdi-chart-line'
    });
  } else {
    info.push({
      text: 'Fixed Options',
      color: 'grey-darken-4',
      icon: 'mdi-lock'
    });
  }
  
  info.push({
    text: `${localConfig.value.tags.length} initial tags`,
    color: 'green',
    icon: 'mdi-tag-multiple'
  });
  
  info.push({
    text: `Max ${localConfig.value.maxTags} tags`,
    color: 'grey',
    icon: 'mdi-counter'
  });
  
  return info;
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