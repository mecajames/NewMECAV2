import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export interface NewsletterSignupDto {
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface NewsletterSignupResponse {
  success: boolean;
  message: string;
}

export const newsletterApi = {
  /**
   * Subscribe to the newsletter
   */
  signup: async (data: NewsletterSignupDto): Promise<NewsletterSignupResponse> => {
    const response = await axios.post(`${API_URL}/api/newsletter/signup`, data);
    return response.data;
  },
};
