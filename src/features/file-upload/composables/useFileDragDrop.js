import { ref } from 'vue';

export function useFileDragDrop() {
  // Reactive data
  const isDragOver = ref(false);

  // Drag and drop handlers
  const handleDragOver = () => {
    isDragOver.value = true;
  };

  const handleDragLeave = (event) => {
    // Only set to false if we're leaving the dropzone entirely
    if (!event.currentTarget.contains(event.relatedTarget)) {
      isDragOver.value = false;
    }
  };

  const handleDrop = async (event, { processSingleFile, addFilesToQueue, processFolderEntry }) => {
    isDragOver.value = false;
    // Using webkit APIs for legacy browser support with drag/drop
    const items = Array.from(event.dataTransfer.items);

    const files = [];
    const folders = [];

    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          if (entry.isFile) {
            const file = item.getAsFile();
            files.push(file);
          } else if (entry.isDirectory) {
            folders.push(entry);
          }
        }
      }
    }

    // Handle dropped files
    if (files.length > 0) {
      if (files.length === 1) {
        // Single file - show notification and upload immediately
        await processSingleFile(files[0]);
      } else {
        // Multiple files - add to queue
        await addFilesToQueue(files);
      }
    }

    // Handle dropped folders
    if (folders.length > 0) {
      for (const folder of folders) {
        await processFolderEntry(folder);
      }
    }
  };

  return {
    // Reactive data
    isDragOver,

    // Methods
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}