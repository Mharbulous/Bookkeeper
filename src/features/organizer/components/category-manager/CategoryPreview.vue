<template>
  <div class="category-preview">
    <v-card variant="outlined" class="preview-card">
      <v-card-title class="preview-header">
        <v-icon :color="typeColor" class="mr-2">{{ typeIcon }}</v-icon>
        <span>{{ categoryName || 'New Category' }}</span>
        <v-spacer />
        <v-chip 
          :color="typeColor" 
          size="small" 
          variant="flat"
          class="type-chip"
        >
          {{ typeText }}
        </v-chip>
      </v-card-title>

      <v-card-text class="pa-0">
        <div class="preview-content">
          <!-- Type Description -->
          <div class="type-description pa-4">
            <p class="text-body-2">
              <strong>How it works:</strong> {{ typeDescription }}
            </p>
          </div>

          <!-- Interactive Preview -->
          <div class="interactive-preview pa-4 bg-surface-variant">
            <h4 class="text-subtitle-2 mb-3">User Experience Preview</h4>
            
            <!-- Date Preview -->
            <div v-if="categoryType === 'date'" class="preview-demo">
              <DateCategoryInput
                :model-value="previewValues.date"
                :category-config="config"
                :placeholder="'Select ' + (categoryName || 'date')"
                class="demo-input"
              />
              <div class="demo-info mt-2">
                <v-chip size="x-small" color="purple" variant="tonal" class="mr-2">
                  <v-icon start size="12">mdi-calendar</v-icon>
                  {{ formatPreviewDate() }}
                </v-chip>
                <v-chip size="x-small" color="purple" variant="tonal">
                  <v-icon start size="12">mdi-cog</v-icon>
                  {{ getDateConstraints() }}
                </v-chip>
              </div>
            </div>

            <!-- Currency Preview -->
            <div v-else-if="categoryType === 'currency'" class="preview-demo">
              <CurrencyCategoryInput
                :model-value="previewValues.currency"
                :category-config="config"
                :placeholder="'Enter ' + (categoryName || 'amount')"
                class="demo-input"
              />
              <div class="demo-info mt-2">
                <v-chip size="x-small" color="green" variant="tonal" class="mr-2">
                  <v-icon start size="12">mdi-currency-usd</v-icon>
                  {{ config.supportedCurrencies?.length || 0 }} currencies
                </v-chip>
                <v-chip size="x-small" color="green" variant="tonal">
                  <v-icon start size="12">mdi-decimal</v-icon>
                  {{ config.decimalPlaces || 2 }} decimals
                </v-chip>
              </div>
            </div>

            <!-- List Preview -->
            <div v-else-if="categoryType === 'fixed-list' || categoryType === 'open-list'" class="preview-demo">
              <ListCategoryInput
                :model-value="previewValues.list"
                :category-config="config"
                :category-options="config.tags || []"
                :placeholder="'Select ' + (categoryName || 'option')"
                :ai-suggestion-enabled="categoryType === 'open-list'"
                class="demo-input"
              />
              <div class="demo-info mt-2">
                <v-chip size="x-small" :color="categoryType === 'fixed-list' ? 'grey-darken-4' : 'blue'" variant="tonal" class="mr-2">
                  <v-icon start size="12">mdi-tag-multiple</v-icon>
                  {{ (config.tags || []).length }} initial tags
                </v-chip>
                <v-chip 
                  v-if="categoryType === 'open-list'" 
                  size="x-small" 
                  color="blue" 
                  variant="tonal"
                  class="mr-2"
                >
                  <v-icon start size="12">mdi-playlist-plus</v-icon>
                  AI Smart
                </v-chip>
                <v-chip size="x-small" color="grey" variant="tonal">
                  <v-icon start size="12">mdi-counter</v-icon>
                  Max {{ config.maxTags || 100 }}
                </v-chip>
              </div>
            </div>

            <!-- Fallback -->
            <div v-else class="preview-demo">
              <v-text-field
                label="Category Preview"
                variant="outlined"
                density="compact"
                readonly
                placeholder="Select category type to see preview"
              />
            </div>
          </div>

          <!-- AI Integration Info -->
          <div v-if="showAIInfo" class="ai-integration-info pa-4 bg-blue-lighten-5">
            <div class="d-flex align-center mb-2">
              <v-icon color="blue" class="mr-2">mdi-playlist-plus</v-icon>
              <h4 class="text-subtitle-2">AI Integration</h4>
            </div>
            <ul class="text-body-2 ai-features-list">
              <li v-for="feature in aiFeatures" :key="feature">{{ feature }}</li>
            </ul>
          </div>

          <!-- Configuration Summary -->
          <div class="config-summary pa-4">
            <h4 class="text-subtitle-2 mb-3">Configuration Summary</h4>
            <div class="config-items">
              <div 
                v-for="item in configSummary" 
                :key="item.label"
                class="config-item d-flex justify-space-between align-center py-1"
              >
                <span class="text-body-2">{{ item.label }}:</span>
                <v-chip 
                  :color="item.color || 'default'" 
                  size="x-small" 
                  variant="tonal"
                >
                  {{ item.value }}
                </v-chip>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import DateCategoryInput from '../inputs/DateCategoryInput.vue';
import CurrencyCategoryInput from '../inputs/CurrencyCategoryInput.vue';
import ListCategoryInput from '../inputs/ListCategoryInput.vue';

const props = defineProps({
  categoryName: {
    type: String,
    default: ''
  },
  categoryType: {
    type: String,
    default: null
  },
  config: {
    type: Object,
    default: () => ({})
  }
});

