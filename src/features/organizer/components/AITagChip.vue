<template>
  <v-chip
    :color="displayColor"
    :variant="chipVariant"
    size="small"
    class="ai-tag-chip"
    :class="{
      'ai-tag-chip--suggested': getTagStatus() === 'suggested',
      'ai-tag-chip--approved': getTagStatus() === 'approved',
      'ai-tag-chip--rejected': getTagStatus() === 'rejected'
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
      v-if="getTagStatus() === 'suggested' && showStatusActions"
      size="16"
      class="ml-1 status-icon"
    >
      mdi-clock-outline
    </v-icon>
    
    <!-- Approval indicator for approved tags -->
    <v-icon
      v-if="getTagStatus() === 'approved'"
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
          <div v-if="getConfidence()">
            <strong>Confidence:</strong> {{ getConfidence() }}%
            <span v-if="isAutoApproved()" class="auto-approved-badge">(Auto-approved)</span>
          </div>
          <div v-if="tag.reasoning">
            <strong>Reasoning:</strong> {{ tag.reasoning }}
          </div>
          <div v-if="getCreatedAt()">
            <strong>Suggested:</strong> {{ formatDate(getCreatedAt()) }}
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
             tag.categoryName;
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
  const status = getTagStatus();
  const confidence = getConfidence();
  
  switch (status) {
    case 'suggested':
      // Color intensity based on confidence level
      if (confidence >= 90) return 'orange-darken-1';
      if (confidence >= 70) return 'orange-lighten-1';
      return 'orange-lighten-2';
    case 'approved':
      return isAutoApproved() ? 'green-lighten-1' : (props.tag.color || 'primary');
    case 'rejected':
      return 'grey-lighten-1';
    default:
      return 'grey';
  }
});

const chipVariant = computed(() => {
  const status = getTagStatus();
  // Override variant based on status
  if (status === 'suggested') {
    return 'tonal';
  } else if (status === 'rejected') {
    return 'outlined';
  }
  return props.variant;
});

const aiIcon = computed(() => {
  const status = getTagStatus();
  const confidence = getConfidence();
  
  switch (status) {
    case 'suggested':
      // Different icons based on confidence
      if (confidence >= 85) return 'mdi-robot-excited';
      if (confidence >= 70) return 'mdi-robot-outline';
      return 'mdi-robot-confused';
    case 'approved':
      return isAutoApproved() ? 'mdi-robot-industrial' : 'mdi-robot-happy';
    case 'rejected':
      return 'mdi-robot-off';
    default:
      return 'mdi-robot';
  }
});

const statusText = computed(() => {
  const status = getTagStatus();
  switch (status) {
    case 'pending':
      return 'Awaiting Review';
    case 'suggested':
      return 'Awaiting Review'; // Legacy compatibility
    case 'approved':
      return isAutoApproved() ? 'Auto-approved' : 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Unknown';
  }
});

/**
 * Get tag status from subcollection format (new) or embedded format (legacy)
 */
const getTagStatus = () => {
  // Subcollection format - direct status property
  if (props.tag.status) {
    // Map 'pending' to 'suggested' for UI compatibility
    return props.tag.status === 'pending' ? 'suggested' : props.tag.status;
  }
  
  // Legacy embedded format - metadata.status
  if (props.tag.metadata?.status) {
    return props.tag.metadata.status;
  }
  
  // Check if it's a human tag that was approved from AI (legacy)
  if (props.tag.source === 'human' && props.tag.metadata?.originallyFromAI) {
    return 'approved';
  }
  
  // Default for AI tags without explicit status
  if (props.tag.source === 'ai') {
    return 'suggested';
  }
  
  return 'unknown';
};

/**
 * Get confidence score from either format
 */
const getConfidence = () => {
  // Direct confidence property (subcollection format)
  if (typeof props.tag.confidence === 'number') {
    return Math.round(props.tag.confidence);
  }
  
  // Legacy format with decimal confidence
  if (props.tag.confidence && props.tag.confidence <= 1) {
    return Math.round(props.tag.confidence * 100);
  }
  
  return null;
};

/**
 * Check if tag was auto-approved based on confidence
 */
const isAutoApproved = () => {
  return props.tag.autoApproved === true;
};

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

/**
 * Get creation date from either embedded format or subcollection format
 */
const getCreatedAt = () => {
  // Check subcollection format (createdAt)
  if (props.tag.createdAt) {
    return props.tag.createdAt;
  }
  
  // Check embedded format (suggestedAt)
  if (props.tag.suggestedAt) {
    return props.tag.suggestedAt;
  }
  
  return null;
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

.auto-approved-badge {
  font-size: 0.75em;
  font-weight: 600;
  color: rgba(76, 175, 80, 0.9);
  margin-left: 4px;
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