# Minimalist Async Tracker: Implementation Plan

## Overview

This plan outlines the implementation of a lightweight async process tracking system that provides visibility and safety net capabilities without disrupting existing, well-functioning AbortController patterns. The tracker acts as a bookkeeping layer alongside current code rather than replacing it.

## Prerequisites

**Dependencies**: This implementation builds upon the completed `AsyncProcessesTable.md` research and analysis of current async patterns.

### Key Findings from Current Analysis
- **33 distinct async processes** identified across the codebase
- **29 processes have verified cleanup** - existing patterns work well
- **Excellent AbortController implementation** in `useFolderTimeouts.js`
- **No vue-concurrency or external dependencies** - keeping it KISS

## Core Architecture: Non-Intrusive Registry Pattern

### Design Principles

1. **Minimal Impact**: Add tracking without changing existing working code
2. **Safety Net**: Provide emergency cleanup capabilities
3. **Visibility**: Enable debugging and monitoring of async processes
4. **KISS Compliance**: Simple implementation, no external dependencies
5. **Optional**: Easy to remove if not beneficial

### Registry Architecture

**Core Registry Structure:**
```javascript
// Process registry entry
{
  id: string,           // Unique identifier
  type: string,         // Process category
  cleanup: function,    // Termination function
  created: timestamp,   // Creation time
  component?: string,   // Optional component context
  meta?: object        // Optional metadata
}
```

**Registry Operations:**
- `register(id, type, cleanup, meta?)` - Add process to tracking
- `unregister(id)` - Remove process from tracking
- `cleanup(filter?)` - Execute cleanup for all or filtered processes
- `getActiveProcesses()` - Return list of tracked processes
- `getStats()` - Return process statistics

## Implementation Plan

### Phase 1: Core Registry Implementation (1-2 hours)

#### Step 1.1: Create Base Registry Composable
**File**: `src/composables/useAsyncRegistry.js`

```javascript
import { ref, computed } from 'vue'

const globalProcesses = new Map()
let processCounter = 0

export function useAsyncRegistry() {
  const componentProcesses = new Set()
  
  const generateId = (type) => {
    return `${type}-${++processCounter}-${Date.now()}`
  }
  
  const register = (id, type, cleanup, meta = {}) => {
    const process = {
      id,
      type,
      cleanup,
      created: Date.now(),
      component: meta.component || null,
      meta
    }
    
    globalProcesses.set(id, process)
    componentProcesses.add(id)
    
    if (import.meta.env.DEV) {
      console.debug(`[AsyncTracker] Registered ${type}:`, id)
    }
    
    return id
  }
  
  const unregister = (id) => {
    if (globalProcesses.has(id)) {
      const process = globalProcesses.get(id)
      globalProcesses.delete(id)
      componentProcesses.delete(id)
      
      if (import.meta.env.DEV) {
        console.debug(`[AsyncTracker] Unregistered ${process.type}:`, id)
      }
    }
  }
  
  const cleanup = (filter) => {
    const processesToClean = filter 
      ? Array.from(globalProcesses.values()).filter(filter)
      : Array.from(componentProcesses).map(id => globalProcesses.get(id)).filter(Boolean)
    
    processesToClean.forEach(process => {
      try {
        process.cleanup?.()
        globalProcesses.delete(process.id)
        componentProcesses.delete(process.id)
        
        if (import.meta.env.DEV) {
          console.debug(`[AsyncTracker] Cleaned up ${process.type}:`, process.id)
        }
      } catch (error) {
        console.warn(`[AsyncTracker] Cleanup failed for ${process.id}:`, error)
      }
    })
  }
  
  const getActiveProcesses = () => {
    return Array.from(globalProcesses.values())
  }
  
  const getComponentProcesses = () => {
    return Array.from(componentProcesses)
      .map(id => globalProcesses.get(id))
      .filter(Boolean)
  }
  
  const getStats = () => {
    const processes = getActiveProcesses()
    const typeStats = {}
    
    processes.forEach(process => {
      typeStats[process.type] = (typeStats[process.type] || 0) + 1
    })
    
    return {
      total: processes.length,
      byType: typeStats,
      oldest: processes.length ? Math.min(...processes.map(p => p.created)) : null
    }
  }
  
  // Auto-cleanup on component unmount
  const setupAutoCleanup = (onUnmounted) => {
    onUnmounted(() => cleanup())
  }
  
  return {
    // Core operations
    register,
    unregister,
    cleanup,
    generateId,
    
    // Inspection
    getActiveProcesses,
    getComponentProcesses,
    getStats,
    
    // Utilities
    setupAutoCleanup
  }
}

// Global registry for app-wide operations
export function useGlobalAsyncRegistry() {
  const cleanupAll = () => {
    const allProcesses = Array.from(globalProcesses.values())
    
    allProcesses.forEach(process => {
      try {
        process.cleanup?.()
        
        if (import.meta.env.DEV) {
          console.debug(`[AsyncTracker] Global cleanup ${process.type}:`, process.id)
        }
      } catch (error) {
        console.warn(`[AsyncTracker] Global cleanup failed for ${process.id}:`, error)
      }
    })
    
    globalProcesses.clear()
  }
  
  const getGlobalStats = () => {
    const processes = Array.from(globalProcesses.values())
    const typeStats = {}
    
    processes.forEach(process => {
      typeStats[process.type] = (typeStats[process.type] || 0) + 1
    })
    
    return {
      total: processes.length,
      byType: typeStats,
      oldest: processes.length ? Math.min(...processes.map(p => p.created)) : null,
      processes: import.meta.env.DEV ? processes : []
    }
  }
  
  return {
    cleanupAll,
    getGlobalStats,
    processes: computed(() => Array.from(globalProcesses.values()))
  }
}
```

