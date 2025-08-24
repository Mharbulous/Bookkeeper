import { ref, computed } from 'vue'

/**
 * Composable for tracking and measuring performance metrics in demos
 * Provides easy-to-use performance measurement tools for demonstration purposes
 */
export function usePerformanceTracker() {
  const measurements = ref([])
  const isTracking = ref(false)
  
  // Start a new performance measurement
  const startMeasurement = (name, description = '') => {
    const measurement = {
      name,
      description,
      startTime: performance.now(),
      endTime: null,
      duration: null,
      metadata: {}
    }
    
    measurements.value.push(measurement)
    isTracking.value = true
    
    console.log(`⏱️ Started measuring: ${name}`)
    return measurement
  }
  
  // End a performance measurement
  const endMeasurement = (name) => {
    const measurement = measurements.value.find(m => m.name === name && m.endTime === null)
    if (!measurement) {
      console.warn(`⚠️ No active measurement found for: ${name}`)
      return null
    }
    
    measurement.endTime = performance.now()
    measurement.duration = measurement.endTime - measurement.startTime
    
    console.log(`✅ Completed measurement: ${name} - ${measurement.duration.toFixed(3)}ms`)
    
    return measurement
  }
  
  // Measure a function execution
  const measureFunction = async (name, fn, description = '') => {
    const measurement = startMeasurement(name, description)
    
    try {
      const result = await fn()
      endMeasurement(name)
      return result
    } catch (error) {
      endMeasurement(name)
      measurement.metadata.error = error
      throw error
    }
  }
  
  // Measure DOM operations
  const measureDOMOperation = (name, operation, count = 1) => {
    const measurement = startMeasurement(name, `DOM operation repeated ${count} times`)
    
    try {
      const result = operation()
      endMeasurement(name)
      
      // Calculate per-item metrics
      if (count > 1) {
        measurement.metadata.totalItems = count
        measurement.metadata.averagePerItem = measurement.duration / count
        console.log(`📊 Average per item: ${measurement.metadata.averagePerItem.toFixed(6)}ms`)
      }
      
      return result
    } catch (error) {
      endMeasurement(name)
      measurement.metadata.error = error
      throw error
    }
  }
  
  // Get performance summary
  const getPerformanceSummary = () => {
    const completed = measurements.value.filter(m => m.endTime !== null)
    
    return {
      totalMeasurements: measurements.value.length,
      completedMeasurements: completed.length,
      totalTime: completed.reduce((sum, m) => sum + m.duration, 0),
      averageTime: completed.length > 0 ? 
        completed.reduce((sum, m) => sum + m.duration, 0) / completed.length : 0,
      measurements: completed.map(m => ({
        name: m.name,
        duration: m.duration,
        description: m.description,
        metadata: m.metadata
      }))
    }
  }
  
  // Clear all measurements
  const clearMeasurements = () => {
    measurements.value = []
    isTracking.value = false
    console.log('🧹 Cleared all performance measurements')
  }
  
  // Computed properties for reactive UI
  const completedMeasurements = computed(() => 
    measurements.value.filter(m => m.endTime !== null)
  )
  
  const activeMeasurements = computed(() => 
    measurements.value.filter(m => m.endTime === null)
  )
  
  const totalDuration = computed(() => 
    completedMeasurements.value.reduce((sum, m) => sum + m.duration, 0)
  )
  
  // Format duration for display
  const formatDuration = (ms) => {
    if (ms < 1) return `${(ms * 1000).toFixed(1)}μs`
    if (ms < 1000) return `${ms.toFixed(3)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }
  
  // Performance comparison helper
  const comparePerformance = (baseline, optimized) => {
    if (!baseline || !optimized) return null
    
    const improvement = baseline - optimized
    const percentageImprovement = (improvement / baseline) * 100
    
    return {
      baseline: baseline,
      optimized: optimized,
      improvement: improvement,
      percentageImprovement: percentageImprovement,
      speedupFactor: baseline / optimized,
      summary: `${percentageImprovement.toFixed(1)}% improvement (${(baseline/optimized).toFixed(1)}x faster)`
    }
  }
  
  return {
    // State
    measurements: measurements.value,
    isTracking,
    
    // Actions
    startMeasurement,
    endMeasurement,
    measureFunction,
    measureDOMOperation,
    clearMeasurements,
    
    // Getters
    getPerformanceSummary,
    formatDuration,
    comparePerformance,
    
    // Computed
    completedMeasurements,
    activeMeasurements,
    totalDuration
  }
}