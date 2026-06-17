import axios from '@/lib/axios';
import {
  TicketCategoryConfig,
  CreateTicketCategoryDto,
  UpdateTicketCategoryDto,
} from '@newmeca/shared';

const API_BASE = '/api/tickets/admin';

// Public — drives the form's Category dropdown for a chosen department.
export async function listCategoriesForDepartment(departmentId?: string): Promise<TicketCategoryConfig[]> {
  const { data } = await axios.get(`${API_BASE}/categories/public`, {
    params: departmentId ? { department_id: departmentId } : {},
  });
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
