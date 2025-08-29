/**
 * File analysis utility for estimating processing time and duplication
 * Extracted from worker logic for reuse in UI components
 *
 * Supports both standard predictions and hardware-calibrated predictions
 */

import {
  calculateCalibratedProcessingTime,
  getStoredHardwarePerformanceFactor,
} from './hardwareCalibration.js';

/**
 * Analyze files to provide count, size, duplication estimates, and hardware-calibrated time predictions
 * @param {File[]} files - Array of File objects to analyze
 * @param {number} totalDirectoryCount - Total number of unique directories (optional)
 * @param {number} avgDirectoryDepth - Average directory nesting depth (optional)
 * @param {number} avgFileDepth - Average file nesting depth (optional)
 * @returns {Object} Analysis results with hardware-calibrated predictions
 */
export function analyzeFiles(
  files,
  totalDirectoryCount = 0,
  avgDirectoryDepth = 0,
  avgFileDepth = 0
) {
  if (!files || !Array.isArray(files) || files.length === 0) {
    return {
      totalFiles: 0,
      totalSizeMB: 0,
      uniqueFiles: 0,
      duplicateCandidates: 0,
      estimatedDuplicationPercent: 0,
      timeMs: 0,
      timeSeconds: 0,
      totalDirectoryCount: totalDirectoryCount,
    };
  }

  // Step 1: Group files by size to identify unique-sized files
  const fileSizeGroups = new Map(); // file_size -> [files]

  files.forEach((file) => {
    const fileSize = file.size;

    if (!fileSizeGroups.has(fileSize)) {
      fileSizeGroups.set(fileSize, []);
    }
    fileSizeGroups.get(fileSize).push(file);
  });

  const uniqueFiles = [];
  const duplicateCandidates = [];

  // Step 2: Separate unique-sized files from potential duplicates
  for (const [, fileGroup] of fileSizeGroups) {
    if (fileGroup.length === 1) {
      // Unique file size - definitely not a duplicate
      uniqueFiles.push(...fileGroup);
    } else {
      // Multiple files with same size - need hash verification
      duplicateCandidates.push(...fileGroup);
    }
  }

  // Calculate total size for hash candidates
  const totalSizeForHashing = duplicateCandidates.reduce((sum, file) => sum + file.size, 0);
  const totalSizeMB = totalSizeForHashing / (1024 * 1024);
  const totalFilesSizeMB = files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);

  // Estimate duplication percentage based on files needing hash verification
  // Use +1 buffer to avoid "less than 0%" scenarios and provide conservative estimate
  const bufferedDuplicateCandidates = duplicateCandidates.length + 1;
  const bufferedTotalFiles = files.length + 1;
  const estimatedDuplicationPercent = Math.round(
    (bufferedDuplicateCandidates / bufferedTotalFiles) * 100
  );

  // Hardware-calibrated predictions (always available)
  let hardwarePerformanceFactor = getStoredHardwarePerformanceFactor();
  let usedHardwareCalibration = false;

  if (!hardwarePerformanceFactor || hardwarePerformanceFactor <= 0) {
    // Use baseline H-factor for new users or invalid stored values
    hardwarePerformanceFactor = 1.61; // Standard baseline from performance analysis
  } else {
    usedHardwareCalibration = true;
  }

  const folderData = {
    totalFiles: files.length,
    duplicateCandidates: duplicateCandidates.length,
    duplicateCandidatesSizeMB: Math.round(totalSizeMB * 10) / 10,
    avgDirectoryDepth,
    totalDirectoryCount,
  };

  // Always generate calibrated prediction - never null
  const calibratedPrediction = calculateCalibratedProcessingTime(
    folderData,
    hardwarePerformanceFactor
  );

  // Calculate unique file size (files that can skip hash calculation)
  const uniqueFilesSizeMB = uniqueFiles.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);

  return {
    totalFiles: files.length,
    totalSizeMB: Math.round(totalFilesSizeMB * 10) / 10, // Round to 1 decimal
    uniqueFiles: uniqueFiles.length,
    uniqueFilesSizeMB: Math.round(uniqueFilesSizeMB * 10) / 10,
    duplicateCandidates: duplicateCandidates.length,
    duplicateCandidatesSizeMB: Math.round(totalSizeMB * 10) / 10,
    estimatedDuplicationPercent,

    // Hardware-calibrated predictions (always available)
    timeMs: calibratedPrediction.totalTimeMs,
    timeSeconds: calibratedPrediction.totalTimeSeconds,
    isHardwareCalibrated: usedHardwareCalibration,
    totalDirectoryCount: totalDirectoryCount,

    // Hardware-calibrated phase breakdown
    phases: calibratedPrediction.phases,
    calibration: calibratedPrediction.calibration,
  };
}

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format time duration in human readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted time string
 */
export function formatDuration(seconds) {
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (remainingSeconds === 0) return `${minutes}m`;
  return `${minutes}m ${remainingSeconds}s`;
}