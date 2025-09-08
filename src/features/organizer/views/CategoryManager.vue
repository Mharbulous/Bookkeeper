<!-- Decomposed CategoryManager - Main orchestration component -->
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
      <v-card-title :class="{ 'text-primary': showCreationWizard }">
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

        <!-- Category Creation Wizard Component -->
        <CategoryCreationWizard
          :categories="categories"
          :show="showCreationWizard"
          @category-created="handleCategoryCreated"
          @wizard-closed="handleWizardClosed"
        />
      </v-card-text>
    </v-card>

    <!-- Existing Categories -->
    <v-card variant="outlined">
      <v-card-title>
        <v-icon class="mr-2">mdi-folder-multiple</v-icon>
        Existing Categories ({{ categories.length }})
      </v-card-title>
      <v-card-text>
        <!-- Category List Component -->
        <CategoryList
          :categories="categories"
          :loading="loading"
          @edit-category="handleEditCategory"
          @delete-category="handleDeleteCategory"
        />
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
import { typeConfig } from '../utils/categoryConfig.js';

// Import decomposed components
import CategoryCreationWizard from '../components/CategoryCreationWizard.vue';
import CategoryList from '../components/CategoryList.vue';

// Store
const organizerStore = useOrganizerStore();
const { categories, loading } = storeToRefs(organizerStore);

// Local state
const showCreationWizard = ref(false);
const snackbar = ref({ show: false, message: '', color: 'success' });

// Computed
const wizardTitle = computed(() => {
  return showCreationWizard.value ? 'Add New Category' : 'Add New Category';
});

// Methods
const startCategoryCreation = () => {
  showCreationWizard.value = true;
};

const handleCategoryCreated = async (categoryData) => {
  try {
    const type = categoryData.categoryType;
    const colorValue = typeConfig[type]?.color;
    const color = colorValue
      ? getComputedStyle(document.documentElement)
          .getPropertyValue(`--v-theme-${colorValue}`)
          ?.trim() || '#9e9e9e'
      : '#9e9e9e';

    const finalCategoryData = {
      ...categoryData,
      color,
    };

    await organizerStore.createCategory(finalCategoryData);
    showNotification(`Category "${categoryData.name}" created successfully`, 'success');
    showCreationWizard.value = false;
  } catch (error) {
    console.error('Failed to create category:', error);
    showNotification('Failed to create category: ' + error.message, 'error');
  }
};

const handleWizardClosed = () => {
  showCreationWizard.value = false;
};

const handleEditCategory = (category) => {
  showNotification('Category editing coming soon!', 'info');
  console.log('Edit category:', category);
};

const handleDeleteCategory = async (category) => {
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
});
</script>

<style scoped>
.category-manager {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
</style>
