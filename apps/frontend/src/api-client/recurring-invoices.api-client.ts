import axios from '@/lib/axios';

export type RecurringFrequency = 'monthly' | 'quarterly' | 'annual';

export interface RecurringLineItem {
  description: string;
  quantity: number;
  unitPrice: string;
  itemType: string;
  referenceId?: string;
}

export interface RecurringInvoiceTemplate {
  id: string;
  user?: { id: string; email: string; first_name?: string; last_name?: string; meca_id?: string };
  name: string;
  lineItems: RecurringLineItem[];
  billingAddress?: {
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  tax: string;
  discount: string;
  couponCode?: string;
  currency: string;
  notes?: string;
  frequency: RecurringFrequency;
  nextRunDate: string;
  lastRunAt?: string;
  lastInvoice?: { id: string; invoiceNumber: string };
  runCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringTemplateDto {
  userId?: string;
  name: string;
  lineItems: RecurringLineItem[];
  billingAddress?: RecurringInvoiceTemplate['billingAddress'];
  tax?: string;
  discount?: string;
  couponCode?: string;
  currency?: string;
  notes?: string;
  frequency: RecurringFrequency;
  nextRunDate: string;
  active?: boolean;
}

export const recurringInvoicesApi = {
  list: async (): Promise<RecurringInvoiceTemplate[]> => {
    const r = await axios.get('/api/recurring-invoices');
    return r.data;
  },
  get: async (id: string): Promise<RecurringInvoiceTemplate> => {
    const r = await axios.get(`/api/recurring-invoices/${id}`);
    return r.data;
  },
  create: async (data: CreateRecurringTemplateDto): Promise<RecurringInvoiceTemplate> => {
    const r = await axios.post('/api/recurring-invoices', data);
    return r.data;
  },
  update: async (id: string, data: Partial<CreateRecurringTemplateDto>): Promise<RecurringInvoiceTemplate> => {
    const r = await axios.put(`/api/recurring-invoices/${id}`, data);
    return r.data;
  },
  activate: async (id: string): Promise<RecurringInvoiceTemplate> => {
    const r = await axios.post(`/api/recurring-invoices/${id}/activate`);
    return r.data;
  },
  deactivate: async (id: string): Promise<RecurringInvoiceTemplate> => {
    const r = await axios.post(`/api/recurring-invoices/${id}/deactivate`);
    return r.data;
  },
  remove: async (id: string): Promise<void> => {
    await axios.delete(`/api/recurring-invoices/${id}`);
  },
  runDue: async (): Promise<{ generated: number; failed: number }> => {
    const r = await axios.post('/api/recurring-invoices/run');
    return r.data;
  },
};
