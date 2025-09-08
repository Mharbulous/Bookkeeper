<template>
  <div class="checkbox-config-form">
    <h3 class="text-h6 mb-4">Checkbox Category Configuration</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Configure the default state and display labels for this checkbox category.
    </p>

    <v-row>
      <!-- Default Value -->
      <v-col cols="12" md="6">
        <v-select
          v-model="localConfig.defaultValue"
          label="Default Value"
          :items="defaultValueOptions"
          variant="outlined"
          density="compact"
        />
      </v-col>

      <!-- Display Style -->
      <v-col cols="12" md="6">
        <v-select
          v-model="localConfig.displayStyle"
          label="Display Style"
          :items="displayStyleOptions"
          variant="outlined"
          density="compact"
        />
      </v-col>
    </v-row>

    <v-row>
      <!-- Custom Labels -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="localConfig.trueLabel"
          label="Checked Label"
          variant="outlined"
          density="compact"
          placeholder="e.g., Yes, Active, Approved"
        />
      </v-col>

      <v-col cols="12" md="6">
        <v-text-field
          v-model="localConfig.falseLabel"
          label="Unchecked Label"
          variant="outlined"
          density="compact"
          placeholder="e.g., No, Inactive, Pending"
        />
      </v-col>
    </v-row>

    <!-- Preview -->
    <v-card variant="tonal" color="orange" class="mt-4">
      <v-card-text class="py-2">
        <div class="d-flex align-center">
          <v-icon color="orange" class="mr-2">mdi-eye</v-icon>
          <div class="text-body-2">
            <strong>Preview:</strong> 
            <v-chip size="small" :color="localConfig.defaultValue ? 'success' : 'grey'" class="ml-2">
              {{ localConfig.defaultValue ? localConfig.trueLabel : localConfig.falseLabel }}
            </v-chip>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      defaultValue: false,
      displayStyle: 'checkbox',
      trueLabel: 'Yes',
      falseLabel: 'No'
    })
  }
});

const emit = defineEmits(['update:modelValue']);

// Local reactive config
const localConfig = ref({
  defaultValue: false,
  displayStyle: 'checkbox',
  trueLabel: 'Yes',
  falseLabel: 'No',
  ...props.modelValue
});

// Options
const defaultValueOptions = [
  { title: 'Unchecked (False)', value: false },
  { title: 'Checked (True)', value: true }
];

const displayStyleOptions = [
  { title: 'Checkbox', value: 'checkbox' },
  { title: 'Switch', value: 'switch' },
  { title: 'Button Toggle', value: 'toggle' }
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
.checkbox-config-form {
  width: 100%;
}
</style>