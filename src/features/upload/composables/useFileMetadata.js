import { db } from '../../../services/firebase.js';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthStore } from '../../../core/stores/auth.js';
import { updateFolderPaths } from '../../upload/utils/folderPathUtils.js';

export function useFileMetadata() {
  const authStore = useAuthStore();

  /**
   * Generate metadata hash from file metadata
   * Uses concatenated string: originalName|lastModified|fileHash
   * @param {string} originalName - Original filename
   * @param {number} lastModified - File's last modified timestamp
   * @param {string} fileHash - Content hash of the file
   * @returns {Promise<string>} - SHA-256 hash of metadata string
   */
  const generateMetadataHash = async (originalName, lastModified, fileHash) => {
    try {
      // Create deterministic concatenated string with pipe delimiters
      const metadataString = `${originalName}|${lastModified}|${fileHash}`;

      // Generate SHA-256 hash of the metadata string
      const buffer = new TextEncoder().encode(metadataString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const metadataHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      return metadataHash;
    } catch (error) {
      console.error('Failed to generate metadata hash:', error);
      throw new Error(`Failed to generate metadata hash: ${error.message}`);
    }
  };

  /**
   * Create a file metadata record in Firestore
   * @param {Object} fileData - File metadata information
   * @param {string} fileData.originalName - Original filename
   * @param {number} fileData.lastModified - File's last modified timestamp
   * @param {string} fileData.fileHash - Content hash of the file
   * @param {string} [fileData.originalPath] - Full relative path from folder upload (used to extract folderPath)
   * @returns {Promise<string>} - The metadata hash used as document ID
   */
  const createMetadataRecord = async (fileData) => {
    try {
      const { originalName, lastModified, fileHash, originalPath } = fileData;

      if (!originalName || !lastModified || !fileHash) {
        throw new Error(
          'Missing required metadata fields: originalName, lastModified, or fileHash'
        );
      }

      const teamId = authStore.currentTeam;
      if (!teamId) {
        throw new Error('No team ID available for metadata record');
      }

      // Generate metadata hash for document ID
      const metadataHash = await generateMetadataHash(originalName, lastModified, fileHash);

      // Extract folder path from original path if available
      let currentFolderPath = '';
      if (originalPath) {
        const pathParts = originalPath.split('/');
        if (pathParts.length > 1) {
          currentFolderPath = pathParts.slice(0, -1).join('/');
        }
      }

      // Get existing metadata to check for existing folderPaths
      let existingFolderPaths = '';
      try {
        const docRef = doc(db, 'teams', teamId, 'matters', 'general', 'originalMetadata', metadataHash);
        const existingDoc = await getDoc(docRef);
        if (existingDoc.exists()) {
          existingFolderPaths = existingDoc.data().folderPaths || '';
        }
      } catch (error) {
        console.warn(
          'Could not retrieve existing folderPaths, proceeding with new path only:',
          error
        );
      }

      // Update folder paths using pattern recognition
      const pathUpdate = updateFolderPaths(currentFolderPath, existingFolderPaths);

      // Create metadata record
      const metadataRecord = {
        // Core file metadata (only what varies between identical files)
        originalName: originalName,
        lastModified: lastModified,
        fileHash: fileHash,

        // File path information
        folderPaths: pathUpdate.folderPaths,

        // Computed fields for convenience
        metadataHash: metadataHash,
      };

      // Save to Firestore: /teams/{teamId}/matters/general/originalMetadata/{metadataHash}
      const docRef = doc(db, 'teams', teamId, 'matters', 'general', 'originalMetadata', metadataHash);
      await setDoc(docRef, metadataRecord);

      console.log(`[DEBUG] Metadata record created: ${metadataHash}`, {
        originalName,
        folderPaths: pathUpdate.folderPaths || '(root level)',
        pathPattern: pathUpdate.pattern.type,
        pathChanged: pathUpdate.hasChanged,
        fileHash: fileHash.substring(0, 8) + '...',
      });

      return metadataHash;
    } catch (error) {
      console.error('Failed to create metadata record:', error);
      throw error;
    }
  };

  /**
   * Create metadata records for multiple files
   * @param {Array} filesData - Array of file metadata objects
   * @returns {Promise<Array>} - Array of metadata hashes
   */
  const createMultipleMetadataRecords = async (filesData) => {
    try {
      const results = [];

      for (const fileData of filesData) {
        const metadataHash = await createMetadataRecord(fileData);
        results.push(metadataHash);
      }

      console.log(`Created ${results.length} metadata records`);
      return results;
    } catch (error) {
      console.error('Failed to create multiple metadata records:', error);
      throw error;
    }
  };

  /**
   * Check if a metadata record already exists
   * @param {string} originalName - Original filename
   * @param {number} lastModified - File's last modified timestamp
   * @param {string} fileHash - Content hash of the file
   * @returns {Promise<boolean>} - Whether the metadata record exists
   */
  const metadataRecordExists = async (originalName, lastModified, fileHash) => {
    try {
      const metadataHash = await generateMetadataHash(originalName, lastModified, fileHash);
      const teamId = authStore.currentTeam;

      if (!teamId) {
        throw new Error('No team ID available');
      }

      // Try to get the document
      const docRef = doc(db, 'teams', teamId, 'matters', 'general', 'originalMetadata', metadataHash);
      const docSnapshot = await docRef.get();

      return docSnapshot.exists();
    } catch (error) {
      console.error('Failed to check metadata record existence:', error);
      return false;
    }
  };

  return {
    // Core functions
    generateMetadataHash,
    createMetadataRecord,
    createMultipleMetadataRecords,
    metadataRecordExists,
  };
}
