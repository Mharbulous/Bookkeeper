<template>
  <v-chip
    :color="displayColor"
    :variant="chipVariant"
    size="small"
    class="ai-tag-chip"
    :class="{
      'ai-tag-chip--suggested': tag.status === 'suggested',
      'ai-tag-chip--approved': tag.status === 'approved',
      'ai-tag-chip--rejected': tag.status === 'rejected'
    }"
  >
    <!-- AI indicator icon -->
    <v-icon
      v-if="showAIIcon"
      size="14"
      class="ai-icon"
      :class="{ 'mr-1': true }"
    >
      {{ aiIcon }}
    </v-icon>
    
    <!-- Tag name -->
    {{ tag.tagName }}
    
    <!-- Status indicator for suggested tags -->
    <v-icon
      v-if="tag.status === 'suggested' && showStatusActions"
      size="16"
      class="ml-1 status-icon"
    >
      mdi-clock-outline
    </v-icon>
    
    <!-- Approval indicator for approved tags -->
    <v-icon
      v-if="tag.status === 'approved'"
      size="14"
      class="ml-1 status-icon"
      color="success"
    >
      mdi-check-circle
    </v-icon>

    <!-- Tooltip with AI information -->
    <v-tooltip activator="parent" location="top">
      <div class="ai-tag-tooltip">
        <div class="tooltip-header">
          <v-icon size="16" class="mr-1">mdi-robot</v-icon>
          AI Suggested Tag
        </div>
        <div class="tooltip-content">
          <div><strong>Category:</strong> {{ tag.categoryName }}</div>
          <div v-if="tag.confidence">
            <strong>Confidence:</strong> {{ Math.round(tag.confidence * 100) }}%
          </div>
          <div v-if="tag.reasoning">
            <strong>Reasoning:</strong> {{ tag.reasoning }}
          </div>
          <div v-if="tag.suggestedAt">
            <strong>Suggested:</strong> {{ formatDate(tag.suggestedAt) }}
          </div>
          <div class="tooltip-status">
            <strong>Status:</strong> {{ statusText }}
          </div>
        </div>
      </div>
    </v-tooltip>
  </v-chip>
</template>

<script setup>
import { computed } from 'vue';

// Props
const props = defineProps({
  tag: {
    type: Object,
    required: true,
    validator: (tag) => {
      return tag.tagName && 
             tag.categoryName && 
             tag.status && 
             ['suggested', 'approved', 'rejected'].includes(tag.status);
    }
  },
  showAIIcon: {
    type: Boolean,
    default: true
  },
  showStatusActions: {
    type: Boolean,
    default: true
  },
  variant: {
    type: String,
    default: 'tonal', // tonal, outlined, flat
    validator: (value) => ['tonal', 'outlined', 'flat'].includes(value)
  }
});

// Computed properties
const displayColor = computed(() => {
  switch (props.tag.status) {
    case 'suggested':
      return 'orange-lighten-1';
    case 'approved':
      return props.tag.color || 'primary';
    case 'rejected':
      return 'grey-lighten-1';
    default:
      return 'grey';
  }
});

const chipVariant = computed(() => {
  // Override variant based on status
  if (props.tag.status === 'suggested') {
    return 'tonal';
  } else if (props.tag.status === 'rejected') {
    return 'outlined';
  }
  return props.variant;
});

const aiIcon = computed(() => {
  switch (props.tag.status) {
    case 'suggested':
      return 'mdi-robot-outline';
    case 'approved':
      return 'mdi-robot-happy';
    case 'rejected':
      return 'mdi-robot-off';
    default:
      return 'mdi-robot';
  }
});

const statusText = computed(() => {
  switch (props.tag.status) {
    case 'suggested':
      return 'Awaiting Review';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Unknown';
  }
});

// Helper functions
const formatDate = (date) => {
  if (!date) return '';
  
  const dateObj = date instanceof Date ? date : 
                  date.toDate ? date.toDate() : 
                  new Date(date);
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(dateObj);
};
</script>

<style scoped>
.ai-tag-chip {
  position: relative;
  font-weight: 500;
  transition: all 0.2s ease-in-out;
}

.ai-tag-chip--suggested {
  border: 1px solid rgba(255, 152, 0, 0.3);
  box-shadow: 0 1px 3px rgba(255, 152, 0, 0.1);
}

.ai-tag-chip--approved {
  border: 1px solid rgba(76, 175, 80, 0.2);
}

.ai-tag-chip--rejected {
  opacity: 0.6;
  text-decoration: line-through;
}

.ai-tag-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.ai-icon {
  opacity: 0.8;
}

.status-icon {
  opacity: 0.7;
}

.ai-tag-tooltip {
  max-width: 280px;
}

.tooltip-header {
  display: flex;
  align-items: center;
  font-weight: 600;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.tooltip-content > div {
  margin-bottom: 4px;
  font-size: 0.875rem;
}

.tooltip-status {
  margin-top: 8px;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  font-weight: 500;
}

/* Visual distinction animations */
@keyframes pulse-ai {
  0% { 
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.4); 
  }
  70% { 
    box-shadow: 0 0 0 4px rgba(255, 152, 0, 0); 
  }
  100% { 
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0); 
  }
}

.ai-tag-chip--suggested:hover {
  animation: pulse-ai 1.5s infinite;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .ai-tag-chip {
    font-size: 0.75rem;
  }
  
  .ai-icon,
  .status-icon {
    width: 12px !important;
    height: 12px !important;
  }
  
  .ai-tag-tooltip {
    max-width: 240px;
    font-size: 0.8rem;
  }
}
</style>