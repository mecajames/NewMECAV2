import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
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
  Lock,
  Eye,
  Search,
  Loader2,
  X,
  Mail,
  Hash,
  Phone,
  ExternalLink,
  Pencil,
  PauseCircle,
  PlayCircle,
  Shield,
  Gavel,
  Briefcase,
  Store,
  Factory,
  Users,
  Star,
} from 'lucide-react';
import {
  ticketsApi,
  Ticket as TicketType,
  TicketComment,
  TicketAttachment,
  TicketReporterContext,
  TicketStatus,
  TicketPriority,
} from '../tickets.api-client';
import * as ticketAdminApi from '../ticket-admin.api-client';
import { TicketStaffResponse, TicketDepartmentResponse } from '@newmeca/shared';
import { uploadFile } from '@/api-client/uploads.api-client';
import { useDraftStorage } from '@/shared/hooks/useDraftStorage';
import { TicketAttachmentImage } from './TicketAttachmentImage';
import { TicketAttachmentLightbox } from './TicketAttachmentLightbox';

// Status styling. Labels match the raw enum — the derived "Waiting On"
// badge handles the who-has-the-ball framing separately.
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
  on_hold: {
    label: 'On Hold',
    className: 'bg-purple-500/10 text-purple-400 border-purple-500',
    icon: <PauseCircle className="w-4 h-4" />,
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

// Derived "who has the ball" indicator. Same logic as in the admin list so
// the badge means the same thing in both places. on_hold/resolved/closed
// don't render a badge — the status pill already says it.
const getWaitingOn = (status: TicketStatus): { label: string; className: string } | null => {
  switch (status) {
    case 'open':
    case 'in_progress':
      return { label: 'Waiting on Support', className: 'bg-blue-500/10 text-blue-300 border-blue-500/50' };
    case 'awaiting_response':
      return { label: 'Waiting on Customer', className: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/50' };
    default:
      return null;
  }
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
  const [reporterContext, setReporterContext] = useState<TicketReporterContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comment form state.
  // newComment uses useDraftStorage so a page refresh (e.g. the stale-chunk
  // reload triggered by main.tsx after a deploy) doesn't wipe what the user
  // was typing. The key is ticket-scoped so different tickets keep
  // independent drafts.
  const draftCommentKey = `ticket-comment-draft:${ticketId || 'none'}`;
  const [newComment, setNewComment, clearCommentDraft] = useDraftStorage<string>(
    draftCommentKey,
    '',
  );
  const [isInternal, setIsInternal] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  // Member-facing "close this ticket after my reply" flow. When the checkbox
  // is on we also surface an optional 1–5 star rating + short feedback. All
  // three reset after a successful submit.
  const [closeOnSubmit, setCloseOnSubmit] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Admin-facing post-reply actions live in the Submit modal. The inline
  // form just collects the reply text + internal-note flag; the modal
  // picks one of: reply only, reply & close, reply & reassign (with
  // staff picker), reply & change department (with department picker).
  type AdminSubmitChoice = 'reply' | 'close' | 'reassign' | 'department';
  const [adminSubmitOpen, setAdminSubmitOpen] = useState(false);
  const [adminSubmitChoice, setAdminSubmitChoice] = useState<AdminSubmitChoice | null>(null);
  const [adminSubmitReassignId, setAdminSubmitReassignId] = useState('');
  const [adminSubmitDepartmentId, setAdminSubmitDepartmentId] = useState('');
  const [departments, setDepartments] = useState<TicketDepartmentResponse[]>([]);

  // Image lightbox state. Index is into a filtered list of image-only
  // attachments built at render time. Stays null while closed.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // Pending attachments — files queued for upload alongside the next
  // comment. Each gets uploaded to Supabase Storage after the comment
  // is created so we can link them via comment_id.
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Action states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Edit mode — lets the reporter fix typos/category mistakes after submit.
  // Available to the reporter (any non-closed status) and to admins. The
  // three editable fields use useDraftStorage so an unexpected reload
  // mid-edit doesn't undo the user's changes.
  const [editMode, setEditMode] = useState(false);
  const editDraftKey = (suffix: string) => `ticket-edit-draft:${ticketId || 'none'}:${suffix}`;
  const [editTitle, setEditTitle, clearEditTitle] = useDraftStorage<string>(editDraftKey('title'), '');
  const [editDescription, setEditDescription, clearEditDescription] = useDraftStorage<string>(editDraftKey('description'), '');
  const [editCategory, setEditCategory, clearEditCategory] = useDraftStorage<string>(editDraftKey('category'), 'general');
  const [editSaving, setEditSaving] = useState(false);

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

    // Reporter context is admin-only and non-critical — fire after the
    // main load so a failure here doesn't block ticket viewing.
    if (isStaff) {
      try {
        const ctx = await ticketsApi.getReporterContext(ticketId);
        setReporterContext(ctx);
      } catch (err) {
        console.error('Failed to load reporter context (non-critical):', err);
      }
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
    // Pre-load staff + departments for admins so the Submit modal's
    // Reassign / Change Department options open instantly. Both are
    // small admin-only fetches; fine to do on every detail-page load
    // for staff.
    if (showAssignModal || isStaff) {
      fetchStaffList();
    }
    if (isStaff) {
      ticketAdminApi
        .listDepartments(false)
        .then((d) => setDepartments(d))
        .catch((err) => console.error('Failed to load departments:', err));
    }
  }, [showAssignModal, isStaff, fetchStaffList]);

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

  // Validate image attachments client-side before we even hit the network.
  // Mirrors the backend constraints on 'ticket-attachments' so the user
  // gets immediate feedback.
  const TICKET_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
  const TICKET_ATTACHMENT_MIME_ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  const validateAttachment = (file: File): string | null => {
    if (!TICKET_ATTACHMENT_MIME_ALLOWED.includes(file.type)) {
      return `${file.name}: only images (JPG, PNG, GIF, WebP) are allowed`;
    }
    if (file.size > TICKET_ATTACHMENT_MAX_BYTES) {
      return `${file.name}: file too large (max 10MB)`;
    }
    return null;
  };

  const addAttachments = (files: File[]) => {
    const valid: File[] = [];
    const errors: string[] = [];
    for (const f of files) {
      const err = validateAttachment(f);
      if (err) errors.push(err);
      else valid.push(f);
    }
    if (errors.length > 0) {
      alert(errors.join('\n'));
    }
    if (valid.length > 0) {
      setPendingAttachments(prev => [...prev, ...valid]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    addAttachments(Array.from(e.target.files));
    // Clear the input so the same file can be re-selected after removal
    e.target.value = '';
  };

  // Paste handler — turns screenshots from Win+Shift+S / Cmd+Ctrl+Shift+4
  // into attachments without forcing the user to save-then-pick.
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          // Clipboard images don't carry filenames — synthesize one so the
          // attachment is identifiable in the thread.
          const ext = item.type.split('/')[1] || 'png';
          const synthetic = new File(
            [blob],
            `pasted-screenshot-${Date.now()}.${ext}`,
            { type: item.type },
          );
          imageFiles.push(synthetic);
        }
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault(); // suppress the default image-data paste into the textarea
      addAttachments(imageFiles);
    }
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const startEdit = () => {
    if (!ticket) return;
    // If a draft already exists (typically from a reload mid-edit), keep
    // it — otherwise we'd overwrite the user's unsaved changes with the
    // server's stale state. First-time entry into edit mode populates
    // from the current ticket.
    const hasDraft = !!(
      sessionStorage.getItem(editDraftKey('title')) ||
      sessionStorage.getItem(editDraftKey('description'))
    );
    if (!hasDraft) {
      setEditTitle(ticket.title);
      setEditDescription(ticket.description);
      setEditCategory(ticket.category);
    }
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    // Drop the in-progress draft when the user explicitly cancels — if they
    // wanted to keep their work in progress they would just close the tab.
    clearEditTitle();
    clearEditDescription();
    clearEditCategory();
  };

  const saveEdit = async () => {
    if (!ticketId || !ticket) return;
    if (!editTitle.trim() || !editDescription.trim()) {
      alert('Title and description are required.');
      return;
    }
    setEditSaving(true);
    try {
      const updated = await ticketsApi.update(ticketId, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory as any,
      });
      setTicket(updated);
      setEditMode(false);
      // Save succeeded — wipe the draft so the next edit starts fresh from
      // the new server state rather than the now-stale draft.
      clearEditTitle();
      clearEditDescription();
      clearEditCategory();
    } catch (err: any) {
      console.error('Failed to save ticket edits:', err);
      const msg = err?.response?.data?.message || 'Failed to save changes.';
      alert(msg);
    } finally {
      setEditSaving(false);
    }
  };

  /**
   * Posts the reply (and its attachments), then runs any caller-supplied
   * post-action: the admin Submit modal drives this with `adminAction`
   * (close / reassign / department change), and the member's Close & rate
   * panel uses `closeOnSubmit` state directly. Each post-action wraps its
   * own try so the persisted reply isn't dropped if a later step fails.
   */
  type AdminAction =
    | { kind: 'close' }
    | { kind: 'reassign'; assigneeId: string }
    | { kind: 'department'; departmentId: string };

  const handleSubmitComment = async (
    e: React.FormEvent,
    adminAction?: AdminAction,
  ) => {
    e.preventDefault();
    if (!ticketId) return;
    // Require either text or at least one attachment.
    if (!newComment.trim() && pendingAttachments.length === 0) return;

    setSubmittingComment(true);
    try {
      const createdComment = await ticketsApi.createComment(ticketId, {
        author_id: currentUserId,
        content: newComment.trim() || '(screenshot attached)',
        is_internal: isInternal,
      });

      // Upload attachments and link them to the new comment. Upload errors
      // are surfaced but don't unwind the comment — the text already went
      // through, so we keep the partial result and let the user retry the
      // attachment.
      if (pendingAttachments.length > 0) {
        for (const file of pendingAttachments) {
          try {
            const uploaded = await uploadFile(file, 'ticket-attachments', ticketId);
            // Persist bucket + storage_path alongside file_path so the
            // backend proxy-download endpoint can fetch the file without
            // parsing the legacy public URL. file_path is kept as a
            // fallback for older clients still on the prior flow.
            await ticketsApi.createAttachment(ticketId, {
              uploader_id: currentUserId,
              comment_id: createdComment.id,
              file_name: file.name,
              file_path: uploaded.publicUrl,
              bucket: uploaded.bucket,
              storage_path: uploaded.storagePath,
              file_size: uploaded.fileSize,
              mime_type: uploaded.mimeType,
            });
          } catch (uploadErr) {
            console.error(`Failed to upload attachment ${file.name}:`, uploadErr);
            alert(`Failed to upload ${file.name}. You can try re-attaching it on a follow-up reply.`);
          }
        }
      }

      clearCommentDraft();
      setIsInternal(false);
      setPendingAttachments([]);

      // Member opted to close + (optionally) rate after this reply. Done as
      // a second call rather than rolling it into createComment so the
      // permission boundary stays clean: only the reporter can hit
      // close-by-reporter, and the staff createComment path doesn't get
      // burdened with reporter-only fields.
      if (closeOnSubmit && !isStaff) {
        try {
          const closed = await ticketsApi.closeByReporter(ticketId, {
            rating: rating ?? undefined,
            feedback: feedback.trim() || undefined,
          });
          setTicket(closed);
          // Reset the close panel so a stale state doesn't survive into a
          // later edit if the ticket gets reopened.
          setCloseOnSubmit(false);
          setRating(null);
          setFeedback('');
        } catch (closeErr) {
          console.error('Reply posted, but close failed:', closeErr);
          alert('Reply posted, but we could not close the ticket. Please try the close action again.');
        }
      }

      // Admin post-reply action picked from the Submit modal. Only one
      // action per submit; the reply is already persisted at this point
      // so a failure here just leaves the comment in place.
      if (isStaff && adminAction) {
        try {
          let updated: TicketType | null = null;
          if (adminAction.kind === 'close') {
            updated = await ticketsApi.close(ticketId);
          } else if (adminAction.kind === 'reassign') {
            updated = await ticketsApi.assign(ticketId, adminAction.assigneeId);
          } else if (adminAction.kind === 'department') {
            updated = await ticketsApi.update(ticketId, {
              department_id: adminAction.departmentId,
            });
          }
          if (updated) setTicket(updated);
        } catch (actionErr) {
          console.error(`Reply posted, but ${adminAction.kind} action failed:`, actionErr);
          alert(
            `Reply posted, but the follow-up "${adminAction.kind}" action failed. Please retry it from the ticket actions.`,
          );
        }
      }

      // Refresh comments + attachments so the new entries appear.
      const [updatedComments, updatedAttachments] = await Promise.all([
        ticketsApi.getComments(ticketId, isStaff),
        ticketsApi.getAttachments(ticketId),
      ]);
      setComments(updatedComments);
      setAttachments(updatedAttachments);
    } catch (err) {
      console.error('Failed to submit comment:', err);
      alert('Failed to submit reply. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusAction = async (action: 'resolve' | 'close' | 'reopen' | 'hold' | 'resume') => {
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
        case 'hold':
          updatedTicket = await ticketsApi.hold(ticketId);
          break;
        case 'resume':
          // Resume = move back to in_progress via reopen (server treats
          // it as "back to active work"). Avoids a dedicated endpoint.
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
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <span className="text-sm font-mono text-orange-400">{ticket.ticket_number}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${statusConfig[ticket.status].className}`}>
              {statusConfig[ticket.status].icon}
              {statusConfig[ticket.status].label}
            </span>
            {/* "Who has the ball" — derived from status so it can't drift.
                Hidden once a ticket is resolved/closed (nobody owes a reply). */}
            {(() => {
              const wo = getWaitingOn(ticket.status);
              return wo ? (
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${wo.className}`}>
                  {wo.label}
                </span>
              ) : null;
            })()}
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

      {/* Action buttons — horizontal row above the ticket body. Admin-only.
          Conditional set mirrors the original sidebar Actions card. */}
      {isStaff && (
        <div className="flex flex-wrap items-center gap-2 -mt-2">
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {ticket.assigned_to ? 'Reassign' : 'Assign'}
          </button>

          {(ticket.status === 'open' || ticket.status === 'in_progress' || ticket.status === 'awaiting_response') && (
            <>
              <button
                onClick={() => handleStatusAction('hold')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                Place on Hold
              </button>
              <button
                onClick={() => handleStatusAction('resolve')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark Resolved
              </button>
              <button
                onClick={() => handleStatusAction('close')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Close Ticket
              </button>
            </>
          )}

          {ticket.status === 'on_hold' && (
            <>
              <button
                onClick={() => handleStatusAction('resume')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Resume
              </button>
              <button
                onClick={() => handleStatusAction('resolve')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark Resolved
              </button>
              <button
                onClick={() => handleStatusAction('close')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Close Ticket
              </button>
            </>
          )}

          {ticket.status === 'resolved' && (
            <>
              <button
                onClick={() => handleStatusAction('close')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Close Ticket
              </button>
              <button
                onClick={() => handleStatusAction('reopen')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reopen
              </button>
            </>
          )}

          {ticket.status === 'closed' && (
            <button
              onClick={() => handleStatusAction('reopen')}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reopen Ticket
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Description</h3>
              {/* Reporter or admin can edit the original submission as long
                  as the ticket isn't closed. Lets members fix typos or wrong
                  category without opening a new ticket. */}
              {!editMode && ticket.status !== 'closed' && (isStaff || ticket.reporter_id === currentUserId) && (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-gray-200 rounded-md transition-colors border border-slate-600"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
              )}
            </div>

            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="general">General</option>
                    <option value="membership">Membership</option>
                    <option value="event_registration">Event Registration</option>
                    <option value="payment">Payment</option>
                    <option value="technical">Technical</option>
                    <option value="competition_results">Competition Results</option>
                    <option value="event_hosting">Event Hosting</option>
                    <option value="account">Account</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-y"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={cancelEdit}
                    disabled={editSaving}
                    className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={editSaving || !editTitle.trim() || !editDescription.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors disabled:opacity-50"
                  >
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-300 whitespace-pre-wrap">{ticket.description}</p>
            )}
          </div>

          {/* Attachments */}
          {attachments.length > 0 && ticketId && (() => {
            // Build the image-only list once per render so the lightbox
            // index lines up with what we hand it. Non-image attachments
            // keep the legacy "open in new tab" behavior.
            const imageAttachments = attachments.filter((a) =>
              (a.mime_type ?? '').startsWith('image/'),
            );
            const imageItems = imageAttachments.map((a) => ({
              attachmentId: a.id,
              fileName: a.file_name,
              fileSize: a.file_size,
            }));
            return (
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Paperclip className="w-5 h-5" />
                  Attachments ({attachments.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {attachments.map((attachment) => {
                    const isImage = (attachment.mime_type ?? '').startsWith('image/');
                    const imgIdx = isImage
                      ? imageAttachments.findIndex((a) => a.id === attachment.id)
                      : -1;
                    return (
                      <TicketAttachmentImage
                        key={attachment.id}
                        ticketId={ticketId}
                        attachmentId={attachment.id}
                        fileName={attachment.file_name}
                        mimeType={attachment.mime_type}
                        fileSizeLabel={formatFileSize(attachment.file_size)}
                        onOpen={
                          isImage && imgIdx >= 0
                            ? () => setLightboxIndex(imgIdx)
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
                {lightboxIndex !== null && imageItems.length > 0 && (
                  <TicketAttachmentLightbox
                    ticketId={ticketId}
                    items={imageItems}
                    startIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                  />
                )}
              </div>
            );
          })()}

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
              <form onSubmit={handleSubmitComment} className="space-y-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Write a comment... (you can paste screenshots directly with Ctrl+V)"
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />

                {/* Pending attachment previews */}
                {pendingAttachments.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {pendingAttachments.map((file, idx) => {
                      const url = URL.createObjectURL(file);
                      return (
                        <div
                          key={`${file.name}-${idx}`}
                          className="relative group bg-slate-700 rounded-lg overflow-hidden border border-slate-600"
                        >
                          <img
                            src={url}
                            alt={file.name}
                            className="w-full h-24 object-cover"
                            onLoad={() => URL.revokeObjectURL(url)}
                          />
                          <div className="px-2 py-1 text-xs text-gray-300 truncate" title={file.name}>
                            {file.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => removePendingAttachment(idx)}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-90"
                            aria-label={`Remove ${file.name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Hidden file input drives the attach button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-gray-200 rounded-lg transition-colors border border-slate-600"
                    >
                      <Paperclip className="w-4 h-4" />
                      Attach screenshot
                    </button>
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
                    {/* Member-only: lets the reporter close their own ticket
                        as part of the reply, and optionally rate the support
                        response. Hidden from staff (admins close via the
                        action buttons up top). */}
                    {!isStaff && ticket.reporter_id === currentUserId && (
                      <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={closeOnSubmit}
                          onChange={(e) => {
                            setCloseOnSubmit(e.target.checked);
                            // Drop the rating panel state if the user
                            // unchecks — keeping stale values around could
                            // confuse a re-check later.
                            if (!e.target.checked) {
                              setRating(null);
                              setFeedback('');
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-600 text-orange-600 focus:ring-orange-500 bg-slate-700"
                        />
                        <CheckCircle className="w-4 h-4" />
                        Close this ticket after my reply
                      </label>
                    )}
                  </div>
                  {/* Admins go through the Submit modal so a single button
                      can drive the whole "reply + maybe close / reassign /
                      change department" decision tree. Members keep the
                      direct Send button — their inline checkbox + rating
                      panel is the entire member-side decision tree. */}
                  {isStaff ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          (!newComment.trim() && pendingAttachments.length === 0) ||
                          submittingComment
                        ) return;
                        // Reset modal state every time we open it so a
                        // previous selection doesn't carry over into a new
                        // reply (especially after a successful submit).
                        setAdminSubmitChoice(null);
                        setAdminSubmitReassignId('');
                        setAdminSubmitDepartmentId('');
                        setAdminSubmitOpen(true);
                      }}
                      disabled={
                        (!newComment.trim() && pendingAttachments.length === 0) ||
                        submittingComment
                      }
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      {submittingComment ? 'Submitting…' : 'Submit'}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={
                        (!newComment.trim() && pendingAttachments.length === 0) ||
                        submittingComment
                      }
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      {submittingComment
                        ? 'Sending…'
                        : closeOnSubmit
                          ? 'Send & Close'
                          : 'Send'}
                    </button>
                  )}
                </div>

                {/* Optional rating + feedback panel. Only shown to the
                    reporter once they've opted to close — keeps the form
                    compact for the common reply case. Rating is optional. */}
                {closeOnSubmit && !isStaff && ticket.reporter_id === currentUserId && (
                  <div className="bg-slate-700/40 border border-slate-600 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        How was the support you received?{' '}
                        <span className="text-gray-500 font-normal">(optional)</span>
                      </label>
                      <div
                        className="flex items-center gap-1"
                        onMouseLeave={() => setHoverRating(null)}
                      >
                        {[1, 2, 3, 4, 5].map((value) => {
                          const filled = (hoverRating ?? rating ?? 0) >= value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setRating(rating === value ? null : value)}
                              onMouseEnter={() => setHoverRating(value)}
                              aria-label={`Rate ${value} ${value === 1 ? 'star' : 'stars'}`}
                              className="p-1 rounded hover:bg-slate-600/40 transition-colors"
                            >
                              <Star
                                className={`w-7 h-7 transition-colors ${
                                  filled
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-500'
                                }`}
                              />
                            </button>
                          );
                        })}
                        {rating !== null && (
                          <button
                            type="button"
                            onClick={() => setRating(null)}
                            className="ml-2 text-xs text-gray-400 hover:text-gray-200 underline-offset-2 hover:underline"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Any feedback for our team?{' '}
                        <span className="text-gray-500 font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={2}
                        maxLength={2000}
                        placeholder="What worked well, or what could be better?"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      />
                    </div>
                  </div>
                )}
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
              {ticket.closed_at && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Closed
                  </span>
                  <span className="text-gray-300 text-sm">{formatDate(ticket.closed_at)}</span>
                </div>
              )}
              {/* Customer satisfaction — only set when the reporter closed
                  via the member reply form's "Close & rate" flow. Surfaced
                  to everyone who can see the ticket so the reporter can see
                  their own rating after the fact, not just admins. */}
              {(ticket.customer_rating || ticket.customer_feedback) && (
                <div className="pt-3 mt-1 border-t border-slate-700 space-y-2">
                  {ticket.customer_rating && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Customer Rating
                      </span>
                      <span className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star
                            key={value}
                            className={`w-4 h-4 ${
                              value <= (ticket.customer_rating ?? 0)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </span>
                    </div>
                  )}
                  {ticket.customer_feedback && (
                    <div>
                      <div className="text-gray-400 text-xs mb-1">Customer Feedback</div>
                      <div className="text-gray-200 text-sm whitespace-pre-wrap bg-slate-700/40 rounded-md px-3 py-2">
                        {ticket.customer_feedback}
                      </div>
                    </div>
                  )}
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

          {/* Reporter Info — admin-only enriched member context */}
          {isStaff && reporterContext?.profile && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Reporter Info
              </h3>
              <div className="space-y-3 text-sm">
                {/* Name → admin member page */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-gray-400 flex items-center gap-2 flex-shrink-0">
                    <User className="w-4 h-4" />
                    Member
                  </span>
                  <a
                    href={`/admin/members/${reporterContext.profile.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300 underline-offset-2 hover:underline flex items-center gap-1 text-right"
                  >
                    {reporterContext.profile.full_name}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {reporterContext.profile.meca_id != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      MECA ID
                    </span>
                    <span className="text-white font-mono">{reporterContext.profile.meca_id}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </span>
                  <a
                    href={`mailto:${reporterContext.profile.email}`}
                    className="text-white hover:text-orange-300 break-all text-right"
                  >
                    {reporterContext.profile.email}
                  </a>
                </div>
                {reporterContext.profile.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone
                    </span>
                    <a
                      href={`tel:${reporterContext.profile.phone}`}
                      className="text-white hover:text-orange-300"
                    >
                      {reporterContext.profile.phone}
                    </a>
                  </div>
                )}

                {/* Memberships */}
                {reporterContext.memberships.length > 0 && (
                  <div className="pt-3 mt-3 border-t border-slate-700">
                    <div className="text-gray-400 mb-2 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Membership{reporterContext.memberships.length > 1 ? 's' : ''}
                    </div>
                    <div className="space-y-2">
                      {reporterContext.memberships.map((m) => {
                        const isExpired = m.end_date && new Date(m.end_date) < new Date();
                        return (
                          <div key={m.id} className="bg-slate-700/50 rounded-md px-3 py-2">
                            <div className="text-white">
                              {m.type_name || 'Unknown type'}
                              {m.category && <span className="text-gray-400 text-xs ml-2">({m.category})</span>}
                            </div>
                            <div className={`text-xs ${isExpired ? 'text-red-400' : 'text-gray-400'}`}>
                              {isExpired ? 'Expired' : 'Expires'}: {m.end_date ? new Date(m.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                              {' · '}
                              <span className="capitalize">{m.payment_status}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Roles / business affiliations */}
                {(reporterContext.profile.role === 'admin' ||
                  reporterContext.profile.is_staff ||
                  reporterContext.flags?.is_judge ||
                  reporterContext.flags?.is_event_director ||
                  reporterContext.flags?.is_retailer ||
                  reporterContext.flags?.is_manufacturer ||
                  (reporterContext.flags?.teams?.length || 0) > 0) && (
                  <div className="pt-3 mt-3 border-t border-slate-700">
                    <div className="text-gray-400 mb-2">Roles</div>
                    <div className="flex flex-wrap gap-1.5">
                      {reporterContext.profile.role === 'admin' && (
                        <span className="px-2 py-0.5 text-xs bg-red-900/40 text-red-300 rounded font-semibold uppercase tracking-wide flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      )}
                      {reporterContext.profile.is_staff && reporterContext.profile.role !== 'admin' && (
                        <span className="px-2 py-0.5 text-xs bg-purple-900/40 text-purple-300 rounded font-semibold uppercase tracking-wide flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Staff
                        </span>
                      )}
                      {reporterContext.flags?.is_judge && (
                        <a
                          href="/admin/judges"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 text-xs bg-blue-900/40 text-blue-300 rounded font-semibold uppercase tracking-wide flex items-center gap-1 hover:bg-blue-900/60"
                        >
                          <Gavel className="w-3 h-3" /> Judge
                        </a>
                      )}
                      {reporterContext.flags?.is_event_director && (
                        <a
                          href="/admin/event-directors"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 text-xs bg-orange-900/40 text-orange-300 rounded font-semibold uppercase tracking-wide flex items-center gap-1 hover:bg-orange-900/60"
                        >
                          <Briefcase className="w-3 h-3" /> Event Director
                        </a>
                      )}
                      {reporterContext.flags?.is_retailer && (
                        <a
                          href="/admin/business-listings"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 text-xs bg-emerald-900/40 text-emerald-300 rounded font-semibold uppercase tracking-wide flex items-center gap-1 hover:bg-emerald-900/60"
                        >
                          <Store className="w-3 h-3" /> Retailer
                        </a>
                      )}
                      {reporterContext.flags?.is_manufacturer && (
                        <a
                          href="/admin/business-listings"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 text-xs bg-cyan-900/40 text-cyan-300 rounded font-semibold uppercase tracking-wide flex items-center gap-1 hover:bg-cyan-900/60"
                        >
                          <Factory className="w-3 h-3" /> Manufacturer
                        </a>
                      )}
                      {reporterContext.flags?.teams?.map((t) => (
                        <span
                          key={t.team_id}
                          title={`Team role: ${t.role}`}
                          className="px-2 py-0.5 text-xs bg-indigo-900/40 text-indigo-300 rounded font-semibold uppercase tracking-wide flex items-center gap-1"
                        >
                          <Users className="w-3 h-3" /> {t.team_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Permissions */}
                {(reporterContext.profile.can_apply_judge ||
                  reporterContext.profile.can_apply_event_director ||
                  reporterContext.profile.maintenance_login_allowed ||
                  reporterContext.profile.login_banned) && (
                  <div className="pt-3 mt-3 border-t border-slate-700">
                    <div className="text-gray-400 mb-2">Permissions</div>
                    <div className="flex flex-wrap gap-1.5">
                      {reporterContext.profile.can_apply_judge && (
                        <span className="px-2 py-0.5 text-xs bg-slate-700 text-gray-200 rounded">Can Apply: Judge</span>
                      )}
                      {reporterContext.profile.can_apply_event_director && (
                        <span className="px-2 py-0.5 text-xs bg-slate-700 text-gray-200 rounded">Can Apply: ED</span>
                      )}
                      {reporterContext.profile.maintenance_login_allowed && (
                        <span className="px-2 py-0.5 text-xs bg-purple-900/40 text-purple-300 rounded">Maintenance Login</span>
                      )}
                      {reporterContext.profile.login_banned && (
                        <span className="px-2 py-0.5 text-xs bg-red-900/40 text-red-300 rounded">Login Banned</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Admin Submit Modal — funnels every admin reply through a single
          decision: just reply, reply + close, reply + reassign, or
          reply + change department. The Submit button only enables once a
          choice (and any required sub-selection) is made. Labels swap to
          "Internal note" wording when the staff-only checkbox is on, so
          an admin can leave a private note for the next assignee and
          reassign in the same submit. */}
      {adminSubmitOpen && (() => {
        const needsAssignee = adminSubmitChoice === 'reassign';
        const needsDepartment = adminSubmitChoice === 'department';
        const canSubmit =
          !!adminSubmitChoice &&
          (!needsAssignee || !!adminSubmitReassignId) &&
          (!needsDepartment || !!adminSubmitDepartmentId) &&
          !submittingComment;

        // Verb the modal uses for the comment itself. Drives every label
        // so we don't say "Reply" when the staff-only checkbox is on.
        const noun = isInternal ? 'internal note' : 'reply';
        const Noun = isInternal ? 'Internal note' : 'Reply';

        const choiceOption = (
          value: AdminSubmitChoice,
          icon: React.ReactNode,
          label: string,
          description: string,
        ) => (
          <button
            type="button"
            onClick={() => setAdminSubmitChoice(value)}
            className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
              adminSubmitChoice === value
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-slate-600 hover:border-slate-500 bg-slate-700/40'
            }`}
          >
            <div className="flex items-center gap-2 text-white">
              {icon}
              <span className="font-medium">{label}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1 ml-6">{description}</p>
          </button>
        );

        const closeModal = () => {
          if (submittingComment) return;
          setAdminSubmitOpen(false);
        };

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <div className="bg-slate-800 rounded-xl shadow-xl w-full max-w-lg p-6 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-1">
                Submit {Noun}
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Choose what should happen after the {noun} is posted.
              </p>

              {/* Visible-only when internal-note is on: an explicit reminder
                  so the admin can tell at a glance the customer won't see
                  the contents of this submission. */}
              {isInternal && (
                <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-xs">
                  <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    This is an internal note — only staff can see it. The
                    customer will not be emailed about it.
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {choiceOption(
                  'reply',
                  <Send className="w-4 h-4 text-orange-400" />,
                  `${Noun} only`,
                  `Post the ${noun} with no follow-up action.`,
                )}
                {choiceOption(
                  'close',
                  <XCircle className="w-4 h-4 text-orange-400" />,
                  `${Noun} & Close`,
                  `Post the ${noun}, then close the ticket.`,
                )}
                {choiceOption(
                  'reassign',
                  <UserPlus className="w-4 h-4 text-orange-400" />,
                  `${Noun} & Assign`,
                  `Post the ${noun}, then assign the ticket to another staff member.`,
                )}
                {choiceOption(
                  'department',
                  <Building className="w-4 h-4 text-orange-400" />,
                  `${Noun} & Change Department`,
                  `Post the ${noun}, then move the ticket to a different department.`,
                )}
              </div>

              {/* Sub-pickers appear inline once the matching option is
                  selected. Kept inside the modal so the admin doesn't have
                  to bounce around multiple dialogs. */}
              {needsAssignee && (
                <div className="mt-4">
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Assign to
                  </label>
                  <select
                    value={adminSubmitReassignId}
                    onChange={(e) => setAdminSubmitReassignId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select a staff member…</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.profile_id}>
                        {getStaffDisplayName(s)}
                        {s.profile_id === ticket.assigned_to_id ? ' (current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {needsDepartment && (
                <div className="mt-4">
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Move to department
                  </label>
                  <select
                    value={adminSubmitDepartmentId}
                    onChange={(e) => setAdminSubmitDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select a department…</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                        {d.id === ticket.department_id ? ' (current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submittingComment}
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={async (e) => {
                    if (!canSubmit) return;
                    let action: AdminAction | undefined;
                    if (adminSubmitChoice === 'close') action = { kind: 'close' };
                    else if (adminSubmitChoice === 'reassign')
                      action = { kind: 'reassign', assigneeId: adminSubmitReassignId };
                    else if (adminSubmitChoice === 'department')
                      action = { kind: 'department', departmentId: adminSubmitDepartmentId };
                    // 'reply' leaves action undefined.
                    await handleSubmitComment(e, action);
                    setAdminSubmitOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {submittingComment ? 'Submitting…' : `Submit ${Noun}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
