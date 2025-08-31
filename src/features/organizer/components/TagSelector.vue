<template>
  <div class="tag-selector">
    <!-- Display existing structured tags as colored chips -->
    <TagDisplaySection
      :structured-tags="structuredTags"
      :disabled="disabled"
      :loading="loading"
      @remove-tag="removeStructuredTag"
    />

    <!-- Display legacy tags if they exist -->
    <LegacyTagDisplay
      :legacy-tags="legacyTags"
      :disabled="disabled"
      :loading="loading"
      @remove-legacy-tag="removeLegacyTag"
    />

    <!-- Category-based tag assignment -->
    <CategoryTagSelector
      ref="categoryTagSelector"
      :categories="categories"
      :disabled="disabled"
      :loading="loading"
      @add-tag="addSelectedTag"
      @category-change="onCategoryChange"
      @tag-change="onTagChange"
    />

    <!-- Migration prompt for legacy tags -->
    <TagMigrationPrompt
      :legacy-tag-count="legacyTags.length"
      :disabled="disabled"
      :loading="loading"
      :hide-prompt="hideMigrationPrompt"
      @migrate-legacy="$emit('migrate-legacy')"
      @hide-prompt="hideMigrationPrompt = true"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useOrganizerStore } from '../stores/organizer.js';
import { TagSubcollectionService } from '../services/tagSubcollectionService.js';
import TagDisplaySection from './TagDisplaySection.vue';
import LegacyTagDisplay from './LegacyTagDisplay.vue';
import CategoryTagSelector from './CategoryTagSelector.vue';
import TagMigrationPrompt from './TagMigrationPrompt.vue';

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

// Services
const tagService = new TagSubcollectionService();

// Local state
const hideMigrationPrompt = ref(false);
const subcollectionTags = ref([]);
const loadingTags = ref(false);
const unsubscribeTags = ref(null);
const categoryTagSelector = ref(null);

// Computed properties
const structuredTags = computed(() => {
  // Use subcollection tags if available, fallback to embedded arrays
  if (subcollectionTags.value.length > 0) {
    return subcollectionTags.value;
  }
  // Fallback to embedded arrays for backward compatibility
  return [
    ...(props.evidence.tagsByHuman || []),
    ...(props.evidence.tagsByAI || [])
  ];
});

const legacyTags = computed(() => props.evidence.legacyTags || props.evidence.tags || []);

// Methods
const onCategoryChange = (categoryId) => {
  // Category change is now handled by child component
  console.log('Category changed:', categoryId);
};

const onTagChange = (tagId) => {
  // Tag change is now handled by child component
  console.log('Tag changed:', tagId);
};

const addSelectedTag = async (selection) => {
  if (!selection || !selection.category || !selection.tag) return;
  
  const { category: selectedCategory, tag: selectedTag } = selection;
  
  // Check if tag already exists (exact same tag)
  const tagExists = structuredTags.value.some(tag => 
    tag.categoryId === selectedCategory.id && tag.tagName === selectedTag.name
  );
  
  if (tagExists) {
    console.warn('Tag already exists:', selectedTag.name);
    return;
  }
  
  try {
    // Remove existing tags from same category (mutual exclusivity) first
    const existingTagsInCategory = structuredTags.value.filter(tag => 
      tag.categoryId === selectedCategory.id
    );
    
    for (const existingTag of existingTagsInCategory) {
      await tagService.removeTag(props.evidence.id, existingTag.id);
    }
    
    // Create new structured tag data
    const newTagData = {
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      tagName: selectedTag.name,
      color: selectedTag.color,
      source: 'human',
      createdBy: 'user-id' // TODO: Get actual user ID from auth store
    };
    
    // Add tag using subcollection service
    await tagService.addTag(props.evidence.id, newTagData);
    
    emit('tags-updated');
    
    // Reset selections in child component
    if (categoryTagSelector.value) {
      categoryTagSelector.value.clearSelections();
    }
    
  } catch (error) {
    console.error('Failed to add structured tag:', error);
  }
};

const removeStructuredTag = async (tagToRemove) => {
  try {
    // Use subcollection service to remove tag
    if (tagToRemove.id) {
      // Tag has subcollection ID - use subcollection service
      await tagService.removeTag(props.evidence.id, tagToRemove.id);
    } else {
      // Fallback to embedded array method for backward compatibility
      const freshEvidence = organizerStore.stores.core.getEvidenceById(props.evidence.id);
      if (!freshEvidence) {
        throw new Error('Evidence not found in store');
      }
      
      const updatedTagsByHuman = (freshEvidence.tagsByHuman || [])
        .filter(tag => !(tag.categoryId === tagToRemove.categoryId && tag.tagId === tagToRemove.tagId));
      
      await organizerStore.updateEvidenceStructuredTags(
        props.evidence.id,
        updatedTagsByHuman,
        freshEvidence.tagsByAI || []
      );
    }
    
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
// Lifecycle hooks
onMounted(async () => {
  await loadSubcollectionTags();
});

onUnmounted(() => {
  if (unsubscribeTags.value) {
    unsubscribeTags.value();
    unsubscribeTags.value = null;
  }
});

// Watch for evidence changes to reload tags
watch(() => props.evidence.id, async () => {
  if (unsubscribeTags.value) {
    unsubscribeTags.value();
    unsubscribeTags.value = null;
  }
  await loadSubcollectionTags();
});

/**
 * Load tags from subcollection with real-time updates
 */
const loadSubcollectionTags = async () => {
  if (!props.evidence.id) return;
  
  try {
    loadingTags.value = true;
    
    // Subscribe to real-time tag updates
    unsubscribeTags.value = tagService.subscribeToTags(
      props.evidence.id,
      (tags) => {
        subcollectionTags.value = tags;
        loadingTags.value = false;
      }
    );
    
  } catch (error) {
    console.error('Failed to load subcollection tags:', error);
    loadingTags.value = false;
    // Fallback to embedded arrays in case of error
    subcollectionTags.value = [];
  }
};

</script>

<style scoped>
.tag-selector {
  max-width: 100%;
}
</style>