<template>
  <DemoContainer
    title="Clickable Tag System Demo"
    subtitle="Hover-to-Edit with Autocomplete"
    description="This demonstration showcases the proposed clickable tag system with hover-to-reveal edit icons and category-specific autocomplete functionality. Test the intuitive UX pattern that reduces tag editing from 3 clicks to 1 click."
    icon="mdi-tag-multiple"
    :tags="['UX Improvement', 'Inline Editing', 'Autocomplete', 'Performance', 'Vue 3']"
    :show-performance-notes="true"
  >
    <div class="max-w-6xl mx-auto">


      <!-- Category Testing -->
      <v-card class="mb-4">
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-format-list-group" class="me-2" />
          Category-Specific Autocomplete Testing
        </v-card-title>
        <v-card-text>
          <v-alert color="info" variant="tonal" class="mb-4">
            Test how autocomplete filters to show only tags within the same category. Each category
            has different tag options.
          </v-alert>

          <v-row>
            <v-col
              v-for="(category, index) in mockCategories"
              :key="category.id"
              cols="12"
              md="6"
              lg="4"
            >
              <v-card variant="outlined" class="h-100">
                <v-card-subtitle>
                  <v-icon :color="getAutomaticTagColor(index)" class="me-2">mdi-folder-tag</v-icon>
                  {{ category.name }}
                </v-card-subtitle>
                <v-card-text>
                  <div class="text-caption mb-2">Available tags ({{ category.tags.length }}):</div>
                  <div class="d-flex flex-wrap gap-1">
                    <v-chip
                      v-for="tag in category.tags.slice(0, 4)"
                      :key="tag.id"
                      :color="getAutomaticTagColor(index)"
                      variant="outlined"
                      size="x-small"
                      @click="demonstrateTagEdit(category.id, tag.tagName)"
                    >
                      {{ tag.tagName }}
                    </v-chip>
                    <v-chip
                      v-if="category.tags.length > 4"
                      variant="outlined"
                      size="x-small"
                      color="grey"
                    >
                      +{{ category.tags.length - 4 }} more
                    </v-chip>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Open vs Locked Category Demo -->
      <v-card class="mb-4">
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-lock-open-variant" class="me-2" />
          Category Types: Open vs Locked
        </v-card-title>
        <v-card-text>
          <v-alert color="info" variant="tonal" class="mb-4">
            <strong>Open Categories:</strong> Users and AI can edit tags with inline editing while maintaining tag appearance.<br />
            <strong>Locked Categories:</strong> Fixed set of options, no new additions allowed.
          </v-alert>

          <v-row>
            <!-- Open Category Example -->
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="h-100">
                <v-card-subtitle class="d-flex align-center">
                  <v-icon color="green" size="16" class="me-2">mdi-lock-open-variant</v-icon>
                  <span class="text-green">Open Category</span>
                </v-card-subtitle>
                <v-card-text>
                  <!-- Demo File with Open Category Tags -->
                  <div class="d-flex align-center mb-3">
                    <v-icon icon="mdi-file-document" size="16" class="me-2" />
                    <strong class="text-body-2">client-proposal.pdf</strong>
                  </div>

                  <div class="tags-container mb-3">
                    <!-- Open category tag with extensible options -->
                    <div
                      v-for="tag in openCategoryTags"
                      :key="tag.id"
                      :data-tag-id="tag.id"
                      class="smart-tag ma-1"
                      :class="{ 
                        'expanded': tag.isOpen, 
                        'editing': tag.isHeaderEditing 
                      }"
                      :style="{ borderColor: getTagColor(tag), color: getTagColor(tag) }"
                    >
                      <!-- Single transforming button -->
                      <button
                        class="tag-button"
                        @click="handleTagClick(tag)"
                        @keydown="handleTypeToFilter($event, tag, true)"
                        @blur="handleTagBlur($event, tag)"
                        :class="{ 
                          'no-options': tag.isOpen && getFilteredOptions(tag.categoryId, tag.filterText, true).length === 0 
                        }"
                        :tabindex="0"
                      >
                        <i class="tag-icon mdi mdi-tag"></i>
                        <span 
                          class="tag-text"
                          :class="{ 
                            'cursor-left': tag.isHeaderEditing && !tag.hasStartedTyping,
                            'cursor-right': tag.isHeaderEditing && tag.hasStartedTyping 
                          }"
                        >
                          {{ tag.filterText || tag.tagName }}
                        </span>
                      </button>
                      
                      <!-- Options appear below expanded button -->
                      <div 
                        class="dropdown-options" 
                        v-show="tag.isOpen && getFilteredOptions(tag.categoryId, tag.filterText, true).length > 0"
                      >
                        <div class="dropdown-menu">
                            <!-- Simple display for categories with 13 or fewer items -->
                            <template
                              v-if="getFilteredOptions(tag.categoryId, tag.filterText, true).length <= 13"
                            >
                              <button
                                v-for="option in getFilteredOptions(tag.categoryId, tag.filterText, true)"
                                :key="option.id"
                                class="dropdown-option"
                                tabindex="0"
                                @click="selectFromDropdown(tag, option.tagName)"
                              >
                                {{ option.tagName }}
                              </button>
                            </template>

                            <!-- Pagination for categories with more than 13 items -->
                            <template v-else>
                              <!-- CSS-only pagination with radio buttons for proper multi-page support -->
                              <input
                                v-for="pageNum in Math.ceil(
                                  getFilteredOptions(tag.categoryId, tag.filterText, true).length / 12
                                )"
                                :key="pageNum"
                                type="radio"
                                :name="`open-page-${tag.id}`"
                                :id="`open-page${pageNum}-${tag.id}`"
                                class="page-radio"
                                :checked="pageNum === 1"
                              />

                              <!-- Generate pages dynamically -->
                              <div
                                v-for="pageNum in Math.ceil(
                                  getFilteredOptions(tag.categoryId, tag.filterText, true).length / 12
                                )"
                                :key="pageNum"
                                :class="`page-content page-${pageNum}`"
                              >
                                <!-- Show 12 items for this page -->
                                <button
                                  v-for="option in getFilteredOptions(
                                    tag.categoryId, tag.filterText, true
                                  ).slice((pageNum - 1) * 12, pageNum * 12)"
                                  :key="option.id"
                                  class="dropdown-option"
                                  tabindex="0"
                                  @click="selectFromDropdown(tag, option.tagName)"
                                >
                                  {{ option.tagName }}
                                </button>


                                <!-- Next page button (if not the last page) -->
                                <label
                                  v-if="
                                    pageNum <
                                    Math.ceil(
                                      getFilteredOptions(tag.categoryId, tag.filterText, true).length / 12
                                    )
                                  "
                                  :for="`open-page${pageNum + 1}-${tag.id}`"
                                  class="dropdown-ellipses dropdown-pagination"
                                  tabindex="0"
                                >
                                  ...{{
                                    getFilteredOptions(tag.categoryId, tag.filterText, true).length -
                                    pageNum * 12
                                  }}
                                  more
                                </label>

                                <!-- Restart button (only on the last page) -->
                                <label
                                  v-if="
                                    pageNum ===
                                    Math.ceil(
                                      getFilteredOptions(tag.categoryId, tag.filterText, true).length / 12
                                    )
                                  "
                                  :for="`open-page1-${tag.id}`"
                                  class="dropdown-ellipses dropdown-pagination restart-button"
                                  tabindex="0"
                                >
                                  ...restart
                                </label>
                              </div>
                            </template>
                          </div>
                        </div>
                      </div>

                    </div>

                  <v-alert color="success" variant="tonal" density="compact">
                    <v-icon size="14">mdi-information</v-icon>
                    Users and AI can edit tags inline while maintaining the visual tag appearance.
                  </v-alert>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Locked Category Example -->
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="h-100">
                <v-card-subtitle class="d-flex align-center">
                  <v-icon color="orange" size="16" class="me-2">mdi-lock</v-icon>
                  <span class="text-orange">Locked Category</span>
                </v-card-subtitle>
                <v-card-text>
                  <!-- Demo File with Locked Category Tags -->
                  <div class="d-flex align-center mb-3">
                    <v-icon icon="mdi-file-document" size="16" class="me-2" />
                    <strong class="text-body-2">quarterly-report.pdf</strong>
                  </div>

                  <div class="tags-container mb-3">
                    <!-- Locked category tags using reusable EditableTag component -->
                    <EditableTag
                      v-for="tag in lockedCategoryTags"
                      :key="tag.id"
                      :tag="tag"
                      :categoryOptions="getLockedCategoryAlternatives(tag.categoryId)"
                      :allowCustomInput="false"
                      :tagColor="getTagColor(tag)"
                      @tag-updated="handleLockedTagUpdate"
                      @tag-selected="handleLockedTagSelected"
                    />
                  </div>

                  <v-alert color="warning" variant="tonal" density="compact">
                    <v-icon size="14">mdi-information</v-icon>
                    Fixed options only - Document Types and Years are administratively controlled
                  </v-alert>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>


      <!-- Performance Benchmarking -->
      <v-card class="mb-4">
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-speedometer" class="me-2" />
          Performance Benchmarking
        </v-card-title>
        <v-card-text>
          <div class="d-flex gap-2 mb-4">
            <v-btn @click="runPerformanceTest" color="primary"> Run Performance Test </v-btn>
            <v-btn @click="runStressTest" color="warning"> Stress Test (1000 tags) </v-btn>
            <v-btn @click="clearPerformanceTests" color="secondary"> Clear Results </v-btn>
          </div>

          <v-row v-if="performanceResults">
            <v-col cols="12" md="4">
              <v-card
                variant="tonal"
                :color="getPerformanceColor(performanceResults.editModeTime, 100)"
              >
                <v-card-text>
                  <div class="text-h6">{{ performanceResults.editModeTime }}ms</div>
                  <div class="text-subtitle-2">Edit Mode Entry</div>
                  <div class="text-caption">Target: &lt;100ms</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card
                variant="tonal"
                :color="getPerformanceColor(performanceResults.autocompleteTime, 50)"
              >
                <v-card-text>
                  <div class="text-h6">{{ performanceResults.autocompleteTime }}ms</div>
                  <div class="text-subtitle-2">Autocomplete Filter</div>
                  <div class="text-caption">Target: &lt;50ms</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card
                variant="tonal"
                :color="getPerformanceColor(performanceResults.confirmTime, 200)"
              >
                <v-card-text>
                  <div class="text-h6">{{ performanceResults.confirmTime }}ms</div>
                  <div class="text-subtitle-2">Confirm & Update</div>
                  <div class="text-caption">Target: &lt;200ms</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-alert
            v-if="performanceResults"
            :color="performanceResults.allPassed ? 'success' : 'warning'"
            variant="tonal"
            class="mt-4"
          >
            <strong>Overall Performance:</strong>
            {{
              performanceResults.allPassed
                ? 'All benchmarks passed ✓'
                : 'Some benchmarks need optimization ⚠'
            }}
          </v-alert>
        </v-card-text>
      </v-card>

      <!-- Element Plus Implementation -->
      <v-card class="mb-4">
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-view-dashboard-variant" class="me-2" />
          Element Plus Implementation
        </v-card-title>
        <v-card-text>
          <v-alert color="info" variant="tonal" class="mb-4">
            <strong>Battle-tested solution:</strong> Uses Element Plus el-select component with built-in z-index management, 
            teleported dropdowns, and virtual scrolling. Compare this implementation with the custom solutions above.
          </v-alert>

          <div class="d-flex align-center mb-3">
            <v-icon icon="mdi-file-document" size="16" class="me-2" />
            <strong class="text-body-2">quarterly-report-v2.pdf</strong>
          </div>

          <div class="tags-container mb-3">
            <!-- Element Plus tags using ElementTag component -->
            <ElementTag
              v-for="tag in elementPlusTags"
              :key="tag.id"
              :tag="tag"
              :categoryOptions="getLockedCategoryAlternatives(tag.categoryId)"
              :allowCustomInput="false"
              :tagColor="getTagColor(tag)"
              @tag-updated="handleElementTagUpdate"
              @tag-selected="handleElementTagSelected"
              @tag-created="handleElementTagCreated"
            />
          </div>

          <v-alert color="success" variant="tonal" density="compact">
            <v-icon size="14">mdi-information</v-icon>
            Element Plus handles z-index stacking, positioning, and accessibility automatically
          </v-alert>

          <div class="mt-3">
            <strong class="text-subtitle-2">Key Benefits:</strong>
            <ul class="text-body-2 mt-2">
              <li>Built-in z-index management eliminates stacking issues</li>
              <li>Teleported dropdowns escape parent overflow constraints</li>
              <li>Virtual scrolling for performance with large datasets</li>
              <li>WCAG accessibility compliance out-of-the-box</li>
              <li>Consistent cross-browser behavior</li>
            </ul>
          </div>
        </v-card-text>
      </v-card>

      <!-- Error Handling Demo -->
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-alert-circle-outline" class="me-2" />
          Error Handling & Edge Cases
        </v-card-title>
        <v-card-text>
          <v-alert color="info" variant="tonal" class="mb-4">
            Test how the system handles various error conditions and edge cases.
          </v-alert>

          <v-row>
            <v-col cols="12" md="6">
              <v-btn
                @click="simulateNetworkError"
                color="error"
                variant="outlined"
                block
                class="mb-2"
              >
                Simulate Network Error
              </v-btn>
              <v-btn
                @click="simulateInvalidInput"
                color="warning"
                variant="outlined"
                block
                class="mb-2"
              >
                Test Invalid Input
              </v-btn>
              <v-btn
                @click="simulateSlowResponse"
                color="orange"
                variant="outlined"
                block
                class="mb-2"
              >
                Simulate Slow Response
              </v-btn>
            </v-col>
            <v-col cols="12" md="6">
              <div v-if="errorDemo.active" class="error-demo-result">
                <v-alert :color="errorDemo.type === 'error' ? 'error' : 'warning'" variant="tonal">
                  <strong>{{ errorDemo.title }}</strong
                  ><br />
                  {{ errorDemo.message }}
                </v-alert>

                <v-progress-linear v-if="errorDemo.loading" indeterminate class="mt-2" />
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </div>
  </DemoContainer>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import DemoContainer from '../components/DemoContainer.vue';
