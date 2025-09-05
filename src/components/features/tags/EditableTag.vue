<template>
  <div
    :data-tag-id="tag.id"
    class="smart-tag"
    :class="{ expanded: tag.isOpen, editing: tag.isHeaderEditing }"
    :style="{ borderColor: tagColor, color: tagColor }"
    ref="tagElement"
  >
    <!-- Single transforming button -->
    <button
      class="tag-button"
      :class="{ 'no-options': tag.isOpen && !hasOptions }"
      @click="handleTagClick"
      @keydown="handleTypeToFilter"
      @blur="handleTagBlur"
      ref="tagButton"
    >
      <i class="tag-icon mdi mdi-tag"></i>
      <span class="tag-text" :data-cursor="cursorPosition">
        {{ tag.filterText || tag.tagName }}
      </span>
    </button>

    <!-- Teleported dropdown -->
    <Teleport to="body">
      <div
        v-show="tag.isOpen && hasOptions"
        class="dropdown-options"
        :class="{ 'show-above': dropdownShowAbove }"
        :style="dropdownStyle"
        ref="dropdownElement"
      >
        <div class="dropdown-menu" :data-tag-id="tag.id">
          <!-- Simple display for small lists -->
          <template v-if="!needsPagination">
            <button
              v-for="option in filteredOptions"
              :key="option.id"
              class="dropdown-option"
              @click="selectFromDropdown(option.tagName)"
            >
              {{ option.tagName }}
            </button>
          </template>

          <!-- Paginated display -->
          <template v-else>
            <!-- Page radio buttons -->
            <input
              v-for="page in totalPages"
              :key="page"
              type="radio"
              :name="`page-${tag.id}`"
              :id="`page${page}-${tag.id}`"
              :checked="page === 1"
              class="page-radio"
            />

            <!-- Page content -->
            <div v-for="page in totalPages" :key="page" :data-page="page" class="page-content">
              <button
                v-for="option in getPageOptions(page)"
                :key="option.id"
                class="dropdown-option"
                @click="selectFromDropdown(option.tagName)"
              >
                {{ option.tagName }}
              </button>

              <!-- Navigation -->
              <label :for="getNextPageId(page)" class="dropdown-nav">
                {{ getNavLabel(page) }}
              </label>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { useTagEditing } from './composables/useTagEditing.js';

const ITEMS_PER_PAGE = 12;
const SIMPLE_LIST_MAX = 13;

// Props & Emits
const props = defineProps({
  tag: { type: Object, required: true },
  categoryOptions: { type: Array, default: () => [] },
  allowCustomInput: { type: Boolean, default: true },
  tagColor: { type: String, default: '#1976d2' },
});

const emit = defineEmits(['tag-updated', 'tag-selected', 'tag-created']);

// Template refs
const tagElement = ref(null);
const dropdownElement = ref(null);

// Use composable
const { handleTagClick, handleTagBlur, handleTypeToFilter, selectFromDropdown } = useTagEditing(
  props.tag,
  props.allowCustomInput,
  emit
);

// Computed properties
const filteredOptions = computed(() => {
  if (!props.tag.filterText) return props.categoryOptions;

  const filter = props.tag.filterText.toLowerCase();
  return props.categoryOptions.filter((option) => option.tagName.toLowerCase().startsWith(filter));
});

const hasOptions = computed(() => filteredOptions.value.length > 0);
const needsPagination = computed(() => filteredOptions.value.length > SIMPLE_LIST_MAX);
const totalPages = computed(() => Math.ceil(filteredOptions.value.length / ITEMS_PER_PAGE));

const cursorPosition = computed(() => {
  if (!props.tag.isHeaderEditing) return null;
  return props.tag.hasStartedTyping ? 'right' : 'left';
});

// Pagination helpers
const getPageOptions = (page) => {
  const start = (page - 1) * ITEMS_PER_PAGE;
  return filteredOptions.value.slice(start, start + ITEMS_PER_PAGE);
};

const getNextPageId = (page) => {
  const next = page < totalPages.value ? page + 1 : 1;
  return `page${next}-${props.tag.id}`;
};

