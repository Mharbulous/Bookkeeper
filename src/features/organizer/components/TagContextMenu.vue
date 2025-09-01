<template>
  <v-menu
    v-model="showMenu"
    :activator="activatorElement"
    :position-x="menuPosition.x"
    :position-y="menuPosition.y"
    absolute
    offset-y
    class="tag-context-menu"
    min-width="200"
    max-width="300"
    close-on-click
    close-on-content-click
    @click:outside="handleClickOutside"
    @keydown.esc="closeMenu"
  >
    <v-card class="context-menu-card" elevation="8">
      <!-- Menu header with tag info -->
      <v-card-title class="text-subtitle-2 py-2 px-3 bg-surface-variant">
        <v-icon size="16" class="mr-2" :color="tagInfo.color">mdi-tag</v-icon>
        {{ tagInfo.tagName }}
        <v-spacer />
        <v-chip
          v-if="tagInfo.categoryName"
          size="x-small"
          variant="outlined"
          :color="tagInfo.color"
        >
          {{ tagInfo.categoryName }}
        </v-chip>
      </v-card-title>
      
      <v-list density="compact" nav class="py-0">
        <!-- Show in Folders option (primary action) -->
        <v-list-item
          v-if="canShowInFolders"
          prepend-icon="mdi-folder-search"
          title="Show in Folders"
          subtitle="Navigate to this tag in folder view"
          class="primary-action"
          @click="handleShowInFolders"
        >
          <template #append>
            <v-icon size="16" class="ml-2">mdi-arrow-right</v-icon>
          </template>
        </v-list-item>
        
        <v-divider v-if="canShowInFolders" />
        
        <!-- Filter by tag -->
        <v-list-item
          prepend-icon="mdi-filter"
          title="Filter by Tag"
          subtitle="Show only files with this tag"
          @click="handleFilterByTag"
        />
        
        <!-- Search similar tags -->
        <v-list-item
          v-if="tagInfo.tagName"
          prepend-icon="mdi-magnify"
          title="Search Similar Tags"
          :subtitle="`Find tags like '${tagInfo.tagName}'`"
          @click="handleSearchSimilar"
        />
        
        <v-divider />
        
        <!-- Tag actions (if editable) -->
        <v-list-item
          v-if="isEditable"
          prepend-icon="mdi-pencil"
          title="Edit Tag"
          subtitle="Modify tag name or category"
          @click="handleEditTag"
        />
        
        <!-- Copy tag name -->
        <v-list-item
          prepend-icon="mdi-content-copy"
          title="Copy Tag Name"
          subtitle="Copy to clipboard"
          @click="handleCopyTagName"
        />
        
        <!-- Tag statistics -->
        <v-list-item
          prepend-icon="mdi-chart-bar"
          title="Tag Statistics"
          subtitle="View usage across all files"
          @click="handleShowStatistics"
        />
        
        <!-- Remove from hierarchy (if in folder mode) -->
        <template v-if="isFolderMode && isInHierarchy">
          <v-divider />
          <v-list-item
            prepend-icon="mdi-folder-remove"
            title="Remove from Folders"
            subtitle="Remove category from folder hierarchy"
            class="text-warning"
            @click="handleRemoveFromHierarchy"
          />
        </template>
        
        <!-- AI-specific actions (if AI tag) -->
        <template v-if="tagInfo.source === 'ai'">
          <v-divider />
          
          <v-list-item
            v-if="tagInfo.status === 'pending'"
            prepend-icon="mdi-check"
            title="Approve AI Tag"
            subtitle="Accept AI suggestion"
            class="text-success"
            @click="handleApproveAI"
          />
          
          <v-list-item
            v-if="tagInfo.status === 'pending'"
            prepend-icon="mdi-close"
            title="Reject AI Tag"
            subtitle="Decline AI suggestion"
            class="text-error"
            @click="handleRejectAI"
          />
          
          <v-list-item
            v-if="tagInfo.confidence"
            prepend-icon="mdi-brain"
            :title="`Confidence: ${tagInfo.confidence}%`"
            :subtitle="tagInfo.reasoning || 'AI analysis'"
            disabled
          />
        </template>
      </v-list>
    </v-card>
  </v-menu>
