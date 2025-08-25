import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useFolderTimeouts } from './useFolderTimeouts.js'

// Mock browser APIs
global.AbortController = vi.fn(() => ({
  signal: { aborted: false },
  abort: vi.fn()
}))

// Mock AbortSignal.timeout for browsers that support it
global.AbortSignal = {
  timeout: vi.fn((timeout) => ({
    aborted: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onabort: null
  }))
}

describe('useFolderTimeouts - Modern Two-Tier Timeout System', () => {
  let timeoutSystem
  let mockController
  let mockSignal

  beforeEach(() => {
    vi.useFakeTimers()
    
    // Reset mocks
    mockController = {
      signal: { aborted: false, addEventListener: vi.fn(), removeEventListener: vi.fn() },
      abort: vi.fn()
    }
    mockSignal = mockController.signal
    
    global.AbortController.mockReturnValue(mockController)
    global.AbortSignal.timeout.mockReturnValue(mockSignal)
    
    timeoutSystem = useFolderTimeouts()
  })

  afterEach(() => {
    vi.restoreAllTimers()
    vi.clearAllMocks()
  })

  describe('AbortController Integration', () => {
    it('should create AbortController for timeout handling', () => {
      const controller = timeoutSystem.createTimeoutController(1000)
      
      expect(global.AbortController).toHaveBeenCalled()
      expect(controller.signal).toBeDefined()
    })

    it('should use AbortSignal.timeout when available', () => {
      timeoutSystem.createLocalTimeout(1000)
      
      expect(global.AbortSignal.timeout).toHaveBeenCalledWith(1000)
    })

    it('should fallback to setTimeout when AbortSignal.timeout unavailable', () => {
      // Mock browser without AbortSignal.timeout
      global.AbortSignal.timeout = undefined
      
      const timeoutSpy = vi.spyOn(global, 'setTimeout')
      
      timeoutSystem.createLocalTimeout(1000)
      
      expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000)
      
      timeoutSpy.mockRestore()
    })
  })

  describe('Two-Tier Timeout System', () => {
    it('should implement 1-second local timeout', async () => {
      const onLocalTimeout = vi.fn()
      
      timeoutSystem.startLocalTimeout(1000, onLocalTimeout)
      
      // Fast-forward 1 second
      vi.advanceTimersByTime(1000)
      
      expect(onLocalTimeout).toHaveBeenCalled()
    })

    it('should implement 15-second global timeout', async () => {
      const onGlobalTimeout = vi.fn()
      
      timeoutSystem.startGlobalTimeout(15000, onGlobalTimeout)
      
      // Fast-forward 15 seconds
      vi.advanceTimersByTime(15000)
      
      expect(onGlobalTimeout).toHaveBeenCalled()
    })

    it('should reset global timeout on progress', () => {
      const onGlobalTimeout = vi.fn()
      
      timeoutSystem.startGlobalTimeout(15000, onGlobalTimeout)
      
      // Advance 10 seconds
      vi.advanceTimersByTime(10000)
      
      // Reset timeout due to progress
      timeoutSystem.resetGlobalTimeout()
      
      // Advance another 10 seconds (should not timeout yet)
      vi.advanceTimersByTime(10000)
      
      expect(onGlobalTimeout).not.toHaveBeenCalled()
      
      // Advance 5 more seconds to complete new 15s cycle
      vi.advanceTimersByTime(5000)
      
      expect(onGlobalTimeout).toHaveBeenCalled()
    })
  })

  describe('Skipped Folder Tracking', () => {
    it('should initialize empty skipped folders array', () => {
      expect(timeoutSystem.skippedFolders.value).toEqual([])
    })

    it('should add folder to skipped list on timeout', () => {
      const folderPath = '/OneDrive/Documents'
      
      timeoutSystem.addSkippedFolder(folderPath)
      
      expect(timeoutSystem.skippedFolders.value).toContain(folderPath)
    })

    it('should clear skipped folders on reset', () => {
      timeoutSystem.addSkippedFolder('/OneDrive/Documents')
      timeoutSystem.addSkippedFolder('/GoogleDrive/Files')
      
      expect(timeoutSystem.skippedFolders.value).toHaveLength(2)
      
      timeoutSystem.resetSkippedFolders()
      
      expect(timeoutSystem.skippedFolders.value).toEqual([])
    })

    it('should not add duplicate folder paths', () => {
      const folderPath = '/OneDrive/Documents'
      
      timeoutSystem.addSkippedFolder(folderPath)
      timeoutSystem.addSkippedFolder(folderPath)
      
      expect(timeoutSystem.skippedFolders.value).toHaveLength(1)
    })
  })

  describe('Progress Message System', () => {
    it('should initialize with empty progress message', () => {
      expect(timeoutSystem.currentProgressMessage.value).toBe('')
    })

    it('should update progress message selectively', () => {
      timeoutSystem.updateProgressMessage('Scanning folders...')
      
      expect(timeoutSystem.currentProgressMessage.value).toBe('Scanning folders...')
    })

    it('should show skip notifications for timed-out folders', () => {
      const folderPath = '/OneDrive/Documents'
      
      timeoutSystem.showSkipNotification(folderPath)
      
      expect(timeoutSystem.currentProgressMessage.value).toBe("⚠️ Skipped 'Documents'")
    })

    it('should show completion message with file count', () => {
      timeoutSystem.showCompletionMessage(150)
      
      expect(timeoutSystem.currentProgressMessage.value).toMatch(/150 files/)
    })
  })

  describe('Cascade Prevention', () => {
    it('should cancel parent timeouts when child times out', () => {
      const parentController = { abort: vi.fn() }
      const childController = { abort: vi.fn() }
      
      timeoutSystem.registerParentController(parentController)
      timeoutSystem.handleChildTimeout('/OneDrive/SubFolder', childController)
      
      expect(parentController.abort).toHaveBeenCalled()
    })

    it('should prevent multiple timeout messages for same folder tree', () => {
      const updateMessageSpy = vi.spyOn(timeoutSystem, 'updateProgressMessage')
      
      // First timeout should show message
      timeoutSystem.handleFolderTimeout('/OneDrive/Documents')
      expect(updateMessageSpy).toHaveBeenCalledWith("⚠️ Skipped 'Documents'")
      
      // Child timeout should not show additional message
      updateMessageSpy.mockClear()
      timeoutSystem.handleFolderTimeout('/OneDrive/Documents/SubFolder')
      expect(updateMessageSpy).not.toHaveBeenCalled()
    })
  })

  describe('Browser Compatibility', () => {
    it('should detect AbortSignal.timeout availability', () => {
      expect(timeoutSystem.hasModernTimeoutSupport()).toBe(true)
      
      // Mock older browser
      global.AbortSignal.timeout = undefined
      timeoutSystem = useFolderTimeouts()
      
      expect(timeoutSystem.hasModernTimeoutSupport()).toBe(false)
    })

    it('should use legacy setTimeout fallback gracefully', () => {
      // Mock older browser
      global.AbortSignal.timeout = undefined
      
      const timeoutSpy = vi.spyOn(global, 'setTimeout')
      const onTimeout = vi.fn()
      
      timeoutSystem.createLocalTimeout(1000, onTimeout)
      
      // Should fall back to setTimeout
      expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000)
      
      // Advance time and verify callback
      vi.advanceTimersByTime(1000)
      expect(onTimeout).toHaveBeenCalled()
      
      timeoutSpy.mockRestore()
    })
  })

  describe('Memory Leak Prevention', () => {
    it('should clean up all AbortControllers on timeout system reset', () => {
      const controller1 = { abort: vi.fn(), signal: { removeEventListener: vi.fn() } }
      const controller2 = { abort: vi.fn(), signal: { removeEventListener: vi.fn() } }
      
      timeoutSystem.registerController(controller1)
      timeoutSystem.registerController(controller2)
      
      timeoutSystem.cleanup()
      
      expect(controller1.signal.removeEventListener).toHaveBeenCalled()
      expect(controller2.signal.removeEventListener).toHaveBeenCalled()
    })

    it('should clear all timers on cleanup', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      
      timeoutSystem.startLocalTimeout(1000, vi.fn())
      timeoutSystem.startGlobalTimeout(15000, vi.fn())
      
      timeoutSystem.cleanup()
      
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2)
      
      clearTimeoutSpy.mockRestore()
    })

    it('should reset all reactive state on cleanup', () => {
      timeoutSystem.addSkippedFolder('/OneDrive/Test')
      timeoutSystem.updateProgressMessage('Testing...')
      
      timeoutSystem.cleanup()
      
      expect(timeoutSystem.skippedFolders.value).toEqual([])
      expect(timeoutSystem.currentProgressMessage.value).toBe('')
    })
  })

  describe('Cloud File Detection Integration', () => {
    it('should trigger timeout after 1000ms with no progress', async () => {
      const onCloudDetected = vi.fn()
      
      timeoutSystem.startCloudDetection(onCloudDetected)
      
      // Simulate no progress for 1000ms
      vi.advanceTimersByTime(1000)
      
      expect(onCloudDetected).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'no_progress',
          timeElapsed: 1000
        })
      )
    })

    it('should continue processing on progress detected', () => {
      const onCloudDetected = vi.fn()
      
      timeoutSystem.startCloudDetection(onCloudDetected)
      
      // Simulate progress at 500ms
      vi.advanceTimersByTime(500)
      timeoutSystem.reportProgress(10) // 10 files detected
      
      // Advance another 600ms (total 1100ms)
      vi.advanceTimersByTime(600)
      
      // Should not timeout because progress was made
      expect(onCloudDetected).not.toHaveBeenCalled()
    })
  })

  describe('Error Scenarios', () => {
    it('should handle AbortController creation failure', () => {
      global.AbortController.mockImplementation(() => {
        throw new Error('AbortController not supported')
      })
      
      expect(() => timeoutSystem.createTimeoutController(1000)).not.toThrow()
    })

    it('should handle timeout callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error')
      })
      
      timeoutSystem.startLocalTimeout(1000, errorCallback)
      
      expect(() => vi.advanceTimersByTime(1000)).not.toThrow()
      expect(errorCallback).toHaveBeenCalled()
    })

    it('should provide meaningful error messages for cloud detection', () => {
      const folderName = 'OneDrive Folder'
      
      timeoutSystem.handleFolderTimeout(`/${folderName}/Documents`)
      
      expect(timeoutSystem.currentProgressMessage.value).toContain(folderName)
      expect(timeoutSystem.currentProgressMessage.value).toContain('⚠️')
    })
  })
})