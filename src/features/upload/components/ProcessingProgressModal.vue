<template>
  <v-dialog
    v-model="dialogVisible"
    max-width="600"
    persistent
    :close-on-content-click="false"
    :close-on-back="false"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between" :class="titleBackgroundClass">
        <div class="d-flex align-center">
          <v-icon :icon="titleIcon" class="me-2" />
          {{ titleText }}
        </div>

        <v-btn
          v-if="canCancel"
          icon="mdi-close"
          variant="text"
          size="small"
          color="white"
          @click="$emit('cancel')"
        />
      </v-card-title>

      <v-card-text class="pa-6" v-if="!error">
        <!-- Processing Mode Display -->
        <div class="mb-4" v-if="processingMode">
          <div class="d-flex align-center mb-2">
            <v-icon
              :icon="processingMode === 'worker' ? 'mdi-web' : 'mdi-cpu-64-bit'"
              :color="processingMode === 'worker' ? 'green' : 'orange'"
              class="me-2"
              size="small"
            />
            <span
              class="text-body-2"
              :class="processingMode === 'worker' ? 'text-green-darken-2' : 'text-orange-darken-2'"
            >
              {{ processingModeText }}
            </span>
          </div>
        </div>

        <!-- Simple Progress Bar -->
        <div class="mb-4">
          <div class="d-flex justify-space-between align-center mb-3">
            <span class="text-subtitle-1">{{ progressStatusText }}</span>
            <span class="text-body-2 text-grey-darken-1">
              {{ progress.current }} / {{ progress.total }}
            </span>
          </div>

          <v-progress-linear
            :model-value="progress.percentage"
            height="8"
            :color="progressColor"
            :bg-color="progressBgColor"
            rounded
            :indeterminate="isIndeterminate"
          />

          <div class="text-center mt-3">
            <span class="text-h6 font-weight-bold">{{ progress.percentage }}%</span>
          </div>

          <!-- Current file being processed -->
          <div v-if="progress.currentFile" class="text-center mt-2">
            <span class="text-body-2 text-grey-darken-1 text-truncate d-block">
              Processing: {{ progress.currentFile }}
            </span>
          </div>

          <!-- Estimated time remaining -->
          <div
            v-if="progress.estimatedTimeRemaining && progress.percentage > 10"
            class="text-center mt-1"
          >
            <span class="text-caption text-grey-darken-1">
              Estimated time remaining: {{ formatTime(progress.estimatedTimeRemaining) }}
            </span>
          </div>
        </div>
      </v-card-text>

      <!-- Error State -->
      <v-card-text v-if="error" class="pa-6">
        <div class="d-flex align-start mb-4" :class="errorSeverityClass">
          <v-icon :icon="errorIcon" class="me-3 mt-1" size="large" />
          <div class="flex-grow-1">
            <div class="text-h6 font-weight-medium mb-2">{{ errorTitle }}</div>
            <div class="text-body-1 mb-3">{{ error.message }}</div>

            <!-- Error details for debugging -->
            <v-expansion-panels
              v-if="error.details || error.stack"
              variant="accordion"
              class="mb-3"
            >
              <v-expansion-panel>
                <v-expansion-panel-title class="text-body-2 pa-3">
                  <v-icon icon="mdi-information-outline" class="me-2" size="small" />
                  Technical Details
                </v-expansion-panel-title>
                <v-expansion-panel-text class="pa-3">
                  <div v-if="error.details" class="mb-2">
                    <strong>Details:</strong> {{ error.details }}
                  </div>
                  <div
                    v-if="error.stack"
                    class="text-caption font-mono bg-grey-lighten-4 pa-2 rounded"
                  >
                    {{ error.stack }}
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>

            <!-- Suggested actions -->
            <div v-if="errorSuggestions.length > 0" class="mt-3">
              <div class="text-subtitle-2 mb-2">Suggested Actions:</div>
              <ul class="text-body-2">
                <li v-for="suggestion in errorSuggestions" :key="suggestion" class="mb-1">
                  {{ suggestion }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </v-card-text>

      <!-- Actions (when error occurs) -->
      <v-card-actions v-if="error" class="px-6 pb-6">
        <v-btn
          v-if="canUseMainThread"
          variant="outlined"
          color="orange"
          @click="$emit('fallback')"
          prepend-icon="mdi-cpu-64-bit"
        >
          Use Fallback Mode
        </v-btn>

        <v-spacer />

        <v-btn variant="outlined" @click="$emit('cancel')"> Cancel </v-btn>

        <v-btn
          color="primary"
          variant="elevated"
          @click="$emit('retry')"
          :disabled="retryCount >= maxRetries"
          prepend-icon="mdi-refresh"
        >
          {{
            retryCount >= maxRetries
              ? 'Max Retries Reached'
              : `Retry ${retryCount > 0 ? `(${retryCount}/${maxRetries})` : ''}`
          }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue';

// Component configuration
defineOptions({
  name: 'ProcessingProgressModal',
});

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  progress: {
    type: Object,
    default: () => ({
      current: 0,
      total: 0,
      percentage: 0,
      currentFile: '',
      estimatedTimeRemaining: null,
    }),
  },
  error: {
    type: Object,
    default: null,
  },
  canCancel: {
    type: Boolean,
    default: true,
  },
  processingMode: {
    type: String,
    default: null,
    validator: (value) => value === null || ['worker', 'fallback'].includes(value),
  },
  retryCount: {
    type: Number,
    default: 0,
  },
  maxRetries: {
    type: Number,
    default: 3,
  },
  canUseMainThread: {
    type: Boolean,
    default: true,
  },
});

