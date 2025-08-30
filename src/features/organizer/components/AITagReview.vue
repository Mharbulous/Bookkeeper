<template>
  <v-dialog
    v-model="showDialog"
    max-width="600px"
    persistent
    class="ai-tag-review-dialog"
  >
    <v-card>
      <!-- Dialog Header -->
      <v-card-title class="dialog-header">
        <div class="header-content">
          <v-icon color="primary" size="24" class="mr-3">
            mdi-robot-happy
          </v-icon>
          <div>
            <h3 class="text-h6 mb-1">AI Tag Suggestions</h3>
            <p class="text-body-2 text-medium-emphasis mb-0">
              Review AI-generated tags for: <strong>{{ fileName }}</strong>
            </p>
          </div>
        </div>
        <v-btn
          icon
          variant="text"
          size="small"
          @click="handleClose"
          :disabled="processing"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <!-- Dialog Content -->
      <v-card-text class="dialog-content">
        <!-- Loading state -->
        <div v-if="loading" class="loading-state">
          <v-progress-circular indeterminate color="primary" class="mb-4" />
          <p class="text-body-2 text-center">Loading AI suggestions...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="error-state">
          <v-icon color="error" size="48" class="mb-4">mdi-alert-circle</v-icon>
          <h4 class="text-h6 text-error mb-2">Failed to Load Suggestions</h4>
          <p class="text-body-2 mb-4">{{ error }}</p>
          <v-btn color="primary" @click="retryLoad">
            <v-icon left>mdi-refresh</v-icon>
            Retry
          </v-btn>
        </div>

        <!-- No suggestions state -->
        <div v-else-if="!aiTags.length" class="empty-state">
          <v-icon color="info" size="48" class="mb-4">mdi-robot-outline</v-icon>
          <h4 class="text-h6 mb-2">No AI Suggestions</h4>
          <p class="text-body-2 text-medium-emphasis">
            The AI didn't generate any tag suggestions for this document.
            This might happen if the document content doesn't clearly match your existing categories.
          </p>
        </div>

        <!-- AI Suggestions List -->
        <div v-else class="suggestions-list">
          <p class="text-body-2 text-medium-emphasis mb-4">
            Review each suggestion and choose to approve or reject it:
          </p>

          <v-list class="suggestion-list">
            <v-list-item
              v-for="(tag, index) in aiTags"
              :key="`${tag.categoryId}-${tag.tagName}`"
              class="suggestion-item"
              :class="{ 
                'suggestion-item--approved': isApproved(tag),
                'suggestion-item--rejected': isRejected(tag)
              }"
            >
              <!-- Tag display -->
              <template #prepend>
                <div class="tag-preview">
                  <AITagChip 
                    :tag="tag" 
                    :show-status-actions="false"
                    class="mr-3"
                  />
                </div>
              </template>

              <!-- Tag details -->
              <v-list-item-title class="suggestion-title">
                {{ tag.tagName }}
              </v-list-item-title>
              <v-list-item-subtitle class="suggestion-details">
                <div class="details-row">
                  <span><strong>Category:</strong> {{ tag.categoryName }}</span>
                  <span v-if="tag.confidence" class="ml-4">
                    <strong>Confidence:</strong> {{ Math.round(tag.confidence * 100) }}%
                  </span>
                </div>
                <div v-if="tag.reasoning" class="reasoning">
                  <strong>AI Reasoning:</strong> {{ tag.reasoning }}
                </div>
              </v-list-item-subtitle>

              <!-- Action buttons -->
              <template #append>
                <div class="suggestion-actions">
                  <v-btn
                    icon
                    variant="text"
                    color="success"
                    size="small"
                    :loading="processing && processingTag === tag"
                    :disabled="processing || isApproved(tag)"
                    @click="approveTag(tag)"
                  >
                    <v-icon>mdi-check-circle</v-icon>
                    <v-tooltip activator="parent">Approve Tag</v-tooltip>
                  </v-btn>
                  <v-btn
                    icon
                    variant="text"
                    color="error"
                    size="small"
                    :loading="processing && processingTag === tag"
                    :disabled="processing || isRejected(tag)"
                    @click="rejectTag(tag)"
                  >
                    <v-icon>mdi-close-circle</v-icon>
                    <v-tooltip activator="parent">Reject Tag</v-tooltip>
                  </v-btn>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-card-text>

      <!-- Dialog Actions -->
      <v-card-actions class="dialog-actions">
        <div class="actions-summary">
          <span class="text-body-2 text-medium-emphasis">
            {{ approvedCount }} approved, {{ rejectedCount }} rejected
          </span>
        </div>
        
        <v-spacer />
        
        <v-btn
          variant="text"
          @click="handleClose"
          :disabled="processing"
        >
          Cancel
        </v-btn>
        
        <v-btn
          v-if="aiTags.length > 1"
          variant="outlined"
          color="error"
          @click="rejectAll"
          :disabled="processing || rejectedCount === aiTags.length"
        >
          Reject All
        </v-btn>
        
        <v-btn
          v-if="aiTags.length > 1"
          variant="outlined"
          color="success"
          @click="approveAll"
          :disabled="processing || approvedCount === aiTags.length"
        >
          Approve All
        </v-btn>
        
        <v-btn
          color="primary"
          variant="elevated"
          @click="handleSave"
          :disabled="processing || (!approvedCount && !rejectedCount)"
          :loading="processing"
        >
          Apply Changes
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import AITagChip from './AITagChip.vue';

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  evidence: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
});

