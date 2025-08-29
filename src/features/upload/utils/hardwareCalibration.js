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
    totalDirectoryCount = 0,
  } = folderData;

  // Validate and normalize hardware performance factor
  if (hardwarePerformanceFactor <= 0) {
    console.warn(
      `Invalid hardwarePerformanceFactor: ${hardwarePerformanceFactor}, using baseline 1.61`
    );
    hardwarePerformanceFactor = 1.61; // Use baseline instead of failing
  }

  // Validate and normalize folder data
  const safeData = {
    totalFiles: Math.max(1, totalFiles || 1), // Ensure at least 1 file
    duplicateCandidates: Math.max(0, duplicateCandidates || 0),
    duplicateCandidatesSizeMB: Math.max(0, duplicateCandidatesSizeMB || 0),
    avgDirectoryDepth: Math.max(1, avgDirectoryDepth || 2.5),
    totalDirectoryCount: Math.max(1, totalDirectoryCount || 1),
  };

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
  const PHASE2_SIZE_FACTOR = 0.8; // ms per MB of duplicate data

  const phase2BaseTime =
    PHASE2_BASE_MS +
    safeData.duplicateCandidates * PHASE2_CANDIDATE_FACTOR +
    safeData.duplicateCandidatesSizeMB * PHASE2_SIZE_FACTOR;

  // Phase 3: UI Rendering (hardware and complexity calibrated)
  // Scales with file count and directory complexity
  const PHASE3_BASE_MS = 50;
  const PHASE3_FILE_FACTOR = 0.52; // ms per file for UI rendering
  const PHASE3_DEPTH_FACTOR = 45; // ms per average directory depth level

  const phase3BaseTime =
    PHASE3_BASE_MS +
    safeData.totalFiles * PHASE3_FILE_FACTOR +
    safeData.avgDirectoryDepth * PHASE3_DEPTH_FACTOR;

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
      phase3RenderingMs: Math.round(calibratedPhase3),
    },
    calibration: {
      hardwarePerformanceFactor,
      baselineH: 1.61,
      calibrationMultiplier: hardwareCalibrationMultiplier,
      isCalibrated: true,
    },
    breakdown: {
      phase1Description: 'Size-based filtering to identify duplicate candidates',
      phase2Description: `Hash calculation for ${safeData.duplicateCandidates} duplicate candidates (${safeData.duplicateCandidatesSizeMB.toFixed(1)} MB)`,
      phase3Description: `UI rendering for ${safeData.totalFiles} files with ${safeData.avgDirectoryDepth.toFixed(1)} avg depth`,
    },
  };
}

/**
 * Get stored hardware performance factor from localStorage
 * @returns {number|null} Stored H factor or null if not available
 */
export function getStoredHardwarePerformanceFactor() {
  try {
    const stored = localStorage.getItem('hardwarePerformanceFactor');
    if (!stored) {
      console.log('No stored hardware performance factor found - this is normal for new users');
      return null;
    }

    const data = JSON.parse(stored);

    // Validate data structure
    if (!data || typeof data !== 'object') {
      console.warn('Invalid stored hardware performance data structure, clearing corrupt data');
      localStorage.removeItem('hardwarePerformanceFactor');
      return null;
    }

    // Validate measurements array
    if (!Array.isArray(data.measurements) || data.measurements.length === 0) {
      console.warn('No valid measurements found in stored data');
      return null;
    }

    // Use recent measurements (within last 10 measurements) for better accuracy
    const recentMeasurements = data.measurements.slice(-10);

    // Validate and filter measurements
    const validMeasurements = recentMeasurements.filter((m) => {
      return (
        m &&
        typeof m.H === 'number' &&
        m.H > 0 &&
        m.H < 100 && // Sanity check: H should be reasonable
        !isNaN(m.H)
      );
    });

    if (validMeasurements.length === 0) {
      console.warn('No valid measurements found, clearing corrupt calibration data');
      localStorage.removeItem('hardwarePerformanceFactor');
      return null;
    }

    const avgH = validMeasurements.reduce((sum, m) => sum + m.H, 0) / validMeasurements.length;

    // Final validation of calculated average
    if (!avgH || avgH <= 0 || isNaN(avgH)) {
      console.warn(`Invalid calculated H-factor: ${avgH}, clearing calibration data`);
      localStorage.removeItem('hardwarePerformanceFactor');
      return null;
    }

    return avgH;
  } catch (error) {
    console.warn(
      'Error retrieving stored hardware performance factor, clearing potentially corrupt data:',
      error
    );
    try {
      localStorage.removeItem('hardwarePerformanceFactor');
    } catch (clearError) {
      console.warn('Failed to clear corrupt calibration data:', clearError);
    }
  }
  return null;
}

