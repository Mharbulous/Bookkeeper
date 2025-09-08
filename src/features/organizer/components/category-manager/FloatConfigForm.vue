<template>
  <div class="float-config-form">
    <h3 class="text-h6 mb-4">Float Category Configuration</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Set optional minimum and maximum values for decimal number inputs.
    </p>

    <v-row>
      <!-- Minimum Value -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model.number="localConfig.minValue"
          label="Minimum Value (optional)"
          type="number"
          variant="outlined"
          density="compact"
          step="0.01"
          placeholder="No minimum"
          clearable
        />
      </v-col>

      <!-- Maximum Value -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model.number="localConfig.maxValue"
          label="Maximum Value (optional)"
          type="number"
          variant="outlined"
          density="compact"
          step="0.01"
          placeholder="No maximum"
          clearable
        />
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

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

// Local reactive config with sensible defaults
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