import EditableTag from '@/components/features/tags/EditableTag.vue';
import ElementTag from '@/components/features/tags/ElementTag.vue';
import { getAutomaticTagColor } from '@/features/organizer/utils/automaticTagColors.js';

// Demo state management
const performanceStats = ref({
  lastEditTime: 0,
  autocompleteTime: 0,
  totalOperations: 0,
});

const performanceResults = ref(null);
const keyboardDemoStep = ref(1);
const keyboardDemoActive = ref(false);
const keyboardDemoTag = ref({
  displayValue: 'March',
  originalValue: 'March',
});

const errorDemo = ref({
  active: false,
  type: 'info',
  title: '',
  message: '',
  loading: false,
});

// Mock data structures
const mockCategories = ref([
  {
    id: 'time-period',
    name: 'Time Period',
    tags: [
      { id: 't1', tagName: 'January', source: 'human', description: 'First month of year' },
      { id: 't2', tagName: 'February', source: 'human', description: 'Second month of year' },
      { id: 't3', tagName: 'March', source: 'ai', description: 'Third month of year' },
      { id: 't4', tagName: 'April', source: 'ai', description: 'Fourth month of year' },
      { id: 't5', tagName: 'May', source: 'human', description: 'Fifth month of year' },
      { id: 't6', tagName: 'June', source: 'ai', description: 'Sixth month of year' },
      { id: 't7', tagName: 'July', source: 'human', description: 'Seventh month of year' },
      { id: 't8', tagName: 'August', source: 'ai', description: 'Eighth month of year' },
      { id: 't9', tagName: 'September', source: 'human', description: 'Ninth month of year' },
      { id: 't10', tagName: 'October', source: 'ai', description: 'Tenth month of year' },
      { id: 't11', tagName: 'November', source: 'human', description: 'Eleventh month of year' },
      { id: 't12', tagName: 'December', source: 'ai', description: 'Twelfth month of year' },
      { id: 't13', tagName: 'Q1', source: 'ai', description: 'First quarter' },
      { id: 't14', tagName: 'Q2', source: 'ai', description: 'Second quarter' },
      { id: 't15', tagName: 'Q3', source: 'ai', description: 'Third quarter' },
      { id: 't16', tagName: 'Q4', source: 'ai', description: 'Fourth quarter' },
    ],
  },
  {
    id: 'document-type',
    name: 'Document Type',
    tags: [
      { id: 'd1', tagName: 'Invoice', source: 'ai', description: 'Billing document' },
      { id: 'd2', tagName: 'Receipt', source: 'human', description: 'Payment confirmation' },
      { id: 'd3', tagName: 'Contract', source: 'human', description: 'Legal agreement' },
      { id: 'd4', tagName: 'Report', source: 'ai', description: 'Analysis document' },
      { id: 'd5', tagName: 'Statement', source: 'ai', description: 'Financial statement' },
      { id: 'd6', tagName: 'Memo', source: 'human', description: 'Internal note' },
      { id: 'd7', tagName: 'Proposal', source: 'human', description: 'Business proposal' },
      { id: 'd8', tagName: 'Quote', source: 'ai', description: 'Price quotation' },
      { id: 'd9', tagName: 'Purchase Order', source: 'human', description: 'Order document' },
      { id: 'd10', tagName: 'Bill of Lading', source: 'ai', description: 'Shipping document' },
      { id: 'd11', tagName: 'Tax Document', source: 'human', description: 'Tax-related paperwork' },
      {
        id: 'd12',
        tagName: 'Insurance Policy',
        source: 'ai',
        description: 'Insurance coverage document',
      },
      { id: 'd13', tagName: 'Warranty', source: 'human', description: 'Product warranty document' },
    ],
  },
  {
    id: 'priority',
    name: 'Priority',
    tags: [
      { id: 'p1', tagName: 'Urgent', source: 'human', description: 'Requires immediate attention' },
      { id: 'p2', tagName: 'High', source: 'ai', description: 'Important priority' },
      { id: 'p3', tagName: 'Medium', source: 'human', description: 'Standard priority' },
      { id: 'p4', tagName: 'Low', source: 'ai', description: 'Can be delayed' },
      { id: 'p5', tagName: 'Critical', source: 'human', description: 'Business critical' },
    ],
  },
  {
    id: 'status',
    name: 'Status',
    tags: [
      { id: 's1', tagName: 'Draft', source: 'human', description: 'Work in progress' },
      { id: 's2', tagName: 'Review', source: 'ai', description: 'Under review' },
      { id: 's3', tagName: 'Approved', source: 'human', description: 'Officially approved' },
      { id: 's4', tagName: 'Published', source: 'ai', description: 'Made public' },
      { id: 's5', tagName: 'Archived', source: 'human', description: 'No longer active' },
      { id: 's6', tagName: 'Pending', source: 'ai', description: 'Awaiting action' },
    ],
  },
  {
    id: 'year',
    name: 'Year',
    tags: Array.from({ length: 76 }, (_, i) => ({
      id: `y${i + 1}`,
      tagName: (2025 - i).toString(),
      source: i % 3 === 0 ? 'ai' : 'human',
      description: `Year ${2025 - i}`,
    })),
  },
]);

