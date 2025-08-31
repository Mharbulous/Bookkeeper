import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore'
import { db } from '../../../services/firebase.js'

/**
 * Service for managing tags in Firestore subcollections (NEW structure)
 * 
 * Data Structure:
 * /teams/{teamId}/evidence/{docId}/tags/{categoryId}
 * 
 * Tag Document Structure:
 * {
 *   tagName: string,           // The actual tag text
 *   confidence: number,        // AI confidence score (0-100)
 *   status: string,           // 'pending' | 'approved' | 'rejected'
 *   autoApproved: boolean,    // Whether auto-approved by confidence threshold
 *   createdAt: timestamp,     // When tag was generated
 *   reviewedAt: timestamp,    // When tag was manually reviewed (if applicable)
 *   source: string,          // 'ai' | 'manual' | 'bulk_import'
 *   metadata: {              // Optional AI processing metadata
 *     model: string,         // AI model used
 *     processingTime: number,// Time taken to generate
 *     context: string        // Additional context used
 *   }
 * }
 */

class TagSubcollectionService {
  constructor() {
    this.confidenceThreshold = 85 // Default auto-approval threshold
  }

  /**
   * Get reference to tags subcollection for a document
   */
  getTagsCollection(docId, teamId) {
    if (!teamId) {
      throw new Error('Team ID is required for tag operations')
    }
    return collection(db, 'teams', teamId, 'evidence', docId, 'tags')
  }

  /**
   * Get reference to a specific tag document
   */
  getTagDoc(docId, tagId, teamId) {
    if (!teamId) {
      throw new Error('Team ID is required for tag operations')
    }
    return doc(db, 'teams', teamId, 'evidence', docId, 'tags', tagId)
  }

  /**
   * Add a new tag to a document (using NEW data structure with categoryId as document ID)
   */
  async addTag(docId, tagData, teamId) {
    try {
      const tagsCollection = this.getTagsCollection(docId, teamId)
      
      // Use categoryId as the document ID (per migration plan)
      if (!tagData.categoryId) {
        throw new Error('categoryId is required for new tag structure')
      }
      
      // Create the tag document with NEW structure from migration plan
      const tagDoc = {
        categoryId: tagData.categoryId,
        categoryName: tagData.categoryName,
        tagName: tagData.tagName,
        color: tagData.color,
        source: tagData.source,
        confidence: tagData.confidence,
        autoApproved: tagData.autoApproved,
        reviewRequired: tagData.reviewRequired,
        createdAt: serverTimestamp(),
        createdBy: tagData.createdBy,
        metadata: tagData.metadata || {}
      }

      // Add reviewedAt timestamp if this is an auto-approved AI tag
      if (tagData.autoApproved && tagData.source !== 'human') {
        tagDoc.reviewedAt = serverTimestamp()
      }

      // Use categoryId as document ID instead of generating random ID
      const tagDocRef = doc(tagsCollection, tagData.categoryId)
      await setDoc(tagDocRef, tagDoc)
      
      return { id: tagData.categoryId, ...tagDoc }
    } catch (error) {
      console.error('Error adding tag:', error)
      throw error
    }
  }

  /**
   * Add multiple tags in a batch operation
   */
  async addTagsBatch(docId, tagsArray, teamId) {
    try {
      const batch = writeBatch(db)
      const tagsCollection = this.getTagsCollection(docId, teamId)
      const addedTags = []

      for (const tagData of tagsArray) {
        // Determine if tag should be auto-approved based on confidence
        const autoApproved = tagData.confidence >= this.confidenceThreshold
        const status = autoApproved ? 'approved' : 'pending'
        
        const tagDoc = {
          tagName: tagData.tagName,
          confidence: tagData.confidence,
          status: status,
          autoApproved: autoApproved,
          createdAt: serverTimestamp(),
          source: tagData.source || 'ai',
          metadata: tagData.metadata || {}
        }

        // Add reviewed timestamp if auto-approved
        if (autoApproved) {
          tagDoc.reviewedAt = serverTimestamp()
        }

        const newTagRef = doc(tagsCollection)
        batch.set(newTagRef, tagDoc)
        addedTags.push({ id: newTagRef.id, ...tagDoc })
      }

      await batch.commit()
      return addedTags
    } catch (error) {
      console.error('Error adding tags batch:', error)
      throw error
    }
  }