#### Step 1.2: Create Development Inspector
**File**: `src/composables/useAsyncInspector.js` (Development only)

```javascript
import { computed } from 'vue'
import { useGlobalAsyncRegistry } from './useAsyncRegistry.js'

export function useAsyncInspector() {
  if (import.meta.env.PROD) {
    return {
      isEnabled: false,
      stats: computed(() => ({})),
      processes: computed(() => [])
    }
  }
  
  const { getGlobalStats, processes } = useGlobalAsyncRegistry()
  
  const stats = computed(() => getGlobalStats())
  
  const longRunningProcesses = computed(() => {
    const now = Date.now()
    const threshold = 30000 // 30 seconds
    
    return processes.value.filter(process => 
      now - process.created > threshold
    )
  })
  
  const suspiciousProcesses = computed(() => {
    return longRunningProcesses.value.filter(process => 
      !['watcher', 'listener'].includes(process.type)
    )
  })
  
  // Console logging for debugging
  const logStats = () => {
    console.group('[AsyncTracker] Current Statistics')
    console.table(stats.value.byType)
    if (suspiciousProcesses.value.length > 0) {
      console.warn('Suspicious long-running processes:', suspiciousProcesses.value)
    }
    console.groupEnd()
  }
  
  // Development window helpers
  if (typeof window !== 'undefined') {
    window.__asyncTracker = {
      stats: () => getGlobalStats(),
      processes: () => processes.value,
      logStats,
      cleanup: () => useGlobalAsyncRegistry().cleanupAll()
    }
  }
  
  return {
    isEnabled: true,
    stats,
    processes,
    longRunningProcesses,
    suspiciousProcesses,
    logStats
  }
}
```

### Phase 2: Integration with Existing Patterns (2-3 hours)

#### Step 2.1: Enhance useFolderTimeouts.js
**Minimal changes to existing working code:**

```javascript
// Add to imports
import { useAsyncRegistry } from './useAsyncRegistry.js'

// Add to main function
export function useFolderTimeouts() {
  // ... existing code ...
  const registry = useAsyncRegistry()
  
  // Enhance createTimeoutController
  const createTimeoutController = (timeoutMs, processType = 'timeout') => {
    // ... existing creation logic ...
    
    // Register the controller
    const registryId = registry.generateId(processType)
    registry.register(registryId, processType, () => controller.abort())
    
    // Enhance abort method to unregister
    const originalAbort = controller.abort
    controller.abort = (...args) => {
      registry.unregister(registryId)
      return originalAbort.apply(controller, args)
    }
    
    return controller
  }
  
  // ... rest of existing code unchanged ...
  
  // Enhance cleanup to use registry
  const cleanup = () => {
    registry.cleanup() // This will call all registered cleanup functions
    // ... existing cleanup logic ...
  }
  
  return {
    // ... existing returns ...
    registry // Expose for testing/debugging
  }
}
```

#### Step 2.2: Enhance useWebWorker.js
**Minimal changes:**

