<template>
  <DemoContainer
    title="Tag System Demonstration"
    subtitle="Three Tag Implementation Approaches"
    description="Compare the three different tag implementations: Locked Categories, Open Categories, and Element Plus components."
    icon="mdi-tag-multiple"
    :tags="['Tag Demo', 'Vue 3', 'Component Comparison']"
  >
    <div class="max-w-6xl mx-auto">
      <v-row>
        <!-- Locked Category Example -->
        <v-col cols="12" md="4">
          <v-card class="h-100">
            <v-card-title class="d-flex align-center">
              <v-icon color="orange" size="16" class="me-2">mdi-lock</v-icon>
              Locked Category Tags
            </v-card-title>
            <v-card-text>
              <div class="d-flex align-center mb-3">
                <v-icon icon="mdi-file-document" size="16" class="me-2" />
                <strong class="text-body-2">quarterly-report.pdf</strong>
              </div>

              <div class="tags-container mb-3">
                <EditableTag
                  v-for="tag in lockedCategoryTags"
                  :key="tag.id"
                  :tag="tag"
                  :categoryOptions="getCategoryOptions(tag.categoryId)"
                  :isOpenCategory="false"
                  :tagColor="getTagColor(tag)"
                  @tag-updated="handleTagUpdate"
                />
              </div>

              <v-alert color="warning" variant="tonal" density="compact">
                <v-icon size="14">mdi-information</v-icon>
                Fixed options only - no custom tags allowed
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Open Category Example -->
        <v-col cols="12" md="4">
          <v-card class="h-100">
            <v-card-title class="d-flex align-center">
              <v-icon color="green" size="16" class="me-2">mdi-lock-open-variant</v-icon>
              Open Category Tags
            </v-card-title>
            <v-card-text>
              <div class="d-flex align-center mb-3">
                <v-icon icon="mdi-file-document" size="16" class="me-2" />
                <strong class="text-body-2">client-proposal.pdf</strong>
              </div>

              <div class="tags-container mb-3">
                <EditableTag
                  v-for="tag in openCategoryTags"
                  :key="tag.id"
                  :tag="tag"
                  :categoryOptions="getCategoryOptions(tag.categoryId)"
                  :isOpenCategory="true"
                  :tagColor="getTagColor(tag)"
                  @tag-updated="handleTagUpdate"
                />
              </div>

              <v-alert color="success" variant="tonal" density="compact">
                <v-icon size="14">mdi-information</v-icon>
                Users can create custom tags inline
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Element Plus Implementation -->
        <v-col cols="12" md="4">
          <v-card class="h-100">
            <v-card-title class="d-flex align-center">
              <v-icon color="blue" size="16" class="me-2">mdi-view-dashboard-variant</v-icon>
              Element Plus Tags
            </v-card-title>
            <v-card-text>
              <div class="d-flex align-center mb-3">
                <v-icon icon="mdi-file-document" size="16" class="me-2" />
                <strong class="text-body-2">project-docs.pdf</strong>
              </div>

              <div class="tags-container mb-3">
                <ElementTag
                  v-for="tag in elementPlusTags"
                  :key="tag.id"
                  :tag="tag"
                  :categoryOptions="getCategoryOptions(tag.categoryId)"
                  :isOpenCategory="true"
                  :tagColor="getTagColor(tag)"
                  @tag-updated="handleTagUpdate"
                />
              </div>

              <v-alert color="info" variant="tonal" density="compact">
                <v-icon size="14">mdi-information</v-icon>
                Element Plus with built-in z-index management
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </DemoContainer>
</template>

<script setup>
import { ref } from 'vue';
import DemoContainer from '../components/DemoContainer.vue';
import EditableTag from '@/components/features/tags/EditableTag.vue';
import ElementTag from '@/components/features/tags/ElementTag.vue';
import { getAutomaticTagColor } from '@/features/organizer/utils/automaticTagColors.js';

