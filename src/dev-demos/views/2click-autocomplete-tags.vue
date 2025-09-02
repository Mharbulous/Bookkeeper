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
      <!-- Current vs Proposed UX Comparison -->
      <v-card class="mb-4">
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-compare" class="me-2" />
          UX Comparison: Current vs Proposed
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="h-100">
                <v-card-subtitle class="text-red">Current System (3 clicks)</v-card-subtitle>
                <v-card-text>
                  <div class="mb-3">
                    <strong>To change "March" to "April":</strong>
                  </div>
                  <ol class="text-body-2">
                    <li>Click category dropdown → Select "Time Period"</li>
                    <li>Click tag dropdown → Select "April"</li>
                    <li>Click "Add" button → Confirm change</li>
                  </ol>
                  <v-alert color="warning" variant="tonal" class="mt-3">
                    <strong>Issues:</strong> Multiple steps, space inefficient, not intuitive
                  </v-alert>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="h-100">
                <v-card-subtitle class="text-green">Proposed System (1 click)</v-card-subtitle>
                <v-card-text>
                  <div class="mb-3">
                    <strong>To change "March" to "April":</strong>
                  </div>
                  <ol class="text-body-2">
                    <li>Click "March" tag → Type "April" → Press Enter or click elsewhere</li>
                  </ol>
                  <v-alert color="success" variant="tonal" class="mt-3">
                    <strong>Benefits:</strong> Single interaction, contextual options, space
                    efficient
                  </v-alert>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Interactive Tag Demo -->
      <v-card class="mb-4">
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-cursor-default-click-outline" class="me-2" />
          Interactive Demo: Hover to Reveal Edit
        </v-card-title>
        <v-card-text>
          <v-alert color="info" variant="tonal" class="mb-4">
            <strong>Instructions:</strong> Hover to see pencil icon. Single-click opens dropdown
            menu. Double-click opens text editor with autocomplete. Press Enter to confirm, Escape
            to cancel.
          </v-alert>

          <!-- Demo File with Tags -->
          <v-card variant="outlined" class="pa-4">
            <div class="d-flex align-center mb-3">
              <v-icon icon="mdi-file-document" size="20" class="me-2" />
              <strong>invoice-march-2024.pdf</strong>
              <v-spacer />
              <v-chip size="small" color="primary" variant="outlined">Demo File</v-chip>
            </div>

            <div class="tags-container">
              <!-- Render seamlessly editable tags -->
              <div
                v-for="tag in demoFileTags"
                :key="tag.id"
                class="clean-tag ma-1"
                :style="{ borderColor: getTagColor(tag), color: getTagColor(tag) }"
              >
                <!-- Pure CSS/HTML focus-based dropdown -->
                <div class="tag-container">
                  <button
                    class="tag-button"
                    @dblclick="startEditMode(tag)"
                    @focus="onTagFocus(tag)"
                  >
                    <i class="tag-icon mdi mdi-tag"></i>
                    <span class="tag-text">{{ tag.tagName }}</span>
                  </button>
                </div>

                <!-- Simple dropdown overlay -->
                <div class="dropdown-overlay">
                  <div
                    class="dropdown-expanded"
                    :style="{ borderColor: getTagColor(tag), color: getTagColor(tag) }"
                  >
                    <div class="dropdown-header-section">
                      <i class="tag-icon mdi mdi-tag"></i>
                      <span class="tag-text">{{ tag.tagName }}</span>
                    </div>
                    <div class="dropdown-menu">
                      <!-- Simple display for categories with 13 or fewer items -->
                      <template v-if="getCategoryAlternatives(tag.categoryId).length <= 13">
                        <button
                          v-for="option in getCategoryAlternatives(tag.categoryId)"
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
                            getCategoryAlternatives(tag.categoryId).length / 12
                          )"
                          :key="pageNum"
                          type="radio"
                          :name="`page-${tag.id}`"
                          :id="`page${pageNum}-${tag.id}`"
                          class="page-radio"
                          :checked="pageNum === 1"
                        />

                        <!-- Generate pages dynamically -->
                        <div
                          v-for="pageNum in Math.ceil(
                            getCategoryAlternatives(tag.categoryId).length / 12
                          )"
                          :key="pageNum"
                          :class="`page-content page-${pageNum}`"
                        >
                          <!-- Show 12 items for this page -->
                          <button
                            v-for="option in getCategoryAlternatives(tag.categoryId).slice(
                              (pageNum - 1) * 12,
                              pageNum * 12
                            )"
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
                              Math.ceil(getCategoryAlternatives(tag.categoryId).length / 12)
                            "
                            :for="`page${pageNum + 1}-${tag.id}`"
                            class="dropdown-ellipses dropdown-pagination"
                            tabindex="0"
                          >
                            ...{{
                              getCategoryAlternatives(tag.categoryId).length - pageNum * 12
                            }}
                            more
                          </label>

                          <!-- Restart button (only on the last page) -->
                          <label
                            v-if="
                              pageNum ===
                              Math.ceil(getCategoryAlternatives(tag.categoryId).length / 12)
                            "
                            :for="`page1-${tag.id}`"
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

                <!-- Edit mode overlay -->
                <div v-if="tag.isEditing" class="edit-overlay">
                  <i class="mdi mdi-pencil edit-mode-icon"></i>
                  <input
                    ref="editInput"
                    v-model="tag.tagName"
                    :list="`alternatives-${tag.id}`"
                    class="tag-input"
                    :style="{ color: getTagColor(tag) }"
                    @blur="onTagBlur(tag)"
                    @keydown.enter="confirmEdit(tag, $event)"
                    @keydown.escape="cancelEdit(tag, $event)"
                    @input="trackAutocompletePerformance"
                  />
                  <datalist :id="`alternatives-${tag.id}`">
                    <option
                      v-for="option in getCategoryAlternatives(tag.categoryId)"
                      :key="option.id"
                      :value="option.tagName"
                    />
                  </datalist>
                </div>
              </div>

              <!-- Add new tag demo -->
              <v-btn
                variant="outlined"
                size="small"
                color="primary"
                class="ma-1"
                @click="showAddTagDemo"
              >
                <v-icon start>mdi-plus</v-icon>
                Add Tag
              </v-btn>
            </div>

            <!-- Performance Stats -->
            <div v-if="performanceStats.lastEditTime" class="mt-3">
              <v-divider class="my-2" />
              <div class="text-caption text-medium-emphasis">
                Last edit took {{ performanceStats.lastEditTime }}ms (Target: &lt;100ms for edit
                mode entry, &lt;50ms for autocomplete)
                <span v-if="performanceStats.lastEditTime < 100" class="text-success">✓ PASS</span>
                <span v-else class="text-warning">⚠ SLOW</span>
              </div>
            </div>
          </v-card>
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
            <strong>Open Categories:</strong> Users and AI can add new options. Includes "Add new"
            option.<br />
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
                      class="clean-tag ma-1"
                      :style="{ borderColor: getTagColor(tag), color: getTagColor(tag) }"
                    >
                      <div class="tag-container">
                        <button
                          class="tag-button"
                          @dblclick="startEditMode(tag)"
                          @focus="onTagFocus(tag)"
                        >
                          <i class="tag-icon mdi mdi-tag"></i>
                          <span class="tag-text">{{ tag.tagName }}</span>
                        </button>
                      </div>

                      <!-- Open category dropdown with "Add new" option -->
                      <div class="dropdown-overlay">
                        <div
                          class="dropdown-expanded"
                          :style="{ borderColor: getTagColor(tag), color: getTagColor(tag) }"
                        >
                          <div class="dropdown-header-section">
                            <i class="tag-icon mdi mdi-tag"></i>
                            <span class="tag-text">{{ tag.tagName }}</span>
                          </div>
                          <div class="dropdown-menu">
                            <!-- Simple display for categories with 13 or fewer items -->
                            <template
                              v-if="getOpenCategoryAlternatives(tag.categoryId).length <= 13"
                            >
                              <button
                                v-for="option in getOpenCategoryAlternatives(tag.categoryId)"
                                :key="option.id"
                                class="dropdown-option"
                                tabindex="0"
                                @click="selectFromDropdown(tag, option.tagName)"
                              >
                                {{ option.tagName }}
                              </button>
                              <!-- Add new option for open categories -->
                              <button
                                class="dropdown-option add-new-option"
                                tabindex="0"
                                @click="showAddNewOption(tag)"
                              >
                                <v-icon size="12" class="me-1">mdi-plus</v-icon>
                                Add new
                              </button>
                            </template>

                            <!-- Pagination for categories with more than 13 items -->
                            <template v-else>
                              <!-- CSS-only pagination with radio buttons for proper multi-page support -->
                              <input
                                v-for="pageNum in Math.ceil(
                                  getOpenCategoryAlternatives(tag.categoryId).length / 12
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
                                  getOpenCategoryAlternatives(tag.categoryId).length / 12
                                )"
                                :key="pageNum"
                                :class="`page-content page-${pageNum}`"
                              >
                                <!-- Show 12 items for this page -->
                                <button
                                  v-for="option in getOpenCategoryAlternatives(
                                    tag.categoryId
                                  ).slice((pageNum - 1) * 12, pageNum * 12)"
                                  :key="option.id"
                                  class="dropdown-option"
                                  tabindex="0"
                                  @click="selectFromDropdown(tag, option.tagName)"
                                >
                                  {{ option.tagName }}
                                </button>

                                <!-- Add new option on every page for open categories -->
                                <button
                                  class="dropdown-option add-new-option"
                                  tabindex="0"
                                  @click="showAddNewOption(tag)"
                                >
                                  <v-icon size="12" class="me-1">mdi-plus</v-icon>
                                  Add new
                                </button>

                                <!-- Next page button (if not the last page) -->
                                <label
                                  v-if="
                                    pageNum <
                                    Math.ceil(
                                      getOpenCategoryAlternatives(tag.categoryId).length / 12
                                    )
                                  "
                                  :for="`open-page${pageNum + 1}-${tag.id}`"
                                  class="dropdown-ellipses dropdown-pagination"
                                  tabindex="0"
                                >
                                  ...{{
                                    getOpenCategoryAlternatives(tag.categoryId).length -
                                    pageNum * 12
                                  }}
                                  more
                                </label>

                                <!-- Restart button (only on the last page) -->
                                <label
                                  v-if="
                                    pageNum ===
                                    Math.ceil(
                                      getOpenCategoryAlternatives(tag.categoryId).length / 12
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

                      <!-- Edit mode overlay -->
                      <div v-if="tag.isEditing" class="edit-overlay">
                        <i class="mdi mdi-pencil edit-mode-icon"></i>
                        <input
                          ref="editInput"
                          v-model="tag.tagName"
                          :list="`open-alternatives-${tag.id}`"
                          class="tag-input"
                          :style="{ color: getTagColor(tag) }"
                          @blur="onTagBlur(tag)"
                          @keydown.enter="confirmEdit(tag, $event)"
                          @keydown.escape="cancelEdit(tag, $event)"
                        />
                        <datalist :id="`open-alternatives-${tag.id}`">
                          <option
                            v-for="option in getOpenCategoryAlternatives(tag.categoryId)"
                            :key="option.id"
                            :value="option.tagName"
                          />
                        </datalist>
                      </div>
                    </div>
                  </div>

                  <v-alert color="success" variant="tonal" density="compact">
                    <v-icon size="14">mdi-information</v-icon>
                    Users and AI can add custom tags like "Custom Time Period", "Custom Priority",
                    etc.
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
                    <!-- Locked category tag with fixed options -->
                    <div
                      v-for="tag in lockedCategoryTags"
                      :key="tag.id"
                      class="clean-tag ma-1"
                      :style="{ borderColor: getTagColor(tag), color: getTagColor(tag) }"
                    >
                      <div class="tag-container">
                        <button
                          class="tag-button"
                          @dblclick="startEditMode(tag)"
                          @focus="onTagFocus(tag)"
                        >
                          <i class="tag-icon mdi mdi-tag"></i>
                          <span class="tag-text">{{ tag.tagName }}</span>
                        </button>
                      </div>

                      <!-- Locked category dropdown without "Add new" option -->
                      <div class="dropdown-overlay">
                        <div
                          class="dropdown-expanded"
                          :style="{ borderColor: getTagColor(tag), color: getTagColor(tag) }"
                        >
                          <div class="dropdown-header-section">
                            <i class="tag-icon mdi mdi-tag"></i>
                            <span class="tag-text">{{ tag.tagName }}</span>
                          </div>
                          <div class="dropdown-menu">
                            <!-- Simple display for categories with 13 or fewer items -->
                            <template
                              v-if="getLockedCategoryAlternatives(tag.categoryId).length <= 13"
                            >
                              <button
                                v-for="option in getLockedCategoryAlternatives(tag.categoryId)"
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
                                  getLockedCategoryAlternatives(tag.categoryId).length / 12
                                )"
                                :key="pageNum"
                                type="radio"
                                :name="`locked-page-${tag.id}`"
                                :id="`locked-page${pageNum}-${tag.id}`"
                                class="page-radio"
                                :checked="pageNum === 1"
                              />

                              <!-- Generate pages dynamically -->
                              <div
                                v-for="pageNum in Math.ceil(
                                  getLockedCategoryAlternatives(tag.categoryId).length / 12
                                )"
                                :key="pageNum"
                                :class="`page-content page-${pageNum}`"
                              >
                                <!-- Show 12 items for this page -->
                                <button
                                  v-for="option in getLockedCategoryAlternatives(
                                    tag.categoryId
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
                                      getLockedCategoryAlternatives(tag.categoryId).length / 12
                                    )
                                  "
                                  :for="`locked-page${pageNum + 1}-${tag.id}`"
                                  class="dropdown-ellipses dropdown-pagination"
                                  tabindex="0"
                                >
                                  ...{{
                                    getLockedCategoryAlternatives(tag.categoryId).length -
                                    pageNum * 12
                                  }}
                                  more
                                </label>

                                <!-- Restart button (only on the last page) -->
                                <label
                                  v-if="
                                    pageNum ===
                                    Math.ceil(
                                      getLockedCategoryAlternatives(tag.categoryId).length / 12
                                    )
                                  "
                                  :for="`locked-page1-${tag.id}`"
                                  class="dropdown-ellipses dropdown-pagination restart-button"
                                  tabindex="0"
                                >
                                  ...restart
                                </label>
                              </div>
                            </template>
                            <!-- No "Add new" option for locked categories -->
                          </div>
                        </div>
                      </div>

                      <!-- Edit mode overlay -->
                      <div v-if="tag.isEditing" class="edit-overlay">
                        <i class="mdi mdi-pencil edit-mode-icon"></i>
                        <input
                          ref="editInput"
                          v-model="tag.tagName"
                          :list="`locked-alternatives-${tag.id}`"
                          class="tag-input"
                          :style="{ color: getTagColor(tag) }"
                          @blur="onTagBlur(tag)"
                          @keydown.enter="confirmEdit(tag, $event)"
                          @keydown.escape="cancelEdit(tag, $event)"
                        />
                        <datalist :id="`locked-alternatives-${tag.id}`">
                          <option
                            v-for="option in getLockedCategoryAlternatives(tag.categoryId)"
                            :key="option.id"
                            :value="option.tagName"
                          />
                        </datalist>
                      </div>
                    </div>
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

      <!-- Keyboard Navigation Demo -->
      <v-card class="mb-4">
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-keyboard" class="me-2" />
          Keyboard Navigation Workflow
        </v-card-title>
        <v-card-text>
          <v-alert color="info" variant="tonal" class="mb-4">
            <strong>Test Scenario:</strong> Complete tag editing using only keyboard input. No mouse
            clicks required after the initial double-click.
          </v-alert>

          <v-stepper :model-value="keyboardDemoStep" class="mb-4">
            <v-stepper-header>
              <v-stepper-item value="1" title="Double-click tag" />
              <v-divider />
              <v-stepper-item value="2" title="Type to filter" />
              <v-divider />
              <v-stepper-item value="3" title="Navigate with arrows" />
              <v-divider />
              <v-stepper-item value="4" title="Press Enter to confirm" />
            </v-stepper-header>
          </v-stepper>

          <div class="keyboard-demo-area">
            <v-chip
              color="orange"
              variant="outlined"
              size="small"
              class="ma-1"
              @dblclick="startKeyboardDemo"
            >
              <v-icon start size="14">mdi-calendar</v-icon>
              {{ keyboardDemoTag.displayValue }}
              <v-tooltip activator="parent">
                Double-click to start keyboard navigation demo
              </v-tooltip>
            </v-chip>

            <div
              v-if="keyboardDemoActive"
              class="mt-3 pa-3"
              style="border: 2px dashed #ccc; border-radius: 4px"
            >
              <div class="text-body-2 mb-2">
                <strong>Instructions:</strong> {{ keyboardInstructions }}
              </div>
              <div class="text-caption text-medium-emphasis">
                Current step: {{ keyboardDemoStep }}/4
              </div>
            </div>
          </div>
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
    isEditing: false,
    tempValue: '',
    originalValue: 'March',
  },
  {
    id: 'demo2',
    categoryId: 'document-type',
    tagName: 'Invoice',
    source: 'human',
    confidence: 100,
    isEditing: false,
    tempValue: '',
    originalValue: 'Invoice',
  },
  {
    id: 'demo3',
    categoryId: 'priority',
    tagName: 'High',
    source: 'ai',
    confidence: 78,
    isEditing: false,
    tempValue: '',
    originalValue: 'High',
  },
  {
    id: 'demo4',
    categoryId: 'year',
    tagName: '2024',
    source: 'human',
    confidence: 95,
    isEditing: false,
    tempValue: '',
    originalValue: '2024',
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
    isEditing: false,
    tempValue: '',
    originalValue: 'March',
  },
  {
    id: 'open2',
    categoryId: 'document-type',
    tagName: 'Invoice',
    source: 'ai',
    confidence: 95,
    isEditing: false,
    tempValue: '',
    originalValue: 'Invoice',
  },
  {
    id: 'open3',
    categoryId: 'priority',
    tagName: 'High',
    source: 'human',
    confidence: 88,
    isEditing: false,
    tempValue: '',
    originalValue: 'High',
  },
  {
    id: 'open4',
    categoryId: 'status',
    tagName: 'Draft',
    source: 'ai',
    confidence: 92,
    isEditing: false,
    tempValue: '',
    originalValue: 'Draft',
  },
  {
    id: 'open5',
    categoryId: 'year',
    tagName: '2024',
    source: 'human',
    confidence: 100,
    isEditing: false,
    tempValue: '',
    originalValue: '2024',
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
    isEditing: false,
    tempValue: '',
    originalValue: 'April',
  },
  {
    id: 'locked2',
    categoryId: 'document-type',
    tagName: 'Receipt',
    source: 'system',
    confidence: 100,
    isEditing: false,
    tempValue: '',
    originalValue: 'Receipt',
  },
  {
    id: 'locked3',
    categoryId: 'priority',
    tagName: 'Medium',
    source: 'system',
    confidence: 100,
    isEditing: false,
    tempValue: '',
    originalValue: 'Medium',
  },
  {
    id: 'locked4',
    categoryId: 'status',
    tagName: 'Approved',
    source: 'system',
    confidence: 100,
    isEditing: false,
    tempValue: '',
    originalValue: 'Approved',
  },
  {
    id: 'locked5',
    categoryId: 'year',
    tagName: '2023',
    source: 'system',
    confidence: 100,
    isEditing: false,
    tempValue: '',
    originalValue: '2023',
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
const getCategoryName = (categoryId) => {
  const category = mockCategories.value.find((cat) => cat.id === categoryId);
  return category ? category.name : 'Unknown';
};

const getCategoryAlternatives = (categoryId) => {
  const category = mockCategories.value.find((cat) => cat.id === categoryId);
  return category ? category.tags : [];
};

// Helper functions for open/locked categories
// Open categories use the same data as mockCategories but allow adding new options
const getOpenCategoryAlternatives = (categoryId) => {
  const category = mockCategories.value.find((cat) => cat.id === categoryId);
  return category ? category.tags : [];
};

// Locked categories use the same data as mockCategories but don't allow adding new options
const getLockedCategoryAlternatives = (categoryId) => {
  const category = mockCategories.value.find((cat) => cat.id === categoryId);
  return category ? category.tags : [];
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
const startEditMode = async (tag) => {
  const startTime = performance.now();

  // Store original value for potential cancellation
  tag.originalValue = tag.tagName;
  tag.isEditing = true;

  await nextTick();

  // Auto-focus the input
  setTimeout(() => {
    const inputs = document.querySelectorAll('.tag-input');
    if (inputs.length > 0) {
      inputs[inputs.length - 1].focus();
      inputs[inputs.length - 1].select();
    }
  }, 10);

  const endTime = performance.now();
  performanceStats.value.lastEditTime = Math.round((endTime - startTime) * 100) / 100;
  console.log(`Edit mode entered in ${performanceStats.value.lastEditTime}ms`);
};

const selectFromDropdown = (tag, newValue) => {
  const startTime = performance.now();

  tag.tagName = newValue;
  console.log(`Tag updated via dropdown: ${tag.originalValue || 'previous'} → ${newValue}`);

  // Reset pagination state for this tag to allow dropdown to close properly
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

const onTagFocus = (tag) => {
  // If a different tag is getting focus, reset the previous tag's pagination
  if (currentFocusedTag.value && currentFocusedTag.value.id !== tag.id) {
    resetPaginationState(currentFocusedTag.value.id);
  }

  // Update the currently focused tag
  currentFocusedTag.value = tag;

  console.log(`Tag focused: ${tag.tagName}`);
};

const onTagBlur = (tag) => {
  // Save the current value when losing focus
  if (tag.originalValue && tag.tagName !== tag.originalValue) {
    console.log(`Tag updated: ${tag.originalValue} → ${tag.tagName}`);
    // Simulate saving
    setTimeout(() => {
      console.log('Tag change saved successfully');
    }, 200);
  }
  // Clear the stored original value
  tag.originalValue = '';
};

const confirmEdit = (tag, event) => {
  const startTime = performance.now();

  if (tag.originalValue && tag.tagName !== tag.originalValue) {
    console.log(`Tag updated: ${tag.originalValue} → ${tag.tagName}`);
  }

  // Remove focus from input
  event.target.blur();

  const endTime = performance.now();
  const confirmTime = Math.round((endTime - startTime) * 100) / 100;
  console.log(`Tag update confirmed in ${confirmTime}ms`);
};

const cancelEdit = (tag, event) => {
  // Restore original value
  if (tag.originalValue) {
    tag.tagName = tag.originalValue;
    tag.originalValue = '';
  }

  // Remove focus from input
  event.target.blur();

  console.log('Tag edit cancelled');
};

const handleEditBlur = (tag) => {
  // Small delay to allow click events to process first
  setTimeout(() => {
    if (tag.isEditing) {
      if (tag.tempValue && tag.tempValue !== tag.originalValue) {
        confirmEdit(tag);
      } else {
        cancelEdit(tag);
      }
    }
  }, 150);
};

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

// Open category functions
const showAddNewOption = (tag) => {
  console.log(`Add new option for ${getCategoryName(tag.categoryId)} category`);
  console.log('In a real implementation, this would:');
  console.log('1. Show a dialog for entering new tag name');
  console.log('2. Validate the new tag name');
  console.log('3. Add it to the category options');
  console.log('4. Update the current tag to the new value');

  // Demo: simulate adding a new option to the mockCategories
  const categoryId = tag.categoryId;
  const category = mockCategories.value.find((cat) => cat.id === categoryId);
  if (category) {
    const newTagName = `Custom ${category.name} ${category.tags.length + 1}`;
    const newId = `custom-${Date.now()}`;

    category.tags.push({
      id: newId,
      tagName: newTagName,
      source: 'human',
      description: 'User-created custom tag',
    });

    // Update the current tag to the new value
    tag.tagName = newTagName;
    console.log(`✓ Added "${newTagName}" to ${category.name} category`);
    console.log(`Category now has ${category.tags.length} tags`);
  }
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

// Global click handler to reset pagination when clicking outside tags
const handleGlobalClick = (event) => {
  // Check if click is outside any tag container
  const clickedTag = event.target.closest('.clean-tag');
  if (!clickedTag && currentFocusedTag.value) {
    // Reset pagination for the previously focused tag
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

/* Clean CSS-only tag implementation */
.clean-tag {
  position: relative;
  display: inline-block;
  /* Maintain space for absolute positioning */
  vertical-align: top;
}

/* Original tag container - always stays in layout */
.tag-container {
  border: 1px solid;
  border-color: inherit;
  border-radius: 16px;
  background-color: transparent;
  transition: all 0.2s ease-in-out;
  display: inline-block;
}

.tag-container:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tag-button {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background: none;
  border: none;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  width: 100%;
  outline: none;
}

.tag-icon {
  margin-right: 4px;
  font-size: 14px;
  transition: all 0.2s ease-in-out;
}

/* Transform tag icon to pencil on hover */
.clean-tag:hover .tag-icon::before {
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

/* Boost parent card z-index when dropdown is open */
.v-card:has(.clean-tag:focus-within),
.v-card-text:has(.clean-tag:focus-within),
.v-card:has(.dropdown-pagination:focus),
.v-card:has(.dropdown-pagination:active),
.v-card:has(.dropdown-pagination:hover),
.v-card:has(input[id*='page']:checked),
.v-card:has(label[for*='page']:focus),
.v-card:has(label[for*='page']:active),
.v-card:has(label[for*='page']:hover),
.v-card-text:has(.dropdown-pagination:focus),
.v-card-text:has(.dropdown-pagination:active),
.v-card-text:has(.dropdown-pagination:hover),
.v-card-text:has(input[id*='page']:checked),
.v-card-text:has(label[for*='page']:focus),
.v-card-text:has(label[for*='page']:active),
.v-card-text:has(label[for*='page']:hover) {
  z-index: 1000 !important;
  position: relative;
}

/* Simple dropdown overlay positioned at tag location */
.dropdown-overlay {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1001;
  display: none;
}

/* Show dropdown when tag has focus */
.clean-tag:focus-within .dropdown-overlay {
  display: block;
}

/* Keep dropdown open when pagination elements are active */
.clean-tag:has(.dropdown-pagination:focus) .dropdown-overlay,
.clean-tag:has(.dropdown-pagination:active) .dropdown-overlay,
.clean-tag:has(.dropdown-pagination:hover) .dropdown-overlay {
  display: block !important;
}

/* Dropdown expanded version */
.dropdown-overlay .dropdown-expanded {
  position: relative;
}

/* Hide original tag when dropdown is open */
.clean-tag:focus-within .tag-container {
  opacity: 0;
}

.dropdown-expanded {
  background: white;
  border: 1px solid;
  border-color: inherit;
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  min-width: 100%;
}

.dropdown-header-section {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  font-size: 12px;
}

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

/* Special styling for "Add new" option */
.add-new-option {
  border-top: 1px solid #eee;
  margin-top: 4px;
  padding-top: 6px;
  color: #1976d2;
  font-style: italic;
  display: flex;
  align-items: center;
}

.add-new-option:hover,
.add-new-option:focus {
  background-color: rgba(25, 118, 210, 0.08);
  color: #1565c0;
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

/* Keep dropdown open when pagination elements are actively being used */
.clean-tag:has(.dropdown-pagination:focus) .dropdown-overlay,
.clean-tag:has(.dropdown-pagination:active) .dropdown-overlay,
.clean-tag:has(.dropdown-pagination:hover) .dropdown-overlay {
  display: block !important;
}

/* Keep dropdown open when radio buttons are being toggled */
.dropdown-overlay:has(.dropdown-pagination:focus),
.dropdown-overlay:has(.dropdown-pagination:active),
.dropdown-overlay:has(.dropdown-pagination:hover) {
  display: block !important;
}

/* Keep dropdown open during radio button state changes */
.clean-tag:has(input[type='radio']:focus) .dropdown-overlay,
.clean-tag:has(input[type='radio']:active) .dropdown-overlay {
  display: block !important;
}

/* CRITICAL: Keep dropdown open when any non-default page is selected */
/* This catches the transition moment when pagination elements become hidden */
.clean-tag:has(input[id*='page2']:checked) .dropdown-overlay,
.clean-tag:has(input[id*='page3']:checked) .dropdown-overlay,
.clean-tag:has(input[id*='page4']:checked) .dropdown-overlay,
.clean-tag:has(input[id*='page5']:checked) .dropdown-overlay,
.clean-tag:has(input[id*='page6']:checked) .dropdown-overlay,
.clean-tag:has(input[id*='page7']:checked) .dropdown-overlay {
  display: block !important;
}

/* Support locked category pagination as well */
.clean-tag:has(input[id*='locked-page2']:checked) .dropdown-overlay,
.clean-tag:has(input[id*='locked-page3']:checked) .dropdown-overlay,
.clean-tag:has(input[id*='locked-page4']:checked) .dropdown-overlay,
.clean-tag:has(input[id*='locked-page5']:checked) .dropdown-overlay,
.clean-tag:has(input[id*='locked-page6']:checked) .dropdown-overlay,
.clean-tag:has(input[id*='locked-page7']:checked) .dropdown-overlay {
  display: block !important;
}

/* Support open category pagination as well */
.clean-tag:has(input[id*='open-page2']:checked) .dropdown-overlay,
.clean-tag:has(input[id*='open-page3']:checked) .dropdown-overlay,
.clean-tag:has(input[id*='open-page4']:checked) .dropdown-overlay,
.clean-tag:has(input[id*='open-page5']:checked) .dropdown-overlay,
.clean-tag:has(input[id*='open-page6']:checked) .dropdown-overlay,
.clean-tag:has(input[id*='open-page7']:checked) .dropdown-overlay {
  display: block !important;
}

/* Edit mode overlay */
.edit-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background: inherit;
  border: 1px solid;
  border-color: inherit;
  border-radius: 16px;
  z-index: 1001;
}

.edit-mode-icon {
  margin-right: 4px;
  font-size: 14px;
}

.tag-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: inherit;
  color: inherit;
  font-family: inherit;
  min-width: 40px;
  flex: 1;
  padding: 0;
  margin: 0;
}

.tag-input:focus {
  outline: 2px solid rgba(25, 118, 210, 0.5);
  outline-offset: 2px;
  border-radius: 2px;
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
