import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, User, Session } from '../api-client/auth.api-client';
import { profilesApi } from '../api-client/profiles.api-client';

// Profile interface (matches backend)
export interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  meca_id?: number;
  role?: string;
  membership_status?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'meca_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from API
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const profileData = await profilesApi.getProfile(userId);

      // Add computed full_name field for backward compatibility
      if (profileData) {
        (profileData as any).full_name = `${(profileData as any).first_name || ''} ${(profileData as any).last_name || ''}`.trim();
      }

      return profileData as Profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  // Save session to localStorage
  const saveSession = (sessionData: Session | null) => {
    if (sessionData) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      setSession(sessionData);
      setUser(sessionData.user);
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  };

  // Load session from localStorage and verify it
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);

        if (storedSession) {
          const sessionData: Session = JSON.parse(storedSession);

          // Verify session is still valid
          const { valid, user: verifiedUser } = await authApi.verifyToken(sessionData.access_token);

          if (valid && verifiedUser) {
            setSession(sessionData);
            setUser(verifiedUser);

            // Load profile
            const profileData = await fetchProfile(verifiedUser.id);
            setProfile(profileData);
          } else {
            // Session invalid, clear it
            localStorage.removeItem(SESSION_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Error loading session:', error);
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { user: signedInUser, session: signedInSession, error } = await authApi.signIn(email, password);

    if (error || !signedInUser || !signedInSession) {
      return { error: error || 'Sign in failed' };
    }

    // Save session
    saveSession(signedInSession);

    // Load profile
    const profileData = await fetchProfile(signedInUser.id);
    setProfile(profileData);

    return { error: null };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const { user: signedUpUser, session: signedUpSession, error } = await authApi.signUp(
      email,
      password,
      firstName,
      lastName,
    );

    if (error || !signedUpUser) {
      return { error: error || 'Sign up failed' };
    }

    // Save session if provided
    if (signedUpSession) {
      saveSession(signedUpSession);

      // Load profile
      const profileData = await fetchProfile(signedUpUser.id);
      setProfile(profileData);
    }

    return { error: null };
  };

  const signOut = async () => {
    await authApi.signOut();
    saveSession(null);
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!session?.access_token) {
      return { error: { message: 'No user logged in' } };
    }

    // Verify current password by attempting to sign in
    if (user?.email) {
      const { error: signInError } = await authApi.signIn(user.email, currentPassword);

      if (signInError) {
        return { error: { message: 'Current password is incorrect' } };
      }
    }

    // Update to new password
    const { error } = await authApi.updatePassword(
      session.access_token,
      currentPassword,
      newPassword,
    );

    if (error) {
      return { error: { message: error } };
    }

    return { error: null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await authApi.resetPassword(email);

    if (error) {
      return { error: { message: error } };
    }

    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        updatePassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
