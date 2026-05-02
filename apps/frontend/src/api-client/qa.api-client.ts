import axios from '@/lib/axios';
import { uploadFile } from './uploads.api-client';

// =============================================================================
// SCREENSHOT UPLOAD
// =============================================================================

export async function uploadQaScreenshot(file: File): Promise<string> {
  const result = await uploadFile(file, 'qa-screenshots');
  return result.publicUrl;
}

// =============================================================================
// DASHBOARD
// =============================================================================

export async function getDashboard() {
  const response = await axios.get('/api/qa/dashboard');
  return response.data;
}

// =============================================================================
// ROUNDS
// =============================================================================

export async function listRounds() {
  const response = await axios.get('/api/qa/rounds');
  return response.data;
}

export async function createRound(data: { title: string; description?: string }) {
  const response = await axios.post('/api/qa/rounds', data);
  return response.data;
}

export async function createRoundFromPrevious(previousRoundId: string, data: { title: string }) {
  const response = await axios.post(`/api/qa/rounds/from-previous/${previousRoundId}`, data);
  return response.data;
}

export async function getRound(id: string) {
  const response = await axios.get(`/api/qa/rounds/${id}`);
  return response.data;
}

export async function activateRound(id: string) {
  const response = await axios.post(`/api/qa/rounds/${id}/activate`);
  return response.data;
}

export async function completeRound(id: string) {
  const response = await axios.post(`/api/qa/rounds/${id}/complete`);
  return response.data;
}

export async function updateRound(id: string, data: { title?: string; description?: string | null }) {
  const response = await axios.put(`/api/qa/rounds/${id}`, data);
  return response.data;
}

export async function suspendRound(id: string) {
  const response = await axios.post(`/api/qa/rounds/${id}/suspend`);
  return response.data;
}

export async function resumeRound(id: string) {
  const response = await axios.post(`/api/qa/rounds/${id}/resume`);
  return response.data;
}

export async function deleteRound(id: string) {
  const response = await axios.delete(`/api/qa/rounds/${id}`);
  return response.data;
}

export async function getFailedItems(roundId: string) {
  const response = await axios.get(`/api/qa/rounds/${roundId}/failed-items`);
  return response.data;
}

// =============================================================================
// ASSIGNMENTS
// =============================================================================

export async function assignReviewers(roundId: string, profileIds: string[]) {
  const response = await axios.post(`/api/qa/rounds/${roundId}/assignments`, { profileIds });
  return response.data;
}

export async function removeAssignment(assignmentId: string) {
  await axios.delete(`/api/qa/assignments/${assignmentId}`);
}

export async function getMyAssignments() {
  const response = await axios.get('/api/qa/assignments/mine');
  return response.data;
}

export async function getAssignment(assignmentId: string) {
  const response = await axios.get(`/api/qa/assignments/${assignmentId}`);
  return response.data;
}

// =============================================================================
// RESPONSES
// =============================================================================

export async function submitResponse(
  assignmentId: string,
  itemId: string,
  data: { status: string; comment?: string; pageUrl?: string; screenshotUrl?: string },
) {
  const response = await axios.put(`/api/qa/assignments/${assignmentId}/responses/${itemId}`, data);
  return response.data;
}

// =============================================================================
// DEVELOPER FIXES
// =============================================================================

export async function submitFix(responseId: string, data: { fixNotes: string; status: string }) {
  const response = await axios.post(`/api/qa/responses/${responseId}/fix`, data);
  return response.data;
}

// =============================================================================
// ADMIN USERS
// =============================================================================

export async function getAdminUsers() {
  const response = await axios.get('/api/qa/admin-users');
  return response.data;
}

// =============================================================================
// EXPORT
// =============================================================================

export const qaApi = {
  uploadQaScreenshot,
  getDashboard,
  listRounds,
  createRound,
  createRoundFromPrevious,
  getRound,
  activateRound,
  completeRound,
  updateRound,
  suspendRound,
  resumeRound,
  deleteRound,
  getFailedItems,
  assignReviewers,
  removeAssignment,
  getMyAssignments,
  getAssignment,
  submitResponse,
  submitFix,
  getAdminUsers,
};