</template>

<script setup>
import { computed, ref, nextTick, onMounted, onUnmounted } from 'vue';
import { useOrganizerStore } from '../stores/organizer.js';

// Props
const props = defineProps({
  // Tag information
  tagInfo: {
    type: Object,
    required: true,
    validator: (tag) => {
      return tag.tagName && typeof tag.tagName === 'string';
    }
  },
  
  // Evidence context (file the tag belongs to)
  evidence: {
    type: Object,
    default: () => ({})
  },
  
  // Whether tag can be edited
  isEditable: {
    type: Boolean,
    default: true
  },
  
  // Show advanced AI options
  showAIOptions: {
    type: Boolean,
    default: true
  }
});

// Emits
const emit = defineEmits([
  'show-in-folders',
  'filter-by-tag', 
  'search-similar',
  'edit-tag',
  'copy-tag',
  'show-statistics',
  'approve-ai',
  'reject-ai',
  'remove-from-hierarchy',
  'menu-opened',
  'menu-closed'
]);

// Store access
const organizerStore = useOrganizerStore();

// Reactive state
const showMenu = ref(false);
const activatorElement = ref(null);
const menuPosition = ref({ x: 0, y: 0 });

// Computed properties
const isFolderMode = computed(() => organizerStore.isFolderMode);
const folderHierarchy = computed(() => organizerStore.folderHierarchy || []);

const canShowInFolders = computed(() => {
  // Check if tag's category is in folder hierarchy or can be added
  return props.tagInfo.categoryId && 
         folderHierarchy.value.some(cat => cat.categoryId === props.tagInfo.categoryId);
});

const isInHierarchy = computed(() => {
  return props.tagInfo.categoryId &&
         folderHierarchy.value.some(cat => cat.categoryId === props.tagInfo.categoryId);
});

// Public methods
const openMenu = (event, element) => {
  event.preventDefault();
  event.stopPropagation();
  
  // Set activator element and position
  activatorElement.value = element || event.target;
  
  // Calculate menu position based on click/touch coordinates
  if (event.touches && event.touches[0]) {
    // Touch event
    menuPosition.value = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  } else {
    // Mouse event
    menuPosition.value = {
      x: event.clientX,
      y: event.clientY
    };
  }
  
  showMenu.value = true;
  emit('menu-opened', { tagInfo: props.tagInfo, position: menuPosition.value });
};

const closeMenu = () => {
  showMenu.value = false;
  emit('menu-closed');
};

// Menu action handlers
const handleShowInFolders = async () => {
  closeMenu();
  
  try {
    // Switch to folder mode if not already
    if (!isFolderMode.value) {
      organizerStore.setViewMode('folders');
    }
    
    // Navigate to the tag's folder
    const categoryId = props.tagInfo.categoryId;
    const tagName = props.tagInfo.tagName;
    
    if (categoryId && tagName) {
      // Ensure category is in hierarchy
      if (!isInHierarchy.value) {
        const category = organizerStore.getCategoryById(categoryId);
        if (category) {
          organizerStore.addToHierarchy({
            categoryId: category.categoryId,
            categoryName: category.categoryName,
            color: category.color
          });
        }
      }
      
      // Navigate to the specific folder
      organizerStore.navigateToFolder(categoryId, tagName);
    }
    
    emit('show-in-folders', {
      categoryId,
      tagName,
      tagInfo: props.tagInfo
    });
  } catch (error) {
    console.error('[TagContextMenu] Failed to show in folders:', error);
  }
};

