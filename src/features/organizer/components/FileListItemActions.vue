<template>
  <div v-if="showActions" class="file-actions">
    <!-- AI Processing Button (if enabled) -->
    <button
      v-if="isAIEnabled && !readonly"
      class="action-btn"
      :class="{ disabled: actionLoading || aiProcessing, processing: aiProcessing }"
      :disabled="actionLoading || aiProcessing"
      :title="'Process with AI'"
      @click.stop="handleProcessWithAI"
    >
      <span class="action-icon">🤖</span>
      <span v-if="aiProcessing" class="processing-spinner">⟳</span>
    </button>
    
  </div>
</template>

<script setup>
import { computed } from 'vue';

// Debug logging helper
const debugLog = (message, data = null) => {
  const timestamp = new Date().toISOString().substring(11, 23);
  console.log(`[${timestamp}] [FileListItemActions] ${message}`, data || '');
};

// Performance tracking
const renderStart = performance.now();
let setupComplete = null;
let beforeMountTime = null;

// Props
const props = defineProps({
  // Evidence/file data for actions
  evidence: {
    type: Object,
    required: true,
  },
  
  // Display options
  readonly: {
    type: Boolean,
    default: false,
  },
  showActions: {
    type: Boolean,
    default: true,
  },
  
  // Loading states
  actionLoading: {
    type: Boolean,
    default: false,
  },
  aiProcessing: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits([
  'process-with-ai',
]);

// Check if AI features are enabled
const isAIEnabled = computed(() => {
  return import.meta.env.VITE_ENABLE_AI_FEATURES === 'true';
});


// Event handlers
const handleProcessWithAI = () => {
  emit('process-with-ai', props.evidence);
};



// Performance tracking - mark setup completion
setupComplete = performance.now();

</script>

<style scoped>
.file-actions {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

/* Custom action buttons - much lighter than Vuetify v-btn */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  padding: 0;
}

.action-btn:hover:not(.disabled) {
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.action-btn:active:not(.disabled) {
  background: rgba(var(--v-theme-on-surface), 0.12);
  transform: scale(0.95);
}

.action-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-icon {
  font-size: 16px;
  line-height: 1;
}

.processing-spinner {
  position: absolute;
  font-size: 12px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}


/* Responsive design */
@media (max-width: 768px) {
  .file-actions {
    align-self: stretch;
    justify-content: flex-end;
  }
}
</style>