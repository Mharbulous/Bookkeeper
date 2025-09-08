import { CategoryService } from './categoryService.js';
import { AIProcessingService } from './aiProcessingService.js';

/**
 * Smart Tag Service - Handles intelligent tag matching and creation for open-list categories
 * Provides fuzzy matching, AI-powered tag suggestions, and automatic tag creation
 */
export class SmartTagService {
  constructor(teamId) {
    this.teamId = teamId;
    this.aiProcessingService = new AIProcessingService();
  }

  /**
   * Smart tag matching for open-list categories
   * Attempts to match existing tags, suggests AI alternatives, and creates new tags when appropriate
   * @param {string} categoryId - Category ID
   * @param {Object} category - Category object with tags and configuration
   * @param {string} userInput - User's input text
   * @param {Object} context - Additional context (document content, etc.)
   * @returns {Promise<Object>} - Match result with recommendations
   */
  async smartTagMatch(categoryId, category, userInput, context = {}) {
    try {
      // Validate that this is an open-list category
      if (!this.isOpenListCategory(category)) {
        return {
          type: 'fixed_match',
          matches: this.findExactMatches(category.tags, userInput),
          canCreateNew: false
        };
      }

      const normalizedInput = this.normalizeInput(userInput);
      
      // Step 1: Try exact match first
      const exactMatch = this.findExactMatch(category.tags, normalizedInput);
      if (exactMatch) {
        return {
          type: 'exact_match',
          match: exactMatch,
          confidence: 1.0,
          canCreateNew: false
        };
      }

      // Step 2: Try fuzzy matching
      const fuzzyMatches = this.findFuzzyMatches(category.tags, normalizedInput);
      if (fuzzyMatches.length > 0 && fuzzyMatches[0].confidence >= 0.8) {
        return {
          type: 'fuzzy_match',
          matches: fuzzyMatches,
          canCreateNew: true,
          suggestedNew: normalizedInput
        };
      }

      // Step 3: AI-powered similarity matching (if AI is enabled and context provided)
      let aiMatches = [];
      if (this.aiProcessingService.isAIEnabled() && context.documentContent) {
        aiMatches = await this.findAISimilarTags(category.tags, normalizedInput, context);
      }

      // Step 4: Determine if we should create a new tag
      const shouldCreateNew = await this.shouldCreateNewTag(
        categoryId,
        category,
        normalizedInput,
        { fuzzyMatches, aiMatches, context }
      );

      return {
        type: 'no_match',
        fuzzyMatches: fuzzyMatches.filter(m => m.confidence >= 0.5),
        aiMatches,
        canCreateNew: shouldCreateNew,
        suggestedNew: normalizedInput,
        confidence: this.calculateNewTagConfidence(normalizedInput, fuzzyMatches, aiMatches)
      };

    } catch (error) {
      console.error('[SmartTagService] Error in smart tag matching:', error);
      return {
        type: 'error',
        error: error.message,
        canCreateNew: false
      };
    }
  }

  /**
   * Create a new tag for an open-list category
   * @param {string} categoryId - Category ID
   * @param {Object} category - Category object
   * @param {string} tagName - New tag name
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} - Created tag result
   */
  async createNewTag(categoryId, category, tagName, metadata = {}) {
    try {
      if (!this.isOpenListCategory(category)) {
        throw new Error('Cannot create new tags for fixed-list categories');
      }

      const normalizedTagName = this.normalizeInput(tagName);
      
      // Check if tag already exists (final validation)
      const existingTag = this.findExactMatch(category.tags, normalizedTagName);
      if (existingTag) {
        return {
          success: false,
          reason: 'tag_exists',
          existingTag
        };
      }

      // Check category limits
      const maxTags = category.typeConfig?.maxTags || 200;
      if (category.tags.length >= maxTags) {
        throw new Error(`Category has reached maximum tag limit (${maxTags})`);
      }

      // Create tag data
      const newTagData = {
        id: crypto.randomUUID(),
        name: normalizedTagName,
        aiGenerated: metadata.aiGenerated || false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        ...metadata
      };

      // Add tag to category
      const createdTag = await CategoryService.addTagToCategory(
        this.teamId,
        categoryId,
        newTagData
      );

      console.log(`[SmartTagService] Created new tag: ${normalizedTagName} in category ${categoryId}`);

      return {
        success: true,
        tag: createdTag,
        isNew: true
      };

    } catch (error) {
      console.error('[SmartTagService] Error creating new tag:', error);
      throw error;
    }
  }

