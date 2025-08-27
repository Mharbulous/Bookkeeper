import { ref } from 'vue'
import { db } from '../services/firebase.js'
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { useAuthStore } from '../stores/auth.js'

export function useUploadLogger() {
  const authStore = useAuthStore()
  
  // Current upload session tracking
  const currentSessionId = ref(null)
  const sessionStartTime = ref(null)
  
  /**
   * Generate a unique session ID for grouping upload events
   */
  const generateSessionId = () => {
    return `session_${Date.now()}_${crypto.randomUUID()}`
  }
  
  /**
   * Start a new upload session
   * @param {number} totalFiles - Total number of files in this upload batch
   * @returns {string} sessionId - The generated session ID
   */
  const startUploadSession = async (totalFiles) => {
    try {
      currentSessionId.value = generateSessionId()
      sessionStartTime.value = Date.now()
      
      console.log(`Started upload session: ${currentSessionId.value} with ${totalFiles} files`)
      
      return currentSessionId.value
    } catch (error) {
      console.error('Failed to start upload session:', error)
      throw error
    }
  }
  
  /**
   * Log the completion of an upload session as a session summary event
   * @param {Object} stats - Upload statistics
   * @param {number} stats.filesProcessed - Total files processed
   * @param {number} stats.successful - Successfully uploaded files
   * @param {number} stats.failed - Failed uploads
   * @param {number} stats.duplicatesSkipped - Files skipped as duplicates
   * @param {number} stats.totalSizeMB - Total size of all files in MB
   */
  const logSessionSummary = async (stats) => {
    try {
      if (!currentSessionId.value || !sessionStartTime.value) {
        console.warn('No active upload session to log')
        return null
      }
      
      const uploadDurationMs = Date.now() - sessionStartTime.value
      const teamId = authStore.currentTeam
      
      if (!teamId) {
        throw new Error('No team ID available for logging')
      }
      
      // Create session summary event in uploadEvents collection
      const sessionSummaryData = {
        uploadedAt: serverTimestamp(),
        uploadedBy: authStore.user.uid,
        sessionId: currentSessionId.value,
        
        // Event type identifier
        eventType: 'session_summary',
        
        // Upload statistics
        filesProcessed: stats.filesProcessed || 0,
        successful: stats.successful || 0,
        failed: stats.failed || 0,
        duplicatesSkipped: stats.duplicatesSkipped || 0,
        
        // Performance metrics
        totalSizeMB: Math.round((stats.totalSizeMB || 0) * 10) / 10, // Round to 1 decimal
        uploadDurationMs: uploadDurationMs,
        
        // Hardware calibration (if available from processing)
        hardwareCalibration: stats.hardwareCalibration || null,
        
        createdAt: serverTimestamp()
      }
      
      // Add to uploadEvents collection
      const eventsCollection = collection(db, 'teams', teamId, 'matters', 'general', 'uploadEvents')
      const docRef = await addDoc(eventsCollection, sessionSummaryData)
      
      console.log(`Upload session summary logged: ${docRef.id}`, {
        sessionId: currentSessionId.value,
        duration: `${uploadDurationMs}ms`,
        stats: stats
      })
      
      // Reset session tracking
      currentSessionId.value = null
      sessionStartTime.value = null
      
      return docRef.id
    } catch (error) {
      console.error('Failed to log upload session summary:', error)
      throw error
    }
  }
  
  /**
   * Get the current session ID (useful for metadata records)
   */
  const getCurrentSessionId = () => {
    return currentSessionId.value
  }
  
  /**
   * Get session duration in milliseconds
   */
  const getSessionDuration = () => {
    if (!sessionStartTime.value) return 0
    return Date.now() - sessionStartTime.value
  }
  
  /**
   * Generate a deterministic document ID for upload events
   * This allows us to overwrite interrupted uploads with completion events
   * @param {string} sessionId - Upload session ID
   * @param {string} fileHash - SHA-256 hash of file content
   * @returns {string} Deterministic document ID
   */
  const generateUploadEventId = (sessionId, fileHash) => {
    // Create deterministic ID from session + file hash (first 16 chars for readability)
    const shortHash = fileHash.substring(0, 16)
    const shortSession = sessionId.split('_')[1] // Extract timestamp part
    return `${shortSession}_${shortHash}`
  }

  /**
   * Log an individual file upload event
   * @param {Object} fileEvent - File upload event details
   * @param {string} fileEvent.fileName - Original file name
   * @param {string} fileEvent.fileHash - SHA-256 hash of file content
   * @param {number} fileEvent.fileSize - File size in bytes
   * @param {string} fileEvent.status - Upload status ('uploaded', 'skipped', 'failed', 'interrupted')
   * @param {string} fileEvent.reason - Reason for status (e.g., 'already_exists', 'upload_complete', 'upload_started', 'network_error')
   * @param {number} fileEvent.lastModified - File's original timestamp
   * @param {number} [fileEvent.uploadDurationMs] - Time taken to upload (for successful uploads)
   * @param {string} [fileEvent.error] - Error message (for failed uploads)
   * @param {boolean} [fileEvent.allowOverwrite] - Whether this event can overwrite existing events (for interrupted -> completion)
   */
  const logFileUploadEvent = async (fileEvent) => {
    try {
      if (!currentSessionId.value) {
        console.warn('No active upload session for individual file event logging')
        return null
      }
      
      const teamId = authStore.currentTeam
      if (!teamId) {
        throw new Error('No team ID available for file event logging')
      }
      
      // Create individual file upload event
      const eventData = {
        uploadedAt: serverTimestamp(),
        uploadedBy: authStore.user.uid,
        sessionId: currentSessionId.value,
        
        // Event type identifier
        eventType: 'file_upload',
        
        // File details
        fileName: fileEvent.fileName,
        fileHash: fileEvent.fileHash,
        fileSize: fileEvent.fileSize,
        lastModified: fileEvent.lastModified,
        
        // Upload event details
        status: fileEvent.status, // 'uploaded', 'skipped', 'failed', 'interrupted'
        reason: fileEvent.reason, // 'already_exists', 'upload_complete', 'upload_started', 'network_error', etc.
        uploadDurationMs: fileEvent.uploadDurationMs || null,
        error: fileEvent.error || null,
        
        createdAt: serverTimestamp()
      }
      
      const eventsCollection = collection(db, 'teams', teamId, 'matters', 'general', 'uploadEvents')
      let docRef
      let eventId
      
      // For interrupted uploads and their completions, use deterministic IDs to allow overwriting
      if (fileEvent.allowOverwrite || fileEvent.status === 'interrupted') {
        eventId = generateUploadEventId(currentSessionId.value, fileEvent.fileHash)
        docRef = doc(eventsCollection, eventId)
        await setDoc(docRef, eventData) // This overwrites if exists
        console.log(`File upload event ${fileEvent.allowOverwrite ? 'overwritten' : 'created'}: ${fileEvent.fileName} (${fileEvent.status})`, {
          eventId: eventId,
          sessionId: currentSessionId.value,
          status: fileEvent.status,
          reason: fileEvent.reason
        })
      } else {
        // For skipped files, use regular auto-generated IDs (no overwriting needed)
        docRef = await addDoc(eventsCollection, eventData)
        eventId = docRef.id
        console.log(`File upload event logged: ${fileEvent.fileName} (${fileEvent.status})`, {
          eventId: eventId,
          sessionId: currentSessionId.value,
          status: fileEvent.status,
          reason: fileEvent.reason
        })
      }
      
      return eventId
    } catch (error) {
      console.error('Failed to log file upload event:', error)
      throw error
    }
  }
  
  return {
    // Session management
    startUploadSession,
    logSessionSummary,
    getCurrentSessionId,
    getSessionDuration,
    
    // Individual file event logging
    logFileUploadEvent,
    
    // Reactive session state
    currentSessionId,
    sessionStartTime
  }
}