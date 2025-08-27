import { vi } from 'vitest';

/**
 * Mock File API utilities for testing cloud folder timeout scenarios
 */

/**
 * Creates a mock file entry for testing
 * @param {string} name - File name
 * @param {string} fullPath - Full file path
 * @param {number} size - File size in bytes (optional)
 * @param {string} type - MIME type (optional)
 * @returns {Object} Mock file entry
 */
export const createMockFile = (name, fullPath, size = 1000, type = 'text/plain') => ({
  name,
  fullPath,
  isFile: true,
  isDirectory: false,
  file: vi.fn((callback) => {
    const mockFile = {
      name,
      size,
      type,
      lastModified: Date.now(),
      lastModifiedDate: new Date(),
    };

    // Simulate async file reading
    setTimeout(() => callback(mockFile), 10);
  }),
});

/**
 * Creates a mock directory entry for testing
 * @param {string} name - Directory name
 * @param {string} fullPath - Full directory path
 * @param {Array} entries - Child entries (files/directories)
 * @param {boolean} shouldHang - Whether readEntries should hang (cloud simulation)
 * @param {number} hangDelay - Delay before hanging (ms)
 * @returns {Object} Mock directory entry
 */
export const createMockDirectory = (
  name,
  fullPath,
  entries = [],
  shouldHang = false,
  hangDelay = 0
) => {
  const reader = {
    readEntries: vi.fn(),
  };

  if (shouldHang) {
    // Simulate cloud storage hanging behavior
    reader.readEntries.mockImplementation((callback) => {
      if (hangDelay > 0) {
        setTimeout(() => {
          // After delay, never call callback (infinite hang)
        }, hangDelay);
      }
      // Never calls callback to simulate hanging
    });
  } else {
    // Normal local directory behavior
    let callCount = 0;
    reader.readEntries.mockImplementation((callback) => {
      setTimeout(() => {
        if (callCount === 0) {
          callCount++;
          callback([...entries]);
        } else {
          callback([]); // End of entries
        }
      }, 10); // Small delay to simulate async behavior
    });
  }

  return {
    name,
    fullPath,
    isFile: false,
    isDirectory: true,
    createReader: () => reader,
  };
};

/**
 * Creates a mock DataTransfer object for drag-drop testing
 * @param {Array} items - Array of file/directory entries
 * @returns {Object} Mock DataTransfer object
 */
export const createMockDataTransfer = (items) => ({
  items: {
    length: items.length,
    [Symbol.iterator]: function* () {
      for (let i = 0; i < this.length; i++) {
        yield this[i];
      }
    },
    ...items
      .map((item, index) => ({
        [index]: {
          kind: 'file',
          type: item.isDirectory ? '' : 'text/plain',
          webkitGetAsEntry: () => item,
          getAsFile: item.isFile ? () => item : null,
        },
      }))
      .reduce((acc, item, index) => ({ ...acc, [index]: item[index] }), {}),
  },
  files: items.filter((item) => item.isFile),
});

/**
 * Creates a complete mock file system structure for testing
 * @param {Object} structure - Nested object representing file system
 * @param {string} basePath - Base path for the structure
 * @param {Array} cloudPaths - Paths that should simulate cloud behavior
 * @returns {Array} Array of mock entries
 */
export const createMockFileSystem = (structure, basePath = '', cloudPaths = []) => {
  const entries = [];

  for (const [name, content] of Object.entries(structure)) {
    const fullPath = basePath ? `${basePath}/${name}` : `/${name}`;
    const isCloudPath = cloudPaths.some((cloudPath) => fullPath.includes(cloudPath));

    if (typeof content === 'object' && content !== null) {
      // Directory
      const childEntries = createMockFileSystem(content, fullPath, cloudPaths);
      const directory = createMockDirectory(name, fullPath, childEntries, isCloudPath);
      entries.push(directory);
    } else {
      // File
      const file = createMockFile(name, fullPath, content || 1000);
      entries.push(file);
    }
  }

  return entries;
};

/**
 * Cloud folder simulation scenarios for testing
 */
