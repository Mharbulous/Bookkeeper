/**
 * Preview generation utilities
 * Handles generating previews for different file types
 */

/**
 * Generate image preview
 * @param {File|Object} file - File object
 * @returns {Promise<string>} Preview URL
 */
export async function generateImagePreview(file) {
  return new Promise((resolve, reject) => {
    if (file instanceof File) {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = () => reject(new Error('Failed to read image file'))
      reader.readAsDataURL(file)
    } else if (file.downloadURL) {
      resolve(file.downloadURL)
    } else {
      reject(new Error('No valid image source found'))
    }
  })
}

/**
 * Generate text preview
 * @param {File|Object} file - File object
 * @param {number} maxLength - Maximum preview length
 * @returns {Promise<string>} Text preview
 */
export async function generateTextPreview(file, maxLength = 500) {
  return new Promise((resolve, reject) => {
    if (file instanceof File) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target.result
        const preview = text.length > maxLength 
          ? text.substring(0, maxLength) + '...'
          : text
        resolve(preview)
      }
      reader.onerror = () => reject(new Error('Failed to read text file'))
      reader.readAsText(file)
    } else {
      // For uploaded files, would need to fetch content from storage
      resolve('Text preview not available for uploaded files')
    }
  })
}

/**
 * Generate PDF preview (placeholder)
 * @param {File|Object} file - File object
 * @returns {Promise<Object>} PDF preview data
 */
export async function generatePDFPreview(file) {
  // TODO: Implement PDF preview using pdf.js or similar
  return Promise.resolve({
    type: 'pdf',
    message: 'PDF preview not yet implemented',
    downloadURL: file.downloadURL || null
  })
}

/**
 * Generate video thumbnail
 * @param {File|Object} file - File object
 * @returns {Promise<string>} Video thumbnail URL
 */
export async function generateVideoThumbnail(file) {
  return new Promise((resolve, reject) => {
    if (file instanceof File) {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        video.currentTime = 1 // Seek to 1 second
      }
      
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7)
        resolve(thumbnail)
      }
      
      video.onerror = () => reject(new Error('Failed to generate video thumbnail'))
      
      const url = URL.createObjectURL(file)
      video.src = url
    } else {
      // For uploaded files, return placeholder or use video service
      resolve('/placeholder-video-thumbnail.jpg')
    }
  })
}

/**
 * Generate preview based on file type
 * @param {File|Object} file - File object
 * @param {string} fileType - File type
 * @returns {Promise<Object>} Preview data
 */
export async function generatePreview(file, fileType) {
  try {
    switch (fileType) {
      case 'image':
        const imageUrl = await generateImagePreview(file)
        return { type: 'image', url: imageUrl }
        
      case 'document':
        if (file.name?.toLowerCase().endsWith('.pdf')) {
          const pdfPreview = await generatePDFPreview(file)
          return { type: 'pdf', ...pdfPreview }
        } else {
          const textPreview = await generateTextPreview(file)
          return { type: 'text', content: textPreview }
        }
        
      case 'video':
        const thumbnail = await generateVideoThumbnail(file)
        return { type: 'video', thumbnail, url: file.downloadURL }
        
      case 'audio':
        return { 
          type: 'audio', 
          url: file.downloadURL || URL.createObjectURL(file),
          message: 'Audio file ready for playback'
        }
        
      case 'code':
        const codePreview = await generateTextPreview(file, 1000)
        return { type: 'code', content: codePreview, language: getCodeLanguage(file.name) }
        
      default:
        return { 
          type: 'unsupported', 
          message: 'Preview not available for this file type',
          downloadURL: file.downloadURL
        }
    }
  } catch (error) {
    return { 
      type: 'error', 
      message: error.message || 'Failed to generate preview'
    }
  }
}

/**
 * Get programming language from file extension
 * @param {string} filename - File name
 * @returns {string} Language identifier
 */
function getCodeLanguage(filename) {
  const ext = filename.toLowerCase().split('.').pop()
  const languages = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    html: 'html',
    css: 'css',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    vue: 'vue',
    jsx: 'jsx',
    tsx: 'tsx'
  }
  
  return languages[ext] || 'text'
}