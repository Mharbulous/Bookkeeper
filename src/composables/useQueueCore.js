import { createApplicationError } from '../utils/errorMessages';

export function useQueueCore() {
  // Helper function to get file path consistently
  const getFilePath = (fileRef) => {
    // Handle direct file objects
    if (fileRef instanceof File) {
      return fileRef.path || fileRef.webkitRelativePath || fileRef.name;
    }
    // Handle file reference objects
    return (
      fileRef.path ||
      fileRef.file?.webkitRelativePath ||
      fileRef.file?.path ||
      fileRef.file?.name ||
      fileRef.name
    );
  };

  // Legacy hash generation (kept for fallback compatibility)
  const generateFileHash = async (file) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Return standard SHA-256 hash of file content
    return hash;
  };

  // Legacy chooseBestFile (kept for fallback compatibility)
  const chooseBestFile = (fileRefs) => {
    return fileRefs.sort((a, b) => {
      // Priority 1: Earliest modification date
      if (a.metadata.lastModified !== b.metadata.lastModified) {
        return a.metadata.lastModified - b.metadata.lastModified;
      }

      // Priority 2: Longest folder path
      const aFolderPath = a.path.substring(0, a.path.lastIndexOf('/') + 1);
      const bFolderPath = b.path.substring(0, b.path.lastIndexOf('/') + 1);
      if (aFolderPath.length !== bFolderPath.length) {
        return bFolderPath.length - aFolderPath.length; // Descending (longest first)
      }

      // Priority 3: Shortest filename
      if (a.metadata.fileName.length !== b.metadata.fileName.length) {
        return a.metadata.fileName.length - b.metadata.fileName.length;
      }

      // Priority 4: Alphanumeric filename sort
      if (a.metadata.fileName !== b.metadata.fileName) {
        return a.metadata.fileName.localeCompare(b.metadata.fileName);
      }

      // Priority 5: Original selection order (stable sort)
      return a.originalIndex - b.originalIndex;
    })[0];
  };

  // Helper function to check if file is in a skipped folder
  const isFileInSkippedFolder = (filePath, skippedFolders = []) => {
    if (!skippedFolders || skippedFolders.length === 0) {
      return false;
    }

    return skippedFolders.some((skippedPath) => {
      // Normalize paths for comparison
      const normalizedFilePath = filePath.replace(/\\/g, '/').toLowerCase();
      const normalizedSkippedPath = skippedPath.replace(/\\/g, '/').toLowerCase();

      return normalizedFilePath.startsWith(normalizedSkippedPath);
    });
  };

  // Filter files to exclude those from skipped folders
  const filterFilesFromSkippedFolders = (files, skippedFolders = []) => {
    if (!skippedFolders || skippedFolders.length === 0) {
      console.log('No skipped folders - processing all files');
      return { processableFiles: files, skippedFiles: [] };
    }

    const processableFiles = [];
    const skippedFiles = [];

    files.forEach((file) => {
      const filePath = getFilePath(file);

      if (isFileInSkippedFolder(filePath, skippedFolders)) {
        skippedFiles.push(file);
        console.log(`Skipping file from cloud folder: ${filePath}`);
      } else {
        processableFiles.push(file);
      }
    });

    console.log(
      `File filtering complete: ${processableFiles.length} processable, ${skippedFiles.length} skipped`
    );
    return { processableFiles, skippedFiles };
  };

  // Core deduplication logic extracted from main thread processing
  const processMainThreadDeduplication = async (files, onProgress = null, skippedFolders = []) => {
    // Filter out files from skipped folders before processing
    const { processableFiles, skippedFiles } = filterFilesFromSkippedFolders(files, skippedFolders);

    if (skippedFiles.length > 0) {
      console.log(`Excluded ${skippedFiles.length} files from skipped cloud folders`);
    }
    // Track progress for main thread processing
    let processedCount = 0;
    const totalFiles = processableFiles.length; // Use processable files count for progress

    const sendProgress = () => {
      if (onProgress) {
        onProgress({
          current: processedCount,
          total: totalFiles,
          percentage: Math.round((processedCount / totalFiles) * 100),
          currentFile: processedCount < totalFiles ? processableFiles[processedCount]?.name : '',
        });
      }
    };

    // Send initial progress
    sendProgress();

    // Step 1: Group files by size to identify unique-sized files
    const fileSizeGroups = new Map(); // file_size -> [file_references]

    processableFiles.forEach((file, index) => {
      const fileSize = file.size;
      const fileRef = {
        file,
        originalIndex: index,
        path: getFilePath(file),
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          lastModified: file.lastModified,
        },
      };

      if (!fileSizeGroups.has(fileSize)) {
        fileSizeGroups.set(fileSize, []);
      }
      fileSizeGroups.get(fileSize).push(fileRef);
    });

    const uniqueFiles = [];
    const duplicateCandidates = [];

    // Step 2: Separate unique-sized files from potential duplicates
    for (const [, fileRefs] of fileSizeGroups) {
      if (fileRefs.length === 1) {
        // Unique file size - definitely not a duplicate
        uniqueFiles.push(fileRefs[0]);
      } else {
        // Multiple files with same size - need hash verification
        duplicateCandidates.push(...fileRefs);
      }
    }

    // Step 3: Hash potential duplicates and group by hash
    const hashGroups = new Map(); // hash_value -> [file_references]

    for (const fileRef of duplicateCandidates) {
      try {
        const hash = await generateFileHash(fileRef.file);
        fileRef.hash = hash;

        if (!hashGroups.has(hash)) {
          hashGroups.set(hash, []);
        }
        hashGroups.get(hash).push(fileRef);

        // Update progress
        processedCount++;
        sendProgress();
      } catch (error) {
        const appError = createApplicationError(error, {
          fileProcessing: true,
          fileName: fileRef.file.name,
          fileSize: fileRef.file.size,
          processingMode: 'fallback',
        });

        console.error(`Failed to hash file ${fileRef.file.name}:`, appError);
        // Include file anyway without hash to avoid data loss - will be handled in final processing
        processedCount++;
        sendProgress();
      }
    }

    return { uniqueFiles, hashGroups, skippedFiles };
  };

  // Process hash groups to identify true duplicates
  const processDuplicateGroups = (hashGroups) => {
    const finalFiles = [];
    const duplicateFiles = [];

    for (const [, fileRefs] of hashGroups) {
      if (fileRefs.length === 1) {
        // Unique hash - not a duplicate
        finalFiles.push(fileRefs[0]);
      } else {
        // Multiple files with same hash - check if they're one-and-the-same or duplicate files
        const oneAndTheSameGroups = new Map(); // metadata_key -> [file_references]

        fileRefs.forEach((fileRef) => {
          // Create metadata signature for one-and-the-same file detection
          const metadataKey = `${fileRef.metadata.fileName}_${fileRef.metadata.fileSize}_${fileRef.metadata.lastModified}`;

          if (!oneAndTheSameGroups.has(metadataKey)) {
            oneAndTheSameGroups.set(metadataKey, []);
          }
          oneAndTheSameGroups.get(metadataKey).push(fileRef);
        });

        // Handle one-and-the-same files and duplicate files
        for (const [, oneAndTheSameFiles] of oneAndTheSameGroups) {
          if (oneAndTheSameFiles.length === 1) {
            // Unique file (different metadata from others with same hash)
            finalFiles.push(oneAndTheSameFiles[0]);
          } else {
            // One-and-the-same file selected multiple times - just pick the first one
            const chosenFile = oneAndTheSameFiles[0];
            finalFiles.push(chosenFile);

            // Don't mark others as duplicates - they're the same file, just filter them out
          }
        }

        // If we have multiple distinct files with same hash (duplicate files), choose the best one
        if (oneAndTheSameGroups.size > 1) {
          const allUniqueFiles = Array.from(oneAndTheSameGroups.values()).map((group) => group[0]);
          if (allUniqueFiles.length > 1) {
            const bestFile = chooseBestFile(allUniqueFiles);

            // Remove best file from finalFiles and add back with priority
            const bestIndex = finalFiles.findIndex((f) => f === bestFile);
            if (bestIndex > -1) {
              finalFiles.splice(bestIndex, 1);
            }
            finalFiles.push(bestFile);

            // Mark others as duplicates
            allUniqueFiles.forEach((fileRef) => {
              if (fileRef !== bestFile) {
                const index = finalFiles.findIndex((f) => f === fileRef);
                if (index > -1) {
                  finalFiles.splice(index, 1);
                }
                fileRef.isDuplicate = true;
                duplicateFiles.push(fileRef);
              }
            });
          }
        }
      }
    }

    return { finalFiles, duplicateFiles };
  };

  return {
    // Core deduplication methods
    getFilePath,
    generateFileHash,
    chooseBestFile,
    processMainThreadDeduplication,
    processDuplicateGroups,

    // File filtering methods
    isFileInSkippedFolder,
    filterFilesFromSkippedFolders,
  };
}
