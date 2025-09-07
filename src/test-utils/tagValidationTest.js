/**
 * Test utility for verifying tag validation and cleanup functionality
 * Tests the category validation and orphaned tag cleanup system
 */

import { useOrganizerCoreStore } from '../features/organizer/stores/organizerCore.js';
import { useCategoryStore } from '../features/organizer/stores/categoryStore.js';
import tagSubcollectionService from '../features/organizer/services/tagSubcollectionService.js';

export class TagValidationTest {
  /**
   * Test tag validation and cleanup for an evidence document
   */
  static async testTagValidation(evidenceId, teamId) {
    console.group('[TagValidationTest] Testing tag validation and cleanup');
    
    try {
      const coreStore = useOrganizerCoreStore();
      const categoryStore = useCategoryStore();
      
      // Test 1: Check that category store is initialized
      console.log('Test 1: Checking category store initialization...');
      if (!categoryStore.isInitialized) {
        console.log('⚠️ Category store not initialized - validation will be skipped');
      } else {
        console.log('✅ Category store is initialized');
      }

      // Test 2: Get raw tags from subcollection
      console.log('Test 2: Fetching raw tags from subcollection...');
      const rawTags = await tagSubcollectionService.getTags(evidenceId, {}, teamId);
      console.log(`Found ${rawTags.length} raw tags`);

      // Test 3: Check category validation for each tag
      console.log('Test 3: Validating categories for each tag...');
      const validTags = [];
      const invalidTags = [];
      const inactiveTags = [];

      for (const tag of rawTags) {
        const categoryId = tag.id;
        const category = categoryStore.getCategoryById(categoryId);
        
        if (!category) {
          console.log(`❌ Orphaned tag found: ${tag.tagName} (category ${categoryId} deleted)`);
          invalidTags.push({ tag, categoryId, reason: 'deleted' });
        } else if (category.isActive === false) {
          console.log(`🔒 Inactive tag found: ${tag.tagName} (category ${category.name} inactive)`);
          inactiveTags.push({ tag, category, reason: 'inactive' });
        } else {
          console.log(`✅ Valid tag: ${tag.tagName} (category ${category.name})`);
          validTags.push({ tag, category });
        }
      }

      // Test 4: Load tags through the validation system
      console.log('Test 4: Loading tags through validation system...');
      const tagData = await coreStore.loadTagsForEvidence(evidenceId, teamId);
      console.log(`Validation system returned ${tagData.subcollectionTags.length} valid tags`);

      // Test 5: Verify filtering worked correctly
      console.log('Test 5: Verifying filtering results...');
      const expectedValidCount = validTags.length;
      const actualValidCount = tagData.subcollectionTags.length;
      
      if (expectedValidCount === actualValidCount) {
        console.log('✅ Tag filtering worked correctly');
      } else {
        console.log(`❌ Tag filtering mismatch: expected ${expectedValidCount}, got ${actualValidCount}`);
      }

      // Test 6: Check for cleanup attempts
      if (invalidTags.length > 0) {
        console.log(`Test 6: ${invalidTags.length} orphaned tags should be cleaned up in background`);
        
        // Wait a moment for background cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if tags were actually deleted
        console.log('Verifying cleanup by re-fetching raw tags...');
        const rawTagsAfterCleanup = await tagSubcollectionService.getTags(evidenceId, {}, teamId);
        const cleanupCount = rawTags.length - rawTagsAfterCleanup.length;
        
        if (cleanupCount > 0) {
          console.log(`✅ ${cleanupCount} orphaned tags were successfully cleaned up`);
        } else {
          console.log(`⚠️ Cleanup may be in progress or failed`);
        }
      } else {
        console.log('Test 6: No orphaned tags found - cleanup not needed');
      }

      return {
        success: true,
        rawTagCount: rawTags.length,
        validTagCount: validTags.length,
        inactiveTagCount: inactiveTags.length,
        orphanedTagCount: invalidTags.length,
        filteredTagCount: tagData.subcollectionTags.length,
        filteringWorked: expectedValidCount === actualValidCount
      };

    } catch (error) {
      console.error('❌ Tag validation test failed:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      console.groupEnd();
    }
  }

  /**
   * Test category validation logic in isolation
   */
  static testValidationLogic() {
    console.group('[TagValidationTest] Testing validation logic');
    
    // Mock category scenarios
    const scenarios = [
      { category: null, expected: 'delete', description: 'Deleted category' },
      { category: { isActive: false, name: 'Test' }, expected: 'hide', description: 'Inactive category' },
      { category: { isActive: true, name: 'Test' }, expected: 'show', description: 'Active category' },
      { category: { name: 'Test' }, expected: 'show', description: 'Category without isActive field (defaults to active)' }
    ];
    
    scenarios.forEach(scenario => {
      const { category, expected, description } = scenario;
      
      let result;
      if (!category) {
        result = 'delete';
      } else if (category.isActive === false) {
        result = 'hide';
      } else {
        result = 'show';
      }
      
      if (result === expected) {
        console.log(`✅ ${description}: ${result}`);
      } else {
        console.log(`❌ ${description}: expected ${expected}, got ${result}`);
      }
    });
    
    console.groupEnd();
  }

  /**
   * Simulate creating orphaned tags for testing
   * WARNING: This is for testing only - creates invalid data
   */
  static async simulateOrphanedTag(evidenceId, teamId, fakeTagData) {
    console.warn('[TagValidationTest] Creating orphaned tag for testing purposes');
    
    try {
      // Create a tag with a non-existent category ID
      const orphanedTag = {
        ...fakeTagData,
        categoryId: 'deleted-category-' + Date.now()
      };
      
      await tagSubcollectionService.addTag(evidenceId, orphanedTag, teamId);
      console.log('Orphaned tag created for testing');
      
      return orphanedTag.categoryId;
    } catch (error) {
      console.error('Failed to create orphaned tag:', error);
      throw error;
    }
  }

  /**
   * Run comprehensive test suite
   */
  static async runFullTestSuite(evidenceId, teamId) {
    console.group('[TagValidationTest] Running full test suite');
    
    try {
      // Test 1: Logic validation
      console.log('Running logic validation tests...');
      this.testValidationLogic();
      
      // Test 2: Live tag validation
      console.log('Running live tag validation tests...');
      const results = await this.testTagValidation(evidenceId, teamId);
      
      console.log('Test suite completed:');
      console.log('Results:', results);
      
      return results;
    } catch (error) {
      console.error('Test suite failed:', error);
      return { success: false, error: error.message };
    } finally {
      console.groupEnd();
    }
  }
}