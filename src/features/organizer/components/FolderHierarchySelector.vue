<template>
  <div class="folder-hierarchy-selector">
    <v-card 
      v-if="showSelector" 
      class="hierarchy-card elevation-2"
      rounded="lg"
    >
      <v-card-title class="text-h6 pb-2">
        <v-icon size="20" class="mr-2">mdi-file-tree</v-icon>
        Configure Folder Hierarchy
        
        <v-spacer />
        
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="closeSelector"
        />
      </v-card-title>
      
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Drag categories to reorder how your files are organized in folder view.
          The first category becomes the top-level folders.
        </p>
        
        <!-- Hierarchy List -->
        <div class="hierarchy-list">
          <div class="draggable-list">
            <div
              v-for="(category, index) in hierarchyItems"
              :key="category.categoryId"
              class="hierarchy-item"
              :class="{ 'hierarchy-item--first': index === 0 }"
              tabindex="0"
              @keydown="handleItemKeydown($event, index)"
            >
                <!-- Order indicator -->
                <v-icon 
                  class="order-indicator mr-3" 
                  size="20"
                >
                  mdi-menu
                </v-icon>
                
                <!-- Category info -->
                <div class="category-info flex-grow-1">
                  <div class="category-name">
                    {{ category.categoryName }}
                  </div>
                  <div class="category-meta">
                    <v-chip
                      size="x-small"
                      variant="outlined"
                      :color="getCategoryColor(category.categoryId)"
                      class="mr-2"
                    >
                      {{ getCategoryTagCount(category.categoryId) }} tags
                    </v-chip>
                    
                    <span v-if="index === 0" class="text-caption text-primary">
                      Top-level folders
                    </span>
                    <span v-else class="text-caption text-medium-emphasis">
                      Level {{ index + 1 }}
                    </span>
                  </div>
                </div>
                
                <!-- Move buttons -->
                <div class="move-buttons">
                  <v-btn
                    :disabled="index === 0"
                    icon="mdi-chevron-up"
                    variant="text"
                    size="small"
                    @click="moveUp(index)"
                  />
                  <v-btn
                    :disabled="index === hierarchyItems.length - 1"
                    icon="mdi-chevron-down"
                    variant="text"
                    size="small"
                    @click="moveDown(index)"
                  />
                </div>
                
                <!-- Remove button -->
                <v-btn
                  icon="mdi-close"
                  variant="text"
                  size="small"
                  color="error"
                  @click="removeFromHierarchy(index)"
                />
              </div>
            </div>
          </div>
          
          <!-- Empty state -->
          <div v-if="hierarchyItems.length === 0" class="empty-hierarchy">
            <v-icon size="48" class="text-medium-emphasis mb-2">mdi-folder-plus-outline</v-icon>
            <p class="text-body-2 text-medium-emphasis">
              No categories in hierarchy. Add categories below to create folder structure.
            </p>
          </div>
        </div>
        
        <!-- Available Categories -->
        <div v-if="availableCategories.length > 0" class="available-categories mt-4">
          <v-divider class="mb-4" />
          
          <h4 class="text-subtitle-2 mb-2">Available Categories</h4>
          <p class="text-caption text-medium-emphasis mb-3">
            Click to add categories to your folder hierarchy:
          </p>
          
          <div class="category-chips">
            <v-chip
              v-for="category in availableCategories"
              :key="category.categoryId"
              :color="getCategoryColor(category.categoryId)"
              variant="outlined"
              size="small"
              clickable
              class="ma-1"
              @click="addToHierarchy(category)"
            >
              <v-icon size="16" class="mr-1">mdi-plus</v-icon>
              {{ category.categoryName }}
            </v-chip>
          </div>
        </div>
      </v-card-text>
      
      <v-card-actions>
        <v-btn
          color="primary"
          variant="text"
          @click="saveHierarchy"
        >
          <v-icon size="16" class="mr-1">mdi-content-save</v-icon>
          Save Hierarchy
        </v-btn>
        
        <v-btn
          variant="text"
          @click="resetToDefault"
        >
          Reset to Default
        </v-btn>
        
        <v-spacer />
        
        <v-btn
          variant="outlined"
          @click="closeSelector"
        >
          Cancel
        </v-btn>
      </v-card-actions>
    </v-card>
    
    <!-- Trigger Button -->
    <v-btn
      v-if="!showSelector && isFolderMode"
      :disabled="loading"
      color="primary"
      variant="outlined"
      size="small"
      class="hierarchy-trigger"
      @click="openSelector"
    >
      <v-icon size="16" class="mr-1">mdi-cog</v-icon>
      Configure Folders
    </v-btn>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useOrganizerStore } from '../stores/organizer.js';
import { getAutomaticTagColor } from '../utils/automaticTagColors.js';
// Note: Using move buttons instead of drag-and-drop since vuedraggable is not installed

