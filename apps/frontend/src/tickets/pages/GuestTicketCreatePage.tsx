import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Ticket,
  Tag,
  Building,
  AlertTriangle,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  User,
  Paperclip,
  X,
} from 'lucide-react';
import * as guestApi from '../ticket-guest.api-client';
import { eventsApi } from '@/events';
import { TicketCustomField, TicketDepartmentResponse, TicketCategoryConfig } from '@newmeca/shared';
import { listPublicDepartments } from '../ticket-admin.api-client';
import { listCategoriesForDepartment } from '../ticket-categories.api-client';
import { listCustomFieldsForCategory, listStaffForPicker } from '../ticket-custom-fields.api-client';
import {
  TicketCustomFieldInputs,
  getMissingRequiredFields,
  buildCustomFieldAnswers,
  CustomFieldValues,
} from '../components/TicketCustomFieldInputs';

type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

// Guests/public may only self-select Low/Medium/High. "Critical" is a
// support-team-only priority (staff can still set it from the ticket detail
// pill and via routing rules), so it is intentionally omitted here.
const priorityOptions: { value: TicketPriority; label: string; className: string }[] = [
  { value: 'low', label: 'Low', className: 'border-blue-500 bg-blue-500/10' },
  { value: 'medium', label: 'Medium', className: 'border-yellow-500 bg-yellow-500/10' },
  { value: 'high', label: 'High', className: 'border-orange-500 bg-orange-500/10' },
];

