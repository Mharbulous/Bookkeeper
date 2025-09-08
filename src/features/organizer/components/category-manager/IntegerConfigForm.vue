<template>
  <div class="integer-config-form">
    <h3 class="text-h6 mb-4">Integer Category Configuration</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Configure validation rules and display options for whole number inputs.
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
          :rules="[maxValueRule]"
          placeholder="No maximum"
          clearable
        />
      </v-col>

      <!-- Step Size -->
      <v-col cols="12" md="4">
        <v-text-field
          v-model.number="localConfig.step"
          label="Step Size"
          type="number"
          variant="outlined"
          density="compact"
          :min="1"
          placeholder="1"
        />
      </v-col>
    </v-row>

    <v-row>
      <!-- Default Value -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model.number="localConfig.defaultValue"
          label="Default Value"
          type="number"
          variant="outlined"
          density="compact"
          :rules="[defaultValueRule]"
          placeholder="Leave blank"
          clearable
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

    <!-- Options -->
    <v-row>
      <v-col cols="12">
        <v-checkbox
          v-model="localConfig.allowNegative"
          label="Allow negative numbers"
          color="indigo"
          density="compact"
        />
      </v-col>
    </v-row>

    <!-- Preview -->
    <v-card variant="tonal" color="indigo" class="mt-4">
      <v-card-text class="py-2">
        <div class="d-flex align-center">
          <v-icon color="indigo" class="mr-2">mdi-eye</v-icon>
          <div class="text-body-2">
            <strong>Range:</strong> {{ formatRange() }} • <strong>Step:</strong> {{ localConfig.step || 1 }}
            <span v-if="localConfig.defaultValue !== null && localConfig.defaultValue !== undefined">
              • <strong>Default:</strong> {{ formatNumber(localConfig.defaultValue) }}
            </span>
          </div>
        </div>
      </v-card-text>
    </v-card>
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
      step: 1,
      defaultValue: null,
      displayFormat: 'number',
      allowNegative: true
    })
  }
});

const emit = defineEmits(['update:modelValue']);

// Local reactive config
const localConfig = ref({
  minValue: null,
  maxValue: null,
  step: 1,
  defaultValue: null,
  displayFormat: 'number',
  allowNegative: true,
  ...props.modelValue
});

// Options
const displayFormatOptions = [
  { title: 'Plain Number (123)', value: 'number' },
  { title: 'With Commas (1,234)', value: 'comma' },
  { title: 'With Units (123 items)', value: 'units' }
];

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

// Helper methods
const formatRange = () => {
  const min = localConfig.value.minValue;
  const max = localConfig.value.maxValue;
  
  if (min !== null && max !== null) {
    return `${min} to ${max}`;
  } else if (min !== null) {
    return `${min} and above`;
  } else if (max !== null) {
    return `${max} and below`;
  } else {
    return 'Any integer';
  }
};

const formatNumber = (num) => {
  if (localConfig.value.displayFormat === 'comma') {
    return num.toLocaleString();
  }
  return num.toString();
};

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
.integer-config-form {
  width: 100%;
}
</style>