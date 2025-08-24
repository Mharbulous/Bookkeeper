/**
 * Validation Script for Hardware Calibration Formula
 * Tests the H-based prediction formula against actual test data
 */

// Test data from 8_Raw_ConsoleData.md
const testData = [
    // [Test, Files, T, DuplicateCandidates, DuplicateSizeMB, Phase1, Phase2, Phase3, Total]
    [1, 24, 63, 2, 1.4, 61, 35, 50, 146],
    [2, 96, 82, 84, 80.0, 64, 592, 57, 713],
    [3, 488, 258, 21, 2.7, 61, 123, 1658, 1842],
    [4, 707, 324, 39, 15.2, 57, 179, 1771, 2007],
    [5, 3398, 1603, 588, 201.1, 59, 2773, 2404, 5236],
    [6, 2994, 1567, 1911, 1539.0, 65, 13179, 2199, 15443]
];

// Hardware calibration formulas based on analysis
function calculateHardwarePerformanceFactor(totalFiles, folderAnalysisTimeMs) {
    return totalFiles / folderAnalysisTimeMs;
}

function calculateCalibratedProcessingTime(folderData, hardwarePerformanceFactor) {
    const {
        totalFiles,
        duplicateCandidates,
        duplicateCandidatesSizeMB,
        avgDirectoryDepth = 2.5
    } = folderData;

    // Phase 1: Filtering (constant ~60ms)
    const phase1TimeMs = 60;

    // Phase 2: Hash Calculation (linear combination)
    const PHASE2_BASE_MS = 35;
    const PHASE2_CANDIDATE_FACTOR = 6.5;
    const PHASE2_SIZE_FACTOR = 0.8;
    
    const phase2BaseTime = PHASE2_BASE_MS + 
                          (duplicateCandidates * PHASE2_CANDIDATE_FACTOR) + 
                          (duplicateCandidatesSizeMB * PHASE2_SIZE_FACTOR);

    // Phase 3: UI Rendering
    const PHASE3_BASE_MS = 50;
    const PHASE3_FILE_FACTOR = 0.52;
    const PHASE3_DEPTH_FACTOR = 45;
    
    const phase3BaseTime = PHASE3_BASE_MS + 
                          (totalFiles * PHASE3_FILE_FACTOR) + 
                          (avgDirectoryDepth * PHASE3_DEPTH_FACTOR);

    // Hardware calibration
    const baselineH = 1.61;
    const hardwareCalibrationMultiplier = baselineH / hardwarePerformanceFactor;
    
    const calibratedPhase2 = phase2BaseTime * hardwareCalibrationMultiplier;
    const calibratedPhase3 = phase3BaseTime * hardwareCalibrationMultiplier;

    const totalCalibratedTime = phase1TimeMs + calibratedPhase2 + calibratedPhase3;

    return {
        totalTimeMs: Math.max(1, Math.round(totalCalibratedTime)),
        phases: {
            phase1FilteringMs: Math.round(phase1TimeMs),
            phase2HashingMs: Math.round(calibratedPhase2),
            phase3RenderingMs: Math.round(calibratedPhase3)
        }
    };
}

console.log('Hardware Calibration Formula Validation');
console.log('=' * 60);

// Process each test case
const validationResults = testData.map(row => {
    const [test, files, T, duplicateCandidates, duplicateSizeMB, phase1Actual, phase2Actual, phase3Actual, totalActual] = row;
    
    // Calculate Hardware Performance Factor for this test
    const H = calculateHardwarePerformanceFactor(files, T);
    
    // Create folder data object
    const folderData = {
        totalFiles: files,
        duplicateCandidates,
        duplicateCandidatesSizeMB: duplicateSizeMB,
        avgDirectoryDepth: 3.0 // Estimated average from test data
    };
    
    // Calculate predictions using H-based formula
    const prediction = calculateCalibratedProcessingTime(folderData, H);
    
    // Calculate individual phase errors
    const phase1Error = Math.abs(prediction.phases.phase1FilteringMs - phase1Actual);
    const phase2Error = Math.abs(prediction.phases.phase2HashingMs - phase2Actual);
    const phase3Error = Math.abs(prediction.phases.phase3RenderingMs - phase3Actual);
    const totalError = Math.abs(prediction.totalTimeMs - totalActual);
    
    // Calculate percentage errors
    const phase1ErrorPct = (phase1Error / phase1Actual) * 100;
    const phase2ErrorPct = (phase2Error / phase2Actual) * 100;
    const phase3ErrorPct = (phase3Error / phase3Actual) * 100;
    const totalErrorPct = (totalError / totalActual) * 100;
    
    return {
        test,
        files,
        T,
        H: H.toFixed(2),
        actual: { phase1: phase1Actual, phase2: phase2Actual, phase3: phase3Actual, total: totalActual },
        predicted: { 
            phase1: prediction.phases.phase1FilteringMs, 
            phase2: prediction.phases.phase2HashingMs, 
            phase3: prediction.phases.phase3RenderingMs, 
            total: prediction.totalTimeMs 
        },
        errors: { phase1: phase1Error, phase2: phase2Error, phase3: phase3Error, total: totalError },
        errorPct: { 
            phase1: phase1ErrorPct.toFixed(1), 
            phase2: phase2ErrorPct.toFixed(1), 
            phase3: phase3ErrorPct.toFixed(1), 
            total: totalErrorPct.toFixed(1) 
        }
    };
});

