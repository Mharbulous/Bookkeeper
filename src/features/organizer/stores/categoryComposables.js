import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

/**
 * Category Composables Module
 * Provides reactive composables for UI integration and advanced category operations
 */
export function useCategoryComposables(categoryStore) {
  // Reactive references from the store
  const { categories } = storeToRefs(categoryStore);

  /**
   * Search and filter composable
   */
  const useFilteredCategories = () => {
    const searchTerm = ref('');
    const sortOrder = ref('name'); // 'name', 'created', 'updated', 'tagCount'
    const sortDirection = ref('asc'); // 'asc', 'desc'

    const filteredCategories = computed(() => {
      let filtered = [...categories.value];

      // Apply search filter
      if (searchTerm.value.trim()) {
        const search = searchTerm.value.trim().toLowerCase();
        filtered = filtered.filter(category => 
          category.name.toLowerCase().includes(search) ||
          (category.tags && category.tags.some(tag => 
            tag.name.toLowerCase().includes(search)
          ))
        );
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let compareA, compareB;
        
        switch (sortOrder.value) {
          case 'name':
            compareA = a.name.toLowerCase();
            compareB = b.name.toLowerCase();
            break;
          case 'created':
            compareA = a.createdAt?.toDate?.() || new Date(0);
            compareB = b.createdAt?.toDate?.() || new Date(0);
            break;
          case 'updated':
            compareA = a.updatedAt?.toDate?.() || new Date(0);
            compareB = b.updatedAt?.toDate?.() || new Date(0);
            break;
          case 'tagCount':
            compareA = (a.tags || []).length;
            compareB = (b.tags || []).length;
            break;
          default:
            compareA = a.name.toLowerCase();
            compareB = b.name.toLowerCase();
        }

        if (sortDirection.value === 'desc') {
          [compareA, compareB] = [compareB, compareA];
        }

        if (compareA < compareB) return -1;
        if (compareA > compareB) return 1;
        return 0;
      });

      return filtered;
    });

    const resetFilters = () => {
      searchTerm.value = '';
      sortOrder.value = 'name';
      sortDirection.value = 'asc';
    };

    return {
      searchTerm,
      sortOrder,
      sortDirection,
      filteredCategories,
      resetFilters
    };
  };

  /**
   * Category statistics composable
   */
  const useCategoryStats = () => {
    const totalCategories = computed(() => categories.value.length);
    
    const totalTags = computed(() => 
      categories.value.reduce((sum, cat) => sum + (cat.tags?.length || 0), 0)
    );

    const averageTagsPerCategory = computed(() => 
      totalCategories.value > 0 ? (totalTags.value / totalCategories.value).toFixed(1) : 0
    );

    const categoriesByColorCount = computed(() => {
      const colorMap = {};
      categories.value.forEach(cat => {
        const color = cat.color || '#1976d2';
        colorMap[color] = (colorMap[color] || 0) + 1;
      });
      return colorMap;
    });

    const mostUsedColor = computed(() => {
      const colorCounts = categoriesByColorCount.value;
      const entries = Object.entries(colorCounts);
      if (entries.length === 0) return null;
      
      return entries.reduce((max, [color, count]) => 
        count > max.count ? { color, count } : max, 
        { color: entries[0][0], count: entries[0][1] }
      );
    });

    const recentlyCreatedCategories = computed(() => 
      [...categories.value]
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        })
        .slice(0, 5)
    );

    const recentlyUpdatedCategories = computed(() => 
      [...categories.value]
        .sort((a, b) => {
          const dateA = a.updatedAt?.toDate?.() || new Date(0);
          const dateB = b.updatedAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        })
        .slice(0, 5)
    );

    return {
      totalCategories,
      totalTags,
      averageTagsPerCategory,
      categoriesByColorCount,
      mostUsedColor,
      recentlyCreatedCategories,
      recentlyUpdatedCategories
    };
  };

  /**
   * Category form state composable
   */
  const useCategoryForm = (initialData = null) => {
    const formData = ref({
      name: initialData?.name || '',
      color: initialData?.color || '',
      tags: initialData?.tags ? [...initialData.tags] : []
    });

    const formErrors = ref({});
    const isSubmitting = ref(false);
    const isDirty = ref(false);

    // Watch for changes to mark form as dirty
    watch(formData, () => {
      isDirty.value = true;
    }, { deep: true });

    const resetForm = () => {
      formData.value = {
        name: initialData?.name || '',
        color: initialData?.color || '',
        tags: initialData?.tags ? [...initialData.tags] : []
      };
      formErrors.value = {};
      isSubmitting.value = false;
      isDirty.value = false;
    };

    const clearErrors = () => {
      formErrors.value = {};
    };

    const setError = (field, message) => {
      formErrors.value[field] = message;
    };

    const hasErrors = computed(() => Object.keys(formErrors.value).length > 0);

    const addTag = (tagData) => {
      const newTag = {
        id: crypto.randomUUID(),
        name: tagData.name?.trim() || '',
        ...tagData
      };
      formData.value.tags.push(newTag);
    };

    const removeTag = (tagId) => {
      formData.value.tags = formData.value.tags.filter(tag => tag.id !== tagId);
    };

    const updateTag = (tagId, updates) => {
      const tagIndex = formData.value.tags.findIndex(tag => tag.id === tagId);
      if (tagIndex >= 0) {
        formData.value.tags[tagIndex] = { ...formData.value.tags[tagIndex], ...updates };
      }
    };

    return {
      formData,
      formErrors,
      isSubmitting,
      isDirty,
      hasErrors,
      resetForm,
      clearErrors,
      setError,
      addTag,
      removeTag,
      updateTag
    };
  };

  /**
   * Category selection composable for multi-select scenarios
   */
  const useCategorySelection = () => {
    const selectedCategoryIds = ref(new Set());

    const selectedCategories = computed(() => 
      categories.value.filter(cat => selectedCategoryIds.value.has(cat.id))
    );

    const isSelected = (categoryId) => selectedCategoryIds.value.has(categoryId);

    const toggleSelection = (categoryId) => {
      const newSet = new Set(selectedCategoryIds.value);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      selectedCategoryIds.value = newSet;
    };

    const selectAll = () => {
      selectedCategoryIds.value = new Set(categories.value.map(cat => cat.id));
    };

    const clearSelection = () => {
      selectedCategoryIds.value = new Set();
    };

    const selectMultiple = (categoryIds) => {
      selectedCategoryIds.value = new Set(categoryIds);
    };

    const selectedCount = computed(() => selectedCategoryIds.value.size);

    return {
      selectedCategoryIds,
      selectedCategories,
      selectedCount,
      isSelected,
      toggleSelection,
      selectAll,
      clearSelection,
      selectMultiple
    };
  };

  return {
    // Filtered categories
    useFilteredCategories,
    
    // Statistics
    useCategoryStats,
    
    // Form management
    useCategoryForm,
    
    // Selection management
    useCategorySelection
  };
}