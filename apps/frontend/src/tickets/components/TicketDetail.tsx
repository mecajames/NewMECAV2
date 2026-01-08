import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Ticket,
  Clock,
  User,
  Calendar,
  Tag,
  Building,
  MessageSquare,
  Paperclip,
  Send,
  AlertCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  UserPlus,
  Edit,
  Trash2,
  Lock,
  Eye,
  Search,
  Loader2,
  X,
} from 'lucide-react';
import {
  ticketsApi,
  Ticket as TicketType,
  TicketComment,
  TicketAttachment,
  TicketStatus,
  TicketPriority,
} from '../tickets.api-client';
import * as ticketAdminApi from '../ticket-admin.api-client';
import { TicketStaffResponse } from '@newmeca/shared';

// Status styling
const statusConfig: Record<TicketStatus, { label: string; className: string; icon: React.ReactNode }> = {
  open: {
    label: 'Open',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-orange-500/10 text-orange-400 border-orange-500',
    icon: <Clock className="w-4 h-4" />,
  },
  awaiting_response: {
    label: 'Awaiting Response',
    className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500',
    icon: <MessageSquare className="w-4 h-4" />,
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-green-500/10 text-green-400 border-green-500',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  closed: {
    label: 'Closed',
    className: 'bg-gray-500/10 text-gray-400 border-gray-500',
    icon: <XCircle className="w-4 h-4" />,
  },
};

// Priority styling
const priorityConfig: Record<TicketPriority, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-500/10 text-red-400 border-red-500' },
  high: { label: 'High', className: 'bg-orange-500/10 text-orange-400 border-orange-500' },
  medium: { label: 'Medium', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500' },
  low: { label: 'Low', className: 'bg-blue-500/10 text-blue-400 border-blue-500' },
};

interface TicketDetailProps {
  ticketId?: string;
  currentUserId: string;
  isStaff?: boolean;
  onBack?: () => void;
}

