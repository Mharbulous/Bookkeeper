<template>
  <div class="percentage-config-form">
    <h3 class="text-h6 mb-4">Percentage Category Configuration</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Configure display options and validation for percentage inputs (0-100%).
    </p>

    <v-row>
      <!-- Input Method -->
      <v-col cols="12" md="6">
        <v-select
          v-model="localConfig.inputMethod"
          label="Input Method"
          :items="inputMethodOptions"
          variant="outlined"
          density="compact"
        />
      </v-col>

      <!-- Display Format -->
      <v-col cols="12" md="6">
        <v-select
          v-model="localConfig.displayFormat"
          label="Display Format"
          :items="displayFormatOptions"
          variant="outlined"
          density="compact"
        />
      </v-col>
    </v-row>

    <v-row>
      <!-- Decimal Precision -->
      <v-col cols="12" md="4">
        <v-select
          v-model="localConfig.decimalPlaces"
          label="Decimal Places"
          :items="decimalPlaceOptions"
          variant="outlined"
          density="compact"
        />
      </v-col>

      <!-- Default Value -->
      <v-col cols="12" md="4">
        <v-text-field
          v-model.number="localConfig.defaultValue"
          label="Default Value (%)"
          type="number"
          variant="outlined"
          density="compact"
          :min="0"
          :max="100"
          :step="getStepValue()"
          placeholder="Leave blank"
          clearable
          suffix="%"
        />
      </v-col>

      <!-- Step Size -->
      <v-col cols="12" md="4">
        <v-text-field
          v-model.number="localConfig.step"
          label="Step Size (%)"
          type="number"
          variant="outlined"
          density="compact"
          :min="getStepValue()"
          :max="25"
          :step="getStepValue()"
          placeholder="Auto"
          suffix="%"
        />
      </v-col>
    </v-row>

    <!-- Range Options -->
    <div class="range-options mt-4">
      <h4 class="text-subtitle-1 mb-3">Range Options</h4>
      <v-row>
        <v-col cols="12" md="6">
          <v-checkbox
            v-model="localConfig.allowZero"
            label="Allow 0%"
            color="pink"
            density="compact"
          />
        </v-col>

        <v-col cols="12" md="6">
          <v-checkbox
            v-model="localConfig.allowHundred"
            label="Allow 100%"
            color="pink"
            density="compact"
          />
        </v-col>
      </v-row>

      <v-row v-if="localConfig.inputMethod === 'slider'">
        <v-col cols="12">
          <v-checkbox
            v-model="localConfig.showTicks"
            label="Show slider tick marks"
            color="pink"
            density="compact"
            hint="Display marks at major intervals"
            persistent-hint
          />
        </v-col>
      </v-row>
    </div>

    <!-- Preview -->
    <v-card variant="tonal" color="pink" class="mt-4">
      <v-card-text class="py-3">
        <div class="d-flex align-center mb-3">
          <v-icon color="pink" class="mr-2">mdi-eye</v-icon>
          <div class="text-body-2">
            <strong>Preview:</strong> {{ localConfig.inputMethod === 'slider' ? 'Slider' : 'Number Input' }} • 
            {{ localConfig.decimalPlaces }} decimals • Step: {{ localConfig.step || getStepValue() }}%
          </div>
        </div>

        <!-- Preview Input -->
        <div class="preview-input">
          <v-slider
            v-if="localConfig.inputMethod === 'slider'"
            :model-value="localConfig.defaultValue || 50"
            :min="localConfig.allowZero ? 0 : getStepValue()"
            :max="localConfig.allowHundred ? 100 : 100 - getStepValue()"
            :step="localConfig.step || getStepValue()"
            :show-ticks="localConfig.showTicks"
            thumb-label="always"
            color="pink"
            readonly
            class="preview-slider"
          >
            <template #thumb-label="{ modelValue }">
              {{ formatPercentage(modelValue) }}
            </template>
          </v-slider>

          <v-text-field
            v-else
            :model-value="localConfig.defaultValue || ''"
            type="number"
            variant="outlined"
            density="compact"
            :min="localConfig.allowZero ? 0 : getStepValue()"
            :max="localConfig.allowHundred ? 100 : 100 - getStepValue()"
            :step="localConfig.step || getStepValue()"
            suffix="%"
            readonly
            class="preview-input-field"
          />
        </div>
      </v-card-text>
    </v-card>

    <!-- Usage Examples -->
    <v-alert
      type="info"
      variant="tonal"
      class="mt-4"
    >
      <v-icon start>mdi-information</v-icon>
      <strong>Use cases:</strong> Tax rates, completion percentages, discounts, confidence scores, allocation ratios.
      <br>
      <strong>Examples:</strong> 
      <span v-if="localConfig.decimalPlaces === 0">25%, 50%, 100%</span>
      <span v-else-if="localConfig.decimalPlaces === 1">25.5%, 67.8%, 99.9%</span>
      <span v-else>25.75%, 67.89%, 99.95%</span>
    </v-alert>
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