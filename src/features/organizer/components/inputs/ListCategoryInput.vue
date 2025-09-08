<template>
  <div class="list-category-input">
    <div 
      class="list-input-trigger"
      :class="{ 
        'has-value': modelValue, 
        'is-open': isOpen, 
        'is-disabled': disabled,
        'is-open-list': isOpenList
      }"
      @click="handleTriggerClick"
    >
      <i class="mdi mdi-tag" />
      <span class="tag-value">
        {{ displayValue || placeholder || 'Select option' }}
      </span>
      <i v-if="isOpenList" class="mdi mdi-plus-circle ai-indicator" title="AI can add new options" />
      <i class="mdi mdi-chevron-down toggle-icon" :class="{ rotated: isOpen }" />
    </div>

    <Teleport to="body">
      <div
        v-show="isOpen"
        ref="dropdownEl"
        class="list-dropdown"
        :style="dropdownStyle"
      >
        <!-- Search/Filter Input -->
        <div v-if="showSearch" class="dropdown-search">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            :placeholder="searchPlaceholder"
            @input="handleSearch"
            @keydown="handleSearchKeydown"
          />
          <i class="mdi mdi-magnify search-icon" />
        </div>

        <!-- Options List -->
        <div class="dropdown-options" :class="{ 'has-search': showSearch }">
          <!-- Existing Options -->
          <button
            v-for="(option, index) in filteredOptions"
            :key="option.id"
            type="button"
            class="dropdown-option"
            :class="{ 
              selected: option.name === modelValue,
              'ai-generated': option.aiGenerated,
              highlighted: index === highlightedIndex
            }"
            @click="selectOption(option.name)"
          >
            <span class="option-name">{{ option.name }}</span>
            <div class="option-meta">
              <span v-if="option.usageCount > 0" class="usage-count">
                {{ option.usageCount }}
              </span>
              <i v-if="option.aiGenerated" class="mdi mdi-robot ai-tag" title="AI generated" />
            </div>
          </button>

          <!-- AI Suggestion (for open lists) -->
          <div v-if="showAISuggestion" class="ai-suggestion-section">
            <div class="section-divider">
              <span>AI Suggestion</span>
            </div>
            <button
              type="button"
              class="dropdown-option ai-suggestion"
              :class="{ highlighted: highlightedIndex === filteredOptions.length }"
              @click="selectAISuggestion"
            >
              <span class="option-name">{{ aiSuggestion }}</span>
              <div class="option-meta">
                <i class="mdi mdi-robot-excited ai-tag" />
                <span class="new-tag">NEW</span>
              </div>
            </button>
          </div>

          <!-- No Options Message -->
          <div v-if="filteredOptions.length === 0 && !showAISuggestion" class="no-options">
            <i class="mdi mdi-information-outline" />
            <span>{{ noOptionsMessage }}</span>
          </div>
        </div>

        <!-- Footer Actions -->
        <div v-if="showFooter" class="dropdown-footer">
          <button type="button" class="clear-button" @click="clearSelection">
            Clear
          </button>
          <div class="footer-info">
            <span v-if="isOpenList" class="ai-info">
              <i class="mdi mdi-playlist-plus" />
              AI can add new options
            </span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, null],
    default: null
  },
  categoryConfig: {
    type: Object,
    default: () => ({
      allowAIExpansion: false,
      maxTags: 100,
      aiConfidenceThreshold: 0.7,
      requireHumanReview: false
    })
  },
  categoryOptions: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: 'Select option'
  },
  disabled: {
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
  }
});

const emit = defineEmits(['update:modelValue', 'change', 'create-tag', 'search']);

// Refs
const dropdownEl = ref(null);
const isOpen = ref(false);
const dropdownStyle = ref({});
const searchQuery = ref('');
const highlightedIndex = ref(-1);
const aiSuggestion = ref('');

// Computed
const isOpenList = computed(() => {
  return props.categoryConfig.allowAIExpansion === true;
});

const showSearch = computed(() => {
  return props.enableSearch && (props.categoryOptions.length > 5 || isOpenList.value);
});

