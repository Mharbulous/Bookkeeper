#!/usr/bin/env python3
"""
Processing Phase Analysis Script

Analyzes the file processing performance data from the second test run
to identify key phases, processing times, and optimization opportunities.
"""

import pandas as pd
import numpy as np
from pathlib import Path

def load_data():
    """Load the test data CSV files."""
    base_path = Path("docs/test_results")
    
    # Load folder analysis data
    folder_data = pd.read_csv(base_path / "2_TestRun_Folder_Analysis_data.csv")
    
    # Load raw timing data
    timing_data = pd.read_csv(base_path / "2_TestRun_Raw_data.csv")
    
    return folder_data, timing_data

def calculate_phase_durations(timing_data):
    """Calculate the duration of each processing phase."""
    
    # Define the phase sequence and their relationships
    phases = [
        ('DEDUPLICATION_START', 'Start of deduplication process'),
        ('WORKER_SEND', 'Send files to Web Worker'),
        ('SIZE_ANALYSIS_COMPLETE', 'File size analysis'),
        ('HASH_CALCULATION_COMPLETE', 'SHA-256 hash generation'),
        ('DEDUP_LOGIC_START', 'Start deduplication logic'),
        ('DEDUP_LOGIC_COMPLETE', 'Deduplication logic'),
        ('WORKER_COMPLETE', 'Web Worker processing'),
        ('RESULT_MAPPING_COMPLETE', 'Result mapping'),
        ('UI_UPDATE_START', 'UI update start'),
        ('CHUNK1_START', 'First UI chunk start'),
        ('CHUNK1_COMPLETE', 'First UI chunk'),
        ('CHUNK2_START', 'Second UI chunk start'),
        ('DOM_RENDER_COMPLETE', 'DOM rendering'),
        ('CHUNK2_COMPLETE', 'Second UI chunk'),
        ('ALL_FILES_DISPLAYED', 'Final completion')
    ]
    
    # Calculate durations for major phases
    durations = []
    
    for _, row in timing_data.iterrows():
        test_run = row['Test Run #']
        
        # Calculate key phase durations
        phase_durations = {
            'Test Run': test_run,
            'Total Time': row['ALL_FILES_DISPLAYED'] if pd.notna(row['ALL_FILES_DISPLAYED']) else 0
        }
        
        # Deduplication phase (start to logic complete)
        if pd.notna(row['DEDUPLICATION_START']) and pd.notna(row['DEDUP_LOGIC_COMPLETE']):
            phase_durations['Deduplication Phase'] = row['DEDUP_LOGIC_COMPLETE'] - row['DEDUPLICATION_START']
        else:
            phase_durations['Deduplication Phase'] = 0
            
        # Hash calculation time
        if pd.notna(row['HASH_CALCULATION_COMPLETE']) and pd.notna(row['SIZE_ANALYSIS_COMPLETE']):
            phase_durations['Hash Calculation'] = row['HASH_CALCULATION_COMPLETE'] - row['SIZE_ANALYSIS_COMPLETE']
        elif pd.notna(row['HASH_CALCULATION_COMPLETE']) and pd.notna(row['DEDUPLICATION_START']):
            phase_durations['Hash Calculation'] = row['HASH_CALCULATION_COMPLETE'] - row['DEDUPLICATION_START']
        else:
            phase_durations['Hash Calculation'] = 0
            
        # UI Update phase (from UI start to completion)
        if pd.notna(row['UI_UPDATE_START']) and pd.notna(row['ALL_FILES_DISPLAYED']):
            phase_durations['UI Update Phase'] = row['ALL_FILES_DISPLAYED'] - row['UI_UPDATE_START']
        else:
            phase_durations['UI Update Phase'] = 0
            
        # Chunk1 processing
        if pd.notna(row['CHUNK1_START']) and pd.notna(row['CHUNK1_COMPLETE']):
            phase_durations['Chunk1 Processing'] = row['CHUNK1_COMPLETE'] - row['CHUNK1_START']
        else:
            phase_durations['Chunk1 Processing'] = 0
            
        # Chunk2 processing (if it exists)
        if pd.notna(row['CHUNK2_START']) and pd.notna(row['CHUNK2_COMPLETE']):
            phase_durations['Chunk2 Processing'] = row['CHUNK2_COMPLETE'] - row['CHUNK2_START']
        else:
            phase_durations['Chunk2 Processing'] = 0
            
        # DOM Render time (between chunks completion and final display)
        if pd.notna(row['DOM_RENDER_COMPLETE']) and pd.notna(row['CHUNK2_START']):
            phase_durations['DOM Render Time'] = row['DOM_RENDER_COMPLETE'] - row['CHUNK2_START']
        elif pd.notna(row['DOM_RENDER_COMPLETE']) and pd.notna(row['CHUNK1_COMPLETE']):
            phase_durations['DOM Render Time'] = row['DOM_RENDER_COMPLETE'] - row['CHUNK1_COMPLETE']
        else:
            phase_durations['DOM Render Time'] = 0
        
        durations.append(phase_durations)
    
    return pd.DataFrame(durations)

def analyze_phase_statistics(durations_df):
    """Calculate min, max, average statistics for each phase."""
    
    # Get numeric columns (exclude Test Run)
    numeric_cols = durations_df.select_dtypes(include=[np.number]).columns
    numeric_cols = [col for col in numeric_cols if col != 'Test Run']
    
    stats = []
    
    for col in numeric_cols:
        # Filter out zero values for accurate statistics
        non_zero_values = durations_df[durations_df[col] > 0][col]
        
        if len(non_zero_values) > 0:
            stats.append({
                'Phase': col,
                'Count': len(non_zero_values),
                'Min (ms)': non_zero_values.min(),
                'Max (ms)': non_zero_values.max(),
                'Average (ms)': non_zero_values.mean(),
                'Median (ms)': non_zero_values.median(),
                'Std Dev (ms)': non_zero_values.std(),
                'Total Contribution (ms)': non_zero_values.sum()
            })
        else:
            stats.append({
                'Phase': col,
                'Count': 0,
                'Min (ms)': 0,
                'Max (ms)': 0,
                'Average (ms)': 0,
                'Median (ms)': 0,
                'Std Dev (ms)': 0,
                'Total Contribution (ms)': 0
            })
    
    return pd.DataFrame(stats)

