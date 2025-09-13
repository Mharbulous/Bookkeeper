<template>
  <div class="category-creation-wizard">
    <div class="text-center mb-6">
      <h2 class="text-h4 mb-2">Create New Category</h2>
      <p class="text-body-1 text-medium-emphasis">
        Set up a new category to organize your documents.
      </p>
    </div>

    <v-card variant="outlined" class="mx-auto" style="max-width: 800px;">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-plus-circle</v-icon>
        Category Details
        <v-spacer />
        <v-btn
          variant="text"
          icon
          :to="{ name: 'category-manager' }"
          color="default"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      
      <v-card-text class="pt-6">
        <v-form @submit.prevent="createCategory">
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="newCategory.name"
                label="Category Name"
                variant="outlined"
                density="comfortable"
                :error-messages="newCategoryErrors.name"
                placeholder="e.g., Project Code, Invoices, Tax Documents"
                hint="Choose a descriptive name for your category"
                persistent-hint
                autofocus
                @input="capitalizeFirstLetters"
              />
            </v-col>

            <v-col cols="12">
              <v-select
                v-model="newCategory.type"
                label="Category Type"
                variant="outlined"
                density="comfortable"
                :error-messages="newCategoryErrors.type"
                :items="categoryTypeOptions"
                item-title="title"
                item-value="value"
                placeholder="Select category type"
                hint="Choose how this category will organize data"
                persistent-hint
              >
                <template #selection="{ item }">
                  <div class="d-flex align-center">
                    <v-icon :color="item.raw.color" size="20" class="mr-2">
                      {{ item.raw.icon }}
                    </v-icon>
                    <span>{{ item.raw.title }}</span>
                  </div>
                </template>
                <template #item="{ props, item }">
                  <v-list-item v-bind="props" :title="item.raw.title">
                    <template #prepend>
                      <v-icon :color="item.raw.color" size="20">
                        {{ item.raw.icon }}
                      </v-icon>
                    </template>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>

            <v-col cols="12">
              <div class="text-subtitle-2 mb-3">Color Preview</div>
              <div class="d-flex align-center">
                <v-icon 
                  :color="previewColor" 
                  size="32" 
                  class="mr-3"
                >
                  mdi-folder
                </v-icon>
                <div>
                  <div class="font-weight-medium">{{ newCategory.name || 'Category Name' }}</div>
                  <div class="text-caption text-medium-emphasis">
                    Your category will use this color automatically
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-card-actions class="px-6 pb-6">
        <v-btn
          variant="outlined"
          :to="{ name: 'category-manager' }"
          class="mr-3"
        >
          <v-icon start>mdi-arrow-left</v-icon>
          Back to Categories
        </v-btn>
        
        <v-spacer />
        
        <v-btn
          color="primary"
          :loading="creating"
          :disabled="!newCategory.name.trim() || !newCategory.type"
          @click="createCategory"
          size="large"
        >
          <v-icon start>mdi-plus</v-icon>
          Create Category
        </v-btn>
      </v-card-actions>
    </v-card>

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
import { useRouter } from 'vue-router';
import { useOrganizerStore } from '../stores/organizer.js';
import { getAutomaticTagColor } from '../utils/automaticTagColors.js';

const router = useRouter();
const organizerStore = useOrganizerStore();
const { categories } = storeToRefs(organizerStore);

const creating = ref(false);
const newCategory = ref({ name: '', type: 'Fixed List' });
const newCategoryErrors = ref({ name: [], type: [] });

const categoryTypeOptions = [
  {
    title: 'Fixed List',
    value: 'Fixed List',
    icon: 'mdi-format-list-bulleted',
    color: '#1976d2' // Blue
  },
  {
    title: 'Open List',
    value: 'Open List',
    icon: 'mdi-playlist-plus',
    color: '#1565c0' // Darker blue (similar tone to Fixed List)
  },
  {
    title: 'Currency',
    value: 'Currency',
    icon: 'mdi-currency-usd',
    color: '#388e3c' // Green
  },
  {
    title: 'Date',
    value: 'Date',
    icon: 'mdi-calendar',
    color: '#f57c00' // Orange
  },
  {
    title: 'Timestamp',
    value: 'Timestamp',
    icon: 'mdi-clock-outline',
    color: '#7b1fa2' // Purple
  },
  {
    title: 'TextArea',
    value: 'TextArea',
    icon: 'mdi-text-box-outline',
    color: '#5d4037' // Brown
  },
  {
    title: 'Sequence',
    value: 'Sequence',
    icon: 'mdi-numeric',
    color: '#00796b' // Teal
  },
  {
    title: 'Regex',
    value: 'Regex',
    icon: 'mdi-regex',
    color: '#c62828' // Red
  }
];
const snackbar = ref({ show: false, message: '', color: 'success' });

const previewColor = computed(() => {
  return getAutomaticTagColor(categories.value.length);
});

const showNotification = (message, color = 'success') => {
  snackbar.value = { show: true, message, color };
};

const capitalizeFirstLetters = (event) => {
  const input = event.target.value;
  const capitalized = input.charAt(0).toUpperCase() + input.slice(1);
  newCategory.value.name = capitalized;
};

const validateNewCategory = () => {
  const nameErrors = [];
  const typeErrors = [];
  const name = newCategory.value.name.trim();
  const type = newCategory.value.type;

  // Validate name
  if (!name) {
    nameErrors.push('Category name is required');
  } else if (name.length > 50) {
    nameErrors.push('Category name must be 50 characters or less');
  } else if (categories.value.some((cat) => cat.name.toLowerCase() === name.toLowerCase())) {
    nameErrors.push('Category name already exists');
  }

  // Validate type
  if (!type) {
    typeErrors.push('Category type is required');
  } else if (!categoryTypeOptions.find(option => option.value === type)) {
    typeErrors.push('Please select a valid category type');
  }

  newCategoryErrors.value.name = nameErrors;
  newCategoryErrors.value.type = typeErrors;

  return nameErrors.length === 0 && typeErrors.length === 0;
};

const createCategory = async () => {
  if (!validateNewCategory()) return;

  creating.value = true;
  try {
    const name = newCategory.value.name.trim();
    const type = newCategory.value.type;
    await organizerStore.createCategory({
      name,
      type,
      color: previewColor.value,
      tags: [],
    });

    showNotification(`Category "${name}" created successfully`, 'success');
    
    // Navigate back to category manager after a brief delay
    setTimeout(() => {
      router.push({ name: 'category-manager' });
    }, 1500);
    
  } catch (error) {
    showNotification('Failed to create category: ' + error.message, 'error');
    creating.value = false;
  }
};

onMounted(async () => {
  if (!organizerStore.isInitialized || !categories.value.length) {
    console.log('[CategoryCreationWizard] Initializing organizer store...');
    await organizerStore.initialize();
  }
});
</script>

<style scoped>
.category-creation-wizard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>