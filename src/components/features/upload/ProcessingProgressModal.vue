<template>
  <v-dialog
    v-model="modelValue"
    max-width="600"
    persistent
    :close-on-content-click="false"
    :close-on-back="false"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between bg-purple text-white">
        <div class="d-flex align-center">
          <v-icon icon="mdi-cog-clockwise" class="me-2" />
          Processing Files
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

      <v-card-text class="pa-6">
        <!-- Simple Progress Bar -->
        <div class="mb-4">
          <div class="d-flex justify-space-between align-center mb-3">
            <span class="text-subtitle-1">Processing Files...</span>
            <span class="text-body-2 text-grey-darken-1">
              {{ progress.current }} / {{ progress.total }}
            </span>
          </div>
          
          <v-progress-linear
            :model-value="progress.percentage"
            height="8"
            color="purple"
            bg-color="purple-lighten-4"
            rounded
          />
          
          <div class="text-center mt-3">
            <span class="text-h6 font-weight-bold">{{ progress.percentage }}%</span>
          </div>
        </div>
      </v-card-text>

      <!-- Error State -->
      <v-card-text v-if="error" class="pa-4 bg-red-lighten-5">
        <div class="d-flex align-center text-red-darken-2">
          <v-icon icon="mdi-alert-circle" class="me-2" />
          <div>
            <div class="font-weight-medium">Processing Error</div>
            <div class="text-body-2 mt-1">{{ error.message }}</div>
          </div>
        </div>
      </v-card-text>

      <!-- Actions (when error occurs) -->
      <v-card-actions v-if="error" class="px-6 pb-6">
        <v-spacer />
        <v-btn
          variant="outlined"
          @click="$emit('cancel')"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          @click="$emit('retry')"
        >
          Retry
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'

// Component configuration
defineOptions({
  name: 'ProcessingProgressModal'
})

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  progress: {
    type: Object,
    default: () => ({
      current: 0,
      total: 0,
      percentage: 0
    })
  },
  error: {
    type: Object,
    default: null
  },
  canCancel: {
    type: Boolean,
    default: true
  }
})

// Emits
defineEmits(['update:modelValue', 'cancel', 'retry'])

// No additional methods needed for simplified modal
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