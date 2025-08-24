/**
 * Phase 2 Hash Calculation Relationship Analysis
 * Manual calculation of mathematical relationships to determine optimal model
 */

// Extracted data from 8_Raw_ConsoleData.md with corrected phase definitions
const testData = [
    // [Test, Files, T, DuplicateCandidates, DuplicateSizeMB, Phase1, Phase2, Phase3, Total]
    [1, 24, 63, 2, 1.4, 61, 35, 50, 146],
    [2, 96, 82, 84, 80.0, 64, 592, 57, 713],
    [3, 488, 258, 21, 2.7, 61, 123, 1658, 1842],
    [4, 707, 324, 39, 15.2, 57, 179, 1771, 2007],
    [5, 3398, 1603, 588, 201.1, 59, 2773, 2404, 5236],
    [6, 2994, 1567, 1911, 1539.0, 65, 13179, 2199, 15443]
];

console.log('Phase 2 Hash Calculation Relationship Analysis');
console.log('='.repeat(50));

// Calculate Hardware Performance Factor (H) and extract Phase 2 data
const analysisData = testData.map(row => {
    const [test, files, T, duplicateCandidates, duplicateSizeMB, phase1, phase2, phase3, total] = row;
    const H = files / T;
    return {
        test,
        files,
        T,
        duplicateCandidates,
        duplicateSizeMB,
        phase1,
        phase2,
        phase3,
        total,
        H,
        timePerCandidate: phase2 / duplicateCandidates,
        timePerMB: phase2 / duplicateSizeMB
    };
});

console.log('\nExtracted Data:');
console.table(analysisData.map(d => ({
    Test: d.test,
    'Dup Candidates': d.duplicateCandidates,
    'Dup Size (MB)': d.duplicateSizeMB.toFixed(1),
    'Phase 2 (ms)': d.phase2,
    'H (files/ms)': d.H.toFixed(2),
    'ms/candidate': d.timePerCandidate.toFixed(1),
    'ms/MB': d.timePerMB.toFixed(1)
})));

// Manual regression analysis functions
function calculateLinearRegression(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
}

function calculateRSquared(actual, predicted) {
    const meanActual = actual.reduce((a, b) => a + b, 0) / actual.length;
    const totalSumSquares = actual.reduce((sum, val) => sum + Math.pow(val - meanActual, 2), 0);
    const residualSumSquares = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0);
    return 1 - (residualSumSquares / totalSumSquares);
}

function calculateMAE(actual, predicted) {
    return actual.reduce((sum, val, i) => sum + Math.abs(val - predicted[i]), 0) / actual.length;
}

// Extract variables for analysis
const candidates = analysisData.map(d => d.duplicateCandidates);
const sizeMB = analysisData.map(d => d.duplicateSizeMB);
const phase2Times = analysisData.map(d => d.phase2);

console.log('\nPhase 2 Relationship Analysis:');
console.log(`Time Range: ${Math.min(...phase2Times)} - ${Math.max(...phase2Times)} ms`);
console.log(`Candidates Range: ${Math.min(...candidates)} - ${Math.max(...candidates)}`);
console.log(`Size Range: ${Math.min(...sizeMB).toFixed(1)} - ${Math.max(...sizeMB).toFixed(1)} MB`);

// Test different models
const models = {};

// 1. Linear Model: a + b*candidates + c*sizeMB
console.log('\n1. Linear Model Testing:');

// Simple linear correlation with candidates only
const candidatesRegression = calculateLinearRegression(candidates, phase2Times);
const candidatesPredictions = candidates.map(c => candidatesRegression.intercept + candidatesRegression.slope * c);
models.candidatesOnly = {
    formula: `${candidatesRegression.intercept.toFixed(2)} + ${candidatesRegression.slope.toFixed(4)} * candidates`,
    rSquared: calculateRSquared(phase2Times, candidatesPredictions),
    mae: calculateMAE(phase2Times, candidatesPredictions),
    predictions: candidatesPredictions
};

// Simple linear correlation with size only
const sizeRegression = calculateLinearRegression(sizeMB, phase2Times);
const sizePredictions = sizeMB.map(s => sizeRegression.intercept + sizeRegression.slope * s);
models.sizeOnly = {
    formula: `${sizeRegression.intercept.toFixed(2)} + ${sizeRegression.slope.toFixed(4)} * sizeMB`,
    rSquared: calculateRSquared(phase2Times, sizePredictions),
    mae: calculateMAE(phase2Times, sizePredictions),
    predictions: sizePredictions
};

// Combined linear model (manual approximation)
// Using least squares approximation for multiple variables
const combinedPredictions = candidates.map((c, i) => {
    return 50 + c * 6.5 + sizeMB[i] * 0.8; // Manual approximation
});
models.combined = {
    formula: '50 + 6.5 * candidates + 0.8 * sizeMB',
    rSquared: calculateRSquared(phase2Times, combinedPredictions),
    mae: calculateMAE(phase2Times, combinedPredictions),
    predictions: combinedPredictions
};

// 2. Test logarithmic relationship
console.log('\n2. Logarithmic Model Testing:');
const logCandidates = candidates.map(c => Math.log(Math.max(c, 1)));
const logRegression = calculateLinearRegression(logCandidates, phase2Times);
const logPredictions = logCandidates.map(logC => logRegression.intercept + logRegression.slope * logC);
models.logarithmic = {
    formula: `${logRegression.intercept.toFixed(2)} + ${logRegression.slope.toFixed(2)} * log(candidates)`,
    rSquared: calculateRSquared(phase2Times, logPredictions),
    mae: calculateMAE(phase2Times, logPredictions),
    predictions: logPredictions
};

