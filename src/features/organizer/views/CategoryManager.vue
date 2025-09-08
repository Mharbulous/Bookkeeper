<template>
  <div class="category-manager">
    <!-- Header -->
    <div class="manager-header mb-6">
      <h2 class="text-h4 mb-2">Category Management</h2>
      <p class="text-body-1 text-medium-emphasis">
        Manage your document organization categories and their tag options.
      </p>
    </div>

    <!-- Add New Category -->
    <v-card class="mb-6" variant="outlined">
      <v-card-title>
        <v-icon class="mr-2">mdi-plus-circle</v-icon>
        Add New Category
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
        <div v-else class="category-creation-wizard">
          <v-stepper
            v-model="creationStep"
            :items="wizardSteps"
            class="creation-stepper"
            alt-labels
          >
            <!-- Step 1: Basic Information -->
            <template #item.1>
              <div class="basic-info-step">
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
                    />
                  </v-col>
                  
                  <v-col cols="12" md="6">
                    <CategoryTypeSelector v-model="newCategory.categoryType" />
                  </v-col>
                </v-row>

              </div>
            </template>

            <!-- Step 2: Type Configuration -->
            <template #item.2>
              <div class="type-config-step">
                <!-- Date Configuration -->
                <DateConfigForm
                  v-if="newCategory.categoryType === 'date'"
                  v-model="newCategory.typeConfig"
                />

                <!-- Currency Configuration -->
                <CurrencyConfigForm
                  v-else-if="newCategory.categoryType === 'currency'"
                  v-model="newCategory.typeConfig"
                />

                <!-- List Configuration -->
                <ListConfigForm
                  v-else-if="newCategory.categoryType === 'fixed-list' || newCategory.categoryType === 'open-list'"
                  v-model="newCategory.typeConfig"
                  :category-type="newCategory.categoryType"
                />

                <!-- Checkbox Configuration -->
                <CheckboxConfigForm
                  v-else-if="newCategory.categoryType === 'checkbox'"
                  v-model="newCategory.typeConfig"
                />

                <!-- Integer Configuration -->
                <IntegerConfigForm
                  v-else-if="newCategory.categoryType === 'integer'"
                  v-model="newCategory.typeConfig"
                />

                <!-- Float Configuration -->
                <FloatConfigForm
                  v-else-if="newCategory.categoryType === 'float'"
                  v-model="newCategory.typeConfig"
                />

                <!-- Textarea Configuration -->
                <TextareaConfigForm
                  v-else-if="newCategory.categoryType === 'textarea'"
                  v-model="newCategory.typeConfig"
                />

                <!-- Percentage Configuration -->
                <PercentageConfigForm
                  v-else-if="newCategory.categoryType === 'percentage'"
                  v-model="newCategory.typeConfig"
                />

                <!-- Unique String Configuration -->
                <UniqueStringConfigForm
                  v-else-if="newCategory.categoryType === 'unique-string'"
                  v-model="newCategory.typeConfig"
                />

                <!-- Regex Configuration -->
                <RegexConfigForm
                  v-else-if="newCategory.categoryType === 'regex'"
                  v-model="newCategory.typeConfig"
                />

                <!-- Counter Configuration -->
                <CounterConfigForm
                  v-else-if="newCategory.categoryType === 'counter'"
                  v-model="newCategory.typeConfig"
                />

                <!-- Fallback -->
                <div v-else class="text-center py-6">
                  <v-icon size="48" color="grey">mdi-cog-outline</v-icon>
                  <p class="text-body-1 mt-2">Select a category type to configure options.</p>
                </div>
              </div>
            </template>

          </v-stepper>

          <!-- Wizard Navigation -->
          <v-card-actions class="px-0 pt-4">
            <v-btn
              variant="outlined"
              @click="cancelCategoryCreation"
            >
              Cancel
            </v-btn>
            
            <v-spacer />

            <v-btn
              v-if="creationStep > 1"
              variant="outlined"
              @click="creationStep--"
            >
              <v-icon start>mdi-arrow-left</v-icon>
              Previous
            </v-btn>

            <v-btn
              v-if="creationStep === 1 && !skipConfigurationTypes.includes(newCategory.categoryType)"
              color="primary"
              :disabled="!canProceedToNextStep"
              @click="creationStep++"
            >
              Next
              <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>

            <!-- Skip configuration step for simple categories -->
            <v-btn
              v-if="creationStep === 1 && skipConfigurationTypes.includes(newCategory.categoryType)"
              color="success"
              :loading="creating"
              :disabled="!canProceedToNextStep"
              @click="createCategory"
            >
              <v-icon start>mdi-check</v-icon>
              Create Category
            </v-btn>

            <v-btn
              v-else-if="creationStep === 2"
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
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-6">
          <v-progress-circular indeterminate />
          <p class="mt-2">Loading categories...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="categories.length === 0" class="text-center py-6">
          <v-icon size="64" color="grey">mdi-folder-outline</v-icon>
          <p class="text-h6 mt-2">No categories yet</p>
          <p class="text-body-2 text-medium-emphasis">Create your first category above to get started.</p>
        </div>

        <!-- Categories List -->
        <div v-else>
          <v-expansion-panels v-model="expandedPanels" multiple>
            <v-expansion-panel
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
            >
              <v-expansion-panel-title>
                <div class="d-flex align-center">
                  <v-icon :color="getCategoryTypeColor(category.categoryType)" class="mr-3">{{ getCategoryTypeIcon(category.categoryType) }}</v-icon>
                  <div class="flex-grow-1">
                    <div class="d-flex align-center">
                      <div class="font-weight-medium mr-2">{{ category.name }}</div>
                      <v-chip
                        :color="getCategoryTypeColor(category.categoryType)"
                        size="x-small"
                        variant="tonal"
                        class="type-badge"
                      >
                        {{ getCategoryTypeText(category.categoryType) }}
                      </v-chip>
                    </div>
                    <div class="text-caption text-medium-emphasis mt-1">
                      {{ getCategoryDescription(category) }}
                    </div>
                  </div>
                </div>
                <template #actions="{ expanded }">
                  <v-btn
                    icon
                    variant="text"
                    size="small"
                    :color="expanded ? 'primary' : 'default'"
                  >
                    <v-icon>{{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                  </v-btn>
                </template>
              </v-expansion-panel-title>

              <v-expansion-panel-text>
                <!-- Category Details -->
                <div class="category-details">
                  <!-- Category Type Info -->
                  <div class="mb-4">
                    <h4 class="text-subtitle-2 mb-2">Category Configuration:</h4>
                    <div class="type-info-cards">
                      <!-- Date Category Info -->
                      <v-card
                        v-if="category.categoryType === 'date'"
                        variant="tonal"
                        color="purple"
                        class="mb-2"
                      >
                        <v-card-text class="py-2">
                          <div class="d-flex align-center">
                            <v-icon color="purple" class="mr-2">mdi-calendar</v-icon>
                            <div class="text-body-2">
                              <strong>Date Format:</strong> {{ category.typeConfig?.dateFormat || 'YYYY-MM-DD' }}
                              <span v-if="category.typeConfig?.allowPast && category.typeConfig?.allowFuture"> • Any date allowed</span>
                              <span v-else-if="category.typeConfig?.allowPast"> • Past dates only</span>
                              <span v-else-if="category.typeConfig?.allowFuture"> • Future dates only</span>
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>

                      <!-- Currency Category Info -->
                      <v-card
                        v-else-if="category.categoryType === 'currency'"
                        variant="tonal"
                        color="green"
                        class="mb-2"
                      >
                        <v-card-text class="py-2">
                          <div class="d-flex align-center">
                            <v-icon color="green" class="mr-2">mdi-currency-usd</v-icon>
                            <div class="text-body-2">
                              <strong>Default:</strong> {{ category.typeConfig?.defaultCurrency || 'USD' }}
                              • <strong>{{ (category.typeConfig?.supportedCurrencies || []).length || 1 }} currencies</strong>
                              • <strong>{{ category.typeConfig?.decimalPlaces || 2 }} decimals</strong>
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>

                      <!-- Fixed List Category Info -->
                      <v-card
                        v-else-if="category.categoryType === 'fixed-list'"
                        variant="tonal"
                        color="grey-darken-4"
                        class="mb-2"
                      >
                        <v-card-text class="py-2">
                          <div class="d-flex align-center">
                            <v-icon color="grey-darken-4" class="mr-2">mdi-format-list-bulleted</v-icon>
                            <div class="text-body-2">
                              <strong>Fixed options only</strong> • No AI expansion • <strong>{{ (category.tags || []).length }} predefined tags</strong>
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>

                      <!-- Open List Category Info -->
                      <v-card
                        v-else-if="category.categoryType === 'open-list'"
                        variant="tonal"
                        color="blue"
                        class="mb-2"
                      >
                        <v-card-text class="py-2">
                          <div class="d-flex align-center">
                            <v-icon color="blue" class="mr-2">mdi-robot</v-icon>
                            <div class="text-body-2">
                              <strong>AI-expandable</strong> • <strong>{{ Math.round((category.typeConfig?.aiConfidenceThreshold || 0.7) * 100) }}% confidence threshold</strong> • <strong>{{ (category.tags || []).length }} initial tags</strong>
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>

                      <!-- Checkbox Category Info -->
                      <v-card
                        v-else-if="category.categoryType === 'checkbox'"
                        variant="tonal"
                        color="orange"
                        class="mb-2"
                      >
                        <v-card-text class="py-2">
                          <div class="d-flex align-center">
                            <v-icon color="orange" class="mr-2">mdi-checkbox-outline</v-icon>
                            <div class="text-body-2">
                              <strong>{{ category.typeConfig?.displayStyle || 'checkbox' }}</strong> • 
                              Default: {{ category.typeConfig?.defaultValue ? category.typeConfig?.trueLabel || 'Yes' : category.typeConfig?.falseLabel || 'No' }}
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>

                      <!-- Integer Category Info -->
                      <v-card
                        v-else-if="category.categoryType === 'integer'"
                        variant="tonal"
                        color="indigo"
                        class="mb-2"
                      >
                        <v-card-text class="py-2">
                          <div class="d-flex align-center">
                            <v-icon color="indigo" class="mr-2">mdi-numeric</v-icon>
                            <div class="text-body-2">
                              <strong>Integer input</strong> • 
                              Range: {{ formatRange(category.typeConfig?.minValue, category.typeConfig?.maxValue) }} • 
                              Step: {{ category.typeConfig?.step || 1 }}
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>

                      <!-- Float Category Info -->
                      <v-card
                        v-else-if="category.categoryType === 'float'"
                        variant="tonal"
                        color="teal"
                        class="mb-2"
                      >
                        <v-card-text class="py-2">
                          <div class="d-flex align-center">
                            <v-icon color="teal" class="mr-2">mdi-decimal</v-icon>
                            <div class="text-body-2">
                              <strong>Decimal input</strong> • 
                              {{ category.typeConfig?.decimalPlaces || 2 }} decimals • 
                              Range: {{ formatRange(category.typeConfig?.minValue, category.typeConfig?.maxValue) }}
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>

                      <!-- Textarea Category Info -->
                      <v-card
                        v-else-if="category.categoryType === 'textarea'"
                        variant="tonal"
                        color="brown"
                        class="mb-2"
                      >
                        <v-card-text class="py-2">
                          <div class="d-flex align-center">
                            <v-icon color="brown" class="mr-2">mdi-text-box</v-icon>
                            <div class="text-body-2">
                              <strong>Multi-line text</strong> • 
                              {{ category.typeConfig?.rows || 3 }} rows
                              <span v-if="category.typeConfig?.maxLength"> • {{ category.typeConfig.maxLength }} char limit</span>
                              <span v-if="category.typeConfig?.required"> • Required</span>
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>

                      <!-- Percentage Category Info -->
                      <v-card
                        v-else-if="category.categoryType === 'percentage'"
                        variant="tonal"
                        color="pink"
                        class="mb-2"
                      >
                        <v-card-text class="py-2">
                          <div class="d-flex align-center">
                            <v-icon color="pink" class="mr-2">mdi-percent</v-icon>
                            <div class="text-body-2">
                              <strong>{{ category.typeConfig?.inputMethod === 'slider' ? 'Slider' : 'Number' }} input</strong> • 
                              {{ category.typeConfig?.decimalPlaces || 1 }} decimals • 
                              Step: {{ category.typeConfig?.step || '0.1' }}%
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>

                      <!-- Unique String Category Info -->
                      <v-card
                        v-else-if="category.categoryType === 'unique-string'"
                        variant="tonal"
                        color="deep-purple"
                        class="mb-2"
                      >
                        <v-card-text class="py-2">
                          <div class="d-flex align-center">
                            <v-icon color="deep-purple" class="mr-2">mdi-key-variant</v-icon>
                            <div class="text-body-2">
                              <strong>Unique strings</strong> • 
                              {{ category.typeConfig?.minLength || 1 }}-{{ category.typeConfig?.maxLength || 256 }} chars • 
                              {{ category.typeConfig?.caseSensitive ? 'Case sensitive' : 'Case insensitive' }}
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>

                      <!-- Regex Category Info -->
                      <v-card
                        v-else-if="category.categoryType === 'regex'"
                        variant="tonal"
                        color="red"
                        class="mb-2"
                      >
                        <v-card-text class="py-2">
                          <div class="d-flex align-center">
                            <v-icon color="red" class="mr-2">mdi-regex</v-icon>
                            <div class="text-body-2">
                              <strong>Pattern validation</strong> • 
                              <code class="text-caption">{{ (category.typeConfig?.pattern || '').length > 30 ? (category.typeConfig?.pattern || '').substring(0, 30) + '...' : category.typeConfig?.pattern || 'No pattern' }}</code>
                              <span v-if="category.typeConfig?.required"> • Required</span>
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>

                      <!-- Counter Category Info -->
                      <v-card
                        v-else-if="category.categoryType === 'counter'"
                        variant="tonal"
                        color="cyan"
                        class="mb-2"
                      >
                        <v-card-text class="py-2">
                          <div class="d-flex align-center">
                            <v-icon color="cyan" class="mr-2">mdi-counter</v-icon>
                            <div class="text-body-2">
                              <strong>{{ getCounterTypeLabel(category.typeConfig?.sequenceType) }}</strong> • 
                              Start: {{ category.typeConfig?.startValue || '1' }}
                              <span v-if="category.typeConfig?.prefix || category.typeConfig?.suffix"> • Format: {{ category.typeConfig?.prefix }}N{{ category.typeConfig?.suffix }}</span>
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>

                      <!-- Legacy/Unknown Type -->
                      <v-card
                        v-else
                        variant="tonal"
                        color="grey"
                        class="mb-2"
                      >
                        <v-card-text class="py-2">
                          <div class="d-flex align-center">
                            <v-icon color="grey" class="mr-2">mdi-folder</v-icon>
                            <div class="text-body-2">
                              <strong>Legacy category</strong> • Basic tag list functionality
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>
                    </div>
                  </div>

                  <!-- Tags List (for list-type categories only) -->
                  <div v-if="category.categoryType === 'fixed-list' || category.categoryType === 'open-list' || !category.categoryType" class="mb-4">
                    <h4 class="text-subtitle-2 mb-2">Available Tags:</h4>
                    <div v-if="category.tags && category.tags.length > 0" class="tags-list">
                      <v-chip
                        v-for="tag in category.tags"
                        :key="tag.id || tag.name"
                        :color="getCategoryTypeColor(category.categoryType)"
                        size="small"
                        class="ma-1"
                      >
                        <v-icon start size="14">mdi-tag</v-icon>
                        {{ tag.name }}
                        <v-icon v-if="tag.aiGenerated" end size="12" class="ml-1">mdi-robot</v-icon>
                      </v-chip>
                    </div>
                    <p v-else class="text-body-2 text-medium-emphasis">
                      {{ category.categoryType === 'fixed-list' ? 'No tags defined yet.' : 
                         category.categoryType === 'open-list' ? 'No initial tags defined. AI can create tags when processing documents.' :
                         'No tags defined yet.' }}
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
        </div>
      </v-card-text>
    </v-card>

    <!-- Snackbar for notifications -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="4000"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useOrganizerStore } from '../stores/organizer.js';
import { getAutomaticTagColor } from '../utils/automaticTagColors.js';

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
  typeConfig: {}
});

