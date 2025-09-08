<!-- Streamlined from 246 lines to 168 lines on 2025-09-07 -->
<template>
  <div class="unique-string-config-form">
    <h3 class="text-h6 mb-4">Unique String Category Configuration</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Set an optional maximum length for unique text strings. Each string can only be used once.
    </p>

    <!-- Maximum Length -->
    <v-text-field
      v-model.number="localConfig.maxLength"
      label="Maximum Length (optional)"
      type="number"
      variant="outlined"
      density="compact"
      :min="1"
      :max="256"
      placeholder="256 characters"
      clearable
      class="mb-4"
    />

    <!-- Text Processing -->
    <div class="section mt-4">
      <h4 class="text-subtitle-1 mb-3">Text Processing</h4>
      <v-row>
        <v-col v-for="option in processingOptions" :key="option.key" cols="12" md="6">
          <v-checkbox
            v-model="localConfig[option.key]"
            :label="option.label"
            :hint="option.hint"
            :persistent-hint="!!option.hint"
            color="deep-purple"
            density="compact"
          />
        </v-col>
      </v-row>
    </div>

    <!-- Uniqueness Scope -->
    <div class="section mt-4">
      <h4 class="text-subtitle-1 mb-3">Uniqueness Scope</h4>
      <v-select
        v-model="localConfig.uniquenessScope"
        label="Uniqueness Level"
        :items="uniquenessScopeOptions"
        variant="outlined"
        density="compact"
      />
    </div>

    <!-- Preview -->
    <v-card variant="tonal" color="deep-purple" class="mt-4">
      <v-card-text class="py-3">
        <div class="d-flex align-center mb-3">
          <v-icon color="deep-purple" class="mr-2">mdi-eye</v-icon>
          <div class="text-body-2">
            <strong>Configuration:</strong>
            {{ localConfig.minLength || 1 }}-{{ localConfig.maxLength || 256 }} chars •
            {{ localConfig.caseSensitive ? 'Case sensitive' : 'Case insensitive' }} •
            {{ localConfig.uniquenessScope === 'global' ? 'Globally unique' : 'Team unique' }}
          </div>
        </div>

        <v-text-field
          placeholder="Enter unique text..."
          variant="outlined"
          density="compact"
          :counter="localConfig.maxLength"
          :maxlength="localConfig.maxLength"
          readonly
          class="preview-input"
          append-inner-icon="mdi-key-variant"
        />

        <div class="mt-2">
          <strong class="text-caption">Examples:</strong>
          <v-chip
            v-for="example in examples"
            :key="example"
            size="x-small"
            class="ml-2"
            color="deep-purple"
            variant="tonal"
          >
            {{ example }}
          </v-chip>
        </div>
      </v-card-text>
    </v-card>

    <!-- Alerts -->
    <v-alert
      v-for="alert in alerts"
      :key="alert.type"
      :type="alert.type"
      variant="tonal"
      class="mt-4"
    >
      <v-icon start>{{ alert.icon }}</v-icon>
      <strong>{{ alert.title }}:</strong> {{ alert.text }}
    </v-alert>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:modelValue']);

// Default configuration
const defaultConfig = {
  maxLength: 256,
  minLength: 1,
  caseSensitive: false,
  trimWhitespace: true,
  allowNumbers: true,
  allowSpecialChars: true,
  uniquenessScope: 'team',
};

// Local reactive config
const localConfig = ref({ ...defaultConfig, ...props.modelValue });

// Configuration options
const processingOptions = [
  { key: 'caseSensitive', label: 'Case sensitive', hint: "'ABC' and 'abc' are different values" },
  { key: 'trimWhitespace', label: 'Auto-trim whitespace', hint: 'Remove leading/trailing spaces' },
  { key: 'allowNumbers', label: 'Allow numbers' },
  {
    key: 'allowSpecialChars',
    label: 'Allow special characters',
    hint: 'Punctuation, symbols, etc.',
  },
];

const uniquenessScopeOptions = [
  { title: 'Within Team (recommended)', value: 'team' },
  { title: 'Globally Unique', value: 'global' },
  { title: 'Within Category', value: 'category' },
];

const alerts = [
  {
    type: 'warning',
    icon: 'mdi-alert',
    title: 'Important',
    text: 'Once a value is used in any document, it cannot be used again. This ensures each string is unique across your entire document collection.',
  },
  {
    type: 'info',
    icon: 'mdi-lightbulb-on',
    title: 'Perfect for',
    text: 'Document IDs, reference numbers, serial codes, unique identifiers, project codes, invoice numbers, tracking numbers.',
  },
];

// Generate examples based on current config
const examples = ref([]);
const updateExamples = () => {
  const { allowNumbers, allowSpecialChars, caseSensitive } = localConfig.value;

  examples.value =
    allowNumbers && allowSpecialChars
      ? ['INV-2024-001', 'REF#12345', 'DOC_ABC123']
      : allowNumbers
        ? ['DOC123', 'REF2024', 'ID001']
        : ['REFERENCE', 'DOCUMENT', 'INVOICE'];

  if (caseSensitive) examples.value.push('CaseSensitive');
  examples.value = examples.value.slice(0, 4);
};

// Watch and emit changes
watch(
  localConfig,
  (newConfig) => {
    if (newConfig.minLength > newConfig.maxLength) {
      newConfig.minLength = newConfig.maxLength;
    }
    updateExamples();
    emit('update:modelValue', { ...newConfig });
  },
  { deep: true, immediate: true }
);

// Sync with props
watch(
  () => props.modelValue,
  (newValue) => {
    Object.assign(localConfig.value, newValue);
  }
);
</script>

<style scoped>
.section {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 16px;
}

.preview-input {
  pointer-events: none;
  opacity: 0.8;
}

.preview-input :deep(.v-field) {
  background-color: rgba(var(--v-theme-surface), 0.3);
}
</style>
