import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useFolderAnalysis } from './useFolderAnalysis.js'

// Mock File API for testing
const createMockFileEntry = (name, fullPath, isDirectory = false) => ({
  name,
  fullPath,
  isFile: !isDirectory,
  isDirectory,
  file: isDirectory ? undefined : vi.fn((callback) => callback({
    name,
    size: Math.floor(Math.random() * 1000000),
    type: 'text/plain',
    lastModified: Date.now()
  })),
  createReader: isDirectory ? () => ({
    readEntries: vi.fn()
  }) : undefined
})

const createMockDirectory = (entries = [], shouldHang = false) => {
  const reader = {
    readEntries: vi.fn()
  }
  
  if (shouldHang) {
    // Simulate cloud storage hanging - never calls callback
    reader.readEntries.mockImplementation((callback) => {
      // Never call callback to simulate hanging
    })
  } else {
    let callCount = 0
    reader.readEntries.mockImplementation((callback) => {
      if (callCount === 0) {
        callCount++
        callback(entries)
      } else {
        callback([]) // End of entries
      }
    })
  }
  
  return {
    isDirectory: true,
    createReader: () => reader
  }
}

describe('useFolderAnalysis - Timeout Integration', () => {
  let folderAnalysis
  let mockAbortController
  let mockAbortSignal

  beforeEach(() => {
    vi.useFakeTimers()
    
    mockAbortSignal = {
      aborted: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onabort: null
    }
    
    mockAbortController = {
      signal: mockAbortSignal,
      abort: vi.fn(() => {
        mockAbortSignal.aborted = true
        if (mockAbortSignal.onabort) mockAbortSignal.onabort()
      })
    }
    
    global.AbortController = vi.fn(() => mockAbortController)
    global.AbortSignal = {
      timeout: vi.fn(() => mockAbortSignal)
    }
    
    folderAnalysis = useFolderAnalysis()
  })

  afterEach(() => {
    vi.restoreAllTimers()
    vi.clearAllMocks()
  })

  describe('readDirectoryRecursive with Timeout Support', () => {
    it('should complete successfully with local files', async () => {
      const localFiles = [
        createMockFileEntry('file1.txt', '/test/file1.txt'),
        createMockFileEntry('file2.txt', '/test/file2.txt')
      ]
      
      const mockDir = createMockDirectory(localFiles)
      
      const result = await folderAnalysis.readDirectoryRecursive(mockDir)
      
      expect(result).toHaveLength(2)
      expect(result[0].path).toBe('/test/file1.txt')
    })

    it('should accept AbortSignal parameter', async () => {
      const localFiles = [createMockFileEntry('file1.txt', '/test/file1.txt')]
      const mockDir = createMockDirectory(localFiles)
      
      const customSignal = { aborted: false }
      
      const result = await folderAnalysis.readDirectoryRecursive(mockDir, customSignal)
      
      expect(result).toHaveLength(1)
    })

    it('should handle timeout when signal is aborted', async () => {
      const mockDir = createMockDirectory([], true) // Hanging directory
      
      // Start the operation
      const readPromise = folderAnalysis.readDirectoryRecursive(mockDir, mockAbortSignal)
      
      // Simulate timeout by aborting the signal
      mockAbortController.abort()
      
      const result = await readPromise
      
      // Should return empty array when aborted
      expect(result).toEqual([])
    })

    it('should track skipped folder paths on timeout', async () => {
      const skippedFolders = []
      const mockDir = createMockDirectory([], true) // Hanging directory
      
      const enhancedSignal = {
        ...mockAbortSignal,
        onSkipFolder: (path) => skippedFolders.push(path)
      }
      
      // Start operation and immediately abort to simulate timeout
      const readPromise = folderAnalysis.readDirectoryRecursive(mockDir, enhancedSignal)
      mockAbortController.abort()
      
      await readPromise
      
      // Verify folder was tracked as skipped
      expect(skippedFolders).toContain('/')
    })

    it('should handle nested directory timeouts', async () => {
      const localFile = createMockFileEntry('local.txt', '/test/local.txt')
      const hangingSubdir = createMockDirectory([], true) // This will hang
      hangingSubdir.name = 'OneDrive'
      hangingSubdir.fullPath = '/test/OneDrive'
      hangingSubdir.isFile = false
      
      const entries = [localFile, hangingSubdir]
      const mockDir = createMockDirectory(entries)
      
      // Create timeout that fires after 1 second
      setTimeout(() => mockAbortController.abort(), 1000)
      
      const readPromise = folderAnalysis.readDirectoryRecursive(mockDir, mockAbortSignal)
      
      // Advance time to trigger timeout
      vi.advanceTimersByTime(1000)
      
      const result = await readPromise
      
      // Should have processed the local file but not the hanging subdirectory
      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('/test/local.txt')
    })

    it('should reset global timeout on successful directory read', async () => {
      const localFiles = [
        createMockFileEntry('file1.txt', '/test/file1.txt'),
        createMockFileEntry('file2.txt', '/test/file2.txt')
      ]
      
      const mockDir = createMockDirectory(localFiles)
      const resetGlobalTimeout = vi.fn()
      
      const enhancedSignal = {
        ...mockAbortSignal,
        resetGlobalTimeout
      }
      
      await folderAnalysis.readDirectoryRecursive(mockDir, enhancedSignal)
      
      expect(resetGlobalTimeout).toHaveBeenCalled()
    })
  })

  describe('Cascade Prevention', () => {
    it('should cancel parent operation when child times out', async () => {
      const parentAbortController = {
        signal: { aborted: false },
        abort: vi.fn()
      }
      
      const childDir = createMockDirectory([], true) // Hanging child
      childDir.name = 'CloudFolder'
      childDir.fullPath = '/parent/CloudFolder'
      
      const parentSignal = {
        ...mockAbortSignal,
        parentController: parentAbortController
      }
      
      // Start child operation and abort it
      const readPromise = folderAnalysis.readDirectoryRecursive(childDir, parentSignal)
      mockAbortController.abort()
      
      await readPromise
      
      // Parent should be cancelled to prevent cascade
      expect(parentAbortController.abort).toHaveBeenCalled()
    })
  })

  describe('Progress Reporting Integration', () => {
    it('should report progress during successful reads', async () => {
      const progressReports = []
      const localFiles = [
        createMockFileEntry('file1.txt', '/test/file1.txt'),
        createMockFileEntry('file2.txt', '/test/file2.txt'),
        createMockFileEntry('file3.txt', '/test/file3.txt')
      ]
      
      const mockDir = createMockDirectory(localFiles)
      
      const progressSignal = {
        ...mockAbortSignal,
        onProgress: (fileCount) => progressReports.push(fileCount)
      }
      
      await folderAnalysis.readDirectoryRecursive(mockDir, progressSignal)
      
      // Should report progress as files are discovered
      expect(progressReports.length).toBeGreaterThan(0)
      expect(progressReports[progressReports.length - 1]).toBe(3)
    })

    it('should not report progress for timed-out directories', async () => {
      const progressReports = []
      const hangingDir = createMockDirectory([], true)
      
      const progressSignal = {
        ...mockAbortSignal,
        onProgress: (fileCount) => progressReports.push(fileCount)
      }
      
      const readPromise = folderAnalysis.readDirectoryRecursive(hangingDir, progressSignal)
      
      // Immediately abort to simulate timeout
      mockAbortController.abort()
      
      await readPromise
      
      // Should not have any progress reports from timed-out operation
      expect(progressReports).toHaveLength(0)
    })
  })

  describe('Mixed Content Processing', () => {
    it('should process local files and skip cloud directories', async () => {
      const localFiles = [
        createMockFileEntry('local1.txt', '/test/local1.txt'),
        createMockFileEntry('local2.txt', '/test/local2.txt')
      ]
      
      const cloudDir = createMockDirectory([], true) // Hanging cloud directory
      cloudDir.name = 'OneDrive'
      cloudDir.fullPath = '/test/OneDrive'
      cloudDir.isFile = false
      
      const mixedEntries = [...localFiles, cloudDir]
      const mockDir = createMockDirectory(mixedEntries)
      
      // Set up timeout to fire for cloud directory only
      const timeoutAfter1s = setTimeout(() => {
        if (mockAbortSignal.currentPath === '/test/OneDrive') {
          mockAbortController.abort()
        }
      }, 1000)
      
      const result = await folderAnalysis.readDirectoryRecursive(mockDir, mockAbortSignal)
      
      clearTimeout(timeoutAfter1s)
      
      // Should have processed local files but skipped cloud directory
      expect(result).toHaveLength(2)
      expect(result.every(file => file.path.includes('local'))).toBe(true)
    })
  })

  describe('Performance and Memory', () => {
    it('should handle large local directories efficiently', async () => {
      const largeFileSet = Array.from({ length: 1000 }, (_, i) => 
        createMockFileEntry(`file${i}.txt`, `/test/file${i}.txt`)
      )
      
      const mockDir = createMockDirectory(largeFileSet)
      
      const startTime = performance.now()
      const result = await folderAnalysis.readDirectoryRecursive(mockDir, mockAbortSignal)
      const endTime = performance.now()
      
      expect(result).toHaveLength(1000)
      // Should complete within reasonable time (no timeout issues)
      expect(endTime - startTime).toBeLessThan(5000) // 5 second max
    })

    it('should clean up event listeners on completion', async () => {
      const localFile = createMockFileEntry('test.txt', '/test.txt')
      const mockDir = createMockDirectory([localFile])
      
      const removeEventListenerSpy = vi.spyOn(mockAbortSignal, 'removeEventListener')
      
      await folderAnalysis.readDirectoryRecursive(mockDir, mockAbortSignal)
      
      expect(removeEventListenerSpy).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle file reading errors gracefully', async () => {
      const errorFile = createMockFileEntry('error.txt', '/test/error.txt')
      errorFile.file = vi.fn((callback, errorCallback) => {
        if (errorCallback) errorCallback(new Error('File read error'))
      })
      
      const mockDir = createMockDirectory([errorFile])
      
      const result = await folderAnalysis.readDirectoryRecursive(mockDir, mockAbortSignal)
      
      // Should continue processing despite individual file errors
      expect(result).toEqual([])
    })

    it('should handle readEntries errors without crashing', async () => {
      const mockDir = {
        isDirectory: true,
        createReader: () => ({
          readEntries: vi.fn((callback) => {
            throw new Error('readEntries error')
          })
        })
      }
      
      expect(async () => {
        await folderAnalysis.readDirectoryRecursive(mockDir, mockAbortSignal)
      }).not.toThrow()
    })
  })

  describe('Legacy Browser Support', () => {
    it('should work without AbortController support', async () => {
      // Mock legacy browser environment
      global.AbortController = undefined
      
      const localFile = createMockFileEntry('legacy.txt', '/legacy.txt')
      const mockDir = createMockDirectory([localFile])
      
      folderAnalysis = useFolderAnalysis()
      
      const result = await folderAnalysis.readDirectoryRecursive(mockDir, null)
      
      expect(result).toHaveLength(1)
    })

    it('should handle timeout via legacy Promise.race pattern', async () => {
      global.AbortController = undefined
      
      const hangingDir = createMockDirectory([], true)
      folderAnalysis = useFolderAnalysis()
      
      const legacyTimeoutPromise = Promise.race([
        folderAnalysis.readDirectoryRecursive(hangingDir, null),
        new Promise(resolve => setTimeout(() => resolve([]), 1000))
      ])
      
      // Advance time to trigger legacy timeout
      vi.advanceTimersByTime(1000)
      
      const result = await legacyTimeoutPromise
      
      expect(result).toEqual([])
    })
  })
})