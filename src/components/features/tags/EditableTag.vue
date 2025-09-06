<template>
  <div
    :data-tag-id="tag.id"
    class="smart-tag"
    :class="{ expanded: tag.isOpen, editing: tag.isHeaderEditing }"
    :style="{ borderColor: tagColor, color: tagColor }"
    ref="tagEl"
  >
    <button
      class="tag-button"
      :class="{ 'no-options': tag.isOpen && !hasOptions }"
      @click="handleTagClick"
      @keydown="handleTypeToFilter"
      @blur="handleTagBlur"
    >
      <i class="tag-icon mdi" :class="iconClass"></i>
      <span class="tag-text" :data-cursor="cursorPosition">
        {{ tag.filterText || tag.tagName }}
      </span>
    </button>

    <Teleport to="body">
      <div
        v-show="tag.isOpen && hasOptions"
        class="dropdown-options"
        :style="dropdownStyle"
        ref="dropdownEl"
      >
        <div class="dropdown-menu">
          <button
            v-for="opt in filtered"
            :key="opt.id"
            class="dropdown-option"
            :class="{ selected: opt.tagName === tag.tagName }"
            :style="opt.tagName === tag.tagName ? { color: tagColor, fontWeight: 'bold' } : {}"
            @click="selectFromDropdown(opt.tagName)"
          >
            {{ opt.tagName }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useTagEditing } from './composables/useTagEditing.js';

const props = defineProps({
  tag: { type: Object, required: true },
  categoryOptions: { type: Array, default: () => [] },
  isOpenCategory: { type: Boolean, default: true },
  tagColor: { type: String, default: '#1976d2' },
});

const emit = defineEmits(['tag-updated', 'tag-selected', 'tag-created']);

// Refs
const tagEl = ref(null);
const dropdownEl = ref(null);
const forceRecalc = ref(0); // Force reactivity on viewport changes

// Composable
const { handleTagClick, handleTagBlur, handleTypeToFilter, selectFromDropdown } = useTagEditing(
  props.tag,
  props.isOpenCategory,
  props.categoryOptions,
  emit
);

// Computed
const filtered = computed(() => {
  if (!props.tag.filterText) return props.categoryOptions;
  const filter = props.tag.filterText.toLowerCase();
  return props.categoryOptions.filter((o) => o.tagName.toLowerCase().startsWith(filter));
});

const hasOptions = computed(() => filtered.value.length > 0);

const cursorPosition = computed(() =>
  props.tag.isHeaderEditing ? (props.tag.hasStartedTyping ? 'right' : 'left') : null
);

const iconClass = computed(() => {
  // Show different icons when user is typing (isHeaderEditing)
  if (props.tag.isHeaderEditing) {
    return props.isOpenCategory ? 'mdi-pencil' : 'mdi-lock';
  }
  // Default tag icon when not editing
  return 'mdi-tag';
});

const dropdownStyle = computed(() => {
  if (!tagEl.value) return {};

  // Include forceRecalc in computation to trigger recalculation on viewport changes
  forceRecalc.value; // eslint-disable-line no-unused-expressions

  const rect = tagEl.value.getBoundingClientRect();
  const dropdownLeft = Math.min(rect.left, window.innerWidth - Math.max(200, rect.width) - 10);

  return {
    position: 'fixed',
    left: `${dropdownLeft}px`,
    top: `${rect.bottom + 3}px`,
    minWidth: `${rect.width}px`,
  };
});

// Methods
const closeTag = () => {
  Object.assign(props.tag, {
    isOpen: false,
    isHeaderEditing: false,
    filterText: '',
    hasStartedTyping: false,
  });
};

// Event handling
const handleOutside = (e) => {
  if (
    props.tag.isOpen &&
    !tagEl.value?.contains(e.target) &&
    !dropdownEl.value?.contains(e.target)
  ) {
    closeTag();
  }
};

// Lifecycle
onMounted(() => {
  const handleResize = () => {
    forceRecalc.value++; // Trigger dropdown position recalculation
  };

  const handleScroll = () => {
    forceRecalc.value++; // Trigger dropdown position recalculation
  };

  const listeners = [
    ['click', handleOutside],
    ['scroll', handleScroll, true],
    ['resize', handleResize],
  ];

  listeners.forEach(([event, handler, capture]) =>
    window.addEventListener(event, handler, capture)
  );

  onUnmounted(() =>
    listeners.forEach(([event, handler, capture]) =>
      window.removeEventListener(event, handler, capture)
    )
  );
});
</script>

<style scoped>
/* Core tag */
.smart-tag {
  display: inline-block;
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
  outline: none; /* Remove browser focus outline */
}

/* Change cursor to text when tag is in editing mode */
.smart-tag.editing .tag-button {
  cursor: text;
}

.tag-button:focus {
  outline: none; /* Ensure no outline on focus */
}

.tag-icon {
  font-size: 14px;
}

/* Removed hover effect - icon will change based on typing state instead */

/* Cursor animation - communicates text is being edited */
.tag-text[data-cursor]::before,
.tag-text[data-cursor]::after {
  content: '|';
  position: absolute;
  animation: blink 1s infinite;
  top: 0;
}

.tag-text[data-cursor]::before {
  left: -2px; /* Position cursor to the left of text */
}

.tag-text[data-cursor]::after {
  right: -2px; /* Position cursor to the right of text */
}

.tag-text[data-cursor='left']::after {
  display: none;
}
.tag-text[data-cursor='right']::before {
  display: none;
}

/* Ensure text container can position cursor absolutely */
.tag-text[data-cursor] {
  position: relative;
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

/* Dropdown */
.dropdown-options {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 0;
  max-height: 300px;
  overflow-y: auto;
  z-index: 9999;
}

/* Menu items */
.dropdown-option {
  display: block;
  width: 100%;
  padding: 6px 12px;
  background: none;
  border: none;
  border-radius: 0;
  text-align: left;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
}

/* Hover state - communicates selection */
.dropdown-option:hover {
  background: rgba(25, 118, 210, 0.1);
  color: #1976d2;
  border-radius: 0;
}

/* Basic scrollbar for overflow content */
.dropdown-options::-webkit-scrollbar {
  width: 6px;
}

.dropdown-options::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}
</style>
