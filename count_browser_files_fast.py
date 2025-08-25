#!/usr/bin/env python3
"""
Fast browser accessibility check - focuses on file attributes without actually reading files.
"""

import os
import sys
import stat
from pathlib import Path

def is_browser_accessible_fast(filepath):
    """
    Quick check if file would be accessible to browser without reading file content.
    """
    try:
        filename = os.path.basename(filepath)
        
        # Quick filename checks first (fastest)
        if filename.startswith('.'):
            return False, "Hidden (dot file)"
        
        if filename.lower() in ['thumbs.db', 'desktop.ini', '.ds_store']:
            return False, "System metadata"
        
        if filename.startswith('~') or filename.endswith('.tmp'):
            return False, "Temp file"
        
        # Get file stats (but don't read content)
        try:
            file_stat = os.stat(filepath)
        except (FileNotFoundError, OSError) as e:
            return False, f"File not accessible: {str(e)[:50]}"
        except PermissionError:
            return False, "Permission denied"
        
        # Check Windows file attributes if available
        if hasattr(file_stat, 'st_file_attributes'):
            attrs = file_stat.st_file_attributes
            
            if attrs & stat.FILE_ATTRIBUTE_HIDDEN:
                return False, "Hidden file (Windows)"
            
            if attrs & stat.FILE_ATTRIBUTE_SYSTEM:
                return False, "System file (Windows)"
            
            if attrs & stat.FILE_ATTRIBUTE_TEMPORARY:
                return False, "Temporary file"
            
            # OneDrive/cloud specific attributes
            if attrs & stat.FILE_ATTRIBUTE_OFFLINE:
                return False, "Cloud file (offline)"
            
            # Check for recall on access (cloud placeholders)
            if hasattr(stat, 'FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS'):
                if attrs & stat.FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS:
                    return False, "Cloud placeholder"
            
            # Reparse points (often cloud files or symlinks)
            if attrs & stat.FILE_ATTRIBUTE_REPARSE_POINT:
                return False, "Reparse point (likely cloud)"
        
        return True, "Accessible"
        
    except Exception as e:
        return False, f"Error: {str(e)[:30]}"

def count_browser_files_fast(directory_path):
    """Fast count without reading file contents."""
    directory = Path(directory_path)
    
    counts = {
        'total_files': 0,
        'browser_accessible': 0,
        'exclusions': {},
        'examples': []
    }
    
    print(f"Fast analysis of: {directory}")
    print("-" * 50)
    
    file_count = 0
    for root, dirs, files in os.walk(directory):
        for file in files:
            filepath = os.path.join(root, file)
            counts['total_files'] += 1
            file_count += 1
            
            # Progress indicator
            if file_count % 100 == 0:
                print(f"Processed {file_count} files...", end='\r')
            
            accessible, reason = is_browser_accessible_fast(filepath)
            
            if accessible:
                counts['browser_accessible'] += 1
            else:
                # Track exclusion reasons
                counts['exclusions'][reason] = counts['exclusions'].get(reason, 0) + 1
                
                # Keep some examples
                if len(counts['examples']) < 15:
                    counts['examples'].append((filepath, reason))
    
    print()  # New line after progress
    return counts

def print_fast_results(counts, directory_path):
    """Print results from fast analysis."""
    print("\nFAST BROWSER ACCESSIBILITY RESULTS")
    print("=" * 50)
    print(f"Directory: {directory_path}")
    print()
    
    excluded = counts['total_files'] - counts['browser_accessible']
    
    print(f"Total files found:        {counts['total_files']:,}")
    print(f"Browser-accessible:       {counts['browser_accessible']:,}")
    print(f"Excluded files:           {excluded:,}")
    print()
    
    if counts['total_files'] > 0:
        accessible_percent = (counts['browser_accessible'] / counts['total_files']) * 100
        print(f"Accessibility rate:       {accessible_percent:.1f}%")
        print()
    
    if counts['exclusions']:
        print("EXCLUSION REASONS:")
        sorted_exclusions = sorted(counts['exclusions'].items(), key=lambda x: x[1], reverse=True)
        for reason, count in sorted_exclusions:
            print(f"  {reason}: {count:,} files")
        print()
    
    if counts['examples']:
        print("EXAMPLE EXCLUDED FILES:")
        for filepath, reason in counts['examples']:
            filename = os.path.basename(filepath)
            print(f"  {filename} - {reason}")
        print()
    
    print("🎯 EXPECTED WEB APP COUNT:", counts['browser_accessible'])
    
    # Compare with user's web app count
    web_app_count = 689
    if counts['browser_accessible'] == web_app_count:
        print("✅ MATCHES your web app's count - your app is working correctly!")
    else:
        diff = abs(counts['browser_accessible'] - web_app_count)
        print(f"❓ Differs from web app count by {diff} files - may need investigation")

def main():
    if len(sys.argv) != 2:
        print("Usage: python count_browser_files_fast.py <directory_path>")
        sys.exit(1)
    
    directory_path = sys.argv[1]
    
    try:
        print("Starting fast browser accessibility analysis...")
        counts = count_browser_files_fast(directory_path)
        print_fast_results(counts, directory_path)
        
    except KeyboardInterrupt:
        print("\nAnalysis interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()