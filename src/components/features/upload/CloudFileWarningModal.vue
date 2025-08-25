<template>
  <Teleport to="body">
    <div
      v-if="isVisible"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="headerId"
      :aria-describedby="descriptionId"
      @click.self="handleOverlayClick"
      @keydown.esc="handleEscapeKey"
    >
      <div
        ref="modalContent"
        class="modal-content"
        tabindex="-1"
      >
        <!-- Header -->
        <div class="modal-header">
          <div class="flex items-center space-x-3">
            <div class="warning-icon">
              <svg class="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <h2 :id="headerId" class="modal-title">
              Upload Taking Longer Than Expected
            </h2>
          </div>
          <button
            ref="closeButton"
            type="button"
            class="close-button"
            :aria-label="closeButtonLabel"
            @click="handleCloseClick"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div :id="descriptionId" class="modal-body">
          <!-- Status Information -->
          <div class="status-section">
            <div class="status-item">
              <span class="status-label">Time elapsed:</span>
              <span class="status-value">{{ formattedElapsedTime }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Original estimate:</span>
              <span class="status-value">{{ formattedEstimate }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Over estimate by:</span>
              <span class="status-value text-red-600 font-semibold">{{ overdueSeconds }} seconds</span>
            </div>
          </div>

          <!-- Explanation Section -->
          <div class="explanation-section">
            <h3 class="section-title">Why is this happening?</h3>
            <div class="explanation-content">
              <p class="explanation-text">
                File deduplication requires calculating SHA-256 hash values for each file.
                Hash calculations can only be performed on files stored locally on your device.
              </p>
              <p class="explanation-text">
                Slow processing often indicates files are stored in the cloud and being downloaded on-demand.
              </p>
            </div>
          </div>

          <!-- Detection Logic Section -->
          <div class="detection-section">
            <h3 class="section-title">How do we know?</h3>
            <div class="detection-content">
              <p class="detection-text">
                For web security reasons, browsers cannot tell us whether your files are stored locally or in the cloud.
              </p>
              <p class="detection-text">
                However, the slow processing speed (currently <strong>{{ overdueSeconds }} seconds over estimate</strong>) 
                suggests your files may not be stored locally.
              </p>
            </div>
          </div>

          <!-- Resolution Section -->
          <div class="resolution-section">
            <h3 class="section-title">How to resolve this issue:</h3>
            <ol class="resolution-steps">
              <li class="resolution-step">
                <span class="step-number">1</span>
                <span class="step-text">Cancel this upload using the "Stop Upload" button below</span>
              </li>
              <li class="resolution-step">
                <span class="step-number">2</span>
                <span class="step-text">In your cloud service (OneDrive, Dropbox, Google Drive, etc.), 
                set folders to "Always keep on this device"</span>
              </li>
              <li class="resolution-step">
                <span class="step-number">3</span>
                <span class="step-text">Wait for all files to download locally (this may take several minutes)</span>
              </li>
              <li class="resolution-step">
                <span class="step-number">4</span>
                <span class="step-text">Try uploading again once files are stored locally</span>
              </li>
            </ol>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <button
            ref="stopButton"
            type="button"
            class="action-button action-button-danger"
            @click="handleStopUpload"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd" />
            </svg>
            Stop Upload
          </button>
          <button
            ref="continueButton"
            type="button"
            class="action-button action-button-secondary"
            @click="handleContinueWaiting"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
            </svg>
            Wait 1 More Minute
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  formattedElapsedTime: {
    type: String,
    default: '0s'
  },
  estimatedDuration: {
    type: Number,
    default: 0
  },
  overdueSeconds: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['stop-upload', 'continue-waiting', 'close'])

// Template refs
const modalContent = ref(null)
const closeButton = ref(null)
const stopButton = ref(null)
const continueButton = ref(null)

// Computed properties
const headerId = computed(() => `modal-title-${Math.random().toString(36).substr(2, 9)}`)
const descriptionId = computed(() => `modal-description-${Math.random().toString(36).substr(2, 9)}`)
const closeButtonLabel = computed(() => 'Close dialog')

const formattedEstimate = computed(() => {
  const duration = props.estimatedDuration
  if (!duration || isNaN(duration) || duration <= 0) return '0s'
  
  const seconds = Math.round(duration / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${seconds}s`
})

// Focus management
const focusableElements = computed(() => {
  if (!modalContent.value) return []
  
  return [
    closeButton.value,
    stopButton.value,
    continueButton.value
  ].filter(el => el && !el.disabled)
})

const trapFocus = (event) => {
  if (!props.isVisible || focusableElements.value.length === 0) return
  
  const firstElement = focusableElements.value[0]
  const lastElement = focusableElements.value[focusableElements.value.length - 1]
  
  if (event.key === 'Tab') {
    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }
}

// Event handlers
const handleOverlayClick = () => {
  // Don't close on overlay click for warning modals - force user decision
}

const handleEscapeKey = () => {
  handleCloseClick()
}

const handleCloseClick = () => {
  emit('close')
}

const handleStopUpload = () => {
  emit('stop-upload')
}

const handleContinueWaiting = () => {
  emit('continue-waiting')
}

// Watch for visibility changes
watch(() => props.isVisible, async (newValue) => {
  if (newValue) {
    await nextTick()
    
    if (stopButton.value) {
      stopButton.value.focus()
    }
    
    document.addEventListener('keydown', trapFocus)
    document.body.style.overflow = 'hidden'
  } else {
    document.removeEventListener('keydown', trapFocus)
    document.body.style.overflow = ''
  }
})

// Lifecycle
onMounted(async () => {
  if (props.isVisible) {
    await nextTick()
    
    // Set focus to the first interactive element (Stop Upload button for urgency)
    if (stopButton.value) {
      stopButton.value.focus()
    }
    
    // Add focus trap
    document.addEventListener('keydown', trapFocus)
    
    // Prevent background scroll
    document.body.style.overflow = 'hidden'
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', trapFocus)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50;
  backdrop-filter: blur(2px);
}

.modal-content {
  @apply bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto;
  outline: none;
}

.modal-header {
  @apply flex items-center justify-between p-6 border-b border-gray-200;
}

.warning-icon {
  @apply flex-shrink-0;
}

.modal-title {
  @apply text-lg font-semibold text-gray-900;
}

.close-button {
  @apply text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded p-1 transition-colors;
}

.modal-body {
  @apply p-6 space-y-6;
}

.status-section {
  @apply bg-gray-50 rounded-lg p-4 space-y-2;
}

.status-item {
  @apply flex justify-between items-center;
}

.status-label {
  @apply text-sm font-medium text-gray-700;
}

.status-value {
  @apply text-sm text-gray-900;
}

.explanation-section,
.detection-section,
.resolution-section {
  @apply space-y-3;
}

.section-title {
  @apply text-base font-semibold text-gray-900;
}

.explanation-content,
.detection-content {
  @apply space-y-2;
}

.explanation-text,
.detection-text {
  @apply text-sm text-gray-700 leading-relaxed;
}

.resolution-steps {
  @apply space-y-3 list-none;
  counter-reset: step;
}

.resolution-step {
  @apply flex items-start space-x-3 text-sm text-gray-700;
}

.step-number {
  @apply flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-xs font-semibold rounded-full flex items-center justify-center;
}

.step-text {
  @apply pt-0.5 leading-relaxed;
}

.modal-actions {
  @apply flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50;
}

.action-button {
  @apply inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors;
}

.action-button-danger {
  @apply bg-red-600 text-white hover:bg-red-700 focus:ring-red-500;
}

.action-button-secondary {
  @apply bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .modal-content {
    @apply max-w-full mx-2 my-4 max-h-[95vh];
  }
  
  .modal-actions {
    @apply flex-col space-x-0 space-y-2;
  }
  
  .action-button {
    @apply w-full justify-center;
  }
}
</style>