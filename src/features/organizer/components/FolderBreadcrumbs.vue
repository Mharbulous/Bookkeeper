<template>
  <div class="folder-breadcrumbs">
    <v-breadcrumbs
      v-if="isFolderMode && (breadcrumbItems.length > 0 || showRootCrumb)"
      :items="breadcrumbItems"
      :class="{ 'breadcrumbs-collapsed': isCollapsed }"
      class="folder-breadcrumbs__main pa-0"
      density="compact"
    >
      <!-- Custom root breadcrumb -->
      <template v-slot:prepend>
        <v-btn
          :class="{ 'text-primary': isAtRoot }"
          variant="text"
          size="small"
          class="root-breadcrumb"
          @click="handleNavigateToRoot"
        >
          <v-icon size="16" class="mr-1">mdi-folder-home</v-icon>
          All Files
        </v-btn>
        <v-icon v-if="breadcrumbItems.length > 0" size="16" class="mx-1">mdi-chevron-right</v-icon>
      </template>

      <!-- Custom breadcrumb item template -->
      <template v-slot:item="{ item, index }">
        <v-btn
          :class="{ 'text-primary': item.disabled }"
          variant="text"
          size="small"
          :disabled="item.disabled"
          class="breadcrumb-item"
          @click="item.href ? handleNavigateToDepth(item.depth) : null"
        >
          <v-icon v-if="item.icon" size="16" class="mr-1">{{ item.icon }}</v-icon>
          {{ item.title }}
        </v-btn>
      </template>

      <!-- Custom divider -->
      <template v-slot:divider>
        <v-icon size="16" class="breadcrumb-divider">mdi-chevron-right</v-icon>
      </template>
    </v-breadcrumbs>

    <!-- Collapse toggle button for small screens -->
    <v-btn
      v-if="canCollapse && breadcrumbItems.length > maxVisibleItems"
      variant="text"
      size="small"
      icon
      class="collapse-toggle"
      @click="toggleCollapsed"
    >
      <v-icon>{{ isCollapsed ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
    </v-btn>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useOrganizerStore } from '../stores/organizer.js';

// Props
const props = defineProps({
  // Maximum breadcrumb items before collapsing (responsive)
  maxVisibleItems: {
    type: Number,
    default: 3
  },
  
  // Show root crumb even when at root level
  showRootCrumb: {
    type: Boolean,
    default: true
  },
  
  // Enable responsive collapsing behavior
  responsive: {
    type: Boolean,
    default: true
  }
});

// Emits
const emit = defineEmits([
  'navigate-to-root',
  'navigate-to-depth'
]);

// Store and reactive state
const organizerStore = useOrganizerStore();
const isCollapsed = ref(false);
const screenWidth = ref(window?.innerWidth || 1024);

// Computed properties
const isFolderMode = computed(() => organizerStore.isFolderMode);
const isAtRoot = computed(() => organizerStore.isAtRoot);
const breadcrumbPath = computed(() => organizerStore.breadcrumbPath);
const currentPath = computed(() => organizerStore.currentPath);

/**
 * Generate breadcrumb items from current folder path
 */
const breadcrumbItems = computed(() => {
  if (!breadcrumbPath.value?.length) return [];
  
  const items = breadcrumbPath.value.map((pathItem, index) => ({
    title: pathItem.tagName,
    href: !pathItem.isLast,
    disabled: pathItem.isLast,
    depth: pathItem.depth,
    icon: 'mdi-folder',
    categoryName: pathItem.categoryName,
    categoryId: pathItem.categoryId
  }));

  // Apply collapsing logic for responsive design
  if (isCollapsed.value && items.length > props.maxVisibleItems) {
    const visibleItems = props.maxVisibleItems - 1; // Reserve space for ellipsis
    const firstItems = items.slice(0, 1); // Always show first
    const lastItems = items.slice(-visibleItems + 1); // Show last N-1 items
    
    if (items.length > visibleItems) {
      return [
        ...firstItems,
        {
          title: '...',
          href: false,
          disabled: true,
          depth: -1,
          icon: 'mdi-dots-horizontal',
          isEllipsis: true
        },
        ...lastItems
      ];
    }
  }

  return items;
});

/**
 * Check if breadcrumbs can be collapsed (has enough items and responsive enabled)
 */
const canCollapse = computed(() => {
  return props.responsive && 
         breadcrumbPath.value.length > props.maxVisibleItems && 
         screenWidth.value < 768; // Mobile breakpoint
});

/**
 * Check if breadcrumbs should be collapsed automatically
 */
const shouldAutoCollapse = computed(() => {
  return canCollapse.value && breadcrumbPath.value.length > props.maxVisibleItems;
});

// Navigation handlers
const handleNavigateToRoot = () => {
  organizerStore.navigateToRoot();
  emit('navigate-to-root');
};

const handleNavigateToDepth = (depth) => {
  if (depth >= 0) {
    organizerStore.navigateToDepth(depth);
    emit('navigate-to-depth', depth);
  }
};

const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value;
};

// Responsive behavior
const handleResize = () => {
  screenWidth.value = window.innerWidth;
  
  // Auto-collapse on small screens
  if (shouldAutoCollapse.value) {
    isCollapsed.value = true;
  } else if (screenWidth.value >= 768) {
    isCollapsed.value = false;
  }
};

// Lifecycle hooks
onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize);
  }
});
</script>

<style scoped>
.folder-breadcrumbs {
  display: flex;
  align-items: center;
  min-height: 36px;
  width: 100%;
  flex-wrap: wrap;
  gap: 4px;
}

.folder-breadcrumbs__main {
  flex: 1;
  min-width: 0; /* Allow shrinking */
}

.root-breadcrumb {
  font-weight: 500;
  text-transform: none;
  letter-spacing: normal;
}

.breadcrumb-item {
  font-weight: 400;
  text-transform: none;
  letter-spacing: normal;
  max-width: 200px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.breadcrumb-item:not(.v-btn--disabled):hover {
  background-color: rgba(var(--v-theme-on-surface), 0.08);
}

.breadcrumb-divider {
  opacity: 0.6;
}

.collapse-toggle {
  flex-shrink: 0;
  margin-left: 8px;
}

/* Collapsed state styling */
.breadcrumbs-collapsed .breadcrumb-item {
  max-width: 120px;
}

/* Responsive design */
@media (max-width: 768px) {
  .folder-breadcrumbs {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .folder-breadcrumbs__main {
    order: 2;
  }
  
  .collapse-toggle {
    order: 1;
    align-self: flex-end;
    margin-left: 0;
  }

  .breadcrumb-item {
    max-width: 100px;
    font-size: 0.875rem;
  }
}

@media (max-width: 480px) {
  .breadcrumb-item {
    max-width: 80px;
    font-size: 0.8125rem;
  }
}

/* High contrast and accessibility */
@media (prefers-contrast: high) {
  .breadcrumb-divider {
    opacity: 1;
  }
  
  .root-breadcrumb,
  .breadcrumb-item {
    border: 1px solid transparent;
  }
  
  .root-breadcrumb:focus,
  .breadcrumb-item:focus {
    border-color: currentColor;
  }
}

/* Animation for collapse toggle */
.collapse-toggle .v-icon {
  transition: transform 0.2s ease-in-out;
}

/* Focus and keyboard navigation styles */
.root-breadcrumb:focus-visible,
.breadcrumb-item:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

/* Loading state (if needed) */
.folder-breadcrumbs--loading .breadcrumb-item {
  opacity: 0.6;
  pointer-events: none;
}
</style>