const searchPlaceholder = computed(() => {
  return isOpenList.value ? 'Search or type new option...' : 'Search options...';
});

const displayValue = computed(() => {
  return props.modelValue || '';
});

const filteredOptions = computed(() => {
  if (!searchQuery.value) {
    return props.categoryOptions.slice().sort((a, b) => {
      // Sort by usage count (descending), then alphabetically
      if (b.usageCount !== a.usageCount) {
        return (b.usageCount || 0) - (a.usageCount || 0);
      }
      return a.name.localeCompare(b.name);
    });
  }

  const query = searchQuery.value.toLowerCase();
  return props.categoryOptions
    .filter(option => option.name.toLowerCase().includes(query))
    .sort((a, b) => {
      // Prioritize exact matches, then usage count, then alphabetical
      const aExact = a.name.toLowerCase() === query;
      const bExact = b.name.toLowerCase() === query;
      
      if (aExact && !bExact) return -1;
      if (bExact && !aExact) return 1;
      
      const aStarts = a.name.toLowerCase().startsWith(query);
      const bStarts = b.name.toLowerCase().startsWith(query);
      
      if (aStarts && !bStarts) return -1;
      if (bStarts && !aStarts) return 1;
      
      if (b.usageCount !== a.usageCount) {
        return (b.usageCount || 0) - (a.usageCount || 0);
      }
      
      return a.name.localeCompare(b.name);
    });
});

const showAISuggestion = computed(() => {
  if (!isOpenList.value || !props.aiSuggestionEnabled || !searchQuery.value.trim()) {
    return false;
  }

  // Don't show AI suggestion if exact match exists
  const exactMatch = props.categoryOptions.find(
    option => option.name.toLowerCase() === searchQuery.value.toLowerCase()
  );
  
  return !exactMatch && searchQuery.value.trim().length >= 2;
});

const noOptionsMessage = computed(() => {
  if (!searchQuery.value) {
    return 'No options available';
  }
  return isOpenList.value ? 'No matching options found' : 'No matching options found';
});

const showFooter = computed(() => {
  return props.modelValue !== null || isOpenList.value;
});

// Methods
const handleTriggerClick = () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
  updateDropdownPosition();
  
  if (isOpen.value) {
    searchQuery.value = '';
    highlightedIndex.value = -1;
  }
};

const handleSearch = () => {
  highlightedIndex.value = -1;
  
  // Generate AI suggestion for open lists
  if (isOpenList.value && searchQuery.value.trim().length >= 2) {
    aiSuggestion.value = searchQuery.value.trim();
  } else {
    aiSuggestion.value = '';
  }

  emit('search', searchQuery.value);
};

const handleSearchKeydown = (event) => {
  const totalOptions = filteredOptions.value.length + (showAISuggestion.value ? 1 : 0);
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, totalOptions - 1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1);
      break;
    case 'Enter':
      event.preventDefault();
      if (highlightedIndex.value >= 0) {
        if (highlightedIndex.value < filteredOptions.value.length) {
          selectOption(filteredOptions.value[highlightedIndex.value].name);
        } else if (showAISuggestion.value) {
          selectAISuggestion();
        }
      }
      break;
    case 'Escape':
      event.preventDefault();
      isOpen.value = false;
      break;
  }
};

const selectOption = (optionName) => {
  emit('update:modelValue', optionName);
  emit('change', {
    tagName: optionName,
    tagValue: optionName,
    displayValue: optionName,
    isExisting: true
  });
  
  isOpen.value = false;
  searchQuery.value = '';
  highlightedIndex.value = -1;
};

const selectAISuggestion = () => {
  if (!showAISuggestion.value) return;
  
  const newTagName = aiSuggestion.value;
  
  // Emit create-tag event for AI processing
  emit('create-tag', {
    tagName: newTagName,
    confidence: 1.0, // User-initiated creation has full confidence
    source: 'human'
  });
  
  // Also update the value immediately
  emit('update:modelValue', newTagName);
  emit('change', {
    tagName: newTagName,
    tagValue: newTagName,
    displayValue: newTagName,
    isExisting: false,
    aiGenerated: false // User created, not AI
  });
  
  isOpen.value = false;
  searchQuery.value = '';
  aiSuggestion.value = '';
  highlightedIndex.value = -1;
};