```javascript
// Add registry tracking to worker creation
const initializeWorker = () => {
  // ... existing worker creation ...
  
  const workerId = registry.generateId('worker')
  registry.register(workerId, 'worker', () => {
    if (worker.value) {
      worker.value.terminate()
    }
  })
  
  // Store ID for later unregistration
  worker.value._registryId = workerId
}

// Enhance cleanup
const cleanup = () => {
  if (worker.value?._registryId) {
    registry.unregister(worker.value._registryId)
  }
  // ... existing cleanup logic ...
}
```

#### Step 2.3: Component Integration Pattern
**Template for component integration:**

```javascript
// In Vue components that use async operations
import { useAsyncRegistry } from '@/composables/useAsyncRegistry.js'
import { onUnmounted } from 'vue'

export default {
  setup() {
    const registry = useAsyncRegistry()
    
    // Automatic cleanup on component unmount
    registry.setupAutoCleanup(onUnmounted)
    
    // Use registry in async operations
    const startSomeAsyncOperation = () => {
      const operation = someAsyncTask()
      const id = registry.register('async-operation', 'promise', () => operation.cancel())
      
      operation.finally(() => registry.unregister(id))
    }
    
    return {
      startSomeAsyncOperation
    }
  }
}
```

### Phase 3: App Integration and Safety Net (1 hour)

#### Step 3.1: App-level Integration
**File**: `src/main.js` enhancement

```javascript
// Add global cleanup handlers
import { useGlobalAsyncRegistry } from '@/composables/useAsyncRegistry.js'

const { cleanupAll } = useGlobalAsyncRegistry()

// Cleanup on app unmount / page unload
window.addEventListener('beforeunload', () => {
  cleanupAll()
})

// Cleanup on router navigation (for SPA)
router.beforeEach((to, from) => {
  // Optional: cleanup processes from previous route
  if (from.path !== to.path) {
    cleanupAll()
  }
})

// Error boundary cleanup
window.addEventListener('error', () => {
  console.warn('[AsyncTracker] Error detected, performing cleanup')
  cleanupAll()
})
```

#### Step 3.2: Development Inspector Integration
**File**: `src/App.vue` enhancement (dev only)

```javascript
import { useAsyncInspector } from '@/composables/useAsyncInspector.js'

export default {
  setup() {
    // ... existing setup ...
    
    const inspector = useAsyncInspector()
    
    // Optional: Show stats in dev tools
    if (inspector.isEnabled) {
      // Auto-log stats every 30 seconds in development
      setInterval(() => {
        if (inspector.stats.value.total > 0) {
          inspector.logStats()
        }
      }, 30000)
    }
    
    return {
      // ... existing returns ...
      inspector
    }
  }
}
```

### Phase 4: Systematic Migration of All 33 Async Processes (3-4 hours)

This phase ensures complete integration of all async processes documented in `AsyncProcessesTable.md` with the new tracker, organized by risk priority and process category.

#### Migration Priority Matrix

Based on the AsyncProcessesTable analysis:

**Priority 1 - High Risk Processes (Immediate)**
- Firebase Auth State Monitoring (High Risk)
- Document Click Outside Detection (High Risk)

**Priority 2 - Medium Risk Processes (Next)**  
- Worker processes with complex lifecycle (8 processes)
- Deep Vue watchers and complex cleanup chains
- AbortController signal listeners with cascade logic

**Priority 3 - Low Risk Processes (Final)**
- Framework-managed processes (Vue watchers, nextTick)
- Short-lived timers and auto-cleanup processes
- Lazy loading and dynamic imports

#### Step 4.1: High-Risk Process Integration

**Firebase Auth State Monitoring**
```javascript
// src/services/authService.js - Enhanced
import { useAsyncRegistry } from '@/composables/useAsyncRegistry.js'

export function initializeAuthService() {
  const registry = useAsyncRegistry()
  
  // Register Firebase auth listener
  const authListenerId = registry.generateId('firebase-auth')
  
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    // ... existing auth handling ...
  })
  
  // Register with cleanup
  registry.register(authListenerId, 'firebase-listener', unsubscribe, {
    component: 'AuthService',
    critical: true
  })
  
  return {
    cleanup: () => {
      registry.unregister(authListenerId)
      unsubscribe()
    }
  }
}
```

