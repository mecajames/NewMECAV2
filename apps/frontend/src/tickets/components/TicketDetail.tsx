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
  Shield,
  Gavel,
  Briefcase,
  Store,
  Factory,
  Users,
  Star,
  RefreshCw,
  ChevronDown,
  AlertTriangle,
  Bookmark,
  Link as LinkIcon,
  Globe,
  PenLine,
} from 'lucide-react';
import {
  ticketsApi,
  Ticket as TicketType,
  TicketComment,
  TicketAttachment,
  TicketReporterContext,
  TicketUserReport,
  TicketStatus,
  TicketPriority,
} from '../tickets.api-client';
import * as ticketAdminApi from '../ticket-admin.api-client';
import {
  cannedResponsesApi,
  CannedResponse,
  resolveCannedResponse,
} from '../ticket-support-tools.api-client';
import { TICKET_QUICK_LINKS, TicketQuickLink } from '../ticketQuickLinks';
import { TicketStaffResponse, TicketDepartmentResponse, TICKET_STATUS_TRANSITIONS } from '@newmeca/shared';
import { uploadFile } from '@/api-client/uploads.api-client';
import { useDraftStorage } from '@/shared/hooks/useDraftStorage';
import { TicketAttachmentImage } from './TicketAttachmentImage';
import { TicketAttachmentLightbox } from './TicketAttachmentLightbox';
import { TicketPurchaseContextPanel } from './TicketPurchaseContextPanel';

