import { 
  collection, 
  doc, 
  setDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore'
import { db } from './firebase.js'

/**
 * UploadLogService - Manages file upload logs for duplicate detection
 * 
 * Upload Log Document Schema:
 * {
 *   id: string,                    // Auto-generated document ID
 *   fileHash: string,              // SHA-256 hash of the file
 *   fileName: string,              // Original file name
 *   fileSize: number,              // File size in bytes
 *   lastModified: number,          // File last modified timestamp
 *   filePath: string,              // Full file path (for folder uploads)
 *   uploaderId: string,            // User ID who uploaded the file
 *   uploaderName: string,          // Display name of uploader
 *   uploaderEmail: string,         // Email of uploader
 *   teamId: string,                // Team ID for multi-tenant isolation
 *   uploadDate: Timestamp,         // When the upload was logged
 *   uploadStatus: string,          // 'started' | 'completed' | 'failed' | 'skipped'
 *   metadata: {                    // Additional file metadata
 *     fileType: string,            // MIME type
 *     relativePath: string,        // Path within upload batch
 *   }
 * }
 */

// Caching layer for duplicate detection performance
const duplicateCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes cache TTL
const CACHE_MAX_SIZE = 1000 // Maximum cache entries

// Cache management utilities
const cleanupExpiredCache = () => {
  const now = Date.now()
  for (const [key, entry] of duplicateCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      duplicateCache.delete(key)
    }
  }
}

const addToCache = (key, result) => {
  // Clean up expired entries if cache is getting large
  if (duplicateCache.size > CACHE_MAX_SIZE) {
    cleanupExpiredCache()
  }
  
  // If still too large, remove oldest entries
  if (duplicateCache.size > CACHE_MAX_SIZE) {
    const oldestKey = duplicateCache.keys().next().value
    duplicateCache.delete(oldestKey)
  }
  
  duplicateCache.set(key, {
    result,
    timestamp: Date.now()
  })
}

const getFromCache = (key) => {
  const entry = duplicateCache.get(key)
  if (!entry) return null
  
  // Check if expired
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    duplicateCache.delete(key)
    return null
  }
  
  return entry.result
}

export class UploadLogService {
  /**
   * Log a file upload attempt
   * @param {Object} logData - Upload log data
   * @returns {Promise<string>} - Document ID of the created log
   */
  static async logUploadAttempt(logData) {
    if (!logData.fileHash || !logData.uploaderId || !logData.teamId) {
      throw new Error('File hash, uploader ID, and team ID are required')
    }

    try {
      // Generate a unique document ID in team-specific collection
      const logRef = doc(collection(db, 'teams', logData.teamId, 'upload_logs'))
      
      const uploadLog = {
        fileHash: logData.fileHash,
        fileName: logData.fileName,
        fileSize: logData.fileSize,
        lastModified: logData.lastModified,
        filePath: logData.filePath || logData.fileName,
        uploaderId: logData.uploaderId,
        uploaderName: logData.uploaderName,
        uploaderEmail: logData.uploaderEmail,
        teamId: logData.teamId,
        uploadDate: serverTimestamp(),
        uploadStatus: logData.uploadStatus || 'started',
        metadata: {
          fileType: logData.fileType || 'application/octet-stream',
          relativePath: logData.relativePath || '',
          ...logData.metadata
        }
      }

      await setDoc(logRef, uploadLog)
      return logRef.id
    } catch (error) {
      console.error('Error logging upload attempt:', error)
      throw new Error(`Failed to log upload attempt: ${error.message}`)
    }
  }

  /**
   * Update upload status for an existing log entry
   * @param {string} teamId - Team ID
   * @param {string} logId - Upload log document ID
   * @param {string} status - New status ('completed' | 'failed' | 'skipped')
   * @returns {Promise<void>}
   */
  static async updateUploadStatus(teamId, logId, status) {
    if (!teamId || !logId || !status) {
      throw new Error('Team ID, log ID and status are required')
    }

    try {
      const logRef = doc(db, 'teams', teamId, 'upload_logs', logId)
      await setDoc(logRef, {
        uploadStatus: status,
        updatedAt: serverTimestamp()
      }, { merge: true })
    } catch (error) {
      console.error('Error updating upload status:', error)
      throw new Error(`Failed to update upload status: ${error.message}`)
    }
  }

