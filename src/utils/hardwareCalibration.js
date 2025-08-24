/**
 * Hardware Calibration Utility
 * Provides hardware-specific performance calibration for file processing time predictions
 */

/**
 * Calculate Hardware Performance Factor (H) based on folder analysis timing
 * H represents how many files per millisecond this hardware can analyze
 * @param {number} totalFiles - Number of files analyzed
 * @param {number} folderAnalysisTimeMs - Time taken for folder analysis in milliseconds
 * @returns {number} Hardware performance factor (files/ms)
 */
export function calculateHardwarePerformanceFactor(totalFiles, folderAnalysisTimeMs) {
  if (folderAnalysisTimeMs <= 0) return 0;
  return totalFiles / folderAnalysisTimeMs;
}

/**
 * Calculate calibrated processing time prediction using hardware performance factor
 * @param {Object} folderData - Folder analysis data
 * @param {number} folderData.totalFiles - Total number of files
 * @param {number} folderData.duplicateCandidates - Files requiring hash verification
 * @param {number} folderData.duplicateCandidatesSizeMB - Size of files requiring hashing (MB)
 * @param {number} folderData.avgDirectoryDepth - Average directory nesting depth
 * @param {number} folderData.totalDirectoryCount - Total directory count
 * @param {number} hardwarePerformanceFactor - H factor (files/ms) from folder analysis
 * @returns {Object} Calibrated time predictions
 */
export function calculateCalibratedProcessingTime(folderData, hardwarePerformanceFactor) {
  const {
    totalFiles,
    duplicateCandidates,
    duplicateCandidatesSizeMB,
    avgDirectoryDepth = 2.5,
    totalDirectoryCount = 0
  } = folderData;

  if (hardwarePerformanceFactor <= 0) {
    // Fallback to standard prediction if H is invalid
    return calculateStandardProcessingTime(folderData);
  }

  // Phase 1: Filtering (size-based duplicate detection)
  // Observed to be consistently around 60ms regardless of file count
  const phase1TimeMs = 60;

  // Phase 2: Hash Calculation (hardware-calibrated)
  // Based on analysis of Phase 2 timing data showing combined relationship
  // Best fit: Linear combination of candidates and data size
  // Formula: 35 + (6.5 * candidates) + (0.8 * sizeMB)
  // This accounts for both computational overhead and I/O overhead
  const PHASE2_BASE_MS = 35;
  const PHASE2_CANDIDATE_FACTOR = 6.5; // ms per duplicate candidate
  const PHASE2_SIZE_FACTOR = 0.8;      // ms per MB of duplicate data
  
  const phase2BaseTime = PHASE2_BASE_MS + 
                        (duplicateCandidates * PHASE2_CANDIDATE_FACTOR) + 
                        (duplicateCandidatesSizeMB * PHASE2_SIZE_FACTOR);

  // Phase 3: UI Rendering (hardware and complexity calibrated)
  // Scales with file count and directory complexity
  const PHASE3_BASE_MS = 50;
  const PHASE3_FILE_FACTOR = 0.52;     // ms per file for UI rendering
  const PHASE3_DEPTH_FACTOR = 45;      // ms per average directory depth level
  
  const phase3BaseTime = PHASE3_BASE_MS + 
                        (totalFiles * PHASE3_FILE_FACTOR) + 
                        (avgDirectoryDepth * PHASE3_DEPTH_FACTOR);

  // Apply hardware calibration factor
  // H represents the relationship between hardware speed and actual performance
  // Higher H = faster hardware = faster processing
  const hardwareCalibrationMultiplier = 1.61 / hardwarePerformanceFactor; // 1.61 is baseline H
  
  const calibratedPhase2 = phase2BaseTime * hardwareCalibrationMultiplier;
  const calibratedPhase3 = phase3BaseTime * hardwareCalibrationMultiplier;

  const totalCalibratedTime = phase1TimeMs + calibratedPhase2 + calibratedPhase3;

  return {
    totalTimeMs: Math.max(1, Math.round(totalCalibratedTime)),
    totalTimeSeconds: Math.round(Math.max(1, totalCalibratedTime) / 100) / 10, // Round to nearest 0.1s
    phases: {
      phase1FilteringMs: Math.round(phase1TimeMs),
      phase2HashingMs: Math.round(calibratedPhase2),
      phase3RenderingMs: Math.round(calibratedPhase3)
    },
    calibration: {
      hardwarePerformanceFactor,
      baselineH: 1.61,
      calibrationMultiplier: hardwareCalibrationMultiplier,
      isCalibrated: true
    },
    breakdown: {
      phase1Description: 'Size-based filtering to identify duplicate candidates',
      phase2Description: `Hash calculation for ${duplicateCandidates} duplicate candidates (${duplicateCandidatesSizeMB.toFixed(1)} MB)`,
      phase3Description: `UI rendering for ${totalFiles} files with ${avgDirectoryDepth.toFixed(1)} avg depth`
    }
  };
}

