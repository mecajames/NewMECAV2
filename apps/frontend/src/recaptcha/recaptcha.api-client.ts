import axios from '@/lib/axios';

export interface RecaptchaVerifyRequest {
  token: string;
  action?: string;
}

export interface RecaptchaVerifyResponse {
  success: boolean;
  message: string;
}

export const recaptchaApi = {
  /**
   * Verify a reCAPTCHA token with the backend
   * @param token - The reCAPTCHA token obtained from grecaptcha.execute()
   * @param action - Optional action name for additional validation
   * @returns Promise with verification result
   */
  verify: async (token: string, action?: string): Promise<RecaptchaVerifyResponse> => {
    const response = await axios.post('/api/recaptcha/verify', { token, action });
    return response.data;
  },
};
