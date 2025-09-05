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
  const height = Math.min(300, filtered.value.length * 32 + 60);

  // Account for speech bubble tail extending outward (12px)
  showAbove.value = rect.bottom + height + 20 > window.innerHeight;

  const dropdownLeft = Math.min(rect.left, window.innerWidth - width - 10);

  // Calculate tail position to point toward tag center
  const tagCenterX = rect.left + rect.width / 2;
  const tailPositionX = Math.max(12, Math.min(width - 12, tagCenterX - dropdownLeft));

  return {
    position: 'fixed',
    left: `${dropdownLeft}px`,
    // FIX: Changed the offset from 8px to 12px to match the tail's height
    top: `${showAbove.value ? rect.top - height - 12 : rect.bottom + 12}px`,
    minWidth: `${rect.width}px`,
    '--arrow-left': `${tailPositionX}px`,
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

/* Dropdown - Speech Bubble Style */
.dropdown-options {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  box-shadow:
    0 15px 35px rgba(0, 0, 0, 0.15),
    0 5px 15px rgba(0, 0, 0, 0.08);
  padding: 2px 0;
  max-height: 300px;
  overflow-y: auto;
  z-index: 9999;
}

/* Comic Book Speech Bubble Tail */
.dropdown-options::before {
  content: '';
  position: absolute;
  left: var(--arrow-left, 50px);
  top: -12px;
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-bottom: 12px solid #e4e7ed;
  z-index: 99999;
  transform: translateX(-12px);
}

.dropdown-options::after {
  content: '';
  position: absolute;
  left: var(--arrow-left, 50px);
  top: -11px;
  width: 0;
  height: 0;
  border-left: 11px solid transparent;
  border-right: 11px solid transparent;
  border-bottom: 11px solid white;
  z-index: 99999;
  transform: translateX(-11px);
}

/* Tail for dropdown above tag */
.dropdown-options.above::before {
  top: 100%;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-bottom: none;
  border-top: 12px solid #e4e7ed;
}

.dropdown-options.above::after {
  top: calc(100% - 1px);
  border-left: 11px solid transparent;
  border-right: 11px solid transparent;
  border-bottom: none;
  border-top: 11px solid white;
}

/* Menu items */
.dropdown-menu {
  padding: 1px;
}

.dropdown-option {
  display: block;
  width: calc(100% - 16px);
  margin: 2px 2px;
  padding: 2px 2px;
  background: none;
  border: none;
  border-radius: 8px;
  text-align: left;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.dropdown-option:hover {
  background: rgba(25, 118, 210, 0.08);
  color: #1976d2;
  transform: translateX(2px);
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