// Mock categories with basic data
const mockCategories = ref([
  {
    id: 'document-type',
    name: 'Document Type',
    tags: [
      { id: 'd1', tagName: 'Invoice', source: 'ai' },
      { id: 'd2', tagName: 'Receipt', source: 'human' },
      { id: 'd3', tagName: 'Contract', source: 'human' },
      { id: 'd4', tagName: 'Report', source: 'ai' },
      { id: 'd5', tagName: 'Proposal', source: 'human' },
      { id: 'd6', tagName: 'Statement', source: 'ai' },
    ],
  },
  {
    id: 'priority',
    name: 'Priority',
    tags: [
      { id: 'p1', tagName: 'High', source: 'ai' },
      { id: 'p2', tagName: 'Medium', source: 'human' },
      { id: 'p3', tagName: 'Low', source: 'ai' },
      { id: 'p4', tagName: 'Urgent', source: 'human' },
    ],
  },
  {
    id: 'status',
    name: 'Status',
    tags: [
      { id: 's1', tagName: 'Draft', source: 'human' },
      { id: 's2', tagName: 'Review', source: 'ai' },
      { id: 's3', tagName: 'Approved', source: 'human' },
      { id: 's4', tagName: 'Published', source: 'ai' },
    ],
  },
  {
    id: 'year',
    name: 'Year',
    tags: Array.from({ length: 76 }, (_, i) => ({
      id: `y${i + 1}`,
      tagName: (2025 - i).toString(),
      source: i % 2 === 0 ? 'ai' : 'human',
    })),
  },
]);

// Locked category demo tags
const lockedCategoryTags = ref([
  {
    id: 'locked1',
    categoryId: 'document-type',
    tagName: 'Invoice',
    source: 'system',
    confidence: 100,
  },
  {
    id: 'locked2',
    categoryId: 'priority',
    tagName: 'High',
    source: 'system',
    confidence: 100,
  },
  {
    id: 'locked3',
    categoryId: 'status',
    tagName: 'Approved',
    source: 'system',
    confidence: 100,
  },
  {
    id: 'locked4',
    categoryId: 'year',
    tagName: '2024',
    source: 'system',
    confidence: 100,
  },
]);

// Open category demo tags
const openCategoryTags = ref([
  {
    id: 'open1',
    categoryId: 'document-type',
    tagName: 'Proposal',
    source: 'human',
    confidence: 100,
  },
  {
    id: 'open2',
    categoryId: 'priority',
    tagName: 'Medium',
    source: 'human',
    confidence: 100,
  },
  {
    id: 'open3',
    categoryId: 'status',
    tagName: 'Draft',
    source: 'human',
    confidence: 100,
  },
  {
    id: 'open4',
    categoryId: 'year',
    tagName: '2023',
    source: 'human',
    confidence: 100,
  },
]);

// Element Plus demo tags
const elementPlusTags = ref([
  {
    id: 'element1',
    categoryId: 'document-type',
    tagName: 'Contract',
    source: 'element-plus',
    confidence: 100,
  },
  {
    id: 'element2',
    categoryId: 'priority',
    tagName: 'Low',
    source: 'element-plus',
    confidence: 100,
  },
  {
    id: 'element3',
    categoryId: 'status',
    tagName: 'Review',
    source: 'element-plus',
    confidence: 100,
  },
  {
    id: 'element4',
    categoryId: 'year',
    tagName: '2022',
    source: 'element-plus',
    confidence: 100,
  },
]);

// Helper functions
const getCategoryOptions = (categoryId) => {
  const category = mockCategories.value.find((cat) => cat.id === categoryId);
  return category ? category.tags : [];
};

const getTagColor = (tag) => {
  const categoryIndex = mockCategories.value.findIndex((cat) => cat.id === tag.categoryId);
  return getAutomaticTagColor(categoryIndex >= 0 ? categoryIndex : 0);
};

const handleTagUpdate = (updatedTag) => {
  console.log('Tag updated:', updatedTag);
};
</script>

<style scoped>
.tags-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-height: 40px;
}
</style>