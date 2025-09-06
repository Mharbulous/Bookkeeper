# EditableTag Integration - Simplified Plan

## Goal

Replace the current dropdown-based tag system with the EditableTag component.

## Current Setup

- **TagSelector.vue** - Main coordinator component
- **CategoryTagSelector.vue** - Dropdown component to be replaced
- Tags stored in Firestore subcollections: `documents/{docId}/tags`

## Implementation Steps

### Step 1: Create Adapter Component (Day 1)

Create `EditableTagWrapper.vue` to bridge between existing system and EditableTag:

```vue
<!-- src/features/organizer/components/EditableTagWrapper.vue -->
<template>
  <EditableTag
    :tag="adaptedTag"
    :categoryOptions="categoryOptions"
    :isOpenCategory="category.allowCustom"
    :tagColor="tagColor"
    @tag-updated="handleTagUpdate"
    @tag-removed="handleTagRemove"
  />
</template>

<script setup>
import EditableTag from '@/components/features/tags/EditableTag.vue';

const props = defineProps({
  category: Object,
  existingTag: Object,
  documentId: String,
});

// Transform existing tag to EditableTag format
const adaptedTag = computed(() => ({
  id: props.existingTag?.id,
  tagName: props.existingTag?.tagName || '',
  categoryId: props.category.id,
}));

// Load category options from Firestore or local config
const categoryOptions = ref([]);

const handleTagUpdate = async (updatedTag) => {
  // Save to Firestore
  await updateTagInFirestore(props.documentId, updatedTag);
  emit('tag-updated', updatedTag);
};

const handleTagRemove = async () => {
  // Delete from Firestore
  await deleteTagFromFirestore(props.documentId, props.existingTag.id);
  emit('tag-removed', props.existingTag.id);
};
</script>
```

### Step 2: Update TagSelector.vue (Day 2)

Replace CategoryTagSelector with EditableTagWrapper:

```vue
<!-- In TagSelector.vue -->
<template>
  <div v-for="category in activeCategories" :key="category.id">
    <EditableTagWrapper
      :category="category"
      :existing-tag="getTagForCategory(category.id)"
      :document-id="evidence.id"
      @tag-updated="refreshTags"
      @tag-removed="refreshTags"
    />
  </div>
</template>
```

### Step 3: Connect to Firestore Operations (Day 3-4)

Update the wrapper to handle CRUD operations:

```javascript
// In EditableTagWrapper.vue
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const updateTagInFirestore = async (documentId, tag) => {
  const tagRef = doc(db, 'documents', documentId, 'tags', tag.id || crypto.randomUUID());

  await setDoc(
    tagRef,
    {
      categoryId: props.category.id,
      categoryName: props.category.name,
      tagName: tag.tagName,
      source: 'human',
      confidence: 100,
      status: 'approved',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

const deleteTagFromFirestore = async (documentId, tagId) => {
  if (!tagId) return;
  const tagRef = doc(db, 'documents', documentId, 'tags', tagId);
  await deleteDoc(tagRef);
};
```

### Step 4: Handle Tag Colors (Day 5)

Connect the existing color system:

```javascript
// In EditableTagWrapper.vue
import { useTagColor } from '@/composables/useTagColor';

const { getColorForTag } = useTagColor();

const tagColor = computed(() => getColorForTag(props.category.id, props.existingTag?.tagName));
```

### Step 5: Handle AI Tags (Day 6)

Add support for AI-suggested tags if needed:

```vue
<!-- Add to EditableTag or EditableTagWrapper -->
<template v-if="existingTag?.source === 'ai'">
  <v-chip size="x-small" class="ml-2"> AI {{ existingTag.confidence }}% </v-chip>
</template>
```

### Step 6: Load Category Options (Day 7)

Populate dropdown options for each category:

```javascript
// In EditableTagWrapper.vue
onMounted(async () => {
  if (props.category.predefinedTags) {
    // Use local predefined tags
    categoryOptions.value = props.category.predefinedTags;
  } else {
    // Load from Firestore if stored there
    const snapshot = await getDocs(collection(db, 'tagOptions', props.category.id));
    categoryOptions.value = snapshot.docs.map((doc) => doc.data().name);
  }
});
```

### Step 7: Testing & Cleanup (Day 8-9)

1. Test with real documents:

   - Create new tags
   - Edit existing tags
   - Delete tags
   - Test with multiple categories

2. Remove old components:
   - Delete CategoryTagSelector.vue
   - Remove unused dropdown code
   - Clean up any old tag selection logic

### Step 8: Final Integration (Day 10)

1. Ensure all category types work:

   - Closed categories (fixed options only)
   - Open categories (allow custom values)
   - AI-suggested categories

2. Verify data persistence:
   - Tags save correctly to Firestore
   - Tags load on page refresh
   - Multi-user editing works

## Key Files to Modify

1. **Create New:**

   - `EditableTagWrapper.vue` - Adapter component

2. **Modify:**

   - `TagSelector.vue` - Replace dropdown with EditableTag
   - Tag-related Firestore operations (if centralized)

3. **Delete (after testing):**
   - `CategoryTagSelector.vue`
   - Any unused dropdown components

## Simplified Data Flow

```
User edits tag → EditableTag emits event → EditableTagWrapper → Firestore
                                                ↓
                                          TagSelector refreshes
```

## Success Checklist

- [ ] Users can edit tags inline without dropdowns
- [ ] Changes save to Firestore immediately
- [ ] All existing tags display correctly
- [ ] New tags can be created
- [ ] Tags can be deleted
- [ ] AI tags (if any) still work

## Potential Issues & Quick Fixes

1. **Tag not saving**: Check Firestore rules allow writes to tags subcollection
2. **Options not loading**: Verify category configuration has either `predefinedTags` or Firestore collection
3. **Colors not working**: Ensure `useTagColor` composable is imported correctly
4. **Missing tags**: Check if `getTagForCategory()` returns the right structure

---

_Estimated Time: 8-10 days of casual development_  
_Approach: Direct replacement, test with real data, fix issues as they arise_
