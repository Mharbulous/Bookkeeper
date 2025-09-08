<template>
  <div class="counter-config-form">
    <h3 class="text-h6 mb-4">Counter Category Configuration</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Set an optional starting value and prefix for automatic numbering.
    </p>

    <v-row>
      <!-- Starting Value -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="localConfig.startValue"
          label="Starting Value (optional)"
          variant="outlined"
          density="compact"
          placeholder="1"
        />
      </v-col>

      <!-- Prefix -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="localConfig.prefix"
          label="Prefix (optional)"
          variant="outlined"
          density="compact"
          placeholder="e.g., DOC-, INV-"
          :maxlength="10"
        />
      </v-col>
    </v-row>

    <!-- Format Options -->
    <div class="format-options mt-4" v-if="localConfig.sequenceType === 'numeric'">
      <h4 class="text-subtitle-1 mb-3">Numeric Format</h4>
      <v-row>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="localConfig.prefix"
            label="Prefix"
            variant="outlined"
            density="compact"
            placeholder="e.g., DOC-, INV-"
            :counter="10"
            :maxlength="10"
          />
        </v-col>

        <v-col cols="12" md="4">
          <v-select
            v-model="localConfig.padding"
            label="Zero Padding"
            :items="paddingOptions"
            variant="outlined"
            density="compact"
          />
        </v-col>

        <v-col cols="12" md="4">
          <v-text-field
            v-model="localConfig.suffix"
            label="Suffix"
            variant="outlined"
            density="compact"
            placeholder="e.g., -2024, .pdf"
            :counter="10"
            :maxlength="10"
          />
        </v-col>
      </v-row>
    </div>

    <!-- Step Size (for numeric only) -->
    <v-row v-if="localConfig.sequenceType === 'numeric'">
      <v-col cols="12" md="6">
        <v-text-field
          v-model.number="localConfig.stepSize"
          label="Step Size"
          type="number"
          variant="outlined"
          density="compact"
          :min="1"
          :max="100"
          placeholder="1"
          hint="Increment amount for each new value"
          persistent-hint
        />
      </v-col>

      <v-col cols="12" md="6" class="d-flex align-center">
        <v-checkbox
          v-model="localConfig.allowReset"
          label="Allow manual reset"
          color="cyan"
          density="compact"
          hint="Administrators can reset the counter"
          persistent-hint
        />
      </v-col>
    </v-row>

    <!-- Case Options (for letters only) -->
    <v-row v-if="localConfig.sequenceType === 'letters'">
      <v-col cols="12" md="6">
        <v-select
          v-model="localConfig.letterCase"
          label="Letter Case"
          :items="letterCaseOptions"
          variant="outlined"
          density="compact"
        />
      </v-col>

      <v-col cols="12" md="6">
        <v-checkbox
          v-model="localConfig.skipLetters"
          label="Skip I and O letters"
          color="cyan"
          density="compact"
          hint="Avoid confusion with numbers 1 and 0"
          persistent-hint
        />
      </v-col>
    </v-row>

    <!-- Preview Section -->
    <v-card variant="tonal" color="cyan" class="mt-4">
      <v-card-text class="py-3">
        <div class="d-flex align-center mb-3">
          <v-icon color="cyan" class="mr-2">mdi-eye</v-icon>
          <div class="text-body-2">
            <strong>Sequence Preview:</strong> Next {{ previewCount }} values in the sequence
          </div>
        </div>

        <!-- Preview Values -->
        <div class="preview-values">
          <v-chip
            v-for="(value, index) in getPreviewValues()"
            :key="index"
            :color="index === 0 ? 'cyan' : 'grey'"
            :variant="index === 0 ? 'elevated' : 'tonal'"
            size="default"
            class="ma-1"
          >
            {{ value }}
          </v-chip>
        </div>

        <!-- Current Configuration -->
        <div class="mt-3 pt-3" style="border-top: 1px solid rgba(var(--v-border-color), 0.2)">
          <div class="text-body-2">
            <strong>Configuration:</strong> 
            {{ getConfigurationSummary() }}
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Sequence Examples -->
    <div class="examples-section mt-4">
      <h4 class="text-subtitle-1 mb-3">Common Sequence Types</h4>
      <v-row>
        <v-col
          v-for="(example, index) in sequenceExamples"
          :key="index"
          cols="12" md="6"
        >
          <v-card variant="outlined" class="example-card">
            <v-card-text class="py-3">
              <div class="d-flex align-center mb-2">
                <v-icon :color="example.color" class="mr-2">{{ example.icon }}</v-icon>
                <strong class="text-subtitle-2">{{ example.title }}</strong>
              </div>
              <div class="text-body-2 mb-2">{{ example.description }}</div>
              <div class="example-values">
                <v-chip
                  v-for="val in example.examples"
                  :key="val"
                  size="small"
                  :color="example.color"
                  variant="tonal"
                  class="mr-1"
                >
                  {{ val }}
                </v-chip>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Usage Notes -->
    <v-alert
      type="info"
      variant="tonal"
      class="mt-4"
    >
      <v-icon start>mdi-information</v-icon>
      <strong>Automatic Generation:</strong> Values are generated automatically when documents are created. 
      Each document gets the next number/letter in the sequence, ensuring no duplicates.
    </v-alert>

    <v-alert
      type="warning"
      variant="tonal"
      class="mt-4"
    >
      <v-icon start>mdi-alert</v-icon>
      <strong>Important:</strong> Once created, sequence values cannot be changed manually. 
      This ensures consistent numbering across all documents.
    </v-alert>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      sequenceType: 'numeric',
      startValue: '1',
      prefix: '',
      suffix: '',
      padding: 3,
      stepSize: 1,
      letterCase: 'uppercase',
      skipLetters: true,
      allowReset: false
    })
  }
});