**Global Document Event Listeners**
```javascript
// src/components/AppSwitcher.vue - Enhanced
import { useAsyncRegistry } from '@/composables/useAsyncRegistry.js'

export default {
  setup() {
    const registry = useAsyncRegistry()
    
    const handleClickOutside = (event) => {
      // ... existing logic ...
    }
    
    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
      
      // Register the listener
      const listenerId = registry.register('click-outside', 'event-listener', () => {
        document.removeEventListener('click', handleClickOutside)
      }, {
        component: 'AppSwitcher',
        element: 'document',
        event: 'click'
      })
    })
    
    // Auto-cleanup on unmount
    registry.setupAutoCleanup(onUnmounted)
  }
}
```

#### Step 4.2: Web Workers & Management (4 processes)

**File Hash Web Worker**
```javascript
// src/composables/useQueueDeduplication.js - Enhanced
export function useQueueDeduplication() {
  const registry = useAsyncRegistry()
  
  const startDeduplication = async (files) => {
    const workerId = registry.generateId('hash-worker')
    
    // Initialize worker with registry tracking
    const { worker, sendMessage } = useWebWorker()
    
    registry.register(workerId, 'worker', () => {
      worker.value?.terminate()
    }, {
      component: 'QueueDeduplication', 
      workerType: 'hash-calculation'
    })
    
    try {
      const result = await sendMessage({ type: 'PROCESS_FILES', files })
      registry.unregister(workerId)
      return result
    } catch (error) {
      registry.unregister(workerId) 
      throw error
    }
  }
}
```

**Worker Health Check System**
```javascript
// src/composables/useWebWorker.js - Enhanced health checks
export function useWebWorker() {
  const registry = useAsyncRegistry()
  let healthCheckIntervalId = null
  
  const startHealthChecking = () => {
    const healthCheckId = registry.generateId('health-check')
    
    healthCheckIntervalId = setInterval(async () => {
      try {
        await performHealthCheck()
      } catch (error) {
        handleHealthCheckFailure()
      }
    }, HEALTH_CHECK_INTERVAL)
    
    registry.register(healthCheckId, 'health-monitor', () => {
      if (healthCheckIntervalId) {
        clearInterval(healthCheckIntervalId)
        healthCheckIntervalId = null
      }
    })
  }
}
```

#### Step 4.3: Timers & Intervals (5 processes)

**Time-Based Warning Monitor**
```javascript
// src/composables/useTimeBasedWarning.js - Enhanced
export function useTimeBasedWarning() {
  const registry = useAsyncRegistry()
  
  const startMonitoring = (estimatedTime) => {
    const monitorId = registry.generateId('warning-monitor')
    
    const intervalId = setInterval(() => {
      // ... existing warning logic ...
    }, WARNING_CHECK_INTERVAL)
    
    registry.register(monitorId, 'warning-monitor', () => {
      clearInterval(intervalId)
    }, {
      component: 'TimeBasedWarning',
      estimatedDuration: estimatedTime
    })
    
    return intervalId
  }
}
```

**Component UI Delays**
```javascript
// src/components/features/auth/LoginForm.vue - Enhanced
export default {
  setup() {
    const registry = useAsyncRegistry()
    
    const showSuccessAndRedirect = () => {
      const delayId = registry.generateId('ui-delay')
      
      const timeoutId = setTimeout(() => {
        // ... redirect logic ...
        registry.unregister(delayId)
      }, 1500)
      
      registry.register(delayId, 'ui-delay', () => {
        clearTimeout(timeoutId)
      }, {
        component: 'LoginForm',
        purpose: 'success-feedback'
      })
    }
    
    registry.setupAutoCleanup(onUnmounted)
  }
}
```

#### Step 4.4: Event Listeners (4 processes)

**Modal Focus Trap**
```javascript
// src/components/features/upload/CloudFileWarningModal.vue - Enhanced
export default {
  setup(props) {
    const registry = useAsyncRegistry()
    
    const handleKeydown = (event) => {
      // ... focus trap logic ...
    }
    
    watch(() => props.isVisible, (isVisible) => {
      if (isVisible) {
        document.addEventListener('keydown', handleKeydown)
        
        const listenerId = registry.register('focus-trap', 'event-listener', () => {
          document.removeEventListener('keydown', handleKeydown)
        }, {
          component: 'CloudFileWarningModal',
          purpose: 'accessibility-focus-trap'
        })
      }
    })
    
    registry.setupAutoCleanup(onUnmounted)
  }
}
```

