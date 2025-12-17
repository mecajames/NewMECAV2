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

  const response = await fetch(`${API_BASE}/departments?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch departments');
  return response.json();
}

export async function listPublicDepartments(): Promise<TicketDepartmentResponse[]> {
  const response = await fetch(`${API_BASE}/departments/public`);
  if (!response.ok) throw new Error('Failed to fetch public departments');
  return response.json();
}

export async function getDepartment(id: string): Promise<TicketDepartmentResponse> {
  const response = await fetch(`${API_BASE}/departments/${id}`);
  if (!response.ok) throw new Error('Failed to fetch department');
  return response.json();
}

export async function createDepartment(data: CreateTicketDepartmentDto): Promise<TicketDepartmentResponse> {
  const response = await fetch(`${API_BASE}/departments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create department');
  return response.json();
}

export async function updateDepartment(id: string, data: UpdateTicketDepartmentDto): Promise<TicketDepartmentResponse> {
  const response = await fetch(`${API_BASE}/departments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update department');
  return response.json();
}

export async function deleteDepartment(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/departments/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete department');
}

// ==========================================================================
// Staff API
// ==========================================================================

export async function listStaff(includeInactive = false): Promise<TicketStaffResponse[]> {
  const params = new URLSearchParams();
  if (includeInactive) params.append('include_inactive', 'true');

  const response = await fetch(`${API_BASE}/staff?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch staff');
  return response.json();
}

export async function getStaff(id: string): Promise<TicketStaffResponse> {
  const response = await fetch(`${API_BASE}/staff/${id}`);
  if (!response.ok) throw new Error('Failed to fetch staff member');
  return response.json();
}

export async function getStaffByProfile(profileId: string): Promise<TicketStaffResponse | { is_staff: false }> {
  const response = await fetch(`${API_BASE}/staff/by-profile/${profileId}`);
  if (!response.ok) throw new Error('Failed to fetch staff by profile');
  return response.json();
}

export async function checkIsStaff(profileId: string): Promise<{ is_staff: boolean; permission_level: number }> {
  const response = await fetch(`${API_BASE}/staff/check/${profileId}`);
  if (!response.ok) throw new Error('Failed to check staff status');
  return response.json();
}

export async function createStaff(data: CreateTicketStaffDto): Promise<TicketStaffResponse> {
  const response = await fetch(`${API_BASE}/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create staff member');
  return response.json();
}

export async function updateStaff(id: string, data: UpdateTicketStaffDto): Promise<TicketStaffResponse> {
  const response = await fetch(`${API_BASE}/staff/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update staff member');
  return response.json();
}

export async function deleteStaff(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/staff/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete staff member');
}

// Staff-Department Assignment
export async function assignStaffToDepartments(staffId: string, departmentIds: string[]): Promise<TicketStaffResponse> {
  const response = await fetch(`${API_BASE}/staff/${staffId}/departments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ department_ids: departmentIds }),
  });
  if (!response.ok) throw new Error('Failed to assign staff to departments');
  return response.json();
}

export async function removeStaffFromDepartment(staffId: string, departmentId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/staff/${staffId}/departments/${departmentId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to remove staff from department');
}

export async function setDepartmentHead(staffId: string, departmentId: string, isHead: boolean): Promise<TicketStaffResponse> {
  const response = await fetch(`${API_BASE}/staff/${staffId}/departments/${departmentId}/head`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_department_head: isHead }),
  });
  if (!response.ok) throw new Error('Failed to set department head');
  return response.json();
}

export async function getStaffForDepartment(departmentId: string): Promise<TicketStaffResponse[]> {
  const response = await fetch(`${API_BASE}/departments/${departmentId}/staff`);
  if (!response.ok) throw new Error('Failed to fetch department staff');
  return response.json();
}

// ==========================================================================
// Routing Rules API
// ==========================================================================

export async function listRoutingRules(includeInactive = false): Promise<TicketRoutingRuleResponse[]> {
  const params = new URLSearchParams();
  if (includeInactive) params.append('include_inactive', 'true');

  const response = await fetch(`${API_BASE}/routing-rules?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch routing rules');
  return response.json();
}

export async function getRoutingRule(id: string): Promise<TicketRoutingRuleResponse> {
  const response = await fetch(`${API_BASE}/routing-rules/${id}`);
  if (!response.ok) throw new Error('Failed to fetch routing rule');
  return response.json();
}

export async function createRoutingRule(data: CreateTicketRoutingRuleDto): Promise<TicketRoutingRuleResponse> {
  const response = await fetch(`${API_BASE}/routing-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create routing rule');
  return response.json();
}

export async function updateRoutingRule(id: string, data: UpdateTicketRoutingRuleDto): Promise<TicketRoutingRuleResponse> {
  const response = await fetch(`${API_BASE}/routing-rules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update routing rule');
  return response.json();
}

export async function deleteRoutingRule(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/routing-rules/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete routing rule');
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
  const response = await fetch(`${API_BASE}/routing-rules/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to test routing');
  return response.json();
}

// ==========================================================================
// Settings API
// ==========================================================================

export async function listSettings(): Promise<TicketSettingResponse[]> {
  const response = await fetch(`${API_BASE}/settings`);
  if (!response.ok) throw new Error('Failed to fetch settings');
  return response.json();
}

export async function getSettingsMap(): Promise<TicketSettingsMap> {
  const response = await fetch(`${API_BASE}/settings/map`);
  if (!response.ok) throw new Error('Failed to fetch settings map');
  return response.json();
}

export async function getSetting(key: string): Promise<TicketSettingResponse> {
  const response = await fetch(`${API_BASE}/settings/${key}`);
  if (!response.ok) throw new Error('Failed to fetch setting');
  return response.json();
}

export async function updateSetting(key: string, value: string, type?: string, description?: string): Promise<TicketSettingResponse> {
  const response = await fetch(`${API_BASE}/settings/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value, type, description }),
  });
  if (!response.ok) throw new Error('Failed to update setting');
  return response.json();
}
