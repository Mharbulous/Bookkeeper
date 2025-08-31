import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  writeBatch 
} from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { useAuthStore } from '../../../core/stores/auth.js';

/**
 * Tag Subcollection Service - Handles CRUD operations for tag subcollections
 * Provides operations for the new subcollection-based tag architecture
 */
export class TagSubcollectionService {
  constructor(teamId = null) {
    this.teamId = teamId;
  }

  /**
   * Get the current team ID from auth store if not provided in constructor
   * @returns {string} - Current team ID
   */
  getTeamId() {
    if (this.teamId) {
      return this.teamId;
    }
    
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) {
      throw new Error('User not authenticated');
    }
    
    return authStore.currentTeam;
  }

  /**
   * Add a tag to an evidence document's subcollection
   * @param {string} evidenceId - Evidence document ID
   * @param {Object} tagData - Tag data object
   * @returns {Promise<Object>} - Created tag with ID
   */
  async addTag(evidenceId, tagData) {
    try {
      const teamId = this.getTeamId();
      const tagsCollectionRef = collection(db, 'teams', teamId, 'evidence', evidenceId, 'tags');
      
      const tagToAdd = {
        categoryId: tagData.categoryId,
        categoryName: tagData.categoryName,
        tagName: tagData.tagName,
        color: tagData.color,
        source: tagData.source || 'human', // 'human' | 'ai'
        createdAt: serverTimestamp(),
        createdBy: tagData.createdBy || 'user-id',
        ...(tagData.confidence && { confidence: tagData.confidence }), // Only for AI tags
        ...(tagData.metadata && { metadata: tagData.metadata })
      };

      const docRef = await addDoc(tagsCollectionRef, tagToAdd);
      
      // Update evidence document's tag count and last tagged timestamp
      await this.updateEvidenceTagMetadata(evidenceId, teamId);
      
      console.log(`[TagSubcollectionService] Added tag ${tagData.tagName} to ${evidenceId}`);
      
      return {
        id: docRef.id,
        ...tagToAdd
      };
    } catch (error) {
      console.error('[TagSubcollectionService] Failed to add tag:', error);
      throw error;
    }
  }

  /**
   * Remove a tag from an evidence document's subcollection
   * @param {string} evidenceId - Evidence document ID
   * @param {string} tagId - Tag document ID to remove
   * @returns {Promise<void>}
   */
  async removeTag(evidenceId, tagId) {
    try {
      const teamId = this.getTeamId();
      const tagDocRef = doc(db, 'teams', teamId, 'evidence', evidenceId, 'tags', tagId);
      
      await deleteDoc(tagDocRef);
      
      // Update evidence document's tag count and last tagged timestamp
      await this.updateEvidenceTagMetadata(evidenceId, teamId);
      
      console.log(`[TagSubcollectionService] Removed tag ${tagId} from ${evidenceId}`);
    } catch (error) {
      console.error('[TagSubcollectionService] Failed to remove tag:', error);
      throw error;
    }
  }

  /**
   * Update a tag in an evidence document's subcollection
   * @param {string} evidenceId - Evidence document ID
   * @param {string} tagId - Tag document ID to update
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated tag data
   */
  async updateTag(evidenceId, tagId, updates) {
    try {
      const teamId = this.getTeamId();
      const tagDocRef = doc(db, 'teams', teamId, 'evidence', evidenceId, 'tags', tagId);
      
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(tagDocRef, updateData);
      
      // Get updated tag data
      const updatedTagSnap = await getDoc(tagDocRef);
      
      console.log(`[TagSubcollectionService] Updated tag ${tagId} in ${evidenceId}`);
      
      return {
        id: updatedTagSnap.id,
        ...updatedTagSnap.data()
      };
    } catch (error) {
      console.error('[TagSubcollectionService] Failed to update tag:', error);
      throw error;
    }
  }

  /**
   * Get all tags for an evidence document
   * @param {string} evidenceId - Evidence document ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of tag objects
   */
  async getTagsForEvidence(evidenceId, options = {}) {
    try {
      const teamId = this.getTeamId();
      const tagsCollectionRef = collection(db, 'teams', teamId, 'evidence', evidenceId, 'tags');
      
      let q = query(tagsCollectionRef);
      
      // Apply filters if provided
      if (options.source) {
        q = query(q, where('source', '==', options.source));
      }
      
      if (options.categoryId) {
        q = query(q, where('categoryId', '==', options.categoryId));
      }
      
      // Default order by creation date
      q = query(q, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      
      const tags = [];
      querySnapshot.forEach((doc) => {
        tags.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`[TagSubcollectionService] Retrieved ${tags.length} tags for ${evidenceId}`);
      return tags;
    } catch (error) {
      console.error('[TagSubcollectionService] Failed to get tags for evidence:', error);
      throw error;
    }
  }

  /**
   * Get human tags for an evidence document
   * @param {string} evidenceId - Evidence document ID
   * @returns {Promise<Array>} - Array of human tag objects
   */
  async getHumanTags(evidenceId) {
    return await this.getTagsForEvidence(evidenceId, { source: 'human' });
  }

  /**
   * Get AI tags for an evidence document
   * @param {string} evidenceId - Evidence document ID
   * @returns {Promise<Array>} - Array of AI tag objects
   */
  async getAITags(evidenceId) {
    return await this.getTagsForEvidence(evidenceId, { source: 'ai' });
  }

  /**
   * Update evidence document's tag metadata (count and last tagged timestamp)
   * @param {string} evidenceId - Evidence document ID
   * @param {string} teamId - Team ID
   * @returns {Promise<void>}
   */
  async updateEvidenceTagMetadata(evidenceId, teamId) {
    try {
      const evidenceRef = doc(db, 'teams', teamId, 'evidence', evidenceId);
      const tagsCollectionRef = collection(db, 'teams', teamId, 'evidence', evidenceId, 'tags');
      
      // Get current tag count
      const tagsSnapshot = await getDocs(tagsCollectionRef);
      const tagCount = tagsSnapshot.size;
      
      // Update evidence document with tag count and timestamp
      await updateDoc(evidenceRef, {
        tagCount: tagCount,
        lastTaggedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('[TagSubcollectionService] Failed to update evidence tag metadata:', error);
      throw error;
    }
  }

  /**
   * Listen to real-time changes for tags in an evidence document
   * @param {string} evidenceId - Evidence document ID
   * @param {Function} callback - Callback function to handle updates
   * @param {Object} options - Query options
   * @returns {Function} - Unsubscribe function
   */
  subscribeToTags(evidenceId, callback, options = {}) {
    try {
      const teamId = this.getTeamId();
      const tagsCollectionRef = collection(db, 'teams', teamId, 'evidence', evidenceId, 'tags');
      
      let q = query(tagsCollectionRef, orderBy('createdAt', 'desc'));
      
      // Apply filters if provided
      if (options.source) {
        q = query(q, where('source', '==', options.source));
      }
      
      return onSnapshot(q, (querySnapshot) => {
        const tags = [];
        querySnapshot.forEach((doc) => {
          tags.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        callback(tags);
      });
    } catch (error) {
      console.error('[TagSubcollectionService] Failed to subscribe to tags:', error);
      throw error;
    }
  }

  /**
   * Batch add multiple tags to an evidence document
   * @param {string} evidenceId - Evidence document ID
   * @param {Array} tagDataArray - Array of tag data objects
   * @returns {Promise<Array>} - Array of created tag IDs
   */
  async addTagsBatch(evidenceId, tagDataArray) {
    try {
      const teamId = this.getTeamId();
      const batch = writeBatch(db);
      const createdTagIds = [];
      
      for (const tagData of tagDataArray) {
        const tagsCollectionRef = collection(db, 'teams', teamId, 'evidence', evidenceId, 'tags');
        const newTagRef = doc(tagsCollectionRef);
        
        const tagToAdd = {
          categoryId: tagData.categoryId,
          categoryName: tagData.categoryName,
          tagName: tagData.tagName,
          color: tagData.color,
          source: tagData.source || 'human',
          createdAt: serverTimestamp(),
          createdBy: tagData.createdBy || 'user-id',
          ...(tagData.confidence && { confidence: tagData.confidence }),
          ...(tagData.metadata && { metadata: tagData.metadata })
        };
        
        batch.set(newTagRef, tagToAdd);
        createdTagIds.push(newTagRef.id);
      }
      
      await batch.commit();
      
      // Update evidence document's tag count and timestamp
      await this.updateEvidenceTagMetadata(evidenceId, teamId);
      
      console.log(`[TagSubcollectionService] Batch added ${tagDataArray.length} tags to ${evidenceId}`);
      return createdTagIds;
    } catch (error) {
      console.error('[TagSubcollectionService] Failed to batch add tags:', error);
      throw error;
    }
  }
}

export default TagSubcollectionService;