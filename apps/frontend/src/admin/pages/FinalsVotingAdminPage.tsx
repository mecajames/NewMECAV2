import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, X, ArrowLeft, Vote, Upload, Loader2,
  ChevronDown, ChevronUp, Play, Square, CheckCircle, BarChart3, Eye,
  Users, MessageSquare, Copy, Layers, Gavel, MapPin, Building2, Factory, UserCheck,
  PauseCircle, PlayCircle, Ban, EyeOff, CircleSlash, FileEdit, Clock,
} from 'lucide-react';
import { VotingSessionStatus, VotingAnswerType } from '@newmeca/shared';
import type { VotingSessionResults } from '@newmeca/shared';
import { finalsVotingApi, uploadVotingItemImage } from '../../api-client/finals-voting.api-client';
import { getStorageUrl } from '@/lib/storage';
import { useSeasons } from '@/shared/contexts';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// =============================================================================
// Types
// =============================================================================

interface SessionData {
  id: string;
  title: string;
  description?: string;
  status: VotingSessionStatus;
  suspended?: boolean;
  startDate: string;
  endDate: string;
  resultsPublishDate?: string;
  resultsFinalizedAt?: string;
  season: { id: string; name: string };
  categories: CategoryData[];
  createdAt: string;
}

// Buckets shown as accordion tables on the index. A session lives in exactly
// one bucket, with `suspended` taking precedence over its status — a paused
// live session shows up under Disabled, not Live.
type AccordionKey = 'creating' | 'pending' | 'live' | 'disabled' | 'canceled' | 'completed';

interface AccordionConfig {
  key: AccordionKey;
  label: string;
  description: string;
  color: string;       // border + header tint
  icon: typeof Vote;
}

const ACCORDION_ORDER: AccordionConfig[] = [
  { key: 'creating',  label: 'Creating',  description: 'Drafts being built — no categories or questions yet', color: 'border-slate-600',  icon: FileEdit },
  { key: 'pending',   label: 'Pending',   description: 'Drafts that are configured and ready to open',         color: 'border-amber-700',  icon: Clock },
  { key: 'live',      label: 'Live',      description: 'Currently open for member voting',                     color: 'border-green-700',  icon: Play },
  { key: 'disabled',  label: 'Disabled',  description: 'Suspended — hidden from public regardless of dates',   color: 'border-purple-700', icon: EyeOff },
  { key: 'canceled',  label: 'Canceled',  description: 'Aborted by an admin — eligible for full deletion',     color: 'border-rose-700',   icon: CircleSlash },
  { key: 'completed', label: 'Completed', description: 'Voting period ended (closed or finalized)',            color: 'border-blue-700',   icon: CheckCircle },
];

function categorizeSession(s: SessionData): AccordionKey {
  // Suspended overrides everything except final terminal states (canceled is
  // intentionally a separate bucket so admins can see what's been retired).
  if (s.suspended && s.status !== VotingSessionStatus.CANCELED) return 'disabled';
  if (s.status === VotingSessionStatus.CANCELED) return 'canceled';
  if (s.status === VotingSessionStatus.OPEN) return 'live';
  if (s.status === VotingSessionStatus.CLOSED || s.status === VotingSessionStatus.FINALIZED) return 'completed';
  // DRAFT — split by whether the admin has started populating it
  if (s.status === VotingSessionStatus.DRAFT) {
    return (s.categories?.length ?? 0) === 0 ? 'creating' : 'pending';
  }
  return 'creating';
}

interface CategoryData {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  questions: QuestionData[];
}

interface QuestionData {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  answerType: VotingAnswerType;
  displayOrder: number;
}

// =============================================================================
// Constants
// =============================================================================

const statusConfig: Record<VotingSessionStatus, { label: string; color: string; icon: typeof Vote }> = {
  [VotingSessionStatus.DRAFT]: { label: 'Draft', color: 'bg-slate-500/20 text-slate-400', icon: Pencil },
  [VotingSessionStatus.OPEN]: { label: 'Open', color: 'bg-green-500/20 text-green-400', icon: Play },
  [VotingSessionStatus.CLOSED]: { label: 'Closed', color: 'bg-yellow-500/20 text-yellow-400', icon: Square },
  [VotingSessionStatus.FINALIZED]: { label: 'Finalized', color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle },
  [VotingSessionStatus.CANCELED]: { label: 'Canceled', color: 'bg-rose-500/20 text-rose-400', icon: CircleSlash },
};

const CHART_COLORS = ['#f97316', '#06b6d4', '#8b5cf6', '#22c55e', '#eab308', '#ec4899', '#14b8a6', '#f43f5e'];

const answerTypeConfig: Record<VotingAnswerType, { label: string; color: string; icon: typeof Users }> = {
  [VotingAnswerType.MEMBER]: { label: 'Member', color: 'bg-blue-500/20 text-blue-400', icon: Users },
  [VotingAnswerType.JUDGE]: { label: 'Judge', color: 'bg-amber-500/20 text-amber-400', icon: Gavel },
  [VotingAnswerType.EVENT_DIRECTOR]: { label: 'Event Director', color: 'bg-teal-500/20 text-teal-400', icon: UserCheck },
  [VotingAnswerType.RETAILER]: { label: 'Retailer', color: 'bg-green-500/20 text-green-400', icon: Building2 },
  [VotingAnswerType.MANUFACTURER]: { label: 'Manufacturer', color: 'bg-indigo-500/20 text-indigo-400', icon: Factory },
  [VotingAnswerType.VENUE]: { label: 'Venue', color: 'bg-pink-500/20 text-pink-400', icon: MapPin },
  [VotingAnswerType.TEAM]: { label: 'Team', color: 'bg-cyan-500/20 text-cyan-400', icon: Users },
  [VotingAnswerType.TEXT]: { label: 'Text Answer', color: 'bg-purple-500/20 text-purple-400', icon: MessageSquare },
};

