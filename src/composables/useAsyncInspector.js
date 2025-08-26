import { computed } from 'vue'
import { useGlobalAsyncRegistry } from './useAsyncRegistry'

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
    const suspicious = longRunningProcesses.value.filter(process => 
      !['watcher', 'listener'].includes(process.type)
    )
    
    // Check for multiple async-monitoring processes (should only be 1)
    const monitoringProcesses = suspicious.filter(p => p.type === 'async-monitoring')
    if (monitoringProcesses.length > 1) {
      return suspicious // Include all if multiple monitors detected
    }
    
    // Exclude single async-monitoring process (normal case)
    return suspicious.filter(process => process.type !== 'async-monitoring')
  })
  
  // Console logging for debugging
  const logStats = () => {
    const allProcesses = processes.value
    const monitoringProcesses = allProcesses.filter(p => p.type === 'async-monitoring')
    const nonMonitoringProcesses = allProcesses.filter(p => p.type !== 'async-monitoring')
    
    // Silent when only exactly 1 async-monitoring process exists and nothing else
    if (monitoringProcesses.length === 1 && nonMonitoringProcesses.length === 0) {
      return // Complete silence - normal state
    }
    
    // All other cases: show full statistics table including async-monitoring
    console.group('[AsyncTracker] Current Statistics')
    console.table(stats.value.byType)
    
    // Special case: multiple monitoring processes (should never happen)
    if (monitoringProcesses.length > 1) {
      console.error(`Multiple async-monitoring processes detected (${monitoringProcesses.length})! Should only be 1:`, monitoringProcesses)
    }
    
    // Show suspicious non-monitoring processes if any
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
      cleanup: () => useGlobalAsyncRegistry().cleanupAll(),
      // Debug helper to see what worker processes exist
      debugWorkers: () => {
        const workerProcesses = processes.value.filter(p => p.type === 'worker')
        console.group('[AsyncTracker] Worker Process Debug')
        console.log('Total worker processes:', workerProcesses.length)
        workerProcesses.forEach((process, index) => {
          console.log(`Worker ${index + 1}:`, {
            id: process.id,
            type: process.type,
            component: process.component,
            meta: process.meta,
            age: Date.now() - process.created + 'ms',
            created: new Date(process.created).toISOString(),
            hasCleanup: typeof process.cleanup === 'function'
          })
          console.log(`Worker ${index + 1} cleanup function:`, process.cleanup?.toString())
        })
        console.groupEnd()
        return workerProcesses
      },
      // Test cleanup on a specific worker
      cleanupWorker: (workerId) => {
        const { processes } = useGlobalAsyncRegistry()
        const allProcesses = processes.value
        const worker = allProcesses.find(p => p.id === workerId)
        if (worker) {
          console.log('Attempting to cleanup worker:', workerId)
          try {
            worker.cleanup?.()
            console.log('Worker cleanup function executed')
          } catch (error) {
            console.error('Error during worker cleanup:', error)
          }
        } else {
          console.warn('Worker not found:', workerId)
        }
      }
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