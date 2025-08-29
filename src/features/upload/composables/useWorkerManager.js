import { ref, reactive, onUnmounted } from 'vue';
import { useWebWorker } from './useWebWorker';

/**
 * Centralized Web Worker management composable
 * Provides high-level worker lifecycle management with error recovery and monitoring
 */
export function useWorkerManager() {
  // Worker instances registry
  const workers = reactive(new Map());

  // Global worker state
  const globalWorkerState = ref({
    totalWorkers: 0,
    activeWorkers: 0,
    failedWorkers: 0,
    healthyWorkers: 0,
  });

  // Worker management options
  const defaultOptions = {
    autoRestart: true,
    maxRestartAttempts: 3,
    restartDelay: 1000, // 1 second
    healthCheckInterval: 30000, // 30 seconds
    enableMonitoring: true,
  };

  // Create or get a worker instance
  const createWorker = (workerId, workerPath, options = {}) => {
    const config = { ...defaultOptions, ...options };

    if (workers.has(workerId)) {
      console.warn(`Worker ${workerId} already exists`);
      return workers.get(workerId);
    }

    const workerInstance = useWebWorker(workerPath);
    const workerState = reactive({
      id: workerId,
      path: workerPath,
      instance: workerInstance,
      config,
      restartAttempts: 0,
      lastRestart: null,
      createdAt: Date.now(),
      errors: [],
      stats: {
        messagesProcessed: 0,
        errorsEncountered: 0,
        averageResponseTime: 0,
        lastActivity: null,
      },
    });

    // Initialize the worker
    const initialized = workerInstance.initializeWorker();
    if (!initialized) {
      console.error(`Failed to initialize worker ${workerId}`);
      return null;
    }

    // Set up error monitoring
    setupWorkerMonitoring(workerState);

    workers.set(workerId, workerState);
    updateGlobalState();

    return workerState;
  };

  // Set up monitoring for a worker
  const setupWorkerMonitoring = (workerState) => {
    const { instance, config } = workerState;

    if (!config.enableMonitoring) return;

    // Monitor worker errors
    const originalSendMessage = instance.sendMessage;
    instance.sendMessage = async (message, options = {}) => {
      const startTime = Date.now();

      try {
        const result = await originalSendMessage(message, options);

        // Update stats on success
        const responseTime = Date.now() - startTime;
        workerState.stats.messagesProcessed++;
        workerState.stats.lastActivity = Date.now();

        // Update average response time
        const { averageResponseTime, messagesProcessed } = workerState.stats;
        workerState.stats.averageResponseTime =
          (averageResponseTime * (messagesProcessed - 1) + responseTime) / messagesProcessed;

        return result;
      } catch (error) {
        // Handle worker errors
        workerState.stats.errorsEncountered++;
        workerState.errors.push({
          timestamp: Date.now(),
          message: error.message,
          type: 'processing-error',
        });

        // Auto-restart on critical errors if enabled
        if (config.autoRestart && shouldRestartWorker(workerState, error)) {
          console.warn(`Auto-restarting worker ${workerState.id} due to error:`, error.message);
          await restartWorker(workerState.id);
        }

        throw error;
      }
    };
  };

  // Determine if worker should be restarted based on error
  const shouldRestartWorker = (workerState, error) => {
    const { restartAttempts, config } = workerState;

    // Don't restart if max attempts reached
    if (restartAttempts >= config.maxRestartAttempts) {
      return false;
    }

    // Restart on timeout, worker errors, or health failures
    const restartableErrors = ['timeout', 'Worker error', 'unhealthy'];
    return restartableErrors.some((errorType) =>
      error.message.toLowerCase().includes(errorType.toLowerCase())
    );
  };

  // Restart a specific worker
  const restartWorker = async (workerId) => {
    const workerState = workers.get(workerId);
    if (!workerState) {
      console.error(`Worker ${workerId} not found`);
      return false;
    }

    const { instance, config } = workerState;

    // Check restart limits
    if (workerState.restartAttempts >= config.maxRestartAttempts) {
      console.error(
        `Worker ${workerId} has exceeded max restart attempts (${config.maxRestartAttempts})`
      );
      return false;
    }

    try {
      console.info(`Restarting worker ${workerId}...`);

      // Add restart delay if not the first restart
      if (workerState.restartAttempts > 0) {
        await new Promise((resolve) => setTimeout(resolve, config.restartDelay));
      }

      // Attempt restart
      const success = instance.restartWorker();

      if (success) {
        workerState.restartAttempts++;
        workerState.lastRestart = Date.now();

        // Clear recent errors on successful restart
        workerState.errors = workerState.errors.filter(
          (error) => Date.now() - error.timestamp > 60000 // Keep errors from last minute
        );

        console.info(
          `Worker ${workerId} restarted successfully (attempt ${workerState.restartAttempts})`
        );
        updateGlobalState();
        return true;
      } else {
        console.error(`Worker ${workerId} restart failed`);
        return false;
      }
    } catch (error) {
      console.error(`Error restarting worker ${workerId}:`, error);
      return false;
    }
  };

  // Terminate a specific worker
  const terminateWorker = (workerId) => {
    if (import.meta.env.DEV) {
      console.debug(`[WorkerManager] terminateWorker called with ID: ${workerId}`);
    }

    const workerState = workers.get(workerId);
    if (!workerState) {
      if (import.meta.env.DEV) {
        console.debug(`Worker ${workerId} not found (may have already been terminated)`);
      }
      return true; // Return true since the worker is already gone
    }

    try {
      workerState.instance.terminateWorker();
      workers.delete(workerId);
      updateGlobalState();

      return true;
    } catch (error) {
      console.error(`Error terminating worker ${workerId}:`, error);
      // Still remove from registry even if termination failed
      workers.delete(workerId);
      updateGlobalState();
      return false;
    }
  };

  // Terminate all workers
  const terminateAllWorkers = () => {
    const workerIds = Array.from(workers.keys());
    let terminatedCount = 0;

    for (const workerId of workerIds) {
      if (terminateWorker(workerId)) {
        terminatedCount++;
      }
    }

    console.info(`Terminated ${terminatedCount} workers`);
    return terminatedCount;
  };

  // Get worker by ID
  const getWorker = (workerId) => {
    return workers.get(workerId);
  };

  // Get worker instance (for direct usage)
  const getWorkerInstance = (workerId) => {
    const workerState = workers.get(workerId);
    return workerState?.instance || null;
  };

  // Get all worker statuses
  const getAllWorkerStatuses = () => {
    const statuses = [];

    for (const [workerId, workerState] of workers) {
      const status = workerState.instance.getWorkerStatus();
      statuses.push({
        id: workerId,
        path: workerState.path,
        restartAttempts: workerState.restartAttempts,
        lastRestart: workerState.lastRestart,
        createdAt: workerState.createdAt,
        errors: workerState.errors.length,
        stats: workerState.stats,
        ...status,
      });
    }

    return statuses;
  };

  // Perform health check on all workers
  const performGlobalHealthCheck = async () => {
    const results = [];

    for (const [workerId, workerState] of workers) {
      try {
        const result = await workerState.instance.forceHealthCheck();
        results.push({
          workerId,
          ...result,
        });
      } catch (error) {
        results.push({
          workerId,
          success: false,
          message: error.message,
        });
      }
    }

    updateGlobalState();
    return results;
  };

  // Update global worker state
  const updateGlobalState = () => {
    const statuses = getAllWorkerStatuses();

    globalWorkerState.value = {
      totalWorkers: statuses.length,
      activeWorkers: statuses.filter((s) => s.ready).length,
      failedWorkers: statuses.filter((s) => s.error).length,
      healthyWorkers: statuses.filter((s) => s.healthy).length,
    };
  };

  // Get worker statistics summary
  const getWorkerStatistics = () => {
    const statuses = getAllWorkerStatuses();

    return {
      global: globalWorkerState.value,
      workers: statuses,
      summary: {
        totalMessages: statuses.reduce((sum, s) => sum + s.stats.messagesProcessed, 0),
        totalErrors: statuses.reduce((sum, s) => sum + s.stats.errorsEncountered, 0),
        averageResponseTime:
          statuses.length > 0
            ? statuses.reduce((sum, s) => sum + s.stats.averageResponseTime, 0) / statuses.length
            : 0,
        totalRestarts: statuses.reduce((sum, s) => sum + s.restartAttempts, 0),
      },
    };
  };

  // Cleanup on unmount
  onUnmounted(() => {
    terminateAllWorkers();
  });

  return {
    // Worker lifecycle
    createWorker,
    restartWorker,
    terminateWorker,
    terminateAllWorkers,

    // Worker access
    getWorker,
    getWorkerInstance,

    // Monitoring
    getAllWorkerStatuses,
    performGlobalHealthCheck,
    getWorkerStatistics,

    // State
    globalWorkerState,
    workers: workers,
  };
}