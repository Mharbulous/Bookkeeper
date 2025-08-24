import { ref, computed } from 'vue'

/**
 * Composable for managing lazy loading state of file list items
 * Tracks which items have been loaded based on group and file index
 * Optimized for large file lists with efficient Set-based storage
 */
export function useLazyFileList(groupedFiles) {
  // Track loaded items using Set for O(1) lookup performance
  const loadedItems = ref(new Set())
  
  // Track loading progress for optional progress indicators
  const totalItemsCount = computed(() => {
    if (!groupedFiles?.value) return 0
    return groupedFiles.value.reduce((total, group) => total + group.files.length, 0)
  })
  
  const loadedItemsCount = computed(() => {
    return loadedItems.value.size
  })
  
  // Generate unique key for group/file combination
  const getItemKey = (groupIndex, fileIndex) => {
    return `${groupIndex}-${fileIndex}`
  }
  
  // Load an item (called when placeholder intersects viewport)
  const loadItem = (groupIndex, fileIndex) => {
    const key = getItemKey(groupIndex, fileIndex)
    loadedItems.value.add(key)
  }
  
  // Check if an item is loaded
  const isItemLoaded = (groupIndex, fileIndex) => {
    const key = getItemKey(groupIndex, fileIndex)
    return loadedItems.value.has(key)
  }
  
  // Reset all loaded items (useful when file list changes)
  const resetLoadedItems = () => {
    loadedItems.value.clear()
  }
  
  // Preload visible items (optional optimization for initial viewport)
  const preloadInitialItems = (count = 10) => {
    if (!groupedFiles?.value) return
    
    let loaded = 0
    for (let groupIndex = 0; groupIndex < groupedFiles.value.length && loaded < count; groupIndex++) {
      const group = groupedFiles.value[groupIndex]
      for (let fileIndex = 0; fileIndex < group.files.length && loaded < count; fileIndex++) {
        loadItem(groupIndex, fileIndex)
        loaded++
      }
    }
  }
  
  // Check if lazy loading is in progress
  const isLazyLoading = computed(() => {
    return totalItemsCount.value > 0 && loadedItemsCount.value < totalItemsCount.value
  })
  
  return {
    // Main API
    loadItem,
    isItemLoaded,
    resetLoadedItems,
    preloadInitialItems,
    
    // Progress tracking
    totalItemsCount,
    loadedItemsCount,
    isLazyLoading,
    
    // State access (for debugging)
    loadedItems: loadedItems.value
  }
}