const getNavLabel = (page) => {
  if (page < totalPages.value) {
    const remaining = filteredOptions.value.length - page * ITEMS_PER_PAGE;
    return `...${remaining} more`;
  }
  return '...restart';
};

// Dropdown positioning
const dropdownShowAbove = ref(false);
const dropdownStyle = computed(() => {
  const pos = calculateDropdownPosition();
  return {
    position: 'fixed',
    left: `${pos.left}px`,
    top: `${pos.top}px`,
    minWidth: `${pos.minWidth}px`,
    '--arrow-left': `${pos.arrowLeft}px`,
  };
});

const calculateDropdownPosition = () => {
  if (!tagElement.value) return { left: 0, top: 0, minWidth: 200, arrowLeft: 20 };

  const rect = tagElement.value.getBoundingClientRect();
  const estimatedWidth = Math.max(200, rect.width);
  const estimatedHeight = Math.min(300, filteredOptions.value.length * 32 + 50);

  let left = Math.min(rect.left, window.innerWidth - estimatedWidth - 10);
  let top = rect.bottom + 8;

  // Check if should show above
  if (top + estimatedHeight > window.innerHeight) {
    top = rect.top - estimatedHeight - 8;
    dropdownShowAbove.value = true;
  } else {
    dropdownShowAbove.value = false;
  }

  const arrowLeft = rect.left + rect.width / 2 - left;

  return {
    left,
    top,
    minWidth: rect.width,
    arrowLeft: Math.max(8, Math.min(estimatedWidth - 16, arrowLeft)),
  };
};

// Event handlers
const handleOutsideClick = (e) => {
  if (!props.tag.isOpen) return;

  const clickedInside =
    tagElement.value?.contains(e.target) || dropdownElement.value?.contains(e.target);

  if (!clickedInside) {
    Object.assign(props.tag, {
      isOpen: false,
      isHeaderEditing: false,
      filterText: '',
      hasStartedTyping: false,
    });
  }
};

// Watchers
watch(
  () => props.tag.isOpen,
  async (isOpen) => {
    if (isOpen) {
      await nextTick();
      dropdownStyle.value; // Trigger recompute
    }
  }
);

// Lifecycle
onMounted(() => {
  const events = [
    ['click', handleOutsideClick, false],
    ['scroll', () => dropdownStyle.value, true],
    ['resize', () => dropdownStyle.value, false],
  ];

  events.forEach(([event, handler, capture]) => {
    window.addEventListener(event, handler, capture);
  });

  onUnmounted(() => {
    events.forEach(([event, handler, capture]) => {
      window.removeEventListener(event, handler, capture);
    });
  });
});
</script>

<style scoped>
/* Core tag styles */
.smart-tag {
  position: relative;
  display: inline-block;
  vertical-align: top;
  margin: 4px;
}

.tag-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid;
  border-color: inherit;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  outline: none;
}

.smart-tag:not(.expanded) .tag-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.smart-tag.expanded .tag-button {
  border-radius: 12px 12px 0 0;
  padding: 6px 10px;
  background: white;
  border-bottom: none;
}

.smart-tag.expanded .tag-button.no-options {
  border-bottom: 1px solid;
  border-radius: 12px;
}

.tag-icon {
  font-size: 14px;
  transition: content 0.2s;
}

.smart-tag:hover .tag-icon::before {
  content: '\F064F'; /* mdi-pencil */
}

/* Cursor animation */
.tag-text[data-cursor]::before,
.tag-text[data-cursor]::after {
  content: '|';
  animation: blink 1s infinite;
}

