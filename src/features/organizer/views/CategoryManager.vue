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
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="newCategory.name"
              label="Category Name"
              variant="outlined"
              density="compact"
              :error-messages="newCategoryErrors.name"
              placeholder="e.g., Project Code"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="newCategory.color"
              label="Category Color"
              variant="outlined"
              density="compact"
              type="color"
              :error-messages="newCategoryErrors.color"
            />
          </v-col>
          <v-col cols="12" md="3" class="d-flex align-center">
            <v-btn
              color="primary"
              :loading="creating"
              :disabled="!canCreateCategory"
              @click="createCategory"
            >
              <v-icon start>mdi-plus</v-icon>
              Create Category
            </v-btn>
          </v-col>
        </v-row>
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
                  <v-icon :color="category.color" class="mr-3">mdi-folder</v-icon>
                  <div>
                    <div class="font-weight-medium">{{ category.name }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ (category.tags || []).length }} tags
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
                  <!-- Tags List -->
                  <div class="mb-4">
                    <h4 class="text-subtitle-2 mb-2">Available Tags:</h4>
                    <div v-if="category.tags && category.tags.length > 0" class="tags-list">
                      <v-chip
                        v-for="tag in category.tags"
                        :key="tag.id || tag.name"
                        :color="tag.color || category.color"
                        size="small"
                        class="ma-1"
                      >
                        <v-icon start size="14">mdi-tag</v-icon>
                        {{ tag.name }}
                      </v-chip>
                    </div>
                    <p v-else class="text-body-2 text-medium-emphasis">No tags defined yet.</p>
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

// Store
const organizerStore = useOrganizerStore();
const { categories, loading } = storeToRefs(organizerStore);

// Local state
const creating = ref(false);
const expandedPanels = ref([]);

const newCategory = ref({
  name: '',
  color: '#1976d2'
});

const newCategoryErrors = ref({
  name: [],
  color: []
});

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
});

// Computed
const canCreateCategory = computed(() => {
  return newCategory.value.name.trim().length > 0 && 
         newCategory.value.color.match(/^#[0-9A-Fa-f]{6}$/);
});

// Methods
const validateNewCategory = () => {
  const errors = { name: [], color: [] };
  
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
  
  if (!newCategory.value.color.match(/^#[0-9A-Fa-f]{6}$/)) {
    errors.color.push('Please select a valid color');
  }
  
  newCategoryErrors.value = errors;
  return errors.name.length === 0 && errors.color.length === 0;
};

const createCategory = async () => {
  if (!validateNewCategory()) return;
  
  creating.value = true;
  try {
    await organizerStore.createCategory({
      name: newCategory.value.name.trim(),
      color: newCategory.value.color,
      tags: [] // Start with empty tags, can be added later
    });
    
    // Reset form
    newCategory.value = {
      name: '',
      color: '#1976d2'
    };
    newCategoryErrors.value = { name: [], color: [] };
    
    showNotification(`Category "${newCategory.value.name}" created successfully`, 'success');
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

.category-actions {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 16px;
  margin-top: 16px;
}
</style>