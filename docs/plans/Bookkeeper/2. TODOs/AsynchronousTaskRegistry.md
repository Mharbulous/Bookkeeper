Asynchronous Task Registry: Project To-Do
The goal of this project is to create a robust, centralized system for managing the lifecycle of all asynchronous tasks within the application. This registry will ensure that tasks are properly tracked, terminated, and cleaned up, preventing memory leaks and improving overall system stability.

## Prerequisites

**Dependencies**: This implementation builds upon the completed `AsyncProcessesTable.md` research.

### Key Findings from Async Process Audit
The comprehensive async process documentation identified **33 distinct asynchronous processes** across 8 categories:

- **Web Workers & Management**: 4 processes (SHA-256 hashing, health checks, message timeouts)
- **Timers & Intervals**: 5 processes (folder timeouts, warning monitors, UI delays)
- **Event Listeners**: 4 processes (document click detection, modal focus traps, abort signals)
- **Vue Reactivity & Watchers**: 6 processes (route watchers, prop changes, visibility states)
- **Component Lifecycle & DOM**: 4 processes (DOM updates, intersection observers, idle callbacks)
- **Promise Chains & Async Operations**: 5 processes (Firebase auth, file queues, progress tracking)
- **Lazy Loading & Dynamic Imports**: 3 processes (route components, Firebase services, stores)
- **Specialized Async Patterns**: 2 processes (nextTick synchronization, test utilities)

### Critical Requirements Identified
1. **Process Type Diversity**: 8 distinct termination patterns require specialized handling
2. **Risk Stratification**: High-risk processes (Firebase listeners, global DOM events) need priority attention
3. **Vue Integration**: Must work with Vue's automatic cleanup without interference
4. **Browser Compatibility**: Modern APIs (AbortController) need fallback support
5. **Complex Cleanup Verification**: 29 verified, 4 partially verified cleanup patterns

## Core Concepts

The system will be built around a **TaskRegistry** class that maintains a centralized registry of all active asynchronous processes. The registry must handle diverse process types with specialized cleanup methods while integrating seamlessly with Vue's lifecycle management.

### Architecture Principles

1. **Process Type Awareness**: Each registered process includes its type and corresponding cleanup method
2. **Risk-Based Management**: High-risk processes (Firebase listeners, global DOM events) receive priority handling
3. **Vue Compatibility**: Framework-managed processes (watchers, computed) receive non-invasive tracking
4. **Graceful Degradation**: Modern API features (AbortController) include fallback mechanisms
5. **Verification & Recovery**: Cleanup attempts are verified with retry mechanisms for failures

### Registry Structure

Each registered process maintains:
- **Unique ID**: Generated identifier for tracking
- **Process Type**: Enum defining the cleanup strategy required  
- **Process Reference**: The actual async resource (timer ID, worker instance, etc.)
- **Parent ID**: Hierarchical relationship for nested processes
- **Risk Level**: Priority classification (High/Medium/Low)
- **Cleanup Method**: Type-specific termination function
- **Verification Status**: Cleanup success/failure tracking
- **Dependencies**: Other processes this one depends on

## Process Type System

Based on the async process audit, the registry must handle **8 distinct process types**, each requiring specialized cleanup methods:

### Process Type Definitions

```javascript
const ProcessType = {
  WORKER: 'worker',                    // Web Workers
  TIMER: 'timer',                      // setTimeout/setInterval  
  EVENT_LISTENER: 'event_listener',    // DOM event handlers
  VUE_WATCHER: 'vue_watcher',         // Vue watch/computed
  ABORT_CONTROLLER: 'abort_controller', // AbortController signals
  OBSERVER: 'observer',               // IntersectionObserver, etc.
  FIREBASE_LISTENER: 'firebase_listener', // Firebase subscriptions
  PROMISE_CHAIN: 'promise_chain'       // Complex async operations
}
```

### Type-Specific Cleanup Methods