const clearSelection = () => {
  emit('update:modelValue', null);
  emit('change', {
    tagName: null,
    tagValue: null,
    displayValue: null,
    isExisting: false
  });
  
  isOpen.value = false;
  searchQuery.value = '';
  highlightedIndex.value = -1;
};

const updateDropdownPosition = () => {
  // Simplified positioning
  dropdownStyle.value = {
    position: 'fixed',
    zIndex: 9999
  };
};

const handleOutsideClick = (event) => {
  if (isOpen.value && dropdownEl.value && !dropdownEl.value.contains(event.target)) {
    const trigger = event.target.closest('.list-input-trigger');
    if (!trigger) {
      isOpen.value = false;
    }
  }
};

// Watchers
watch(() => props.categoryOptions, () => {
  highlightedIndex.value = -1;
}, { deep: true });

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});
</script>

<style scoped>
.list-category-input {
  position: relative;
  width: 100%;
}

.list-input-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 32px;
}

.list-input-trigger:hover:not(.is-disabled) {
  border-color: #c0c4cc;
}

.list-input-trigger.is-open {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.list-input-trigger.is-disabled {
  background: #f5f7fa;
  color: #c0c4cc;
  cursor: not-allowed;
}

.list-input-trigger.is-open-list {
  border-color: #67c23a;
}

.list-input-trigger.is-open-list.is-open {
  border-color: #67c23a;
  box-shadow: 0 0 0 2px rgba(103, 194, 58, 0.2);
}

.tag-value {
  flex: 1;
  color: #606266;
  font-size: 14px;
}

.list-input-trigger.has-value .tag-value {
  color: #303133;
}

.ai-indicator {
  color: #67c23a;
  font-size: 16px;
}

.toggle-icon {
  color: #c0c4cc;
  transition: transform 0.2s ease;
}

.toggle-icon.rotated {
  transform: rotate(180deg);
}

.list-dropdown {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  min-width: 200px;
  max-width: 400px;
}

.dropdown-search {
  position: relative;
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
}

.search-input {
  width: 100%;
  padding: 6px 32px 6px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  outline: none;
  font-size: 14px;
}

.search-input:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.search-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  color: #c0c4cc;
}

.dropdown-options {
  max-height: 240px;
  overflow-y: auto;
}

.dropdown-options.has-search {
  max-height: 200px;
}

.dropdown-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dropdown-option:hover,
.dropdown-option.highlighted {
  background: #f5f7fa;
  color: #409eff;
}

.dropdown-option.selected {
  background: #e6f7ff;
  color: #409eff;
  font-weight: 600;
}

.dropdown-option.ai-generated {
  border-left: 3px solid #67c23a;
}

.option-name {
  font-size: 14px;
  color: inherit;
}

.option-meta {
  display: flex;
  align-items: center;
  gap: 4px;
}

.usage-count {
  font-size: 12px;
  color: #909399;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

.ai-tag {
  color: #67c23a;
  font-size: 14px;
}

.ai-suggestion-section {
  border-top: 1px solid #ebeef5;
}

.section-divider {
  padding: 8px 12px 4px;
  font-size: 12px;
  color: #909399;
  font-weight: 600;
  text-transform: uppercase;
}

.dropdown-option.ai-suggestion {
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  border-left: 3px solid #67c23a;
}

.dropdown-option.ai-suggestion:hover,
.dropdown-option.ai-suggestion.highlighted {
  background: linear-gradient(135deg, #e6f7ff 0%, #d1f2eb 100%);
}

.new-tag {
  font-size: 10px;
  color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: 600;
}

.no-options {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  color: #909399;
  font-size: 14px;
  text-align: center;
}

.dropdown-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid #ebeef5;
  background: #fafbfc;
}

.clear-button {
  padding: 4px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: white;
  color: #606266;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-button:hover {
  border-color: #f56c6c;
  color: #f56c6c;
}

.ai-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #67c23a;
}

.dropdown-options::-webkit-scrollbar {
  width: 6px;
}

.dropdown-options::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}
</style>