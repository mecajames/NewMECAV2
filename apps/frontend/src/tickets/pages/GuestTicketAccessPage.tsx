import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, XCircle } from 'lucide-react';
import * as guestApi from '../ticket-guest.api-client';

/**
 * This page handles the magic link for accessing existing tickets.
 * It exchanges the view token for an access token and redirects to the ticket view.
 */
export function GuestTicketAccessPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getAccess = async () => {
      if (!token) {
        setError('Invalid access link');
        return;
      }

      try {
        const result = await guestApi.getAccessFromToken(token);
        // Redirect to ticket view with access token
        navigate(`/support/guest/ticket/${result.access_token}`, { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to access ticket');
      }
    };

    getAccess();
  }, [token, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
            <div className="inline-flex items-center justify-center p-3 bg-red-500/10 rounded-full mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">
              Link Invalid or Expired
            </h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <Link
              to="/support/guest"
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-orange-400 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Accessing your ticket...</p>
      </div>
    </div>
  );
}

export default GuestTicketAccessPage;
