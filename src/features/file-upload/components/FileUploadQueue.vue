     1→<template>
     2→  <v-card variant="outlined" class="upload-queue">
     3→    <v-card-title class="d-flex align-center justify-space-between queue-header">
     4→      <div class="d-flex align-center">
     5→        <v-icon icon="mdi-file-multiple" class="me-2" />
     6→        Upload Queue
     7→        <QueueTimeProgress
     8→          v-if="showTimeProgress"
     9→          :is-visible="showTimeProgress"
    10→          :elapsed-time="timeProgress.elapsedTime"
    11→          :progress-percentage="timeProgress.progressPercentage"
    12→          :is-overdue="timeProgress.isOverdue"
    13→          :overdue-seconds="timeProgress.overdueSeconds"
    14→          :time-remaining="timeProgress.timeRemaining"
    15→          :formatted-elapsed-time="timeProgress.formattedElapsedTime"
    16→          :formatted-time-remaining="timeProgress.formattedTimeRemaining"
    17→          :estimated-duration="timeProgress.estimatedDuration"
    18→          class="ml-4"
    19→        />
    20→      </div>
    21→
    22→      <div class="d-flex gap-2">
    23→        <ClearAllButton :disabled="files.length === 0 || isUploading" @click="handleClearQueue" />
    24→
    25→        <!-- Upload Controls -->
    26→        <v-btn
    27→          v-if="!isUploading && !isPaused"
    28→          color="primary"
    29→          variant="elevated"
    30→          prepend-icon="mdi-upload"
    31→          @click="$emit('start-upload')"
    32→          :disabled="files.length === 0 || hasErrors"
    33→          :loading="isStartingUpload"
    34→        >
    35→          Start Upload
    36→        </v-btn>
    37→
    38→        <!-- Uploading State Button -->
    39→        <v-btn
    40→          v-if="isUploading"
    41→          color="warning"
    42→          variant="elevated"
    43→          prepend-icon="mdi-pause"
    44→          @click="$emit('pause-upload')"
    45→        >
    46→          Pause Upload
    47→        </v-btn>
    48→
    49→        <!-- Paused State Button -->
    50→        <v-btn
    51→          v-if="isPaused"
    52→          color="primary"
    53→          variant="elevated"
    54→          prepend-icon="mdi-play"
    55→          @click="$emit('resume-upload')"
    56→        >
    57→          Resume Upload
    58→        </v-btn>
    59→      </div>
    60→    </v-card-title>
    61→
    62→    <v-divider class="queue-divider" />
    63→
    64→    <div class="pa-4 queue-static-content">
    65→      <!-- Status Chips -->
    66→      <FileQueueChips
    67→        :files="files"
    68→        :is-processing-ui-update="isProcessingUIUpdate"
    69→        :ui-update-progress="uiUpdateProgress"
    70→        :total-analyzed-files="totalAnalyzedFiles"
    71→        :has-upload-started="hasUploadStarted"
    72→        :upload-status="uploadStatus"
    73→      />
    74→
    75→      <!-- UI Update Progress Indicator -->
    76→      <v-card
    77→        v-if="isProcessingUIUpdate"
    78→        class="mb-4 bg-blue-lighten-5 border-blue-lighten-2"
    79→        variant="outlined"
    80→      >
    81→        <v-card-text class="py-3">
    82→          <div class="d-flex align-center">
    83→            <v-progress-circular indeterminate color="blue" size="20" width="2" class="me-3" />
    84→            <div class="flex-grow-1">
    85→              <div class="text-body-2 font-weight-medium text-blue-darken-2">
    86→                {{ getLoadingMessage() }}
    87→              </div>
    88→              <div class="text-caption text-blue-darken-1 mt-1">
    89→                {{ uiUpdateProgress.current }} of {{ uiUpdateProgress.total }} files loaded ({{
    90→                  uiUpdateProgress.percentage
    91→                }}%)
    92→              </div>
    93→            </div>
    94→            <div class="text-caption text-blue-darken-1">
    95→              {{ getPhaseMessage() }}
    96→            </div>
    97→          </div>
    98→
    99→          <!-- Progress bar -->
   100→          <v-progress-linear
   101→            :model-value="uiUpdateProgress.percentage"
   102→            color="blue"
   103→            bg-color="blue-lighten-4"
   104→            height="4"
   105→            rounded
   106→            class="mt-3"
   107→          />
   108→        </v-card-text>
   109→      </v-card>
   110→
   111→      <!-- Current Upload Progress -->
   112→      <v-card
   113→        v-if="uploadStatus.isUploading && uploadStatus.currentFile"
   114→        class="mb-4 bg-green-lighten-5 border-green-lighten-2"
   115→        variant="outlined"
   116→      >
   117→        <v-card-text class="py-3">
   118→          <div class="d-flex align-center">
   119→            <v-progress-circular indeterminate color="green" size="20" width="2" class="me-3" />
   120→            <div class="flex-grow-1">
   121→              <div class="text-body-2 font-weight-medium text-green-darken-2">
   122→                {{ getCurrentActionText() }}
   123→              </div>
   124→              <div class="text-body-1">{{ uploadStatus.currentFile }}</div>
   125→            </div>
   126→          </div>
   127→        </v-card-text>
   128→      </v-card>
   129→
   130→      <!-- Files List - Grouped by duplicates -->
   131→      <div class="scrollable-content">
   132→        <div v-for="(group, groupIndex) in groupedFiles" :key="groupIndex">
   133→          <!-- Files in Group -->
   134→          <v-list lines="two" density="comfortable">
   135→            <template
   136→              v-for="(file, fileIndex) in group.files"
   137→              :key="`${file.id || groupIndex + '-' + fileIndex}-${file.status || 'pending'}`"
   138→            >
   139→              <!-- Conditional rendering: Placeholder or Loaded Item -->
   140→              <FileQueuePlaceholder
   141→                v-if="!isItemLoaded(groupIndex, fileIndex)"
   142→                :is-duplicate="file.isDuplicate"
   143→                @load="loadItem(groupIndex, fileIndex)"
   144→              />
   145→              <LazyFileItem v-else :file="file" :group="group" />
   146→
   147→              <v-divider v-if="fileIndex < group.files.length - 1" />
   148→            </template>
   149→          </v-list>
   150→
   151→          <!-- Spacing between groups -->
   152→          <div v-if="groupIndex < groupedFiles.length - 1" class="my-4"></div>
   153→        </div>
   154→
   155→        <!-- Empty state -->
   156→        <div v-if="files.length === 0" class="text-center py-8">
   157→          <v-icon icon="mdi-file-outline" size="48" color="grey-lighten-1" class="mb-2" />
   158→          <p class="text-body-1 text-grey-darken-1">No files in queue</p>
   159→          <p class="text-caption text-grey-darken-2">
   160→            Drag and drop files or use the upload buttons above
   161→          </p>
   162→        </div>
   163→      </div>
   164→    </div>
   165→
   166→    <!-- Upload Summary -->
   167→    <v-card-actions v-if="files.length > 0" class="bg-grey-lighten-5 queue-footer">
   168→      <div class="d-flex w-100 justify-space-between align-center">
   169→        <div class="text-body-2 text-grey-darken-1">
   170→          <strong>{{ uploadableFiles.length }}</strong> files ready for upload
   171→          <span v-if="skippableFiles.length > 0">
   172→            • <strong>{{ skippableFiles.length }}</strong> will be skipped
   173→          </span>
   174→        </div>
   175→
   176→        <div class="text-body-2 text-grey-darken-1">
   177→          Total size: <strong>{{ formatFileSize(totalSize) }}</strong>
   178→        </div>
   179→      </div>
   180→    </v-card-actions>
   181→  </v-card>
   182→</template>
   183→
   184→<script setup>
   185→import { computed, onMounted, onUnmounted, watch } from 'vue';
   186→import { useLazyHashTooltip } from '../../../composables/useLazyHashTooltip.js';
   187→import { useLazyFileList } from '../../../composables/useLazyFileList.js';
   188→import FileQueuePlaceholder from './FileQueuePlaceholder.vue';
   189→import LazyFileItem from './LazyFileItem.vue';
   190→import FileQueueChips from './FileQueueChips.vue';
   191→import QueueTimeProgress from './QueueTimeProgress.vue';
   192→import ClearAllButton from '../../../components/base/ClearAllButton.vue';
   193→
   194→// Component configuration
   195→defineOptions({
   196→  name: 'FileUploadQueue',
   197→});
   198→
   199→// Props
   200→const props = defineProps({
   201→  files: {
   202→    type: Array,
   203→    required: true,
   204→    default: () => [],
   205→  },
   206→  isProcessingUIUpdate: {
   207→    type: Boolean,
   208→    default: false,
   209→  },
   210→  uiUpdateProgress: {
   211→    type: Object,
   212→    default: () => ({
   213→      current: 0,
   214→      total: 0,
   215→      percentage: 0,
   216→      phase: 'loading',
   217→    }),
   218→  },
   219→  // Time progress props
   220→  showTimeProgress: {
   221→    type: Boolean,
   222→    default: false,
   223→  },
   224→  timeProgress: {
   225→    type: Object,
   226→    default: () => ({
   227→      elapsedTime: 0,
   228→      progressPercentage: 0,
   229→      isOverdue: false,
   230→      overdueSeconds: 0,
   231→      timeRemaining: 0,
   232→      formattedElapsedTime: '0s',
   233→      formattedTimeRemaining: '0s',
   234→      estimatedDuration: 0,
   235→    }),
   236→  },
   237→  // Upload state props
   238→  isUploading: {
   239→    type: Boolean,
   240→    default: false,
   241→  },
   242→  isPaused: {
   243→    type: Boolean,
   244→    default: false,
   245→  },
   246→  isStartingUpload: {
   247→    type: Boolean,
   248→    default: false,
   249→  },
   250→  totalAnalyzedFiles: {
   251→    type: Number,
   252→    default: null,
   253→  },
   254→  uploadStatus: {
   255→    type: Object,
   256→    default: () => ({
   257→      successful: 0,
   258→      failed: 0,
   259→      skipped: 0,
   260→      isUploading: false,
   261→      currentFile: null,
   262→      currentAction: null,
   263→    }),
   264→  },
   265→});
   266→
   267→// Emits
   268→const emit = defineEmits([
   269→  'remove-file',
   270→  'start-upload',
   271→  'pause-upload',
   272→  'resume-upload',
   273→  'clear-queue',
   274→]);
   275→
   276→// Hash tooltip functionality (only for cache management)
   277→const { populateExistingHash, clearCache } = useLazyHashTooltip();
   278→
   279→// Populate existing hashes when component mounts or props change
   280→const populateExistingHashes = () => {
   281→  props.files.forEach((file) => {
   282→    if (file.hash) {
   283→      populateExistingHash(file.id || file.name, file.hash);
   284→    }
   285→  });
   286→};
   287→
   288→// Populate hashes on mount and when files change
   289→onMounted(populateExistingHashes);
   290→
   291→// Clean up on unmount
   292→onUnmounted(() => {
   293→  clearCache();
   294→});
   295→
   296→// Lazy file list functionality
   297→const { loadItem, isItemLoaded, preloadInitialItems, resetLoadedItems } = useLazyFileList(
   298→  computed(() => groupedFiles.value)
   299→);
   300→
   301→// Preload initial items for better UX
   302→onMounted(() => {
   303→  preloadInitialItems(10);
   304→});
   305→
   306→// Reset loaded items when files change
   307→watch(
   308→  () => props.files,
   309→  () => {
   310→    resetLoadedItems();
   311→    // Re-preload initial items after files change
   312→    preloadInitialItems(10);
   313→  },
   314→  { deep: true }
   315→);
   316→
   317→// Clear queue handler with UI component cleanup
   318→const handleClearQueue = () => {
   319→  try {
   320→    console.log('Clearing UI component caches...');
   321→
   322→    // Clear lazy loading caches (idempotent operations)
   323→    try {
   324→      clearCache(); // Hash tooltip cache
   325→    } catch (error) {
   326→      console.warn('Error clearing hash tooltip cache:', error);
   327→    }
   328→
   329→    try {
   330→      resetLoadedItems(); // Lazy file list cache
   331→    } catch (error) {
   332→      console.warn('Error resetting loaded items:', error);
   333→    }
   334→
   335→    // Always emit the clear-queue event to parent
   336→    emit('clear-queue');
   337→  } catch (error) {
   338→    console.error('Error during UI component cleanup:', error);
   339→    // Always emit the event even if cleanup fails
   340→    try {
   341→      emit('clear-queue');
   342→    } catch (emitError) {
   343→    console.error('Failed to emit clear-queue event:', emitError);
   344→    }
   345→  }
   346→};
   347→
   348→// Computed properties
   349→const uploadableFiles = computed(() => {
   350→  return props.files.filter((file) => !file.isDuplicate);
   351→});
   352→
   353→const skippableFiles = computed(() => {
   354→  return props.files.filter((file) => file.isDuplicate);
   355→});
   356→
   357→// Group files for better duplicate visualization
   358→const groupedFiles = computed(() => {
   359→  const groups = new Map();
   360→
   361→  // Group files by hash (for duplicates) or by unique ID (for singles)
   362→  props.files.forEach((file) => {
   363→    const groupKey = file.hash || `unique_${file.name}_${file.size}_${file.lastModified}`;
   364→
   365→    if (!groups.has(groupKey)) {
   366→      groups.set(groupKey, {
   367→        files: [],
   368→        isDuplicateGroup: false,
   369→        groupName: file.name,
   370→      });
   371→    }
   372→
   373→    groups.get(groupKey).files.push(file);
   374→  });
   375→
   376→  // Mark groups with multiple files as duplicate groups
   377→  for (const group of groups.values()) {
   378→    if (group.files.length > 1) {
   379→      group.isDuplicateGroup = true;
   380→      // Sort within group: kept files first, then duplicates
   381→      group.files.sort((a, b) => {
   382→        if (a.isDuplicate !== b.isDuplicate) {
   383→          return a.isDuplicate ? 1 : -1; // Non-duplicates first
   384→        }
   385→        return a.originalIndex - b.originalIndex;
   386→      });
   387→    }
   388→  }
   389→
   390→  return Array.from(groups.values());
   391→});
   392→
   393→// Watch for file changes and populate existing hashes
   394→watch(() => props.files, populateExistingHashes, { deep: true });
   395→
   396→const totalSize = computed(() => {
   397→  return uploadableFiles.value.reduce((total, file) => total + file.size, 0);
   398→});
   399→
   400→const hasErrors = computed(() => {
   401→  return props.files.some((file) => file.status === 'error');
   402→});
   403→
   404→const hasUploadStarted = computed(() => {
   405→  return (
   406→    props.isUploading ||
   407→    props.isPaused ||
   408→    props.isStartingUpload ||
   409→    props.uploadStatus.successful > 0 ||
   410→    props.uploadStatus.failed > 0 ||
   411→    props.uploadStatus.skipped > 0
   412→  );
   413→});
   414→
   415→// Methods
   416→const formatFileSize = (bytes) => {
   417→  if (bytes === 0) return '0 B';
   418→
   419→  const k = 1024;
   420→  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
   421→  const i = Math.floor(Math.log(bytes) / Math.log(k));
   422→
   423→  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
   424→};
   425→
   426→const getCurrentActionText = () => {
   427→  switch (props.uploadStatus.currentAction) {
   428→    case 'calculating_hash':
   429→      return 'Calculating file hash...';
   430→    case 'checking_existing':
   431→      return 'Checking if file exists...';
   432→    case 'uploading':
   433→      return 'Uploading file...';
   434→    default:
   435→      return 'Processing file...';
   436→  }
   437→};
   438→
   439→// 2-chunk loading message generator
   440→const getLoadingMessage = () => {
   441→  if (!props.isProcessingUIUpdate) return 'Loading files into queue...';
   442→
   443→  const { total, percentage } = props.uiUpdateProgress;
   444→
   445→  if (total <= 100) {
   446→    return 'Loading files into queue...';
   447→  }
   448→
   449→  if (percentage <= 15) {
   450→    return 'Showing initial files...';
   451→  } else if (percentage < 100) {
   452→    return 'Loading remaining files...';
   453→  } else {
   454→    return 'Complete!';
   455→  }
   456→};
   457→
   458→// Phase message for 2-chunk strategy
   459→const getPhaseMessage = () => {
   460→  if (!props.isProcessingUIUpdate) return 'Loading...';
   461→
   462→  const { total, percentage } = props.uiUpdateProgress;
   463→
   464→  if (total <= 100) {
   465→    return 'Loading...';
   466→  }
   467→
   468→  if (percentage <= 15) {
   469→    return 'Step 1/2';
   470→  } else if (percentage < 100) {
   471→    return 'Step 2/2';
   472→  } else {
   473→    return 'Complete!';
   474→  }
   475→};
   476→</script>
   477→
   478→<style scoped>
   479→.upload-queue {
   480→  width: 100%; /* Fill 100% of available width */
   481→  max-width: 1000px; /* Maximum width of 1000px */
   482→  margin: 0 auto;
   483→  display: flex;
   484→  flex-direction: column;
   485→  height: 100%; /* Fill available height from parent container */
   486→}
   487→
   488→/* Static header section */
   489→.queue-header {
   490→  flex-shrink: 0;
   491→}
   492→
   493→/* Static divider */
   494→.queue-divider {
   495→  flex-shrink: 0;
   496→}
   497→
   498→/* Container for static content and scrollable area */
   499→.queue-static-content {
   500→  flex: 1;
   501→  display: flex;
   502→  flex-direction: column;
   503→  overflow: hidden;
   504→}
   505→
   506→/* Scrollable file list container */
   507→.scrollable-content {
   508→  flex: 1;
   509→  overflow-y: auto;
   510→  scrollbar-width: thick; /* Firefox - always show thick scrollbar */
   511→  -ms-overflow-style: scrollbar; /* IE/Edge - always show scrollbar */
   512→}
   513→
   514→/* Always visible thick scrollbar in Webkit browsers */
   515→.scrollable-content::-webkit-scrollbar {
   516→  width: 16px; /* Twice as thick as the original 8px */
   517→}
   518→
   519→.scrollable-content::-webkit-scrollbar-track {
   520→  background: #f1f1f1;
   521→  border-radius: 8px; /* Increased border radius for thicker scrollbar */
   522→}
   523→
   524→.scrollable-content::-webkit-scrollbar-thumb {
   525→  background: #c1c1c1;
   526→  border-radius: 8px; /* Increased border radius for thicker scrollbar */
   527→}
   528→
   529→.scrollable-content::-webkit-scrollbar-thumb:hover {
   530→  background: #a8a8a8;
   531→}
   532→
   533→/* Static footer section */
   534→.queue-footer {
   535→  flex-shrink: 0;
   536→}
   537→
   538→.gap-2 {
   539→  gap: 8px;
   540→}
   541→
   542→.cursor-help {
   543→  cursor: help;
   544→}
   545→
   546→/* Allow scrolling within the scrollable content */
   547→:deep(.v-list) {
   548→  overflow: visible;
   549→}
   550→
   551→:deep(.v-list-item) {
   552→  overflow: hidden;
   553→}
   554→
   555→/* Custom fade transition for tooltip popup */
   556→:deep(.fade-transition-enter-active),
   557→:deep(.fade-transition-leave-active) {
   558→  transition: opacity 0.5s ease-in-out !important;
   559→}
   560→
   561→:deep(.fade-transition-enter-from),
   562→:deep(.fade-transition-leave-to) {
   563→  opacity: 0 !important;
   564→}
   565→
   566→:deep(.fade-transition-enter-to),
   567→:deep(.fade-transition-leave-from) {
   568→  opacity: 1 !important;
   569→}
   570→</style>
   571→