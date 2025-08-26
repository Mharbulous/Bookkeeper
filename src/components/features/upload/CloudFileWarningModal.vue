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
              Cloud storage detected.
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
          <div class="message-content">
            <p class="main-message">
              Your files might be stored in the cloud and downloading slowly.
            </p>
            
            <p class="solution-message">
              <strong>Solution:</strong> In your cloud service (OneDrive, Dropbox, Google Drive), 
              set folders to "Always keep on this device" and wait for files to download locally.
            </p>
            
            <p class="action-message">
              You can continue waiting or click "Clear All" to cancel and try again later.
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <ClearAllButton
            ref="clearButton"
            @click="handleClearAll"
          />
          <button
            ref="continueButton"
            type="button"
            class="action-button action-button-secondary"
            @click="handleContinueWaiting"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
            </svg>
            Continue Waiting
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import ClearAllButton from '../../base/ClearAllButton.vue'

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

const emit = defineEmits(['clear-all', 'continue-waiting', 'close'])

// Template refs
const modalContent = ref(null)
const closeButton = ref(null)
const clearButton = ref(null)
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

const handleClearAll = () => {
  emit('clear-all')
}

const handleContinueWaiting = () => {
  emit('continue-waiting')
}

// Watch for visibility changes
watch(() => props.isVisible, async (newValue) => {
  if (newValue) {
    await nextTick()
    
    // Focus management - focus on modal content instead of Vuetify component
    if (modalContent.value) {
      modalContent.value.focus()
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
    
    // Set focus to modal content for accessibility
    if (modalContent.value) {
      modalContent.value.focus()
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
  @apply bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto;
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
  @apply p-6;
}

.message-content {
  @apply space-y-4;
}

.main-message {
  @apply text-base text-gray-700 leading-relaxed;
}

.solution-message {
  @apply text-sm text-gray-600 leading-relaxed bg-blue-50 p-3 rounded-lg;
}

.action-message {
  @apply text-sm text-gray-600 leading-relaxed;
}

.modal-actions {
  @apply flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50;
}

.action-button {
  @apply inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors;
}


.action-button-secondary {
  @apply bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .modal-content {
    @apply max-w-full mx-4 my-8 max-h-[90vh];
  }
  
  .modal-actions {
    @apply flex-col space-x-0 space-y-2;
  }
  
  .action-button {
    @apply w-full justify-center;
  }
}
</style>