export function TicketDetail({
  ticketId: propTicketId,
  currentUserId,
  isStaff = false,
  onBack,
}: TicketDetailProps) {
  const navigate = useNavigate();
  const { id: paramTicketId } = useParams<{ id: string }>();
  const ticketId = propTicketId || paramTicketId;

  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comment form state
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Action states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Staff search state for assignment
  const [staffList, setStaffList] = useState<TicketStaffResponse[]>([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffSearchLoading, setStaffSearchLoading] = useState(false);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<TicketStaffResponse | null>(null);
  const staffSearchRef = useRef<HTMLDivElement>(null);

  const fetchTicket = async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const [ticketData, commentsData, attachmentsData] = await Promise.all([
        ticketsApi.getById(ticketId),
        ticketsApi.getComments(ticketId, isStaff),
        ticketsApi.getAttachments(ticketId),
      ]);
      setTicket(ticketData);
      setComments(commentsData);
      setAttachments(attachmentsData);
    } catch (err) {
      setError('Failed to load ticket details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId, isStaff]);

  // Fetch staff list when modal opens
  const fetchStaffList = useCallback(async () => {
    if (staffList.length > 0) return; // Already loaded
    setStaffSearchLoading(true);
    try {
      const staff = await ticketAdminApi.listStaff(false);
      // Filter to only staff who can be assigned tickets
      setStaffList(staff.filter((s) => s.can_be_assigned_tickets && s.is_active));
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setStaffSearchLoading(false);
    }
  }, [staffList.length]);

  useEffect(() => {
    if (showAssignModal) {
      fetchStaffList();
    }
  }, [showAssignModal, fetchStaffList]);

  // Handle click outside to close staff dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (staffSearchRef.current && !staffSearchRef.current.contains(event.target as Node)) {
        setShowStaffDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter staff based on search query
  const filteredStaff = staffList.filter((staff) => {
    if (!staffSearchQuery) return true;
    const query = staffSearchQuery.toLowerCase();
    const name = getStaffDisplayName(staff).toLowerCase();
    const email = staff.profile?.email?.toLowerCase() || '';
    return name.includes(query) || email.includes(query);
  });

  const getStaffDisplayName = (staff: TicketStaffResponse) => {
    if (staff.profile) {
      const { first_name, last_name, email } = staff.profile;
      if (first_name || last_name) return `${first_name || ''} ${last_name || ''}`.trim();
      return email?.split('@')[0] || 'Unknown';
    }
    return 'Unknown';
  };

  const handleSelectStaff = (staff: TicketStaffResponse) => {
    setSelectedStaff(staff);
    setAssigneeId(staff.profile_id);
    setStaffSearchQuery('');
    setShowStaffDropdown(false);
  };

  const clearSelectedStaff = () => {
    setSelectedStaff(null);
    setAssigneeId('');
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !ticketId) return;

    setSubmittingComment(true);
    try {
      await ticketsApi.createComment(ticketId, {
        author_id: currentUserId,
        content: newComment.trim(),
        is_internal: isInternal,
      });
      setNewComment('');
      setIsInternal(false);
      // Refresh comments
      const updatedComments = await ticketsApi.getComments(ticketId, isStaff);
      setComments(updatedComments);
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusAction = async (action: 'resolve' | 'close' | 'reopen') => {
    if (!ticketId) return;
    setActionLoading(true);
    try {
      let updatedTicket: TicketType;
      switch (action) {
        case 'resolve':
          updatedTicket = await ticketsApi.resolve(ticketId);
          break;
        case 'close':
          updatedTicket = await ticketsApi.close(ticketId);
          break;
        case 'reopen':
          updatedTicket = await ticketsApi.reopen(ticketId);
          break;
      }
      setTicket(updatedTicket);
    } catch (err) {
      console.error(`Failed to ${action} ticket:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!ticketId || !assigneeId) return;
    setActionLoading(true);
    try {
      const updatedTicket = await ticketsApi.assign(ticketId, assigneeId);
      setTicket(updatedTicket);
      setShowAssignModal(false);
      setAssigneeId('');
      setSelectedStaff(null);
      setStaffSearchQuery('');
    } catch (err) {
      console.error('Failed to assign ticket:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setAssigneeId('');
    setSelectedStaff(null);
    setStaffSearchQuery('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAuthorName = (comment: TicketComment) => {
    // Check for guest comment first
    if ((comment as any).is_guest_comment && (comment as any).guest_author_name) {
      return (comment as any).guest_author_name;
    }
    // Regular user comment
    if (comment.author) {
      const { first_name, last_name, email } = comment.author;
      if (first_name || last_name) {
        return `${first_name || ''} ${last_name || ''}`.trim();
      }
      return email;
    }
    return 'Unknown';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="bg-red-500/10 border border-red-500 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-400">{error || 'Ticket not found'}</p>
        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-mono text-orange-400">{ticket.ticket_number}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${statusConfig[ticket.status].className}`}>
              {statusConfig[ticket.status].icon}
              {statusConfig[ticket.status].label}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${priorityConfig[ticket.priority].className}`}>
              {priorityConfig[ticket.priority].label}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">{ticket.title}</h1>
        </div>
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {isStaff ? 'Back to Tickets' : 'Back to Support'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Description</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Paperclip className="w-5 h-5" />
                Attachments ({attachments.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg"
                  >
                    <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{attachment.file_name}</p>
                      <p className="text-gray-500 text-xs">{formatFileSize(attachment.file_size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comments ({comments.length})
            </h3>

            {/* Comments List */}
            <div className="space-y-4 mb-6">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-lg ${
                      comment.is_internal
                        ? 'bg-yellow-500/5 border border-yellow-500/20'
                        : 'bg-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <span className="text-white font-medium">{getAuthorName(comment)}</span>
                          {comment.author?.role && (
                            <span className="ml-2 text-xs text-gray-500 capitalize">
                              ({comment.author.role.replace(/_/g, ' ')})
                            </span>
                          )}
                        </div>
                        {comment.is_internal && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-400 text-xs rounded-full">
                            <Lock className="w-3 h-3" />
                            Internal
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap pl-10">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* New Comment Form */}
            {ticket.status !== 'closed' && (
              <form onSubmit={handleSubmitComment} className="space-y-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
                <div className="flex items-center justify-between">
                  {isStaff && (
                    <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 text-orange-600 focus:ring-orange-500 bg-slate-700"
                      />
                      <Eye className="w-4 h-4" />
                      Internal note (staff only)
                    </label>
                  )}
                  <button
                    type="submit"
                    disabled={!newComment.trim() || submittingComment}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    {submittingComment ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Info */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Details</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Category
                </span>
                <span className="text-white capitalize">{ticket.category.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Department
                </span>
                <span className="text-white capitalize">{ticket.department.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Reporter
                </span>
                <span className="text-white">
                  {ticket.reporter
                    ? `${ticket.reporter.first_name || ''} ${ticket.reporter.last_name || ''}`.trim() || ticket.reporter.email
                    : 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Assigned To
                </span>
                <span className={ticket.assigned_to ? 'text-white' : 'text-gray-500 italic'}>
                  {ticket.assigned_to
                    ? `${ticket.assigned_to.first_name || ''} ${ticket.assigned_to.last_name || ''}`.trim() || ticket.assigned_to.email
                    : 'Unassigned'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Created
                </span>
                <span className="text-white text-sm">{formatDate(ticket.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Updated
                </span>
                <span className="text-white text-sm">{formatDate(ticket.updated_at)}</span>
              </div>
              {ticket.resolved_at && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Resolved
                  </span>
                  <span className="text-green-400 text-sm">{formatDate(ticket.resolved_at)}</span>
                </div>
              )}
              {ticket.event && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Event</span>
                  <span className="text-orange-400">{ticket.event.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {isStaff && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
              <div className="space-y-3">
                {/* Assign Button */}
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  {ticket.assigned_to ? 'Reassign' : 'Assign'}
                </button>

                {/* Status Actions */}
                {ticket.status === 'open' || ticket.status === 'in_progress' || ticket.status === 'awaiting_response' ? (
                  <>
                    <button
                      onClick={() => handleStatusAction('resolve')}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark Resolved
                    </button>
                    <button
                      onClick={() => handleStatusAction('close')}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Close Ticket
                    </button>
                  </>
                ) : ticket.status === 'resolved' ? (
                  <>
                    <button
                      onClick={() => handleStatusAction('close')}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Close Ticket
                    </button>
                    <button
                      onClick={() => handleStatusAction('reopen')}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reopen
                    </button>
                  </>
                ) : ticket.status === 'closed' ? (
                  <button
                    onClick={() => handleStatusAction('reopen')}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reopen Ticket
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">Assign Ticket</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Assign To
                </label>
                {selectedStaff ? (
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-700 border border-orange-500 rounded-lg">
                    <div className="flex-1">
                      <p className="text-white font-medium">{getStaffDisplayName(selectedStaff)}</p>
                      <p className="text-sm text-gray-400">{selectedStaff.profile?.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelectedStaff}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative" ref={staffSearchRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={staffSearchQuery}
                        onChange={(e) => {
                          setStaffSearchQuery(e.target.value);
                          setShowStaffDropdown(true);
                        }}
                        onFocus={() => setShowStaffDropdown(true)}
                        placeholder="Search staff by name or email..."
                        className="w-full pl-10 pr-10 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      {staffSearchLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                      )}
                    </div>
                    {showStaffDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {staffSearchLoading ? (
                          <div className="px-4 py-3 text-center text-gray-400">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                          </div>
                        ) : filteredStaff.length === 0 ? (
                          <div className="px-4 py-3 text-gray-400 text-sm">
                            {staffSearchQuery
                              ? `No staff found matching "${staffSearchQuery}"`
                              : 'No staff available for assignment'}
                          </div>
                        ) : (
                          filteredStaff.map((staff) => (
                            <button
                              key={staff.id}
                              type="button"
                              onClick={() => handleSelectStaff(staff)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-600 transition-colors border-b border-slate-600 last:border-b-0"
                            >
                              <p className="text-white font-medium">{getStaffDisplayName(staff)}</p>
                              <p className="text-sm text-gray-400">{staff.profile?.email}</p>
                              {staff.departments && staff.departments.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {staff.departments.map((d) => d.name).join(', ')}
                                </p>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={closeAssignModal}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!assigneeId || actionLoading}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketDetail;
