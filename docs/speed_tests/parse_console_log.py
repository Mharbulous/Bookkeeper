#!/usr/bin/env python3
"""
Parse Console Log Data into CSV Files
Usage: python parse_console_log.py input_file.md
"""

import sys
import re
import csv
import json
from pathlib import Path
from collections import defaultdict


def extract_filename_prefix(input_path):
    """Extract prefix from input filename (everything before first underscore)"""
    return input_path.stem.split('_')[0]


def parse_folder_analysis_data(content):
    """Parse FOLDER_ANALYSIS_DATA entries from console log"""
    # Updated pattern to handle new modal predictor format
    pattern = r'🔬 FOLDER_ANALYSIS_DATA \(Modal Predictors\): \{([^}]+)\}'
    matches = re.findall(pattern, content)
    
    folder_data = []
    test_run = 1
    
    for match in matches:
        try:
            # Extract individual fields using regex for new modal predictor format
            data = {}
            field_patterns = {
                'timestamp': r'timestamp:\s*(\d+)',
                'totalFiles': r'totalFiles:\s*(\d+)',
                'duplicateCandidateCount': r'duplicateCandidateCount:\s*(\d+)',
                'duplicateCandidatePercent': r'duplicateCandidatePercent:\s*(\d+)',
                'uniqueFilesSizeMB': r'uniqueFilesSizeMB:\s*([\d.]+)',
                'duplicateCandidatesSizeMB': r'duplicateCandidatesSizeMB:\s*([\d.]+)',
                'totalSizeMB': r'totalSizeMB:\s*([\d.]+)',
                'totalDirectoryCount': r'totalDirectoryCount:\s*(\d+)',
                'maxDirectoryDepth': r'maxDirectoryDepth:\s*(\d+)',
                'uniqueFilesTotal': r'uniqueFilesTotal:\s*(\d+)',
                'avgDirectoryDepth': r'avgDirectoryDepth:\s*([\d.]+)'
            }
            
            for field, pattern in field_patterns.items():
                match_obj = re.search(pattern, match)
                if match_obj:
                    if field in ['totalSizeMB', 'uniqueFilesSizeMB', 'duplicateCandidatesSizeMB', 'avgDirectoryDepth']:
                        data[field] = float(match_obj.group(1))
                    elif field == 'timestamp':
                        data[field] = int(match_obj.group(1))
                    else:
                        data[field] = int(match_obj.group(1))
                else:
                    data[field] = 0
            
            # Create row data using actual calculated values (no derived metrics needed)
            row = {
                'TestRun#': test_run,
                'timestamp': data['timestamp'],
                
                # Core 3-phase prediction metrics (from modal calculations)
                'totalFiles': data['totalFiles'],
                'duplicateCandidateCount': data['duplicateCandidateCount'], 
                'duplicateCandidatePercent': data['duplicateCandidatePercent'],
                'uniqueFilesSizeMB': data['uniqueFilesSizeMB'],
                'duplicateCandidatesSizeMB': data['duplicateCandidatesSizeMB'],
                'totalSizeMB': data['totalSizeMB'],
                'totalDirectoryCount': data['totalDirectoryCount'],
                'maxDirectoryDepth': data['maxDirectoryDepth'],
                'uniqueFilesTotal': data['uniqueFilesTotal'],
                'avgDirectoryDepth': data['avgDirectoryDepth']
            }
            
            folder_data.append(row)
            test_run += 1
            
        except Exception as e:
            print(f"Warning: Failed to parse FOLDER_ANALYSIS_DATA: {match[:50]}... - {e}")
    
    return folder_data


def detect_execution_mode(content, test_run_start_pos):
    """Detect if test run used Web Worker or Main Thread processing"""
    # Look for worker-specific patterns after the test run start
    worker_patterns = [
        r'fileHashWorker\.js:\d+\s+SIZE_ANALYSIS_COMPLETE',
        r'fileHashWorker\.js:\d+\s+HASH_CALCULATION_COMPLETE',
        r'Web Worker restart failed, falling back to main thread processing'
    ]
    
    # Search in a reasonable window after test start
    search_window = content[test_run_start_pos:test_run_start_pos + 5000]
    
    for pattern in worker_patterns:
        if re.search(pattern, search_window):
            return True
    
    return False


