import { doc, setDoc, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore'
import { db } from './firebase.js'

export class UploadLogService {
  // Simple file registry using hash as ID (legacy method - kept for backward compatibility)
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

  // Atomic batch registration for multiple files
  static async registerFileBatch(fileDataArray, teamId) {
    return await runTransaction(db, async (transaction) => {
      const results = []
      const batchWrites = []

      // Step 1: Check all files for existing duplicates in a single transaction
      for (const { hash, metadata } of fileDataArray) {
        const fileRef = doc(db, 'teams', teamId, 'files', hash)
        const existingDoc = await transaction.get(fileRef)
        
        if (existingDoc.exists()) {
          // File already exists - mark as duplicate
          results.push({
            hash,
            status: 'duplicate',
            existing: existingDoc.data(),
            metadata
          })
        } else {
          // File is new - prepare for batch write
          const indexRef = doc(db, 'teams', teamId, 'fileIndex', hash)
          
          batchWrites.push({
            fileRef,
            indexRef,
            data: {
              ...metadata,
              hash,
              teamId,
              uploadedAt: serverTimestamp()
            },
            indexData: {
              fileName: metadata.fileName,
              fileSize: metadata.fileSize,
              uploadedAt: serverTimestamp()
            }
          })
          
          results.push({
            hash,
            status: 'new',
            metadata
          })
        }
      }

      // Step 2: Perform all writes atomically within the transaction
      for (const { fileRef, indexRef, data, indexData } of batchWrites) {
        transaction.set(fileRef, data)
        transaction.set(indexRef, indexData)
      }

      return results
    })
  }
}