const newCategoryErrors = ref({
  name: []
});

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
});

// Wizard configuration
const wizardSteps = [
  { title: 'Basic Info', value: 1, icon: 'mdi-information-outline' },
  { title: 'Configuration', value: 2, icon: 'mdi-cog-outline' }
];

// Categories that don't need configuration step
const skipConfigurationTypes = ['currency'];

// Computed
const canCreateCategory = computed(() => {
  return newCategory.value.name.trim().length > 0 && 
         newCategory.value.categoryType !== null &&
         creationStep.value === 2; // Only allow creation on final step
});

const canProceedToNextStep = computed(() => {
  switch (creationStep.value) {
    case 1: // Basic info - name, type, color
      return newCategory.value.name.trim().length > 0 && 
             newCategory.value.categoryType !== null;
    case 2: // Configuration
      return true; // Type-specific validation handled in components
    default:
      return true;
  }
});

// Methods
const startCategoryCreation = () => {
  showCreationWizard.value = true;
  creationStep.value = 1;
  // Reset form
  newCategory.value = {
    name: '',
    categoryType: 'open-list',
    typeConfig: {}
  };
  newCategoryErrors.value = { name: [] };
};

const cancelCategoryCreation = () => {
  showCreationWizard.value = false;
  creationStep.value = 1;
  // Reset form
  newCategory.value = {
    name: '',
    categoryType: 'open-list',
    typeConfig: {}
  };
  newCategoryErrors.value = { name: [] };
};

