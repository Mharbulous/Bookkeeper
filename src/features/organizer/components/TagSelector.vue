<template>
  <div class="tag-selector">
    <!-- Display existing structured tags as colored chips -->
    <div v-if="hasStructuredTags" class="tags-display mb-2">
      <v-chip
        v-for="tag in structuredTags"
        :key="`${tag.categoryId}-${tag.tagId}`"
        size="small"
        closable
        variant="outlined"
        :color="tag.color"
        class="ma-1"
        @click:close="removeStructuredTag(tag)"
      >
        <v-icon start size="14" :color="tag.color">mdi-tag</v-icon>
        {{ tag.tagName }}
      </v-chip>
    </div>

    <!-- Display legacy tags if they exist -->
    <div v-if="hasLegacyTags" class="legacy-tags-display mb-2">
      <v-chip
        v-for="tag in legacyTags"
        :key="`legacy-${tag}`"
        size="small"
        closable
        variant="outlined"
        color="grey"
        class="ma-1"
        @click:close="removeLegacyTag(tag)"
      >
        <v-icon start size="14">mdi-tag-outline</v-icon>
        {{ tag }}
        <v-tooltip activator="parent" location="top">
          Legacy tag (v1.0) - Consider migrating to categories
        </v-tooltip>
      </v-chip>
    </div>

    <!-- Category-based tag assignment -->
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
            @update:model-value="onCategoryChange"
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
            @update:model-value="onTagChange"
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
            @click="addSelectedTag"
          >
            <v-icon>mdi-plus</v-icon>
            Add
          </v-btn>
        </v-col>
      </v-row>
    </div>

    <!-- Migration prompt for legacy tags -->
    <div v-if="hasLegacyTags && !hideMigrationPrompt" class="migration-prompt mt-3">
      <v-alert
        type="info"
        variant="tonal"
        closable
        @click:close="hideMigrationPrompt = true"
      >
        <template #title>Migrate Legacy Tags</template>
        You have {{ legacyTags.length }} legacy tags. 
        <v-btn
          size="small"
          variant="text"
          color="primary"
          class="ml-2"
          @click="$emit('migrate-legacy')"
        >
          Organize into Categories
        </v-btn>
      </v-alert>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useOrganizerStore } from '../stores/organizer.js';

const props = defineProps({
  evidence: {
    type: Object,
    required: true
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

const emit = defineEmits(['tags-updated', 'migrate-legacy']);

// Store
const organizerStore = useOrganizerStore();
const { categories } = storeToRefs(organizerStore);

// Local state
const selectedCategoryId = ref('');
const selectedTagId = ref('');
const hideMigrationPrompt = ref(false);

// Computed properties
const structuredTags = computed(() => [
  ...(props.evidence.tagsByHuman || []),
  ...(props.evidence.tagsByAI || [])
]);

const legacyTags = computed(() => props.evidence.legacyTags || props.evidence.tags || []);

const hasStructuredTags = computed(() => structuredTags.value.length > 0);
const hasLegacyTags = computed(() => legacyTags.value.length > 0);

const categoryOptions = computed(() => 
  categories.value.map(cat => ({
    id: cat.id,
    name: cat.name,
    color: cat.color,
    tags: cat.tags || []
  }))
);

const tagOptions = computed(() => {
  if (!selectedCategoryId.value) return [];
  
  const selectedCategory = categories.value.find(cat => cat.id === selectedCategoryId.value);
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
const onCategoryChange = () => {
  selectedTagId.value = ''; // Reset tag selection when category changes
};

const onTagChange = () => {
  // Could add logic here if needed
};

const addSelectedTag = async () => {
  if (!canAddTag.value) return;
  
  const selectedCategory = categories.value.find(cat => cat.id === selectedCategoryId.value);
  const selectedTag = tagOptions.value.find(tag => tag.id === selectedTagId.value);
  
  if (!selectedCategory || !selectedTag) return;
  
  // Check if tag already exists (exact same tag)
  const tagExists = structuredTags.value.some(tag => 
    tag.categoryId === selectedCategoryId.value && tag.tagName === selectedTag.name
  );
  
  if (tagExists) {
    console.warn('Tag already exists:', selectedTag.name);
    return;
  }
  
  try {
    // Create new structured tag
    const newTag = {
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      tagId: selectedTag.id,
      tagName: selectedTag.name,
      color: selectedTag.color
    };
    
    // Remove existing tags from same category (mutual exclusivity)
    const updatedTagsByHuman = (props.evidence.tagsByHuman || [])
      .filter(tag => tag.categoryId !== selectedCategoryId.value)
      .concat(newTag);
    
    // Update via store
    await organizerStore.updateEvidenceStructuredTags(
      props.evidence.id, 
      updatedTagsByHuman, 
      props.evidence.tagsByAI || []
    );
    
    emit('tags-updated');
    
    // Reset selections
    selectedCategoryId.value = '';
    selectedTagId.value = '';
    
  } catch (error) {
    console.error('Failed to add structured tag:', error);
  }
};

const removeStructuredTag = async (tagToRemove) => {
  try {
    const updatedTagsByHuman = (props.evidence.tagsByHuman || [])
      .filter(tag => !(tag.categoryId === tagToRemove.categoryId && tag.tagId === tagToRemove.tagId));
    
    await organizerStore.updateEvidenceStructuredTags(
      props.evidence.id,
      updatedTagsByHuman,
      props.evidence.tagsByAI || []
    );
    
    emit('tags-updated');
    
  } catch (error) {
    console.error('Failed to remove structured tag:', error);
  }
};

const removeLegacyTag = async (tagToRemove) => {
  try {
    const updatedLegacyTags = legacyTags.value.filter(tag => tag !== tagToRemove);
    
    // Update legacy tags via organizer store
    await organizerStore.updateEvidenceTags(props.evidence.id, updatedLegacyTags);
    
    emit('tags-updated');
    
  } catch (error) {
    console.error('Failed to remove legacy tag:', error);
  }
};
</script>

<style scoped>
.tag-selector {
  max-width: 100%;
}

.tags-display, .legacy-tags-display {
  min-height: 40px;
}

.category-selection {
  margin-top: 8px;
}

.migration-prompt {
  border-left: 4px solid #2196f3;
  padding-left: 12px;
}
</style>