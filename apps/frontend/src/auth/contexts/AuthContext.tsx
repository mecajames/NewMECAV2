import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, Provider } from '@supabase/supabase-js';
import { supabase, Profile } from '@/lib/supabase';
import { setAxiosUserId } from '@/lib/axios';
import { profilesApi } from '@/profiles';
import { userActivityApi } from '@/user-activity/user-activity.api-client';

const SESSION_ID_KEY = 'meca-login-session-id';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  forcePasswordChange: boolean;
  restrictedToBilling: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any; data: any }>;
  signInWithOAuth: (provider: Provider) => Promise<{ error: any }>;
  signOut: (logoutReason?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  clearForcePasswordChange: () => Promise<void>;
  ensureProfileExists: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [restrictedToBilling, setRestrictedToBilling] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const data = await profilesApi.getById(userId);

      if (data) {
        // Add computed full_name field for backward compatibility
        (data as any).full_name = `${data.first_name || ''} ${data.last_name || ''}`.trim();
        // Check if user needs to change password
        setForcePasswordChange(data.force_password_change === true);
        // Mode-B "pay-to-activate" provisioning hold — front-end guard
        // pins the user to /billing until cleared by the server on payment.
        setRestrictedToBilling(data.restricted_to_billing === true);
      }

      return data;
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        // Set axios user ID for authenticated API calls
        setAxiosUserId(session?.user?.id ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        }

        setLoading(false);
      })();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        // Update axios user ID when auth state changes
        setAxiosUserId(session?.user?.id ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Record failed login attempt (fire-and-forget)
      userActivityApi.recordFailedAttempt(email, error.message);
    } else {
      // Set axios user ID immediately so recordLogin has the header
      // (onAuthStateChange fires async and may not have run yet)
      if (data?.user?.id) {
        setAxiosUserId(data.user.id);
      }

      // Record successful login and store session ID
      const sessionId = await userActivityApi.recordLogin(email);
      if (sessionId) {
        try {
          sessionStorage.setItem(SESSION_ID_KEY, sessionId);
        } catch {
          // sessionStorage unavailable
        }
      }
    }

    return { error };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error || !data.user) {
      return { error, data: null };
    }

    // Generate MECA ID by calling the database function
    const { data: mecaIdData } = await supabase.rpc('generate_meca_id');
    const mecaId = mecaIdData || 700800;

    const signUpFullName = [firstName, lastName].filter(Boolean).join(' ') || email;

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        full_name: signUpFullName,
        meca_id: mecaId,
        role: 'user',
        membership_status: 'none',
      });

    if (profileError) {
      return { error: profileError, data: null };
    }

    return { error: null, data };
  };

  const signInWithOAuth = async (provider: Provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { error };
  };

  const ensureProfileExists = async (authUser: User) => {
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle();

    if (existingProfile) {
      // Profile exists, just refresh it
      const profileData = await fetchProfile(authUser.id);
      setProfile(profileData);
      return;
    }

    // Create profile for new OAuth user
    const { data: mecaIdData } = await supabase.rpc('generate_meca_id');
    const mecaId = mecaIdData || 700800;

    // Extract name from OAuth metadata
    const fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || '';
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const profileFullName = [firstName, lastName].filter(Boolean).join(' ') || authUser.email || '';

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.id,
        email: authUser.email,
        first_name: firstName,
        last_name: lastName,
        full_name: profileFullName,
        meca_id: mecaId,
        role: 'user',
        membership_status: 'none',
      });

    if (profileError) {
      console.error('Error creating profile for OAuth user:', profileError);
      return;
    }

    // Fetch the newly created profile
    const profileData = await fetchProfile(authUser.id);
    setProfile(profileData);
  };

  const signOut = async (logoutReason?: string) => {
    // Record logout before clearing auth state (try/catch, don't block)
    try {
      if (user?.email) {
        let sessionId: string | undefined;
        try {
          sessionId = sessionStorage.getItem(SESSION_ID_KEY) || undefined;
          sessionStorage.removeItem(SESSION_ID_KEY);
        } catch {
          // sessionStorage unavailable
        }
        await userActivityApi.recordLogout(user.email, sessionId, logoutReason || 'manual');
      }
    } catch {
      // Don't block signout
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setAxiosUserId(null);
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!user?.email) {
      return { error: { message: 'No user logged in' } };
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      return { error: { message: 'Current password is incorrect' } };
    }

    // Update to new password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    return { error };
  };

  const clearForcePasswordChange = async () => {
    if (user) {
      try {
        await profilesApi.clearForcePasswordChange(user.id);
        setForcePasswordChange(false);
        // Refresh profile to get updated data
        await refreshProfile();
      } catch (error) {
        console.error('Error clearing force password change:', error);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        forcePasswordChange,
        restrictedToBilling,
        signIn,
        signUp,
        signInWithOAuth,
        signOut,
        refreshProfile,
        updatePassword,
        resetPassword,
        clearForcePasswordChange,
        ensureProfileExists,
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