```javascript
const CleanupStrategies = {
  [ProcessType.WORKER]: (process) => {
    process.reference.terminate()
    process.reference = null
  },
  
  [ProcessType.TIMER]: (process) => {
    if (process.reference.type === 'timeout') {
      clearTimeout(process.reference.id)
    } else if (process.reference.type === 'interval') {
      clearInterval(process.reference.id)
    }
  },
  
  [ProcessType.EVENT_LISTENER]: (process) => {
    const { element, event, handler, options } = process.reference
    element.removeEventListener(event, handler, options)
  },
  
  [ProcessType.VUE_WATCHER]: (process) => {
    // Only cleanup if explicit unwatch function exists
    if (typeof process.reference.unwatch === 'function') {
      process.reference.unwatch()
    }
    // Note: Most Vue watchers cleanup automatically
  },
  
  [ProcessType.ABORT_CONTROLLER]: (process) => {
    if (!process.reference.signal.aborted) {
      process.reference.abort()
    }
    // Cleanup associated event listeners
    if (process.reference.cleanup) {
      process.reference.cleanup()
    }
  },
  
  [ProcessType.OBSERVER]: (process) => {
    if (typeof process.reference.disconnect === 'function') {
      process.reference.disconnect()
    } else if (typeof process.reference.stop === 'function') {
      process.reference.stop() // VueUse observers
    }
  },
  
  [ProcessType.FIREBASE_LISTENER]: (process) => {
    if (typeof process.reference.unsubscribe === 'function') {
      process.reference.unsubscribe()
    }
  },
  
  [ProcessType.PROMISE_CHAIN]: (process) => {
    // Custom cleanup based on process implementation
    if (typeof process.reference.abort === 'function') {
      process.reference.abort()
    } else if (process.reference.abortController) {
      process.reference.abortController.abort()
    }
  }
}
```

### Risk Level Classifications

```javascript
const RiskLevel = {
  HIGH: 'high',       // Firebase listeners, global DOM events
  MEDIUM: 'medium',   // Workers, complex cleanup chains  
  LOW: 'low'          // Framework-managed, short-lived
}

// Risk assessment mapping
const ProcessRiskMapping = {
  [ProcessType.FIREBASE_LISTENER]: RiskLevel.HIGH,
  [ProcessType.EVENT_LISTENER]: RiskLevel.HIGH, // Global DOM events
  [ProcessType.WORKER]: RiskLevel.MEDIUM,
  [ProcessType.ABORT_CONTROLLER]: RiskLevel.MEDIUM,
  [ProcessType.OBSERVER]: RiskLevel.MEDIUM,
  [ProcessType.PROMISE_CHAIN]: RiskLevel.MEDIUM,
  [ProcessType.TIMER]: RiskLevel.LOW,
  [ProcessType.VUE_WATCHER]: RiskLevel.LOW // Vue manages these
}
```

## Key Components

**TaskRegistry Class**: Singleton class managing the centralized registry with type-aware cleanup strategies.

**Process Registry**: Map-based data structure storing process metadata with type-specific cleanup methods.

**Type Detection System**: Automatic process type identification based on the registered resource.

**Cleanup Verification**: Success/failure tracking with retry mechanisms for failed terminations.

## Vue Framework Integration Strategy

The registry must integrate seamlessly with Vue 3's Composition API and lifecycle management without interfering with framework-managed cleanup.

### Integration Principles

1. **Non-Invasive Tracking**: Monitor Vue-managed processes without disrupting automatic cleanup
2. **Composable Integration**: Provide `useTaskRegistry` composable for component-level integration
3. **Lifecycle Coordination**: Align registry cleanup with Vue's `onUnmounted` hooks
4. **Reactivity Respect**: Avoid breaking Vue's reactivity system dependencies

### Vue-Specific Process Handling

