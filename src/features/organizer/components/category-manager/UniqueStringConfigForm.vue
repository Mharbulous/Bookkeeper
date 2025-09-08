<template>
  <div class="unique-string-config-form">
    <h3 class="text-h6 mb-4">Unique String Category Configuration</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Configure validation for text strings that must be unique within this category.
      Each string can only be used once across all documents.
    </p>

    <v-row>
      <!-- Maximum Length -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model.number="localConfig.maxLength"
          label="Maximum Length"
          type="number"
          variant="outlined"
          density="compact"
          :min="1"
          :max="256"
          placeholder="256"
          suffix="characters"
        />
      </v-col>

      <!-- Minimum Length -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model.number="localConfig.minLength"
          label="Minimum Length"
          type="number"
          variant="outlined"
          density="compact"
          :min="1"
          :max="localConfig.maxLength || 256"
          placeholder="1"
          suffix="characters"
        />
      </v-col>
    </v-row>

    <!-- Case Sensitivity and Formatting -->
    <div class="formatting-options mt-4">
      <h4 class="text-subtitle-1 mb-3">Text Processing</h4>
      <v-row>
        <v-col cols="12" md="6">
          <v-checkbox
            v-model="localConfig.caseSensitive"
            label="Case sensitive"
            color="deep-purple"
            density="compact"
            hint="'ABC' and 'abc' are different values"
            persistent-hint
          />
        </v-col>

        <v-col cols="12" md="6">
          <v-checkbox
            v-model="localConfig.trimWhitespace"
            label="Auto-trim whitespace"
            color="deep-purple"
            density="compact"
            hint="Remove leading/trailing spaces"
            persistent-hint
          />
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" md="6">
          <v-checkbox
            v-model="localConfig.allowNumbers"
            label="Allow numbers"
            color="deep-purple"
            density="compact"
          />
        </v-col>

        <v-col cols="12" md="6">
          <v-checkbox
            v-model="localConfig.allowSpecialChars"
            label="Allow special characters"
            color="deep-purple"
            density="compact"
            hint="Punctuation, symbols, etc."
            persistent-hint
          />
        </v-col>
      </v-row>
    </div>

    <!-- Uniqueness Scope -->
    <div class="uniqueness-scope mt-4">
      <h4 class="text-subtitle-1 mb-3">Uniqueness Scope</h4>
      <v-select
        v-model="localConfig.uniquenessScope"
        label="Uniqueness Level"
        :items="uniquenessScopeOptions"
        variant="outlined"
        density="compact"
      />
    </div>

    <!-- Auto-generation Options -->
    <div class="generation-options mt-4">
      <h4 class="text-subtitle-1 mb-3">Auto-generation (Optional)</h4>
      <v-row>
        <v-col cols="12" md="6">
          <v-checkbox
            v-model="localConfig.enableAutoGeneration"
            label="Enable auto-generation"
            color="deep-purple"
            density="compact"
            hint="Generate unique values when needed"
            persistent-hint
          />
        </v-col>

        <v-col cols="12" md="6" v-if="localConfig.enableAutoGeneration">
          <v-select
            v-model="localConfig.generationPattern"
            label="Generation Pattern"
            :items="generationPatternOptions"
            variant="outlined"
            density="compact"
          />
        </v-col>
      </v-row>
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

        <!-- Preview Input -->
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

        <!-- Example Values -->
        <div class="mt-2">
          <strong class="text-caption">Examples:</strong>
          <v-chip
            v-for="example in getExamples()"
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

    <!-- Important Notes -->
    <v-alert
      type="warning"
      variant="tonal"
      class="mt-4"
    >
      <v-icon start>mdi-alert</v-icon>
      <strong>Important:</strong> Once a value is used in any document, it cannot be used again. 
      This ensures each string is unique across your entire document collection.
      <span v-if="localConfig.enableAutoGeneration">
        Auto-generation will create new unique values when conflicts occur.
      </span>
    </v-alert>

    <!-- Use Cases -->
    <v-alert
      type="info"
      variant="tonal"
      class="mt-4"
    >
      <v-icon start>mdi-lightbulb-on</v-icon>
      <strong>Perfect for:</strong> Document IDs, reference numbers, serial codes, unique identifiers, 
      project codes, invoice numbers, tracking numbers.
    </v-alert>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      maxLength: 256,
      minLength: 1,
      caseSensitive: false,
      trimWhitespace: true,
      allowNumbers: true,
      allowSpecialChars: true,
      uniquenessScope: 'team',
      enableAutoGeneration: false,
      generationPattern: 'uuid'
    })
  }
});

const emit = defineEmits(['update:modelValue']);

// Local reactive config
const localConfig = ref({
  maxLength: 256,
  minLength: 1,
  caseSensitive: false,
  trimWhitespace: true,
  allowNumbers: true,
  allowSpecialChars: true,
  uniquenessScope: 'team',
  enableAutoGeneration: false,
  generationPattern: 'uuid',
  ...props.modelValue
});

// Options
const uniquenessScopeOptions = [
  { title: 'Within Team (recommended)', value: 'team' },
  { title: 'Globally Unique', value: 'global' },
  { title: 'Within Category', value: 'category' }
];

const generationPatternOptions = [
  { title: 'UUID (abc123de-f456-...)', value: 'uuid' },
  { title: 'Short ID (ABC123)', value: 'shortid' },
  { title: 'Timestamp (20241201-143022)', value: 'timestamp' },
  { title: 'Sequential (DOC-001, DOC-002)', value: 'sequential' }
];

// Helper methods
const getExamples = () => {
  const examples = [];
  
  if (localConfig.value.allowNumbers && localConfig.value.allowSpecialChars) {
    examples.push('INV-2024-001', 'REF#12345', 'DOC_ABC123');
  } else if (localConfig.value.allowNumbers) {
    examples.push('DOC123', 'REF2024', 'ID001');
  } else {
    examples.push('REFERENCE', 'DOCUMENT', 'INVOICE');
  }
  
  // Adjust case based on settings
  if (localConfig.value.caseSensitive) {
    examples.push('CaseSensitive');
  }
  
  return examples.slice(0, 4);
};

// Watch for changes and emit
watch(localConfig, (newConfig) => {
  // Ensure minLength doesn't exceed maxLength
  if (newConfig.minLength > newConfig.maxLength) {
    newConfig.minLength = newConfig.maxLength;
  }
  
  emit('update:modelValue', { ...newConfig });
}, { deep: true });

// Initialize with props
watch(() => props.modelValue, (newValue) => {
  localConfig.value = { ...localConfig.value, ...newValue };
}, { immediate: true });
</script>

<style scoped>
.unique-string-config-form {
  width: 100%;
}

.formatting-options,
.uniqueness-scope,
.generation-options {
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