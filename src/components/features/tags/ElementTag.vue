<template>
  <div class="element-tag-wrapper">
    <!-- Element Plus select styled to look like a tag pill -->
    <el-select
      :model-value="tag.tagName"
      @update:model-value="handleSelectionChange"
      :filterable="isOpenCategory"
      :allow-create="isOpenCategory"
      :placeholder="`${tag.tagName}`"
      :popper-class="`element-tag-dropdown ${popperClass}`"
      teleported
      class="element-tag-select"
      @visible-change="handleVisibleChange"
      ref="selectRef"
      :popper-options="popperOptions"
      :style="{ '--tag-color': tagColor }"
    >
      <el-option
        v-for="option in categoryOptions"
        :key="option.id"
        :label="option.tagName"
        :value="option.tagName"
      />
    </el-select>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { ElSelect, ElOption } from 'element-plus'

// Props
const props = defineProps({
  tag: {
    type: Object,
    required: true
  },
  categoryOptions: {
    type: Array,
    default: () => []
  },
  isOpenCategory: {
    type: Boolean,
    default: true
  },
  tagColor: {
    type: String,
    default: '#1976d2'
  }
})

// Emits
const emit = defineEmits(['tag-updated', 'tag-selected', 'tag-created'])

// Template refs
const selectRef = ref(null)

// Computed properties  
const selectedValue = computed(() => {
  return props.tag.tagName
})

const popperClass = computed(() => {
  return `element-tag-popper-${props.tag.id}`
})

const popperOptions = computed(() => ({
  strategy: 'fixed',
  placement: 'bottom-start',
  modifiers: [
    {
      name: 'offset',
      options: {
        offset: [0, 4]
      }
    },
    {
      name: 'preventOverflow',
      options: {
        boundary: 'viewport',
        padding: 8
      }
    }
  ]
}))

// Methods
const handleSelectionChange = (newValue) => {
  if (!newValue) {
    return
  }

  const oldValue = props.tag.tagName

  if (newValue === oldValue) {
    return
  }

  console.log(`Element Plus tag changing: ${oldValue} → ${newValue}`)

  // Check if it's a new tag that doesn't exist in options
  const existingOption = props.categoryOptions.find(opt => opt.tagName === newValue)
  
  if (!existingOption && props.isOpenCategory) {
    // Create new tag
    emit('tag-created', {
      tagName: newValue,
      categoryId: props.tag.categoryId,
      tag: props.tag
    })
  } else {
    // Select existing tag
    emit('tag-selected', {
      oldValue,
      newValue,
      tag: props.tag
    })
  }

  // Update the tag object
  props.tag.tagName = newValue
  emit('tag-updated', props.tag)

  // Close the dropdown after selection
  nextTick(() => {
    if (selectRef.value) {
      selectRef.value.blur()
    }
  })
}

const handleVisibleChange = (visible) => {
  if (visible) {
    console.log(`Element Plus dropdown opened for: ${props.tag.tagName}`)
    // Focus on the input when dropdown opens
    nextTick(() => {
      const input = selectRef.value?.$refs?.input?.input || selectRef.value?.$refs?.input
      if (input) {
        input.focus()
      }
    })
  } else {
    console.log(`Element Plus dropdown closed for: ${props.tag.tagName}`)
  }
}

// Lifecycle
onMounted(() => {
  console.log(`Element Plus tag mounted: ${props.tag.tagName}`)
})
</script>

<style scoped>
.element-tag-wrapper {
  display: inline-block;
  margin: 2px;
}

/* Style the Element Plus select to look like a tag pill */
:deep(.element-tag-select) {
  --el-select-width: auto;
  min-width: auto;
  width: auto;
}

