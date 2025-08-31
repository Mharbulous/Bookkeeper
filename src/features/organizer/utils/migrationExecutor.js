import { MigrationService } from '../services/migrationService.js';
import { useAuthStore } from '../../../core/stores/auth.js';

/**
 * Migration Executor - Utility for executing tag architecture migration
 * Provides simple interface for running the migration with progress tracking
 */
export class MigrationExecutor {
  constructor() {
    this.migrationService = null;
    this.isRunning = false;
    this.progress = {
      phase: 'idle',
      completed: 0,
      total: 0,
      message: 'Ready to migrate',
      errors: []
    };
  }

  /**
   * Initialize the migration service with current team
   */
  initialize() {
    const authStore = useAuthStore();
    if (!authStore.isAuthenticated) {
      throw new Error('User not authenticated');
    }
    
    this.migrationService = new MigrationService(authStore.currentTeam);
  }

  /**
   * Check migration prerequisites and analyze scope
   * @returns {Promise<Object>} - Analysis results
   */
  async analyzeMigration() {
    if (!this.migrationService) {
      this.initialize();
    }

    try {
      console.log('[MigrationExecutor] Analyzing migration scope...');
      const analysis = await this.migrationService.analyzeMigrationScope();
      
      console.log('[MigrationExecutor] Analysis complete:', {
        totalDocuments: analysis.totalDocuments,
        documentsToMigrate: analysis.documentsToMigrate.length,
        totalEmbeddedTags: analysis.totalEmbeddedTags
      });

      return analysis;
    } catch (error) {
      console.error('[MigrationExecutor] Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Execute the migration with progress tracking
   * @param {Object} options - Migration options
   * @returns {Promise<Object>} - Migration results
   */
  async executeMigration(options = {}) {
    if (this.isRunning) {
      throw new Error('Migration is already running');
    }

    if (!this.migrationService) {
      this.initialize();
    }

    const defaultOptions = {
      preserveEmbedded: true, // Keep embedded arrays as backup
      skipExisting: true, // Skip documents with existing subcollections
      ...options
    };

    try {
      this.isRunning = true;
      this.progress = {
        phase: 'starting',
        completed: 0,
        total: 0,
        message: 'Initializing migration...',
        errors: []
      };

      console.log('[MigrationExecutor] Starting migration with options:', defaultOptions);

      // Execute migration with progress callback
      const results = await this.migrationService.performBatchMigration(
        defaultOptions,
        (progressUpdate) => {
          this.progress = {
            ...this.progress,
            ...progressUpdate
          };
          console.log('[MigrationExecutor] Progress:', progressUpdate);
        }
      );

      console.log('[MigrationExecutor] Migration completed:', results);
      
      this.progress = {
        phase: 'completed',
        completed: results.results.successful + results.results.skipped,
        total: results.results.totalDocuments,
        message: `Migration completed: ${results.results.successful} successful, ${results.results.skipped} skipped, ${results.results.errors} errors`,
        errors: results.results.details.filter(d => d.status === 'error')
      };

      return results;

    } catch (error) {
      console.error('[MigrationExecutor] Migration failed:', error);
      
      this.progress = {
        ...this.progress,
        phase: 'error',
        message: `Migration failed: ${error.message}`,
        errors: [...this.progress.errors, { error: error.message }]
      };

      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get current migration progress
   * @returns {Object} - Current progress state
   */
  getProgress() {
    return { ...this.progress };
  }

  /**
   * Verify migration integrity for a specific document
   * @param {string} evidenceId - Evidence document ID
   * @returns {Promise<Object>} - Verification result
   */
  async verifyDocument(evidenceId) {
    if (!this.migrationService) {
      this.initialize();
    }

    try {
      return await this.migrationService.verifyMigration(evidenceId);
    } catch (error) {
      console.error(`[MigrationExecutor] Verification failed for ${evidenceId}:`, error);
      throw error;
    }
  }

  /**
   * Rollback migration for a specific document
   * @param {string} evidenceId - Evidence document ID
   * @returns {Promise<Object>} - Rollback result
   */
  async rollbackDocument(evidenceId) {
    if (!this.migrationService) {
      this.initialize();
    }

    try {
      console.log(`[MigrationExecutor] Rolling back migration for ${evidenceId}`);
      return await this.migrationService.rollbackMigration(evidenceId);
    } catch (error) {
      console.error(`[MigrationExecutor] Rollback failed for ${evidenceId}:`, error);
      throw error;
    }
  }

  /**
   * Reset migration state
   */
  reset() {
    if (this.isRunning) {
      throw new Error('Cannot reset while migration is running');
    }

    this.progress = {
      phase: 'idle',
      completed: 0,
      total: 0,
      message: 'Ready to migrate',
      errors: []
    };
  }

  /**
   * Check if migration is currently running
   * @returns {boolean}
   */
  get running() {
    return this.isRunning;
  }
}

/**
 * Create a singleton migration executor instance
 */
export const migrationExecutor = new MigrationExecutor();

/**
 * Convenience functions for common operations
 */

/**
 * Quick migration analysis
 * @returns {Promise<Object>}
 */
export async function analyzeMigration() {
  return await migrationExecutor.analyzeMigration();
}

/**
 * Execute migration with default options
 * @param {Object} options - Migration options
 * @returns {Promise<Object>}
 */
export async function executeMigration(options = {}) {
  return await migrationExecutor.executeMigration(options);
}

/**
 * Get current migration progress
 * @returns {Object}
 */
export function getMigrationProgress() {
  return migrationExecutor.getProgress();
}

/**
 * Example usage in development console:
 * 
 * import { analyzeMigration, executeMigration, getMigrationProgress } from './migrationExecutor.js';
 * 
 * // Analyze migration scope
 * const analysis = await analyzeMigration();
 * console.log('Documents to migrate:', analysis.documentsToMigrate.length);
 * 
 * // Execute migration
 * const results = await executeMigration({ preserveEmbedded: true });
 * console.log('Migration results:', results);
 * 
 * // Check progress during migration (in another console)
 * console.log('Progress:', getMigrationProgress());
 */

export default MigrationExecutor;