import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useOrganizerStore } from '../stores/organizer.js';

/**
 * Composable for centralized tag color resolution
 * Implements single source of truth by looking up category colors for tags
 */
export function useTagColor() {
  const organizerStore = useOrganizerStore();
  const { categories } = storeToRefs(organizerStore);

  /**
   * Get color for a tag based on its category
   * @param {Object} tag - Tag object with categoryId
   * @returns {string} - Hex color code
   */
  const getTagColor = (tag) => {
    if (!tag?.categoryId) {
      return '#1976d2'; // Default blue fallback
    }

    const category = categories.value.find(cat => cat.id === tag.categoryId);
    return category?.color || '#1976d2'; // Default blue if category not found
  };

  /**
   * Get color for a tag by category ID
   * @param {string} categoryId - Category ID
   * @returns {string} - Hex color code
   */
  const getColorByCategoryId = (categoryId) => {
    if (!categoryId) {
      return '#1976d2'; // Default blue fallback
    }

    const category = categories.value.find(cat => cat.id === categoryId);
    return category?.color || '#1976d2'; // Default blue if category not found
  };

  /**
   * Reactive computed property for tag colors
   * Useful when categories might change and colors need to update
   * @param {Object} tag - Tag object with categoryId
   * @returns {ComputedRef<string>} - Reactive hex color code
   */
  const tagColorComputed = (tag) => {
    return computed(() => getTagColor(tag));
  };

  /**
   * Get multiple tag colors efficiently
   * @param {Array} tags - Array of tag objects
   * @returns {Object} - Map of tagId to color
   */
  const getMultipleTagColors = (tags) => {
    const colorMap = {};
    const categoryMap = new Map();

    // Create category lookup map for efficiency
    categories.value.forEach(cat => {
      categoryMap.set(cat.id, cat.color);
    });

    // Map tag IDs to colors
    tags.forEach(tag => {
      if (tag.id && tag.categoryId) {
        colorMap[tag.id] = categoryMap.get(tag.categoryId) || '#1976d2';
      }
    });

    return colorMap;
  };

  return {
    getTagColor,
    getColorByCategoryId,
    tagColorComputed,
    getMultipleTagColors
  };
}