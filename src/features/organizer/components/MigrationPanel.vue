<template>
  <v-card class="migration-panel">
    <v-card-title class="migration-header">
      <v-icon class="mr-2">mdi-database-sync</v-icon>
      Tag Architecture Migration
    </v-card-title>

    <v-card-text>
      <!-- Analysis Section -->
      <div class="analysis-section mb-4">
        <v-btn
          :loading="analyzing"
          :disabled="migrating"
          color="info"
          variant="outlined"
          @click="analyzeScope"
        >
          <v-icon class="mr-2">mdi-magnify</v-icon>
          Analyze Migration Scope
        </v-btn>

        <div v-if="analysis" class="analysis-results mt-3">
          <v-alert type="info" variant="tonal">
            <template #title>Migration Analysis</template>
            <ul class="mt-2">
              <li><strong>Total Documents:</strong> {{ analysis.totalDocuments }}</li>
              <li><strong>Documents with Embedded Tags:</strong> {{ analysis.documentsWithEmbeddedTags }}</li>
              <li><strong>Documents to Migrate:</strong> {{ analysis.documentsToMigrate.length }}</li>
              <li><strong>Total Embedded Tags:</strong> {{ analysis.totalEmbeddedTags }}</li>
              <li><strong>Estimated Batches:</strong> {{ analysis.estimatedBatches }}</li>
            </ul>
          </v-alert>
        </div>
      </div>

      <!-- Migration Execution Section -->
      <div class="execution-section mb-4">
        <div class="migration-options mb-3">
          <v-checkbox
            v-model="preserveEmbedded"
            label="Preserve embedded arrays as backup"
            :disabled="migrating"
            hide-details
          />
          <v-checkbox
            v-model="skipExisting"
            label="Skip documents with existing subcollections"
            :disabled="migrating"
            hide-details
          />
        </div>

        <v-btn
          :loading="migrating"
          :disabled="analyzing || !analysis"
          color="primary"
          variant="elevated"
          @click="executeMigration"
        >
          <v-icon class="mr-2">mdi-play</v-icon>
          Execute Migration
        </v-btn>
      </div>

      <!-- Progress Section -->
      <div v-if="progress.phase !== 'idle'" class="progress-section mb-4">
        <v-card variant="outlined">
          <v-card-subtitle class="progress-header">
            <v-icon class="mr-2">mdi-progress-clock</v-icon>
            Migration Progress
          </v-card-subtitle>
          
          <v-card-text>
            <div class="progress-info mb-2">
              <strong>Phase:</strong> {{ progress.phase }}
            </div>
            <div class="progress-info mb-2">
              <strong>Message:</strong> {{ progress.message }}
            </div>
            
            <v-progress-linear
              v-if="progress.total > 0"
              :model-value="(progress.completed / progress.total) * 100"
              :color="progress.phase === 'error' ? 'error' : 'primary'"
              height="8"
              rounded
            />
            
            <div v-if="progress.total > 0" class="progress-stats mt-2">
              {{ progress.completed }} / {{ progress.total }} completed
              ({{ Math.round((progress.completed / progress.total) * 100) }}%)
            </div>

            <!-- Errors -->
            <div v-if="progress.errors.length > 0" class="errors-section mt-3">
              <v-alert type="error" variant="tonal">
                <template #title>Migration Errors ({{ progress.errors.length }})</template>
                <div class="errors-list mt-2">
                  <div
                    v-for="(error, index) in progress.errors.slice(0, 5)"
                    :key="index"
                    class="error-item"
                  >
                    <strong>{{ error.evidenceId || 'Unknown' }}:</strong> {{ error.error }}
                  </div>
                  <div v-if="progress.errors.length > 5" class="error-more">
                    ... and {{ progress.errors.length - 5 }} more errors
                  </div>
                </div>
              </v-alert>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Results Section -->
      <div v-if="migrationResults" class="results-section mb-4">
        <v-alert
          :type="migrationResults.status === 'completed' ? 'success' : 'error'"
          variant="tonal"
        >
          <template #title>Migration Results</template>
          <div class="results-summary mt-2">
            <div><strong>Status:</strong> {{ migrationResults.status }}</div>
            <div v-if="migrationResults.results">
              <div><strong>Total Documents:</strong> {{ migrationResults.results.totalDocuments }}</div>
              <div><strong>Successful:</strong> {{ migrationResults.results.successful }}</div>
              <div><strong>Skipped:</strong> {{ migrationResults.results.skipped }}</div>
              <div><strong>Errors:</strong> {{ migrationResults.results.errors }}</div>
              <div><strong>Duration:</strong> {{ Math.round(migrationResults.results.duration / 1000) }}s</div>
            </div>
          </div>
        </v-alert>
      </div>

      <!-- Actions Section -->
      <div class="actions-section">
        <v-btn
          :disabled="migrating || analyzing"
          color="warning"
          variant="outlined"
          size="small"
          @click="resetMigration"
        >
          <v-icon class="mr-2">mdi-refresh</v-icon>
          Reset
        </v-btn>
        
        <v-btn
          :disabled="migrating || analyzing"
          color="error"
          variant="outlined"
          size="small"
          class="ml-2"
          @click="showRollbackDialog = true"
        >
          <v-icon class="mr-2">mdi-undo</v-icon>
          Rollback
        </v-btn>
      </div>
    </v-card-text>

    <!-- Rollback Dialog -->
    <v-dialog v-model="showRollbackDialog" max-width="500">
      <v-card>
        <v-card-title>Rollback Migration</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="rollbackEvidenceId"
            label="Evidence ID"
            placeholder="Enter evidence document ID to rollback"
            variant="outlined"
            hide-details
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showRollbackDialog = false">Cancel</v-btn>
          <v-btn
            :disabled="!rollbackEvidenceId"
            color="error"
            @click="executeRollback"
          >
            Rollback
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref } from 'vue';
import { migrationExecutor } from '../utils/migrationExecutor.js';