// Props
const props = defineProps({
  // Show selector initially
  initiallyOpen: {
    type: Boolean,
    default: false
  },
  
  // Compact mode for smaller spaces
  compact: {
    type: Boolean,
    default: false
  },
  
  // Auto-save changes
  autoSave: {
    type: Boolean,
    default: true
  }
});

// Emits
const emit = defineEmits([
  'hierarchy-changed',
  'hierarchy-saved',
  'selector-opened',
  'selector-closed'
]);

// Store and reactive state
const organizerStore = useOrganizerStore();
const showSelector = ref(props.initiallyOpen);
const hierarchyItems = ref([]);
const loading = ref(false);
// Using button-based reordering instead of drag and drop

// Computed properties
const isFolderMode = computed(() => organizerStore.isFolderMode);
const allCategories = computed(() => organizerStore.categories || []);
const currentHierarchy = computed(() => organizerStore.folderHierarchy || []);

/**
 * Get categories not currently in hierarchy (available to add)
 */
const availableCategories = computed(() => {
  const hierarchyIds = new Set(hierarchyItems.value.map(item => item.categoryId));
  return allCategories.value.filter(cat => !hierarchyIds.has(cat.categoryId));
});

/**
 * Get tag count for a category
 */
const getCategoryTagCount = (categoryId) => {
  // This would need to be implemented based on how tags are counted per category
  // For now, return a placeholder
  return '?';
};

/**
 * Get automatic color for a category by its ID
 */
const getCategoryColor = (categoryId) => {
  const categoryIndex = allCategories.value.findIndex(cat => cat.categoryId === categoryId);
  return getAutomaticTagColor(categoryIndex >= 0 ? categoryIndex : 0);
};

// Event handlers
const openSelector = async () => {
  showSelector.value = true;
  loading.value = true;
  
  try {
    // Load current hierarchy into local state
    hierarchyItems.value = [...currentHierarchy.value];
    emit('selector-opened');
  } catch (error) {
    console.error('[FolderHierarchySelector] Failed to open:', error);
  } finally {
    loading.value = false;
  }
};

const closeSelector = () => {
  showSelector.value = false;
  emit('selector-closed');
};

const handleHierarchyChange = (event) => {
  emit('hierarchy-changed', {
    event,
    hierarchy: hierarchyItems.value
  });
  
  if (props.autoSave) {
    saveHierarchy();
  }
};

const addToHierarchy = (category) => {
  hierarchyItems.value.push({
    categoryId: category.categoryId,
    categoryName: category.categoryName
  });
  
  emit('hierarchy-changed', {
    event: { added: { element: category } },
    hierarchy: hierarchyItems.value
  });
  
  if (props.autoSave) {
    saveHierarchy();
  }
};

const removeFromHierarchy = (index) => {
  const removed = hierarchyItems.value.splice(index, 1)[0];
  
  emit('hierarchy-changed', {
    event: { removed: { element: removed } },
    hierarchy: hierarchyItems.value
  });
  
  if (props.autoSave) {
    saveHierarchy();
  }
};

const moveUp = (index) => {
  if (index > 0) {
    const item = hierarchyItems.value.splice(index, 1)[0];
    hierarchyItems.value.splice(index - 1, 0, item);
    
    emit('hierarchy-changed', {
      event: { moved: { oldIndex: index, newIndex: index - 1 } },
      hierarchy: hierarchyItems.value
    });
    
    if (props.autoSave) {
      saveHierarchy();
    }
  }
};

const moveDown = (index) => {
  if (index < hierarchyItems.value.length - 1) {
    const item = hierarchyItems.value.splice(index, 1)[0];
    hierarchyItems.value.splice(index + 1, 0, item);
    
    emit('hierarchy-changed', {
      event: { moved: { oldIndex: index, newIndex: index + 1 } },
      hierarchy: hierarchyItems.value
    });
    
    if (props.autoSave) {
      saveHierarchy();
    }
  }
};

const saveHierarchy = async () => {
  try {
    loading.value = true;
    
    // Save to store
    organizerStore.setFolderHierarchy(hierarchyItems.value);
    
    // Save to localStorage for persistence
    localStorage.setItem('organizer-folder-hierarchy', JSON.stringify(hierarchyItems.value));
    
    emit('hierarchy-saved', hierarchyItems.value);
    
    // Auto-close if not in auto-save mode
    if (!props.autoSave) {
      closeSelector();
    }
  } catch (error) {
    console.error('[FolderHierarchySelector] Failed to save hierarchy:', error);
  } finally {
    loading.value = false;
  }
};

const resetToDefault = () => {
  // Reset to first 2-3 categories as default hierarchy
  const defaultHierarchy = allCategories.value.slice(0, 3).map(cat => ({
    categoryId: cat.categoryId,
    categoryName: cat.categoryName,
    color: cat.color
  }));
  
  hierarchyItems.value = defaultHierarchy;
  
  if (props.autoSave) {
    saveHierarchy();
  }
};