const validateNewCategory = () => {
  const errors = { name: [] };
  
  if (!newCategory.value.name.trim()) {
    errors.name.push('Category name is required');
  } else if (newCategory.value.name.trim().length > 50) {
    errors.name.push('Category name must be 50 characters or less');
  }
  
  // Check for duplicate names
  if (categories.value.some(cat => 
    cat.name.toLowerCase() === newCategory.value.name.trim().toLowerCase()
  )) {
    errors.name.push('Category name already exists');
  }
  
  newCategoryErrors.value = errors;
  return errors.name.length === 0;
};

const createCategory = async () => {
  if (!validateNewCategory()) return;
  
  creating.value = true;
  try {
    // Determine color based on category type
    const categoryColor = getCategoryTypeColorValue(newCategory.value.categoryType);
    
    const categoryData = {
      name: newCategory.value.name.trim(),
      categoryType: newCategory.value.categoryType,
      typeConfig: { ...newCategory.value.typeConfig },
      color: categoryColor
    };

    // Only include tags for list types
    if (newCategory.value.categoryType === 'fixed-list' || newCategory.value.categoryType === 'open-list') {
      categoryData.tags = newCategory.value.typeConfig.tags || [];
    }
    
    console.log('[CategoryManager] Creating category with data:', categoryData);
    
    await organizerStore.createCategory(categoryData);
    
    const categoryName = newCategory.value.name.trim();
    
    // Reset wizard
    cancelCategoryCreation();
    
    showNotification(`Category "${categoryName}" created successfully`, 'success');
  } catch (error) {
    console.error('Failed to create category:', error);
    showNotification('Failed to create category: ' + error.message, 'error');
  } finally {
    creating.value = false;
  }
};

