import axios from '@/lib/axios';
import {
  CreateTicketDepartmentDto,
  UpdateTicketDepartmentDto,
  CreateTicketStaffDto,
  UpdateTicketStaffDto,
  CreateTicketRoutingRuleDto,
  UpdateTicketRoutingRuleDto,
  TicketDepartmentResponse,
  TicketStaffResponse,
  TicketRoutingRuleResponse,
  TicketSettingResponse,
  TicketSettingsMap,
} from '@newmeca/shared';

const API_BASE = '/api/tickets/admin';

// ==========================================================================
// Department API
// ==========================================================================

export async function listDepartments(includeInactive = false): Promise<TicketDepartmentResponse[]> {
  const params = new URLSearchParams();
  if (includeInactive) params.append('include_inactive', 'true');

  const { data } = await axios.get(`${API_BASE}/departments?${params.toString()}`);
  return data;
}

export async function listPublicDepartments(): Promise<TicketDepartmentResponse[]> {
  const { data } = await axios.get(`${API_BASE}/departments/public`);
  return data;
}

export async function getDepartment(id: string): Promise<TicketDepartmentResponse> {
  const { data } = await axios.get(`${API_BASE}/departments/${id}`);
  return data;
}

export async function createDepartment(data: CreateTicketDepartmentDto): Promise<TicketDepartmentResponse> {
  const { data: result } = await axios.post(`${API_BASE}/departments`, data);
  return result;
}

export async function updateDepartment(id: string, data: UpdateTicketDepartmentDto): Promise<TicketDepartmentResponse> {
  const { data: result } = await axios.put(`${API_BASE}/departments/${id}`, data);
  return result;
}

export async function deleteDepartment(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/departments/${id}`);
}

// ==========================================================================
// Staff API
// ==========================================================================

export async function listStaff(includeInactive = false): Promise<TicketStaffResponse[]> {
  const params = new URLSearchParams();
  if (includeInactive) params.append('include_inactive', 'true');

  const { data } = await axios.get(`${API_BASE}/staff?${params.toString()}`);
  return data;
}

// Per-agent rating rollup for the admin Staff → Ratings tab.
export interface StaffRatingSummary {
  profile_id: string;
  full_name: string;
  email: string;
  rating_count: number;
  average_rating: number;
  five_star: number;
  one_star: number;
  recent: Array<{
    ticket_id: string;
    ticket_number: string;
    title: string;
    rating: number;
    feedback: string | null;
    closed_at: string | null;
  }>;
}

export async function listStaffRatings(): Promise<StaffRatingSummary[]> {
  const { data } = await axios.get(`${API_BASE}/staff/ratings`);
  return data;
}

export async function getStaff(id: string): Promise<TicketStaffResponse> {
  const { data } = await axios.get(`${API_BASE}/staff/${id}`);
  return data;
}

export async function getStaffByProfile(profileId: string): Promise<TicketStaffResponse | { is_staff: false }> {
  const { data } = await axios.get(`${API_BASE}/staff/by-profile/${profileId}`);
  return data;
}

export async function checkIsStaff(profileId: string): Promise<{ is_staff: boolean; permission_level: number }> {
  const { data } = await axios.get(`${API_BASE}/staff/check/${profileId}`);
  return data;
}

export async function createStaff(data: CreateTicketStaffDto): Promise<TicketStaffResponse> {
  const { data: result } = await axios.post(`${API_BASE}/staff`, data);
  return result;
}

export async function updateStaff(id: string, data: UpdateTicketStaffDto): Promise<TicketStaffResponse> {
  const { data: result } = await axios.put(`${API_BASE}/staff/${id}`, data);
  return result;
}

export async function deleteStaff(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/staff/${id}`);
}

// Staff-Department Assignment
export async function assignStaffToDepartments(staffId: string, departmentIds: string[]): Promise<TicketStaffResponse> {
  const { data } = await axios.post(`${API_BASE}/staff/${staffId}/departments`, { department_ids: departmentIds });
  return data;
}

export async function removeStaffFromDepartment(staffId: string, departmentId: string): Promise<void> {
  await axios.delete(`${API_BASE}/staff/${staffId}/departments/${departmentId}`);
}

export async function setDepartmentHead(staffId: string, departmentId: string, isHead: boolean): Promise<TicketStaffResponse> {
  const { data } = await axios.put(`${API_BASE}/staff/${staffId}/departments/${departmentId}/head`, { is_department_head: isHead });
  return data;
}

export async function getStaffForDepartment(departmentId: string): Promise<TicketStaffResponse[]> {
  const { data } = await axios.get(`${API_BASE}/departments/${departmentId}/staff`);
  return data;
}

// ==========================================================================
// Routing Rules API
// ==========================================================================

export async function listRoutingRules(includeInactive = false): Promise<TicketRoutingRuleResponse[]> {
  const params = new URLSearchParams();
  if (includeInactive) params.append('include_inactive', 'true');

  const { data } = await axios.get(`${API_BASE}/routing-rules?${params.toString()}`);
  return data;
}

export async function getRoutingRule(id: string): Promise<TicketRoutingRuleResponse> {
  const { data } = await axios.get(`${API_BASE}/routing-rules/${id}`);
  return data;
}

export async function createRoutingRule(data: CreateTicketRoutingRuleDto): Promise<TicketRoutingRuleResponse> {
  const { data: result } = await axios.post(`${API_BASE}/routing-rules`, data);
  return result;
}

export async function updateRoutingRule(id: string, data: UpdateTicketRoutingRuleDto): Promise<TicketRoutingRuleResponse> {
  const { data: result } = await axios.put(`${API_BASE}/routing-rules/${id}`, data);
  return result;
}

export async function deleteRoutingRule(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/routing-rules/${id}`);
}

export interface TestRoutingResult {
  matched: boolean;
  rule_name?: string;
  department_id?: string;
  staff_id?: string;
  priority?: string;
}

export async function testRouting(data: {
  title: string;
  description: string;
  category: string;
  user_membership_status?: string;
}): Promise<TestRoutingResult> {
  const { data: result } = await axios.post(`${API_BASE}/routing-rules/test`, data);
  return result;
}

// ==========================================================================
// Settings API
// ==========================================================================

export async function listSettings(): Promise<TicketSettingResponse[]> {
  const { data } = await axios.get(`${API_BASE}/settings`);
  return data;
}

export async function getSettingsMap(): Promise<TicketSettingsMap> {
  const { data } = await axios.get(`${API_BASE}/settings/map`);
  return data;
}

export async function getSetting(key: string): Promise<TicketSettingResponse> {
  const { data } = await axios.get(`${API_BASE}/settings/${key}`);
  return data;
}

export async function updateSetting(key: string, value: string, type?: string, description?: string): Promise<TicketSettingResponse> {
  const { data } = await axios.put(`${API_BASE}/settings/${key}`, { value, type, description });
  return data;
}
