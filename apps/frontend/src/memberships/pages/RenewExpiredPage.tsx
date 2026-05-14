import { Link } from 'react-router-dom';
import { AlertTriangle, Mail, Phone } from 'lucide-react';

/**
 * Landing page shown to expired members who arrive without a valid
 * renewal token in the URL (e.g., they got redirected after attempting
 * to log in, or their renewal email is missing). We can't auto-identify
 * them here — we ask them to use the email link or contact support.
 */
export default function RenewExpiredPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 md:p-10 shadow-xl text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Your MECA membership has expired
          </h1>
          <p className="text-gray-300 mb-6">
            Members with expired memberships can't sign in to MyMECA. To renew, please use the
            renewal link from your most recent renewal email, or contact us directly and we'll
            get you back competing.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            <a
              href="mailto:memberships@mecacaraudio.com"
              className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-3 rounded-lg transition-colors"
            >
              <Mail className="w-4 h-4" />
              memberships@mecacaraudio.com
            </a>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-medium px-5 py-3 rounded-lg transition-colors"
            >
              <Phone className="w-4 h-4" />
              Contact support
            </Link>
          </div>

          <div className="mt-8 border-t border-slate-700/60 pt-6 text-sm text-gray-400">
            <p>
              Public pages (events, results, standings) remain available without an account.
            </p>
            <Link to="/" className="inline-block mt-2 text-orange-400 hover:text-orange-300">
              Continue to public site →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
