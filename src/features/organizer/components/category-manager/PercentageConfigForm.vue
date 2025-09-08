<template>
  <div class="percentage-config-form">
    <h3 class="text-h6 mb-4">Percentage Category Configuration</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Percentage inputs will use sensible defaults (0-100% with slider input).
    </p>

    <p class="text-caption text-medium-emphasis">
      No configuration needed. Percentages will default to 0-100% range with slider input.
    </p>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      inputMethod: 'slider',
      displayFormat: 'percentage',
      decimalPlaces: 1,
      defaultValue: null,
      step: null,
      allowZero: true,
      allowHundred: true,
      showTicks: false
    })
  }
});

const emit = defineEmits(['update:modelValue']);

// Local reactive config
const localConfig = ref({
  inputMethod: 'slider',
  displayFormat: 'percentage',
  decimalPlaces: 1,
  defaultValue: null,
  step: null,
  allowZero: true,
  allowHundred: true,
  showTicks: false,
  ...props.modelValue
});

// Options
const inputMethodOptions = [
  { title: 'Slider (visual)', value: 'slider' },
  { title: 'Number Input', value: 'number' },
  { title: 'Both (slider + input)', value: 'both' }
];

const displayFormatOptions = [
  { title: 'Percentage (50%)', value: 'percentage' },
  { title: 'Decimal (0.50)', value: 'decimal' },
  { title: 'Fraction (1/2)', value: 'fraction' }
];

const decimalPlaceOptions = [
  { title: 'Whole numbers (25%)', value: 0 },
  { title: '1 decimal (25.5%)', value: 1 },
  { title: '2 decimals (25.75%)', value: 2 },
  { title: '3 decimals (25.750%)', value: 3 }
];

// Helper methods
const getStepValue = () => {
  return Math.pow(10, -localConfig.value.decimalPlaces);
};

const formatPercentage = (value) => {
  return `${value.toFixed(localConfig.value.decimalPlaces)}%`;
};

// Auto-update step when decimal places change
watch(() => localConfig.value.decimalPlaces, (newPlaces) => {
  if (!localConfig.value.step) {
    // Auto-calculate reasonable step size
    switch (newPlaces) {
      case 0: localConfig.value.step = 5; break;
      case 1: localConfig.value.step = 0.5; break;
      case 2: localConfig.value.step = 0.25; break;
      default: localConfig.value.step = Math.pow(10, -newPlaces);
    }
  }
});

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
.percentage-config-form {
  width: 100%;
}

.range-options {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 16px;
}

.preview-input {
  max-width: 400px;
}

.preview-slider {
  pointer-events: none;
}

.preview-input-field {
  pointer-events: none;
  opacity: 0.8;
}

.preview-input-field :deep(.v-field) {
  background-color: rgba(var(--v-theme-surface), 0.3);
}
</style>