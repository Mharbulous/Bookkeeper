/**
 * Centralized error message utility for file processing and Web Worker errors
 * Provides user-friendly error messages and suggested actions for different failure scenarios
 */

// Error type classifications
export const ERROR_TYPES = {
  WORKER_ERROR: 'worker-error',
  TIMEOUT: 'timeout',
  MEMORY_ERROR: 'memory-error',
  VALIDATION_ERROR: 'validation-error',
  NETWORK_ERROR: 'network-error',
  PERMISSION_ERROR: 'permission-error',
  FILE_ERROR: 'file-error',
  BROWSER_ERROR: 'browser-error',
  UNKNOWN_ERROR: 'unknown-error'
}

// Error severity levels
export const ERROR_SEVERITY = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info'
}

// Error message templates
const ERROR_MESSAGES = {
  [ERROR_TYPES.WORKER_ERROR]: {
    title: 'Web Worker Error',
    description: 'The background processing engine encountered an error and could not complete the operation.',
    severity: ERROR_SEVERITY.CRITICAL,
    icon: 'mdi-web-off',
    suggestions: [
      'Try using fallback mode for better compatibility',
      'Restart your browser if the problem persists',
      'Check for browser updates or compatibility issues',
      'Disable browser extensions that might interfere'
    ]
  },
  
  [ERROR_TYPES.TIMEOUT]: {
    title: 'Processing Timeout',
    description: 'The file processing operation took too long and was cancelled to prevent browser freezing.',
    severity: ERROR_SEVERITY.WARNING,
    icon: 'mdi-clock-alert',
    suggestions: [
      'Try processing fewer files at once (recommended: 50-100 files)',
      'Use fallback mode for large file sets',
      'Close other browser tabs to free up resources',
      'Check your system performance and available memory'
    ]
  },
  
  [ERROR_TYPES.MEMORY_ERROR]: {
    title: 'Memory Error',
    description: 'Your browser ran out of available memory while processing the files.',
    severity: ERROR_SEVERITY.CRITICAL,
    icon: 'mdi-memory',
    suggestions: [
      'Process fewer files at once (try 25-50 files maximum)',
      'Close other browser tabs and applications',
      'Use fallback mode for better memory management',
      'Consider processing files in smaller batches'
    ]
  },
  
  [ERROR_TYPES.VALIDATION_ERROR]: {
    title: 'File Validation Error',
    description: 'Some of the selected files could not be processed due to validation issues.',
    severity: ERROR_SEVERITY.WARNING,
    icon: 'mdi-file-alert',
    suggestions: [
      'Check that all selected items are valid files (not shortcuts or corrupted files)',
      'Remove any files that might be locked or in use by other applications',
      'Try selecting files individually to identify problematic items',
      'Ensure you have permission to access all selected files'
    ]
  },
  
  [ERROR_TYPES.NETWORK_ERROR]: {
    title: 'Network Error',
    description: 'A network connectivity issue prevented the operation from completing.',
    severity: ERROR_SEVERITY.WARNING,
    icon: 'mdi-network-off',
    suggestions: [
      'Check your internet connection',
      'Try again in a few moments',
      'Use fallback mode if network issues persist',
      'Contact support if you continue to experience problems'
    ]
  },
  
  [ERROR_TYPES.PERMISSION_ERROR]: {
    title: 'Permission Error',
    description: 'The application does not have permission to access some of the selected files.',
    severity: ERROR_SEVERITY.WARNING,
    icon: 'mdi-lock-alert',
    suggestions: [
      'Ensure you have read permission for all selected files',
      'Try running your browser as administrator (Windows)',
      'Check file and folder permissions',
      'Remove any files from restricted locations'
    ]
  },
  
  [ERROR_TYPES.FILE_ERROR]: {
    title: 'File Processing Error',
    description: 'An error occurred while reading or processing one or more files.',
    severity: ERROR_SEVERITY.WARNING,
    icon: 'mdi-file-remove',
    suggestions: [
      'Check that the files are not corrupted or in use',
      'Try selecting different files to identify problematic ones',
      'Ensure files are fully downloaded and accessible',
      'Remove any zero-byte or invalid files'
    ]
  },
  
  [ERROR_TYPES.BROWSER_ERROR]: {
    title: 'Browser Compatibility Error',
    description: 'Your browser does not support some features required for optimal file processing.',
    severity: ERROR_SEVERITY.INFO,
    icon: 'mdi-web-off',
    suggestions: [
      'Update your browser to the latest version',
      'Use fallback mode for better compatibility',
      'Try using a modern browser (Chrome, Firefox, Safari, Edge)',
      'Enable JavaScript if it has been disabled'
    ]
  },
  
  [ERROR_TYPES.UNKNOWN_ERROR]: {
    title: 'Unexpected Error',
    description: 'An unexpected error occurred during file processing.',
    severity: ERROR_SEVERITY.CRITICAL,
    icon: 'mdi-alert-circle',
    suggestions: [
      'Try the operation again',
      'Use fallback mode for better stability',
      'Refresh the page and try again',
      'Contact support if the problem persists'
    ]
  }
}

