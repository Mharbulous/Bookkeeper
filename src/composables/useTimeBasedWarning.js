import { ref, computed, onBeforeUnmount, readonly } from 'vue'

export const useTimeBasedWarning = () => {
  // Core state
  const startTime = ref(null)
  const estimatedDuration = ref(0)
  const monitoringInterval = ref(null)
  const warningShown = ref(false)
  const showCloudFileWarning = ref(false)
  const snoozeUntil = ref(null)
  const currentTime = ref(Date.now()) // Reactive current time for progress updates
  
  // Constants
  const WARNING_THRESHOLD = 1.3 // 30% over estimate
  const CHECK_INTERVAL = 1000 // 1 second (faster updates for progress)
  const SNOOZE_DURATION = 60000 // 1 minute
  
  // Computed properties
  const elapsedTime = computed(() => {
    if (!startTime.value) return 0
    return Math.max(0, currentTime.value - startTime.value)
  })
  
  const progressPercentage = computed(() => {
    if (!startTime.value || !estimatedDuration.value) return 0
    
    const progress = Math.min((elapsedTime.value / estimatedDuration.value) * 100, 100)
    return Math.round(progress)
  })
  
  const isOverdue = computed(() => {
    if (!startTime.value || !estimatedDuration.value) return false
    
    return elapsedTime.value > (estimatedDuration.value * WARNING_THRESHOLD)
  })
  
  const overdueSeconds = computed(() => {
    if (!isOverdue.value) return 0
    
    const overdueMs = elapsedTime.value - (estimatedDuration.value * WARNING_THRESHOLD)
    return Math.round(overdueMs / 1000)
  })
  
  const isSnoozing = computed(() => {
    if (!snoozeUntil.value) return false
    return Date.now() < snoozeUntil.value
  })
  
  const shouldShowWarning = computed(() => {
    return isOverdue.value && !warningShown.value && !isSnoozing.value
  })
  
  const timeRemaining = computed(() => {
    if (!startTime.value || !estimatedDuration.value) return 0
    
    const remaining = estimatedDuration.value - elapsedTime.value
    return Math.max(remaining, 0)
  })
  
  const formattedElapsedTime = computed(() => {
    const seconds = Math.round(elapsedTime.value / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${seconds}s`
  })
  
  const formattedTimeRemaining = computed(() => {
    const seconds = Math.round(timeRemaining.value / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    if (seconds <= 0) return '0s'
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${seconds}s`
  })
  
  // Methods
  const startMonitoring = (durationMs = 0) => {
    if (durationMs <= 0) {
      console.warn('useTimeBasedWarning: Invalid duration provided', durationMs)
      return
    }
    
    startTime.value = Date.now()
    estimatedDuration.value = durationMs
    warningShown.value = false
    showCloudFileWarning.value = false
    snoozeUntil.value = null
    
    // Clear any existing interval
    stopMonitoring()
    
    // Start monitoring interval
    monitoringInterval.value = setInterval(checkForWarning, CHECK_INTERVAL)
  }
  
  const stopMonitoring = () => {
    if (monitoringInterval.value) {
      clearInterval(monitoringInterval.value)
      monitoringInterval.value = null
    }
  }
  
  const resetMonitoring = () => {
    stopMonitoring()
    startTime.value = null
    estimatedDuration.value = 0
    warningShown.value = false
    showCloudFileWarning.value = false
    snoozeUntil.value = null
    currentTime.value = Date.now() // Reset current time
  }
  
  const checkForWarning = () => {
    // Update current time for reactive progress updates
    currentTime.value = Date.now()
    
    // Debug progress calculation
    if (startTime.value && estimatedDuration.value) {
      const elapsed = elapsedTime.value
      const progress = Math.round((elapsed / estimatedDuration.value) * 100)
      console.log(`Progress update: elapsed=${elapsed}ms, estimated=${estimatedDuration.value}ms, progress=${progress}%`)
    }
    
    if (shouldShowWarning.value) {
      showCloudFileWarning.value = true
      warningShown.value = true
    }
  }
  
  const snoozeWarning = () => {
    showCloudFileWarning.value = false
    snoozeUntil.value = Date.now() + SNOOZE_DURATION
    warningShown.value = false // Allow warning to show again after snooze
  }
  
  const dismissWarning = () => {
    showCloudFileWarning.value = false
    warningShown.value = true // Keep warning dismissed for this session
  }
  
  const abortProcessing = () => {
    stopMonitoring()
    showCloudFileWarning.value = false
    return resetMonitoring()
  }
  
  // Cleanup on component unmount
  onBeforeUnmount(() => {
    stopMonitoring()
  })
  
  return {
    // State
    startTime: readonly(startTime),
    estimatedDuration: readonly(estimatedDuration),
    showCloudFileWarning,
    
    // Computed properties
    elapsedTime,
    progressPercentage,
    isOverdue,
    overdueSeconds,
    isSnoozing,
    shouldShowWarning,
    timeRemaining,
    formattedElapsedTime,
    formattedTimeRemaining,
    
    // Methods
    startMonitoring,
    stopMonitoring,
    resetMonitoring,
    checkForWarning,
    snoozeWarning,
    dismissWarning,
    abortProcessing,
    
    // Constants (for testing and configuration)
    WARNING_THRESHOLD,
    CHECK_INTERVAL,
    SNOOZE_DURATION
  }
}