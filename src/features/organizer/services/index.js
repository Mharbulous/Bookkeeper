/**
 * Evidence Services Index
 * Provides consolidated access to all evidence-related services
 */
import { EvidenceService } from './evidenceService.js';
import { EvidenceQueryService } from './evidenceQueryService.js';

export { EvidenceService } from './evidenceService.js';
export { EvidenceQueryService } from './evidenceQueryService.js';

// For consumers who need both services together
export class EvidenceManager {
  constructor(teamId) {
    this.teamId = teamId;
    this.service = new EvidenceService(teamId);
    this.query = new EvidenceQueryService(teamId);
  }

  // Core operations delegated to evidenceService
  async createEvidenceFromUpload(uploadMetadata, options = {}) {
    return this.service.createEvidenceFromUpload(uploadMetadata, options);
  }

  async createEvidenceFromUploads(uploadMetadataList) {
    return this.service.createEvidenceFromUploads(uploadMetadataList);
  }

  async updateTags(evidenceId, tags) {
    return this.service.updateTags(evidenceId, tags);
  }

  async updateDisplayName(evidenceId, displayName) {
    return this.service.updateDisplayName(evidenceId, displayName);
  }

  async updateProcessingStage(evidenceId, stage, additionalData = {}) {
    return this.service.updateProcessingStage(evidenceId, stage, additionalData);
  }

  async deleteEvidence(evidenceId) {
    return this.service.deleteEvidence(evidenceId);
  }

  async getEvidence(evidenceId) {
    return this.service.getEvidence(evidenceId);
  }

  // Query operations delegated to evidenceQueryService
  async findEvidenceByHash(fileHash) {
    return this.query.findEvidenceByHash(fileHash);
  }

  async findEvidenceByTags(tags, matchAll = false) {
    return this.query.findEvidenceByTags(tags, matchAll);
  }

  async findEvidenceByProcessingStage(stage) {
    return this.query.findEvidenceByProcessingStage(stage);
  }

  async findUnprocessedEvidence() {
    return this.query.findUnprocessedEvidence();
  }

  async getAvailableOriginalNames(fileHash, matterId = 'general') {
    return this.query.getAvailableOriginalNames(fileHash, matterId);
  }

  async getEvidenceStatistics() {
    return this.query.getEvidenceStatistics();
  }

  async searchEvidenceByText(searchTerm) {
    return this.query.searchEvidenceByText(searchTerm);
  }

  async migrateUploadsToEvidence(uploadMetadataList) {
    return this.query.migrateUploadsToEvidence(uploadMetadataList);
  }

  async getAllEvidence(documentLimit = 50) {
    return this.query.getAllEvidence(documentLimit);
  }
}