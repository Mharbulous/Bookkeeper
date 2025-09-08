<template>
  <div class="regex-config-form">
    <h3 class="text-h6 mb-4">Regex Category Configuration</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Configure pattern-based text validation using regular expressions to ensure text follows specific formats.
    </p>

    <!-- Pattern Configuration -->
    <v-row>
      <!-- Predefined Patterns -->
      <v-col cols="12" md="6">
        <v-select
          v-model="selectedPreset"
          label="Common Patterns"
          :items="presetPatterns"
          variant="outlined"
          density="compact"
          placeholder="Choose a preset or create custom..."
          @update:model-value="applyPreset"
          clearable
        />
      </v-col>

      <!-- Pattern Flags -->
      <v-col cols="12" md="6">
        <v-select
          v-model="localConfig.flags"
          label="Pattern Flags"
          :items="flagOptions"
          variant="outlined"
          density="compact"
          multiple
          chips
        />
      </v-col>
    </v-row>

    <!-- Custom Pattern Input -->
    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="localConfig.pattern"
          label="Regular Expression Pattern"
          variant="outlined"
          density="compact"
          :error-messages="patternError"
          placeholder="e.g., ^[A-Z]{3}-\d{4}$ for ABC-1234 format"
          prepend-inner-icon="mdi-regex"
          @input="validatePattern"
        />
      </v-col>
    </v-row>

    <!-- Error Message Configuration -->
    <v-row>
      <v-col cols="12" md="8">
        <v-text-field
          v-model="localConfig.errorMessage"
          label="Custom Error Message"
          variant="outlined"
          density="compact"
          placeholder="e.g., Must follow ABC-1234 format"
          hint="Message shown when pattern doesn't match"
          persistent-hint
        />
      </v-col>

      <v-col cols="12" md="4" class="d-flex align-center">
        <v-checkbox
          v-model="localConfig.required"
          label="Required field"
          color="red"
          density="compact"
          class="mt-2"
        />
      </v-col>
    </v-row>

    <!-- Test Section -->
    <div class="test-section mt-6">
      <h4 class="text-subtitle-1 mb-3">Pattern Testing</h4>
      <v-row>
        <v-col cols="12" md="8">
          <v-text-field
            v-model="testString"
            label="Test String"
            variant="outlined"
            density="compact"
            placeholder="Enter text to test against your pattern..."
            :color="testResult === null ? 'default' : testResult ? 'success' : 'error'"
            @input="testPattern"
          />
        </v-col>

        <v-col cols="12" md="4" class="d-flex align-center">
          <v-chip
            v-if="testResult !== null"
            :color="testResult ? 'success' : 'error'"
            :prepend-icon="testResult ? 'mdi-check-circle' : 'mdi-close-circle'"
          >
            {{ testResult ? 'Match' : 'No Match' }}
          </v-chip>
        </v-col>
      </v-row>
    </div>

    <!-- Pattern Examples -->
    <div class="examples-section mt-4">
      <h4 class="text-subtitle-1 mb-3">Pattern Examples</h4>
      <v-row>
        <v-col
          v-for="(example, index) in getPatternExamples()"
          :key="index"
          cols="12" md="6"
        >
          <v-card variant="outlined" class="example-card">
            <v-card-text class="py-2">
              <div class="text-caption text-medium-emphasis">{{ example.description }}</div>
              <code class="text-body-2">{{ example.pattern }}</code>
              <div class="text-caption mt-1">
                <strong>Matches:</strong> {{ example.matches.join(', ') }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Preview -->
    <v-card variant="tonal" color="red" class="mt-4">
      <v-card-text class="py-3">
        <div class="d-flex align-center mb-3">
          <v-icon color="red" class="mr-2">mdi-eye</v-icon>
          <div class="text-body-2">
            <strong>Pattern:</strong> <code>{{ localConfig.pattern || 'No pattern set' }}</code>
            <span v-if="localConfig.flags.length > 0"> • Flags: {{ localConfig.flags.join(', ') }}</span>
          </div>
        </div>

        <!-- Preview Input -->
        <v-text-field
          placeholder="Users will enter text matching your pattern..."
          variant="outlined"
          density="compact"
          :error-messages="localConfig.pattern ? [] : ['Pattern required']"
          readonly
          class="preview-input"
          append-inner-icon="mdi-regex"
        />

        <div v-if="localConfig.errorMessage" class="mt-2">
          <strong class="text-caption">Error message:</strong>
          <span class="text-body-2 ml-2">{{ localConfig.errorMessage }}</span>
        </div>
      </v-card-text>
    </v-card>

    <!-- Usage Notes -->
    <v-alert
      type="info"
      variant="tonal"
      class="mt-4"
    >
      <v-icon start>mdi-information</v-icon>
      <strong>Perfect for:</strong> Product codes, license plates, phone numbers, postal codes, 
      custom ID formats, serial numbers, and any text that follows a specific pattern.
    </v-alert>

    <v-alert
      v-if="!localConfig.pattern"
      type="warning"
      variant="tonal"
      class="mt-4"
    >
      <v-icon start>mdi-alert</v-icon>
      <strong>Pattern required:</strong> Please enter a regular expression pattern or select a preset.
    </v-alert>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      pattern: '',
      flags: ['i'],
      errorMessage: '',
      required: false
    })
  }
});

