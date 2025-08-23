#!/usr/bin/env python3
"""
Size-aware calibration using actual file size data from uniqueFilesSizeMB
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

def load_data():
    """Load and prepare timing data with file sizes"""
    folder_data = pd.read_csv('4_FolderAnalysisData.csv')
    timing_data = pd.read_csv('4_TestSpeedData.csv')
    
    # Merge and filter worker mode only
    merged = pd.merge(folder_data, timing_data, left_on='TestRun#', right_on='Test Run #')
    worker_df = merged[merged['isWorkerMode'] == True].copy()
    
    return worker_df

def analyze_size_relationships(df):
    """Analyze how file sizes correlate with processing times"""
    
    print("=" * 80)
    print("SIZE-AWARE ANALYSIS")
    print("=" * 80)
    print()
    
    # Show the actual size data we have
    print("AVAILABLE FILE SIZE DATA:")
    print("-" * 40)
    print("Run# | Files | DupCand | UniqueSizeMB | Total Duration")
    print("-" * 56)
    
    for _, row in df.iterrows():
        run_num = int(row['Test Run #'])
        files = int(row['totalFiles'])
        dup_candidates = int(row['duplicateCandidateCount'])
        unique_size = row['uniqueFilesSizeMB']
        duration = int(row['totalDurationMs'])
        
        print(f"{run_num:4d} | {files:5d} | {dup_candidates:7d} | {unique_size:12.1f} | {duration:14d}")
    
    print()
    
    # Since duplicateCandidatesSizeMB is 0, let's assume total processing involves:
    # 1. All files need basic processing (file count based)
    # 2. Duplicate candidates need hash processing (candidate count based)  
    # 3. File sizes might affect I/O overhead
    
    print("SIZE CORRELATION ANALYSIS:")
    print("-" * 40)
    
    # Correlation between size and total processing time
    size_time_corr = df['uniqueFilesSizeMB'].corr(df['totalDurationMs'])
    print(f"Correlation (uniqueFilesSizeMB vs totalDurationMs): {size_time_corr:.3f}")
    
    # Correlation between file count and processing time
    count_time_corr = df['totalFiles'].corr(df['totalDurationMs'])
    print(f"Correlation (totalFiles vs totalDurationMs): {count_time_corr:.3f}")
    
    # Correlation between duplicate candidates and processing time
    dup_time_corr = df['duplicateCandidateCount'].corr(df['totalDurationMs'])
    print(f"Correlation (duplicateCandidateCount vs totalDurationMs): {dup_time_corr:.3f}")

def calibrate_mixed_model(df):
    """Calibrate a mixed model: file count + size + duplicate processing"""
    
    print("\n" + "=" * 80)
    print("MIXED MODEL CALIBRATION")
    print("=" * 80)
    print()
    
    # Phase 1: File Analysis - should be mainly file count based
    print("PHASE 1 - FILE ANALYSIS:")
    print("-" * 40)
    
    # Try both file count and size-based models
    X_count = df[['totalFiles']].values
    X_size = df[['uniqueFilesSizeMB']].values  
    X_mixed = df[['totalFiles', 'uniqueFilesSizeMB']].values
    y = df['phase1FileAnalysisMs'].values
    
    models = {}
    
    # File count model
    model_count = LinearRegression(fit_intercept=True)
    model_count.fit(X_count, y)
    r2_count = r2_score(y, model_count.predict(X_count))
    models['count'] = (model_count, r2_count)
    
    # Size model
    model_size = LinearRegression(fit_intercept=True)  
    model_size.fit(X_size, y)
    r2_size = r2_score(y, model_size.predict(X_size))
    models['size'] = (model_size, r2_size)
    
    # Mixed model
    model_mixed = LinearRegression(fit_intercept=True)
    model_mixed.fit(X_mixed, y)
    r2_mixed = r2_score(y, model_mixed.predict(X_mixed))
    models['mixed'] = (model_mixed, r2_mixed)
    
    print(f"File count model: R² = {r2_count:.3f}")
    print(f"File size model:  R² = {r2_size:.3f}")
    print(f"Mixed model:      R² = {r2_mixed:.3f}")
    
    # Choose best model for Phase 1
    best_phase1 = max(models.items(), key=lambda x: x[1][1])
    print(f"Best Phase 1 model: {best_phase1[0]} (R² = {best_phase1[1][1]:.3f})")
    
    # Phase 2: Hash Processing
    print("\nPHASE 2 - HASH PROCESSING:")
    print("-" * 40)
    
    valid_df = df[df['duplicateCandidateCount'] > 0].copy()
    if len(valid_df) > 0:
        X2 = valid_df[['duplicateCandidateCount']].values
        y2 = valid_df['phase2HashProcessingMs'].values
        
        model_phase2 = LinearRegression(fit_intercept=True)
        model_phase2.fit(X2, y2)
        r2_phase2 = r2_score(y2, model_phase2.predict(X2))
        
        print(f"Duplicate candidate model: R² = {r2_phase2:.3f}")
        print(f"Formula: {model_phase2.intercept_:.2f} + {model_phase2.coef_[0]:.3f} * duplicateCandidates")
    else:
        model_phase2 = None
        r2_phase2 = 0
    
    # Phase 3: UI Rendering
    print("\nPHASE 3 - UI RENDERING:")
    print("-" * 40)
    
    X3_count = df[['totalFiles']].values
    X3_size = df[['uniqueFilesSizeMB']].values
    X3_mixed = df[['totalFiles', 'uniqueFilesSizeMB']].values
    y3 = df['phase3UIRenderingMs'].values
    
    # Test different models for Phase 3
    model3_count = LinearRegression(fit_intercept=True)
    model3_count.fit(X3_count, y3)
    r2_3count = r2_score(y3, model3_count.predict(X3_count))
    
    model3_size = LinearRegression(fit_intercept=True)
    model3_size.fit(X3_size, y3)
    r2_3size = r2_score(y3, model3_size.predict(X3_size))
    
    model3_mixed = LinearRegression(fit_intercept=True)
    model3_mixed.fit(X3_mixed, y3)
    r2_3mixed = r2_score(y3, model3_mixed.predict(X3_mixed))
    
    print(f"File count model: R² = {r2_3count:.3f}")
    print(f"File size model:  R² = {r2_3size:.3f}") 
    print(f"Mixed model:      R² = {r2_3mixed:.3f}")
    
    best_phase3_info = max([('count', r2_3count), ('size', r2_3size), ('mixed', r2_3mixed)], key=lambda x: x[1])
    print(f"Best Phase 3 model: {best_phase3_info[0]} (R² = {best_phase3_info[1]:.3f})")
    
    return {
        'phase1': best_phase1,
        'phase2': (model_phase2, r2_phase2) if model_phase2 else None,
        'phase3_best': best_phase3_info[0],
        'phase3_count': (model3_count, r2_3count),
        'phase3_size': (model3_size, r2_3size), 
        'phase3_mixed': (model3_mixed, r2_3mixed)
    }

def test_mixed_formula(df, models):
    """Test the mixed formula accuracy"""
    
    print("\n" + "=" * 80)
    print("MIXED FORMULA VALIDATION")
    print("=" * 80)
    
    predictions = []
    
    for _, row in df.iterrows():
        # Phase 1 - use best model
        if models['phase1'][0] == 'count':
            phase1_pred = models['phase1'][1][0].intercept_ + models['phase1'][1][0].coef_[0] * row['totalFiles']
        elif models['phase1'][0] == 'size':
            phase1_pred = models['phase1'][1][0].intercept_ + models['phase1'][1][0].coef_[0] * row['uniqueFilesSizeMB']
        else:  # mixed
            phase1_pred = (models['phase1'][1][0].intercept_ + 
                          models['phase1'][1][0].coef_[0] * row['totalFiles'] + 
                          models['phase1'][1][0].coef_[1] * row['uniqueFilesSizeMB'])
        
        # Phase 2 - duplicate candidates
        if models['phase2'] and models['phase2'][0]:
            phase2_pred = (models['phase2'][0].intercept_ + 
                          models['phase2'][0].coef_[0] * row['duplicateCandidateCount'])
        else:
            phase2_pred = row['duplicateCandidateCount'] * 4.843  # fallback
            
        # Phase 3 - use best model  
        if models['phase3_best'] == 'count':
            model = models['phase3_count'][0]
            phase3_pred = model.intercept_ + model.coef_[0] * row['totalFiles']
        elif models['phase3_best'] == 'size':
            model = models['phase3_size'][0]
            phase3_pred = model.intercept_ + model.coef_[0] * row['uniqueFilesSizeMB']
        else:  # mixed
            model = models['phase3_mixed'][0] 
            phase3_pred = (model.intercept_ + 
                          model.coef_[0] * row['totalFiles'] +
                          model.coef_[1] * row['uniqueFilesSizeMB'])
        
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
    
    print(f"\nMIXED MODEL ACCURACY:")
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

def main():
    df = load_data()
    print(f"Processing {len(df)} worker mode test runs with size data\n")
    
    # Analyze size relationships
    analyze_size_relationships(df)
    
    # Calibrate mixed model
    models = calibrate_mixed_model(df)
    
    # Test mixed formula
    pred_df = test_mixed_formula(df, models)
    
    # Save results
    results = df.copy()
    for col in pred_df.columns:
        results[f'mixed_{col}'] = pred_df[col]
    
    results.to_csv('4_SizeAwareCalibratedResults.csv', index=False)
    print(f"\nResults saved to: 4_SizeAwareCalibratedResults.csv")

if __name__ == "__main__":
    main()