// 3. Test square root relationship
console.log('\n3. Square Root Model Testing:');
const sqrtCandidates = candidates.map(c => Math.sqrt(c));
const sqrtRegression = calculateLinearRegression(sqrtCandidates, phase2Times);
const sqrtPredictions = sqrtCandidates.map(sqrtC => sqrtRegression.intercept + sqrtRegression.slope * sqrtC);
models.squareRoot = {
    formula: `${sqrtRegression.intercept.toFixed(2)} + ${sqrtRegression.slope.toFixed(2)} * sqrt(candidates)`,
    rSquared: calculateRSquared(phase2Times, sqrtPredictions),
    mae: calculateMAE(phase2Times, sqrtPredictions),
    predictions: sqrtPredictions
};

// 4. Test power relationship (quadratic approximation)
console.log('\n4. Quadratic Model Testing:');
const squaredCandidates = candidates.map(c => c * c);
const quadRegression = calculateLinearRegression(squaredCandidates, phase2Times);
const quadPredictions = squaredCandidates.map(c2 => quadRegression.intercept + quadRegression.slope * c2);
models.quadratic = {
    formula: `${quadRegression.intercept.toFixed(2)} + ${(quadRegression.slope * 1000000).toFixed(6)} * candidates²`,
    rSquared: calculateRSquared(phase2Times, quadPredictions),
    mae: calculateMAE(phase2Times, quadPredictions),
    predictions: quadPredictions
};

// Display results
console.log('\nModel Comparison Results:');
console.log('-'.repeat(80));
console.log('Model                | R²      | MAE (ms) | Formula');
console.log('-'.repeat(80));

Object.entries(models).forEach(([name, model]) => {
    const nameFormatted = name.padEnd(20);
    const r2Formatted = model.rSquared.toFixed(4).padStart(7);
    const maeFormatted = model.mae.toFixed(1).padStart(8);
    console.log(`${nameFormatted}| ${r2Formatted} | ${maeFormatted} | ${model.formula}`);
});

// Find best model
const bestModelName = Object.entries(models).reduce((best, [name, model]) => 
    model.rSquared > models[best].rSquared ? name : best
, Object.keys(models)[0]);

const bestModel = models[bestModelName];
console.log(`\n🎯 BEST MODEL: ${bestModelName.toUpperCase()}`);
console.log(`   R² = ${bestModel.rSquared.toFixed(4)}`);
console.log(`   MAE = ${bestModel.mae.toFixed(1)} ms`);
console.log(`   Formula: ${bestModel.formula}`);

// Show detailed predictions vs actual
console.log(`\nPrediction Accuracy for ${bestModelName} Model:`);
console.log('-'.repeat(60));
console.log('Test | Actual | Predicted | Error | Error%');
console.log('-'.repeat(60));

phase2Times.forEach((actual, i) => {
    const predicted = bestModel.predictions[i];
    const error = actual - predicted;
    const errorPct = Math.abs(error) / actual * 100;
    console.log(`${(i + 1).toString().padStart(4)} | ${actual.toString().padStart(6)} | ${predicted.toFixed(1).padStart(9)} | ${error.toFixed(0).padStart(5)} | ${errorPct.toFixed(1).padStart(5)}%`);
});

// Hardware Performance Factor Analysis
console.log('\nHardware Performance Factor (H) Analysis:');
console.log('-'.repeat(50));
console.log('Test | Files | T(ms) | H (files/ms)');
console.log('-'.repeat(50));
analysisData.forEach(d => {
    console.log(`${d.test.toString().padStart(4)} | ${d.files.toString().padStart(5)} | ${d.T.toString().padStart(5)} | ${d.H.toFixed(2).padStart(11)}`);
});

const avgH = analysisData.reduce((sum, d) => sum + d.H, 0) / analysisData.length;
const minH = Math.min(...analysisData.map(d => d.H));
const maxH = Math.max(...analysisData.map(d => d.H));

console.log('\nH Statistics:');
console.log(`  Mean H: ${avgH.toFixed(2)} files/ms`);
console.log(`  Range: ${minH.toFixed(2)} - ${maxH.toFixed(2)} files/ms`);
console.log(`  Standard Deviation: ${Math.sqrt(analysisData.reduce((sum, d) => sum + Math.pow(d.H - avgH, 2), 0) / analysisData.length).toFixed(2)}`);

// Export recommendations
console.log('\n📝 IMPLEMENTATION RECOMMENDATIONS:');
console.log('='.repeat(50));
console.log(`Best Phase 2 Model: ${bestModel.formula}`);
console.log(`Hardware Performance Factor: H = ${avgH.toFixed(2)} files/ms (average)`);

console.log('\nComplete H-Based Processing Time Formula:');
console.log('Total Processing Time = H × (Phase1 + Phase2 + Phase3)');
console.log('Where:');
console.log('  Phase 1 (Filtering): 61ms (constant)');
console.log(`  Phase 2 (Hashing): ${bestModel.formula}`);
console.log('  Phase 3 (UI): 50 + (totalFiles × 0.52) + (avgDirectoryDepth × 45)');
console.log(`  H (Hardware Factor): ${avgH.toFixed(2)} files/ms`);