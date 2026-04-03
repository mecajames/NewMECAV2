import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/contexts/AuthContext';
import axios from '@/lib/axios';

export default function CardRedirectPage() {
  const { membershipId } = useParams<{ membershipId: string }>();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!profile) {
      // Not logged in - redirect to login with return URL
      navigate(`/login?redirect=/card/${membershipId}`);
      return;
    }

    // Fetch the membership to get the user's profile ID
    async function redirect() {
      try {
        const response = await axios.get(`/api/memberships/${membershipId}/card-data`);
        const cardData = response.data;

        if (!cardData) {
          setError('Membership not found');
          return;
        }

        if (profile?.role === 'admin') {
          // Admin: go to admin member detail page
          // We need the profile ID of the membership owner
          const membershipResponse = await axios.get(`/api/memberships/${membershipId}`);
          const membership = membershipResponse.data;
          const userId = membership.user?.id || membership.user;
          navigate(`/admin/members/${userId}`, { replace: true });
        } else {
          // Regular member: go to public profile / member directory page
          const membershipResponse = await axios.get(`/api/memberships/${membershipId}`);
          const membership = membershipResponse.data;
          const userId = membership.user?.id || membership.user;
          navigate(`/members/${userId}`, { replace: true });
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load membership data');
      }
    }

    redirect();
  }, [profile, authLoading, membershipId, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="bg-slate-800 rounded-xl p-8 max-w-md text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent mb-4" />
        <p className="text-slate-400">Redirecting...</p>
      </div>
    </div>
  );
}
