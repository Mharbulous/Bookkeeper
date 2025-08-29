import { ref, computed } from 'vue'

/**
 * File viewer navigation composable
 * Handles navigation between files in the viewer
 */
export function useViewerNavigation(files) {
  const currentIndex = ref(0)
  const viewMode = ref('grid') // 'grid' or 'list'
  
  const currentFile = computed(() => {
    return files.value?.[currentIndex.value] || null
  })
  
  const hasNext = computed(() => {
    return currentIndex.value < (files.value?.length - 1)
  })
  
  const hasPrevious = computed(() => {
    return currentIndex.value > 0
  })
  
  const nextFile = () => {
    if (hasNext.value) {
      currentIndex.value++
    }
  }
  
  const previousFile = () => {
    if (hasPrevious.value) {
      currentIndex.value--
    }
  }
  
  const goToFile = (index) => {
    if (index >= 0 && index < files.value?.length) {
      currentIndex.value = index
    }
  }
  
  const toggleViewMode = () => {
    viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid'
  }
  
  return {
    currentIndex,
    currentFile,
    viewMode,
    hasNext,
    hasPrevious,
    nextFile,
    previousFile,
    goToFile,
    toggleViewMode
  }
}