export function GuestTicketCreatePage() {
  const { token } = useParams<{ token: string }>();

  const [verifying, setVerifying] = useState(true);
  const [_verified, setVerified] = useState(false);
  const [email, setEmail] = useState('');
  const [purpose, setPurpose] = useState<string>('create_ticket');
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const isAccountHelp = purpose === 'account_help';

  const [formData, setFormData] = useState({
    guest_name: '',
    title: '',
    description: '',
    category: '',
    priority: 'medium' as TicketPriority,
  });
  const [departmentId, setDepartmentId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<guestApi.GuestTicket | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const [departments, setDepartments] = useState<TicketDepartmentResponse[]>([]);
  const [categories, setCategories] = useState<TicketCategoryConfig[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [customFields, setCustomFields] = useState<TicketCustomField[]>([]);
  const [customValues, setCustomValues] = useState<CustomFieldValues>({});
  const [loadingFields, setLoadingFields] = useState(false);
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);

  // Events + staff for any event_reference / staff_reference field (public lists).
  useEffect(() => {
    eventsApi.getAll(1, 100).then(setEvents).catch(() => setEvents([]));
    listStaffForPicker().then(setStaff).catch(() => setStaff([]));
  }, []);

  // Departments for the first dropdown (skipped for account-help, which is
  // forced to the Account category server-side).
  useEffect(() => {
    if (!_verified || isAccountHelp) return;
    // Guest flow → only guest-visible departments (audience 'all' | 'guests').
    listPublicDepartments({ audience: 'guest' }).then(setDepartments).catch(() => setDepartments([]));
  }, [_verified, isAccountHelp]);

  const handleDepartmentChange = async (deptId: string) => {
    setDepartmentId(deptId);
    setFormData((prev) => ({ ...prev, category: '' }));
    setCategories([]);
    if (!deptId) return;
    setLoadingCategories(true);
    try {
      setCategories(await listCategoriesForDepartment(deptId, { audience: 'guest' }));
    } catch {
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Load the chosen category's fields (also fires when account_help forces 'account').
  useEffect(() => {
    if (!_verified || !formData.category) return;
    let active = true;
    setLoadingFields(true);
    setCustomValues({});
    listCustomFieldsForCategory(formData.category)
      .then((f) => { if (active) setCustomFields(f); })
      .catch(() => { if (active) setCustomFields([]); })
      .finally(() => { if (active) setLoadingFields(false); });
    return () => { active = false; };
  }, [formData.category, _verified]);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    const valid: File[] = [];
    for (const f of picked) {
      const err = guestApi.validateTicketImage(f);
      if (err) { setSubmitError(err); continue; }
      valid.push(f);
    }
    if (valid.length) setFiles((prev) => [...prev, ...valid]);
    e.target.value = '';
  };

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
        if (result.valid && (result.purpose === 'create_ticket' || result.purpose === 'account_help')) {
          setEmail(result.email);
          setPurpose(result.purpose);
          // Account-help links are forced to the Account category.
          if (result.purpose === 'account_help') {
            setFormData((prev) => ({ ...prev, category: 'account' }));
          }
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
    if (!isAccountHelp) {
      if (!departmentId) {
        setSubmitError('Please choose a department');
        return;
      }
      if (!formData.category) {
        setSubmitError('Please choose a category');
        return;
      }
    }
    const missing = getMissingRequiredFields(customFields, customValues);
    if (missing.length > 0) {
      setSubmitError(`Please complete required field(s): ${missing.map((f) => f.label).join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      const ticket = await guestApi.createGuestTicket({
        token: token!,
        guest_name: formData.guest_name,
        title: formData.title,
        description: formData.description,
        category: isAccountHelp ? 'account' : formData.category,
        department_id: isAccountHelp ? undefined : departmentId,
        priority: formData.priority,
        custom_field_answers: buildCustomFieldAnswers(customFields, customValues),
      });
      // Upload any screenshots now that the ticket (and its access token) exists.
      for (const file of files) {
        try {
          await guestApi.uploadGuestAttachment(ticket.access_token, file);
        } catch (upErr) {
          console.error('Failed to upload attachment:', upErr);
        }
      }
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
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
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
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
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
            {isAccountHelp ? 'Account & Login Help' : 'Create Support Ticket'}
          </h1>
          <p className="text-gray-400">
            Submitting as: <span className="text-orange-400">{email}</span>
          </p>
          {isAccountHelp && (
            <p className="text-gray-400 text-sm mt-3 max-w-lg mx-auto">
              Tell us what's preventing you from logging in (forgot password, no reset
              email, account locked, etc.). Our team will help you regain access — then
              you can sign in and submit other tickets as normal.
            </p>
          )}
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

          {/* Department & Category */}
          {isAccountHelp ? (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Category
              </label>
              <div className="w-full px-4 py-3 bg-slate-700/60 border border-slate-600 rounded-lg text-gray-300">
                Account / Login Issue
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This request is for account access and login problems only.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Building className="w-4 h-4 inline mr-1" />
                  Department <span className="text-red-400">*</span>
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select a department…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Tag className="w-4 h-4 inline mr-1" />
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  disabled={!departmentId || loadingCategories}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                >
                  <option value="">
                    {!departmentId ? 'Choose a department first' : loadingCategories ? 'Loading…' : 'Select a category…'}
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
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

          {/* Category-specific fields */}
          {loadingFields && <p className="text-sm text-gray-400">Loading additional fields…</p>}
          {!loadingFields && customFields.length > 0 && (
            <div className="space-y-4 p-4 bg-slate-900/40 rounded-lg border border-slate-700">
              <TicketCustomFieldInputs
                fields={customFields}
                values={customValues}
                onChange={(id, val) => setCustomValues((prev) => ({ ...prev, [id]: val }))}
                events={events}
                staff={staff}
              />
            </div>
          )}

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

          {/* Screenshots */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Screenshots (optional)
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-gray-200 rounded-lg border border-slate-600 cursor-pointer">
                <Paperclip className="w-4 h-4" />
                Attach screenshot
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  onChange={handleFilesChange}
                  className="hidden"
                />
              </label>
              {files.map((f, i) => (
                <span key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-xs text-gray-200">
                  <Paperclip className="w-3 h-3" />
                  <span className="truncate max-w-[12rem]">{f.name}</span>
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, or WebP — up to 10MB each.</p>
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
              className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