```javascript
// Composable integration pattern
export function useTaskRegistry() {
  const registry = useTaskRegistryInstance()
  
  // Auto-cleanup on component unmount
  onUnmounted(() => {
    registry.terminateComponentTasks(getCurrentInstance().uid)
  })
  
  const register = (process, options = {}) => {
    const processId = registry.register(process, {
      ...options,
      componentId: getCurrentInstance()?.uid,
      vueManaged: isVueManagedProcess(process)
    })
    return processId
  }
  
  return { register, terminate: registry.terminate }
}

// Vue process type detection
function isVueManagedProcess(process) {
  return (
    // Vue watchers return unwatch functions
    typeof process === 'function' && process.name === 'unwatch' ||
    // Vue computed properties
    process?.effect?.scheduler ||
    // VueUse composable cleanup
    process?.__vueuse_lifecycle
  )
}
```

### Component Lifecycle Integration

```javascript
// Automatic component-scoped cleanup
class TaskRegistry {
  registerComponentProcess(process, componentId) {
    const processId = this.register(process, { 
      componentId,
      autoCleanup: true 
    })
    
    // Track component-process relationships
    if (!this.componentProcesses.has(componentId)) {
      this.componentProcesses.set(componentId, new Set())
    }
    this.componentProcesses.get(componentId).add(processId)
    
    return processId
  }
  
  terminateComponentTasks(componentId) {
    const processIds = this.componentProcesses.get(componentId) || new Set()
    
    // Terminate in reverse registration order (LIFO)
    const sortedIds = Array.from(processIds).sort((a, b) => 
      this.processes.get(b).registeredAt - this.processes.get(a).registeredAt
    )
    
    sortedIds.forEach(processId => {
      const process = this.processes.get(processId)
      
      // Only cleanup non-Vue managed processes
      if (!process.vueManaged) {
        this.terminate(processId)
      }
    })
    
    this.componentProcesses.delete(componentId)
  }
}
```

### Watchers and Computed Properties

```javascript
// Special handling for Vue reactivity
const handleVueWatcher = (watcher) => {
  // For explicit watchers with unwatch functions
  if (typeof watcher === 'function' && watcher.name === 'unwatch') {
    return {
      type: ProcessType.VUE_WATCHER,
      cleanup: watcher,
      vueManaged: false // Explicit cleanup required
    }
  }
  
  // For automatic Vue watchers (most cases)
  return {
    type: ProcessType.VUE_WATCHER,
    cleanup: null,
    vueManaged: true // Vue handles cleanup automatically
  }
}
```

### Store Integration

```javascript
// Pinia store integration for async processes
export const useAsyncStoreModule = () => {
  const registry = useTaskRegistryInstance()
  
  // Store-level process tracking
  const storeProcesses = new Set()
  
  const registerStoreProcess = (process) => {
    const processId = registry.register(process, {
      scope: 'store',
      persistent: true // Survive component unmounts
    })
    storeProcesses.add(processId)
    return processId
  }
  
  // Store cleanup (app shutdown)
  const cleanupStore = () => {
    storeProcesses.forEach(processId => {
      registry.terminate(processId)
    })
    storeProcesses.clear()
  }
  
  return { registerStoreProcess, cleanupStore }
}
```

## Risk-Based Priority Management System

The registry implements a priority-based cleanup system focusing on high-risk processes that can cause memory leaks or system instability.

### Priority Queue Implementation

```javascript
class PriorityProcessQueue {
  constructor() {
    this.high = new Set()    // Firebase listeners, global DOM events
    this.medium = new Set()  // Workers, complex cleanup chains
    this.low = new Set()     // Framework-managed, short-lived
  }
  
  add(processId, riskLevel) {
    this[riskLevel].add(processId)
  }
  
  remove(processId, riskLevel) {
    this[riskLevel].delete(processId)
  }
  
  // Terminate high-risk processes first
  *getTerminationOrder() {
    yield* this.high
    yield* this.medium  
    yield* this.low
  }
  
  getStats() {
    return {
      high: this.high.size,
      medium: this.medium.size,
      low: this.low.size,
      total: this.high.size + this.medium.size + this.low.size
    }
  }
}
```

### Risk Assessment Rules

