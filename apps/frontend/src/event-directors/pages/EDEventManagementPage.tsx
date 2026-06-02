import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, MapPin, Users, ClipboardCheck, FileText,
  DollarSign, Trophy, QrCode, Search, Save, Trash2,
  Check, ChevronDown, ChevronUp, Download, Upload, User, Calculator, FileSpreadsheet, File, RotateCcw,
  CheckSquare, Square, CameraOff, X, HelpCircle, AlertCircle
} from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useAuth } from '@/auth/contexts/AuthContext';
import { Pagination } from '@/shared/components';

// Local storage key for ED's completed assignments tracking (shared with EventDirectorAssignments)
const COMPLETED_ASSIGNMENTS_KEY = 'ed_completed_assignments';
import { eventsApi } from '@/events';
import { eventRegistrationsApi } from '@/event-registrations';
import { competitionResultsApi } from '@/competition-results';
import { competitionClassesApi, CompetitionClass } from '@/competition-classes';
import { profilesApi, Profile } from '@/profiles';
import { getMyEventDirectorProfile, EventDirector } from '@/event-directors';

interface EventDetails {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  venue_name: string;
  venue_address: string;
  venue_city?: string;
  venue_state?: string;
  status: string;
  season_id?: string;
  member_entry_fee?: number;
  non_member_entry_fee?: number;
  registration_fee?: number;
  points_multiplier?: number;
}

interface Registration {
  id: string;
  event_id?: string;
  user_id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  registrationStatus: string;
  paymentStatus: string;
  mecaId?: number;
  checkInCode?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
  // Extended with profile data
  profileMecaId?: string;
  membershipStatus?: string;
}

interface ResultEntry {
  id?: string;
  competitor_id: string;
  competitor_name: string;
  meca_id: string;
  competition_class: string;
  class_id: string;
  format: string;
  score: string;
  placement: string;
  points_earned: string;
  wattage?: number | string;
  frequency?: number | string;
  notes: string;
  membership_status?: string;
}

interface EventNote {
  id: string;
  content: string;
  created_at: string;
  created_by: string;
}

interface EventExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  receipt_url?: string;
  created_at: string;
}

type TabType = 'overview' | 'registrations' | 'checkin' | 'results' | 'notes' | 'expenses';
type EntryMethod = 'manual' | 'excel' | 'termlab';

interface ParsedResultItem {
  index: number;
  data: {
    memberID?: string;
    name: string;
    class: string;
    score: number;
    format: string;
    wattage?: number;
    frequency?: number;
  };
  nameMatch?: {
    matchedMecaId: string;
    matchedName: string;
    matchedCompetitorId: string | null;
    confidence: 'exact' | 'partial';
  };
  missingFields: string[];
  isValid: boolean;
  validationErrors: string[];
}

interface UserDecision {
  confirmNameMatch: boolean | null;
  wattage?: number;
  frequency?: number;
  skip: boolean;
}

// Sentinel "send to admin for review" choices. Used in the unknown-class
// resolver (import) and the manual-entry class dropdown so an Event Director
// can submit a result whose class doesn't exist without ever creating one.
const REVIEW_DECISION = 'REVIEW';
const MANUAL_REVIEW_CLASS = '__REVIEW__';

