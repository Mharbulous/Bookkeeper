<template>
  <div class="textarea-config-form">
    <h3 class="text-h6 mb-4">Textarea Category Configuration</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Configure display and validation options for multi-line text inputs.
    </p>

    <v-row>
      <!-- Character Limit -->
      <v-col cols="12" md="4">
        <v-text-field
          v-model.number="localConfig.maxLength"
          label="Character Limit"
          type="number"
          variant="outlined"
          density="compact"
          :min="1"
          :max="10000"
          placeholder="No limit"
          clearable
        />
      </v-col>

      <!-- Rows -->
      <v-col cols="12" md="4">
        <v-select
          v-model="localConfig.rows"
          label="Display Rows"
          :items="rowOptions"
          variant="outlined"
          density="compact"
        />
      </v-col>

      <!-- Auto-grow -->
      <v-col cols="12" md="4" class="d-flex align-center">
        <v-checkbox
          v-model="localConfig.autoGrow"
          label="Auto-expand height"
          color="brown"
          density="compact"
          class="mt-4"
        />
      </v-col>
    </v-row>

    <v-row>
      <!-- Placeholder Text -->
      <v-col cols="12" md="8">
        <v-text-field
          v-model="localConfig.placeholder"
          label="Placeholder Text"
          variant="outlined"
          density="compact"
          placeholder="e.g., Enter detailed description here..."
          :counter="100"
          :maxlength="100"
        />
      </v-col>

      <!-- Required Field -->
      <v-col cols="12" md="4" class="d-flex align-center">
        <v-checkbox
          v-model="localConfig.required"
          label="Required field"
          color="brown"
          density="compact"
          class="mt-4"
        />
      </v-col>
    </v-row>

    <!-- Advanced Options -->
    <v-row>
      <v-col cols="12" md="6">
        <v-checkbox
          v-model="localConfig.spellCheck"
          label="Enable spell check"
          color="brown"
          density="compact"
        />
      </v-col>

      <v-col cols="12" md="6">
        <v-checkbox
          v-model="localConfig.wordWrap"
          label="Word wrap"
          color="brown"
          density="compact"
        />
      </v-col>
    </v-row>

    <!-- Text Processing Options -->
    <div class="text-processing mt-4">
      <h4 class="text-subtitle-1 mb-3">Text Processing</h4>
      <v-row>
        <v-col cols="12" md="6">
          <v-checkbox
            v-model="localConfig.trimWhitespace"
            label="Trim whitespace automatically"
            color="brown"
            density="compact"
            hint="Remove leading/trailing spaces"
            persistent-hint
          />
        </v-col>

        <v-col cols="12" md="6">
          <v-checkbox
            v-model="localConfig.normalizeLineBreaks"
            label="Normalize line breaks"
            color="brown"
            density="compact"
            hint="Convert to consistent line endings"
            persistent-hint
          />
        </v-col>
      </v-row>
    </div>

    <!-- Preview -->
    <v-card variant="tonal" color="brown" class="mt-4">
      <v-card-text class="py-2">
        <div class="d-flex align-center mb-2">
          <v-icon color="brown" class="mr-2">mdi-eye</v-icon>
          <div class="text-body-2">
            <strong>Configuration:</strong> 
            {{ localConfig.rows }} rows
            <span v-if="localConfig.maxLength"> • {{ localConfig.maxLength }} char limit</span>
            <span v-if="localConfig.required"> • Required</span>
            <span v-if="localConfig.autoGrow"> • Auto-expand</span>
          </div>
        </div>
        
        <!-- Preview Textarea -->
        <v-textarea
          :rows="localConfig.rows"
          :placeholder="localConfig.placeholder || 'Enter text here...'"
          variant="outlined"
          density="compact"
          :counter="localConfig.maxLength"
          :auto-grow="localConfig.autoGrow"
          readonly
          class="preview-textarea"
          hide-details
        />
      </v-card-text>
    </v-card>

    <!-- Usage Guidelines -->
    <v-alert
      type="info"
      variant="tonal"
      class="mt-4"
    >
      <v-icon start>mdi-information</v-icon>
      <strong>Best for:</strong> Document descriptions, notes, comments, detailed explanations, and any text longer than a single line.
      <span v-if="localConfig.maxLength && localConfig.maxLength < 500">
        Current limit ({{ localConfig.maxLength }} chars) is good for short descriptions.
      </span>
      <span v-else-if="localConfig.maxLength && localConfig.maxLength >= 500">
        Current limit ({{ localConfig.maxLength }} chars) allows for detailed text.
      </span>
    </v-alert>
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