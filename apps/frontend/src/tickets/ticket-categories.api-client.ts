import axios from '@/lib/axios';
import {
  TicketCategoryConfig,
  CreateTicketCategoryDto,
  UpdateTicketCategoryDto,
} from '@newmeca/shared';
import { TicketFormViewer } from './ticket-admin.api-client';

const API_BASE = '/api/tickets/admin';

// Public — drives the form's Category dropdown for a chosen department, filtered
// by the viewer's audience/role.
export async function listCategoriesForDepartment(
  departmentId?: string,
  viewer?: TicketFormViewer,
): Promise<TicketCategoryConfig[]> {
  const params: Record<string, string> = {};
  if (departmentId) params.department_id = departmentId;
  if (viewer) {
    params.audience = viewer.audience;
    if (viewer.roles?.length) params.roles = viewer.roles.join(',');
  }
  const { data } = await axios.get(`${API_BASE}/categories/public`, { params });
  return data;
}

// Admin — all categories.
export async function listCategories(): Promise<TicketCategoryConfig[]> {
  const { data } = await axios.get(`${API_BASE}/categories`);
  return data;
}

export async function createCategory(dto: CreateTicketCategoryDto): Promise<TicketCategoryConfig> {
  const { data } = await axios.post(`${API_BASE}/categories`, dto);
  return data;
}

export async function updateCategory(id: string, dto: UpdateTicketCategoryDto): Promise<TicketCategoryConfig> {
  const { data } = await axios.put(`${API_BASE}/categories/${id}`, dto);
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/categories/${id}`);
}
