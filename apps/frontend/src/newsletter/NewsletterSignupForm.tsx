import { useState } from 'react';
import { Mail, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { newsletterApi } from '@/api-client/newsletter.api-client';

interface NewsletterSignupFormProps {
  /** Show first and last name fields */
  showNameFields?: boolean;
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
  /** Compact mode for footer/sidebar */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

export function NewsletterSignupForm({
  showNameFields = false,
  title = 'Subscribe to Our Newsletter',
  description = 'Stay updated with MECA news, events, and announcements.',
  compact = false,
  className = '',
}: NewsletterSignupFormProps) {
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

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!consent && !compact) {
      setError('Please check the box to confirm you consent to receive emails');
      return;
    }

    try {
      setLoading(true);
      const response = await newsletterApi.signup({
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });

      if (response.success) {
        setSuccess(true);
        setEmail('');
        setFirstName('');
        setLastName('');
        setConsent(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className={`bg-green-500/10 border border-green-500/30 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-green-500 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-green-400">Successfully Subscribed!</h3>
            <p className="text-green-300/80 text-sm">
              Thank you for subscribing to our newsletter.
            </p>
          </div>
        </div>
        <button
          onClick={() => setSuccess(false)}
          className="mt-4 text-sm text-green-400 hover:text-green-300 underline"
        >
          Subscribe another email
        </button>
      </div>
    );
  }

  // Compact version for footer/sidebar (simplified - no consent checkbox in compact mode)
  if (compact) {
    return (
      <div className={className}>
        {title && <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>}
        {description && <p className="text-gray-400 text-sm mb-4">{description}</p>}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
          </button>
        </form>

        {error && (
          <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <p className="mt-3 text-[9px] text-gray-500 leading-relaxed">
          By submitting, you consent to receive marketing emails from MECA, Inc. You can unsubscribe anytime via SafeUnsubscribe®.
        </p>
      </div>
    );
  }

  // Full version
  return (
    <div className={`bg-slate-800 rounded-xl p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
          <Mail className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
          {description && <p className="text-gray-400 text-sm">{description}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {showNameFields && (
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
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
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
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                disabled={loading}
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Email Address <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
            disabled={loading}
            required
          />
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
            id="signup-form-consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 w-4 h-4 text-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-orange-500 cursor-pointer"
          />
          <label htmlFor="signup-form-consent" className="text-sm text-gray-400 cursor-pointer">
            I agree to receive marketing emails from MECA. <span className="text-orange-400">*</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !consent}
          className="w-full px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Subscribing...
            </>
          ) : (
            <>
              <Mail className="h-5 w-5" />
              Subscribe
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
    </div>
  );
}
