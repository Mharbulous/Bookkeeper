#!/usr/bin/env python3
"""
Validation script for the updated calibrated formula
Tests the new simplified 3-phase constants
"""

import pandas as pd
import numpy as np

def load_and_merge_data():
    """Load folder analysis and timing data, merge them"""
    folder_data = pd.read_csv('4_FolderAnalysisData.csv')
    timing_data = pd.read_csv('4_TestSpeedData.csv')
    
    # Merge on Test Run #
    merged = pd.merge(folder_data, timing_data, left_on='TestRun#', right_on='Test Run #')
    return merged

def calculate_new_predictions(df):
    """Calculate predicted times using the new calibrated constants"""
    # New calibrated constants from fileAnalysis.js
    PHASE1_FILE_TIME_MS = 0.010
    PHASE2_CANDIDATE_TIME_MS = 4.843
    PHASE3_FILE_TIME_MS = 4.186
    
    predictions = []
    
    for _, row in df.iterrows():
        total_files = row['totalFiles']
        duplicate_candidates = row['duplicateCandidateCount']
        
        # New simplified 3-phase calculation
        phase1_pred = total_files * PHASE1_FILE_TIME_MS
        phase2_pred = duplicate_candidates * PHASE2_CANDIDATE_TIME_MS
        phase3_pred = total_files * PHASE3_FILE_TIME_MS
        
        total_pred = phase1_pred + phase2_pred + phase3_pred
        
        predictions.append({
            'predicted_total': total_pred,
            'predicted_phase1': phase1_pred,
            'predicted_phase2': phase2_pred,
            'predicted_phase3': phase3_pred
        })
    
    return pd.DataFrame(predictions)

def analyze_accuracy(df, predictions):
    """Analyze prediction accuracy"""
    df = df.copy()
    
    # Add predictions to dataframe
    for col in predictions.columns:
        df[col] = predictions[col]
    
    # Calculate accuracy metrics
    df['total_error_ms'] = df['totalDurationMs'] - df['predicted_total']
    df['total_error_percent'] = (df['total_error_ms'] / df['totalDurationMs']) * 100
    df['total_accuracy_percent'] = 100 - abs(df['total_error_percent'])
    
    return df

def print_analysis_results(df):
    """Print comprehensive analysis results"""
    print("=" * 80)
    print("NEW CALIBRATED FORMULA VALIDATION")
    print("=" * 80)
    print()
    
    # Filter to worker mode only (more consistent timing)
    worker_df = df[df['isWorkerMode'] == True].copy()
    print(f"Analysis based on {len(worker_df)} worker mode tests (more accurate timing)")
    print()
    
    # Overall accuracy
    print("OVERALL PREDICTION ACCURACY:")
    print("-" * 40)
    mean_accuracy = worker_df['total_accuracy_percent'].mean()
    median_accuracy = worker_df['total_accuracy_percent'].median()
    min_accuracy = worker_df['total_accuracy_percent'].min()
    max_accuracy = worker_df['total_accuracy_percent'].max()
    
    print(f"Mean Accuracy:    {mean_accuracy:.1f}%")
    print(f"Median Accuracy:  {median_accuracy:.1f}%")
    print(f"Range:            {min_accuracy:.1f}% - {max_accuracy:.1f}%")
    print()
    
    # Error analysis
    print("ERROR ANALYSIS:")
    print("-" * 40)
    mean_error = worker_df['total_error_ms'].mean()
    mean_abs_error = abs(worker_df['total_error_ms']).mean()
    median_error = worker_df['total_error_ms'].median()
    
    print(f"Mean Error:           {mean_error:+.0f} ms")
    print(f"Mean Absolute Error:  {mean_abs_error:.0f} ms")
    print(f"Median Error:         {median_error:+.0f} ms")
    print()
    
    # Detailed test results
    print("DETAILED TEST RESULTS:")
    print("-" * 40)
    print("Run# | Files | DupCand | Actual | Predicted | Error | Accuracy")
    print("-" * 64)
    
    for _, row in worker_df.iterrows():
        run_num = int(row['Test Run #'])
        files = int(row['totalFiles'])
        dup_candidates = int(row['duplicateCandidateCount'])
        actual = int(row['totalDurationMs'])
        predicted = int(row['predicted_total'])
        error = int(row['total_error_ms'])
        accuracy = row['total_accuracy_percent']
        
        print(f"{run_num:4d} | {files:5d} | {dup_candidates:7d} | {actual:6d} | {predicted:9d} | {error:+5d} | {accuracy:6.1f}%")
    
    print()
    
    # Formula performance insights
    print("FORMULA PERFORMANCE INSIGHTS:")
    print("-" * 40)
    
    # Check if predictions tend to over or under-estimate
    over_estimates = len(worker_df[worker_df['total_error_ms'] < 0])
    under_estimates = len(worker_df[worker_df['total_error_ms'] > 0])
    
    print(f"Over-estimates: {over_estimates}/{len(worker_df)} tests")
    print(f"Under-estimates: {under_estimates}/{len(worker_df)} tests")
    
    # Correlation analysis
    correlation_actual_predicted = worker_df['totalDurationMs'].corr(worker_df['predicted_total'])
    print(f"Correlation (actual vs predicted): {correlation_actual_predicted:.3f}")
    
    # Best and worst predictions
    best_idx = worker_df['total_accuracy_percent'].idxmax()
    worst_idx = worker_df['total_accuracy_percent'].idxmin()
    
    print(f"\nBest prediction:  Test #{int(worker_df.loc[best_idx, 'Test Run #'])}, {worker_df.loc[best_idx, 'total_accuracy_percent']:.1f}% accuracy")
    print(f"Worst prediction: Test #{int(worker_df.loc[worst_idx, 'Test Run #'])}, {worker_df.loc[worst_idx, 'total_accuracy_percent']:.1f}% accuracy")
    
    # Improvement comparison
    print(f"\nIMPROVEMENT SUMMARY:")
    print(f"Previous accuracy: ~25% mean")
    print(f"New accuracy:     {mean_accuracy:.1f}% mean")
    print(f"Improvement:      {mean_accuracy - 25:.1f} percentage points")

def main():
    # Load and process data
    df = load_and_merge_data()
    predictions = calculate_new_predictions(df)
    analysis_df = analyze_accuracy(df, predictions)
    
    # Print results
    print_analysis_results(analysis_df)
    
    # Save detailed results
    analysis_df.to_csv('4_NewFormulaValidation.csv', index=False)
    print(f"\nDetailed validation results saved to: 4_NewFormulaValidation.csv")

if __name__ == "__main__":
    main()