// Admin-facing status pill. The pill name itself says who has the ball —
// no separate Waiting On badge anymore (it duplicated the status name).
const adminStatusConfig: Record<TicketStatus, { label: string; className: string; icon: React.ReactNode }> = {
  open: {
    label: 'New',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-orange-500/10 text-orange-400 border-orange-500',
    icon: <Clock className="w-4 h-4" />,
  },
  awaiting_response: {
    label: 'Pending Customer',
    className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500',
    icon: <MessageSquare className="w-4 h-4" />,
  },
  pending_internal_review: {
    label: 'Pending Internal Review',
    className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500',
    icon: <MessageSquare className="w-4 h-4" />,
  },
  escalated: {
    label: 'Escalated',
    className: 'bg-red-500/10 text-red-400 border-red-500',
    icon: <AlertCircle className="w-4 h-4" />,
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
  reopened: {
    label: 'Reopened',
    className: 'bg-pink-500/10 text-pink-400 border-pink-500',
    icon: <RefreshCw className="w-4 h-4" />,
  },
  closed: {
    label: 'Closed',
    className: 'bg-gray-500/10 text-gray-400 border-gray-500',
    icon: <XCircle className="w-4 h-4" />,
  },
};

// Customer-facing label set. Friendlier wording for the member ticket view
// (the same TicketDetail component is used in both contexts; we pick which
// config to use based on `isStaff`).
const customerStatusLabels: Record<TicketStatus, string> = {
  open: 'Submitted',
  in_progress: 'In Progress',
  awaiting_response: 'Awaiting Your Reply',
  pending_internal_review: 'Under Review',
  escalated: 'Escalated to Senior Support',
  on_hold: 'On Hold',
  resolved: 'Resolved',
  reopened: 'Reopened',
  closed: 'Closed',
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
  /**
   * Called after a staff member successfully submits a reply (plain reply or
   * reply + resolve/close/reassign). The admin view uses this to return to the
   * main ticket queue. Only fires when isStaff is true; the member-facing view
   * doesn't pass it, so members stay on their ticket.
   */
  onReplied?: () => void;
}

export function TicketDetail({
  ticketId: propTicketId,
  currentUserId,
  isStaff = false,
  onBack,
  onReplied,
}: TicketDetailProps) {
  const navigate = useNavigate();
  const { id: paramTicketId } = useParams<{ id: string }>();
  const ticketId = propTicketId || paramTicketId;

  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [reporterContext, setReporterContext] = useState<TicketReporterContext | null>(null);
  const [userReport, setUserReport] = useState<TicketUserReport | null>(null);
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
  // Canned responses (reply templates) for staff. Fetched once on
  // mount when the viewer is a staff member. Click to expand the
  // picker, click a row to insert the resolved body into the textarea.
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [cannedOpen, setCannedOpen] = useState(false);
  const cannedRef = useRef<HTMLDivElement>(null);
  // Quick links picker (staff only) — drop a known site URL into the
  // reply. Source list is the curated TICKET_QUICK_LINKS constant.
  const [quickLinkOpen, setQuickLinkOpen] = useState(false);
  const quickLinkRef = useRef<HTMLDivElement>(null);
  // "Save this reply as a canned response" flow (staff only). When the
  // checkbox is on we surface a small panel for the template title /
  // category / visibility flag, and on submit we POST the reply body to
  // the canned-responses API alongside posting the comment. All reset
  // after a successful submit. cannedShared = true → "Global" (usable by
  // all techs); false → "Private" (only this tech).
  const [saveAsCanned, setSaveAsCanned] = useState(false);
  const [cannedTitle, setCannedTitle] = useState('');
  const [cannedCategory, setCannedCategory] = useState('');
  const [cannedShared, setCannedShared] = useState(false);
  // Per-reply "don't append my signature" toggle (staff only). Default
  // off → the active signature is appended to the outbound email.
  const [skipSignature, setSkipSignature] = useState(false);
  // Member-facing "close this ticket after my reply" flow. When the checkbox
  // is on we also surface an optional 1–5 star rating + short feedback. All
  // three reset after a successful submit.
  const [closeOnSubmit, setCloseOnSubmit] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Admin-facing post-reply actions live in the Submit modal — the SINGLE
  // place where an admin chooses what happens with the ticket. The inline
  // form just collects the reply text + internal-note flag; the modal picks
  // one of 8 mutually-exclusive outcomes:
  //   reply         — post the reply, auto-shift status to Pending Customer
  //   resolve       — post + status → Resolved
  //   close         — post + status → Closed
  //   hold          — post + status → On Hold
  //   escalate      — post + status → Escalated
  //   internal      — post + status → Pending Internal Review
  //   reassign      — post, then reassign to another staff (inline picker)
  //   department    — post, then move to another department (inline picker)
  // Status outcomes are filtered against TICKET_STATUS_TRANSITIONS so an
  // option only appears when the move is allowed from the current status.
  type AdminSubmitChoice =
    | 'reply'
    | 'resolve'
    | 'close'
    | 'hold'
    | 'escalate'
    | 'internal'
    | 'reopen'
    | 'reassign'
    | 'escalate_reassign'
    | 'department';
  const [adminSubmitOpen, setAdminSubmitOpen] = useState(false);
  const [adminSubmitChoice, setAdminSubmitChoice] = useState<AdminSubmitChoice | null>(null);
  const [adminSubmitReassignId, setAdminSubmitReassignId] = useState('');
  const [adminSubmitDepartmentId, setAdminSubmitDepartmentId] = useState('');
  // Header status pill click-to-change menu (the no-reply housekeeping path).
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  // Header priority pill click-to-change menu (staff only).
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);
  const priorityMenuRef = useRef<HTMLDivElement>(null);
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

  // "Assign to me" quick-action on the Details sidebar (staff only).
  const [assigningSelf, setAssigningSelf] = useState(false);

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
      try {
        const report = await ticketsApi.getUserReport(ticketId);
        setUserReport(report);
      } catch (err) {
        console.error('Failed to load user report (non-critical):', err);
      }
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId, isStaff]);

  // Load canned responses once when the viewer is staff. Failures are
  // non-fatal - the picker just stays empty and the staff can compose
  // freehand.
  useEffect(() => {
    if (!isStaff) return;
    cannedResponsesApi.list()
      .then(setCannedResponses)
      .catch(() => { /* non-fatal */ });
  }, [isStaff]);

  // Close the canned picker on outside click.
  useEffect(() => {
    if (!cannedOpen) return;
    const onDown = (e: MouseEvent) => {
      if (cannedRef.current && !cannedRef.current.contains(e.target as Node)) {
        setCannedOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [cannedOpen]);

  // Close the quick-links picker on outside click.
  useEffect(() => {
    if (!quickLinkOpen) return;
    const onDown = (e: MouseEvent) => {
      if (quickLinkRef.current && !quickLinkRef.current.contains(e.target as Node)) {
        setQuickLinkOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [quickLinkOpen]);

  /**
   * Build the substitution context from the current ticket and the
   * viewing agent's name (passed in via props). Then resolve and
   * insert the template body into the reply textarea, preserving any
   * existing content the agent already typed.
   */
  const handleInsertCannedResponse = (response: CannedResponse) => {
    if (!ticket) return;
    const customerName = ticket.reporter
      ? `${ticket.reporter.first_name || ''} ${ticket.reporter.last_name || ''}`.trim()
        || ticket.reporter.email
        || 'Customer'
      : 'Customer';
    const resolved = resolveCannedResponse(response.body, {
      customerName,
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      ticketSubject: ticket.title,
      agentName: null, // resolved server-side from auth user when known; left as placeholder otherwise
    });
    setNewComment((prev) => prev ? `${prev}\n\n${resolved}` : resolved);
    setCannedOpen(false);
  };

  /**
   * Append a curated site link to the reply as "Label: URL". Replies are
   * plain text, so the label keeps the bare URL readable in context.
   */
  const handleInsertQuickLink = (link: TicketQuickLink) => {
    const snippet = `${link.label}: ${link.url}`;
    setNewComment((prev) => prev ? `${prev}\n${snippet}` : snippet);
    setQuickLinkOpen(false);
  };

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

  // Grab the ticket for yourself straight from the Details sidebar, without
  // opening the reply/assign modal. currentUserId is the viewer's profile id
  // (same id the assign endpoint expects for assigned_to_id).
  const handleAssignToMe = async () => {
    if (!ticketId || !currentUserId || assigningSelf) return;
    setAssigningSelf(true);
    try {
      const updated = await ticketsApi.assign(ticketId, currentUserId);
      setTicket(updated);
    } catch (err: any) {
      console.error('Failed to assign ticket to self:', err);
      const msg = err?.response?.data?.message || err?.message;
      alert(`Failed to assign this ticket to you${msg ? `: ${msg}` : '.'}`);
    } finally {
      setAssigningSelf(false);
    }
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
    | { kind: 'status'; status: TicketStatus }
    | { kind: 'reassign'; assigneeId: string }
    | { kind: 'escalate_reassign'; assigneeId: string }
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
        // Only staff replies carry a signature; honor the per-reply skip.
        skip_signature: isStaff && skipSignature,
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

      // Staff opted to save this reply as a reusable canned response.
      // Done as a separate call after the comment is persisted so a
      // failure here never blocks the reply itself. Requires a title and
      // some body text; screenshot-only replies have nothing to template.
      if (isStaff && saveAsCanned && cannedTitle.trim() && newComment.trim()) {
        try {
          const created = await cannedResponsesApi.create({
            title: cannedTitle.trim(),
            body: newComment.trim(),
            category: cannedCategory.trim() || null,
            is_shared: cannedShared,
          });
          // Surface it immediately in the picker without a refetch.
          setCannedResponses((prev) => [...prev, created]);
        } catch (cannedErr) {
          console.error('Reply posted, but saving the canned response failed:', cannedErr);
          alert('Reply posted, but we could not save it as a canned response. You can add it from the canned responses settings page.');
        }
      }

      clearCommentDraft();
      setIsInternal(false);
      setPendingAttachments([]);
      setSaveAsCanned(false);
      setCannedTitle('');
      setCannedCategory('');
      setCannedShared(false);
      setSkipSignature(false);

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
          if (adminAction.kind === 'status') {
            // changeStatus goes through the transition-matrix validator on
            // the backend. The auto-transition from createComment may have
            // moved the ticket to AWAITING_RESPONSE already; in that case
            // skip the redundant call.
            updated = await ticketsApi.changeStatus(ticketId, adminAction.status);
          } else if (adminAction.kind === 'reassign') {
            updated = await ticketsApi.assign(ticketId, adminAction.assigneeId);
          } else if (adminAction.kind === 'escalate_reassign') {
            // Two-step: escalate the status, then reassign to the chosen
            // staffer. assign() returns the freshest ticket, so keep its
            // result as the final state.
            await ticketsApi.changeStatus(ticketId, 'escalated' as TicketStatus);
            updated = await ticketsApi.assign(ticketId, adminAction.assigneeId);
          } else if (adminAction.kind === 'department') {
            updated = await ticketsApi.update(ticketId, {
              department_id: adminAction.departmentId,
            });
          }
          if (updated) setTicket(updated);
        } catch (actionErr: any) {
          console.error(`Reply posted, but ${adminAction.kind} action failed:`, actionErr);
          const msg = actionErr?.response?.data?.message || actionErr?.message;
          alert(
            `Reply posted, but the follow-up action failed${msg ? `: ${msg}` : '.'} Please retry from the status pill.`,
          );
        }
      }

      // Staff reply: hop back to the main ticket queue after ANY successful
      // reply (plain reply, or reply + resolve/close/reassign/department). The
      // member view doesn't pass onReplied, so it stays on the ticket and just
      // refreshes below.
      if (isStaff && onReplied) {
        onReplied();
        return;
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

  /**
   * Status pill click-menu handler — the no-reply housekeeping path. All
   * other status changes flow through the Submit Reply modal so the admin
   * can attach a comment. The backend's PATCH /status validates the
   * transition against TICKET_STATUS_TRANSITIONS either way.
   */
  const handlePillStatusChange = async (nextStatus: TicketStatus) => {
    if (!ticketId || !ticket) return;
    if (nextStatus === ticket.status) return;
    setStatusMenuOpen(false);
    setActionLoading(true);
    try {
      const updated = await ticketsApi.changeStatus(ticketId, nextStatus);
      setTicket(updated);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to change status';
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Staff-only: change the ticket priority directly from the header pill,
  // no reply required. Goes through PATCH /tickets/:id (update).
  const handlePillPriorityChange = async (nextPriority: TicketPriority) => {
    if (!ticketId || !ticket) return;
    if (nextPriority === ticket.priority) {
      setPriorityMenuOpen(false);
      return;
    }
    setPriorityMenuOpen(false);
    setActionLoading(true);
    try {
      const updated = await ticketsApi.update(ticketId, { priority: nextPriority });
      setTicket(updated);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to change priority';
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Member-facing reopen: the reporter can reopen their own resolved/closed
  // ticket. Backend authorizes reporter-or-admin.
  const handleReopen = async () => {
    if (!ticketId || !ticket) return;
    setActionLoading(true);
    try {
      const updated = await ticketsApi.reopen(ticketId);
      setTicket(updated);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to reopen ticket';
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Close the status pill menu on outside click. Uses mousedown so clicks
  // inside the menu still register before the menu disappears.
  useEffect(() => {
    if (!statusMenuOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setStatusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [statusMenuOpen]);

  // Close the priority pill menu on outside click.
  useEffect(() => {
    if (!priorityMenuOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (priorityMenuRef.current && !priorityMenuRef.current.contains(e.target as Node)) {
        setPriorityMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [priorityMenuOpen]);

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
            <span className="text-lg font-mono font-bold text-orange-400">{ticket.ticket_number}</span>
            {/* Status pill.
                - Staff: clickable. Opens an inline menu of allowed
                  transitions (the no-reply housekeeping path). Reply-driven
                  status changes go through the Submit Reply modal instead.
                - Members: static span — read-only.
                The pill name itself conveys who has the ball (Pending
                Customer / In Progress / Escalated / etc.) so there's no
                separate Waiting On badge. */}
            {isStaff ? (
              <div className="relative" ref={statusMenuRef}>
                <button
                  type="button"
                  onClick={() => setStatusMenuOpen((v) => !v)}
                  disabled={actionLoading}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border transition-opacity hover:opacity-80 disabled:opacity-50 ${adminStatusConfig[ticket.status].className}`}
                  aria-haspopup="menu"
                  aria-expanded={statusMenuOpen}
                  title="Click to change status without replying"
                >
                  {adminStatusConfig[ticket.status].icon}
                  {adminStatusConfig[ticket.status].label}
                  <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
                </button>
                {statusMenuOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full mt-1 z-30 min-w-[14rem] bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1"
                  >
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-gray-500">
                      Change status (no reply)
                    </div>
                    {(() => {
                      // Bridge the shared-enum / local-union TicketStatus
                      // mismatch with a single cast at the boundary.
                      const opts = (TICKET_STATUS_TRANSITIONS[ticket.status as TicketStatus] || []) as unknown as TicketStatus[];
                      if (opts.length === 0) {
                        return <div className="px-3 py-2 text-xs text-gray-500">No transitions available.</div>;
                      }
                      return opts.map((s) => (
                        <button
                          key={s}
                          type="button"
                          role="menuitem"
                          onClick={() => handlePillStatusChange(s)}
                          className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-slate-700 flex items-center gap-2"
                        >
                          {adminStatusConfig[s].icon}
                          {adminStatusConfig[s].label}
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${adminStatusConfig[ticket.status].className}`}>
                {adminStatusConfig[ticket.status].icon}
                {customerStatusLabels[ticket.status]}
              </span>
            )}
            {/* Priority pill.
                - Staff: clickable. Opens an inline menu to set priority
                  directly (no reply required).
                - Members: static span — read-only. */}
            {isStaff ? (
              <div className="relative" ref={priorityMenuRef}>
                <button
                  type="button"
                  onClick={() => setPriorityMenuOpen((v) => !v)}
                  disabled={actionLoading}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border transition-opacity hover:opacity-80 disabled:opacity-50 ${priorityConfig[ticket.priority].className}`}
                  aria-haspopup="menu"
                  aria-expanded={priorityMenuOpen}
                  title="Click to change priority"
                >
                  {priorityConfig[ticket.priority].label}
                  <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
                </button>
                {priorityMenuOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full mt-1 z-30 min-w-[10rem] bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1"
                  >
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-gray-500">
                      Change priority
                    </div>
                    {(Object.keys(priorityConfig) as TicketPriority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        role="menuitem"
                        onClick={() => handlePillPriorityChange(p)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 flex items-center gap-2"
                      >
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${priorityConfig[p].className}`}>
                          {priorityConfig[p].label}
                        </span>
                        {p === ticket.priority && <span className="ml-auto text-[10px] text-gray-400">current</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${priorityConfig[ticket.priority].className}`}>
                {priorityConfig[ticket.priority].label}
              </span>
            )}
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

          {/* Custom field answers submitted with the ticket */}
          {ticket.custom_field_answers && ticket.custom_field_answers.length > 0 && (() => {
            const purchaseAnswers = ticket.custom_field_answers.filter((a) => a.field_type === 'purchase_reference');
            const otherAnswers = ticket.custom_field_answers.filter((a) => a.field_type !== 'purchase_reference');
            return (
              <div className="mt-4 space-y-3">
                {otherAnswers.length > 0 && (
                  <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">Additional Details</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                      {otherAnswers.map((a) => (
                        <div key={a.field_id}>
                          <dt className="text-xs text-gray-400">{a.label}</dt>
                          <dd className="text-sm text-gray-200 break-words">
                            {a.value === null || a.value === ''
                              ? '—'
                              : Array.isArray(a.value)
                                ? a.value.join(', ')
                                : typeof a.value === 'boolean'
                                  ? (a.value ? 'Yes' : 'No')
                                  : String(a.value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
                {purchaseAnswers.map((a) => {
                  let purchase: any = null;
                  try {
                    purchase = typeof a.value === 'string' ? JSON.parse(a.value) : a.value;
                  } catch {
                    purchase = null;
                  }
                  if (!purchase || !purchase.type) return null;
                  return <TicketPurchaseContextPanel key={a.field_id} purchase={purchase} isStaff={isStaff} />;
                })}
              </div>
            );
          })()}

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

            {/* Member reopen: the reporter still needs help on a resolved/closed
                ticket. The reply form is hidden once closed, so this is their
                way back in. (Replying to a resolved ticket does NOT auto-reopen.)
                Members can only reopen within 7 days of close/resolve; after
                that they're directed to open a new ticket. */}
            {!isStaff && ticket.reporter_id === currentUserId &&
              (ticket.status === 'resolved' || ticket.status === 'closed') && (() => {
                const endedAt = ticket.closed_at || ticket.resolved_at;
                const canReopen = !endedAt
                  || (Date.now() - new Date(endedAt).getTime()) <= 7 * 24 * 60 * 60 * 1000;
                const stateWord = ticket.status === 'closed' ? 'closed' : 'resolved';
                return (
                  <div className="mb-4 p-4 bg-slate-800 border border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-gray-300 text-sm">
                      {canReopen
                        ? `This ticket is ${stateWord}. Still need help?`
                        : `This ticket was ${stateWord} more than 7 days ago. Please open a new ticket if you still need help.`}
                    </p>
                    {canReopen && (
                      <button
                        type="button"
                        onClick={handleReopen}
                        disabled={actionLoading}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reopen Ticket
                      </button>
                    )}
                  </div>
                );
              })()}

            {/* New Comment Form */}
            {ticket.status !== 'closed' && (
              <form onSubmit={handleSubmitComment} className="space-y-3">
                {/* Canned response picker (staff only). Click "Insert
                    canned response" to open the dropdown; pick a row
                    and the resolved body gets appended to the current
                    draft. Sized as a button instead of always-visible
                    UI so it stays out of the way when the staff is
                    composing freehand. */}
                {isStaff && (
                  <div className="flex flex-wrap items-center gap-2">
                    {cannedResponses.length > 0 && (
                      <div className="relative" ref={cannedRef}>
                        <button
                          type="button"
                          onClick={() => setCannedOpen(o => !o)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-gray-200 rounded-lg border border-slate-600"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Insert canned response
                          <ChevronDown className={`w-3 h-3 transition-transform ${cannedOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {cannedOpen && (
                          <div className="absolute z-30 top-full left-0 mt-1 w-96 max-h-80 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-2xl">
                            {(() => {
                              const grouped = new Map<string, CannedResponse[]>();
                              for (const r of cannedResponses) {
                                const cat = r.category || 'Uncategorized';
                                if (!grouped.has(cat)) grouped.set(cat, []);
                                grouped.get(cat)!.push(r);
                              }
                              return Array.from(grouped.entries()).map(([cat, items]) => (
                                <div key={cat}>
                                  <div className="px-3 py-1 text-xs text-gray-500 uppercase tracking-wider bg-slate-900/50">{cat}</div>
                                  {items.map(r => (
                                    <button
                                      key={r.id}
                                      type="button"
                                      onClick={() => handleInsertCannedResponse(r)}
                                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-700 border-b border-slate-700/50"
                                    >
                                      <div className="font-medium">{r.title}</div>
                                      <div className="text-xs text-gray-400 truncate">{r.body.replace(/\s+/g, ' ').slice(0, 80)}{r.body.length > 80 ? '...' : ''}</div>
                                    </button>
                                  ))}
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick links picker — drop a known site URL into the
                        reply as "Label: URL". Source is TICKET_QUICK_LINKS. */}
                    <div className="relative" ref={quickLinkRef}>
                      <button
                        type="button"
                        onClick={() => setQuickLinkOpen(o => !o)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-gray-200 rounded-lg border border-slate-600"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Insert link
                        <ChevronDown className={`w-3 h-3 transition-transform ${quickLinkOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {quickLinkOpen && (
                        <div className="absolute z-30 top-full left-0 mt-1 w-80 max-h-80 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-2xl">
                          {(() => {
                            const grouped = new Map<string, TicketQuickLink[]>();
                            for (const l of TICKET_QUICK_LINKS) {
                              if (!grouped.has(l.group)) grouped.set(l.group, []);
                              grouped.get(l.group)!.push(l);
                            }
                            return Array.from(grouped.entries()).map(([group, items]) => (
                              <div key={group}>
                                <div className="px-3 py-1 text-xs text-gray-500 uppercase tracking-wider bg-slate-900/50">{group}</div>
                                {items.map(l => (
                                  <button
                                    key={l.url}
                                    type="button"
                                    onClick={() => handleInsertQuickLink(l)}
                                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-700 border-b border-slate-700/50"
                                  >
                                    <div className="font-medium">{l.label}</div>
                                    <div className="text-xs text-gray-400 truncate">{l.url}</div>
                                  </button>
                                ))}
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Write a comment... (you can paste screenshots directly with Ctrl+V)"
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-y min-h-[88px]"
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
                        Internal Note
                      </label>
                    )}
                    {/* Staff-only: save the composed reply as a reusable
                        canned response. Checking it reveals the title /
                        category / share panel below the action row. */}
                    {isStaff && (
                      <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveAsCanned}
                          onChange={(e) => {
                            setSaveAsCanned(e.target.checked);
                            if (!e.target.checked) {
                              setCannedTitle('');
                              setCannedCategory('');
                              setCannedShared(false);
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-600 text-orange-600 focus:ring-orange-500 bg-slate-700"
                        />
                        <Bookmark className="w-4 h-4" />
                        Save as canned response
                      </label>
                    )}
                    {/* Staff-only: skip appending the signature on this one
                        reply. Unchecked (default) = signature is appended. */}
                    {isStaff && (
                      <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={skipSignature}
                          onChange={(e) => setSkipSignature(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-600 text-orange-600 focus:ring-orange-500 bg-slate-700"
                        />
                        <PenLine className="w-4 h-4" />
                        No signature
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

                {/* Canned-response save panel. Shown to staff once they've
                    ticked "Save as canned response" — collects the template
                    title (required), an optional category, and whether to
                    share it with the rest of the team. The reply body is
                    taken from the textarea above at submit time. */}
                {isStaff && saveAsCanned && (
                  <div className="bg-slate-700/40 border border-slate-600 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
                      <Bookmark className="w-4 h-4 text-orange-400" />
                      Save this reply as a canned response
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">
                          Title <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={cannedTitle}
                          onChange={(e) => setCannedTitle(e.target.value)}
                          maxLength={120}
                          placeholder="e.g. Membership renewal instructions"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">
                          Category <span className="text-gray-500 font-normal">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={cannedCategory}
                          onChange={(e) => setCannedCategory(e.target.value)}
                          maxLength={60}
                          placeholder="e.g. Memberships"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                    {/* Visibility: Private (only this tech) vs Global
                        (usable by all techs). Maps to is_shared. */}
                    <div>
                      <span className="block text-xs font-medium text-gray-300 mb-1">Visibility</span>
                      <div className="inline-flex rounded-lg border border-slate-600 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setCannedShared(false)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${!cannedShared ? 'bg-orange-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Private
                        </button>
                        <button
                          type="button"
                          onClick={() => setCannedShared(true)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${cannedShared ? 'bg-orange-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
                        >
                          <Globe className="w-3.5 h-3.5" />
                          Global
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {cannedShared ? 'Usable by all support techs.' : 'Only you can use this template.'}
                      </p>
                    </div>
                    {!cannedTitle.trim() && (
                      <p className="text-xs text-amber-400">
                        Add a title to save this reply as a canned response.
                      </p>
                    )}
                  </div>
                )}

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
                <span className="text-white text-right">
                  {ticket.reporter
                    ? `${ticket.reporter.first_name || ''} ${ticket.reporter.last_name || ''}`.trim() || ticket.reporter.email
                    : ticket.guest_name
                      ? `${ticket.guest_name}`
                      : ticket.guest_email || 'Unknown'}
                  {!ticket.reporter && (ticket.guest_name || ticket.guest_email) && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 bg-slate-600 text-gray-300 rounded align-middle">Guest</span>
                  )}
                </span>
              </div>
              {/* Guest contact email — reporter is null for guest tickets, so
                  surface the email they entered so staff can identify/contact them. */}
              {!ticket.reporter && ticket.guest_email && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Guest Email
                  </span>
                  <a href={`mailto:${ticket.guest_email}`} className="text-orange-400 hover:text-orange-300 text-right break-all">
                    {ticket.guest_email}
                  </a>
                </div>
              )}
              {/* Staff-only: this guest ticket was submitted by a recognised
                  member (e.g. an expired member via the guest flow). Link out
                  to their full profile for context. */}
              {isStaff && ticket.linked_profile_hint && (
                <div className="flex items-start justify-between gap-2 p-3 -mx-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <span className="text-amber-300 flex items-center gap-2 flex-shrink-0 text-sm">
                    <User className="w-4 h-4" />
                    Known member
                  </span>
                  <a
                    href={`/admin/members/${ticket.linked_profile_hint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-300 hover:text-amber-200 underline-offset-2 hover:underline flex items-center gap-1 text-right text-sm"
                  >
                    View member profile
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Assigned To
                </span>
                <span className="flex items-center gap-2 text-right">
                  <span className={ticket.assigned_to ? 'text-white' : 'text-gray-500 italic'}>
                    {ticket.assigned_to
                      ? `${ticket.assigned_to.first_name || ''} ${ticket.assigned_to.last_name || ''}`.trim() || ticket.assigned_to.email
                      : 'Unassigned'}
                    {ticket.assigned_to && ticket.assigned_to.id === currentUserId && (
                      <span className="ml-1 text-xs text-gray-400">(you)</span>
                    )}
                  </span>
                  {/* Staff quick-action: claim the ticket without opening the
                      assign modal. Hidden once it's already assigned to you. */}
                  {isStaff && ticket.assigned_to?.id !== currentUserId && (
                    <button
                      type="button"
                      onClick={handleAssignToMe}
                      disabled={assigningSelf}
                      className="text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/40 hover:bg-orange-500/20 disabled:opacity-50 flex items-center gap-1 flex-shrink-0"
                    >
                      {assigningSelf ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <UserPlus className="w-3 h-3" />
                      )}
                      Assign to me
                    </button>
                  )}
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
                <div className="flex items-start justify-between gap-2">
                  <span className="text-gray-400 flex-shrink-0">Event</span>
                  <div className="flex flex-col items-end gap-1 min-w-0">
                    <a
                      href={`/events/${ticket.event.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 hover:text-orange-300 underline-offset-2 hover:underline inline-flex items-center gap-1 text-right truncate max-w-full"
                      title="Open event details in a new tab"
                    >
                      {ticket.event.name}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                    <a
                      href={`/results?eventId=${ticket.event.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline inline-flex items-center gap-1"
                      title="Open results for this event in a new tab"
                    >
                      View results
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
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

          {/* User Report — everything we know about whoever filed this ticket
              (works for guests + members): linked account, membership status/
              expiry, last login, and the IP/browser captured at submission. */}
          {isStaff && userReport && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                User Report
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Submitter</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-gray-200">
                    {userReport.submitter_type === 'member_active' ? 'Active member'
                      : userReport.submitter_type === 'member' ? 'Member'
                      : userReport.submitter_type === 'guest_active_member' ? 'Guest · has active account'
                      : userReport.submitter_type === 'guest_expired_member' ? 'Guest · expired member'
                      : userReport.submitter_type === 'guest_known' ? 'Guest · known account'
                      : 'Guest · no account'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-gray-400 flex-shrink-0">Name</span>
                  <span className="text-white text-right">{userReport.name || '—'}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-gray-400 flex-shrink-0">Email</span>
                  {userReport.email ? (
                    <a href={`mailto:${userReport.email}`} className="text-orange-400 hover:text-orange-300 text-right break-all">{userReport.email}</a>
                  ) : <span className="text-white">—</span>}
                </div>

                {userReport.known_account ? (
                  <div className="mt-1 pt-3 border-t border-slate-700 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-gray-400 flex-shrink-0">MECA account</span>
                      <a
                        href={`/admin/members/${userReport.known_account.profile_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300 text-right break-all flex items-center gap-1 justify-end"
                      >
                        {userReport.known_account.full_name || userReport.known_account.email || 'View profile'}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                    {userReport.known_account.meca_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">MECA ID</span>
                        <span className="text-white font-mono">{userReport.known_account.meca_id}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Membership</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        userReport.known_account.membership_status === 'active' ? 'bg-green-500/10 text-green-400'
                          : userReport.known_account.membership_status === 'expired' ? 'bg-red-500/10 text-red-400'
                          : 'bg-slate-700 text-gray-300'
                      }`}>
                        {userReport.known_account.membership_status}
                      </span>
                    </div>
                    {userReport.known_account.membership_expiry && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">{userReport.known_account.membership_status === 'expired' ? 'Expired' : 'Expires'}</span>
                        <span className="text-white">{formatDate(userReport.known_account.membership_expiry)}</span>
                      </div>
                    )}
                    {userReport.known_account.member_since && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Member since</span>
                        <span className="text-white">{formatDate(userReport.known_account.member_since)}</span>
                      </div>
                    )}
                    {userReport.known_account.login_banned && (
                      <div className="text-xs px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-red-300">⚠ Login banned</div>
                    )}
                    {userReport.known_account.last_login_at && (
                      <div className="pt-2 border-t border-slate-700/60 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Last login</span>
                          <span className="text-white">{formatDate(userReport.known_account.last_login_at)}</span>
                        </div>
                        {userReport.known_account.last_login_ip && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Login IP</span>
                            <span className="text-white font-mono">{userReport.known_account.last_login_ip}</span>
                          </div>
                        )}
                        {userReport.known_account.last_login_user_agent && (
                          <div>
                            <span className="text-gray-400 block mb-0.5">Login device</span>
                            <span className="text-gray-300 text-xs break-words">{userReport.known_account.last_login_user_agent}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 pt-3 border-t border-slate-700 text-gray-400 text-xs">
                    No MECA account is associated with this email.
                  </div>
                )}

                <div className="mt-1 pt-3 border-t border-slate-700 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">This ticket submission</p>
                  {userReport.submission.created_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Submitted</span>
                      <span className="text-white">{formatDate(userReport.submission.created_at)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">IP address</span>
                    <span className="text-white font-mono">{userReport.submission.ip_address || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Browser / device</span>
                    <span className="text-gray-300 text-xs break-words">{userReport.submission.user_agent || '—'}</span>
                  </div>
                </div>
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
        const needsAssignee =
          adminSubmitChoice === 'reassign' || adminSubmitChoice === 'escalate_reassign';
        const needsDepartment = adminSubmitChoice === 'department';
        const canSubmit =
          !!adminSubmitChoice &&
          (!needsAssignee || !!adminSubmitReassignId) &&
          (!needsDepartment || !!adminSubmitDepartmentId) &&
          !submittingComment;
        // Allowed status moves from the current ticket state — drives which
        // "Reply & X" cards appear so we never offer an invalid transition.
        // String-compare to bridge the two TicketStatus types (the shared
        // enum from @newmeca/shared vs the local string union in
        // tickets.api-client) without forcing a wider refactor.
        const allowedNextStatuses: string[] = (TICKET_STATUS_TRANSITIONS[ticket.status as TicketStatus] || []) as unknown as string[];
        const canMoveTo = (target: string) => allowedNextStatuses.includes(target);

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

              {/* Outcome cards. Status-changing options are filtered against
                  the transition matrix so we never surface a move the
                  backend would reject. Reply / Reassign / Department are
                  always available; "Reply only" still triggers the
                  auto-shift to Pending Customer on active tickets. */}
              <div className="space-y-2">
                {choiceOption(
                  'reply',
                  <Send className="w-4 h-4 text-orange-400" />,
                  `${Noun} only`,
                  `Post the ${noun}. Status auto-shifts to Pending Customer on active tickets.`,
                )}
                {canMoveTo('resolved') && choiceOption(
                  'resolve',
                  <CheckCircle className="w-4 h-4 text-green-400" />,
                  `${Noun} & Resolve`,
                  `Post the ${noun}, then mark the ticket as Resolved.`,
                )}
                {canMoveTo('on_hold') && choiceOption(
                  'hold',
                  <PauseCircle className="w-4 h-4 text-purple-400" />,
                  `${Noun} & Place on Hold`,
                  `Post the ${noun}, then put the ticket on hold (waiting on an external party).`,
                )}
                {canMoveTo('escalated') && choiceOption(
                  'escalate',
                  <AlertTriangle className="w-4 h-4 text-red-400" />,
                  `${Noun} & Escalate`,
                  `Post the ${noun}, then flag the ticket for senior support.`,
                )}
                {canMoveTo('escalated') && choiceOption(
                  'escalate_reassign',
                  <AlertTriangle className="w-4 h-4 text-red-400" />,
                  `${Noun} & Escalate & Reassign`,
                  `Post the ${noun}, escalate the ticket, then assign it to the chosen staff member.`,
                )}
                {canMoveTo('pending_internal_review') && choiceOption(
                  'internal',
                  <Eye className="w-4 h-4 text-indigo-400" />,
                  `${Noun} & Send for Internal Review`,
                  `Post the ${noun}, then mark as waiting on another internal team.`,
                )}
                {canMoveTo('reopened') && choiceOption(
                  'reopen',
                  <RefreshCw className="w-4 h-4 text-pink-400" />,
                  `${Noun} & Reopen`,
                  `Post the ${noun}, then reopen the ticket.`,
                )}
                {canMoveTo('closed') && choiceOption(
                  'close',
                  <XCircle className="w-4 h-4 text-gray-400" />,
                  `${Noun} & Close`,
                  `Post the ${noun}, then close the ticket (terminal).`,
                )}
                {choiceOption(
                  'reassign',
                  <UserPlus className="w-4 h-4 text-orange-400" />,
                  `${Noun} & Reassign`,
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
                    // Map each modal choice to the post-reply action that
                    // handleSubmitComment will run. Status outcomes funnel
                    // through { kind: 'status', status: X } which calls the
                    // PATCH /status validator on the backend.
                    let action: AdminAction | undefined;
                    switch (adminSubmitChoice) {
                      case 'resolve':
                        action = { kind: 'status', status: 'resolved' };
                        break;
                      case 'close':
                        action = { kind: 'status', status: 'closed' };
                        break;
                      case 'hold':
                        action = { kind: 'status', status: 'on_hold' };
                        break;
                      case 'escalate':
                        action = { kind: 'status', status: 'escalated' };
                        break;
                      case 'internal':
                        action = { kind: 'status', status: 'pending_internal_review' };
                        break;
                      case 'reopen':
                        action = { kind: 'status', status: 'reopened' };
                        break;
                      case 'reassign':
                        action = { kind: 'reassign', assigneeId: adminSubmitReassignId };
                        break;
                      case 'escalate_reassign':
                        action = { kind: 'escalate_reassign', assigneeId: adminSubmitReassignId };
                        break;
                      case 'department':
                        action = { kind: 'department', departmentId: adminSubmitDepartmentId };
                        break;
                      case 'reply':
                      default:
                        // No explicit action — createComment's auto-transition
                        // handles the status shift for active tickets.
                        action = undefined;
                    }
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
