#!/usr/bin/env python3
"""
Improved parser to extract complete FOLDER_ANALYSIS_DATA from console logs
"""

import sys
import re
import csv
from pathlib import Path

def extract_complete_folder_data(content):
    """Extract complete FOLDER_ANALYSIS_DATA entries by finding the full object"""
    
    # Pattern to find the FOLDER_ANALYSIS_DATA line and capture what follows
    pattern = r'🔬 FOLDER_ANALYSIS_DATA \(Modal Predictors\): (.+?)(?=\n[^\s]|\n$)'
    matches = re.findall(pattern, content, re.DOTALL)
    
    print(f"Found {len(matches)} FOLDER_ANALYSIS_DATA matches")
    
    folder_data = []
    test_run = 1
    
    for i, match in enumerate(matches):
        print(f"\nProcessing match {i+1}:")
        print(f"Raw match: {match[:200]}...")
        
        # Try to extract data from the match
        data = {}
        
        # Extract common fields using more flexible patterns
        field_patterns = {
            'timestamp': r'timestamp:\s*([0-9]+)',
            'totalFiles': r'totalFiles:\s*([0-9]+)', 
            'duplicateCandidateCount': r'duplicateCandidateCount:\s*([0-9]+)',
            'duplicateCandidatePercent': r'duplicateCandidatePercent:\s*([0-9]+)',
            'uniqueFilesSizeMB': r'uniqueFilesSizeMB:\s*([0-9.]+)',
            'duplicateCandidatesSizeMB': r'duplicateCandidatesSizeMB:\s*([0-9.]+)',
            'totalSizeMB': r'totalSizeMB:\s*([0-9.]+)',
            'totalDirectoryCount': r'totalDirectoryCount:\s*([0-9]+)',
            'maxDirectoryDepth': r'maxDirectoryDepth:\s*([0-9]+)',
            'avgDirectoryDepth': r'avgDirectoryDepth:\s*([0-9.]+)',
            'uniqueFilesTotal': r'uniqueFilesTotal:\s*([0-9]+)'
        }
        
        for field, pattern in field_patterns.items():
            match_result = re.search(pattern, match)
            if match_result:
                value = match_result.group(1)
                if field in ['uniqueFilesSizeMB', 'duplicateCandidatesSizeMB', 'totalSizeMB', 'avgDirectoryDepth']:
                    data[field] = float(value)
                else:
                    data[field] = int(value)
                print(f"  {field}: {data[field]}")
            else:
                data[field] = 0 if field not in ['uniqueFilesSizeMB', 'duplicateCandidatesSizeMB', 'totalSizeMB', 'avgDirectoryDepth'] else 0.0
                print(f"  {field}: {data[field]} (default)")
        
        # Create row
        row = {
            'TestRun#': test_run,
            'timestamp': data['timestamp'],
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
    
    return folder_data

def show_sample_matches(content):
    """Show some sample matches to debug the parsing"""
    print("=== SAMPLE FOLDER_ANALYSIS_DATA ENTRIES ===")
    
    # Find lines containing FOLDER_ANALYSIS_DATA
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if '🔬 FOLDER_ANALYSIS_DATA' in line:
            print(f"\nLine {i+1}: {line}")
            # Show next few lines in case the data continues
            for j in range(1, 4):
                if i+j < len(lines):
                    print(f"Line {i+j+1}: {lines[i+j]}")

def main():
    if len(sys.argv) != 2:
        print("Usage: python improved_parser.py input_file.md")
        sys.exit(1)
    
    input_path = Path(sys.argv[1])
    
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)
    
    # Read input file
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print("=== DEBUGGING PARSER ===")
    show_sample_matches(content)
    
    print("\n=== EXTRACTING DATA ===")
    folder_data = extract_complete_folder_data(content)
    
    if folder_data:
        # Output to CSV
        output_file = input_path.parent / "4_ImprovedFolderData.csv"
        
        fieldnames = [
            'TestRun#', 'timestamp', 'totalFiles', 'duplicateCandidateCount', 
            'duplicateCandidatePercent', 'uniqueFilesSizeMB', 'duplicateCandidatesSizeMB', 
            'totalSizeMB', 'totalDirectoryCount', 'maxDirectoryDepth', 'uniqueFilesTotal', 'avgDirectoryDepth'
        ]
        
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(folder_data)
        
        print(f"\n=== RESULTS ===")
        print(f"Extracted {len(folder_data)} records")
        print(f"Saved to: {output_file}")
        
        # Show first few records
        print("\nFirst few records:")
        for i, record in enumerate(folder_data[:3]):
            print(f"Record {i+1}:")
            for field, value in record.items():
                print(f"  {field}: {value}")

if __name__ == "__main__":
    main()