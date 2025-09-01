import { ref, watch } from 'vue';

export function useLazyDocuments(documents, options = {}) {
  const { initialCount = 10, resetOnChange = true } = options;
  const loadedIndices = ref(new Set());

  const isItemLoaded = (index) => {
    return loadedIndices.value.has(index);
  };

  const loadItem = (index) => {
    if (!loadedIndices.value.has(index)) {
      loadedIndices.value.add(index);
    }
  };

  const resetLoadedItems = () => {
    loadedIndices.value.clear();
  };

  const preloadInitialItems = () => {
    const docCount = documents.value?.length || 0;
    const toLoad = Math.min(initialCount, docCount);
    
    for (let i = 0; i < toLoad; i++) {
      loadedIndices.value.add(i);
    }
  };

  if (resetOnChange) {
    watch(
      documents,
      (newDocs, oldDocs) => {
        resetLoadedItems();
        preloadInitialItems();
      },
      { deep: true }
    );
  }

  return {
    isItemLoaded,
    loadItem,
    resetLoadedItems,
    preloadInitialItems,
  };
}
