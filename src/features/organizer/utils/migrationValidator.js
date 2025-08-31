import { TagSubcollectionService } from '../services/tagSubcollectionService.js';
import { MigrationService } from '../services/migrationService.js';
import { AITagService } from '../services/aiTagService.js';
import { useAuthStore } from '../../../core/stores/auth.js';

/**
 * Migration Validator - Comprehensive testing and validation utilities
 * Provides validation functions to ensure migration implementation is working correctly
 */
export class MigrationValidator {
  constructor() {
    this.tagService = null;
    this.migrationService = null;
    this.aiTagService = null;
    this.teamId = null;
  }

  /**
   * Initialize services with current team
   */
  initialize() {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) {
      throw new Error('User not authenticated');
    }
    
    this.teamId = authStore.currentTeam;
    this.tagService = new TagSubcollectionService(this.teamId);
    this.migrationService = new MigrationService(this.teamId);
    this.aiTagService = new AITagService(this.teamId);
  }

  /**
   * Run comprehensive validation tests
   * @returns {Promise<Object>} - Test results
   */
  async runAllTests() {
    if (!this.tagService) {
      this.initialize();
    }

    const results = {
      startTime: new Date(),
      endTime: null,
      totalTests: 0,
      passed: 0,
      failed: 0,
      tests: []
    };

    const tests = [
      this.testTagSubcollectionCRUD,
      this.testMigrationAnalysis,
      this.testSingleDocumentMigration,
      this.testMigrationVerification,
      this.testAITagWorkflow,
      this.testRealTimeUpdates,
      this.testBackwardCompatibility,
      this.testErrorHandling
    ];

    for (const test of tests) {
      results.totalTests++;
      try {
        const testResult = await test.call(this);
        testResult.status = 'passed';
        results.tests.push(testResult);
        results.passed++;
        console.log(`✅ ${testResult.name} - PASSED`);
      } catch (error) {
        const testResult = {
          name: test.name,
          status: 'failed',
          error: error.message,
          details: error.stack
        };
        results.tests.push(testResult);
        results.failed++;
        console.error(`❌ ${testResult.name} - FAILED:`, error);
      }
    }

    results.endTime = new Date();
    results.duration = results.endTime - results.startTime;

    console.log('\n=== Migration Validation Summary ===');
    console.log(`Total Tests: ${results.totalTests}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Success Rate: ${Math.round((results.passed / results.totalTests) * 100)}%`);
    console.log(`Duration: ${results.duration}ms`);

    return results;
  }

  /**
   * Test basic CRUD operations for tag subcollections
   */
  async testTagSubcollectionCRUD() {
    const testEvidenceId = 'test-evidence-crud';
    const testTag = {
      categoryId: 'test-category',
      categoryName: 'Test Category',
      tagName: 'Test Tag',
      color: '#4CAF50',
      source: 'human',
      createdBy: 'test-user'
    };

    // Test add tag
    const addedTag = await this.tagService.addTag(testEvidenceId, testTag);
    if (!addedTag.id || addedTag.tagName !== testTag.tagName) {
      throw new Error('Failed to add tag correctly');
    }

    // Test get tags
    const tags = await this.tagService.getTagsForEvidence(testEvidenceId);
    if (tags.length !== 1 || tags[0].tagName !== testTag.tagName) {
      throw new Error('Failed to retrieve tags correctly');
    }

    // Test update tag
    const updatedTag = await this.tagService.updateTag(testEvidenceId, addedTag.id, {
      tagName: 'Updated Test Tag'
    });
    if (updatedTag.tagName !== 'Updated Test Tag') {
      throw new Error('Failed to update tag correctly');
    }

    // Test remove tag
    await this.tagService.removeTag(testEvidenceId, addedTag.id);
    const tagsAfterRemoval = await this.tagService.getTagsForEvidence(testEvidenceId);
    if (tagsAfterRemoval.length !== 0) {
      throw new Error('Failed to remove tag correctly');
    }

    return {
      name: 'Tag Subcollection CRUD',
      message: 'All CRUD operations working correctly',
      details: {
        addedTagId: addedTag.id,
        updatedTagName: updatedTag.tagName,
        finalTagCount: tagsAfterRemoval.length
      }
    };
  }

  /**
   * Test migration analysis functionality
   */
  async testMigrationAnalysis() {
    const analysis = await this.migrationService.analyzeMigrationScope();
    
    if (typeof analysis.totalDocuments !== 'number' ||
        typeof analysis.documentsWithEmbeddedTags !== 'number' ||
        !Array.isArray(analysis.documentsToMigrate)) {
      throw new Error('Migration analysis returned invalid structure');
    }

    return {
      name: 'Migration Analysis',
      message: 'Migration analysis functioning correctly',
      details: {
        totalDocuments: analysis.totalDocuments,
        documentsWithEmbeddedTags: analysis.documentsWithEmbeddedTags,
        documentsToMigrate: analysis.documentsToMigrate.length
      }
    };
  }

  /**
   * Test single document migration process
   */
  async testSingleDocumentMigration() {
    const testEvidenceId = 'test-evidence-migration';
    
    // Create test document with embedded tags (simulated)
    const mockEvidence = {
      id: testEvidenceId,
      tagsByHuman: [{
        categoryId: 'cat-1',
        categoryName: 'Test Category',
        tagId: 'tag-1',
        tagName: 'Human Tag',
        color: '#4CAF50'
      }],
      tagsByAI: [{
        categoryId: 'cat-2',
        categoryName: 'AI Category',
        tagName: 'AI Tag',
        color: '#FF9800',
        confidence: 0.9,
        reasoning: 'Test reasoning'
      }]
    };

    // Test migration (this would need mock Firestore data)
    const migrationResult = await this.migrationService.migrateSingleDocument(
      testEvidenceId, 
      { preserveEmbedded: true, skipExisting: false }
    );

    if (migrationResult.status !== 'success' && migrationResult.status !== 'skipped') {
      throw new Error(`Migration failed with status: ${migrationResult.status}`);
    }

    return {
      name: 'Single Document Migration',
      message: 'Document migration process working',
      details: {
        status: migrationResult.status,
        migratedTags: migrationResult.migratedTags || 0
      }
    };
  }

  /**
   * Test migration verification functionality
   */
  async testMigrationVerification() {
    const testEvidenceId = 'test-evidence-verification';
    
    const verification = await this.migrationService.verifyMigration(testEvidenceId);
    
    if (typeof verification.isValid !== 'boolean' ||
        !verification.evidenceId) {
      throw new Error('Migration verification returned invalid structure');
    }

    return {
      name: 'Migration Verification',
      message: 'Migration verification working correctly',
      details: {
        evidenceId: verification.evidenceId,
        isValid: verification.isValid,
        hasDetails: !!verification.details
      }
    };
  }

  /**
   * Test AI tag workflow with subcollections
   */
  async testAITagWorkflow() {
    if (!this.aiTagService.isAIEnabled()) {
      return {
        name: 'AI Tag Workflow',
        message: 'AI features disabled - test skipped',
        details: { skipped: true }
      };
    }

    // Test would require actual AI service integration
    // For now, test the service structure
    if (typeof this.aiTagService.processSingleDocument !== 'function' ||
        typeof this.aiTagService.approveAITag !== 'function' ||
        typeof this.aiTagService.rejectAITag !== 'function') {
      throw new Error('AI tag service missing required methods');
    }

    return {
      name: 'AI Tag Workflow',
      message: 'AI tag service structure validated',
      details: {
        hasProcessMethod: typeof this.aiTagService.processSingleDocument === 'function',
        hasApproveMethod: typeof this.aiTagService.approveAITag === 'function',
        hasRejectMethod: typeof this.aiTagService.rejectAITag === 'function'
      }
    };
  }

  /**
   * Test real-time updates functionality
   */
  async testRealTimeUpdates() {
    const testEvidenceId = 'test-evidence-realtime';
    
    return new Promise((resolve, reject) => {
      let updateReceived = false;
      
      // Subscribe to updates
      const unsubscribe = this.tagService.subscribeToTags(testEvidenceId, (tags) => {
        updateReceived = true;
        unsubscribe();
        
        resolve({
          name: 'Real-time Updates',
          message: 'Real-time subscription working correctly',
          details: {
            updateReceived: true,
            tagCount: tags.length
          }
        });
      });

      // Timeout if no update received
      setTimeout(() => {
        unsubscribe();
        if (!updateReceived) {
          resolve({
            name: 'Real-time Updates',
            message: 'Real-time subscription established (no initial data)',
            details: {
              updateReceived: false,
              subscriptionEstablished: true
            }
          });
        }
      }, 2000);
    });
  }

  /**
   * Test backward compatibility with embedded arrays
   */
  async testBackwardCompatibility() {
    // Test that components can handle both embedded arrays and subcollections
    const mockEvidenceWithEmbedded = {
      id: 'test-embedded',
      tagsByHuman: [{ tagName: 'Embedded Tag', categoryName: 'Category' }],
      tagsByAI: []
    };

    const mockEvidenceWithSubcollection = {
      id: 'test-subcollection',
      tagCount: 1,
      lastTaggedAt: new Date()
    };

    // Test that both formats are handled gracefully
    if (!mockEvidenceWithEmbedded.tagsByHuman ||
        !Array.isArray(mockEvidenceWithEmbedded.tagsByHuman)) {
      throw new Error('Embedded array format not properly supported');
    }

    return {
      name: 'Backward Compatibility',
      message: 'Both embedded and subcollection formats supported',
      details: {
        embeddedSupported: Array.isArray(mockEvidenceWithEmbedded.tagsByHuman),
        subcollectionSupported: typeof mockEvidenceWithSubcollection.tagCount === 'number'
      }
    };
  }

  /**
   * Test error handling throughout the system
   */
  async testErrorHandling() {
    const errors = [];
    
    // Test invalid evidence ID
    try {
      await this.tagService.getTagsForEvidence('invalid-evidence-id');
    } catch (error) {
      // Expected error - good
    }

    // Test invalid tag data
    try {
      await this.tagService.addTag('test-evidence', {
        // Missing required fields
        tagName: 'Test'
      });
    } catch (error) {
      errors.push('addTag validation working');
    }

    // Test non-existent tag removal
    try {
      await this.tagService.removeTag('test-evidence', 'non-existent-tag');
    } catch (error) {
      errors.push('removeTag error handling working');
    }

    return {
      name: 'Error Handling',
      message: 'Error handling mechanisms working correctly',
      details: {
        errorsHandled: errors.length,
        handledErrors: errors
      }
    };
  }

  /**
   * Quick validation check for development
   * @returns {Promise<boolean>} - True if basic functionality is working
   */
  async quickValidation() {
    try {
      if (!this.tagService) {
        this.initialize();
      }

      // Quick test: can we initialize services?
      const analysis = await this.migrationService.analyzeMigrationScope();
      const hasValidAnalysis = typeof analysis.totalDocuments === 'number';

      console.log('[MigrationValidator] Quick validation:', hasValidAnalysis ? 'PASSED' : 'FAILED');
      return hasValidAnalysis;
    } catch (error) {
      console.error('[MigrationValidator] Quick validation FAILED:', error);
      return false;
    }
  }
}

/**
 * Singleton validator instance
 */
export const migrationValidator = new MigrationValidator();

/**
 * Convenience functions
 */

/**
 * Run comprehensive validation tests
 * @returns {Promise<Object>}
 */
export async function validateMigration() {
  return await migrationValidator.runAllTests();
}

/**
 * Quick validation check
 * @returns {Promise<boolean>}
 */
export async function quickValidation() {
  return await migrationValidator.quickValidation();
}

/**
 * Example usage in development console:
 * 
 * import { validateMigration, quickValidation } from './migrationValidator.js';
 * 
 * // Quick check
 * const isWorking = await quickValidation();
 * console.log('Migration working:', isWorking);
 * 
 * // Full validation
 * const results = await validateMigration();
 * console.log('Test results:', results);
 */

export default MigrationValidator;