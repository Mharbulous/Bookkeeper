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
    return longRunningProcesses.value.filter(process => 
      !['watcher', 'listener', 'async-monitoring'].includes(process.type)
    )
  })
  
  // Console logging for debugging
  const logStats = () => {
    console.group('[AsyncTracker] Current Statistics')
    console.table(stats.value.byType)
    if (suspiciousProcesses.value.length > 0) {
      console.warn('Suspicious long-running processes (excluding normal monitoring):', suspiciousProcesses.value)
    } else if (longRunningProcesses.value.length > 0) {
      console.info('Long-running processes detected, but all are expected system processes')
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