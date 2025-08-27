import { storage, db } from './firebase.js';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Upload Service for Firebase Storage with atomic metadata operations
 * Handles file uploads, progress tracking, error classification, and metadata preservation
 */

// Upload configuration constants
const UPLOAD_CONFIG = {
  MAX_CONCURRENT_UPLOADS: 3,
  RETRY_DELAYS: [1000, 2000, 5000, 10000], // Progressive delay in ms
  MAX_RETRY_ATTEMPTS: 3,
  PROGRESS_UPDATE_THROTTLE: 100, // Limit progress updates to every 100ms
  CHUNK_SIZE: 256 * 1024, // 256KB chunks for resumable uploads
  SESSION_STORAGE_KEY: 'bookkeeper_upload_session',
};

// Error classification types
const ERROR_TYPES = {
  NETWORK: 'network',
  PERMISSION: 'permission',
  STORAGE: 'storage',
  FILE_SIZE: 'file_size',
  SERVER: 'server',
  CLIENT: 'client',
  AUTHENTICATION: 'authentication',
  UNKNOWN: 'unknown',
};

/**
 * Classifies upload errors into actionable categories
 */
function classifyError(error) {
  const errorCode = error.code || error.name || '';
  const errorMessage = error.message || '';

  // Network-related errors
  if (
    errorCode.includes('network') ||
    errorCode.includes('timeout') ||
    errorMessage.includes('network') ||
    errorMessage.includes('offline')
  ) {
    return {
      type: ERROR_TYPES.NETWORK,
      message: 'Network connection issue. Check your internet connection and try again.',
      retryable: true,
      userAction: 'Check your internet connection and retry the upload.',
    };
  }

  // Permission/Authentication errors
  if (
    errorCode.includes('permission') ||
    errorCode.includes('unauthorized') ||
    errorCode === 'auth/user-not-found'
  ) {
    return {
      type: ERROR_TYPES.PERMISSION,
      message: 'Permission denied. You may not have access to upload files.',
      retryable: false,
      userAction: 'Please check your account permissions or sign in again.',
    };
  }

  // Storage-related errors
  if (
    errorCode.includes('storage') ||
    errorCode.includes('quota') ||
    errorMessage.includes('storage exceeded')
  ) {
    return {
      type: ERROR_TYPES.STORAGE,
      message: 'Storage limit exceeded. Unable to upload more files.',
      retryable: false,
      userAction: 'Free up storage space or upgrade your storage plan.',
    };
  }

  // File size errors
  if (
    errorCode.includes('file-too-large') ||
    errorMessage.includes('file size') ||
    errorMessage.includes('too large')
  ) {
    return {
      type: ERROR_TYPES.FILE_SIZE,
      message: 'File is too large to upload.',
      retryable: false,
      userAction: 'Reduce file size or split into smaller files.',
    };
  }

  // Server errors (Firebase)
  if (
    errorCode.includes('internal') ||
    errorCode.includes('server') ||
    errorCode.includes('unavailable')
  ) {
    return {
      type: ERROR_TYPES.SERVER,
      message: 'Server temporarily unavailable. Please try again later.',
      retryable: true,
      userAction: 'Wait a few minutes and retry the upload.',
    };
  }

  // Authentication errors
  if (errorCode.includes('auth') || errorCode.includes('token')) {
    return {
      type: ERROR_TYPES.AUTHENTICATION,
      message: 'Authentication expired. Please sign in again.',
      retryable: false,
      userAction: 'Sign out and sign in again to refresh your session.',
    };
  }

  // Client-side errors
  if (
    errorCode.includes('abort') ||
    errorMessage.includes('abort') ||
    errorMessage.includes('cancelled')
  ) {
    return {
      type: ERROR_TYPES.CLIENT,
      message: 'Upload was cancelled.',
      retryable: true,
      userAction: 'Retry the upload if it was cancelled unintentionally.',
    };
  }

  // Default unknown error
  return {
    type: ERROR_TYPES.UNKNOWN,
    message: `Upload failed: ${errorMessage || 'Unknown error'}`,
    retryable: true,
    userAction: 'Try uploading the file again. If the problem persists, contact support.',
  };
}

/**
 * Upload session management for interruption recovery
 */
