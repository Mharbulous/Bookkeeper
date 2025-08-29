/**
 * File viewer utility functions
 * General utilities for file viewer functionality
 */

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Get file type from filename or MIME type
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type (optional)
 * @returns {string} File type category
 */
export function getFileType(filename, mimeType = '') {
  const ext = filename.toLowerCase().split('.').pop()
  
  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
    return 'image'
  }
  
  // Document files
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    return 'document'
  }
  
  // Video files
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) {
    return 'video'
  }
  
  // Audio files
  if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(ext)) {
    return 'audio'
  }
  
  // Archive files
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return 'archive'
  }
  
  // Code files
  if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'html', 'css', 'php', 'rb', 'go'].includes(ext)) {
    return 'code'
  }
  
  return 'unknown'
}

/**
 * Get file icon class based on file type
 * @param {string} fileType - File type
 * @returns {string} Icon class name
 */
export function getFileIcon(fileType) {
  const icons = {
    image: 'mdi-file-image',
    document: 'mdi-file-document',
    video: 'mdi-file-video',
    audio: 'mdi-file-music',
    archive: 'mdi-file-cabinet',
    code: 'mdi-file-code',
    unknown: 'mdi-file'
  }
  
  return icons[fileType] || icons.unknown
}

/**
 * Sort files by various criteria
 * @param {Array} files - Array of file objects
 * @param {string} sortBy - Sort criteria ('name', 'size', 'date', 'type')
 * @param {string} sortOrder - Sort order ('asc', 'desc')
 * @returns {Array} Sorted files array
 */
export function sortFiles(files, sortBy = 'name', sortOrder = 'asc') {
  const sortedFiles = [...files].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'size':
        comparison = (a.size || 0) - (b.size || 0)
        break
      case 'date':
        comparison = new Date(a.dateModified || 0) - new Date(b.dateModified || 0)
        break
      case 'type':
        comparison = getFileType(a.name).localeCompare(getFileType(b.name))
        break
      default:
        comparison = a.name.localeCompare(b.name)
    }
    
    return sortOrder === 'desc' ? -comparison : comparison
  })
  
  return sortedFiles
}

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return 'Unknown'
  
  const dateObj = new Date(date)
  return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString()
}