const editCategory = (category) => {
  // TODO: Implement category editing dialog
  showNotification('Category editing coming soon!', 'info');
  console.log('Edit category:', category);
};

const deleteCategory = async (category) => {
  if (!confirm(`Are you sure you want to delete the "${category.name}" category?`)) {
    return;
  }
  
  try {
    await organizerStore.deleteCategory(category.id);
    showNotification(`Category "${category.name}" deleted successfully`, 'success');
  } catch (error) {
    console.error('Failed to delete category:', error);
    showNotification('Failed to delete category: ' + error.message, 'error');
  }
};

const showNotification = (message, color = 'success') => {
  snackbar.value = {
    show: true,
    message,
    color
  };
};

// Expose color utility for template
const getAutomaticTagColorForTemplate = getAutomaticTagColor;

// Category type utilities for template
const getCategoryTypeColor = (categoryType) => {
  switch (categoryType) {
    case 'date': return 'purple';
    case 'currency': return 'green';
    case 'fixed-list': return 'grey-darken-4';
    case 'open-list': return 'blue';
    case 'checkbox': return 'orange';
    case 'integer': return 'indigo';
    case 'float': return 'teal';
    case 'textarea': return 'brown';
    case 'percentage': return 'pink';
    case 'unique-string': return 'deep-purple';
    case 'regex': return 'red';
    case 'counter': return 'cyan';
    default: return 'grey';
  }
};

