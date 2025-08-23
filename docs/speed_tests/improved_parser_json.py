#!/usr/bin/env python3
"""
Improved parser for JSON-formatted console logs
Handles the new non-truncated FOLDER_ANALYSIS_DATA format
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

def parse_json_folder_analysis_data(content):
    """Parse JSON-formatted FOLDER_ANALYSIS_DATA entries from console log"""
    # Updated pattern for JSON format
    pattern = r'🔬 FOLDER_ANALYSIS_DATA: ({.+?})'
    matches = re.findall(pattern, content, re.DOTALL)
    
    folder_data = []
    test_run = 1
    
    print(f"Found {len(matches)} JSON FOLDER_ANALYSIS_DATA entries")
    
    for match in matches:
        try:
            # Parse the JSON data
            data = json.loads(match)
            
            # Create row with all available fields
            row = {
                'TestRun#': test_run,
                'timestamp': data.get('timestamp', 0),
                'totalFiles': data.get('totalFiles', 0),
                'duplicateCandidateCount': data.get('duplicateCandidateCount', 0), 
                'duplicateCandidatePercent': data.get('duplicateCandidatePercent', 0),
                'uniqueFilesSizeMB': data.get('uniqueFilesSizeMB', 0.0),
                'duplicateCandidatesSizeMB': data.get('duplicateCandidatesSizeMB', 0.0),
                'totalSizeMB': data.get('totalSizeMB', 0.0),
                'totalDirectoryCount': data.get('totalDirectoryCount', 0),
                'avgDirectoryDepth': data.get('avgDirectoryDepth', 0.0),
                'maxDirectoryDepth': data.get('maxDirectoryDepth', 0),
                'uniqueFilesTotal': data.get('uniqueFilesTotal', 0),
                'maxFileDepth': data.get('maxFileDepth', 0),
                'avgFileDepth': data.get('avgFileDepth', 0.0),
                'avgFilenameLength': data.get('avgFilenameLength', 0.0),
                'zeroByteFiles': data.get('zeroByteFiles', 0),
                'largestFileSizesMB': data.get('largestFileSizesMB', 0.0)
            }
            
            folder_data.append(row)
            test_run += 1
            
            print(f"  Entry {test_run-1}: {data.get('totalFiles', 0)} files, {data.get('duplicateCandidateCount', 0)} candidates, {data.get('totalSizeMB', 0):.1f}MB total")
            
        except json.JSONDecodeError as e:
            print(f"Warning: Failed to parse JSON FOLDER_ANALYSIS_DATA: {match[:100]}... - {e}")
        except Exception as e:
            print(f"Warning: Error processing FOLDER_ANALYSIS_DATA: {e}")
    
    return folder_data

def parse_timing_data(content):
    """Parse timing data entries from console log"""
    # Same timing parsing logic as before
    main_pattern = r'processingTimer\.js:\d+\s+([A-Z_]+):\s+(\d+)'
    worker_pattern = r'fileHashWorker\.js:\d+\s+([A-Z_]+):\s+(\d+)'
    
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
    
    # Group timing data by test runs
    test_run_data = defaultdict(dict)
    test_run_positions = {}
    current_test_run = 0
    
    for pos, event_type, timing, source in all_matches:
        if event_type == 'PROCESSING_START':
            current_test_run += 1
            test_run_positions[current_test_run] = pos
        
        if current_test_run > 0:
            test_run_data[current_test_run][event_type] = timing
    
    # Convert to list with 3-stage calculations
    timing_data = []
    
    for test_run in sorted(test_run_data.keys()):
        data = test_run_data[test_run]
        
        # Detect execution mode (simplified)
        start_pos = test_run_positions.get(test_run, 0)
        search_window = content[start_pos:start_pos + 3000]
        is_worker_mode = 'Web Worker restart failed' in search_window or 'fileHashWorker.js' in search_window
        
        # Calculate 3-stage timings
        processing_start = data.get('PROCESSING_START', 0)
        deduplication_start = data.get('DEDUPLICATION_START')
        ui_update_start = data.get('UI_UPDATE_START')
        all_files_displayed = data.get('ALL_FILES_DISPLAYED')
        
        phase1_duration = deduplication_start - processing_start if deduplication_start is not None else None
        phase2_duration = ui_update_start - deduplication_start if ui_update_start is not None and deduplication_start is not None else None
        phase3_duration = all_files_displayed - ui_update_start if all_files_displayed is not None and ui_update_start is not None else None
        total_duration = all_files_displayed - processing_start if all_files_displayed is not None else None
        
        row = {
            'Test Run #': test_run,
            'isWorkerMode': is_worker_mode,
            'totalDurationMs': total_duration,
            'phase1FileAnalysisMs': phase1_duration,
            'phase2HashProcessingMs': phase2_duration,
            'phase3UIRenderingMs': phase3_duration,
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
        print("Usage: python improved_parser_json.py input_file.md")
        sys.exit(1)
    
    input_path = Path(sys.argv[1])
    
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)
    
    # Extract prefix and create output paths
    prefix = extract_filename_prefix(input_path)
    output_dir = input_path.parent
    folder_analysis_file = output_dir / f"{prefix}_CompleteFolderAnalysisData.csv"
    test_speed_file = output_dir / f"{prefix}_TestSpeedData.csv"
    
    print(f"Processing: {input_path}")
    print(f"Output files:")
    print(f"  - {folder_analysis_file}")
    print(f"  - {test_speed_file}")
    print()
    
    # Read input file
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parse data
    print("Parsing JSON FOLDER_ANALYSIS_DATA entries...")
    folder_data = parse_json_folder_analysis_data(content)
    
    print("\nParsing timing data entries...")
    timing_data = parse_timing_data(content)
    print(f"Found {len(timing_data)} timing test runs")
    print()
    
    # Write CSV files
    if folder_data:
        folder_fieldnames = [
            'TestRun#', 'timestamp', 'totalFiles', 'duplicateCandidateCount', 
            'duplicateCandidatePercent', 'uniqueFilesSizeMB', 'duplicateCandidatesSizeMB', 
            'totalSizeMB', 'totalDirectoryCount', 'avgDirectoryDepth', 'maxDirectoryDepth',
            'uniqueFilesTotal', 'maxFileDepth', 'avgFileDepth', 'avgFilenameLength', 
            'zeroByteFiles', 'largestFileSizesMB'
        ]
        write_csv(folder_data, folder_analysis_file, folder_fieldnames)
        print(f"✅ Exported {len(folder_data)} COMPLETE folder analysis records to CSV")
        
        # Show sample of what we now have
        if folder_data:
            sample = folder_data[0]
            print(f"\nSample complete record:")
            for key, value in sample.items():
                if key in ['duplicateCandidatesSizeMB', 'totalSizeMB', 'avgDirectoryDepth', 'maxDirectoryDepth']:
                    print(f"  🎯 {key}: {value} (previously missing!)")
    else:
        print("❌ No JSON folder analysis data found")
    
    if timing_data:
        timing_fieldnames = [
            'Test Run #', 'isWorkerMode', 'totalDurationMs', 
            'phase1FileAnalysisMs', 'phase2HashProcessingMs', 'phase3UIRenderingMs',
            'PROCESSING_START', 'DEDUPLICATION_START', 'UI_UPDATE_START', 'ALL_FILES_DISPLAYED'
        ]
        write_csv(timing_data, test_speed_file, timing_fieldnames)
        print(f"✅ Exported {len(timing_data)} timing records to CSV")
    else:
        print("❌ No timing data found")
    
    print(f"\n🎉 Parsing complete! Now you can run calibration with COMPLETE data.")

if __name__ == "__main__":
    main()