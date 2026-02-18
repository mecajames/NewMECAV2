import axios from '@/lib/axios';

// ==========================================
// Types
// ==========================================

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  recaptcha_token: string;
}

export interface ContactFormResponse {
  success: boolean;
  message: string;
}

// ==========================================
// API Client
// ==========================================

export const contactApi = {
  /**
   * Submit a contact form
   */
  submit: async (data: ContactFormData): Promise<ContactFormResponse> => {
    const response = await axios.post('/api/contact', data);
    return response.data;
  },
};
