/**
 * File analysis utility for estimating processing time and duplication
 * Extracted from worker logic for reuse in UI components
 */

/**
 * Analyze files to provide count, size, duplication estimates, and time predictions
 * @param {File[]} files - Array of File objects to analyze
 * @returns {Object} Analysis results
 */
export function analyzeFiles(files) {
  if (!files || !Array.isArray(files) || files.length === 0) {
    return {
      totalFiles: 0,
      totalSizeMB: 0,
      uniqueFiles: 0,
      duplicateCandidates: 0,
      estimatedDuplicationPercent: 0,
      estimatedTimeMs: 0,
      estimatedTimeSeconds: 0
    }
  }

  // Step 1: Group files by size to identify unique-sized files
  const fileSizeGroups = new Map() // file_size -> [files]
  
  files.forEach((file) => {
    const fileSize = file.size
    
    if (!fileSizeGroups.has(fileSize)) {
      fileSizeGroups.set(fileSize, [])
    }
    fileSizeGroups.get(fileSize).push(file)
  })
  
  const uniqueFiles = []
  const duplicateCandidates = []
  
  // Step 2: Separate unique-sized files from potential duplicates
  for (const [, fileGroup] of fileSizeGroups) {
    if (fileGroup.length === 1) {
      // Unique file size - definitely not a duplicate
      uniqueFiles.push(...fileGroup)
    } else {
      // Multiple files with same size - need hash verification
      duplicateCandidates.push(...fileGroup)
    }
  }
  
  // Calculate total size for hash candidates
  const totalSizeForHashing = duplicateCandidates.reduce((sum, file) => sum + file.size, 0)
  const totalSizeMB = totalSizeForHashing / (1024 * 1024)
  const totalFilesSizeMB = files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024)
  
  // Estimate duplication percentage based on files needing hash verification
  // Use +1 buffer to avoid "less than 0%" scenarios and provide conservative estimate
  const bufferedDuplicateCandidates = duplicateCandidates.length + 1
  const bufferedTotalFiles = files.length + 1
  const estimatedDuplicationPercent = Math.round((bufferedDuplicateCandidates / bufferedTotalFiles) * 100)
  
  // Optimized time estimation formula based on 13-test performance analysis
  // Formula: T_total = (uniqueFiles × 0.1) + (hashDataSizeMB × α) + (duplicateCandidates × 2) + (totalFiles × 4.5)
  // Where α = 10 if hashDataSizeMB > 200, else α = 18 (scale-aware processing)
  const UNIQUE_FILE_TIME_MS = 0.1        // ms per unique file
  const HASH_BASE_TIME_MS = 2            // base ms per file needing hash
  const UI_UPDATE_TIME_MS = 4.5          // ms per final file for UI update (optimized from 4.2ms observed)
  
  // Scale-aware hash processing rate based on dataset size
  // Large datasets (>200MB) process more efficiently due to batching/caching effects
  const HASH_TIME_PER_MB_LARGE = 10      // ms per MB for large datasets (>200MB)
  const HASH_TIME_PER_MB_SMALL = 18      // ms per MB for smaller datasets (≤200MB)
  const LARGE_DATASET_THRESHOLD_MB = 200  // MB threshold for scale efficiency
  
  const hashTimePerMB = totalSizeMB > LARGE_DATASET_THRESHOLD_MB ? HASH_TIME_PER_MB_LARGE : HASH_TIME_PER_MB_SMALL
  
  const uniqueFileTime = uniqueFiles.length * UNIQUE_FILE_TIME_MS
  const hashingTime = (totalSizeMB * hashTimePerMB) + (duplicateCandidates.length * HASH_BASE_TIME_MS)
  const estimatedWorkerTime = uniqueFileTime + hashingTime
  const estimatedUITime = files.length * UI_UPDATE_TIME_MS
  const totalEstimatedTime = estimatedWorkerTime + estimatedUITime
  
  
  // Calculate unique file size (files that can skip hash calculation)
  const uniqueFilesSizeMB = uniqueFiles.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024)
  
  return {
    totalFiles: files.length,
    totalSizeMB: Math.round(totalFilesSizeMB * 10) / 10, // Round to 1 decimal
    uniqueFiles: uniqueFiles.length,
    uniqueFilesSizeMB: Math.round(uniqueFilesSizeMB * 10) / 10,
    duplicateCandidates: duplicateCandidates.length,
    duplicateCandidatesSizeMB: Math.round(totalSizeMB * 10) / 10,
    estimatedDuplicationPercent,
    estimatedTimeMs: Math.round(totalEstimatedTime),
    estimatedTimeSeconds: Math.round(totalEstimatedTime / 1000 * 10) / 10,
    breakdown: {
      uniqueFileTimeMs: Math.round(uniqueFileTime),
      hashingTimeMs: Math.round(hashingTime), 
      workerTimeMs: Math.round(estimatedWorkerTime),
      uiTimeMs: Math.round(estimatedUITime),
      hashRateUsed: hashTimePerMB,
      isLargeDataset: totalSizeMB > LARGE_DATASET_THRESHOLD_MB
    }
  }
}

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Format time duration in human readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted time string
 */
export function formatDuration(seconds) {
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  
  if (remainingSeconds === 0) return `${minutes}m`
  return `${minutes}m ${remainingSeconds}s`
}