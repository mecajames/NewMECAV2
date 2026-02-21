import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Vote, CheckCircle, ArrowLeft, ArrowRight, Loader2, Search, X, Users, MessageSquare, MapPin, Gavel, Building2, Factory, UserCheck, Eye } from 'lucide-react';
import { useAuth } from '@/auth';
import { VotingAnswerType } from '@newmeca/shared';
import type { EntitySearchResult } from '@newmeca/shared';
import { finalsVotingApi } from '../../api-client/finals-voting.api-client';

// =============================================================================
// Types
// =============================================================================

interface CategoryData {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  questions: QuestionData[];
}

interface QuestionData {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  answer_type: VotingAnswerType;
  display_order: number;
}

interface FlatQuestion {
  question: QuestionData;
  categoryId: string;
  categoryName: string;
  globalIndex: number;
}

interface ResponseEntry {
  question_id: string;
  selected_member_id?: string | null;
  selected_team_id?: string | null;
  text_answer?: string | null;
}

// Profile-based answer types that use selected_member_id
const PROFILE_TYPES = new Set<string>([
  VotingAnswerType.MEMBER,
  VotingAnswerType.JUDGE,
  VotingAnswerType.EVENT_DIRECTOR,
]);

// Text-entity answer types that use entity search but store as text_answer (business/venue name)
const TEXT_ENTITY_TYPES = new Set<string>([
  VotingAnswerType.RETAILER,
  VotingAnswerType.MANUFACTURER,
  VotingAnswerType.VENUE,
]);

// Answer types that show a full pre-loaded list instead of search-only
const LIST_PICKER_TYPES = new Set<string>([
  VotingAnswerType.RETAILER,
  VotingAnswerType.MANUFACTURER,
  VotingAnswerType.VENUE,
  VotingAnswerType.TEAM,
]);

const answerTypeLabels: Record<string, { label: string; icon: typeof Users; placeholder: string }> = {
  [VotingAnswerType.MEMBER]: { label: 'Member', icon: Users, placeholder: 'Search by name, MECA ID...' },
  [VotingAnswerType.JUDGE]: { label: 'Judge', icon: Gavel, placeholder: 'Search judges by name...' },
  [VotingAnswerType.EVENT_DIRECTOR]: { label: 'Event Director', icon: UserCheck, placeholder: 'Search event directors...' },
  [VotingAnswerType.RETAILER]: { label: 'Retailer', icon: Building2, placeholder: 'Search by business name...' },
  [VotingAnswerType.MANUFACTURER]: { label: 'Manufacturer', icon: Factory, placeholder: 'Search by business name...' },
  [VotingAnswerType.VENUE]: { label: 'Venue', icon: MapPin, placeholder: 'Search venues...' },
  [VotingAnswerType.TEAM]: { label: 'Team', icon: Users, placeholder: 'Search teams...' },
  [VotingAnswerType.TEXT]: { label: 'Text', icon: MessageSquare, placeholder: 'Type your answer...' },
};

// =============================================================================
// Entity Search Picker Component (for member, judge, event_director)
// =============================================================================

