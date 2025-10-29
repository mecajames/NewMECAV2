/**
 * Auth API Client
 *
 * Centralized authentication functions.
 * All auth operations go through backend API instead of direct Supabase.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface User {
  id: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: User;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: string | null;
}

export const authApi = {
  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { user: null, session: null, error: error.message || 'Sign in failed' };
      }

      const data = await response.json();
      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      return { user: null, session: null, error: (error as Error).message };
    }
  },

  /**
   * Sign up new user
   */
  signUp: async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { user: null, session: null, error: error.message || 'Sign up failed' };
      }

      const data = await response.json();
      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      return { user: null, session: null, error: (error as Error).message };
    }
  },

  /**
   * Sign out current user
   */
  signOut: async (): Promise<{ error: string | null }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: error.message || 'Sign out failed' };
      }

      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },

  /**
   * Get current session
   */
  getSession: async (accessToken: string): Promise<{ user: User | null; error: string | null }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        return { user: null, error: 'Session invalid' };
      }

      const data = await response.json();
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: (error as Error).message };
    }
  },

  /**
   * Update password
   */
  updatePassword: async (
    accessToken: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ error: string | null }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: error.message || 'Password update failed' };
      }

      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },

  /**
   * Request password reset email
   */
  resetPassword: async (email: string): Promise<{ error: string | null }> => {
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;

      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: error.message || 'Password reset failed' };
      }

      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },

  /**
   * Verify access token
   */
  verifyToken: async (accessToken: string): Promise<{ valid: boolean; user: User | null }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        return { valid: false, user: null };
      }

      const data = await response.json();
      return { valid: data.valid, user: data.user };
    } catch (error) {
      return { valid: false, user: null };
    }
  },
};