const getCategoryTypeColorValue = (categoryType) => {
  switch (categoryType) {
    case 'date': return '#7b1fa2'; // Purple
    case 'currency': return '#388e3c'; // Green
    case 'fixed-list': return '#424242'; // Black/Dark Grey
    case 'open-list': return '#1976d2'; // Blue
    case 'checkbox': return '#ff9800'; // Orange
    case 'integer': return '#3f51b5'; // Indigo
    case 'float': return '#009688'; // Teal
    case 'textarea': return '#795548'; // Brown
    case 'percentage': return '#e91e63'; // Pink
    case 'unique-string': return '#673ab7'; // Deep Purple
    case 'regex': return '#f44336'; // Red
    case 'counter': return '#00bcd4'; // Cyan
    default: return '#9e9e9e'; // Grey
  }
};


const getCategoryTypeIcon = (categoryType) => {
  switch (categoryType) {
    case 'date': return 'mdi-calendar';
    case 'currency': return 'mdi-currency-usd';
    case 'fixed-list': return 'mdi-format-list-bulleted';
    case 'open-list': return 'mdi-playlist-plus';
    case 'checkbox': return 'mdi-checkbox-outline';
    case 'integer': return 'mdi-numeric';
    case 'float': return 'mdi-decimal';
    case 'textarea': return 'mdi-text-box';
    case 'percentage': return 'mdi-percent';
    case 'unique-string': return 'mdi-key-variant';
    case 'regex': return 'mdi-regex';
    case 'counter': return 'mdi-counter';
    default: return 'mdi-folder';
  }
};