const handleFilterByTag = () => {
  closeMenu();
  
  // Apply filter for this specific tag
  const filterQuery = `tag:"${props.tagInfo.tagName}"`;
  organizerStore.setFilter(filterQuery);
  
  emit('filter-by-tag', {
    tagName: props.tagInfo.tagName,
    categoryId: props.tagInfo.categoryId,
    filterQuery
  });
};

const handleSearchSimilar = () => {
  closeMenu();
  
  // Search for similar tag names
  const searchQuery = props.tagInfo.tagName;
  organizerStore.setFilter(searchQuery);
  
  emit('search-similar', {
    tagName: props.tagInfo.tagName,
    searchQuery
  });
};

const handleEditTag = () => {
  closeMenu();
  emit('edit-tag', props.tagInfo);
};

const handleCopyTagName = async () => {
  closeMenu();
  
  try {
    await navigator.clipboard.writeText(props.tagInfo.tagName);
    
    emit('copy-tag', {
      tagName: props.tagInfo.tagName,
      success: true
    });
  } catch (error) {
    console.error('[TagContextMenu] Failed to copy tag name:', error);
    
    emit('copy-tag', {
      tagName: props.tagInfo.tagName,
      success: false,
      error
    });
  }
};

const handleShowStatistics = () => {
  closeMenu();
  emit('show-statistics', props.tagInfo);
};

const handleRemoveFromHierarchy = () => {
  closeMenu();
  
  if (props.tagInfo.categoryId) {
    organizerStore.removeFromHierarchy(props.tagInfo.categoryId);
    
    emit('remove-from-hierarchy', {
      categoryId: props.tagInfo.categoryId,
      tagInfo: props.tagInfo
    });
  }
};

// AI-specific handlers
const handleApproveAI = () => {
  closeMenu();
  emit('approve-ai', props.tagInfo);
};

const handleRejectAI = () => {
  closeMenu();
  emit('reject-ai', props.tagInfo);
};

const handleClickOutside = () => {
  closeMenu();
};

// Keyboard handling
const handleGlobalKeydown = (event) => {
  if (showMenu.value && event.key === 'Escape') {
    closeMenu();
  }
};

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
});

// Expose public methods
defineExpose({
  openMenu,
  closeMenu,
  isOpen: computed(() => showMenu.value)
});
</script>

<style scoped>
.tag-context-menu {
  z-index: 2000;
}

.context-menu-card {
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  max-width: 320px;
}

.primary-action {
  background: rgba(var(--v-theme-primary), 0.05);
  border-left: 3px solid rgb(var(--v-theme-primary));
}

.primary-action:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}

.v-list-item {
  min-height: 40px;
  padding: 8px 16px;
}

.v-list-item .v-list-item__prepend {
  margin-right: 12px;
}

.v-list-item:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
}

/* Color-coded actions */
.text-success:hover {
  background: rgba(var(--v-theme-success), 0.1);
}

.text-error:hover {
  background: rgba(var(--v-theme-error), 0.1);
}

.text-warning:hover {
  background: rgba(var(--v-theme-warning), 0.1);
}

/* Disabled items styling */
.v-list-item--disabled {
  opacity: 0.6;
}

.v-list-item--disabled:hover {
  background: transparent;
}

/* Menu header styling */
.v-card-title {
  font-size: 0.9375rem;
  font-weight: 500;
  border-bottom: 1px solid rgba(var(--v-theme-outline), 0.1);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .context-menu-card {
    max-width: 280px;
  }
  
  .v-list-item {
    min-height: 44px; /* Larger touch targets */
  }
}

/* Accessibility improvements */
.v-list-item:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

/* Animation for smooth appearance */
.v-menu__content {
  animation: contextMenuSlide 0.15s ease-out;
}

@keyframes contextMenuSlide {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .context-menu-card {
    border-width: 2px;
  }
  
  .primary-action {
    border-left-width: 4px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .v-menu__content {
    animation: none;
  }
}
</style>