#!/usr/bin/env python3
"""
Recalibration script for the 3-phase time estimation formula
Uses actual timing data to derive optimal prediction constants
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

def load_data():
    """Load and prepare timing data"""
    folder_data = pd.read_csv('4_FolderAnalysisData.csv')
    timing_data = pd.read_csv('4_TestSpeedData.csv')
    
    # Merge on Test Run # and filter worker mode only
    merged = pd.merge(folder_data, timing_data, left_on='TestRun#', right_on='Test Run #')
    worker_df = merged[merged['isWorkerMode'] == True].copy()
    
    return worker_df

def analyze_phase_patterns(df):
    """Analyze patterns in each phase to understand the relationships"""
    
    print("=" * 80)
    print("PHASE PATTERN ANALYSIS")
    print("=" * 80)
    print()
    
    # Phase 1: File Analysis
    print("PHASE 1 - FILE ANALYSIS:")
    print("-" * 40)
    phase1_per_file = df['phase1FileAnalysisMs'] / df['totalFiles']
    print(f"Current formula: 0.15 ms per file")
    print(f"Actual average: {phase1_per_file.mean():.2f} ms per file")
    print(f"Range: {phase1_per_file.min():.2f} - {phase1_per_file.max():.2f} ms per file")
    print(f"Median: {phase1_per_file.median():.2f} ms per file")
    print()
    
    # Phase 2: Hash Processing  
    print("PHASE 2 - HASH PROCESSING:")
    print("-" * 40)
    phase2_per_candidate = df['phase2HashProcessingMs'] / df['duplicateCandidateCount']
    phase2_per_candidate = phase2_per_candidate[phase2_per_candidate.notna()]  # Remove NaN
    print(f"Current formula: 2 ms base + size-based calculation")
    print(f"Actual average: {phase2_per_candidate.mean():.2f} ms per duplicate candidate")
    print(f"Range: {phase2_per_candidate.min():.2f} - {phase2_per_candidate.max():.2f} ms per candidate")
    print(f"Median: {phase2_per_candidate.median():.2f} ms per candidate")
    print()
    
    # Phase 3: UI Rendering
    print("PHASE 3 - UI RENDERING:")
    print("-" * 40)
    phase3_per_file = df['phase3UIRenderingMs'] / df['totalFiles']
    print(f"Current formula: 0.8 ms per file + directory complexity")
    print(f"Actual average: {phase3_per_file.mean():.2f} ms per file")
    print(f"Range: {phase3_per_file.min():.2f} - {phase3_per_file.max():.2f} ms per file")
    print(f"Median: {phase3_per_file.median():.2f} ms per file")
    print()

def calibrate_phase1(df):
    """Calibrate Phase 1 constants using linear regression"""
    print("CALIBRATING PHASE 1 CONSTANTS:")
    print("-" * 40)
    
    # Simple linear relationship: phase1_time = files * constant
    X = df[['totalFiles']].values
    y = df['phase1FileAnalysisMs'].values
    
    model = LinearRegression(fit_intercept=True)
    model.fit(X, y)
    
    file_constant = model.coef_[0]
    base_constant = model.intercept_
    r2 = r2_score(y, model.predict(X))
    
    print(f"Optimal Phase 1 formula: {base_constant:.2f} + {file_constant:.3f} * totalFiles")
    print(f"R² score: {r2:.3f}")
    
    return file_constant, base_constant

def calibrate_phase2(df):
    """Calibrate Phase 2 constants"""
    print("CALIBRATING PHASE 2 CONSTANTS:")
    print("-" * 40)
    
    # Filter out rows with zero duplicate candidates to avoid division by zero
    valid_df = df[df['duplicateCandidateCount'] > 0].copy()
    
    if len(valid_df) == 0:
        print("No data with duplicate candidates for Phase 2 calibration")
        return 4.0, 0.0  # Fallback values
    
    # Simple relationship: phase2_time = duplicateCandidates * constant + base
    X = valid_df[['duplicateCandidateCount']].values
    y = valid_df['phase2HashProcessingMs'].values
    
    model = LinearRegression(fit_intercept=True)
    model.fit(X, y)
    
    candidate_constant = model.coef_[0]
    base_constant = model.intercept_
    r2 = r2_score(y, model.predict(X))
    
    print(f"Optimal Phase 2 formula: {base_constant:.2f} + {candidate_constant:.3f} * duplicateCandidates")
    print(f"R² score: {r2:.3f}")
    
    return candidate_constant, base_constant

def calibrate_phase3(df):
    """Calibrate Phase 3 constants"""
    print("CALIBRATING PHASE 3 CONSTANTS:")
    print("-" * 40)
    
    # Relationship: phase3_time = files * constant + base
    X = df[['totalFiles']].values
    y = df['phase3UIRenderingMs'].values
    
    model = LinearRegression(fit_intercept=True)
    model.fit(X, y)
    
    file_constant = model.coef_[0]
    base_constant = model.intercept_
    r2 = r2_score(y, model.predict(X))
    
    print(f"Optimal Phase 3 formula: {base_constant:.2f} + {file_constant:.3f} * totalFiles")
    print(f"R² score: {r2:.3f}")
    
    return file_constant, base_constant

def test_calibrated_formula(df, phase1_file, phase1_base, phase2_candidate, phase2_base, phase3_file, phase3_base):
    """Test the accuracy of the calibrated formula"""
    print("\n" + "=" * 80)
    print("CALIBRATED FORMULA VALIDATION")
    print("=" * 80)
    
    predictions = []
    for _, row in df.iterrows():
        # Calculate predictions using new constants
        phase1_pred = phase1_base + (row['totalFiles'] * phase1_file)
        phase2_pred = phase2_base + (row['duplicateCandidateCount'] * phase2_candidate)
        phase3_pred = phase3_base + (row['totalFiles'] * phase3_file)
        total_pred = phase1_pred + phase2_pred + phase3_pred
        
        predictions.append({
            'predicted_total': total_pred,
            'predicted_phase1': phase1_pred,
            'predicted_phase2': phase2_pred,
            'predicted_phase3': phase3_pred
        })
    
    pred_df = pd.DataFrame(predictions)
    
    # Calculate accuracy
    total_errors = df['totalDurationMs'] - pred_df['predicted_total']
    total_error_percent = abs(total_errors / df['totalDurationMs']) * 100
    accuracy_percent = 100 - total_error_percent
    
    print(f"\nNEW FORMULA ACCURACY:")
    print(f"Mean Accuracy: {accuracy_percent.mean():.1f}%")
    print(f"Median Accuracy: {accuracy_percent.median():.1f}%")
    print(f"Range: {accuracy_percent.min():.1f}% - {accuracy_percent.max():.1f}%")
    print(f"Mean Absolute Error: {abs(total_errors).mean():.0f} ms")
    
    # Detailed results
    print(f"\nDETAILED RESULTS:")
    print("Run# | Actual | Predicted | Error | Accuracy")
    print("-" * 48)
    
    for i, (_, row) in enumerate(df.iterrows()):
        actual = int(row['totalDurationMs'])
        predicted = int(pred_df.iloc[i]['predicted_total'])
        error = actual - predicted
        accuracy = accuracy_percent.iloc[i]
        run_num = int(row['Test Run #'])
        
        print(f"{run_num:4d} | {actual:6d} | {predicted:9d} | {error:+5d} | {accuracy:6.1f}%")
    
    return pred_df

def generate_constants_summary(phase1_file, phase1_base, phase2_candidate, phase2_base, phase3_file, phase3_base):
    """Generate a summary of the new constants for implementation"""
    
    print("\n" + "=" * 80)
    print("NEW CONSTANTS FOR IMPLEMENTATION")
    print("=" * 80)
    print()
    print("JavaScript constants for fileAnalysis.js:")
    print("-" * 40)
    print(f"// Phase 1: File Analysis")
    print(f"const PHASE1_BASE_TIME_MS = {phase1_base:.2f}")
    print(f"const PHASE1_FILE_TIME_MS = {phase1_file:.3f}")
    print()
    print(f"// Phase 2: Hash Processing")
    print(f"const PHASE2_BASE_TIME_MS = {phase2_base:.2f}")
    print(f"const PHASE2_CANDIDATE_TIME_MS = {phase2_candidate:.3f}")
    print()
    print(f"// Phase 3: UI Rendering")
    print(f"const PHASE3_BASE_TIME_MS = {phase3_base:.2f}")
    print(f"const PHASE3_FILE_TIME_MS = {phase3_file:.3f}")
    print()
    print("Updated formulas:")
    print("-" * 40)
    print(f"phase1Time = {phase1_base:.2f} + (files.length * {phase1_file:.3f})")
    print(f"phase2Time = {phase2_base:.2f} + (duplicateCandidates.length * {phase2_candidate:.3f})")
    print(f"phase3Time = {phase3_base:.2f} + (files.length * {phase3_file:.3f})")

def main():
    # Load data
    df = load_data()
    print(f"Loaded {len(df)} worker mode test runs for calibration\n")
    
    # Analyze current patterns
    analyze_phase_patterns(df)
    
    # Calibrate each phase
    phase1_file, phase1_base = calibrate_phase1(df)
    print()
    
    phase2_candidate, phase2_base = calibrate_phase2(df)
    print()
    
    phase3_file, phase3_base = calibrate_phase3(df)
    
    # Test calibrated formula
    pred_df = test_calibrated_formula(df, phase1_file, phase1_base, phase2_candidate, phase2_base, phase3_file, phase3_base)
    
    # Generate implementation summary
    generate_constants_summary(phase1_file, phase1_base, phase2_candidate, phase2_base, phase3_file, phase3_base)
    
    # Save calibrated results
    calibration_results = df.copy()
    for col in pred_df.columns:
        calibration_results[f'calibrated_{col}'] = pred_df[col]
    
    calibration_results.to_csv('4_CalibratedResults.csv', index=False)
    print(f"\nCalibrated results saved to: 4_CalibratedResults.csv")

if __name__ == "__main__":
    main()