/**
 * Automatic Tag Color Assignment System
 * Provides a simple, high-contrast color pattern for tags without user customization
 */

// Triadic color palette for harmonious tag visibility (purple → green → orange cycle)
const TAG_COLOR_PALETTE = [
  '#733381', // Purple
  '#589C48', // Green  
  '#F58024'  // Orange
];

/**
 * Get automatic color for a tag based on its index or hash
 * @param {number|string} indexOrId - Category index or ID for consistent color assignment
 * @returns {string} - Hex color code
 */
export function getAutomaticTagColor(indexOrId) {
  let index;
  
  if (typeof indexOrId === 'string') {
    // Hash the string to get a consistent number
    index = hashStringToNumber(indexOrId);
  } else {
    index = indexOrId || 0;
  }
  
  return TAG_COLOR_PALETTE[index % TAG_COLOR_PALETTE.length];
}

/**
 * Get all available tag colors
 * @returns {Array<string>} - Array of hex color codes
 */
export function getAllTagColors() {
  return [...TAG_COLOR_PALETTE];
}

/**
 * Get contrasting text color for a background color
 * @param {string} backgroundColor - Hex color code
 * @returns {string} - '#ffffff' or '#000000'
 */
export function getContrastingTextColor(backgroundColor) {
  // Remove # if present
  const hex = backgroundColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white text for dark backgrounds, black for light
  return luminance < 0.5 ? '#ffffff' : '#000000';
}

/**
 * Hash a string to a number for consistent color assignment
 * @param {string} str - String to hash
 * @returns {number} - Hash value
 */
function hashStringToNumber(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get color assignments for a list of categories
 * @param {Array} categories - Array of category objects with id
 * @returns {Object} - Map of categoryId to color
 */
export function getColorAssignments(categories) {
  const assignments = {};
  
  categories.forEach((category, index) => {
    assignments[category.id] = getAutomaticTagColor(index);
  });
  
  return assignments;
}
