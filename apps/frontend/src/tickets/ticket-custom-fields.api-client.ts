import axios from '@/lib/axios';
import {
  TicketCustomField,
  CreateTicketCustomFieldDto,
  UpdateTicketCustomFieldDto,
  TicketPurchase,
} from '@newmeca/shared';

const API_BASE = '/api/tickets/admin';

// The logged-in member's purchases (for the purchase_reference field).
export async function getMyPurchases(): Promise<TicketPurchase[]> {
  const { data } = await axios.get('/api/tickets/my-purchases');
  return data;
}

// Public — staff list for the staff_reference field.
export async function listStaffForPicker(): Promise<{ id: string; name: string }[]> {
  const { data } = await axios.get(`${API_BASE}/staff/public`);
  return data;
}

// Admin — issue a gateway refund (full or partial) for a non-membership
// purchase straight from a ticket.
export async function refundTicketPurchase(body: {
  type: 'shop' | 'event_registration' | 'world_finals';
  id: string;
  amountCents?: number;
  reason: string;
}): Promise<{ success: boolean; message: string }> {
  const { data } = await axios.post(`${API_BASE}/refund-purchase`, body);
  return data;
}

// Public — used by the member + guest ticket forms to render the fields that
// apply to the chosen category (active + visible only).
export async function listCustomFieldsForCategory(category: string): Promise<TicketCustomField[]> {
  const { data } = await axios.get(`${API_BASE}/custom-fields/public`, { params: { category } });
  return data;
}

// Admin — full list of field definitions.
export async function listCustomFields(): Promise<TicketCustomField[]> {
  const { data } = await axios.get(`${API_BASE}/custom-fields`);
  return data;
}

export async function createCustomField(dto: CreateTicketCustomFieldDto): Promise<TicketCustomField> {
  const { data } = await axios.post(`${API_BASE}/custom-fields`, dto);
  return data;
}

export async function updateCustomField(id: string, dto: UpdateTicketCustomFieldDto): Promise<TicketCustomField> {
  const { data } = await axios.put(`${API_BASE}/custom-fields/${id}`, dto);
  return data;
}

export async function deleteCustomField(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/custom-fields/${id}`);
}
