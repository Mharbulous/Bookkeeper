import { db } from '../services/firebase.js';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthStore } from '../stores/auth.js';

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
   * @param {string} fileData.sessionId - Upload session ID
   * @param {string} [fileData.storagePath] - Firebase Storage path (optional, will be generated)
   * @returns {Promise<string>} - The metadata hash used as document ID
   */
  const createMetadataRecord = async (fileData) => {
    try {
      const { originalName, lastModified, fileHash, sessionId, storagePath } = fileData;

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

      // Generate storage path if not provided
      const extension = originalName.split('.').pop();
      const computedStoragePath =
        storagePath || `teams/${teamId}/matters/general/files/${fileHash}.${extension}`;

      // Create metadata record
      const metadataRecord = {
        // Core metadata (only what varies between identical files)
        originalName: originalName,
        lastModified: lastModified,
        fileHash: fileHash,

        // Upload context
        uploadedAt: serverTimestamp(),
        uploadedBy: authStore.user.uid,
        sessionId: sessionId,

        // Computed fields for convenience
        metadataHash: metadataHash,
        storagePath: computedStoragePath,

        createdAt: serverTimestamp(),
      };

      // Save to Firestore: /teams/{teamId}/matters/general/metadata/{metadataHash}
      const docRef = doc(db, 'teams', teamId, 'matters', 'general', 'metadata', metadataHash);
      await setDoc(docRef, metadataRecord);

      console.log(`Metadata record created: ${metadataHash}`, {
        originalName,
        fileHash: fileHash.substring(0, 8) + '...',
        storagePath: computedStoragePath,
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
   * @param {string} sessionId - Upload session ID
   * @returns {Promise<Array>} - Array of metadata hashes
   */
  const createMultipleMetadataRecords = async (filesData, sessionId) => {
    try {
      const results = [];

      for (const fileData of filesData) {
        const metadataHash = await createMetadataRecord({
          ...fileData,
          sessionId: sessionId,
        });
        results.push(metadataHash);
      }

      console.log(`Created ${results.length} metadata records for session: ${sessionId}`);
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
      const docRef = doc(db, 'teams', teamId, 'matters', 'general', 'metadata', metadataHash);
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
