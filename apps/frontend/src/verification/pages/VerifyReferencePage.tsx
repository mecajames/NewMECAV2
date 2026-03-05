import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import {
  lookupReferenceToken as judgesLookup,
  verifyReference as judgesVerify,
} from '@/judges/judges.api-client';
import {
  lookupReferenceToken as edLookup,
  verifyReference as edVerify,
} from '@/event-directors/event-directors.api-client';
import type { ReferenceTokenLookup } from '@/judges/judges.api-client';

type PageState = 'loading' | 'error' | 'form' | 'success';

function formatEST(date: Date): string {
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

export default function VerifyReferencePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const isPreview = searchParams.get('preview') === 'true';

  const [state, setState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [tokenData, setTokenData] = useState<ReferenceTokenLookup | null>(null);
  const [applicationType, setApplicationType] = useState<'Judge' | 'Event Director' | null>(null);

  const [confirmed, setConfirmed] = useState(false);
  const [testimonial, setTestimonial] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    // Preview mode — skip token lookup, show form with sample data
    if (isPreview) {
      setTokenData({
        applicantName: 'John Smith',
        applicationType: 'Judge',
        referenceName: 'Jane Doe',
      });
      setApplicationType('Judge');
      setState('form');
      return;
    }

    if (!token) {
      setErrorMessage('No verification token provided. Please use the link from your email.');
      setState('error');
      return;
    }

    lookupToken(token);
  }, [token, isPreview]);

  async function lookupToken(tokenValue: string) {
    setState('loading');

    // Try judges first
    try {
      const data = await judgesLookup(tokenValue);
      setTokenData(data);
      setApplicationType('Judge');
      setState('form');
      return;
    } catch {
      // Not a judge token, try ED
    }

    // Try event directors
    try {
      const data = await edLookup(tokenValue);
      setTokenData(data);
      setApplicationType('Event Director');
      setState('form');
      return;
    } catch (err: any) {
      const message = err.message || 'Invalid or expired verification link';
      setErrorMessage(message);
      setState('error');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    if (!confirmed) {
      setSubmitError('Please confirm that you know the applicant.');
      return;
    }

    if (testimonial.trim().length < 20) {
      setSubmitError('Please provide a more detailed response (at least 20 characters).');
      return;
    }

    // Preview mode — just show success
    if (isPreview) {
      setState('success');
      return;
    }

    setSubmitting(true);

    try {
      if (applicationType === 'Judge') {
        await judgesVerify(token!, testimonial.trim());
      } else {
        await edVerify(token!, testimonial.trim());
      }
      setState('success');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit verification. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Loading State
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-300 text-lg">Verifying your link...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (state === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Verification Link Invalid</h1>
          <p className="text-slate-300 mb-6">{errorMessage}</p>
          <div className="bg-slate-700/50 rounded-lg p-4 text-sm text-slate-400">
            <p>If you believe this is an error, please contact the applicant or{' '}
              <Link to="/support/guest" className="text-orange-400 hover:text-orange-300 underline">
                submit a support ticket
              </Link>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success State
  if (state === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Thank You!</h1>
          <p className="text-slate-300 mb-4">
            Your reference verification for <span className="text-white font-semibold">{tokenData?.applicantName}</span> has been submitted successfully.
          </p>
          <p className="text-slate-400 text-sm mb-6">
            Submitted on {formatEST(new Date())}
          </p>
          <div className="bg-slate-700/50 rounded-lg p-4 text-sm text-slate-400">
            The MECA team will review your response as part of the {applicationType} application process.
          </div>
        </div>
      </div>
    );
  }

  // Form State
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Preview Banner */}
        {isPreview && (
          <div className="mb-6 p-3 bg-yellow-500/20 border border-yellow-500/40 rounded-lg text-yellow-300 text-sm text-center">
            Preview Mode — This form will not submit to the database.
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-8 w-8 text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Reference Verification</h1>
          <p className="text-slate-400">
            MECA — Mobile Electronics Competition Association
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-slate-800 rounded-xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Verification Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-sm">Applicant Name</label>
              <p className="text-white font-medium">{tokenData?.applicantName}</p>
            </div>
            <div>
              <label className="text-slate-400 text-sm">Application Type</label>
              <p className="text-white font-medium">{applicationType}</p>
            </div>
            <div>
              <label className="text-slate-400 text-sm">Your Name (Reference)</label>
              <p className="text-white font-medium">{tokenData?.referenceName}</p>
            </div>
            <div>
              <label className="text-slate-400 text-sm">Current Date & Time (EST)</label>
              <p className="text-white font-medium text-sm">{formatEST(new Date())}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl shadow-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Your Reference</h2>

          <p className="text-slate-300 text-sm mb-6">
            <span className="text-white font-medium">{tokenData?.applicantName}</span> has listed you as a professional reference
            for their MECA {applicationType} application. Please provide your honest assessment of their qualifications below.
          </p>

          {/* Confirmation Checkbox */}
          <div className="mb-6">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-slate-300 text-sm group-hover:text-white transition-colors">
                I confirm that I personally know <span className="font-semibold text-white">{tokenData?.applicantName}</span> and
                can provide a professional reference for their {applicationType} application.
              </span>
            </label>
          </div>

          {/* Testimonial */}
          <div className="mb-6">
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Please describe the applicant's qualifications, character, and why you believe they would be
              a good MECA {applicationType}. <span className="text-red-400">*</span>
            </label>
            <textarea
              value={testimonial}
              onChange={(e) => setTestimonial(e.target.value)}
              className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 h-40 resize-y text-sm placeholder-slate-500"
              placeholder="Please share your knowledge of the applicant's experience, skills, and character. Include how long you've known them and in what capacity..."
              required
              minLength={20}
            />
            <p className="text-slate-500 text-xs mt-1">
              {testimonial.length < 20
                ? `Minimum 20 characters required (${testimonial.length}/20)`
                : `${testimonial.length} characters`}
            </p>
          </div>

          {/* Error */}
          {submitError && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
              {submitError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !confirmed || testimonial.trim().length < 20}
            className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                Submit Reference Verification
              </>
            )}
          </button>

          <p className="text-slate-500 text-xs text-center mt-4">
            By submitting, you confirm that the information provided is accurate and truthful.
          </p>
        </form>
      </div>
    </div>
  );
}
