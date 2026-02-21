import axios from '@/lib/axios';
import type {
  CreateVotingSessionDto,
  UpdateVotingSessionDto,
  CreateVotingCategoryDto,
  UpdateVotingCategoryDto,
  CreateVotingQuestionDto,
  UpdateVotingQuestionDto,
  SubmitResponsesDto,
  CloneSessionDto,
  VotingSessionResults,
  VotingPublicStatus,
  EntitySearchResult,
} from '@newmeca/shared';
import { uploadFile } from './uploads.api-client';

// =============================================================================
// IMAGE UPLOAD
// =============================================================================

export async function uploadVotingItemImage(file: File): Promise<string> {
  const result = await uploadFile(file, 'voting-item-images');
  return result.publicUrl;
}

// =============================================================================
// ADMIN: Sessions
// =============================================================================

export async function getAdminSessions() {
  const response = await axios.get('/api/finals-voting/admin/sessions');
  return response.data;
}

export async function getAdminSession(id: string) {
  const response = await axios.get(`/api/finals-voting/admin/sessions/${id}`);
  return response.data;
}

export async function createSession(dto: CreateVotingSessionDto) {
  const response = await axios.post('/api/finals-voting/admin/sessions', dto);
  return response.data;
}

export async function updateSession(id: string, dto: UpdateVotingSessionDto) {
  const response = await axios.put(`/api/finals-voting/admin/sessions/${id}`, dto);
  return response.data;
}

export async function deleteSession(id: string): Promise<void> {
  await axios.delete(`/api/finals-voting/admin/sessions/${id}`);
}

export async function openSession(id: string) {
  const response = await axios.post(`/api/finals-voting/admin/sessions/${id}/open`);
  return response.data;
}

export async function closeSession(id: string) {
  const response = await axios.post(`/api/finals-voting/admin/sessions/${id}/close`);
  return response.data;
}

export async function finalizeSession(id: string) {
  const response = await axios.post(`/api/finals-voting/admin/sessions/${id}/finalize`);
  return response.data;
}

export async function getAdminResults(id: string): Promise<VotingSessionResults> {
  const response = await axios.get(`/api/finals-voting/admin/sessions/${id}/results`);
  return response.data;
}

// =============================================================================
// ADMIN: Categories
// =============================================================================

export async function createCategory(dto: CreateVotingCategoryDto) {
  const response = await axios.post('/api/finals-voting/admin/categories', dto);
  return response.data;
}

export async function updateCategory(id: string, dto: UpdateVotingCategoryDto) {
  const response = await axios.put(`/api/finals-voting/admin/categories/${id}`, dto);
  return response.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await axios.delete(`/api/finals-voting/admin/categories/${id}`);
}

// =============================================================================
// ADMIN: Questions
// =============================================================================

export async function createQuestion(dto: CreateVotingQuestionDto) {
  const response = await axios.post('/api/finals-voting/admin/questions', dto);
  return response.data;
}

export async function updateQuestion(id: string, dto: UpdateVotingQuestionDto) {
  const response = await axios.put(`/api/finals-voting/admin/questions/${id}`, dto);
  return response.data;
}

export async function deleteQuestion(id: string): Promise<void> {
  await axios.delete(`/api/finals-voting/admin/questions/${id}`);
}

// =============================================================================
// MEMBER: Voting
// =============================================================================

export async function getActiveSession() {
  const response = await axios.get('/api/finals-voting/sessions/active');
  return response.data;
}

export async function submitResponses(sessionId: string, dto: SubmitResponsesDto) {
  const response = await axios.post(`/api/finals-voting/sessions/${sessionId}/respond`, dto);
  return response.data;
}

export async function getMyResponses(sessionId: string) {
  const response = await axios.get(`/api/finals-voting/sessions/${sessionId}/my-responses`);
  return response.data;
}

// =============================================================================
// ENTITY SEARCH (for voting questions)
// =============================================================================

export async function entitySearch(type: string, query: string, sessionId: string, limit = 20): Promise<EntitySearchResult[]> {
  const response = await axios.get('/api/finals-voting/entity-search', {
    params: { type, q: query, session_id: sessionId, limit },
  });
  return response.data;
}

// =============================================================================
// ADMIN: Preview
// =============================================================================

export async function getSessionPreview(sessionId: string) {
  const response = await axios.get(`/api/finals-voting/admin/sessions/${sessionId}/preview`);
  return response.data;
}

// =============================================================================
// ADMIN: Clone & Seed
// =============================================================================

export async function cloneSession(sourceId: string, dto: CloneSessionDto) {
  const response = await axios.post(`/api/finals-voting/admin/sessions/${sourceId}/clone`, dto);
  return response.data;
}

export async function seedTemplate(sessionId: string, templateName: string) {
  const response = await axios.post(`/api/finals-voting/admin/sessions/${sessionId}/seed-template`, { template_name: templateName });
  return response.data;
}

// =============================================================================
// PUBLIC
// =============================================================================

export async function getVotingStatus(): Promise<VotingPublicStatus> {
  const response = await axios.get('/api/finals-voting/status');
  return response.data;
}

export async function getPublicResults(sessionId: string): Promise<VotingSessionResults> {
  const response = await axios.get(`/api/finals-voting/results/${sessionId}`);
  return response.data;
}

// Export as object for consistent API pattern
export const finalsVotingApi = {
  // Image Upload
  uploadVotingItemImage,

  // Admin: Sessions
  getAdminSessions,
  getAdminSession,
  createSession,
  updateSession,
  deleteSession,
  openSession,
  closeSession,
  finalizeSession,
  getAdminResults,

  // Admin: Categories
  createCategory,
  updateCategory,
  deleteCategory,

  // Admin: Questions
  createQuestion,
  updateQuestion,
  deleteQuestion,

  // Member: Voting
  getActiveSession,
  submitResponses,
  getMyResponses,
  entitySearch,

  // Admin: Preview
  getSessionPreview,

  // Admin: Clone & Seed
  cloneSession,
  seedTemplate,

  // Public
  getVotingStatus,
  getPublicResults,
};
