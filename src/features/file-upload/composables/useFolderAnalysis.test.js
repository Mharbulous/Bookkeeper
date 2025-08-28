import { describe, it, expect } from 'vitest';
import { useFolderAnalysis } from './useFolderAnalysis.js';

describe('useFolderAnalysis', () => {
  const { preprocessFileData, calculateFileSizeMetrics, calculateFilenameStats } = useFolderAnalysis();

  const mockFiles = [
    { file: { size: 1024 }, path: 'documents/report.pdf' },
    { file: { size: 2048 }, path: 'images/photo.jpg' },
    { file: { size: 1024 }, path: 'documents/backup/report-backup.pdf' },
    { file: { size: 0 }, path: 'empty-file.txt' },
  ];

  it('preprocessFileData returns correct directory stats', () => {
    const result = preprocessFileData(mockFiles);

    expect(result.directoryStats).toEqual({
      totalDirectoryCount: 4, // documents, documents/backup, images, root
      maxFileDepth: 2,
      avgFileDepth: 1.3,
      avgDirectoryDepth: 1.3,
    });

    expect(result.folderStats).toEqual({
      rootFolderCount: 2, // documents, images
      hasSubfolders: true,
    });
  });

  it('calculateFileSizeMetrics returns correct metrics', () => {
    const result = calculateFileSizeMetrics(mockFiles);

    expect(result).toEqual({
      totalSizeMB: 0.004,
      uniqueFiles: 3,
      identicalSizeFiles: 1,
      zeroByteFiles: 1,
      largestFileSizesMB: [2, 1, 1, 0],
    });
  });

  it('calculateFilenameStats returns correct filename length', () => {
    const result = calculateFilenameStats(mockFiles);

    expect(result.avgFilenameLength).toBeCloseTo(16.3, 1);
  });
});