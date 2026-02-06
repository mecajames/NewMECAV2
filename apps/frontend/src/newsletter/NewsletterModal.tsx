import { useState } from 'react';
import { X, Mail, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { newsletterApi } from '@/api-client/newsletter.api-client';
import { getStorageUrl } from '@/lib/storage';

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewsletterModal({ isOpen, onClose }: NewsletterModalProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!consent) {
      setError('Please check the box to confirm you consent to receive emails');
      return;
    }

    try {
      setLoading(true);
      await newsletterApi.signup({
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setEmail('');
    setFirstName('');
    setLastName('');
    setConsent(false);
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
        {/* Orange accent bar */}
        <div className="h-1 bg-gradient-to-r from-orange-500 via-orange-600 to-red-500" />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="p-8">
          {success ? (
            // Success State
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">You're In!</h3>
              <p className="text-gray-400 mb-6">
                Thanks for subscribing to the MECA Head Newsletter. You'll receive updates on events, competitions, and exclusive content.
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            // Form State
            <>
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto mb-4">
                  <img
                    src={getStorageUrl('banner-images/newsletter-logo.png')}
                    alt="MECA Head Newsletter"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  MECA Head Newsletter
                </h3>
                <p className="text-gray-400 text-sm">
                  Get the latest news, event updates, and exclusive content delivered to your inbox.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email Address <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Consent Checkbox */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="newsletter-consent"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 text-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-orange-500 cursor-pointer"
                  />
                  <label htmlFor="newsletter-consent" className="text-sm text-gray-400 cursor-pointer">
                    I agree to receive marketing emails from MECA. <span className="text-orange-400">*</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading || !consent}
                  className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    <>
                      Subscribe Now
                    </>
                  )}
                </button>

                {/* Constant Contact Required Disclaimer */}
                <div className="text-[10px] text-gray-500 leading-relaxed">
                  <p>
                    By submitting this form, you are consenting to receive marketing emails from: MECA, Inc., 235 Flamingo Dr, Louisville, KY, 40218, US,{' '}
                    <a
                      href="http://www.mecacaraudio.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 hover:text-orange-300"
                    >
                      http://www.mecacaraudio.com
                    </a>
                    . You can revoke your consent to receive emails at any time by using the SafeUnsubscribe® link, found at the bottom of every email. Emails are serviced by Constant Contact.{' '}
                    <a
                      href="https://www.mecacaraudio.com/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-0.5"
                    >
                      Our Privacy Policy
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </p>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
