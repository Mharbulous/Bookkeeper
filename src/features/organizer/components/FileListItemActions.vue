<template>
  <div v-if="showActions" class="file-actions">
    <!-- AI Processing Button (if enabled) -->
    <button
      v-if="isAIEnabled && !readonly"
      class="action-btn"
      :class="{ disabled: actionLoading || aiProcessing, processing: aiProcessing }"
      :disabled="actionLoading || aiProcessing"
      :title="'Process with AI'"
      @click.stop="handleProcessWithAI"
    >
      <span class="action-icon">🤖</span>
      <span v-if="aiProcessing" class="processing-spinner">⟳</span>
    </button>
    
    <button
      class="action-btn"
      :class="{ disabled: actionLoading }"
      :disabled="actionLoading"
      :title="'Download'"
      @click.stop="handleDownload"
    >
      <span class="action-icon">⬇️</span>
    </button>
    
    <!-- Simplified dropdown menu -->
    <div class="action-dropdown">
      <button
        class="action-btn dropdown-toggle"
        :class="{ disabled: actionLoading, open: dropdownOpen }"
        :disabled="actionLoading"
        :title="'More actions'"
        @click.stop="toggleDropdown"
      >
        <span class="action-icon">⋮</span>
      </button>
      
      <div v-if="dropdownOpen" class="dropdown-menu" @click.stop>
        <div class="dropdown-item" @click="handleRename">
          <span class="dropdown-icon">✏️</span>
          Rename
        </div>
        <div class="dropdown-item" @click="handleViewDetails">
          <span class="dropdown-icon">ℹ️</span>
          Details
        </div>
        <div v-if="!readonly" class="dropdown-separator"></div>
        <div 
          v-if="!readonly"
          class="dropdown-item dropdown-item--danger" 
          @click="handleDelete"
        >
          <span class="dropdown-icon">🗑️</span>
          Delete
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeMount, ref, onUnmounted } from 'vue';

// Debug logging helper
const debugLog = (message, data = null) => {
  const timestamp = new Date().toISOString().substring(11, 23);
  console.log(`[${timestamp}] [FileListItemActions] ${message}`, data || '');
};

// Performance tracking
const renderStart = performance.now();
let setupComplete = null;
let beforeMountTime = null;

// Props
const props = defineProps({
  // Evidence/file data for actions
  evidence: {
    type: Object,
    required: true,
  },
  
  // Display options
  readonly: {
    type: Boolean,
    default: false,
  },
  showActions: {
    type: Boolean,
    default: true,
  },
  
  // Loading states
  actionLoading: {
    type: Boolean,
    default: false,
  },
  aiProcessing: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits([
  'download',
  'rename',
  'view-details',
  'delete',
  'process-with-ai',
]);

// Check if AI features are enabled
const isAIEnabled = computed(() => {
  return import.meta.env.VITE_ENABLE_AI_FEATURES === 'true';
});

// Dropdown state management
const dropdownOpen = ref(false);

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value;
};

const closeDropdown = () => {
  dropdownOpen.value = false;
};

// Close dropdown when clicking outside
const handleClickOutside = (event) => {
  if (dropdownOpen.value && !event.target.closest('.action-dropdown')) {
    closeDropdown();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Event handlers
const handleProcessWithAI = () => {
  emit('process-with-ai', props.evidence);
};

const handleDownload = () => {
  emit('download', props.evidence);
};

const handleRename = () => {
  closeDropdown();
  emit('rename', props.evidence);
};

const handleViewDetails = () => {
  closeDropdown();
  emit('view-details', props.evidence);
};

const handleDelete = () => {
  closeDropdown();
  emit('delete', props.evidence);
};

// Performance tracking - mark setup completion
setupComplete = performance.now();

// Lifecycle performance tracking (disabled - optimization complete)
onBeforeMount(() => {
  beforeMountTime = performance.now();
  // Performance tracking disabled - optimization complete
});

onMounted(() => {
  // Performance tracking disabled - optimization complete
});
</script>

<style scoped>
.file-actions {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

/* Custom action buttons - much lighter than Vuetify v-btn */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  padding: 0;
}

.action-btn:hover:not(.disabled) {
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.action-btn:active:not(.disabled) {
  background: rgba(var(--v-theme-on-surface), 0.12);
  transform: scale(0.95);
}

.action-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-icon {
  font-size: 16px;
  line-height: 1;
}

.processing-spinner {
  position: absolute;
  font-size: 12px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Dropdown styles - much lighter than v-menu */
.action-dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 140px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  padding: 4px 0;
  margin-top: 4px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1.2;
  color: rgba(var(--v-theme-on-surface), 0.87);
  transition: background-color 0.15s ease;
}

.dropdown-item:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
}

.dropdown-item--danger {
  color: rgb(var(--v-theme-error));
}

.dropdown-item--danger:hover {
  background: rgba(var(--v-theme-error), 0.08);
}

.dropdown-icon {
  font-size: 14px;
  margin-right: 8px;
  width: 16px;
  text-align: center;
}

.dropdown-separator {
  height: 1px;
  background: rgba(var(--v-theme-outline), 0.2);
  margin: 4px 0;
}

/* Responsive design */
@media (max-width: 768px) {
  .file-actions {
    align-self: stretch;
    justify-content: flex-end;
  }
  
  .dropdown-menu {
    right: 0;
    left: auto;
  }
}
</style>