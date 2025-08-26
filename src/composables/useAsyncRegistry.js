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