const emit = defineEmits(['update:modelValue']);

// Local reactive config
const localConfig = ref({
  sequenceType: 'numeric',
  startValue: '1',
  prefix: '',
  suffix: '',
  padding: 3,
  stepSize: 1,
  letterCase: 'uppercase',
  skipLetters: true,
  allowReset: false,
  ...props.modelValue
});

const previewCount = 6;

// Options
const sequenceTypeOptions = [
  { title: 'Numbers (1, 2, 3...)', value: 'numeric' },
  { title: 'Letters (A, B, C...)', value: 'letters' },
  { title: 'Roman Numerals (i, ii, iii...)', value: 'roman-lower' },
  { title: 'Roman Numerals (I, II, III...)', value: 'roman-upper' }
];

const paddingOptions = [
  { title: 'No padding (1, 2, 3)', value: 0 },
  { title: '2 digits (01, 02, 03)', value: 2 },
  { title: '3 digits (001, 002, 003)', value: 3 },
  { title: '4 digits (0001, 0002, 0003)', value: 4 },
  { title: '5 digits (00001, 00002, 00003)', value: 5 }
];

const letterCaseOptions = [
  { title: 'Uppercase (A, B, C)', value: 'uppercase' },
  { title: 'Lowercase (a, b, c)', value: 'lowercase' }
];

const sequenceExamples = [
  {
    title: 'Document Numbers',
    description: 'Sequential numbering with prefix',
    color: 'primary',
    icon: 'mdi-file-document',
    examples: ['DOC-001', 'DOC-002', 'DOC-003']
  },
  {
    title: 'Invoice Numbers',
    description: 'Padded numbers with year suffix',
    color: 'green',
    icon: 'mdi-receipt',
    examples: ['INV-0001-2024', 'INV-0002-2024', 'INV-0003-2024']
  },
  {
    title: 'Reference Letters',
    description: 'Alphabetical sequence',
    color: 'purple',
    icon: 'mdi-alphabetical',
    examples: ['A', 'B', 'C', 'D', 'E']
  },
  {
    title: 'Section Numbers',
    description: 'Roman numeral sequence',
    color: 'orange',
    icon: 'mdi-roman-numeral',
    examples: ['i', 'ii', 'iii', 'iv', 'v']
  }
];

