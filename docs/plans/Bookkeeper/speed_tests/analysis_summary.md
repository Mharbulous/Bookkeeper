# File Processing Time Estimation - Analysis Summary

## Key Findings

### Data Quality Assessment
- **Console data extraction**: Successfully parsed 12 test runs with complete timing data
- **File size data**: Available as `uniqueFilesSizeMB` (3.0 - 1482.5 MB range)
- **Missing fields**: `duplicateCandidatesSizeMB`, `totalSizeMB`, `avgDirectoryDepth` not captured due to console truncation

### Correlation Analysis
- **File count vs Duration**: 0.957 (very strong correlation)
- **File size vs Duration**: 0.806 (strong correlation) 
- **Duplicate candidates vs Duration**: -0.025 (no correlation)

### Model Performance Comparison

| Model Type | Mean Accuracy | Median Accuracy | Mean Absolute Error |
|------------|---------------|-----------------|---------------------|
| Original Formula | 25% | 25% | 1360ms |
| Simple File-Count | **83.6%** | **94.5%** | **172ms** |
| Mixed File+Size | -21.4% | 32.5% | 939ms |

### Optimal Formula (File-Count Based)
The simple file-count approach dramatically outperforms size-based models:

```javascript
// Phase 1: File Analysis
const PHASE1_FILE_TIME_MS = 0.010

// Phase 2: Hash Processing  
const PHASE2_CANDIDATE_TIME_MS = 4.843

// Phase 3: UI Rendering
const PHASE3_FILE_TIME_MS = 4.186

// Total calculation
phase1Time = files.length * 0.010
phase2Time = duplicateCandidates.length * 4.843  
phase3Time = files.length * 4.186
totalEstimatedTime = phase1Time + phase2Time + phase3Time
```

### Why File Count Wins Over File Size

1. **Processing is I/O bound by file operations**, not data transfer
2. **Each file requires discrete operations**: path parsing, metadata extraction, queue management
3. **Hash processing is candidate-count driven**: Most files skip hashing due to unique sizes
4. **UI rendering scales with file count**: Each file needs DOM elements regardless of size

### Implementation Recommendation

**Stick with the file-count based formula** that achieves 83.6% accuracy:
- Simple to implement and understand
- Robust across different dataset sizes  
- Accounts for actual processing bottlenecks (file operations, not data size)
- Strong predictive correlation (R² = 0.957 for file count vs total duration)

### Data Architecture Insights

The console data reveals the actual processing pipeline:
- `uniqueFilesSizeMB`: Total size of files that skip hash processing (unique sizes)
- `duplicateCandidateCount`: Number of files requiring hash verification  
- Processing time dominated by file count, not file sizes

This validates the architectural decision to use size-based pre-filtering followed by count-based processing estimates.