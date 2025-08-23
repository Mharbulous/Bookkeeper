#!/usr/bin/env python3
"""
Trial 5 Comprehensive Calibration
Uses complete data including folder structure metrics for optimal prediction accuracy
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

def load_complete_data():
    """Load the complete Trial 5 dataset"""
    df = pd.read_csv('5_CompleteAnalysisData.csv')
    
    # Filter out any incomplete records
    complete_df = df.dropna(subset=['totalDurationMs', 'totalSizeMB', 'avgDirectoryDepth'])
    
    print("=" * 80)
    print("TRIAL 5 COMPREHENSIVE CALIBRATION")
    print("=" * 80)
    print()
    print(f"Loaded: {len(df)} total records")
    print(f"Complete: {len(complete_df)} records with full data")
    print()
    
    return complete_df

def analyze_complete_correlations(df):
    """Analyze correlations with complete dataset including folder structure"""
    
    print("COMPREHENSIVE CORRELATION ANALYSIS:")
    print("-" * 50)
    
    # Key predictors for correlation analysis
    predictors = {
        'File Count': 'totalFiles',
        'Duplicate Candidates': 'duplicateCandidateCount', 
        'Total Size (MB)': 'totalSizeMB',
        'Duplicate Size (MB)': 'duplicateCandidatesSizeMB',
        'Avg Directory Depth': 'avgDirectoryDepth',
        'Directory Count': 'totalDirectoryCount',
        'Avg Filename Length': 'avgFilenameLength'
    }
    
    correlations = {}
    
    for name, field in predictors.items():
        if field in df.columns:
            corr = df[field].corr(df['totalDurationMs'])
            correlations[name] = corr
            print(f"  {name:<25}: {corr:6.3f}")
    
    print()
    
    # Phase-specific correlations
    print("PHASE-SPECIFIC CORRELATIONS:")
    print("-" * 50)
    
    phases = {
        'Phase 1 (File Analysis)': 'phase1FileAnalysisMs',
        'Phase 2 (Hash Processing)': 'phase2HashProcessingMs', 
        'Phase 3 (UI Rendering)': 'phase3UIRenderingMs'
    }
    
    phase_correlations = {}
    for phase_name, phase_field in phases.items():
        if phase_field in df.columns:
            print(f"\n{phase_name}:")
            phase_corrs = {}
            for pred_name, pred_field in predictors.items():
                if pred_field in df.columns:
                    corr = df[pred_field].corr(df[phase_field])
                    phase_corrs[pred_name] = corr
                    print(f"  {pred_name:<25}: {corr:6.3f}")
            phase_correlations[phase_name] = phase_corrs
    
    return correlations, phase_correlations

def calibrate_multi_factor_models(df):
    """Calibrate models using multiple factors including folder structure"""
    
    print("\n" + "=" * 80)
    print("MULTI-FACTOR MODEL CALIBRATION")
    print("=" * 80)
    print()
    
    models = {}
    
    # Phase 1: File Analysis Models
    print("PHASE 1 - FILE ANALYSIS MODELS:")
    print("-" * 40)
    
    # Model 1a: File count only
    X1a = df[['totalFiles']].values
    y1 = df['phase1FileAnalysisMs'].values
    model1a = LinearRegression().fit(X1a, y1)
    r2_1a = r2_score(y1, model1a.predict(X1a))
    
    # Model 1b: File count + directory metrics
    X1b = df[['totalFiles', 'avgDirectoryDepth', 'totalDirectoryCount']].values
    model1b = LinearRegression().fit(X1b, y1)
    r2_1b = r2_score(y1, model1b.predict(X1b))
    
    print(f"  File count only:           R² = {r2_1a:.3f}")
    print(f"  + Directory structure:     R² = {r2_1b:.3f}")
    
    # Choose best Phase 1 model
    phase1_model = model1b if r2_1b > r2_1a else model1a
    phase1_features = 'multi' if r2_1b > r2_1a else 'simple'
    phase1_r2 = max(r2_1a, r2_1b)
    models['phase1'] = (phase1_model, phase1_features, phase1_r2)
    
    print(f"  Best Phase 1 model:       {phase1_features} (R² = {phase1_r2:.3f})")
    
    # Phase 2: Hash Processing Models
    print(f"\nPHASE 2 - HASH PROCESSING MODELS:")
    print("-" * 40)
    
    # Model 2a: Duplicate candidate count only
    X2a = df[['duplicateCandidateCount']].values
    y2 = df['phase2HashProcessingMs'].values
    model2a = LinearRegression().fit(X2a, y2)
    r2_2a = r2_score(y2, model2a.predict(X2a))
    
    # Model 2b: Candidate count + duplicate size
    X2b = df[['duplicateCandidateCount', 'duplicateCandidatesSizeMB']].values
    model2b = LinearRegression().fit(X2b, y2)
    r2_2b = r2_score(y2, model2b.predict(X2b))
    
    # Model 2c: Full model (candidates + size + directory complexity)
    X2c = df[['duplicateCandidateCount', 'duplicateCandidatesSizeMB', 'avgDirectoryDepth']].values
    model2c = LinearRegression().fit(X2c, y2)
    r2_2c = r2_score(y2, model2c.predict(X2c))
    
    print(f"  Candidate count only:      R² = {r2_2a:.3f}")
    print(f"  + Duplicate size:          R² = {r2_2b:.3f}")
    print(f"  + Directory complexity:    R² = {r2_2c:.3f}")
    
    # Choose best Phase 2 model
    best_2 = max([(r2_2a, model2a, 'simple'), (r2_2b, model2b, 'size'), (r2_2c, model2c, 'full')])
    phase2_r2, phase2_model, phase2_features = best_2
    models['phase2'] = (phase2_model, phase2_features, phase2_r2)
    
    print(f"  Best Phase 2 model:       {phase2_features} (R² = {phase2_r2:.3f})")
    
    # Phase 3: UI Rendering Models
    print(f"\nPHASE 3 - UI RENDERING MODELS:")
    print("-" * 40)
    
    # Model 3a: File count only
    X3a = df[['totalFiles']].values
    y3 = df['phase3UIRenderingMs'].values
    model3a = LinearRegression().fit(X3a, y3)
    r2_3a = r2_score(y3, model3a.predict(X3a))
    
    # Model 3b: File count + directory structure
    X3b = df[['totalFiles', 'avgDirectoryDepth', 'totalDirectoryCount']].values
    model3b = LinearRegression().fit(X3b, y3)
    r2_3b = r2_score(y3, model3b.predict(X3b))
    
    # Model 3c: Full complexity model
    X3c = df[['totalFiles', 'avgDirectoryDepth', 'totalDirectoryCount', 'avgFilenameLength']].values
    model3c = LinearRegression().fit(X3c, y3)
    r2_3c = r2_score(y3, model3c.predict(X3c))
    
    print(f"  File count only:           R² = {r2_3a:.3f}")
    print(f"  + Directory structure:     R² = {r2_3b:.3f}")
    print(f"  + Filename complexity:     R² = {r2_3c:.3f}")
    
    # Choose best Phase 3 model
    best_3 = max([(r2_3a, model3a, 'simple'), (r2_3b, model3b, 'directory'), (r2_3c, model3c, 'full')])
    phase3_r2, phase3_model, phase3_features = best_3
    models['phase3'] = (phase3_model, phase3_features, phase3_r2)
    
    print(f"  Best Phase 3 model:       {phase3_features} (R² = {phase3_r2:.3f})")
    
    return models

def test_comprehensive_models(df, models):
    """Test comprehensive models and calculate accuracy"""
    
    print(f"\n" + "=" * 80)
    print("COMPREHENSIVE MODEL VALIDATION")
    print("=" * 80)
    print()
    
    predictions = []
    
    for _, row in df.iterrows():
        # Phase 1 prediction
        phase1_model, phase1_features, _ = models['phase1']
        if phase1_features == 'multi':
            phase1_pred = phase1_model.predict([[row['totalFiles'], row['avgDirectoryDepth'], row['totalDirectoryCount']]])[0]
        else:
            phase1_pred = phase1_model.predict([[row['totalFiles']]])[0]
        
        # Phase 2 prediction
        phase2_model, phase2_features, _ = models['phase2']
        if phase2_features == 'full':
            phase2_pred = phase2_model.predict([[row['duplicateCandidateCount'], row['duplicateCandidatesSizeMB'], row['avgDirectoryDepth']]])[0]
        elif phase2_features == 'size':
            phase2_pred = phase2_model.predict([[row['duplicateCandidateCount'], row['duplicateCandidatesSizeMB']]])[0]
        else:
            phase2_pred = phase2_model.predict([[row['duplicateCandidateCount']]])[0]
        
        # Phase 3 prediction  
        phase3_model, phase3_features, _ = models['phase3']
        if phase3_features == 'full':
            phase3_pred = phase3_model.predict([[row['totalFiles'], row['avgDirectoryDepth'], row['totalDirectoryCount'], row['avgFilenameLength']]])[0]
        elif phase3_features == 'directory':
            phase3_pred = phase3_model.predict([[row['totalFiles'], row['avgDirectoryDepth'], row['totalDirectoryCount']]])[0]
        else:
            phase3_pred = phase3_model.predict([[row['totalFiles']]])[0]
        
        total_pred = phase1_pred + phase2_pred + phase3_pred
        
        predictions.append({
            'predicted_total': total_pred,
            'predicted_phase1': phase1_pred,
            'predicted_phase2': phase2_pred,
            'predicted_phase3': phase3_pred
        })
    
    pred_df = pd.DataFrame(predictions)
    
    # Calculate accuracy
    actual_total = df['totalDurationMs'].values
    predicted_total = pred_df['predicted_total'].values
    
    absolute_errors = np.abs(actual_total - predicted_total)
    accuracy_percent = 100 - (absolute_errors / actual_total) * 100
    
    print("COMPREHENSIVE MODEL PERFORMANCE:")
    print("-" * 40)
    print(f"Mean Accuracy:     {accuracy_percent.mean():.1f}%")
    print(f"Median Accuracy:   {np.median(accuracy_percent):.1f}%")
    print(f"Best Accuracy:     {accuracy_percent.max():.1f}%")
    print(f"Worst Accuracy:    {accuracy_percent.min():.1f}%")
    print(f"Mean Abs Error:    {absolute_errors.mean():.0f} ms")
    print(f"Median Abs Error:  {np.median(absolute_errors):.0f} ms")
    
    print(f"\nDETAILED RESULTS:")
    print("Run# | Files | Depth | TotalMB | Actual | Predicted | Error | Accuracy")
    print("-" * 76)
    
    for i, (_, row) in enumerate(df.iterrows()):
        run_num = int(row['TestRun'])
        files = int(row['totalFiles'])
        depth = row['avgDirectoryDepth']
        size_mb = row['totalSizeMB']
        actual = int(row['totalDurationMs'])
        predicted = int(pred_df.iloc[i]['predicted_total'])
        error = actual - predicted
        accuracy = accuracy_percent[i]
        
        print(f"{run_num:4d} | {files:5d} | {depth:5.1f} | {size_mb:7.1f} | {actual:6d} | {predicted:9d} | {error:+5d} | {accuracy:6.1f}%")
    
    return pred_df, models

def generate_implementation_formula(df, models, pred_df):
    """Generate the final implementation formula with all optimizations"""
    
    print(f"\n" + "=" * 80)
    print("FINAL OPTIMIZED IMPLEMENTATION FORMULA")
    print("=" * 80)
    print()
    
    # Calculate improvement vs previous trials
    current_accuracy = (100 - (np.abs(df['totalDurationMs'].values - pred_df['predicted_total'].values) / df['totalDurationMs'].values) * 100).mean()
    
    print("PERFORMANCE COMPARISON:")
    print("-" * 30)
    print(f"Trial 4 (previous):  83.6% mean accuracy")
    print(f"Trial 5 (current):   {current_accuracy:.1f}% mean accuracy")
    print(f"Improvement:         {current_accuracy - 83.6:+.1f} percentage points")
    print()
    
    print("IMPLEMENTATION CONSTANTS:")
    print("-" * 30)
    print()
    
    # Extract model coefficients for implementation
    phase1_model, phase1_features, phase1_r2 = models['phase1']
    phase2_model, phase2_features, phase2_r2 = models['phase2']
    phase3_model, phase3_features, phase3_r2 = models['phase3']
    
    print("JavaScript implementation for fileAnalysis.js:")
    print("-" * 50)
    print()
    
    if phase1_features == 'multi':
        print(f"// Phase 1: File Analysis (Multi-factor: R² = {phase1_r2:.3f})")
        print(f"const PHASE1_BASE_MS = {phase1_model.intercept_:.3f}")
        print(f"const PHASE1_FILE_MS = {phase1_model.coef_[0]:.6f}")
        print(f"const PHASE1_DEPTH_MS = {phase1_model.coef_[1]:.6f}")
        print(f"const PHASE1_DIR_MS = {phase1_model.coef_[2]:.6f}")
        print(f"// phase1Time = {phase1_model.intercept_:.3f} + files*{phase1_model.coef_[0]:.6f} + depth*{phase1_model.coef_[1]:.6f} + dirs*{phase1_model.coef_[2]:.6f}")
    else:
        print(f"// Phase 1: File Analysis (Simple: R² = {phase1_r2:.3f})")
        print(f"const PHASE1_BASE_MS = {phase1_model.intercept_:.3f}")
        print(f"const PHASE1_FILE_MS = {phase1_model.coef_[0]:.6f}")
    
    print()
    
    if phase2_features == 'full':
        print(f"// Phase 2: Hash Processing (Full model: R² = {phase2_r2:.3f})")
        print(f"const PHASE2_BASE_MS = {phase2_model.intercept_:.3f}")
        print(f"const PHASE2_CANDIDATE_MS = {phase2_model.coef_[0]:.6f}")
        print(f"const PHASE2_SIZE_MS = {phase2_model.coef_[1]:.6f}")
        print(f"const PHASE2_DEPTH_MS = {phase2_model.coef_[2]:.6f}")
    elif phase2_features == 'size':
        print(f"// Phase 2: Hash Processing (Size-aware: R² = {phase2_r2:.3f})")
        print(f"const PHASE2_BASE_MS = {phase2_model.intercept_:.3f}")
        print(f"const PHASE2_CANDIDATE_MS = {phase2_model.coef_[0]:.6f}")
        print(f"const PHASE2_SIZE_MS = {phase2_model.coef_[1]:.6f}")
    else:
        print(f"// Phase 2: Hash Processing (Simple: R² = {phase2_r2:.3f})")
        print(f"const PHASE2_BASE_MS = {phase2_model.intercept_:.3f}")
        print(f"const PHASE2_CANDIDATE_MS = {phase2_model.coef_[0]:.6f}")
    
    print()
    
    if phase3_features == 'full':
        print(f"// Phase 3: UI Rendering (Full complexity: R² = {phase3_r2:.3f})")
        print(f"const PHASE3_BASE_MS = {phase3_model.intercept_:.3f}")
        print(f"const PHASE3_FILE_MS = {phase3_model.coef_[0]:.6f}")
        print(f"const PHASE3_DEPTH_MS = {phase3_model.coef_[1]:.6f}")
        print(f"const PHASE3_DIR_MS = {phase3_model.coef_[2]:.6f}")
        print(f"const PHASE3_FILENAME_MS = {phase3_model.coef_[3]:.6f}")
    elif phase3_features == 'directory':
        print(f"// Phase 3: UI Rendering (Directory-aware: R² = {phase3_r2:.3f})")
        print(f"const PHASE3_BASE_MS = {phase3_model.intercept_:.3f}")
        print(f"const PHASE3_FILE_MS = {phase3_model.coef_[0]:.6f}")
        print(f"const PHASE3_DEPTH_MS = {phase3_model.coef_[1]:.6f}")
        print(f"const PHASE3_DIR_MS = {phase3_model.coef_[2]:.6f}")
    else:
        print(f"// Phase 3: UI Rendering (Simple: R² = {phase3_r2:.3f})")
        print(f"const PHASE3_BASE_MS = {phase3_model.intercept_:.3f}")
        print(f"const PHASE3_FILE_MS = {phase3_model.coef_[0]:.6f}")
    
    return current_accuracy

def main():
    df = load_complete_data()
    
    # Comprehensive analysis
    correlations, phase_correlations = analyze_complete_correlations(df)
    
    # Multi-factor calibration
    models = calibrate_multi_factor_models(df)
    
    # Test comprehensive models
    pred_df, final_models = test_comprehensive_models(df, models)
    
    # Generate final implementation
    final_accuracy = generate_implementation_formula(df, final_models, pred_df)
    
    # Save comprehensive results
    results = df.copy()
    for col in pred_df.columns:
        results[f'comprehensive_{col}'] = pred_df[col]
    
    results.to_csv('5_ComprehensiveCalibrationResults.csv', index=False)
    print(f"\nComprehensive results saved to: 5_ComprehensiveCalibrationResults.csv")
    print(f"Final accuracy achieved: {final_accuracy:.1f}%")

if __name__ == "__main__":
    main()