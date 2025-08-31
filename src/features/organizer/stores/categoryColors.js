// Color management utilities for categories

/**
 * Category Colors Module
 * Handles color management, validation, and generation for categories and tags
 */
export function useCategoryColors(categories) {
  // Default category colors palette
  const defaultColors = [
    '#1976d2', // Blue - Document Type
    '#388e3c', // Green - Date/Period  
    '#f57c00', // Orange - Institution
    '#7b1fa2', // Purple
    '#d32f2f', // Red
    '#455a64', // Blue Grey
    '#00796b', // Teal
    '#f57f17', // Yellow
    '#e91e63', // Pink
    '#795548', // Brown
  ];

  /**
   * Get next available default color
   */
  const getNextDefaultColor = () => {
    const usedColors = categories.value.map(cat => cat.color);
    const availableColor = defaultColors.find(color => !usedColors.includes(color));
    return availableColor || defaultColors[0]; // Fallback to first color if all used
  };

  /**
   * Generate color variation for tags within a category
   */
  const generateTagColor = (baseColor, index = 0) => {
    // Simple color variation by adjusting lightness
    const variations = [
      baseColor, // Original color
      adjustColor(baseColor, -20), // Darker
      adjustColor(baseColor, 20),  // Lighter
      adjustColor(baseColor, -40), // Much darker
      adjustColor(baseColor, 40),  // Much lighter
    ];
    
    return variations[index % variations.length] || baseColor;
  };

  /**
   * Adjust color brightness
   */
  const adjustColor = (hexColor, percent) => {
    const num = parseInt(hexColor.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  /**
   * Validate hex color format
   */
  const isValidHexColor = (color) => {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  };

  /**
   * Convert RGB to Hex
   */
  const rgbToHex = (r, g, b) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  /**
   * Convert Hex to RGB
   */
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  /**
   * Get contrasting text color (black or white) for a background color
   */
  const getContrastingTextColor = (backgroundColor) => {
    if (!isValidHexColor(backgroundColor)) {
      return '#000000'; // Default to black for invalid colors
    }

    const rgb = hexToRgb(backgroundColor);
    if (!rgb) return '#000000';

    // Calculate luminance using the standard formula
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    
    // Return white for dark backgrounds, black for light backgrounds
    return luminance < 0.5 ? '#ffffff' : '#000000';
  };

  /**
   * Generate a random hex color
   */
  const generateRandomColor = () => {
    return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
  };

  /**
   * Get color palette suggestions based on existing colors
   */
  const getColorSuggestions = () => {
    const usedColors = categories.value.map(cat => cat.color);
    const availableDefaults = defaultColors.filter(color => !usedColors.includes(color));
    
    // If we have unused defaults, suggest those first
    if (availableDefaults.length > 0) {
      return availableDefaults.slice(0, 5); // Return up to 5 suggestions
    }
    
    // If all defaults are used, generate some variations
    const baseColors = defaultColors.slice(0, 5);
    return baseColors.map(color => adjustColor(color, Math.random() * 40 - 20));
  };

  /**
   * Check if a color is too similar to existing category colors
   */
  const isColorTooSimilar = (newColor, threshold = 50) => {
    if (!isValidHexColor(newColor)) return false;
    
    const newRgb = hexToRgb(newColor);
    if (!newRgb) return false;

    return categories.value.some(cat => {
      if (!isValidHexColor(cat.color)) return false;
      
      const existingRgb = hexToRgb(cat.color);
      if (!existingRgb) return false;

      // Calculate Euclidean distance in RGB space
      const distance = Math.sqrt(
        Math.pow(newRgb.r - existingRgb.r, 2) +
        Math.pow(newRgb.g - existingRgb.g, 2) +
        Math.pow(newRgb.b - existingRgb.b, 2)
      );

      return distance < threshold;
    });
  };

  /**
   * Get a safe color that's not too similar to existing ones
   */
  const getSafeColor = (preferredColor = null) => {
    // If a preferred color is provided and it's safe, use it
    if (preferredColor && isValidHexColor(preferredColor) && !isColorTooSimilar(preferredColor)) {
      return preferredColor;
    }

    // Try to get next default color
    const nextDefault = getNextDefaultColor();
    if (!isColorTooSimilar(nextDefault)) {
      return nextDefault;
    }

    // Generate variations until we find a safe one
    let attempts = 0;
    while (attempts < 10) {
      const randomVariation = adjustColor(nextDefault, Math.random() * 60 - 30);
      if (!isColorTooSimilar(randomVariation)) {
        return randomVariation;
      }
      attempts++;
    }

    // Fallback to a completely random color
    return generateRandomColor();
  };

  return {
    // Constants
    defaultColors,

    // Color Management
    getNextDefaultColor,
    generateTagColor,
    adjustColor,

    // Validation
    isValidHexColor,
    isColorTooSimilar,

    // Utilities
    rgbToHex,
    hexToRgb,
    getContrastingTextColor,
    generateRandomColor,
    getColorSuggestions,
    getSafeColor
  };
}