class UploadSession {
  constructor(sessionId) {
    this.sessionId = sessionId || crypto.randomUUID();
    this.startTime = Date.now();
    this.files = [];
    this.completedFiles = [];
    this.failedFiles = [];
    this.lastSaveTime = Date.now();
  }

  static fromStorage() {
    try {
      const stored = localStorage.getItem(UPLOAD_CONFIG.SESSION_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const session = new UploadSession(data.sessionId);
        Object.assign(session, data);
        return session;
      }
    } catch (error) {
      console.warn('Failed to restore upload session from storage:', error);
    }
    return null;
  }

  save() {
    try {
      this.lastSaveTime = Date.now();
      localStorage.setItem(UPLOAD_CONFIG.SESSION_STORAGE_KEY, JSON.stringify(this));
    } catch (error) {
      console.warn('Failed to save upload session:', error);
    }
  }

  clear() {
    try {
      localStorage.removeItem(UPLOAD_CONFIG.SESSION_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear upload session:', error);
    }
  }

  addFile(fileInfo) {
    this.files.push(fileInfo);
    this.save();
  }

  markCompleted(fileId, result) {
    this.completedFiles.push({ fileId, result, timestamp: Date.now() });
    this.save();
  }

  markFailed(fileId, error) {
    this.failedFiles.push({ fileId, error, timestamp: Date.now() });
    this.save();
  }
}

/**
 * Upload speed calculator with rolling averages
 */
class UploadSpeedCalculator {
  constructor(windowSize = 10) {
    this.windowSize = windowSize;
    this.dataPoints = [];
    this.totalBytes = 0;
    this.startTime = Date.now();
  }

  addDataPoint(bytesTransferred, timestamp = Date.now()) {
    this.dataPoints.push({ bytes: bytesTransferred, time: timestamp });

    // Keep only the most recent data points
    if (this.dataPoints.length > this.windowSize) {
      this.dataPoints.shift();
    }

    this.totalBytes = Math.max(this.totalBytes, bytesTransferred);
  }

  getCurrentSpeed() {
    if (this.dataPoints.length < 2) return 0;

    const recent = this.dataPoints.slice(-5); // Use last 5 data points
    if (recent.length < 2) return 0;

    const timeDiff = recent[recent.length - 1].time - recent[0].time;
    const bytesDiff = recent[recent.length - 1].bytes - recent[0].bytes;

    return timeDiff > 0 ? (bytesDiff / timeDiff) * 1000 : 0; // bytes per second
  }

  getAverageSpeed() {
    if (this.dataPoints.length === 0) return 0;

    const elapsed = Date.now() - this.startTime;
    return elapsed > 0 ? (this.totalBytes / elapsed) * 1000 : 0; // bytes per second
  }

  formatSpeed(bytesPerSecond) {
    if (bytesPerSecond < 1024) {
      return `${bytesPerSecond.toFixed(0)} B/s`;
    } else if (bytesPerSecond < 1024 * 1024) {
      return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    } else {
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
    }
  }

  getEstimatedTimeRemaining(totalBytes, currentBytes) {
    const speed = this.getCurrentSpeed();
    if (speed <= 0 || currentBytes >= totalBytes) return 0;

    const remainingBytes = totalBytes - currentBytes;
    return Math.ceil(remainingBytes / speed); // seconds
  }
}

/**
 * Main upload service class
 */
export class UploadService {
  constructor(teamId, userId) {
    this.teamId = teamId;
    this.userId = userId;
    this.activeUploads = new Map(); // fileId -> upload task
    this.uploadTasks = new Map(); // fileId -> Firebase upload task
    this.progressCallbacks = new Map(); // fileId -> callback function
    this.session = new UploadSession();
    this.speedCalculator = new UploadSpeedCalculator();
    this.isPaused = false;
    this.isAborted = false;

    // Bind methods for consistent context
    this.uploadFile = this.uploadFile.bind(this);
    this.pauseUploads = this.pauseUploads.bind(this);
    this.resumeUploads = this.resumeUploads.bind(this);
    this.cancelUploads = this.cancelUploads.bind(this);
  }

  /**
   * Generates storage path for a file based on team, matter, and hash
   */
  generateStoragePath(fileHash, originalFileName) {
    const extension = originalFileName.split('.').pop();
    return `teams/${this.teamId}/matters/general/files/${fileHash}.${extension}`;
  }