  /**
   * Find upload logs by file hash for duplicate detection
   * @param {string} fileHash - SHA-256 hash of the file
   * @param {string} teamId - Team ID for multi-tenant isolation
   * @returns {Promise<Array>} - Array of matching upload logs
   */
  static async findUploadsByHash(fileHash, teamId) {
    if (!fileHash || !teamId) {
      throw new Error('File hash and team ID are required')
    }

    try {
      // Use team-specific upload logs collection as per storage plan
      const uploadsRef = collection(db, 'teams', teamId, 'upload_logs')
      const q = query(
        uploadsRef,
        where('fileHash', '==', fileHash)
        // No need to filter by teamId since we're already in the team's collection
      )
      
      const querySnapshot = await getDocs(q)
      const uploads = []
      
      querySnapshot.forEach((doc) => {
        uploads.push({
          id: doc.id,
          ...doc.data()
        })
      })

      return uploads
    } catch (error) {
      console.error('Error finding uploads by hash:', error)
      throw new Error(`Failed to find uploads by hash: ${error.message}`)
    }
  }

  /**
   * Find upload logs by multiple file hashes for batch duplicate detection
   * @param {Array<string>} fileHashes - Array of SHA-256 hashes
   * @param {string} teamId - Team ID for multi-tenant isolation
   * @returns {Promise<Array>} - Array of matching upload logs
   */
  static async findUploadsByHashes(fileHashes, teamId) {
    if (!fileHashes || fileHashes.length === 0 || !teamId) {
      throw new Error('File hashes array and team ID are required')
    }

    try {
      // Use team-specific upload logs collection (fixed collection path)
      const uploadsRef = collection(db, 'teams', teamId, 'upload_logs')
      
      // Firestore 'in' queries are limited to 10 items, so batch them
      const BATCH_SIZE = 10
      const batches = []
      
      for (let i = 0; i < fileHashes.length; i += BATCH_SIZE) {
        const batch = fileHashes.slice(i, i + BATCH_SIZE)
        const q = query(
          uploadsRef,
          where('fileHash', 'in', batch)
          // No need to filter by teamId since we're already in the team's collection
        )
        batches.push(q)
      }
      
      // Execute all queries in parallel
      const queryPromises = batches.map(q => getDocs(q))
      const querySnapshots = await Promise.all(queryPromises)
      
      const uploads = []
      querySnapshots.forEach(querySnapshot => {
        querySnapshot.forEach((doc) => {
          uploads.push({
            id: doc.id,
            ...doc.data()
          })
        })
      })

      return uploads
    } catch (error) {
      console.error('Error finding uploads by hashes:', error)
      throw new Error(`Failed to find uploads by hashes: ${error.message}`)
    }
  }

  /**
   * Check for duplicate files and categorize them
   * @param {Object} fileInfo - File information with hash and metadata
   * @param {string} teamId - Team ID for multi-tenant isolation
   * @returns {Promise<Object>} - Duplicate analysis result
   */
  static async checkForDuplicates(fileInfo, teamId) {
    if (!fileInfo.hash || !teamId) {
      throw new Error('File hash and team ID are required')
    }

    try {
      const existingUploads = await this.findUploadsByHash(fileInfo.hash, teamId)
      
      if (existingUploads.length === 0) {
        return {
          isDuplicate: false,
          exactDuplicate: null,
          metadataDuplicate: null
        }
      }

      // Check for exact duplicates (same hash and metadata)
      const exactDuplicate = existingUploads.find(upload => 
        this.compareFileMetadata(fileInfo, upload)
      )

      if (exactDuplicate) {
        return {
          isDuplicate: true,
          type: 'exact',
          exactDuplicate,
          metadataDuplicate: null
        }
      }

      // If no exact duplicate, it's a metadata duplicate
      const metadataDuplicate = existingUploads[0] // Get the first/most recent one
      return {
        isDuplicate: true,
        type: 'metadata',
        exactDuplicate: null,
        metadataDuplicate
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error)
      throw new Error(`Failed to check for duplicates: ${error.message}`)
    }
  }

  /**
   * Compare file metadata to determine if files are exactly the same
   * @param {Object} fileInfo1 - First file info
   * @param {Object} fileInfo2 - Second file info (from upload log)
   * @returns {boolean} - True if metadata matches exactly
   */
  static compareFileMetadata(fileInfo1, fileInfo2) {
    // Compare key metadata fields
    return (
      fileInfo1.name === fileInfo2.fileName &&
      fileInfo1.size === fileInfo2.fileSize &&
      fileInfo1.lastModified === fileInfo2.lastModified &&
      (fileInfo1.path || fileInfo1.name) === fileInfo2.filePath
    )
  }