def identify_major_phases(stats_df, durations_df):
    """Identify phases that account for 90% of processing time."""
    
    # Calculate total processing time across all test runs
    total_time = durations_df['Total Time'].sum()
    
    # Calculate percentage contribution for each phase
    stats_df['Percentage of Total'] = (stats_df['Total Contribution (ms)'] / total_time) * 100
    
    # Sort by contribution
    stats_df = stats_df.sort_values('Total Contribution (ms)', ascending=False)
    
    # Find phases that contribute to 90% of processing time
    cumulative_pct = 0
    major_phases = []
    
    for _, row in stats_df.iterrows():
        cumulative_pct += row['Percentage of Total']
        major_phases.append(row['Phase'])
        if cumulative_pct >= 90:
            break
    
    return stats_df, major_phases

def generate_correlations(folder_data, durations_df):
    """Analyze correlations between file characteristics and processing times."""
    
    # Merge datasets on test run
    merged_data = pd.merge(
        folder_data,
        durations_df,
        left_on='Test Run #',
        right_on='Test Run',
        how='inner'
    )
    
    # Calculate correlations between file characteristics and processing times
    file_characteristics = ['totalFiles', 'totalMB', 'avgFileSizeMB', 'maxFileSizeMB']
    processing_phases = ['Total Time', 'Deduplication Phase', 'Hash Calculation', 'UI Update Phase']
    
    correlations = []
    
    for char in file_characteristics:
        for phase in processing_phases:
            if char in merged_data.columns and phase in merged_data.columns:
                # Filter out rows with missing data
                valid_data = merged_data[[char, phase]].dropna()
                if len(valid_data) > 1:
                    corr = valid_data[char].corr(valid_data[phase])
                    correlations.append({
                        'File Characteristic': char,
                        'Processing Phase': phase,
                        'Correlation': corr
                    })
    
    return pd.DataFrame(correlations)

def main():
    print("Processing Phase Analysis")
    print("=" * 50)
    
    # Load data
    print("Loading test data...")
    folder_data, timing_data = load_data()
    
    print(f"Loaded data for {len(timing_data)} test runs")
    print()
    
    # Calculate phase durations
    print("Calculating phase durations...")
    durations_df = calculate_phase_durations(timing_data)
    
    # Calculate statistics
    print("Analyzing phase statistics...")
    stats_df = analyze_phase_statistics(durations_df)
    
    # Identify major phases
    print("Identifying major phases...")
    stats_df, major_phases = identify_major_phases(stats_df, durations_df)
    
    # Generate correlations
    print("Analyzing correlations...")
    correlations_df = generate_correlations(folder_data, durations_df)
    
    # Display results
    print("\nPHASE STATISTICS SUMMARY")
    print("=" * 50)
    print(stats_df.to_string(index=False, float_format='%.1f'))
    
    print(f"\nPHASES ACCOUNTING FOR 90% OF PROCESSING TIME")
    print("=" * 50)
    for i, phase in enumerate(major_phases, 1):
        phase_stats = stats_df[stats_df['Phase'] == phase].iloc[0]
        print(f"{i}. {phase}: {phase_stats['Percentage of Total']:.1f}% "
              f"(Avg: {phase_stats['Average (ms)']:.0f}ms, "
              f"Max: {phase_stats['Max (ms)']:.0f}ms)")
    
    print(f"\nCORRELATIONS WITH FILE CHARACTERISTICS")
    print("=" * 50)
    # Sort by absolute correlation value
    correlations_df['Abs Correlation'] = correlations_df['Correlation'].abs()
    correlations_df = correlations_df.sort_values('Abs Correlation', ascending=False)
    
    for _, row in correlations_df.iterrows():
        print(f"{row['File Characteristic']} vs {row['Processing Phase']}: "
              f"r = {row['Correlation']:.3f}")
    
    print(f"\nKEY FINDINGS")
    print("=" * 50)
    
    # Identify the most time-consuming phase
    top_phase = stats_df.iloc[0]
    print(f"• Most time-consuming phase: {top_phase['Phase']}")
    print(f"  - Average: {top_phase['Average (ms)']:.0f}ms")
    print(f"  - Range: {top_phase['Min (ms)']:.0f}ms - {top_phase['Max (ms)']:.0f}ms")
    print(f"  - Accounts for {top_phase['Percentage of Total']:.1f}% of total processing time")
    
    # Identify most variable phase
    most_variable = stats_df.loc[stats_df['Std Dev (ms)'].idxmax()]
    print(f"\n• Most variable phase: {most_variable['Phase']}")
    print(f"  - Standard deviation: {most_variable['Std Dev (ms)']:.0f}ms")
    print(f"  - Coefficient of variation: {(most_variable['Std Dev (ms)'] / most_variable['Average (ms)'] * 100):.1f}%")
    
    # Show strongest correlations
    if len(correlations_df) > 0:
        strongest_corr = correlations_df.iloc[0]
        print(f"\n• Strongest correlation: {strongest_corr['File Characteristic']} vs {strongest_corr['Processing Phase']}")
        print(f"  - Correlation coefficient: {strongest_corr['Correlation']:.3f}")
    
    print(f"\nAnalysis complete!")

if __name__ == "__main__":
    main()