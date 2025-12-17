import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Ticket,
  Send,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Search,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import * as guestApi from '../ticket-guest.api-client';

type TabType = 'new' | 'existing';

export function GuestSupportPage() {
  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [email, setEmail] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setDevToken(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const result = await guestApi.requestAccess(email);
      setSuccess(true);
      // In development, show the token link
      if (result._dev_token) {
        setDevToken(result._dev_token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestTicketAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setDevToken(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!ticketNumber.trim()) {
      setError('Please enter your ticket number');
      return;
    }

    setLoading(true);
    try {
      const result = await guestApi.requestTicketAccess(email, ticketNumber);
      setSuccess(true);
      if ((result as any)._dev_token) {
        setDevToken((result as any)._dev_token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send access email');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setTicketNumber('');
    setSuccess(false);
    setError(null);
    setDevToken(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-orange-500/10 rounded-xl mb-4">
            <HelpCircle className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Support Center</h1>
          <p className="text-gray-400">
            Get help with your MECA-related questions
          </p>
        </div>

        {/* Already have an account? */}
        <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
          <p className="text-gray-400 text-sm">
            Already have a MECA account?{' '}
            <Link to="/login" className="text-orange-400 hover:text-orange-300">
              Sign in
            </Link>{' '}
            for faster support and to view all your tickets.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-6 bg-slate-800 rounded-xl p-1">
          <button
            onClick={() => {
              setActiveTab('new');
              resetForm();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'new'
                ? 'bg-orange-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Ticket className="w-4 h-4" />
            New Ticket
          </button>
          <button
            onClick={() => {
              setActiveTab('existing');
              resetForm();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'existing'
                ? 'bg-orange-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Search className="w-4 h-4" />
            Check Ticket
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {success ? (
            /* Success State */
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center p-3 bg-green-500/10 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Check Your Email
              </h2>
              <p className="text-gray-400 mb-6">
                {activeTab === 'new'
                  ? "We've sent a verification link to your email. Click the link to create your support ticket."
                  : "If a ticket exists with that email and number, we've sent you an access link."}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                The link will expire in 1 hour.
              </p>

              {/* Development mode: show direct link */}
              {devToken && (
                <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-sm font-medium mb-2">
                    Development Mode
                  </p>
                  <Link
                    to={activeTab === 'new'
                      ? `/support/guest/verify/${devToken}`
                      : `/support/guest/access/${devToken}`
                    }
                    className="text-orange-400 hover:text-orange-300 text-sm break-all"
                  >
                    Click here to continue →
                  </Link>
                </div>
              )}

              <button
                onClick={resetForm}
                className="text-orange-400 hover:text-orange-300 font-medium"
              >
                Start Over
              </button>
            </div>
          ) : (
            /* Form State */
            <form
              onSubmit={activeTab === 'new' ? handleRequestAccess : handleRequestTicketAccess}
              className="p-6 space-y-6"
            >
              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              {/* Description */}
              <div className="text-center pb-4 border-b border-slate-700">
                {activeTab === 'new' ? (
                  <>
                    <h2 className="text-lg font-semibold text-white mb-1">
                      Create a Support Ticket
                    </h2>
                    <p className="text-gray-400 text-sm">
                      Enter your email to receive a verification link
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-semibold text-white mb-1">
                      Check Existing Ticket
                    </h2>
                    <p className="text-gray-400 text-sm">
                      Enter your email and ticket number to view status
                    </p>
                  </>
                )}
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>

              {/* Ticket Number Input (for existing tickets) */}
              {activeTab === 'existing' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ticket Number
                  </label>
                  <div className="relative">
                    <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={ticketNumber}
                      onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
                      placeholder="TKT-2025-00001"
                      className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {activeTab === 'new' ? 'Send Verification Link' : 'Send Access Link'}
                  </>
                )}
              </button>

              {/* Info Text */}
              <p className="text-xs text-gray-500 text-center">
                {activeTab === 'new'
                  ? "We'll send you an email with a link to create your support ticket. This helps us prevent spam."
                  : "We'll send you an email with a link to view your ticket if it exists."}
              </p>
            </form>
          )}
        </div>

        {/* FAQ Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Have a quick question?{' '}
            <Link to="/faq" className="text-orange-400 hover:text-orange-300">
              Check our FAQ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default GuestSupportPage;
