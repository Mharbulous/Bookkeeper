<template>
  <v-card
    variant="outlined"
    class="file-list-item"
    :class="{ 'file-list-item--selected': selected }"
    @click="handleClick"
  >
    <v-card-text class="pa-4">
      <div class="file-item-content">
        <!-- File info section -->
        <FileListItemContent
          :evidence="evidence"
          :show-processing-stage="showProcessingStage"
        />

        <!-- Tags section - conditionally lazy loaded -->
        <div 
          v-if="!enableProgressiveLoading || tagsVisible"
          :key="`tags-${evidence.id}`"
          :class="enableProgressiveLoading ? 'tags-section' : ''"
        >
          <FileListItemTags
            :evidence="evidence"
            :readonly="readonly"
            :tag-update-loading="tagUpdateLoading"
            :tag-input-placeholder="tagInputPlaceholder"
            :allow-manual-editing="allowManualEditing"
            @tags-updated="handleTagsUpdated"
            @migrate-legacy="handleMigrateLegacy"
            @tag-error="handleTagError"
          />
        </div>
        <div 
          v-else-if="enableProgressiveLoading"
          class="tags-placeholder"
          @click.stop="loadTags"
        >
          <span class="placeholder-text">Tags loading...</span>
        </div>

        <!-- Actions section - conditionally lazy loaded on hover -->
        <div 
          v-if="!enableProgressiveLoading || actionsVisible"
          :key="`actions-${evidence.id}`"
          :class="enableProgressiveLoading ? 'actions-section' : ''"
        >
          <FileListItemActions
            :evidence="evidence"
            :readonly="readonly"
            :show-actions="showActions"
            :action-loading="actionLoading"
            :ai-processing="aiProcessing"
            @download="handleDownload"
            @rename="handleRename"
            @view-details="handleViewDetails"
            @delete="handleDelete"
            @process-with-ai="handleProcessWithAI"
          />
        </div>
        <div 
          v-else-if="enableProgressiveLoading"
          class="actions-placeholder"
          @mouseenter="loadActions"
          @click.stop="loadActions"
        >
          <span class="placeholder-text">⋯</span>
        </div>
      </div>
    </v-card-text>

    <!-- Selection indicator -->
    <div v-if="selectable" class="selection-indicator">
      <v-checkbox
        :model-value="selected"
        hide-details
        @click.stop
        @update:model-value="handleSelectionChange"
      />
    </div>
  </v-card>
</template>

<script setup>
import { computed, onMounted, ref, nextTick } from 'vue';
import FileListItemContent from './FileListItemContent.vue';
import FileListItemTags from './FileListItemTags.vue';
import FileListItemActions from './FileListItemActions.vue';

// Debug logging helper
const debugLog = (message, data = null) => {
  const timestamp = new Date().toISOString().substring(11, 23);
  console.log(`[${timestamp}] [FileListItem] ${message}`, data || '');
};

// Track render timing
const renderStart = performance.now();

// Props
const props = defineProps({
  // Evidence/file data
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
  showProcessingStage: {
    type: Boolean,
    default: false,
  },
  selectable: {
    type: Boolean,
    default: false,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  
  // Loading states
  tagUpdateLoading: {
    type: Boolean,
    default: false,
  },
  actionLoading: {
    type: Boolean,
    default: false,
  },
  aiProcessing: {
    type: Boolean,
    default: false,
  },
  
  // Customization
  tagInputPlaceholder: {
    type: String,
    default: 'Add tags...',
  },
  
  // Control manual editing capabilities
  allowManualEditing: {
    type: Boolean,
    default: true,
  },
  
  // Performance optimization flags
  enableProgressiveLoading: {
    type: Boolean,
    default: true,
  },
});

// Emits
const emit = defineEmits([
  'tags-updated',
  'tag-error',
  'migrate-legacy',
  'click',
  'download',
  'rename',
  'view-details',
  'delete',
  'selection-change',
  'process-with-ai',
]);

// Progressive/lazy loading state
const tagsVisible = ref(false);
const actionsVisible = ref(false);
const loadingPhase = ref(1); // 1: content only, 2: + tags, 3: + actions

// Progressive loading methods
const loadTags = async () => {
  if (tagsVisible.value) return;
  
  tagsVisible.value = true;
  loadingPhase.value = 2;
  
  await nextTick();
  // Performance tracking disabled - optimization complete
};

const loadActions = async () => {
  if (actionsVisible.value) return;
  
  actionsVisible.value = true;
  loadingPhase.value = 3;
  
  await nextTick();
  // Individual item logging disabled - using loop-level timing instead
};

// Auto-load tags after a short delay for better UX
const autoLoadTags = () => {
  if (!props.enableProgressiveLoading) return;
  
  setTimeout(() => {
    if (!tagsVisible.value) {
      loadTags();
    }
  }, 100); // 100ms delay to prioritize content rendering
};

// Auto-load everything after longer delay as fallback
const autoLoadAll = () => {
  if (!props.enableProgressiveLoading) return;
  
  setTimeout(() => {
    if (!tagsVisible.value) loadTags();
    if (!actionsVisible.value) loadActions();
  }, 500); // 500ms fallback
};

// Computed properties - simplified since FileListItemContent handles file details

// Event handlers
const handleClick = () => {
  emit('click', props.evidence);
};

const handleTagsUpdated = () => {
  emit('tags-updated');
};

const handleMigrateLegacy = (evidenceId) => {
  emit('migrate-legacy', evidenceId);
};

const handleTagError = (error) => {
  emit('tag-error', error);
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

const handleSelectionChange = (selected) => {
  emit('selection-change', props.evidence.id, selected);
};

const handleProcessWithAI = () => {
  console.log('DEBUG: handleProcessWithAI called with evidence:', props.evidence.id);
  emit('process-with-ai', props.evidence);
};

// Track component mount performance
onMounted(() => {
  // Performance tracking disabled - optimization complete
  
  // Start progressive loading after content is mounted
  autoLoadTags();
  autoLoadAll();
});
</script>

<style scoped>
.file-list-item {
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  position: relative;
}

.file-list-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.file-list-item--selected {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.2);
}

.file-item-content {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

/* Progressive loading placeholders */
.tags-placeholder,
.actions-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  opacity: 0.6;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.tags-placeholder:hover,
.actions-placeholder:hover {
  opacity: 0.8;
}

.placeholder-text {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-style: italic;
}

.actions-placeholder .placeholder-text {
  font-size: 16px;
  font-weight: bold;
}

/* Progressive loading sections */
.tags-section,
.actions-section {
  opacity: 0;
  animation: fadeIn 0.2s ease-in-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.selection-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
}

/* Responsive design */
@media (max-width: 768px) {
  .file-item-content {
    flex-direction: column;
    gap: 16px;
  }
}

/* Compact mode */
.file-list-item.compact .file-item-content {
  gap: 12px;
}
</style>