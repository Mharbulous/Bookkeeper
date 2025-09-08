<template>
  <div class="category-input" :class="`category-type-${categoryType}`">
    <div v-if="showLabel" class="category-label">
      <span class="label-text">{{ categoryName }}</span>
      <span v-if="required" class="required-indicator">*</span>
      <div v-if="showTypeIndicator" class="type-indicator">
        <i :class="typeIcon" />
        <span class="type-text">{{ typeText }}</span>
      </div>
    </div>

    <!-- Date Category Input -->
    <DateCategoryInput
      v-if="categoryType === 'date'"
      v-model="localValue"
      :category-config="categoryConfig"
      :placeholder="placeholder"
      :disabled="disabled"
      @change="handleChange"
    />

    <!-- Currency Category Input -->
    <CurrencyCategoryInput
      v-else-if="categoryType === 'currency'"
      v-model="localValue"
      :category-config="categoryConfig"
      :placeholder="placeholder"
      :disabled="disabled"
      @change="handleChange"
    />

    <!-- List Category Input (Fixed or Open) -->
    <ListCategoryInput
      v-else-if="categoryType === 'fixed-list' || categoryType === 'open-list'"
      v-model="localValue"
      :category-config="categoryConfig"
      :category-options="categoryOptions"
      :placeholder="placeholder"
      :disabled="disabled"
      :enable-search="enableSearch"
      :ai-suggestion-enabled="aiSuggestionEnabled"
      @change="handleChange"
      @create-tag="handleCreateTag"
      @search="handleSearch"
    />

    <!-- Fallback for unknown types -->
    <div v-else class="unsupported-type">
      <i class="mdi mdi-alert-circle" />
      <span>Unsupported category type: {{ categoryType }}</span>
    </div>

    <!-- Validation Error Display -->
    <div v-if="validationError" class="validation-error">
      <i class="mdi mdi-alert-circle-outline" />
      <span>{{ validationError }}</span>
    </div>

    <!-- Help Text -->
    <div v-if="helpText" class="help-text">
      <i class="mdi mdi-information-outline" />
      <span>{{ helpText }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import DateCategoryInput from './DateCategoryInput.vue';
import CurrencyCategoryInput from './CurrencyCategoryInput.vue';
import ListCategoryInput from './ListCategoryInput.vue';

const props = defineProps({
  modelValue: {
    type: [String, Object, Date, null],
    default: null
  },
  category: {
    type: Object,
    required: true
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  },
  showLabel: {
    type: Boolean,
    default: true
  },
  showTypeIndicator: {
    type: Boolean,
    default: false
  },
  enableSearch: {
    type: Boolean,
    default: true
  },
  aiSuggestionEnabled: {
    type: Boolean,
    default: true
  },
  validationError: {
    type: String,
    default: ''
  },
  helpText: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'change', 'create-tag', 'search', 'validation-error']);

// Local reactive value
const localValue = ref(props.modelValue);

// Computed properties
const categoryName = computed(() => props.category.name || 'Category');
const categoryType = computed(() => props.category.categoryType || 'fixed-list');
const categoryConfig = computed(() => props.category.typeConfig || {});
const categoryOptions = computed(() => props.category.tags || []);

const typeIcon = computed(() => {
  const iconMap = {
    'date': 'mdi mdi-calendar',
    'currency': 'mdi mdi-currency-usd',
    'fixed-list': 'mdi mdi-format-list-bulleted',
    'open-list': 'mdi mdi-format-list-bulleted-type'
  };
  return iconMap[categoryType.value] || 'mdi mdi-help-circle';
});

const typeText = computed(() => {
  const textMap = {
    'date': 'Date',
    'currency': 'Currency',
    'fixed-list': 'Fixed List',
    'open-list': 'Open List'
  };
  return textMap[categoryType.value] || 'Unknown';
});

// Methods
const handleChange = (changeData) => {
  // Update local value
  localValue.value = changeData.tagName;
  
  // Emit the change with enhanced data including category information
  const enrichedChangeData = {
    ...changeData,
    categoryId: props.category.id,
    categoryName: props.category.name,
    categoryType: categoryType.value
  };

  emit('update:modelValue', changeData.tagName);
  emit('change', enrichedChangeData);
  
  // Clear validation error on successful change
  if (props.validationError) {
    emit('validation-error', '');
  }
};

const handleCreateTag = (tagData) => {
  // Emit create-tag event with category context
  const enrichedTagData = {
    ...tagData,
    categoryId: props.category.id,
    categoryName: props.category.name,
    categoryType: categoryType.value
  };

  emit('create-tag', enrichedTagData);
};

const handleSearch = (searchQuery) => {
  // Emit search event with category context
  emit('search', {
    query: searchQuery,
    categoryId: props.category.id,
    categoryName: props.category.name,
    categoryType: categoryType.value
  });
};

const validateValue = () => {
  if (props.required && !localValue.value) {
    emit('validation-error', `${categoryName.value} is required`);
    return false;
  }

  // Type-specific validation
  switch (categoryType.value) {
    case 'date':
      if (localValue.value && !isValidDate(localValue.value)) {
        emit('validation-error', 'Invalid date format');
        return false;
      }
      break;
    
    case 'currency':
      if (localValue.value && !isValidCurrency(localValue.value)) {
        emit('validation-error', 'Invalid currency value');
        return false;
      }
      break;
    
    case 'fixed-list':
    case 'open-list':
      if (localValue.value && !isValidListOption(localValue.value)) {
        emit('validation-error', 'Invalid option selected');
        return false;
      }
      break;
  }

  emit('validation-error', '');
  return true;
};

const isValidDate = (value) => {
  if (typeof value === 'string') {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  return value instanceof Date && !isNaN(value.getTime());
};

const isValidCurrency = (value) => {
  return value && 
         typeof value === 'object' && 
         typeof value.amount === 'number' && 
         typeof value.currency === 'string' &&
         !isNaN(value.amount);
};

const isValidListOption = (value) => {
  return typeof value === 'string' && value.trim().length > 0;
};

// Public methods (exposed via defineExpose)
const validate = () => {
  return validateValue();
};

const reset = () => {
  localValue.value = null;
  emit('update:modelValue', null);
  emit('validation-error', '');
};

const focus = () => {
  // Focus the appropriate input component
  // This would need to be implemented per component
};

// Watch for external value changes
watch(() => props.modelValue, (newValue) => {
  localValue.value = newValue;
});

// Watch for category changes (type switching)
watch(() => props.category, (newCategory, oldCategory) => {
  if (oldCategory && newCategory.categoryType !== oldCategory.categoryType) {
    // Category type changed, reset the value
    reset();
  }
}, { deep: true });

// Expose public methods
defineExpose({
  validate,
  reset,
  focus
});
</script>

<style scoped>
.category-input {
  width: 100%;
  margin-bottom: 16px;
}

.category-input:last-child {
  margin-bottom: 0;
}

.category-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.label-text {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.required-indicator {
  color: #f56c6c;
  font-weight: bold;
}

.type-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 2px 6px;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 12px;
  font-size: 12px;
  color: #409eff;
}

.type-indicator i {
  font-size: 14px;
}

.type-text {
  text-transform: uppercase;
  font-weight: 600;
}

/* Type-specific styling */
.category-type-date .type-indicator {
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
}

.category-type-currency .type-indicator {
  background: rgba(230, 162, 60, 0.1);
  color: #e6a23c;
}

.category-type-open-list .type-indicator {
  background: rgba(156, 39, 176, 0.1);
  color: #9c27b0;
}

.unsupported-type {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 6px;
  color: #e6a23c;
}

.unsupported-type i {
  font-size: 18px;
}

.validation-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  padding: 6px 8px;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 4px;
  color: #f56c6c;
  font-size: 13px;
}

.validation-error i {
  font-size: 14px;
}

.help-text {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  padding: 6px 8px;
  background: #f4f4f5;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  color: #909399;
  font-size: 13px;
}

.help-text i {
  font-size: 14px;
}

/* Responsive design */
@media (max-width: 768px) {
  .category-label {
    flex-wrap: wrap;
  }

  .type-indicator {
    margin-left: 0;
    order: -1;
  }
}
</style>