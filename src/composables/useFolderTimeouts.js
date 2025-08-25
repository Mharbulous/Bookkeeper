import { ref } from 'vue'

export function useFolderTimeouts() {
  // Timeout state
  const analysisTimedOut = ref(false)
  const timeoutError = ref(null)
  let analysisTimeoutId = null

  // Progress monitoring for cloud folder detection
  const setupProgressMonitoring = (pendingFolderFiles) => {
    let progressChecks = []
    let checkCount = 0
    
    const checkProgress = () => {
      checkCount++
      const elapsed = window.folderOptionsStartTime ? Math.round(performance.now() - window.folderOptionsStartTime) : 0
      const filesDetected = pendingFolderFiles.value ? pendingFolderFiles.value.length : 0
      
      progressChecks.push({ time: elapsed, files: filesDetected, check: checkCount })
      
      console.log(`PROGRESS CHECK ${checkCount}: ${filesDetected} files after ${elapsed}ms`)
      
      if (checkCount >= 3) {
        // Analyze progress rate after 3 checks
        const firstCheck = progressChecks[0]
        const lastCheck = progressChecks[progressChecks.length - 1]
        const timeDiff = lastCheck.time - firstCheck.time
        const filesDiff = lastCheck.files - firstCheck.files
        const progressRate = timeDiff > 0 ? filesDiff / (timeDiff / 1000) : 0 // files per second
        
        console.log('=== PROGRESS RATE ANALYSIS ===')
        console.log(`Files detected: ${firstCheck.files} → ${lastCheck.files} (${filesDiff} files)`)
        console.log(`Time elapsed: ${firstCheck.time}ms → ${lastCheck.time}ms (${timeDiff}ms)`)
        console.log(`Progress rate: ${progressRate.toFixed(2)} files/second`)
        
        if (lastCheck.files === 0 && lastCheck.time >= 1000) {
          // No files detected after 1000+ ms = likely cloud files
          triggerTimeout(lastCheck, progressRate)
        } else if (progressRate > 0) {
          console.log('DIAGNOSIS: Local files detected (making progress)')
          // Continue processing - good progress rate
        } else if (lastCheck.files > 0) {
          console.log('DIAGNOSIS: Local files detected (readDirectoryRecursive completed)')
          // Files were detected, readDirectoryRecursive likely completed
        }
        return
      }
      
      // Schedule next progress check
      const nextInterval = checkCount === 1 ? 200 : 200 // 600ms, 800ms, 1000ms intervals
      setTimeout(checkProgress, nextInterval)
    }
    
    // Start first progress check after 600ms
    analysisTimeoutId = setTimeout(checkProgress, 600)
    
    return analysisTimeoutId
  }

  // Trigger timeout with cloud folder detection message
  const triggerTimeout = (lastCheck, progressRate) => {
    analysisTimedOut.value = true
    
    let errorMessage = "Unable to scan the files in this folder. This is often due to files not being stored locally but being stored on a cloud or files-on-demand service such as OneDrive."
    
    const infoLines = []
    infoLines.push(`No files detected after ${lastCheck.time}ms (likely cloud files - readDirectoryRecursive stuck)`)
    infoLines.push(`Progress rate: ${progressRate.toFixed(2)} files/second`)
    
    errorMessage += "\n\nInformation gathered:\n• " + infoLines.join("\n• ")
    
    timeoutError.value = errorMessage
    
    console.log('DIAGNOSIS: Cloud files detected (no progress) - TRIGGERING ERROR')
  }

  // Initialize timeout monitoring for directory entry processing
  const initializeTimeoutForDirectoryEntry = (dirEntry, pendingFolderFiles, isAnalyzing, isAnalyzingMainFolder, isAnalyzingAllFiles) => {
    // Reset timeout state
    analysisTimedOut.value = false
    timeoutError.value = null
    
    // Clear any existing timeout
    if (analysisTimeoutId) {
      clearTimeout(analysisTimeoutId)
      analysisTimeoutId = null
    }
    
    // Set up progress-rate monitoring for behavioral cloud file detection
    let progressChecks = []
    let checkCount = 0
    
    const checkProgress = () => {
      checkCount++
      const elapsed = window.folderOptionsStartTime ? Math.round(performance.now() - window.folderOptionsStartTime) : 0
      const filesDetected = pendingFolderFiles.value ? pendingFolderFiles.value.length : 0
      
      progressChecks.push({ time: elapsed, files: filesDetected, check: checkCount })
      
      console.log(`PROGRESS CHECK ${checkCount}: ${filesDetected} files after ${elapsed}ms`)
      
      if (checkCount >= 3) {
        // Analyze progress rate after 3 checks
        const firstCheck = progressChecks[0]
        const lastCheck = progressChecks[progressChecks.length - 1]
        const timeDiff = lastCheck.time - firstCheck.time
        const filesDiff = lastCheck.files - firstCheck.files
        const progressRate = timeDiff > 0 ? filesDiff / (timeDiff / 1000) : 0 // files per second
        
        console.log('=== PROGRESS RATE ANALYSIS ===')
        console.log(`Files detected: ${firstCheck.files} → ${lastCheck.files} (${filesDiff} files)`)
        console.log(`Time elapsed: ${firstCheck.time}ms → ${lastCheck.time}ms (${timeDiff}ms)`)
        console.log(`Progress rate: ${progressRate.toFixed(2)} files/second`)
        
        if (lastCheck.files === 0 && lastCheck.time >= 1000) {
          // No files detected after 1000+ ms = likely cloud files
          analysisTimedOut.value = true
          
          let errorMessage = "Unable to scan the files in this folder. This is often due to files not being stored locally but being stored on a cloud or files-on-demand service such as OneDrive."
          
          const infoLines = []
          infoLines.push(`No files detected after ${lastCheck.time}ms (likely cloud files - readDirectoryRecursive stuck)`)
          infoLines.push(`Progress rate: ${progressRate.toFixed(2)} files/second`)
          
          errorMessage += "\n\nInformation gathered:\n• " + infoLines.join("\n• ")
          
          timeoutError.value = errorMessage
          isAnalyzing.value = false
          isAnalyzingMainFolder.value = false
          isAnalyzingAllFiles.value = false
          
          console.log('DIAGNOSIS: Cloud files detected (no progress) - TRIGGERING ERROR')
        } else if (progressRate > 0) {
          console.log('DIAGNOSIS: Local files detected (making progress)')
          // Continue processing - good progress rate
        } else if (lastCheck.files > 0) {
          console.log('DIAGNOSIS: Local files detected (readDirectoryRecursive completed)')
          // Files were detected, readDirectoryRecursive likely completed
        }
        return
      }
      
      // Schedule next progress check
      const nextInterval = checkCount === 1 ? 200 : 200 // 600ms, 800ms, 1000ms intervals
      setTimeout(checkProgress, nextInterval)
    }
    
    // Start first progress check after 600ms
    analysisTimeoutId = setTimeout(checkProgress, 600)
    
    return analysisTimeoutId
  }

  // Initialize timeout monitoring for file list processing
  const initializeTimeoutForFiles = (files, pendingFolderFiles, isAnalyzing, isAnalyzingMainFolder, isAnalyzingAllFiles) => {
    // Reset timeout state
    analysisTimedOut.value = false
    timeoutError.value = null
    
    // Clear any existing timeout
    if (analysisTimeoutId) {
      clearTimeout(analysisTimeoutId)
      analysisTimeoutId = null
    }
    
    // Set up progress-rate monitoring for behavioral cloud file detection
    let progressChecks = []
    let checkCount = 0
    
    const checkProgress = () => {
      checkCount++
      const elapsed = window.folderOptionsStartTime ? Math.round(performance.now() - window.folderOptionsStartTime) : 0
      const filesDetected = files ? files.length : (pendingFolderFiles.value ? pendingFolderFiles.value.length : 0)
      
      progressChecks.push({ time: elapsed, files: filesDetected, check: checkCount })
      
      console.log(`PROGRESS CHECK ${checkCount}: ${filesDetected} files after ${elapsed}ms`)
      
      if (checkCount >= 3) {
        // Analyze progress rate after 3 checks
        const firstCheck = progressChecks[0]
        const lastCheck = progressChecks[progressChecks.length - 1]
        const timeDiff = lastCheck.time - firstCheck.time
        const filesDiff = lastCheck.files - firstCheck.files
        const progressRate = timeDiff > 0 ? filesDiff / (timeDiff / 1000) : 0 // files per second
        
        console.log('=== PROGRESS RATE ANALYSIS ===')
        console.log(`Files detected: ${firstCheck.files} → ${lastCheck.files} (${filesDiff} files)`)
        console.log(`Time elapsed: ${firstCheck.time}ms → ${lastCheck.time}ms (${timeDiff}ms)`)
        console.log(`Progress rate: ${progressRate.toFixed(2)} files/second`)
        
        if (lastCheck.files === 0 && lastCheck.time >= 1000) {
          // No files detected after 1000+ ms = likely cloud files
          analysisTimedOut.value = true
          
          let errorMessage = "Unable to scan the files in this folder. This is often due to files not being stored locally but being stored on a cloud or files-on-demand service such as OneDrive."
          
          const infoLines = []
          infoLines.push(`No files detected after ${lastCheck.time}ms (likely cloud files - readDirectoryRecursive stuck)`)
          infoLines.push(`Progress rate: ${progressRate.toFixed(2)} files/second`)
          
          errorMessage += "\n\nInformation gathered:\n• " + infoLines.join("\n• ")
          
          timeoutError.value = errorMessage
          isAnalyzing.value = false
          isAnalyzingMainFolder.value = false
          isAnalyzingAllFiles.value = false
          
          console.log('DIAGNOSIS: Cloud files detected (no progress) - TRIGGERING ERROR')
        } else if (progressRate > 0) {
          console.log('DIAGNOSIS: Local files detected (making progress)')
          // Continue processing - good progress rate
        } else if (lastCheck.files > 0) {
          console.log('DIAGNOSIS: Local files detected (readDirectoryRecursive completed)')
          // Files were detected, readDirectoryRecursive likely completed
        }
        return
      }
      
      // Schedule next progress check
      const nextInterval = checkCount === 1 ? 200 : 200 // 600ms, 800ms, 1000ms intervals
      setTimeout(checkProgress, nextInterval)
    }
    
    // Start first progress check after 600ms
    analysisTimeoutId = setTimeout(checkProgress, 600)
    
    return analysisTimeoutId
  }

  // Clear active timeout
  const clearAnalysisTimeout = () => {
    if (analysisTimeoutId) {
      clearTimeout(analysisTimeoutId)
      analysisTimeoutId = null
    }
  }

  // Reset timeout state
  const resetTimeoutState = () => {
    analysisTimedOut.value = false
    timeoutError.value = null
    clearAnalysisTimeout()
  }

  // Check if analysis should continue (not timed out)
  const shouldContinueAnalysis = () => {
    return !analysisTimedOut.value
  }

  return {
    // Timeout state
    analysisTimedOut,
    timeoutError,
    
    // Methods
    setupProgressMonitoring,
    triggerTimeout,
    initializeTimeoutForDirectoryEntry,
    initializeTimeoutForFiles,
    clearAnalysisTimeout,
    resetTimeoutState,
    shouldContinueAnalysis
  }
}