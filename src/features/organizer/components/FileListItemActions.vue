<template>
  <div v-if="showActions" class="file-actions">
    <!-- AI Processing Button (if enabled) -->
    <v-btn
      v-if="isAIEnabled && !readonly"
      icon
      variant="text"
      size="small"
      :disabled="actionLoading || aiProcessing"
      :loading="aiProcessing"
      @click.stop="handleProcessWithAI"
    >
      <v-icon>mdi-robot</v-icon>
      <v-tooltip activator="parent">Process with AI</v-tooltip>
    </v-btn>
    
    <v-btn
      icon
      variant="text"
      size="small"
      :disabled="actionLoading"
      @click.stop="handleDownload"
    >
      <v-icon>mdi-download</v-icon>
      <v-tooltip activator="parent">Download</v-tooltip>
    </v-btn>
    <v-menu>
      <template #activator="{ props }">
        <v-btn
          icon
          variant="text"
          size="small"
          :disabled="actionLoading"
          v-bind="props"
          @click.stop
        >
          <v-icon>mdi-dots-vertical</v-icon>
        </v-btn>
      </template>
      <v-list>
        <v-list-item @click="handleRename">
          <template #prepend>
            <v-icon>mdi-pencil</v-icon>
          </template>
          <v-list-item-title>Rename</v-list-item-title>
        </v-list-item>
        <v-list-item @click="handleViewDetails">
          <template #prepend>
            <v-icon>mdi-information</v-icon>
          </template>
          <v-list-item-title>Details</v-list-item-title>
        </v-list-item>
        <v-divider />
        <v-list-item
          v-if="!readonly"
          @click="handleDelete"
          class="text-error"
        >
          <template #prepend>
            <v-icon color="error">mdi-delete</v-icon>
          </template>
          <v-list-item-title>Delete</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script setup>
import { computed } from 'vue';

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
  'download',
  'rename',
  'view-details',
  'delete',
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

const handleDownload = () => {
  emit('download', props.evidence);
};

const handleRename = () => {
  emit('rename', props.evidence);
};

const handleViewDetails = () => {
  emit('view-details', props.evidence);
};

const handleDelete = () => {
  emit('delete', props.evidence);
};
</script>

<style scoped>
.file-actions {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

/* Responsive design */
@media (max-width: 768px) {
  .file-actions {
    align-self: stretch;
    justify-content: flex-end;
  }
}
</style>