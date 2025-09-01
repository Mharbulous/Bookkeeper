import { ref, computed } from 'vue';
import { collection, query, where, orderBy, onSnapshot, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { useAuthStore } from '../../../core/stores/auth.js';
import { CategoryService } from '../services/categoryService.js';

/**
 * Category Core Module
 * Handles basic CRUD operations, state management, and real-time updates
 */
export function useCategoryCore() {
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
      
      // DEBUG: Log when category loading starts
      console.log(`[DEBUG ORGANIZER LOADING] Category store loading started at: ${new Date().toISOString()} (${Date.now()})`);

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
            console.log('[CategoryCore] No categories found, creating defaults...');
            try {
              await CategoryService.createDefaultCategories(teamId);
              // The onSnapshot will fire again after categories are created
              return;
            } catch (error) {
              console.error('[CategoryCore] Failed to create default categories:', error);
            }
          }

          categories.value = loadedCategories;
          loading.value = false;
          isInitialized.value = true;

          console.log(`[DEBUG ORGANIZER LOADING] Category store loading completed at: ${new Date().toISOString()} (${Date.now()})`);
          console.log(`[CategoryCore] Loaded ${loadedCategories.length} categories`);
        },
        (err) => {
          console.error('[CategoryCore] Error loading categories:', err);
          error.value = err.message;
          loading.value = false;
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error('[CategoryCore] Failed to load categories:', err);
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

      const newCategory = {
        name: categoryData.name.trim(),
        color: categoryData.color || '#1976d2', // Default color will be handled by color module
        tags: categoryData.tags || [],
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const categoriesRef = collection(db, 'teams', teamId, 'categories');
      const docRef = await addDoc(categoriesRef, newCategory);

      console.log(`[CategoryCore] Created category: ${categoryData.name}`);
      return docRef.id;
    } catch (err) {
      console.error('[CategoryCore] Failed to create category:', err);
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

      console.log(`[CategoryCore] Updated category: ${categoryId}`);
      return true;
    } catch (err) {
      console.error('[CategoryCore] Failed to update category:', err);
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

      console.log(`[CategoryCore] Deleted category: ${categoryId}`);
      return true;
    } catch (err) {
      console.error('[CategoryCore] Failed to delete category:', err);
      throw err;
    }
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

    // Actions
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    reset
  };
}