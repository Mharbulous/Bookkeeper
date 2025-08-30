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
   * Validate category data structure
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

    // Color validation
    if (categoryData.color && !/^#[0-9A-Fa-f]{6}$/.test(categoryData.color)) {
      errors.push('Category color must be a valid hex color (e.g., #1976d2)');
    }

    // Tags validation
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
        if (tag.color && !/^#[0-9A-Fa-f]{6}$/.test(tag.color)) {
          errors.push(`Tag ${index + 1}: color must be a valid hex color`);
        }
      });

      // Check for duplicate tag names
      const tagNames = categoryData.tags.map(tag => tag.name?.trim().toLowerCase()).filter(Boolean);
      const uniqueNames = [...new Set(tagNames)];
      if (tagNames.length !== uniqueNames.length) {
        errors.push('Category cannot have duplicate tag names');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Category validation failed: ${errors.join(', ')}`);
    }

    return true;
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

      // Prepare category document
      const categoryDoc = {
        name: categoryData.name.trim(),
        color: categoryData.color || '#1976d2',
        tags: categoryData.tags || [],
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

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
      if (updates.name !== undefined || updates.tags !== undefined || updates.color !== undefined) {
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
      const q = query(
        categoriesRef, 
        where('isActive', '==', true),
        orderBy('createdAt', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const categories = [];
      
      snapshot.forEach(doc => {
        categories.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return categories;
    } catch (error) {
      console.error('[CategoryService] Failed to get categories:', error);
      throw error;
    }
  }

  /**
   * Validate that category name is unique within team
   */
  static async validateUniqueName(teamId, categoryName, excludeCategoryId = null) {
    try {
      const categoriesRef = this.getCategoriesCollection(teamId);
      const q = query(
        categoriesRef,
        where('isActive', '==', true),
        where('name', '==', categoryName.trim())
      );

      const snapshot = await getDocs(q);
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
          color: '#1976d2',
          tags: [
            { name: 'Invoice', color: '#1976d2' },
            { name: 'Statement', color: '#1565c0' },
            { name: 'Receipt', color: '#0d47a1' },
            { name: 'Contract', color: '#1976d2' },
            { name: 'Report', color: '#1565c0' }
          ]
        },
        {
          name: 'Date/Period',
          color: '#388e3c',
          tags: [
            { name: 'Q1 2024', color: '#388e3c' },
            { name: 'Q2 2024', color: '#2e7d32' },
            { name: 'Q3 2024', color: '#1b5e20' },
            { name: 'Q4 2024', color: '#388e3c' },
            { name: '2024', color: '#2e7d32' }
          ]
        },
        {
          name: 'Institution',
          color: '#f57c00',
          tags: [
            { name: 'Bank of America', color: '#f57c00' },
            { name: 'Chase', color: '#ef6c00' },
            { name: 'Wells Fargo', color: '#e65100' },
            { name: 'Credit Union', color: '#f57c00' },
            { name: 'Other Bank', color: '#ef6c00' }
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
}