  /**
   * Get all tags for a document (NEW structure)
   */
  async getTags(docId, options = {}, teamId) {
    try {
      const tagsCollection = this.getTagsCollection(docId, teamId)
      let q = query(tagsCollection, orderBy('createdAt', 'desc'))

      // Note: No longer filtering by 'status' field - using new structure with autoApproved/reviewRequired
      // Filtering now handled by getTagsByStatus method

      const querySnapshot = await getDocs(q)
      const tags = []
      
      querySnapshot.forEach((doc) => {
        tags.push({
          id: doc.id, // This is now the categoryId
          ...doc.data()
        })
      })

      return tags
    } catch (error) {
      console.error('Error getting tags:', error)
      throw error
    }
  }

  /**
   * Get tags grouped by status (NEW structure using autoApproved/reviewRequired)
   */
  async getTagsByStatus(docId, teamId) {
    try {
      const allTags = await this.getTags(docId, {}, teamId)
      
      return {
        // Pending: AI tags that need review (reviewRequired = true)
        pending: allTags.filter(tag => tag.reviewRequired === true),
        // Approved: Either human tags or auto-approved AI tags or manually approved AI tags
        approved: allTags.filter(tag => 
          tag.source === 'human' || 
          tag.autoApproved === true || 
          (tag.source === 'ai' && tag.reviewRequired === false && tag.reviewedAt)
        ),
        // Rejected: AI tags that were manually rejected (for future use)
        rejected: allTags.filter(tag => tag.rejected === true) // New field for rejected tags
      }
    } catch (error) {
      console.error('Error getting tags by status:', error)
      throw error
    }
  }

  /**
   * Get only approved tags for a document (NEW structure)
   */
  async getApprovedTags(docId, teamId) {
    const tagsByStatus = await this.getTagsByStatus(docId, teamId)
    return tagsByStatus.approved
  }

  /**
   * Get only pending tags for a document (NEW structure)
   */
  async getPendingTags(docId, teamId) {
    const tagsByStatus = await this.getTagsByStatus(docId, teamId)
    return tagsByStatus.pending
  }

  /**
   * Approve an AI tag (NEW structure)
   */
  async approveAITag(docId, categoryId, teamId) {
    try {
      const tagRef = this.getTagDoc(docId, categoryId, teamId)
      
      const updateData = {
        reviewRequired: false,
        reviewedAt: serverTimestamp(),
        humanApproved: true
      }

      await updateDoc(tagRef, updateData)
      return { id: categoryId, ...updateData }
    } catch (error) {
      console.error('Error approving AI tag:', error)
      throw error
    }
  }

  /**
   * Reject an AI tag (NEW structure)
   */
  async rejectAITag(docId, categoryId, teamId) {
    try {
      const tagRef = this.getTagDoc(docId, categoryId, teamId)
      
      const updateData = {
        reviewRequired: false,
        rejected: true,
        reviewedAt: serverTimestamp(),
        humanRejected: true
      }

      await updateDoc(tagRef, updateData)
      return { id: categoryId, ...updateData }
    } catch (error) {
      console.error('Error rejecting AI tag:', error)
      throw error
    }
  }

  /**
   * Approve a tag (compatibility wrapper for NEW structure)
   */
  async approveTag(docId, categoryId, teamId) {
    return await this.approveAITag(docId, categoryId, teamId)
  }

  /**
   * Reject a tag (compatibility wrapper for NEW structure)
   */
  async rejectTag(docId, categoryId, teamId) {
    return await this.rejectAITag(docId, categoryId, teamId)
  }

