<template>
  <v-card class="upload-summary-card" variant="outlined">
    <v-card-title class="d-flex align-center">
      <v-icon :icon="getHeaderIcon()" :color="getHeaderColor()" size="28" class="me-3" />
      <div>
        <h3 class="text-h6">{{ getTitle() }}</h3>
        <div class="text-body-2 text-grey-darken-1">
          {{ getSubtitle() }}
        </div>
      </div>

      <v-spacer />

      <v-chip :color="getStatusColor()" :variant="hasErrors ? 'flat' : 'elevated'" size="small">
        {{ getStatusText() }}
      </v-chip>
    </v-card-title>

    <v-divider />

    <v-card-text class="pa-4">
      <!-- Summary Stats -->
      <v-row class="mb-4">
        <v-col cols="6" md="3">
          <div class="text-center">
            <div class="text-h5 text-success">{{ results.successful.length }}</div>
            <div class="text-caption text-grey-darken-1">Successful</div>
          </div>
        </v-col>

        <v-col cols="6" md="3">
          <div class="text-center">
            <div class="text-h5 text-info">{{ results.skipped.length }}</div>
            <div class="text-caption text-grey-darken-1">Skipped</div>
          </div>
        </v-col>

        <v-col cols="6" md="3">
          <div class="text-center">
            <div class="text-h5 text-error">{{ results.failed.length }}</div>
            <div class="text-caption text-grey-darken-1">Failed</div>
          </div>
        </v-col>

        <v-col cols="6" md="3">
          <div class="text-center">
            <div class="text-h5 text-primary">{{ totalFiles }}</div>
            <div class="text-caption text-grey-darken-1">Total</div>
          </div>
        </v-col>
      </v-row>

      <!-- Upload Metrics -->
      <v-row class="mb-4">
        <v-col cols="12" sm="6">
          <v-card variant="tonal" color="blue" class="pa-3">
            <div class="d-flex align-center">
              <v-icon icon="mdi-upload" color="blue" class="me-2" />
              <div>
                <div class="text-body-1 font-weight-medium">
                  {{ formatBytes(totalBytesUploaded) }}
                </div>
                <div class="text-caption">Data Uploaded</div>
              </div>
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6">
          <v-card variant="tonal" color="green" class="pa-3">
            <div class="d-flex align-center">
              <v-icon icon="mdi-clock-outline" color="green" class="me-2" />
              <div>
                <div class="text-body-1 font-weight-medium">{{ formattedDuration }}</div>
                <div class="text-caption">Total Time</div>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Quick Actions -->
      <div class="d-flex gap-2 justify-center">
        <v-btn
          v-if="hasErrors"
          @click="$emit('retry-failed')"
          variant="outlined"
          color="warning"
          prepend-icon="mdi-refresh"
        >
          Retry Failed
        </v-btn>

        <v-btn
          @click="$emit('view-details')"
          variant="outlined"
          color="primary"
          prepend-icon="mdi-table"
        >
          View Details
        </v-btn>

        <v-btn
          @click="$emit('clear-queue')"
          variant="outlined"
          color="secondary"
          prepend-icon="mdi-broom"
        >
          Clear Queue
        </v-btn>
      </div>
    </v-card-text>

    <!-- Error Summary (if there are errors) -->
    <template v-if="hasErrors">
      <v-divider />
      <v-card-text class="pa-4 bg-error-lighten-5">
        <h4 class="text-subtitle-1 mb-3 text-error">Upload Issues</h4>

        <div class="d-flex flex-wrap gap-2">
          <v-chip
            v-for="(count, errorType) in errorCounts"
            :key="errorType"
            size="small"
            color="error"
            variant="outlined"
          >
            {{ errorType }}: {{ count }}
          </v-chip>
        </div>

        <div class="mt-3">
          <v-alert type="info" variant="tonal" density="compact" class="text-body-2">
            Review failed uploads and retry those that can be recovered. Some errors may require
            manual intervention.
          </v-alert>
        </div>
      </v-card-text>
    </template>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';

// Component props
const props = defineProps({
  results: {
    type: Object,
    required: true,
    default: () => ({
      successful: [],
      failed: [],
      skipped: [],
    }),
  },
  uploadMetrics: {
    type: Object,
    default: () => ({
      totalBytesTransferred: 0,
      averageSpeed: 0,
    }),
  },
  duration: {
    type: Number, // in milliseconds
    default: 0,
  },
});

// Emits
defineEmits(['retry-failed', 'view-details', 'clear-queue']);

// Computed properties
const totalFiles = computed(
  () => props.results.successful.length + props.results.failed.length + props.results.skipped.length
);

const hasErrors = computed(() => props.results.failed.length > 0);

const totalBytesUploaded = computed(() => {
  // Calculate from successful uploads
  let totalBytes = 0;

  props.results.successful.forEach(({ fileInfo }) => {
    if (fileInfo && fileInfo.file) {
      totalBytes += fileInfo.file.size || 0;
    }
  });

  return totalBytes;
});

const formattedDuration = computed(() => {
  const seconds = props.duration / 1000;

  if (seconds < 60) {
    return `${Math.ceil(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.ceil(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
});

const errorCounts = computed(() => {
  const counts = {};

  props.results.failed.forEach(({ error }) => {
    const errorType = error?.classified?.type || 'unknown';
    const displayType = errorType
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
    counts[displayType] = (counts[displayType] || 0) + 1;
  });

  return counts;
});

// UI helpers
const getHeaderIcon = () => {
  if (hasErrors.value) {
    return 'mdi-check-circle-outline';
  } else {
    return 'mdi-check-circle';
  }
};

const getHeaderColor = () => {
  if (hasErrors.value) {
    return 'orange';
  } else {
    return 'success';
  }
};

const getTitle = () => {
  if (hasErrors.value) {
    return 'Upload Complete with Issues';
  } else {
    return 'Upload Complete';
  }
};

const getSubtitle = () => {
  const successful = props.results.successful.length + props.results.skipped.length;

  if (hasErrors.value) {
    return `${successful} of ${totalFiles.value} files uploaded successfully`;
  } else {
    return `All ${totalFiles.value} files processed successfully`;
  }
};

const getStatusColor = () => {
  if (hasErrors.value) {
    return 'orange';
  } else {
    return 'success';
  }
};

const getStatusText = () => {
  if (hasErrors.value) {
    return `${props.results.failed.length} Failed`;
  } else {
    return 'Success';
  }
};

// Utility functions
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
</script>

<style scoped>
.upload-summary-card {
  max-width: 600px;
  margin: 0 auto;
}

.gap-2 {
  gap: 8px;
}

/* Smooth transitions for interactive elements */
.v-btn,
.v-chip {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.v-card {
  transition: box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.v-card:hover {
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.12),
    0 2px 4px rgba(0, 0, 0, 0.08) !important;
}
</style>