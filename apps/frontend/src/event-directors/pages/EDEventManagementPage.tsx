import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, MapPin, Users, ClipboardCheck, FileText,
  DollarSign, Trophy, QrCode, Search, Save, Trash2,
  Check, ChevronDown, ChevronUp, Download, Upload, User, Calculator, FileSpreadsheet, File, RotateCcw,
  CheckSquare, Square, CameraOff, X, HelpCircle
} from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useAuth } from '@/auth';

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
  const [currentScanRegistrationId, setCurrentScanRegistrationId] = useState<string | null>(null);

  // Results
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [competitionClasses, setCompetitionClasses] = useState<CompetitionClass[]>([]);
  const [competitors, setCompetitors] = useState<Profile[]>([]);
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Enhanced Import Flow
  const [parsedResults, setParsedResults] = useState<ParsedResultItem[]>([]);
  const [userDecisions, setUserDecisions] = useState<Record<number, UserDecision>>({});
  const [showImportReviewModal, setShowImportReviewModal] = useState(false);
  const [importFileExtension, setImportFileExtension] = useState<string>('xlsx');

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
      fetchCompetitors();
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

      // Fetch all profiles to get MECA IDs and membership status
      const profiles = await profilesApi.getAll(1, 10000);

      // Enrich registrations with profile data
      const enrichedRegistrations = data.map((reg: any) => {
        // Find profile by email or user_id
        const matchedProfile = profiles.find(
          (p: Profile) => p.email === reg.email || p.id === reg.user_id
        );

        return {
          ...reg,
          profileMecaId: matchedProfile?.meca_id || null,
          membershipStatus: matchedProfile?.membership_status || 'none',
        };
      });

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

      // Fetch all profiles to get membership status
      const profiles = await profilesApi.getAll(1, 10000);

      const mappedResults = data.map((r: any) => {
        // Find the profile for this competitor
        const matchedProfile = profiles.find(
          (p: Profile) => p.meca_id === r.meca_id || p.id === r.competitor_id || p.id === r.profile_id
        );

        return {
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
          membership_status: matchedProfile?.membership_status || (r.meca_id === '999999' ? 'none' : 'unknown'),
        };
      });
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

  const fetchCompetitors = async () => {
    try {
      // Fetch all profiles (up to 10000) to enable MECA ID lookup
      const data = await profilesApi.getAll(1, 10000);
      setCompetitors(data);
    } catch (error) {
      console.error('Error fetching competitors:', error);
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
      await eventRegistrationsApi.update(registrationId, { checkedIn: false, checkedInAt: null });
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

  const handleMecaIdChange = (mecaId: string) => {
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
    } else if (mecaId.length >= 4 && competitors.length > 0) {
      // Only do lookup when we have at least 4 characters
      const normalizedValue = mecaId.trim().toLowerCase();
      const competitor = competitors.find(c => {
        // Convert meca_id to string in case it's a number
        const profileMecaId = String(c.meca_id || '').trim().toLowerCase();
        return profileMecaId === normalizedValue;
      });

      if (competitor) {
        const membershipStatus = competitor.membership_status || '';
        setCurrentEntryMembershipStatus(membershipStatus);
        updated.competitor_id = competitor.id;
        updated.competitor_name = `${competitor.first_name || ''} ${competitor.last_name || ''}`.trim();
        // If membership is not active, they won't earn points
        if (membershipStatus !== 'active') {
          updated.points_earned = '0';
        }
      } else {
        // MECA ID not found in system
        setCurrentEntryMembershipStatus('');
      }
    } else {
      // Still typing (less than 4 chars) - just clear status
      setCurrentEntryMembershipStatus('');
    }

    setCurrentEntry(updated);
  };

  const handleNameChange = (name: string) => {
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
    } else if (competitors.length > 0) {
      // Search for EXACT full name match only
      const nameLower = name.toLowerCase().trim();
      const matchingCompetitor = competitors.find((c) => {
        const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().trim();
        return fullName === nameLower;
      });

      if (matchingCompetitor) {
        // Found exact match - check membership status
        const membershipStatus = matchingCompetitor.membership_status || '';
        setCurrentEntryMembershipStatus(membershipStatus);

        if (membershipStatus === 'active') {
          // Active member - populate their MECA ID
          updated.competitor_id = matchingCompetitor.id;
          updated.meca_id = String(matchingCompetitor.meca_id || '');
        } else {
          // Expired membership - keep their actual MECA ID for admin view
          // but mark as expired (no points)
          updated.competitor_id = matchingCompetitor.id;
          updated.meca_id = String(matchingCompetitor.meca_id || '') || '999999';
          updated.points_earned = '0';
        }
      } else {
        // No exact match found - this is a non-member, use 999999
        updated.competitor_id = '';
        updated.meca_id = '999999';
        updated.points_earned = '0';
        setCurrentEntryMembershipStatus('');
      }
    }

    setCurrentEntry(updated);
  };

  // Check if wattage/frequency is required for this class
  const isWattageFrequencyRequired = (format: string, className: string): boolean => {
    if (format !== 'SPL') return false;
    // Only Dueling Demos classes are exempt from wattage/frequency requirement
    const exemptClasses = ['dueling demos'];
    const classLower = className.toLowerCase();
    return !exemptClasses.some(exempt => classLower.includes(exempt));
  };

  const handleSaveResult = async () => {
    if (!eventId || !currentEntry.format || !currentEntry.class_id || !currentEntry.score) {
      alert('Please fill in all required fields');
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
      await competitionResultsApi.create({
        event_id: eventId,
        profile_id: currentEntry.competitor_id || null,
        competitor_name: currentEntry.competitor_name,
        meca_id: mecaId,
        class_id: currentEntry.class_id,
        format: currentEntry.format,
        score: parseFloat(currentEntry.score),
        placement: currentEntry.placement ? parseInt(currentEntry.placement) : undefined,
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
      alert('Failed to recalculate points: ' + error.message);
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

  const filteredResults = results.filter(r => {
    if (selectedFormat && r.format !== selectedFormat) return false;
    if (selectedClass && r.class_id !== selectedClass) return false;
    if (resultsSearchTerm) {
      const search = resultsSearchTerm.toLowerCase();
      return (
        r.meca_id?.toLowerCase().includes(search) ||
        r.competitor_name?.toLowerCase().includes(search)
      );
    }
    return true;
  });

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
                            onChange={(e) => setCurrentEntry(prev => ({ ...prev, format: e.target.value, class_id: '' }))}
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
                              const cls = competitionClasses.find(c => c.id === e.target.value);
                              setCurrentEntry(prev => ({
                                ...prev,
                                class_id: e.target.value,
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
                          </select>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                  No results entered yet. Use the form above to add results.
                </div>
              ) : (
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
                      {filteredResults.map(result => (
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
                      disabled={uploading || parsedResults.filter(r => {
                        const d = userDecisions[r.index];
                        if (d?.skip) return false;
                        if (!r.isValid) return false;
                        if (r.nameMatch && d?.confirmNameMatch === null) return false;
                        if (r.missingFields.includes('wattage') && !d?.wattage) return false;
                        if (r.missingFields.includes('frequency') && !d?.frequency) return false;
                        return true;
                      }).length === 0}
                      className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
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