// Emits
const emit = defineEmits([
  'update:modelValue',
  'approve-tag',
  'reject-tag',
  'approve-all',
  'reject-all',
  'save-changes',
  'retry-load',
  'close'
]);

// State
const processing = ref(false);
const processingTag = ref(null);
const tagStates = ref(new Map()); // Track individual tag approve/reject states

// Computed
const showDialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const fileName = computed(() => {
  return props.evidence?.displayName || 'Unknown file';
});

const aiTags = computed(() => {
  return props.evidence?.tagsByAI?.filter(tag => tag.status === 'suggested') || [];
});

const approvedCount = computed(() => {
  return Array.from(tagStates.value.values()).filter(state => state === 'approved').length;
});

const rejectedCount = computed(() => {
  return Array.from(tagStates.value.values()).filter(state => state === 'rejected').length;
});

// Methods
const getTagKey = (tag) => `${tag.categoryId}-${tag.tagName}`;

const isApproved = (tag) => {
  return tagStates.value.get(getTagKey(tag)) === 'approved';
};

const isRejected = (tag) => {
  return tagStates.value.get(getTagKey(tag)) === 'rejected';
};

const approveTag = async (tag) => {
  try {
    processing.value = true;
    processingTag.value = tag;
    
    tagStates.value.set(getTagKey(tag), 'approved');
    emit('approve-tag', tag);
  } catch (error) {
    console.error('Failed to approve tag:', error);
    tagStates.value.delete(getTagKey(tag));
  } finally {
    processing.value = false;
    processingTag.value = null;
  }
};

const rejectTag = async (tag) => {
  try {
    processing.value = true;
    processingTag.value = tag;
    
    tagStates.value.set(getTagKey(tag), 'rejected');
    emit('reject-tag', tag);
  } catch (error) {
    console.error('Failed to reject tag:', error);
    tagStates.value.delete(getTagKey(tag));
  } finally {
    processing.value = false;
    processingTag.value = null;
  }
};

const approveAll = () => {
  aiTags.value.forEach(tag => {
    tagStates.value.set(getTagKey(tag), 'approved');
  });
  emit('approve-all', aiTags.value);
};

const rejectAll = () => {
  aiTags.value.forEach(tag => {
    tagStates.value.set(getTagKey(tag), 'rejected');
  });
  emit('reject-all', aiTags.value);
};

const handleSave = () => {
  const changes = {
    approved: [],
    rejected: []
  };

  aiTags.value.forEach(tag => {
    const state = tagStates.value.get(getTagKey(tag));
    if (state === 'approved') {
      changes.approved.push(tag);
    } else if (state === 'rejected') {
      changes.rejected.push(tag);
    }
  });

  emit('save-changes', changes);
};

const handleClose = () => {
  emit('close');
  showDialog.value = false;
};

const retryLoad = () => {
  emit('retry-load');
};

// Reset tag states when evidence changes
watch(() => props.evidence?.id, () => {
  tagStates.value.clear();
});
</script>

<style scoped>
.ai-tag-review-dialog .v-card {
  overflow: hidden;
}

.dialog-header {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-primary-darken-1)) 100%);
  color: white;
  padding: 20px 24px;
}

.header-content {
  display: flex;
  align-items: flex-start;
  flex: 1;
}

.dialog-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 24px;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 20px;
}

.suggestions-list {
  padding: 0;
}

.suggestion-list {
  background: transparent;
}

.suggestion-item {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  margin-bottom: 16px;
  padding: 16px;
  transition: all 0.2s ease-in-out;
}

.suggestion-item:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  background: rgba(var(--v-theme-primary), 0.02);
}

.suggestion-item--approved {
  border-color: rgb(var(--v-theme-success));
  background: rgba(var(--v-theme-success), 0.05);
}

.suggestion-item--rejected {
  border-color: rgb(var(--v-theme-error));
  background: rgba(var(--v-theme-error), 0.05);
  opacity: 0.7;
}

.tag-preview {
  display: flex;
  align-items: center;
}

.suggestion-title {
  font-weight: 600;
  font-size: 1rem;
}

.suggestion-details {
  margin-top: 8px;
}

.details-row {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.reasoning {
  font-style: italic;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin-top: 8px;
  padding: 8px;
  background: rgba(var(--v-theme-surface), 0.5);
  border-radius: 4px;
  border-left: 3px solid rgb(var(--v-theme-primary));
}

.suggestion-actions {
  display: flex;
  gap: 4px;
}

.dialog-actions {
  padding: 16px 24px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgba(var(--v-theme-surface), 0.5);
}

.actions-summary {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .suggestion-item {
    padding: 12px;
  }
  
  .details-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .details-row span:not(:first-child) {
    margin-left: 0;
    margin-top: 4px;
  }
}
</style>