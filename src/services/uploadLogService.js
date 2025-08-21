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
      // Generate a unique document ID
      const logRef = doc(collection(db, 'uploadLogs'))
      
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
   * @param {string} logId - Upload log document ID
   * @param {string} status - New status ('completed' | 'failed' | 'skipped')
   * @returns {Promise<void>}
   */
  static async updateUploadStatus(logId, status) {
    if (!logId || !status) {
      throw new Error('Log ID and status are required')
    }

    try {
      const logRef = doc(db, 'uploadLogs', logId)
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
      const uploadsRef = collection(db, 'uploadLogs')
      const q = query(
        uploadsRef,
        where('fileHash', '==', fileHash),
        where('teamId', '==', teamId)
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
      const uploadsRef = collection(db, 'uploadLogs')
      const q = query(
        uploadsRef,
        where('fileHash', 'in', fileHashes),
        where('teamId', '==', teamId)
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
      const uploadsRef = collection(db, 'uploadLogs')
      const q = query(
        uploadsRef,
        where('teamId', '==', teamId)
        // Note: orderBy would require a composite index in Firestore
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
}