/**
 * File analysis utility for estimating processing time and duplication
 * Extracted from worker logic for reuse in UI components
 */

/**
 * Analyze files to provide count, size, duplication estimates, and time predictions
 * @param {File[]} files - Array of File objects to analyze
 * @param {number} totalDirectoryCount - Total number of unique directories (optional)
 * @param {number} avgDirectoryDepth - Average directory nesting depth (optional)
 * @param {number} avgFileDepth - Average file nesting depth (optional)
 * @returns {Object} Analysis results
 */
export function analyzeFiles(files, totalDirectoryCount = 0, avgDirectoryDepth = 0, avgFileDepth = 0) {
  if (!files || !Array.isArray(files) || files.length === 0) {
    return {
      totalFiles: 0,
      totalSizeMB: 0,
      uniqueFiles: 0,
      duplicateCandidates: 0,
      estimatedDuplicationPercent: 0,
      estimatedTimeMs: 0,
      estimatedTimeSeconds: 0,
      totalDirectoryCount: totalDirectoryCount
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
  
  // 3-phase prediction model with enhanced optimization (Trial 5)
  // Achieves 88.4% mean accuracy with optimal model selection
  
  // Phase 1: File Analysis - multi-factor with directory structure
  // Formula: 172.48 + (0.657 * files) + (-88.60 * avgDepth) + (-2.05 * dirCount)
  const PHASE1_BASE_MS = 172.480
  const PHASE1_FILE_MS = 0.656570
  const PHASE1_DEPTH_MS = -88.604405
  const PHASE1_DIR_MS = -2.045097
  
  // Phase 2: Hash Processing - combined optimal using duplicate metrics
  // Formula: -75.22 + (5.14 * duplicateCandidates) + (0.73 * duplicateSizeMB)
  const PHASE2_BASE_MS = -75.215
  const PHASE2_CANDIDATE_MS = 5.142402
  const PHASE2_DUPSIZE_MS = 0.734205
  
  // Phase 3: UI Rendering - multi-factor with directory complexity
  // Formula: -218.69 + (3.44 * files) + (133.74 * avgDepth) + (1.68 * dirCount)
  const PHASE3_BASE_MS = -218.692
  const PHASE3_FILE_MS = 3.441149
  const PHASE3_DEPTH_MS = 133.740506
  const PHASE3_DIR_MS = 1.682150
  
  // Calculate 3-phase timing using enhanced optimized models
  const phase1Time = PHASE1_BASE_MS + (files.length * PHASE1_FILE_MS) + (avgDirectoryDepth * PHASE1_DEPTH_MS) + (totalDirectoryCount * PHASE1_DIR_MS)
  const phase2Time = PHASE2_BASE_MS + (duplicateCandidates.length * PHASE2_CANDIDATE_MS) + (totalSizeMB * PHASE2_DUPSIZE_MS)
  const phase3Time = PHASE3_BASE_MS + (files.length * PHASE3_FILE_MS) + (avgDirectoryDepth * PHASE3_DEPTH_MS) + (totalDirectoryCount * PHASE3_DIR_MS)
  
  const totalEstimatedTime = phase1Time + phase2Time + phase3Time
  
  
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
    estimatedTimeMs: Math.max(1, Math.round(totalEstimatedTime)),
    estimatedTimeSeconds: Math.round(Math.max(1, totalEstimatedTime) / 1000 * 10) / 10,
    totalDirectoryCount: totalDirectoryCount,
    breakdown: {
      phase1TimeMs: Math.round(phase1Time),
      phase2TimeMs: Math.round(phase2Time),
      phase3TimeMs: Math.round(phase3Time),
      phase1BaseMs: PHASE1_BASE_MS,
      phase1FileMs: PHASE1_FILE_MS,
      phase1DepthMs: PHASE1_DEPTH_MS,
      phase1DirMs: PHASE1_DIR_MS,
      phase2BaseMs: PHASE2_BASE_MS,
      phase2CandidateMs: PHASE2_CANDIDATE_MS,
      phase2DupsizeMs: PHASE2_DUPSIZE_MS,
      phase3BaseMs: PHASE3_BASE_MS,
      phase3FileMs: PHASE3_FILE_MS,
      phase3DepthMs: PHASE3_DEPTH_MS,
      phase3DirMs: PHASE3_DIR_MS,
      avgDirectoryDepth: avgDirectoryDepth,
      totalDirectoryCount: totalDirectoryCount
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