// Emits
const emit = defineEmits(['update:modelValue', 'cancel', 'retry', 'fallback']);

// Computed properties
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const isIndeterminate = computed(() => {
  return props.progress.total === 0 || props.progress.percentage === 0;
});

const titleIcon = computed(() => {
  if (props.error) {
    return props.error.severity === 'critical' ? 'mdi-alert-circle' : 'mdi-alert';
  }
  return 'mdi-cog-clockwise';
});

const titleText = computed(() => {
  if (props.error) {
    return 'Processing Failed';
  }
  return 'Processing Files';
});

const titleBackgroundClass = computed(() => {
  if (props.error) {
    return 'bg-red text-white';
  }
  return 'bg-purple text-white';
});

const progressStatusText = computed(() => {
  if (props.processingMode === 'fallback') {
    return 'Processing files (fallback mode)...';
  }
  return 'Processing files...';
});

const processingModeText = computed(() => {
  switch (props.processingMode) {
    case 'worker':
      return 'Using Web Worker (optimal performance)';
    case 'fallback':
      return 'Using main thread (fallback mode)';
    default:
      return '';
  }
});

const progressColor = computed(() => {
  if (props.processingMode === 'fallback') {
    return 'orange';
  }
  return 'purple';
});

const progressBgColor = computed(() => {
  if (props.processingMode === 'fallback') {
    return 'orange-lighten-4';
  }
  return 'purple-lighten-4';
});

const errorIcon = computed(() => {
  if (!props.error) return 'mdi-alert-circle';

  switch (props.error.type) {
    case 'timeout':
      return 'mdi-clock-alert';
    case 'worker-error':
      return 'mdi-web-off';
    case 'memory-error':
      return 'mdi-memory';
    case 'validation-error':
      return 'mdi-file-alert';
    case 'network-error':
      return 'mdi-network-off';
    default:
      return 'mdi-alert-circle';
  }
});

const errorTitle = computed(() => {
  if (!props.error) return 'Error';

  switch (props.error.type) {
    case 'timeout':
      return 'Processing Timeout';
    case 'worker-error':
      return 'Web Worker Error';
    case 'memory-error':
      return 'Memory Error';
    case 'validation-error':
      return 'File Validation Error';
    case 'network-error':
      return 'Network Error';
    default:
      return 'Processing Error';
  }
});

const errorSeverityClass = computed(() => {
  if (!props.error) return '';

  switch (props.error.severity) {
    case 'critical':
      return 'text-red-darken-2';
    case 'warning':
      return 'text-orange-darken-2';
    default:
      return 'text-red-darken-1';
  }
});

const errorSuggestions = computed(() => {
  if (!props.error) return [];

  switch (props.error.type) {
    case 'timeout':
      return [
        'Try processing fewer files at once',
        'Check your system performance',
        'Use fallback mode for large file sets',
      ];
    case 'worker-error':
      return [
        'Try using fallback mode',
        'Restart your browser if the problem persists',
        'Check for browser compatibility issues',
      ];
    case 'memory-error':
      return [
        'Process fewer files at once',
        'Close other browser tabs',
        'Use fallback mode for better memory management',
      ];
    case 'validation-error':
      return [
        'Check that all selected items are valid files',
        'Remove any corrupted or inaccessible files',
        'Try selecting files individually',
      ];
    default:
      return [
        'Try using fallback mode',
        'Check your internet connection',
        'Contact support if the problem persists',
      ];
  }
});

// Helper functions
const formatTime = (milliseconds) => {
  if (!milliseconds) return '';

  const seconds = Math.ceil(milliseconds / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
};
</script>

<style scoped>
/* Custom styling for the progress modal */
.v-card-title {
  font-size: 1.1rem;
  font-weight: 600;
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Ensure consistent spacing */
.v-row.dense > .v-col {
  padding: 4px;
}

/* Progress bar styling */
.v-progress-linear {
  border-radius: 4px;
}
</style>