// =============================================================================
// Component
// =============================================================================

export default function FinalsVotingAdminPage() {
  const navigate = useNavigate();
  const { seasons } = useSeasons();

  // State
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // View state
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  // Accordion buckets default to: live + pending open, others collapsed —
  // the buckets admins act on most often are visible by default.
  const [expandedAccordions, setExpandedAccordions] = useState<Set<AccordionKey>>(
    new Set<AccordionKey>(['live', 'pending', 'creating']),
  );

  // Session modal
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionData | null>(null);
  const [sessionForm, setSessionForm] = useState({
    season_id: '',
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    results_publish_date: '',
  });

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    display_order: 0,
  });

  // Question modal
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionData | null>(null);
  const [questionCategoryId, setQuestionCategoryId] = useState<string>('');
  const [questionForm, setQuestionForm] = useState({
    category_id: '',
    title: '',
    description: '',
    image_url: '',
    answer_type: VotingAnswerType.MEMBER as VotingAnswerType,
    display_order: 0,
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Results preview
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<VotingSessionResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // Clone session modal
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneSourceId, setCloneSourceId] = useState<string>('');
  const [cloneForm, setCloneForm] = useState({
    season_id: '',
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    results_publish_date: '',
  });

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'session' | 'category' | 'question'; id: string; name: string } | null>(null);

  // =========================================================================
  // Data Loading
  // =========================================================================

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await finalsVotingApi.getAdminSessions();
      setSessions(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetail = async (id: string) => {
    try {
      const data = await finalsVotingApi.getAdminSession(id);
      setSelectedSession(data);
      setSessions(prev => prev.map(s => s.id === id ? data : s));
      // Auto-expand all categories so questions are visible immediately
      if (data.categories && data.categories.length > 0) {
        setExpandedCategories(new Set(data.categories.map((c: CategoryData) => c.id)));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    }
  };

  // =========================================================================
  // Session Handlers
  // =========================================================================

  const toLocalDatetime = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openCreateSession = () => {
    setEditingSession(null);
    const now = new Date();
    const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const threeWeeks = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
    setSessionForm({
      season_id: seasons.find(s => s.is_current || s.isCurrent)?.id || seasons[0]?.id || '',
      title: '',
      description: '',
      start_date: toLocalDatetime(now),
      end_date: toLocalDatetime(twoWeeks),
      results_publish_date: toLocalDatetime(threeWeeks),
    });
    setShowSessionModal(true);
  };

  const openEditSession = (session: SessionData) => {
    setEditingSession(session);
    setSessionForm({
      season_id: session.season.id,
      title: session.title,
      description: session.description || '',
      start_date: toLocalDatetime(new Date(session.startDate)),
      end_date: toLocalDatetime(new Date(session.endDate)),
      results_publish_date: session.resultsPublishDate ? toLocalDatetime(new Date(session.resultsPublishDate)) : '',
    });
    setShowSessionModal(true);
  };

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingSession) {
        await finalsVotingApi.updateSession(editingSession.id, {
          title: sessionForm.title,
          description: sessionForm.description || undefined,
          start_date: new Date(sessionForm.start_date),
          end_date: new Date(sessionForm.end_date),
          results_publish_date: sessionForm.results_publish_date ? new Date(sessionForm.results_publish_date) : null,
        });
      } else {
        const newSession = await finalsVotingApi.createSession({
          season_id: sessionForm.season_id,
          title: sessionForm.title,
          description: sessionForm.description || undefined,
          start_date: new Date(sessionForm.start_date),
          end_date: new Date(sessionForm.end_date),
          results_publish_date: sessionForm.results_publish_date ? new Date(sessionForm.results_publish_date) : null,
        });
        // Auto-navigate into the new session detail view
        setShowSessionModal(false);
        await loadSessions();
        setSelectedSession(newSession);
        await loadSessionDetail(newSession.id);
        return;
      }
      setShowSessionModal(false);
      await loadSessions();
      if (selectedSession) {
        await loadSessionDetail(selectedSession.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save session');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (sessionId: string, action: 'open' | 'close' | 'finalize') => {
    setSaving(true);
    setError(null);
    try {
      if (action === 'open') await finalsVotingApi.openSession(sessionId);
      else if (action === 'close') await finalsVotingApi.closeSession(sessionId);
      else if (action === 'finalize') await finalsVotingApi.finalizeSession(sessionId);
      await loadSessions();
      if (selectedSession?.id === sessionId) {
        await loadSessionDetail(sessionId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${action} session`);
    } finally {
      setSaving(false);
    }
  };

  const handleSuspendToggle = async (session: SessionData) => {
    const willSuspend = !session.suspended;
    if (willSuspend && !window.confirm(
      `Suspend "${session.title}"?\n\nThe session will stop appearing on the public homepage and members will not be able to vote — even if it is currently live. Reversible.`,
    )) return;
    setSaving(true);
    setError(null);
    try {
      if (willSuspend) await finalsVotingApi.suspendSession(session.id);
      else             await finalsVotingApi.unsuspendSession(session.id);
      await loadSessions();
      if (selectedSession?.id === session.id) {
        await loadSessionDetail(session.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update suspension');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSession = async (session: SessionData) => {
    if (!window.confirm(
      `Cancel "${session.title}"?\n\nThis moves the session to the Canceled bucket. ` +
      `It will be hidden from the public and can be permanently deleted afterward. ` +
      `This is reversible only by an admin via the database.`,
    )) return;
    setSaving(true);
    setError(null);
    try {
      await finalsVotingApi.cancelSession(session.id);
      await loadSessions();
      if (selectedSession?.id === session.id) {
        await loadSessionDetail(session.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel session');
    } finally {
      setSaving(false);
    }
  };

  const toggleAccordion = (key: AccordionKey) => {
    setExpandedAccordions(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // =========================================================================
  // Category Handlers
  // =========================================================================

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', display_order: (selectedSession?.categories.length || 0) });
    setShowCategoryModal(true);
  };

  const openEditCategory = (cat: CategoryData) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description || '', display_order: cat.displayOrder });
    setShowCategoryModal(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    setSaving(true);
    setError(null);
    try {
      if (editingCategory) {
        await finalsVotingApi.updateCategory(editingCategory.id, {
          name: categoryForm.name,
          description: categoryForm.description || undefined,
          display_order: categoryForm.display_order,
        });
      } else {
        await finalsVotingApi.createCategory({
          session_id: selectedSession.id,
          name: categoryForm.name,
          description: categoryForm.description || undefined,
          display_order: categoryForm.display_order,
        });
      }
      setShowCategoryModal(false);
      await loadSessionDetail(selectedSession.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // Question Handlers
  // =========================================================================

  const openCreateQuestion = (categoryId: string) => {
    setEditingQuestion(null);
    setQuestionCategoryId(categoryId);
    const cat = selectedSession?.categories.find(c => c.id === categoryId);
    setQuestionForm({
      category_id: categoryId,
      title: '',
      description: '',
      image_url: '',
      answer_type: VotingAnswerType.MEMBER,
      display_order: cat?.questions.length || 0,
    });
    setShowQuestionModal(true);
  };

  const openEditQuestion = (question: QuestionData, categoryId: string) => {
    setEditingQuestion(question);
    setQuestionCategoryId(categoryId);
    setQuestionForm({
      category_id: categoryId,
      title: question.title,
      description: question.description || '',
      image_url: question.imageUrl || '',
      answer_type: question.answerType,
      display_order: question.displayOrder,
    });
    setShowQuestionModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (PNG, JPEG, GIF, or WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const imageUrl = await uploadVotingItemImage(file);
      setQuestionForm(prev => ({ ...prev, image_url: imageUrl }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    setSaving(true);
    setError(null);
    try {
      if (editingQuestion) {
        await finalsVotingApi.updateQuestion(editingQuestion.id, {
          category_id: questionForm.category_id !== questionCategoryId ? questionForm.category_id : undefined,
          title: questionForm.title,
          description: questionForm.description || undefined,
          image_url: questionForm.image_url || undefined,
          answer_type: questionForm.answer_type,
          display_order: questionForm.display_order,
        });
      } else {
        await finalsVotingApi.createQuestion({
          category_id: questionCategoryId,
          title: questionForm.title,
          description: questionForm.description || undefined,
          image_url: questionForm.image_url || undefined,
          answer_type: questionForm.answer_type,
          display_order: questionForm.display_order,
        });
      }
      setShowQuestionModal(false);
      await loadSessionDetail(selectedSession.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // Delete Handler
  // =========================================================================

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setError(null);
    try {
      if (deleteConfirm.type === 'session') {
        await finalsVotingApi.deleteSession(deleteConfirm.id);
        setSelectedSession(null);
        await loadSessions();
      } else if (deleteConfirm.type === 'category') {
        await finalsVotingApi.deleteCategory(deleteConfirm.id);
        if (selectedSession) await loadSessionDetail(selectedSession.id);
      } else if (deleteConfirm.type === 'question') {
        await finalsVotingApi.deleteQuestion(deleteConfirm.id);
        if (selectedSession) await loadSessionDetail(selectedSession.id);
      }
      setDeleteConfirm(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  // =========================================================================
  // Results Preview
  // =========================================================================

  const loadResults = async (sessionId: string) => {
    setLoadingResults(true);
    try {
      const data = await finalsVotingApi.getAdminResults(sessionId);
      setResults(data);
      setShowResults(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoadingResults(false);
    }
  };

  // =========================================================================
  // Clone Session
  // =========================================================================

  const openCloneModal = (sourceId: string, sourceTitle: string) => {
    setCloneSourceId(sourceId);
    const now = new Date();
    const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const threeWeeks = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
    setCloneForm({
      season_id: seasons.find(s => s.is_current || s.isCurrent)?.id || seasons[0]?.id || '',
      title: `${sourceTitle} (Copy)`,
      description: '',
      start_date: toLocalDatetime(now),
      end_date: toLocalDatetime(twoWeeks),
      results_publish_date: toLocalDatetime(threeWeeks),
    });
    setShowCloneModal(true);
  };

  const handleCloneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const newSession = await finalsVotingApi.cloneSession(cloneSourceId, {
        season_id: cloneForm.season_id,
        title: cloneForm.title,
        description: cloneForm.description || undefined,
        start_date: new Date(cloneForm.start_date),
        end_date: new Date(cloneForm.end_date),
        results_publish_date: cloneForm.results_publish_date ? new Date(cloneForm.results_publish_date) : null,
      });
      setShowCloneModal(false);
      await loadSessions();
      setSelectedSession(newSession);
      await loadSessionDetail(newSession.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to clone session');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // Seed Template
  // =========================================================================

  const handleSeedTemplate = async (templateName: string) => {
    if (!selectedSession) return;
    setSaving(true);
    setError(null);
    try {
      await finalsVotingApi.seedTemplate(selectedSession.id, templateName);
      await loadSessionDetail(selectedSession.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to seed template');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // Helpers
  // =========================================================================

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isDraft = selectedSession?.status === VotingSessionStatus.DRAFT;

  // =========================================================================
  // Render
  // =========================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Vote className="h-8 w-8 text-orange-500" />
              Finals Voting
            </h1>
            <p className="text-gray-400">Manage season-end voting sessions, categories, and questions</p>
          </div>
          <div className="flex items-center gap-3">
            {!selectedSession && (
              <button
                onClick={openCreateSession}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus className="h-5 w-5" />
                New Session
              </button>
            )}
            <button
              onClick={() => selectedSession ? setSelectedSession(null) : navigate('/dashboard/admin')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              {selectedSession ? 'All Sessions' : 'Back'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Session List — bucketed accordion view */}
        {!selectedSession && (() => {
          // Bucket every session, then render one accordion per bucket. Empty
          // buckets still render so admins can see categories at a glance.
          const buckets: Record<AccordionKey, SessionData[]> = {
            creating: [], pending: [], live: [], disabled: [], canceled: [], completed: [],
          };
          for (const s of sessions) {
            buckets[categorizeSession(s)].push(s);
          }

          if (sessions.length === 0) {
            return (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center text-slate-400">
                No voting sessions yet. Create one to get started.
              </div>
            );
          }

          return (
            <div className="space-y-3">
              {ACCORDION_ORDER.map(({ key, label, description, color, icon: BucketIcon }) => {
                const items = buckets[key];
                const isExpanded = expandedAccordions.has(key);
                return (
                  <div key={key} className={`bg-slate-800 rounded-xl border-2 ${color} overflow-hidden`}>
                    <button
                      onClick={() => toggleAccordion(key)}
                      className="w-full flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-700/40 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <BucketIcon className="h-5 w-5 text-slate-300 flex-shrink-0" />
                        <div className="min-w-0">
                          <h3 className="text-white font-semibold flex items-center gap-2">
                            {label}
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-mono">{items.length}</span>
                          </h3>
                          <p className="text-xs text-slate-400 truncate">{description}</p>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-700/60">
                        {items.length === 0 ? (
                          <div className="py-8 px-6 text-center text-slate-500 text-sm">
                            No sessions in this category.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-slate-900/40">
                                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">Session</th>
                                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">Season</th>
                                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">Dates</th>
                                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">Categories</th>
                                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                                  <th className="text-right py-3 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((session) => {
                                  const sc = statusConfig[session.status];
                                  const canEdit = session.status === VotingSessionStatus.DRAFT;
                                  // Delete is allowed for sessions the backend will accept:
                                  // DRAFT or CANCELED. Suspended-only sessions stay where they are.
                                  const canDelete = session.status === VotingSessionStatus.DRAFT
                                    || session.status === VotingSessionStatus.CANCELED;
                                  // Suspend is meaningful for any non-CANCELED session
                                  const canSuspend = session.status !== VotingSessionStatus.CANCELED;
                                  // Cancel is meaningful for any pre-finalized non-canceled session
                                  const canCancel = session.status !== VotingSessionStatus.CANCELED
                                    && session.status !== VotingSessionStatus.FINALIZED;
                                  return (
                                    <tr
                                      key={session.id}
                                      className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer"
                                      onClick={() => { setSelectedSession(session); loadSessionDetail(session.id); }}
                                    >
                                      <td className="py-4 px-6">
                                        <p className="text-white font-medium flex items-center gap-2">
                                          {session.title}
                                          {session.suspended && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900 text-purple-200 font-semibold uppercase tracking-wide flex items-center gap-1">
                                              <EyeOff className="h-3 w-3" /> Suspended
                                            </span>
                                          )}
                                        </p>
                                        {session.description && <p className="text-sm text-slate-400 mt-1 truncate max-w-xs">{session.description}</p>}
                                      </td>
                                      <td className="py-4 px-6 text-white">{session.season?.name}</td>
                                      <td className="py-4 px-6 text-sm text-white">
                                        {formatDateTime(session.startDate)} - {formatDateTime(session.endDate)}
                                      </td>
                                      <td className="py-4 px-6 text-white">{session.categories?.length || 0}</td>
                                      <td className="py-4 px-6">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                                      </td>
                                      <td className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
                                          <button
                                            onClick={() => { setSelectedSession(session); loadSessionDetail(session.id); }}
                                            className="px-2.5 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-xs font-medium flex items-center gap-1"
                                            title="Manage categories & questions"
                                          >
                                            <Eye className="h-3.5 w-3.5" /> Manage
                                          </button>
                                          {canEdit && (
                                            <button onClick={() => openEditSession(session)} className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors" title="Edit">
                                              <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                          {(session.status !== VotingSessionStatus.DRAFT && session.status !== VotingSessionStatus.CANCELED) && (
                                            <button onClick={() => loadResults(session.id)} className="p-1.5 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors" title="Results">
                                              <BarChart3 className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                          {canSuspend && (
                                            <button
                                              onClick={() => handleSuspendToggle(session)}
                                              disabled={saving}
                                              className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${session.suspended
                                                ? 'text-emerald-400 hover:bg-emerald-500/20'
                                                : 'text-purple-400 hover:bg-purple-500/20'}`}
                                              title={session.suspended ? 'Unsuspend (resume public visibility)' : 'Suspend (hide from public)'}
                                            >
                                              {session.suspended ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
                                            </button>
                                          )}
                                          <button
                                            onClick={() => openCloneModal(session.id, session.title)}
                                            className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-medium flex items-center gap-1"
                                            title="Clone categories & questions to new session"
                                          >
                                            <Copy className="h-3.5 w-3.5" /> Clone
                                          </button>
                                          {canCancel && (
                                            <button
                                              onClick={() => handleCancelSession(session)}
                                              disabled={saving}
                                              className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors disabled:opacity-50"
                                              title="Cancel — moves to Canceled bucket"
                                            >
                                              <Ban className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                          {canDelete && (
                                            <button
                                              onClick={() => setDeleteConfirm({ type: 'session', id: session.id, name: session.title })}
                                              className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                              title="Delete permanently"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Session Detail View */}
        {selectedSession && (
          <div className="space-y-6">
            {/* Session Info Card */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="text-xl font-bold text-white">{selectedSession.title}</h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[selectedSession.status].color}`}>
                      {statusConfig[selectedSession.status].label}
                    </span>
                    {selectedSession.suspended && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 flex items-center gap-1">
                        <EyeOff className="h-3 w-3" /> Suspended
                      </span>
                    )}
                  </div>
                  {selectedSession.description && <p className="text-slate-400 mb-2">{selectedSession.description}</p>}
                  <div className="text-sm text-slate-500 space-y-1">
                    <p><span className="text-slate-400 font-medium">Voting Opens:</span> {formatDateTime(selectedSession.startDate)}</p>
                    <p><span className="text-slate-400 font-medium">Voting Closes:</span> {formatDateTime(selectedSession.endDate)}</p>
                    {selectedSession.resultsPublishDate && (
                      <p><span className="text-slate-400 font-medium">Results Publish:</span> {formatDateTime(selectedSession.resultsPublishDate)}</p>
                    )}
                    <p><span className="text-slate-400 font-medium">Season:</span> {selectedSession.season?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSession.status === VotingSessionStatus.DRAFT && (
                    <>
                      <button onClick={() => openEditSession(selectedSession)} className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm flex items-center gap-1">
                        <Pencil className="h-4 w-4" /> Edit
                      </button>
                      <button onClick={() => navigate(`/finals-voting?preview=${selectedSession.id}`)} className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center gap-1">
                        <Eye className="h-4 w-4" /> Preview Ballot
                      </button>
                      <button onClick={() => handleStatusChange(selectedSession.id, 'open')} disabled={saving} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-1 disabled:opacity-50">
                        <Play className="h-4 w-4" /> Open Voting
                      </button>
                    </>
                  )}
                  {selectedSession.status === VotingSessionStatus.OPEN && (
                    <>
                      <button onClick={() => loadResults(selectedSession.id)} disabled={loadingResults} className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm flex items-center gap-1 disabled:opacity-50">
                        <Eye className="h-4 w-4" /> Preview Results
                      </button>
                      <button onClick={() => handleStatusChange(selectedSession.id, 'close')} disabled={saving} className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm flex items-center gap-1 disabled:opacity-50">
                        <Square className="h-4 w-4" /> Close Voting
                      </button>
                    </>
                  )}
                  {selectedSession.status === VotingSessionStatus.CLOSED && (
                    <>
                      <button onClick={() => loadResults(selectedSession.id)} disabled={loadingResults} className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm flex items-center gap-1 disabled:opacity-50">
                        <Eye className="h-4 w-4" /> Preview Results
                      </button>
                      <button onClick={() => handleStatusChange(selectedSession.id, 'finalize')} disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1 disabled:opacity-50">
                        <CheckCircle className="h-4 w-4" /> Finalize & Publish
                      </button>
                    </>
                  )}
                  {selectedSession.status === VotingSessionStatus.FINALIZED && (
                    <button onClick={() => loadResults(selectedSession.id)} disabled={loadingResults} className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm flex items-center gap-1 disabled:opacity-50">
                      <BarChart3 className="h-4 w-4" /> View Results
                    </button>
                  )}
                  <button onClick={() => openCloneModal(selectedSession.id, selectedSession.title)} className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm flex items-center gap-1">
                    <Copy className="h-4 w-4" /> Clone to New Season
                  </button>
                  {selectedSession.status !== VotingSessionStatus.CANCELED && (
                    <button
                      onClick={() => handleSuspendToggle(selectedSession)}
                      disabled={saving}
                      className={`px-3 py-2 rounded-lg transition-colors text-sm flex items-center gap-1 disabled:opacity-50 ${selectedSession.suspended
                        ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                        : 'bg-purple-700 text-white hover:bg-purple-600'}`}
                      title={selectedSession.suspended
                        ? 'Resume public visibility for this session'
                        : 'Hide this session from the public homepage and members'}
                    >
                      {selectedSession.suspended
                        ? (<><PlayCircle className="h-4 w-4" /> Unsuspend</>)
                        : (<><PauseCircle className="h-4 w-4" /> Suspend</>)}
                    </button>
                  )}
                  {(selectedSession.status !== VotingSessionStatus.CANCELED && selectedSession.status !== VotingSessionStatus.FINALIZED) && (
                    <button
                      onClick={() => handleCancelSession(selectedSession)}
                      disabled={saving}
                      className="px-3 py-2 bg-rose-700 text-white rounded-lg hover:bg-rose-600 transition-colors text-sm flex items-center gap-1 disabled:opacity-50"
                      title="Cancel — moves to Canceled bucket and out of active flow"
                    >
                      <Ban className="h-4 w-4" /> Cancel
                    </button>
                  )}
                  {(selectedSession.status === VotingSessionStatus.DRAFT || selectedSession.status === VotingSessionStatus.CANCELED) && (
                    <button
                      onClick={() => setDeleteConfirm({ type: 'session', id: selectedSession.id, name: selectedSession.title })}
                      className="px-3 py-2 bg-red-700 text-white rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center gap-1"
                      title="Delete this session permanently"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Categories ({selectedSession.categories?.length || 0})</h3>
              {isDraft && (
                <button onClick={openCreateCategory} className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm">
                  <Plus className="h-4 w-4" /> Add Category
                </button>
              )}
            </div>

            {(!selectedSession.categories || selectedSession.categories.length === 0) ? (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-8">
                <div className="text-center mb-6">
                  <Layers className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-lg text-white font-medium mb-1">No categories yet</p>
                  <p className="text-slate-400">Get started by loading a template or adding categories manually.</p>
                </div>
                {isDraft && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                      onClick={() => handleSeedTemplate('2023')}
                      disabled={saving}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium"
                    >
                      <Layers className="h-5 w-5" />
                      {saving ? 'Loading Template...' : 'Load 2023 Awards Template (4 Categories, 40 Questions)'}
                    </button>
                    {sessions.filter(s => s.id !== selectedSession.id && (s.categories?.length || 0) > 0).length > 0 && (
                      <button
                        onClick={() => {
                          const source = sessions.find(s => s.id !== selectedSession.id && (s.categories?.length || 0) > 0);
                          if (source) openCloneModal(source.id, source.title);
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                      >
                        <Copy className="h-5 w-5" />
                        Copy From Another Session
                      </button>
                    )}
                    <button
                      onClick={openCreateCategory}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium"
                    >
                      <Plus className="h-5 w-5" />
                      Add Manually
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {[...selectedSession.categories]
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((cat) => {
                    const isExpanded = expandedCategories.has(cat.id);
                    return (
                      <div key={cat.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                        {/* Category header */}
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/30" onClick={() => toggleCategory(cat.id)}>
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                            <div>
                              <h4 className="text-white font-medium">{cat.name}</h4>
                              {cat.description && <p className="text-sm text-slate-400">{cat.description}</p>}
                            </div>
                            <span className="ml-3 px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">{cat.questions?.length || 0} questions</span>
                          </div>
                          {isDraft && (
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <button onClick={() => openEditCategory(cat)} className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors" title="Edit Category">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => setDeleteConfirm({ type: 'category', id: cat.id, name: cat.name })} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors" title="Delete Category">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Questions */}
                        {isExpanded && (
                          <div className="border-t border-slate-700">
                            {isDraft && (
                              <div className="p-3 border-b border-slate-700/50">
                                <button onClick={() => openCreateQuestion(cat.id)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm">
                                  <Plus className="h-4 w-4" /> Add Question
                                </button>
                              </div>
                            )}
                            {(!cat.questions || cat.questions.length === 0) ? (
                              <div className="p-6 text-center text-slate-400 text-sm">No questions in this category yet.</div>
                            ) : (
                              <div className="divide-y divide-slate-700/50">
                                {[...cat.questions]
                                  .sort((a, b) => a.displayOrder - b.displayOrder)
                                  .map((question) => {
                                    const atConf = answerTypeConfig[question.answerType] || answerTypeConfig[VotingAnswerType.MEMBER];
                                    return (
                                      <div key={question.id} className="flex items-center justify-between p-4 hover:bg-slate-700/20">
                                        <div className="flex items-center gap-4">
                                          {question.imageUrl ? (
                                            <img src={getStorageUrl(question.imageUrl)} alt={question.title} className="w-16 h-16 rounded-lg object-cover bg-slate-700" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                          ) : (
                                            <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center">
                                              <atConf.icon className="h-6 w-6 text-slate-500" />
                                            </div>
                                          )}
                                          <div>
                                            <p className="text-white font-medium">{question.title}</p>
                                            {question.description && <p className="text-sm text-slate-400 mt-1">{question.description}</p>}
                                            <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-xs font-medium ${atConf.color}`}>
                                              <atConf.icon className="h-3 w-3" />
                                              {atConf.label}
                                            </span>
                                          </div>
                                        </div>
                                        {isDraft && (
                                          <div className="flex items-center gap-2">
                                            <button onClick={() => openEditQuestion(question, cat.id)} className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors">
                                              <Pencil className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => setDeleteConfirm({ type: 'question', id: question.id, name: question.title })} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors">
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* MODALS */}
      {/* ================================================================= */}

      {/* Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">{editingSession ? 'Edit Session' : 'New Voting Session'}</h2>
              <button onClick={() => setShowSessionModal(false)} className="p-2 text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSessionSubmit} className="p-6 space-y-4">
              {!editingSession && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Season *</label>
                  <select value={sessionForm.season_id} onChange={(e) => setSessionForm({ ...sessionForm, season_id: e.target.value })} required className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                    {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Title *</label>
                <input type="text" value={sessionForm.title} onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })} required className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g., 2025 Season Awards" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea value={sessionForm.description} onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })} rows={3} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Optional description..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Voting Opens *</label>
                  <input type="datetime-local" value={sessionForm.start_date} onChange={(e) => setSessionForm({ ...sessionForm, start_date: e.target.value })} required className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Voting Closes *</label>
                  <input type="datetime-local" value={sessionForm.end_date} onChange={(e) => setSessionForm({ ...sessionForm, end_date: e.target.value })} required min={sessionForm.start_date} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Results Publish Date</label>
                <input type="datetime-local" value={sessionForm.results_publish_date} onChange={(e) => setSessionForm({ ...sessionForm, results_publish_date: e.target.value })} min={sessionForm.end_date} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                <p className="text-xs text-slate-500 mt-1">When results will be publicly visible (optional)</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowSessionModal(false)} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50">{saving ? 'Saving...' : editingSession ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setShowCategoryModal(false)} className="p-2 text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                <input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g., SQ Awards" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} rows={2} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Optional description..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Display Order</label>
                <input type="number" value={categoryForm.display_order} onChange={(e) => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) || 0 })} min={0} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50">{saving ? 'Saving...' : editingCategory ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">{editingQuestion ? 'Edit Question' : 'Add Question'}</h2>
              <button onClick={() => setShowQuestionModal(false)} className="p-2 text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleQuestionSubmit} className="p-6 space-y-4">
              {/* Category selector — shown when editing to allow moving between categories */}
              {editingQuestion && selectedSession && selectedSession.categories.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                  <select
                    value={questionForm.category_id}
                    onChange={(e) => setQuestionForm({ ...questionForm, category_id: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {[...selectedSession.categories]
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                  </select>
                  {questionForm.category_id !== questionCategoryId && (
                    <p className="text-xs text-orange-400 mt-1">Question will be moved to the selected category.</p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Title *</label>
                <input type="text" value={questionForm.title} onChange={(e) => setQuestionForm({ ...questionForm, title: e.target.value })} required className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g., Best SQ Install" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea value={questionForm.description} onChange={(e) => setQuestionForm({ ...questionForm, description: e.target.value })} rows={2} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Optional description for voters..." />
              </div>
              {/* Answer Type */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Answer Type *</label>
                <select
                  value={questionForm.answer_type}
                  onChange={(e) => setQuestionForm({ ...questionForm, answer_type: e.target.value as VotingAnswerType })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value={VotingAnswerType.MEMBER}>Member - Active MECA members (by name)</option>
                  <option value={VotingAnswerType.JUDGE}>Judge - Active judges (by name)</option>
                  <option value={VotingAnswerType.EVENT_DIRECTOR}>Event Director - Event directors (by name)</option>
                  <option value={VotingAnswerType.RETAILER}>Retailer - Retail businesses (by business name)</option>
                  <option value={VotingAnswerType.MANUFACTURER}>Manufacturer - Manufacturer businesses (by business name)</option>
                  <option value={VotingAnswerType.VENUE}>Venue - Season event venues (by venue name)</option>
                  <option value={VotingAnswerType.TEAM}>Team - Active teams (by team name)</option>
                  <option value={VotingAnswerType.TEXT}>Text Answer - Free-text response</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  {answerTypeConfig[questionForm.answer_type]?.label || 'Select an answer type'}
                  {' - Voters will search and select from the corresponding list.'}
                </p>
              </div>
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Image</label>
                <div className="flex gap-4">
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white hover:bg-slate-600 transition-colors disabled:opacity-50">
                    {uploading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>) : (<><Upload className="h-4 w-4" /> Upload</>)}
                  </button>
                  <input type="text" value={questionForm.image_url} onChange={(e) => setQuestionForm({ ...questionForm, image_url: e.target.value })} placeholder="Or paste image URL..." className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                {questionForm.image_url && (
                  <div className="mt-2 p-2 bg-slate-700 rounded-lg">
                    <img src={getStorageUrl(questionForm.image_url)} alt="Preview" className="w-24 h-24 rounded-lg object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Display Order</label>
                <input type="number" value={questionForm.display_order} onChange={(e) => setQuestionForm({ ...questionForm, display_order: parseInt(e.target.value) || 0 })} min={0} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowQuestionModal(false)} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
                <button type="submit" disabled={saving || uploading} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50">{saving ? 'Saving...' : editingQuestion ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-4">Delete {deleteConfirm.type}?</h3>
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete &quot;{deleteConfirm.name}&quot;?
              {deleteConfirm.type === 'session' && ' This will also delete all categories and questions.'}
              {deleteConfirm.type === 'category' && ' This will also delete all questions in this category.'}
              {' '}This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Results Preview Modal */}
      {showResults && results && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div>
                <h2 className="text-xl font-bold text-white">Results: {results.session.title}</h2>
                <p className="text-sm text-slate-400 mt-1">Total voters: {results.total_voters}</p>
              </div>
              <button onClick={() => setShowResults(false)} className="p-2 text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-8">
              {results.categories.map((cat) => (
                <div key={cat.category_id}>
                  <h3 className="text-lg font-bold text-white mb-4">{cat.category_name}</h3>
                  <div className="space-y-6">
                    {cat.questions.map((q) => (
                      <div key={q.question_id} className="bg-slate-700/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="text-white font-medium">{q.question_title}</h4>
                          {(() => {
                            const atConf = answerTypeConfig[q.answer_type as VotingAnswerType];
                            return atConf ? (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${atConf.color}`}>{atConf.label}</span>
                            ) : null;
                          })()}
                          <span className="text-sm text-slate-400">({q.total_responses} responses)</span>
                        </div>

                        {/* Profile-based results (member, judge, event_director) */}
                        {q.member_votes && q.member_votes.length > 0 && (
                          <>
                            <div className="h-48">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={q.member_votes.slice(0, 10).map(mv => ({
                                  name: mv.member_name.length > 18 ? mv.member_name.substring(0, 18) + '...' : mv.member_name,
                                  votes: mv.vote_count,
                                  fullName: mv.member_name,
                                }))}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tick={{ fill: '#94a3b8' }} />
                                  <YAxis stroke="#94a3b8" allowDecimals={false} tick={{ fill: '#94a3b8' }} />
                                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '8px' }} formatter={(value: number, _name: string, props: { payload?: { fullName?: string } }) => [value, props.payload?.fullName || 'Votes']} />
                                  <Bar dataKey="votes" radius={[4, 4, 0, 0]}>
                                    {q.member_votes.slice(0, 10).map((_, idx) => (
                                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            {q.member_votes[0] && q.member_votes[0].vote_count > 0 && (
                              <div className="mt-2 flex items-center gap-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                <p className="text-orange-400 font-medium text-sm">
                                  Winner: {q.member_votes[0].member_name}
                                  {q.member_votes[0].member_meca_id && ` (#${q.member_votes[0].member_meca_id})`}
                                  {' '}- {q.member_votes[0].vote_count} votes
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Team results */}
                        {q.team_votes && q.team_votes.length > 0 && (
                          <>
                            <div className="h-48">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={q.team_votes.slice(0, 10).map(tv => ({
                                  name: tv.team_name.length > 18 ? tv.team_name.substring(0, 18) + '...' : tv.team_name,
                                  votes: tv.vote_count,
                                  fullName: tv.team_name,
                                }))}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tick={{ fill: '#94a3b8' }} />
                                  <YAxis stroke="#94a3b8" allowDecimals={false} tick={{ fill: '#94a3b8' }} />
                                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '8px' }} formatter={(value: number, _name: string, props: { payload?: { fullName?: string } }) => [value, props.payload?.fullName || 'Votes']} />
                                  <Bar dataKey="votes" radius={[4, 4, 0, 0]}>
                                    {q.team_votes.slice(0, 10).map((_, idx) => (
                                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            {q.team_votes[0] && q.team_votes[0].vote_count > 0 && (
                              <div className="mt-2 flex items-center gap-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                <p className="text-orange-400 font-medium text-sm">Winner: {q.team_votes[0].team_name} - {q.team_votes[0].vote_count} votes</p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Venue/Retailer/Manufacturer results (text-entity based) */}
                        {q.venue_votes && q.venue_votes.length > 0 && (
                          <>
                            <div className="h-48">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={q.venue_votes.slice(0, 10).map(vv => ({
                                  name: vv.venue_name.length > 18 ? vv.venue_name.substring(0, 18) + '...' : vv.venue_name,
                                  votes: vv.vote_count,
                                  fullName: vv.venue_name,
                                }))}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tick={{ fill: '#94a3b8' }} />
                                  <YAxis stroke="#94a3b8" allowDecimals={false} tick={{ fill: '#94a3b8' }} />
                                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '8px' }} formatter={(value: number, _name: string, props: { payload?: { fullName?: string } }) => [value, props.payload?.fullName || 'Votes']} />
                                  <Bar dataKey="votes" radius={[4, 4, 0, 0]}>
                                    {q.venue_votes.slice(0, 10).map((_, idx) => (
                                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            {q.venue_votes[0] && q.venue_votes[0].vote_count > 0 && (
                              <div className="mt-2 flex items-center gap-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                <p className="text-orange-400 font-medium text-sm">Winner: {q.venue_votes[0].venue_name} - {q.venue_votes[0].vote_count} votes</p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Text answers */}
                        {q.text_answers && q.text_answers.length > 0 && (
                          <div className="max-h-48 overflow-y-auto space-y-2">
                            {q.text_answers.map((answer, idx) => (
                              <div key={idx} className="p-2 bg-slate-700 rounded text-sm text-slate-300">
                                {answer}
                              </div>
                            ))}
                          </div>
                        )}

                        {q.total_responses === 0 && (
                          <p className="text-sm text-slate-400">No responses yet.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clone Session Modal */}
      {showCloneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Clone Session</h2>
              <button onClick={() => setShowCloneModal(false)} className="p-2 text-slate-400 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCloneSubmit} className="p-6 space-y-4">
              <p className="text-sm text-slate-400 mb-4">This will create a new DRAFT session with all categories and questions copied from the source session.</p>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Source Session (copying from) *</label>
                <select value={cloneSourceId} onChange={(e) => setCloneSourceId(e.target.value)} required className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                  {sessions.filter(s => (s.categories?.length || 0) > 0).map(s => (
                    <option key={s.id} value={s.id}>{s.title} ({s.categories?.length || 0} categories) - {s.season?.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">New Session Season *</label>
                <select value={cloneForm.season_id} onChange={(e) => setCloneForm({ ...cloneForm, season_id: e.target.value })} required className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                  {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Title *</label>
                <input type="text" value={cloneForm.title} onChange={(e) => setCloneForm({ ...cloneForm, title: e.target.value })} required className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea value={cloneForm.description} onChange={(e) => setCloneForm({ ...cloneForm, description: e.target.value })} rows={2} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Voting Opens *</label>
                  <input type="datetime-local" value={cloneForm.start_date} onChange={(e) => setCloneForm({ ...cloneForm, start_date: e.target.value })} required className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Voting Closes *</label>
                  <input type="datetime-local" value={cloneForm.end_date} onChange={(e) => setCloneForm({ ...cloneForm, end_date: e.target.value })} required min={cloneForm.start_date} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Results Publish Date</label>
                <input type="datetime-local" value={cloneForm.results_publish_date} onChange={(e) => setCloneForm({ ...cloneForm, results_publish_date: e.target.value })} min={cloneForm.end_date} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCloneModal(false)} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <Copy className="h-4 w-4" />
                  {saving ? 'Cloning...' : 'Clone Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
