#!/usr/bin/env python3
"""
Final calibration - simple and robust approach
"""

import pandas as pd
import numpy as np

def main():
    # Load verified data
    folder_data = pd.read_csv('4_FolderAnalysisData.csv')
    timing_data = pd.read_csv('4_TestSpeedData.csv')
    
    merged = pd.merge(folder_data, timing_data, left_on='TestRun#', right_on='Test Run #')
    df = merged[merged['isWorkerMode'] == True].copy()
    
    print("=" * 80)
    print("FINAL CALIBRATION WITH VERIFIED DATA")
    print("=" * 80)
    print()
    
    print(f"Processing {len(df)} verified test runs")
    print()
    
    # Calculate simple per-unit constants using medians (robust to outliers)
    print("MEDIAN-BASED CONSTANTS:")
    print("-" * 30)
    
    # Phase 1: File Analysis per file
    phase1_per_file = (df['phase1FileAnalysisMs'] / df['totalFiles']).median()
    print(f"Phase 1: {phase1_per_file:.6f} ms per file")
    
    # Phase 2: Hash Processing per duplicate candidate  
    valid_phase2 = df[df['duplicateCandidateCount'] > 0]
    phase2_per_candidate = (valid_phase2['phase2HashProcessingMs'] / valid_phase2['duplicateCandidateCount']).median()
    print(f"Phase 2: {phase2_per_candidate:.6f} ms per duplicate candidate")
    
    # Phase 3: UI Rendering per file
    phase3_per_file = (df['phase3UIRenderingMs'] / df['totalFiles']).median()
    print(f"Phase 3: {phase3_per_file:.6f} ms per file")
    print()
    
    # Test the formula
    print("FORMULA TESTING:")
    print("-" * 30)
    print("Run# | Files | DupCand | Actual | Predicted | Error | Accuracy")
    print("-" * 64)
    
    accuracies = []
    errors = []
    
    for _, row in df.iterrows():
        # Apply the formula
        phase1_pred = row['totalFiles'] * phase1_per_file
        phase2_pred = row['duplicateCandidateCount'] * phase2_per_candidate  
        phase3_pred = row['totalFiles'] * phase3_per_file
        total_pred = phase1_pred + phase2_pred + phase3_pred
        
        # Calculate accuracy
        actual = row['totalDurationMs']
        error = actual - total_pred
        accuracy = 100 - (abs(error) / actual * 100)
        
        accuracies.append(accuracy)
        errors.append(abs(error))
        
        # Print row
        run_num = int(row['Test Run #'])
        files = int(row['totalFiles'])
        dup_candidates = int(row['duplicateCandidateCount'])
        
        print(f"{run_num:4d} | {files:5d} | {dup_candidates:7d} | {actual:6.0f} | {total_pred:9.0f} | {error:+5.0f} | {accuracy:6.1f}%")
    
    print()
    print("SUMMARY STATISTICS:")
    print("-" * 30)
    print(f"Mean Accuracy:    {np.mean(accuracies):.1f}%")
    print(f"Median Accuracy:  {np.median(accuracies):.1f}%")
    print(f"Best Accuracy:    {np.max(accuracies):.1f}%") 
    print(f"Worst Accuracy:   {np.min(accuracies):.1f}%")
    print(f"Mean Abs Error:   {np.mean(errors):.0f} ms")
    print(f"Median Abs Error: {np.median(errors):.0f} ms")
    
    print()
    print("=" * 80)
    print("IMPLEMENTATION CONSTANTS FOR fileAnalysis.js")
    print("=" * 80)
    print()
    print("Replace the current constants with these calibrated values:")
    print()
    print(f"const PHASE1_FILE_TIME_MS = {phase1_per_file:.6f}  // File analysis per file")
    print(f"const PHASE2_CANDIDATE_TIME_MS = {phase2_per_candidate:.6f}  // Hash processing per duplicate candidate")
    print(f"const PHASE3_FILE_TIME_MS = {phase3_per_file:.6f}  // UI rendering per file")
    print()
    print("Formula:")
    print("const phase1Time = files.length * PHASE1_FILE_TIME_MS")
    print("const phase2Time = duplicateCandidates.length * PHASE2_CANDIDATE_TIME_MS")
    print("const phase3Time = files.length * PHASE3_FILE_TIME_MS")
    print("const totalEstimatedTime = phase1Time + phase2Time + phase3Time")

if __name__ == "__main__":
    main()