// Type configurations
const typeConfigs = {
  'date': {
    color: 'purple',
    icon: 'mdi-calendar',
    text: 'Date Category',
    description: 'Users select dates using an intuitive calendar picker. Perfect for transaction dates, due dates, and time-based organization.'
  },
  'currency': {
    color: 'green',
    icon: 'mdi-currency-usd',
    text: 'Currency Category',
    description: 'Users enter monetary amounts with currency selection. Handles multiple currencies, proper formatting, and decimal precision.'
  },
  'fixed-list': {
    color: 'grey-darken-4',
    icon: 'mdi-format-list-bulleted',
    text: 'Fixed List',
    description: 'Users select from predefined options in a dropdown. Options are locked and cannot be changed by AI processing.'
  },
  'open-list': {
    color: 'blue',
    icon: 'mdi-playlist-plus',
    text: 'Open List',
    description: 'Smart dropdown that allows AI to add new options when processing documents. Grows intelligently based on document content.'
  }
};

// Preview values
const previewValues = {
  date: '2024-03-15',
  currency: { amount: 1234.56, currency: 'USD' },
  list: null
};

// Computed properties
const typeColor = computed(() => {
  return typeConfigs[props.categoryType]?.color || 'grey';
});

const typeIcon = computed(() => {
  return typeConfigs[props.categoryType]?.icon || 'mdi-help-circle';
});

const typeText = computed(() => {
  return typeConfigs[props.categoryType]?.text || 'Unknown Type';
});

const typeDescription = computed(() => {
  return typeConfigs[props.categoryType]?.description || 'Select a category type to see how it works.';
});

const showAIInfo = computed(() => {
  return ['date', 'currency', 'open-list'].includes(props.categoryType);
});

const aiFeatures = computed(() => {
  switch (props.categoryType) {
    case 'date':
      return [
        'AI extracts dates from document content automatically',
        'Supports various date formats in documents',
        'Validates dates against your constraints'
      ];
    case 'currency':
      return [
        'AI identifies monetary amounts in documents',
        'Recognizes currency symbols and codes',
        'Normalizes amounts to consistent format'
      ];
    case 'open-list':
      return [
        'AI suggests existing tags when possible',
        'Creates new tags when confident matches aren\'t found',
        `Requires ${Math.round((props.config.aiConfidenceThreshold || 0.7) * 100)}% confidence to create new tags`
      ];
    default:
      return [];
  }
});

const configSummary = computed(() => {
  const items = [];
  
  switch (props.categoryType) {
    case 'date':
      items.push(
        { label: 'Date Format', value: props.config.dateFormat || 'YYYY-MM-DD', color: 'blue' },
        { label: 'Past Dates', value: props.config.allowPast ? 'Allowed' : 'Blocked', color: props.config.allowPast ? 'green' : 'red' },
        { label: 'Future Dates', value: props.config.allowFuture ? 'Allowed' : 'Blocked', color: props.config.allowFuture ? 'green' : 'red' }
      );
      if (props.config.defaultToToday) {
        items.push({ label: 'Default', value: 'Today\'s Date', color: 'blue' });
      }
      break;
      
    case 'currency':
      items.push(
        { label: 'Default Currency', value: props.config.defaultCurrency || 'USD', color: 'orange' },
        { label: 'Currencies', value: `${(props.config.supportedCurrencies || []).length} supported`, color: 'blue' },
        { label: 'Decimals', value: `${props.config.decimalPlaces || 2} places`, color: 'green' }
      );
      if (props.config.allowNegative) {
        items.push({ label: 'Negatives', value: 'Allowed', color: 'orange' });
      }
      break;
      
    case 'fixed-list':
    case 'open-list':
      items.push(
        { label: 'Initial Tags', value: `${(props.config.tags || []).length} tags`, color: 'blue' },
        { label: 'Max Tags', value: props.config.maxTags || 100, color: 'grey' }
      );
      if (props.categoryType === 'open-list') {
        items.push(
          { label: 'AI Expansion', value: 'Enabled', color: 'purple' },
          { label: 'AI Threshold', value: `${Math.round((props.config.aiConfidenceThreshold || 0.7) * 100)}%`, color: 'purple' }
        );
      }
      break;
  }
  
  return items;
});

// Methods
const formatPreviewDate = () => {
  if (!props.config.dateFormat) return 'Mar 15, 2024';
  
  const date = new Date('2024-03-15');
  switch (props.config.dateFormat) {
    case 'MM/DD/YYYY': return '03/15/2024';
    case 'DD/MM/YYYY': return '15/03/2024';
    case 'MMM DD, YYYY': return 'Mar 15, 2024';
    case 'DD MMM YYYY': return '15 Mar 2024';
    default: return '2024-03-15';
  }
};

const getDateConstraints = () => {
  const past = props.config.allowPast;
  const future = props.config.allowFuture;
  
  if (past && future) return 'Any date';
  if (past) return 'Past only';
  if (future) return 'Future only';
  return 'No dates';
};
</script>

<style scoped>
.category-preview {
  width: 100%;
}

.preview-card {
  overflow: hidden;
}

.preview-header {
  background: rgba(var(--v-theme-surface-variant), 0.5);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.type-chip {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-content {
  display: flex;
  flex-direction: column;
}

.type-description {
  background: white;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.interactive-preview {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.preview-demo {
  max-width: 400px;
}

.demo-input {
  pointer-events: none;
}

.demo-info {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.ai-integration-info {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.ai-features-list {
  margin: 0;
  padding-left: 20px;
}

.ai-features-list li {
  margin: 4px 0;
}

.config-summary {
  background: white;
}

.config-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.config-item {
  padding: 4px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1);
}

.config-item:last-child {
  border-bottom: none;
}

/* Responsive design */
@media (max-width: 600px) {
  .preview-demo {
    max-width: 100%;
  }
  
  .demo-info {
    justify-content: flex-start;
  }
}
</style>