**AbortController Signal Listeners**
```javascript
// Already enhanced in useFolderTimeouts.js from Phase 2
// Additional enhancement for signal cascading
const enhanceAbortSignalTracking = (controller, processType) => {
  const signalId = registry.generateId('abort-signal')
  
  registry.register(signalId, 'signal-listener', () => {
    // Signal cleanup is automatic, but track for visibility
  }, {
    processType,
    cascadeProtection: true
  })
  
  return controller
}
```

#### Step 4.5: Vue Reactivity & Watchers (6 processes)

**Route and Component Watchers**
```javascript
// src/composables/useFavicon.js - Enhanced
export function useFavicon() {
  const registry = useAsyncRegistry()
  
  const watcherId = registry.generateId('route-watcher')
  
  const stopWatcher = watch(
    () => route.path,
    (newPath) => {
      updateFavicon(newPath)
    }
  )
  
  registry.register(watcherId, 'vue-watcher', stopWatcher, {
    component: 'FaviconManager',
    watchTarget: 'route.path'
  })
  
  registry.setupAutoCleanup(onUnmounted)
}
```

**Deep File Queue Watchers**
```javascript
// src/components/features/upload/FileUploadQueue.vue - Enhanced
export default {
  setup(props) {
    const registry = useAsyncRegistry()
    
    // Deep watcher with registry tracking
    const watcherId = registry.generateId('file-watcher')
    
    const stopWatcher = watch(
      () => props.files,
      (newFiles) => {
        // ... file processing logic ...
      },
      { deep: true }
    )
    
    registry.register(watcherId, 'vue-watcher', stopWatcher, {
      component: 'FileUploadQueue',
      watchType: 'deep',
      watchTarget: 'props.files'
    })
    
    registry.setupAutoCleanup(onUnmounted)
  }
}
```

#### Step 4.6: Component Lifecycle & DOM (4 processes)

**Intersection Observer**
```javascript
// src/components/features/upload/FileQueuePlaceholder.vue - Enhanced
export default {
  setup() {
    const registry = useAsyncRegistry()
    
    const { stop } = useIntersectionObserver(
      target,
      ([{ isIntersecting }]) => {
        // ... lazy loading logic ...
      }
    )
    
    const observerId = registry.register('intersection-observer', 'dom-observer', stop, {
      component: 'FileQueuePlaceholder',
      observerType: 'intersection'
    })
    
    registry.setupAutoCleanup(onUnmounted)
  }
}
```

**NextTick Operations**
```javascript
// src/composables/useFileQueue.js - Enhanced nextTick tracking
export function useFileQueue() {
  const registry = useAsyncRegistry()
  
  const updateQueueWithSync = async () => {
    const syncId = registry.generateId('next-tick')
    
    await nextTick()
    
    // Track for completeness (auto-cleanup)
    registry.register(syncId, 'vue-nexttick', () => {
      // nextTick is self-completing
    }, {
      component: 'FileQueue',
      purpose: 'dom-sync'
    })
    
    // Immediately unregister since nextTick is complete
    registry.unregister(syncId)
  }
}
```

#### Step 4.7: Promise Chains & Async Operations (5 processes)

**File Processing Pipeline**
```javascript
// src/composables/useFileQueue.js - Enhanced pipeline tracking
export function useFileQueue() {
  const registry = useAsyncRegistry()
  
  const processFileQueue = async (files) => {
    const pipelineId = registry.generateId('file-pipeline')
    
    try {
      // Register the entire pipeline
      let pipelineController = new AbortController()
      
      registry.register(pipelineId, 'promise-chain', () => {
        pipelineController.abort()
      }, {
        component: 'FileQueue',
        operation: 'file-processing',
        fileCount: files.length
      })
      
      // Process with cancellation support
      const result = await processFiles(files, pipelineController.signal)
      
      registry.unregister(pipelineId)
      return result
      
    } catch (error) {
      registry.unregister(pipelineId)
      throw error
    }
  }
}
```

**Progress Tracking Operations**
```javascript
// src/composables/useFolderProgress.js - Enhanced yield points
export function useFolderProgress() {
  const registry = useAsyncRegistry()
  
  const processWithYields = async (items) => {
    const yieldId = registry.generateId('progress-yield')
    
    // Track yield operations for debugging
    registry.register(yieldId, 'micro-task', () => {
      // Yield points are self-completing
    }, {
      component: 'FolderProgress',
      purpose: 'ui-responsiveness'
    })
    
    for (const item of items) {
      // ... processing ...
      
      // Yield to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    registry.unregister(yieldId)
  }
}
```

