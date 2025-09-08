<template>
  <div class="textarea-config-form">
    <h3 class="text-h6 mb-4">Textarea Category Configuration</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Set an optional character limit for multi-line text inputs.
    </p>

    <!-- Character Limit -->
    <v-text-field
      v-model.number="localConfig.maxLength"
      label="Character Limit (optional)"
      type="number"
      variant="outlined"
      density="compact"
      :min="1"
      :max="10000"
      placeholder="No limit"
      clearable
      class="mb-4"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      maxLength: null,
      rows: 3,
      placeholder: '',
      required: false,
      autoGrow: true,
      spellCheck: true,
      wordWrap: true,
      trimWhitespace: true,
      normalizeLineBreaks: true
    })
  }
});

const emit = defineEmits(['update:modelValue']);

// Local reactive config
const localConfig = ref({
  maxLength: null,
  rows: 3,
  placeholder: '',
  required: false,
  autoGrow: true,
  spellCheck: true,
  wordWrap: true,
  trimWhitespace: true,
  normalizeLineBreaks: true,
  ...props.modelValue
});

// Options
const rowOptions = [
  { title: '2 rows (compact)', value: 2 },
  { title: '3 rows (default)', value: 3 },
  { title: '4 rows (comfortable)', value: 4 },
  { title: '5 rows (spacious)', value: 5 },
  { title: '8 rows (large)', value: 8 },
  { title: '12 rows (extra large)', value: 12 }
];

// Watch for changes and emit
watch(localConfig, (newConfig) => {
  emit('update:modelValue', { ...newConfig });
}, { deep: true });

// Initialize with props
watch(() => props.modelValue, (newValue) => {
  localConfig.value = { ...localConfig.value, ...newValue };
}, { immediate: true });
</script>

<style scoped>
.textarea-config-form {
  width: 100%;
}

.text-processing {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 16px;
}

.preview-textarea {
  pointer-events: none;
  opacity: 0.8;
}

.preview-textarea :deep(.v-field) {
  background-color: rgba(var(--v-theme-surface), 0.3);
}
</style>