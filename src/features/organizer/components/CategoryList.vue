<template>
  <div>
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
                <v-chip :color="getTypeColor(category.categoryType)" size="x-small" variant="tonal">
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
                @click="handleEdit(category)"
              >
                <v-icon start>mdi-pencil</v-icon>
                Edit
              </v-btn>
              <v-btn color="error" variant="outlined" size="small" @click="handleDelete(category)">
                <v-icon start>mdi-delete</v-icon>
                Delete
              </v-btn>
            </div>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import {
  getTypeColor,
  getTypeIcon,
  getTypeText,
  isListType,
  getEmptyTagsMessage,
} from '../utils/categoryConfig.js';
import { useCategoryHelpers } from '../composables/useCategoryHelpers.js';

// Props
const props = defineProps({
  categories: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits(['edit-category', 'delete-category']);

// Local state
const expandedPanels = ref([]);

// Composables
const { getTypeConfigSummary, getCategoryDescription } = useCategoryHelpers();

// Methods
const handleEdit = (category) => {
  emit('edit-category', category);
};

const handleDelete = (category) => {
  emit('delete-category', category);
};

// Lifecycle
onMounted(() => {
  if (props.categories.length > 0) {
    expandedPanels.value = [props.categories[0].id];
  }
});
</script>

<style scoped>
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