/**
 * Fallback standard processing time calculation (non-calibrated)
 * Uses the existing constants from fileAnalysis.js
 * @param {Object} folderData - Folder analysis data
 * @returns {Object} Standard time predictions
 */
export function calculateStandardProcessingTime(folderData) {
  const {
    totalFiles,
    duplicateCandidates,
    duplicateCandidatesSizeMB,
    avgDirectoryDepth = 2.5,
    totalDirectoryCount = 0
  } = folderData;

  // Use existing Trial 5 optimized constants from fileAnalysis.js
  const PHASE1_BASE_MS = 172.480;
  const PHASE1_FILE_MS = 0.656570;
  const PHASE1_DEPTH_MS = -88.604405;
  const PHASE1_DIR_MS = -2.045097;

  const PHASE2_BASE_MS = -75.215;
  const PHASE2_CANDIDATE_MS = 5.142402;
  const PHASE2_DUPSIZE_MS = 0.734205;

  const PHASE3_BASE_MS = -218.692;
  const PHASE3_FILE_MS = 3.441149;
  const PHASE3_DEPTH_MS = 133.740506;
  const PHASE3_DIR_MS = 1.682150;

  const phase1Time = PHASE1_BASE_MS + (totalFiles * PHASE1_FILE_MS) + 
                    (avgDirectoryDepth * PHASE1_DEPTH_MS) + 
                    (totalDirectoryCount * PHASE1_DIR_MS);

  const phase2Time = PHASE2_BASE_MS + (duplicateCandidates * PHASE2_CANDIDATE_MS) + 
                    (duplicateCandidatesSizeMB * PHASE2_DUPSIZE_MS);

  const phase3Time = PHASE3_BASE_MS + (totalFiles * PHASE3_FILE_MS) + 
                    (avgDirectoryDepth * PHASE3_DEPTH_MS) + 
                    (totalDirectoryCount * PHASE3_DIR_MS);

  const totalTime = phase1Time + phase2Time + phase3Time;

  return {
    totalTimeMs: Math.max(1, Math.round(totalTime)),
    totalTimeSeconds: Math.round(Math.max(1, totalTime) / 100) / 10,
    phases: {
      phase1FilteringMs: Math.round(phase1Time),
      phase2HashingMs: Math.round(phase2Time),
      phase3RenderingMs: Math.round(phase3Time)
    },
    calibration: {
      hardwarePerformanceFactor: 0,
      baselineH: 1.61,
      calibrationMultiplier: 1.0,
      isCalibrated: false
    },
    breakdown: {
      phase1Description: 'File analysis and preprocessing',
      phase2Description: `Hash processing for ${duplicateCandidates} candidates`,
      phase3Description: `UI rendering and updates for ${totalFiles} files`
    }
  };
}

/**
 * Get stored hardware performance factor from localStorage
 * @returns {number|null} Stored H factor or null if not available
 */
