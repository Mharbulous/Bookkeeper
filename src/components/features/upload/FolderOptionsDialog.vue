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
                <div class="font-weight-medium mb-2">Folder only</div>
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
                    Contains <strong>{{ formatNumber(mainFolderAnalysis.totalFiles) }}</strong> files totalling 
                    <strong>{{ mainFolderAnalysis.totalSizeMB }}</strong> MB and less than 
                    <strong>{{ mainFolderAnalysis.estimatedDuplicationPercent }}%</strong> duplication.
                  </template>
                </div>
              </div>
            </template>
          </v-radio>
          
          <v-radio
            :value="true"
            color="primary"
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
                    Contains <strong>{{ formatNumber(allFilesAnalysis.totalFiles) }}</strong> files totalling 
                    <strong>{{ allFilesAnalysis.totalSizeMB }}</strong> MB and less than 
                    <strong>{{ allFilesAnalysis.estimatedDuplicationPercent }}%</strong> duplication.
                  </template>
                </div>
              </div>
            </template>
          </v-radio>
        </v-radio-group>
      </v-card-text>
      
      <v-card-actions class="px-6 py-4">
        <!-- Time Estimate Display -->
        <div v-if="!isAnalyzing && getSelectedAnalysis()" class="text-h6 font-weight-medium text-primary">
          Time estimate: {{ formatTime(getSelectedAnalysis().estimatedTimeSeconds) }}
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
          @click="$emit('confirm')"
        >
          Continue
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { formatDuration } from '../../../utils/fileAnalysis.js'

defineProps({
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
  }
})

defineEmits(['confirm', 'cancel', 'update:includeSubfolders', 'update:show'])

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
const getSelectedAnalysis = () => {
  if (props.includeSubfolders) {
    return props.allFilesAnalysis
  } else {
    return props.mainFolderAnalysis
  }
}
</script>