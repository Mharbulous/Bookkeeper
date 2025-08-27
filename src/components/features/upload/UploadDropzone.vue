<template>
  <v-card
    class="upload-dropzone pa-8"
    :class="{ 'dropzone-active': isDragOver }"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
    variant="outlined"
  >
    <div class="text-center h-100 d-flex flex-column justify-center align-center">
      <v-icon
        :icon="isDragOver ? 'mdi-cloud-upload' : 'mdi-cloud-upload-outline'"
        size="64"
        :color="isDragOver ? 'primary' : 'grey-lighten-1'"
        class="mb-4"
      />

      <h3 class="text-h5 mb-2" :class="isDragOver ? 'text-primary' : 'text-grey-darken-2'">
        {{ isDragOver ? 'Drop files or folders here!' : 'Drag and drop files or folders here' }}
      </h3>

      <p class="text-body-1 text-grey-darken-1 mb-4">or choose files using the buttons below</p>

      <!-- Upload Buttons -->
      <div class="d-flex flex-wrap gap-3 justify-center">
        <!-- Individual File Upload -->
        <v-btn
          color="primary"
          size="large"
          variant="elevated"
          prepend-icon="mdi-file-plus"
          @click="$emit('trigger-file-select')"
        >
          Select Files
        </v-btn>

        <!-- Folder Upload -->
        <v-btn
          color="secondary"
          size="large"
          variant="elevated"
          prepend-icon="mdi-folder-plus"
          @click="$emit('trigger-folder-select')"
        >
          Select Folder
        </v-btn>
      </div>
    </div>

    <!-- Hidden file inputs -->
    <input
      ref="fileInput"
      type="file"
      multiple
      @change="$emit('file-select', $event)"
      style="display: none"
    />

    <input
      ref="folderInput"
      type="file"
      webkitdirectory
      multiple
      @change="$emit('folder-select', $event)"
      style="display: none"
    />
  </v-card>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  isDragOver: {
    type: Boolean,
    required: true,
  },
});

// Template refs (exposed for parent component to access)
const fileInput = ref(null);
const folderInput = ref(null);

defineExpose({
  fileInput,
  folderInput,
});

const emit = defineEmits([
  'drag-over',
  'drag-leave',
  'drop',
  'trigger-file-select',
  'trigger-folder-select',
  'file-select',
  'folder-select',
]);

// Event handlers that emit to parent
const handleDragOver = () => {
  emit('drag-over');
};

const handleDragLeave = (event) => {
  emit('drag-leave', event);
};

const handleDrop = (event) => {
  emit('drop', event);
};
</script>

<style scoped>
.upload-dropzone {
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
  width: 100%;
  flex: 1;
  min-height: 400px;
  background-color: #ffffff;
}

.upload-dropzone:hover {
  border-color: #3b82f6;
  background-color: #f8fafc;
}

.dropzone-active {
  border-color: #3b82f6 !important;
  background-color: #eff6ff !important;
  transform: scale(1.02);
}
</style>