const emit = defineEmits(['update:modelValue']);

// Local reactive config
const localConfig = ref({
  pattern: '',
  flags: ['i'],
  errorMessage: '',
  required: false,
  ...props.modelValue
});

// Local state
const selectedPreset = ref(null);
const testString = ref('');
const testResult = ref(null);
const patternError = ref('');

// Options
const presetPatterns = [
  { title: 'Email Address', value: 'email', pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' },
  { title: 'Phone Number (US)', value: 'phone', pattern: '^\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$' },
  { title: 'ZIP Code (US)', value: 'zip', pattern: '^\\d{5}(-\\d{4})?$' },
  { title: 'Credit Card', value: 'credit', pattern: '^\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}$' },
  { title: 'License Plate (ABC-1234)', value: 'license', pattern: '^[A-Z]{3}-\\d{4}$' },
  { title: 'Invoice Number (INV-001)', value: 'invoice', pattern: '^INV-\\d{3}$' },
  { title: 'Product Code (ABC123)', value: 'product', pattern: '^[A-Z]{3}\\d{3}$' },
  { title: 'Social Security Number', value: 'ssn', pattern: '^\\d{3}-\\d{2}-\\d{4}$' },
  { title: 'UUID', value: 'uuid', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' }
];

const flagOptions = [
  { title: 'Case Insensitive (i)', value: 'i' },
  { title: 'Global Match (g)', value: 'g' },
  { title: 'Multiline (m)', value: 'm' },
  { title: 'Dot Matches All (s)', value: 's' },
  { title: 'Unicode (u)', value: 'u' }
];

// Methods
const applyPreset = (presetValue) => {
  const preset = presetPatterns.find(p => p.value === presetValue);
  if (preset) {
    localConfig.value.pattern = preset.pattern;
    localConfig.value.errorMessage = `Please enter a valid ${preset.title.toLowerCase()}`;
    validatePattern();
  }
};

const validatePattern = () => {
  try {
    if (localConfig.value.pattern) {
      new RegExp(localConfig.value.pattern, localConfig.value.flags.join(''));
      patternError.value = '';
    }
  } catch (error) {
    patternError.value = 'Invalid regular expression: ' + error.message;
  }
  
  // Re-test current test string
  if (testString.value) {
    testPattern();
  }
};

const testPattern = () => {
  if (!localConfig.value.pattern || !testString.value) {
    testResult.value = null;
    return;
  }

  try {
    const regex = new RegExp(localConfig.value.pattern, localConfig.value.flags.join(''));
    testResult.value = regex.test(testString.value);
  } catch (error) {
    testResult.value = false;
  }
};

const getPatternExamples = () => {
  return [
    {
      description: 'Product Code',
      pattern: '^[A-Z]{3}\\d{3}$',
      matches: ['ABC123', 'XYZ789']
    },
    {
      description: 'Phone Number',
      pattern: '^\\d{3}-\\d{3}-\\d{4}$',
      matches: ['555-123-4567', '800-555-1234']
    },
    {
      description: 'License Plate',
      pattern: '^[A-Z]{3}-\\d{4}$',
      matches: ['ABC-1234', 'XYZ-9876']
    },
    {
      description: 'Invoice Number',
      pattern: '^INV-\\d{4}$',
      matches: ['INV-0001', 'INV-9999']
    }
  ];
};

// Watch for changes and emit
watch(localConfig, (newConfig) => {
  emit('update:modelValue', { ...newConfig });
}, { deep: true });

// Watch pattern changes to validate
watch(() => localConfig.value.pattern, validatePattern);
watch(() => localConfig.value.flags, validatePattern, { deep: true });

// Initialize with props
watch(() => props.modelValue, (newValue) => {
  localConfig.value = { ...localConfig.value, ...newValue };
  validatePattern();
}, { immediate: true });
</script>

<style scoped>
.regex-config-form {
  width: 100%;
}

.test-section,
.examples-section {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 16px;
}

.example-card {
  height: 100%;
}

.preview-input {
  pointer-events: none;
  opacity: 0.8;
}

.preview-input :deep(.v-field) {
  background-color: rgba(var(--v-theme-surface), 0.3);
}

code {
  background-color: rgba(var(--v-theme-surface-variant), 0.5);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
</style>