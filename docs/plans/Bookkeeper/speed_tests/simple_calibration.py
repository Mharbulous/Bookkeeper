#!/usr/bin/env python3
"""
Simple calibration approach using median ratios and practical constraints
"""

import pandas as pd
import numpy as np

def load_data():
    """Load and prepare timing data"""
    folder_data = pd.read_csv('4_FolderAnalysisData.csv')
    timing_data = pd.read_csv('4_TestSpeedData.csv')
    
    # Merge and filter worker mode only
    merged = pd.merge(folder_data, timing_data, left_on='TestRun#', right_on='Test Run #')
    worker_df = merged[merged['isWorkerMode'] == True].copy()
    
    return worker_df

def simple_calibration(df):
    """Use median ratios to determine practical constants"""
    
    print("=" * 80)
    print("SIMPLE MEDIAN-BASED CALIBRATION")
    print("=" * 80)
    print()
    
    # Phase 1: File Analysis - use median ms per file
    phase1_per_file = df['phase1FileAnalysisMs'] / df['totalFiles']
    phase1_constant = phase1_per_file.median()
    
    print("PHASE 1 CALIBRATION:")
    print(f"Median ms per file: {phase1_constant:.3f}")
    print(f"Range: {phase1_per_file.min():.3f} - {phase1_per_file.max():.3f}")
    print()
    
    # Phase 2: Hash Processing - use median ms per duplicate candidate
    valid_phase2 = df[df['duplicateCandidateCount'] > 0]
    if len(valid_phase2) > 0:
        phase2_per_candidate = valid_phase2['phase2HashProcessingMs'] / valid_phase2['duplicateCandidateCount']
        phase2_constant = phase2_per_candidate.median()
        print("PHASE 2 CALIBRATION:")
        print(f"Median ms per duplicate candidate: {phase2_constant:.3f}")
        print(f"Range: {phase2_per_candidate.min():.3f} - {phase2_per_candidate.max():.3f}")
    else:
        phase2_constant = 4.0  # Fallback
        print("PHASE 2 CALIBRATION:")
        print(f"No duplicate candidate data, using fallback: {phase2_constant:.3f}")
    print()
    
    # Phase 3: UI Rendering - use median ms per file
    phase3_per_file = df['phase3UIRenderingMs'] / df['totalFiles']
    phase3_constant = phase3_per_file.median()
    
    print("PHASE 3 CALIBRATION:")
    print(f"Median ms per file: {phase3_constant:.3f}")
    print(f"Range: {phase3_per_file.min():.3f} - {phase3_per_file.max():.3f}")
    print()
    
    return phase1_constant, phase2_constant, phase3_constant

def test_simple_formula(df, phase1_const, phase2_const, phase3_const):
    """Test the simple formula accuracy"""
    
    print("SIMPLE FORMULA VALIDATION:")
    print("-" * 40)
    
    predictions = []
    errors = []
    
    for _, row in df.iterrows():
        # Simple linear relationships
        phase1_pred = row['totalFiles'] * phase1_const
        phase2_pred = row['duplicateCandidateCount'] * phase2_const
        phase3_pred = row['totalFiles'] * phase3_const
        total_pred = phase1_pred + phase2_pred + phase3_pred
        
        actual = row['totalDurationMs']
        error = actual - total_pred
        error_percent = abs(error / actual) * 100
        accuracy = 100 - error_percent
        
        predictions.append({
            'predicted_total': total_pred,
            'actual_total': actual,
            'error': error,
            'accuracy': accuracy
        })
        errors.append(error_percent)
    
    pred_df = pd.DataFrame(predictions)
    
    # Overall accuracy
    mean_accuracy = pred_df['accuracy'].mean()
    median_accuracy = pred_df['accuracy'].median()
    mean_error = abs(pred_df['error']).mean()
    
    print(f"Mean Accuracy: {mean_accuracy:.1f}%")
    print(f"Median Accuracy: {median_accuracy:.1f}%")
    print(f"Mean Absolute Error: {mean_error:.0f} ms")
    print()
    
    # Detailed results
    print("DETAILED RESULTS:")
    print("Run# | Files | DupCand | Actual | Predicted | Error | Accuracy")
    print("-" * 64)
    
    for i, (_, row) in enumerate(df.iterrows()):
        run_num = int(row['Test Run #'])
        files = int(row['totalFiles'])
        dup_candidates = int(row['duplicateCandidateCount'])
        actual = int(pred_df.iloc[i]['actual_total'])
        predicted = int(pred_df.iloc[i]['predicted_total'])
        error = int(pred_df.iloc[i]['error'])
        accuracy = pred_df.iloc[i]['accuracy']
        
        print(f"{run_num:4d} | {files:5d} | {dup_candidates:7d} | {actual:6d} | {predicted:9d} | {error:+5d} | {accuracy:6.1f}%")
    
    return pred_df

def generate_implementation_code(phase1_const, phase2_const, phase3_const):
    """Generate the implementation constants"""
    
    print("\n" + "=" * 80)
    print("IMPLEMENTATION CONSTANTS")
    print("=" * 80)
    print()
    print("Calibrated constants for fileAnalysis.js:")
    print("-" * 50)
    print(f"const PHASE1_FILE_TIME_MS = {phase1_const:.3f}  // File analysis per file")
    print(f"const PHASE2_CANDIDATE_TIME_MS = {phase2_const:.3f}  // Hash processing per duplicate candidate")  
    print(f"const PHASE3_FILE_TIME_MS = {phase3_const:.3f}  // UI rendering per file")
    print()
    print("Updated calculation logic:")
    print("-" * 50)
    print(f"const phase1Time = files.length * {phase1_const:.3f}")
    print(f"const phase2Time = duplicateCandidates.length * {phase2_const:.3f}")
    print(f"const phase3Time = files.length * {phase3_const:.3f}")
    print(f"const totalEstimatedTime = phase1Time + phase2Time + phase3Time")

def main():
    df = load_data()
    print(f"Processing {len(df)} worker mode test runs\n")
    
    # Simple calibration
    phase1_const, phase2_const, phase3_const = simple_calibration(df)
    
    # Test the simple formula
    pred_df = test_simple_formula(df, phase1_const, phase2_const, phase3_const)
    
    # Generate implementation code
    generate_implementation_code(phase1_const, phase2_const, phase3_const)
    
    # Save results
    results = df.copy()
    for col in pred_df.columns:
        results[f'simple_{col}'] = pred_df[col]
    
    results.to_csv('4_SimpleCalibratedResults.csv', index=False)
    print(f"\nResults saved to: 4_SimpleCalibratedResults.csv")

if __name__ == "__main__":
    main()