  /**
   * Process AI-generated tag suggestions for open-list categories
   * @param {Array} aiSuggestions - AI-generated tag suggestions
   * @param {Array} categories - Available categories
   * @returns {Promise<Array>} - Processed suggestions with match information
   */
  async processAISuggestions(aiSuggestions, categories) {
    const processedSuggestions = [];

    for (const suggestion of aiSuggestions) {
      const category = categories.find(cat => cat.id === suggestion.categoryId);
      if (!category) continue;

      if (this.isOpenListCategory(category)) {
        // For open-list categories, check for matches and suggest creation if needed
        const matchResult = await this.smartTagMatch(
          category.id,
          category,
          suggestion.tagName,
          { aiGenerated: true, confidence: suggestion.confidence }
        );

        processedSuggestions.push({
          ...suggestion,
          matchResult,
          canCreateNew: matchResult.canCreateNew,
          suggestedAction: this.determineAIAction(matchResult, suggestion.confidence)
        });
      } else {
        // For fixed-list categories, only suggest existing tags
        const exactMatch = this.findExactMatch(category.tags, suggestion.tagName);
        const fuzzyMatches = this.findFuzzyMatches(category.tags, suggestion.tagName);
        
        processedSuggestions.push({
          ...suggestion,
          matchResult: {
            type: exactMatch ? 'exact_match' : 'fuzzy_match',
            match: exactMatch,
            matches: fuzzyMatches,
            canCreateNew: false
          },
          suggestedAction: exactMatch ? 'use_exact' : (fuzzyMatches.length > 0 ? 'use_fuzzy' : 'no_match')
        });
      }
    }

    return processedSuggestions;
  }

  /**
   * Find exact match in tag list
   * @param {Array} tags - Category tags
   * @param {string} input - Normalized input
   * @returns {Object|null} - Exact match or null
   */
  findExactMatch(tags, input) {
    return tags.find(tag => 
      this.normalizeInput(tag.name) === input
    ) || null;
  }

  /**
   * Find exact matches for multiple inputs (used for fixed-list categories)
   * @param {Array} tags - Category tags
   * @param {string} input - User input
   * @returns {Array} - Array of exact matches
   */
  findExactMatches(tags, input) {
    const normalizedInput = this.normalizeInput(input);
    return tags.filter(tag => 
      this.normalizeInput(tag.name) === normalizedInput
    );
  }

