import { ref } from 'vue'
import { db } from '../services/firebase.js'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
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
   * Log the completion of an upload session
   * @param {Object} stats - Upload statistics
   * @param {number} stats.filesProcessed - Total files processed
   * @param {number} stats.successful - Successfully uploaded files
   * @param {number} stats.failed - Failed uploads
   * @param {number} stats.duplicatesSkipped - Files skipped as duplicates
   * @param {number} stats.totalSizeMB - Total size of all files in MB
   */
  const logUploadSession = async (stats) => {
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
      
      // Create log entry in Firestore
      const logData = {
        uploadedAt: serverTimestamp(),
        uploadedBy: authStore.user.uid,
        sessionId: currentSessionId.value,
        
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
      
      // Add to Firestore: /teams/{teamId}/matters/general/logs/{documentId}
      const logsCollection = collection(db, 'teams', teamId, 'matters', 'general', 'logs')
      const docRef = await addDoc(logsCollection, logData)
      
      console.log(`Upload session logged: ${docRef.id}`, {
        sessionId: currentSessionId.value,
        duration: `${uploadDurationMs}ms`,
        stats: stats
      })
      
      // Reset session tracking
      currentSessionId.value = null
      sessionStartTime.value = null
      
      return docRef.id
    } catch (error) {
      console.error('Failed to log upload session:', error)
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
  
  return {
    // Session management
    startUploadSession,
    logUploadSession,
    getCurrentSessionId,
    getSessionDuration,
    
    // Reactive session state
    currentSessionId,
    sessionStartTime
  }
}