export default function EDEventManagementPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Core State
  const [edProfile, setEdProfile] = useState<EventDirector | null>(null);
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Registrations
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [registrationSearchTerm, setRegistrationSearchTerm] = useState('');

  // QR Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [_currentScanRegistrationId, setCurrentScanRegistrationId] = useState<string | null>(null);

  // Results
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [competitionClasses, setCompetitionClasses] = useState<CompetitionClass[]>([]);
  const [showEntryForm, setShowEntryForm] = useState(true);
  const [entryMethod, setEntryMethod] = useState<EntryMethod>('manual');
  const [currentEntry, setCurrentEntry] = useState<ResultEntry>({
    competitor_id: '',
    competitor_name: '',
    meca_id: '',
    competition_class: '',
    class_id: '',
    format: '',
    score: '',
    placement: '',
    points_earned: '',
    wattage: '',
    frequency: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [resultsSearchTerm, setResultsSearchTerm] = useState('');
  const [selectedMembershipFilter, setSelectedMembershipFilter] = useState<'all' | 'active' | 'expired' | 'non-member'>('all');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Pagination state for results
  const [resultsPage, setResultsPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Enhanced Import Flow
  const [parsedResults, setParsedResults] = useState<ParsedResultItem[]>([]);
  const [userDecisions, setUserDecisions] = useState<Record<number, UserDecision>>({});
  const [showImportReviewModal, setShowImportReviewModal] = useState(false);
  const [importFileExtension, setImportFileExtension] = useState<string>('xlsx');
  // Unknown-class resolution. When parseAndValidate finds class names in the
  // file that don't exist in competition_classes, the ED must resolve each
  // one WITHOUT creating a class (EDs can never add classes to the system):
  //   1. pick the format the class belongs to, then
  //   2. either MAP it to an existing same-format class (the file rows save
  //      under that class), or SEND IT TO ADMIN review (rows save with no
  //      class and appear in the admin "Pending Results" queue).
  const [unknownClasses, setUnknownClasses] = useState<string[]>([]);
  const [unknownClassFormat, setUnknownClassFormat] = useState<Record<string, string>>({});
  // Per unknown class name: the ED's decision — an existing class id (map),
  // or the sentinel REVIEW_DECISION (send to admin).
  const [unknownClassDecision, setUnknownClassDecision] = useState<Record<string, string>>({});

  // Membership status tracking for current entry
  const [currentEntryMembershipStatus, setCurrentEntryMembershipStatus] = useState<string>('');

  // Notes
  const [notes, setNotes] = useState<EventNote[]>([]);
  const [newNote, setNewNote] = useState('');

  // Expenses
  const [expenses, setExpenses] = useState<EventExpense[]>([]);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'general' });

  // Stats
  const [stats, setStats] = useState({
    totalRegistrations: 0,
    checkedIn: 0,
    resultsEntered: 0,
    totalExpenses: 0,
  });

  // ED's personal completed tracking
  const [isEventCompleted, setIsEventCompleted] = useState(false);

  // Load completed status from localStorage
  useEffect(() => {
    if (eventId) {
      const stored = localStorage.getItem(COMPLETED_ASSIGNMENTS_KEY);
      if (stored) {
        try {
          const completedIds = JSON.parse(stored);
          // Check if any assignment ID contains this event ID (assignments store event_director_assignment IDs, but we use event ID here)
          setIsEventCompleted(completedIds.includes(eventId) || completedIds.some((id: string) => id.includes(eventId)));
        } catch {
          setIsEventCompleted(false);
        }
      }
    }
  }, [eventId]);

  const toggleEventCompleted = () => {
    if (!eventId) return;

    const stored = localStorage.getItem(COMPLETED_ASSIGNMENTS_KEY);
    let completedIds: string[] = [];
    if (stored) {
      try {
        completedIds = JSON.parse(stored);
      } catch {
        completedIds = [];
      }
    }

    if (isEventCompleted) {
      // Remove from completed
      completedIds = completedIds.filter(id => id !== eventId);
    } else {
      // Add to completed
      completedIds.push(eventId);
    }

    localStorage.setItem(COMPLETED_ASSIGNMENTS_KEY, JSON.stringify(completedIds));
    setIsEventCompleted(!isEventCompleted);
  };

  const availableFormats = ['SPL', 'SQL', 'Show and Shine', 'Ride the Light'];
  // Distinct formats that actually have classes in the system, used by the
  // unknown-class resolver so the "same-format class" dropdown is always
  // populated and the chosen format string matches real class rows exactly.
  const classFormatOptions = Array.from(
    new Set(competitionClasses.map((c) => c.format).filter(Boolean)),
  ).sort();
  const expenseCategories = ['general', 'venue', 'equipment', 'supplies', 'travel', 'food', 'other'];

  useEffect(() => {
    if (profile && eventId) {
      fetchEDProfile();
    }
  }, [profile, eventId]);

  useEffect(() => {
    if (edProfile && eventId) {
      fetchEventDetails();
      fetchRegistrations();
      fetchResults();
      fetchCompetitionClasses();
      // Competitor lookup is now on-demand via lookupCompetitorByMecaId /
      // lookupCompetitorByName — no need to preload all 10K profiles.
    }
  }, [edProfile, eventId]);

  const fetchEDProfile = async () => {
    try {
      const ed = await getMyEventDirectorProfile();
      if (ed && ed.is_active) {
        setEdProfile(ed);
      } else {
        navigate('/dashboard/mymeca');
      }
    } catch (error) {
      console.error('Error fetching ED profile:', error);
      navigate('/dashboard/mymeca');
    }
  };

  const fetchEventDetails = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const eventData = await eventsApi.getById(eventId);
      setEvent(eventData);
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    if (!eventId) return;
    try {
      setRegistrationsLoading(true);
      const data = await eventRegistrationsApi.getEventRegistrations(eventId);

      // The backend already populates the registration's `user` (Profile)
      // — meca_id and membership_status come back nested. Use them directly
      // instead of pulling all 10K profiles client-side, which (a) is the
      // wrong scale and (b) requires admin permissions the ED doesn't have.
      const enrichedRegistrations = data.map((reg: any) => ({
        ...reg,
        profileMecaId: reg.user?.meca_id ?? null,
        membershipStatus: reg.user?.membership_status ?? 'none',
      }));

      setRegistrations(enrichedRegistrations);
      updateStats(enrichedRegistrations);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setRegistrationsLoading(false);
    }
  };

  const fetchResults = async () => {
    if (!eventId) return;
    try {
      setResultsLoading(true);
      const data = await competitionResultsApi.getByEvent(eventId);

      // No more 10K profile dump for enrichment. The result row already
      // carries meca_id, competitor_name, etc. Membership status for the
      // display badge falls back to 'unknown' here — it gets refreshed
      // accurately when the ED edits a row (the search lookup populates
      // currentEntryMembershipStatus). 999999 stays 'none' (back-filled
      // for expired members per MEMBERSHIP_LIFECYCLE).
      const mappedResults = data.map((r: any) => ({
        id: r.id,
        competitor_id: r.competitor_id || r.profile_id,
        competitor_name: r.competitor_name || `${r.profile?.first_name || ''} ${r.profile?.last_name || ''}`.trim(),
        meca_id: r.meca_id || r.profile?.meca_id || '',
        competition_class: r.competition_class || r.class?.name || '',
        class_id: r.class_id,
        format: r.format,
        score: r.score?.toString() || '',
        placement: r.placement?.toString() || '',
        points_earned: r.points_earned?.toString() || '0',
        wattage: r.wattage || '',
        frequency: r.frequency || '',
        notes: r.notes || '',
        // Prefer the membership status resolved server-side (active/expired/none)
        // so the Overview revenue split between members and non-members is
        // accurate. Fall back to the old heuristic only if the backend didn't
        // supply it.
        membership_status: r.membership_status ?? (r.meca_id === '999999' ? 'none' : 'unknown'),
      }));
      setResults(mappedResults);
      setStats(prev => ({ ...prev, resultsEntered: mappedResults.length }));
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setResultsLoading(false);
    }
  };

  const fetchCompetitionClasses = async () => {
    try {
      const data = await competitionClassesApi.getAll();
      setCompetitionClasses(data.filter((c: CompetitionClass) => c.is_active));
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  // Small client-side cache so the same MECA ID / name lookup doesn't
  // round-trip on every keystroke. Keyed by the lowercased query string.
  const competitorLookupCache = useRef<Map<string, Profile | null>>(new Map());

  /**
   * Look up a competitor by MECA ID via the bounded profile search endpoint
   * (returns max 20 rows, requires a query). Used by handleMecaIdChange to
   * auto-fill name + membership status as the ED types — replacing the
   * old "load 10K profiles into memory" approach.
   */
  const lookupCompetitorByMecaId = async (mecaId: string): Promise<Profile | null> => {
    const key = `meca:${mecaId.toLowerCase()}`;
    if (competitorLookupCache.current.has(key)) {
      return competitorLookupCache.current.get(key) ?? null;
    }
    try {
      const results = await profilesApi.searchProfiles(mecaId);
      const target = mecaId.trim().toLowerCase();
      const match = results.find((p) => String(p.meca_id || '').trim().toLowerCase() === target) || null;
      competitorLookupCache.current.set(key, match);
      return match;
    } catch (error) {
      console.error('Competitor MECA ID lookup failed:', error);
      return null;
    }
  };

  /**
   * Exact-full-name lookup. Same pattern as MECA ID — bounded search,
   * cached, returns null if no exact match.
   */
  const lookupCompetitorByName = async (fullName: string): Promise<Profile | null> => {
    const key = `name:${fullName.toLowerCase()}`;
    if (competitorLookupCache.current.has(key)) {
      return competitorLookupCache.current.get(key) ?? null;
    }
    try {
      const results = await profilesApi.searchProfiles(fullName);
      const target = fullName.trim().toLowerCase();
      const match = results.find((p) => {
        const full = `${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase();
        return full === target;
      }) || null;
      competitorLookupCache.current.set(key, match);
      return match;
    } catch (error) {
      console.error('Competitor name lookup failed:', error);
      return null;
    }
  };

  const updateStats = (regs: Registration[]) => {
    setStats(prev => ({
      ...prev,
      totalRegistrations: regs.length,
      checkedIn: regs.filter(r => r.checkedIn).length,
    }));
  };

  const handleCheckIn = async (checkInCode: string) => {
    if (!profile?.id) return;
    try {
      await eventRegistrationsApi.checkIn(checkInCode, profile.id);
      await fetchRegistrations();
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Failed to check in competitor');
    }
  };

  const handleUndoCheckIn = async (registrationId: string) => {
    try {
      // Call the update endpoint to set checkedIn to false
      await eventRegistrationsApi.update(registrationId, { checkedIn: false, checkedInAt: undefined });
      await fetchRegistrations();
    } catch (error) {
      console.error('Error undoing check-in:', error);
      alert('Failed to undo check-in');
    }
  };

  // Open scanner for a specific registration
  const openScanner = (registrationId?: string) => {
    setCurrentScanRegistrationId(registrationId || null);
    setScannerError(null);
    setShowScanner(true);
  };

  // Handle QR code scan result
  const handleScan = async (result: { rawValue: string }[]) => {
    if (result && result.length > 0) {
      const scannedCode = result[0].rawValue;
      if (scannedCode) {
        setShowScanner(false);

        // Try to check in with the scanned code
        try {
          if (!profile?.id) {
            alert('You must be logged in to check in competitors');
            return;
          }
          await eventRegistrationsApi.checkIn(scannedCode.trim(), profile.id);
          await fetchRegistrations();
        } catch (error) {
          console.error('Check-in error:', error);
          alert(error instanceof Error ? error.message : 'Check-in failed. Please try manual check-in.');
        }
      }
    }
  };

  // Handle scanner errors
  const handleScanError = (error: unknown) => {
    console.error('Scanner error:', error);
    if (error instanceof Error) {
      setScannerError(error.message);
    }
  };

  // Tracks the latest in-flight lookup so a stale response can't overwrite
  // a newer one (typing fast → multiple requests in flight, responses
  // arriving out of order). The handler ignores any response that isn't
  // its own token.
  const mecaIdLookupTokenRef = useRef(0);
  const nameLookupTokenRef = useRef(0);

  const handleMecaIdChange = async (mecaId: string) => {
    // ALWAYS update the meca_id to whatever the user typed - no restrictions
    const updated: ResultEntry = {
      ...currentEntry,
      meca_id: mecaId,
    };

    if (!mecaId) {
      // MECA ID was cleared - reset related fields
      updated.competitor_id = '';
      updated.competitor_name = '';
      setCurrentEntryMembershipStatus('');
      setCurrentEntry(updated);
      return;
    }

    // Apply the typed value immediately so the input stays responsive while
    // we fire the lookup.
    setCurrentEntry(updated);

    if (mecaId.length < 4) {
      // Still typing — too short to look up meaningfully.
      setCurrentEntryMembershipStatus('');
      return;
    }

    const token = ++mecaIdLookupTokenRef.current;
    const competitor = await lookupCompetitorByMecaId(mecaId);
    if (token !== mecaIdLookupTokenRef.current) return; // stale response

    if (competitor) {
      const membershipStatus = competitor.membership_status || '';
      setCurrentEntryMembershipStatus(membershipStatus);
      setCurrentEntry((prev) => ({
        ...prev,
        competitor_id: competitor.id,
        competitor_name: `${competitor.first_name || ''} ${competitor.last_name || ''}`.trim(),
        // If membership is not active, they won't earn points
        points_earned: membershipStatus !== 'active' ? '0' : prev.points_earned,
      }));
    } else {
      // MECA ID not found in system
      setCurrentEntryMembershipStatus('');
    }
  };

  const handleNameChange = async (name: string) => {
    // ALWAYS update the name to whatever the user typed
    const updated: ResultEntry = {
      ...currentEntry,
      competitor_name: name,
    };

    if (!name || name.trim() === '') {
      // Name was cleared - reset related fields
      updated.meca_id = '';
      updated.competitor_id = '';
      updated.points_earned = '';
      setCurrentEntryMembershipStatus('');
      setCurrentEntry(updated);
      return;
    }

    // Apply the typed name immediately so the input stays responsive.
    setCurrentEntry(updated);

    if (name.trim().length < 3) {
      // Too short for a meaningful lookup.
      setCurrentEntryMembershipStatus('');
      return;
    }

    const token = ++nameLookupTokenRef.current;
    const matchingCompetitor = await lookupCompetitorByName(name);
    if (token !== nameLookupTokenRef.current) return; // stale response

    if (matchingCompetitor) {
      // Found exact match - check membership status
      const membershipStatus = matchingCompetitor.membership_status || '';
      setCurrentEntryMembershipStatus(membershipStatus);
      setCurrentEntry((prev) => {
        if (membershipStatus === 'active') {
          // Active member - populate their MECA ID
          return {
            ...prev,
            competitor_id: matchingCompetitor.id,
            meca_id: String(matchingCompetitor.meca_id || ''),
          };
        }
        // Expired membership - keep their actual MECA ID for admin view
        // but mark as expired (no points)
        return {
          ...prev,
          competitor_id: matchingCompetitor.id,
          meca_id: String(matchingCompetitor.meca_id || '') || '999999',
          points_earned: '0',
        };
      });
    } else {
      // No exact match found - this is a non-member, use 999999
      setCurrentEntry((prev) => ({
        ...prev,
        competitor_id: '',
        meca_id: '999999',
        points_earned: '0',
      }));
      setCurrentEntryMembershipStatus('');
    }
  };

  // Check if wattage/frequency is required for this class. Mirrors the
  // admin Results Entry helper (ResultsEntryNew.tsx) and the backend
  // helper (competition-results.service.ts) so the ED page enforces the
  // same rules: required ONLY for SPL classes, EXCEPT classes flagged
  // unlimited_wattage in the class config or any legacy class-name match
  // for "dueling demos". SQL / Dueling Demo / Show and Shine / Ride the
  // Light / SSI / MK never require wattage or frequency. Park and Pound
  // classes within SPL ARE required.
  //
  // Case-insensitive on the format value to match the backend.
  const isWattageFrequencyRequired = (format: string, className: string): boolean => {
    if (!format || format.toUpperCase() !== 'SPL') return false;
    const matchedClass = competitionClasses.find(
      c => c.name.toLowerCase() === (className || '').toLowerCase() ||
           c.abbreviation.toLowerCase() === (className || '').toLowerCase()
    );
    if (matchedClass?.unlimited_wattage) return false;
    const classLower = (className || '').toLowerCase();
    return !classLower.includes('dueling demos');
  };

  const handleSaveResult = async () => {
    // When the class isn't in the system the ED picks "send to admin for
    // review" (sentinel), then types the class name. EDs can't create
    // classes, so this path saves the result with no class_id — the backend
    // flags it for the admin "Pending Results" queue.
    const isReviewEntry = currentEntry.class_id === MANUAL_REVIEW_CLASS;

    if (!eventId || !currentEntry.format || !currentEntry.score) {
      alert('Please fill in all required fields');
      return;
    }
    if (!isReviewEntry && !currentEntry.class_id) {
      alert('Please select a class');
      return;
    }
    if (isReviewEntry && !currentEntry.competition_class.trim()) {
      alert('Enter the class name to send to admin for review');
      return;
    }

    // Ensure we have either a MECA ID or a name
    if (!currentEntry.meca_id && !currentEntry.competitor_name) {
      alert('Please enter a MECA ID or competitor name');
      return;
    }

    // Check wattage/frequency requirement for SPL classes (except Dueling Demos)
    if (isWattageFrequencyRequired(currentEntry.format, currentEntry.competition_class)) {
      if (!currentEntry.wattage || !currentEntry.frequency) {
        alert('Wattage and Frequency are required for SPL classes (except Dueling Demos)');
        return;
      }
    }

    // If no MECA ID but has name, set to 999999
    const mecaId = currentEntry.meca_id || '999999';

    setSaving(true);
    try {
      // Look up the class NAME for the selected class id. The backend's
      // `competition_class` text column is NOT NULL and only takes a
      // text value — sending just `class_id` would have left it empty
      // and triggered a NOT NULL violation. This is what was silently
      // breaking SQ / DD manual entry from the ED page (admin worked
      // because the admin form passed both fields).
      const selectedClass = competitionClasses.find(c => c.id === currentEntry.class_id);
      const competitionClassName = isReviewEntry
        ? currentEntry.competition_class.trim()
        : (selectedClass?.name || currentEntry.competition_class || '');

      await competitionResultsApi.create({
        event_id: eventId,
        competitor_id: currentEntry.competitor_id || undefined,
        competitor_name: currentEntry.competitor_name,
        meca_id: mecaId,
        // Review entries carry no class_id; the backend flags them for the
        // admin Pending Results queue (needs_class_review).
        class_id: isReviewEntry ? undefined : currentEntry.class_id,
        competition_class: competitionClassName,
        format: currentEntry.format,
        score: parseFloat(currentEntry.score),
        // `placement` is NOT NULL on the entity — backend recalculates
        // event placements after each insert, so 0 is a safe default
        // that gets immediately overwritten when updateEventPoints runs.
        placement: currentEntry.placement ? parseInt(currentEntry.placement) : 0,
        wattage: currentEntry.wattage ? parseFloat(currentEntry.wattage.toString()) : undefined,
        frequency: currentEntry.frequency ? parseFloat(currentEntry.frequency.toString()) : undefined,
        notes: currentEntry.notes,
        created_by: profile?.id,
      });

      // Clear form and refresh results
      setCurrentEntry({
        competitor_id: '',
        competitor_name: '',
        meca_id: '',
        competition_class: '',
        class_id: '',
        format: currentEntry.format, // Keep format selected
        score: '',
        placement: '',
        points_earned: '',
        wattage: '',
        frequency: '',
        notes: '',
      });
      setCurrentEntryMembershipStatus('');
      await fetchResults();
    } catch (error) {
      console.error('Error saving result:', error);
      alert('Failed to save result');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteResult = async (resultId: string) => {
    const reason = prompt('Please enter a reason for deleting this result:');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('A reason is required to delete a result.');
      return;
    }

    if (!confirm('Are you sure you want to delete this result?')) return;

    try {
      await competitionResultsApi.delete(resultId, profile?.id, reason.trim());
      await fetchResults();
    } catch (error) {
      console.error('Error deleting result:', error);
      alert('Failed to delete result');
    }
  };

  const handleRecalculatePoints = async () => {
    if (!eventId) return;

    setSaving(true);
    try {
      await competitionResultsApi.recalculatePoints(eventId);
      alert('Points recalculated successfully!');
      await fetchResults();
    } catch (error: any) {
      console.error('Error recalculating points:', error);
      // Surface the backend's actual error message (sent in the 500 body)
      // instead of axios's generic "Request failed with status code 500".
      const message = error?.response?.data?.message || error?.message || 'Unknown error';
      alert('Failed to recalculate points: ' + message);
    }
    setSaving(false);
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/templates/MecaEventResults_Template.xlsx';
    link.download = 'MecaEventResults_Template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.tlab')) {
      alert('Please select a valid file (.xlsx, .xls, or .tlab)');
      return;
    }

    setSelectedFile(file);
    setUploading(true);

    try {
      // Use the new parseAndValidate endpoint
      const result = await competitionResultsApi.parseAndValidate(eventId, file);

      // Initialize user decisions with defaults
      const initialDecisions: Record<number, UserDecision> = {};
      for (const item of result.results) {
        initialDecisions[item.index] = {
          confirmNameMatch: item.nameMatch ? null : null,
          wattage: item.data.wattage,
          frequency: item.data.frequency,
          skip: !item.isValid,
        };
      }

      setParsedResults(result.results);
      setUserDecisions(initialDecisions);
      setImportFileExtension(result.fileExtension);
      setUnknownClasses(result.unknownClasses || []);
      // Reset per-class format + decision for the newly-parsed file.
      setUnknownClassFormat({});
      setUnknownClassDecision({});
      setShowImportReviewModal(true);
    } catch (error: any) {
      alert('Error parsing file: ' + error.message);
    }

    setUploading(false);
  };

  const handleConfirmImport = async () => {
    if (!eventId || !profile?.id) return;

    setUploading(true);

    try {
      // Build the final results array applying user decisions
      const finalResults: any[] = [];
      const resolutions: Record<number, 'skip' | 'replace'> = {};

      for (const item of parsedResults) {
        const decision = userDecisions[item.index];

        // Skip if user marked as skip
        if (decision?.skip) {
          resolutions[item.index] = 'skip';
          continue;
        }

        // Check if name match needs confirmation but wasn't decided
        if (item.nameMatch && decision?.confirmNameMatch === null) {
          resolutions[item.index] = 'skip';
          continue;
        }

        // Check if missing fields weren't filled
        if (item.missingFields.length > 0) {
          const hasMissingWattage = item.missingFields.includes('wattage') && !decision?.wattage;
          const hasMissingFrequency = item.missingFields.includes('frequency') && !decision?.frequency;
          if (hasMissingWattage || hasMissingFrequency) {
            resolutions[item.index] = 'skip';
            continue;
          }
        }

        // Build the result data
        const resultData = {
          ...item.data,
          memberID: item.nameMatch && decision?.confirmNameMatch === true
            ? item.nameMatch.matchedMecaId
            : item.data.memberID || '999999',
          wattage: decision?.wattage || item.data.wattage,
          frequency: decision?.frequency || item.data.frequency,
        };

        // Apply the ED's unknown-class decision (only set for class names the
        // parse flagged as not-in-system). MAP → rewrite the row to the chosen
        // existing class so it imports linked. REVIEW → keep the entered class
        // name but tag the ED-selected format; with no class match the backend
        // saves it with needs_class_review = true for the admin queue.
        const rowClass = String(item.data.class || '').trim();
        const classDecision = unknownClassDecision[rowClass];
        if (classDecision) {
          if (classDecision === REVIEW_DECISION) {
            resultData.format = unknownClassFormat[rowClass] || resultData.format;
          } else {
            const mapped = competitionClasses.find(c => c.id === classDecision);
            if (mapped) {
              resultData.class = mapped.name;
              resultData.format = mapped.format;
            }
          }
        }

        finalResults.push(resultData);
      }

      if (finalResults.length === 0) {
        alert('No results to import. All entries were skipped or missing required data.');
        setUploading(false);
        return;
      }

      // Import using the resolution endpoint
      const result = await competitionResultsApi.importWithResolution(
        eventId,
        finalResults,
        resolutions,
        profile.id,
        importFileExtension
      );

      let message = result.message;
      if (result.errors && result.errors.length > 0) {
        message += '\n\nErrors:\n' + result.errors.join('\n');
      }

      alert(message);

      // Clear and refresh
      setSelectedFile(null);
      setParsedResults([]);
      setUserDecisions({});
      setShowImportReviewModal(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Recalculate points after import
      await handleRecalculatePoints();
      await fetchResults();
    } catch (error: any) {
      alert('Failed to import file: ' + error.message);
    }

    setUploading(false);
  };

  const filteredResults = useMemo(() => {
    return results.filter(r => {
      if (selectedFormat && r.format !== selectedFormat) return false;
      if (selectedClass && r.class_id !== selectedClass) return false;

      // Membership filter
      if (selectedMembershipFilter !== 'all') {
        if (selectedMembershipFilter === 'non-member') {
          // Non-member = MECA ID is 999999 or empty
          if (r.meca_id && r.meca_id !== '999999') return false;
        } else if (selectedMembershipFilter === 'active') {
          // Active = has valid membership
          if (!r.membership_status || r.membership_status !== 'active') return false;
        } else if (selectedMembershipFilter === 'expired') {
          // Expired = has MECA ID but expired membership
          if (r.meca_id === '999999' || !r.meca_id) return false;
          if (r.membership_status === 'active') return false;
        }
      }

      if (resultsSearchTerm) {
        const search = resultsSearchTerm.toLowerCase();
        return (
          r.meca_id?.toLowerCase().includes(search) ||
          r.competitor_name?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [results, selectedFormat, selectedClass, selectedMembershipFilter, resultsSearchTerm]);

  // Paginated results
  const paginatedResults = useMemo(() => {
    const startIndex = (resultsPage - 1) * resultsPerPage;
    return filteredResults.slice(startIndex, startIndex + resultsPerPage);
  }, [filteredResults, resultsPage, resultsPerPage]);

  const totalResultsPages = Math.ceil(filteredResults.length / resultsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setResultsPage(1);
  }, [selectedFormat, selectedClass, selectedMembershipFilter, resultsSearchTerm]);

  const filteredRegistrations = registrations.filter(reg => {
    if (!registrationSearchTerm) return true;
    const search = registrationSearchTerm.toLowerCase();
    return (
      reg.firstName?.toLowerCase().includes(search) ||
      reg.lastName?.toLowerCase().includes(search) ||
      reg.email?.toLowerCase().includes(search) ||
      reg.mecaId?.toString().includes(search) ||
      reg.profileMecaId?.toLowerCase().includes(search) ||
      `${reg.firstName || ''} ${reg.lastName || ''}`.toLowerCase().includes(search)
    );
  });

  const getClassesForFormat = (format: string) => {
    return competitionClasses
      .filter(c => event?.season_id ? c.season_id === event.season_id : true)
      .filter(c => c.format === format);
  };

  const getMembershipRowClass = (status?: string) => {
    if (status === 'active') return 'bg-green-500/10 border-l-4 border-green-500';
    if (status === 'expired') return 'bg-red-500/10 border-l-4 border-red-500';
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Event Not Found</h2>
          <p className="text-gray-400 mb-4">This event doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => navigate('/event-directors/assignments')}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Back to Assignments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => navigate('/event-directors/assignments')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Assignments
          </button>
        </div>

        {/* Event Header */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{event.title}</h1>
              <div className="flex flex-wrap gap-4 text-gray-400">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(event.event_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {event.venue_name}, {event.venue_city}, {event.venue_state}
                </span>
              </div>
            </div>

            {/* Mark as Completed Button */}
            <button
              onClick={toggleEventCompleted}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isEventCompleted
                  ? 'bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600 hover:text-white'
              }`}
              title={isEventCompleted ? 'Mark as incomplete' : 'Mark as completed on your list'}
            >
              {isEventCompleted ? (
                <>
                  <CheckSquare className="h-5 w-5" />
                  Completed
                </>
              ) : (
                <>
                  <Square className="h-5 w-5" />
                  Mark Complete
                </>
              )}
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Registrations</p>
              <p className="text-2xl font-bold text-white">{stats.totalRegistrations}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Checked In</p>
              <p className="text-2xl font-bold text-green-500">{stats.checkedIn}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Results Entered</p>
              <p className="text-2xl font-bold text-orange-500">{stats.resultsEntered}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Status</p>
              <p className="text-2xl font-bold text-blue-500 capitalize">{event.status}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'registrations', label: 'Registrations', icon: Users },
            { id: 'checkin', label: 'Check-In', icon: ClipboardCheck },
            { id: 'results', label: 'Enter Results', icon: Trophy },
            { id: 'notes', label: 'Notes', icon: FileText },
            { id: 'expenses', label: 'Expenses', icon: DollarSign },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-800 text-gray-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-slate-800 rounded-xl p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Event Details</h2>

              {/* Points Multiplier Banner - shown at top if applicable */}
              {event.points_multiplier && event.points_multiplier > 1 && (
                <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-6 w-6 text-orange-400" />
                    <span className="text-orange-400 font-bold text-lg">
                      {event.points_multiplier}X Points Event
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Description</h3>
                  <p className="text-white">{event.description || 'No description provided'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Venue</h3>
                  <p className="text-white">{event.venue_name}</p>
                  <p className="text-gray-400">{event.venue_address}</p>
                  <p className="text-gray-400">{event.venue_city}, {event.venue_state}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Entry Fees</h3>
                  <p className="text-white">
                    Members: {event.member_entry_fee != null ? `$${event.member_entry_fee}` : 'Not set'}
                  </p>
                  <p className="text-white">
                    Non-Members: {event.non_member_entry_fee != null ? `$${event.non_member_entry_fee}` : 'Not set'}
                  </p>
                </div>
              </div>

              {/* Revenue Calculation Based on Results */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Event Revenue (Based on Results Entered)</h3>
                {(() => {
                  const memberFee = event.member_entry_fee ?? 30;
                  const nonMemberFee = event.non_member_entry_fee ?? 35;
                  const memberResults = results.filter(r => r.membership_status === 'active');
                  const nonMemberResults = results.filter(r => r.membership_status !== 'active');
                  const memberCount = memberResults.length;
                  const nonMemberCount = nonMemberResults.length;
                  const memberRevenue = memberCount * memberFee;
                  const nonMemberRevenue = nonMemberCount * nonMemberFee;
                  const totalRevenue = memberRevenue + nonMemberRevenue;

                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-white">
                        <span>Active Members ({memberCount} x ${memberFee.toFixed(2)})</span>
                        <span className="font-semibold">${memberRevenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-white">
                        <span>Non-Members / Expired ({nonMemberCount} x ${nonMemberFee.toFixed(2)})</span>
                        <span className="font-semibold">${nonMemberRevenue.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-slate-600 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-white">Total Revenue</span>
                          <span className="text-lg font-bold text-green-400">${totalRevenue.toFixed(2)}</span>
                        </div>
                      </div>
                      <p className="text-gray-500 text-xs mt-2">
                        Based on {results.length} results entered
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Registrations Tab */}
          {activeTab === 'registrations' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Pre-Registered Competitors ({registrations.length})</h2>
                <button
                  onClick={() => setActiveTab('checkin')}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  <QrCode className="h-4 w-4" />
                  Scan QR Code
                </button>
              </div>

              {/* Legend */}
              <div className="flex gap-4 mb-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded"></span>
                  <span className="text-gray-400">Active Membership</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded"></span>
                  <span className="text-gray-400">Expired Membership</span>
                </span>
              </div>

              {/* Search Box */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={registrationSearchTerm}
                    onChange={(e) => setRegistrationSearchTerm(e.target.value)}
                    placeholder="Search by name, email, or MECA ID..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {registrationsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-r-transparent rounded-full"></div>
                </div>
              ) : filteredRegistrations.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {registrationSearchTerm ? 'No registrations match your search.' : 'No pre-registrations for this event yet.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">MECA ID</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Checked In</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegistrations.map(reg => (
                        <tr
                          key={reg.id}
                          className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${getMembershipRowClass(reg.membershipStatus)}`}
                        >
                          <td className="py-3 px-4 text-white font-mono">
                            {reg.profileMecaId || reg.mecaId || '-'}
                          </td>
                          <td className="py-3 px-4 text-white">
                            {reg.firstName} {reg.lastName}
                          </td>
                          <td className="py-3 px-4 text-gray-400">{reg.email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              reg.registrationStatus === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                              reg.registrationStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {reg.registrationStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {reg.checkedIn ? (
                              <span className="flex items-center gap-1 text-green-400">
                                <Check className="h-4 w-4" /> Yes
                              </span>
                            ) : (
                              <span className="text-gray-400">No</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {reg.checkedIn ? (
                                <button
                                  onClick={() => handleUndoCheckIn(reg.id)}
                                  className="flex items-center gap-1 px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                                  title="Undo check-in"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Undo
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => openScanner(reg.id)}
                                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                    title="Scan QR Code"
                                  >
                                    <QrCode className="h-3 w-3" />
                                    Scan
                                  </button>
                                  {reg.checkInCode && (
                                    <button
                                      onClick={() => handleCheckIn(reg.checkInCode!)}
                                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                    >
                                      Check In
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Check-In Tab */}
          {activeTab === 'checkin' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Check-In Competitors</h2>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400">
                    {stats.checkedIn} / {stats.totalRegistrations} checked in
                  </span>
                </div>
              </div>

              {/* QR Code Scanner Placeholder */}
              <div className="bg-slate-700/50 rounded-lg p-6 mb-6 text-center">
                <QrCode className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">QR Code Scanner</p>
                <p className="text-gray-500 text-sm">Scan competitor's QR code to check them in</p>
                <button
                  onClick={() => openScanner()}
                  className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Open Scanner
                </button>
              </div>

              {/* Legend */}
              <div className="flex gap-4 mb-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded"></span>
                  <span className="text-gray-400">Active Membership</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded"></span>
                  <span className="text-gray-400">Expired Membership</span>
                </span>
              </div>

              {/* Manual Check-In List */}
              <h3 className="text-lg font-semibold text-white mb-4">Manual Check-In</h3>
              <div className="space-y-2">
                {registrations.map(reg => (
                  <div
                    key={reg.id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      reg.checkedIn
                        ? 'bg-green-500/10 border border-green-500/20'
                        : `bg-slate-700/50 ${getMembershipRowClass(reg.membershipStatus)}`
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {reg.firstName} {reg.lastName}
                        </p>
                        <p className="text-gray-400 text-sm font-mono">
                          {reg.profileMecaId || reg.mecaId || 'No MECA ID'}
                          {reg.membershipStatus === 'active' && (
                            <span className="ml-2 text-green-400 text-xs">(Active)</span>
                          )}
                          {reg.membershipStatus === 'expired' && (
                            <span className="ml-2 text-red-400 text-xs">(Expired)</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {reg.checkedIn ? (
                        <>
                          <span className="text-green-400 text-sm flex items-center gap-1">
                            <Check className="h-4 w-4" />
                            Checked in{reg.checkedInAt ? ` at ${new Date(reg.checkedInAt).toLocaleTimeString()}` : ''}
                          </span>
                          <button
                            onClick={() => handleUndoCheckIn(reg.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 ml-2"
                            title="Undo check-in"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Undo
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => openScanner(reg.id)}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            title="Scan QR Code"
                          >
                            <QrCode className="h-4 w-4" />
                            Scan QR
                          </button>
                          {reg.checkInCode ? (
                            <button
                              onClick={() => handleCheckIn(reg.checkInCode!)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              Check In
                            </button>
                          ) : (
                            <span className="text-gray-500 text-sm">No check-in code</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results Entry Tab */}
          {activeTab === 'results' && (
            <div>
              {/* Entry Form */}
              <div className="bg-slate-700/50 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    Enter Results for This Event
                    <span
                      className="cursor-help"
                      title="View Results Entry Guide"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open('/docs/ED-Results-Entry-Guide.html', '_blank', 'width=900,height=800');
                      }}
                    >
                      <HelpCircle className="h-5 w-5 text-blue-400 hover:text-blue-300" />
                    </span>
                  </h3>
                  <button
                    onClick={() => setShowEntryForm(!showEntryForm)}
                    className="text-gray-400 hover:text-white"
                  >
                    {showEntryForm ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>

                {showEntryForm && (
                  <div>
                    {/* Entry Method Tabs */}
                    <div className="flex gap-2 mb-4 border-b border-slate-600">
                      <button
                        onClick={() => setEntryMethod('manual')}
                        className={`px-4 py-2 font-semibold transition-colors ${
                          entryMethod === 'manual'
                            ? 'text-orange-400 border-b-2 border-orange-400'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Manual Entry
                      </button>
                      <button
                        onClick={() => setEntryMethod('excel')}
                        className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${
                          entryMethod === 'excel'
                            ? 'text-orange-400 border-b-2 border-orange-400'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel Import
                      </button>
                      <button
                        onClick={() => setEntryMethod('termlab')}
                        className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${
                          entryMethod === 'termlab'
                            ? 'text-orange-400 border-b-2 border-orange-400'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <File className="h-4 w-4" />
                        TermLab Import
                      </button>
                    </div>

                    {/* Manual Entry */}
                    {entryMethod === 'manual' && (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">MECA ID</label>
                          <input
                            type="text"
                            value={currentEntry.meca_id}
                            onChange={(e) => handleMecaIdChange(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white"
                            placeholder="Enter ID"
                          />
                          <p className="text-xs text-gray-500 mt-1">Leave blank for non-members</p>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">
                            Name *
                            {currentEntryMembershipStatus === 'expired' && (
                              <span className="ml-1 text-red-400">(Expired)</span>
                            )}
                            {currentEntryMembershipStatus === 'active' && (
                              <span className="ml-1 text-green-400">(Active)</span>
                            )}
                          </label>
                          <input
                            type="text"
                            value={currentEntry.competitor_name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            className={`w-full px-3 py-2 bg-slate-600 rounded ${
                              currentEntryMembershipStatus === 'expired'
                                ? 'border-2 border-red-500 text-red-400'
                                : currentEntryMembershipStatus === 'active'
                                ? 'border-2 border-green-500 text-white'
                                : 'border border-slate-500 text-white'
                            }`}
                            placeholder="Competitor name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Format *</label>
                          <select
                            value={currentEntry.format}
                            onChange={(e) => setCurrentEntry(prev => ({ ...prev, format: e.target.value, class_id: '', competition_class: '' }))}
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white"
                          >
                            <option value="">Select</option>
                            {availableFormats.map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Class *</label>
                          <select
                            value={currentEntry.class_id}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === MANUAL_REVIEW_CLASS) {
                                // Not in the system → ED will type the name and
                                // send it to admin review (no class created).
                                setCurrentEntry(prev => ({ ...prev, class_id: val, competition_class: '' }));
                                return;
                              }
                              const cls = competitionClasses.find(c => c.id === val);
                              setCurrentEntry(prev => ({
                                ...prev,
                                class_id: val,
                                competition_class: cls?.name || '',
                              }));
                            }}
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white"
                            disabled={!currentEntry.format}
                          >
                            <option value="">Select</option>
                            {getClassesForFormat(currentEntry.format).map(c => (
                              <option key={c.id} value={c.id}>{c.abbreviation} - {c.name}</option>
                            ))}
                            <option value={MANUAL_REVIEW_CLASS}>⚑ Class not listed — send to admin</option>
                          </select>
                          {currentEntry.class_id === MANUAL_REVIEW_CLASS && (
                            <input
                              type="text"
                              value={currentEntry.competition_class}
                              onChange={(e) => setCurrentEntry(prev => ({ ...prev, competition_class: e.target.value }))}
                              className="w-full mt-1 px-3 py-2 bg-slate-600 border border-amber-500/60 rounded text-white text-sm"
                              placeholder="Type the class name (admin will review)"
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Score *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={currentEntry.score}
                            onChange={(e) => setCurrentEntry(prev => ({ ...prev, score: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">
                            Wattage{isWattageFrequencyRequired(currentEntry.format, currentEntry.competition_class) && <span className="text-orange-400"> *</span>}
                          </label>
                          <input
                            type="number"
                            value={currentEntry.wattage}
                            onChange={(e) => setCurrentEntry(prev => ({ ...prev, wattage: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white"
                            placeholder="6000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">
                            Freq (Hz){isWattageFrequencyRequired(currentEntry.format, currentEntry.competition_class) && <span className="text-orange-400"> *</span>}
                          </label>
                          <input
                            type="number"
                            value={currentEntry.frequency}
                            onChange={(e) => setCurrentEntry(prev => ({ ...prev, frequency: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white"
                            placeholder="45"
                          />
                        </div>
                        <div className="col-span-2 md:col-span-4 lg:col-span-7 flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setCurrentEntry({
                                competitor_id: '',
                                competitor_name: '',
                                meca_id: '',
                                competition_class: '',
                                class_id: '',
                                format: currentEntry.format,
                                score: '',
                                placement: '',
                                points_earned: '',
                                wattage: '',
                                frequency: '',
                                notes: '',
                              });
                              setCurrentEntryMembershipStatus('');
                            }}
                            className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500"
                          >
                            Clear
                          </button>
                          <button
                            onClick={handleSaveResult}
                            disabled={saving}
                            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center gap-2 disabled:opacity-50"
                          >
                            <Save className="h-4 w-4" />
                            {saving ? 'Saving...' : 'Save Result'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Excel Import */}
                    {entryMethod === 'excel' && (
                      <div className="bg-slate-800 rounded-lg p-4">
                        <p className="text-gray-300 mb-4">Download the template, fill it with results, and upload it back.</p>
                        <div className="flex gap-3 flex-wrap">
                          <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            Download Template
                          </button>
                          <div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".xlsx,.xls"
                              onChange={handleFileSelect}
                              className="hidden"
                              id="excel-upload"
                            />
                            <label
                              htmlFor="excel-upload"
                              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                            >
                              <Upload className="h-4 w-4" />
                              Upload Excel File
                            </label>
                          </div>
                        </div>
                        {selectedFile && (
                          <div className="mt-4 p-3 bg-slate-700 rounded-lg">
                            <p className="text-gray-300 mb-2">
                              Selected: <span className="text-white font-semibold">{selectedFile.name}</span>
                            </p>
                            <button
                              onClick={handleConfirmImport}
                              disabled={uploading}
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                              {uploading ? 'Importing...' : 'Confirm & Import'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TermLab Import */}
                    {entryMethod === 'termlab' && (
                      <div className="bg-slate-800 rounded-lg p-4">
                        <p className="text-gray-300 mb-4">Upload a TermLab (.tlab) export file to import results.</p>
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".tlab"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="tlab-upload"
                          />
                          <label
                            htmlFor="tlab-upload"
                            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                          >
                            <Upload className="h-4 w-4" />
                            Upload TermLab File
                          </label>
                        </div>
                        {selectedFile && (
                          <div className="mt-4 p-3 bg-slate-700 rounded-lg">
                            <p className="text-gray-300 mb-2">
                              Selected: <span className="text-white font-semibold">{selectedFile.name}</span>
                            </p>
                            <button
                              onClick={handleConfirmImport}
                              disabled={uploading}
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                              {uploading ? 'Importing...' : 'Confirm & Import'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Results List */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  Event Results
                  <span className="px-2 py-0.5 bg-orange-500 text-white text-sm rounded-full">{results.length}</span>
                </h3>
                <button
                  onClick={handleRecalculatePoints}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
                >
                  <Calculator className="h-4 w-4" />
                  {saving ? 'Recalculating...' : 'Recalculate All Points'}
                </button>
              </div>

              {/* Legend */}
              <div className="flex gap-4 mb-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded"></span>
                  <span className="text-gray-400">Active Membership</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded"></span>
                  <span className="text-gray-400">Expired Membership</span>
                </span>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                >
                  <option value="">All Formats</option>
                  {availableFormats.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                >
                  <option value="">All Classes</option>
                  {competitionClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.abbreviation} - {c.name}</option>
                  ))}
                </select>
                <select
                  value={selectedMembershipFilter}
                  onChange={(e) => setSelectedMembershipFilter(e.target.value as 'all' | 'active' | 'expired' | 'non-member')}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                >
                  <option value="all">All Membership Status</option>
                  <option value="active">Active Members</option>
                  <option value="expired">Expired Members</option>
                  <option value="non-member">Non-Members</option>
                </select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={resultsSearchTerm}
                    onChange={(e) => setResultsSearchTerm(e.target.value)}
                    placeholder="Search by MECA ID or name..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                </div>
              </div>

              {/* Results Table */}
              {resultsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-r-transparent rounded-full"></div>
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {results.length === 0
                    ? 'No results entered yet. Use the form above to add results.'
                    : 'No results match your filters.'}
                </div>
              ) : (
                <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">MECA ID</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Format</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Class</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Score</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Wattage</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Freq</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Place</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Points</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedResults.map(result => (
                        <tr
                          key={result.id}
                          className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${getMembershipRowClass(result.membership_status)}`}
                        >
                          <td className="py-3 px-4 text-white font-mono">
                            {result.meca_id || '-'}
                            {result.meca_id === '999999' && (
                              <span className="ml-1 text-gray-500 text-xs">(Non-member)</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-white">{result.competitor_name}</td>
                          <td className="py-3 px-4 text-gray-400">{result.format}</td>
                          <td className="py-3 px-4 text-gray-400">{result.competition_class}</td>
                          <td className="py-3 px-4 text-white font-semibold">{result.score}</td>
                          <td className="py-3 px-4 text-gray-400">{result.wattage || '-'}</td>
                          <td className="py-3 px-4 text-gray-400">{result.frequency || '-'}</td>
                          <td className="py-3 px-4 text-white font-semibold">{result.placement || '-'}</td>
                          <td className="py-3 px-4 text-orange-400 font-semibold">{result.points_earned || '0'}</td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleDeleteResult(result.id!)}
                              className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredResults.length > 0 && (
                  <div className="mt-4">
                    <Pagination
                      currentPage={resultsPage}
                      totalPages={totalResultsPages}
                      itemsPerPage={resultsPerPage}
                      totalItems={filteredResults.length}
                      onPageChange={setResultsPage}
                      onItemsPerPageChange={setResultsPerPage}
                    />
                  </div>
                )}
                </>
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Event Notes</h2>

              {/* Add Note */}
              <div className="mb-6">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this event..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => {
                      if (newNote.trim()) {
                        setNotes(prev => [...prev, {
                          id: Date.now().toString(),
                          content: newNote,
                          created_at: new Date().toISOString(),
                          created_by: profile?.first_name || 'You',
                        }]);
                        setNewNote('');
                      }
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    Add Note
                  </button>
                </div>
              </div>

              {/* Notes List */}
              {notes.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No notes yet. Add your first note above.
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map(note => (
                    <div key={note.id} className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-white whitespace-pre-wrap">{note.content}</p>
                      <p className="text-gray-500 text-sm mt-2">
                        {note.created_by} • {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Expenses Tab */}
          {activeTab === 'expenses' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Event Expenses</h2>

              {/* Add Expense */}
              <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">Description</label>
                    <input
                      type="text"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="What was the expense for?"
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Category</label>
                    <select
                      value={newExpense.category}
                      onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white"
                    >
                      {expenseCategories.map(cat => (
                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => {
                      if (newExpense.description && newExpense.amount) {
                        setExpenses(prev => [...prev, {
                          id: Date.now().toString(),
                          description: newExpense.description,
                          amount: parseFloat(newExpense.amount),
                          category: newExpense.category,
                          created_at: new Date().toISOString(),
                        }]);
                        setNewExpense({ description: '', amount: '', category: 'general' });
                      }
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    Add Expense
                  </button>
                </div>
              </div>

              {/* Expenses Summary */}
              <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
                <p className="text-gray-400">Total Expenses</p>
                <p className="text-3xl font-bold text-white">
                  ${expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                </p>
              </div>

              {/* Expenses List */}
              {expenses.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No expenses recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Description</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Category</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Amount</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map(expense => (
                        <tr key={expense.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="py-3 px-4 text-white">{expense.description}</td>
                          <td className="py-3 px-4 text-gray-400 capitalize">{expense.category}</td>
                          <td className="py-3 px-4 text-white font-semibold">${expense.amount.toFixed(2)}</td>
                          <td className="py-3 px-4 text-gray-400">{new Date(expense.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setExpenses(prev => prev.filter(e => e.id !== expense.id))}
                              className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Scan QR Code</h3>
              <button
                onClick={() => setShowScanner(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {scannerError ? (
              <div className="text-center py-8">
                <CameraOff className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <p className="text-red-400 mb-4">{scannerError}</p>
                <p className="text-gray-400 text-sm mb-4">
                  Camera access may be blocked. Please check your browser permissions.
                </p>
                <button
                  onClick={() => {
                    setScannerError(null);
                    setShowScanner(false);
                  }}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
                  <Scanner
                    onScan={handleScan}
                    onError={handleScanError}
                    constraints={{ facingMode: 'environment' }}
                    styles={{
                      container: { width: '100%', height: '100%' },
                      video: { width: '100%', height: '100%', objectFit: 'cover' },
                    }}
                  />
                </div>
                <p className="text-gray-400 text-sm text-center mt-4">
                  Position the QR code within the camera frame
                </p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowScanner(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Import Review Modal */}
      {showImportReviewModal && parsedResults.length > 0 && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
              <div>
                <h2 className="text-xl font-bold text-white">Review Import - {selectedFile?.name}</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {parsedResults.length} results found •
                  <span className="text-yellow-400 ml-1">
                    {parsedResults.filter(r => r.nameMatch && userDecisions[r.index]?.confirmNameMatch === null).length} need name confirmation
                  </span> •
                  <span className="text-orange-400 ml-1">
                    {parsedResults.filter(r => r.missingFields.length > 0).length} need data completion
                  </span>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImportReviewModal(false);
                  setParsedResults([]);
                  setUserDecisions({});
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4">
              {/* Unknown Classes — class names in the file that don't exist in
                  the system. Event Directors can NOT create classes. For each
                  one the ED picks the format, then either maps it to an
                  existing same-format class (rows import linked) or sends it to
                  admin review (rows import unlinked and appear in the admin
                  "Pending Results" queue). A decision is required per class,
                  but import is no longer blocked on creating anything. */}
              {unknownClasses.length > 0 && (
                <div className="mb-4 p-4 bg-amber-900/30 border border-amber-500/50 rounded-lg">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-amber-200 font-semibold">
                        {unknownClasses.length} class{unknownClasses.length === 1 ? '' : 'es'} from this file {unknownClasses.length === 1 ? 'is' : 'are'} not in the system
                      </h3>
                      <p className="text-amber-300/80 text-xs mt-1">
                        For each one, pick the <strong>format</strong>, then either match it to an existing class or <strong>send it to admin for review</strong>. Matched results import normally; results sent for review are saved and queued for an admin to approve the class.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {unknownClasses.map((cls) => {
                      const fmt = unknownClassFormat[cls] || '';
                      const decision = unknownClassDecision[cls] || '';
                      const sameFormatClasses = fmt ? getClassesForFormat(fmt) : [];
                      return (
                        <div key={cls} className="flex flex-wrap items-center gap-2 bg-slate-800 rounded p-2">
                          <div className="flex-1 min-w-[160px]">
                            <div className="text-white text-sm font-medium">{cls}</div>
                            <div className="text-gray-400 text-xs">From file</div>
                          </div>
                          {/* Step 1: format */}
                          <select
                            value={fmt}
                            onChange={(e) => {
                              const f = e.target.value;
                              setUnknownClassFormat((prev) => ({ ...prev, [cls]: f }));
                              // Format change invalidates any prior class choice.
                              setUnknownClassDecision((prev) => {
                                const next = { ...prev };
                                delete next[cls];
                                return next;
                              });
                            }}
                            className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="">Format…</option>
                            {classFormatOptions.map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                          {/* Step 2: map to an existing class OR send to admin */}
                          <select
                            value={decision}
                            disabled={!fmt}
                            onChange={(e) =>
                              setUnknownClassDecision((prev) => ({ ...prev, [cls]: e.target.value }))
                            }
                            className="flex-1 min-w-[180px] px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-40"
                          >
                            <option value="">{fmt ? 'Match to class…' : 'Pick a format first'}</option>
                            {sameFormatClasses.map((c) => (
                              <option key={c.id} value={c.id}>{c.abbreviation} - {c.name}</option>
                            ))}
                            <option value={REVIEW_DECISION}>⚑ Send to admin for review</option>
                          </select>
                          <div className="text-xs min-w-[140px]">
                            {!decision ? (
                              <span className="text-amber-300/70">Choose an option</span>
                            ) : decision === REVIEW_DECISION ? (
                              <span className="text-amber-300">Will be sent to admin</span>
                            ) : (
                              <span className="text-green-400">
                                Imports as {competitionClasses.find((c) => c.id === decision)?.name || 'selected class'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Results Table */}
              <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900 text-white sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Class</th>
                      <th className="px-3 py-2 text-left">Score</th>
                      <th className="px-3 py-2 text-left">Wattage</th>
                      <th className="px-3 py-2 text-left">Freq</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedResults.map((item) => {
                      const decision = userDecisions[item.index];
                      const isSkipped = decision?.skip;
                      const needsNameConfirm = item.nameMatch && decision?.confirmNameMatch === null;
                      const needsWattage = item.missingFields.includes('wattage') && !decision?.wattage;
                      const needsFrequency = item.missingFields.includes('frequency') && !decision?.frequency;
                      const hasIssues = needsNameConfirm || needsWattage || needsFrequency || !item.isValid;

                      return (
                        <tr
                          key={item.index}
                          className={`border-b border-slate-600 ${
                            isSkipped ? 'bg-slate-900/50 opacity-50' :
                            hasIssues ? 'bg-yellow-900/20' : 'bg-slate-800'
                          }`}
                        >
                          <td className="px-3 py-2">
                            <div className="text-white">{item.data.name}</div>
                            {item.nameMatch && (
                              <div className="text-xs mt-1">
                                <span className="text-yellow-400">Match found: </span>
                                <span className="text-blue-400">{item.nameMatch.matchedName}</span>
                                <span className="text-gray-400"> (ID: {item.nameMatch.matchedMecaId})</span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-white">{item.data.class}</td>
                          <td className="px-3 py-2 text-white">{item.data.score}</td>
                          <td className="px-3 py-2">
                            {item.missingFields.includes('wattage') ? (
                              <input
                                type="number"
                                value={decision?.wattage || ''}
                                onChange={(e) => setUserDecisions(prev => ({
                                  ...prev,
                                  [item.index]: {
                                    ...prev[item.index],
                                    wattage: e.target.value ? parseInt(e.target.value) : undefined
                                  }
                                }))}
                                placeholder="Required"
                                className={`w-20 px-2 py-1 bg-slate-700 border rounded text-white text-sm ${
                                  needsWattage ? 'border-orange-500' : 'border-slate-600'
                                }`}
                                disabled={isSkipped}
                              />
                            ) : (
                              <span className="text-white">{item.data.wattage || '-'}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {item.missingFields.includes('frequency') ? (
                              <input
                                type="number"
                                value={decision?.frequency || ''}
                                onChange={(e) => setUserDecisions(prev => ({
                                  ...prev,
                                  [item.index]: {
                                    ...prev[item.index],
                                    frequency: e.target.value ? parseInt(e.target.value) : undefined
                                  }
                                }))}
                                placeholder="Required"
                                className={`w-20 px-2 py-1 bg-slate-700 border rounded text-white text-sm ${
                                  needsFrequency ? 'border-orange-500' : 'border-slate-600'
                                }`}
                                disabled={isSkipped}
                              />
                            ) : (
                              <span className="text-white">{item.data.frequency || '-'}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isSkipped ? (
                              <span className="text-red-400 text-xs">Skipped</span>
                            ) : !item.isValid ? (
                              <span className="text-red-400 text-xs">{item.validationErrors.join(', ')}</span>
                            ) : needsNameConfirm ? (
                              <span className="text-yellow-400 text-xs">Confirm name match</span>
                            ) : needsWattage || needsFrequency ? (
                              <span className="text-orange-400 text-xs">Complete data</span>
                            ) : (
                              <span className="text-green-400 text-xs">Ready</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1 flex-wrap">
                              {item.nameMatch && !isSkipped && (
                                <>
                                  <button
                                    onClick={() => setUserDecisions(prev => ({
                                      ...prev,
                                      [item.index]: { ...prev[item.index], confirmNameMatch: true }
                                    }))}
                                    className={`px-2 py-1 rounded text-xs transition-colors ${
                                      decision?.confirmNameMatch === true
                                        ? 'bg-green-600 text-white'
                                        : 'bg-slate-600 hover:bg-green-600 text-gray-300 hover:text-white'
                                    }`}
                                    title="Use matched MECA ID"
                                  >
                                    ✓ Use
                                  </button>
                                  <button
                                    onClick={() => setUserDecisions(prev => ({
                                      ...prev,
                                      [item.index]: { ...prev[item.index], confirmNameMatch: false }
                                    }))}
                                    className={`px-2 py-1 rounded text-xs transition-colors ${
                                      decision?.confirmNameMatch === false
                                        ? 'bg-gray-600 text-white'
                                        : 'bg-slate-600 hover:bg-gray-600 text-gray-300 hover:text-white'
                                    }`}
                                    title="Use as non-member (999999)"
                                  >
                                    ✗ Ignore
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => setUserDecisions(prev => ({
                                  ...prev,
                                  [item.index]: { ...prev[item.index], skip: !prev[item.index]?.skip }
                                }))}
                                className={`px-2 py-1 rounded text-xs transition-colors ${
                                  isSkipped
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-slate-600 hover:bg-red-600 text-gray-300 hover:text-white'
                                }`}
                              >
                                {isSkipped ? 'Unskip' : 'Skip'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary and Actions */}
              <div className="mt-4 p-3 bg-slate-900 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <div className="text-gray-300">
                    <span className="text-green-400 font-semibold">
                      {parsedResults.filter(r => {
                        const d = userDecisions[r.index];
                        if (d?.skip) return false;
                        if (!r.isValid) return false;
                        if (r.nameMatch && d?.confirmNameMatch === null) return false;
                        if (r.missingFields.includes('wattage') && !d?.wattage) return false;
                        if (r.missingFields.includes('frequency') && !d?.frequency) return false;
                        return true;
                      }).length}
                    </span>
                    <span className="text-gray-400"> of {parsedResults.length} will be imported</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowImportReviewModal(false);
                        setParsedResults([]);
                        setUserDecisions({});
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      disabled={
                        uploading ||
                        // Every unknown class needs a decision (map to a class
                        // or send to admin) — but we no longer block on
                        // creating anything, since EDs can't create classes.
                        unknownClasses.some(c => !unknownClassDecision[c]) ||
                        parsedResults.filter(r => {
                          const d = userDecisions[r.index];
                          if (d?.skip) return false;
                          if (!r.isValid) return false;
                          if (r.nameMatch && d?.confirmNameMatch === null) return false;
                          if (r.missingFields.includes('wattage') && !d?.wattage) return false;
                          if (r.missingFields.includes('frequency') && !d?.frequency) return false;
                          return true;
                        }).length === 0
                      }
                      title={unknownClasses.some(c => !unknownClassDecision[c]) ? `Choose a class or "send to admin" for each unmatched class first` : undefined}
                      className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {uploading ? 'Importing...' : 'Import Results'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
