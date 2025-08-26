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