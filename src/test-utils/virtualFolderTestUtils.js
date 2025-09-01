import { ref, reactive } from 'vue';

/**
 * Test utilities for Virtual Folder system testing
 * Provides mock data generators and test scenarios for evidence and categories
 */

/**
 * Generate mock categories for testing
 * @param {number} count - Number of categories to generate
 * @returns {Array} Array of category objects
 */
export const generateMockCategories = (count = 3) => {
  const categories = [];
  const categoryNames = [
    'Document Type', 'Date Range', 'Client', 'Status', 'Priority', 
    'Department', 'Project', 'Location', 'Source', 'Classification'
  ];
  
  for (let i = 0; i < count && i < categoryNames.length; i++) {
    categories.push({
      id: `category-${i + 1}`,
      categoryId: `cat-${i + 1}`,
      categoryName: categoryNames[i],
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      isActive: true,
      createdAt: new Date(2024, 0, i + 1).toISOString()
    });
  }
  
  return categories;
};

/**
 * Generate mock tags for a specific category
 * @param {string} categoryId - Category ID to generate tags for
 * @param {Array} tagNames - Array of tag names to create
 * @returns {Array} Array of tag objects
 */
export const generateMockTags = (categoryId, tagNames) => {
  return tagNames.map((tagName, index) => ({
    id: `${categoryId}-tag-${index}`,
    tagId: `${categoryId}-tag-${index}`,
    tagName,
    categoryId,
    isActive: true,
    createdAt: new Date(2024, 0, index + 1).toISOString()
  }));
};

/**
 * Generate realistic mock evidence data with tags
 * @param {number} count - Number of evidence documents to generate
 * @param {Array} categories - Array of category objects to use for tagging
 * @returns {Array} Array of evidence documents with realistic tag distributions
 */
export const generateMockEvidence = (count = 20, categories = null) => {
  if (!categories) {
    categories = generateMockCategories();
  }
  
  const evidence = [];
  
  // Define tag pools for each category type
  const tagPools = {
    'Document Type': ['Invoice', 'Receipt', 'Contract', 'Report', 'Statement', 'Agreement'],
    'Date Range': ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4', '2023-Q4', '2025-Q1'],
    'Client': ['ABC Corp', 'XYZ Ltd', 'Tech Solutions', 'Global Inc', 'Local Business'],
    'Status': ['Active', 'Pending', 'Completed', 'Draft', 'Archived'],
    'Priority': ['High', 'Medium', 'Low', 'Critical', 'Normal'],
    'Department': ['Finance', 'HR', 'Operations', 'Marketing', 'IT', 'Legal'],
    'Project': ['Project Alpha', 'Project Beta', 'Project Gamma', 'Migration', 'Upgrade'],
    'Location': ['New York', 'London', 'Tokyo', 'Sydney', 'Remote'],
    'Source': ['Email', 'Scan', 'Upload', 'API', 'Manual Entry'],
    'Classification': ['Public', 'Internal', 'Confidential', 'Restricted']
  };
  
  for (let i = 0; i < count; i++) {
    const doc = {
      id: `evidence-${i + 1}`,
      fileName: `document-${i + 1}.pdf`,
      originalName: `Document ${i + 1}.pdf`,
      size: Math.floor(Math.random() * 5000000) + 10000, // 10KB to 5MB
      fileUrl: `https://storage.example.com/evidence-${i + 1}.pdf`,
      uploadedAt: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString(),
      tags: {}
    };
    
    // Assign realistic tag combinations for each category
    categories.forEach(category => {
      const availableTags = tagPools[category.categoryName] || ['Default Tag'];
      
      // 80% chance of having tags for this category
      if (Math.random() < 0.8) {
        const tagCount = Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 2 : 3; // Most docs have 1 tag, some have 2-3
        const selectedTags = [];
        
        for (let j = 0; j < tagCount; j++) {
          const tagName = availableTags[Math.floor(Math.random() * availableTags.length)];
          if (!selectedTags.find(tag => tag.tagName === tagName)) {
            selectedTags.push({
              id: `${category.categoryId}-${tagName.toLowerCase().replace(/\s+/g, '-')}`,
              tagId: `${category.categoryId}-${tagName.toLowerCase().replace(/\s+/g, '-')}`,
              tagName,
              categoryId: category.categoryId
            });
          }
        }
        
        if (selectedTags.length > 0) {
          doc.tags[category.categoryId] = selectedTags;
        }
      }
    });
    
    evidence.push(doc);
  }
  
  return evidence;
};

/**
 * Generate specific test scenarios for edge cases
 */
