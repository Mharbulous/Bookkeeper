import { ref, onUnmounted } from 'vue'
import { useAsyncRegistry } from './useAsyncRegistry'

/**
 * Generic Web Worker communication composable
 * Provides a clean API for worker lifecycle management and message passing
 */
export function useWebWorker(workerPath) {
  // Reactive state
  const isWorkerSupported = ref(typeof Worker !== 'undefined')
  const worker = ref(null)
  const isWorkerReady = ref(false)
  const workerError = ref(null)
  const isWorkerHealthy = ref(true)
  
  // Message handling
  const pendingMessages = new Map() // batchId -> { resolve, reject, timeout, startTime }
  const messageListeners = new Map() // messageType -> callback[]
  
  // Health monitoring
  let healthCheckInterval = null
  let lastHealthCheck = null
  let consecutiveHealthFailures = 0
  const MAX_HEALTH_FAILURES = 3
  const HEALTH_CHECK_INTERVAL = 15000 // 15 seconds - less aggressive
  const HEALTH_CHECK_TIMEOUT = 8000 // 8 seconds - more time for response
  const HEALTH_CHECK_GRACE_PERIOD = 30000 // 30 seconds before first health check

  // Registry integration
  const registry = useAsyncRegistry()
  let workerRegistryId = null
  let healthCheckRegistryId = null
  
  // Initialize worker
  const initializeWorker = () => {
    if (!isWorkerSupported.value) {
      workerError.value = new Error('Web Workers are not supported in this browser')
      return false
    }
    
    try {
      worker.value = new Worker(new URL(workerPath, import.meta.url))
      
      worker.value.onmessage = (event) => {
        handleWorkerMessage(event.data)
      }
      
      worker.value.onerror = (error) => {
        workerError.value = error
        isWorkerReady.value = false
        isWorkerHealthy.value = false
        
        console.error('Worker error:', error)
        
        // Stop health checks
        stopHealthChecking()
        
        // Reject all pending messages
        for (const [batchId, { reject }] of pendingMessages) {
          reject(new Error(`Worker error: ${error.message}`))
          pendingMessages.delete(batchId)
        }
      }
      
      worker.value.onmessageerror = (error) => {
        workerError.value = new Error(`Message error: ${error}`)
      }
      
      isWorkerReady.value = true
      isWorkerHealthy.value = true
      workerError.value = null
      consecutiveHealthFailures = 0

      // Register worker with registry
      workerRegistryId = registry.register(
        registry.generateId('worker'),
        'worker',
        () => {
          if (worker.value) {
            worker.value.terminate()
          }
        },
        {
          component: 'WebWorker',
          workerPath,
          initialized: Date.now()
        }
      )
      
      // Start health monitoring after grace period
      setTimeout(() => {
        if (isWorkerReady.value) {
          startHealthChecking()
        }
      }, HEALTH_CHECK_GRACE_PERIOD)
      
      return true
    } catch (error) {
      workerError.value = error
      isWorkerReady.value = false
      isWorkerHealthy.value = false
      return false
    }
  }
  
  // Health check functionality
  const startHealthChecking = () => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval)
      if (healthCheckRegistryId) {
        registry.unregister(healthCheckRegistryId)
      }
    }
    
    healthCheckInterval = setInterval(async () => {
      try {
        await performHealthCheck()
      } catch (error) {
        console.warn('Health check failed:', error.message)
        handleHealthCheckFailure()
      }
    }, HEALTH_CHECK_INTERVAL)

    // Register health check interval with registry
    healthCheckRegistryId = registry.register(
      registry.generateId('health-check'),
      'health-monitor',
      () => {
        if (healthCheckInterval) {
          clearInterval(healthCheckInterval)
          healthCheckInterval = null
        }
      },
      {
        component: 'WebWorker',
        interval: HEALTH_CHECK_INTERVAL,
        purpose: 'worker-health-monitoring'
      }
    )
  }
  
  const stopHealthChecking = () => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval)
      healthCheckInterval = null
    }
    if (healthCheckRegistryId) {
      registry.unregister(healthCheckRegistryId)
      healthCheckRegistryId = null
    }
  }
  
  const performHealthCheck = () => {
    return new Promise((resolve, reject) => {
      if (!isWorkerReady.value || !worker.value) {
        reject(new Error('Worker not ready for health check'))
        return
      }
      
      const healthCheckId = `health_${Date.now()}`
      const timeout = setTimeout(() => {
        reject(new Error('Health check timeout'))
      }, HEALTH_CHECK_TIMEOUT)
      
      // Listen for health check response
      const healthResponseHandler = (data) => {
        if (data.type === 'HEALTH_CHECK_RESPONSE' && data.batchId === healthCheckId) {
          clearTimeout(timeout)
          lastHealthCheck = Date.now()
          consecutiveHealthFailures = 0
          isWorkerHealthy.value = true
          resolve()
        }
      }
      
      const unsubscribe = addMessageListener('HEALTH_CHECK_RESPONSE', healthResponseHandler)
      
      // Clean up listener after timeout
      setTimeout(() => {
        unsubscribe()
      }, HEALTH_CHECK_TIMEOUT + 1000)
      
      // Send health check
      worker.value.postMessage({
        type: 'HEALTH_CHECK',
        batchId: healthCheckId,
        timestamp: Date.now()
      })
    })
  }
  
  const handleHealthCheckFailure = () => {
    consecutiveHealthFailures++
    console.warn(`Worker health check failed (${consecutiveHealthFailures}/${MAX_HEALTH_FAILURES})`)
    
    // Only mark unhealthy after MAX_HEALTH_FAILURES consecutive failures
    if (consecutiveHealthFailures >= MAX_HEALTH_FAILURES) {
      console.error(`Worker failed ${MAX_HEALTH_FAILURES} consecutive health checks, marking as unhealthy`)
      isWorkerHealthy.value = false
    } else {
      // Keep worker healthy until max failures reached
      console.info(`Worker still healthy despite health check failure (${consecutiveHealthFailures}/${MAX_HEALTH_FAILURES})`)
    }
  }
  
  // Handle incoming messages from worker
  const handleWorkerMessage = (data) => {
    const { type, batchId } = data
    
    // Handle completion/error messages that resolve promises
    if (batchId && pendingMessages.has(batchId)) {
      const { resolve, reject, timeout } = pendingMessages.get(batchId)
      
      if (type === 'PROCESSING_COMPLETE') {
        clearTimeout(timeout)
        const { startTime } = pendingMessages.get(batchId)
        const duration = Date.now() - startTime
        console.debug(`Worker operation completed in ${duration}ms`)
        pendingMessages.delete(batchId)
        resolve(data.result)
        return
      }
      
      if (type === 'ERROR') {
        clearTimeout(timeout)
        const { startTime } = pendingMessages.get(batchId)
        const duration = Date.now() - startTime
        console.error(`Worker operation failed after ${duration}ms:`, data.error)
        pendingMessages.delete(batchId)
        reject(new Error(data.error.message || 'Worker processing failed'))
        return
      }
    }
    
    // Handle progress and other message types with listeners
    if (messageListeners.has(type)) {
      const listeners = messageListeners.get(type)
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in message listener for ${type}:`, error)
        }
      })
    }
  }
  
  // Send message to worker and return promise
  const sendMessage = (message, options = {}) => {
    return new Promise((resolve, reject) => {
      if (!isWorkerReady.value || !worker.value) {
        reject(new Error('Worker is not ready'))
        return
      }
      
      if (!isWorkerHealthy.value && !options.ignoreHealth) {
        reject(new Error('Worker is not healthy'))
        return
      }
      
      const batchId = message.batchId || generateBatchId()
      const timeout = options.timeout || 30000 // 30 second default timeout
      const startTime = Date.now()
      
      // Set up timeout with enhanced error message
      const timeoutId = setTimeout(() => {
        const operation = message.type || 'operation'
        pendingMessages.delete(batchId)
        reject(new Error(`Worker ${operation} timed out after ${timeout}ms`))
      }, timeout)
      
      // Store promise handlers with start time for performance tracking
      pendingMessages.set(batchId, { resolve, reject, timeout: timeoutId, startTime })
      
      try {
        // Send message with batchId
        worker.value.postMessage({ ...message, batchId })
      } catch (error) {
        clearTimeout(timeoutId)
        pendingMessages.delete(batchId)
        reject(new Error(`Failed to send message to worker: ${error.message}`))
      }
    })
  }
  
  // Add message listener for specific message types
  const addMessageListener = (messageType, callback) => {
    if (!messageListeners.has(messageType)) {
      messageListeners.set(messageType, [])
    }
    messageListeners.get(messageType).push(callback)
    
    // Return unsubscribe function
    return () => {
      const listeners = messageListeners.get(messageType)
      if (listeners) {
        const index = listeners.indexOf(callback)
        if (index > -1) {
          listeners.splice(index, 1)
        }
        if (listeners.length === 0) {
          messageListeners.delete(messageType)
        }
      }
    }
  }
  
  // Remove message listener
  const removeMessageListener = (messageType, callback) => {
    const listeners = messageListeners.get(messageType)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
      if (listeners.length === 0) {
        messageListeners.delete(messageType)
      }
    }
  }
  
  // Terminate worker
  const terminateWorker = () => {
    // Stop health checking
    stopHealthChecking()
    
    // Unregister worker from registry
    if (workerRegistryId) {
      registry.unregister(workerRegistryId)
      workerRegistryId = null
    }
    
    if (worker.value) {
      worker.value.terminate()
      worker.value = null
      isWorkerReady.value = false
      isWorkerHealthy.value = false
    }
    
    // Reject all pending messages
    for (const [batchId, { reject }] of pendingMessages) {
      reject(new Error('Worker was terminated'))
      pendingMessages.delete(batchId)
    }
    
    // Clear message listeners
    messageListeners.clear()
    
    // Reset health state
    consecutiveHealthFailures = 0
    lastHealthCheck = null
  }
  
  // Restart worker
  const restartWorker = () => {
    console.info('Restarting worker...')
    terminateWorker()
    const success = initializeWorker()
    if (success) {
      console.info('Worker restarted successfully')
    } else {
      console.error('Worker restart failed')
    }
    return success
  }
  
  // Generate unique batch ID
  const generateBatchId = () => {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  // Get worker status
  const getWorkerStatus = () => {
    return {
      supported: isWorkerSupported.value,
      ready: isWorkerReady.value,
      healthy: isWorkerHealthy.value,
      error: workerError.value,
      pendingMessages: pendingMessages.size,
      consecutiveHealthFailures,
      lastHealthCheck: lastHealthCheck ? new Date(lastHealthCheck).toISOString() : null
    }
  }
  
  // Force health check (for debugging/testing)
  const forceHealthCheck = async () => {
    try {
      await performHealthCheck()
      return { success: true, message: 'Health check passed' }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }
  
  // Auto-cleanup on unmount
  onUnmounted(() => {
    terminateWorker()
  })
  
  return {
    // Reactive state
    isWorkerSupported: isWorkerSupported.value,
    isWorkerReady,
    isWorkerHealthy,
    workerError,
    
    // Methods
    initializeWorker,
    sendMessage,
    addMessageListener,
    removeMessageListener,
    terminateWorker,
    restartWorker,
    getWorkerStatus,
    forceHealthCheck
  }
}