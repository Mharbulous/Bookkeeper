#!/usr/bin/env python3
"""
Analyze 3-Stage Performance Data
Validates the new 3-stage measurement approach and shows key insights.
Usage: python analyze_3stage_data.py
"""

import pandas as pd
import numpy as np

def load_data():
    """Load the folder analysis and timing data"""
    folder_data = pd.read_csv('3_FolderAnalysisData.csv')
    timing_data = pd.read_csv('3_TestSpeedData.csv')
    
    # Merge on test run number
    merged_data = pd.merge(
        timing_data, 
        folder_data, 
        left_on='Test Run #', 
        right_on='TestRun#', 
        how='inner'
    )
    
    return merged_data

def analyze_3stage_data(data):
    """Analyze the 3-stage performance data"""
    print("=== 3-Stage Performance Analysis ===\n")
    
    print(f"Total Test Runs: {len(data)}")
    print(f"Worker Mode Runs: {data['isWorkerMode'].sum()}")
    print(f"Main Thread Runs: {len(data) - data['isWorkerMode'].sum()}")
    
    # Filter out rows with missing phase data
    complete_data = data.dropna(subset=['phase1FileAnalysisMs', 'phase2HashProcessingMs', 'phase3UIRenderingMs'])
    print(f"Complete 3-Stage Data: {len(complete_data)} runs\n")
    
    if len(complete_data) == 0:
        print("No complete 3-stage data available for analysis")
        return
    
    print("=== Phase Distribution Analysis ===")
    
    for _, row in complete_data.iterrows():
        run_num = row['Test Run #']
        total = row['totalDurationMs']
        p1 = row['phase1FileAnalysisMs'] 
        p2 = row['phase2HashProcessingMs']
        p3 = row['phase3UIRenderingMs']
        files = row['totalFiles']
        worker_mode = "Worker" if row['isWorkerMode'] else "Main"
        
        p1_pct = (p1 / total * 100) if total > 0 else 0
        p2_pct = (p2 / total * 100) if total > 0 else 0  
        p3_pct = (p3 / total * 100) if total > 0 else 0
        
        print(f"Run {int(run_num):2d} ({worker_mode}): {int(files):4d} files, {int(total):5d}ms total")
        print(f"  Phase 1 (File Analysis):  {int(p1):4d}ms ({p1_pct:4.1f}%)")
        print(f"  Phase 2 (Hash Processing): {int(p2):4d}ms ({p2_pct:4.1f}%)")  
        print(f"  Phase 3 (UI Rendering):    {int(p3):4d}ms ({p3_pct:4.1f}%)")
        print()
    
    print("=== Performance Predictors Analysis ===")
    
    # Phase 1 correlation with totalFiles
    phase1_data = data.dropna(subset=['phase1FileAnalysisMs'])
    if len(phase1_data) > 1:
        p1_corr = np.corrcoef(phase1_data['totalFiles'], phase1_data['phase1FileAnalysisMs'])[0,1]
        print(f"Phase 1 vs totalFiles correlation: {p1_corr:.3f}")
    
    # Phase 2 correlation with uniqueFilesTotal  
    phase2_data = data.dropna(subset=['phase2HashProcessingMs'])
    if len(phase2_data) > 1:
        p2_corr = np.corrcoef(phase2_data['uniqueFilesTotal'], phase2_data['phase2HashProcessingMs'])[0,1]
        print(f"Phase 2 vs uniqueFilesTotal correlation: {p2_corr:.3f}")
    
    # Phase 3 correlation with uniqueFilesTotal
    phase3_data = data.dropna(subset=['phase3UIRenderingMs'])
    if len(phase3_data) > 1:
        p3_corr = np.corrcoef(phase3_data['uniqueFilesTotal'], phase3_data['phase3UIRenderingMs'])[0,1]
        print(f"Phase 3 vs uniqueFilesTotal correlation: {p3_corr:.3f}")
    
    print("\n=== Prediction Model Coefficients (based on complete data) ===")
    
    if len(complete_data) >= 2:
        # Simple linear relationships
        p1_per_file = complete_data['phase1FileAnalysisMs'].sum() / complete_data['totalFiles'].sum()
        p2_per_file = complete_data['phase2HashProcessingMs'].sum() / complete_data['uniqueFilesTotal'].sum()
        p3_per_file = complete_data['phase3UIRenderingMs'].sum() / complete_data['uniqueFilesTotal'].sum()
        
        print(f"Phase 1: ~{p1_per_file:.3f}ms per total file")
        print(f"Phase 2: ~{p2_per_file:.3f}ms per unique file") 
        print(f"Phase 3: ~{p3_per_file:.3f}ms per unique file")
        
        print(f"\nRecommended Prediction Formula:")
        print(f"  phase1_time = totalFiles * {p1_per_file:.3f}")
        print(f"  phase2_time = uniqueFilesTotal * {p2_per_file:.3f}")
        print(f"  phase3_time = uniqueFilesTotal * {p3_per_file:.3f}")
        print(f"  total_time = phase1_time + phase2_time + phase3_time")

def main():
    try:
        data = load_data()
        analyze_3stage_data(data)
    except FileNotFoundError as e:
        print(f"Error: Could not find data files. Make sure you've run the parsing script first.")
        print(f"Details: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()