// Demo file tags (editable)
const demoFileTags = ref([
  {
    id: 'demo1',
    categoryId: 'time-period',
    tagName: 'March',
    source: 'ai',
    confidence: 92,
    filterText: '',
    highlightedIndex: -1,
    isFiltering: false,
  },
  {
    id: 'demo2',
    categoryId: 'document-type',
    tagName: 'Invoice',
    source: 'human',
    confidence: 100,
    filterText: '',
    highlightedIndex: -1,
    isFiltering: false,
  },
  {
    id: 'demo3',
    categoryId: 'priority',
    tagName: 'High',
    source: 'ai',
    confidence: 78,
    filterText: '',
    highlightedIndex: -1,
    isFiltering: false,
  },
  {
    id: 'demo4',
    categoryId: 'year',
    tagName: '2024',
    source: 'human',
    confidence: 95,
    filterText: '',
    highlightedIndex: -1,
    isFiltering: false,
  },
]);

// Open category demo tags (all categories as extensible)
const openCategoryTags = ref([
  {
    id: 'open1',
    categoryId: 'time-period',
    tagName: 'March',
    source: 'human',
    confidence: 100,
    filterText: '',
    filterTextRaw: '',
    highlightedIndex: -1,
    isFiltering: false,
    customInputValue: '',
    isHeaderEditing: false,
    hasStartedTyping: false,
    isOpen: false,
  },
  {
    id: 'open2',
    categoryId: 'document-type',
    tagName: 'Invoice',
    source: 'ai',
    confidence: 95,
    filterText: '',
    filterTextRaw: '',
    highlightedIndex: -1,
    isFiltering: false,
    customInputValue: '',
    isHeaderEditing: false,
    hasStartedTyping: false,
    isOpen: false,
  },
  {
    id: 'open3',
    categoryId: 'priority',
    tagName: 'High',
    source: 'human',
    confidence: 88,
    filterText: '',
    filterTextRaw: '',
    highlightedIndex: -1,
    isFiltering: false,
    customInputValue: '',
    isHeaderEditing: false,
    hasStartedTyping: false,
    isOpen: false,
  },
  {
    id: 'open4',
    categoryId: 'status',
    tagName: 'Draft',
    source: 'ai',
    confidence: 92,
    filterText: '',
    filterTextRaw: '',
    highlightedIndex: -1,
    isFiltering: false,
    customInputValue: '',
    isHeaderEditing: false,
    hasStartedTyping: false,
    isOpen: false,
  },
  {
    id: 'open5',
    categoryId: 'year',
    tagName: '2024',
    source: 'human',
    confidence: 100,
    filterText: '',
    filterTextRaw: '',
    highlightedIndex: -1,
    isFiltering: false,
    customInputValue: '',
    isHeaderEditing: false,
    hasStartedTyping: false,
    isOpen: false,
  },
]);

