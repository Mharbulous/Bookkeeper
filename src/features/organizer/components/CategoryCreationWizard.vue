<template>
  <div v-if="showWizard">
    <!-- Step Indicator -->
    <div class="step-indicator mb-6">
      <div v-for="(step, idx) in wizardSteps" :key="step.title" class="d-flex align-center">
        <div class="step" :class="{ active: currentStep === idx + 1 }">
          <div class="step-number">{{ idx + 1 }}</div>
          <div class="step-content">
            <div class="step-title">{{ step.title }}</div>
            <div class="step-subtitle">{{ step.subtitle }}</div>
          </div>
        </div>
        <div
          v-if="idx < wizardSteps.length - 1"
          class="step-divider"
          :class="{ active: currentStep > idx + 1 }"
        />
      </div>
    </div>

    <!-- Step Content -->
    <div class="wizard-content">
      <!-- Step 1: Basic Information -->
      <div v-if="currentStep === 1">
        <h3 class="text-h6 mb-4">Category Information</h3>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Provide basic information about your new category.
        </p>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="formData.name"
              label="Category Name"
              variant="outlined"
              density="compact"
              :error-messages="formErrors.name"
              placeholder="e.g., Transaction Date, Invoice Amount"
              @input="handleCategoryNameInput"
            />
          </v-col>
          <v-col cols="12" md="6">
            <CategoryTypeSelector v-model="formData.categoryType" />
          </v-col>
        </v-row>
        <v-checkbox
          v-model="formData.allowAI"
          label="Allow AI processing"
          color="blue"
          density="compact"
          hint="Enable AI to automatically process and enhance data for this category"
          persistent-hint
          class="mt-2"
        />
      </div>

      <!-- Step 2: Type Configuration -->
      <div v-else-if="currentStep === 2">
        <component
          :is="getConfigComponent(formData.categoryType)"
          v-if="getConfigComponent(formData.categoryType)"
          v-model="formData.typeConfig"
          :category-type="formData.categoryType"
        />
        <div v-else class="text-center py-6">
          <v-icon size="48" color="grey">mdi-cog-outline</v-icon>
          <p class="text-body-1 mt-2">Select a category type to configure options.</p>
        </div>
      </div>
    </div>

    <!-- Wizard Navigation -->
    <v-card-actions class="px-0 pt-4">
      <v-btn variant="outlined" @click="handleCancel">Cancel</v-btn>
      <v-spacer />
      <v-btn v-if="currentStep > 1" variant="outlined" @click="currentStep--">
        <v-icon start>mdi-arrow-left</v-icon>
        Previous
      </v-btn>
      <v-btn
        v-if="shouldShowNextButton"
        color="primary"
        :disabled="!canProceedToNextStep"
        @click="currentStep++"
      >
        Next
        <v-icon end>mdi-arrow-right</v-icon>
      </v-btn>
      <v-btn
        v-if="shouldShowCreateButton"
        color="success"
        :loading="creating"
        :disabled="!canCreateCategory"
        @click="handleCreate"
      >
        <v-icon start>mdi-check</v-icon>
        Create Category
      </v-btn>
    </v-card-actions>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import {
  wizardSteps,
  skipConfigurationTypes,
  getConfigComponent,
  isListType,
} from '../utils/categoryConfig.js';

// Import wizard components
import CategoryTypeSelector from './category-manager/CategoryTypeSelector.vue';

// Props
const props = defineProps({
  categories: {
    type: Array,
    default: () => [],
  },
  show: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits(['category-created', 'wizard-closed']);

// Local state
const creating = ref(false);
const currentStep = ref(1);
const showWizard = ref(false);
const formData = ref({
  name: '',
  categoryType: 'open-list',
  allowAI: true,
  typeConfig: {},
});
const formErrors = ref({ name: [] });

// Watch for show prop changes
watch(
  () => props.show,
  (newValue) => {
    showWizard.value = newValue;
    if (newValue) {
      resetForm();
    }
  }
);

// Computed
const canProceedToNextStep = computed(() =>
  currentStep.value === 1
    ? formData.value.name.trim().length >= 3 && formData.value.categoryType !== null
    : true
);

const canCreateCategory = computed(() => {
  const { name, categoryType, typeConfig } = formData.value;
  if (!name.trim() || !categoryType || currentStep.value !== 2) return false;

  return categoryType === 'open-list'
    ? typeConfig?.tags?.length >= 2
    : categoryType === 'fixed-list'
      ? typeConfig?.tags?.length >= 1
      : true;
});

const shouldShowNextButton = computed(
  () => currentStep.value === 1 && !skipConfigurationTypes.includes(formData.value.categoryType)
);

const shouldShowCreateButton = computed(
  () =>
    (currentStep.value === 1 && skipConfigurationTypes.includes(formData.value.categoryType)) ||
    currentStep.value === 2
);

// Methods
const handleCategoryNameInput = (e) => {
  const value = e.target.value;
  if (value?.length > 0) {
    const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
    if (capitalized !== value) formData.value.name = capitalized;
  }
};

const resetForm = () => {
  currentStep.value = 1;
  formData.value = { name: '', categoryType: 'open-list', allowAI: true, typeConfig: {} };
  formErrors.value = { name: [] };
};

const validateCategory = () => {
  const errors = { name: [] };
  const name = formData.value.name.trim();

  if (!name) errors.name.push('Category name is required');
  else if (name.length > 50) errors.name.push('Category name must be 50 characters or less');

  if (props.categories.some((cat) => cat.name.toLowerCase() === name.toLowerCase())) {
    errors.name.push('Category name already exists');
  }

  formErrors.value = errors;
  return errors.name.length === 0;
};

const handleCancel = () => {
  showWizard.value = false;
  emit('wizard-closed');
};

const handleCreate = async () => {
  if (!validateCategory()) return;

  creating.value = true;
  try {
    const categoryData = {
      name: formData.value.name.trim(),
      categoryType: formData.value.categoryType,
      typeConfig: { ...formData.value.typeConfig },
    };

    if (isListType(formData.value.categoryType) && formData.value.categoryType !== null) {
      categoryData.tags = formData.value.typeConfig.tags || [];
    }

    emit('category-created', categoryData);
    showWizard.value = false;
  } catch (error) {
    console.error('Failed to create category:', error);
  } finally {
    creating.value = false;
  }
};
</script>

<style scoped>
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
</style>
