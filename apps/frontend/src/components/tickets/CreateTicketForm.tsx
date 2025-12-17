import { useState, useEffect } from 'react';
import {
  X,
  Ticket,
  Tag,
  Building,
  AlertTriangle,
  Calendar,
  Send,
  Paperclip,
} from 'lucide-react';
import {
  ticketsApi,
  Ticket as TicketType,
  TicketCategory,
  TicketDepartment,
  TicketPriority,
  CreateTicketData,
} from '../../api-client/tickets.api-client';
import { eventsApi } from '../../api-client/events.api-client';

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

const departmentOptions: { value: TicketDepartment; label: string }[] = [
  { value: 'general_support', label: 'General Support' },
  { value: 'membership_services', label: 'Membership Services' },
  { value: 'event_operations', label: 'Event Operations' },
  { value: 'technical_support', label: 'Technical Support' },
  { value: 'billing', label: 'Billing' },
  { value: 'administration', label: 'Administration' },
];

const priorityOptions: { value: TicketPriority; label: string; description: string; className: string }[] = [
  { value: 'low', label: 'Low', description: 'Not urgent', className: 'border-blue-500 bg-blue-500/10' },
  { value: 'medium', label: 'Medium', description: 'Normal priority', className: 'border-yellow-500 bg-yellow-500/10' },
  { value: 'high', label: 'High', description: 'Needs attention soon', className: 'border-orange-500 bg-orange-500/10' },
  { value: 'critical', label: 'Critical', description: 'Urgent issue', className: 'border-red-500 bg-red-500/10' },
];

// Auto-suggest department based on category
const categoryToDepartment: Record<TicketCategory, TicketDepartment> = {
  general: 'general_support',
  membership: 'membership_services',
  event_registration: 'event_operations',
  payment: 'billing',
  technical: 'technical_support',
  competition_results: 'event_operations',
  event_hosting: 'event_operations',
  account: 'technical_support',
  other: 'general_support',
};

export function CreateTicketForm({
  isOpen,
  onClose,
  onSuccess,
  reporterId,
  preselectedEventId,
}: CreateTicketFormProps) {
  const [formData, setFormData] = useState<CreateTicketData>({
    title: '',
    description: '',
    category: 'general',
    department: 'general_support',
    priority: 'medium',
    reporter_id: reporterId,
    event_id: preselectedEventId || null,
  });

  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch events for dropdown
  useEffect(() => {
    const fetchEvents = async () => {
      setLoadingEvents(true);
      try {
        const data = await eventsApi.getAll(1, 100);
        setEvents(data);
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        setLoadingEvents(false);
      }
    };
    if (isOpen) {
      fetchEvents();
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        description: '',
        category: 'general',
        department: 'general_support',
        priority: 'medium',
        reporter_id: reporterId,
        event_id: preselectedEventId || null,
      });
      setError(null);
    }
  }, [isOpen, reporterId, preselectedEventId]);

  // Auto-update department when category changes
  const handleCategoryChange = (category: TicketCategory) => {
    setFormData((prev) => ({
      ...prev,
      category,
      department: categoryToDepartment[category],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Please enter a title');
      return;
    }
    if (!formData.description.trim()) {
      setError('Please enter a description');
      return;
    }

    setSubmitting(true);
    try {
      const ticket = await ticketsApi.create(formData);
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
        {/* Header */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Title */}
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

          {/* Category & Priority Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleCategoryChange(e.target.value as TicketCategory)}
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

            {/* Priority */}
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

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Building className="w-4 h-4 inline mr-1" />
              Department
            </label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value as TicketDepartment })}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {departmentOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Event (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Related Event (Optional)
            </label>
            <select
              value={formData.event_id || ''}
              onChange={(e) => setFormData({ ...formData, event_id: e.target.value || null })}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={loadingEvents}
            >
              <option value="">No specific event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Please describe your issue in detail. Include any relevant information that might help us assist you..."
              rows={6}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              The more details you provide, the faster we can help you.
            </p>
          </div>

          {/* Actions */}
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
