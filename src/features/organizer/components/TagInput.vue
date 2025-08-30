<template>
  <div class="tag-input">
    <!-- Display existing tags as chips -->
    <div v-if="tags.length > 0" class="tags-display mb-2">
      <v-chip
        v-for="tag in tags"
        :key="tag"
        size="small"
        closable
        variant="outlined"
        color="primary"
        class="ma-1"
        @click:close="removeTag(tag)"
      >
        {{ tag }}
      </v-chip>
    </div>

    <!-- Input for adding new tags -->
    <div class="tag-input-field">
      <v-text-field
        v-model="newTagText"
        :placeholder="placeholder"
        :disabled="disabled || loading"
        :loading="loading"
        variant="outlined"
        density="compact"
        hide-details="auto"
        clearable
        @keydown.enter="handleEnterKey"
        @keydown.comma="handleCommaKey"
        @keydown.tab="handleTabKey"
      >
        <template #append-inner>
          <v-btn
            v-if="newTagText.trim()"
            icon
            size="small"
            variant="text"
            :disabled="disabled || loading"
            @click="addTag"
          >
            <v-icon size="16">mdi-plus</v-icon>
          </v-btn>
        </template>
      </v-text-field>
    </div>

    <!-- Helper text -->
    <div v-if="showHelperText && !hideDetails" class="helper-text mt-1">
      <small class="text-grey">
        {{ helperText }}
      </small>
    </div>

    <!-- Error message -->
    <div v-if="errorMessage" class="error-message mt-1">
      <small class="text-error">
        {{ errorMessage }}
      </small>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

// Props
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: 'Add tags...',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  maxTags: {
    type: Number,
    default: 20,
  },
  hideDetails: {
    type: Boolean,
    default: false,
  },
  allowDuplicates: {
    type: Boolean,
    default: false,
  },
  validateTag: {
    type: Function,
    default: null,
  },
});

// Emits
const emit = defineEmits([
  'update:modelValue',
  'tag-added',
  'tag-removed',
  'error',
]);

// State
const newTagText = ref('');
const errorMessage = ref('');

// Computed
const tags = computed(() => props.modelValue || []);

const showHelperText = computed(() => {
  return !errorMessage.value && tags.value.length === 0;
});

const helperText = computed(() => {
  return 'Press Enter, Tab, or comma to add tags';
});

// Watch for external changes to clear errors
watch(() => props.modelValue, () => {
  errorMessage.value = '';
});

// Methods
const validateNewTag = (tagText) => {
  const tag = tagText.trim();

  // Empty tag
  if (!tag) {
    return { valid: false, error: 'Tag cannot be empty' };
  }

  // Tag too long
  if (tag.length > 50) {
    return { valid: false, error: 'Tag cannot be longer than 50 characters' };
  }

  // Too many tags
  if (tags.value.length >= props.maxTags) {
    return { valid: false, error: `Cannot add more than ${props.maxTags} tags` };
  }

  // Duplicate tag (if not allowed)
  if (!props.allowDuplicates && tags.value.includes(tag)) {
    return { valid: false, error: 'Tag already exists' };
  }

  // Custom validation
  if (props.validateTag) {
    const customValidation = props.validateTag(tag);
    if (customValidation !== true) {
      return { 
        valid: false, 
        error: typeof customValidation === 'string' ? customValidation : 'Invalid tag'
      };
    }
  }

  return { valid: true };
};

const addTag = () => {
  if (props.disabled || props.loading) return;

  const tagText = newTagText.value.trim();
  if (!tagText) return;

  // Validate tag
  const validation = validateNewTag(tagText);
  if (!validation.valid) {
    errorMessage.value = validation.error;
    emit('error', validation.error);
    return;
  }

  // Add tag
  const newTags = [...tags.value, tagText];
  emit('update:modelValue', newTags);
  emit('tag-added', tagText);

  // Clear input and error
  newTagText.value = '';
  errorMessage.value = '';
};

const removeTag = (tagToRemove) => {
  if (props.disabled || props.loading) return;

  const newTags = tags.value.filter(tag => tag !== tagToRemove);
  emit('update:modelValue', newTags);
  emit('tag-removed', tagToRemove);

  // Clear error when removing tags
  errorMessage.value = '';
};

// Keyboard event handlers
const handleEnterKey = (event) => {
  event.preventDefault();
  addTag();
};

const handleCommaKey = (event) => {
  event.preventDefault();
  addTag();
};

const handleTabKey = (event) => {
  if (newTagText.value.trim()) {
    event.preventDefault();
    addTag();
  }
};

// Expose methods for external access
defineExpose({
  addTag,
  removeTag,
  clearInput: () => {
    newTagText.value = '';
    errorMessage.value = '';
  },
  focus: () => {
    // Focus would be handled by accessing the text field ref
  }
});
</script>

<style scoped>
.tag-input {
  width: 100%;
}

.tags-display {
  min-height: 0;
}

.tag-input-field {
  width: 100%;
}

.helper-text {
  font-size: 12px;
  opacity: 0.7;
}

.error-message {
  font-size: 12px;
}

/* Ensure chips wrap nicely */
.tags-display :deep(.v-chip) {
  margin: 2px;
}

/* Custom text field styling */
.tag-input-field :deep(.v-field) {
  min-height: 32px;
}

.tag-input-field :deep(.v-field__input) {
  padding-top: 4px;
  padding-bottom: 4px;
  min-height: 24px;
}
</style>