/**
 * Store hardware performance factor measurement
 * @param {number} totalFiles - Number of files in measurement
 * @param {number} folderAnalysisTimeMs - Folder analysis time
 * @param {Object} additionalData - Additional context data
 */
export function storeHardwarePerformanceFactor(
  totalFiles,
  folderAnalysisTimeMs,
  additionalData = {}
) {
  try {
    // Validate input parameters
    if (!totalFiles || totalFiles <= 0 || !Number.isInteger(totalFiles)) {
      console.warn(`Invalid totalFiles for calibration: ${totalFiles}`);
      return;
    }

    if (
      !folderAnalysisTimeMs ||
      folderAnalysisTimeMs <= 0 ||
      !Number.isFinite(folderAnalysisTimeMs)
    ) {
      console.warn(`Invalid folderAnalysisTimeMs for calibration: ${folderAnalysisTimeMs}`);
      return;
    }

    const H = calculateHardwarePerformanceFactor(totalFiles, folderAnalysisTimeMs);

    // Enhanced validation for H-factor
    if (!H || H <= 0 || !Number.isFinite(H) || H > 100) {
      console.warn(
        `Invalid calculated H-factor: ${H} (files: ${totalFiles}, time: ${folderAnalysisTimeMs}ms)`
      );
      return;
    }

    const measurement = {
      timestamp: Date.now(),
      totalFiles,
      folderAnalysisTimeMs,
      H: Math.round(H * 1000) / 1000, // Round to 3 decimal places
      ...additionalData,
    };

    let stored = { measurements: [] };
    try {
      const existing = localStorage.getItem('hardwarePerformanceFactor');
      if (existing) {
        const parsed = JSON.parse(existing);
        // Validate existing data structure
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.measurements)) {
          stored = parsed;
        } else {
          console.warn('Invalid existing calibration data structure, starting fresh');
        }
      }
    } catch (error) {
      console.warn('Error parsing stored hardware performance data, starting fresh:', error);
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
    stored.currentAvgH =
      stored.measurements.reduce((sum, m) => sum + m.H, 0) / stored.measurements.length;

    // Attempt to store with error handling
    try {
      const serialized = JSON.stringify(stored);
      localStorage.setItem('hardwarePerformanceFactor', serialized);
      console.log(
        `📊 Hardware Performance Factor stored: H = ${H.toFixed(3)} files/ms (${stored.totalMeasurements} measurements, avg: ${stored.currentAvgH.toFixed(3)})`
      );
    } catch (storageError) {
      console.error('Failed to save hardware performance factor to localStorage:', storageError);
      // Check if it's a storage quota error
      if (storageError.name === 'QuotaExceededError' || storageError.code === 22) {
        console.warn('localStorage quota exceeded, attempting to clear old calibration data');
        try {
          // Keep only last 10 measurements and try again
          stored.measurements = stored.measurements.slice(-10);
          stored.totalMeasurements = stored.measurements.length;
          stored.currentAvgH =
            stored.measurements.reduce((sum, m) => sum + m.H, 0) / stored.measurements.length;
          const compactSerialized = JSON.stringify(stored);
          localStorage.setItem('hardwarePerformanceFactor', compactSerialized);
          console.log(
            `📊 Hardware Performance Factor stored (compact): H = ${H.toFixed(3)} files/ms (${stored.totalMeasurements} measurements)`
          );
        } catch (retryError) {
          console.error('Failed to store even compact calibration data:', retryError);
        }
      }
    }
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
        const recentAvgH =
          recentMeasurements.reduce((sum, m) => sum + m.H, 0) / recentMeasurements.length;
        const minH = Math.min(...measurements.map((m) => m.H));
        const maxH = Math.max(...measurements.map((m) => m.H));

        return {
          isCalibrated: true,
          totalMeasurements: measurements.length,
          avgH: parseFloat(avgH.toFixed(3)),
          recentAvgH: parseFloat(recentAvgH.toFixed(3)),
          minH: parseFloat(minH.toFixed(3)),
          maxH: parseFloat(maxH.toFixed(3)),
          lastMeasurement: measurements[measurements.length - 1],
          calibrationAge: Date.now() - data.lastUpdated,
          measurements: measurements,
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
    measurements: [],
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