/**
 * Analyzes an error and returns classified error information
 * @param {Error|string} error - The error to analyze
 * @param {Object} context - Additional context about the error
 * @returns {Object} Classified error information
 */
export function analyzeError(error, context = {}) {
  const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error'
  const errorStack = typeof error === 'object' ? error?.stack : null
  
  // Determine error type based on error message and context
  const errorType = determineErrorType(errorMessage, context)
  const errorInfo = ERROR_MESSAGES[errorType]
  
  return {
    type: errorType,
    originalMessage: errorMessage,
    stack: errorStack,
    context,
    ...errorInfo,
    userMessage: generateUserMessage(errorInfo, errorMessage, context)
  }
}

/**
 * Determines the error type based on the error message and context
 * @param {string} errorMessage - The error message to analyze
 * @param {Object} context - Additional context
 * @returns {string} The determined error type
 */
function determineErrorType(errorMessage, context) {
  const lowerMessage = errorMessage.toLowerCase()
  
  // Worker-related errors
  if (lowerMessage.includes('worker') || 
      lowerMessage.includes('web worker') ||
      lowerMessage.includes('postmessage') ||
      context.source === 'worker') {
    return ERROR_TYPES.WORKER_ERROR
  }
  
  // Timeout errors
  if (lowerMessage.includes('timeout') || 
      lowerMessage.includes('timed out') ||
      context.timeout) {
    return ERROR_TYPES.TIMEOUT
  }
  
  // Memory errors
  if (lowerMessage.includes('memory') ||
      lowerMessage.includes('out of memory') ||
      lowerMessage.includes('maximum call stack') ||
      lowerMessage.includes('heap')) {
    return ERROR_TYPES.MEMORY_ERROR
  }
  
  // Validation errors
  if (lowerMessage.includes('invalid file') ||
      lowerMessage.includes('validation') ||
      lowerMessage.includes('expected file object') ||
      context.validation) {
    return ERROR_TYPES.VALIDATION_ERROR
  }
  
  // Network errors
  if (lowerMessage.includes('network') ||
      lowerMessage.includes('fetch') ||
      lowerMessage.includes('connection') ||
      context.network) {
    return ERROR_TYPES.NETWORK_ERROR
  }
  
  // Permission errors
  if (lowerMessage.includes('permission') ||
      lowerMessage.includes('access denied') ||
      lowerMessage.includes('forbidden') ||
      context.permission) {
    return ERROR_TYPES.PERMISSION_ERROR
  }
  
  // File processing errors
  if (lowerMessage.includes('file') ||
      lowerMessage.includes('read') ||
      lowerMessage.includes('hash') ||
      lowerMessage.includes('arrayBuffer') ||
      context.fileProcessing) {
    return ERROR_TYPES.FILE_ERROR
  }
  
  // Browser compatibility errors
  if (lowerMessage.includes('not supported') ||
      lowerMessage.includes('undefined') && context.feature ||
      context.browserCompatibility) {
    return ERROR_TYPES.BROWSER_ERROR
  }
  
  return ERROR_TYPES.UNKNOWN_ERROR
}