  /**
   * Bulk approve multiple tags (NEW structure)
   */
  async approveTagsBatch(docId, categoryIds, teamId) {
    try {
      const batch = writeBatch(db)
      
      for (const categoryId of categoryIds) {
        const tagRef = this.getTagDoc(docId, categoryId, teamId)
        batch.update(tagRef, {
          reviewRequired: false,
          reviewedAt: serverTimestamp(),
          humanApproved: true
        })
      }

      await batch.commit()
      return { approved: categoryIds.length }
    } catch (error) {
      console.error('Error approving tags batch:', error)
      throw error
    }
  }

  /**
   * Bulk reject multiple tags (NEW structure)
   */
  async rejectTagsBatch(docId, categoryIds, teamId) {
    try {
      const batch = writeBatch(db)
      
      for (const categoryId of categoryIds) {
        const tagRef = this.getTagDoc(docId, categoryId, teamId)
        batch.update(tagRef, {
          reviewRequired: false,
          rejected: true,
          reviewedAt: serverTimestamp(),
          humanRejected: true
        })
      }

      await batch.commit()
      return { rejected: categoryIds.length }
    } catch (error) {
      console.error('Error rejecting tags batch:', error)
      throw error
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(docId, tagId, teamId) {
    try {
      const tagRef = this.getTagDoc(docId, tagId, teamId)
      await deleteDoc(tagRef)
      return { id: tagId, deleted: true }
    } catch (error) {
      console.error('Error deleting tag:', error)
      throw error
    }
  }

  /**
   * Delete all tags for a document
   */
  async deleteAllTags(docId, teamId) {
    try {
      const tags = await this.getTags(docId, {}, teamId)
      const batch = writeBatch(db)
      
      for (const tag of tags) {
        const tagRef = this.getTagDoc(docId, tag.id, teamId)
        batch.delete(tagRef)
      }

      await batch.commit()
      return { deleted: tags.length }
    } catch (error) {
      console.error('Error deleting all tags:', error)
      throw error
    }
  }

  /**
   * Get tag statistics for a document
   */
  async getTagStats(docId, teamId) {
    try {
      const tags = await this.getTags(docId, {}, teamId)
      
      const stats = {
        total: tags.length,
        pending: 0,
        approved: 0,
        rejected: 0,
        autoApproved: 0,
        manuallyReviewed: 0,
        avgConfidence: 0,
        highConfidence: 0 // Count of tags above threshold
      }

      if (tags.length === 0) return stats

      let confidenceSum = 0
      
      for (const tag of tags) {
        stats[tag.status]++
        
        if (tag.autoApproved) {
          stats.autoApproved++
        }
        
        if (tag.reviewedAt && !tag.autoApproved) {
          stats.manuallyReviewed++
        }
        
        confidenceSum += tag.confidence
        
        if (tag.confidence >= this.confidenceThreshold) {
          stats.highConfidence++
        }
      }

      stats.avgConfidence = Math.round(confidenceSum / tags.length)
      
      return stats
    } catch (error) {
      console.error('Error getting tag stats:', error)
      throw error
    }
  }

  /**
   * Update confidence threshold for auto-approval
   */
  setConfidenceThreshold(threshold) {
    this.confidenceThreshold = Math.max(0, Math.min(100, threshold))
  }

  /**
   * Get current confidence threshold
   */
  getConfidenceThreshold() {
    return this.confidenceThreshold
  }

  /**
   * Check if a tag document exists
   */
  async tagExists(docId, tagId, teamId) {
    try {
      const tagRef = this.getTagDoc(docId, tagId, teamId)
      const doc = await getDoc(tagRef)
      return doc.exists()
    } catch (error) {
      console.error('Error checking tag existence:', error)
      return false
    }
  }

  /**
   * Find duplicate tags by name
   */
  async findDuplicateTags(docId, tagName, teamId) {
    try {
      const tagsCollection = this.getTagsCollection(docId, teamId)
      const q = query(tagsCollection, where('tagName', '==', tagName))
      const querySnapshot = await getDocs(q)
      
      const duplicates = []
      querySnapshot.forEach((doc) => {
        duplicates.push({
          id: doc.id,
          ...doc.data()
        })
      })

      return duplicates
    } catch (error) {
      console.error('Error finding duplicate tags:', error)
      throw error
    }
  }
}

export default new TagSubcollectionService()