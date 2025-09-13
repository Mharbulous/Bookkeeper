<template>
  <div class="category-manager">
    <div class="text-center mb-6">
      <h2 class="text-h4 mb-2">Category Management</h2>
      <p class="text-body-1 text-medium-emphasis">
        Manage your document organization categories and their tag options.
      </p>
    </div>

    <v-card class="mb-6" variant="outlined">
      <v-card-title>
        <v-icon class="mr-2">mdi-plus-circle</v-icon>
        Add New Category
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="newCategory.name"
              label="Category Name"
              variant="outlined"
              density="compact"
              :error-messages="newCategoryErrors.name"
              placeholder="e.g., Project Code"
            />
          </v-col>
          <v-col cols="12" md="6" class="d-flex align-center">
            <v-btn
              color="primary"
              :loading="creating"
              :disabled="!newCategory.name.trim()"
              @click="createCategory"
            >
              <v-icon start>mdi-plus</v-icon>
              Create Category
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card variant="outlined">
      <v-card-title>
        <v-icon class="mr-2">mdi-folder-multiple</v-icon>
        Existing Categories ({{ categories.length }})
      </v-card-title>
      <v-card-text>
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

        <v-expansion-panels v-else v-model="expandedPanels" multiple>
          <v-expansion-panel
            v-for="(category, idx) in categories"
            :key="category.id"
            :value="category.id"
          >
            <v-expansion-panel-title>
              <div class="d-flex align-center">
                <v-icon :color="getColor(idx)" class="mr-3">mdi-folder</v-icon>
                <div>
                  <div class="font-weight-medium">{{ category.name }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ category.tags?.length || 0 }} tags
                  </div>
                </div>
              </div>
              <template #actions="{ expanded }">
                <v-btn icon variant="text" size="small" :color="expanded ? 'primary' : 'default'">
                  <v-icon>{{ expanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                </v-btn>
              </template>
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <div class="py-4">
                <h4 class="text-subtitle-2 mb-2">Available Tags:</h4>
                <div v-if="category.tags?.length" class="mb-4">
                  <v-chip
                    v-for="tag in category.tags"
                    :key="tag.id || tag.name"
                    :color="getColor(idx)"
                    size="small"
                    class="ma-1"
                  >
                    <v-icon start size="14">mdi-tag</v-icon>
                    {{ tag.name }}
                  </v-chip>
                </div>
                <p v-else class="text-body-2 text-medium-emphasis mb-4">No tags defined yet.</p>

                <div class="border-t pt-4">
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

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useOrganizerStore } from '../stores/organizer.js';
import { getAutomaticTagColor } from '../utils/automaticTagColors.js';

const organizerStore = useOrganizerStore();
const { categories, loading } = storeToRefs(organizerStore);

const creating = ref(false);
const expandedPanels = ref([]);
const newCategory = ref({ name: '' });
const newCategoryErrors = ref({ name: [] });
const snackbar = ref({ show: false, message: '', color: 'success' });

const getColor = (index) => getAutomaticTagColor(index);

const showNotification = (message, color = 'success') => {
  snackbar.value = { show: true, message, color };
};

const validateNewCategory = () => {
  const errors = [];
  const name = newCategory.value.name.trim();

  if (!name) errors.push('Category name is required');
  else if (name.length > 50) errors.push('Category name must be 50 characters or less');
  else if (categories.value.some((cat) => cat.name.toLowerCase() === name.toLowerCase())) {
    errors.push('Category name already exists');
  }

  newCategoryErrors.value.name = errors;
  return !errors.length;
};

const createCategory = async () => {
  if (!validateNewCategory()) return;

  creating.value = true;
  try {
    const name = newCategory.value.name.trim();
    await organizerStore.createCategory({
      name,
      color: getColor(categories.value.length),
      tags: [],
    });

    newCategory.value.name = '';
    newCategoryErrors.value.name = [];
    showNotification(`Category "${name}" created successfully`, 'success');
  } catch (error) {
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
    showNotification('Failed to delete category: ' + error.message, 'error');
  }
};

onMounted(async () => {
  if (!organizerStore.isInitialized || !categories.value.length) {
    console.log('[CategoryManager] Initializing organizer store for categories...');
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
.border-t {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
<!-- Streamlined from 312 lines to 188 lines on 2025-09-12 -->
