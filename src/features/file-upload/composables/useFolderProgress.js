import { ref } from 'vue';
import { useFolderAnalysis } from '@/features/upload/composables/useFolderAnalysis.js';
import { storeHardwarePerformanceFactor } from '../utils/hardwareCalibration.js';

export function useFolderProgress() {
  const {
    preprocessFileData,
    performFileAnalysis,
    calculateFileSizeMetrics,
    calculateFilenameStats,
  } = useFolderAnalysis();

  // Progress tracking for chunked processing
  const mainFolderProgress = ref({ filesProcessed: 0, totalFiles: 0 });
  const allFilesProgress = ref({ filesProcessed: 0, totalFiles: 0 });
  const mainFolderComplete = ref(false);
  const allFilesComplete = ref(false);
  const isAnalyzingMainFolder = ref(false);
  const isAnalyzingAllFiles = ref(false);

  // Chunked analysis function for better UI responsiveness
  const analyzeFilesChunked = async (
    files,
    fileData,
    directoryStats,
    chunkSize = 1000,
    progressRef,
    isAnalyzingRef,
    resultRef,
    analysisTimedOut
  ) => {
    if (!files || files.length === 0) {
      resultRef.value = performFileAnalysis([], {
        totalDirectoryCount: 0,
        avgDirectoryDepth: 0,
        avgFileDepth: 0,
      });
      return;
    }

    // Check if timeout occurred before starting
    if (analysisTimedOut.value) {
      return;
    }

    isAnalyzingRef.value = true;
    progressRef.value = { filesProcessed: 0, totalFiles: files.length };

    try {
      // For small sets, process all at once
      if (files.length <= chunkSize) {
        resultRef.value = performFileAnalysis(files, directoryStats);
        progressRef.value = { filesProcessed: files.length, totalFiles: files.length };
        return;
      }

      // For larger sets, process in chunks to allow UI updates
      let processedFiles = [];
      for (let i = 0; i < files.length; i += chunkSize) {
        // Check if timeout occurred during processing
        if (analysisTimedOut.value) {
          return;
        }

        const chunk = files.slice(i, i + chunkSize);
        processedFiles.push(...chunk);

        // Update progress
        progressRef.value = { filesProcessed: processedFiles.length, totalFiles: files.length };

        // Calculate analysis on processed files so far
        resultRef.value = performFileAnalysis(processedFiles, directoryStats);

        // Allow UI to update between chunks
        if (i + chunkSize < files.length) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    } catch (error) {
      console.error('Error in chunked analysis:', error);
      resultRef.value = performFileAnalysis([], {
        totalDirectoryCount: 0,
        avgDirectoryDepth: 0,
        avgFileDepth: 0,
      });
    }
  };

  // Main analysis coordination function
  const performDualAnalysis = async (
    pendingFolderFiles,
    mainFolderAnalysis,
    allFilesAnalysis,
    analysisTimedOut
  ) => {
    if (pendingFolderFiles.length === 0) return;

    // Reset completion states
    mainFolderComplete.value = false;
    allFilesComplete.value = false;

    // Check if already timed out before proceeding
    if (analysisTimedOut.value) {
      return;
    }

    try {
      // Single preprocessing pass - parse all paths once and extract everything
      const { preprocessedFiles, directoryStats: allFilesDirectoryStats } =
        preprocessFileData(pendingFolderFiles);

      // Separate files based on preprocessed data (no more path parsing!)
      const allFiles = [];
      const mainFolderFiles = [];
      const mainFolderFileData = [];

      preprocessedFiles.forEach((fileData) => {
        allFiles.push(fileData.file);

        if (fileData.isMainFolder) {
          mainFolderFiles.push(fileData.file);
          mainFolderFileData.push(fileData);
        }
      });

      // Calculate directory stats for main folder subset using preprocessed data
      const mainFolderDirectoryStats = preprocessFileData(mainFolderFileData).directoryStats;

      // Calculate other metrics for logging
      const allFilesMetrics = calculateFileSizeMetrics(pendingFolderFiles);
      const filenameStats = calculateFilenameStats(pendingFolderFiles);

      // Start main folder analysis first (faster, enables Continue button sooner)
      const mainFolderPromise = analyzeFilesChunked(
        mainFolderFiles,
        mainFolderFileData,
        mainFolderDirectoryStats,
        1000,
        mainFolderProgress,
        isAnalyzingMainFolder,
        mainFolderAnalysis,
        analysisTimedOut
      ).then(() => {
        mainFolderComplete.value = true;
      });

      // Start all files analysis in parallel (slower, but starts immediately)
      const allFilesPromise = analyzeFilesChunked(
        allFiles,
        preprocessedFiles,
        allFilesDirectoryStats,
        1000,
        allFilesProgress,
        isAnalyzingAllFiles,
        allFilesAnalysis,
        analysisTimedOut
      ).then(() => {
        allFilesComplete.value = true;

        // Log analysis data when all files analysis is complete
        const analysisData = {
          timestamp: Date.now(),
          totalFiles: allFilesAnalysis.value.totalFiles,
          duplicateCandidateCount: allFilesAnalysis.value.duplicateCandidates,
          duplicateCandidatePercent: allFilesAnalysis.value.estimatedDuplicationPercent,
          uniqueFilesSizeMB: allFilesAnalysis.value.uniqueFilesSizeMB,
          duplicateCandidatesSizeMB: allFilesAnalysis.value.duplicateCandidatesSizeMB,
          totalSizeMB: allFilesAnalysis.value.totalSizeMB,
          totalDirectoryCount: allFilesAnalysis.value.totalDirectoryCount,
          avgDirectoryDepth: allFilesDirectoryStats.avgDirectoryDepth,
          maxDirectoryDepth: allFilesDirectoryStats.maxDirectoryDepth,
          uniqueFilesTotal: allFilesAnalysis.value.uniqueFiles,
          maxFileDepth: allFilesDirectoryStats.maxFileDepth,
          avgFileDepth: allFilesDirectoryStats.avgFileDepth,
          avgFilenameLength: filenameStats.avgFilenameLength,
          zeroByteFiles: allFilesMetrics.zeroByteFiles,
          largestFileSizesMB: allFilesMetrics.largestFileSizesMB,
        };

        // Hardware calibration data stored automatically during analysis
      });

      // Wait for both analyses to complete
      await Promise.all([mainFolderPromise, allFilesPromise]);

      // Log elapsed time when all calculations are complete
      if (window.folderOptionsStartTime) {
        const elapsedTime = Math.round(performance.now() - window.folderOptionsStartTime);
        console.log(`T = ${elapsedTime}`);

        // Store hardware performance factor for calibration
        const totalFiles = allFilesAnalysis.value?.totalFiles || pendingFolderFiles.length;
        if (totalFiles > 0 && elapsedTime > 0) {
          storeHardwarePerformanceFactor(totalFiles, elapsedTime, {
            totalSizeMB: allFilesAnalysis.value?.totalSizeMB || 0,
            duplicateCandidates: allFilesAnalysis.value?.duplicateCandidates || 0,
            avgDirectoryDepth: allFilesAnalysis.value?.breakdown?.avgDirectoryDepth || 0,
            timestamp: Date.now(),
            source: 'folder_analysis',
          });
        }
      }
    } catch (error) {
      console.error('Error analyzing files for folder options:', error);
      // Set fallback analysis
      allFilesAnalysis.value = performFileAnalysis([], {
        totalDirectoryCount: 0,
        avgDirectoryDepth: 0,
        avgFileDepth: 0,
      });
      mainFolderAnalysis.value = performFileAnalysis([], {
        totalDirectoryCount: 0,
        avgDirectoryDepth: 0,
        avgFileDepth: 0,
      });
      mainFolderComplete.value = true;
      allFilesComplete.value = true;
    }
  };

  // Reset progress tracking
  const resetProgress = () => {
    mainFolderProgress.value = { filesProcessed: 0, totalFiles: 0 };
    allFilesProgress.value = { filesProcessed: 0, totalFiles: 0 };
    mainFolderComplete.value = false;
    allFilesComplete.value = false;
    isAnalyzingMainFolder.value = false;
    isAnalyzingAllFiles.value = false;
  };

  return {
    // Progress tracking state
    mainFolderProgress,
    allFilesProgress,
    mainFolderComplete,
    allFilesComplete,
    isAnalyzingMainFolder,
    isAnalyzingAllFiles,

    // Methods
    analyzeFilesChunked,
    performDualAnalysis,
    resetProgress,
  };
}
