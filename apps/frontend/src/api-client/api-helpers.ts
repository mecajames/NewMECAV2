/**
 * API Helper Utilities
 *
 * Common utilities for API client files
 */

const SESSION_STORAGE_KEY = 'meca_session';

/**
 * Get authenticated headers including JWT token
 * Returns headers object with Authorization if user is authenticated
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Get session from localStorage (stored by AuthContext)
  const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);

  if (storedSession) {
    try {
      const session = JSON.parse(storedSession);
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.error('Error parsing session from localStorage:', error);
    }
  }

  return headers;
}

/**
 * Make authenticated GET request
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = await getAuthHeaders();

  return fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  });
}
