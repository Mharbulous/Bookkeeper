import { defineStore } from 'pinia';
import { ref } from 'vue';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { useAuthStore } from '../../../core/stores/auth.js';

export const useTagStore = defineStore('tag', () => {
  // State
  const loading = ref(false);
  const error = ref(null);
  
  // Auth store reference
  const authStore = useAuthStore();

  /**
   * Update structured tags for evidence document
   */
  const updateEvidenceStructuredTags = async (evidenceId, tagsByHuman = [], tagsByAI = []) => {
    try {
      if (!authStore.isAuthenticated) {
        throw new Error('User not authenticated');
      }

      const teamId = authStore.currentTeam;
      if (!teamId) {
        throw new Error('No team ID available');
      }

      // Validate tag structure
      validateStructuredTags(tagsByHuman);
      validateStructuredTags(tagsByAI);

      const evidenceRef = doc(db, 'teams', teamId, 'evidence', evidenceId);
      await updateDoc(evidenceRef, {
        tagsByHuman,
        tagsByAI,
        tagCount: tagsByHuman.length + tagsByAI.length,
        lastTaggedAt: serverTimestamp(),
        taggedBy: 'manual',
        updatedAt: serverTimestamp(),
      });

      console.log(`[TagStore] Updated structured tags for evidence ${evidenceId}`);
      return true;
    } catch (err) {
      console.error('[TagStore] Failed to update structured tags:', err);
      throw err;
    }
  };

  /**
   * Add a structured tag to evidence document
   */
  const addStructuredTag = async (evidenceId, tagData, currentTags = []) => {
    try {
      // Validate tag data
      if (!tagData.categoryId || !tagData.tagId || !tagData.categoryName || !tagData.tagName) {
        throw new Error('Invalid tag data structure');
      }

      // Check if tag already exists
      const existingTag = currentTags.find(
        tag => tag.categoryId === tagData.categoryId && tag.tagId === tagData.tagId
      );
      
      if (existingTag) {
        console.log(`[TagStore] Tag already exists: ${tagData.tagName}`);
        return currentTags;
      }

      const updatedTags = [...currentTags, tagData];
      await updateEvidenceStructuredTags(evidenceId, updatedTags);
      
      return updatedTags;
    } catch (err) {
      console.error('[TagStore] Failed to add structured tag:', err);
      throw err;
    }
  };

  /**
   * Remove a structured tag from evidence document
   */
  const removeStructuredTag = async (evidenceId, categoryId, tagId, currentTags = []) => {
    try {
      const updatedTags = currentTags.filter(
        tag => !(tag.categoryId === categoryId && tag.tagId === tagId)
      );
      
      await updateEvidenceStructuredTags(evidenceId, updatedTags);
      
      return updatedTags;
    } catch (err) {
      console.error('[TagStore] Failed to remove structured tag:', err);
      throw err;
    }
  };

  /**
   * Replace all tags in a category for evidence document
   */
  const replaceTagsInCategory = async (evidenceId, categoryId, newTags, currentTags = []) => {
    try {
      // Remove existing tags from this category
      const tagsFromOtherCategories = currentTags.filter(
        tag => tag.categoryId !== categoryId
      );
      
      // Add new tags for this category
      const updatedTags = [...tagsFromOtherCategories, ...newTags];
      
      await updateEvidenceStructuredTags(evidenceId, updatedTags);
      
      return updatedTags;
    } catch (err) {
      console.error('[TagStore] Failed to replace category tags:', err);
      throw err;
    }
  };

  /**
   * Validate structured tag format
   */
  const validateStructuredTags = (tags) => {
    if (!Array.isArray(tags)) {
      throw new Error('Tags must be an array');
    }

    tags.forEach((tag, index) => {
      if (!tag.categoryId || typeof tag.categoryId !== 'string') {
        throw new Error(`Tag ${index}: categoryId is required and must be a string`);
      }
      if (!tag.categoryName || typeof tag.categoryName !== 'string') {
        throw new Error(`Tag ${index}: categoryName is required and must be a string`);
      }
      if (!tag.tagId || typeof tag.tagId !== 'string') {
        throw new Error(`Tag ${index}: tagId is required and must be a string`);
      }
      if (!tag.tagName || typeof tag.tagName !== 'string') {
        throw new Error(`Tag ${index}: tagName is required and must be a string`);
      }
      if (!tag.color || typeof tag.color !== 'string') {
        throw new Error(`Tag ${index}: color is required and must be a string`);
      }
      // Validate hex color format
      if (!/^#[0-9A-Fa-f]{6}$/.test(tag.color)) {
        throw new Error(`Tag ${index}: color must be a valid hex color`);
      }
    });
  };

  /**
   * Create structured tag object
   */
  const createStructuredTag = (category, tagData) => {
    return {
      categoryId: category.id,
      categoryName: category.name,
      tagId: tagData.id || crypto.randomUUID(),
      tagName: tagData.name,
      color: tagData.color || category.color
    };
  };

  /**
   * Get tags grouped by category
   */
  const groupTagsByCategory = (tags = []) => {
    const grouped = {};
    
    tags.forEach(tag => {
      if (!grouped[tag.categoryId]) {
        grouped[tag.categoryId] = {
          categoryName: tag.categoryName,
          tags: []
        };
      }
      grouped[tag.categoryId].tags.push(tag);
    });
    
    return grouped;
  };

  /**
   * Get all unique tag names for a category across all evidence
   */
  const getUniqueTagsForCategory = (categoryId, allEvidence = []) => {
    const tagSet = new Set();
    
    allEvidence.forEach(evidence => {
      const humanTags = evidence.tagsByHuman || [];
      const aiTags = evidence.tagsByAI || [];
      
      [...humanTags, ...aiTags].forEach(tag => {
        if (tag.categoryId === categoryId) {
          tagSet.add(tag.tagName);
        }
      });
    });
    
    return Array.from(tagSet).sort();
  };

  /**
   * Migrate legacy tags to structured format
   */
  const migrateLegacyTags = async (evidenceId, legacyTags = [], categoryMappings = {}) => {
    try {
      const structuredTags = [];
      
      legacyTags.forEach(tagName => {
        // Try to find matching category mapping
        const mappingEntry = Object.entries(categoryMappings).find(
          ([pattern]) => tagName.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (mappingEntry) {
          const [, categoryData] = mappingEntry;
          structuredTags.push({
            categoryId: categoryData.id,
            categoryName: categoryData.name,
            tagId: crypto.randomUUID(),
            tagName: tagName,
            color: categoryData.color
          });
        }
      });
      
      if (structuredTags.length > 0) {
        await updateEvidenceStructuredTags(evidenceId, structuredTags);
      }
      
      return structuredTags;
    } catch (err) {
      console.error('[TagStore] Failed to migrate legacy tags:', err);
      throw err;
    }
  };

  return {
    // State
    loading,
    error,

    // Actions
    updateEvidenceStructuredTags,
    addStructuredTag,
    removeStructuredTag,
    replaceTagsInCategory,
    createStructuredTag,
    groupTagsByCategory,
    getUniqueTagsForCategory,
    migrateLegacyTags,
    validateStructuredTags
  };
});