// Reactive state
const analyzing = ref(false);
const migrating = ref(false);
const analysis = ref(null);
const progress = ref({ phase: 'idle', completed: 0, total: 0, message: 'Ready to migrate', errors: [] });
const migrationResults = ref(null);

// Migration options
const preserveEmbedded = ref(true);
const skipExisting = ref(true);

// Rollback dialog
const showRollbackDialog = ref(false);
const rollbackEvidenceId = ref('');

/**
 * Analyze migration scope
 */
const analyzeScope = async () => {
  try {
    analyzing.value = true;
    analysis.value = await migrationExecutor.analyzeMigration();
  } catch (error) {
    console.error('Analysis failed:', error);
    // TODO: Show error notification
  } finally {
    analyzing.value = false;
  }
};

/**
 * Execute migration
 */
const executeMigration = async () => {
  try {
    migrating.value = true;
    migrationResults.value = null;
    
    // Start progress polling
    const progressInterval = setInterval(() => {
      progress.value = migrationExecutor.getProgress();
    }, 500);

    const results = await migrationExecutor.executeMigration({
      preserveEmbedded: preserveEmbedded.value,
      skipExisting: skipExisting.value
    });

    migrationResults.value = results;
    clearInterval(progressInterval);
    
    // Final progress update
    progress.value = migrationExecutor.getProgress();

  } catch (error) {
    console.error('Migration failed:', error);
    // TODO: Show error notification
  } finally {
    migrating.value = false;
  }
};

/**
 * Reset migration state
 */
const resetMigration = () => {
  migrationExecutor.reset();
  progress.value = migrationExecutor.getProgress();
  migrationResults.value = null;
  analysis.value = null;
};

/**
 * Execute rollback for specific document
 */
const executeRollback = async () => {
  if (!rollbackEvidenceId.value) return;

  try {
    const result = await migrationExecutor.rollbackDocument(rollbackEvidenceId.value);
    console.log('Rollback result:', result);
    // TODO: Show success notification
    
    showRollbackDialog.value = false;
    rollbackEvidenceId.value = '';
  } catch (error) {
    console.error('Rollback failed:', error);
    // TODO: Show error notification
  }
};
</script>

<style scoped>
.migration-panel {
  max-width: 800px;
  margin: 0 auto;
}

.migration-header {
  background: linear-gradient(45deg, #1976d2, #42a5f5);
  color: white;
}

.analysis-results,
.progress-section,
.results-section {
  margin-top: 16px;
}

.progress-info {
  font-size: 0.9rem;
}

.progress-stats {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.6);
  text-align: center;
}

.error-item {
  font-size: 0.85rem;
  margin-bottom: 4px;
  padding: 4px;
  background: rgba(244, 67, 54, 0.05);
  border-radius: 4px;
}

.error-more {
  font-style: italic;
  color: rgba(0, 0, 0, 0.6);
  margin-top: 8px;
}

.actions-section {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  padding-top: 16px;
  margin-top: 16px;
}

.results-summary > div {
  margin-bottom: 4px;
}
</style>