// Locked category demo tags (all categories as fixed sets)
const lockedCategoryTags = ref([
  {
    id: 'locked1',
    categoryId: 'time-period',
    tagName: 'April',
    source: 'system',
    confidence: 100,
    filterText: '',
    filterTextRaw: '',
    highlightedIndex: -1,
    isFiltering: false,
    customInputValue: '',
    isHeaderEditing: false,
    hasStartedTyping: false,
    isOpen: false,
  },
  {
    id: 'locked2',
    categoryId: 'document-type',
    tagName: 'Receipt',
    source: 'system',
    confidence: 100,
    filterText: '',
    filterTextRaw: '',
    highlightedIndex: -1,
    isFiltering: false,
    customInputValue: '',
    isHeaderEditing: false,
    hasStartedTyping: false,
    isOpen: false,
  },
  {
    id: 'locked3',
    categoryId: 'priority',
    tagName: 'Medium',
    source: 'system',
    confidence: 100,
    filterText: '',
    filterTextRaw: '',
    highlightedIndex: -1,
    isFiltering: false,
    customInputValue: '',
    isHeaderEditing: false,
    hasStartedTyping: false,
    isOpen: false,
  },
  {
    id: 'locked4',
    categoryId: 'status',
    tagName: 'Approved',
    source: 'system',
    confidence: 100,
    filterText: '',
    filterTextRaw: '',
    highlightedIndex: -1,
    isFiltering: false,
    customInputValue: '',
    isHeaderEditing: false,
    hasStartedTyping: false,
    isOpen: false,
  },
  {
    id: 'locked5',
    categoryId: 'year',
    tagName: '2023',
    source: 'system',
    confidence: 100,
    filterText: '',
    filterTextRaw: '',
    highlightedIndex: -1,
    isFiltering: false,
    customInputValue: '',
    isHeaderEditing: false,
    hasStartedTyping: false,
    isOpen: false,
  },
]);

// Element Plus demo tags (similar to locked category for comparison)
const elementPlusTags = ref([
  {
    id: 'element1',
    categoryId: 'time-period',
    tagName: 'April',
    source: 'element-plus',
    confidence: 100,
  },
  {
    id: 'element2',
    categoryId: 'document-type',
    tagName: 'Receipt',
    source: 'element-plus',
    confidence: 100,
  },
  {
    id: 'element3',
    categoryId: 'priority',
    tagName: 'Medium',
    source: 'element-plus',
    confidence: 100,
  },
  {
    id: 'element4',
    categoryId: 'status',
    tagName: 'Approved',
    source: 'element-plus',
    confidence: 100,
  },
  {
    id: 'element5',
    categoryId: 'year',
    tagName: '2023',
    source: 'element-plus',
    confidence: 100,
  },
]);

// Computed properties
const keyboardInstructions = computed(() => {
  const instructions = [
    'Double-click the tag to enter edit mode',
    'Type to filter options (try typing "A" for April)',
    'Use arrow keys ↑↓ to navigate suggestions',
    'Press Enter to confirm selection',
  ];
  return instructions[keyboardDemoStep.value - 1] || 'Demo completed!';
});

// Helper functions
const capitalizeFirstLetter = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const getCategoryName = (categoryId) => {
  const category = mockCategories.value.find((cat) => cat.id === categoryId);
  return category ? category.name : 'Unknown';
};

const getCategoryAlternatives = (categoryId) => {
  const category = mockCategories.value.find((cat) => cat.id === categoryId);
  return category ? category.tags : [];
};

// Helper functions for filtering and getting alternatives
const getOpenCategoryAlternatives = (categoryId) => {
  const category = mockCategories.value.find((cat) => cat.id === categoryId);
  return category ? category.tags : [];
};

const getLockedCategoryAlternatives = (categoryId) => {
  const category = mockCategories.value.find((cat) => cat.id === categoryId);
  return category ? category.tags : [];
};

// Filtering functions
const getFilteredOptions = (categoryId, filterText, isOpen = false) => {
  const alternatives = isOpen ? getOpenCategoryAlternatives(categoryId) : getLockedCategoryAlternatives(categoryId);
  if (!filterText) return alternatives;
  
  return alternatives.filter(option => 
    option.tagName.toLowerCase().startsWith(filterText.toLowerCase())
  );
};

const handleTagClick = (tag) => {
  // Check if already in editing mode before making changes
  const wasAlreadyEditing = tag.isHeaderEditing;
  
  // Open dropdown and enter edit mode in one action
  tag.isOpen = true;
  tag.isHeaderEditing = true;
  
  // Only reset hasStartedTyping on initial click, not during editing (prevents spacebar resets)
  if (!wasAlreadyEditing) {
    tag.hasStartedTyping = false;
  }
  
  // Update focused tag for pagination management
  if (currentFocusedTag.value && currentFocusedTag.value.id !== tag.id) {
    resetPaginationState(currentFocusedTag.value.id);
  }
  currentFocusedTag.value = tag;
  
  console.log(`Tag clicked and opened: ${tag.tagName}`);
};