export function getStoredHardwarePerformanceFactor() {
  try {
    const stored = localStorage.getItem('hardwarePerformanceFactor');
    if (stored) {
      const data = JSON.parse(stored);
      // Use recent measurements (within last 10 measurements) for better accuracy
      if (data.measurements && data.measurements.length > 0) {
        const recentMeasurements = data.measurements.slice(-10);
        const avgH = recentMeasurements.reduce((sum, m) => sum + m.H, 0) / recentMeasurements.length;
        return avgH;
      }
    }
  } catch (error) {
    console.warn('Error retrieving stored hardware performance factor:', error);
  }
  return null;
}

/**
 * Store hardware performance factor measurement
 * @param {number} totalFiles - Number of files in measurement
 * @param {number} folderAnalysisTimeMs - Folder analysis time
 * @param {Object} additionalData - Additional context data
 */
export function storeHardwarePerformanceFactor(totalFiles, folderAnalysisTimeMs, additionalData = {}) {
  try {
    const H = calculateHardwarePerformanceFactor(totalFiles, folderAnalysisTimeMs);
    if (H <= 0) return; // Don't store invalid measurements

    const measurement = {
      timestamp: Date.now(),
      totalFiles,
      folderAnalysisTimeMs,
      H,
      ...additionalData
    };

    let stored = { measurements: [] };
    try {
      const existing = localStorage.getItem('hardwarePerformanceFactor');
      if (existing) {
        stored = JSON.parse(existing);
      }
    } catch (error) {
      console.warn('Error parsing stored hardware performance data, starting fresh');
    }

    // Add new measurement
    stored.measurements = stored.measurements || [];
    stored.measurements.push(measurement);

    // Keep only last 50 measurements to prevent storage bloat
    if (stored.measurements.length > 50) {
      stored.measurements = stored.measurements.slice(-50);
    }

    // Update statistics
    stored.lastUpdated = Date.now();
    stored.totalMeasurements = stored.measurements.length;
    stored.currentAvgH = stored.measurements.reduce((sum, m) => sum + m.H, 0) / stored.measurements.length;

    localStorage.setItem('hardwarePerformanceFactor', JSON.stringify(stored));
    
    console.log(`📊 Hardware Performance Factor stored: H = ${H.toFixed(2)} files/ms (${stored.totalMeasurements} measurements)`);
  } catch (error) {
    console.warn('Error storing hardware performance factor:', error);
  }
}

/**
 * Get hardware calibration statistics
 * @returns {Object} Calibration statistics and history
 */
export function getHardwareCalibrationStats() {
  try {
    const stored = localStorage.getItem('hardwarePerformanceFactor');
    if (stored) {
      const data = JSON.parse(stored);
      if (data.measurements && data.measurements.length > 0) {
        const measurements = data.measurements;
        const recentMeasurements = measurements.slice(-10);
        
        const avgH = measurements.reduce((sum, m) => sum + m.H, 0) / measurements.length;
        const recentAvgH = recentMeasurements.reduce((sum, m) => sum + m.H, 0) / recentMeasurements.length;
        const minH = Math.min(...measurements.map(m => m.H));
        const maxH = Math.max(...measurements.map(m => m.H));
        
        return {
          isCalibrated: true,
          totalMeasurements: measurements.length,
          avgH: parseFloat(avgH.toFixed(3)),
          recentAvgH: parseFloat(recentAvgH.toFixed(3)),
          minH: parseFloat(minH.toFixed(3)),
          maxH: parseFloat(maxH.toFixed(3)),
          lastMeasurement: measurements[measurements.length - 1],
          calibrationAge: Date.now() - data.lastUpdated,
          measurements: measurements
        };
      }
    }
  } catch (error) {
    console.warn('Error getting hardware calibration stats:', error);
  }
  
  return {
    isCalibrated: false,
    totalMeasurements: 0,
    avgH: 1.61, // Default baseline
    recentAvgH: 1.61,
    minH: 0,
    maxH: 0,
    lastMeasurement: null,
    calibrationAge: Infinity,
    measurements: []
  };
}

/**
 * Clear stored hardware calibration data
 */
export function clearHardwareCalibration() {
  try {
    localStorage.removeItem('hardwarePerformanceFactor');
    console.log('Hardware calibration data cleared');
  } catch (error) {
    console.warn('Error clearing hardware calibration data:', error);
  }
}