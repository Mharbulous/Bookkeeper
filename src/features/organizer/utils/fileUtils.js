/**
 * File utilities for the organizer feature
 * Extracted from Organizer.vue for reusability and maintainability
 */

/**
 * Get file extension from filename
 * @param {string} filename - The filename to extract extension from
 * @returns {string} File extension with dot (e.g., '.pdf')
 */
export const getFileExtension = (filename) => {
  return filename.includes('.')
    ? '.' + filename.split('.').pop().toLowerCase()
    : '';
};

/**
 * Get appropriate icon for file type
 * @param {string} filename - The filename to get icon for
 * @returns {string} Material Design icon name
 */
export const getFileIcon = (filename) => {
  const ext = getFileExtension(filename);
  const iconMap = {
    '.pdf': 'mdi-file-pdf-box',
    '.doc': 'mdi-file-word-box',
    '.docx': 'mdi-file-word-box',
    '.xls': 'mdi-file-excel-box',
    '.xlsx': 'mdi-file-excel-box',
    '.ppt': 'mdi-file-powerpoint-box',
    '.pptx': 'mdi-file-powerpoint-box',
    '.txt': 'mdi-file-document-outline',
    '.jpg': 'mdi-file-image-outline',
    '.jpeg': 'mdi-file-image-outline',
    '.png': 'mdi-file-image-outline',
    '.gif': 'mdi-file-image-outline',
    '.zip': 'mdi-folder-zip-outline',
    '.rar': 'mdi-folder-zip-outline'
  };
  return iconMap[ext] || 'mdi-file-outline';
};

/**
 * Get appropriate color for file type icon
 * @param {string} filename - The filename to get color for
 * @returns {string} Vuetify color name
 */
export const getFileIconColor = (filename) => {
  const ext = getFileExtension(filename);
  const colorMap = {
    '.pdf': 'red-darken-1',
    '.doc': 'blue-darken-1',
    '.docx': 'blue-darken-1',
    '.xls': 'green-darken-1',
    '.xlsx': 'green-darken-1',
    '.ppt': 'orange-darken-1',
    '.pptx': 'orange-darken-1',
    '.jpg': 'purple-darken-1',
    '.jpeg': 'purple-darken-1',
    '.png': 'purple-darken-1',
    '.gif': 'purple-darken-1'
  };
  return colorMap[ext] || 'grey-darken-1';
};

/**
 * Format file size in bytes to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size (e.g., '1.2 MB')
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * Format timestamp to human readable date
 * @param {*} timestamp - Firestore timestamp or Date object
 * @returns {string} Formatted date string
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString();
};