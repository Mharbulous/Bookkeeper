<template>
  <div v-if="shouldShowPrompt" class="migration-prompt mt-3">
    <v-alert
      type="info"
      variant="tonal"
      closable
      @click:close="handleHidePrompt"
    >
      <template #title>Migrate Legacy Tags</template>
      You have {{ legacyTagCount }} legacy tags. 
      <v-btn
        size="small"
        variant="text"
        color="primary"
        class="ml-2"
        :disabled="disabled || loading"
        @click="handleMigrate"
      >
        Organize into Categories
      </v-btn>
    </v-alert>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  legacyTagCount: {
    type: Number,
    default: 0
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  hidePrompt: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['migrate-legacy', 'hide-prompt']);

// Local state
const internalHidePrompt = ref(props.hidePrompt);

// Computed properties
const shouldShowPrompt = computed(() => {
  return props.legacyTagCount > 0 && !internalHidePrompt.value;
});

// Watch for external hidePrompt changes
watch(() => props.hidePrompt, (newValue) => {
  internalHidePrompt.value = newValue;
});

// Methods
const handleHidePrompt = () => {
  internalHidePrompt.value = true;
  emit('hide-prompt');
};

const handleMigrate = () => {
  emit('migrate-legacy');
};

// Expose methods for parent component control
defineExpose({
  showPrompt: () => {
    internalHidePrompt.value = false;
  },
  hidePrompt: () => {
    internalHidePrompt.value = true;
  }
});
</script>

<style scoped>
.migration-prompt {
  border-left: 4px solid #2196f3;
  padding-left: 12px;
}
</style>