const loadSavedHierarchy = () => {
  try {
    const saved = localStorage.getItem('organizer-folder-hierarchy');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Filter to only include categories that still exist
        const validHierarchy = parsed.filter(item => 
          allCategories.value.find(cat => cat.categoryId === item.categoryId)
        );
        
        if (validHierarchy.length > 0) {
          hierarchyItems.value = validHierarchy;
          organizerStore.setFolderHierarchy(validHierarchy);
        }
      }
    }
  } catch (error) {
    console.error('[FolderHierarchySelector] Failed to load saved hierarchy:', error);
  }
};

// Keyboard navigation
const handleItemKeydown = (event, index) => {
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        moveUp(index);
      } else {
        // Focus previous item
        focusItem(index - 1);
      }
      break;
      
    case 'ArrowDown':
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        moveDown(index);
      } else {
        // Focus next item
        focusItem(index + 1);
      }
      break;
      
    case 'Delete':
    case 'Backspace':
      event.preventDefault();
      removeFromHierarchy(index);
      break;
      
    case 'Escape':
      closeSelector();
      break;
  }
};

const focusItem = (index) => {
  if (index >= 0 && index < hierarchyItems.value.length) {
    nextTick(() => {
      const items = document.querySelectorAll('.hierarchy-item');
      if (items[index]) {
        items[index].focus();
      }
    });
  }
};

// Note: Drag functionality removed - using move buttons instead

// Lifecycle hooks
onMounted(() => {
  loadSavedHierarchy();
});

onUnmounted(() => {
  // Cleanup if needed
});
</script>

<style scoped>
.folder-hierarchy-selector {
  position: relative;
}

.hierarchy-card {
  max-width: 600px;
  margin: 16px 0;
}

.hierarchy-trigger {
  text-transform: none;
}

/* Hierarchy list styles */
.hierarchy-list {
  min-height: 100px;
  position: relative;
}

.draggable-list {
  gap: 8px;
  display: flex;
  flex-direction: column;
}

.hierarchy-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(var(--v-theme-surface), 1);
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  border-radius: 8px;
  transition: all 0.2s ease-in-out;
  cursor: default;
}

.hierarchy-item:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  background: rgba(var(--v-theme-primary), 0.02);
}

.hierarchy-item:focus {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.hierarchy-item--first {
  border-color: rgba(var(--v-theme-primary), 0.5);
  background: rgba(var(--v-theme-primary), 0.05);
}

.hierarchy-item--ghost {
  opacity: 0.5;
  transform: rotate(2deg);
}

.hierarchy-item--drag {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transform: rotate(-2deg);
}

.order-indicator {
  opacity: 0.6;
}

.category-info {
  min-width: 0; /* Allow text to truncate */
}

.category-name {
  font-weight: 500;
  font-size: 0.9375rem;
  margin-bottom: 4px;
}

.category-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.move-buttons {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0 8px;
}

/* Empty state */
.empty-hierarchy {
  text-align: center;
  padding: 40px 20px;
  border: 2px dashed rgba(var(--v-theme-outline), 0.3);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface-variant), 0.5);
}

/* Available categories */
.available-categories {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
  padding: 16px;
}

.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* Responsive design */
@media (max-width: 768px) {
  .hierarchy-card {
    max-width: none;
    margin: 8px 0;
  }
  
  .hierarchy-item {
    padding: 8px;
  }
  
  .move-buttons {
    flex-direction: row;
    margin: 0 4px;
  }
  
  .category-name {
    font-size: 0.875rem;
  }
}

@media (max-width: 480px) {
  .move-buttons {
    display: none; /* Use drag-only on very small screens */
  }
  
  .order-indicator {
    opacity: 1;
  }
}

/* Compact mode */
.folder-hierarchy-selector.compact .hierarchy-card {
  max-width: 400px;
}

.folder-hierarchy-selector.compact .hierarchy-item {
  padding: 8px;
}

.folder-hierarchy-selector.compact .category-name {
  font-size: 0.875rem;
}

/* Animation for smooth transitions */
.hierarchy-list .flip-list-move,
.hierarchy-list .flip-list-enter-active,
.hierarchy-list .flip-list-leave-active {
  transition: all 0.3s ease;
}

.hierarchy-list .flip-list-enter-from,
.hierarchy-list .flip-list-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .hierarchy-item,
  .drag-handle,
  .flip-list-move,
  .flip-list-enter-active,
  .flip-list-leave-active {
    transition: none;
  }
}

@media (prefers-contrast: high) {
  .hierarchy-item {
    border-width: 2px;
  }
  
  .hierarchy-item--first {
    border-width: 3px;
  }
}
</style>