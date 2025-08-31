/**
 * Category Validation Module
 * Handles validation rules and business logic for categories
 */
export function useCategoryValidation(categories) {
  /**
   * Validate category name
   */
  const validateCategoryName = (name, excludeId = null) => {
    const errors = [];

    // Required field validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.push('Category name is required');
      return errors;
    }

    const trimmedName = name.trim();

    // Length validation
    if (trimmedName.length > 50) {
      errors.push('Category name must be 50 characters or less');
    }

    if (trimmedName.length < 2) {
      errors.push('Category name must be at least 2 characters');
    }

    // Check for duplicate names
    const existingCategory = categories.value.find(
      cat => cat.id !== excludeId && 
      cat.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingCategory) {
      errors.push('Category name already exists');
    }

    // Character validation - no special characters that could cause issues
    const invalidChars = /[<>"'&]/;
    if (invalidChars.test(trimmedName)) {
      errors.push('Category name contains invalid characters');
    }

    return errors;
  };

  /**
   * Validate category color
   */
  const validateCategoryColor = (color) => {
    const errors = [];

    if (!color) {
      // Color is optional, will use default
      return errors;
    }

    if (typeof color !== 'string') {
      errors.push('Category color must be a string');
      return errors;
    }

    // Validate hex color format
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      errors.push('Category color must be a valid hex color (e.g., #1976d2)');
    }

    return errors;
  };

  /**
   * Validate category tags array
   */
  const validateCategoryTags = (tags) => {
    const errors = [];

    if (!tags) {
      // Tags are optional
      return errors;
    }

    if (!Array.isArray(tags)) {
      errors.push('Category tags must be an array');
      return errors;
    }

    if (tags.length > 100) {
      errors.push('Category cannot have more than 100 tags');
    }

    // Validate individual tags
    tags.forEach((tag, index) => {
      if (!tag || typeof tag !== 'object') {
        errors.push(`Tag ${index + 1}: must be an object`);
        return;
      }

      if (!tag.name || typeof tag.name !== 'string' || !tag.name.trim()) {
        errors.push(`Tag ${index + 1}: name is required and must be a non-empty string`);
      } else if (tag.name.trim().length > 30) {
        errors.push(`Tag ${index + 1}: name must be 30 characters or less`);
      } else if (tag.name.trim().length < 1) {
        errors.push(`Tag ${index + 1}: name must be at least 1 character`);
      }

      // Character validation for tag names
      const invalidChars = /[<>"'&]/;
      if (tag.name && invalidChars.test(tag.name)) {
        errors.push(`Tag ${index + 1}: name contains invalid characters`);
      }
    });

    // Check for duplicate tag names within the category
    const tagNames = tags.map(tag => tag.name?.trim().toLowerCase()).filter(Boolean);
    const uniqueNames = [...new Set(tagNames)];
    if (tagNames.length !== uniqueNames.length) {
      errors.push('Category cannot have duplicate tag names');
    }

    return errors;
  };

  /**
   * Validate complete category data
   */
  const validateCategoryData = (categoryData, excludeId = null) => {
    let allErrors = [];

    // Validate name
    allErrors = allErrors.concat(validateCategoryName(categoryData.name, excludeId));

    // Validate color
    allErrors = allErrors.concat(validateCategoryColor(categoryData.color));

    // Validate tags
    allErrors = allErrors.concat(validateCategoryTags(categoryData.tags));

    return allErrors;
  };

  /**
   * Check if category can be deleted (business rules)
   */
  const canDeleteCategory = (categoryId) => {
    const errors = [];

    if (!categoryId) {
      errors.push('Category ID is required');
      return { canDelete: false, errors };
    }

    const category = categories.value.find(cat => cat.id === categoryId);
    if (!category) {
      errors.push('Category not found');
      return { canDelete: false, errors };
    }

    // Business rule: Cannot delete category if it has tags that are in use
    // This would need to be implemented based on your specific business requirements
    // For now, we'll allow deletion of any category

    // Future enhancement: Check if category is referenced by any documents
    // const isInUse = await checkIfCategoryInUse(categoryId);
    // if (isInUse) {
    //   errors.push('Cannot delete category that is currently in use');
    // }

    return { canDelete: errors.length === 0, errors };
  };

  /**
   * Validate category limit for team
   */
  const validateCategoryLimit = (currentCount, limit = 50) => {
    const errors = [];

    if (currentCount >= limit) {
      errors.push(`Cannot create more than ${limit} categories`);
    }

    return { canCreate: errors.length === 0, errors };
  };

  /**
   * Validate tag limit within category
   */
  const validateTagLimit = (tags, limit = 100) => {
    const errors = [];

    if (!Array.isArray(tags)) {
      return { valid: true, errors: [] };
    }

    if (tags.length > limit) {
      errors.push(`Cannot have more than ${limit} tags in a category`);
    }

    return { valid: errors.length === 0, errors };
  };

  /**
   * Sanitize category name
   */
  const sanitizeCategoryName = (name) => {
    if (!name || typeof name !== 'string') {
      return '';
    }

    return name.trim()
      .replace(/[<>"'&]/g, '') // Remove problematic characters
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .substring(0, 50); // Truncate to max length
  };

  /**
   * Sanitize tag name
   */
  const sanitizeTagName = (name) => {
    if (!name || typeof name !== 'string') {
      return '';
    }

    return name.trim()
      .replace(/[<>"'&]/g, '') // Remove problematic characters
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .substring(0, 30); // Truncate to max length
  };

  /**
   * Check if category data has changes compared to original
   */
  const hasChanges = (originalCategory, newData) => {
    if (!originalCategory || !newData) {
      return false;
    }

    // Check name changes
    if (originalCategory.name !== newData.name?.trim()) {
      return true;
    }

    // Check color changes
    if (originalCategory.color !== newData.color) {
      return true;
    }

    // Check tags changes (simple array comparison)
    const originalTags = originalCategory.tags || [];
    const newTags = newData.tags || [];
    
    if (originalTags.length !== newTags.length) {
      return true;
    }

    // Compare tag names (assuming order doesn't matter for this simple check)
    const originalTagNames = originalTags.map(tag => tag.name).sort();
    const newTagNames = newTags.map(tag => tag.name).sort();
    
    return JSON.stringify(originalTagNames) !== JSON.stringify(newTagNames);
  };

  return {
    // Validation functions
    validateCategoryName,
    validateCategoryColor,
    validateCategoryTags,
    validateCategoryData,

    // Business rules
    canDeleteCategory,
    validateCategoryLimit,
    validateTagLimit,

    // Sanitization
    sanitizeCategoryName,
    sanitizeTagName,

    // Utility
    hasChanges
  };
}