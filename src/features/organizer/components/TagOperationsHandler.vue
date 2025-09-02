<template>
  <div>
    <!-- This is an operations handler component with no direct template -->
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAuthStore } from '../../../core/stores/auth.js';
import tagSubcollectionService from '../services/tagSubcollectionService.js';

const props = defineProps({
  evidence: {
    type: Object,
    required: true
  },
  approvedTags: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['tags-updated', 'reload-tags']);

// Stores
const authStore = useAuthStore();

// Services
const tagService = tagSubcollectionService;

// Computed properties
const structuredTags = computed(() => {
  // Return approved tags (including auto-approved AI tags)
  return props.approvedTags;
});

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
    tag.metadata?.categoryId === selectedCategory.id && tag.tagName === selectedTag.name
  );
  
  if (tagExists) {
    console.warn('Tag already exists:', selectedTag.name);
    return;
  }
  
  try {
    // Remove existing tags from same category (mutual exclusivity) first
    const existingTagsInCategory = structuredTags.value.filter(tag => 
      tag.metadata?.categoryId === selectedCategory.id
    );
    
    for (const existingTag of existingTagsInCategory) {
      if (existingTag.id) {
        const teamId = authStore.currentTeam;
      if (teamId) {
        await tagService.deleteTag(props.evidence.id, existingTag.id, teamId);
      }
      }
    }
    
    // Create new structured tag data (using NEW data structure from migration plan)
    const newTagData = {
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      tagName: selectedTag.name,
      source: 'human',
      confidence: 100, // Human tags have 100% confidence (percentage format to match AI tags)
      status: 'approved', // Manual tags are immediately approved
      autoApproved: false, // Manual tags are not auto-approved by AI
      reviewRequired: false, // Human tags don't need review
      createdBy: authStore.user?.uid || 'unknown-user',
      metadata: {
        userNote: 'Manual tag selection',
        manuallyApplied: true,
        selectedFromOptions: [selectedTag.name] // Could be expanded to show other options
      }
    };
    
    // Add tag using subcollection service (auto-approved since it's manual)
    const teamId = authStore.currentTeam;
    if (!teamId) {
      console.error('No team ID available for tag operations');
      return;
    }
    await tagService.addTag(props.evidence.id, newTagData, teamId);
    
    // Request parent to reload tags
    emit('reload-tags');
    emit('tags-updated');
    
  } catch (error) {
    console.error('Failed to add structured tag:', error);
  }
};

const removeStructuredTag = async (tagToRemove) => {
  try {
    // Use subcollection service to remove tag
    if (tagToRemove.id) {
      // Tag has subcollection ID - use subcollection service
      const teamId = authStore.currentTeam;
      if (!teamId) {
        console.error('No team ID available for tag operations');
        return;
      }
      await tagService.deleteTag(props.evidence.id, tagToRemove.id, teamId);
    } else {
      console.warn('Tag has no ID - cannot remove from subcollection');
      return;
    }
    
    // Small delay to ensure Firestore operation is committed before reloading
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Request parent to reload tags
    emit('reload-tags');
    emit('tags-updated');
    
  } catch (error) {
    console.error('Failed to remove structured tag:', error);
  }
};

// Expose methods for parent component access
defineExpose({
  onCategoryChange,
  onTagChange,
  addSelectedTag,
  removeStructuredTag,
  structuredTags
});
</script>

<style scoped>
/* Operations handler component - no visual styling needed */
</style>