export const testScenarios = {
  /**
   * Evidence with no tags
   */
  emptyEvidence: () => ({
    id: 'empty-evidence',
    fileName: 'empty.pdf',
    tags: {}
  }),
  
  /**
   * Evidence with malformed tags
   */
  malformedTagsEvidence: () => ({
    id: 'malformed-evidence', 
    fileName: 'malformed.pdf',
    tags: {
      'cat-1': null,
      'cat-2': 'not-an-array',
      'cat-3': [{ tagName: 'ValidTag' }, { /* missing tagName */ }]
    }
  }),
  
  /**
   * Complex hierarchical test data
   */
  hierarchicalTestData: () => {
    const categories = [
      { categoryId: 'doc-type', categoryName: 'Document Type' },
      { categoryId: 'client', categoryName: 'Client' },
      { categoryId: 'year', categoryName: 'Year' }
    ];
    
    const evidence = [
      {
        id: 'doc-1',
        fileName: 'invoice-abc-2024.pdf',
        tags: {
          'doc-type': [{ tagName: 'Invoice', categoryId: 'doc-type' }],
          'client': [{ tagName: 'ABC Corp', categoryId: 'client' }],
          'year': [{ tagName: '2024', categoryId: 'year' }]
        }
      },
      {
        id: 'doc-2', 
        fileName: 'invoice-xyz-2024.pdf',
        tags: {
          'doc-type': [{ tagName: 'Invoice', categoryId: 'doc-type' }],
          'client': [{ tagName: 'XYZ Ltd', categoryId: 'client' }],
          'year': [{ tagName: '2024', categoryId: 'year' }]
        }
      },
      {
        id: 'doc-3',
        fileName: 'receipt-abc-2023.pdf',
        tags: {
          'doc-type': [{ tagName: 'Receipt', categoryId: 'doc-type' }],
          'client': [{ tagName: 'ABC Corp', categoryId: 'client' }],
          'year': [{ tagName: '2023', categoryId: 'year' }]
        }
      }
    ];
    
    return { categories, evidence };
  },
  
  /**
   * Large dataset for performance testing
   */
  largeDataset: () => {
    const categories = generateMockCategories(5);
    const evidence = generateMockEvidence(1000, categories);
    return { categories, evidence };
  }
};

/**
 * Create mock store states for testing
 */
export const mockStoreStates = {
  /**
   * Initial store state
   */
  initial: {
    viewMode: 'flat',
    folderHierarchy: [],
    currentPath: [],
    loading: false
  },
  
  /**
   * Configured folder view state
   */
  configuredFolderView: {
    viewMode: 'folders',
    folderHierarchy: [
      { categoryId: 'doc-type', categoryName: 'Document Type' },
      { categoryId: 'client', categoryName: 'Client' }
    ],
    currentPath: [],
    loading: false
  },
  
  /**
   * Deep navigation state
   */
  deepNavigation: {
    viewMode: 'folders',
    folderHierarchy: [
      { categoryId: 'doc-type', categoryName: 'Document Type' },
      { categoryId: 'client', categoryName: 'Client' },
      { categoryId: 'year', categoryName: 'Year' }
    ],
    currentPath: [
      { categoryId: 'doc-type', categoryName: 'Document Type', tagName: 'Invoice' },
      { categoryId: 'client', categoryName: 'Client', tagName: 'ABC Corp' }
    ],
    loading: false
  }
};

/**
 * Performance testing utilities
 */
export const performanceUtils = {
  /**
   * Measure execution time of a function
   * @param {Function} fn - Function to measure
   * @param {...any} args - Arguments to pass to function
   * @returns {Object} Result and timing information
   */
  measureTime: async (fn, ...args) => {
    const start = performance.now();
    const result = await fn(...args);
    const end = performance.now();
    return {
      result,
      duration: end - start,
      durationMs: Math.round((end - start) * 100) / 100
    };
  },
  
  /**
   * Generate cache keys for testing
   * @param {Array} path - Current path array
   * @param {string} categoryId - Category ID
   * @returns {string} Cache key
   */
  generateCacheKey: (path, categoryId) => {
    return `${path.map(p => `${p.categoryId}:${p.tagName}`).join('|')}:${categoryId}`;
  }
};

/**
 * Validation utilities for testing
 */
export const validationUtils = {
  /**
   * Validate folder structure output
   * @param {Array} folders - Generated folder structure
   * @param {Object} expectedShape - Expected structure shape
   * @returns {boolean} Whether structure is valid
   */
  validateFolderStructure: (folders, expectedShape = {}) => {
    if (!Array.isArray(folders)) return false;
    
    return folders.every(folder => {
      const hasRequiredFields = [
        'categoryId', 'categoryName', 'tagName', 'fileCount'
      ].every(field => folder.hasOwnProperty(field));
      
      const hasValidFileCount = typeof folder.fileCount === 'number' && folder.fileCount >= 0;
      const hasValidStrings = typeof folder.categoryId === 'string' && 
                             typeof folder.categoryName === 'string' && 
                             typeof folder.tagName === 'string';
      
      return hasRequiredFields && hasValidFileCount && hasValidStrings;
    });
  },
  
  /**
   * Validate breadcrumb structure
   * @param {Array} breadcrumbs - Breadcrumb array
   * @param {number} expectedLength - Expected breadcrumb length
   * @returns {boolean} Whether breadcrumb is valid
   */
  validateBreadcrumbs: (breadcrumbs, expectedLength) => {
    if (!Array.isArray(breadcrumbs) || breadcrumbs.length !== expectedLength) {
      return false;
    }
    
    return breadcrumbs.every((crumb, index) => {
      const hasRequiredFields = ['categoryId', 'categoryName', 'tagName', 'isLast', 'depth'].every(
        field => crumb.hasOwnProperty(field)
      );
      
      const isLastCorrect = crumb.isLast === (index === breadcrumbs.length - 1);
      const depthCorrect = crumb.depth === index;
      
      return hasRequiredFields && isLastCorrect && depthCorrect;
    });
  }
};