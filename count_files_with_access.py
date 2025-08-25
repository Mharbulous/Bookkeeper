#!/usr/bin/env python3
"""
Count files and check which ones are actually accessible (not cloud-only).
This helps verify why browser-based apps might count fewer files.
"""

import os
import sys
from pathlib import Path

def check_file_accessibility(directory_path):
    """Check which files are accessible vs cloud-only."""
    directory = Path(directory_path)
    
    counts = {
        'total_files': 0,
        'accessible_files': 0,
        'cloud_only_files': 0,
        'permission_errors': 0,
        'cloud_files': [],
        'error_files': []
    }
    
    print(f"Checking file accessibility in: {directory}")
    print("-" * 50)
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            filepath = os.path.join(root, file)
            counts['total_files'] += 1
            
            try:
                # Try to actually read the file (like a browser would)
                with open(filepath, 'rb') as f:
                    # Just try to read first byte to verify accessibility
                    f.read(1)
                counts['accessible_files'] += 1
                
            except PermissionError as e:
                counts['permission_errors'] += 1
                counts['error_files'].append((filepath, "Permission denied"))
                
            except (FileNotFoundError, OSError) as e:
                # This typically indicates cloud-only files
                counts['cloud_only_files'] += 1
                counts['cloud_files'].append((filepath, str(e)))
    
    return counts

def print_accessibility_results(counts, directory_path):
    """Print file accessibility results."""
    print("\nFILE ACCESSIBILITY RESULTS")
    print("=" * 50)
    print(f"Directory: {directory_path}")
    print()
    print(f"Total files found:        {counts['total_files']:,}")
    print(f"Accessible files:         {counts['accessible_files']:,}")
    print(f"Cloud-only files:         {counts['cloud_only_files']:,}")
    print(f"Permission errors:        {counts['permission_errors']:,}")
    print()
    
    if counts['total_files'] > 0:
        accessible_percent = (counts['accessible_files'] / counts['total_files']) * 100
        cloud_percent = (counts['cloud_only_files'] / counts['total_files']) * 100
        
        print("PERCENTAGES:")
        print(f"Accessible files:         {accessible_percent:.1f}%")
        print(f"Cloud-only files:         {cloud_percent:.1f}%")
        print()
    
    # Show cloud-only files
    if counts['cloud_files']:
        print("CLOUD-ONLY FILES (not accessible to browser):")
        for filepath, error in counts['cloud_files'][:10]:  # First 10
            filename = os.path.basename(filepath)
            print(f"  {filename} - {error}")
        if len(counts['cloud_files']) > 10:
            print(f"  ... and {len(counts['cloud_files']) - 10} more")
        print()
    
    print(f"BROWSER-ACCESSIBLE COUNT: {counts['accessible_files']:,}")
    print("(This should match your web app's file count)")

def main():
    if len(sys.argv) != 2:
        print("Usage: python count_files_with_access.py <directory_path>")
        sys.exit(1)
    
    directory_path = sys.argv[1]
    
    try:
        counts = check_file_accessibility(directory_path)
        print_accessibility_results(counts, directory_path)
        
    except (FileNotFoundError, NotADirectoryError) as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()