console.log('\nDetailed Validation Results:');
console.log('-' * 80);
console.log('Test | Files | H    | P1 Actual vs Pred | P2 Actual vs Pred | P3 Actual vs Pred | Total Error');
console.log('-' * 80);

validationResults.forEach(result => {
    const line = `${result.test.toString().padStart(4)} | ${result.files.toString().padStart(5)} | ${result.H.padStart(4)} | ` +
                 `${result.actual.phase1.toString().padStart(3)} vs ${result.predicted.phase1.toString().padStart(3)} (${result.errorPct.phase1}%) | ` +
                 `${result.actual.phase2.toString().padStart(5)} vs ${result.predicted.phase2.toString().padStart(5)} (${result.errorPct.phase2}%) | ` +
                 `${result.actual.phase3.toString().padStart(4)} vs ${result.predicted.phase3.toString().padStart(4)} (${result.errorPct.phase3}%) | ` +
                 `${result.errorPct.total}%`;
    console.log(line);
});

// Calculate overall statistics
const allTotalErrors = validationResults.map(r => parseFloat(r.errorPct.total));
const allPhase2Errors = validationResults.map(r => parseFloat(r.errorPct.phase2));
const allPhase3Errors = validationResults.map(r => parseFloat(r.errorPct.phase3));

const meanTotalError = allTotalErrors.reduce((a, b) => a + b, 0) / allTotalErrors.length;
const meanPhase2Error = allPhase2Errors.reduce((a, b) => a + b, 0) / allPhase2Errors.length;
const meanPhase3Error = allPhase3Errors.reduce((a, b) => a + b, 0) / allPhase3Errors.length;

const maxTotalError = Math.max(...allTotalErrors);
const minTotalError = Math.min(...allTotalErrors);

console.log('\n📊 VALIDATION SUMMARY:');
console.log('=' * 50);
console.log(`Mean Total Prediction Error: ${meanTotalError.toFixed(1)}%`);
console.log(`Total Error Range: ${minTotalError.toFixed(1)}% - ${maxTotalError.toFixed(1)}%`);
console.log(`Mean Phase 2 Error: ${meanPhase2Error.toFixed(1)}%`);
console.log(`Mean Phase 3 Error: ${meanPhase3Error.toFixed(1)}%`);

console.log('\n🎯 H FACTOR ANALYSIS:');
const allH = validationResults.map(r => parseFloat(r.H));
const meanH = allH.reduce((a, b) => a + b, 0) / allH.length;
const minH = Math.min(...allH);
const maxH = Math.max(...allH);
console.log(`Mean H: ${meanH.toFixed(2)} files/ms`);
console.log(`H Range: ${minH.toFixed(2)} - ${maxH.toFixed(2)} files/ms`);

console.log('\n✅ FORMULA VALIDATION:');
if (meanTotalError < 20) {
    console.log(`✓ EXCELLENT: Mean error ${meanTotalError.toFixed(1)}% is very good for processing time prediction`);
} else if (meanTotalError < 35) {
    console.log(`✓ GOOD: Mean error ${meanTotalError.toFixed(1)}% is acceptable for processing time prediction`);
} else {
    console.log(`⚠ NEEDS IMPROVEMENT: Mean error ${meanTotalError.toFixed(1)}% suggests formula needs refinement`);
}

console.log('\n📈 RECOMMENDED H-BASED FORMULA:');
console.log('H = totalFiles / folderAnalysisTime');
console.log('Phase1 = 60ms (constant)');
console.log('Phase2 = (35 + 6.5*duplicateCandidates + 0.8*duplicateSizeMB) * (1.61/H)');
console.log('Phase3 = (50 + 0.52*totalFiles + 45*avgDepth) * (1.61/H)');
console.log('Total = Phase1 + Phase2 + Phase3');

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testData, calculateHardwarePerformanceFactor, calculateCalibratedProcessingTime, validationResults };
}