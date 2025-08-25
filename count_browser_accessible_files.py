#!/usr/bin/env python3
"""
Count files using browser-like accessibility criteria.
This simulates what a web browser can actually see when a user selects a folder.
"""

import os
import sys
import stat
from pathlib import Path

def is_browser_accessible(filepath):
    """
    Check if a file would be accessible to a browser-based app.
    Browsers typically cannot access:
    1. Hidden files (Windows FILE_ATTRIBUTE_HIDDEN)
    2. System files (Windows FILE_ATTRIBUTE_SYSTEM) 
    3. Files with restricted permissions
    4. Certain file types that browsers block
    5. Files in system directories
    6. Temp files and other OS-specific exclusions
    """
    try:
        # Get file stats
        file_stat = os.stat(filepath)
        
        # Check Windows file attributes
        if hasattr(file_stat, 'st_file_attributes'):
            attrs = file_stat.st_file_attributes
            
            # Hidden files - browsers typically can't access these
            if attrs & stat.FILE_ATTRIBUTE_HIDDEN:
                return False, "Hidden file"
            
            # System files - browsers typically can't access these  
            if attrs & stat.FILE_ATTRIBUTE_SYSTEM:
                return False, "System file"
            
            # Temporary files - browsers might skip these
            if attrs & stat.FILE_ATTRIBUTE_TEMPORARY:
                return False, "Temporary file"
            
            # Offline files (OneDrive/cloud placeholders) 
            if attrs & stat.FILE_ATTRIBUTE_OFFLINE:
                return False, "Offline/cloud placeholder"
            
            # Recall on data access (cloud files)
            if hasattr(stat, 'FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS'):
                if attrs & stat.FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS:
                    return False, "Cloud recall file"
        
        # Check filename patterns browsers might exclude
        filename = os.path.basename(filepath)
        
        # Files starting with dot (Unix-style hidden)
        if filename.startswith('.'):
            return False, "Dot file (Unix hidden)"
        
        # Windows temp files
        if filename.startswith('~') and filename.endswith('.tmp'):
            return False, "Temp file"
        
        # Thumbs.db and desktop.ini (Windows system files)
        if filename.lower() in ['thumbs.db', 'desktop.ini', '.ds_store']:
            return False, "System metadata file"
        
        # Try to access the file like a browser would
        try:
            # Check if file can be opened (permission check)
            with open(filepath, 'rb') as f:
                # Try to read first byte
                f.read(1)
        except PermissionError:
            return False, "Permission denied"
        except (FileNotFoundError, OSError) as e:
            return False, f"File access error: {e}"
        
        return True, "Accessible"
        
    except Exception as e:
        return False, f"Stat error: {e}"

def analyze_browser_accessibility(directory_path):
    """Analyze which files would be accessible to a browser."""
    directory = Path(directory_path)
    
    counts = {
        'total_files': 0,
        'browser_accessible': 0,
        'hidden_files': 0,
        'system_files': 0,
        'permission_denied': 0,
        'cloud_files': 0,
        'temp_files': 0,
        'other_excluded': 0,
        'exclusion_reasons': {},
        'excluded_examples': []
    }
    
    print(f"Analyzing browser accessibility: {directory}")
    print("-" * 60)
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            filepath = os.path.join(root, file)
            counts['total_files'] += 1
            
            accessible, reason = is_browser_accessible(filepath)
            
            if accessible:
                counts['browser_accessible'] += 1
            else:
                # Categorize the exclusion reason
                if 'hidden' in reason.lower():
                    counts['hidden_files'] += 1
                elif 'system' in reason.lower():
                    counts['system_files'] += 1
                elif 'permission' in reason.lower():
                    counts['permission_denied'] += 1
                elif 'cloud' in reason.lower() or 'offline' in reason.lower():
                    counts['cloud_files'] += 1
                elif 'temp' in reason.lower():
                    counts['temp_files'] += 1
                else:
                    counts['other_excluded'] += 1
                
                # Track exclusion reasons
                counts['exclusion_reasons'][reason] = counts['exclusion_reasons'].get(reason, 0) + 1
                
                # Keep some examples
                if len(counts['excluded_examples']) < 20:
                    counts['excluded_examples'].append((filepath, reason))
    
    return counts

def print_browser_analysis(counts, directory_path):
    """Print browser accessibility analysis."""
    print("\nBROWSER ACCESSIBILITY ANALYSIS")
    print("=" * 60)
    print(f"Directory: {directory_path}")
    print()
    
    print("FILE COUNTS:")
    print(f"Total files in directory:     {counts['total_files']:,}")
    print(f"Browser-accessible files:     {counts['browser_accessible']:,}")
    print(f"Excluded files:               {counts['total_files'] - counts['browser_accessible']:,}")
    print()
    
    print("EXCLUSION BREAKDOWN:")
    print(f"Hidden files:                 {counts['hidden_files']:,}")
    print(f"System files:                 {counts['system_files']:,}")
    print(f"Cloud/offline files:          {counts['cloud_files']:,}")
    print(f"Permission denied:            {counts['permission_denied']:,}")
    print(f"Temp files:                   {counts['temp_files']:,}")
    print(f"Other exclusions:             {counts['other_excluded']:,}")
    print()
    
    if counts['total_files'] > 0:
        accessible_percent = (counts['browser_accessible'] / counts['total_files']) * 100
        print(f"Browser accessibility rate:   {accessible_percent:.1f}%")
        print()
    
    print("TOP EXCLUSION REASONS:")
    sorted_reasons = sorted(counts['exclusion_reasons'].items(), key=lambda x: x[1], reverse=True)
    for reason, count in sorted_reasons[:10]:
        print(f"  {reason}: {count:,} files")
    print()
    
    if counts['excluded_examples']:
        print("EXAMPLE EXCLUDED FILES:")
        for filepath, reason in counts['excluded_examples'][:10]:
            filename = os.path.basename(filepath)
            print(f"  {filename} - {reason}")
        if len(counts['excluded_examples']) > 10:
            print(f"  ... and {len(counts['excluded_examples']) - 10} more")
        print()
    
    print("🎯 EXPECTED WEB APP FILE COUNT:", counts['browser_accessible'])
    print("   (This should match your web application's count)")

def main():
    if len(sys.argv) != 2:
        print("Usage: python count_browser_accessible_files.py <directory_path>")
        print()
        print("This script simulates browser accessibility limitations to help")
        print("identify why a web app might count fewer files than os.walk().")
        sys.exit(1)
    
    directory_path = sys.argv[1]
    
    try:
        counts = analyze_browser_accessibility(directory_path)
        print_browser_analysis(counts, directory_path)
        
    except (FileNotFoundError, NotADirectoryError) as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()