#!/usr/bin/env python3
"""
Robust calibration that handles data characteristics properly
Focus on strong correlations and avoid negative coefficients
"""

import pandas as pd
import numpy as np

def load_data():
    """Load verified data"""
    folder_data = pd.read_csv('4_FolderAnalysisData.csv')
    timing_data = pd.read_csv('4_TestSpeedData.csv')
    
    merged = pd.merge(folder_data, timing_data, left_on='TestRun#', right_on='Test Run #')
    worker_df = merged[merged['isWorkerMode'] == True].copy()
    
    return worker_df

def robust_analysis(df):
    """Robust analysis focusing on strong predictive relationships"""
    
    print("=" * 80)
    print("ROBUST CALIBRATION ANALYSIS")
    print("=" * 80)
    print()
    
    print("KEY CORRELATIONS:")
    print("-" * 30)
    correlations = {
        'totalFiles vs totalDuration': df['totalFiles'].corr(df['totalDurationMs']),
        'totalFiles vs phase3': df['totalFiles'].corr(df['phase3UIRenderingMs']),
        'duplicateCandidateCount vs phase2': df['duplicateCandidateCount'].corr(df['phase2HashProcessingMs']),
        'uniqueFilesSizeMB vs totalDuration': df['uniqueFilesSizeMB'].corr(df['totalDurationMs'])
    }
    
    for name, corr in correlations.items():
        print(f"  {name:<35}: {corr:6.3f}")
    print()
    
    print("PHASE-SPECIFIC ANALYSIS:")
    print("-" * 30)
    
    # Phase 1: File Analysis - often has small values, use median approach
    print("Phase 1 (File Analysis):")
    phase1_per_file = df['phase1FileAnalysisMs'] / df['totalFiles']
    print(f"  Median ms per file: {phase1_per_file.median():.4f}")
    print(f"  Range per file: {phase1_per_file.min():.4f} - {phase1_per_file.max():.4f}")
    
    # Phase 2: Hash Processing - strong correlation with duplicate candidates  
    print("\nPhase 2 (Hash Processing):")
    valid_phase2 = df[df['duplicateCandidateCount'] > 0]
    if len(valid_phase2) > 0:
        phase2_per_candidate = valid_phase2['phase2HashProcessingMs'] / valid_phase2['duplicateCandidateCount']
        print(f"  Median ms per candidate: {phase2_per_candidate.median():.4f}")
        print(f"  Range per candidate: {phase2_per_candidate.min():.4f} - {phase2_per_candidate.max():.4f}")
    
    # Phase 3: UI Rendering - excellent correlation with file count
    print("\nPhase 3 (UI Rendering):")
    phase3_per_file = df['phase3UIRenderingMs'] / df['totalFiles']
    print(f"  Median ms per file: {phase3_per_file.median():.4f}")
    print(f"  Range per file: {phase3_per_file.min():.4f} - {phase3_per_file.max():.4f}")
    
    return {
        'phase1_per_file': phase1_per_file.median(),
        'phase2_per_candidate': phase2_per_candidate.median() if len(valid_phase2) > 0 else 5.0,
        'phase3_per_file': phase3_per_file.median()
    }

def test_robust_formula(df, constants):
    """Test the robust median-based formula"""
    
    print("\n" + "=" * 80) 
    print("ROBUST FORMULA TESTING")
    print("=" * 80)
    print()
    
    print("FORMULA CONSTANTS:")
    print("-" * 30)
    print(f"Phase 1: {constants['phase1_per_file']:.6f} ms per file")
    print(f"Phase 2: {constants['phase2_per_candidate']:.6f} ms per duplicate candidate")
    print(f"Phase 3: {constants['phase3_per_file']:.6f} ms per file")
    print()
    
    predictions = []
    
    for _, row in df.iterrows():
        phase1_pred = row['totalFiles'] * constants['phase1_per_file']
        phase2_pred = row['duplicateCandidateCount'] * constants['phase2_per_candidate']
        phase3_pred = row['totalFiles'] * constants['phase3_per_file']
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
    absolute_errors = abs(total_errors)
    accuracy_percent = 100 - (absolute_errors / df['totalDurationMs']) * 100
    
    print("ACCURACY RESULTS:")
    print("-" * 30)
    print(f"Mean Accuracy:     {accuracy_percent.mean():.1f}%")
    print(f"Median Accuracy:   {accuracy_percent.median():.1f}%")
    print(f"Best Accuracy:     {accuracy_percent.max():.1f}%")
    print(f"Worst Accuracy:    {accuracy_percent.min():.1f}%")
    print(f"Mean Abs Error:    {absolute_errors.mean():.0f} ms")
    print(f"Median Abs Error:  {absolute_errors.median():.0f} ms")
    print()
    
    print("DETAILED RESULTS:")
    print("-" * 30)
    print("Run# | Files | DupCand | SizeMB | Actual | Predicted | Error | Accuracy")
    print("-" * 76)
    
    for i, (_, row) in enumerate(df.iterrows()):
        run_num = int(row['Test Run #'])
        files = int(row['totalFiles'])
        dup_candidates = int(row['duplicateCandidateCount'])
        size_mb = row['uniqueFilesSizeMB']
        actual = int(row['totalDurationMs'])
        predicted = int(pred_df.iloc[i]['predicted_total'])
        error = int(total_errors.iloc[i])
        accuracy = accuracy_percent.iloc[i]
        
        print(f"{run_num:4d} | {files:5d} | {dup_candidates:7d} | {size_mb:6.1f} | {actual:6d} | {predicted:9d} | {error:+5d} | {accuracy:6.1f}%")
    
    return pred_df, constants

def generate_final_constants(constants):
    """Generate final implementation constants"""
    
    print("\n" + "=" * 80)
    print("FINAL IMPLEMENTATION CONSTANTS")
    print("=" * 80)
    print()
    
    print("JavaScript constants for fileAnalysis.js:")
    print("-" * 45)
    print(f"const PHASE1_FILE_TIME_MS = {constants['phase1_per_file']:.6f}  // File analysis")
    print(f"const PHASE2_CANDIDATE_TIME_MS = {constants['phase2_per_candidate']:.6f}  // Hash processing")  
    print(f"const PHASE3_FILE_TIME_MS = {constants['phase3_per_file']:.6f}  // UI rendering")
    print()
    
    print("Formula implementation:")
    print("-" * 45)
    print("const phase1Time = files.length * PHASE1_FILE_TIME_MS")
    print("const phase2Time = duplicateCandidates.length * PHASE2_CANDIDATE_TIME_MS")
    print("const phase3Time = files.length * PHASE3_FILE_TIME_MS")
    print("const totalEstimatedTime = phase1Time + phase2Time + phase3Time")
    print()
    
    print("Expected accuracy: ~84% mean, ~95% median")

def main():
    df = load_data()
    print(f"Loaded {len(df)} verified test runs")
    print()
    
    # Robust analysis using medians and strong correlations
    constants = robust_analysis(df)
    
    # Test the robust formula
    pred_df, final_constants = test_robust_formula(df, constants)
    
    # Generate implementation constants
    generate_final_constants(final_constants)
    
    # Save results
    results = df.copy()
    for col in pred_df.columns:
        results[f'robust_{col}'] = pred_df[col]
    
    results.to_csv('4_RobustCalibratedResults.csv', index=False)
    print(f"Detailed results saved to: 4_RobustCalibratedResults.csv")

if __name__ == "__main__":
    main()