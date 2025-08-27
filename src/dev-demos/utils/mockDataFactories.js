/**
 * Mock data factories for generating realistic test data in dev demos
 * These utilities create representative data that mirrors real-world usage patterns
 */

export const fileTypeTemplates = [
  { type: 'application/pdf', ext: 'pdf', name: 'document', icon: 'mdi-file-pdf-box' },
  { type: 'image/jpeg', ext: 'jpg', name: 'photo', icon: 'mdi-file-image-outline' },
  { type: 'image/png', ext: 'png', name: 'screenshot', icon: 'mdi-file-image-outline' },
  { type: 'application/msword', ext: 'doc', name: 'report', icon: 'mdi-file-word-outline' },
  { type: 'text/plain', ext: 'txt', name: 'notes', icon: 'mdi-file-document-outline' },
  { type: 'video/mp4', ext: 'mp4', name: 'video', icon: 'mdi-file-video-outline' },
  { type: 'audio/mp3', ext: 'mp3', name: 'audio', icon: 'mdi-file-music-outline' },
  {
    type: 'application/vnd.ms-excel',
    ext: 'xlsx',
    name: 'spreadsheet',
    icon: 'mdi-file-excel-outline',
  },
  { type: 'application/zip', ext: 'zip', name: 'archive', icon: 'mdi-folder-zip-outline' },
];

export const folderTemplates = [
  '/documents/projects',
  '/images/photos',
  '/videos/recordings',
  '/audio/music',
  '/archives/backup',
  '/downloads/temp',
  '/presentations/slides',
  '/spreadsheets/data',
  '/contracts/legal',
  '/reports/monthly',
];

export const statusOptions = [
  { status: 'ready', weight: 40 },
  { status: 'pending', weight: 25 },
  { status: 'processing', weight: 15 },
  { status: 'completed', weight: 10 },
  { status: 'error', weight: 5 },
  { status: 'uploading', weight: 5 },
];

/**
 * Generate a realistic file object for testing
 */
export function createMockFile(index, options = {}) {
  const {
    duplicateRate = 0.15,
    previousUploadRate = 0.1,
    minSize = 1024,
    maxSize = 10000000,
    dateRangeMonths = 12,
  } = options;

  const fileType = fileTypeTemplates[index % fileTypeTemplates.length];
  const folder = folderTemplates[index % folderTemplates.length];
  const isDuplicate = Math.random() < duplicateRate;
  const isPreviousUpload = Math.random() < previousUploadRate;

  // Weighted random status selection
  const randomWeight = Math.random() * 100;
  let cumulativeWeight = 0;
  let selectedStatus = 'ready';

  for (const { status, weight } of statusOptions) {
    cumulativeWeight += weight;
    if (randomWeight <= cumulativeWeight) {
      selectedStatus = status;
      break;
    }
  }

  const file = {
    id: `mock-file-${index}`,
    name: `${fileType.name}_${String(index).padStart(4, '0')}.${fileType.ext}`,
    size: Math.floor(Math.random() * (maxSize - minSize)) + minSize,
    type: fileType.type,
    lastModified: new Date(Date.now() - Math.random() * dateRangeMonths * 30 * 24 * 60 * 60 * 1000),
    path: `${folder}/${fileType.name}_${String(index).padStart(4, '0')}.${fileType.ext}`,
    status: selectedStatus,
    isDuplicate,
    isPreviousUpload,
    file: new File([`mock content ${index}`], `${fileType.name}_${index}.${fileType.ext}`, {
      type: fileType.type,
    }),
  };

  // Add duplicate message for duplicates
  if (isDuplicate) {
    file.duplicateMessage = isPreviousUpload
      ? 'This file was previously uploaded to your storage'
      : 'This file already exists in your storage';
  }

  // Add hash for some files (simulating processed files)
  if (Math.random() < 0.3) {
    file.hash = `sha256-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  }

  return file;
}

/**
 * Generate a collection of mock files with realistic distribution
 */
export function createMockFileCollection(count, options = {}) {
  const files = [];

  for (let i = 0; i < count; i++) {
    files.push(createMockFile(i, options));
  }

  return files;
}

/**
 * Create grouped file structure (simulating FileUploadQueue grouping logic)
 */
export function createMockFileGroups(files, groupSize = 10) {
  const groups = [];

  for (let i = 0; i < files.length; i += groupSize) {
    const groupFiles = files.slice(i, i + groupSize);
    const isDuplicateGroup = groupFiles.some((f) => f.isDuplicate);

    groups.push({
      isDuplicateGroup,
      files: groupFiles,
    });
  }

  return groups;
}

/**
 * Performance test scenario configurations
 */
export const performanceTestScenarios = [
  {
    name: 'Small Dataset',
    fileCount: 100,
    description: 'Basic performance test with 100 files',
    expectedRenderTime: 5, // ms
  },
  {
    name: 'Medium Dataset',
    fileCount: 500,
    description: 'Moderate load test with 500 files',
    expectedRenderTime: 15, // ms
  },
  {
    name: 'Large Dataset',
    fileCount: 1000,
    description: 'Heavy load test with 1,000 files',
    expectedRenderTime: 25, // ms
  },
  {
    name: 'Extra Large Dataset',
    fileCount: 2500,
    description: 'Stress test with 2,500 files',
    expectedRenderTime: 50, // ms
  },
  {
    name: 'Extreme Dataset',
    fileCount: 5000,
    description: 'Maximum load test with 5,000 files',
    expectedRenderTime: 100, // ms
  },
];

/**
 * Generate realistic folder structure data
 */
export function generateFolderStructureData(fileCount) {
  const files = createMockFileCollection(fileCount);

  // Calculate folder structure metrics
  const folderCounts = {};
  const depthCounts = {};
  let totalDepth = 0;
  let maxDepth = 0;

  files.forEach((file) => {
    const pathParts = file.path.split('/').filter((part) => part);
    const depth = pathParts.length - 1; // Subtract filename
    const folderPath = pathParts.slice(0, -1).join('/');

    folderCounts[folderPath] = (folderCounts[folderPath] || 0) + 1;
    depthCounts[depth] = (depthCounts[depth] || 0) + 1;
    totalDepth += depth;
    maxDepth = Math.max(maxDepth, depth);
  });

  return {
    files,
    totalFiles: fileCount,
    avgDirectoryDepth: totalDepth / fileCount,
    maxDirectoryDepth: maxDepth,
    totalDirectoryCount: Object.keys(folderCounts).length,
    folderDistribution: folderCounts,
    depthDistribution: depthCounts,
  };
}
