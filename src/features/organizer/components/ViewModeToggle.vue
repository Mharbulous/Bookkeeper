<template>
  <div class="view-mode-toggle">
    <!-- Primary toggle: Flat vs Folder view -->
    <v-btn-toggle
      v-model="primaryViewMode"
      mandatory
      variant="outlined"
      divided
      class="primary-toggle"
    >
      <v-btn 
        value="flat" 
        size="small"
        class="toggle-btn"
      >
        <v-icon size="16" class="mr-1">mdi-view-list</v-icon>
        Flat View
      </v-btn>
      
      <v-btn 
        value="folders" 
        size="small"
        class="toggle-btn"
      >
        <v-icon size="16" class="mr-1">mdi-folder-multiple</v-icon>
        Folder View
      </v-btn>
    </v-btn-toggle>
    
    <!-- Secondary toggle: List vs Grid layout within the view -->
    <v-btn-toggle
      v-model="secondaryDisplayMode"
      mandatory
      variant="outlined"
      divided
      class="secondary-toggle ml-3"
    >
      <v-btn 
        value="list" 
        size="small"
        class="toggle-btn"
        :disabled="loading"
      >
        <v-icon size="16">mdi-format-list-bulleted</v-icon>
        <v-tooltip activator="parent" location="bottom">
          List Layout
        </v-tooltip>
      </v-btn>
      
      <v-btn 
        value="grid" 
        size="small"
        class="toggle-btn"
        :disabled="loading"
      >
        <v-icon size="16">mdi-view-grid</v-icon>
        <v-tooltip activator="parent" location="bottom">
          Grid Layout
        </v-tooltip>
      </v-btn>
    </v-btn-toggle>
    
    <!-- View mode status indicator -->
    <div v-if="showStatusIndicator" class="view-status ml-3">
      <v-chip
        size="x-small"
        variant="tonal"
        :color="statusColor"
        class="status-chip"
      >
        <v-icon size="12" class="mr-1">{{ statusIcon }}</v-icon>
        {{ statusText }}
      </v-chip>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useOrganizerStore } from '../stores/organizer.js';

// Props
const props = defineProps({
  // Show status indicator chip
  showStatusIndicator: {
    type: Boolean,
    default: true
  },
  
  // Loading state
  loading: {
    type: Boolean,
    default: false
  },
  
  // Compact mode for smaller spaces
  compact: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits([
  'view-mode-changed',
  'display-mode-changed'
]);

// Store access
const organizerStore = useOrganizerStore();

// Local reactive state for toggles
const primaryViewMode = ref('flat'); // 'flat' or 'folders'
const secondaryDisplayMode = ref('list'); // 'list' or 'grid'

// Computed properties
const isFolderMode = computed(() => organizerStore.isFolderMode);
const currentPath = computed(() => organizerStore.currentPath);
const folderHierarchy = computed(() => organizerStore.folderHierarchy);

// Status indicator computed properties
const statusColor = computed(() => {
  if (primaryViewMode.value === 'folders') {
    return currentPath.value.length > 0 ? 'primary' : 'info';
  }
  return 'default';
});

const statusIcon = computed(() => {
  if (primaryViewMode.value === 'folders') {
    return currentPath.value.length > 0 ? 'mdi-folder-open' : 'mdi-folder-home';
  }
  return 'mdi-view-list';
});

const statusText = computed(() => {
  if (primaryViewMode.value === 'folders') {
    if (currentPath.value.length === 0) {
      return 'All folders';
    }
    const depth = currentPath.value.length;
    return `Level ${depth}`;
  }
  return 'Flat view';
});

// Initialize from store state
const initializeFromStore = () => {
  primaryViewMode.value = organizerStore.viewMode || 'flat';
  // TODO: Initialize secondary display mode from store or localStorage
  const savedDisplayMode = localStorage.getItem('organizer-display-mode');
  secondaryDisplayMode.value = savedDisplayMode || 'list';
};

// Handle primary view mode changes
watch(primaryViewMode, (newMode, oldMode) => {
  if (newMode !== oldMode) {
    organizerStore.setViewMode(newMode);
    emit('view-mode-changed', {
      mode: newMode,
      previous: oldMode
    });
  }
}, { immediate: false });

// Handle secondary display mode changes
watch(secondaryDisplayMode, (newMode, oldMode) => {
  if (newMode !== oldMode) {
    // Save to localStorage for persistence
    localStorage.setItem('organizer-display-mode', newMode);
    
    emit('display-mode-changed', {
      mode: newMode,
      previous: oldMode
    });
  }
}, { immediate: false });

// Watch for store changes to sync local state
watch(
  () => organizerStore.viewMode,
  (storeMode) => {
    if (storeMode !== primaryViewMode.value) {
      primaryViewMode.value = storeMode;
    }
  },
  { immediate: true }
);

// Initialize component
initializeFromStore();
</script>

<style scoped>
.view-mode-toggle {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.primary-toggle,
.secondary-toggle {
  flex-shrink: 0;
}

.toggle-btn {
  text-transform: none;
  letter-spacing: normal;
  font-weight: 500;
}

.toggle-btn .v-icon {
  transition: transform 0.2s ease-in-out;
}

.toggle-btn:hover .v-icon {
  transform: scale(1.1);
}

.view-status {
  flex-shrink: 0;
}

.status-chip {
  font-size: 0.75rem;
  font-weight: 500;
}

/* Compact mode */
.view-mode-toggle.compact {
  gap: 8px;
}

.view-mode-toggle.compact .toggle-btn {
  min-width: auto;
  padding: 0 8px;
}

.view-mode-toggle.compact .toggle-btn .v-icon {
  margin-right: 4px;
}

/* Responsive design */
@media (max-width: 768px) {
  .view-mode-toggle {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .secondary-toggle {
    margin-left: 0 !important;
  }
  
  .view-status {
    align-self: center;
    margin-left: 0 !important;
  }
}

@media (max-width: 480px) {
  .toggle-btn {
    font-size: 0.8125rem;
    padding: 0 8px;
  }
  
  .toggle-btn .v-icon {
    margin-right: 2px;
  }
  
  /* Stack toggles vertically on very small screens */
  .primary-toggle,
  .secondary-toggle {
    width: 100%;
  }
  
  .primary-toggle .toggle-btn,
  .secondary-toggle .toggle-btn {
    flex: 1;
  }
}

/* Focus and accessibility */
.toggle-btn:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

/* Animation for smooth transitions */
.view-mode-toggle * {
  transition: all 0.2s ease-in-out;
}

/* Loading state */
.view-mode-toggle--loading .toggle-btn {
  opacity: 0.6;
  pointer-events: none;
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .toggle-btn {
    border-width: 2px;
  }
  
  .status-chip {
    border: 1px solid currentColor;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .toggle-btn .v-icon,
  .view-mode-toggle *,
  .toggle-btn:hover .v-icon {
    transition: none;
    transform: none;
  }
}
</style>