import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase.js'

export class UploadLogService {
  // Simple file registry using hash as ID
  static async registerFile(hash, metadata, teamId) {
    const fileRef = doc(db, 'teams', teamId, 'files', hash)
    const indexRef = doc(db, 'teams', teamId, 'fileIndex', hash)
    
    try {
      // This will fail if document exists (built-in dedup!)
      await setDoc(fileRef, {
        ...metadata,
        hash,
        teamId,
        uploadedAt: serverTimestamp()
      }, { merge: false })
      
      // Also update index for fast queries
      await setDoc(indexRef, {
        fileName: metadata.fileName,
        fileSize: metadata.fileSize,
        uploadedAt: serverTimestamp()
      })
      
      return { status: 'new', hash }
    } catch (error) {
      if (error.code === 'permission-denied') {
        // Document exists - it's a duplicate
        const existingDoc = await getDoc(fileRef)
        return { 
          status: 'duplicate', 
          hash,
          existing: existingDoc.data()
        }
      }
      throw error
    }
  }
}