const handleTagBlur = (event, tag) => {
  // Capture event data before timeout (event becomes stale inside setTimeout)
  const relatedTarget = event.relatedTarget;
  const currentTarget = event.currentTarget;
  
  // Add a small delay to allow clicks on dropdown options to register
  setTimeout(() => {
    const smartTagContainer = currentTarget ? currentTarget.closest('.smart-tag') : null;
    
    // Check if focus is still within the smart-tag container or dropdown elements
    const focusStillInTag = relatedTarget && smartTagContainer && smartTagContainer.contains(relatedTarget);
    const focusInDropdownOption = relatedTarget && relatedTarget.closest('.dropdown-option');
    const focusInPagination = relatedTarget && relatedTarget.closest('.dropdown-pagination');
    
    // Only keep dropdown open if focus is explicitly within dropdown elements
    if (!focusStillInTag && !focusInDropdownOption && !focusInPagination) {
      // Discard any typed text and revert to original value
      tag.filterText = '';
      tag.filterTextRaw = '';
      tag.isFiltering = false;
      tag.hasStartedTyping = false;
      tag.isHeaderEditing = false;
      tag.isOpen = false;
      console.log(`Focus lost - discarded typed text, reverted to: ${tag.tagName}`);
    } else {
      console.log(`Focus still within dropdown area, keeping open`);
    }
  }, 150); // Slightly longer delay
};

const startHeaderEdit = (tag) => {
  tag.isHeaderEditing = true;
  console.log(`Started editing header for: ${tag.tagName}`);
};

const stopHeaderEdit = (tag) => {
  tag.isHeaderEditing = false;
  console.log(`Stopped editing header for: ${tag.tagName}`);
};

const handleTypeToFilter = (event, tag, isOpen = false) => {
  // Only handle typing when header is in edit mode (for open categories)
  if (isOpen && !tag.isHeaderEditing) {
    return;
  }
  
  // Ignore non-alphanumeric keys except backspace
  if (event.key.length > 1 && event.key !== 'Backspace' && event.key !== 'Enter' && event.key !== 'Escape' && event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
    return;
  }
  
  // Handle special keys
  if (event.key === 'Escape') {
    // Discard typed text and revert to original value
    tag.filterText = '';
    tag.filterTextRaw = '';
    tag.isFiltering = false;
    tag.hasStartedTyping = false;
    tag.isHeaderEditing = false;
    tag.isOpen = false;
    console.log(`Escaped - reverted to original: ${tag.tagName}`);
    return;
  }
  
  if (event.key === 'Enter') {
    handleEnterKey(tag, isOpen);
    // Close dropdown after accepting value
    tag.isOpen = false;
    tag.isHeaderEditing = false;
    return;
  }
  
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    handleArrowNavigation(event, tag, isOpen);
    return;
  }
  
  // Handle text input
  let newFilterText = tag.filterText;
  
  if (event.key === 'Backspace') {
    newFilterText = newFilterText.slice(0, -1);
  } else if (event.key.length === 1) {
    newFilterText += event.key;
  }
  
  // Update filter state with capitalization
  const capitalizedText = capitalizeFirstLetter(newFilterText);
  tag.filterText = capitalizedText;  // Display capitalized version
  tag.filterTextRaw = newFilterText;  // Store original for filtering
  tag.isFiltering = capitalizedText.length > 0;
  
  // Mark that user has started typing (for cursor positioning)
  if (isOpen && capitalizedText.length > 0) {
    tag.hasStartedTyping = true;
    console.log(`Set hasStartedTyping=true for text: "${capitalizedText}" (length: ${capitalizedText.length})`);
  } else if (isOpen && capitalizedText.length === 0) {
    // Reset to left cursor when user has deleted all content
    tag.hasStartedTyping = false;
    console.log(`Reset hasStartedTyping=false - user deleted all content`);
  }
  
  if (isOpen) {
    tag.customInputValue = capitalizedText;
    tag.highlightedIndex = -1; // No auto-highlight for open categories
  } else {
    // For locked categories, highlight first match (use original text for filtering)
    const filteredOptions = getFilteredOptions(tag.categoryId, newFilterText, false);
    tag.highlightedIndex = filteredOptions.length > 0 ? 0 : -1;
  }
  
  console.log(`Filtering ${getCategoryName(tag.categoryId)} with: "${capitalizedText}"`);
  
  // Debug: Check filtered options count
  const debugFilteredCount = getFilteredOptions(tag.categoryId, capitalizedText, true).length;
  console.log(`Filtered options count: ${debugFilteredCount}, should hide line: ${debugFilteredCount === 0}`);
};

const handleEnterKey = (tag, isOpen) => {
  if (isOpen) {
    // For open categories, use filter text or current tag name
    const newValue = tag.filterText || tag.tagName;
    if (newValue && newValue !== tag.tagName) {
      // Add new option to category if it doesn't exist
      const category = mockCategories.value.find(cat => cat.id === tag.categoryId);
      if (category && !category.tags.some(option => option.tagName.toLowerCase() === newValue.toLowerCase())) {
        category.tags.push({
          id: `custom-${Date.now()}`,
          tagName: newValue,
          source: 'human',
          description: 'User-created custom tag'
        });
        console.log(`✓ Added "${newValue}" to ${getCategoryName(tag.categoryId)} category`);
      }
      tag.tagName = newValue;
      console.log(`Tag updated to: ${newValue}`);
    }
  } else {
    // For locked categories, use highlighted option
    const filteredOptions = getFilteredOptions(tag.categoryId, tag.filterText, false);
    if (tag.highlightedIndex >= 0 && tag.highlightedIndex < filteredOptions.length) {
      const selectedOption = filteredOptions[tag.highlightedIndex];
      tag.tagName = selectedOption.tagName;
      console.log(`Tag updated to: ${selectedOption.tagName}`);
    }
  }
  
  resetFilterState(tag);
};

const handleArrowNavigation = (event, tag, isOpen) => {
  if (isOpen) return; // No arrow navigation for open categories
  
  event.preventDefault();
  const filteredOptions = getFilteredOptions(tag.categoryId, tag.filterText, false);
  
  if (filteredOptions.length === 0) return;
  
  if (event.key === 'ArrowDown') {
    tag.highlightedIndex = (tag.highlightedIndex + 1) % filteredOptions.length;
  } else if (event.key === 'ArrowUp') {
    tag.highlightedIndex = tag.highlightedIndex <= 0 ? filteredOptions.length - 1 : tag.highlightedIndex - 1;
  }
};

