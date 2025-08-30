import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase.js';
import { useAuthStore } from '../../../core/stores/auth.js';

export const useMigrationStore = defineStore('migration', () => {
  // State
  const migrationProgress = ref(0);
  const migrationStatus = ref('idle'); // idle, analyzing, migrating, completed, error
  const migrationResults = ref({
    totalDocuments: 0,
    migratedDocuments: 0,
    skippedDocuments: 0,
    errorDocuments: 0,
    uniqueLegacyTags: [],
    suggestedCategories: []
  });
  const error = ref(null);
  
  // Auth store reference
  const authStore = useAuthStore();

  // Computed
  const isComplete = computed(() => migrationStatus.value === 'completed');
  const hasErrors = computed(() => migrationStatus.value === 'error' || migrationResults.value.errorDocuments > 0);

  /**
   * Analyze existing legacy tags to suggest category mappings
   */
  const analyzeLegacyTags = async () => {
    try {
      if (!authStore.isAuthenticated) {
        throw new Error('User not authenticated');
      }

      migrationStatus.value = 'analyzing';
      error.value = null;

      const teamId = authStore.currentTeam;
      if (!teamId) {
        throw new Error('No team ID available');
      }

      // Fetch all evidence documents with legacy tags
      const evidenceRef = collection(db, 'teams', teamId, 'evidence');
      const evidenceQuery = query(evidenceRef, where('tags', '!=', null));
      const snapshot = await getDocs(evidenceQuery);

      const allLegacyTags = new Set();
      let documentCount = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.tags && Array.isArray(data.tags)) {
          documentCount++;
          data.tags.forEach(tag => {
            if (typeof tag === 'string' && tag.trim()) {
              allLegacyTags.add(tag.trim().toLowerCase());
            }
          });
        }
      });

      const uniqueTags = Array.from(allLegacyTags).sort();
      const suggestedCategories = generateCategorySuggestions(uniqueTags);

      migrationResults.value = {
        totalDocuments: documentCount,
        migratedDocuments: 0,
        skippedDocuments: 0,
        errorDocuments: 0,
        uniqueLegacyTags: uniqueTags,
        suggestedCategories
      };

      migrationStatus.value = 'idle';
      console.log(`[MigrationStore] Analyzed ${uniqueTags.length} unique legacy tags from ${documentCount} documents`);
      
      return migrationResults.value;
    } catch (err) {
      console.error('[MigrationStore] Failed to analyze legacy tags:', err);
      error.value = err.message;
      migrationStatus.value = 'error';
      throw err;
    }
  };

  /**
   * Generate category suggestions based on legacy tag patterns
   */
  const generateCategorySuggestions = (tags) => {
    const suggestions = [];
    
    // Document Type patterns
    const documentTypes = tags.filter(tag => 
      /^(invoice|statement|receipt|contract|agreement|report|memo|letter|email|form)/.test(tag) ||
      tag.includes('invoice') || tag.includes('statement') || tag.includes('receipt') ||
      tag.includes('contract') || tag.includes('agreement') || tag.includes('report')
    );
    
    if (documentTypes.length > 0) {
      suggestions.push({
        name: 'Document Type',
        color: '#1976d2',
        suggestedTags: [...new Set(documentTypes)],
        confidence: 'high'
      });
    }

    // Date/Period patterns
    const datePatterns = tags.filter(tag =>
      /^(q[1-4]|quarter|month|year|\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/.test(tag) ||
      tag.includes('2023') || tag.includes('2024') || tag.includes('2025') ||
      tag.includes('quarter') || tag.includes('month') || tag.includes('year')
    );
    
    if (datePatterns.length > 0) {
      suggestions.push({
        name: 'Date/Period',
        color: '#388e3c',
        suggestedTags: [...new Set(datePatterns)],
        confidence: 'high'
      });
    }

    // Institution/Company patterns
    const institutions = tags.filter(tag =>
      /^(bank|credit|union|corp|inc|llc|ltd|company)/.test(tag) ||
      tag.includes('bank') || tag.includes('credit') || tag.includes('union') ||
      tag.includes('corp') || tag.includes('inc') || tag.includes('llc') ||
      tag.includes('wells') || tag.includes('chase') || tag.includes('american')
    );
    
    if (institutions.length > 0) {
      suggestions.push({
        name: 'Institution',
        color: '#f57c00',
        suggestedTags: [...new Set(institutions)],
        confidence: 'medium'
      });
    }

    // Status/Priority patterns
    const statusPatterns = tags.filter(tag =>
      /^(urgent|important|pending|completed|reviewed|approved|draft|final)/.test(tag) ||
      tag.includes('urgent') || tag.includes('important') || tag.includes('pending')
    );
    
    if (statusPatterns.length > 0) {
      suggestions.push({
        name: 'Status',
        color: '#7b1fa2',
        suggestedTags: [...new Set(statusPatterns)],
        confidence: 'medium'
      });
    }

    return suggestions;
  };

  /**
   * Perform automatic migration based on category mappings
   */
  const performAutoMigration = async (categoryMappings = {}) => {
    try {
      if (!authStore.isAuthenticated) {
        throw new Error('User not authenticated');
      }

      migrationStatus.value = 'migrating';
      migrationProgress.value = 0;
      error.value = null;

      const teamId = authStore.currentTeam;
      if (!teamId) {
        throw new Error('No team ID available');
      }

      // Fetch all evidence documents with legacy tags
      const evidenceRef = collection(db, 'teams', teamId, 'evidence');
      const evidenceQuery = query(evidenceRef, where('tags', '!=', null));
      const snapshot = await getDocs(evidenceQuery);

      const totalDocs = snapshot.docs.length;
      let migratedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < snapshot.docs.length; i++) {
        const docSnapshot = snapshot.docs[i];
        const data = docSnapshot.data();

        try {
          if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
            const structuredTags = [];

            data.tags.forEach(tagName => {
              if (typeof tagName === 'string') {
                // Find matching category
                const mapping = findCategoryMapping(tagName, categoryMappings);
                if (mapping) {
                  structuredTags.push({
                    categoryId: mapping.categoryId,
                    categoryName: mapping.categoryName,
                    tagId: crypto.randomUUID(),
                    tagName: tagName,
                    color: mapping.color
                  });
                }
              }
            });

            if (structuredTags.length > 0) {
              // Update document with structured tags and preserve legacy tags
              await updateDoc(doc(db, 'teams', teamId, 'evidence', docSnapshot.id), {
                tagsByHuman: structuredTags,
                legacyTags: data.tags, // Preserve original tags
                tagCount: structuredTags.length,
                lastTaggedAt: serverTimestamp(),
                taggedBy: 'migration',
                updatedAt: serverTimestamp()
              });
              
              migratedCount++;
            } else {
              skippedCount++;
            }
          } else {
            skippedCount++;
          }
        } catch (docError) {
          console.error(`[MigrationStore] Error migrating document ${docSnapshot.id}:`, docError);
          errorCount++;
        }

        // Update progress
        migrationProgress.value = Math.round(((i + 1) / totalDocs) * 100);
      }

      migrationResults.value = {
        ...migrationResults.value,
        totalDocuments: totalDocs,
        migratedDocuments: migratedCount,
        skippedDocuments: skippedCount,
        errorDocuments: errorCount
      };

      migrationStatus.value = 'completed';
      console.log(`[MigrationStore] Migration completed: ${migratedCount}/${totalDocs} documents migrated`);
      
      return migrationResults.value;
    } catch (err) {
      console.error('[MigrationStore] Failed to perform migration:', err);
      error.value = err.message;
      migrationStatus.value = 'error';
      throw err;
    }
  };

  /**
   * Find category mapping for a tag
   */
  const findCategoryMapping = (tagName, mappings) => {
    const lowerTag = tagName.toLowerCase();
    
    // Check exact matches first
    if (mappings[lowerTag]) {
      return mappings[lowerTag];
    }
    
    // Check pattern matches
    for (const [pattern, categoryData] of Object.entries(mappings)) {
      if (lowerTag.includes(pattern.toLowerCase()) || pattern.toLowerCase().includes(lowerTag)) {
        return categoryData;
      }
    }
    
    return null;
  };

  /**
   * Create default category mappings based on suggestions
   */
  const createDefaultMappings = (categories) => {
    const mappings = {};
    
    categories.forEach(category => {
      category.suggestedTags.forEach(tag => {
        mappings[tag] = {
          categoryId: category.id || crypto.randomUUID(),
          categoryName: category.name,
          color: category.color
        };
      });
    });
    
    return mappings;
  };

  /**
   * Rollback migration for specific documents
   */
  const rollbackMigration = async (documentIds = []) => {
    try {
      if (!authStore.isAuthenticated) {
        throw new Error('User not authenticated');
      }

      const teamId = authStore.currentTeam;
      if (!teamId) {
        throw new Error('No team ID available');
      }

      for (const docId of documentIds) {
        const docRef = doc(db, 'teams', teamId, 'evidence', docId);
        await updateDoc(docRef, {
          tagsByHuman: [],
          tagsByAI: [],
          tagCount: 0,
          lastTaggedAt: null,
          taggedBy: null,
          updatedAt: serverTimestamp()
          // Keep legacyTags intact
        });
      }

      console.log(`[MigrationStore] Rolled back ${documentIds.length} documents`);
      return true;
    } catch (err) {
      console.error('[MigrationStore] Failed to rollback migration:', err);
      throw err;
    }
  };

  /**
   * Reset store to initial state
   */
  const reset = () => {
    migrationProgress.value = 0;
    migrationStatus.value = 'idle';
    migrationResults.value = {
      totalDocuments: 0,
      migratedDocuments: 0,
      skippedDocuments: 0,
      errorDocuments: 0,
      uniqueLegacyTags: [],
      suggestedCategories: []
    };
    error.value = null;
  };

  return {
    // State
    migrationProgress,
    migrationStatus,
    migrationResults,
    error,

    // Computed
    isComplete,
    hasErrors,

    // Actions
    analyzeLegacyTags,
    performAutoMigration,
    createDefaultMappings,
    rollbackMigration,
    reset
  };
});