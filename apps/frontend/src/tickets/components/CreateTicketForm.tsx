import { useState, useEffect } from 'react';
import { X, Ticket, Tag, Building, AlertTriangle, Send, Paperclip } from 'lucide-react';
import {
  ticketsApi,
  Ticket as TicketType,
  TicketPriority,
  CreateTicketData,
} from '../tickets.api-client';
import { uploadFile } from '@/api-client/uploads.api-client';
import { eventsApi } from '@/events';
import { TicketCustomField, TicketDepartmentResponse, TicketCategoryConfig, TicketPurchase } from '@newmeca/shared';
import { listPublicDepartments, TicketFormViewer } from '../ticket-admin.api-client';
import { listCategoriesForDepartment } from '../ticket-categories.api-client';
import { useAuth } from '@/auth/contexts/AuthContext';
import { listCustomFieldsForCategory, getMyPurchases, listStaffForPicker } from '../ticket-custom-fields.api-client';
import {
  TicketCustomFieldInputs,
  getMissingRequiredFields,
  buildCustomFieldAnswers,
  CustomFieldValues,
} from './TicketCustomFieldInputs';

const TICKET_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const TICKET_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

interface Event {
  id: string;
  title: string;
}

interface CreateTicketFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (ticket: TicketType) => void;
  reporterId: string;
  preselectedEventId?: string;
}

// Members/public may only self-select Low/Medium/High. "Critical" is a
// support-team-only priority (staff can still set it from the ticket detail
// pill and via routing rules), so it is intentionally omitted here.
const priorityOptions: { value: TicketPriority; label: string; className: string }[] = [
  { value: 'low', label: 'Low', className: 'border-blue-500 bg-blue-500/10' },
  { value: 'medium', label: 'Medium', className: 'border-yellow-500 bg-yellow-500/10' },
  { value: 'high', label: 'High', className: 'border-orange-500 bg-orange-500/10' },
];

export function CreateTicketForm({
  isOpen,
  onClose,
  onSuccess,
  reporterId,
  preselectedEventId,
}: CreateTicketFormProps) {
  // This form is for logged-in members. Pass the member's role so role-gated
  // departments/categories (Event Director / Judge) appear for those who qualify.
  const { profile } = useAuth();
  const viewer: TicketFormViewer = {
    audience: 'member',
    roles: profile?.role ? [profile.role] : [],
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');

  const [departments, setDepartments] = useState<TicketDepartmentResponse[]>([]);
  const [categories, setCategories] = useState<TicketCategoryConfig[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [purchases, setPurchases] = useState<TicketPurchase[]>([]);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);

  const [customFields, setCustomFields] = useState<TicketCustomField[]>([]);
  const [customValues, setCustomValues] = useState<CustomFieldValues>({});
  const [loadingFields, setLoadingFields] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    const valid: File[] = [];
    for (const f of picked) {
      if (!TICKET_IMAGE_MIME.includes(f.type)) {
        setError(`${f.name}: only images (JPG, PNG, GIF, WebP) are allowed`);
        continue;
      }
      if (f.size > TICKET_IMAGE_MAX_BYTES) {
        setError(`${f.name}: file too large (max 10MB)`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length) setFiles((prev) => [...prev, ...valid]);
    e.target.value = '';
  };

  // Load departments + events when the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setDescription('');
    setDepartmentId('');
    setCategory('');
    setPriority('medium');
    setCategories([]);
    setCustomFields([]);
    setCustomValues({});
    setError(null);
    setFiles([]);

    listPublicDepartments(viewer).then(setDepartments).catch((err) => console.error('Failed to load departments:', err));
    getMyPurchases().then(setPurchases).catch(() => setPurchases([]));
    listStaffForPicker().then(setStaff).catch(() => setStaff([]));

    setLoadingEvents(true);
    eventsApi
      .getAll(1, 100)
      .then(setEvents)
      .catch((err) => console.error('Failed to fetch events:', err))
      .finally(() => setLoadingEvents(false));
  }, [isOpen, reporterId, preselectedEventId]);

  // Department chosen → load its categories, reset everything below.
  const handleDepartmentChange = async (deptId: string) => {
    setDepartmentId(deptId);
    setCategory('');
    setCategories([]);
    setCustomFields([]);
    setCustomValues({});
    if (!deptId) return;
    setLoadingCategories(true);
    try {
      setCategories(await listCategoriesForDepartment(deptId, viewer));
    } catch (err) {
      console.error('Failed to load categories:', err);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Category chosen → load its custom fields (progressive disclosure).
  const handleCategoryChange = async (key: string) => {
    setCategory(key);
    setCustomFields([]);
    setCustomValues({});
    if (!key) return;
    setLoadingFields(true);
    try {
      const fields = await listCustomFieldsForCategory(key);
      setCustomFields(fields);
      if (preselectedEventId) {
        const seeded: CustomFieldValues = {};
        for (const f of fields) {
          if (f.field_type === 'event_reference') seeded[f.id] = preselectedEventId;
        }
        if (Object.keys(seeded).length) setCustomValues(seeded);
      }
    } catch (err) {
      console.error('Failed to load custom fields:', err);
      setCustomFields([]);
    } finally {
      setLoadingFields(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError('Please enter a subject');
    if (!departmentId) return setError('Please choose a department');
    if (!category) return setError('Please choose a category');
    if (!description.trim()) return setError('Please enter a description');

    const missing = getMissingRequiredFields(customFields, customValues);
    if (missing.length > 0) {
      return setError(`Please complete required field(s): ${missing.map((f) => f.label).join(', ')}`);
    }

    setSubmitting(true);
    try {
      const payload: CreateTicketData = {
        title,
        description,
        category,
        department_id: departmentId,
        priority,
        reporter_id: reporterId,
        event_id: preselectedEventId || null,
        custom_field_answers: buildCustomFieldAnswers(customFields, customValues),
      };
      const ticket = await ticketsApi.create(payload);
      for (const file of files) {
        try {
          const uploaded = await uploadFile(file, 'ticket-attachments', ticket.id);
          await ticketsApi.createAttachment(ticket.id, {
            uploader_id: reporterId,
            file_name: file.name,
            file_path: uploaded.publicUrl,
            bucket: uploaded.bucket,
            storage_path: uploaded.storagePath,
            file_size: uploaded.fileSize,
            mime_type: uploaded.mimeType,
          });
        } catch (upErr) {
          console.error(`Failed to upload attachment ${file.name}:`, upErr);
        }
      }
      onSuccess(ticket);
      onClose();
    } catch (err) {
      setError('Failed to create ticket. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl border border-slate-700 my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Ticket className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create Support Ticket</h2>
              <p className="text-sm text-gray-400">We'll get back to you as soon as possible</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Subject <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of your issue..."
              maxLength={255}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Department & Category */}
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
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
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
                  onClick={() => setPriority(opt.value)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    priority === opt.value
                      ? `${opt.className} border-2`
                      : 'border-slate-600 bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category-specific fields (progressive disclosure) */}
          {loadingFields && <p className="text-sm text-gray-400">Loading additional fields…</p>}
          {!loadingFields && customFields.length > 0 && (
            <div className="space-y-4 p-4 bg-slate-900/40 rounded-lg border border-slate-700">
              <TicketCustomFieldInputs
                fields={customFields}
                values={customValues}
                onChange={(id, val) => setCustomValues((prev) => ({ ...prev, [id]: val }))}
                events={events}
                purchases={purchases}
                staff={staff}
                disabled={loadingEvents}
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe your issue in detail. Include any relevant information that might help us assist you..."
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
              <Paperclip className="w-4 h-4 inline mr-1" />
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTicketForm;
