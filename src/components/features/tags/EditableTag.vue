<template>
  <div 
    :data-tag-id="tag.id"
    class="smart-tag ma-1"
    :class="{ 
      'expanded': tag.isOpen, 
      'editing': tag.isHeaderEditing 
    }"
    :style="{ borderColor: tagColor, color: tagColor }"
    ref="tagElement"
  >
    <!-- Single transforming button -->
    <button
      class="tag-button"
      @click="handleTagClick"
      @keydown="handleTypeToFilter"
      @blur="handleTagBlur"
      :class="{ 
        'no-options': tag.isOpen && filteredOptions.length === 0 
      }"
      :tabindex="0"
      ref="tagButton"
    >
      <i class="tag-icon mdi mdi-tag"></i>
      <span 
        class="tag-text"
        :class="{ 
          'cursor-left': tag.isHeaderEditing && !tag.hasStartedTyping,
          'cursor-right': tag.isHeaderEditing && tag.hasStartedTyping 
        }"
      >
        {{ tag.filterText || tag.tagName }}
      </span>
    </button>
    
    <!-- Options appear below expanded button - teleported to body to escape stacking contexts -->
    <Teleport to="body">
      <div 
        class="dropdown-options" 
        v-show="tag.isOpen && filteredOptions.length > 0"
        :style="dropdownPosition"
        ref="dropdownElement"
      >
        <div class="dropdown-menu">
          <!-- Simple display for categories with 13 or fewer items -->
          <template v-if="filteredOptions.length <= 13">
            <button
              v-for="option in filteredOptions"
              :key="option.id"
              class="dropdown-option"
              tabindex="0"
              @click="selectFromDropdown(option.tagName)"
            >
              {{ option.tagName }}
            </button>
          </template>

          <!-- Pagination for categories with more than 13 items -->
          <template v-else>
            <!-- CSS-only pagination with radio buttons for proper multi-page support -->
            <input
              v-for="pageNum in Math.ceil(filteredOptions.length / 12)"
              :key="pageNum"
              type="radio"
              :name="`page-${tag.id}`"
              :id="`page${pageNum}-${tag.id}`"
              class="page-radio"
              :checked="pageNum === 1"
            />

            <!-- Generate pages dynamically -->
            <div
              v-for="pageNum in Math.ceil(filteredOptions.length / 12)"
              :key="pageNum"
              :class="`page-content page-${pageNum}`"
            >
              <!-- Show 12 items for this page -->
              <button
                v-for="option in filteredOptions.slice((pageNum - 1) * 12, pageNum * 12)"
                :key="option.id"
                class="dropdown-option"
                tabindex="0"
                @click="selectFromDropdown(option.tagName)"
              >
                {{ option.tagName }}
              </button>

              <!-- Next page button (if not the last page) -->
              <label
                v-if="pageNum < Math.ceil(filteredOptions.length / 12)"
                :for="`page${pageNum + 1}-${tag.id}`"
                class="dropdown-ellipses dropdown-pagination"
                tabindex="0"
              >
                ...{{ filteredOptions.length - pageNum * 12 }} more
              </label>

              <!-- Restart button (only on the last page) -->
              <label
                v-if="pageNum === Math.ceil(filteredOptions.length / 12)"
                :for="`page1-${tag.id}`"
                class="dropdown-ellipses dropdown-pagination restart-button"
                tabindex="0"
              >
                ...restart
              </label>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useTagEditing } from './composables/useTagEditing.js'

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
  allowCustomInput: {
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
const tagElement = ref(null)
const dropdownElement = ref(null)

// Use composable for tag editing logic
const {
  handleTagClick,
  handleTagBlur,
  handleTypeToFilter,
  selectFromDropdown,
  resetPaginationState
} = useTagEditing(props.tag, props.allowCustomInput, emit)

// Computed properties
const filteredOptions = computed(() => {
  if (!props.tag.filterText) return props.categoryOptions
  
  return props.categoryOptions.filter(option => 
    option.tagName.toLowerCase().startsWith(props.tag.filterText.toLowerCase())
  )
})

// Position the teleported dropdown
const dropdownPosition = ref({})

const updateDropdownPosition = async () => {
  if (!props.tag.isOpen || !tagElement.value) return
  
  await nextTick()
  
  const tagRect = tagElement.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Calculate position relative to viewport
  let left = tagRect.left
  let top = tagRect.bottom - 5 // Slightly overlap with tag
  
  // Adjust if dropdown would go off screen horizontally
  const estimatedWidth = Math.max(200, tagRect.width)
  if (left + estimatedWidth > viewportWidth) {
    left = viewportWidth - estimatedWidth - 10
  }
  
  // Adjust if dropdown would go off screen vertically
  const estimatedHeight = Math.min(300, filteredOptions.value.length * 32 + 50)
  if (top + estimatedHeight > viewportHeight) {
    top = tagRect.top - estimatedHeight - 5 // Show above instead
  }
  
  dropdownPosition.value = {
    position: 'fixed',
    left: `${left}px`,
    top: `${top}px`,
    minWidth: `${tagRect.width}px`,
    zIndex: 9999
  }
}

// Update position when dropdown opens or options change
watch(() => props.tag.isOpen, (isOpen) => {
  if (isOpen) {
    updateDropdownPosition()
  }
})

watch(() => filteredOptions.value.length, () => {
  if (props.tag.isOpen) {
    updateDropdownPosition()
  }
})

// Handle clicks outside the teleported dropdown
const handleGlobalClick = (event) => {
  if (!props.tag.isOpen) return
  
  const isClickOnTag = tagElement.value && tagElement.value.contains(event.target)
  const isClickOnDropdown = dropdownElement.value && dropdownElement.value.contains(event.target)
  
  if (!isClickOnTag && !isClickOnDropdown) {
    // Close dropdown and reset state
    props.tag.isOpen = false
    props.tag.isHeaderEditing = false
    props.tag.filterText = ''
    props.tag.hasStartedTyping = false
  }
}

// Handle scroll to reposition dropdown
const handleScroll = () => {
  if (props.tag.isOpen) {
    updateDropdownPosition()
  }
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick)
  window.addEventListener('scroll', handleScroll, true) // Use capture phase
  window.addEventListener('resize', handleScroll)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
  window.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('resize', handleScroll)
})
</script>