def parse_timing_data(content):
    """Parse timing data entries from console log with 3-stage measurement"""
    # Parse both processingTimer.js and fileHashWorker.js patterns
    main_pattern = r'processingTimer\.js:\d+\s+([A-Z_]+):\s+(\d+)'
    worker_pattern = r'fileHashWorker\.js:\d+\s+([A-Z_]+):\s+(\d+)'
    
    main_matches = re.findall(main_pattern, content)
    worker_matches = re.findall(worker_pattern, content)
    
    # Combine and sort by position in content
    all_matches = []
    
    # Add main thread matches with position
    for match in re.finditer(main_pattern, content):
        event_type, timing = match.groups()
        all_matches.append((match.start(), event_type, int(timing), 'main'))
    
    # Add worker matches with position  
    for match in re.finditer(worker_pattern, content):
        event_type, timing = match.groups()
        all_matches.append((match.start(), event_type, int(timing), 'worker'))
    
    # Sort by position in content
    all_matches.sort(key=lambda x: x[0])
    
    # Group timing data by test runs (each PROCESSING_START begins a new test)
    test_run_data = defaultdict(dict)
    test_run_positions = {}
    current_test_run = 0
    
    for pos, event_type, timing, source in all_matches:
        if event_type == 'PROCESSING_START':
            current_test_run += 1
            test_run_positions[current_test_run] = pos
        
        if current_test_run > 0:  # Only process if we've seen a PROCESSING_START
            test_run_data[current_test_run][event_type] = timing
    
    # Convert to list of dictionaries with 3-stage calculations
    timing_data = []
    
    for test_run in sorted(test_run_data.keys()):
        data = test_run_data[test_run]
        
        # Detect execution mode
        start_pos = test_run_positions.get(test_run, 0)
        is_worker_mode = detect_execution_mode(content, start_pos)
        
        # Calculate 3-stage timings using simplified boundaries
        processing_start = data.get('PROCESSING_START', 0)
        deduplication_start = data.get('DEDUPLICATION_START')
        ui_update_start = data.get('UI_UPDATE_START')
        all_files_displayed = data.get('ALL_FILES_DISPLAYED')
        
        # Phase calculations (only if we have the required timestamps)
        phase1_duration = None  # File Analysis
        phase2_duration = None  # Hash Processing  
        phase3_duration = None  # UI Rendering
        total_duration = None
        
        if deduplication_start is not None:
            phase1_duration = deduplication_start - processing_start
            
        if ui_update_start is not None and deduplication_start is not None:
            phase2_duration = ui_update_start - deduplication_start
            
        if all_files_displayed is not None and ui_update_start is not None:
            phase3_duration = all_files_displayed - ui_update_start
            
        if all_files_displayed is not None:
            total_duration = all_files_displayed - processing_start
        
        # Create row with original timestamps + new 3-stage measurements
        row = {
            'Test Run #': test_run,
            'isWorkerMode': is_worker_mode,
            'totalDurationMs': total_duration,
            'phase1FileAnalysisMs': phase1_duration,
            'phase2HashProcessingMs': phase2_duration,
            'phase3UIRenderingMs': phase3_duration,
            # Original timestamps for reference
            'PROCESSING_START': processing_start,
            'DEDUPLICATION_START': deduplication_start,
            'UI_UPDATE_START': ui_update_start,
            'ALL_FILES_DISPLAYED': all_files_displayed
        }
        
        timing_data.append(row)
    
    return timing_data


def write_csv(data, output_path, fieldnames):
    """Write data to CSV file"""
    with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)


def main():
    if len(sys.argv) != 2:
        print("Usage: python parse_console_log.py input_file.md")
        sys.exit(1)
    
    input_path = Path(sys.argv[1])
    
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)
    
    # Extract prefix and create output paths
    prefix = extract_filename_prefix(input_path)
    output_dir = input_path.parent
    folder_analysis_file = output_dir / f"{prefix}_FolderAnalysisData.csv"
    test_speed_file = output_dir / f"{prefix}_TestSpeedData.csv"
    
    print(f"Processing: {input_path}")
    print(f"Output files:")
    print(f"  - {folder_analysis_file}")
    print(f"  - {test_speed_file}")
    
    # Read input file
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parse data
    print("Parsing FOLDER_ANALYSIS_DATA entries...")
    folder_data = parse_folder_analysis_data(content)
    print(f"Found {len(folder_data)} FOLDER_ANALYSIS_DATA entries")
    
    print("Parsing timing data entries...")
    timing_data = parse_timing_data(content)
    print(f"Found {len(timing_data)} timing test runs")
    
    # Write CSV files
    if folder_data:
        folder_fieldnames = [
            'TestRun#', 'timestamp', 'totalFiles', 'duplicateCandidateCount', 
            'duplicateCandidatePercent', 'uniqueFilesSizeMB', 'duplicateCandidatesSizeMB', 
            'totalSizeMB', 'totalDirectoryCount', 'maxDirectoryDepth', 'uniqueFilesTotal', 'avgDirectoryDepth'
        ]
        write_csv(folder_data, folder_analysis_file, folder_fieldnames)
        print(f"Exported {len(folder_data)} folder analysis records to CSV")
    
    if timing_data:
        timing_fieldnames = [
            'Test Run #', 'isWorkerMode', 'totalDurationMs', 
            'phase1FileAnalysisMs', 'phase2HashProcessingMs', 'phase3UIRenderingMs',
            'PROCESSING_START', 'DEDUPLICATION_START', 'UI_UPDATE_START', 'ALL_FILES_DISPLAYED'
        ]
        write_csv(timing_data, test_speed_file, timing_fieldnames)
        print(f"Exported {len(timing_data)} timing records with 3-stage measurements to CSV")
    
    print("Parsing complete!")


if __name__ == "__main__":
    main()