  /**
   * Batch check for duplicate files with caching for improved performance
   * @param {Array<Object>} fileInfos - Array of file information objects with hash and metadata
   * @param {string} teamId - Team ID for multi-tenant isolation
   * @returns {Promise<Array<Object>>} - Array of duplicate analysis results
   */
  static async checkForDuplicatesBatch(fileInfos, teamId) {
    if (!fileInfos || fileInfos.length === 0 || !teamId) {
      throw new Error('File infos array and team ID are required')
    }

    try {
      const results = []
      const uncachedFiles = []
      const uncachedIndexes = []
      
      // Step 1: Check cache for existing results
      fileInfos.forEach((fileInfo, index) => {
        const cacheKey = `${teamId}:${fileInfo.hash}`
        const cachedResult = getFromCache(cacheKey)
        
        if (cachedResult) {
          // UX: Cache hit - instant result without Firestore query
          results[index] = cachedResult
        } else {
          uncachedFiles.push(fileInfo)
          uncachedIndexes.push(index)
        }
      })
      
      if (uncachedFiles.length === 0) {
        return results
      }
      
      // Step 2: Batch query for uncached files only
      const uniqueHashes = [...new Set(uncachedFiles.map(f => f.hash).filter(Boolean))]
      
      if (uniqueHashes.length === 0) {
        // Fill remaining results with no duplicates found
        uncachedIndexes.forEach(index => {
          results[index] = {
            isDuplicate: false,
            exactDuplicate: null,
            metadataDuplicate: null
          }
        })
        return results
      }
      
      // Batch Firestore query with intelligent batching
      const allUploads = await this.findUploadsByHashes(uniqueHashes, teamId)
      
      // Create lookup map for efficient matching
      const uploadsByHash = new Map()
      allUploads.forEach(upload => {
        if (!uploadsByHash.has(upload.fileHash)) {
          uploadsByHash.set(upload.fileHash, [])
        }
        uploadsByHash.get(upload.fileHash).push(upload)
      })
      
      // Step 3: Process results and populate cache
      uncachedFiles.forEach((fileInfo, uncachedIndex) => {
        const resultIndex = uncachedIndexes[uncachedIndex]
        const existingUploads = uploadsByHash.get(fileInfo.hash) || []
        
        let result
        if (existingUploads.length === 0) {
          result = {
            isDuplicate: false,
            exactDuplicate: null,
            metadataDuplicate: null
          }
        } else {
          // Check for exact duplicates (same hash and metadata)
          const exactDuplicate = existingUploads.find(upload => 
            this.compareFileMetadata(fileInfo, upload)
          )
          
          if (exactDuplicate) {
            result = {
              isDuplicate: true,
              type: 'exact',
              exactDuplicate,
              metadataDuplicate: null
            }
          } else {
            // Metadata duplicate - same content, different metadata
            const metadataDuplicate = existingUploads[0] // Get the first/most recent one
            result = {
              isDuplicate: true,
              type: 'metadata',
              exactDuplicate: null,
              metadataDuplicate
            }
          }
        }
        
        results[resultIndex] = result
        
        // Cache the result for future use
        const cacheKey = `${teamId}:${fileInfo.hash}`
        addToCache(cacheKey, result)
      })
      
      return results
      
    } catch (error) {
      console.error('Error checking for duplicates in batch:', error)
      
      // Return safe fallback for all files if batch fails
      return fileInfos.map(() => ({
        isDuplicate: false,
        exactDuplicate: null,
        metadataDuplicate: null
      }))
    }
  }

  /**
   * Get recent upload statistics for a team
   * @param {string} teamId - Team ID
   * @param {number} limit - Maximum number of logs to return (default: 100)
   * @returns {Promise<Array>} - Array of recent upload logs
   */
  static async getRecentUploads(teamId, limit = 100) {
    if (!teamId) {
      throw new Error('Team ID is required')
    }

    try {
      // Use team-specific upload logs collection
      const uploadsRef = collection(db, 'teams', teamId, 'upload_logs')
      const q = query(
        uploadsRef
        // No need to filter by teamId since we're already in the team's collection
        // Note: orderBy would require an index in Firestore
        // For now, we'll sort on the client side
      )
      
      const querySnapshot = await getDocs(q)
      const uploads = []
      
      querySnapshot.forEach((doc) => {
        uploads.push({
          id: doc.id,
          ...doc.data()
        })
      })

      // Sort by upload date (newest first) and limit
      return uploads
        .sort((a, b) => (b.uploadDate?.toMillis() || 0) - (a.uploadDate?.toMillis() || 0))
        .slice(0, limit)
    } catch (error) {
      console.error('Error getting recent uploads:', error)
      throw new Error(`Failed to get recent uploads: ${error.message}`)
    }
  }

  /**
   * Clear the duplicate detection cache (for testing or memory management)
   */
  static clearCache() {
    duplicateCache.clear()
  }
  
  /**
   * Get cache statistics for debugging
   * @returns {Object} Cache statistics
   */
  static getCacheStats() {
    return {
      size: duplicateCache.size,
      maxSize: CACHE_MAX_SIZE,
      ttlMs: CACHE_TTL,
      // UX: Cache hit ratio could be shown in debug mode
      entries: Array.from(duplicateCache.keys())
    }
  }
}