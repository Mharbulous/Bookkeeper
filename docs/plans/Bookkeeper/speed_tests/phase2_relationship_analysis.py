#!/usr/bin/env python3
"""
Phase 2 Hash Calculation Relationship Analysis
Analyzes the mathematical relationship between duplicate candidates, file size, and hash calculation time
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy import stats
from scipy.optimize import curve_fit
import pandas as pd

# Extracted data from 8_Raw_ConsoleData.md with corrected phase definitions
data = [
    # Test, Files, FolderAnalysisTime(T), DuplicateCandidates, DuplicateSizeMB, Phase1, Phase2, Phase3, Total
    [1, 24, 63, 2, 1.4, 61, 35, 50, 146],
    [2, 96, 82, 84, 80.0, 64, 592, 57, 713],
    [3, 488, 258, 21, 2.7, 61, 123, 1658, 1842],
    [4, 707, 324, 39, 15.2, 57, 179, 1771, 2007],
    [5, 3398, 1603, 588, 201.1, 59, 2773, 2404, 5236],
    [6, 2994, 1567, 1911, 1539.0, 65, 13179, 2199, 15443]
]

# Convert to DataFrame for easier analysis
df = pd.DataFrame(data, columns=['Test', 'Files', 'T', 'DuplicateCandidates', 'DuplicateSizeMB', 'Phase1', 'Phase2', 'Phase3', 'Total'])

# Calculate Hardware Performance Factor (H)
df['H'] = df['Files'] / df['T']

print("Phase 2 Relationship Analysis")
print("=" * 50)
print("\nExtracted Data:")
print(df[['Test', 'DuplicateCandidates', 'DuplicateSizeMB', 'Phase2', 'H']].to_string(index=False))

# Prepare variables for regression analysis
candidates = df['DuplicateCandidates'].values
sizeMB = df['DuplicateSizeMB'].values
phase2_time = df['Phase2'].values

print(f"\nPhase 2 Time Range: {phase2_time.min()} - {phase2_time.max()} ms")
print(f"Duplicate Candidates Range: {candidates.min()} - {candidates.max()}")
print(f"Duplicate Size Range: {sizeMB.min():.1f} - {sizeMB.max():.1f} MB")

# Define different mathematical models to test
def linear_model(data, a, b, c):
    """Linear: a + b*candidates + c*sizeMB"""
    candidates, sizeMB = data
    return a + b * candidates + c * sizeMB

def logarithmic_model(data, a, b, c, d):
    """Logarithmic: a + b*candidates + c*sizeMB + d*log(candidates)"""
    candidates, sizeMB = data
    # Avoid log(0) by adding small constant
    log_candidates = np.log(np.maximum(candidates, 1))
    return a + b * candidates + c * sizeMB + d * log_candidates

def power_model(data, a, b, n, c):
    """Power: a + b*candidates^n + c*sizeMB"""
    candidates, sizeMB = data
    return a + b * np.power(candidates, n) + c * sizeMB

def exponential_model(data, a, b, k, c):
    """Exponential: a + b*exp(candidates/k) + c*sizeMB"""
    candidates, sizeMB = data
    # Limit exponential to prevent overflow
    exp_term = np.exp(np.minimum(candidates / k, 10))
    return a + b * exp_term + c * sizeMB

def sqrt_model(data, a, b, c, d):
    """Square Root: a + b*candidates + c*sizeMB + d*sqrt(candidates)"""
    candidates, sizeMB = data
    return a + b * candidates + c * sizeMB + d * np.sqrt(candidates)

# Prepare data for curve fitting
X = (candidates, sizeMB)

models = {
    'Linear': (linear_model, 3),
    'Logarithmic': (logarithmic_model, 4),
    'Power': (power_model, 4),
    'Exponential': (exponential_model, 4),
    'Square Root': (sqrt_model, 4)
}

results = {}

print("\nModel Fitting Results:")
print("-" * 50)

for model_name, (model_func, param_count) in models.items():
    try:
        if model_name == 'Power':
            # For power model, provide better initial guess for exponent
            initial_guess = [50, 1, 0.8, 0.1]
            bounds = ([0, 0, 0.1, -10], [1000, 100, 3, 10])
        elif model_name == 'Exponential':
            # For exponential model, be careful with k parameter
            initial_guess = [50, 1, 100, 0.1]
            bounds = ([0, 0, 10, -10], [1000, 1000, 1000, 10])
        else:
            initial_guess = None
            bounds = (-np.inf, np.inf)
        
        if initial_guess:
            popt, pcov = curve_fit(model_func, X, phase2_time, p0=initial_guess, bounds=bounds, maxfev=5000)
        else:
            popt, pcov = curve_fit(model_func, X, phase2_time, maxfev=5000)
        
        # Calculate predictions and R²
        predictions = model_func(X, *popt)
        ss_res = np.sum((phase2_time - predictions) ** 2)
        ss_tot = np.sum((phase2_time - np.mean(phase2_time)) ** 2)
        r_squared = 1 - (ss_res / ss_tot)
        
        # Calculate mean absolute error
        mae = np.mean(np.abs(phase2_time - predictions))
        
        results[model_name] = {
            'params': popt,
            'r_squared': r_squared,
            'mae': mae,
            'predictions': predictions
        }
        
        print(f"\n{model_name} Model:")
        print(f"  R² = {r_squared:.4f}")
        print(f"  MAE = {mae:.1f} ms")
        print(f"  Parameters: {popt}")
        
    except Exception as e:
        print(f"\n{model_name} Model: FAILED - {str(e)}")

# Find best model
if results:
    best_model = max(results.keys(), key=lambda k: results[k]['r_squared'])
    print(f"\n🎯 BEST MODEL: {best_model}")
    print(f"   R² = {results[best_model]['r_squared']:.4f}")
    print(f"   MAE = {results[best_model]['mae']:.1f} ms")
    
    # Show detailed predictions vs actual
    print(f"\nPrediction Accuracy for {best_model} Model:")
    print("-" * 60)
    print("Test | Actual | Predicted | Error | Error%")
    print("-" * 60)
    
    for i, (actual, predicted) in enumerate(zip(phase2_time, results[best_model]['predictions'])):
        error = actual - predicted
        error_pct = abs(error) / actual * 100
        print(f"{i+1:4d} | {actual:6.0f} | {predicted:9.1f} | {error:5.0f} | {error_pct:5.1f}%")

# Hardware Performance Factor Analysis
print(f"\nHardware Performance Factor (H) Analysis:")
print("-" * 50)
print("Test | Files | T(ms) | H (files/ms)")
print("-" * 50)
for _, row in df.iterrows():
    print(f"{row['Test']:4.0f} | {row['Files']:5.0f} | {row['T']:5.0f} | {row['H']:11.2f}")

print(f"\nH Statistics:")
print(f"  Mean H: {df['H'].mean():.2f} files/ms")
print(f"  Range: {df['H'].min():.2f} - {df['H'].max():.2f} files/ms")
print(f"  Std Dev: {df['H'].std():.2f}")

# Export results for implementation
print(f"\n📝 Recommended Implementation:")
if results and best_model:
    params = results[best_model]['params']
    if best_model == 'Linear':
        print(f"Phase2Time = {params[0]:.2f} + {params[1]:.4f} * duplicateCandidates + {params[2]:.4f} * duplicateSizeMB")
    elif best_model == 'Logarithmic':
        print(f"Phase2Time = {params[0]:.2f} + {params[1]:.4f} * duplicateCandidates + {params[2]:.4f} * duplicateSizeMB + {params[3]:.4f} * log(duplicateCandidates)")
    elif best_model == 'Square Root':
        print(f"Phase2Time = {params[0]:.2f} + {params[1]:.4f} * duplicateCandidates + {params[2]:.4f} * duplicateSizeMB + {params[3]:.4f} * sqrt(duplicateCandidates)")
    elif best_model == 'Power':
        print(f"Phase2Time = {params[0]:.2f} + {params[1]:.4f} * pow(duplicateCandidates, {params[2]:.3f}) + {params[3]:.4f} * duplicateSizeMB")
    elif best_model == 'Exponential':
        print(f"Phase2Time = {params[0]:.2f} + {params[1]:.4f} * exp(duplicateCandidates / {params[2]:.1f}) + {params[3]:.4f} * duplicateSizeMB")
        
print(f"\nMean Hardware Performance Factor: H = {df['H'].mean():.2f} files/ms")