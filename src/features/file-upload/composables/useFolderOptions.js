import { ref } from 'vue';
import { startProcessingTimer } from '../utils/processingTimer.js';
import { useFolderAnalysis } from '@/features/upload/composables/useFolderAnalysis.js';
import { useFolderProgress } from './useFolderProgress.js';
import { useFolderTimeouts } from './useFolderTimeouts.js';

export function useFolderOptions() {
  // Initialize sub-composables
  const { preprocessFileData, hasSubfoldersQuick, readDirectoryRecursive, getDirectoryEntryCount } =
    useFolderAnalysis();
  const {
    mainFolderProgress,
    allFilesProgress,
    mainFolderComplete,
    allFilesComplete,
    isAnalyzingMainFolder,
    isAnalyzingAllFiles,
    performDualAnalysis,
    resetProgress,
  } = useFolderProgress();
  const {
    analysisTimedOut,
    timeoutError,
    currentProgressMessage,
    skippedFolders,
    startCloudDetection,
    cleanup,
    resetSkippedFolders,
    isFileInSkippedFolder,
    updateProgressMessage,
    showSkipNotification,
    showCompletionMessage,
  } = useFolderTimeouts();

  // Main reactive data
  const showFolderOptions = ref(false);
  const includeSubfolders = ref(false);
  const pendingFolderFiles = ref([]);
  const subfolderCount = ref(0);

  // Analysis state
  const isAnalyzing = ref(false);
  const mainFolderAnalysis = ref(null);
  const allFilesAnalysis = ref(null);

  // Directory entry count (for display purposes - shows total files File Explorer can see)
  const totalDirectoryEntryCount = ref(0);

  // Main analysis function that coordinates both main folder and all files analysis
  const analyzeFilesForOptions = async () => {
    if (pendingFolderFiles.value.length === 0) return;

    // Check if already timed out before proceeding
    if (analysisTimedOut.value) {
      return;
    }

    try {
      // Use the progress module to perform dual analysis
      await performDualAnalysis(
        pendingFolderFiles.value,
        mainFolderAnalysis,
        allFilesAnalysis,
        analysisTimedOut
      );

      // Show completion message and cleanup
      const fileCount = pendingFolderFiles.value.length - skippedFolders.value.length;
      showCompletionMessage(fileCount);
      setTimeout(() => cleanup(), 500); // Brief delay to show completion message

      // Update subfolder count
      const { folderStats } = preprocessFileData(pendingFolderFiles.value);
      subfolderCount.value = folderStats.rootFolderCount;
    } catch (error) {
      console.error('Error analyzing files for folder options:', error);
      cleanup();
      // Fallback analysis is handled in performDualAnalysis
    } finally {
      // Only clear analyzing state if not timed out
      if (!analysisTimedOut.value) {
        isAnalyzing.value = false;
      }
    }
  };

  // Background analysis chain - runs after modal is displayed
  const performBackgroundAnalysis = async (files, addFilesToQueueCallback = null) => {
    try {
      // Check if already timed out before starting analysis
      if (analysisTimedOut.value) {
        return { hasSubfolders: true };
      }

      // Step 1: Quick subfolder detection (can hide modal if no subfolders)
      const subfolderResult = hasSubfoldersQuick(files);

      if (!subfolderResult) {
        // Clear timeout since we're successfully completing
        cleanup();

        showFolderOptions.value = false;
        isAnalyzing.value = false;

        // Auto-process files if callback provided
        if (addFilesToQueueCallback) {
          const filesWithPath = files.map((f) => {
            f.file.path = f.path;
            return f.file;
          });
          addFilesToQueueCallback(filesWithPath);
          pendingFolderFiles.value = [];
        }

        return { hasSubfolders: false };
      }

      // Step 2: Run the new chunked analysis
      await analyzeFilesForOptions();
    } catch (error) {
      console.error('Background analysis failed:', error);
      // Don't clear isAnalyzing here if timed out
      if (!analysisTimedOut.value) {
        isAnalyzing.value = false;
      }
    }

    return { hasSubfolders: true };
  };

  // Show modal immediately, calculate later - KISS solution
  const showFolderOptionsWithAnalysis = (files, addFilesToQueueCallback = null) => {
    // SHOW MODAL FIRST - no conditions, no calculations
    showFolderOptions.value = true;
    console.log('T = 0');
    console.log(
      'DEBUG: showFolderOptionsWithAnalysis called with',
      files ? files.length : 'no files',
      'files'
    );

    // Store File Explorer count for later comparison (from file input)
    window.fileExplorerCount = files ? files.length : null;
    // Store for display purposes (this is what File Explorer shows)
    totalDirectoryEntryCount.value = files ? files.length : 0;

    window.folderOptionsStartTime = performance.now();
    isAnalyzing.value = true;

    // Reset all values to show initial state
    mainFolderAnalysis.value = null;
    allFilesAnalysis.value = null;
    resetProgress();
    includeSubfolders.value = false;
    cleanup();
    resetSkippedFolders();

    // Start cloud detection and progress messaging
    updateProgressMessage('Scanning directory...');

    const cloudDetection = startCloudDetection((detection) => {
      console.log('Cloud detection triggered:', detection);
      isAnalyzing.value = false;
      isAnalyzingMainFolder.value = false;
      isAnalyzingAllFiles.value = false;
    });

    // Store files for analysis
    if (files) {
      pendingFolderFiles.value = files;
    }

    // Use a brief delay to ensure modal renders first
    setTimeout(() => {
      performBackgroundAnalysis(pendingFolderFiles.value, addFilesToQueueCallback);
    }, 100);
  };

  const processFolderEntry = async (dirEntry, addFilesToQueue) => {
    // SHOW MODAL IMMEDIATELY - don't wait for file reading
    showFolderOptions.value = true;
    console.log('T = 0');

    // Note: For drag-and-drop, we don't have access to File Explorer's exact count
    // The Directory Entry API may have different visibility than File Explorer
    window.fileExplorerCount = null;

    window.folderOptionsStartTime = performance.now();
    isAnalyzing.value = true;

    // Reset all values to show initial state
    mainFolderAnalysis.value = null;
    allFilesAnalysis.value = null;
    totalDirectoryEntryCount.value = 0;
    resetProgress();
    includeSubfolders.value = false;
    cleanup();
    resetSkippedFolders();

    // Start cloud detection with progress messaging
    updateProgressMessage('Scanning directory...');

    const cloudDetection = startCloudDetection((detection) => {
      console.log('Cloud detection triggered:', detection);
      isAnalyzing.value = false;
      isAnalyzingMainFolder.value = false;
      isAnalyzingAllFiles.value = false;
    });

    try {
      // Get diagnostic count first (equivalent to File Explorer count)
      let explorerEquivalentCount = null;
      try {
        explorerEquivalentCount = await getDirectoryEntryCount(dirEntry);
        // Store for display purposes (this is what File Explorer would show)
        totalDirectoryEntryCount.value = explorerEquivalentCount || 0;
      } catch (error) {
        console.warn('Failed to get directory entry count:', error);
        totalDirectoryEntryCount.value = 0;
      }

      // Read files in background with timeout signal
      updateProgressMessage('Reading directory contents...');

      // Create signal for readDirectoryRecursive with progress reporting
      const signal = {
        aborted: analysisTimedOut.value,
        addEventListener: () => {},
        onSkipFolder: (path) => {
          console.log('Folder skipped:', path);
          const folderName = path.split('/').pop();
          showSkipNotification(folderName);
        },
        onProgress: (fileCount) => {
          cloudDetection.reportProgress(fileCount);
        },
        onCloudFile: (path, error) => {
          // Silently track cloud-only files - reduces console noise
          console.debug(`Cloud-only file detected: ${path}`);
        },
        resetGlobalTimeout: cloudDetection.reportProgress,
      };

      const files = await readDirectoryRecursive(dirEntry, signal);

      // Clear the File Explorer count if it was set
      if (window.fileExplorerCount !== null && window.fileExplorerCount !== undefined) {
        window.fileExplorerCount = null;
      }

      // Check if timeout occurred during file reading
      if (analysisTimedOut.value) {
        console.log('DEBUG: Timeout already occurred, not proceeding with analysis');
        return;
      }

      // Store files and start analysis
      pendingFolderFiles.value = files;
      performBackgroundAnalysis(files, addFilesToQueue);
    } catch (error) {
      console.error('Error reading directory:', error);
      // If reading fails, let the timeout handle it
    }
  };

  const processFolderFiles = (files, addFilesToQueueCallback = null) => {
    // Convert to our standard format
    const fileDataArray = files.map((file) => ({
      file,
      path: file.webkitRelativePath,
    }));

    // Show modal immediately - let background analysis determine if subfolders exist
    showFolderOptionsWithAnalysis(fileDataArray, addFilesToQueueCallback);

    // Return null to indicate modal handling is in progress
    // Caller should not proceed with direct file processing
    return null;
  };

  // Folder options handlers
  const confirmFolderOptions = (addFilesToQueue) => {
    const processingStartTime = Date.now();
    let filesToAdd = pendingFolderFiles.value;

    if (!includeSubfolders.value) {
      // Use preprocessed data to filter main folder files (no more path parsing!)
      const { preprocessedFiles } = preprocessFileData(pendingFolderFiles.value);
      filesToAdd = preprocessedFiles.filter((f) => f.isMainFolder);
    }

    // Start the processing timer and log T=0
    startProcessingTimer();

    // Preserve path information when adding files to queue
    const filesWithPath = filesToAdd.map((f) => {
      f.file.path = f.path;
      return f.file;
    });

    // Store processing start time for performance measurement
    window.folderProcessingStartTime = processingStartTime;

    addFilesToQueue(filesWithPath);

    showFolderOptions.value = false;
    pendingFolderFiles.value = [];
  };

  const cancelFolderUpload = () => {
    showFolderOptions.value = false;
    pendingFolderFiles.value = [];

    // Clear timeout and reset state
    cleanup();
  };

  return {
    // Reactive data
    showFolderOptions,
    includeSubfolders,
    pendingFolderFiles,
    subfolderCount,

    // Analysis state
    isAnalyzing,
    mainFolderAnalysis,
    allFilesAnalysis,
    totalDirectoryEntryCount,

    // Timeout state (from timeout module)
    analysisTimedOut,
    timeoutError,
    currentProgressMessage,
    skippedFolders,

    // Progress tracking (from progress module)
    mainFolderProgress,
    allFilesProgress,
    mainFolderComplete,
    allFilesComplete,
    isAnalyzingMainFolder,
    isAnalyzingAllFiles,

    // Methods
    processFolderEntry,
    processFolderFiles,
    confirmFolderOptions,
    cancelFolderUpload,
    analyzeFilesForOptions,
    showFolderOptionsWithAnalysis,
    performBackgroundAnalysis,

    // Expose methods from sub-modules
    readDirectoryRecursive,
    hasSubfoldersQuick,
  };
}