// Helper methods
const updateSequenceType = (newType) => {
  // Update start value based on sequence type
  switch (newType) {
    case 'numeric':
      localConfig.value.startValue = '1';
      break;
    case 'letters':
      localConfig.value.startValue = 'A';
      break;
    case 'roman-lower':
      localConfig.value.startValue = 'i';
      break;
    case 'roman-upper':
      localConfig.value.startValue = 'I';
      break;
  }
};

const getStartValuePlaceholder = () => {
  switch (localConfig.value.sequenceType) {
    case 'numeric': return '1';
    case 'letters': return 'A';
    case 'roman-lower': return 'i';
    case 'roman-upper': return 'I';
    default: return '';
  }
};

const getStartValueHint = () => {
  switch (localConfig.value.sequenceType) {
    case 'numeric': return 'Starting number (e.g., 1, 100, 2024)';
    case 'letters': return 'Starting letter (e.g., A, B, Z)';
    case 'roman-lower': return 'Starting roman numeral (e.g., i, v, x)';
    case 'roman-upper': return 'Starting roman numeral (e.g., I, V, X)';
    default: return '';
  }
};

const getPreviewValues = () => {
  const values = [];
  const startValue = localConfig.value.startValue || getStartValuePlaceholder();
  
  try {
    switch (localConfig.value.sequenceType) {
      case 'numeric':
        const start = parseInt(startValue) || 1;
        for (let i = 0; i < previewCount; i++) {
          const num = start + (i * localConfig.value.stepSize);
          const paddedNum = localConfig.value.padding > 0 
            ? num.toString().padStart(localConfig.value.padding, '0')
            : num.toString();
          values.push(`${localConfig.value.prefix}${paddedNum}${localConfig.value.suffix}`);
        }
        break;

      case 'letters':
        let letterIndex = startValue.charCodeAt(0) - 65; // A = 0
        if (startValue.toLowerCase() === startValue) {
          letterIndex = startValue.charCodeAt(0) - 97; // a = 0
        }
        
        for (let i = 0; i < previewCount; i++) {
          let currentIndex = letterIndex + i;
          if (localConfig.value.skipLetters) {
            // Skip I (8) and O (14)
            if (currentIndex >= 8) currentIndex++;
            if (currentIndex >= 14) currentIndex++;
          }
          
          const letter = String.fromCharCode(
            (localConfig.value.letterCase === 'uppercase' ? 65 : 97) + (currentIndex % 26)
          );
          values.push(letter);
        }
        break;

      case 'roman-lower':
      case 'roman-upper':
        const romanNumerals = localConfig.value.sequenceType === 'roman-upper' 
          ? ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
          : ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
        
        for (let i = 0; i < Math.min(previewCount, romanNumerals.length); i++) {
          values.push(romanNumerals[i]);
        }
        break;
    }
  } catch (error) {
    values.push('Invalid start value');
  }

  return values;
};

const getConfigurationSummary = () => {
  const parts = [];
  
  switch (localConfig.value.sequenceType) {
    case 'numeric':
      parts.push(`Numbers starting at ${localConfig.value.startValue || '1'}`);
      if (localConfig.value.stepSize !== 1) {
        parts.push(`step ${localConfig.value.stepSize}`);
      }
      if (localConfig.value.padding > 0) {
        parts.push(`${localConfig.value.padding}-digit padding`);
      }
      break;
    
    case 'letters':
      parts.push(`${localConfig.value.letterCase} letters`);
      if (localConfig.value.skipLetters) {
        parts.push('skip I/O');
      }
      break;
      
    default:
      parts.push(localConfig.value.sequenceType.replace('-', ' '));
  }
  
  return parts.join(' • ');
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
.counter-config-form {
  width: 100%;
}

.format-options,
.examples-section {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 16px;
}

.preview-values {
  min-height: 50px;
}

.example-card {
  height: 100%;
}

.example-values {
  margin-top: 8px;
}
</style>