import { analyzeFiles } from '@/features/upload/utils/fileAnalysis.js';

export function useFolderAnalysis() {
  // Single preprocessing function to parse all paths once and extract all needed information
  const preprocessFileData = (files) => {
    const directories = new Map(); // directory path -> depth
    const fileDepths = [];
    const rootFolders = new Set();
    const preprocessedFiles = [];
    let hasSubfolders = false;

    files.forEach((fileData) => {
      // Parse path once and extract all information
      const pathParts = fileData.path.split('/').filter((part) => part !== '');
      const fileDepth = pathParts.length - 1; // Subtract 1 because last part is filename
      const isMainFolder = pathParts.length === 2; // Exactly 2 parts: folder/file (no subfolders)

      // Track root folders and subfolder detection
      rootFolders.add(pathParts[0]);
      if (pathParts.length > 2) {
        hasSubfolders = true;
      }

      // Collect file depth for file depth stats
      fileDepths.push(fileDepth);

      // Add unique directory paths (all levels) with their depths
      const dirParts = pathParts.slice(0, -1); // Remove filename
      for (let i = 1; i <= dirParts.length; i++) {
        const dirPath = dirParts.slice(0, i).join('/');
        const dirDepth = i; // Directory depth is its level in the hierarchy
        directories.set(dirPath, dirDepth);
      }

      // Store preprocessed file data
      preprocessedFiles.push({
        ...fileData,
        pathParts,
        fileDepth,
        isMainFolder,
        dirParts,
      });
    });

    // Calculate directory and file depth statistics
    const maxFileDepth = fileDepths.length > 0 ? Math.max(...fileDepths) : 0;
    const avgFileDepth =
      fileDepths.length > 0 ? fileDepths.reduce((sum, d) => sum + d, 0) / fileDepths.length : 0;

    const directoryDepths = Array.from(directories.values());
    const avgDirectoryDepth =
      directoryDepths.length > 0
        ? directoryDepths.reduce((sum, d) => sum + d, 0) / directoryDepths.length
        : 0;

    return {
      preprocessedFiles,
      directoryStats: {
        totalDirectoryCount: directories.size,
        maxFileDepth: maxFileDepth,
        avgFileDepth: Math.round(avgFileDepth * 10) / 10,
        avgDirectoryDepth: Math.round(avgDirectoryDepth * 10) / 10,
      },
      folderStats: {
        rootFolderCount: rootFolders.size,
        hasSubfolders,
      },
    };
  };

  const calculateFileSizeMetrics = (files) => {
    const fileSizes = files.map((f) => f.file.size);
    const totalSizeMB = fileSizes.reduce((sum, size) => sum + size, 0) / (1024 * 1024);

    // Group files by size to find identical sizes
    const sizeGroups = new Map();
    fileSizes.forEach((size) => {
      sizeGroups.set(size, (sizeGroups.get(size) || 0) + 1);
    });

    const uniqueFiles = Array.from(sizeGroups.values()).filter((count) => count === 1).length;
    const identicalSizeFiles = fileSizes.length - uniqueFiles;
    const zeroByteFiles = fileSizes.filter((size) => size === 0).length;

    // Get top 5 largest files
    const sortedSizes = [...fileSizes].sort((a, b) => b - a);
    const largestFileSizesMB = sortedSizes
      .slice(0, 5)
      .map((size) => Math.round((size / (1024 * 1024)) * 10) / 10);

    return {
      totalSizeMB: Math.round(totalSizeMB * 10) / 10,
      uniqueFiles,
      identicalSizeFiles,
      zeroByteFiles,
      largestFileSizesMB,
    };
  };

  const calculateFilenameStats = (files) => {
    const filenameLengths = files.map((f) => f.path.length);
    const avgFilenameLength =
      filenameLengths.length > 0
        ? Math.round(
            (filenameLengths.reduce((sum, len) => sum + len, 0) / filenameLengths.length) * 10
          ) / 10
        : 0;

    return { avgFilenameLength };
  };

  // Lightweight subfolder detection - check only first few files
  const hasSubfoldersQuick = (files, maxCheck = 10) => {
    const checkCount = Math.min(files.length, maxCheck);
    for (let i = 0; i < checkCount; i++) {
      const pathParts = files[i].path.split('/').filter((part) => part !== '');
      if (pathParts.length > 2) {
        return true;
      }
    }
    return false;
  };

  // Core analysis function using fileAnalysis utility
  const performFileAnalysis = (files, directoryStats) => {
    if (!files || files.length === 0) {
      return analyzeFiles([], 0, 0, 0);
    }
    return analyzeFiles(
      files,
      directoryStats.totalDirectoryCount,
      directoryStats.avgDirectoryDepth,
      directoryStats.avgFileDepth
    );
  };

  // Diagnostic function to count all entries in a directory (like File Explorer would)
  const getDirectoryEntryCount = async (dirEntry) => {
    return new Promise((resolve) => {
      let totalFileCount = 0;
      const reader = dirEntry.createReader();

      const countAllEntries = () => {
        reader.readEntries(
          async (entries) => {
            if (entries.length === 0) {
              resolve(totalFileCount);
              return;
            }

            for (const entry of entries) {
              if (entry.isFile) {
                totalFileCount++;
              } else if (entry.isDirectory) {
                // Recursively count files in subdirectories
                try {
                  const subCount = await getDirectoryEntryCount(entry);
                  totalFileCount += subCount;
                } catch (error) {
                  // Skip directories we can't access
                  console.warn(`Cannot access subdirectory ${entry.fullPath} for counting:`, error);
                }
              }
            }

            countAllEntries(); // Continue reading more entries
          },
          (error) => {
            console.warn('Error during directory entry counting:', error);
            resolve(totalFileCount);
          }
        );
      };

      countAllEntries();
    });
  };

  const readDirectoryRecursive = (dirEntry, abortSignal = null) => {
    return new Promise((resolve, reject) => {
      const files = [];

      // Early abort check
      if (abortSignal?.aborted) {
        resolve([]);
        return;
      }

      const reader = dirEntry.createReader();

      // Handle abort during operation
      const handleAbort = () => {
        console.log(`Directory read aborted: ${dirEntry.fullPath}`);
        if (abortSignal?.onSkipFolder) {
          abortSignal.onSkipFolder(dirEntry.fullPath);
        }
        resolve([]); // Return empty array on abort
      };

      if (abortSignal) {
        abortSignal.addEventListener('abort', handleAbort);
      }

      const readEntries = async () => {
        try {
          // Check abort status before each readEntries call
          if (abortSignal?.aborted) {
            resolve([]);
            return;
          }

          reader.readEntries(
            async (entries) => {
              try {
                // Check abort after getting entries
                if (abortSignal?.aborted) {
                  resolve([]);
                  return;
                }

                if (entries.length === 0) {
                  // Report progress on successful completion
                  if (abortSignal?.onProgress) {
                    abortSignal.onProgress(files.length);
                  }

                  // Reset global timeout on successful directory read
                  if (abortSignal?.resetGlobalTimeout) {
                    abortSignal.resetGlobalTimeout();
                  }

                  resolve(files);
                  return;
                }

                for (const entry of entries) {
                  // Check abort before processing each entry
                  if (abortSignal?.aborted) {
                    resolve(files); // Return whatever we have so far
                    return;
                  }

                  if (entry.isFile) {
                    try {
                      const file = await new Promise((resolve, reject) => {
                        const timeoutId = setTimeout(() => {
                          reject(new Error('File read timeout'));
                        }, 5000); // 5 second timeout for individual files

                        entry.file(
                          (file) => {
                            clearTimeout(timeoutId);
                            resolve(file);
                          },
                          (error) => {
                            clearTimeout(timeoutId);
                            reject(error);
                          }
                        );
                      });

                      files.push({ file, path: entry.fullPath });

                      // Report incremental progress
                      if (abortSignal?.onProgress) {
                        abortSignal.onProgress(files.length);
                      }
                    } catch (error) {
                      // Cloud files show NotFoundError when not locally available
                      // This is expected behavior - count and continue silently
                      if (error.name === 'NotFoundError') {
                        // Track cloud-only files for user feedback
                        if (abortSignal?.onCloudFile) {
                          abortSignal.onCloudFile(entry.fullPath, error);
                        }
                      } else {
                        // Log unexpected file errors for debugging
                        console.warn(`Unexpected file read error for ${entry.fullPath}:`, error);
                      }
                      // Continue processing other files
                    }
                  } else if (entry.isDirectory) {
                    try {
                      // Create child signal for cascade prevention
                      let childSignal = abortSignal;

                      if (abortSignal && abortSignal.parentController) {
                        // Set up cascade prevention
                        childSignal = {
                          ...abortSignal,
                          currentPath: entry.fullPath,
                          onSkipFolder: (path) => {
                            if (abortSignal.onSkipFolder) abortSignal.onSkipFolder(path);
                            // Cancel parent to prevent cascade
                            if (abortSignal.parentController) {
                              abortSignal.parentController.abort();
                            }
                          },
                        };
                      }

                      const subFiles = await readDirectoryRecursive(entry, childSignal);

                      // Check abort after subdirectory processing
                      if (abortSignal?.aborted) {
                        resolve(files);
                        return;
                      }

                      files.push(...subFiles);

                      // Report progress after subdirectory
                      if (abortSignal?.onProgress) {
                        abortSignal.onProgress(files.length);
                      }
                    } catch (error) {
                      console.warn(`Subdirectory read error for ${entry.fullPath}:`, error);
                      // Continue processing other entries
                    }
                  }
                }

                readEntries(); // Continue reading more entries
              } catch (error) {
                console.error('Error processing entries:', error);
                resolve(files); // Return what we have so far
              }
            },
            (error) => {
              console.error('readEntries error:', error);
              resolve(files); // Return what we have so far
            }
          );
        } catch (error) {
          console.error('Error in readEntries:', error);
          resolve(files);
        }
      };

      // Start reading
      readEntries().catch((error) => {
        console.error('readDirectoryRecursive error:', error);
        resolve(files);
      });
    });
  };

  return {
    preprocessFileData,
    calculateFileSizeMetrics,
    calculateFilenameStats,
    hasSubfoldersQuick,
    performFileAnalysis,
    readDirectoryRecursive,
    getDirectoryEntryCount,
  };
}
