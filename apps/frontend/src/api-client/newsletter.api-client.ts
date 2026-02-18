import axios from '@/lib/axios';

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
    const response = await axios.post(`/api/newsletter/signup`, data);
    return response.data;
  },
};
