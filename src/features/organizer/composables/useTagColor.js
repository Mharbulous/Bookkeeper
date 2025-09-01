import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useOrganizerStore } from '../stores/organizer.js';
import { getAutomaticTagColor } from '../utils/automaticTagColors.js';

/**
 * Composable for centralized tag color resolution
 * Uses automatic color assignment pattern instead of user-controlled colors
 */
export function useTagColor() {
  const organizerStore = useOrganizerStore();
  const { categories } = storeToRefs(organizerStore);

  /**
   * Get color for a tag based on its category using automatic color assignment
   * @param {Object} tag - Tag object with categoryId
   * @returns {string} - Hex color code
   */
  const getTagColor = (tag) => {
    if (!tag?.categoryId) {
      return getAutomaticTagColor(0); // Default first color
    }

    const categoryIndex = categories.value.findIndex(cat => cat.id === tag.categoryId);
    return getAutomaticTagColor(categoryIndex >= 0 ? categoryIndex : 0);
  };

  /**
   * Get color for a tag by category ID using automatic color assignment
   * @param {string} categoryId - Category ID
   * @returns {string} - Hex color code
   */
  const getColorByCategoryId = (categoryId) => {
    if (!categoryId) {
      return getAutomaticTagColor(0); // Default first color
    }

    const categoryIndex = categories.value.findIndex(cat => cat.id === categoryId);
    return getAutomaticTagColor(categoryIndex >= 0 ? categoryIndex : 0);
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
   * Get multiple tag colors efficiently using automatic color assignment
   * @param {Array} tags - Array of tag objects
   * @returns {Object} - Map of tagId to color
   */
  const getMultipleTagColors = (tags) => {
    const colorMap = {};
    const categoryIndexMap = new Map();

    // Create category index lookup map for efficiency
    categories.value.forEach((cat, index) => {
      categoryIndexMap.set(cat.id, index);
    });

    // Map tag IDs to colors using automatic assignment
    tags.forEach(tag => {
      if (tag.id && tag.categoryId) {
        const categoryIndex = categoryIndexMap.get(tag.categoryId);
        colorMap[tag.id] = getAutomaticTagColor(categoryIndex !== undefined ? categoryIndex : 0);
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