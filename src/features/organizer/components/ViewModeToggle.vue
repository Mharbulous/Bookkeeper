<template>
  <div class="view-mode-toggle">
    <!-- Enhanced 3-mode toggle: Flat List, Folder Grid, Folder Tree -->
    <v-btn-toggle v-model="viewMode" mandatory variant="outlined" divided class="enhanced-toggle">
      <v-btn value="list" size="small" class="toggle-btn" :disabled="loading">
        <v-icon size="16">mdi-view-list</v-icon>
        <v-tooltip activator="parent" location="bottom"> Flat List </v-tooltip>
      </v-btn>

      <v-btn value="grid" size="small" class="toggle-btn" :disabled="loading">
        <v-icon size="16">mdi-view-grid</v-icon>
        <v-tooltip activator="parent" location="bottom"> Folder Grid </v-tooltip>
      </v-btn>

      <v-btn value="tree" size="small" class="toggle-btn" :disabled="loading">
        <v-icon size="16">mdi-file-tree</v-icon>
        <v-tooltip activator="parent" location="bottom"> Folder Tree </v-tooltip>
      </v-btn>
    </v-btn-toggle>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

// Props
const props = defineProps({
  // Loading state
  loading: {
    type: Boolean,
    default: false,
  },

  // Compact mode for smaller spaces
  compact: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits(['view-mode-changed']);

// Local reactive state for the enhanced 3-mode toggle
const viewMode = ref('list'); // 'list', 'grid', or 'tree'

// Handle view mode changes
watch(viewMode, (newMode, oldMode) => {
  if (newMode !== oldMode) {
    // Save to localStorage for persistence
    localStorage.setItem('organizer-view-mode', newMode);

    emit('view-mode-changed', {
      mode: newMode,
      previous: oldMode,
    });
  }
});

// Initialize component using onMounted lifecycle hook
onMounted(() => {
  const savedViewMode = localStorage.getItem('organizer-view-mode');
  viewMode.value = savedViewMode || 'list';
});
</script>

<style scoped>
.view-mode-toggle {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.enhanced-toggle {
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

  .enhanced-toggle {
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
  .enhanced-toggle {
    width: 100%;
  }

  .enhanced-toggle .toggle-btn {
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

/* High contrast mode */
@media (prefers-contrast: high) {
  .toggle-btn {
    border-width: 2px;
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