.tag-text[data-cursor='left']::after {
  display: none;
}
.tag-text[data-cursor='right']::before {
  display: none;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

/* Dropdown styles */
.dropdown-options {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow:
    0 10px 25px rgba(0, 0, 0, 0.1),
    0 4px 10px rgba(0, 0, 0, 0.06);
  padding: 8px 0;
  max-height: 300px;
  overflow-y: auto;
  z-index: 9999;
}

/* Speech bubble arrow */
.dropdown-options::before,
.dropdown-options::after {
  content: '';
  position: absolute;
  left: var(--arrow-left, 20px);
  transform: translateX(-8px);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
}

.dropdown-options::before {
  top: -8px;
  border-bottom: 8px solid #e4e7ed;
}

.dropdown-options::after {
  top: -7px;
  border-bottom: 8px solid white;
}

.dropdown-options.show-above::before {
  top: 100%;
  border-bottom: none;
  border-top: 8px solid #e4e7ed;
}

.dropdown-options.show-above::after {
  top: calc(100% + 1px);
  border-bottom: none;
  border-top: 8px solid white;
}

/* Dropdown content */
.dropdown-menu {
  border-top: 1px solid #e4e7ed;
  margin-top: 4px;
  padding-top: 8px;
}

.dropdown-option,
.dropdown-nav {
  display: block;
  width: calc(100% - 8px);
  margin: 2px 4px;
  padding: 6px 12px;
  background: none;
  border: none;
  border-radius: 6px;
  text-align: left;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
  outline: none;
}

.dropdown-nav {
  text-align: center;
  color: #909399;
  font-style: italic;
  border-top: 1px solid #e4e7ed;
  margin-top: 4px;
}

.dropdown-option:hover,
.dropdown-option:focus,
.dropdown-nav:hover,
.dropdown-nav:focus {
  background-color: rgba(25, 118, 210, 0.1);
  color: #1976d2;
}

.dropdown-option:focus,
.dropdown-nav:focus {
  outline: 2px solid rgba(25, 118, 210, 0.3);
  outline-offset: -2px;
}

/* Pagination - Dynamic CSS using data attributes */
.page-radio {
  display: none;
}

.page-content {
  display: none;
}

/* Show first page by default */
.page-content[data-page='1'] {
  display: block;
}

/* Dynamic page switching for up to 10 pages */
@container (min-width: 0px) {
  .page-radio:checked ~ .page-content {
    display: none;
  }

  .page-radio:nth-of-type(1):checked ~ .page-content[data-page='1'],
  .page-radio:nth-of-type(2):checked ~ .page-content[data-page='2'],
  .page-radio:nth-of-type(3):checked ~ .page-content[data-page='3'],
  .page-radio:nth-of-type(4):checked ~ .page-content[data-page='4'],
  .page-radio:nth-of-type(5):checked ~ .page-content[data-page='5'],
  .page-radio:nth-of-type(6):checked ~ .page-content[data-page='6'],
  .page-radio:nth-of-type(7):checked ~ .page-content[data-page='7'],
  .page-radio:nth-of-type(8):checked ~ .page-content[data-page='8'],
  .page-radio:nth-of-type(9):checked ~ .page-content[data-page='9'],
  .page-radio:nth-of-type(10):checked ~ .page-content[data-page='10'] {
    display: block;
  }
}

/* Fallback for browsers without @container */
@supports not (container-type: inline-size) {
  .page-radio:nth-of-type(1):checked ~ .page-content[data-page='1'],
  .page-radio:nth-of-type(2):checked ~ .page-content[data-page='2'],
  .page-radio:nth-of-type(3):checked ~ .page-content[data-page='3'],
  .page-radio:nth-of-type(4):checked ~ .page-content[data-page='4'],
  .page-radio:nth-of-type(5):checked ~ .page-content[data-page='5'] {
    display: block;
  }

  .page-radio:nth-of-type(1):checked ~ .page-content:not([data-page='1']),
  .page-radio:nth-of-type(2):checked ~ .page-content:not([data-page='2']),
  .page-radio:nth-of-type(3):checked ~ .page-content:not([data-page='3']),
  .page-radio:nth-of-type(4):checked ~ .page-content:not([data-page='4']),
  .page-radio:nth-of-type(5):checked ~ .page-content:not([data-page='5']) {
    display: none;
  }
}

/* Scrollbar styling */
.dropdown-options::-webkit-scrollbar {
  width: 6px;
}

.dropdown-options::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.dropdown-options::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
  transition: background 0.2s;
}

.dropdown-options::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