const resetFilterState = (tag) => {
  tag.filterText = '';
  tag.filterTextRaw = '';
  tag.isFiltering = false;
  tag.highlightedIndex = -1;
  tag.customInputValue = '';
  tag.isHeaderEditing = false;
  tag.hasStartedTyping = false;
  tag.isOpen = false;
};

const getTagColor = (tag) => {
  const categoryIndex = mockCategories.value.findIndex((cat) => cat.id === tag.categoryId);
  return getAutomaticTagColor(categoryIndex >= 0 ? categoryIndex : 0);
};

const getPerformanceColor = (actual, target) => {
  if (actual <= target) return 'success';
  if (actual <= target * 1.5) return 'warning';
  return 'error';
};

// Simple tag interaction functions

const selectFromDropdown = (tag, newValue) => {
  const startTime = performance.now();

  tag.tagName = newValue;
  console.log(`Tag updated via dropdown: ${tag.tagName} → ${newValue}`);

  // Reset filter state and pagination
  resetFilterState(tag);
  resetPaginationState(tag.id);

  const endTime = performance.now();
  console.log(`Dropdown selection completed in ${Math.round((endTime - startTime) * 100) / 100}ms`);
};

// Reset pagination radio buttons to page 1 for a specific tag
const resetPaginationState = (tagId) => {
  // Reset all pagination radio buttons for this tag to page 1
  const pageRadios = document.querySelectorAll(`input[name*="${tagId}"]`);
  pageRadios.forEach((radio) => {
    radio.checked = radio.id.includes('page1');
  });
};

// Track which tag currently has focus to manage pagination state
const currentFocusedTag = ref(null);

// onTagFocus removed - replaced by handleTagClick single-element approach





const showTagInfo = (tag) => {
  console.log('Tag Info:', {
    name: tag.tagName,
    category: getCategoryName(tag.categoryId),
    source: tag.source,
    confidence: tag.confidence,
  });
};

// Demo functions
const demonstrateTagEdit = (categoryId, tagName) => {
  console.log(`Demonstrating edit for ${tagName} in category ${getCategoryName(categoryId)}`);
  const alternatives = getCategoryAlternatives(categoryId);
  console.log(
    'Available alternatives:',
    alternatives.map((alt) => alt.tagName)
  );
};

const showAddTagDemo = () => {
  console.log(
    'Add Tag Demo: This would show the traditional category selector for adding new tags'
  );
};


// Keyboard demo functions
const startKeyboardDemo = () => {
  keyboardDemoActive.value = true;
  keyboardDemoStep.value = 1;
  console.log('Keyboard navigation demo started');
};

// Performance testing functions
const runPerformanceTest = async () => {
  console.log('Running performance benchmark...');

  // Test 1: Edit mode entry time
  const editStart = performance.now();
  await simulateEditModeEntry();
  const editEnd = performance.now();
  const editModeTime = Math.round((editEnd - editStart) * 100) / 100;

  // Test 2: Autocomplete filtering time
  const autocompleteStart = performance.now();
  await simulateAutocompleteFilter();
  const autocompleteEnd = performance.now();
  const autocompleteTime = Math.round((autocompleteEnd - autocompleteStart) * 100) / 100;

  // Test 3: Confirm and update time
  const confirmStart = performance.now();
  await simulateConfirmUpdate();
  const confirmEnd = performance.now();
  const confirmTime = Math.round((confirmEnd - confirmStart) * 100) / 100;

  performanceResults.value = {
    editModeTime,
    autocompleteTime,
    confirmTime,
    allPassed: editModeTime < 100 && autocompleteTime < 50 && confirmTime < 200,
  };

  console.log('Performance test completed:', performanceResults.value);
};

const simulateEditModeEntry = () => {
  return new Promise((resolve) => {
    // Simulate DOM updates and focus management
    setTimeout(resolve, Math.random() * 50 + 20);
  });
};

const simulateAutocompleteFilter = () => {
  return new Promise((resolve) => {
    // Simulate filtering large datasets
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({ name: `Item ${i}` }));
    const filtered = largeDataset.filter((item) => item.name.includes('5'));
    setTimeout(resolve, Math.random() * 30 + 10);
  });
};

const simulateConfirmUpdate = () => {
  return new Promise((resolve) => {
    // Simulate API call and UI update
    setTimeout(resolve, Math.random() * 100 + 50);
  });
};

const runStressTest = async () => {
  console.log('Running stress test with 1000 tags...');

  const stressStart = performance.now();

  // Simulate rendering 1000 tags
  const largeCategoryData = Array.from({ length: 1000 }, (_, i) => ({
    id: `stress-${i}`,
    tagName: `StressTag${i}`,
    source: i % 2 === 0 ? 'ai' : 'human',
  }));

  // Simulate filtering performance
  const filterTests = ['A', 'B', 'C', 'Stress', '1', '5', '9'];
  for (const filter of filterTests) {
    const filterStart = performance.now();
    const filtered = largeCategoryData.filter((tag) =>
      tag.tagName.toLowerCase().includes(filter.toLowerCase())
    );
    const filterEnd = performance.now();
    console.log(
      `Filter "${filter}": ${filtered.length} results in ${Math.round((filterEnd - filterStart) * 100) / 100}ms`
    );
  }

  const stressEnd = performance.now();
  console.log(`Stress test completed in ${Math.round((stressEnd - stressStart) * 100) / 100}ms`);
};

const clearPerformanceTests = () => {
  performanceResults.value = null;
  performanceStats.value = {
    lastEditTime: 0,
    autocompleteTime: 0,
    totalOperations: 0,
  };
  console.log('Performance test results cleared');
};

// Error simulation functions
const simulateNetworkError = () => {
  errorDemo.value = {
    active: true,
    type: 'error',
    title: 'Network Error Simulation',
    message:
      'Failed to save tag changes. The system should show an error message and allow retry or rollback.',
    loading: false,
  };

  setTimeout(() => {
    errorDemo.value.active = false;
  }, 5000);
};

const simulateInvalidInput = () => {
  errorDemo.value = {
    active: true,
    type: 'warning',
    title: 'Invalid Input Handling',
    message:
      'User entered invalid characters or selected non-existent tag. System should validate input and show helpful feedback.',
    loading: false,
  };

  setTimeout(() => {
    errorDemo.value.active = false;
  }, 5000);
};

const simulateSlowResponse = () => {
  errorDemo.value = {
    active: true,
    type: 'info',
    title: 'Slow Response Handling',
    message:
      'Simulating slow network conditions. System should show loading states and prevent duplicate actions.',
    loading: true,
  };

  setTimeout(() => {
    errorDemo.value.loading = false;
    errorDemo.value.message = 'Response completed. Loading state cleared and UI re-enabled.';
  }, 3000);

  setTimeout(() => {
    errorDemo.value.active = false;
  }, 6000);
};