```javascript
const assessProcessRisk = (process, context = {}) => {
  // High-risk criteria
  if (
    process.type === ProcessType.FIREBASE_LISTENER ||
    (process.type === ProcessType.EVENT_LISTENER && process.reference.element === document) ||
    process.persistent === true ||
    context.global === true
  ) {
    return RiskLevel.HIGH
  }
  
  // Medium-risk criteria  
  if (
    process.type === ProcessType.WORKER ||
    process.type === ProcessType.ABORT_CONTROLLER ||
    process.type === ProcessType.OBSERVER ||
    process.type === ProcessType.PROMISE_CHAIN ||
    process.children?.size > 0 || // Has child processes
    context.longRunning === true
  ) {
    return RiskLevel.MEDIUM
  }
  
  // Default to low-risk
  return RiskLevel.LOW
}
```

### Priority-Based Termination Strategy

```javascript
class TaskRegistry {
  terminateByPriority(maxConcurrent = 3) {
    const terminationQueue = this.priorityQueue.getTerminationOrder()
    const activeTerminations = new Set()
    
    const terminateNext = async () => {
      if (activeTerminations.size >= maxConcurrent) return
      
      const { value: processId, done } = terminationQueue.next()
      if (done) return
      
      activeTerminations.add(processId)
      
      try {
        await this.terminateWithRetry(processId)
      } catch (error) {
        this.logTerminationFailure(processId, error)
      } finally {
        activeTerminations.delete(processId)
        
        // Continue with next process
        terminateNext()
      }
    }
    
    // Start parallel terminations
    for (let i = 0; i < maxConcurrent; i++) {
      terminateNext()
    }
  }
  
  // Emergency shutdown - high-priority processes only
  async emergencyShutdown() {
    const highRiskProcesses = Array.from(this.priorityQueue.high)
    
    await Promise.allSettled(
      highRiskProcesses.map(processId => 
        this.terminateWithRetry(processId, { maxRetries: 1, timeout: 1000 })
      )
    )
  }
}
```

### Resource Monitoring

```javascript
// Monitor system resources and adjust termination strategies
class ResourceMonitor {
  constructor(registry) {
    this.registry = registry
    this.thresholds = {
      memoryWarning: 0.85,  // 85% memory usage
      processLimit: 50,     // Max concurrent processes
      responseTime: 5000    // Max response time for termination
    }
  }
  
  checkResourcePressure() {
    const stats = this.registry.priorityQueue.getStats()
    
    if (stats.high > 5) {
      // Too many high-risk processes
      this.registry.emergencyShutdown()
    }
    
    if (stats.total > this.thresholds.processLimit) {
      // Aggressively terminate low-priority processes
      this.registry.terminateByRisk(RiskLevel.LOW)
    }
  }
}
```

## Required Methods and Functionality

### Enhanced Method Signatures

**1. register(process, options = {})**

Enhanced method for type-aware process registration with risk assessment.

```javascript
register(process, options = {}) {
  const {
    parentId = null,
    componentId = null,
    riskLevel = null, // Auto-detected if not provided
    vueManaged = false,
    persistent = false,
    metadata = {}
  } = options
  
  // Auto-detect process type
  const processType = this.detectProcessType(process)
  
  // Assess risk level
  const risk = riskLevel || assessProcessRisk({ 
    type: processType, 
    persistent 
  }, options)
  
  const processId = this.generateId()
  const processEntry = {
    id: processId,
    type: processType,
    reference: process,
    parentId,
    componentId,
    riskLevel: risk,
    vueManaged,
    persistent,
    registeredAt: Date.now(),
    children: new Set(),
    metadata
  }
  
  // Register in priority queue
  this.priorityQueue.add(processId, risk)
  
  // Store process
  this.processes.set(processId, processEntry)
  
  // Update parent-child relationships
  if (parentId && this.processes.has(parentId)) {
    this.processes.get(parentId).children.add(processId)
  }
  
  return processId
}
```

**2. terminate(taskId, options = {})**

Enhanced termination method with retry logic and verification.

