/**
 * Folder Path Utilities
 * Handles folder path pattern recognition and management for file uploads
 */

// Delimiter for separating multiple folder paths (invalid in folder paths on most systems)
const PATH_DELIMITER = '|';

// Pattern types returned by identifyFolderPathPattern
export const FOLDER_PATH_PATTERNS = {
  EXACT_MATCH: 'EXACT_MATCH',
  EXTENSION: 'EXTENSION', 
  REDUCTION: 'REDUCTION',
  DIFFERENT_PATH: 'DIFFERENT_PATH'
};

/**
 * Normalizes a folder path for consistent comparison
 * @param {string} path - Raw folder path
 * @returns {string} - Normalized path
 */
export function normalizePath(path) {
  if (!path || typeof path !== 'string') {
    return '';
  }

  // Remove leading and trailing whitespace
  let normalized = path.trim();
  
  // Handle root path cases
  if (normalized === '' || normalized === '/') {
    return '/';
  }
  
  // Ensure path starts with '/' but doesn't end with '/' (unless it's root)
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  
  if (normalized.endsWith('/') && normalized !== '/') {
    normalized = normalized.slice(0, -1);
  }
  
  return normalized;
}

/**
 * Parses existing folderPaths field into an array of normalized paths
 * @param {string|null|undefined} folderPaths - Pipe-delimited string of folder paths
 * @returns {string[]} - Array of normalized folder paths
 */
export function parseExistingPaths(folderPaths) {
  if (!folderPaths || typeof folderPaths !== 'string') {
    return [];
  }

  return folderPaths
    .split(PATH_DELIMITER)
    .map(path => normalizePath(path))
    .filter(path => path !== ''); // Remove empty paths
}

/**
 * Converts an array of folder paths back to a pipe-delimited string
 * @param {string[]} paths - Array of folder paths
 * @returns {string} - Pipe-delimited string
 */
export function serializePaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) {
    return '';
  }

  return paths
    .map(path => normalizePath(path))
    .filter(path => path !== '')
    .join(PATH_DELIMITER);
}

/**
 * Identifies which pattern applies when comparing a new folder path with existing paths
 * @param {string} newPath - New folder path to evaluate
 * @param {string[]} existingPaths - Array of existing normalized folder paths
 * @returns {Object} - Pattern identification result
 */
export function identifyFolderPathPattern(newPath, existingPaths) {
  const normalizedNew = normalizePath(newPath);
  
  if (!normalizedNew) {
    return {
      type: FOLDER_PATH_PATTERNS.EXACT_MATCH,
      action: 'none',
      message: 'Empty path provided'
    };
  }

  // Check each existing path for pattern matches
  for (let i = 0; i < existingPaths.length; i++) {
    const existingPath = existingPaths[i];
    
    // Pattern 4: Exact Match
    if (normalizedNew === existingPath) {
      return {
        type: FOLDER_PATH_PATTERNS.EXACT_MATCH,
        action: 'none',
        message: 'Path already exists',
        matchIndex: i
      };
    }
    
    // Pattern 1: Extension (new path contains existing path as suffix)
    // Example: existing="/2025", new="/General Account/2025"
    if (normalizedNew.endsWith(existingPath) && normalizedNew.length > existingPath.length) {
      // Ensure the extension is at a path boundary (not partial match)
      const beforeExisting = normalizedNew.substring(0, normalizedNew.length - existingPath.length);
      if (beforeExisting.endsWith('/') || existingPath === '/') {
        return {
          type: FOLDER_PATH_PATTERNS.EXTENSION,
          action: 'update',
          message: 'New path extends existing path with more information',
          targetPath: existingPath,
          targetIndex: i,
          newValue: normalizedNew
        };
      }
    }
    
    // Pattern 2: Reduction (existing path contains new path as suffix)
    // Example: existing="/General Account/2025", new="/2025"
    if (existingPath.endsWith(normalizedNew) && existingPath.length > normalizedNew.length) {
      // Ensure the reduction is at a path boundary
      const beforeNew = existingPath.substring(0, existingPath.length - normalizedNew.length);
      if (beforeNew.endsWith('/') || normalizedNew === '/') {
        return {
          type: FOLDER_PATH_PATTERNS.REDUCTION,
          action: 'preserve',
          message: 'Existing path has more information, preserving it',
          preservedPath: existingPath,
          preservedIndex: i
        };
      }
    }
  }

  // Pattern 3: Different Path (no containment relationship found)
  return {
    type: FOLDER_PATH_PATTERNS.DIFFERENT_PATH,
    action: 'append',
    message: 'Path is unrelated to existing paths, adding to collection',
    newValue: normalizedNew
  };
}

/**
 * Updates folder paths based on the identified pattern
 * @param {string} newPath - New folder path to process
 * @param {string} existingFolderPaths - Current folderPaths field value
 * @returns {Object} - Update result with new folderPaths value and metadata
 */
export function updateFolderPaths(newPath, existingFolderPaths) {
  const existingPaths = parseExistingPaths(existingFolderPaths);
  const pattern = identifyFolderPathPattern(newPath, existingPaths);
  
  let updatedPaths = [...existingPaths];
  let hasChanged = false;
  
  switch (pattern.type) {
    case FOLDER_PATH_PATTERNS.EXACT_MATCH:
      // No change needed
      break;
      
    case FOLDER_PATH_PATTERNS.EXTENSION:
      // Replace the existing path with the extended version
      updatedPaths[pattern.targetIndex] = pattern.newValue;
      hasChanged = true;
      break;
      
    case FOLDER_PATH_PATTERNS.REDUCTION:
      // Keep existing path, no change
      break;
      
    case FOLDER_PATH_PATTERNS.DIFFERENT_PATH:
      // Add new path to the collection
      updatedPaths.push(pattern.newValue);
      hasChanged = true;
      break;
      
    default:
      console.warn('Unknown folder path pattern:', pattern.type);
  }
  
  return {
    folderPaths: serializePaths(updatedPaths),
    pattern: pattern,
    hasChanged: hasChanged,
    pathCount: updatedPaths.length
  };
}

/**
 * Helper function to get all unique folder paths from a folderPaths field
 * @param {string} folderPaths - Pipe-delimited folder paths string
 * @returns {string[]} - Array of unique normalized folder paths
 */
export function getAllFolderPaths(folderPaths) {
  const paths = parseExistingPaths(folderPaths);
  return [...new Set(paths)]; // Remove duplicates, though they shouldn't exist
}

/**
 * Checks if a specific folder path exists in the folderPaths field
 * @param {string} targetPath - Path to search for
 * @param {string} folderPaths - Pipe-delimited folder paths string
 * @returns {boolean} - Whether the path exists
 */
export function containsFolderPath(targetPath, folderPaths) {
  const normalized = normalizePath(targetPath);
  const existing = parseExistingPaths(folderPaths);
  return existing.includes(normalized);
}