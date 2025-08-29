/**
 * Global timing utility for simplified console logging
 * Tracks all times relative to T=0 (processing start)
 */

let processingStartTime = null;

/**
 * Initialize the timing system and set T=0
 */
export function startProcessingTimer() {
  processingStartTime = Date.now();
  console.log('PROCESSING_START: 0');
  return processingStartTime;
}

/**
 * Log an event with time relative to T=0
 * @param {string} eventName - Name of the event (e.g., 'DEDUPLICATION_START')
 */
export function logProcessingTime(eventName) {
  if (processingStartTime === null) {
    console.warn(`⚠️  ProcessingTimer: ${eventName} logged before timer started`);
    return;
  }

  const relativeTime = Date.now() - processingStartTime;
  console.log(`${eventName}: ${relativeTime}`);
}

/**
 * Get current time relative to T=0 (for calculations without logging)
 * @returns {number} Time in milliseconds since T=0
 */
export function getRelativeTime() {
  if (processingStartTime === null) {
    return 0;
  }
  return Date.now() - processingStartTime;
}

/**
 * Reset the timing system (for cleanup)
 */
export function resetProcessingTimer() {
  processingStartTime = null;
}