:deep(.element-tag-select .el-select__wrapper) {
  background-color: transparent;
  border: 1px solid var(--tag-color, #1976d2);
  border-radius: 12px;
  padding: 4px 8px;
  min-height: auto;
  height: auto;
  box-shadow: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 4px;
}

:deep(.element-tag-select .el-select__wrapper:hover) {
  border-color: var(--tag-color, #1976d2);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

:deep(.element-tag-select.is-focused .el-select__wrapper) {
  border-color: var(--tag-color, #1976d2);
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

/* Style the selected text display - Element Plus uses different classes */
:deep(.element-tag-select .el-select__placeholder) {
  color: var(--tag-color, #1976d2) !important;
  font-size: 12px !important;
  font-weight: normal;
  opacity: 1 !important;
  position: relative;
  display: flex !important;
  align-items: center;
  justify-content: center !important;
  text-align: center;
  width: 100%;
  margin: 0 !important;
  padding: 0 !important;
}

/* Target the main input container */
:deep(.element-tag-select .el-input) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex: 1;
}

/* Also target the input value display */
:deep(.element-tag-select .el-input__inner) {
  color: var(--tag-color, #1976d2) !important;
  font-size: 12px !important;
  font-weight: normal;
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
  height: auto !important;
  line-height: 1.2 !important;
  text-align: center !important;
  flex: 1;
  width: 100% !important;
}

/* Add tag icon before the placeholder text */
:deep(.element-tag-select .el-select__placeholder::before) {
  content: '\f02c7'; /* MDI tag icon */
  font-family: 'Material Design Icons';
  font-size: 14px;
  line-height: 1;
  margin-right: 4px;
  display: inline-block;
  vertical-align: middle;
}

/* Add tag icon before the input text */
:deep(.element-tag-select .el-input__inner::before) {
  content: '\f02c7'; /* MDI tag icon */
  font-family: 'Material Design Icons';
  font-size: 14px;
  line-height: 1;
  margin-right: 4px;
  display: inline-block;
  vertical-align: middle;
}

/* Transform tag icon to pencil on hover */
:deep(.element-tag-select .el-select__wrapper:hover .el-select__placeholder::before),
:deep(.element-tag-select .el-select__wrapper:hover .el-input__inner::before) {
  content: '\f064f'; /* MDI pencil icon */
}

/* Style the caret */
:deep(.element-tag-select .el-select__caret) {
  color: var(--tag-color, #1976d2);
  font-size: 12px;
  margin-left: 4px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

/* Hide the input when not focused */
:deep(.element-tag-select .el-select__input-wrapper) {
  display: none;
}

:deep(.element-tag-select.is-focused .el-select__input-wrapper) {
  display: flex;
  width: 100px;
  margin-left: 4px;
}

/* Show placeholder as the tag text */

/* Target the main content area */
:deep(.element-tag-select .el-select__selection) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex: 1;
  text-align: center !important;
}

/* Ensure proper layout */
:deep(.element-tag-select .el-select__wrapper .el-select__suffix) {
  position: static;
  right: auto;
  display: flex;
  align-items: center;
  margin-left: auto;
}

/* Also target any other selection containers */
:deep(.element-tag-select .el-select__wrapper .el-select__prefix) {
  position: static;
  left: auto;
  display: flex;
  align-items: center;
}
</style>

<style>
/* Global styles for the dropdown popper */
.element-tag-dropdown {
  z-index: 9999 !important;
}

.element-tag-dropdown .el-select-dropdown__item {
  padding: 6px 12px;
  font-size: 12px;
  line-height: 1.4;
}

.element-tag-dropdown .el-select-dropdown__item:hover {
  background-color: rgba(25, 118, 210, 0.1);
}

.element-tag-dropdown .el-select-dropdown__item.is-selected {
  background-color: rgba(25, 118, 210, 0.15);
  font-weight: 600;
}

/* Style the scrollbar for large lists */
.element-tag-dropdown .el-scrollbar__wrap {
  max-height: 300px;
}

.element-tag-dropdown .el-select-dropdown__empty {
  color: #999;
  font-style: italic;
  font-size: 11px;
}
</style>