const trackAutocompletePerformance = () => {
  const start = performance.now();
  // Simulate filtering logic
  setTimeout(() => {
    const end = performance.now();
    performanceStats.value.autocompleteTime = Math.round((end - start) * 100) / 100;
  }, 0);
};

// Event handlers for locked tags using EditableTag component
const handleLockedTagUpdate = (updatedTag) => {
  console.log(`Locked tag updated:`, updatedTag);
  // For locked tags, we don't allow custom creation, so this mainly handles tag selection
};

const handleLockedTagSelected = ({ oldValue, newValue, tag }) => {
  console.log(`Locked tag selected: ${oldValue} → ${newValue}`);
  // The tag object is already updated by the composable
  // Could trigger any additional side effects here
};

// Event handlers for Element Plus tags
const handleElementTagUpdate = (updatedTag) => {
  console.log(`Element Plus tag updated:`, updatedTag);
};

const handleElementTagSelected = ({ oldValue, newValue, tag }) => {
  console.log(`Element Plus tag selected: ${oldValue} → ${newValue}`);
  // The tag object is already updated by the component
  // Could trigger any additional side effects here
};

const handleElementTagCreated = ({ tagName, categoryId, tag }) => {
  console.log(`Element Plus tag created: ${tagName} in category ${categoryId}`);
  // Add new option to category if it doesn't exist
  const category = mockCategories.value.find(cat => cat.id === categoryId);
  if (category && !category.tags.some(option => option.tagName.toLowerCase() === tagName.toLowerCase())) {
    category.tags.push({
      id: `custom-element-${Date.now()}`,
      tagName: tagName,
      source: 'element-plus-user',
      description: 'User-created Element Plus tag'
    });
    console.log(`✓ Added "${tagName}" to ${category.name} category via Element Plus`);
  }
};

// Global click handler to close open dropdowns and reset pagination
const handleGlobalClick = (event) => {
  // Check if click is outside any smart-tag container
  const clickedSmartTag = event.target.closest('.smart-tag');
  
  // Close any open dropdowns when clicking outside
  openCategoryTags.value.forEach(tag => {
    if (tag.isOpen) {
      const smartTagElement = document.querySelector(`[data-tag-id="${tag.id}"]`);
      if (!smartTagElement || !smartTagElement.contains(event.target)) {
        // Discard typed text and close dropdown
        tag.filterText = '';
        tag.filterTextRaw = '';
        tag.isFiltering = false;
        tag.hasStartedTyping = false;
        tag.isHeaderEditing = false;
        tag.isOpen = false;
        console.log(`Global click - closed dropdown for: ${tag.tagName}`);
      }
    }
  });
  
  // Reset pagination for previously focused tag
  if (!clickedSmartTag && currentFocusedTag.value) {
    resetPaginationState(currentFocusedTag.value.id);
    currentFocusedTag.value = null;
    console.log('Clicked outside tags - reset pagination');
  }
};

// Component lifecycle
onMounted(() => {
  console.log('Clickable Tag Demo loaded');
  console.log('Mock categories:', mockCategories.value.length);
  console.log('Demo tags:', demoFileTags.value.length);

  // Add global click handler
  document.addEventListener('click', handleGlobalClick);
});

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick);
});
</script>

<style scoped>
.tags-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-height: 40px;
}

/* Smart tag implementation - single element transformation */
.smart-tag {
  position: relative;
  display: inline-block;
  vertical-align: top;
  /* Ensure this element creates a new stacking context that can compete with Vuetify cards */
  z-index: 1000;
}

/* Tag button - transforms from compact to expanded */
.tag-button {
  border: 1px solid;
  border-color: inherit;
  border-radius: 12px;
  background-color: transparent;
  transition: all 0.2s ease-in-out;
  display: inline-block;
  position: relative;
  z-index: 1001; /* Slightly higher than container */
}

/* Compact state hover */
.smart-tag:not(.expanded) .tag-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Base button styling */
.tag-button {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background: none;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  width: 100%;
  outline: none;
}

/* Expanded state - becomes pill header */
.smart-tag.expanded .tag-button {
  border-radius: 12px 12px 0 0;
  padding: 6px 10px;
  background: white;
  border: 1px solid;
  border-color: inherit;
  border-bottom: none;
  transform: none;
}

