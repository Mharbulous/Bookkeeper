#!/usr/bin/env python3
"""
Trial 5 Parser - Extract complete JSON folder data and timing data
"""

import re
import csv
import json
from pathlib import Path
from collections import defaultdict

def parse_trial5_data(content):
    """Parse Trial 5 console data with complete JSON and timing data"""
    
    print("=" * 60)
    print("TRIAL 5 DATA EXTRACTION")
    print("=" * 60)
    print()
    
    # Parse JSON FOLDER_ANALYSIS_DATA
    folder_pattern = r'🔬 FOLDER_ANALYSIS_DATA: ({.+?})'
    folder_matches = re.findall(folder_pattern, content)
    
    folder_data = []
    print("FOLDER ANALYSIS DATA:")
    print(f"Found {len(folder_matches)} complete JSON entries")
    
    for i, match in enumerate(folder_matches, 1):
        try:
            data = json.loads(match)
            folder_data.append({
                'TestRun': i,
                **data  # Unpack all JSON fields
            })
            print(f"  Entry {i}: {data.get('totalFiles', 0)} files, {data.get('totalSizeMB', 0):.1f}MB, depth {data.get('avgDirectoryDepth', 0):.1f}")
        except json.JSONDecodeError as e:
            print(f"  Entry {i}: JSON decode error - {e}")
    
    print()
    
    # Parse timing data
    timing_pattern = r'processingTimer\.js:\d+\s+([A-Z_]+):\s+(\d+)'
    timing_matches = re.findall(timing_pattern, content)
    
    # Group timing by test run
    timing_data = defaultdict(dict)
    current_run = 0
    
    for event, time_str in timing_matches:
        if event == 'PROCESSING_START':
            current_run += 1
        if current_run > 0:
            timing_data[current_run][event] = int(time_str)
    
    print("TIMING DATA:")
    print(f"Found {len(timing_data)} timing test runs")
    
    # Calculate phase durations
    processed_timing = []
    for run_num in sorted(timing_data.keys()):
        data = timing_data[run_num]
        
        # Calculate 3-phase durations
        start = data.get('PROCESSING_START', 0)
        dedup_start = data.get('DEDUPLICATION_START', 0)
        ui_start = data.get('UI_UPDATE_START', 0)
        end = data.get('ALL_FILES_DISPLAYED', 0)
        
        phase1 = dedup_start - start if dedup_start >= start else None
        phase2 = ui_start - dedup_start if ui_start >= dedup_start else None
        phase3 = end - ui_start if end >= ui_start else None
        total = end - start if end >= start else None
        
        processed_timing.append({
            'TestRun': run_num,
            'totalDurationMs': total,
            'phase1FileAnalysisMs': phase1,
            'phase2HashProcessingMs': phase2, 
            'phase3UIRenderingMs': phase3,
            'PROCESSING_START': start,
            'DEDUPLICATION_START': dedup_start,
            'UI_UPDATE_START': ui_start,
            'ALL_FILES_DISPLAYED': end
        })
        
        if total and phase1 and phase2 and phase3:
            print(f"  Run {run_num}: {total}ms total (P1:{phase1}ms, P2:{phase2}ms, P3:{phase3}ms)")
        else:
            print(f"  Run {run_num}: Missing timing data")
    
    return folder_data, processed_timing

def merge_data(folder_data, timing_data):
    """Merge folder analysis and timing data"""
    
    merged = []
    
    # Match by test run number
    folder_by_run = {item['TestRun']: item for item in folder_data}
    timing_by_run = {item['TestRun']: item for item in timing_data}
    
    all_runs = set(folder_by_run.keys()) | set(timing_by_run.keys())
    
    for run_num in sorted(all_runs):
        folder_item = folder_by_run.get(run_num, {})
        timing_item = timing_by_run.get(run_num, {})
        
        # Merge both datasets
        merged_item = {**folder_item, **timing_item}
        
        # Ensure TestRun field is consistent
        merged_item['TestRun'] = run_num
        
        merged.append(merged_item)
    
    return merged

def save_results(merged_data, output_dir):
    """Save merged results to CSV"""
    
    if not merged_data:
        print("No data to save")
        return
        
    # Define field order for CSV
    fieldnames = [
        'TestRun', 'timestamp', 'totalFiles', 'duplicateCandidateCount', 
        'duplicateCandidatePercent', 'uniqueFilesSizeMB', 'duplicateCandidatesSizeMB',
        'totalSizeMB', 'totalDirectoryCount', 'avgDirectoryDepth', 'maxDirectoryDepth',
        'uniqueFilesTotal', 'maxFileDepth', 'avgFileDepth', 'avgFilenameLength',
        'zeroByteFiles', 'totalDurationMs', 'phase1FileAnalysisMs', 
        'phase2HashProcessingMs', 'phase3UIRenderingMs', 'PROCESSING_START',
        'DEDUPLICATION_START', 'UI_UPDATE_START', 'ALL_FILES_DISPLAYED'
    ]
    
    # Include any additional fields found in data
    all_keys = set()
    for item in merged_data:
        all_keys.update(item.keys())
    
    # Add any missing fields to the end
    for key in sorted(all_keys):
        if key not in fieldnames:
            fieldnames.append(key)
    
    output_file = output_dir / '5_CompleteAnalysisData.csv'
    
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(merged_data)
    
    print()
    print(f"COMPLETE TRIAL 5 DATA SAVED:")
    print(f"  File: {output_file}")
    print(f"  Records: {len(merged_data)}")
    print(f"  Fields: {len(fieldnames)}")
    
    # Show data quality summary
    complete_records = sum(1 for item in merged_data 
                          if item.get('totalSizeMB') and item.get('totalSizeMB') > 0 
                          and item.get('totalDurationMs') and item.get('avgDirectoryDepth'))
    
    print(f"  Complete records: {complete_records}/{len(merged_data)}")
    
    return output_file

def main():
    input_file = Path('5_Raw_ConsoleData.md')
    
    if not input_file.exists():
        print(f"Error: {input_file} not found")
        return
    
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parse data
    folder_data, timing_data = parse_trial5_data(content)
    
    # Merge datasets
    merged_data = merge_data(folder_data, timing_data)
    
    # Save results
    output_file = save_results(merged_data, input_file.parent)
    
    print()
    print("TRIAL 5 ANALYSIS READY!")
    print(f"Use: {output_file.name} for comprehensive calibration")

if __name__ == "__main__":
    main()