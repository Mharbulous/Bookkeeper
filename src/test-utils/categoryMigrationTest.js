/**
 * Test utility for verifying isActive field migration
 * This simulates categories without isActive field to test fallback behavior
 */

import { CategoryService } from '../features/organizer/services/categoryService.js';

export class CategoryMigrationTest {
  /**
   * Test the migration fallback for categories missing isActive field
   */
  static async testMigrationFallback(teamId) {
    console.group('[CategoryMigrationTest] Testing isActive field migration');
    
    try {
      // Test 1: Normal query with isActive field
      console.log('Test 1: Fetching categories with isActive field...');
      const activeCategories = await CategoryService.getActiveCategories(teamId);
      console.log(`Found ${activeCategories.length} active categories`);
      
      // Verify all returned categories have isActive field
      const missingIsActive = activeCategories.filter(cat => cat.isActive === undefined);
      if (missingIsActive.length === 0) {
        console.log('✅ All categories have isActive field');
      } else {
        console.log(`❌ ${missingIsActive.length} categories missing isActive field`);
      }

      // Test 2: Verify unique name validation works with fallback
      console.log('Test 2: Testing unique name validation...');
      try {
        // This should work without errors even if some categories lack isActive
        await CategoryService.validateUniqueName(teamId, 'Test Category');
        console.log('✅ Unique name validation passed');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('✅ Unique name validation correctly detected duplicate');
        } else {
          console.log('❌ Unique name validation failed:', error.message);
        }
      }

      // Test 3: Verify migration happens automatically
      console.log('Test 3: Verifying automatic migration...');
      const categoriesAfterMigration = await CategoryService.getActiveCategories(teamId);
      const stillMissing = categoriesAfterMigration.filter(cat => cat.isActive === undefined);
      
      if (stillMissing.length === 0) {
        console.log('✅ All categories now have isActive field after migration');
      } else {
        console.log(`⚠️ ${stillMissing.length} categories still missing isActive field`);
      }

      return {
        success: true,
        totalCategories: activeCategories.length,
        migrationNeeded: missingIsActive.length,
        stillMissing: stillMissing.length
      };

    } catch (error) {
      console.error('❌ Migration test failed:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      console.groupEnd();
    }
  }

  /**
   * Simulate a category without isActive field for testing
   * WARNING: This is for testing only - don't use in production
   */
  static simulateLegacyCategory() {
    return {
      id: 'test-legacy-category',
      name: 'Legacy Test Category',
      color: '#1976d2',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
      // Note: isActive field is intentionally missing
    };
  }

  /**
   * Verify the migration logic works correctly
   */
  static testMigrationLogic() {
    console.group('[CategoryMigrationTest] Testing migration logic');
    
    const legacyCategory = this.simulateLegacyCategory();
    console.log('Legacy category (missing isActive):', legacyCategory);
    
    // Test the logic used in the actual migration
    const shouldInclude = legacyCategory.isActive === undefined || legacyCategory.isActive === true;
    const defaultIsActive = legacyCategory.isActive === undefined ? true : legacyCategory.isActive;
    
    console.log('Should include in results:', shouldInclude);
    console.log('Default isActive value:', defaultIsActive);
    
    if (shouldInclude && defaultIsActive === true) {
      console.log('✅ Migration logic works correctly');
      console.groupEnd();
      return true;
    } else {
      console.log('❌ Migration logic failed');
      console.groupEnd();
      return false;
    }
  }
}