<template>
  <v-dialog :model-value="show" @update:model-value="$emit('update:show', $event)" max-width="650">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-folder-open" class="me-2" />
        Folder Upload Options
      </v-card-title>
      
      <v-card-text>
        <v-radio-group :model-value="includeSubfolders" @update:model-value="$emit('update:includeSubfolders', $event)">
          <v-radio
            :value="false"
            color="primary"
            class="mb-4"
          >
            <template #label>
              <div class="w-100">
                <div class="font-weight-medium mb-2">This folder only</div>
                <div class="text-body-2 text-grey-darken-1">
                  <template v-if="isAnalyzing || !mainFolderAnalysis">
                    <v-progress-circular
                      indeterminate
                      size="16"
                      width="2"
                      class="me-2"
                    />
                    Analyzing files...
                  </template>
                  <template v-else>
                    <strong>{{ formatNumber(mainFolderAnalysis.totalFiles) }}</strong> files in this folder totalling 
                    <strong>{{ mainFolderAnalysis.totalSizeMB }}</strong>MB 
                    (<strong>{{ mainFolderAnalysis.duplicateCandidatesSizeMB }}</strong>MB possible duplicates).
                  </template>
                </div>
              </div>
            </template>
          </v-radio>
          
          <v-radio
            :value="true"
            color="primary"
            :disabled="!allFilesComplete"
          >
            <template #label>
              <div class="w-100">
                <div class="font-weight-medium mb-2">Include subfolders</div>
                <div class="text-body-2 text-grey-darken-1">
                  <template v-if="isAnalyzing || !allFilesAnalysis">
                    <v-progress-circular
                      indeterminate
                      size="16"
                      width="2"
                      class="me-2"
                    />
                    Analyzing files...
                  </template>
                  <template v-else>
                    <strong>{{ formatNumber(allFilesAnalysis.totalFiles) }}</strong> files in 
                    <strong>{{ formatNumber(allFilesAnalysis.totalDirectoryCount) }}</strong> folders totalling 
                    <strong>{{ allFilesAnalysis.totalSizeMB }}</strong>MB 
                    (<strong>{{ allFilesAnalysis.duplicateCandidatesSizeMB }}</strong>MB possible duplicates).
                  </template>
                </div>
              </div>
            </template>
          </v-radio>
        </v-radio-group>
      </v-card-text>
      
      <v-card-actions class="px-6 py-4">
        <!-- Time Estimate Display -->
        <div v-if="!isAnalyzing && getSelectedAnalysis" class="text-h6 font-weight-medium text-primary">
          Time estimate: {{ formatTime(getSelectedAnalysis.calibratedTimeSeconds) }}
        </div>
        <div v-else-if="isAnalyzing" class="d-flex align-center">
          <v-progress-circular
            indeterminate
            size="20"
            width="2"
            color="primary"
            class="me-2"
          />
          <span class="text-body-1 text-grey-darken-1">Calculating estimate...</span>
        </div>
        
        <v-spacer />
        
        <v-btn
          variant="text"
          size="large"
          @click="$emit('cancel')"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          size="large"
          :disabled="!canContinue"
          @click="$emit('confirm')"
        >
          <v-progress-circular
            v-if="!canContinue"
            indeterminate
            size="20"
            width="2"
          />
          <span v-if="canContinue">Continue</span>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, watch, ref } from 'vue'
import { formatDuration } from '../../../utils/fileAnalysis.js'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  subfolderCount: {
    type: Number,
    required: true
  },
  includeSubfolders: {
    type: Boolean,
    required: true
  },
  isAnalyzing: {
    type: Boolean,
    default: false
  },
  mainFolderAnalysis: {
    type: Object,
    default: null
  },
  allFilesAnalysis: {
    type: Object,
    default: null
  },
  mainFolderComplete: {
    type: Boolean,
    default: false
  },
  allFilesComplete: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['confirm', 'cancel', 'update:includeSubfolders', 'update:show'])

// Track post-switch delay period
const isInPostSwitchDelay = ref(false)

// Formatting helpers
const formatNumber = (num) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

const formatTime = (seconds) => {
  return formatDuration(seconds)
}

// Get analysis data for currently selected option
const getSelectedAnalysis = computed(() => {
  if (props.includeSubfolders) {
    return props.allFilesAnalysis
  } else {
    return props.mainFolderAnalysis
  }
})

// Determine when Continue button should be enabled
const canContinue = computed(() => {
  // If we're in post-switch delay, disable the button
  if (isInPostSwitchDelay.value) {
    return false
  }
  
  if (props.includeSubfolders) {
    return props.allFilesComplete && props.allFilesAnalysis
  } else {
    return props.mainFolderComplete && props.mainFolderAnalysis
  }
})

// Handle includeSubfolders updates with validation
const updateIncludeSubfolders = (value) => {
  // Only allow switching to "Include subfolders" if analysis is complete
  if (value === true && !props.allFilesComplete) {
    return // Ignore the change
  }
  emit('update:includeSubfolders', value)
}

// Auto-switch to "Include subfolders" when analysis completes
watch(() => props.allFilesComplete, async (newValue) => {
  if (newValue && !props.includeSubfolders) {
    // Switch radio button immediately
    emit('update:includeSubfolders', true)
    
    // Set post-switch delay for Continue button
    isInPostSwitchDelay.value = true
    
    // Enable Continue button after 1 second delay
    setTimeout(() => {
      isInPostSwitchDelay.value = false
    }, 1000)
  }
})
</script>