/* Dropdown options container */
.dropdown-options {
  position: absolute;
  top: calc(100% - 5px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid;
  border-color: inherit;
  border-top: 1px solid;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  z-index: 1002; /* Highest in the tag component hierarchy */
  padding-top: 5px;
}

/* Hide horizontal dividing line when no options exist */
.dropdown-options.no-options {
  border-top: none;
}

/* Also hide pill header bottom border when no options */
.smart-tag.expanded .tag-button.no-options {
  border-bottom: 1px solid;
  border-color: inherit;
  border-radius: 12px;
}

.tag-icon {
  margin-right: 4px;
  font-size: 14px;
  transition: all 0.2s ease-in-out;
}

/* Transform tag icon to pencil on hover */
.smart-tag:hover .tag-icon::before {
  content: '\F064F'; /* mdi-pencil icon code */
}

.tag-text {
  flex: 1;
}

/* Allow dropdowns to escape container clipping */
.v-card-text,
.v-card,
.v-container {
  overflow: visible !important;
}

/* Remove old z-index focus management - no longer needed */

/* Remove old dropdown overlay CSS - no longer needed */

/* Remove old dropdown-expanded CSS - now handled by dropdown-options */

.dropdown-menu {
  border-top: 1px solid #eee;
  margin-top: 4px;
  padding-top: 4px;
}

.dropdown-header {
  padding: 4px 8px;
  font-weight: 600;
  border-bottom: 1px solid #eee;
  font-size: 10px;
  color: #666;
  margin-bottom: 2px;
}

.dropdown-option {
  display: block;
  width: 100%;
  padding: 4px 8px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 12px;
  border-radius: 4px;
  margin: 1px 0;
  /* Ensure proper keyboard navigation */
  outline: none;
}

.dropdown-option:hover,
.dropdown-option:focus {
  background-color: rgba(25, 118, 210, 0.1);
  outline: 2px solid rgba(25, 118, 210, 0.5);
  outline-offset: -2px;
}

.dropdown-option:active {
  background-color: rgba(25, 118, 210, 0.2);
}

.dropdown-option:last-child {
  margin-bottom: 4px;
}


/* CSS-only pagination */
.page-radio {
  display: none;
}

.page-content {
  display: none;
}

/* Show page 1 by default and when page1 radio is checked */
.dropdown-menu .page-1 {
  display: block;
}

.dropdown-menu .page-content:not(.page-1) {
  display: none;
}

/* Dynamic page switching for any page number */
input[id*='page1']:checked ~ .page-1 {
  display: block;
}
input[id*='page1']:checked ~ .page-content:not(.page-1) {
  display: none;
}

input[id*='page2']:checked ~ .page-2 {
  display: block;
}
input[id*='page2']:checked ~ .page-content:not(.page-2) {
  display: none;
}

input[id*='page3']:checked ~ .page-3 {
  display: block;
}
input[id*='page3']:checked ~ .page-content:not(.page-3) {
  display: none;
}

input[id*='page4']:checked ~ .page-4 {
  display: block;
}
input[id*='page4']:checked ~ .page-content:not(.page-4) {
  display: none;
}

input[id*='page5']:checked ~ .page-5 {
  display: block;
}
input[id*='page5']:checked ~ .page-content:not(.page-5) {
  display: none;
}

input[id*='page6']:checked ~ .page-6 {
  display: block;
}
input[id*='page6']:checked ~ .page-content:not(.page-6) {
  display: none;
}

input[id*='page7']:checked ~ .page-7 {
  display: block;
}
input[id*='page7']:checked ~ .page-content:not(.page-7) {
  display: none;
}

/* Locked category pagination rules */
input[id*='locked-page1']:checked ~ .page-1 {
  display: block;
}
input[id*='locked-page1']:checked ~ .page-content:not(.page-1) {
  display: none;
}

input[id*='locked-page2']:checked ~ .page-2 {
  display: block;
}
input[id*='locked-page2']:checked ~ .page-content:not(.page-2) {
  display: none;
}

input[id*='locked-page3']:checked ~ .page-3 {
  display: block;
}
input[id*='locked-page3']:checked ~ .page-content:not(.page-3) {
  display: none;
}

input[id*='locked-page4']:checked ~ .page-4 {
  display: block;
}
input[id*='locked-page4']:checked ~ .page-content:not(.page-4) {
  display: none;
}

input[id*='locked-page5']:checked ~ .page-5 {
  display: block;
}
input[id*='locked-page5']:checked ~ .page-content:not(.page-5) {
  display: none;
}

input[id*='locked-page6']:checked ~ .page-6 {
  display: block;
}
input[id*='locked-page6']:checked ~ .page-content:not(.page-6) {
  display: none;
}

input[id*='locked-page7']:checked ~ .page-7 {
  display: block;
}
input[id*='locked-page7']:checked ~ .page-content:not(.page-7) {
  display: none;
}

/* Open category pagination rules */
input[id*='open-page1']:checked ~ .page-1 {
  display: block;
}
input[id*='open-page1']:checked ~ .page-content:not(.page-1) {
  display: none;
}

input[id*='open-page2']:checked ~ .page-2 {
  display: block;
}
input[id*='open-page2']:checked ~ .page-content:not(.page-2) {
  display: none;
}

input[id*='open-page3']:checked ~ .page-3 {
  display: block;
}
input[id*='open-page3']:checked ~ .page-content:not(.page-3) {
  display: none;
}

input[id*='open-page4']:checked ~ .page-4 {
  display: block;
}
input[id*='open-page4']:checked ~ .page-content:not(.page-4) {
  display: none;
}

input[id*='open-page5']:checked ~ .page-5 {
  display: block;
}
input[id*='open-page5']:checked ~ .page-content:not(.page-5) {
  display: none;
}

input[id*='open-page6']:checked ~ .page-6 {
  display: block;
}
input[id*='open-page6']:checked ~ .page-content:not(.page-6) {
  display: none;
}

input[id*='open-page7']:checked ~ .page-7 {
  display: block;
}
input[id*='open-page7']:checked ~ .page-content:not(.page-7) {
  display: none;
}

.dropdown-ellipses {
  padding: 4px 8px;
  font-size: 11px;
  color: #666;
  font-style: italic;
  text-align: center;
  border-top: 1px solid #eee;
  margin-top: 2px;
  margin-bottom: 4px;
  /* Prevent text wrapping */
  white-space: nowrap;
  min-width: 80px;
  width: 100%;
  box-sizing: border-box;
}

.dropdown-pagination {
  cursor: pointer;
  transition: background-color 0.2s;
  /* Keep focus within dropdown container */
  outline: none;
}

.dropdown-pagination:hover {
  background-color: rgba(25, 118, 210, 0.05);
}

.dropdown-pagination:focus {
  background-color: rgba(25, 118, 210, 0.1);
  outline: 2px solid rgba(25, 118, 210, 0.5);
  outline-offset: -2px;
}

/* Remove old complex dropdown state management - using simple v-show now */


/* Highlighted option styling */
.dropdown-option.highlighted {
  background-color: rgba(25, 118, 210, 0.15) !important;
  outline: 2px solid rgba(25, 118, 210, 0.5);
  outline-offset: -2px;
  font-weight: 600;
}

/* Custom input preview styling */
.custom-input-preview {
  border-bottom: 1px solid #eee;
  margin-bottom: 4px;
  padding-bottom: 4px;
}

.custom-option {
  font-style: italic;
  background-color: rgba(76, 175, 80, 0.05) !important;
  border: 1px dashed rgba(76, 175, 80, 0.3);
  border-radius: 4px;
  position: relative;
}

.custom-option:hover,
.custom-option:focus {
  background-color: rgba(76, 175, 80, 0.1) !important;
  border-color: rgba(76, 175, 80, 0.5);
}

.custom-label {
  font-size: 10px;
  color: #4caf50;
  font-weight: 600;
  margin-left: 6px;
  background: rgba(76, 175, 80, 0.1);
  padding: 1px 4px;
  border-radius: 3px;
}

/* Enhanced keyboard focus styling */
.dropdown-overlay:focus {
  outline: 2px solid rgba(25, 118, 210, 0.3);
  outline-offset: 2px;
  border-radius: 8px;
}

/* Inline tag input field styling */
.tag-input-field {
  background: none;
  border: none;
  outline: none;
  font-size: 12px;
  color: inherit;
  padding: 0;
  margin: 0;
  font-family: inherit;
  width: auto;
  min-width: 20px;
  max-width: 150px;
  cursor: text;
  flex: 1;
}

/* Remove old header click CSS - no longer needed */

/* Flashing cursor for editing mode */
.tag-text.cursor-left::before {
  content: '|';
  animation: cursor-blink 1s infinite;
  margin-right: 1px;
  font-weight: normal;
}

.tag-text.cursor-right::after {
  content: '|';
  animation: cursor-blink 1s infinite;
  margin-left: 1px;
  font-weight: normal;
}

@keyframes cursor-blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

.keyboard-demo-area {
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background-color: #fafafa;
}

.error-demo-result {
  min-height: 80px;
}

/* Performance indicator colors */
.v-card--variant-tonal.text-success {
  background-color: rgba(76, 175, 80, 0.1);
}

.v-card--variant-tonal.text-warning {
  background-color: rgba(255, 152, 0, 0.1);
}

.v-card--variant-tonal.text-error {
  background-color: rgba(244, 67, 54, 0.1);
}
</style>
