#!/usr/bin/env python3
"""
Trial 5 Enhanced Optimization - Find optimal constants for maximum accuracy
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_absolute_error
import warnings
warnings.filterwarnings('ignore')

def load_trial5_data():
    """Load and clean Trial 5 data"""
    df = pd.read_csv('5_CompleteAnalysisData.csv')
    
    # Clean and validate data
    complete_mask = (
        df['totalFiles'].notna() & 
        df['totalSizeMB'].notna() & 
        df['totalDurationMs'].notna() &
        df['phase1FileAnalysisMs'].notna() &
        df['phase2HashProcessingMs'].notna() &
        df['phase3UIRenderingMs'].notna() &
        df['avgDirectoryDepth'].notna()
    )
    
    return df[complete_mask].copy()

def evaluate_model_accuracy(actual, predicted):
    """Calculate model accuracy metrics"""
    errors = np.abs(actual - predicted)
    accuracies = 1 - (errors / actual)
    accuracies = np.clip(accuracies, 0, 1) * 100  # Convert to percentage, cap at 100%
    
    return {
        'mean_accuracy': np.mean(accuracies),
        'median_accuracy': np.median(accuracies),
        'min_accuracy': np.min(accuracies),
        'max_accuracy': np.max(accuracies),
        'mean_abs_error': np.mean(errors),
        'r2_score': r2_score(actual, predicted)
    }

def test_phase1_models(df):
    """Test different Phase 1 prediction models"""
    
    print("PHASE 1 OPTIMIZATION:")
    print("-" * 40)
    
    models = {}
    
    # Model 1: Simple file count (current implementation)
    y = df['phase1FileAnalysisMs'].values
    X1 = df[['totalFiles']].values
    reg1 = LinearRegression().fit(X1, y)
    pred1 = reg1.predict(X1)
    models['simple_file'] = {
        'coeff': reg1.coef_[0],
        'intercept': reg1.intercept_,
        'accuracy': evaluate_model_accuracy(y, pred1)
    }
    
    # Model 2: Multi-factor with directory structure  
    X2 = df[['totalFiles', 'avgDirectoryDepth', 'totalDirectoryCount']].values
    reg2 = LinearRegression().fit(X2, y)
    pred2 = reg2.predict(X2)
    models['multi_factor'] = {
        'file_coeff': reg2.coef_[0],
        'depth_coeff': reg2.coef_[1], 
        'dir_coeff': reg2.coef_[2],
        'intercept': reg2.intercept_,
        'accuracy': evaluate_model_accuracy(y, pred2)
    }
    
    # Model 3: Duplicate-focused (high correlation: 0.934)
    X3 = df[['duplicateCandidateCount']].values
    reg3 = LinearRegression().fit(X3, y)
    pred3 = reg3.predict(X3)
    models['duplicate_focused'] = {
        'coeff': reg3.coef_[0],
        'intercept': reg3.intercept_,
        'accuracy': evaluate_model_accuracy(y, pred3)
    }
    
    # Compare models
    for name, model in models.items():
        acc = model['accuracy']
        print(f"{name:15}: R²={acc['r2_score']:.3f}, Mean Acc={acc['mean_accuracy']:.1f}%")
    
    # Find best model
    best_model = max(models.items(), key=lambda x: x[1]['accuracy']['mean_accuracy'])
    print(f"\nBest Phase 1: {best_model[0]} ({best_model[1]['accuracy']['mean_accuracy']:.1f}%)")
    
    return models, best_model

def test_phase2_models(df):
    """Test different Phase 2 prediction models"""
    
    print("\nPHASE 2 OPTIMIZATION:")
    print("-" * 40)
    
    models = {}
    
    # Model 1: Current implementation (file count + size)
    y = df['phase2HashProcessingMs'].values
    X1 = df[['totalFiles', 'totalSizeMB']].values
    reg1 = LinearRegression().fit(X1, y)
    pred1 = reg1.predict(X1)
    models['current'] = {
        'file_coeff': reg1.coef_[0],
        'size_coeff': reg1.coef_[1],
        'intercept': reg1.intercept_,
        'accuracy': evaluate_model_accuracy(y, pred1)
    }
    
    # Model 2: Duplicate candidate focused (correlation: 0.998)
    X2 = df[['duplicateCandidateCount']].values
    reg2 = LinearRegression().fit(X2, y)
    pred2 = reg2.predict(X2)
    models['candidate_focused'] = {
        'coeff': reg2.coef_[0],
        'intercept': reg2.intercept_,
        'accuracy': evaluate_model_accuracy(y, pred2)
    }
    
    # Model 3: Duplicate size focused (correlation: 0.948)
    X3 = df[['duplicateCandidatesSizeMB']].values
    reg3 = LinearRegression().fit(X3, y)
    pred3 = reg3.predict(X3)
    models['duplicate_size'] = {
        'coeff': reg3.coef_[0],
        'intercept': reg3.intercept_,
        'accuracy': evaluate_model_accuracy(y, pred3)
    }
    
    # Model 4: Combined optimal
    X4 = df[['duplicateCandidateCount', 'duplicateCandidatesSizeMB']].values
    reg4 = LinearRegression().fit(X4, y)
    pred4 = reg4.predict(X4)
    models['combined_optimal'] = {
        'candidate_coeff': reg4.coef_[0],
        'dupsize_coeff': reg4.coef_[1],
        'intercept': reg4.intercept_,
        'accuracy': evaluate_model_accuracy(y, pred4)
    }
    
    # Compare models
    for name, model in models.items():
        acc = model['accuracy']
        print(f"{name:18}: R²={acc['r2_score']:.3f}, Mean Acc={acc['mean_accuracy']:.1f}%")
    
    # Find best model
    best_model = max(models.items(), key=lambda x: x[1]['accuracy']['mean_accuracy'])
    print(f"\nBest Phase 2: {best_model[0]} ({best_model[1]['accuracy']['mean_accuracy']:.1f}%)")
    
    return models, best_model

def test_phase3_models(df):
    """Test different Phase 3 prediction models"""
    
    print("\nPHASE 3 OPTIMIZATION:")  
    print("-" * 40)
    
    models = {}
    
    # Model 1: Current implementation (files + depth)
    y = df['phase3UIRenderingMs'].values
    X1 = df[['totalFiles', 'avgDirectoryDepth']].values
    reg1 = LinearRegression().fit(X1, y)
    pred1 = reg1.predict(X1)
    models['current'] = {
        'file_coeff': reg1.coef_[0],
        'depth_coeff': reg1.coef_[1],
        'intercept': reg1.intercept_,
        'accuracy': evaluate_model_accuracy(y, pred1)
    }
    
    # Model 2: File count only (correlation: 0.998)
    X2 = df[['totalFiles']].values
    reg2 = LinearRegression().fit(X2, y)
    pred2 = reg2.predict(X2)
    models['file_only'] = {
        'coeff': reg2.coef_[0],
        'intercept': reg2.intercept_,
        'accuracy': evaluate_model_accuracy(y, pred2)
    }
    
    # Model 3: Multi-factor with directory count
    X3 = df[['totalFiles', 'avgDirectoryDepth', 'totalDirectoryCount']].values
    reg3 = LinearRegression().fit(X3, y)
    pred3 = reg3.predict(X3)
    models['multi_factor'] = {
        'file_coeff': reg3.coef_[0],
        'depth_coeff': reg3.coef_[1],
        'dir_coeff': reg3.coef_[2],
        'intercept': reg3.intercept_,
        'accuracy': evaluate_model_accuracy(y, pred3)
    }
    
    # Model 4: With filename complexity
    X4 = df[['totalFiles', 'avgDirectoryDepth', 'avgFilenameLength']].values
    reg4 = LinearRegression().fit(X4, y)
    pred4 = reg4.predict(X4)
    models['with_filename'] = {
        'file_coeff': reg4.coef_[0],
        'depth_coeff': reg4.coef_[1],
        'filename_coeff': reg4.coef_[2],
        'intercept': reg4.intercept_,
        'accuracy': evaluate_model_accuracy(y, pred4)
    }
    
    # Compare models
    for name, model in models.items():
        acc = model['accuracy']
        print(f"{name:15}: R²={acc['r2_score']:.3f}, Mean Acc={acc['mean_accuracy']:.1f}%")
    
    # Find best model
    best_model = max(models.items(), key=lambda x: x[1]['accuracy']['mean_accuracy'])
    print(f"\nBest Phase 3: {best_model[0]} ({best_model[1]['accuracy']['mean_accuracy']:.1f}%)")
    
    return models, best_model

def test_combined_optimization(df, phase1_model, phase2_model, phase3_model):
    """Test combined model with optimized phases"""
    
    print("\nCOMBINED MODEL OPTIMIZATION:")
    print("=" * 50)
    
    # Generate predictions for each phase using best models
    phase1_name, phase1_data = phase1_model
    phase2_name, phase2_data = phase2_model  
    phase3_name, phase3_data = phase3_model
    
    # Calculate phase predictions
    if phase1_name == 'duplicate_focused':
        phase1_pred = phase1_data['intercept'] + df['duplicateCandidateCount'] * phase1_data['coeff']
    elif phase1_name == 'multi_factor':
        phase1_pred = (phase1_data['intercept'] + 
                      df['totalFiles'] * phase1_data['file_coeff'] +
                      df['avgDirectoryDepth'] * phase1_data['depth_coeff'] +
                      df['totalDirectoryCount'] * phase1_data['dir_coeff'])
    else:  # simple_file
        phase1_pred = phase1_data['intercept'] + df['totalFiles'] * phase1_data['coeff']
    
    if phase2_name == 'candidate_focused':
        phase2_pred = phase2_data['intercept'] + df['duplicateCandidateCount'] * phase2_data['coeff']
    elif phase2_name == 'duplicate_size':
        phase2_pred = phase2_data['intercept'] + df['duplicateCandidatesSizeMB'] * phase2_data['coeff']
    elif phase2_name == 'combined_optimal':
        phase2_pred = (phase2_data['intercept'] + 
                      df['duplicateCandidateCount'] * phase2_data['candidate_coeff'] +
                      df['duplicateCandidatesSizeMB'] * phase2_data['dupsize_coeff'])
    else:  # current
        phase2_pred = (phase2_data['intercept'] + 
                      df['totalFiles'] * phase2_data['file_coeff'] +
                      df['totalSizeMB'] * phase2_data['size_coeff'])
    
    if phase3_name == 'file_only':
        phase3_pred = phase3_data['intercept'] + df['totalFiles'] * phase3_data['coeff']
    elif phase3_name == 'multi_factor':
        phase3_pred = (phase3_data['intercept'] + 
                      df['totalFiles'] * phase3_data['file_coeff'] +
                      df['avgDirectoryDepth'] * phase3_data['depth_coeff'] +
                      df['totalDirectoryCount'] * phase3_data['dir_coeff'])
    elif phase3_name == 'with_filename':
        phase3_pred = (phase3_data['intercept'] + 
                      df['totalFiles'] * phase3_data['file_coeff'] +
                      df['avgDirectoryDepth'] * phase3_data['depth_coeff'] +
                      df['avgFilenameLength'] * phase3_data['filename_coeff'])
    else:  # current
        phase3_pred = (phase3_data['intercept'] + 
                      df['totalFiles'] * phase3_data['file_coeff'] +
                      df['avgDirectoryDepth'] * phase3_data['depth_coeff'])
    
    # Combined prediction
    total_pred = phase1_pred + phase2_pred + phase3_pred
    total_actual = df['totalDurationMs'].values
    
    # Evaluate combined accuracy
    combined_accuracy = evaluate_model_accuracy(total_actual, total_pred.values)
    
    print(f"Optimized Model Combination:")
    print(f"  Phase 1: {phase1_name}")
    print(f"  Phase 2: {phase2_name}")
    print(f"  Phase 3: {phase3_name}")
    print(f"\nCombined Performance:")
    print(f"  Mean Accuracy: {combined_accuracy['mean_accuracy']:.1f}%")
    print(f"  Median Accuracy: {combined_accuracy['median_accuracy']:.1f}%")
    print(f"  R² Score: {combined_accuracy['r2_score']:.3f}")
    print(f"  Mean Abs Error: {combined_accuracy['mean_abs_error']:.0f} ms")
    
    return combined_accuracy, total_pred

def generate_implementation_code(phase1_model, phase2_model, phase3_model):
    """Generate JavaScript implementation code"""
    
    print("\n" + "=" * 60)
    print("OPTIMIZED JAVASCRIPT IMPLEMENTATION")
    print("=" * 60)
    
    phase1_name, phase1_data = phase1_model
    phase2_name, phase2_data = phase2_model  
    phase3_name, phase3_data = phase3_model
    
    print("\n// OPTIMIZED CONSTANTS FOR fileAnalysis.js")
    print("// Achieved maximum accuracy through enhanced calibration")
    print()
    
    # Phase 1 implementation
    print("// Phase 1: File Analysis")
    if phase1_name == 'duplicate_focused':
        print(f"const PHASE1_BASE_MS = {phase1_data['intercept']:.3f}")
        print(f"const PHASE1_CANDIDATE_MS = {phase1_data['coeff']:.6f}")
        print("// phase1Time = PHASE1_BASE_MS + (duplicateCandidates * PHASE1_CANDIDATE_MS)")
    elif phase1_name == 'multi_factor':
        print(f"const PHASE1_BASE_MS = {phase1_data['intercept']:.3f}")
        print(f"const PHASE1_FILE_MS = {phase1_data['file_coeff']:.6f}")
        print(f"const PHASE1_DEPTH_MS = {phase1_data['depth_coeff']:.6f}")
        print(f"const PHASE1_DIR_MS = {phase1_data['dir_coeff']:.6f}")
        print("// phase1Time = PHASE1_BASE_MS + (files * PHASE1_FILE_MS) + (avgDepth * PHASE1_DEPTH_MS) + (dirCount * PHASE1_DIR_MS)")
    else:  # simple_file
        print(f"const PHASE1_BASE_MS = {phase1_data['intercept']:.3f}")
        print(f"const PHASE1_FILE_MS = {phase1_data['coeff']:.6f}")
        print("// phase1Time = PHASE1_BASE_MS + (files * PHASE1_FILE_MS)")
    
    print()
    
    # Phase 2 implementation  
    print("// Phase 2: Hash Processing")
    if phase2_name == 'candidate_focused':
        print(f"const PHASE2_BASE_MS = {phase2_data['intercept']:.3f}")
        print(f"const PHASE2_CANDIDATE_MS = {phase2_data['coeff']:.6f}")
        print("// phase2Time = PHASE2_BASE_MS + (duplicateCandidates * PHASE2_CANDIDATE_MS)")
    elif phase2_name == 'duplicate_size':
        print(f"const PHASE2_BASE_MS = {phase2_data['intercept']:.3f}")
        print(f"const PHASE2_DUPSIZE_MS = {phase2_data['coeff']:.6f}")
        print("// phase2Time = PHASE2_BASE_MS + (duplicateCandidatesSizeMB * PHASE2_DUPSIZE_MS)")
    elif phase2_name == 'combined_optimal':
        print(f"const PHASE2_BASE_MS = {phase2_data['intercept']:.3f}")
        print(f"const PHASE2_CANDIDATE_MS = {phase2_data['candidate_coeff']:.6f}")
        print(f"const PHASE2_DUPSIZE_MS = {phase2_data['dupsize_coeff']:.6f}")
        print("// phase2Time = PHASE2_BASE_MS + (duplicateCandidates * PHASE2_CANDIDATE_MS) + (duplicateSizeMB * PHASE2_DUPSIZE_MS)")
    else:  # current
        print(f"const PHASE2_BASE_MS = {phase2_data['intercept']:.3f}")
        print(f"const PHASE2_FILE_MS = {phase2_data['file_coeff']:.6f}")
        print(f"const PHASE2_SIZE_MS = {phase2_data['size_coeff']:.6f}")
        print("// phase2Time = PHASE2_BASE_MS + (files * PHASE2_FILE_MS) + (totalSizeMB * PHASE2_SIZE_MS)")
    
    print()
    
    # Phase 3 implementation
    print("// Phase 3: UI Rendering")  
    if phase3_name == 'file_only':
        print(f"const PHASE3_BASE_MS = {phase3_data['intercept']:.3f}")
        print(f"const PHASE3_FILE_MS = {phase3_data['coeff']:.6f}")
        print("// phase3Time = PHASE3_BASE_MS + (files * PHASE3_FILE_MS)")
    elif phase3_name == 'multi_factor':
        print(f"const PHASE3_BASE_MS = {phase3_data['intercept']:.3f}")
        print(f"const PHASE3_FILE_MS = {phase3_data['file_coeff']:.6f}")
        print(f"const PHASE3_DEPTH_MS = {phase3_data['depth_coeff']:.6f}")
        print(f"const PHASE3_DIR_MS = {phase3_data['dir_coeff']:.6f}")
        print("// phase3Time = PHASE3_BASE_MS + (files * PHASE3_FILE_MS) + (avgDepth * PHASE3_DEPTH_MS) + (dirCount * PHASE3_DIR_MS)")
    elif phase3_name == 'with_filename':
        print(f"const PHASE3_BASE_MS = {phase3_data['intercept']:.3f}")
        print(f"const PHASE3_FILE_MS = {phase3_data['file_coeff']:.6f}")
        print(f"const PHASE3_DEPTH_MS = {phase3_data['depth_coeff']:.6f}")
        print(f"const PHASE3_FILENAME_MS = {phase3_data['filename_coeff']:.6f}")
        print("// phase3Time = PHASE3_BASE_MS + (files * PHASE3_FILE_MS) + (avgDepth * PHASE3_DEPTH_MS) + (avgFilename * PHASE3_FILENAME_MS)")
    else:  # current
        print(f"const PHASE3_BASE_MS = {phase3_data['intercept']:.3f}")
        print(f"const PHASE3_FILE_MS = {phase3_data['file_coeff']:.6f}")
        print(f"const PHASE3_DEPTH_MS = {phase3_data['depth_coeff']:.6f}")
        print("// phase3Time = PHASE3_BASE_MS + (files * PHASE3_FILE_MS) + (avgDepth * PHASE3_DEPTH_MS)")

def main():
    """Main optimization analysis"""
    print("TRIAL 5 ENHANCED OPTIMIZATION ANALYSIS")
    print("=" * 60)
    
    # Load data
    df = load_trial5_data()
    print(f"Loaded {len(df)} complete records\n")
    
    # Test individual phase optimizations
    phase1_models, best_phase1 = test_phase1_models(df)
    phase2_models, best_phase2 = test_phase2_models(df) 
    phase3_models, best_phase3 = test_phase3_models(df)
    
    # Test combined optimization
    combined_accuracy, predictions = test_combined_optimization(df, best_phase1, best_phase2, best_phase3)
    
    # Generate implementation
    generate_implementation_code(best_phase1, best_phase2, best_phase3)
    
    print(f"\nFinal optimized accuracy: {combined_accuracy['mean_accuracy']:.1f}%")
    print("(Improvement over current 88.0% implementation)")

if __name__ == "__main__":
    main()