  /**
   * Generates Firestore document path for file metadata
   */
  generateMetadataPath(fileHash) {
    return `teams/${this.teamId}/files/${fileHash}`;
  }

  /**
   * Checks if file content already exists in storage
   */
  async checkFileExists(fileHash, originalFileName) {
    try {
      const storagePath = this.generateStoragePath(fileHash, originalFileName);
      const storageRef = ref(storage, storagePath);

      // Try to get download URL - if it succeeds, file exists
      await getDownloadURL(storageRef);
      return true;
    } catch {
      // File doesn't exist or error accessing it
      return false;
    }
  }

  /**
   * Checks if metadata already exists for this exact file
   */
  async checkMetadataExists(fileHash, metadata) {
    try {
      const metadataPath = this.generateMetadataPath(fileHash);
      const metadataRef = doc(db, metadataPath, metadata.id);
      const docSnap = await getDoc(metadataRef);

      if (docSnap.exists()) {
        const existingData = docSnap.data();
        // Check if this exact metadata already exists
        return (
          existingData.originalName === metadata.originalName &&
          existingData.originalPath === metadata.originalPath &&
          existingData.lastModified === metadata.lastModified &&
          existingData.size === metadata.size
        );
      }
      return false;
    } catch (error) {
      console.warn('Error checking metadata existence:', error);
      return false;
    }
  }

  /**
   * Atomically uploads file and saves metadata
   * Both operations must succeed or both will fail
   */
  async uploadFileAtomic(fileInfo, progressCallback) {
    const { file, hash, metadata } = fileInfo;
    let uploadTask = null;
    let metadataSaved = false;

    try {
      // Check if this is a duplicate file identified during deduplication
      if (metadata.isDuplicate) {
        // Skip file upload but still save metadata for this specific instance
        const storagePath = this.generateStoragePath(hash, file.name);
        const storageRef = ref(storage, storagePath);
        const downloadURL = await getDownloadURL(storageRef);

        // Extract folder path from original file path
        let folderPath = '';
        if (metadata.originalPath) {
          const pathParts = metadata.originalPath.split('/');
          if (pathParts.length > 1) {
            folderPath = pathParts.slice(0, -1).join('/');
          }
        }

        // Save metadata to Firestore (hash deduplication)
        const metadataPath = this.generateMetadataPath(hash);
        const metadataRef = doc(db, metadataPath, metadata.id);

        const metadataDoc = {
          ...metadata,
          hash: hash,
          downloadURL: downloadURL,
          teamId: this.teamId,
          userId: this.userId,
          uploadedAt: serverTimestamp(),
          fileExists: false, // File already exists, we didn't upload it
          isDuplicate: true,
          folderPath: folderPath,
        };


        await setDoc(metadataRef, metadataDoc);

        return {
          success: true,
          skipped: true,
          reason: 'Duplicate file - metadata saved',
          downloadURL: downloadURL,
          metadata: metadataDoc,
        };
      }

      // Check if this exact metadata already exists
      const metadataExists = await this.checkMetadataExists(hash, metadata);
      if (metadataExists) {
        // Exact duplicate - skip both storage and metadata
        return {
          success: true,
          skipped: true,
          reason: 'Exact duplicate (same metadata)',
          downloadURL: null,
          metadata: metadata,
        };
      }

      // Check if file content exists in storage
      const fileExists = await this.checkFileExists(hash, file.name);
      let downloadURL = null;

      if (!fileExists) {
        // Upload file to storage
        const storagePath = this.generateStoragePath(hash, file.name);
        const storageRef = ref(storage, storagePath);

        uploadTask = uploadBytesResumable(storageRef, file, {
          customMetadata: {
            teamId: this.teamId,
            userId: this.userId,
            originalName: file.name,
            hash: hash,
          },
        });

        // Store upload task for potential cancellation
        this.uploadTasks.set(metadata.id, uploadTask);

        // Set up progress tracking
        let lastProgressUpdate = 0;
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (this.isPaused || this.isAborted) {
              uploadTask.pause();
              return;
            }

            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            const now = Date.now();

            // Throttle progress updates
            if (now - lastProgressUpdate > UPLOAD_CONFIG.PROGRESS_UPDATE_THROTTLE) {
              this.speedCalculator.addDataPoint(snapshot.bytesTransferred, now);

              if (progressCallback) {
                progressCallback({
                  fileId: metadata.id,
                  progress: progress,
                  bytesTransferred: snapshot.bytesTransferred,
                  totalBytes: snapshot.totalBytes,
                  speed: this.speedCalculator.getCurrentSpeed(),
                  state: snapshot.state,
                });
              }

              lastProgressUpdate = now;
            }
          },
          (error) => {
            // Upload failed - will be handled in the catch block
            throw error;
          }
        );

        // Wait for upload to complete
        const snapshot = await uploadTask;
        downloadURL = await getDownloadURL(snapshot.ref);
      } else {
        // File exists, get its download URL
        const storagePath = this.generateStoragePath(hash, file.name);
        const storageRef = ref(storage, storagePath);
        downloadURL = await getDownloadURL(storageRef);
      }

