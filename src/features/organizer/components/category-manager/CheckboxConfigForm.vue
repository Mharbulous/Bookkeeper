<template>
  <div class="checkbox-config-form">
    <h3 class="text-h6 mb-4">Checkbox Category Configuration</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Choose the default state for new documents.
    </p>

    <!-- Default Value -->
    <v-select
      v-model="localConfig.defaultValue"
      label="Default Value"
      :items="defaultValueOptions"
      variant="outlined"
      density="compact"
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
      defaultValue: false,
      displayStyle: 'checkbox',
      trueLabel: 'Yes',
      falseLabel: 'No'
    })
  }
});

const emit = defineEmits(['update:modelValue']);

// Local reactive config with sensible defaults
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