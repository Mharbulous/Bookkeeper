import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFolderTimeouts } from '../features/file-upload/composables/useFolderTimeouts.js';
import { useFolderAnalysis } from '@/features/file-upload/composables/useFolderAnalysis.js';
import { memoryTestUtils, cloudFolderScenarios } from '../test-utils/mockFileAPI.js';

describe('Memory Leak Prevention Tests', () => {
  let controllerTracker;
  let memoryPressureCleanup;

  beforeEach(() => {
    vi.useFakeTimers();
    controllerTracker = memoryTestUtils.trackControllers();
    memoryPressureCleanup = memoryTestUtils.simulateMemoryPressure(50);
  });

  afterEach(() => {
    vi.restoreAllTimers();
    controllerTracker.cleanup();
    if (memoryPressureCleanup) memoryPressureCleanup();
    vi.clearAllMocks();
  });

  describe('AbortController Memory Management', () => {
    it('should clean up all AbortControllers after timeout system reset', () => {
      const timeoutSystem = useFolderTimeouts();

      // Create multiple timeout operations
      timeoutSystem.startLocalTimeout(1000, vi.fn());
      timeoutSystem.startGlobalTimeout(15000, vi.fn());
      timeoutSystem.createTimeoutController(5000);

      const initialControllerCount = controllerTracker.getControllerCount();
      expect(initialControllerCount).toBeGreaterThan(0);

      // Cleanup should abort all controllers
      timeoutSystem.cleanup();

      expect(controllerTracker.verifyAllAborted()).toBe(true);
    });

    it('should not leak AbortControllers during repeated timeout cycles', () => {
      const timeoutSystem = useFolderTimeouts();

      // Run multiple timeout cycles
      for (let i = 0; i < 10; i++) {
        timeoutSystem.startLocalTimeout(100, vi.fn());
        vi.advanceTimersByTime(100);
        timeoutSystem.cleanup();
      }

      // All controllers from cycles should be properly cleaned up
      expect(controllerTracker.verifyAllAborted()).toBe(true);
    });

    it('should handle controller cleanup during active timeouts', () => {
      const timeoutSystem = useFolderTimeouts();

      const onTimeout = vi.fn();
      timeoutSystem.startLocalTimeout(1000, onTimeout);

      // Cleanup before timeout fires
      vi.advanceTimersByTime(500);
      timeoutSystem.cleanup();

      // Continue time - callback should not fire after cleanup
      vi.advanceTimersByTime(1000);

      expect(onTimeout).not.toHaveBeenCalled();
      expect(controllerTracker.verifyAllAborted()).toBe(true);
    });
  });

  describe('Event Listener Memory Management', () => {
    it('should remove all event listeners on timeout cleanup', () => {
      const timeoutSystem = useFolderTimeouts();
      const mockSignal = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        aborted: false,
      };

      const mockController = {
        signal: mockSignal,
        abort: vi.fn(),
      };

      global.AbortController = vi.fn(() => mockController);

      timeoutSystem.startLocalTimeout(1000, vi.fn());

      expect(mockSignal.addEventListener).toHaveBeenCalled();

      timeoutSystem.cleanup();

      expect(mockSignal.removeEventListener).toHaveBeenCalled();
    });

    it('should prevent event listener accumulation in repeated operations', () => {
      const timeoutSystem = useFolderTimeouts();
      const addEventListenerCalls = [];
      const removeEventListenerCalls = [];

      const mockSignal = {
        addEventListener: vi.fn((...args) => addEventListenerCalls.push(args)),
        removeEventListener: vi.fn((...args) => removeEventListenerCalls.push(args)),
        aborted: false,
      };

      global.AbortController = vi.fn(() => ({
        signal: mockSignal,
        abort: vi.fn(),
      }));

      // Multiple operations should clean up properly
      for (let i = 0; i < 5; i++) {
        timeoutSystem.startLocalTimeout(100, vi.fn());
        timeoutSystem.cleanup();
      }

      // Should have equal add/remove calls
      expect(addEventListenerCalls.length).toBe(removeEventListenerCalls.length);
    });
  });

  describe('Timer Memory Management', () => {
    it('should clear all setTimeout instances on cleanup', () => {
      const timeoutSystem = useFolderTimeouts();
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      // Create multiple timers
      timeoutSystem.startLocalTimeout(1000, vi.fn());
      timeoutSystem.startGlobalTimeout(15000, vi.fn());

      timeoutSystem.cleanup();

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);

      clearTimeoutSpy.mockRestore();
    });

    it('should handle timer cleanup with invalid timer IDs', () => {
      const timeoutSystem = useFolderTimeouts();

      // Manually corrupt timer state to test robustness
      timeoutSystem.localTimeoutId = 'invalid';
      timeoutSystem.globalTimeoutId = null;

      expect(() => timeoutSystem.cleanup()).not.toThrow();
    });
  });

  describe('Reactive State Memory Management', () => {
    it('should reset all reactive arrays and objects', () => {
      const timeoutSystem = useFolderTimeouts();

      // Populate state
      timeoutSystem.addSkippedFolder('/OneDrive/Test1');
      timeoutSystem.addSkippedFolder('/OneDrive/Test2');
      timeoutSystem.updateProgressMessage('Testing...');

      expect(timeoutSystem.skippedFolders.value).toHaveLength(2);
      expect(timeoutSystem.currentProgressMessage.value).toBe('Testing...');

      timeoutSystem.cleanup();

      expect(timeoutSystem.skippedFolders.value).toEqual([]);
      expect(timeoutSystem.currentProgressMessage.value).toBe('');
    });

    it('should handle cleanup of large reactive arrays', () => {
      const timeoutSystem = useFolderTimeouts();

      // Add many skipped folders to test large array cleanup
      for (let i = 0; i < 1000; i++) {
        timeoutSystem.addSkippedFolder(`/Cloud/Folder${i}`);
      }

      expect(timeoutSystem.skippedFolders.value).toHaveLength(1000);

      const cleanupStart = performance.now();
      timeoutSystem.cleanup();
      const cleanupEnd = performance.now();

      expect(timeoutSystem.skippedFolders.value).toEqual([]);
      expect(cleanupEnd - cleanupStart).toBeLessThan(100); // Should be fast
    });
  });

  describe('Integration Memory Testing', () => {
    it('should handle complete folder analysis cycle without leaks', async () => {
      const folderAnalysis = useFolderAnalysis();
      const timeoutSystem = useFolderTimeouts();

      const initialControllers = controllerTracker.getControllerCount();

      // Simulate complete cycle with cloud folders
      const cloudFolder = cloudFolderScenarios.mixedContent();

      const mockSignal = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        aborted: false,
      };

      const analysisPromise = folderAnalysis.readDirectoryRecursive(cloudFolder, mockSignal);

      // Simulate timeout
      vi.advanceTimersByTime(1000);
      mockSignal.aborted = true;

      await analysisPromise;

      // Cleanup both systems
      timeoutSystem.cleanup();

      // Should not have accumulated additional controllers beyond the test cycle
      const finalControllers = controllerTracker.getControllerCount();
      expect(finalControllers).toBe(initialControllers);
    });

    it('should handle multiple concurrent timeout operations', async () => {
      const timeoutSystem = useFolderTimeouts();
      const folderAnalysis = useFolderAnalysis();

      const operations = [];

      // Start multiple concurrent operations
      for (let i = 0; i < 5; i++) {
        const cloudFolder = cloudFolderScenarios.allCloud();
        const mockSignal = {
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          aborted: false,
        };

        operations.push({
          promise: folderAnalysis.readDirectoryRecursive(cloudFolder, mockSignal),
          signal: mockSignal,
        });

        timeoutSystem.startLocalTimeout(500, vi.fn());
      }

      // Let operations run for a bit
      vi.advanceTimersByTime(300);

      // Abort all operations
      operations.forEach((op) => {
        op.signal.aborted = true;
      });

      await Promise.all(operations.map((op) => op.promise));

      timeoutSystem.cleanup();

      // Verify all controllers properly cleaned up
      expect(controllerTracker.verifyAllAborted()).toBe(true);
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid timeout creation/destruction cycles', () => {
      const timeoutSystem = useFolderTimeouts();

      const cycles = 100;

      for (let i = 0; i < cycles; i++) {
        timeoutSystem.startLocalTimeout(10, vi.fn());
        vi.advanceTimersByTime(5);
        timeoutSystem.cleanup();
      }

      // Should complete without memory issues
      expect(controllerTracker.verifyAllAborted()).toBe(true);
    });

    it('should maintain performance under memory pressure', () => {
      const timeoutSystem = useFolderTimeouts();

      // Create additional memory pressure
      const additionalPressure = memoryTestUtils.simulateMemoryPressure(200);

      const operationStart = performance.now();

      // Perform normal timeout operations under pressure
      timeoutSystem.startLocalTimeout(100, vi.fn());
      timeoutSystem.startGlobalTimeout(1000, vi.fn());

      vi.advanceTimersByTime(100);

      timeoutSystem.cleanup();

      const operationEnd = performance.now();

      // Should still complete in reasonable time under memory pressure
      expect(operationEnd - operationStart).toBeLessThan(1000);

      additionalPressure();
    });

    it('should handle edge case cleanup scenarios', () => {
      const timeoutSystem = useFolderTimeouts();

      // Test multiple cleanup calls (should be safe)
      timeoutSystem.startLocalTimeout(100, vi.fn());
      timeoutSystem.cleanup();
      timeoutSystem.cleanup();
      timeoutSystem.cleanup();

      expect(() => timeoutSystem.cleanup()).not.toThrow();

      // Test cleanup with no active operations
      const emptyTimeoutSystem = useFolderTimeouts();
      expect(() => emptyTimeoutSystem.cleanup()).not.toThrow();
    });
  });

  describe('Browser Compatibility Memory Management', () => {
    it('should handle memory management in legacy browsers', () => {
      // Mock legacy browser
      global.AbortController = undefined;
      global.AbortSignal = undefined;

      const timeoutSystem = useFolderTimeouts();

      // Should use setTimeout fallback without memory leaks
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      timeoutSystem.startLocalTimeout(100, vi.fn());
      expect(setTimeoutSpy).toHaveBeenCalled();

      timeoutSystem.cleanup();
      expect(clearTimeoutSpy).toHaveBeenCalled();

      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
    });

    it('should gracefully handle AbortController creation failures', () => {
      global.AbortController = vi.fn(() => {
        throw new Error('AbortController creation failed');
      });

      const timeoutSystem = useFolderTimeouts();

      // Should fallback gracefully without memory leaks
      expect(() => timeoutSystem.startLocalTimeout(100, vi.fn())).not.toThrow();
      expect(() => timeoutSystem.cleanup()).not.toThrow();
    });
  });
});