const getCategoryTypeText = (categoryType) => {
  switch (categoryType) {
    case 'date': return 'Date';
    case 'currency': return 'Currency';
    case 'fixed-list': return 'Fixed List';
    case 'open-list': return 'Open List';
    case 'checkbox': return 'Checkbox';
    case 'integer': return 'Integer';
    case 'float': return 'Float';
    case 'textarea': return 'Textarea';
    case 'percentage': return 'Percentage';
    case 'unique-string': return 'Unique String';
    case 'regex': return 'Regex';
    case 'counter': return 'Counter';
    default: return 'Legacy';
  }
};

const getCategoryDescription = (category) => {
  switch (category.categoryType) {
    case 'date':
      const format = category.typeConfig?.dateFormat || 'YYYY-MM-DD';
      const pastFuture = category.typeConfig?.allowPast && category.typeConfig?.allowFuture ? 'any dates' :
                        category.typeConfig?.allowPast ? 'past dates only' :
                        category.typeConfig?.allowFuture ? 'future dates only' : 'no dates';
      return `Calendar picker • ${format} format • ${pastFuture}`;
    
    case 'currency':
      const defaultCurrency = category.typeConfig?.defaultCurrency || 'USD';
      const currencyCount = (category.typeConfig?.supportedCurrencies || []).length || 1;
      const decimals = category.typeConfig?.decimalPlaces || 2;
      return `Currency selector • ${currencyCount} currencies • ${decimals} decimal places`;
    
    case 'fixed-list':
      const fixedTagCount = (category.tags || []).length;
      return `Fixed dropdown • ${fixedTagCount} predefined options • No AI expansion`;
    
    case 'open-list':
      const openTagCount = (category.tags || []).length;
      const threshold = Math.round((category.typeConfig?.aiConfidenceThreshold || 0.7) * 100);
      return `Smart dropdown • ${openTagCount} initial options • AI expansion at ${threshold}% confidence`;
    
    case 'checkbox':
      const displayStyle = category.typeConfig?.displayStyle || 'checkbox';
      const defaultState = category.typeConfig?.defaultValue ? 'checked' : 'unchecked';
      return `${displayStyle.charAt(0).toUpperCase() + displayStyle.slice(1)} input • Default: ${defaultState}`;
    
    case 'integer':
      const intRange = formatRange(category.typeConfig?.minValue, category.typeConfig?.maxValue);
      const intStep = category.typeConfig?.step || 1;
      return `Whole number input • Range: ${intRange} • Step: ${intStep}`;
    
    case 'float':
      const floatRange = formatRange(category.typeConfig?.minValue, category.typeConfig?.maxValue);
      const floatDecimals = category.typeConfig?.decimalPlaces || 2;
      return `Decimal input • ${floatDecimals} decimal places • Range: ${floatRange}`;
    
    case 'textarea':
      const rows = category.typeConfig?.rows || 3;
      const maxLength = category.typeConfig?.maxLength;
      const required = category.typeConfig?.required ? ' • Required' : '';
      return `Multi-line text • ${rows} rows${maxLength ? ` • ${maxLength} char limit` : ''}${required}`;
    
    case 'percentage':
      const inputMethod = category.typeConfig?.inputMethod === 'slider' ? 'Slider' : 'Number';
      const percentDecimals = category.typeConfig?.decimalPlaces || 1;
      const percentStep = category.typeConfig?.step || (percentDecimals === 0 ? 5 : 0.1);
      return `${inputMethod} input • ${percentDecimals} decimals • Step: ${percentStep}%`;
    
    case 'unique-string':
      const minLen = category.typeConfig?.minLength || 1;
      const maxLen = category.typeConfig?.maxLength || 256;
      const caseSensitive = category.typeConfig?.caseSensitive ? 'case sensitive' : 'case insensitive';
      return `Unique text • ${minLen}-${maxLen} characters • ${caseSensitive}`;
    
    case 'regex':
      const pattern = category.typeConfig?.pattern || 'No pattern';
      const patternPreview = pattern.length > 30 ? pattern.substring(0, 30) + '...' : pattern;
      const regexRequired = category.typeConfig?.required ? ' • Required' : '';
      return `Pattern validation • ${patternPreview}${regexRequired}`;
    
    case 'counter':
      const sequenceType = getCounterTypeLabel(category.typeConfig?.sequenceType);
      const startValue = category.typeConfig?.startValue || '1';
      const hasFormat = category.typeConfig?.prefix || category.typeConfig?.suffix;
      return `${sequenceType} • Start: ${startValue}${hasFormat ? ' • Custom format' : ''}`;
    
    default:
      const legacyTagCount = (category.tags || []).length;
      return `Basic tag list • ${legacyTagCount} tags`;
  }
};

