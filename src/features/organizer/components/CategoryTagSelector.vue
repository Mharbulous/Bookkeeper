<template>
  <div class="category-selection">
    <v-row no-gutters class="align-center">
      <v-col cols="12" md="5">
        <v-select
          v-model="selectedCategoryId"
          :items="categoryOptions"
          item-title="name"
          item-value="id"
          label="Select Category"
          variant="outlined"
          density="compact"
          :disabled="disabled || loading"
          @update:model-value="handleCategoryChange"
        >
          <template #item="{ props, item }">
            <v-list-item v-bind="props">
              <template #prepend>
                <v-icon :color="item.raw.color" size="16">mdi-folder</v-icon>
              </template>
            </v-list-item>
          </template>
        </v-select>
      </v-col>
      
      <v-col cols="12" md="5" class="ml-md-2">
        <v-select
          v-model="selectedTagId"
          :items="tagOptions"
          item-title="name"
          item-value="id"
          label="Select Tag"
          variant="outlined"
          density="compact"
          :disabled="disabled || loading || !selectedCategoryId"
          @update:model-value="handleTagChange"
        >
          <template #item="{ props, item }">
            <v-list-item v-bind="props">
              <template #prepend>
                <v-icon :color="item.raw.color" size="16">mdi-tag</v-icon>
              </template>
            </v-list-item>
          </template>
        </v-select>
      </v-col>
      
      <v-col cols="12" md="2" class="ml-md-2">
        <v-btn
          :disabled="!canAddTag || disabled || loading"
          :loading="loading"
          color="primary"
          variant="elevated"
          @click="handleAddTag"
        >
          <v-icon>mdi-plus</v-icon>
          Add
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  categories: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['add-tag', 'category-change', 'tag-change']);

// Local state
const selectedCategoryId = ref('');
const selectedTagId = ref('');

// Computed properties
const categoryOptions = computed(() => 
  props.categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    color: cat.color,
    tags: cat.tags || []
  }))
);

const tagOptions = computed(() => {
  if (!selectedCategoryId.value) return [];
  
  const selectedCategory = props.categories.find(cat => cat.id === selectedCategoryId.value);
  if (!selectedCategory || !selectedCategory.tags) return [];
  
  return selectedCategory.tags.map(tag => ({
    id: tag.id || crypto.randomUUID(),
    name: tag.name,
    color: tag.color || selectedCategory.color
  }));
});

const canAddTag = computed(() => {
  return selectedCategoryId.value && selectedTagId.value;
});

// Methods
const handleCategoryChange = () => {
  selectedTagId.value = ''; // Reset tag selection when category changes
  emit('category-change', selectedCategoryId.value);
};

const handleTagChange = () => {
  emit('tag-change', selectedTagId.value);
};

const handleAddTag = () => {
  if (!canAddTag.value) return;
  
  const selectedCategory = props.categories.find(cat => cat.id === selectedCategoryId.value);
  const selectedTag = tagOptions.value.find(tag => tag.id === selectedTagId.value);
  
  if (!selectedCategory || !selectedTag) return;
  
  emit('add-tag', {
    category: selectedCategory,
    tag: selectedTag
  });
  
  // Reset selections
  selectedCategoryId.value = '';
  selectedTagId.value = '';
};

// Expose methods for parent component control
defineExpose({
  clearSelections: () => {
    selectedCategoryId.value = '';
    selectedTagId.value = '';
  },
  setCategory: (categoryId) => {
    selectedCategoryId.value = categoryId;
  },
  setTag: (tagId) => {
    selectedTagId.value = tagId;
  }
});
</script>

<style scoped>
.category-selection {
  margin-top: 8px;
}
</style>