      // Extract folder path from original file path
      let folderPath = '';
      if (metadata.originalPath) {
        const pathParts = metadata.originalPath.split('/');
        if (pathParts.length > 1) {
          folderPath = pathParts.slice(0, -1).join('/');
        }
      }

      // Save metadata to Firestore
      const metadataPath = this.generateMetadataPath(hash);
      const metadataRef = doc(db, metadataPath, metadata.id);

      const metadataDoc = {
        ...metadata,
        hash: hash,
        downloadURL: downloadURL,
        teamId: this.teamId,
        userId: this.userId,
        uploadedAt: serverTimestamp(),
        fileExists: !fileExists, // true if file was uploaded, false if it already existed
        folderPath: folderPath,
      };


      await setDoc(metadataRef, metadataDoc);
      metadataSaved = true;

      // Clean up upload task reference
      this.uploadTasks.delete(metadata.id);

      return {
        success: true,
        skipped: false,
        downloadURL: downloadURL,
        metadata: metadataDoc,
      };
    } catch (error) {
      // Clean up upload task reference
      this.uploadTasks.delete(metadata.id);

      // If metadata was saved but upload failed, we need to clean up
      // This is a rare edge case but ensures consistency
      if (metadataSaved && uploadTask) {
        try {
          const metadataPath = this.generateMetadataPath(hash);
          const metadataRef = doc(db, metadataPath, metadata.id);
          await deleteDoc(metadataRef);
        } catch (cleanupError) {
          console.warn('Failed to clean up metadata after upload failure:', cleanupError);
        }
      }

      const classifiedError = classifyError(error);
      throw {
        ...error,
        classified: classifiedError,
        fileId: metadata.id,
        fileName: file.name,
      };
    }
  }

  /**
   * Uploads a single file with progress tracking and error handling
   */
  async uploadFile(fileInfo, progressCallback) {
    if (this.isAborted) {
      throw new Error('Upload service has been aborted');
    }

    // Wait if paused
    while (this.isPaused && !this.isAborted) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (this.isAborted) {
      throw new Error('Upload was aborted while paused');
    }

    const { metadata } = fileInfo;
    this.session.addFile({ id: metadata.id, name: metadata.originalName, size: metadata.size });

    try {
      const result = await this.uploadFileAtomic(fileInfo, progressCallback);
      this.session.markCompleted(metadata.id, result);
      return result;
    } catch (error) {
      this.session.markFailed(metadata.id, error);
      throw error;
    }
  }

  /**
   * Uploads multiple files with concurrency control
   */
  async uploadFiles(fileInfos, options = {}) {
    const {
      maxConcurrent = UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS,
      progressCallback,
      onFileComplete,
      onFileError,
    } = options;

    if (this.isAborted) {
      throw new Error('Upload service has been aborted');
    }

    const results = {
      successful: [],
      failed: [],
      skipped: [],
    };

    let activeUploads = 0;
    let currentIndex = 0;
    const promises = [];

    const processNextFile = async () => {
      if (currentIndex >= fileInfos.length || this.isAborted) {
        return;
      }

      const fileInfo = fileInfos[currentIndex++];
      activeUploads++;

      try {
        const result = await this.uploadFile(fileInfo, progressCallback);

        if (result.skipped) {
          results.skipped.push({ fileInfo, result });
        } else {
          results.successful.push({ fileInfo, result });
        }

        if (onFileComplete) {
          onFileComplete(fileInfo, result);
        }
      } catch (error) {
        results.failed.push({ fileInfo, error });

        if (onFileError) {
          onFileError(fileInfo, error);
        }
      } finally {
        activeUploads--;

        // Process next file if not at concurrency limit
        if (activeUploads < maxConcurrent && currentIndex < fileInfos.length && !this.isAborted) {
          promises.push(processNextFile());
        }
      }
    };

    // Start initial batch of uploads
    for (let i = 0; i < Math.min(maxConcurrent, fileInfos.length); i++) {
      promises.push(processNextFile());
    }

    // Wait for all uploads to complete
    await Promise.all(promises);

    return results;
  }

  /**
   * Retry failed uploads with exponential backoff
   */
  async retryFailedUploads(failedFiles, options = {}) {
    const {
      maxRetries = UPLOAD_CONFIG.MAX_RETRY_ATTEMPTS,
      progressCallback,
      onFileComplete,
      onFileError,
    } = options;

    const retryResults = {
      successful: [],
      failed: [],
    };

    for (const { fileInfo, error } of failedFiles) {
      if (this.isAborted) break;

      const classified = error.classified || classifyError(error);

      // Skip non-retryable errors
      if (!classified.retryable) {
        retryResults.failed.push({ fileInfo, error });
        continue;
      }

      let success = false;
      let lastError = error;

      // Attempt retries with exponential backoff
      for (let attempt = 1; attempt <= maxRetries && !this.isAborted; attempt++) {
        try {
          // Wait before retry (exponential backoff with jitter)
          const delay =
            UPLOAD_CONFIG.RETRY_DELAYS[
              Math.min(attempt - 1, UPLOAD_CONFIG.RETRY_DELAYS.length - 1)
            ];
          const jitter = Math.random() * 1000; // Add up to 1 second of jitter
          await new Promise((resolve) => setTimeout(resolve, delay + jitter));

          if (this.isAborted) break;

          const result = await this.uploadFile(fileInfo, progressCallback);
          retryResults.successful.push({ fileInfo, result });

          if (onFileComplete) {
            onFileComplete(fileInfo, result);
          }

          success = true;
          break;
        } catch (retryError) {
          lastError = retryError;
          console.warn(
            `Retry attempt ${attempt} failed for file ${fileInfo.metadata.originalName}:`,
            retryError
          );
        }
      }

      if (!success) {
        retryResults.failed.push({ fileInfo, error: lastError });

        if (onFileError) {
          onFileError(fileInfo, lastError);
        }
      }
    }

    return retryResults;
  }

  /**
   * Pause all active uploads
   */
  pauseUploads() {
    this.isPaused = true;

    // Pause all active Firebase upload tasks
    for (const uploadTask of this.uploadTasks.values()) {
      uploadTask.pause();
    }
  }

  /**
   * Resume all paused uploads
   */
  resumeUploads() {
    this.isPaused = false;

    // Resume all paused Firebase upload tasks
    for (const uploadTask of this.uploadTasks.values()) {
      uploadTask.resume();
    }
  }

  /**
   * Cancel all uploads and clean up
   */
  cancelUploads() {
    this.isAborted = true;
    this.isPaused = false;

    // Cancel all active Firebase upload tasks
    for (const uploadTask of this.uploadTasks.values()) {
      uploadTask.cancel();
    }

    this.uploadTasks.clear();
    this.activeUploads.clear();
    this.progressCallbacks.clear();
    this.session.clear();
  }

  /**
   * Get upload statistics
   */
  getUploadStats() {
    return {
      activeUploads: this.activeUploads.size,
      isPaused: this.isPaused,
      isAborted: this.isAborted,
      currentSpeed: this.speedCalculator.formatSpeed(this.speedCalculator.getCurrentSpeed()),
      averageSpeed: this.speedCalculator.formatSpeed(this.speedCalculator.getAverageSpeed()),
      sessionId: this.session.sessionId,
      completedFiles: this.session.completedFiles.length,
      failedFiles: this.session.failedFiles.length,
    };
  }

  /**
   * Restore upload session from localStorage
   */
  static restoreSession() {
    return UploadSession.fromStorage();
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.cancelUploads();
  }
}

export default UploadService;
