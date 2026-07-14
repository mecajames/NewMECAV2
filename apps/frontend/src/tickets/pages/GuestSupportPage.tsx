import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Ticket,
  Send,
  CheckCircle,
  AlertTriangle,
  Search,
  Loader2,
  HelpCircle,
  LogIn,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import * as guestApi from '../ticket-guest.api-client';
import { useAuth } from '@/auth/contexts/AuthContext';

type TabType = 'new' | 'existing';
// Sub-steps within the "New Ticket" tab. We classify the email first, then
// either route account-holders to login or send a magic link.
type NewStep = 'email' | 'account_active';
type SuccessContext = 'magic' | 'account_help' | 'existing';

export function GuestSupportPage() {
  const { resetPassword } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [email, setEmail] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successContext, setSuccessContext] = useState<SuccessContext>('magic');
  const [error, setError] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);

  // "New ticket" gate state
  const [newStep, setNewStep] = useState<NewStep>('email');
  const [classification, setClassification] = useState<guestApi.EmailClassification | null>(null);
  const [showAccountHelp, setShowAccountHelp] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Step 0: classify the email, then branch.
  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const result = await guestApi.classifyEmail(email);
      setClassification(result);

      if (result.status === 'active') {
        // Account-holder: don't issue a guest magic link — route to login.
        setNewStep('account_active');
      } else {
        // no_account or expired: treat as a guest and send a magic link.
        const link = await guestApi.requestAccess(email);
        setSuccessContext('magic');
        setDevToken(link._dev_token ?? null);
        setSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setResetLoading(true);
    try {
      const { error: resetErr } = await resetPassword(email);
      if (resetErr) {
        setError(resetErr.message || 'Failed to send password reset email');
      } else {
        setResetSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset email');
    } finally {
      setResetLoading(false);
    }
  };

  const handleAccountHelp = async () => {
    setError(null);
    setLoading(true);
    try {
      const link = await guestApi.requestAccountHelp(email);
      setSuccessContext('account_help');
      setDevToken(link._dev_token ?? null);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send account help link');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestTicketAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      setSuccessContext('existing');
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
    setNewStep('email');
    setClassification(null);
    setShowAccountHelp(false);
    setResetSent(false);
  };

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    resetForm();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-orange-500/10 rounded-xl mb-4">
            <HelpCircle className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Support Center</h1>
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
            onClick={() => switchTab('new')}
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
            onClick={() => switchTab('existing')}
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
                {successContext === 'magic'
                  ? "We've sent a verification link to your email. Click the link to create your support ticket."
                  : successContext === 'account_help'
                    ? "We've sent an account & login help link to your email. Click the link to submit your request and we'll help you regain access."
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
                    to={successContext === 'existing'
                      ? `/support/guest/access/${devToken}`
                      : `/support/guest/verify/${devToken}`
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
          ) : activeTab === 'new' && newStep === 'account_active' ? (
            /* Account-holder gate: route to login (or account help) */
            <div className="p-6 sm:p-8">
              {error && (
                <div className="flex items-center gap-2 p-4 mb-6 bg-red-500/10 border border-red-500 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              {classification?.login_banned ? (
                /* Hard-banned: reset/help won't help — direct to support inbox */
                <div className="text-center">
                  <div className="inline-flex items-center justify-center p-3 bg-red-500/10 rounded-full mb-4">
                    <ShieldAlert className="w-8 h-8 text-red-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">
                    There's an issue with this account
                  </h2>
                  <p className="text-gray-400 mb-6">
                    We're unable to process automated support for this account. Please use the{' '}
                    <a href="/contact" className="text-orange-400 hover:text-orange-300">
                      contact form
                    </a>{' '}
                    and our team will assist you.
                  </p>
                  <button onClick={resetForm} className="text-orange-400 hover:text-orange-300 font-medium">
                    Use a different email
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center p-3 bg-orange-500/10 rounded-full mb-4">
                      <LogIn className="w-8 h-8 text-orange-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">
                      {classification?.first_name ? `Welcome back, ${classification.first_name}!` : 'You already have an account'}
                    </h2>
                    <p className="text-gray-400">
                      This email is registered to a MECA account. Please sign in to submit a
                      ticket — it lets us see your account details for faster, more complete support.
                    </p>
                  </div>

                  {/* Primary: sign in */}
                  <Link
                    to="/login"
                    className="w-full flex items-center justify-center gap-2 py-3 mb-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    <LogIn className="w-5 h-5" />
                    Sign In
                  </Link>

                  {/* Secondary: forgot password (reset-first) */}
                  {resetSent ? (
                    <div className="flex items-center gap-2 p-4 mb-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <p className="text-green-400 text-sm">
                        Password reset email sent to {email}. Check your inbox, then sign in.
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleForgotPassword}
                      disabled={resetLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {resetLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
                      Forgot password? Send reset email
                    </button>
                  )}

                  {/* Last resort: account/login help ticket */}
                  <div className="mt-6 pt-6 border-t border-slate-700 text-center">
                    {showAccountHelp ? (
                      <>
                        <p className="text-gray-400 text-sm mb-3">
                          Tried resetting your password and still can't get in? Submit an
                          account &amp; login help request and our team will help you regain access.
                        </p>
                        <button
                          onClick={handleAccountHelp}
                          disabled={loading}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                          Get account &amp; login help
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setShowAccountHelp(true)}
                        className="text-sm text-gray-400 hover:text-gray-300"
                      >
                        Still can't access your account?
                      </button>
                    )}
                  </div>

                  <div className="mt-4 text-center">
                    <button onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-400">
                      Use a different email
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Email entry form (new ticket gate, or check existing ticket) */
            <form
              onSubmit={activeTab === 'new' ? handleEmailContinue : handleRequestTicketAccess}
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
                      Enter your email to get started
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
                    {activeTab === 'new' ? 'Checking...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    {activeTab === 'new' ? <Send className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                    {activeTab === 'new' ? 'Continue' : 'Send Access Link'}
                  </>
                )}
              </button>

              {/* Info Text */}
              <p className="text-xs text-gray-500 text-center">
                {activeTab === 'new'
                  ? "We'll check whether you have an account, then either sign you in or email you a link to create your ticket."
                  : "We'll send you an email with a link to view your ticket if it exists."}
              </p>
            </form>
          )}
        </div>

        {/* FAQ Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Have a quick question?{' '}
            <Link to="/member-support" className="text-orange-400 hover:text-orange-300">
              Check our Member Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default GuestSupportPage;
