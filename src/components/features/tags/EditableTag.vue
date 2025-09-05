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
      <i class="tag-icon mdi mdi-tag"></i>
      <span class="tag-text" :data-cursor="cursorPosition">
        {{ tag.filterText || tag.tagName }}
      </span>
    </button>

    <Teleport to="body">
      <div
        v-show="tag.isOpen && hasOptions"
        class="dropdown-options"
        :class="{ above: showAbove }"
        :style="dropdownStyle"
        ref="dropdownEl"
      >
        <div class="dropdown-menu">
          <button
            v-for="opt in filtered"
            :key="opt.id"
            class="dropdown-option"
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
  allowCustomInput: { type: Boolean, default: true },
  tagColor: { type: String, default: '#1976d2' },
});

const emit = defineEmits(['tag-updated', 'tag-selected', 'tag-created']);

// Refs
const tagEl = ref(null);
const dropdownEl = ref(null);
const showAbove = ref(false);

// Composable
const { handleTagClick, handleTagBlur, handleTypeToFilter, selectFromDropdown } = useTagEditing(
  props.tag,
  props.allowCustomInput,
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

const dropdownStyle = computed(() => {
  if (!tagEl.value) return {};

  const rect = tagEl.value.getBoundingClientRect();
  const width = Math.max(200, rect.width);
  const height = Math.min(300, filtered.value.length * 32 + 50);

  showAbove.value = rect.bottom + height + 16 > window.innerHeight;

  return {
    position: 'fixed',
    left: `${Math.min(rect.left, window.innerWidth - width - 10)}px`,
    top: `${showAbove.value ? rect.top - height - 8 : rect.bottom + 8}px`,
    minWidth: `${rect.width}px`,
    '--arrow-left': `${Math.max(8, Math.min(width - 16, rect.left + rect.width / 2 - Math.min(rect.left, window.innerWidth - width - 10)))}px`,
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
  const listeners = [
    ['click', handleOutside],
    ['scroll', () => dropdownStyle.value, true],
    ['resize', () => dropdownStyle.value],
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
  position: relative;
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
  transition: all 0.2s;
  outline: none;
}

.smart-tag:not(.expanded) .tag-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.smart-tag.expanded .tag-button {
  border-radius: 12px;
  padding: 4px 8px;
  background: transparent;
}


.tag-icon {
  font-size: 14px;
}

.smart-tag:hover .tag-icon::before {
  content: '\F064F';
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

/* Dropdown */
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

/* Arrow */
.dropdown-options::before,
.dropdown-options::after {
  content: '';
  position: absolute;
  left: var(--arrow-left, 20px);
  transform: translateX(-8px);
  width: 0;
  height: 0;
  border: 8px solid transparent;
}

.dropdown-options::before {
  top: -8px;
  border-bottom-color: #e4e7ed;
}

.dropdown-options::after {
  top: -7px;
  border-bottom-color: white;
}

.dropdown-options.above::before {
  top: 100%;
  border-bottom-color: transparent;
  border-top-color: #e4e7ed;
}

.dropdown-options.above::after {
  top: calc(100% + 1px);
  border-bottom-color: transparent;
  border-top-color: white;
}

/* Menu items */
.dropdown-menu {
  border-top: 1px solid #e4e7ed;
  margin-top: 4px;
  padding-top: 8px;
}

.dropdown-option {
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
}

.dropdown-option:hover {
  background: rgba(25, 118, 210, 0.1);
  color: #1976d2;
}

/* Scrollbar */
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
}

.dropdown-options::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