/**
 * Generates a user-friendly error message
 * @param {Object} errorInfo - Error information template
 * @param {string} originalMessage - Original error message
 * @param {Object} context - Error context
 * @returns {string} User-friendly error message
 */
function generateUserMessage(errorInfo, originalMessage, context) {
  let message = errorInfo.description
  
  // Add context-specific information
  if (context.fileCount) {
    message += ` This occurred while processing ${context.fileCount} files.`
  }
  
  if (context.processingMode) {
    message += ` Processing mode: ${context.processingMode}.`
  }
  
  if (context.retryAttempt && context.retryAttempt > 1) {
    message += ` This is retry attempt ${context.retryAttempt}.`
  }
  
  return message
}

/**
 * Creates a standardized error object for the application
 * @param {Error|string} error - The original error
 * @param {Object} context - Additional context
 * @returns {Object} Standardized error object
 */
export function createApplicationError(error, context = {}) {
  const analyzed = analyzeError(error, context)
  
  return {
    message: analyzed.userMessage,
    title: analyzed.title,
    type: analyzed.type,
    severity: analyzed.severity,
    icon: analyzed.icon,
    suggestions: analyzed.suggestions,
    details: analyzed.originalMessage,
    stack: analyzed.stack,
    timestamp: new Date().toISOString(),
    context: analyzed.context
  }
}

/**
 * Formats error suggestions as a readable list
 * @param {Array} suggestions - Array of suggestion strings
 * @returns {string} Formatted suggestions
 */
export function formatErrorSuggestions(suggestions) {
  if (!suggestions || suggestions.length === 0) {
    return ''
  }
  
  return suggestions.map((suggestion, index) => 
    `${index + 1}. ${suggestion}`
  ).join('\n')
}

/**
 * Determines if an error is recoverable (can be retried)
 * @param {string} errorType - The error type
 * @param {Object} context - Error context
 * @returns {boolean} Whether the error is recoverable
 */
export function isRecoverableError(errorType, context = {}) {
  const recoverableTypes = [
    ERROR_TYPES.TIMEOUT,
    ERROR_TYPES.NETWORK_ERROR,
    ERROR_TYPES.WORKER_ERROR
  ]
  
  // Don't retry if we've already exceeded max attempts
  if (context.retryAttempt >= (context.maxRetries || 3)) {
    return false
  }
  
  return recoverableTypes.includes(errorType)
}

/**
 * Gets recommended retry delay based on error type and attempt number
 * @param {string} errorType - The error type
 * @param {number} retryAttempt - Current retry attempt
 * @returns {number} Delay in milliseconds
 */
export function getRetryDelay(errorType, retryAttempt = 1) {
  const baseDelays = {
    [ERROR_TYPES.WORKER_ERROR]: 2000,
    [ERROR_TYPES.TIMEOUT]: 3000,
    [ERROR_TYPES.NETWORK_ERROR]: 1000,
    [ERROR_TYPES.MEMORY_ERROR]: 5000
  }
  
  const baseDelay = baseDelays[errorType] || 1000
  
  // Exponential backoff: base delay * 2^(attempt - 1)
  return baseDelay * Math.pow(2, Math.min(retryAttempt - 1, 3))
}

/**
 * Creates an error report for debugging purposes
 * @param {Object} error - Application error object
 * @param {Object} systemInfo - System information
 * @returns {Object} Error report
 */
export function createErrorReport(error, systemInfo = {}) {
  return {
    error: {
      message: error.message,
      type: error.type,
      severity: error.severity,
      timestamp: error.timestamp,
      details: error.details,
      stack: error.stack,
      context: error.context
    },
    system: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine,
      ...systemInfo
    },
    page: {
      url: window.location.href,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    }
  }
}