<template>
  <div class="date-config-form">
    <h3 class="text-h6 mb-4">Date Category Configuration</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Set the date format and default value for this category.
    </p>

    <v-row>
      <!-- Date Format Selection -->
      <v-col cols="12" md="6">
        <v-select
          v-model="localConfig.dateFormat"
          label="Date Format"
          :items="dateFormatOptions"
          variant="outlined"
          density="compact"
        />
      </v-col>

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
    </v-row>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      dateFormat: 'YYYY-MM-DD',
      defaultValue: 't.b.d.',
      allowFuture: true,
      allowPast: true
    })
  }
});

const emit = defineEmits(['update:modelValue']);

// Local reactive config
const localConfig = ref({
  dateFormat: 'YYYY-MM-DD',
  defaultValue: 't.b.d.',
  allowFuture: true,
  allowPast: true,
  ...props.modelValue
});

// Options
const dateFormatOptions = [
  { title: 'YYYY-MM-DD (2024-03-15)', value: 'YYYY-MM-DD' },
  { title: 'MM/DD/YYYY (03/15/2024)', value: 'MM/DD/YYYY' },
  { title: 'DD/MM/YYYY (15/03/2024)', value: 'DD/MM/YYYY' },
  { title: 'MMM DD, YYYY (Mar 15, 2024)', value: 'MMM DD, YYYY' },
  { title: 'DD MMM YYYY (15 Mar 2024)', value: 'DD MMM YYYY' }
];

const defaultValueOptions = [
  { title: 'To be determined (t.b.d.)', value: 't.b.d.' },
  { title: 'Today\'s date', value: 'today' },
  { title: 'Leave blank', value: 'blank' }
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
.date-config-form {
  width: 100%;
}
</style>