<template>
  <div class="inline-progress-container" v-if="props.isVisible">
    <!-- Compact Progress Bar -->
    <div class="progress-bar-wrapper">
      <!-- Progress Bar and Right Info -->
      <div class="progress-row">
        <div class="progress-track">
          <div
            class="progress-fill"
            :class="progressBarClass"
            :style="{ width: `${displayProgress}%` }"
          ></div>

          <!-- Overdue indicator overlay -->
          <div v-if="props.isOverdue && displayProgress >= 100" class="overdue-overlay"></div>
        </div>

        <!-- Right side info -->
        <div class="right-info">
          <span class="progress-text">{{ displayProgress }}%</span>
          <span class="elapsed-text" :class="{ overdue: props.isOverdue }">
            elapsed: {{ props.formattedElapsedTime }}
          </span>
        </div>
      </div>

      <!-- Bottom estimated time -->
      <div class="bottom-info">
        <span class="estimated-text">estimated: {{ formattedEstimate }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false,
  },
  elapsedTime: {
    type: Number,
    default: 0,
  },
  progressPercentage: {
    type: Number,
    default: 0,
  },
  isOverdue: {
    type: Boolean,
    default: false,
  },
  overdueSeconds: {
    type: Number,
    default: 0,
  },
  timeRemaining: {
    type: Number,
    default: 0,
  },
  formattedElapsedTime: {
    type: String,
    default: '0s',
  },
  formattedTimeRemaining: {
    type: String,
    default: '0s',
  },
  estimatedDuration: {
    type: Number,
    default: 0,
  },
});

// Computed properties
const formattedEstimate = computed(() => {
  const estimatedSeconds = Math.round(props.estimatedDuration / 1000);

  if (!estimatedSeconds || estimatedSeconds <= 0) return '0s';

  const minutes = Math.floor(estimatedSeconds / 60);
  const remainingSeconds = estimatedSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${estimatedSeconds}s`;
});

// Computed properties
const displayProgress = computed(() => {
  // Ensure progress doesn't go below 0 or above 100
  const progress = props.progressPercentage;
  if (isNaN(progress) || progress === null || progress === undefined) return 0;
  return Math.min(Math.max(progress, 0), 100);
});

const progressBarClass = computed(() => {
  if (props.isOverdue) {
    return 'bg-gradient-to-r from-red-400 to-red-500';
  } else if (displayProgress.value >= 90) {
    return 'bg-gradient-to-r from-yellow-400 to-yellow-500';
  } else if (displayProgress.value >= 50) {
    return 'bg-gradient-to-r from-blue-400 to-blue-500';
  } else {
    return 'bg-gradient-to-r from-green-400 to-green-500';
  }
});
</script>

<style scoped>
.inline-progress-container {
  display: inline-flex;
  align-items: center;
  margin-left: 16px;
}

.progress-bar-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-track {
  position: relative;
  width: 100px;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition:
    width 1s ease-out,
    background-color 0.3s ease;
}

.overdue-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to right,
    transparent,
    rgba(248, 113, 113, 0.2),
    rgba(248, 113, 113, 0.4)
  );
  border-radius: 4px;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.right-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  white-space: nowrap;
}

.bottom-info {
  margin-left: 110px; /* Align with the right side of progress bar */
  font-size: 10px;
}

.progress-text {
  font-weight: 600;
  color: #374151;
}

.elapsed-text {
  color: #6b7280;
  white-space: nowrap;
}

.elapsed-text.overdue {
  color: #dc2626;
  font-weight: 600;
}

.estimated-text {
  color: #9ca3af;
  font-style: italic;
}

/* Progress bar colors */
.bg-gradient-to-r.from-red-400.to-red-500 {
  background: linear-gradient(to right, #f87171, #ef4444);
}

.bg-gradient-to-r.from-yellow-400.to-yellow-500 {
  background: linear-gradient(to right, #fbbf24, #f59e0b);
}

.bg-gradient-to-r.from-blue-400.to-blue-500 {
  background: linear-gradient(to right, #60a5fa, #3b82f6);
}

.bg-gradient-to-r.from-green-400.to-green-500 {
  background: linear-gradient(to right, #4ade80, #22c55e);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>