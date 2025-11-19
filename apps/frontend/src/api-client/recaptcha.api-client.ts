const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
    const response = await fetch(`${API_BASE_URL}/api/recaptcha/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, action }),
    });

    if (!response.ok) {
      throw new Error('Failed to verify reCAPTCHA');
    }

    return response.json();
  },
};
