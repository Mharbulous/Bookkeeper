import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore'
import { db } from '../../../services/firebase.js'

/**
 * Service for managing AI-generated tags in Firestore subcollections
 * 
 * Data Structure:
 * /evidence/{docId}/aiTags/{tagId}
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
  getTagsCollection(docId) {
    return collection(db, 'evidence', docId, 'aiTags')
  }

  /**
   * Get reference to a specific tag document
   */
  getTagDoc(docId, tagId) {
    return doc(db, 'evidence', docId, 'aiTags', tagId)
  }

  /**
   * Add a new AI-generated tag to a document
   */
  async addTag(docId, tagData) {
    try {
      const tagsCollection = this.getTagsCollection(docId)
      
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

      const docRef = await addDoc(tagsCollection, tagDoc)
      return { id: docRef.id, ...tagDoc }
    } catch (error) {
      console.error('Error adding tag:', error)
      throw error
    }
  }

  /**
   * Add multiple tags in a batch operation
   */
  async addTagsBatch(docId, tagsArray) {
    try {
      const batch = writeBatch(db)
      const tagsCollection = this.getTagsCollection(docId)
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
   * Get all tags for a document
   */
  async getTags(docId, options = {}) {
    try {
      const tagsCollection = this.getTagsCollection(docId)
      let q = query(tagsCollection, orderBy('createdAt', 'desc'))

      // Filter by status if specified
      if (options.status) {
        q = query(tagsCollection, where('status', '==', options.status), orderBy('createdAt', 'desc'))
      }

      const querySnapshot = await getDocs(q)
      const tags = []
      
      querySnapshot.forEach((doc) => {
        tags.push({
          id: doc.id,
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
   * Get tags grouped by status
   */
  async getTagsByStatus(docId) {
    try {
      const allTags = await this.getTags(docId)
      
      return {
        pending: allTags.filter(tag => tag.status === 'pending'),
        approved: allTags.filter(tag => tag.status === 'approved'),
        rejected: allTags.filter(tag => tag.status === 'rejected')
      }
    } catch (error) {
      console.error('Error getting tags by status:', error)
      throw error
    }
  }

  /**
   * Get only approved tags for a document
   */
  async getApprovedTags(docId) {
    return await this.getTags(docId, { status: 'approved' })
  }

  /**
   * Get only pending tags for a document
   */
  async getPendingTags(docId) {
    return await this.getTags(docId, { status: 'pending' })
  }

  /**
   * Update a tag's status (approve/reject)
   */
  async updateTagStatus(docId, tagId, newStatus) {
    try {
      const tagRef = this.getTagDoc(docId, tagId)
      
      const updateData = {
        status: newStatus,
        reviewedAt: serverTimestamp()
      }

      await updateDoc(tagRef, updateData)
      return { id: tagId, ...updateData }
    } catch (error) {
      console.error('Error updating tag status:', error)
      throw error
    }
  }

  /**
   * Approve a tag
   */
  async approveTag(docId, tagId) {
    return await this.updateTagStatus(docId, tagId, 'approved')
  }

  /**
   * Reject a tag
   */
  async rejectTag(docId, tagId) {
    return await this.updateTagStatus(docId, tagId, 'rejected')
  }

  /**
   * Bulk approve multiple tags
   */
  async approveTagsBatch(docId, tagIds) {
    try {
      const batch = writeBatch(db)
      
      for (const tagId of tagIds) {
        const tagRef = this.getTagDoc(docId, tagId)
        batch.update(tagRef, {
          status: 'approved',
          reviewedAt: serverTimestamp()
        })
      }

      await batch.commit()
      return { approved: tagIds.length }
    } catch (error) {
      console.error('Error approving tags batch:', error)
      throw error
    }
  }

  /**
   * Bulk reject multiple tags
   */
  async rejectTagsBatch(docId, tagIds) {
    try {
      const batch = writeBatch(db)
      
      for (const tagId of tagIds) {
        const tagRef = this.getTagDoc(docId, tagId)
        batch.update(tagRef, {
          status: 'rejected',
          reviewedAt: serverTimestamp()
        })
      }

      await batch.commit()
      return { rejected: tagIds.length }
    } catch (error) {
      console.error('Error rejecting tags batch:', error)
      throw error
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(docId, tagId) {
    try {
      const tagRef = this.getTagDoc(docId, tagId)
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
  async deleteAllTags(docId) {
    try {
      const tags = await this.getTags(docId)
      const batch = writeBatch(db)
      
      for (const tag of tags) {
        const tagRef = this.getTagDoc(docId, tag.id)
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
  async getTagStats(docId) {
    try {
      const tags = await this.getTags(docId)
      
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
  async tagExists(docId, tagId) {
    try {
      const tagRef = this.getTagDoc(docId, tagId)
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
  async findDuplicateTags(docId, tagName) {
    try {
      const tagsCollection = this.getTagsCollection(docId)
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