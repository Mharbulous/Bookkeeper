import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase.js';

/**
 * Category Service - Handles all category-related Firestore operations
 * Provides validation and error handling for category CRUD operations
 */
export class CategoryService {
  /**
   * Create categories collection reference
   */
  static getCategoriesCollection(teamId) {
    return collection(db, 'teams', teamId, 'categories');
  }

  /**
   * Validate category data structure (enhanced for category types)
   */
  static validateCategoryData(categoryData) {
    const errors = [];

    // Required fields validation
    if (!categoryData.name || typeof categoryData.name !== 'string' || !categoryData.name.trim()) {
      errors.push('Category name is required and must be a non-empty string');
    }

    if (categoryData.name && categoryData.name.trim().length > 50) {
      errors.push('Category name must be 50 characters or less');
    }

    // Category type validation
    const validTypes = ['date', 'currency', 'fixed-list', 'open-list'];
    if (categoryData.categoryType && !validTypes.includes(categoryData.categoryType)) {
      errors.push(`Category type must be one of: ${validTypes.join(', ')}`);
    }

    // Type configuration validation
    if (categoryData.typeConfig) {
      const typeErrors = this.validateTypeConfig(categoryData.categoryType, categoryData.typeConfig);
      errors.push(...typeErrors);
    }

    // Tags validation (only for list types)
    const categoryType = categoryData.categoryType || 'fixed-list'; // Default for backwards compatibility
    if (categoryType === 'fixed-list' || categoryType === 'open-list') {
      if (categoryData.tags && !Array.isArray(categoryData.tags)) {
        errors.push('Category tags must be an array');
      }

      if (categoryData.tags && categoryData.tags.length > 100) {
        errors.push('Category cannot have more than 100 tags');
      }

      // Validate individual tags
      if (categoryData.tags && Array.isArray(categoryData.tags)) {
        categoryData.tags.forEach((tag, index) => {
          if (!tag.name || typeof tag.name !== 'string' || !tag.name.trim()) {
            errors.push(`Tag ${index + 1}: name is required and must be a non-empty string`);
          }
          if (tag.name && tag.name.trim().length > 30) {
            errors.push(`Tag ${index + 1}: name must be 30 characters or less`);
          }
        });

        // Check for duplicate tag names
        const tagNames = categoryData.tags.map(tag => tag.name?.trim().toLowerCase()).filter(Boolean);
        const uniqueNames = [...new Set(tagNames)];
        if (tagNames.length !== uniqueNames.length) {
          errors.push('Category cannot have duplicate tag names');
        }
      }
    } else if (categoryData.tags && categoryData.tags.length > 0) {
      errors.push(`Category type '${categoryType}' should not have tags array`);
    }

    if (errors.length > 0) {
      throw new Error(`Category validation failed: ${errors.join(', ')}`);
    }

    return true;
  }

  /**
   * Validate type-specific configuration
   */
  static validateTypeConfig(categoryType, typeConfig) {
    const errors = [];

    if (!typeConfig || typeof typeConfig !== 'object') {
      errors.push('Type configuration is required and must be an object');
      return errors;
    }

    switch (categoryType) {
      case 'date':
        return this.validateDateConfig(typeConfig);
      case 'currency':
        return this.validateCurrencyConfig(typeConfig);
      case 'fixed-list':
      case 'open-list':
        return this.validateListConfig(typeConfig);
      default:
        errors.push(`Unknown category type: ${categoryType}`);
        return errors;
    }
  }

  /**
   * Validate date category configuration
   */
  static validateDateConfig(config) {
    const errors = [];

    if (config.dateFormat && typeof config.dateFormat !== 'string') {
      errors.push('Date format must be a string');
    }

    if (config.defaultValue && typeof config.defaultValue !== 'string') {
      errors.push('Default value must be a string');
    }

    return errors;
  }

  /**
   * Validate currency category configuration
   */
  static validateCurrencyConfig(config) {
    const errors = [];

    if (config.defaultCurrency && (typeof config.defaultCurrency !== 'string' || !/^[A-Z]{3}$/.test(config.defaultCurrency))) {
      errors.push('Default currency must be a valid 3-letter currency code');
    }

    if (config.supportedCurrencies) {
      if (!Array.isArray(config.supportedCurrencies)) {
        errors.push('Supported currencies must be an array');
      } else {
        config.supportedCurrencies.forEach((currency, index) => {
          if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) {
            errors.push(`Supported currency ${index + 1} must be a valid 3-letter currency code`);
          }
        });

        if (config.supportedCurrencies.length > 20) {
          errors.push('Cannot have more than 20 supported currencies');
        }
      }
    }

