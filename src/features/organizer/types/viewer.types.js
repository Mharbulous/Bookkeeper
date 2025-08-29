/**
 * Type definitions for file viewer feature
 * JSDoc-based type definitions for better IDE support
 */

/**
 * @typedef {Object} FileItem
 * @property {string} id - Unique file identifier
 * @property {string} name - File name
 * @property {string} path - File path
 * @property {number} size - File size in bytes
 * @property {string} type - File MIME type
 * @property {string} category - File category (image, document, video, etc.)
 * @property {string} downloadURL - Download URL for the file
 * @property {string} thumbnailURL - Thumbnail URL (if available)
 * @property {Date} dateUploaded - Upload date
 * @property {Date} dateModified - Last modified date
 * @property {Object} metadata - Additional file metadata
 */

/**
 * @typedef {Object} PreviewData
 * @property {string} type - Preview type (image, text, pdf, video, audio, etc.)
 * @property {string} [url] - Preview URL
 * @property {string} [content] - Text content for text previews
 * @property {string} [thumbnail] - Thumbnail URL for video files
 * @property {string} [language] - Programming language for code files
 * @property {string} [message] - Status or error message
 * @property {string} [downloadURL] - Original file download URL
 */

/**
 * @typedef {Object} ViewerState
 * @property {FileItem[]} files - Array of files
 * @property {FileItem|null} selectedFile - Currently selected file
 * @property {PreviewData|null} previewData - Preview data for selected file
 * @property {boolean} loading - Loading state
 * @property {boolean} previewLoading - Preview loading state
 * @property {string|null} error - Error message
 * @property {string|null} previewError - Preview error message
 */

/**
 * @typedef {Object} SearchState
 * @property {string} query - Search query
 * @property {string[]} selectedTypes - Selected file types for filtering
 * @property {FileItem[]} filteredFiles - Filtered files based on search and filters
 */

/**
 * @typedef {Object} NavigationState
 * @property {number} currentIndex - Current file index
 * @property {FileItem|null} currentFile - Current file
 * @property {string} viewMode - View mode ('grid' or 'list')
 * @property {boolean} hasNext - Whether there's a next file
 * @property {boolean} hasPrevious - Whether there's a previous file
 */

/**
 * @typedef {Object} SortOptions
 * @property {string} by - Sort criteria ('name', 'size', 'date', 'type')
 * @property {string} order - Sort order ('asc', 'desc')
 */

/**
 * @typedef {Object} FilterOptions
 * @property {string[]} types - File types to include
 * @property {number} [minSize] - Minimum file size
 * @property {number} [maxSize] - Maximum file size
 * @property {Date} [dateFrom] - Filter files from this date
 * @property {Date} [dateTo] - Filter files to this date
 */

/**
 * File viewer composable return type
 * @typedef {Object} UseFileViewerReturn
 * @property {import('vue').Ref<FileItem[]>} files - Reactive files array
 * @property {import('vue').Ref<boolean>} loading - Reactive loading state
 * @property {import('vue').Ref<string|null>} error - Reactive error state
 * @property {import('vue').ComputedRef<number>} totalFiles - Computed total files count
 * @property {Function} loadFiles - Function to load files
 */

/**
 * File search composable return type
 * @typedef {Object} UseFileSearchReturn
 * @property {import('vue').Ref<string>} searchQuery - Reactive search query
 * @property {import('vue').Ref<string[]>} selectedTypes - Reactive selected types
 * @property {import('vue').ComputedRef<FileItem[]>} filteredFiles - Computed filtered files
 * @property {Function} clearSearch - Function to clear search
 */

/**
 * File preview composable return type
 * @typedef {Object} UseFilePreviewReturn
 * @property {import('vue').Ref<FileItem|null>} selectedFile - Reactive selected file
 * @property {import('vue').Ref<PreviewData|null>} previewData - Reactive preview data
 * @property {import('vue').Ref<boolean>} previewLoading - Reactive preview loading state
 * @property {import('vue').Ref<string|null>} previewError - Reactive preview error
 * @property {import('vue').ComputedRef<boolean>} canPreview - Computed preview capability
 * @property {Function} selectFile - Function to select a file
 * @property {Function} generatePreview - Function to generate preview
 * @property {Function} clearPreview - Function to clear preview
 */

/**
 * Viewer navigation composable return type
 * @typedef {Object} UseViewerNavigationReturn
 * @property {import('vue').Ref<number>} currentIndex - Reactive current index
 * @property {import('vue').ComputedRef<FileItem|null>} currentFile - Computed current file
 * @property {import('vue').Ref<string>} viewMode - Reactive view mode
 * @property {import('vue').ComputedRef<boolean>} hasNext - Computed next availability
 * @property {import('vue').ComputedRef<boolean>} hasPrevious - Computed previous availability
 * @property {Function} nextFile - Function to go to next file
 * @property {Function} previousFile - Function to go to previous file
 * @property {Function} goToFile - Function to go to specific file
 * @property {Function} toggleViewMode - Function to toggle view mode
 */

// Export types for use in other files (JSDoc style)
export {};