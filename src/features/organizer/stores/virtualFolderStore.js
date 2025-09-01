import { defineStore } from 'pinia';
import { ref, computed, reactive } from 'vue';

/**
 * Virtual Folder Store - Manages folder-like views of tag-based data
 * 
 * Provides virtual folder navigation over existing tag data without 
 * modifying the underlying storage structure. Converts flat tag data 
 * into hierarchical folder representations for familiar navigation.
 */
export const useVirtualFolderStore = defineStore('virtualFolder', () => {
  // === CORE STATE ===
  
  /**
   * Current view mode: 'flat' (original list view) or 'folders' (virtual folder view)
   */
  const viewMode = ref('flat');
  
  /**
   * Ordered hierarchy defining folder structure
   * Array of category objects that define the folder tree levels
   */
  const folderHierarchy = ref([]);
  
  /**
   * Current navigation path through the folder structure
   * Each path item contains categoryId and selected tagName
   */
  const currentPath = ref([]);
  
  /**
   * Cache for folder structure computations to avoid reprocessing
   */
  const folderCache = reactive(new Map());
  
  /**
   * Loading state for folder operations
   */
  const loading = ref(false);

  // === COMPUTED PROPERTIES ===
  
  /**
   * Check if currently in folder view mode
   */
  const isFolderMode = computed(() => viewMode.value === 'folders');
  
  /**
   * Check if currently at root folder level (no path navigation)
   */
  const isAtRoot = computed(() => currentPath.value.length === 0);
  
  /**
   * Get current folder depth (how deep in navigation we are)
   */
  const currentDepth = computed(() => currentPath.value.length);
  
  /**
   * Get the next category in hierarchy for current navigation level
   */
  const nextCategory = computed(() => {
    const depth = currentDepth.value;
    return depth < folderHierarchy.value.length 
      ? folderHierarchy.value[depth] 
      : null;
  });
  
  /**
   * Generate breadcrumb path for display
   */
  const breadcrumbPath = computed(() => {
    return currentPath.value.map((pathItem, index) => ({
      ...pathItem,
      isLast: index === currentPath.value.length - 1,
      depth: index
    }));
  });

  // === FOLDER HIERARCHY MANAGEMENT ===
  
  /**
   * Set the folder hierarchy order
   * @param {Array} categories - Array of category objects {categoryId, categoryName}
   */
  const setFolderHierarchy = (categories) => {
    folderHierarchy.value = Array.isArray(categories) ? [...categories] : [];
    clearFolderCache();
  };
  
  /**
   * Add category to folder hierarchy
   * @param {Object} category - Category object {categoryId, categoryName}
   * @param {number} position - Position to insert (optional, appends if not specified)
   */
  const addToHierarchy = (category, position = null) => {
    if (position !== null) {
      folderHierarchy.value.splice(position, 0, category);
    } else {
      folderHierarchy.value.push(category);
    }
    clearFolderCache();
  };
  
  /**
   * Remove category from folder hierarchy
   * @param {string} categoryId - Category ID to remove
   */
  const removeFromHierarchy = (categoryId) => {
    const index = folderHierarchy.value.findIndex(cat => cat.categoryId === categoryId);
    if (index !== -1) {
      folderHierarchy.value.splice(index, 1);
      clearFolderCache();
      
      // Clean up current path if it contains removed category
      const pathIndex = currentPath.value.findIndex(path => path.categoryId === categoryId);
      if (pathIndex !== -1) {
        currentPath.value = currentPath.value.slice(0, pathIndex);
      }
    }
  };

  // === NAVIGATION METHODS ===
  
  /**
   * Switch between flat and folder view modes
   * @param {string} mode - 'flat' or 'folders'
   */
  const setViewMode = (mode) => {
    if (mode === 'flat' || mode === 'folders') {
      viewMode.value = mode;
      
      // Reset navigation when switching to flat mode
      if (mode === 'flat') {
        currentPath.value = [];
      }
    }
  };
  
  /**
   * Navigate into a folder (drill down)
   * @param {string} categoryId - Category ID being navigated
   * @param {string} tagName - Tag name selected for this category level
   */
  const navigateToFolder = (categoryId, tagName) => {
    const category = folderHierarchy.value.find(cat => cat.categoryId === categoryId);
    if (category) {
      // Find the position where this category should be in the path
      const hierarchyIndex = folderHierarchy.value.findIndex(cat => cat.categoryId === categoryId);
      
      // Truncate path to this level and add new navigation
      currentPath.value = currentPath.value.slice(0, hierarchyIndex);
      currentPath.value.push({
        categoryId,
        categoryName: category.categoryName,
        tagName
      });
    }
  };
  
  /**
   * Navigate back to a specific level in the breadcrumb
   * @param {number} depth - Depth level to navigate back to (0 = root)
   */
  const navigateToDepth = (depth) => {
    if (depth >= 0 && depth <= currentPath.value.length) {
      currentPath.value = currentPath.value.slice(0, depth);
    }
  };
  
  /**
   * Navigate back one level
   */
  const navigateBack = () => {
    if (currentPath.value.length > 0) {
      currentPath.value.pop();
    }
  };
  
  /**
   * Reset navigation to root level
   */
  const navigateToRoot = () => {
    currentPath.value = [];
  };

  // === FOLDER STRUCTURE GENERATION ===
  
  /**
   * Generate folder structure from evidence data for current navigation level
   * @param {Array} evidenceList - Evidence documents with tags
   * @returns {Array} Folder structure with file counts
   */
  const generateFolderStructure = (evidenceList) => {
    if (!nextCategory.value || !evidenceList?.length) {
      return [];
    }
    
    // Generate cache key for this navigation state
    const cacheKey = `${currentPath.value.map(p => `${p.categoryId}:${p.tagName}`).join('|')}:${nextCategory.value.categoryId}`;
    
    // Return cached result if available
    if (folderCache.has(cacheKey)) {
      return folderCache.get(cacheKey);
    }
    
    // Filter evidence based on current path context
    const contextFilteredEvidence = filterEvidenceByPath(evidenceList);
    
    // Group by next category level
    const folders = new Map();
    const categoryId = nextCategory.value.categoryId;
    
    contextFilteredEvidence.forEach(evidence => {
      const tags = evidence.tags || {};
      const categoryTags = tags[categoryId];
      
      if (categoryTags && Array.isArray(categoryTags)) {
        categoryTags.forEach(tag => {
          const tagName = tag.tagName || tag.name;
          if (tagName) {
            if (!folders.has(tagName)) {
              folders.set(tagName, {
                categoryId,
                categoryName: nextCategory.value.categoryName,
                tagName,
                fileCount: 0,
                evidenceIds: new Set()
              });
            }
            
            const folder = folders.get(tagName);
            folder.evidenceIds.add(evidence.id);
            folder.fileCount = folder.evidenceIds.size;
          }
        });
      }
    });
    
    // Convert to array and sort by file count (descending) then name
    const result = Array.from(folders.values())
      .sort((a, b) => {
        if (b.fileCount !== a.fileCount) {
          return b.fileCount - a.fileCount;
        }
        return a.tagName.localeCompare(b.tagName);
      });
    
    // Cache the result
    folderCache.set(cacheKey, result);
    
    return result;
  };
  
  /**
   * Filter evidence based on current navigation path
   * @param {Array} evidenceList - All evidence documents
   * @returns {Array} Evidence matching current folder context
   */
  const filterEvidenceByPath = (evidenceList) => {
    if (!evidenceList?.length || currentPath.value.length === 0) {
      return evidenceList || [];
    }
    
    return evidenceList.filter(evidence => {
      const tags = evidence.tags || {};
      
      // Check that evidence has tags for all path levels
      return currentPath.value.every(pathItem => {
        const categoryTags = tags[pathItem.categoryId];
        if (!categoryTags || !Array.isArray(categoryTags)) {
          return false;
        }
        
        // Check if any tag matches the path tag name
        return categoryTags.some(tag => {
          const tagName = tag.tagName || tag.name;
          return tagName === pathItem.tagName;
        });
      });
    });
  };

  // === CACHE MANAGEMENT ===
  
  /**
   * Clear folder structure cache
   */
  const clearFolderCache = () => {
    folderCache.clear();
  };
  
  /**
   * Clear specific cache entries (useful when evidence data changes)
   * @param {string} prefix - Cache key prefix to match
   */
  const clearCacheByPrefix = (prefix) => {
    for (const [key] of folderCache) {
      if (key.startsWith(prefix)) {
        folderCache.delete(key);
      }
    }
  };

  // === UTILITY METHODS ===
  
  /**
   * Get folder context information for current navigation state
   * @returns {Object} Context information
   */
  const getFolderContext = () => {
    return {
      viewMode: viewMode.value,
      isFolderMode: isFolderMode.value,
      isAtRoot: isAtRoot.value,
      currentDepth: currentDepth.value,
      hierarchy: folderHierarchy.value,
      path: currentPath.value,
      breadcrumbs: breadcrumbPath.value,
      nextCategory: nextCategory.value
    };
  };
  
  /**
   * Reset store to initial state
   */
  const reset = () => {
    viewMode.value = 'flat';
    folderHierarchy.value = [];
    currentPath.value = [];
    clearFolderCache();
    loading.value = false;
  };

  // === PUBLIC INTERFACE ===
  return {
    // State
    viewMode,
    folderHierarchy,
    currentPath,
    loading,
    
    // Computed
    isFolderMode,
    isAtRoot,
    currentDepth,
    nextCategory,
    breadcrumbPath,
    
    // Hierarchy management
    setFolderHierarchy,
    addToHierarchy,
    removeFromHierarchy,
    
    // Navigation
    setViewMode,
    navigateToFolder,
    navigateToDepth,
    navigateBack,
    navigateToRoot,
    
    // Folder structure
    generateFolderStructure,
    filterEvidenceByPath,
    
    // Cache management
    clearFolderCache,
    clearCacheByPrefix,
    
    // Utilities
    getFolderContext,
    reset
  };
});