export const cloudFolderScenarios = {
  /**
   * OneDrive folder that hangs on readEntries
   */
  oneDriveHanging: (files = []) =>
    createMockDirectory(
      'OneDrive',
      '/OneDrive',
      files,
      true // shouldHang
    ),

  /**
   * Google Drive folder with delayed hanging
   */
  googleDriveDelayed: (files = [], delay = 500) =>
    createMockDirectory(
      'Google Drive',
      '/Google Drive',
      files,
      true, // shouldHang
      delay
    ),

  /**
   * Mixed local/cloud folder structure
   */
  mixedContent: () => {
    const localFiles = [
      createMockFile('local1.txt', '/mixed/local1.txt'),
      createMockFile('local2.txt', '/mixed/local2.txt'),
    ];

    const cloudSubfolder = cloudFolderScenarios.oneDriveHanging([
      createMockFile('cloud1.txt', '/mixed/OneDrive/cloud1.txt'),
      createMockFile('cloud2.txt', '/mixed/OneDrive/cloud2.txt'),
    ]);

    return createMockDirectory('mixed', '/mixed', [...localFiles, cloudSubfolder]);
  },

  /**
   * All cloud content (should timeout completely)
   */
  allCloud: () => {
    return createMockDirectory(
      'AllCloud',
      '/AllCloud',
      [
        createMockFile('cloud1.txt', '/AllCloud/cloud1.txt'),
        createMockFile('cloud2.txt', '/AllCloud/cloud2.txt'),
      ],
      true // shouldHang
    );
  },

  /**
   * Large local folder (performance testing)
   */
  largeLocal: (fileCount = 1000) => {
    const files = Array.from({ length: fileCount }, (_, i) =>
      createMockFile(`file${i}.txt`, `/large/file${i}.txt`)
    );

    return createMockDirectory('large', '/large', files);
  },
};

/**
 * Memory leak testing utilities
 */
export const memoryTestUtils = {
  /**
   * Tracks AbortController instances for memory leak detection
   */
  trackControllers: () => {
    const controllers = [];
    const originalAbortController = global.AbortController;

    global.AbortController = vi.fn((options) => {
      const controller = new originalAbortController(options);
      controllers.push(controller);
      return controller;
    });

    return {
      getControllerCount: () => controllers.length,
      cleanup: () => {
        global.AbortController = originalAbortController;
      },
      verifyAllAborted: () => {
        return controllers.every((controller) => controller.signal.aborted);
      },
    };
  },

  /**
   * Simulates memory pressure for performance testing
   */
  simulateMemoryPressure: (iterations = 100) => {
    const largeArrays = [];

    for (let i = 0; i < iterations; i++) {
      // Create large arrays to simulate memory pressure
      largeArrays.push(new Array(10000).fill(Math.random()));
    }

    return () => {
      largeArrays.length = 0; // Cleanup
    };
  },
};

/**
 * Browser compatibility testing mocks
 */
export const browserCompatMocks = {
  /**
   * Mock legacy browser without AbortController
   */
  legacyBrowser: () => {
    const originalAbortController = global.AbortController;
    const originalAbortSignal = global.AbortSignal;

    global.AbortController = undefined;
    global.AbortSignal = undefined;

    return () => {
      global.AbortController = originalAbortController;
      global.AbortSignal = originalAbortSignal;
    };
  },

  /**
   * Mock browser without AbortSignal.timeout
   */
  noTimeoutSupport: () => {
    const originalTimeout = global.AbortSignal?.timeout;

    if (global.AbortSignal) {
      global.AbortSignal.timeout = undefined;
    }

    return () => {
      if (global.AbortSignal && originalTimeout) {
        global.AbortSignal.timeout = originalTimeout;
      }
    };
  },

  /**
   * Mock different readEntries behaviors across browsers
   */
  browserReadEntriesBehaviors: {
    chrome: (entries) => {
      // Chrome returns max 100 entries per call
      const chunks = [];
      for (let i = 0; i < entries.length; i += 100) {
        chunks.push(entries.slice(i, i + 100));
      }

      let chunkIndex = 0;
      return (callback) => {
        setTimeout(() => {
          if (chunkIndex < chunks.length) {
            callback(chunks[chunkIndex++]);
          } else {
            callback([]);
          }
        }, 10);
      };
    },

    firefox: (entries) => {
      // Firefox returns all entries at once
      let called = false;
      return (callback) => {
        setTimeout(() => {
          if (!called) {
            called = true;
            callback([...entries]);
          } else {
            callback([]);
          }
        }, 10);
      };
    },
  },
};
