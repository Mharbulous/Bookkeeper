#!/usr/bin/env python3
"""
Calibration using verified, complete data
Works with available fields: totalFiles, duplicateCandidateCount, uniqueFilesSizeMB
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

def load_verified_data():
    """Load the verified data"""
    folder_data = pd.read_csv('4_FolderAnalysisData.csv')
    timing_data = pd.read_csv('4_TestSpeedData.csv')
    
    # Merge on Test Run #
    merged = pd.merge(folder_data, timing_data, left_on='TestRun#', right_on='Test Run #')
    # Filter worker mode only for consistent timing
    worker_df = merged[merged['isWorkerMode'] == True].copy()
    
    return worker_df

def analyze_verified_relationships(df):
    """Analyze relationships using verified data"""
    
    print("=" * 80)
    print("VERIFIED DATA ANALYSIS")
    print("=" * 80)
    print()
    
    print("DATA SUMMARY:")
    print("-" * 40)
    print(f"Test runs: {len(df)}")
    print(f"File count range: {df['totalFiles'].min()} - {df['totalFiles'].max()}")
    print(f"Unique files size range: {df['uniqueFilesSizeMB'].min():.1f} - {df['uniqueFilesSizeMB'].max():.1f} MB")
    print(f"Duplicate candidates range: {df['duplicateCandidateCount'].min()} - {df['duplicateCandidateCount'].max()}")
    print()
    
    print("VERIFIED CORRELATION ANALYSIS:")
    print("-" * 40)
    correlations = {
        'totalFiles vs totalDuration': df['totalFiles'].corr(df['totalDurationMs']),
        'uniqueFilesSizeMB vs totalDuration': df['uniqueFilesSizeMB'].corr(df['totalDurationMs']),
        'duplicateCandidateCount vs totalDuration': df['duplicateCandidateCount'].corr(df['totalDurationMs']),
        'totalFiles vs phase1': df['totalFiles'].corr(df['phase1FileAnalysisMs']),
        'totalFiles vs phase3': df['totalFiles'].corr(df['phase3UIRenderingMs']),
        'duplicateCandidateCount vs phase2': df['duplicateCandidateCount'].corr(df['phase2HashProcessingMs'])
    }
    
    for relationship, correlation in correlations.items():
        print(f"  {relationship:<35}: {correlation:6.3f}")
    
    print()
    
    return correlations

def calibrate_with_verified_data(df):
    """Calibrate using multiple model approaches with verified data"""
    
    print("PHASE-BY-PHASE CALIBRATION:")
    print("=" * 40)
    print()
    
    # Phase 1: File Analysis - test different predictors
    print("PHASE 1 - FILE ANALYSIS:")
    print("-" * 30)
    
    # Try file count only
    X1_count = df[['totalFiles']].values
    y1 = df['phase1FileAnalysisMs'].values
    
    model1_count = LinearRegression(fit_intercept=True)
    model1_count.fit(X1_count, y1)
    r2_1count = r2_score(y1, model1_count.predict(X1_count))
    
    # Try size only  
    X1_size = df[['uniqueFilesSizeMB']].values
    model1_size = LinearRegression(fit_intercept=True)
    model1_size.fit(X1_size, y1)
    r2_1size = r2_score(y1, model1_size.predict(X1_size))
    
    # Try combined
    X1_combined = df[['totalFiles', 'uniqueFilesSizeMB']].values
    model1_combined = LinearRegression(fit_intercept=True)
    model1_combined.fit(X1_combined, y1)
    r2_1combined = r2_score(y1, model1_combined.predict(X1_combined))
    
    print(f"  File count only:  R² = {r2_1count:.3f}, Formula: {model1_count.intercept_:.2f} + {model1_count.coef_[0]:.4f} * files")
    print(f"  File size only:   R² = {r2_1size:.3f}, Formula: {model1_size.intercept_:.2f} + {model1_size.coef_[0]:.4f} * sizeMB")  
    print(f"  Combined model:   R² = {r2_1combined:.3f}")
    
    best_phase1 = max([('count', model1_count, r2_1count), ('size', model1_size, r2_1size), ('combined', model1_combined, r2_1combined)], key=lambda x: x[2])
    print(f"  Best: {best_phase1[0]} model (R² = {best_phase1[2]:.3f})")
    print()
    
    # Phase 2: Hash Processing 
    print("PHASE 2 - HASH PROCESSING:")
    print("-" * 30)
    
    # Only use rows with duplicate candidates > 0
    valid_df = df[df['duplicateCandidateCount'] > 0].copy()
    
    if len(valid_df) > 0:
        X2 = valid_df[['duplicateCandidateCount']].values
        y2 = valid_df['phase2HashProcessingMs'].values
        
        model2 = LinearRegression(fit_intercept=True)
        model2.fit(X2, y2)
        r2_2 = r2_score(y2, model2.predict(X2))
        
        print(f"  Duplicate candidates: R² = {r2_2:.3f}, Formula: {model2.intercept_:.2f} + {model2.coef_[0]:.4f} * candidates")
    else:
        model2 = None
        r2_2 = 0
        print("  No duplicate candidate data available")
    print()
    
    # Phase 3: UI Rendering
    print("PHASE 3 - UI RENDERING:")
    print("-" * 30)
    
    # Try file count only
    X3_count = df[['totalFiles']].values  
    y3 = df['phase3UIRenderingMs'].values
    
    model3_count = LinearRegression(fit_intercept=True)
    model3_count.fit(X3_count, y3)
    r2_3count = r2_score(y3, model3_count.predict(X3_count))
    
    # Try size only
    X3_size = df[['uniqueFilesSizeMB']].values
    model3_size = LinearRegression(fit_intercept=True) 
    model3_size.fit(X3_size, y3)
    r2_3size = r2_score(y3, model3_size.predict(X3_size))
    
    # Try combined
    X3_combined = df[['totalFiles', 'uniqueFilesSizeMB']].values
    model3_combined = LinearRegression(fit_intercept=True)
    model3_combined.fit(X3_combined, y3)
    r2_3combined = r2_score(y3, model3_combined.predict(X3_combined))
    
    print(f"  File count only:  R² = {r2_3count:.3f}, Formula: {model3_count.intercept_:.2f} + {model3_count.coef_[0]:.4f} * files")
    print(f"  File size only:   R² = {r2_3size:.3f}, Formula: {model3_size.intercept_:.2f} + {model3_size.coef_[0]:.4f} * sizeMB")
    print(f"  Combined model:   R² = {r2_3combined:.3f}")
    
    best_phase3 = max([('count', model3_count, r2_3count), ('size', model3_size, r2_3size), ('combined', model3_combined, r2_3combined)], key=lambda x: x[2])
    print(f"  Best: {best_phase3[0]} model (R² = {best_phase3[2]:.3f})")
    print()
    
    return {
        'phase1': best_phase1,
        'phase2': (model2, r2_2) if model2 else None,
        'phase3': best_phase3
    }

def test_calibrated_models(df, models):
    """Test the accuracy of calibrated models"""
    
    print("MODEL VALIDATION:")
    print("=" * 40)
    print()
    
    predictions = []
    
    for _, row in df.iterrows():
        # Phase 1 prediction
        if models['phase1'][0] == 'count':
            phase1_pred = models['phase1'][1].intercept_ + models['phase1'][1].coef_[0] * row['totalFiles']
        elif models['phase1'][0] == 'size':
            phase1_pred = models['phase1'][1].intercept_ + models['phase1'][1].coef_[0] * row['uniqueFilesSizeMB']
        else:  # combined
            phase1_pred = (models['phase1'][1].intercept_ + 
                          models['phase1'][1].coef_[0] * row['totalFiles'] +
                          models['phase1'][1].coef_[1] * row['uniqueFilesSizeMB'])
        
        # Phase 2 prediction
        if models['phase2'] and models['phase2'][0]:
            phase2_pred = models['phase2'][0].intercept_ + models['phase2'][0].coef_[0] * row['duplicateCandidateCount']
        else:
            phase2_pred = row['duplicateCandidateCount'] * 5.0  # fallback constant
        
        # Phase 3 prediction  
        if models['phase3'][0] == 'count':
            phase3_pred = models['phase3'][1].intercept_ + models['phase3'][1].coef_[0] * row['totalFiles']
        elif models['phase3'][0] == 'size':
            phase3_pred = models['phase3'][1].intercept_ + models['phase3'][1].coef_[0] * row['uniqueFilesSizeMB']
        else:  # combined
            phase3_pred = (models['phase3'][1].intercept_ + 
                          models['phase3'][1].coef_[0] * row['totalFiles'] +
                          models['phase3'][1].coef_[1] * row['uniqueFilesSizeMB'])
        
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
    
    print(f"ACCURACY RESULTS:")
    print(f"  Mean Accuracy:     {accuracy_percent.mean():.1f}%")
    print(f"  Median Accuracy:   {accuracy_percent.median():.1f}%")
    print(f"  Range:             {accuracy_percent.min():.1f}% - {accuracy_percent.max():.1f}%")
    print(f"  Mean Abs Error:    {absolute_errors.mean():.0f} ms")
    print(f"  Median Abs Error:  {absolute_errors.median():.0f} ms")
    print()
    
    print("DETAILED RESULTS:")
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
    
    return pred_df, models

def generate_implementation_constants(models):
    """Generate constants for implementation"""
    
    print("\n" + "=" * 80)
    print("IMPLEMENTATION CONSTANTS")
    print("=" * 80)
    print()
    
    # Phase 1
    phase1_model = models['phase1'][1]
    if models['phase1'][0] == 'count':
        print("// Phase 1: File Analysis (file count based)")
        print(f"const PHASE1_BASE_TIME_MS = {phase1_model.intercept_:.3f}")
        print(f"const PHASE1_FILE_TIME_MS = {phase1_model.coef_[0]:.6f}")
        print(f"// Formula: phase1Time = {phase1_model.intercept_:.3f} + files.length * {phase1_model.coef_[0]:.6f}")
    elif models['phase1'][0] == 'size':
        print("// Phase 1: File Analysis (file size based)")  
        print(f"const PHASE1_BASE_TIME_MS = {phase1_model.intercept_:.3f}")
        print(f"const PHASE1_SIZE_TIME_MS = {phase1_model.coef_[0]:.6f}")
        print(f"// Formula: phase1Time = {phase1_model.intercept_:.3f} + uniqueFilesSizeMB * {phase1_model.coef_[0]:.6f}")
    else:
        print("// Phase 1: File Analysis (combined model)")
        print(f"const PHASE1_BASE_TIME_MS = {phase1_model.intercept_:.3f}")
        print(f"const PHASE1_FILE_TIME_MS = {phase1_model.coef_[0]:.6f}")
        print(f"const PHASE1_SIZE_TIME_MS = {phase1_model.coef_[1]:.6f}")
    print()
    
    # Phase 2
    if models['phase2'] and models['phase2'][0]:
        phase2_model = models['phase2'][0]
        print("// Phase 2: Hash Processing (duplicate candidates)")
        print(f"const PHASE2_BASE_TIME_MS = {phase2_model.intercept_:.3f}")
        print(f"const PHASE2_CANDIDATE_TIME_MS = {phase2_model.coef_[0]:.6f}")
        print(f"// Formula: phase2Time = {phase2_model.intercept_:.3f} + duplicateCandidates.length * {phase2_model.coef_[0]:.6f}")
    else:
        print("// Phase 2: Hash Processing (fallback)")
        print("const PHASE2_CANDIDATE_TIME_MS = 5.0  // fallback constant")
    print()
    
    # Phase 3
    phase3_model = models['phase3'][1]
    if models['phase3'][0] == 'count':
        print("// Phase 3: UI Rendering (file count based)")
        print(f"const PHASE3_BASE_TIME_MS = {phase3_model.intercept_:.3f}")
        print(f"const PHASE3_FILE_TIME_MS = {phase3_model.coef_[0]:.6f}")
        print(f"// Formula: phase3Time = {phase3_model.intercept_:.3f} + files.length * {phase3_model.coef_[0]:.6f}")
    elif models['phase3'][0] == 'size':
        print("// Phase 3: UI Rendering (file size based)")
        print(f"const PHASE3_BASE_TIME_MS = {phase3_model.intercept_:.3f}")
        print(f"const PHASE3_SIZE_TIME_MS = {phase3_model.coef_[0]:.6f}")
        print(f"// Formula: phase3Time = {phase3_model.intercept_:.3f} + uniqueFilesSizeMB * {phase3_model.coef_[0]:.6f}")
    else:
        print("// Phase 3: UI Rendering (combined model)")
        print(f"const PHASE3_BASE_TIME_MS = {phase3_model.intercept_:.3f}")
        print(f"const PHASE3_FILE_TIME_MS = {phase3_model.coef_[0]:.6f}")
        print(f"const PHASE3_SIZE_TIME_MS = {phase3_model.coef_[1]:.6f}")

def main():
    df = load_verified_data()
    print(f"Loaded {len(df)} verified test runs")
    print()
    
    # Analyze relationships with verified data
    correlations = analyze_verified_relationships(df)
    
    # Calibrate models
    models = calibrate_with_verified_data(df)
    
    # Test accuracy
    pred_df, final_models = test_calibrated_models(df, models)
    
    # Generate implementation constants
    generate_implementation_constants(final_models)
    
    # Save results
    results = df.copy()
    for col in pred_df.columns:
        results[f'verified_{col}'] = pred_df[col]
    
    results.to_csv('4_VerifiedCalibratedResults.csv', index=False)
    print(f"\nResults saved to: 4_VerifiedCalibratedResults.csv")

if __name__ == "__main__":
    main()