```javascript
async terminate(taskId, options = {}) {
  const {
    maxRetries = 3,
    timeout = 5000,
    force = false,
    cascade = true
  } = options
  
  const process = this.processes.get(taskId)
  if (!process) return false
  
  try {
    // Terminate children first (if cascade enabled)
    if (cascade && process.children.size > 0) {
      await this.terminateChildren(taskId, options)
    }
    
    // Skip Vue-managed processes unless forced
    if (process.vueManaged && !force) {
      this.cleanup(taskId)
      return true
    }
    
    // Execute type-specific cleanup with retry
    const success = await this.executeCleanupWithRetry(
      process, 
      { maxRetries, timeout }
    )
    
    if (success) {
      this.cleanup(taskId)
    }
    
    return success
    
  } catch (error) {
    this.logTerminationError(taskId, error)
    return false
  }
}
```

**3. cleanup(taskId)**

Removes completed processes from registry and priority queues.

**4. terminateAll(options = {})**

Global termination method with priority-based ordering.

```javascript
async terminateAll(options = {}) {
  const { respectPriority = true, maxConcurrent = 5 } = options
  
  if (respectPriority) {
    await this.terminateByPriority(maxConcurrent)
  } else {
    // Brute force termination
    const allProcessIds = Array.from(this.processes.keys())
    await Promise.allSettled(
      allProcessIds.map(id => this.terminate(id, options))
    )
  }
}
```

## Enhanced Cleanup Verification System

The registry implements robust verification and retry mechanisms for cleanup operations.

### Cleanup Verification Logic

```javascript
class CleanupVerifier {
  async verifyCleanup(process, cleanupResult) {
    switch (process.type) {
      case ProcessType.WORKER:
        return this.verifyWorkerTermination(process.reference)
        
      case ProcessType.EVENT_LISTENER:
        return this.verifyEventListenerRemoval(process.reference)
        
      case ProcessType.FIREBASE_LISTENER:
        return this.verifyFirebaseUnsubscription(process.reference)
        
      case ProcessType.OBSERVER:
        return this.verifyObserverDisconnection(process.reference)
        
      default:
        return cleanupResult // Assume cleanup success for simple types
    }
  }
  
  async verifyWorkerTermination(worker, timeout = 2000) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        // Check if worker is still responsive
        try {
          worker.postMessage({ type: 'HEALTH_CHECK' })
          // If no error, worker is still alive
        } catch (error) {
          clearInterval(checkInterval)
          resolve(true) // Worker is terminated
        }
      }, 100)
      
      setTimeout(() => {
        clearInterval(checkInterval)
        resolve(false) // Verification timeout
      }, timeout)
    })
  }
}
```

### Retry Mechanism

```javascript
class TaskRegistry {
  async executeCleanupWithRetry(process, options = {}) {
    const { maxRetries = 3, timeout = 5000 } = options
    let lastError = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Execute type-specific cleanup
        const cleanupStrategy = CleanupStrategies[process.type]
        if (!cleanupStrategy) {
          throw new Error(`No cleanup strategy for process type: ${process.type}`)
        }
        
        await Promise.race([
          cleanupStrategy(process),
          this.createTimeout(timeout)
        ])
        
        // Verify cleanup success
        const verified = await this.verifier.verifyCleanup(process)
        if (verified) {
          return true
        }
        
        throw new Error('Cleanup verification failed')
        
      } catch (error) {
        lastError = error
        
        if (attempt < maxRetries) {
          // Exponential backoff
          await this.delay(Math.pow(2, attempt) * 100)
        }
      }
    }
    
    // All retries failed
    this.logPersistentFailure(process.id, lastError)
    return false
  }
}
```

## Browser Compatibility Layer

Handles modern API fallbacks and cross-browser compatibility.

### Feature Detection