function EntitySearchPicker({
  answerType,
  sessionId,
  selectedEntity,
  onSelect,
  onClear,
}: {
  answerType: VotingAnswerType;
  sessionId: string;
  selectedEntity: EntitySearchResult | null;
  onSelect: (entity: EntitySearchResult) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EntitySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const config = answerTypeLabels[answerType] || answerTypeLabels[VotingAnswerType.MEMBER];
  const IconComponent = config.icon;

  const searchEntities = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await finalsVotingApi.entitySearch(answerType, searchQuery, sessionId, 20);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [answerType, sessionId]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchEntities(value), 300);
    setShowDropdown(true);
  };

  const handleSelect = (entity: EntitySearchResult) => {
    onSelect(entity);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selectedEntity) {
    return (
      <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
        {selectedEntity.avatar_url ? (
          <img src={selectedEntity.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
            <IconComponent className="h-5 w-5 text-slate-400" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-white font-medium">{selectedEntity.name}</p>
          {selectedEntity.subtitle && <p className="text-sm text-slate-400">{selectedEntity.subtitle}</p>}
          {selectedEntity.meca_id && <p className="text-sm text-orange-400">MECA #{selectedEntity.meca_id}</p>}
        </div>
        <button onClick={onClear} className="p-1 text-slate-400 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          placeholder={config.placeholder}
          className="w-full pl-10 pr-10 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 animate-spin" />}
      </div>

      {showDropdown && (query.length >= 2) && (
        <div className="absolute z-10 w-full mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {results.length === 0 && !searching && (
            <div className="p-4 text-center text-slate-400 text-sm">No results found</div>
          )}
          {results.map((entity) => (
            <button
              key={entity.id}
              onClick={() => handleSelect(entity)}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-700 transition-colors text-left"
            >
              {entity.avatar_url ? (
                <img src={entity.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                  <IconComponent className="h-4 w-4 text-slate-400" />
                </div>
              )}
              <div>
                <p className="text-white text-sm font-medium">{entity.name}</p>
                <p className="text-xs text-slate-400">
                  {entity.meca_id ? `MECA #${entity.meca_id}` : ''}
                  {entity.meca_id && entity.subtitle ? ' - ' : ''}
                  {entity.subtitle || ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Entity List Picker Component (for retailer, manufacturer, venue, team)
// Shows all available options in a scrollable list with a filter input
// =============================================================================

function EntityListPicker({
  answerType,
  sessionId,
  selectedEntity,
  onSelect,
  onClear,
}: {
  answerType: VotingAnswerType;
  sessionId: string;
  selectedEntity: EntitySearchResult | null;
  onSelect: (entity: EntitySearchResult) => void;
  onClear: () => void;
}) {
  const [allEntities, setAllEntities] = useState<EntitySearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const config = answerTypeLabels[answerType] || answerTypeLabels[VotingAnswerType.MEMBER];
  const IconComponent = config.icon;

  // Load all entities on mount
  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      setLoading(true);
      try {
        // Use a wildcard search with high limit to get all entries
        const data = await finalsVotingApi.entitySearch(answerType, '%', sessionId, 500);
        if (!cancelled) setAllEntities(data);
      } catch {
        if (!cancelled) setAllEntities([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAll();
    return () => { cancelled = true; };
  }, [answerType, sessionId]);

  const filtered = filter.trim()
    ? allEntities.filter(e =>
        e.name.toLowerCase().includes(filter.toLowerCase()) ||
        (e.subtitle && e.subtitle.toLowerCase().includes(filter.toLowerCase()))
      )
    : allEntities;

  if (selectedEntity) {
    return (
      <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
        {selectedEntity.avatar_url ? (
          <img src={selectedEntity.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
            <IconComponent className="h-5 w-5 text-slate-400" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-white font-medium">{selectedEntity.name}</p>
          {selectedEntity.subtitle && <p className="text-sm text-slate-400">{selectedEntity.subtitle}</p>}
        </div>
        <button onClick={onClear} className="p-1 text-slate-400 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading options...
      </div>
    );
  }

  return (
    <div>
      {/* Filter input */}
      {allEntities.length > 6 && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={`Filter ${config.label.toLowerCase()}s...`}
            className="w-full pl-9 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      )}

      {/* Scrollable list */}
      <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-600 bg-slate-800 divide-y divide-slate-700/50">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-sm">
            {filter ? 'No matches found' : 'No options available'}
          </div>
        ) : (
          filtered.map((entity) => (
            <button
              key={entity.id}
              onClick={() => onSelect(entity)}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-700 transition-colors text-left"
            >
              {entity.avatar_url ? (
                <img src={entity.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                  <IconComponent className="h-4 w-4 text-slate-400" />
                </div>
              )}
              <div>
                <p className="text-white text-sm font-medium">{entity.name}</p>
                {entity.subtitle && <p className="text-xs text-slate-400">{entity.subtitle}</p>}
              </div>
            </button>
          ))
        )}
      </div>
      <p className="text-xs text-slate-500 mt-2">{allEntities.length} {config.label.toLowerCase()}{allEntities.length !== 1 ? 's' : ''} available</p>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function FinalsVotingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading: authLoading } = useAuth();

  // Preview mode detection
  const searchParams = new URLSearchParams(location.search);
  const previewSessionId = searchParams.get('preview');
  const isPreview = !!previewSessionId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Session data
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDescription, setSessionDescription] = useState<string | null>(null);
  const [flatQuestions, setFlatQuestions] = useState<FlatQuestion[]>([]);
  const [noActiveSession, setNoActiveSession] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [existingResponses, setExistingResponses] = useState<Array<{
    question: { id: string; title: string; answerType: string };
    selectedMember?: { id: string; firstName?: string; first_name?: string; lastName?: string; last_name?: string; mecaId?: number; meca_id?: number };
    selectedTeam?: { id: string; name: string };
    textAnswer?: string;
  }>>([]);

  // Voting flow state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Map<string, { entity?: EntitySearchResult; text?: string }>>(new Map());
  const [showReview, setShowReview] = useState(false);

  // =========================================================================
  // Data Loading
  // =========================================================================

  useEffect(() => {
    if (!authLoading) {
      loadActiveSession();
    }
  }, [authLoading]);

  const loadActiveSession = async () => {
    try {
      setLoading(true);

      // In preview mode, use admin preview endpoint; otherwise use active session
      const data = isPreview
        ? await finalsVotingApi.getSessionPreview(previewSessionId!)
        : await finalsVotingApi.getActiveSession();

      if (!data) {
        setNoActiveSession(true);
        return;
      }

      setSessionId(data.session.id);
      setSessionTitle(data.session.title);
      setSessionDescription(data.session.description ?? null);

      // For list-picker types, check which have available options
      // and filter out questions with no available choices
      const questionTypes = new Set<string>();
      for (const cat of data.categories) {
        for (const q of cat.questions) {
          if (LIST_PICKER_TYPES.has(q.answer_type)) questionTypes.add(q.answer_type);
        }
      }
      const emptyTypes = new Set<string>();
      await Promise.all(
        [...questionTypes].map(async (type) => {
          try {
            const results = await finalsVotingApi.entitySearch(type, '%', data.session.id, 1);
            if (!results || results.length === 0) emptyTypes.add(type);
          } catch {
            emptyTypes.add(type);
          }
        }),
      );

      // Flatten all questions into sequential list, skipping questions with no options
      const flat: FlatQuestion[] = [];
      let globalIdx = 0;
      for (const cat of data.categories) {
        for (const q of cat.questions) {
          if (emptyTypes.has(q.answer_type)) continue; // Skip questions with no available options
          flat.push({
            question: q,
            categoryId: cat.id,
            categoryName: cat.name,
            globalIndex: globalIdx++,
          });
        }
      }
      setFlatQuestions(flat);

      // Check if already voted (skip in preview mode)
      if (!isPreview) {
        try {
          const responses = await finalsVotingApi.getMyResponses(data.session.id);
          if (responses && responses.length > 0) {
            setAlreadyVoted(true);
            setExistingResponses(responses);
          }
        } catch {
          // Not voted yet, that's fine
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load voting session';
      if (message.includes('active') || message.includes('member')) {
        setError('Only active MECA members can vote. Please check your membership status.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // Voting Handlers
  // =========================================================================

  const handleEntitySelect = (questionId: string, entity: EntitySearchResult) => {
    setSelections(prev => {
      const next = new Map(prev);
      next.set(questionId, { entity });
      return next;
    });
  };

  const handleEntityClear = (questionId: string) => {
    setSelections(prev => {
      const next = new Map(prev);
      next.delete(questionId);
      return next;
    });
  };

  const handleTextChange = (questionId: string, text: string) => {
    setSelections(prev => {
      const next = new Map(prev);
      next.set(questionId, { text });
      return next;
    });
  };

  const goNext = () => {
    if (currentIndex < flatQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowReview(true);
    }
  };

  const goBack = () => {
    if (showReview) {
      setShowReview(false);
    } else if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const isEntityType = (type: VotingAnswerType) =>
    PROFILE_TYPES.has(type) || TEXT_ENTITY_TYPES.has(type) || type === VotingAnswerType.TEAM;

  const isAnswered = (fq: FlatQuestion) => {
    const sel = selections.get(fq.question.id);
    if (!sel) return false;
    if (isEntityType(fq.question.answer_type)) return !!sel.entity;
    return !!(sel.text && sel.text.trim().length > 0);
  };

  const handleSubmit = async () => {
    if (!sessionId) return;
    setSubmitting(true);
    setError(null);

    const responses: ResponseEntry[] = [];
    for (const fq of flatQuestions) {
      const sel = selections.get(fq.question.id);
      if (!sel) {
        setError(`Please answer "${fq.question.title}"`);
        setSubmitting(false);
        return;
      }

      const type = fq.question.answer_type;

      if (PROFILE_TYPES.has(type)) {
        if (!sel.entity) {
          setError(`Please select a ${answerTypeLabels[type]?.label || 'person'} for "${fq.question.title}"`);
          setSubmitting(false);
          return;
        }
        responses.push({ question_id: fq.question.id, selected_member_id: sel.entity.id });
      } else if (type === VotingAnswerType.TEAM) {
        if (!sel.entity) {
          setError(`Please select a team for "${fq.question.title}"`);
          setSubmitting(false);
          return;
        }
        responses.push({ question_id: fq.question.id, selected_team_id: sel.entity.id });
      } else if (TEXT_ENTITY_TYPES.has(type)) {
        if (!sel.entity) {
          setError(`Please select a ${answerTypeLabels[type]?.label || 'option'} for "${fq.question.title}"`);
          setSubmitting(false);
          return;
        }
        // Retailer, manufacturer, venue — store entity name as text_answer
        responses.push({ question_id: fq.question.id, text_answer: sel.entity.name });
      } else {
        // Text type
        if (!sel.text || sel.text.trim().length === 0) {
          setError(`Please provide an answer for "${fq.question.title}"`);
          setSubmitting(false);
          return;
        }
        responses.push({ question_id: fq.question.id, text_answer: sel.text.trim() });
      }
    }

    try {
      await finalsVotingApi.submitResponses(sessionId, {
        session_id: sessionId,
        responses,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit responses');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // Render Helpers
  // =========================================================================

  const currentFQ = flatQuestions[currentIndex];
  const currentSelection = currentFQ ? selections.get(currentFQ.question.id) : undefined;
  const isCurrentAnswered = currentFQ ? isAnswered(currentFQ) : false;
  const allAnswered = flatQuestions.every(fq => isAnswered(fq));
  const progress = flatQuestions.length > 0 ? ((currentIndex + 1) / flatQuestions.length) * 100 : 0;

  // Detect category change for header display
  const showCategoryHeader = currentFQ && (
    currentIndex === 0 ||
    flatQuestions[currentIndex - 1]?.categoryId !== currentFQ.categoryId
  );

  // =========================================================================
  // Render
  // =========================================================================

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent" />
      </div>
    );
  }

  if (noActiveSession && !isPreview) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Vote className="h-16 w-16 text-slate-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">No Active Voting</h1>
          <p className="text-slate-400 mb-6">There is no voting session currently active. Check back later!</p>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Already voted - show read-only responses (skip in preview mode)
  if (alreadyVoted && !submitted && !isPreview) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">You've Already Voted!</h1>
            <p className="text-slate-400">Thank you for participating in {sessionTitle}. Here are your responses:</p>
          </div>
          <div className="space-y-4">
            {existingResponses.map((entry) => (
              <div key={entry.question.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <p className="text-sm text-slate-400 mb-1">{entry.question.title}</p>
                {entry.selectedMember && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-400" />
                    <p className="text-white font-medium">
                      {(entry.selectedMember.firstName || entry.selectedMember.first_name || '')} {(entry.selectedMember.lastName || entry.selectedMember.last_name || '')}
                      {(entry.selectedMember.mecaId || entry.selectedMember.meca_id) && (
                        <span className="text-slate-400 text-sm ml-1">(#{entry.selectedMember.mecaId || entry.selectedMember.meca_id})</span>
                      )}
                    </p>
                  </div>
                )}
                {entry.selectedTeam && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-cyan-400" />
                    <p className="text-white font-medium">{entry.selectedTeam.name}</p>
                  </div>
                )}
                {!entry.selectedMember && !entry.selectedTeam && entry.textAnswer && (
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-400 mt-0.5" />
                    <p className="text-white">{entry.textAnswer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Successfully submitted
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Responses Submitted!</h1>
          <p className="text-slate-400 mb-6">Thank you for voting in {sessionTitle}. Results will be published once voting closes.</p>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Review step
  if (showReview) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {isPreview && (
            <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500 rounded-lg flex items-center gap-3">
              <Eye className="h-5 w-5 text-indigo-400 flex-shrink-0" />
              <div>
                <p className="text-indigo-300 font-medium">Preview Mode</p>
                <p className="text-indigo-400 text-sm">This is how voters will see the review page. Submissions are disabled.</p>
              </div>
            </div>
          )}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Review Your Responses</h1>
            <p className="text-slate-400">{isPreview ? 'Preview of the review step voters see before submitting.' : 'Please confirm your answers before submitting. Votes cannot be changed after submission.'}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">{error}</div>
          )}

          <div className="space-y-3 mb-8">
            {flatQuestions.map((fq, idx) => {
              const sel = selections.get(fq.question.id);
              // Show category header when category changes
              const showCatHeader = idx === 0 || flatQuestions[idx - 1].categoryId !== fq.categoryId;
              return (
                <div key={fq.question.id}>
                  {showCatHeader && (
                    <h3 className="text-lg font-bold text-orange-400 mt-4 mb-2">{fq.categoryName}</h3>
                  )}
                  <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-slate-400">{fq.question.title}</p>
                      {sel?.entity && (
                        <p className="text-white font-medium mt-1">
                          {sel.entity.name}
                          {sel.entity.meca_id && <span className="text-slate-400 text-sm ml-1">(#{sel.entity.meca_id})</span>}
                          {sel.entity.subtitle && <span className="text-slate-400 text-sm ml-1">- {sel.entity.subtitle}</span>}
                        </p>
                      )}
                      {sel?.text && !sel?.entity && (
                        <p className="text-white mt-1">{sel.text}</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setShowReview(false); setCurrentIndex(fq.globalIndex); }}
                      className="text-sm text-orange-400 hover:text-orange-300"
                    >
                      Change
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-4">
            <button onClick={goBack} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">
              <ArrowLeft className="h-5 w-5" /> Go Back
            </button>
            {isPreview ? (
              <button onClick={() => navigate('/admin/finals-voting')} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <ArrowLeft className="h-5 w-5" /> Back to Admin
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting || !allAnswered} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50">
                {submitting ? (<><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</>) : (<><CheckCircle className="h-5 w-5" /> Submit Responses</>)}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Voting flow - one question at a time
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Preview Banner */}
        {isPreview && (
          <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-indigo-400 flex-shrink-0" />
              <div>
                <p className="text-indigo-300 font-medium">Preview Mode</p>
                <p className="text-indigo-400 text-sm">This is how voters will see this session. Submissions are disabled.</p>
              </div>
            </div>
            <button onClick={() => navigate('/admin/finals-voting')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex-shrink-0">
              Back to Admin
            </button>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">{sessionTitle}</h1>
          {sessionDescription && <p className="text-slate-400">{sessionDescription}</p>}
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
            <span>Question {currentIndex + 1} of {flatQuestions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">{error}</div>
        )}

        {/* Category header when entering new category */}
        {showCategoryHeader && currentFQ && (
          <div className="mb-4 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
            <p className="text-sm text-orange-400 font-medium">{currentFQ.categoryName}</p>
          </div>
        )}

        {/* Current Question */}
        {currentFQ && sessionId && (
          <div>
            {/* Question image */}
            {currentFQ.question.image_url && (
              <div className="mb-4">
                <img
                  src={currentFQ.question.image_url}
                  alt=""
                  className="w-full max-h-64 rounded-xl object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            )}

            <h2 className="text-xl font-bold text-white mb-2">{currentFQ.question.title}</h2>
            {currentFQ.question.description && <p className="text-slate-400 mb-6">{currentFQ.question.description}</p>}

            {/* Answer input based on type */}
            <div className="mb-8">
              {currentFQ.question.answer_type === VotingAnswerType.TEXT ? (
                <div>
                  <textarea
                    value={currentSelection?.text || ''}
                    onChange={(e) => handleTextChange(currentFQ.question.id, e.target.value)}
                    rows={4}
                    maxLength={500}
                    placeholder="Type your answer here..."
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                  <p className="text-xs text-slate-500 mt-1 text-right">{(currentSelection?.text || '').length}/500</p>
                </div>
              ) : LIST_PICKER_TYPES.has(currentFQ.question.answer_type) ? (
                <EntityListPicker
                  answerType={currentFQ.question.answer_type}
                  sessionId={sessionId!}
                  selectedEntity={currentSelection?.entity || null}
                  onSelect={(entity) => handleEntitySelect(currentFQ.question.id, entity)}
                  onClear={() => handleEntityClear(currentFQ.question.id)}
                />
              ) : (
                <EntitySearchPicker
                  answerType={currentFQ.question.answer_type}
                  sessionId={sessionId!}
                  selectedEntity={currentSelection?.entity || null}
                  onSelect={(entity) => handleEntitySelect(currentFQ.question.id, entity)}
                  onClear={() => handleEntityClear(currentFQ.question.id)}
                />
              )}
            </div>

            {/* Navigation */}
            <div className="flex gap-4">
              {currentIndex > 0 && (
                <button onClick={goBack} className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">
                  <ArrowLeft className="h-5 w-5" /> Previous
                </button>
              )}
              <button
                onClick={goNext}
                disabled={!isCurrentAnswered}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentIndex < flatQuestions.length - 1 ? (
                  <>Next <ArrowRight className="h-5 w-5" /></>
                ) : (
                  <>Review & Submit <ArrowRight className="h-5 w-5" /></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
