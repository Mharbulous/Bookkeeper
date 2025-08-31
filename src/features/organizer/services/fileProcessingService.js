import { ref, getDownloadURL, getBytes } from 'firebase/storage';
import { storage } from '../../../services/firebase.js';

/**
 * File Processing Service - Handles file content retrieval from Firebase Storage
 * Provides file access, content processing, and format validation
 */
export class FileProcessingService {
  constructor(teamId = null) {
    this.teamId = teamId;
  }

  /**
   * Retrieve file content from Firebase Storage for AI processing
   * @param {Object} evidence - Evidence document
   * @param {string} teamId - Team ID
   * @returns {Promise<string>} - Base64 encoded file content for AI processing
   */
  async getFileForProcessing(evidence, teamId) {
    try {
      if (!evidence.storageRef?.fileHash) {
        throw new Error('No file hash found in evidence document');
      }

      // Get file extension from displayName
      const displayName = evidence.displayName || '';
      const extension = displayName.split('.').pop()?.toLowerCase() || 'pdf';

      // Get file from actual storage path: teams/{teamId}/matters/{matterId}/uploads/{fileHash}.{ext}
      
      // For now, assume files are in the 'general' matter
      // TODO: Extract actual matter ID from evidence if available
      const matterId = 'general';
      
      // Use the actual storage path format with extension
      const storagePath = `teams/${teamId}/matters/${matterId}/uploads/${evidence.storageRef.fileHash}.${extension}`;
      const fileRef = ref(storage, storagePath);
      
      // Get file bytes directly from Firebase Storage
      const arrayBuffer = await getBytes(fileRef);
      
      // Convert ArrayBuffer to base64 efficiently (avoid stack overflow for large files)
      const base64Data = this.arrayBufferToBase64(arrayBuffer);
      
      console.log(`[FileProcessingService] Retrieved file content from: ${storagePath}`);
      return base64Data;
    } catch (error) {
      console.error('[FileProcessingService] Failed to get file for processing:', error);
      throw error;
    }
  }

  /**
   * Convert ArrayBuffer to base64 efficiently
   * @param {ArrayBuffer} arrayBuffer - File data as ArrayBuffer
   * @returns {string} - Base64 encoded string
   */
  arrayBufferToBase64(arrayBuffer) {
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binaryString);
  }

  /**
   * Get file download URL from Firebase Storage
   * @param {Object} evidence - Evidence document
   * @param {string} teamId - Team ID
   * @returns {Promise<string>} - Download URL
   */
  async getFileDownloadURL(evidence, teamId) {
    try {
      if (!evidence.storageRef?.fileHash) {
        throw new Error('No file hash found in evidence document');
      }

      const displayName = evidence.displayName || '';
      const extension = displayName.split('.').pop()?.toLowerCase() || 'pdf';
      const matterId = 'general';
      
      const storagePath = `teams/${teamId}/matters/${matterId}/uploads/${evidence.storageRef.fileHash}.${extension}`;
      const fileRef = ref(storage, storagePath);
      
      const downloadURL = await getDownloadURL(fileRef);
      
      console.log(`[FileProcessingService] Generated download URL for: ${storagePath}`);
      return downloadURL;
    } catch (error) {
      console.error('[FileProcessingService] Failed to get download URL:', error);
      throw error;
    }
  }

  /**
   * Get file extension from evidence document
   * @param {Object} evidence - Evidence document
   * @returns {string} - File extension
   */
  getFileExtension(evidence) {
    const displayName = evidence.displayName || '';
    return displayName.split('.').pop()?.toLowerCase() || 'pdf';
  }

  /**
   * Build Firebase Storage path for file
   * @param {string} fileHash - File hash
   * @param {string} extension - File extension
   * @param {string} teamId - Team ID
   * @param {string} matterId - Matter ID (optional, defaults to 'general')
   * @returns {string} - Storage path
   */
  buildStoragePath(fileHash, extension, teamId, matterId = 'general') {
    return `teams/${teamId}/matters/${matterId}/uploads/${fileHash}.${extension}`;
  }

  /**
   * Validate file exists in storage
   * @param {Object} evidence - Evidence document
   * @param {string} teamId - Team ID
   * @returns {Promise<boolean>} - True if file exists
   */
  async validateFileExists(evidence, teamId) {
    try {
      await this.getFileDownloadURL(evidence, teamId);
      return true;
    } catch (error) {
      console.warn(`[FileProcessingService] File does not exist: ${error.message}`);
      return false;
    }
  }

  /**
   * Get file metadata from evidence document
   * @param {Object} evidence - Evidence document
   * @returns {Object} - File metadata
   */
  getFileMetadata(evidence) {
    return {
      displayName: evidence.displayName || 'Unknown',
      fileSize: evidence.fileSize || 0,
      fileSizeMB: ((evidence.fileSize || 0) / (1024 * 1024)).toFixed(1),
      fileSizeKB: ((evidence.fileSize || 0) / 1024).toFixed(1),
      extension: this.getFileExtension(evidence),
      fileHash: evidence.storageRef?.fileHash || null,
      hasStorageRef: Boolean(evidence.storageRef?.fileHash)
    };
  }
}

export default FileProcessingService;