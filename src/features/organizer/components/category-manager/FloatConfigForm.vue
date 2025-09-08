<template>
  <div class="float-config-form">
    <h3 class="text-h6 mb-4">Float Category Configuration</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Configure validation rules and precision settings for decimal number inputs.
    </p>

    <v-row>
      <!-- Minimum Value -->
      <v-col cols="12" md="4">
        <v-text-field
          v-model.number="localConfig.minValue"
          label="Minimum Value"
          type="number"
          variant="outlined"
          density="compact"
          :step="getStepValue()"
          :rules="[minValueRule]"
          placeholder="No minimum"
          clearable
        />
      </v-col>

      <!-- Maximum Value -->
      <v-col cols="12" md="4">
        <v-text-field
          v-model.number="localConfig.maxValue"
          label="Maximum Value"
          type="number"
          variant="outlined"
          density="compact"
          :step="getStepValue()"
          :rules="[maxValueRule]"
          placeholder="No maximum"
          clearable
        />
      </v-col>

      <!-- Decimal Places -->
      <v-col cols="12" md="4">
        <v-select
          v-model="localConfig.decimalPlaces"
          label="Decimal Places"
          :items="decimalPlaceOptions"
          variant="outlined"
          density="compact"
        />
      </v-col>
    </v-row>

    <v-row>
      <!-- Step Size -->
      <v-col cols="12" md="4">
        <v-text-field
          v-model.number="localConfig.step"
          label="Step Size"
          type="number"
          variant="outlined"
          density="compact"
          :step="getStepValue()"
          :min="getStepValue()"
          :placeholder="getStepValue().toString()"
        />
      </v-col>

      <!-- Default Value -->
      <v-col cols="12" md="4">
        <v-text-field
          v-model.number="localConfig.defaultValue"
          label="Default Value"
          type="number"
          variant="outlined"
          density="compact"
          :step="getStepValue()"
          :rules="[defaultValueRule]"
          placeholder="Leave blank"
          clearable
        />
      </v-col>

      <!-- Display Format -->
      <v-col cols="12" md="4">
        <v-select
          v-model="localConfig.displayFormat"
          label="Display Format"
          :items="displayFormatOptions"
          variant="outlined"
          density="compact"
        />
      </v-col>
    </v-row>

    <!-- Options -->
    <v-row>
      <v-col cols="12" md="6">
        <v-checkbox
          v-model="localConfig.allowNegative"
          label="Allow negative numbers"
          color="teal"
          density="compact"
        />
      </v-col>

      <v-col cols="12" md="6">
        <v-checkbox
          v-model="localConfig.scientific"
          label="Allow scientific notation (e.g., 1.23e-4)"
          color="teal"
          density="compact"
        />
      </v-col>
    </v-row>

    <!-- Preview -->
    <v-card variant="tonal" color="teal" class="mt-4">
      <v-card-text class="py-2">
        <div class="d-flex align-center">
          <v-icon color="teal" class="mr-2">mdi-eye</v-icon>
          <div class="text-body-2">
            <strong>Range:</strong> {{ formatRange() }} • <strong>Precision:</strong> {{ localConfig.decimalPlaces }} decimals
            <span v-if="localConfig.defaultValue !== null && localConfig.defaultValue !== undefined">
              • <strong>Default:</strong> {{ formatNumber(localConfig.defaultValue) }}
            </span>
          </div>
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
      <strong>Examples:</strong> 
      <span v-if="localConfig.decimalPlaces === 2">123.45, 0.99, -15.67</span>
      <span v-else-if="localConfig.decimalPlaces === 4">123.4567, 0.0001, -15.6789</span>
      <span v-else>Numbers with {{ localConfig.decimalPlaces }} decimal places</span>
    </v-alert>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      minValue: null,
      maxValue: null,
      step: 0.01,
      decimalPlaces: 2,
      defaultValue: null,
      displayFormat: 'decimal',
      allowNegative: true,
      scientific: false
    })
  }
});

const emit = defineEmits(['update:modelValue']);

// Local reactive config
const localConfig = ref({
  minValue: null,
  maxValue: null,
  step: 0.01,
  decimalPlaces: 2,
  defaultValue: null,
  displayFormat: 'decimal',
  allowNegative: true,
  scientific: false,
  ...props.modelValue
});

// Options
const decimalPlaceOptions = [
  { title: '1 decimal place (1.2)', value: 1 },
  { title: '2 decimal places (1.23)', value: 2 },
  { title: '3 decimal places (1.234)', value: 3 },
  { title: '4 decimal places (1.2345)', value: 4 },
  { title: '6 decimal places (1.234567)', value: 6 },
  { title: '8 decimal places (1.23456789)', value: 8 }
];

const displayFormatOptions = [
  { title: 'Plain Decimal (123.45)', value: 'decimal' },
  { title: 'With Commas (1,234.56)', value: 'comma' },
  { title: 'Percentage Style (12.34%)', value: 'percentage' },
  { title: 'Scientific (1.23e+2)', value: 'scientific' }
];

// Helper methods
const getStepValue = () => {
  return Math.pow(10, -localConfig.value.decimalPlaces);
};

const formatRange = () => {
  const min = localConfig.value.minValue;
  const max = localConfig.value.maxValue;
  
  if (min !== null && max !== null) {
    return `${formatNumber(min)} to ${formatNumber(max)}`;
  } else if (min !== null) {
    return `${formatNumber(min)} and above`;
  } else if (max !== null) {
    return `${formatNumber(max)} and below`;
  } else {
    return 'Any decimal';
  }
};

const formatNumber = (num) => {
  if (num === null || num === undefined) return '';
  
  const formatted = num.toFixed(localConfig.value.decimalPlaces);
  
  if (localConfig.value.displayFormat === 'comma') {
    return parseFloat(formatted).toLocaleString(undefined, {
      minimumFractionDigits: localConfig.value.decimalPlaces,
      maximumFractionDigits: localConfig.value.decimalPlaces
    });
  }
  
  return formatted;
};

// Validation rules
const minValueRule = computed(() => {
  return (value) => {
    if (value === null || value === undefined || value === '') return true;
    if (localConfig.value.maxValue !== null && localConfig.value.maxValue !== undefined) {
      return value <= localConfig.value.maxValue || 'Minimum cannot be greater than maximum';
    }
    return true;
  };
});

const maxValueRule = computed(() => {
  return (value) => {
    if (value === null || value === undefined || value === '') return true;
    if (localConfig.value.minValue !== null && localConfig.value.minValue !== undefined) {
      return value >= localConfig.value.minValue || 'Maximum cannot be less than minimum';
    }
    return true;
  };
});

const defaultValueRule = computed(() => {
  return (value) => {
    if (value === null || value === undefined || value === '') return true;
    if (localConfig.value.minValue !== null && localConfig.value.minValue !== undefined && value < localConfig.value.minValue) {
      return `Default value cannot be less than minimum (${localConfig.value.minValue})`;
    }
    if (localConfig.value.maxValue !== null && localConfig.value.maxValue !== undefined && value > localConfig.value.maxValue) {
      return `Default value cannot be greater than maximum (${localConfig.value.maxValue})`;
    }
    return true;
  };
});

// Watch decimal places changes to update step
watch(() => localConfig.value.decimalPlaces, (newPlaces) => {
  localConfig.value.step = Math.pow(10, -newPlaces);
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
.float-config-form {
  width: 100%;
}
</style>