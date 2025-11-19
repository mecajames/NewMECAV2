import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';

interface RecaptchaVerificationResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  score?: number;
  action?: string;
  'error-codes'?: string[];
}

@Injectable()
export class RecaptchaService {
  private readonly secretKey: string;
  private readonly verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
  private readonly minScore = 0.5; // Minimum score for v3 (0.0 to 1.0)

  constructor() {
    this.secretKey = process.env.RECAPTCHA_SECRET_KEY || '';
    if (!this.secretKey) {
      console.warn('WARNING: RECAPTCHA_SECRET_KEY is not set in environment variables');
    }
  }

  /**
   * Verify a reCAPTCHA token (v2 or v3)
   * @param token - The reCAPTCHA token from the frontend
   * @param expectedAction - Optional: The expected action name for v3 validation
   * @returns Promise<boolean> - True if verification passes
   */
  async verifyToken(token: string, expectedAction?: string): Promise<boolean> {
    if (!token) {
      throw new BadRequestException('reCAPTCHA token is required');
    }

    if (!this.secretKey) {
      console.warn('reCAPTCHA verification skipped - no secret key configured');
      // In development, you might want to return true to allow testing
      // In production, this should throw an error
      return process.env.NODE_ENV === 'development';
    }

    try {
      const response = await axios.post<RecaptchaVerificationResponse>(
        this.verifyUrl,
        null,
        {
          params: {
            secret: this.secretKey,
            response: token,
          },
        }
      );

      const { success, score, action, 'error-codes': errorCodes } = response.data;

      // Log for debugging (remove in production or use proper logging)
      console.log('reCAPTCHA verification result:', {
        success,
        score,
        action,
        errorCodes,
      });

      if (!success) {
        console.error('reCAPTCHA verification failed:', errorCodes);
        throw new BadRequestException('reCAPTCHA verification failed');
      }

      // For v3, check the score (v2 doesn't have a score)
      if (score !== undefined && score < this.minScore) {
        console.warn(`reCAPTCHA score too low: ${score} < ${this.minScore}`);
        throw new BadRequestException('reCAPTCHA verification failed: score too low');
      }

      // Optionally validate the action matches what we expect (v3 only)
      if (expectedAction && action !== expectedAction) {
        console.warn(`reCAPTCHA action mismatch: expected "${expectedAction}", got "${action}"`);
        throw new BadRequestException('reCAPTCHA verification failed: action mismatch');
      }

      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('reCAPTCHA API error:', error.message);
        throw new BadRequestException('Failed to verify reCAPTCHA');
      }
      throw error;
    }
  }

  /**
   * Verify reCAPTCHA token with a specific action
   * @param token - The reCAPTCHA token from the frontend
   * @param action - The action name to validate
   */
  async verifyWithAction(token: string, action: string): Promise<boolean> {
    return this.verifyToken(token, action);
  }
}
