import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { collection, query, where, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { useAuthStore } from '../../../core/stores/auth.js';
import { CategoryService } from '../services/categoryService.js';

export const useCategoryStore = defineStore('category', () => {
  // State
  const categories = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const isInitialized = ref(false);
  
  // Auth store reference
  const authStore = useAuthStore();

  // Computed
  const categoryCount = computed(() => categories.value.length);
  const activeCategories = computed(() => categories.value.filter(cat => cat.isActive));
  
  // Default category colors palette
  const defaultColors = [
    '#1976d2', // Blue - Document Type
    '#388e3c', // Green - Date/Period  
    '#f57c00', // Orange - Institution
    '#7b1fa2', // Purple
    '#d32f2f', // Red
    '#455a64', // Blue Grey
    '#00796b', // Teal
    '#f57f17', // Yellow
    '#e91e63', // Pink
    '#795548', // Brown
  ];

  /**
   * Load categories from Firestore with real-time updates
   */
  const loadCategories = async () => {
    if (!authStore.isAuthenticated) {
      error.value = 'User not authenticated';
      return;
    }

    try {
      loading.value = true;
      error.value = null;

      const teamId = authStore.currentTeam;
      if (!teamId) {
        throw new Error('No team ID available');
      }

      // Create query for categories collection
      const categoriesRef = collection(db, 'teams', teamId, 'categories');
      const categoriesQuery = query(
        categoriesRef,
        where('isActive', '==', true),
        orderBy('createdAt', 'asc')
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        categoriesQuery,
        async (snapshot) => {
          const loadedCategories = [];
          
          snapshot.docs.forEach(doc => {
            loadedCategories.push({
              id: doc.id,
              ...doc.data()
            });
          });

          // If no categories exist, create default categories for first-time users
          if (loadedCategories.length === 0) {
            console.log('[CategoryStore] No categories found, creating defaults...');
            try {
              await CategoryService.createDefaultCategories(teamId);
              // The onSnapshot will fire again after categories are created
              return;
            } catch (error) {
              console.error('[CategoryStore] Failed to create default categories:', error);
            }
          }

          categories.value = loadedCategories;
          loading.value = false;
          isInitialized.value = true;

          console.log(`[CategoryStore] Loaded ${loadedCategories.length} categories`);
        },
        (err) => {
          console.error('[CategoryStore] Error loading categories:', err);
          error.value = err.message;
          loading.value = false;
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error('[CategoryStore] Failed to load categories:', err);
      error.value = err.message;
      loading.value = false;
    }
  };

  /**
   * Create a new category
   */
  const createCategory = async (categoryData) => {
    try {
      if (!authStore.isAuthenticated) {
        throw new Error('User not authenticated');
      }

      const teamId = authStore.currentTeam;
      if (!teamId) {
        throw new Error('No team ID available');
      }

      // Validate required fields
      if (!categoryData.name || !categoryData.name.trim()) {
        throw new Error('Category name is required');
      }

      // Check for duplicate names
      const existingCategory = categories.value.find(
        cat => cat.name.toLowerCase() === categoryData.name.trim().toLowerCase()
      );
      if (existingCategory) {
        throw new Error('Category name already exists');
      }

      // Assign default color if not provided
      const color = categoryData.color || getNextDefaultColor();

      const newCategory = {
        name: categoryData.name.trim(),
        color,
        tags: categoryData.tags || [],
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const categoriesRef = collection(db, 'teams', teamId, 'categories');
      const docRef = await addDoc(categoriesRef, newCategory);

      console.log(`[CategoryStore] Created category: ${categoryData.name}`);
      return docRef.id;
    } catch (err) {
      console.error('[CategoryStore] Failed to create category:', err);
      throw err;
    }
  };

  /**
   * Update an existing category
   */
  const updateCategory = async (categoryId, updates) => {
    try {
      if (!authStore.isAuthenticated) {
        throw new Error('User not authenticated');
      }

      const teamId = authStore.currentTeam;
      if (!teamId) {
        throw new Error('No team ID available');
      }

      // Validate name if being updated
      if (updates.name) {
        const existingCategory = categories.value.find(
          cat => cat.id !== categoryId && 
          cat.name.toLowerCase() === updates.name.trim().toLowerCase()
        );
        if (existingCategory) {
          throw new Error('Category name already exists');
        }
      }

      const categoryRef = doc(db, 'teams', teamId, 'categories', categoryId);
      await updateDoc(categoryRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      console.log(`[CategoryStore] Updated category: ${categoryId}`);
      return true;
    } catch (err) {
      console.error('[CategoryStore] Failed to update category:', err);
      throw err;
    }
  };

  /**
   * Delete a category (soft delete)
   */
  const deleteCategory = async (categoryId) => {
    try {
      if (!authStore.isAuthenticated) {
        throw new Error('User not authenticated');
      }

      const teamId = authStore.currentTeam;
      if (!teamId) {
        throw new Error('No team ID available');
      }

      const categoryRef = doc(db, 'teams', teamId, 'categories', categoryId);
      await updateDoc(categoryRef, {
        isActive: false,
        updatedAt: serverTimestamp()
      });

      console.log(`[CategoryStore] Deleted category: ${categoryId}`);
      return true;
    } catch (err) {
      console.error('[CategoryStore] Failed to delete category:', err);
      throw err;
    }
  };

  /**
   * Get next available default color
   */
  const getNextDefaultColor = () => {
    const usedColors = categories.value.map(cat => cat.color);
    const availableColor = defaultColors.find(color => !usedColors.includes(color));
    return availableColor || defaultColors[0]; // Fallback to first color if all used
  };

  /**
   * Generate color variation for tags within a category
   */
  const generateTagColor = (baseColor, index = 0) => {
    // Simple color variation by adjusting lightness
    const variations = [
      baseColor, // Original color
      adjustColor(baseColor, -20), // Darker
      adjustColor(baseColor, 20),  // Lighter
      adjustColor(baseColor, -40), // Much darker
      adjustColor(baseColor, 40),  // Much lighter
    ];
    
    return variations[index % variations.length] || baseColor;
  };

  /**
   * Adjust color brightness
   */
  const adjustColor = (hexColor, percent) => {
    const num = parseInt(hexColor.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  /**
   * Get category by ID
   */
  const getCategoryById = (categoryId) => {
    return categories.value.find(cat => cat.id === categoryId);
  };

  /**
   * Reset store to initial state
   */
  const reset = () => {
    categories.value = [];
    loading.value = false;
    error.value = null;
    isInitialized.value = false;
  };

  return {
    // State
    categories,
    loading,
    error,
    isInitialized,

    // Computed
    categoryCount,
    activeCategories,
    defaultColors,

    // Actions
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    generateTagColor,
    getNextDefaultColor,
    reset
  };
});