<style scoped>
/* Smart tag implementation - single element transformation */
.smart-tag {
  position: relative;
  display: inline-block;
  vertical-align: top;
}

/* Tag button - transforms from compact to expanded */
.tag-button {
  border: 1px solid;
  border-color: inherit;
  border-radius: 12px;
  background-color: transparent;
  transition: all 0.2s ease-in-out;
  display: inline-block;
  position: relative;
  z-index: 1;
}

/* Compact state hover */
.smart-tag:not(.expanded) .tag-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Base button styling */
.tag-button {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background: none;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  width: 100%;
  outline: none;
}

/* Expanded state - becomes pill header */
.smart-tag.expanded .tag-button {
  border-radius: 12px 12px 0 0;
  padding: 6px 10px;
  background: white;
  border: 1px solid;
  border-color: inherit;
  border-bottom: none;
  transform: none;
}

/* Dropdown options container - now teleported to body */
.dropdown-options {
  background: white;
  border: 1px solid #ccc;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  padding-top: 5px;
  max-height: 300px;
  overflow-y: auto;
}

/* Also hide pill header bottom border when no options */
.smart-tag.expanded .tag-button.no-options {
  border-bottom: 1px solid;
  border-color: inherit;
  border-radius: 12px;
}

.tag-icon {
  margin-right: 4px;
  font-size: 14px;
  transition: all 0.2s ease-in-out;
}

/* Transform tag icon to pencil on hover */
.smart-tag:hover .tag-icon::before {
  content: '\F064F'; /* mdi-pencil icon code */
}

.tag-text {
  flex: 1;
}

.dropdown-menu {
  border-top: 1px solid #eee;
  margin-top: 4px;
  padding-top: 4px;
}

.dropdown-option {
  display: block;
  width: 100%;
  padding: 4px 8px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 12px;
  border-radius: 4px;
  margin: 1px 0;
  outline: none;
}

.dropdown-option:hover,
.dropdown-option:focus {
  background-color: rgba(25, 118, 210, 0.1);
  outline: 2px solid rgba(25, 118, 210, 0.5);
  outline-offset: -2px;
}

.dropdown-option:active {
  background-color: rgba(25, 118, 210, 0.2);
}

.dropdown-option:last-child {
  margin-bottom: 4px;
}

/* CSS-only pagination */
.page-radio {
  display: none;
}

.page-content {
  display: none;
}

/* Show page 1 by default and when page1 radio is checked */
.dropdown-menu .page-1 {
  display: block;
}

.dropdown-menu .page-content:not(.page-1) {
  display: none;
}

/* Dynamic page switching for any page number */
input[id*='page1']:checked ~ .page-1 {
  display: block;
}
input[id*='page1']:checked ~ .page-content:not(.page-1) {
  display: none;
}

input[id*='page2']:checked ~ .page-2 {
  display: block;
}
input[id*='page2']:checked ~ .page-content:not(.page-2) {
  display: none;
}

input[id*='page3']:checked ~ .page-3 {
  display: block;
}
input[id*='page3']:checked ~ .page-content:not(.page-3) {
  display: none;
}

input[id*='page4']:checked ~ .page-4 {
  display: block;
}
input[id*='page4']:checked ~ .page-content:not(.page-4) {
  display: none;
}

input[id*='page5']:checked ~ .page-5 {
  display: block;
}
input[id*='page5']:checked ~ .page-content:not(.page-5) {
  display: none;
}

input[id*='page6']:checked ~ .page-6 {
  display: block;
}
input[id*='page6']:checked ~ .page-content:not(.page-6) {
  display: none;
}

input[id*='page7']:checked ~ .page-7 {
  display: block;
}
input[id*='page7']:checked ~ .page-content:not(.page-7) {
  display: none;
}

.dropdown-ellipses {
  padding: 4px 8px;
  font-size: 11px;
  color: #666;
  font-style: italic;
  text-align: center;
  border-top: 1px solid #eee;
  margin-top: 2px;
  margin-bottom: 4px;
  white-space: nowrap;
  min-width: 80px;
  width: 100%;
  box-sizing: border-box;
}

.dropdown-pagination {
  cursor: pointer;
  transition: background-color 0.2s;
  outline: none;
}

.dropdown-pagination:hover {
  background-color: rgba(25, 118, 210, 0.05);
}

.dropdown-pagination:focus {
  background-color: rgba(25, 118, 210, 0.1);
  outline: 2px solid rgba(25, 118, 210, 0.5);
  outline-offset: -2px;
}

/* Flashing cursor for editing mode */
.tag-text.cursor-left::before {
  content: '|';
  animation: cursor-blink 1s infinite;
  margin-right: 1px;
  font-weight: normal;
}

.tag-text.cursor-right::after {
  content: '|';
  animation: cursor-blink 1s infinite;
  margin-left: 1px;
  font-weight: normal;
}

@keyframes cursor-blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

/* Note: Teleport solution eliminates need for overflow rules */
</style>