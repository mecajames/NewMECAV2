import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Ticket,
  Tag,
  AlertTriangle,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  User,
} from 'lucide-react';
import * as guestApi from '../ticket-guest.api-client';

type TicketCategory = 'general' | 'membership' | 'event_registration' | 'payment' | 'technical' | 'competition_results' | 'event_hosting' | 'account' | 'other';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

const categoryOptions: { value: TicketCategory; label: string; description: string }[] = [
  { value: 'general', label: 'General', description: 'General questions or inquiries' },
  { value: 'membership', label: 'Membership', description: 'Membership status, renewals, or benefits' },
  { value: 'event_registration', label: 'Event Registration', description: 'Issues with registering for events' },
  { value: 'payment', label: 'Payment', description: 'Payment processing or billing issues' },
  { value: 'technical', label: 'Technical', description: 'Website or app technical issues' },
  { value: 'competition_results', label: 'Competition Results', description: 'Questions about competition scores or results' },
  { value: 'event_hosting', label: 'Event Hosting', description: 'Hosting or organizing MECA events' },
  { value: 'account', label: 'Account', description: 'Account access or profile issues' },
  { value: 'other', label: 'Other', description: 'Anything not covered above' },
];

const priorityOptions: { value: TicketPriority; label: string; className: string }[] = [
  { value: 'low', label: 'Low', className: 'border-blue-500 bg-blue-500/10' },
  { value: 'medium', label: 'Medium', className: 'border-yellow-500 bg-yellow-500/10' },
  { value: 'high', label: 'High', className: 'border-orange-500 bg-orange-500/10' },
  { value: 'critical', label: 'Critical', className: 'border-red-500 bg-red-500/10' },
];

export function GuestTicketCreatePage() {
  const { token } = useParams<{ token: string }>();

  const [verifying, setVerifying] = useState(true);
  const [_verified, setVerified] = useState(false);
  const [email, setEmail] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    guest_name: '',
    title: '',
    description: '',
    category: 'general' as TicketCategory,
    priority: 'medium' as TicketPriority,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<guestApi.GuestTicket | null>(null);

  // Verify token on mount
  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setVerifyError('Invalid verification link');
        setVerifying(false);
        return;
      }

      try {
        const result = await guestApi.verifyToken(token);
        if (result.valid && result.purpose === 'create_ticket') {
          setEmail(result.email);
          setVerified(true);
        } else {
          setVerifyError('This link is not valid for creating a ticket');
        }
      } catch (err) {
        setVerifyError(err instanceof Error ? err.message : 'Token verification failed');
      } finally {
        setVerifying(false);
      }
    };

    verify();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.guest_name.trim()) {
      setSubmitError('Please enter your name');
      return;
    }
    if (!formData.title.trim()) {
      setSubmitError('Please enter a subject');
      return;
    }
    if (!formData.description.trim()) {
      setSubmitError('Please describe your issue');
      return;
    }

    setSubmitting(true);
    try {
      const ticket = await guestApi.createGuestTicket({
        token: token!,
        guest_name: formData.guest_name,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
      });
      setCreatedTicket(ticket);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verifying your link...</p>
        </div>
      </div>
    );
  }

  // Verification error
  if (verifyError) {
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
            <p className="text-gray-400 mb-6">{verifyError}</p>
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

  // Ticket created success
  if (createdTicket) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
            <div className="inline-flex items-center justify-center p-3 bg-green-500/10 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Ticket Created!
            </h1>
            <p className="text-gray-400 mb-6">
              Your support ticket has been submitted successfully.
            </p>

            <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400 mb-1">Ticket Number</p>
              <p className="text-2xl font-mono font-bold text-orange-400">
                {createdTicket.ticket_number}
              </p>
            </div>

            <div className="space-y-3 text-left mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subject:</span>
                <span className="text-white">{createdTicket.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Category:</span>
                <span className="text-white capitalize">{createdTicket.category.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Priority:</span>
                <span className="text-white capitalize">{createdTicket.priority}</span>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              Save this link to view your ticket and receive updates:
            </p>

            <Link
              to={`/support/guest/ticket/${createdTicket.access_token}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              <Ticket className="w-5 h-5" />
              View Ticket
            </Link>

            <p className="text-xs text-gray-500 mt-4">
              We've also sent a confirmation email to {email}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Verified - show form
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-orange-500/10 rounded-xl mb-4">
            <Ticket className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Create Support Ticket
          </h1>
          <p className="text-gray-400">
            Submitting as: <span className="text-orange-400">{email}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-6">
          {/* Error */}
          {submitError && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400">{submitError}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.guest_name}
                onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                placeholder="John Doe"
                className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Subject <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief summary of your issue..."
              maxLength={255}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as TicketCategory })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {categoryOptions.find((c) => c.value === formData.category)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                Priority
              </label>
              <div className="grid grid-cols-2 gap-2">
                {priorityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: opt.value })}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      formData.priority === opt.value
                        ? `${opt.className} border-2`
                        : 'border-slate-600 bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Please describe your issue in detail..."
              rows={6}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              The more details you provide, the faster we can help you.
            </p>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
            <Link
              to="/support/guest"
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Create Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GuestTicketCreatePage;
