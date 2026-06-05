import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Loader2, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Wraps member-only page content. Active members (and staff/admin/ED/judge)
 * see the real children. Everyone else NEVER renders the children at all —
 * so no member-only data is fetched or placed in the DOM — and instead sees a
 * blurred generic placeholder behind a non-dismissible "Member Only Content"
 * modal that links to the membership signup page.
 *
 * This is the UX half of the gate. For endpoints used ONLY by member-only
 * pages, also enforce membership server-side (drop @Public so the global
 * ActiveMembershipGuard applies) for true protection.
 */
export function MemberOnlyGate({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  // Mirror the backend ActiveMembershipGuard exemptions so the two stay
  // consistent: active paid membership, or a privileged role.
  const isActiveMember =
    !!profile &&
    (profile.membership_status === 'active' ||
      profile.is_staff === true ||
      profile.role === 'admin' ||
      profile.role === 'event_director' ||
      profile.role === 'judge');

  // Don't flash the gate (or the content) before auth resolves.
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
      </div>
    );
  }

  if (isActiveMember) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden">
      {/* Blurred, non-interactive placeholder — intentionally NOT the real
          content, so non-members can't read it by unblurring in dev-tools. */}
      <div className="blur-md select-none pointer-events-none" aria-hidden="true">
        <MemberOnlyPlaceholder />
      </div>

      {/* Modal overlay — covers the page; no dismiss/close by design. */}
      <div className="absolute inset-0 flex items-center justify-center p-4 bg-slate-900/60">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/10 rounded-full mb-5">
            <Lock className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Member Only Content</h2>
          <p className="text-gray-300 mb-6">
            Sign up here to become a member!!
          </p>
          <Link
            to="/membership"
            className="inline-flex items-center justify-center gap-2 w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            <Trophy className="w-5 h-5" />
            Become a Member
          </Link>
          <p className="text-sm text-gray-400 mt-5">
            Already a member?{' '}
            <Link to="/login" className="text-orange-400 hover:text-orange-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Generic, data-free skeleton that resembles a Top 10 page so the blurred
 * backdrop looks intentional without exposing any real standings.
 */
function MemberOnlyPlaceholder() {
  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-600 rounded-full mb-4">
            <Trophy className="h-10 w-10 text-white" />
          </div>
          <div className="h-10 w-64 bg-slate-700 rounded mx-auto mb-4" />
          <div className="h-4 w-80 bg-slate-700/70 rounded mx-auto" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 bg-slate-800 rounded-xl p-4">
              <div className="w-10 h-10 rounded-full bg-slate-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-slate-700 rounded" />
                <div className="h-3 w-1/4 bg-slate-700/60 rounded" />
              </div>
              <div className="h-6 w-16 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MemberOnlyGate;
