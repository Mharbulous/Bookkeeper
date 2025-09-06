<template>
  <div
    ref="tagEl"
    :data-tag-id="tag.id"
    class="smart-tag"
    :class="{ expanded: tag.isOpen, editing: tag.isHeaderEditing }"
    :style="{ borderColor: tagColor, color: tagColor }"
  >
    <button
      class="tag-button"
      :class="{ 'no-options': tag.isOpen && !hasOptions }"
      @click="handleTagClick"
      @keydown="handleTypeToFilter"
      @blur="handleTagBlur"
    >
      <i class="tag-icon mdi" :class="iconClass" />
      <span class="tag-text" :data-cursor="cursorPos">
        {{ tag.filterText || tag.tagName }}
      </span>
    </button>

    <Teleport to="body">
      <div
        v-show="tag.isOpen && hasOptions"
        ref="dropdownEl"
        class="dropdown-options"
        :style="dropdownStyle"
      >
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
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watchEffect } from 'vue';
import { useTagEditing } from './composables/useTagEditing.js';

const props = defineProps({
  tag: { type: Object, required: true },
  categoryOptions: { type: Array, default: () => [] },
  isOpenCategory: { type: Boolean, default: true },
  tagColor: { type: String, default: '#1976d2' },
});

const emit = defineEmits(['tag-updated', 'tag-selected', 'tag-created']);

const tagEl = ref(null);
const dropdownEl = ref(null);
const dropdownPos = ref({});

const { handleTagClick, handleTagBlur, handleTypeToFilter, selectFromDropdown } = useTagEditing(
  props.tag,
  props.isOpenCategory,
  props.categoryOptions,
  emit
);

const filtered = computed(() => {
  if (!props.tag.filterText) return props.categoryOptions;
  const filter = props.tag.filterText.toLowerCase();
  return props.categoryOptions.filter((o) => o.tagName.toLowerCase().startsWith(filter));
});

const hasOptions = computed(() => filtered.value.length > 0);

const cursorPos = computed(() =>
  props.tag.isHeaderEditing ? (props.tag.hasStartedTyping ? 'right' : 'left') : null
);

const iconClass = computed(() =>
  props.tag.isHeaderEditing ? (props.isOpenCategory ? 'mdi-pencil' : 'mdi-lock') : 'mdi-tag'
);

const dropdownStyle = computed(() => dropdownPos.value);

const updateDropdownPos = () => {
  if (!tagEl.value) return;

  const rect = tagEl.value.getBoundingClientRect();
  const dropHeight = Math.min(300, filtered.value.length * 30);
  const flipUp =
    window.innerHeight - rect.bottom < dropHeight && rect.top > window.innerHeight - rect.bottom;

  dropdownPos.value = {
    position: 'fixed',
    left: `${Math.min(rect.left, window.innerWidth - Math.max(200, rect.width) - 10)}px`,
    minWidth: `${rect.width}px`,
    ...(flipUp
      ? { bottom: `${window.innerHeight - rect.top + 3}px` }
      : { top: `${rect.bottom + 3}px` }),
  };
};

const closeTag = () => {
  Object.assign(props.tag, {
    isOpen: false,
    isHeaderEditing: false,
    filterText: '',
    hasStartedTyping: false,
  });
};

const handleOutside = (e) => {
  if (
    props.tag.isOpen &&
    !tagEl.value?.contains(e.target) &&
    !dropdownEl.value?.contains(e.target)
  ) {
    closeTag();
  }
};

watchEffect(() => {
  if (props.tag.isOpen) updateDropdownPos();
});

onMounted(() => {
  const events = [
    ['click', handleOutside],
    ['scroll', updateDropdownPos, true],
    ['resize', updateDropdownPos],
  ];

  events.forEach(([evt, fn, cap]) => window.addEventListener(evt, fn, cap));

  onUnmounted(() => events.forEach(([evt, fn, cap]) => window.removeEventListener(evt, fn, cap)));
});
</script>

<style scoped>
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
  outline: none;
}

.smart-tag.editing .tag-button {
  cursor: text;
}

.tag-icon {
  font-size: 14px;
}

.tag-text[data-cursor] {
  position: relative;
}

.tag-text[data-cursor]::before,
.tag-text[data-cursor]::after {
  content: '|';
  position: absolute;
  animation: blink 1s infinite;
  top: 0;
}

.tag-text[data-cursor]::before {
  left: -2px;
}
.tag-text[data-cursor]::after {
  right: -2px;
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

.dropdown-options {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  overflow-y: auto;
  z-index: 9999;
}

.dropdown-option {
  display: block;
  width: 100%;
  padding: 6px 12px;
  background: none;
  border: none;
  text-align: left;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
}

.dropdown-option:hover {
  background: rgba(25, 118, 210, 0.1);
  color: #1976d2;
}

.dropdown-options::-webkit-scrollbar {
  width: 6px;
}

.dropdown-options::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}
</style>
