#!/usr/bin/env python3
"""
Generate performance analysis graphs from test results data.
"""

import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

# Test data from reliable console logs
test_data = [
    # (files_after_dedup, web_worker_time_ms, ui_update_time_ms, total_time_ms)
    (3305, 2347, 13121, 15468),  # 3400 files input
    (2695, 11238, 10426, 21664), # 2994 files input  
    (707, 179, 3403, 3582),      # 707 files input
    (483, 76, 2588, 2664),       # 488 files input
    (95, 38, 0, 38),             # 95 files input
    (24, 32, 1, 33),             # 24 files input
]

# Extract arrays for plotting - all data uses Web Worker with 2-chunk UI strategy
files = [d[0] for d in test_data]
worker_times = [d[1] for d in test_data]
ui_times = [d[2] for d in test_data]
total_times = [d[3] for d in test_data]

# Create the figure with subplots
fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))
fig.suptitle('File Processing Performance Analysis', fontsize=16, fontweight='bold')

# Plot 1: Web Worker Processing Time vs File Count
ax1.scatter(files, worker_times, color='blue', label='Web Worker Processing', s=60, alpha=0.7)
ax1.set_xlabel('Number of Files (After Deduplication)')
ax1.set_ylabel('Web Worker Time (ms)')
ax1.set_title('Web Worker Performance vs File Count')
ax1.legend()
ax1.grid(True, alpha=0.3)

# Add trend line
if len(files) > 1:
    worker_fit = np.polyfit(files, worker_times, 1)
    worker_trend = np.poly1d(worker_fit)
    x_range = np.linspace(min(files), max(files), 100)
    ax1.plot(x_range, worker_trend(x_range), 'b--', alpha=0.8, 
             label=f'Trend: {worker_fit[0]:.3f}ms/file')
    ax1.legend()

# Plot 2: UI Update Time vs File Count
ax2.scatter(files, ui_times, color='red', label='UI Update Time', s=60, alpha=0.7)
ax2.set_xlabel('Number of Files (After Deduplication)')
ax2.set_ylabel('UI Update Time (ms)')
ax2.set_title('UI Update Performance vs File Count')
ax2.legend()
ax2.grid(True, alpha=0.3)

# Add trend line for UI times (excluding 0ms values for better fit)
ui_files_nonzero = [f for f, ui in zip(files, ui_times) if ui > 0]
ui_times_nonzero = [ui for ui in ui_times if ui > 0]
if len(ui_files_nonzero) > 1:
    ui_fit = np.polyfit(ui_files_nonzero, ui_times_nonzero, 1)
    ui_trend = np.poly1d(ui_fit)
    x_range = np.linspace(min(ui_files_nonzero), max(ui_files_nonzero), 100)
    ax2.plot(x_range, ui_trend(x_range), 'r--', alpha=0.8, 
             label=f'Trend: {ui_fit[0]:.2f}ms/file')
    ax2.legend()

# Plot 3: Total Processing Time vs File Count
ax3.scatter(files, total_times, color='green', label='Total Time', s=60, alpha=0.7)
ax3.set_xlabel('Number of Files (After Deduplication)')
ax3.set_ylabel('Total Processing Time (ms)')
ax3.set_title('Total Processing Time vs File Count')
ax3.legend()
ax3.grid(True, alpha=0.3)

# Add trend line
if len(files) > 1:
    total_fit = np.polyfit(files, total_times, 1)
    total_trend = np.poly1d(total_fit)
    x_range = np.linspace(min(files), max(files), 100)
    ax3.plot(x_range, total_trend(x_range), 'g--', alpha=0.8, 
             label=f'Trend: {total_fit[0]:.2f}ms/file')
    ax3.legend()

# Plot 4: Component Breakdown (Stacked Bar)
bar_width = 0.6
indices = np.arange(len(files))

# Create stacked bars
ax4.bar(indices, worker_times, bar_width, label='Web Worker', color='blue', alpha=0.7)
ax4.bar(indices, ui_times, bar_width, bottom=worker_times, label='UI Update', color='red', alpha=0.7)

ax4.set_xlabel('Test Case')
ax4.set_ylabel('Processing Time (ms)')
ax4.set_title('Processing Time Breakdown by Component')
ax4.set_xticks(indices)
ax4.set_xticklabels([f'{f} files' for f in files], rotation=45)
ax4.legend()
ax4.grid(True, alpha=0.3)

plt.tight_layout()

# Save the graph
output_path = Path(__file__).parent / 'performance_analysis_graph.png'
plt.savefig(output_path, dpi=300, bbox_inches='tight')
print(f"Graph saved to: {output_path}")

# Calculate and print statistics
print("\n=== PERFORMANCE ANALYSIS ===")
print(f"Web Worker average rate: {np.mean(ww_rates):.2f} ms/file")
print(f"Main Thread average rate (no outlier): {np.mean([r for r in mt_rates if r < 10]):.2f} ms/file")

# Prediction models
if len(mt_files_no_outlier) > 1:
    mt_fit = np.polyfit(mt_files_no_outlier, mt_times_no_outlier, 1)
    print(f"\nMain Thread prediction formula: {mt_fit[0]:.3f} * files + {mt_fit[1]:.1f}")
    print(f"Estimated time for 5000 files: {mt_fit[0] * 5000 + mt_fit[1]:.0f}ms ({(mt_fit[0] * 5000 + mt_fit[1])/1000:.1f}s)")

plt.show()