#### Step 4.8: Lazy Loading & Dynamic Imports (3 processes)

**Route Component Lazy Loading**
```javascript
// src/router/index.js - Enhanced with tracking
import { useAsyncRegistry } from '@/composables/useAsyncRegistry.js'

const routes = [
  {
    path: '/upload',
    component: () => {
      const registry = useAsyncRegistry()
      const importId = registry.generateId('route-import')
      
      const importPromise = import('@/views/FileUpload.vue')
      
      registry.register(importId, 'dynamic-import', () => {
        // Imports can't be cancelled, but track for visibility
      }, {
        route: '/upload',
        component: 'FileUpload'
      })
      
      importPromise.finally(() => {
        registry.unregister(importId)
      })
      
      return importPromise
    }
  }
]
```

#### Step 4.9: Migration Validation Checklist

**Process Coverage Verification:**
- [ ] Web Workers & Management (4/4 processes)
  - [ ] File Hash Web Worker
  - [ ] Worker Manager Health Check  
  - [ ] Worker Message Timeout
  - [ ] Worker Restart Delay

- [ ] Timers & Intervals (5/5 processes)
  - [ ] Folder Analysis Timeout Controller
  - [ ] Global Processing Timeout
  - [ ] Time-Based Warning Monitor
  - [ ] Login Form Success Delay
  - [ ] Folder Options Analysis Delay

- [ ] Event Listeners (4/4 processes)  
  - [ ] Document Click Outside Detection
  - [ ] Modal Focus Trap
  - [ ] AbortController Signal Listeners
  - [ ] Folder Analysis Abort Handler

- [ ] Vue Reactivity & Watchers (6/6 processes)
  - [ ] Favicon Route Watcher
  - [ ] App Switcher Hover Watcher
  - [ ] Folder Options Completion Watcher
  - [ ] File Upload Queue File Watcher
  - [ ] Cloud Warning Modal Visibility Watcher
  - [ ] Auth Store State Watcher

- [ ] Component Lifecycle & DOM (4/4 processes)
  - [ ] App Switcher DOM Updates
  - [ ] Cloud Modal DOM Updates  
  - [ ] File Queue Intersection Observer
  - [ ] Idle Callback Observer Setup

- [ ] Promise Chains & Async Operations (5/5 processes)
  - [ ] Firebase Auth State Monitoring
  - [ ] File Queue Processing Chain
  - [ ] Deduplication Processing Coordination
  - [ ] File Progress Yield Points
  - [ ] Route Guard Auth Waiting

- [ ] Lazy Loading & Dynamic Imports (3/3 processes)
  - [ ] Route Component Lazy Loading
  - [ ] Firebase Services Lazy Loading
  - [ ] Team Store Service Lazy Loading

- [ ] Specialized Async Patterns (2/2 processes)
  - [ ] File Queue nextTick Synchronization
  - [ ] Memory Leak Test Timeouts

**Integration Testing per Category:**
- [ ] High-risk processes function with registry
- [ ] Medium-risk processes maintain existing cleanup
- [ ] Low-risk processes add minimal overhead
- [ ] No interference with Vue's built-in cleanup
- [ ] Registry stats accurately reflect active processes

### Phase 5: Testing and Validation (2-3 hours)

#### Step 5.1: Unit Tests
**File**: `src/composables/useAsyncRegistry.test.js`

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAsyncRegistry, useGlobalAsyncRegistry } from './useAsyncRegistry.js'

