#!/usr/bin/env python3
"""
Count hidden files in a folder and its subfolders.
This script helps verify that files missed by the dedup/queue process
are primarily hidden files and system files.
"""

import os
import sys
import stat
from pathlib import Path
import argparse

def is_hidden_windows(filepath):
    """Check if a file is hidden on Windows using file attributes."""
    try:
        attrs = os.stat(filepath).st_file_attributes
        return attrs & stat.FILE_ATTRIBUTE_HIDDEN
    except (OSError, AttributeError):
        return False

def is_hidden_unix(filepath):
    """Check if a file is hidden on Unix-like systems (starts with dot)."""
    return os.path.basename(filepath).startswith('.')

def is_system_file_windows(filepath):
    """Check if a file is a system file on Windows."""
    try:
        attrs = os.stat(filepath).st_file_attributes
        return attrs & stat.FILE_ATTRIBUTE_SYSTEM
    except (OSError, AttributeError):
        return False

def count_files_in_directory(directory_path):
    """
    Count all files, hidden files, and system files in a directory and subdirectories.
    Returns a dictionary with counts.
    """
    directory = Path(directory_path)
    
    if not directory.exists():
        raise FileNotFoundError(f"Directory not found: {directory_path}")
    
    if not directory.is_dir():
        raise NotADirectoryError(f"Path is not a directory: {directory_path}")
    
    counts = {
        'total_files': 0,
        'hidden_files': 0,
        'system_files': 0,
        'visible_files': 0,
        'errors': 0,
        'error_files': []
    }
    
    # Determine platform-specific hidden file detection
    is_windows = os.name == 'nt'
    is_hidden_func = is_hidden_windows if is_windows else is_hidden_unix
    
    print(f"Scanning directory: {directory}")
    print(f"Platform: {'Windows' if is_windows else 'Unix-like'}")
    print("-" * 50)
    
    try:
        for root, dirs, files in os.walk(directory):
            for file in files:
                filepath = os.path.join(root, file)
                counts['total_files'] += 1
                
                try:
                    is_hidden = is_hidden_func(filepath)
                    is_system = is_system_file_windows(filepath) if is_windows else False
                    
                    if is_hidden:
                        counts['hidden_files'] += 1
                    if is_system:
                        counts['system_files'] += 1
                    if not is_hidden and not is_system:
                        counts['visible_files'] += 1
                        
                except (OSError, PermissionError) as e:
                    counts['errors'] += 1
                    counts['error_files'].append((filepath, str(e)))
                    
    except (OSError, PermissionError) as e:
        print(f"Error accessing directory: {e}")
        return counts
    
    return counts

def print_results(counts, directory_path):
    """Print the file count results in a formatted way."""
    print("\nFILE COUNT RESULTS")
    print("=" * 50)
    print(f"Directory scanned: {directory_path}")
    print()
    print(f"Total files found:     {counts['total_files']:,}")
    print(f"Visible files:         {counts['visible_files']:,}")
    print(f"Hidden files:          {counts['hidden_files']:,}")
    print(f"System files:          {counts['system_files']:,}")
    print(f"Access errors:         {counts['errors']:,}")
    print()
    
    if counts['total_files'] > 0:
        hidden_percent = (counts['hidden_files'] / counts['total_files']) * 100
        system_percent = (counts['system_files'] / counts['total_files']) * 100
        visible_percent = (counts['visible_files'] / counts['total_files']) * 100
        
        print("PERCENTAGES:")
        print(f"Visible files:         {visible_percent:.1f}%")
        print(f"Hidden files:          {hidden_percent:.1f}%")
        print(f"System files:          {system_percent:.1f}%")
        print()
    
    # Show some example hidden/system files if found
    if counts['error_files']:
        print("FILES WITH ACCESS ERRORS:")
        for filepath, error in counts['error_files'][:5]:  # Show first 5
            print(f"  {filepath}: {error}")
        if len(counts['error_files']) > 5:
            print(f"  ... and {len(counts['error_files']) - 5} more")
        print()

def main():
    parser = argparse.ArgumentParser(
        description="Count hidden files in a directory and subdirectories"
    )
    parser.add_argument(
        "directory",
        nargs="?",
        default=".",
        help="Directory to scan (default: current directory)"
    )
    parser.add_argument(
        "--show-examples",
        action="store_true",
        help="Show examples of hidden files found"
    )
    
    args = parser.parse_args()
    
    try:
        counts = count_files_in_directory(args.directory)
        print_results(counts, args.directory)
        
        if args.show_examples and counts['hidden_files'] > 0:
            print("EXAMPLE HIDDEN FILES:")
            # Re-scan to show examples
            directory = Path(args.directory)
            is_windows = os.name == 'nt'
            is_hidden_func = is_hidden_windows if is_windows else is_hidden_unix
            
            examples_shown = 0
            for root, dirs, files in os.walk(directory):
                for file in files:
                    filepath = os.path.join(root, file)
                    try:
                        if is_hidden_func(filepath):
                            print(f"  {filepath}")
                            examples_shown += 1
                            if examples_shown >= 10:  # Limit to 10 examples
                                break
                    except (OSError, PermissionError):
                        continue
                if examples_shown >= 10:
                    break
            
            if examples_shown >= 10:
                print("  ... (showing first 10 hidden files)")
            print()
        
    except (FileNotFoundError, NotADirectoryError) as e:
        print(f"Error: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nScan interrupted by user")
        sys.exit(1)

if __name__ == "__main__":
    main()