  /**
   * Find fuzzy matches using string similarity
   * @param {Array} tags - Category tags
   * @param {string} input - Normalized input
   * @returns {Array} - Array of fuzzy matches with confidence scores
   */
  findFuzzyMatches(tags, input) {
    const matches = [];

    for (const tag of tags) {
      const normalizedTag = this.normalizeInput(tag.name);
      const confidence = this.calculateStringSimilarity(input, normalizedTag);
      
      if (confidence >= 0.5) {
        matches.push({
          tag,
          confidence,
          reason: this.getSimilarityReason(input, normalizedTag)
        });
      }
    }

    // Sort by confidence descending
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find AI-powered similar tags using semantic matching
   * @param {Array} tags - Category tags
   * @param {string} input - User input
   * @param {Object} context - Additional context
   * @returns {Promise<Array>} - Array of AI-matched tags
   */
  async findAISimilarTags(tags, input, context) {
    try {
      // This would use AI to find semantically similar tags
      // For now, implementing a simplified version
      const aiMatches = [];

      // Use simple keyword matching as a fallback
      const inputWords = input.toLowerCase().split(/\s+/);
      
      for (const tag of tags) {
        const tagWords = tag.name.toLowerCase().split(/\s+/);
        const commonWords = inputWords.filter(word => 
          tagWords.some(tagWord => 
            tagWord.includes(word) || word.includes(tagWord)
          )
        );

        if (commonWords.length > 0) {
          const confidence = commonWords.length / Math.max(inputWords.length, tagWords.length);
          if (confidence >= 0.3) {
            aiMatches.push({
              tag,
              confidence,
              reason: `Similar keywords: ${commonWords.join(', ')}`
            });
          }
        }
      }

      return aiMatches.sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      console.error('[SmartTagService] Error in AI similarity matching:', error);
      return [];
    }
  }

  /**
   * Determine if a new tag should be created
   * @param {string} categoryId - Category ID
   * @param {Object} category - Category object
   * @param {string} tagName - Proposed tag name
   * @param {Object} matchInfo - Information about existing matches
   * @returns {Promise<boolean>} - Whether to create new tag
   */
  async shouldCreateNewTag(categoryId, category, tagName, matchInfo) {
    const config = category.typeConfig || {};
    
    // Check minimum confidence threshold
    const minConfidence = config.aiConfidenceThreshold || 0.7;
    
    // Don't create if there are high-confidence fuzzy matches
    if (matchInfo.fuzzyMatches.length > 0 && matchInfo.fuzzyMatches[0].confidence > 0.8) {
      return false;
    }

    // Don't create if there are high-confidence AI matches
    if (matchInfo.aiMatches.length > 0 && matchInfo.aiMatches[0].confidence > 0.7) {
      return false;
    }

    // Check tag name validity
    if (!this.isValidTagName(tagName)) {
      return false;
    }

    // Check category limits
    const maxTags = config.maxTags || 200;
    if (category.tags.length >= maxTags) {
      return false;
    }

    return true;
  }

  /**
   * Calculate confidence for creating a new tag
   * @param {string} tagName - Proposed tag name
   * @param {Array} fuzzyMatches - Fuzzy match results
   * @param {Array} aiMatches - AI match results
   * @returns {number} - Confidence score (0-1)
   */
  calculateNewTagConfidence(tagName, fuzzyMatches, aiMatches) {
    let confidence = 0.8; // Base confidence for user-created tags

    // Reduce confidence if there are close matches
    if (fuzzyMatches.length > 0) {
      const highestFuzzyConfidence = fuzzyMatches[0].confidence;
      confidence *= (1 - highestFuzzyConfidence * 0.5);
    }

    if (aiMatches.length > 0) {
      const highestAIConfidence = aiMatches[0].confidence;
      confidence *= (1 - highestAIConfidence * 0.3);
    }

    // Boost confidence for well-formed tag names
    if (this.isWellFormedTagName(tagName)) {
      confidence = Math.min(1.0, confidence * 1.1);
    }

    return Math.round(confidence * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Determine the suggested action for AI suggestions
   * @param {Object} matchResult - Match result object
   * @param {number} aiConfidence - AI confidence score
   * @returns {string} - Suggested action
   */
  determineAIAction(matchResult, aiConfidence) {
    if (matchResult.type === 'exact_match') {
      return 'use_exact';
    }

    if (matchResult.type === 'fuzzy_match' && matchResult.matches[0]?.confidence > 0.8) {
      return 'use_fuzzy';
    }

    if (matchResult.canCreateNew && aiConfidence > 0.7) {
      return 'create_new';
    }

    return 'manual_review';
  }

  /**
   * Check if category is open-list type
   * @param {Object} category - Category object
   * @returns {boolean} - True if open-list category
   */
  isOpenListCategory(category) {
    return category.categoryType === 'open-list' && 
           category.typeConfig?.allowAIExpansion === true;
  }

  /**
   * Normalize user input for matching
   * @param {string} input - Raw user input
   * @returns {string} - Normalized input
   */
  normalizeInput(input) {
    return input.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Similarity score (0-1)
   */
  calculateStringSimilarity(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Calculate Levenshtein distance
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    
    // Convert distance to similarity score
    return maxLen === 0 ? 1 : 1 - (distance / maxLen);
  }

  /**
   * Get reason for similarity match
   * @param {string} input - User input
   * @param {string} tagName - Tag name
   * @returns {string} - Similarity reason
   */
  getSimilarityReason(input, tagName) {
    if (tagName.includes(input) || input.includes(tagName)) {
      return 'Partial word match';
    }
    
    const similarity = this.calculateStringSimilarity(input, tagName);
    if (similarity > 0.8) {
      return 'Very similar spelling';
    } else if (similarity > 0.6) {
      return 'Similar spelling';
    } else {
      return 'Possible match';
    }
  }

  /**
   * Validate tag name format
   * @param {string} tagName - Tag name to validate
   * @returns {boolean} - True if valid
   */
  isValidTagName(tagName) {
    return tagName && 
           typeof tagName === 'string' &&
           tagName.trim().length > 0 &&
           tagName.trim().length <= 30 &&
           !/^\s|\s$/.test(tagName); // No leading/trailing spaces
  }

  /**
   * Check if tag name is well-formed (proper capitalization, etc.)
   * @param {string} tagName - Tag name to check
   * @returns {boolean} - True if well-formed
   */
  isWellFormedTagName(tagName) {
    // Check for proper capitalization and reasonable length
    return /^[A-Z][a-zA-Z0-9\s]*$/.test(tagName) && 
           tagName.length >= 2 && 
           tagName.length <= 25;
  }

  /**
   * Increment usage count for a tag
   * @param {string} categoryId - Category ID
   * @param {string} tagName - Tag name
   * @returns {Promise<void>}
   */
  async incrementTagUsage(categoryId, tagName) {
    try {
      await CategoryService.incrementTagUsage(this.teamId, categoryId, tagName);
    } catch (error) {
      console.error('[SmartTagService] Error incrementing tag usage:', error);
      // Don't throw - usage tracking is not critical
    }
  }
}

export default SmartTagService;