describe('useAsyncRegistry', () => {
  beforeEach(() => {
    // Clear global state
    useGlobalAsyncRegistry().cleanupAll()
  })
  
  it('should register and unregister processes', () => {
    const registry = useAsyncRegistry()
    const cleanup = vi.fn()
    
    const id = registry.register('test-id', 'test', cleanup)
    expect(registry.getComponentProcesses()).toHaveLength(1)
    
    registry.unregister(id)
    expect(registry.getComponentProcesses()).toHaveLength(0)
  })
  
  it('should execute cleanup functions', () => {
    const registry = useAsyncRegistry()
    const cleanup1 = vi.fn()
    const cleanup2 = vi.fn()
    
    registry.register('test-1', 'test', cleanup1)
    registry.register('test-2', 'test', cleanup2)
    
    registry.cleanup()
    
    expect(cleanup1).toHaveBeenCalled()
    expect(cleanup2).toHaveBeenCalled()
  })
  
  it('should provide accurate stats', () => {
    const registry = useAsyncRegistry()
    
    registry.register('timeout-1', 'timeout', vi.fn())
    registry.register('worker-1', 'worker', vi.fn())
    registry.register('timeout-2', 'timeout', vi.fn())
    
    const stats = registry.getStats()
    expect(stats.total).toBe(3)
    expect(stats.byType.timeout).toBe(2)
    expect(stats.byType.worker).toBe(1)
  })
})
```

#### Step 5.2: Integration Tests
**File**: `src/composables/asyncRegistry.integration.test.js`

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { useFolderTimeouts } from './useFolderTimeouts.js'

describe('AsyncRegistry Integration', () => {
  it('should track timeout processes', async () => {
    const timeouts = useFolderTimeouts()
    const registry = timeouts.registry
    
    // Start a timeout
    const controller = timeouts.startLocalTimeout(1000, () => {})
    
    expect(registry.getComponentProcesses()).toHaveLength(1)
    expect(registry.getStats().byType.timeout).toBe(1)
    
    // Cleanup
    controller.abort()
    expect(registry.getComponentProcesses()).toHaveLength(0)
  })
})
```

## Implementation Benefits

### Development Benefits
1. **Visibility**: See all running async processes in dev tools
2. **Debugging**: Identify processes that aren't cleaning up
3. **Safety Net**: Emergency cleanup for hanging processes
4. **Monitoring**: Track process lifecycle and performance

### Production Benefits
1. **Memory Leak Prevention**: Automatic cleanup on route changes/errors
2. **Reliability**: Ensures cleanup even if individual components fail
3. **Zero Overhead**: Minimal runtime cost, debug features disabled in production

### Maintenance Benefits
1. **Non-Intrusive**: Existing code patterns remain unchanged
2. **Optional**: Can be removed without breaking functionality
3. **Simple**: Easy to understand and modify
4. **Standards-Based**: Uses existing AbortController patterns

## Risk Assessment

### Low Risk Factors
- **No changes to working patterns**: Existing AbortController code unchanged
- **Additive only**: Only adds tracking, doesn't modify behavior
- **Development focused**: Heavy features disabled in production
- **Easy removal**: Can be removed without affecting functionality

### Potential Issues
- **Memory overhead**: Small map storage for process tracking
- **Console noise**: Debug logging in development (easily disabled)
- **Integration effort**: Requires careful addition to existing composables

## Success Metrics

### Immediate Success (Phase 1-2)
- Registry can track and cleanup async processes
- Zero impact on existing functionality
- Development inspector provides useful information

### Long-term Success (Phase 3-4)  
- Reduced memory leaks from untracked processes
- Faster debugging of async-related issues
- Confidence in async process lifecycle management

## File Structure

```
src/
   composables/
      useAsyncRegistry.js          # Core registry implementation
      useAsyncInspector.js         # Development inspector
      useFolderTimeouts.js         # Enhanced with registry (minimal changes)
      useWebWorker.js              # Enhanced with registry (minimal changes)
      __tests__/
          useAsyncRegistry.test.js
          asyncRegistry.integration.test.js
   main.js                          # App-level integration
   App.vue                          # Dev inspector integration
```

## Implementation Timeline

**Updated Total Estimated Time**: 8-12 hours
- **Phase 1**: 1-2 hours (Core registry and inspector)
- **Phase 2**: 2-3 hours (Integration with existing composables)
- **Phase 3**: 1 hour (App-level integration and safety net)
- **Phase 4**: 3-4 hours (Systematic migration of all 33 processes)
- **Phase 5**: 2-3 hours (Testing and validation)

## Dependencies

**No external dependencies** - uses only:
- Vue 3 Composition API (already used)
- Native JavaScript Map/Set collections
- Existing AbortController patterns

## Conclusion

This minimalist async tracker provides maximum benefit with minimal risk by:

1. **Preserving existing patterns** that already work well
2. **Adding safety net capabilities** for better reliability
3. **Providing development visibility** for easier debugging
4. **Maintaining KISS principles** with simple, understandable code

The implementation focuses on being additive rather than disruptive, ensuring that your well-functioning async patterns continue to work while gaining the benefits of centralized tracking and emergency cleanup capabilities.