// Helper functions for template
const formatRange = (min, max) => {
  if (min !== null && min !== undefined && max !== null && max !== undefined) {
    return `${min} to ${max}`;
  } else if (min !== null && min !== undefined) {
    return `${min} and above`;
  } else if (max !== null && max !== undefined) {
    return `${max} and below`;
  } else {
    return 'Any value';
  }
};

const getCounterTypeLabel = (sequenceType) => {
  switch (sequenceType) {
    case 'numeric': return 'Numeric sequence';
    case 'letters': return 'Letter sequence';
    case 'roman-lower': return 'Roman numerals (lowercase)';
    case 'roman-upper': return 'Roman numerals (uppercase)';
    default: return 'Auto sequence';
  }
};

// Lifecycle
onMounted(async () => {
  // Ensure categories are loaded
  if (!organizerStore.isInitialized || categories.value.length === 0) {
    console.log('[CategoryManager] Initializing organizer store for categories...');
    await organizerStore.initialize();
  }
  
  // Expand first category by default
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

.manager-header {
  text-align: center;
}

.category-details {
  padding: 16px 0;
}

.tags-list {
  min-height: 40px;
}

.type-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  height: 20px;
}

.type-info-cards {
  margin-top: 8px;
}

.type-info-cards .v-card {
  border-radius: 6px;
}

.type-info-cards .v-card-text {
  padding: 8px 12px;
}

.category-actions {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 16px;
  margin-top: 16px;
}
</style>