import { defineStore } from 'pinia';
import { useCategoryCore } from './categoryCore.js';
import { useCategoryValidation } from './categoryValidation.js';
import { useCategoryComposables } from './categoryComposables.js';

/**
 * Main Category Store
 * Integrates all category-related modules into a single Pinia store
 */
export const useCategoryStore = defineStore('category', () => {
  // Core functionality (state, CRUD operations)
  const core = useCategoryCore();
  
  // Validation and business rules
  const validation = useCategoryValidation(core.categories);

  // Enhanced createCategory with color and validation integration
  const createCategoryWithEnhancements = async (categoryData) => {
    try {
      // Validate the category data
      const validationErrors = validation.validateCategoryData(categoryData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      // Check category limit
      const limitCheck = validation.validateCategoryLimit(core.categoryCount.value);
      if (!limitCheck.canCreate) {
        throw new Error(limitCheck.errors.join(', '));
      }

      // Sanitize the data (colors are now automatically assigned by UI)
      const sanitizedData = {
        name: validation.sanitizeCategoryName(categoryData.name),
        tags: (categoryData.tags || []).map(tag => ({
          ...tag,
          name: validation.sanitizeTagName(tag.name),
          id: tag.id || crypto.randomUUID()
        }))
      };

      // Validate tags if provided
      if (sanitizedData.tags.length > 0) {
        const tagErrors = validation.validateCategoryTags(sanitizedData.tags);
        if (tagErrors.length > 0) {
          throw new Error(tagErrors.join(', '));
        }
      }

      // Create the category using core functionality
      return await core.createCategory(sanitizedData);
    } catch (error) {
      console.error('[CategoryStore] Enhanced create failed:', error);
      throw error;
    }
  };

  // Enhanced updateCategory with validation
  const updateCategoryWithEnhancements = async (categoryId, updates) => {
    try {
      // Validate updates if provided
      if (Object.keys(updates).length > 0) {
        const validationErrors = validation.validateCategoryData(updates, categoryId);
        if (validationErrors.length > 0) {
          throw new Error(validationErrors.join(', '));
        }
      }

      // Sanitize updates
      const sanitizedUpdates = { ...updates };
      if (updates.name) {
        sanitizedUpdates.name = validation.sanitizeCategoryName(updates.name);
      }
      if (updates.tags) {
        sanitizedUpdates.tags = updates.tags.map(tag => ({
          ...tag,
          name: validation.sanitizeTagName(tag.name),
          id: tag.id || crypto.randomUUID()
        }));
      }

      // Use core functionality
      return await core.updateCategory(categoryId, sanitizedUpdates);
    } catch (error) {
      console.error('[CategoryStore] Enhanced update failed:', error);
      throw error;
    }
  };

  // Enhanced deleteCategory with validation
  const deleteCategoryWithEnhancements = async (categoryId) => {
    try {
      // Check if category can be deleted
      const deleteCheck = validation.canDeleteCategory(categoryId);
      if (!deleteCheck.canDelete) {
        throw new Error(deleteCheck.errors.join(', '));
      }

      // Use core functionality
      return await core.deleteCategory(categoryId);
    } catch (error) {
      console.error('[CategoryStore] Enhanced delete failed:', error);
      throw error;
    }
  };

  // Create store instance for composables
  const storeInstance = {
    ...core,
    // Override with enhanced methods
    createCategory: createCategoryWithEnhancements,
    updateCategory: updateCategoryWithEnhancements,
    deleteCategory: deleteCategoryWithEnhancements
  };

  // Advanced composables (only expose the functions, not all returned values)
  const composables = useCategoryComposables(storeInstance);

  return {
    // Core state and computed
    categories: core.categories,
    loading: core.loading,
    error: core.error,
    isInitialized: core.isInitialized,
    categoryCount: core.categoryCount,
    activeCategories: core.activeCategories,

    // Core actions (enhanced versions)
    loadCategories: core.loadCategories,
    createCategory: createCategoryWithEnhancements,
    updateCategory: updateCategoryWithEnhancements,
    deleteCategory: deleteCategoryWithEnhancements,
    getCategoryById: core.getCategoryById,
    reset: core.reset,

    // Color utilities removed - colors are now automatically assigned by UI

    // Validation utilities
    validateCategoryData: validation.validateCategoryData,
    validateCategoryName: validation.validateCategoryName,
    sanitizeCategoryName: validation.sanitizeCategoryName,
    sanitizeTagName: validation.sanitizeTagName,
    canDeleteCategory: validation.canDeleteCategory,
    hasChanges: validation.hasChanges,

    // Advanced composables
    useFilteredCategories: composables.useFilteredCategories,
    useCategoryStats: composables.useCategoryStats,
    useCategoryForm: composables.useCategoryForm,
    useCategorySelection: composables.useCategorySelection
  };
});