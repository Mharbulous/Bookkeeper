<!-- Streamlined from 695 lines to 518 lines on 2025-09-07 -->
<template>
  <div class="category-manager">
    <!-- Header -->
    <div class="text-center mb-6">
      <h2 class="text-h4 mb-2">Category Management</h2>
      <p class="text-body-1 text-medium-emphasis">
        Manage your document organization categories and their tag options.
      </p>
    </div>

    <!-- Add New Category -->
    <v-card class="mb-6" variant="outlined">
      <v-card-title :class="{ 'text-primary': showCreationWizard && creationStep === 2 }">
        <v-icon class="mr-2">mdi-plus-circle</v-icon>
        {{ wizardTitle }}
      </v-card-title>
      <v-card-text>
        <v-btn
          v-if="!showCreationWizard"
          color="primary"
          size="large"
          @click="startCategoryCreation"
        >
          <v-icon start>mdi-plus</v-icon>
          Create New Category
        </v-btn>

        <!-- Category Creation Wizard -->
        <div v-else>
          <!-- Step Indicator -->
          <div class="step-indicator mb-6">
            <div v-for="(step, idx) in wizardSteps" :key="step.title" class="d-flex align-center">
              <div class="step" :class="{ active: creationStep === idx + 1 }">
                <div class="step-number">{{ idx + 1 }}</div>
                <div class="step-content">
                  <div class="step-title">{{ step.title }}</div>
                  <div class="step-subtitle">{{ step.subtitle }}</div>
                </div>
              </div>
              <div
                v-if="idx < wizardSteps.length - 1"
                class="step-divider"
                :class="{ active: creationStep > idx + 1 }"
              />
            </div>
          </div>

          <!-- Step Content -->
          <div class="wizard-content">
            <!-- Step 1: Basic Information -->
            <div v-if="creationStep === 1">
              <h3 class="text-h6 mb-4">Category Information</h3>
              <p class="text-body-2 text-medium-emphasis mb-4">
                Provide basic information about your new category.
              </p>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="newCategory.name"
                    label="Category Name"
                    variant="outlined"
                    density="compact"
                    :error-messages="newCategoryErrors.name"
                    placeholder="e.g., Transaction Date, Invoice Amount"
                    @input="handleCategoryNameInput"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <CategoryTypeSelector v-model="newCategory.categoryType" />
                </v-col>
              </v-row>
              <v-checkbox
                v-model="newCategory.allowAI"
                label="Allow AI processing"
                color="blue"
                density="compact"
                hint="Enable AI to automatically process and enhance data for this category"
                persistent-hint
                class="mt-2"
              />
            </div>

            <!-- Step 2: Type Configuration -->
            <div v-else-if="creationStep === 2">
              <component
                :is="getConfigComponent(newCategory.categoryType)"
                v-if="getConfigComponent(newCategory.categoryType)"
                v-model="newCategory.typeConfig"
                :category-type="newCategory.categoryType"
              />
              <div v-else class="text-center py-6">
                <v-icon size="48" color="grey">mdi-cog-outline</v-icon>
                <p class="text-body-1 mt-2">Select a category type to configure options.</p>
              </div>
            </div>
          </div>

          <!-- Wizard Navigation -->
          <v-card-actions class="px-0 pt-4">
            <v-btn variant="outlined" @click="cancelCategoryCreation">Cancel</v-btn>
            <v-spacer />
            <v-btn v-if="creationStep > 1" variant="outlined" @click="creationStep--">
              <v-icon start>mdi-arrow-left</v-icon>
              Previous
            </v-btn>
            <v-btn
              v-if="shouldShowNextButton"
              color="primary"
              :disabled="!canProceedToNextStep"
              @click="creationStep++"
            >
              Next
              <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
            <v-btn
              v-if="shouldShowCreateButton"
              color="success"
              :loading="creating"
              :disabled="!canCreateCategory"
              @click="createCategory"
            >
              <v-icon start>mdi-check</v-icon>
              Create Category
            </v-btn>
          </v-card-actions>
        </div>
      </v-card-text>
    </v-card>

    <!-- Existing Categories -->
    <v-card variant="outlined">
      <v-card-title>
        <v-icon class="mr-2">mdi-folder-multiple</v-icon>
        Existing Categories ({{ categories.length }})
      </v-card-title>
      <v-card-text>
        <!-- Loading/Empty States -->
        <div v-if="loading" class="text-center py-6">
          <v-progress-circular indeterminate />
          <p class="mt-2">Loading categories...</p>
        </div>
        <div v-else-if="!categories.length" class="text-center py-6">
          <v-icon size="64" color="grey">mdi-folder-outline</v-icon>
          <p class="text-h6 mt-2">No categories yet</p>
          <p class="text-body-2 text-medium-emphasis">
            Create your first category above to get started.
          </p>
        </div>

        <!-- Categories List -->
        <v-expansion-panels v-else v-model="expandedPanels" multiple>
          <v-expansion-panel v-for="category in categories" :key="category.id" :value="category.id">
            <v-expansion-panel-title>
              <div class="d-flex align-center">
                <v-icon :color="getTypeColor(category.categoryType)" class="mr-3">
                  {{ getTypeIcon(category.categoryType) }}
                </v-icon>
                <div class="flex-grow-1">
                  <div class="d-flex align-center">
                    <div class="font-weight-medium mr-2">{{ category.name }}</div>
                    <v-chip
                      :color="getTypeColor(category.categoryType)"
                      size="x-small"
                      variant="tonal"
                    >
                      {{ getTypeText(category.categoryType) }}
                    </v-chip>
                  </div>
                  <div class="text-caption text-medium-emphasis mt-1">
                    {{ getCategoryDescription(category) }}
                  </div>
                </div>
              </div>
              <template #actions="{ expanded }">
                <v-btn icon variant="text" size="small">
                  <v-icon>{{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                </v-btn>
              </template>
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <div class="category-details">
                <!-- Category Type Info -->
                <div class="mb-4">
                  <h4 class="text-subtitle-2 mb-2">Category Configuration:</h4>
                  <v-card variant="tonal" :color="getTypeColor(category.categoryType)" class="mb-2">
                    <v-card-text class="py-2">
                      <div class="d-flex align-center">
                        <v-icon :color="getTypeColor(category.categoryType)" class="mr-2">
                          {{ getTypeIcon(category.categoryType) }}
                        </v-icon>
                        <div class="text-body-2" v-html="getTypeConfigSummary(category, true)" />
                      </div>
                    </v-card-text>
                  </v-card>
                </div>

                <!-- Tags List (for list-type categories only) -->
                <div v-if="isListType(category.categoryType)" class="mb-4">
                  <h4 class="text-subtitle-2 mb-2">Available Tags:</h4>
                  <div v-if="category.tags?.length" class="tags-list">
                    <v-chip
                      v-for="tag in category.tags"
                      :key="tag.id || tag.name"
                      :color="getTypeColor(category.categoryType)"
                      size="small"
                      class="ma-1"
                    >
                      <v-icon start size="14">mdi-tag</v-icon>
                      {{ tag.name }}
                      <v-icon v-if="tag.aiGenerated" end size="12" class="ml-1">mdi-robot</v-icon>
                    </v-chip>
                  </div>
                  <p v-else class="text-body-2 text-medium-emphasis">
                    {{ getEmptyTagsMessage(category.categoryType) }}
                  </p>
                </div>

                <!-- Category Actions -->
                <div class="category-actions">
                  <v-btn
                    color="primary"
                    variant="outlined"
                    size="small"
                    class="mr-2"
                    @click="editCategory(category)"
                  >
                    <v-icon start>mdi-pencil</v-icon>
                    Edit
                  </v-btn>
                  <v-btn
                    color="error"
                    variant="outlined"
                    size="small"
                    @click="deleteCategory(category)"
                  >
                    <v-icon start>mdi-delete</v-icon>
                    Delete
                  </v-btn>
                </div>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useOrganizerStore } from '../stores/organizer.js';

// Import wizard components
import CategoryTypeSelector from '../components/category-manager/CategoryTypeSelector.vue';
import DateConfigForm from '../components/category-manager/DateConfigForm.vue';
import CurrencyConfigForm from '../components/category-manager/CurrencyConfigForm.vue';
import ListConfigForm from '../components/category-manager/ListConfigForm.vue';
import CheckboxConfigForm from '../components/category-manager/CheckboxConfigForm.vue';
import IntegerConfigForm from '../components/category-manager/IntegerConfigForm.vue';
import FloatConfigForm from '../components/category-manager/FloatConfigForm.vue';
import TextareaConfigForm from '../components/category-manager/TextareaConfigForm.vue';
import PercentageConfigForm from '../components/category-manager/PercentageConfigForm.vue';
import UniqueStringConfigForm from '../components/category-manager/UniqueStringConfigForm.vue';
import RegexConfigForm from '../components/category-manager/RegexConfigForm.vue';
import CounterConfigForm from '../components/category-manager/CounterConfigForm.vue';

// Store
const organizerStore = useOrganizerStore();
const { categories, loading } = storeToRefs(organizerStore);

// Local state
const creating = ref(false);
const expandedPanels = ref([]);
const showCreationWizard = ref(false);
const creationStep = ref(1);
const newCategory = ref({
  name: '',
  categoryType: 'open-list',
  allowAI: true,
  typeConfig: {},
});
const newCategoryErrors = ref({ name: [] });
const snackbar = ref({ show: false, message: '', color: 'success' });

// Constants
const skipConfigurationTypes = ['currency'];
const wizardSteps = [
  { title: 'Basic Info', subtitle: 'Category details' },
  { title: 'Configuration', subtitle: 'Type-specific options' },
];

const typeConfig = {
  date: { color: 'purple', icon: 'mdi-calendar', text: 'Date' },
  currency: { color: 'green', icon: 'mdi-currency-usd', text: 'Currency' },
  'fixed-list': { color: 'grey-darken-4', icon: 'mdi-format-list-bulleted', text: 'Fixed List' },
  'open-list': { color: 'blue', icon: 'mdi-playlist-plus', text: 'Open List' },
  checkbox: { color: 'orange', icon: 'mdi-checkbox-outline', text: 'Checkbox' },
  integer: { color: 'indigo', icon: 'mdi-numeric', text: 'Integer' },
  float: { color: 'teal', icon: 'mdi-decimal', text: 'Float' },
  textarea: { color: 'brown', icon: 'mdi-text-box', text: 'Textarea' },
  percentage: { color: 'pink', icon: 'mdi-percent', text: 'Percentage' },
  'unique-string': { color: 'deep-purple', icon: 'mdi-key-variant', text: 'Unique String' },
  regex: { color: 'red', icon: 'mdi-regex', text: 'Regex' },
  counter: { color: 'cyan', icon: 'mdi-counter', text: 'Counter' },
};

const configComponents = {
  date: DateConfigForm,
  currency: CurrencyConfigForm,
  'fixed-list': ListConfigForm,
  'open-list': ListConfigForm,
  checkbox: CheckboxConfigForm,
  integer: IntegerConfigForm,
  float: FloatConfigForm,
  textarea: TextareaConfigForm,
  percentage: PercentageConfigForm,
  'unique-string': UniqueStringConfigForm,
  regex: RegexConfigForm,
  counter: CounterConfigForm,
};

// Computed
const canProceedToNextStep = computed(() =>
  creationStep.value === 1
    ? newCategory.value.name.trim().length >= 3 && newCategory.value.categoryType !== null
    : true
);

const canCreateCategory = computed(() => {
  const { name, categoryType, typeConfig } = newCategory.value;
  if (!name.trim() || !categoryType || creationStep.value !== 2) return false;

  return categoryType === 'open-list'
    ? typeConfig?.tags?.length >= 2
    : categoryType === 'fixed-list'
      ? typeConfig?.tags?.length >= 1
      : true;
});

const wizardTitle = computed(() => {
  if (!showCreationWizard.value || creationStep.value === 1) return 'Add New Category';
  const type = getTypeText(newCategory.value.categoryType);
  const name = newCategory.value.name.trim();
  return name ? `New ${type}: ${name}` : `New ${type}`;
});

const shouldShowNextButton = computed(
  () => creationStep.value === 1 && !skipConfigurationTypes.includes(newCategory.value.categoryType)
);

const shouldShowCreateButton = computed(
  () =>
    (creationStep.value === 1 && skipConfigurationTypes.includes(newCategory.value.categoryType)) ||
    creationStep.value === 2
);

// Methods
const getTypeColor = (type) => typeConfig[type]?.color || 'grey';
const getTypeIcon = (type) => typeConfig[type]?.icon || 'mdi-folder';
const getTypeText = (type) => typeConfig[type]?.text || 'Legacy';
const getConfigComponent = (type) => configComponents[type];
const isListType = (type) => ['fixed-list', 'open-list', null, undefined].includes(type);

const getEmptyTagsMessage = (type) =>
  ({
    'fixed-list': 'No tags defined yet.',
    'open-list': 'No initial tags defined. AI can create tags when processing documents.',
  })[type] || 'No tags defined yet.';

const formatRange = (min, max) =>
  min != null && max != null
    ? `${min} to ${max}`
    : min != null
      ? `${min} and above`
      : max != null
        ? `${max} and below`
        : 'Any value';

const getCounterTypeLabel = (type) =>
  ({
    numeric: 'Numeric sequence',
    letters: 'Letter sequence',
    'roman-lower': 'Roman numerals (lowercase)',
    'roman-upper': 'Roman numerals (uppercase)',
  })[type] || 'Auto sequence';

const getTypeConfigSummary = (category, detailed = false) => {
  const cfg = category.typeConfig || {};
  const type = category.categoryType;
  const sep = detailed ? ' • ' : ', ';

  const configs = {
    date: () => {
      const format = cfg.dateFormat || 'YYYY-MM-DD';
      const dates =
        cfg.allowPast && cfg.allowFuture
          ? 'Any date allowed'
          : cfg.allowPast
            ? 'Past dates only'
            : cfg.allowFuture
              ? 'Future dates only'
              : 'No dates';
      return detailed
        ? `<strong>Date Format:</strong> ${format}${sep}${dates}`
        : `Calendar picker${sep}${format} format${sep}${dates.toLowerCase()}`;
    },
    currency: () => {
      const currencies = (cfg.supportedCurrencies || []).length || 1;
      const decimals = cfg.decimalPlaces || 2;
      return detailed
        ? `<strong>Default:</strong> ${cfg.defaultCurrency || 'USD'}${sep}<strong>${currencies} currencies</strong>${sep}<strong>${decimals} decimals</strong>`
        : `Currency selector${sep}${currencies} currencies${sep}${decimals} decimal places`;
    },
    'fixed-list': () => {
      const tagCount = (category.tags || []).length;
      return detailed
        ? `<strong>Fixed options only</strong>${sep}No AI expansion${sep}<strong>${tagCount} predefined tags</strong>`
        : `Fixed dropdown${sep}${tagCount} predefined options${sep}No AI expansion`;
    },
    'open-list': () => {
      const confidence = Math.round((cfg.aiConfidenceThreshold || 0.7) * 100);
      const tagCount = (category.tags || []).length;
      return detailed
        ? `<strong>AI-expandable</strong>${sep}<strong>${confidence}% confidence threshold</strong>${sep}<strong>${tagCount} initial tags</strong>`
        : `Smart dropdown${sep}${tagCount} initial options${sep}AI expansion at ${confidence}% confidence`;
    },
    checkbox: () => {
      const style =
        (cfg.displayStyle || 'checkbox').charAt(0).toUpperCase() +
        (cfg.displayStyle || 'checkbox').slice(1);
      const defaultVal = cfg.defaultValue ? cfg.trueLabel || 'Yes' : cfg.falseLabel || 'No';
      return detailed
        ? `<strong>${style}</strong>${sep}Default: ${defaultVal}`
        : `${style} input${sep}Default: ${cfg.defaultValue ? 'checked' : 'unchecked'}`;
    },
    integer: () => {
      const range = formatRange(cfg.minValue, cfg.maxValue);
      const step = cfg.step || 1;
      return detailed
        ? `<strong>Integer input</strong>${sep}Range: ${range}${sep}Step: ${step}`
        : `Whole number input${sep}Range: ${range}${sep}Step: ${step}`;
    },
    float: () => {
      const decimals = cfg.decimalPlaces || 2;
      const range = formatRange(cfg.minValue, cfg.maxValue);
      return detailed
        ? `<strong>Decimal input</strong>${sep}${decimals} decimals${sep}Range: ${range}`
        : `Decimal input${sep}${decimals} decimal places${sep}Range: ${range}`;
    },
    textarea: () => {
      const parts = [
        detailed ? '<strong>Multi-line text</strong>' : 'Multi-line text',
        `${cfg.rows || 3} rows`,
      ];
      if (cfg.maxLength) parts.push(`${cfg.maxLength} char limit`);
      if (cfg.required) parts.push('Required');
      return parts.join(sep);
    },
    percentage: () => {
      const input = cfg.inputMethod === 'slider' ? 'Slider' : 'Number';
      const decimals = cfg.decimalPlaces || 1;
      const step = cfg.step || (cfg.decimalPlaces === 0 ? 5 : 0.1);
      return detailed
        ? `<strong>${input} input</strong>${sep}${decimals} decimals${sep}Step: ${step}%`
        : `${input} input${sep}${decimals} decimals${sep}Step: ${step}%`;
    },
    'unique-string': () => {
      const chars = `${cfg.minLength || 1}-${cfg.maxLength || 256}`;
      const caseSens = cfg.caseSensitive ? 'Case sensitive' : 'Case insensitive';
      return detailed
        ? `<strong>Unique strings</strong>${sep}${chars} chars${sep}${caseSens}`
        : `Unique text${sep}${chars} characters${sep}${caseSens.toLowerCase()}`;
    },
    regex: () => {
      const pattern = cfg.pattern || 'No pattern';
      const preview = pattern.length > 30 ? pattern.substring(0, 30) + '...' : pattern;
      const req = cfg.required ? `${sep}Required` : '';
      return detailed
        ? `<strong>Pattern validation</strong>${sep}<code>${preview}</code>${req}`
        : `Pattern validation${sep}${preview}${req}`;
    },
    counter: () => {
      const typeLabel = getCounterTypeLabel(cfg.sequenceType);
      const parts = [
        detailed ? `<strong>${typeLabel}</strong>` : typeLabel,
        `Start: ${cfg.startValue || '1'}`,
      ];
      if (cfg.prefix || cfg.suffix)
        parts.push(detailed ? `Format: ${cfg.prefix}N${cfg.suffix}` : 'Custom format');
      return parts.join(sep);
    },
  };

  const defaultFn = () =>
    detailed
      ? '<strong>Legacy category</strong>' + sep + 'Basic tag list functionality'
      : `Basic tag list${sep}${(category.tags || []).length} tags`;

  return (configs[type] || defaultFn)();
};

const getCategoryDescription = (category) => getTypeConfigSummary(category, false);

const handleCategoryNameInput = (e) => {
  const value = e.target.value;
  if (value?.length > 0) {
    const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
    if (capitalized !== value) newCategory.value.name = capitalized;
  }
};

const resetCategoryForm = () => {
  showCreationWizard.value = false;
  creationStep.value = 1;
  newCategory.value = { name: '', categoryType: 'open-list', allowAI: true, typeConfig: {} };
  newCategoryErrors.value = { name: [] };
};

const startCategoryCreation = () => {
  resetCategoryForm();
  showCreationWizard.value = true;
};

const cancelCategoryCreation = resetCategoryForm;

const validateNewCategory = () => {
  const errors = { name: [] };
  const name = newCategory.value.name.trim();

  if (!name) errors.name.push('Category name is required');
  else if (name.length > 50) errors.name.push('Category name must be 50 characters or less');

  if (categories.value.some((cat) => cat.name.toLowerCase() === name.toLowerCase())) {
    errors.name.push('Category name already exists');
  }

  newCategoryErrors.value = errors;
  return errors.name.length === 0;
};

const createCategory = async () => {
  if (!validateNewCategory()) return;

  creating.value = true;
  try {
    const type = newCategory.value.categoryType;
    const colorValue = typeConfig[type]?.color;
    const color = colorValue
      ? getComputedStyle(document.documentElement)
          .getPropertyValue(`--v-theme-${colorValue}`)
          ?.trim() || '#9e9e9e'
      : '#9e9e9e';

    const categoryData = {
      name: newCategory.value.name.trim(),
      categoryType: type,
      typeConfig: { ...newCategory.value.typeConfig },
      color,
    };

    if (isListType(type) && type !== null) {
      categoryData.tags = newCategory.value.typeConfig.tags || [];
    }

    await organizerStore.createCategory(categoryData);
    const categoryName = newCategory.value.name.trim();
    resetCategoryForm();
    showNotification(`Category "${categoryName}" created successfully`, 'success');
  } catch (error) {
    console.error('Failed to create category:', error);
    showNotification('Failed to create category: ' + error.message, 'error');
  } finally {
    creating.value = false;
  }
};

const editCategory = (category) => {
  showNotification('Category editing coming soon!', 'info');
  console.log('Edit category:', category);
};

const deleteCategory = async (category) => {
  if (!confirm(`Are you sure you want to delete the "${category.name}" category?`)) return;

  try {
    await organizerStore.deleteCategory(category.id);
    showNotification(`Category "${category.name}" deleted successfully`, 'success');
  } catch (error) {
    console.error('Failed to delete category:', error);
    showNotification('Failed to delete category: ' + error.message, 'error');
  }
};

const showNotification = (message, color = 'success') => {
  snackbar.value = { show: true, message, color };
};

// Lifecycle
onMounted(async () => {
  if (!organizerStore.isInitialized || categories.value.length === 0) {
    await organizerStore.initialize();
  }
  if (categories.value.length > 0) {
    expandedPanels.value = [categories.value[0].id];
  }
});
</script>

<style scoped>
.category-manager {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 600px;
  margin: 0 auto;
}

.step {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-weight: 600;
  font-size: 16px;
  margin-right: 16px;
  transition: all 0.3s;
}

.step.active .step-number {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.step-content {
  flex: 1;
}

.step-title {
  font-weight: 600;
  font-size: 16px;
  color: rgba(var(--v-theme-on-surface), 0.87);
  line-height: 1.2;
}

.step.active .step-title {
  color: rgb(var(--v-theme-primary));
}

.step-subtitle {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-top: 2px;
}

.step-divider {
  flex: 1;
  height: 2px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
  margin: 0 24px;
  transition: all 0.3s;
}

.step-divider.active {
  background: rgb(var(--v-theme-success));
}
.wizard-content {
  min-height: 200px;
}
.category-details {
  padding: 16px 0;
}
.tags-list {
  min-height: 40px;
}

.category-actions {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 16px;
  margin-top: 16px;
}
</style>
