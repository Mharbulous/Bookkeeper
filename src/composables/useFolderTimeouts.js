import { ref } from 'vue';
import { useAsyncRegistry } from './useAsyncRegistry';

export function useFolderTimeouts() {
  // Modern timeout state with AbortController
  const analysisTimedOut = ref(false);
  const timeoutError = ref(null);
  const currentProgressMessage = ref('');
  const skippedFolders = ref([]);

  // Controller tracking for cleanup
  const activeControllers = new Set();
  const eventListenerMap = new WeakMap(); // Store handler functions for proper cleanup
  let localTimeoutId = null;
  let globalTimeoutId = null;
  let globalTimeoutController = null;

  // Registry integration
  const registry = useAsyncRegistry();

  // Browser compatibility check
  const hasModernTimeoutSupport = () => {
    return typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function';
  };

  // Create AbortController with timeout
  const createTimeoutController = (timeoutMs, processType = 'timeout') => {
    try {
      let controller;
      if (hasModernTimeoutSupport()) {
        const signal = AbortSignal.timeout(timeoutMs);
        controller = { signal, abort: () => {} }; // AbortSignal.timeout creates pre-aborted signal
      } else {
        // Fallback for browsers without AbortSignal.timeout
        controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const originalAbort = controller.abort.bind(controller);
        controller.abort = () => {
          clearTimeout(timeoutId);
          originalAbort();
        };
      }

      // Register with registry
      const registryId = registry.generateId(processType);
      registry.register(registryId, processType, () => controller.abort(), {
        component: 'FolderTimeouts',
        timeoutMs,
      });

      // Enhance abort method to unregister
      const originalAbort = controller.abort;
      controller.abort = (...args) => {
        registry.unregister(registryId);
        return originalAbort?.apply(controller, args);
      };

      return controller;
    } catch (error) {
      console.warn('AbortController creation failed, using fallback:', error);
      // Ultimate fallback - return mock controller
      return {
        signal: { aborted: false, addEventListener: () => {}, removeEventListener: () => {} },
        abort: () => {},
      };
    }
  };

  // Two-tier timeout system
  const startLocalTimeout = (timeoutMs, onTimeout) => {
    const controller = createTimeoutController(timeoutMs, 'local-timeout');
    activeControllers.add(controller);

    const handleTimeout = () => {
      if (!controller.signal.aborted) {
        onTimeout();
      }
      activeControllers.delete(controller);
    };

    if (hasModernTimeoutSupport()) {
      controller.signal.addEventListener('abort', handleTimeout);
      eventListenerMap.set(controller, handleTimeout); // Store for cleanup
    } else {
      // Fallback timeout handling
      localTimeoutId = setTimeout(handleTimeout, timeoutMs);
    }

    return controller;
  };

  const startGlobalTimeout = (timeoutMs, onTimeout) => {
    // Clear existing global timeout
    if (globalTimeoutController) {
      globalTimeoutController.abort();
      activeControllers.delete(globalTimeoutController);
    }

    globalTimeoutController = createTimeoutController(timeoutMs, 'global-timeout');
    activeControllers.add(globalTimeoutController);

    const handleGlobalTimeout = () => {
      // Capture current controller before cleanup to avoid null reference
      const currentController = globalTimeoutController;
      if (currentController && !currentController.signal.aborted) {
        analysisTimedOut.value = true;
        onTimeout();
      }
      if (currentController) {
        activeControllers.delete(currentController);
      }
      globalTimeoutController = null;
    };

    if (hasModernTimeoutSupport()) {
      globalTimeoutController.signal.addEventListener('abort', handleGlobalTimeout);
      eventListenerMap.set(globalTimeoutController, handleGlobalTimeout); // Store for cleanup
    } else {
      globalTimeoutId = setTimeout(handleGlobalTimeout, timeoutMs);
    }

    return globalTimeoutController;
  };

  const resetGlobalTimeout = () => {
    if (globalTimeoutController && !globalTimeoutController.signal.aborted) {
      globalTimeoutController.abort();
    }
    // Restart global timeout with same callback if needed
    return true;
  };

  // Skipped folder tracking
  const addSkippedFolder = (folderPath) => {
    if (!skippedFolders.value.includes(folderPath)) {
      skippedFolders.value.push(folderPath);
    }
  };

  const resetSkippedFolders = () => {
    skippedFolders.value = [];
  };

  const isFileInSkippedFolder = (filePath) => {
    return skippedFolders.value.some((skippedPath) => filePath.startsWith(skippedPath));
  };

  // Progress message system
  const updateProgressMessage = (message) => {
    currentProgressMessage.value = message;
  };

  const showSkipNotification = (folderPath) => {
    const folderName = folderPath.split('/').pop() || folderPath;
    updateProgressMessage(`⚠️ Skipped '${folderName}'`);
  };

  const showCompletionMessage = (fileCount) => {
    updateProgressMessage(`Analysis complete: ${fileCount} files processed`);
  };

  // Cloud detection with timeout integration
  const startCloudDetection = (onCloudDetected) => {
    let progressCount = 0;

    const handleLocalTimeout = () => {
      if (progressCount === 0) {
        onCloudDetected({
          reason: 'no_progress',
          timeElapsed: 1000,
          message: 'No files detected after 1000ms - likely cloud storage hanging',
        });
      }
    };

    const handleGlobalTimeout = () => {
      analysisTimedOut.value = true;
      timeoutError.value =
        'Unable to scan the files in this folder. This is often due to files not being stored locally but being stored on a cloud or files-on-demand service such as OneDrive.';
      onCloudDetected({
        reason: 'global_timeout',
        timeElapsed: 15000,
        message: 'Global timeout - cloud folder analysis terminated',
      });
    };

    const localController = startLocalTimeout(1000, handleLocalTimeout);
    const globalController = startGlobalTimeout(15000, handleGlobalTimeout);

    return {
      localController,
      globalController,
      reportProgress: (count) => {
        progressCount = count;
        resetGlobalTimeout(); // Reset global timeout on progress
      },
    };
  };

  // Cascade prevention
  const handleFolderTimeout = (folderPath) => {
    const folderName = folderPath.split('/').pop() || folderPath;

    // Check if parent folder already timed out to prevent cascade messages
    const parentAlreadySkipped = skippedFolders.value.some((skipped) =>
      folderPath.startsWith(skipped)
    );

    if (!parentAlreadySkipped) {
      addSkippedFolder(folderPath);
      showSkipNotification(folderName);
    }
  };

  const registerParentController = (controller) => {
    // Store reference for cascade prevention
    activeControllers.add(controller);
  };

  const handleChildTimeout = (childPath, childController) => {
    // Cancel parent operations to prevent cascade
    const parentPath = childPath.substring(0, childPath.lastIndexOf('/'));
    if (parentPath) {
      handleFolderTimeout(parentPath);
    }

    // Cancel all parent controllers
    activeControllers.forEach((controller) => {
      if (controller !== childController) {
        controller.abort();
      }
    });
  };

  // Cleanup and memory management
  const cleanup = () => {
    // Registry cleanup first
    registry.cleanup();

    // Abort all active controllers
    activeControllers.forEach((controller) => {
      if (controller && typeof controller.abort === 'function') {
        try {
          // Remove event listener with the actual handler function
          if (controller.signal && typeof controller.signal.removeEventListener === 'function') {
            const handler = eventListenerMap.get(controller);
            if (handler) {
              controller.signal.removeEventListener('abort', handler);
            }
          }
          controller.abort();
        } catch (error) {
          console.warn('Error during controller cleanup:', error);
        }
      }
    });
    activeControllers.clear();

    // Clear legacy timers
    if (localTimeoutId) {
      clearTimeout(localTimeoutId);
      localTimeoutId = null;
    }

    if (globalTimeoutId) {
      clearTimeout(globalTimeoutId);
      globalTimeoutId = null;
    }

    // Clear global timeout controller
    globalTimeoutController = null;

    // Reset state
    analysisTimedOut.value = false;
    timeoutError.value = null;
    currentProgressMessage.value = '';
    resetSkippedFolders();
  };

  // Reset timeout state (legacy compatibility)
  const resetTimeoutState = cleanup;

  // Clear active timeout (legacy compatibility)
  const clearAnalysisTimeout = cleanup;

  // Check if analysis should continue (not timed out)
  const shouldContinueAnalysis = () => {
    return !analysisTimedOut.value;
  };

  return {
    // State
    analysisTimedOut,
    timeoutError,
    currentProgressMessage,
    skippedFolders,

    // Modern timeout methods
    hasModernTimeoutSupport,
    createTimeoutController,
    startLocalTimeout,
    startGlobalTimeout,
    resetGlobalTimeout,

    // Folder tracking
    addSkippedFolder,
    resetSkippedFolders,
    isFileInSkippedFolder,

    // Progress messaging
    updateProgressMessage,
    showSkipNotification,
    showCompletionMessage,

    // Cloud detection
    startCloudDetection,

    // Cascade prevention
    handleFolderTimeout,
    registerParentController,
    handleChildTimeout,

    // Cleanup
    cleanup,

    // Legacy compatibility
    clearAnalysisTimeout,
    resetTimeoutState,
    shouldContinueAnalysis,

    // Registry access for testing/debugging
    registry,
  };
}