```javascript
class CompatibilityLayer {
  constructor() {
    this.features = {
      abortController: typeof AbortController !== 'undefined',
      intersectionObserver: typeof IntersectionObserver !== 'undefined',
      requestIdleCallback: typeof requestIdleCallback !== 'undefined',
      webWorkers: typeof Worker !== 'undefined'
    }
  }
  
  createAbortController(timeoutMs) {
    if (this.features.abortController && AbortSignal.timeout) {
      return { signal: AbortSignal.timeout(timeoutMs) }
    }
    
    // Fallback implementation
    const controller = new AbortController()
    setTimeout(() => controller.abort(), timeoutMs)
    return controller
  }
  
  createIntersectionObserver(callback, options) {
    if (this.features.intersectionObserver) {
      return new IntersectionObserver(callback, options)
    }
    
    // Fallback to manual visibility checking
    return this.createFallbackObserver(callback, options)
  }
}
```

## Concrete Integration Patterns

Specific integration examples for the 33 identified async processes:

### High-Risk Process Integration

```javascript
// Firebase Auth State Listener (src/services/authService.js:12)
const registry = useTaskRegistryInstance()

const authUnsubscribe = onAuthStateChanged(auth, (user) => {
  // Handle auth state change
}, (error) => {
  // Handle auth error  
})

// Register with high priority
const authProcessId = registry.register(authUnsubscribe, {
  type: ProcessType.FIREBASE_LISTENER,
  riskLevel: RiskLevel.HIGH,
  persistent: true,
  metadata: { service: 'authentication' }
})

// Document Click Outside (src/components/AppSwitcher.vue:342)
const handleClickOutside = (event) => { /* handler logic */ }
document.addEventListener('click', handleClickOutside, true)

registry.register({
  element: document,
  event: 'click', 
  handler: handleClickOutside,
  options: true
}, {
  type: ProcessType.EVENT_LISTENER,
  riskLevel: RiskLevel.HIGH,
  componentId: getCurrentInstance()?.uid
})
```

### Worker Process Integration

```javascript
// File Hash Worker (src/workers/fileHashWorker.js)
const worker = new Worker(new URL('../workers/fileHashWorker.js', import.meta.url))

const workerProcessId = registry.register(worker, {
  type: ProcessType.WORKER,
  riskLevel: RiskLevel.MEDIUM,
  metadata: { purpose: 'file-hashing', maxFiles: 1000 }
})

// Worker health monitoring
const healthCheckId = registry.register({
  id: setInterval(() => {
    // Health check logic
  }, 30000),
  type: 'interval'
}, {
  type: ProcessType.TIMER,
  parentId: workerProcessId,
  riskLevel: RiskLevel.LOW
})
```

### Vue Integration Examples

```javascript
// Vue Watcher Integration (src/composables/useFavicon.js:27)
const { register } = useTaskRegistry()

const unwatchRoute = watch(
  () => route.path,
  (newPath) => {
    updateFavicon(newPath)
  },
  { immediate: true }
)

// Register watcher (Vue-managed)
register(unwatchRoute, {
  type: ProcessType.VUE_WATCHER,
  vueManaged: false, // Explicit unwatch function exists
  riskLevel: RiskLevel.LOW
})

// AbortController Integration (src/composables/useFolderTimeouts.js:32)
const controller = new AbortController()
controller.signal.addEventListener('abort', handleAbort)

const controllerId = register(controller, {
  type: ProcessType.ABORT_CONTROLLER,
  riskLevel: RiskLevel.MEDIUM,
  metadata: { purpose: 'folder-analysis-timeout' }
})
```

### Migration Strategy

1. **Phase 1**: Integrate high-risk processes (Firebase listeners, global DOM events)
2. **Phase 2**: Add worker management integration  
3. **Phase 3**: Component lifecycle integration with Vue composables
4. **Phase 4**: Complete coverage of remaining process types

### Development vs Production Behavior

```javascript
const registry = new TaskRegistry({
  development: {
    enableLogging: true,
    verifyCleanup: true,
    strictMode: true // Fail fast on cleanup failures
  },
  production: {
    enableLogging: false,
    verifyCleanup: false, // Skip verification for performance
    gracefulDegradation: true // Continue on cleanup failures
  }
})
```

This enhanced registry system addresses all critical requirements identified in the async process audit, providing a production-ready solution for managing the complex asynchronous landscape of the Bookkeeper application.