    if (config.allowNegative !== undefined && typeof config.allowNegative !== 'boolean') {
      errors.push('allowNegative must be a boolean');
    }

    if (config.decimalPlaces !== undefined) {
      if (typeof config.decimalPlaces !== 'number' || config.decimalPlaces < 0 || config.decimalPlaces > 8) {
        errors.push('decimalPlaces must be a number between 0 and 8');
      }
    }

    return errors;
  }

  /**
   * Validate list category configuration
   */
  static validateListConfig(config) {
    const errors = [];

    if (config.allowAIExpansion === undefined || typeof config.allowAIExpansion !== 'boolean') {
      errors.push('allowAIExpansion is required and must be a boolean');
    }

    if (config.maxTags !== undefined) {
      if (typeof config.maxTags !== 'number' || config.maxTags < 1 || config.maxTags > 500) {
        errors.push('maxTags must be a number between 1 and 500');
      }
    }

    if (config.aiConfidenceThreshold !== undefined) {
      if (typeof config.aiConfidenceThreshold !== 'number' || config.aiConfidenceThreshold < 0 || config.aiConfidenceThreshold > 1) {
        errors.push('aiConfidenceThreshold must be a number between 0 and 1');
      }
    }

    if (config.requireHumanReview !== undefined && typeof config.requireHumanReview !== 'boolean') {
      errors.push('requireHumanReview must be a boolean');
    }

    return errors;
  }

  /**
   * Get default type configuration for a category type
   */
  static getDefaultTypeConfig(categoryType, providedConfig = {}) {
    const defaults = {
      date: {
        dateFormat: 'YYYY-MM-DD',
        defaultValue: 't.b.d.',
        allowFuture: true,
        allowPast: true
      },
      currency: {
        defaultCurrency: 'USD',
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BTC', 'ETH'],
        allowNegative: true,
        allowZero: true,
        decimalPlaces: 2
      },
      'fixed-list': {
        allowAIExpansion: false,
        maxTags: 100,
        aiConfidenceThreshold: 0.85
      },
      'open-list': {
        allowAIExpansion: true,
        maxTags: 200,
        aiConfidenceThreshold: 0.7,
        requireHumanReview: false
      }
    };

    return {
      ...defaults[categoryType],
      ...providedConfig
    };
  }

  /**
   * Create a new category
   */
  static async createCategory(teamId, categoryData) {
    try {
      // Validate input
      if (!teamId || typeof teamId !== 'string') {
        throw new Error('Valid team ID is required');
      }

      this.validateCategoryData(categoryData);

      // Check for duplicate category name
      await this.validateUniqueName(teamId, categoryData.name.trim());

      // Prepare category document with type support
      const categoryDoc = {
        name: categoryData.name.trim(),
        categoryType: categoryData.categoryType || 'fixed-list', // Default for backwards compatibility
        typeConfig: this.getDefaultTypeConfig(categoryData.categoryType || 'fixed-list', categoryData.typeConfig),
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Only include tags for list types
      const categoryType = categoryData.categoryType || 'fixed-list';
      if (categoryType === 'fixed-list' || categoryType === 'open-list') {
        categoryDoc.tags = categoryData.tags || [];
      }

      // Include color if provided
      if (categoryData.color) {
        categoryDoc.color = categoryData.color;
      }

      // Add to Firestore
      const categoriesRef = this.getCategoriesCollection(teamId);
      const docRef = await addDoc(categoriesRef, categoryDoc);

      console.log(`[CategoryService] Created category: ${categoryData.name} (${docRef.id})`);
      return {
        id: docRef.id,
        ...categoryDoc
      };
    } catch (error) {
      console.error('[CategoryService] Failed to create category:', error);
      throw error;
    }
  }

  /**
   * Update an existing category
   */
  static async updateCategory(teamId, categoryId, updates) {
    try {
      // Validate input
      if (!teamId || typeof teamId !== 'string') {
        throw new Error('Valid team ID is required');
      }
      if (!categoryId || typeof categoryId !== 'string') {
        throw new Error('Valid category ID is required');
      }

      // Validate updates
      if (updates.name !== undefined || updates.tags !== undefined) {
        this.validateCategoryData({ 
          name: updates.name || 'temp', // Temporary name for validation
          ...updates 
        });
      }

      // Check for duplicate name if name is being updated
      if (updates.name) {
        await this.validateUniqueName(teamId, updates.name.trim(), categoryId);
      }

      // Prepare update document
      const updateDoc = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      // Clean up undefined values
      Object.keys(updateDoc).forEach(key => {
        if (updateDoc[key] === undefined) {
          delete updateDoc[key];
        }
      });

      // Update in Firestore
      const categoryRef = doc(db, 'teams', teamId, 'categories', categoryId);
      await updateDoc(categoryRef, updateDoc);

      console.log(`[CategoryService] Updated category: ${categoryId}`);
      return true;
    } catch (error) {
      console.error('[CategoryService] Failed to update category:', error);
      throw error;
    }
  }

  /**
   * Soft delete a category
   */
  static async deleteCategory(teamId, categoryId) {
    try {
      // Validate input
      if (!teamId || typeof teamId !== 'string') {
        throw new Error('Valid team ID is required');
      }
      if (!categoryId || typeof categoryId !== 'string') {
        throw new Error('Valid category ID is required');
      }

      // Soft delete by setting isActive to false
      const categoryRef = doc(db, 'teams', teamId, 'categories', categoryId);
      await updateDoc(categoryRef, {
        isActive: false,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log(`[CategoryService] Deleted category: ${categoryId}`);
      return true;
    } catch (error) {
      console.error('[CategoryService] Failed to delete category:', error);
      throw error;
    }
  }

  /**
   * Get all active categories for a team
   */
  static async getActiveCategories(teamId) {
    try {
      if (!teamId || typeof teamId !== 'string') {
        throw new Error('Valid team ID is required');
      }

      const categoriesRef = this.getCategoriesCollection(teamId);
      let q, snapshot;

      try {
        // Try querying with isActive filter first
        q = query(
          categoriesRef, 
          where('isActive', '==', true),
          orderBy('createdAt', 'asc')
        );
        snapshot = await getDocs(q);
      } catch (queryError) {
        console.log('[CategoryService] isActive query failed, trying fallback query:', queryError.message);
        
        // Fallback: Get all categories without isActive filter
        q = query(categoriesRef, orderBy('createdAt', 'asc'));
        snapshot = await getDocs(q);
      }

      const categories = [];
      const categoriesToMigrate = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Check if isActive field exists
        if (data.isActive === undefined) {
          // Mark for migration
          categoriesToMigrate.push({ id: doc.id, data });
          // Include in results as active (default behavior)
          categories.push({
            id: doc.id,
            ...data,
            isActive: true // Default to true for missing field
          });
        } else if (data.isActive === true) {
          // Include active categories
          categories.push({
            id: doc.id,
            ...data
          });
        }
        // Skip categories where isActive === false
      });

      // Migrate categories missing isActive field
      if (categoriesToMigrate.length > 0) {
        console.log(`[CategoryService] Migrating ${categoriesToMigrate.length} categories to add isActive field`);
        await this.migrateIsActiveField(teamId, categoriesToMigrate);
      }

      return categories;
    } catch (error) {
      console.error('[CategoryService] Failed to get categories:', error);
      throw error;
    }
  }

  /**
   * Migrate categories to add missing isActive field
   */
  static async migrateIsActiveField(teamId, categories) {
    try {
      const migrationPromises = categories.map(async ({ id }) => {
        const categoryRef = doc(db, 'teams', teamId, 'categories', id);
        return updateDoc(categoryRef, {
          isActive: true,
          updatedAt: serverTimestamp()
        });
      });

      await Promise.all(migrationPromises);
      console.log(`[CategoryService] Successfully migrated ${categories.length} categories with isActive field`);
    } catch (error) {
      console.error('[CategoryService] Failed to migrate categories:', error);
      // Don't throw - this is a background migration
    }
  }

  /**
   * Validate that category name is unique within team
   */
  static async validateUniqueName(teamId, categoryName, excludeCategoryId = null) {
    try {
      const categoriesRef = this.getCategoriesCollection(teamId);
      let q, snapshot;

      try {
        // Try querying with isActive filter first
        q = query(
          categoriesRef,
          where('isActive', '==', true),
          where('name', '==', categoryName.trim())
        );
        snapshot = await getDocs(q);
      } catch (queryError) {
        console.log('[CategoryService] isActive validation query failed, using fallback:', queryError.message);
        
        // Fallback: Get all categories with this name and filter manually
        q = query(
          categoriesRef,
          where('name', '==', categoryName.trim())
        );
        snapshot = await getDocs(q);
        
        // Filter for active categories (including those missing isActive field)
        const filteredDocs = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.isActive !== false) { // Include undefined and true
            filteredDocs.push(doc);
          }
        });
        
        // Create a mock snapshot-like object for consistency
        snapshot = { docs: filteredDocs };
      }

      const existingCategories = snapshot.docs.filter(doc => doc.id !== excludeCategoryId);

      if (existingCategories.length > 0) {
        throw new Error(`Category name "${categoryName}" already exists`);
      }

      return true;
    } catch (error) {
      // Re-throw validation errors, log others
      if (error.message.includes('already exists')) {
        throw error;
      }
      console.error('[CategoryService] Failed to validate unique name:', error);
      throw new Error('Failed to validate category name uniqueness');
    }
  }

  /**
   * Create default categories for new users
   */
  static async createDefaultCategories(teamId) {
    try {
      // Check if categories already exist
      const existingCategories = await this.getActiveCategories(teamId);
      if (existingCategories.length > 0) {
        console.log(`[CategoryService] Team ${teamId} already has categories, skipping default creation`);
        return existingCategories;
      }

      const defaultCategories = [
        {
          name: 'Document Type',
          categoryType: 'fixed-list',
          color: '#1976d2',
          tags: [
            { id: crypto.randomUUID(), name: 'Invoice', aiGenerated: false },
            { id: crypto.randomUUID(), name: 'Statement', aiGenerated: false },
            { id: crypto.randomUUID(), name: 'Receipt', aiGenerated: false },
            { id: crypto.randomUUID(), name: 'Contract', aiGenerated: false },
            { id: crypto.randomUUID(), name: 'Report', aiGenerated: false }
          ]
        },
        {
          name: 'Transaction Date',
          categoryType: 'date',
          color: '#388e3c',
          typeConfig: {
            dateFormat: 'YYYY-MM-DD',
            allowFuture: true,
            allowPast: true,
            defaultToToday: false
          }
        },
        {
          name: 'Amount',
          categoryType: 'currency',
          color: '#f57c00',
          typeConfig: {
            defaultCurrency: 'USD',
            supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BTC', 'ETH'],
            allowNegative: true,
            allowZero: true,
            decimalPlaces: 2
          }
        },
        {
          name: 'Institution',
          categoryType: 'open-list',
          color: '#f57c00',
          typeConfig: {
            allowAIExpansion: true,
            maxTags: 200,
            aiConfidenceThreshold: 0.7,
            requireHumanReview: false
          },
          tags: [
            { id: crypto.randomUUID(), name: 'Bank of America', aiGenerated: false, usageCount: 0 },
            { id: crypto.randomUUID(), name: 'Chase', aiGenerated: false, usageCount: 0 },
            { id: crypto.randomUUID(), name: 'Wells Fargo', aiGenerated: false, usageCount: 0 },
            { id: crypto.randomUUID(), name: 'Credit Union', aiGenerated: false, usageCount: 0 }
          ]
        }
      ];

      const createdCategories = [];
      for (const categoryData of defaultCategories) {
        const category = await this.createCategory(teamId, categoryData);
        createdCategories.push(category);
      }

      console.log(`[CategoryService] Created ${createdCategories.length} default categories for team ${teamId}`);
      return createdCategories;
    } catch (error) {
      console.error('[CategoryService] Failed to create default categories:', error);
      throw error;
    }
  }

  /**
   * Generate tag IDs for category tags
   */
  static generateTagIds(tags) {
    return tags.map(tag => ({
      ...tag,
      id: tag.id || crypto.randomUUID()
    }));
  }

  /**
   * Count categories for a team
   */
  static async getCategoryCount(teamId) {
    try {
      const categories = await this.getActiveCategories(teamId);
      return categories.length;
    } catch (error) {
      console.error('[CategoryService] Failed to get category count:', error);
      return 0;
    }
  }

  /**
   * Check if team has reached category limit
   */
  static async validateCategoryLimit(teamId, limit = 50) {
    try {
      const count = await this.getCategoryCount(teamId);
      if (count >= limit) {
        throw new Error(`Cannot create more than ${limit} categories`);
      }
      return true;
    } catch (error) {
      if (error.message.includes('Cannot create more than')) {
        throw error;
      }
      console.error('[CategoryService] Failed to validate category limit:', error);
      throw new Error('Failed to validate category limit');
    }
  }

  /**
   * Migrate legacy categories to include category type and type configuration
   */
  static async migrateCategoryTypes(teamId, categories) {
    try {
      const migrationPromises = categories.map(async ({ id, data }) => {
        const categoryRef = doc(db, 'teams', teamId, 'categories', id);
        
        // Determine category type based on existing data
        const migrationUpdate = {
          categoryType: 'fixed-list', // Default for all legacy categories
          typeConfig: this.getDefaultTypeConfig('fixed-list'),
          migrated: true,
          migratedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        // Ensure tags have proper structure for fixed-list categories
        if (data.tags && Array.isArray(data.tags)) {
          migrationUpdate.tags = data.tags.map(tag => ({
            id: tag.id || crypto.randomUUID(),
            name: tag.name,
            aiGenerated: false,
            usageCount: tag.usageCount || 0
          }));
        }

        return updateDoc(categoryRef, migrationUpdate);
      });

      await Promise.all(migrationPromises);
      console.log(`[CategoryService] Successfully migrated ${categories.length} categories to new type system`);
    } catch (error) {
      console.error('[CategoryService] Failed to migrate category types:', error);
      // Don't throw - this is a background migration
    }
  }

  /**
   * Add new tag to open-list category (for AI expansion)
   */
  static async addTagToCategory(teamId, categoryId, tagData) {
    try {
      if (!teamId || typeof teamId !== 'string') {
        throw new Error('Valid team ID is required');
      }
      if (!categoryId || typeof categoryId !== 'string') {
        throw new Error('Valid category ID is required');
      }

      // Get the current category
      const categoryRef = doc(db, 'teams', teamId, 'categories', categoryId);
      const categories = await this.getActiveCategories(teamId);
      const category = categories.find(cat => cat.id === categoryId);

      if (!category) {
        throw new Error('Category not found');
      }

      if (category.categoryType !== 'open-list') {
        throw new Error('Can only add tags to open-list categories');
      }

      // Check if tag already exists
      const existingTag = category.tags?.find(tag => 
        tag.name.toLowerCase() === tagData.name.toLowerCase()
      );
      if (existingTag) {
        throw new Error('Tag already exists in category');
      }

      // Prepare new tag
      const newTag = {
        id: tagData.id || crypto.randomUUID(),
        name: tagData.name.trim(),
        aiGenerated: tagData.aiGenerated || false,
        usageCount: tagData.usageCount || 0
      };

      // Add tag to category
      const updatedTags = [...(category.tags || []), newTag];
      await updateDoc(categoryRef, {
        tags: updatedTags,
        updatedAt: serverTimestamp()
      });

      console.log(`[CategoryService] Added tag '${newTag.name}' to category ${categoryId}`);
      return newTag;
    } catch (error) {
      console.error('[CategoryService] Failed to add tag to category:', error);
      throw error;
    }
  }

  /**
   * Increment tag usage count
   */
  static async incrementTagUsage(teamId, categoryId, tagName) {
    try {
      const categories = await this.getActiveCategories(teamId);
      const category = categories.find(cat => cat.id === categoryId);

      if (!category || !category.tags) {
        return;
      }

      const updatedTags = category.tags.map(tag => {
        if (tag.name === tagName) {
          return {
            ...tag,
            usageCount: (tag.usageCount || 0) + 1
          };
        }
        return tag;
      });

      const categoryRef = doc(db, 'teams', teamId, 'categories', categoryId);
      await updateDoc(categoryRef, {
        tags: updatedTags,
        updatedAt: serverTimestamp()
      });

      console.log(`[CategoryService] Incremented usage count for tag '${tagName}' in category ${categoryId}`);
    } catch (error) {
      console.error('[CategoryService] Failed to increment tag usage:', error);
      // Don't throw - this is a background operation
    }
  }
}