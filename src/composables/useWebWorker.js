import { ref, onUnmounted } from 'vue'

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
  
  // Message handling
  const pendingMessages = new Map() // batchId -> { resolve, reject, timeout }
  const messageListeners = new Map() // messageType -> callback[]
  
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
      workerError.value = null
      return true
    } catch (error) {
      workerError.value = error
      isWorkerReady.value = false
      return false
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
        pendingMessages.delete(batchId)
        resolve(data.result)
        return
      }
      
      if (type === 'ERROR') {
        clearTimeout(timeout)
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
      
      const batchId = message.batchId || generateBatchId()
      const timeout = options.timeout || 30000 // 30 second default timeout
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        pendingMessages.delete(batchId)
        reject(new Error('Worker operation timed out'))
      }, timeout)
      
      // Store promise handlers
      pendingMessages.set(batchId, { resolve, reject, timeout: timeoutId })
      
      // Send message with batchId
      worker.value.postMessage({ ...message, batchId })
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
    if (worker.value) {
      worker.value.terminate()
      worker.value = null
      isWorkerReady.value = false
    }
    
    // Reject all pending messages
    for (const [batchId, { reject }] of pendingMessages) {
      reject(new Error('Worker was terminated'))
      pendingMessages.delete(batchId)
    }
    
    // Clear message listeners
    messageListeners.clear()
  }
  
  // Restart worker
  const restartWorker = () => {
    terminateWorker()
    return initializeWorker()
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
      error: workerError.value,
      pendingMessages: pendingMessages.size
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
    workerError,
    
    // Methods
    initializeWorker,
    sendMessage,
    addMessageListener,
    removeMessageListener,
    terminateWorker,
    restartWorker,
    getWorkerStatus
  }
}