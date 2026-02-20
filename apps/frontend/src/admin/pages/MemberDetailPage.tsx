import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  CreditCard,
  FileText,
  Calendar,
  Trophy,
  MessageSquare,
  Image as ImageIcon,
  Users as UsersIcon,
  ArrowLeft,
  Send,
  ChevronDown,
  Plus,
  Check,
  X,
  Clock,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  Shield,
  ExternalLink,
  Lock,
  RefreshCw,
  Copy,
  ShoppingCart,
  Key,
  Pencil,
  Search,
  Filter,
  Globe,
  MapPin,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { usePermissions } from '@/auth';
import { profilesApi, ActivityItem, UpcomingEvent } from '@/profiles';
import { competitionResultsApi, CompetitionResult } from '@/competition-results';
import { membershipsApi, Membership, AdminCreateMembershipResult, AddSecondaryModal, EditSecondaryModal, SecondaryMembershipInfo, RELATIONSHIP_TYPES } from '@/memberships';
import { membershipTypeConfigsApi, MembershipTypeConfig } from '@/membership-type-configs';
import AdminMembershipWizard from '../components/AdminMembershipWizard';
import { UserPlus } from 'lucide-react';
import { teamsApi, Team } from '@/teams';
import { moderationApi } from '@/api-client/moderation.api-client';
import { notificationsApi } from '@/notifications/notifications.api-client';
import { seasonsApi, Season } from '@/seasons/seasons.api-client';
import { countries, getStatesForCountry, getStateLabel, getPostalCodeLabel } from '../../utils/countries';
import {
  adminGetRetailerByUserId,
  adminGetManufacturerByUserId,
  adminUpdateRetailer,
  adminUpdateManufacturer,
  adminApproveRetailer,
  adminApproveManufacturer,
  RetailerListing,
  ManufacturerListing,
} from '@/business-listings';
import { useAuth } from '@/auth';
import axios from '@/lib/axios';
import { generatePassword, calculatePasswordStrength, MIN_PASSWORD_STRENGTH } from '../../utils/passwordUtils';
import { PasswordStrengthIndicator } from '../../shared/components/PasswordStrengthIndicator';

type TabType =
  | 'overview'
  | 'personal'
  | 'business'
  | 'media'
  | 'teams'
  | 'memberships'
  | 'orders'
  | 'events'
  | 'results'
  | 'communications'
  | 'permissions';

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { hasPermission, loading: permLoading } = usePermissions();
  const [member, setMember] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);

  // Create mode when memberId is 'new'
  const isCreateMode = memberId === 'new';
  const [createFormData, setCreateFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'user',
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Password management for create mode
  const [passwordMode, setPasswordMode] = useState<'manual' | 'generated'>('generated');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forcePasswordChange, setForcePasswordChange] = useState(true);
  const [sendPasswordEmail, setSendPasswordEmail] = useState(false);
  const [emailServiceConfigured, setEmailServiceConfigured] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  // Password reset modal for edit mode
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState<'manual' | 'generated'>('generated');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetForceChange, setResetForceChange] = useState(true);
  const [resetSendEmail, setResetSendEmail] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetPasswordCopied, setResetPasswordCopied] = useState(false);

  // Derived membership status and type from actual memberships (not profile field)
  const [derivedMembershipStatus, setDerivedMembershipStatus] = useState<string>('none');
  const [derivedMembershipType, setDerivedMembershipType] = useState<string | null>(null);

  // Business info for retailers/manufacturers (stored on membership)
  const [businessMembershipData, setBusinessMembershipData] = useState<{
    membershipId: string;
    // Business contact
    businessName: string;
    businessPhone: string;
    businessWebsite: string;
    // Business address (structured, ISO standard)
    businessStreet: string;
    businessCity: string;
    businessState: string; // ISO 3166-2
    businessPostalCode: string;
    businessCountry: string; // ISO 3166-1 alpha-2
    // Business directory listing
    businessDescription: string;
    businessLogoUrl: string;
    businessListingStatus: 'pending_approval' | 'approved' | 'rejected';
    // Metadata
    category: string;
    userId: string;
  } | null>(null);

  useEffect(() => {
    if (memberId && !permLoading && !isCreateMode) {
      fetchMember();
      // Fetch memberships to compute derived status
      fetchMembershipStatusForHeader();
    } else if (isCreateMode) {
      setLoading(false);
      // Generate initial password for create mode
      setPassword(generatePassword());
      // Check email service status
      profilesApi.getEmailServiceStatus().then(({ configured }) => {
        setEmailServiceConfigured(configured);
      }).catch(() => {
        setEmailServiceConfigured(false);
      });
    }
  }, [memberId, permLoading, isCreateMode]);

  const fetchMember = async () => {
    try {
      const backendData = await profilesApi.getById(memberId!);

      // Map backend camelCase response to snake_case shape for compatibility
      const data: any = {
        ...backendData,
        is_secondary_account: (backendData as any).isSecondaryAccount,
        can_login: (backendData as any).canLogin,
        master_profile_id: typeof (backendData as any).masterProfile === 'string'
          ? (backendData as any).masterProfile
          : (backendData as any).masterProfile?.id,
        can_apply_judge: (backendData as any).canApplyJudge ?? backendData.can_apply_judge,
        can_apply_event_director: (backendData as any).canApplyEventDirector ?? backendData.can_apply_event_director,
        judge_permission_granted_at: (backendData as any).judgePermissionGrantedAt ?? backendData.judge_permission_granted_at,
        judge_permission_granted_by: (backendData as any).judgePermissionGrantedBy ?? backendData.judge_permission_granted_by,
        ed_permission_granted_at: (backendData as any).edPermissionGrantedAt ?? backendData.ed_permission_granted_at,
        ed_permission_granted_by: (backendData as any).edPermissionGrantedBy ?? backendData.ed_permission_granted_by,
        judge_certification_expires: (backendData as any).judgeCertificationExpires ?? backendData.judge_certification_expires,
        ed_certification_expires: (backendData as any).edCertificationExpires ?? backendData.ed_certification_expires,
        force_password_change: (backendData as any).force_password_change,
        account_type: (backendData as any).account_type,
      };

      // Add computed full_name
      data.full_name = data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim();

      setMember(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching member:', error);
      setLoading(false);
    }
  };

  // Fetch memberships and compute the derived status and type for header display
  // This prioritizes master/independent memberships over secondary ones
  const fetchMembershipStatusForHeader = async () => {
    try {
      // Fetch via backend API instead of direct Supabase query
      const backendMemberships = await membershipsApi.getAllByUserId(memberId!);
      // Map backend camelCase response to snake_case shape for compatibility with processing below
      const membershipsData = backendMemberships
        .filter((m: any) => m.paymentStatus === 'paid' || m.paymentStatus === 'pending')
        .map((m: any) => ({
          id: m.id,
          user_id: typeof m.user === 'string' ? m.user : m.user?.id,
          payment_status: m.paymentStatus,
          end_date: m.endDate,
          account_type: m.accountType,
          has_team_addon: m.hasTeamAddon,
          cancel_at_period_end: m.cancelAtPeriodEnd,
          business_name: m.businessName,
          business_phone: m.businessPhone,
          business_website: m.businessWebsite,
          business_street: m.businessStreet,
          business_city: m.businessCity,
          business_state: m.businessState,
          business_postal_code: m.businessPostalCode,
          business_country: m.businessCountry,
          business_description: m.businessDescription,
          business_logo_url: m.businessLogoUrl,
          business_listing_status: m.businessListingStatus,
          membership_type_configs: m.membershipTypeConfig ? {
            category: m.membershipTypeConfig.category,
          } : null,
        }));

      if (!membershipsData || membershipsData.length === 0) {
        setDerivedMembershipStatus('none');
        setDerivedMembershipType(null);
        setBusinessMembershipData(null);
        return;
      }

      // Find best membership status and type
      // Priority: paid non-secondary > pending non-secondary > paid secondary > pending secondary
      let bestStatus = 'none';
      let bestPriority = 999;
      let bestMembershipType: string | null = null;
      let bestHasTeamAddon = false;
      let bestMembershipId: string | null = null;
      let bestUserId: string | null = null;
      // Business contact info
      let bestBusinessName: string | null = null;
      let bestBusinessPhone: string | null = null;
      let bestBusinessWebsite: string | null = null;
      // Business address (structured)
      let bestBusinessStreet: string | null = null;
      let bestBusinessCity: string | null = null;
      let bestBusinessState: string | null = null;
      let bestBusinessPostalCode: string | null = null;
      let bestBusinessCountry: string | null = null;
      // Business directory listing
      let bestBusinessDescription: string | null = null;
      let bestBusinessLogoUrl: string | null = null;
      let bestBusinessListingStatus: string | null = null;

      for (const m of membershipsData) {
        const isSecondary = m.account_type === 'secondary';
        const isPaid = m.payment_status === 'paid';
        const isExpired = m.end_date && new Date(m.end_date) < new Date();

        // Skip expired memberships for active status calculation
        let status: string;
        if (isPaid && !isExpired) {
          status = 'active';
        } else if (isPaid && isExpired) {
          status = 'expired';
        } else {
          status = 'pending';
        }

        // Calculate priority (lower is better)
        // Non-secondary active = 0, secondary active = 1, non-secondary pending = 2, etc.
        const priority = (isSecondary ? 3 : 0) + (status === 'active' ? 0 : status === 'pending' ? 1 : 2);

        if (priority < bestPriority) {
          bestPriority = priority;
          bestStatus = status;
          bestMembershipId = m.id;
          bestUserId = m.user_id;
          // Business contact info
          bestBusinessName = m.business_name || '';
          bestBusinessPhone = m.business_phone || '';
          bestBusinessWebsite = m.business_website || '';
          // Business address (structured, ISO standard)
          bestBusinessStreet = m.business_street || '';
          bestBusinessCity = m.business_city || '';
          bestBusinessState = m.business_state || '';
          bestBusinessPostalCode = m.business_postal_code || '';
          bestBusinessCountry = m.business_country || 'US';
          // Business directory listing
          bestBusinessDescription = m.business_description || '';
          bestBusinessLogoUrl = m.business_logo_url || '';
          bestBusinessListingStatus = m.business_listing_status || 'pending_approval';
          // Get membership type from config
          const config = Array.isArray(m.membership_type_configs)
            ? m.membership_type_configs[0]
            : m.membership_type_configs;
          bestMembershipType = config?.category || null;
          bestHasTeamAddon = m.has_team_addon || false;
        }
      }

      setDerivedMembershipStatus(bestStatus);

      // Format membership type for display
      if (bestMembershipType) {
        const typeMap: Record<string, string> = {
          competitor: bestHasTeamAddon ? 'Competitor + Team' : 'Competitor',
          retail: 'Retailer',
          manufacturer: 'Manufacturer',
          team: 'Team',
        };
        setDerivedMembershipType(typeMap[bestMembershipType] || bestMembershipType);

        // Store business info for retailers/manufacturers
        if (bestMembershipType === 'retail' || bestMembershipType === 'manufacturer') {
          setBusinessMembershipData({
            membershipId: bestMembershipId!,
            // Business contact info
            businessName: bestBusinessName || '',
            businessPhone: bestBusinessPhone || '',
            businessWebsite: bestBusinessWebsite || '',
            // Business address (structured, ISO standard)
            businessStreet: bestBusinessStreet || '',
            businessCity: bestBusinessCity || '',
            businessState: bestBusinessState || '',
            businessPostalCode: bestBusinessPostalCode || '',
            businessCountry: bestBusinessCountry || 'US',
            // Business directory listing
            businessDescription: bestBusinessDescription || '',
            businessLogoUrl: bestBusinessLogoUrl || '',
            businessListingStatus: (bestBusinessListingStatus as 'pending_approval' | 'approved' | 'rejected') || 'pending_approval',
            // Metadata
            category: bestMembershipType,
            userId: bestUserId!,
          });
        } else {
          setBusinessMembershipData(null);
        }
      } else {
        setDerivedMembershipType(null);
        setBusinessMembershipData(null);
      }
    } catch (error) {
      console.error('Error fetching membership status for header:', error);
      setDerivedMembershipStatus('none');
      setDerivedMembershipType(null);
      setBusinessMembershipData(null);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createFormData.email.trim()) {
      setCreateError('Email is required');
      return;
    }

    // Validate password
    const passwordToUse = passwordMode === 'generated' ? password : password;
    if (!passwordToUse) {
      setCreateError('Password is required');
      return;
    }

    const strength = calculatePasswordStrength(passwordToUse);
    if (strength.score < MIN_PASSWORD_STRENGTH) {
      setCreateError(`Password strength must be at least ${MIN_PASSWORD_STRENGTH}. Current: ${strength.score}`);
      return;
    }

    if (passwordMode === 'manual' && password !== confirmPassword) {
      setCreateError('Passwords do not match');
      return;
    }

    setCreating(true);
    try {
      const newMember = await profilesApi.createWithPassword({
        email: createFormData.email,
        password: passwordToUse,
        firstName: createFormData.first_name || undefined,
        lastName: createFormData.last_name || undefined,
        phone: createFormData.phone || undefined,
        role: createFormData.role,
        forcePasswordChange: forcePasswordChange,
        sendEmail: sendPasswordEmail && emailServiceConfigured,
      });

      // Navigate to the newly created member's detail page
      navigate(`/admin/members/${newMember.id}`);
    } catch (error) {
      console.error('Error creating member:', error);
      setCreateError(error instanceof Error ? error.message : 'Failed to create member. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Password helper functions
  const handleCopyPassword = async (pwd: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(pwd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const handleRegeneratePassword = () => {
    setPassword(generatePassword());
    setPasswordCopied(false);
  };

  const handleRegenerateResetPassword = () => {
    setResetPassword(generatePassword());
    setResetPasswordCopied(false);
  };

  // Handle password reset for existing member
  const handlePasswordReset = async () => {
    const passwordToUse = resetPasswordMode === 'generated' ? resetPassword : resetPassword;

    if (!passwordToUse) {
      alert('Password is required');
      return;
    }

    const strength = calculatePasswordStrength(passwordToUse);
    if (strength.score < MIN_PASSWORD_STRENGTH) {
      alert(`Password strength must be at least ${MIN_PASSWORD_STRENGTH}. Current: ${strength.score}`);
      return;
    }

    if (resetPasswordMode === 'manual' && resetPassword !== resetConfirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setResettingPassword(true);
    try {
      // Get auth token for admin API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      await profilesApi.resetPassword(memberId!, {
        newPassword: passwordToUse,
        forcePasswordChange: resetForceChange,
        sendEmail: resetSendEmail && emailServiceConfigured,
      }, session.access_token);

      setShowPasswordResetModal(false);
      setResetPassword('');
      setResetConfirmPassword('');
      alert('Password reset successfully!');
    } catch (error) {
      console.error('Error resetting password:', error);
      alert(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  const handleSendMessage = async () => {
    if (!messageTitle.trim() || !messageBody.trim()) {
      alert('Please enter both title and message');
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      await notificationsApi.createNotification({
        user: { id: memberId! },
        fromUser: { id: session.user.id },
        title: messageTitle,
        message: messageBody,
        type: 'message',
        link: 'dashboard',
      });

      setMessageTitle('');
      setMessageBody('');
      setShowMessageModal(false);
      alert('Message sent successfully!');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const tabGroups = [
    {
      id: 'overview',
      label: 'Overview',
      icon: User,
      tabs: [{ id: 'overview', label: 'Overview' }]
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      tabs: [
        { id: 'personal', label: 'Personal Information' },
        // Business tab only shows for retailers/manufacturers
        ...(businessMembershipData ? [{ id: 'business', label: 'Business Directory Listing' }] : []),
        { id: 'media', label: 'Media & Gallery' },
        { id: 'permissions', label: 'Permissions' },
      ]
    },
    {
      id: 'membership',
      label: 'Membership',
      icon: CreditCard,
      tabs: [
        { id: 'teams', label: 'Teams' },
        { id: 'memberships', label: 'Memberships & Subscriptions' },
        { id: 'orders', label: 'Orders & Invoices' },
      ]
    },
    {
      id: 'competition',
      label: 'Competition',
      icon: Trophy,
      tabs: [
        { id: 'events', label: 'Event Registrations' },
        { id: 'results', label: 'Competition Results' },
        { id: 'communications', label: 'Communications' },
      ]
    },
  ];

  if (permLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading member...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission('view_users')) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <User className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">You don't have permission to view member details.</p>
        </div>
      </div>
    );
  }

  // Show create form when in create mode
  if (isCreateMode) {
    if (!hasPermission('create_user')) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
          <div className="text-center">
            <User className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400">You don't have permission to create members.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => navigate('/admin/members')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Members
            </button>
          </div>

          {/* Create Member Form */}
          <div className="bg-slate-800 rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-bold text-white mb-6">Add New Member</h1>

            {createError && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="member@example.com"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={createFormData.first_name}
                    onChange={(e) => setCreateFormData({ ...createFormData, first_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={createFormData.last_name}
                    onChange={(e) => setCreateFormData({ ...createFormData, last_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={createFormData.phone}
                  onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={createFormData.role}
                  onChange={(e) => setCreateFormData({ ...createFormData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="user">User</option>
                  <option value="event_director">Event Director</option>
                  <option value="retailer">Retailer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Password Section */}
              <div className="border-t border-slate-700 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="h-5 w-5 text-orange-500" />
                  <h3 className="text-lg font-medium text-white">Password Setup</h3>
                </div>

                {/* Password Mode Selection */}
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="passwordMode"
                      checked={passwordMode === 'generated'}
                      onChange={() => setPasswordMode('generated')}
                      className="w-4 h-4 text-orange-500 bg-slate-700 border-slate-600"
                    />
                    <span className="text-gray-300">Generate one-time password</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="passwordMode"
                      checked={passwordMode === 'manual'}
                      onChange={() => setPasswordMode('manual')}
                      className="w-4 h-4 text-orange-500 bg-slate-700 border-slate-600"
                    />
                    <span className="text-gray-300">Set password manually</span>
                  </label>
                </div>

                {passwordMode === 'generated' ? (
                  /* Generated Password Display */
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Generated Password
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            readOnly
                            className="w-full pl-10 pr-12 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(password, setPasswordCopied)}
                          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1 ${
                            passwordCopied
                              ? 'bg-green-600 text-white'
                              : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                          }`}
                        >
                          {passwordCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {passwordCopied ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          type="button"
                          onClick={handleRegeneratePassword}
                          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Regenerate
                        </button>
                      </div>
                    </div>
                    <PasswordStrengthIndicator password={password} />
                  </div>
                ) : (
                  /* Manual Password Entry */
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Enter password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Confirm password"
                        />
                      </div>
                      {password && confirmPassword && password !== confirmPassword && (
                        <p className="text-red-400 text-sm mt-1">Passwords do not match</p>
                      )}
                    </div>
                    <PasswordStrengthIndicator password={password} />
                  </div>
                )}

                {/* Password Options */}
                <div className="mt-4 space-y-2">
                  <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forcePasswordChange}
                      onChange={(e) => setForcePasswordChange(e.target.checked)}
                      className="w-4 h-4 text-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-orange-500"
                    />
                    Force password change on first login
                  </label>
                  <label className={`flex items-center gap-2 ${emailServiceConfigured ? 'text-gray-300 cursor-pointer' : 'text-gray-500 cursor-not-allowed'}`}>
                    <input
                      type="checkbox"
                      checked={sendPasswordEmail}
                      onChange={(e) => setSendPasswordEmail(e.target.checked)}
                      disabled={!emailServiceConfigured}
                      className="w-4 h-4 text-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-orange-500 disabled:opacity-50"
                    />
                    Send password to user via email
                    {!emailServiceConfigured && (
                      <span className="text-xs text-gray-500">(Email service not configured)</span>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/admin/members')}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Member
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <User className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Member Not Found</h2>
          <p className="text-gray-400 mb-4">The member you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/admin/members')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Members
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
            onClick={() => navigate('/admin/members')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Members
          </button>
        </div>

        {/* Member Header Card */}
        <div className="bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              {/* Profile Picture */}
              <div className="flex-shrink-0">
                {(member.profile_picture_url || (member.profile_images && member.profile_images.length > 0)) ? (
                  <img
                    src={member.profile_picture_url || member.profile_images?.[0]}
                    alt={member.full_name}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-orange-500 flex items-center justify-center text-white text-3xl font-semibold">
                    {getInitials(member.first_name, member.last_name)}
                  </div>
                )}
              </div>

              {/* Member Info */}
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {member.first_name} {member.last_name}
                </h1>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Mail className="h-4 w-4" />
                    {member.email}
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone className="h-4 w-4" />
                      {member.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-300">
                    <span className="font-semibold">MECA ID:</span>
                    <span className="font-mono">{member.meca_id || 'N/A'}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {/* Membership Type Badge - show for all members */}
                  {derivedMembershipType ? (
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        derivedMembershipType.includes('Competitor')
                          ? derivedMembershipType.includes('Team')
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-blue-100 text-blue-800'
                          : derivedMembershipType === 'Retailer'
                          ? 'bg-purple-100 text-purple-800'
                          : derivedMembershipType === 'Manufacturer'
                          ? 'bg-amber-100 text-amber-800'
                          : derivedMembershipType === 'Team'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {derivedMembershipType}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      No Membership
                    </span>
                  )}
                  {/* Staff Role Badge - only show for admin/event_director */}
                  {(member.role === 'admin' || member.role === 'event_director') && (
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        member.role === 'admin'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {member.role.replace('_', ' ')}
                    </span>
                  )}
                  {/* Status Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      derivedMembershipStatus === 'active'
                        ? 'bg-green-100 text-green-800'
                        : derivedMembershipStatus === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : derivedMembershipStatus === 'expired'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {derivedMembershipStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              {hasPermission('manage_users') && (
                <button
                  onClick={async () => {
                    setResetPassword(generatePassword());
                    setResetPasswordMode('generated');
                    setResetForceChange(true);
                    setResetSendEmail(false);
                    setShowPasswordResetModal(true);
                    // Check email service status
                    profilesApi.getEmailServiceStatus().then(({ configured }) => {
                      setEmailServiceConfigured(configured);
                    }).catch(() => {
                      setEmailServiceConfigured(false);
                    });
                  }}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors inline-flex items-center gap-2"
                >
                  <Key className="h-4 w-4" />
                  Reset Password
                </button>
              )}
              {hasPermission('send_emails') && (
                <button
                  onClick={() => setShowMessageModal(true)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors inline-flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send Message
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Navigation - Grouped Dropdowns */}
        <div className="bg-slate-800 rounded-lg shadow-sm mb-6">
          <div className="border-b border-slate-700">
            <nav className="flex gap-2 px-4 py-2">
              {tabGroups.map((group) => {
                const Icon = group.icon;
                const isActive = group.tabs.some(tab => tab.id === activeTab);
                const isSingleTab = group.tabs.length === 1;

                if (isSingleTab) {
                  // For Overview - single tab, no dropdown
                  return (
                    <button
                      key={group.id}
                      onClick={() => setActiveTab(group.tabs[0].id as TabType)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                        activeTab === group.tabs[0].id
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-300 hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {group.label}
                    </button>
                  );
                }

                // For grouped tabs with dropdown
                return (
                  <div key={group.id} className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === group.id ? null : group.id)}
                      onMouseEnter={() => setOpenDropdown(group.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                        isActive
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-300 hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {group.label}
                      <ChevronDown className="h-4 w-4" />
                    </button>

                    {openDropdown === group.id && (
                      <div
                        className="absolute top-full left-0 mt-1 w-64 z-10"
                        onMouseLeave={() => setOpenDropdown(null)}
                      >
                        <div className="bg-slate-700 rounded-lg shadow-xl border border-slate-600 py-2">
                          {group.tabs.map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => {
                                setActiveTab(tab.id as TabType);
                                setOpenDropdown(null);
                              }}
                              className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                                activeTab === tab.id
                                  ? 'bg-orange-500 text-white'
                                  : 'text-gray-300 hover:bg-slate-600'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-slate-800 rounded-lg shadow-sm p-6">
          {activeTab === 'overview' && <OverviewTab member={member} derivedMembershipStatus={derivedMembershipStatus} />}
          {activeTab === 'personal' && <PersonalInfoTab member={member} onUpdate={fetchMember} />}
          {activeTab === 'business' && businessMembershipData && <BusinessInfoTab businessMembershipData={businessMembershipData} onUpdate={fetchMembershipStatusForHeader} />}
          {activeTab === 'media' && <MediaGalleryTab member={member} />}
          {activeTab === 'teams' && <TeamsTab member={member} businessMembershipData={businessMembershipData} />}
          {activeTab === 'memberships' && <MembershipsTab member={member} />}
          {activeTab === 'orders' && <OrdersInvoicesTab member={member} />}
          {activeTab === 'events' && <EventRegistrationsTab member={member} />}
          {activeTab === 'results' && <CompetitionResultsTab member={member} />}
          {activeTab === 'communications' && <CommunicationsTab member={member} />}
          {activeTab === 'permissions' && <PermissionsTab member={member} onUpdate={setMember} />}
        </div>

        {/* Send Message Modal */}
        {showMessageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full mx-4">
              <h2 className="text-2xl font-bold text-white mb-4">
                Send Message to {member.first_name} {member.last_name}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={messageTitle}
                    onChange={(e) => setMessageTitle(e.target.value)}
                    placeholder="Message subject..."
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Type your message here..."
                    rows={6}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowMessageModal(false);
                      setMessageTitle('');
                      setMessageBody('');
                    }}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                    disabled={sending}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={sending}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Password Reset Modal */}
        {showPasswordResetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full mx-4">
              <div className="flex items-center gap-2 mb-4">
                <Key className="h-6 w-6 text-orange-500" />
                <h2 className="text-2xl font-bold text-white">
                  Reset Password
                </h2>
              </div>

              <p className="text-gray-400 mb-4">
                Reset password for {member.first_name} {member.last_name} ({member.email})
              </p>

              <div className="space-y-4">
                {/* Password Mode Selection */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="resetPasswordMode"
                      checked={resetPasswordMode === 'generated'}
                      onChange={() => setResetPasswordMode('generated')}
                      className="w-4 h-4 text-orange-500 bg-slate-700 border-slate-600"
                    />
                    <span className="text-gray-300">Generate password</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="resetPasswordMode"
                      checked={resetPasswordMode === 'manual'}
                      onChange={() => setResetPasswordMode('manual')}
                      className="w-4 h-4 text-orange-500 bg-slate-700 border-slate-600"
                    />
                    <span className="text-gray-300">Set manually</span>
                  </label>
                </div>

                {resetPasswordMode === 'generated' ? (
                  /* Generated Password */
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Generated Password
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type={showResetPassword ? 'text' : 'password'}
                            value={resetPassword}
                            readOnly
                            className="w-full pl-10 pr-12 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowResetPassword(!showResetPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                          >
                            {showResetPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(resetPassword, setResetPasswordCopied)}
                          className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1 ${
                            resetPasswordCopied
                              ? 'bg-green-600 text-white'
                              : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                          }`}
                        >
                          {resetPasswordCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={handleRegenerateResetPassword}
                          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <PasswordStrengthIndicator password={resetPassword} />
                  </div>
                ) : (
                  /* Manual Password Entry */
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showResetPassword ? 'text' : 'password'}
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetPassword(!showResetPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                        >
                          {showResetPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showResetPassword ? 'text' : 'password'}
                          value={resetConfirmPassword}
                          onChange={(e) => setResetConfirmPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Confirm new password"
                        />
                      </div>
                      {resetPassword && resetConfirmPassword && resetPassword !== resetConfirmPassword && (
                        <p className="text-red-400 text-sm mt-1">Passwords do not match</p>
                      )}
                    </div>
                    <PasswordStrengthIndicator password={resetPassword} />
                  </div>
                )}

                {/* Options */}
                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resetForceChange}
                      onChange={(e) => setResetForceChange(e.target.checked)}
                      className="w-4 h-4 text-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-orange-500"
                    />
                    Force password change on next login
                  </label>
                  <label className={`flex items-center gap-2 ${emailServiceConfigured ? 'text-gray-300 cursor-pointer' : 'text-gray-500 cursor-not-allowed'}`}>
                    <input
                      type="checkbox"
                      checked={resetSendEmail}
                      onChange={(e) => setResetSendEmail(e.target.checked)}
                      disabled={!emailServiceConfigured}
                      className="w-4 h-4 text-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-orange-500 disabled:opacity-50"
                    />
                    Send new password via email
                    {!emailServiceConfigured && (
                      <span className="text-xs text-gray-500">(Email not configured)</span>
                    )}
                  </label>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={() => {
                      setShowPasswordResetModal(false);
                      setResetPassword('');
                      setResetConfirmPassword('');
                    }}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                    disabled={resettingPassword}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordReset}
                    disabled={resettingPassword || (resetPasswordMode === 'manual' && (!resetPassword || resetPassword !== resetConfirmPassword))}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    <Key className="h-4 w-4" />
                    {resettingPassword ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Tab Components (Placeholders - will be built in separate files)
function OverviewTab({
  member,
  derivedMembershipStatus,
}: {
  member: Profile;
  derivedMembershipStatus: string;
}) {
  const [stats, setStats] = useState({
    totalOrders: 0,
    eventsAttended: 0,
    trophiesWon: 0,
    totalSpent: 0,
    teamName: null as string | null,
    lastLogin: null as string | null,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverviewData();
  }, [member.id]);

  const fetchOverviewData = async () => {
    setStatsLoading(true);
    setStatsError(null);

    try {
      // Get auth token for the API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Fetch member stats from the backend API
      const memberStats = await profilesApi.getMemberStats(member.id, session.access_token);

      setStats({
        totalOrders: memberStats.totalOrders,
        eventsAttended: memberStats.eventsAttended,
        trophiesWon: memberStats.trophiesWon,
        totalSpent: memberStats.totalSpent,
        teamName: memberStats.teamName,
        lastLogin: member.updated_at,
      });

      setRecentActivity(memberStats.recentActivity);
      setUpcomingEvents(memberStats.upcomingEvents);
    } catch (error) {
      console.error('Failed to fetch member stats:', error);
      setStatsError(error instanceof Error ? error.message : 'Failed to load statistics');
      // Keep default values on error
    } finally {
      setStatsLoading(false);
    }
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'registration': return '📅';
      case 'payment': return '💳';
      case 'membership': return '🎫';
      case 'result': return '🏆';
      case 'team': return '👥';
      default: return '📌';
    }
  };

  const getMembershipColor = () => {
    switch (derivedMembershipStatus) {
      case 'active': return 'bg-green-600';
      case 'pending': return 'bg-yellow-600';
      case 'expired': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getMembershipExpiry = () => {
    if (!member.membership_expiry) return null;
    const expiry = new Date(member.membership_expiry);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return { text: 'Expired', warning: true };
    if (daysUntilExpiry < 30) return { text: `Expires in ${daysUntilExpiry} days`, warning: true };
    return { text: `Expires ${expiry.toLocaleDateString()}`, warning: false };
  };

  const expiryInfo = getMembershipExpiry();

  return (
    <div>
      {/* Membership Status Banner */}
      {derivedMembershipStatus !== 'none' && (
        <div className={`${getMembershipColor()} rounded-lg p-4 mb-6 flex items-center justify-between`}>
          <div className="flex items-center gap-4">
            <CreditCard className="h-8 w-8 text-white" />
            <div>
              <h3 className="text-white font-bold text-lg">
                {derivedMembershipStatus.charAt(0).toUpperCase() + derivedMembershipStatus.slice(1)} Member
              </h3>
              {expiryInfo && (
                <p className={`text-sm ${expiryInfo.warning ? 'text-yellow-200' : 'text-white'}`}>
                  {expiryInfo.text}
                </p>
              )}
            </div>
          </div>
          {expiryInfo?.warning && (
            <button className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-medium">
              Renew Now
            </button>
          )}
        </div>
      )}

      <h2 className="text-2xl font-bold text-white mb-6">Overview</h2>

      {/* Stats Error */}
      {statsError && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <p className="text-red-300">{statsError}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Member Since</div>
          <div className="text-xl font-bold text-white">
            {new Date(member.member_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </div>
        </div>
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Orders</div>
          <div className="text-xl font-bold text-white">
            {statsLoading ? <span className="animate-pulse">...</span> : stats.totalOrders}
          </div>
        </div>
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Events Attended</div>
          <div className="text-xl font-bold text-white">
            {statsLoading ? <span className="animate-pulse">...</span> : stats.eventsAttended}
          </div>
        </div>
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Trophies Won</div>
          <div className="text-xl font-bold text-white">
            {statsLoading ? <span className="animate-pulse">...</span> : stats.trophiesWon}
          </div>
        </div>
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Lifetime Value</div>
          <div className="text-xl font-bold text-white">
            {statsLoading ? <span className="animate-pulse">...</span> : `$${stats.totalSpent.toFixed(2)}`}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Recent Activity */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {statsLoading ? (
              <div className="text-gray-400 text-center py-8 bg-slate-700 rounded-lg">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                Loading activity...
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-gray-400 text-center py-8 bg-slate-700 rounded-lg">
                No recent activity
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-700 rounded-lg">
                  <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                  <div className="flex-1">
                    <p className="text-white text-sm">{activity.description}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Upcoming Events</h3>
          <div className="space-y-3">
            {statsLoading ? (
              <div className="text-gray-400 text-center py-8 bg-slate-700 rounded-lg">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                Loading events...
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-gray-400 text-center py-8 bg-slate-700 rounded-lg">
                No upcoming events
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 bg-slate-700 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-500 mt-1" />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{event.name}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {new Date(event.eventDate).toLocaleDateString()} - {event.location}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Team Information */}
      {stats.teamName && (
        <div className="bg-slate-700 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-orange-500" />
            Team Membership
          </h3>
          <p className="text-gray-300">Member of: <span className="text-white font-semibold">{stats.teamName}</span></p>
        </div>
      )}
    </div>
  );
}

// Business Directory Listing Tab - For Retailers and Manufacturers
// Uses the business-listings API (retailers/manufacturers tables), NOT membership fields
function BusinessInfoTab({
  businessMembershipData,
  onUpdate,
}: {
  businessMembershipData: {
    membershipId: string;
    category: string;
    userId: string;
  };
  onUpdate: () => void;
}) {
  const { profile } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const canEdit = hasPermission('edit_user');
  const canApprove = hasPermission('manage_business_listings') || hasPermission('admin');

  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<RetailerListing | ManufacturerListing | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRetailer = businessMembershipData.category === 'retail';

  // Form state for editing
  const [formData, setFormData] = useState({
    business_name: '',
    description: '',
    offer_text: '', // Retailers only
    business_email: '',
    business_phone: '',
    website: '',
    store_type: 'both', // Retailers only
    product_categories: [] as string[], // Manufacturers only
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    profile_image_url: '',
    is_sponsor: false,
    sponsor_order: 0,
  });

  // Fetch the business listing from the business-listings API
  useEffect(() => {
    fetchListing();
  }, [businessMembershipData.userId, businessMembershipData.category]);

  const fetchListing = async () => {
    try {
      setLoading(true);
      setError(null);

      let data: RetailerListing | ManufacturerListing | null = null;

      // Use admin endpoints to get the user's listing
      if (!profile?.id) {
        throw new Error('Admin profile not found');
      }

      if (isRetailer) {
        data = await adminGetRetailerByUserId(profile.id, businessMembershipData.userId);
      } else {
        data = await adminGetManufacturerByUserId(profile.id, businessMembershipData.userId);
      }

      setListing(data);

      if (data) {
        // Normalize country code
        const normalizeCountry = (country: string | undefined): string => {
          if (!country) return 'US';
          const upper = country.toUpperCase();
          if (upper === 'USA' || upper === 'UNITED STATES') return 'US';
          if (upper === 'CANADA') return 'CA';
          return country;
        };

        setFormData({
          business_name: data.businessName || '',
          description: data.description || '',
          offer_text: 'offerText' in data ? (data as RetailerListing).offerText || '' : '',
          business_email: data.businessEmail || '',
          business_phone: data.businessPhone || '',
          website: data.website || '',
          store_type: 'storeType' in data ? (data as RetailerListing).storeType || 'both' : 'both',
          product_categories: 'productCategories' in data ? (data as ManufacturerListing).productCategories || [] : [],
          street_address: data.streetAddress || '',
          city: data.city || '',
          state: data.state || '',
          postal_code: data.postalCode || '',
          country: normalizeCountry(data.country),
          profile_image_url: data.profileImageUrl || '',
          is_sponsor: data.isSponsor || false,
          sponsor_order: data.sponsorOrder || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching business listing:', err);
      setError('Failed to load business listing');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!canEdit || !listing || !profile?.id) return;

    setSaving(true);
    try {
      if (isRetailer) {
        await adminUpdateRetailer(profile.id, listing.id, {
          business_name: formData.business_name,
          description: formData.description,
          offer_text: formData.offer_text,
          business_email: formData.business_email,
          business_phone: formData.business_phone,
          website: formData.website,
          store_type: formData.store_type,
          street_address: formData.street_address,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          country: formData.country,
          profile_image_url: formData.profile_image_url,
          is_sponsor: formData.is_sponsor,
          sponsor_order: formData.sponsor_order,
          is_approved: true, // Admin edits auto-approve
        });
      } else {
        await adminUpdateManufacturer(profile.id, listing.id, {
          business_name: formData.business_name,
          description: formData.description,
          business_email: formData.business_email,
          business_phone: formData.business_phone,
          website: formData.website,
          product_categories: formData.product_categories,
          street_address: formData.street_address,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          country: formData.country,
          profile_image_url: formData.profile_image_url,
          is_sponsor: formData.is_sponsor,
          sponsor_order: formData.sponsor_order,
          is_approved: true, // Admin edits auto-approve
        });
      }
      setIsEditing(false);
      await fetchListing();
      onUpdate();
    } catch (err) {
      console.error('Error updating business listing:', err);
      alert('Failed to update business listing');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (listing) {
      const normalizeCountry = (country: string | undefined): string => {
        if (!country) return 'US';
        const upper = country.toUpperCase();
        if (upper === 'USA' || upper === 'UNITED STATES') return 'US';
        if (upper === 'CANADA') return 'CA';
        return country;
      };

      setFormData({
        business_name: listing.businessName || '',
        description: listing.description || '',
        offer_text: 'offerText' in listing ? (listing as RetailerListing).offerText || '' : '',
        business_email: listing.businessEmail || '',
        business_phone: listing.businessPhone || '',
        website: listing.website || '',
        store_type: 'storeType' in listing ? (listing as RetailerListing).storeType || 'both' : 'both',
        product_categories: 'productCategories' in listing ? (listing as ManufacturerListing).productCategories || [] : [],
        street_address: listing.streetAddress || '',
        city: listing.city || '',
        state: listing.state || '',
        postal_code: listing.postalCode || '',
        country: normalizeCountry(listing.country),
        profile_image_url: listing.profileImageUrl || '',
        is_sponsor: listing.isSponsor || false,
        sponsor_order: listing.sponsorOrder || 0,
      });
    }
    setIsEditing(false);
  };

  const handleApprove = async () => {
    if (!canApprove || !listing || !profile?.id) return;
    setSaving(true);
    try {
      if (isRetailer) {
        await adminApproveRetailer(profile.id, listing.id);
      } else {
        await adminApproveManufacturer(profile.id, listing.id);
      }
      await fetchListing();
      onUpdate();
    } catch (err) {
      console.error('Error approving listing:', err);
      alert('Failed to approve listing');
    } finally {
      setSaving(false);
    }
  };

  const handleViewInDirectory = () => {
    if (listing) {
      navigate(isRetailer ? `/retailers/${listing.id}` : `/manufacturers/${listing.id}`);
    }
  };

  const statesForCountry = getStatesForCountry(formData.country);
  const stateLabel = getStateLabel(formData.country);
  const postalCodeLabel = getPostalCodeLabel(formData.country);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 text-center">
        <p className="text-yellow-400 mb-2">No business listing found for this member.</p>
        <p className="text-gray-400 text-sm">
          Create a listing on the{' '}
          <button
            onClick={() => navigate('/admin/business-listings')}
            className="text-orange-400 hover:text-orange-300 underline"
          >
            Business Listings Admin page
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">Business Directory Listing</h2>
          <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">
            {isRetailer ? 'Retailer' : 'Manufacturer'}
          </span>
          {listing.isApproved ? (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
              <Check className="h-3 w-3" /> Approved
            </span>
          ) : (
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
              <Clock className="h-3 w-3" /> Pending Approval
            </span>
          )}
          {listing.isSponsor && (
            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
              ⭐ Sponsor
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {/* View in Directory Button */}
          <button
            onClick={handleViewInDirectory}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
            title="View in public directory"
          >
            <Eye className="h-4 w-4" />
            View in Directory
          </button>

          {/* Admin Approval Button */}
          {canApprove && !listing.isApproved && !isEditing && (
            <button
              onClick={handleApprove}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-2"
              disabled={saving}
            >
              <Check className="h-4 w-4" />
              Approve
            </button>
          )}

          {/* Edit Buttons */}
          {canEdit && (
            <>
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Listing
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Business Contact Information */}
      <div className="bg-slate-700 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-orange-500" />
          Business Contact Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Business Name</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Enter business name"
              />
            ) : (
              <div className="px-4 py-2 bg-slate-600 rounded-lg text-white">
                {listing.businessName || <span className="text-gray-500 italic">Not set</span>}
              </div>
            )}
          </div>

          {/* Business Email */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Business Email</label>
            {isEditing ? (
              <input
                type="email"
                value={formData.business_email}
                onChange={(e) => setFormData({ ...formData, business_email: e.target.value })}
                className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="contact@business.com"
              />
            ) : (
              <div className="px-4 py-2 bg-slate-600 rounded-lg text-white">
                {listing.businessEmail || <span className="text-gray-500 italic">Not set</span>}
              </div>
            )}
          </div>

          {/* Business Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Business Phone</label>
            {isEditing ? (
              <input
                type="tel"
                value={formData.business_phone}
                onChange={(e) => setFormData({ ...formData, business_phone: e.target.value })}
                className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="(555) 123-4567"
              />
            ) : (
              <div className="px-4 py-2 bg-slate-600 rounded-lg text-white">
                {listing.businessPhone ? (
                  <a href={`tel:${listing.businessPhone}`} className="text-orange-400 hover:text-orange-300 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {listing.businessPhone}
                  </a>
                ) : (
                  <span className="text-gray-500 italic">Not set</span>
                )}
              </div>
            )}
          </div>

          {/* Business Website */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Website</label>
            {isEditing ? (
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="https://example.com"
              />
            ) : (
              <div className="px-4 py-2 bg-slate-600 rounded-lg">
                {listing.website ? (
                  <a
                    href={listing.website.startsWith('http') ? listing.website : `https://${listing.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300 flex items-center gap-2"
                  >
                    <Globe className="h-4 w-4" />
                    {listing.website}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <span className="text-gray-500 italic">Not set</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Business Address */}
      <div className="bg-slate-700 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-orange-500" />
          Business Address
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Street Address */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-400 mb-2">Street Address</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.street_address}
                onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="123 Main Street"
              />
            ) : (
              <div className="px-4 py-2 bg-slate-600 rounded-lg text-white">
                {listing.streetAddress || <span className="text-gray-500 italic">Not set</span>}
              </div>
            )}
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">City</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="City"
              />
            ) : (
              <div className="px-4 py-2 bg-slate-600 rounded-lg text-white">
                {listing.city || <span className="text-gray-500 italic">Not set</span>}
              </div>
            )}
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Country</label>
            {isEditing ? (
              <select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value, state: '' })}
                className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            ) : (
              <div className="px-4 py-2 bg-slate-600 rounded-lg text-white">
                {countries.find(c => c.code === listing.country || c.code === formData.country)?.name || listing.country || <span className="text-gray-500 italic">Not set</span>}
              </div>
            )}
          </div>

          {/* State/Province */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">{stateLabel}</label>
            {isEditing ? (
              statesForCountry.length > 0 ? (
                <select
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select {stateLabel}</option>
                  {statesForCountry.map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder={stateLabel}
                />
              )
            ) : (
              <div className="px-4 py-2 bg-slate-600 rounded-lg text-white">
                {statesForCountry.find(s => s.code === listing.state)?.name || listing.state || <span className="text-gray-500 italic">Not set</span>}
              </div>
            )}
          </div>

          {/* Postal Code */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">{postalCodeLabel}</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder={postalCodeLabel}
              />
            ) : (
              <div className="px-4 py-2 bg-slate-600 rounded-lg text-white">
                {listing.postalCode || <span className="text-gray-500 italic">Not set</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Directory Listing Details */}
      <div className="bg-slate-700 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-orange-500" />
          Directory Listing Details
        </h3>
        <div className="space-y-4">
          {/* Profile/Logo Image */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Profile/Logo Image URL</label>
            {isEditing ? (
              <input
                type="url"
                value={formData.profile_image_url}
                onChange={(e) => setFormData({ ...formData, profile_image_url: e.target.value })}
                className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="https://example.com/logo.png"
              />
            ) : (
              <div className="flex items-center gap-4">
                {listing.profileImageUrl ? (
                  <>
                    <img
                      src={listing.profileImageUrl}
                      alt="Business Logo"
                      className="h-16 w-16 object-cover rounded-lg bg-slate-600"
                    />
                    <span className="text-gray-400 text-sm truncate max-w-md">{listing.profileImageUrl}</span>
                  </>
                ) : (
                  <div className="px-4 py-2 bg-slate-600 rounded-lg text-gray-500 italic">No logo set</div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Business Description</label>
            {isEditing ? (
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-white rounded-lg focus:ring-2 focus:ring-orange-500 resize-none"
                placeholder="Describe your business..."
              />
            ) : (
              <div className="px-4 py-3 bg-slate-600 rounded-lg text-white min-h-[100px]">
                {listing.description || <span className="text-gray-500 italic">No description provided</span>}
              </div>
            )}
          </div>

          {/* Special Offer (Retailers Only) */}
          {isRetailer && (
            <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-500/30 rounded-lg p-4">
              <label className="block text-red-400 text-sm font-medium mb-2">
                🏷️ Special Offer for MECA Members
              </label>
              {isEditing ? (
                <textarea
                  value={formData.offer_text}
                  onChange={(e) => setFormData({ ...formData, offer_text: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-800 text-white rounded-lg border border-red-500/50 focus:ring-2 focus:ring-red-500 resize-none"
                  placeholder="e.g., 10% off all purchases with code MECA10..."
                />
              ) : (
                <div className="px-4 py-2 bg-slate-800 rounded-lg text-white">
                  {(listing as RetailerListing).offerText || <span className="text-gray-500 italic">No special offer</span>}
                </div>
              )}
            </div>
          )}

          {/* Store Type (Retailers Only) */}
          {isRetailer && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Store Type</label>
              {isEditing ? (
                <select
                  value={formData.store_type}
                  onChange={(e) => setFormData({ ...formData, store_type: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="brick_and_mortar">Physical Store Only</option>
                  <option value="online">Online Only</option>
                  <option value="both">Physical & Online</option>
                </select>
              ) : (
                <div className="px-4 py-2 bg-slate-600 rounded-lg text-white">
                  {(listing as RetailerListing).storeType === 'brick_and_mortar' ? 'Physical Store Only' :
                   (listing as RetailerListing).storeType === 'online' ? 'Online Only' : 'Physical & Online'}
                </div>
              )}
            </div>
          )}

          {/* Product Categories (Manufacturers Only) */}
          {!isRetailer && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Product Categories</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.product_categories.join(', ')}
                  onChange={(e) => setFormData({
                    ...formData,
                    product_categories: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                  })}
                  className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Amplifiers, Subwoofers, Speakers (comma separated)"
                />
              ) : (
                <div className="px-4 py-2 bg-slate-600 rounded-lg text-white">
                  {(listing as ManufacturerListing).productCategories?.join(', ') || <span className="text-gray-500 italic">No categories</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admin Options */}
      {canEdit && (
        <div className="bg-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Admin Options</h3>
          <div className="space-y-4">
            {/* Sponsor Status */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_sponsor"
                checked={formData.is_sponsor}
                onChange={(e) => setFormData({ ...formData, is_sponsor: e.target.checked })}
                disabled={!isEditing}
                className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="is_sponsor" className="text-gray-300">
                Featured Sponsor (shown on homepage carousel)
              </label>
            </div>

            {/* Sponsor Order */}
            {formData.is_sponsor && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Sponsor Display Order</label>
                <input
                  type="number"
                  value={formData.sponsor_order}
                  onChange={(e) => setFormData({ ...formData, sponsor_order: parseInt(e.target.value) || 0 })}
                  disabled={!isEditing}
                  min="0"
                  className="w-32 px-4 py-2 bg-slate-600 border border-slate-500 text-white rounded-lg focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                />
                <p className="text-gray-500 text-xs mt-1">Lower numbers appear first</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending Approval Note */}
      {!listing.isApproved && (
        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            This listing is pending admin approval and is not visible in the public directory.
          </p>
        </div>
      )}
    </div>
  );
}

function PersonalInfoTab({ member, onUpdate }: { member: Profile; onUpdate: () => void }) {
  const { profile: currentUserProfile } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('edit_user');
  const canEditMecaId = canEdit && isSuperAdmin(currentUserProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: member.first_name,
    last_name: member.last_name,
    phone: member.phone || '',
    meca_id: member.meca_id ? String(member.meca_id) : '',
    role: member.role,
    membership_status: member.membership_status,
    address: member.address || '',
    city: member.city || '',
    state: member.state || '',
    postal_code: member.postal_code || '',
    country: member.country || 'US',
    billing_street: member.billing_street || '',
    billing_city: member.billing_city || '',
    billing_state: member.billing_state || '',
    billing_zip: member.billing_zip || '',
    billing_country: member.billing_country || '',
    shipping_street: member.shipping_street || '',
    shipping_city: member.shipping_city || '',
    shipping_state: member.shipping_state || '',
    shipping_zip: member.shipping_zip || '',
    shipping_country: member.shipping_country || '',
    use_billing_for_shipping: member.use_billing_for_shipping || false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!canEdit) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await profilesApi.update(member.id, formData, session?.access_token || undefined);

      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating member:', error);
      alert(error?.message || 'Failed to update member information');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: member.first_name,
      last_name: member.last_name,
      phone: member.phone || '',
      meca_id: member.meca_id ? String(member.meca_id) : '',
      role: member.role,
      membership_status: member.membership_status,
      address: member.address || '',
      city: member.city || '',
      state: member.state || '',
      postal_code: member.postal_code || '',
      country: member.country || 'US',
      billing_street: member.billing_street || '',
      billing_city: member.billing_city || '',
      billing_state: member.billing_state || '',
      billing_zip: member.billing_zip || '',
      billing_country: member.billing_country || '',
      shipping_street: member.shipping_street || '',
      shipping_city: member.shipping_city || '',
      shipping_state: member.shipping_state || '',
      shipping_zip: member.shipping_zip || '',
      shipping_country: member.shipping_country || '',
      use_billing_for_shipping: member.use_billing_for_shipping || false,
    });
    setIsEditing(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Personal Information</h2>
        {canEdit && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Edit
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            ) : (
              <div className="px-4 py-2 bg-slate-700 rounded-lg text-white">{member.first_name}</div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            ) : (
              <div className="px-4 py-2 bg-slate-700 rounded-lg text-white">{member.last_name}</div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <div className="px-4 py-2 bg-slate-700 rounded-lg text-gray-400">{member.email}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">MECA ID</label>
            {isEditing && canEditMecaId ? (
              <input
                type="text"
                value={formData.meca_id}
                onChange={(e) => setFormData({ ...formData, meca_id: e.target.value })}
                placeholder="e.g., 700800 or 202401"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 font-mono"
              />
            ) : (
              <div className="px-4 py-2 bg-slate-700 rounded-lg text-white font-mono">{member.meca_id || 'Not assigned'}</div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
            {isEditing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            ) : (
              <div className="px-4 py-2 bg-slate-700 rounded-lg text-white">{member.phone || 'Not provided'}</div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
            {isEditing ? (
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="user">User</option>
                <option value="event_director">Event Director</option>
                <option value="retailer">Retailer</option>
                <option value="admin">Admin</option>
              </select>
            ) : (
              <div className="px-4 py-2 bg-slate-700 rounded-lg text-white">{member.role}</div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-700 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Primary Address</h3>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value, state: '' })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getStateLabel(formData.country)}
                </label>
                {getStatesForCountry(formData.country).length > 0 ? (
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select {getStateLabel(formData.country)}</option>
                    {getStatesForCountry(formData.country).map((state) => (
                      <option key={state.code} value={state.code}>{state.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder={getStateLabel(formData.country)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getPostalCodeLabel(formData.country)}
                </label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          ) : member.address ? (
            <div className="space-y-2 text-gray-300">
              <div>{member.address}</div>
              <div>
                {member.city}, {member.state} {member.postal_code}
              </div>
              <div>{countries.find(c => c.code === member.country)?.name || member.country}</div>
            </div>
          ) : (
            <div className="text-gray-400">No primary address on file</div>
          )}
        </div>

        <div className="border-t border-slate-700 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Billing Address</h3>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
                <input
                  type="text"
                  value={formData.billing_street}
                  onChange={(e) => setFormData({ ...formData, billing_street: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                <input
                  type="text"
                  value={formData.billing_city}
                  onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                <select
                  value={formData.billing_country}
                  onChange={(e) => setFormData({ ...formData, billing_country: e.target.value, billing_state: '' })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Country</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {formData.billing_country ? getStateLabel(formData.billing_country) : 'State'}
                </label>
                {formData.billing_country && getStatesForCountry(formData.billing_country).length > 0 ? (
                  <select
                    value={formData.billing_state}
                    onChange={(e) => setFormData({ ...formData, billing_state: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select {getStateLabel(formData.billing_country)}</option>
                    {getStatesForCountry(formData.billing_country).map((state) => (
                      <option key={state.code} value={state.code}>{state.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.billing_state}
                    onChange={(e) => setFormData({ ...formData, billing_state: e.target.value })}
                    placeholder={formData.billing_country ? getStateLabel(formData.billing_country) : 'State'}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {formData.billing_country ? getPostalCodeLabel(formData.billing_country) : 'ZIP Code'}
                </label>
                <input
                  type="text"
                  value={formData.billing_zip}
                  onChange={(e) => setFormData({ ...formData, billing_zip: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          ) : member.billing_street ? (
            <div className="space-y-2 text-gray-300">
              <div>{member.billing_street}</div>
              <div>
                {member.billing_city}, {member.billing_state} {member.billing_zip}
              </div>
              <div>{countries.find(c => c.code === member.billing_country)?.name || member.billing_country}</div>
            </div>
          ) : (
            <div className="text-gray-400">No billing address on file</div>
          )}
        </div>

        <div className="border-t border-slate-700 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Shipping Address</h3>
          {isEditing && (
            <label className="flex items-center gap-2 mb-4 text-gray-300">
              <input
                type="checkbox"
                checked={formData.use_billing_for_shipping}
                onChange={(e) => setFormData({ ...formData, use_billing_for_shipping: e.target.checked })}
                className="w-4 h-4 text-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-orange-500"
              />
              Same as billing address
            </label>
          )}
          {isEditing && !formData.use_billing_for_shipping ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
                <input
                  type="text"
                  value={formData.shipping_street}
                  onChange={(e) => setFormData({ ...formData, shipping_street: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                <input
                  type="text"
                  value={formData.shipping_city}
                  onChange={(e) => setFormData({ ...formData, shipping_city: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                <select
                  value={formData.shipping_country}
                  onChange={(e) => setFormData({ ...formData, shipping_country: e.target.value, shipping_state: '' })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Country</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {formData.shipping_country ? getStateLabel(formData.shipping_country) : 'State'}
                </label>
                {formData.shipping_country && getStatesForCountry(formData.shipping_country).length > 0 ? (
                  <select
                    value={formData.shipping_state}
                    onChange={(e) => setFormData({ ...formData, shipping_state: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select {getStateLabel(formData.shipping_country)}</option>
                    {getStatesForCountry(formData.shipping_country).map((state) => (
                      <option key={state.code} value={state.code}>{state.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.shipping_state}
                    onChange={(e) => setFormData({ ...formData, shipping_state: e.target.value })}
                    placeholder={formData.shipping_country ? getStateLabel(formData.shipping_country) : 'State'}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {formData.shipping_country ? getPostalCodeLabel(formData.shipping_country) : 'ZIP Code'}
                </label>
                <input
                  type="text"
                  value={formData.shipping_zip}
                  onChange={(e) => setFormData({ ...formData, shipping_zip: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          ) : !isEditing && member.use_billing_for_shipping ? (
            <div className="text-gray-400">Same as billing address</div>
          ) : !isEditing && member.shipping_street ? (
            <div className="space-y-2 text-gray-300">
              <div>{member.shipping_street}</div>
              <div>
                {member.shipping_city}, {member.shipping_state} {member.shipping_zip}
              </div>
              <div>{countries.find(c => c.code === member.shipping_country)?.name || member.shipping_country}</div>
            </div>
          ) : !isEditing ? (
            <div className="text-gray-400">No shipping address on file</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Image Violation Reasons
const IMAGE_VIOLATION_REASONS = [
  { value: 'warning', label: 'Warning', description: 'General warning about image content' },
  { value: 'offensive', label: 'Offensive', description: 'Content is offensive or harmful' },
  { value: 'inappropriate', label: 'Inappropriate', description: 'Content is not appropriate for the platform' },
  { value: 'not_within_guidelines', label: 'Not within MECA guidelines', description: 'Content violates MECA community guidelines' },
  { value: 'against_policy', label: 'Against Policy', description: 'Content violates MECA policies' },
];

interface ImageItem {
  url: string;
  type: 'profile' | 'team';
  index: number;
  teamId?: string;
  teamName?: string;
  isHidden?: boolean;
}

function MediaGalleryTab({ member }: { member: Profile }) {
  const { hasPermission } = usePermissions();
  const canModerate = hasPermission('edit_user');

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [hiddenImages, setHiddenImages] = useState<Set<string>>(new Set());
  const [togglingVisibility, setTogglingVisibility] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamData();
    fetchHiddenImages();
  }, [member.id]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const teamData = await teamsApi.getTeamByUserId(member.id);
      setTeam(teamData);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHiddenImages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const urls = await moderationApi.getHiddenImages(member.id, session.access_token);
      setHiddenImages(new Set(urls));
    } catch (error) {
      console.log('Could not fetch moderated images');
    }
  };

  const profileImages: ImageItem[] = (member.profile_images || []).map((url, index) => ({
    url,
    type: 'profile' as const,
    index,
    isHidden: hiddenImages.has(url),
  }));

  const teamImages: ImageItem[] = team?.galleryImages?.map((url, index) => ({
    url,
    type: 'team' as const,
    index,
    teamId: team.id,
    teamName: team.name,
    isHidden: hiddenImages.has(url),
  })) || [];

  const allImages = [...profileImages, ...teamImages];

  const handleToggleVisibility = async (image: ImageItem) => {
    if (!canModerate) return;

    setTogglingVisibility(image.url);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const newHiddenState = !image.isHidden;

      await moderationApi.toggleImageVisibility({
        userId: member.id,
        imageUrl: image.url,
        imageType: image.type,
        hide: newHiddenState,
        link: image.type === 'profile' ? '/public-profile' : `/teams/${image.teamId}`,
      }, session.access_token);

      // Update local state
      setHiddenImages(prev => {
        const newSet = new Set(prev);
        if (newHiddenState) {
          newSet.add(image.url);
        } else {
          newSet.delete(image.url);
        }
        return newSet;
      });
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('Failed to update image visibility');
    } finally {
      setTogglingVisibility(null);
    }
  };

  const handleDeleteClick = (image: ImageItem) => {
    setSelectedImage(image);
    setDeleteReason('');
    setCustomMessage('');
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedImage) {
      return;
    }

    setDeleting(true);
    try {
      // Determine what type of image we're deleting
      const isLogo = selectedImage.type === 'team' && selectedImage.index === -1;

      // Delete from profile_images, team logo, or team gallery_images
      if (selectedImage.type === 'profile') {
        const updatedImages = (member.profile_images || []).filter((_, i) => i !== selectedImage.index);
        await profilesApi.update(member.id, { profile_images: updatedImages });
      } else if (isLogo && selectedImage.teamId) {
        // Delete team logo
        await teamsApi.updateTeam(selectedImage.teamId, { logo_url: null });
      } else if (selectedImage.type === 'team' && selectedImage.teamId) {
        // Delete from team gallery
        const updatedImages = (team?.galleryImages || []).filter((_, i) => i !== selectedImage.index);
        await teamsApi.updateTeam(selectedImage.teamId, { gallery_images: updatedImages });
      }

      // Get the reason label if provided
      const reasonLabel = deleteReason
        ? IMAGE_VIOLATION_REASONS.find(r => r.value === deleteReason)?.label || deleteReason
        : null;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      // Build notification message based on what was provided
      const imageTypeLabel = selectedImage.type === 'profile'
        ? 'profile'
        : isLogo
          ? 'team logo'
          : 'team gallery';

      let notificationTitle = 'Image Removed by MECA Admin';
      let notificationMessage = `Your ${imageTypeLabel} image has been removed by a MECA administrator.`;

      if (reasonLabel) {
        notificationTitle = `Image Removed - ${reasonLabel}`;
        notificationMessage = `Your ${imageTypeLabel} image has been removed.\n\nReason: ${reasonLabel}`;
        if (customMessage) {
          notificationMessage += `\n\nAdditional message: ${customMessage}`;
        }
      } else if (customMessage) {
        notificationMessage = `Your ${imageTypeLabel} image has been removed by a MECA administrator.\n\nMessage: ${customMessage}`;
      }

      // Send notification and log moderation action via backend API
      await moderationApi.deleteImageNotify({
        userId: member.id,
        imageUrl: selectedImage.url,
        imageType: selectedImage.type,
        title: notificationTitle,
        message: notificationMessage,
        link: selectedImage.type === 'profile' ? '/public-profile' : `/teams/${selectedImage.teamId}`,
        reason: deleteReason,
        customMessage,
      }, session.access_token);

      // Refresh data
      if (selectedImage.type === 'team') {
        await fetchTeamData();
      }

      setShowDeleteModal(false);
      setSelectedImage(null);
      alert('Image deleted and user notified');

      // Force refresh the page to get updated profile_images
      window.location.reload();
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Media & Gallery</h2>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading media...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Media & Gallery</h2>
        {canModerate && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Shield className="h-4 w-4" />
            <span>Moderation Mode</span>
          </div>
        )}
      </div>

      {allImages.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-slate-700 rounded-lg">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-500" />
          <p>No images uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Profile Images Section */}
          {profileImages.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-orange-500" />
                Profile Images ({profileImages.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {profileImages.map((image) => (
                  <ImageCard
                    key={`profile-${image.index}`}
                    image={image}
                    canModerate={canModerate}
                    isHidden={hiddenImages.has(image.url)}
                    togglingVisibility={togglingVisibility === image.url}
                    onToggleVisibility={() => handleToggleVisibility(image)}
                    onDelete={() => handleDeleteClick(image)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Team Images Section */}
          {teamImages.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-orange-500" />
                Team Gallery: {team?.name} ({teamImages.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {teamImages.map((image) => (
                  <ImageCard
                    key={`team-${image.index}`}
                    image={image}
                    canModerate={canModerate}
                    isHidden={hiddenImages.has(image.url)}
                    togglingVisibility={togglingVisibility === image.url}
                    onToggleVisibility={() => handleToggleVisibility(image)}
                    onDelete={() => handleDeleteClick(image)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Team Logo if available */}
          {team?.logoUrl && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-orange-500" />
                Team Logo
              </h3>
              <div className="w-48">
                <ImageCard
                  image={{
                    url: team.logoUrl,
                    type: 'team',
                    index: -1, // Special index for logo
                    teamId: team.id,
                    teamName: team.name,
                    isHidden: hiddenImages.has(team.logoUrl),
                  }}
                  canModerate={canModerate}
                  isHidden={hiddenImages.has(team.logoUrl)}
                  togglingVisibility={togglingVisibility === team.logoUrl}
                  onToggleVisibility={() => handleToggleVisibility({
                    url: team.logoUrl!,
                    type: 'team',
                    index: -1,
                    teamId: team.id,
                    teamName: team.name,
                    isHidden: hiddenImages.has(team.logoUrl!),
                  })}
                  onDelete={() => handleDeleteClick({
                    url: team.logoUrl!,
                    type: 'team',
                    index: -1, // Special index for logo
                    teamId: team.id,
                    teamName: team.name,
                    isHidden: hiddenImages.has(team.logoUrl!),
                  })}
                  isLogo={true}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-white">Delete Image & Send Warning</h2>
            </div>

            {/* Image Preview */}
            <div className="mb-4 flex justify-center">
              <img
                src={selectedImage.url}
                alt="Image to delete"
                className="max-h-40 rounded-lg object-contain"
              />
            </div>

            <p className="text-gray-300 mb-4">
              This will permanently delete the image and send a notification to the user. You can optionally provide a reason and message.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason for Deletion (Optional)
                </label>
                <select
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="">No specific reason</option>
                  {IMAGE_VIOLATION_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
                {deleteReason && (
                  <p className="mt-1 text-sm text-gray-400">
                    {IMAGE_VIOLATION_REASONS.find(r => r.value === deleteReason)?.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Additional Message (Optional)
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add any additional context or instructions for the user..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="bg-slate-700 rounded-lg p-3 text-sm">
                <p className="text-gray-300">
                  <strong className="text-white">The user will receive:</strong>
                </p>
                <ul className="list-disc list-inside mt-2 text-gray-400 space-y-1">
                  <li>A notification in their notification bell</li>
                  <li>{deleteReason ? `Reason: ${IMAGE_VIOLATION_REASONS.find(r => r.value === deleteReason)?.label}` : 'Simple "Image Removed by MECA Admin" message'}</li>
                  {customMessage && <li>Your additional message</li>}
                  <li>An email notification (when mail system is active)</li>
                </ul>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedImage(null);
                    setDeleteReason('');
                    setCustomMessage('');
                  }}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? 'Deleting...' : 'Delete & Notify User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Image Card Component for the gallery
function ImageCard({
  image,
  canModerate,
  isHidden,
  togglingVisibility,
  onToggleVisibility,
  onDelete,
  isLogo = false,
}: {
  image: ImageItem;
  canModerate: boolean;
  isHidden: boolean;
  togglingVisibility: boolean;
  onToggleVisibility: () => void;
  onDelete: () => void;
  isLogo?: boolean;
}) {
  const getTypeBadge = () => {
    if (isLogo) return 'Logo';
    if (image.type === 'profile') return 'Profile';
    return 'Team';
  };

  return (
    <div className={`relative group aspect-square rounded-lg overflow-hidden bg-slate-700 ${isHidden ? 'ring-2 ring-yellow-500' : ''}`}>
      <img
        src={image.url}
        alt={isLogo ? 'Team logo' : `${image.type} image ${image.index + 1}`}
        className={`w-full h-full object-cover transition-opacity ${isHidden ? 'opacity-50' : ''}`}
      />

      {/* Hidden Badge */}
      {isHidden && (
        <div className="absolute top-2 left-2 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
          <EyeOff className="h-3 w-3" />
          Hidden
        </div>
      )}

      {/* Type Badge */}
      <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs ${isLogo ? 'bg-orange-500 text-white' : 'bg-black/60 text-white'}`}>
        {getTypeBadge()}
      </div>

      {/* Hover Actions */}
      {canModerate && (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => window.open(image.url, '_blank')}
            className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            title="View full size"
          >
            <ExternalLink className="h-5 w-5" />
          </button>
          <button
            onClick={onToggleVisibility}
            disabled={togglingVisibility}
            className={`p-2 rounded-lg transition-colors ${
              isHidden
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-yellow-600 text-white hover:bg-yellow-700'
            } disabled:opacity-50`}
            title={isHidden ? 'Make visible' : 'Hide from public'}
          >
            {togglingVisibility ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isHidden ? (
              <Eye className="h-5 w-5" />
            ) : (
              <EyeOff className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={onDelete}
            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            title="Delete with warning"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function TeamsTab({ member, businessMembershipData }: {
  member: Profile;
  businessMembershipData: {
    membershipId: string;
    businessName: string;
    category: string;
  } | null;
}) {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  // Edit mode states
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    bio: '',
    location: '',
    website: '',
    maxMembers: 50,
    teamType: 'competitive' as 'competitive' | 'casual' | 'shop' | 'club',
    isPublic: true,
    requiresApproval: true,
  });

  // Member management states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [mecaIdSearch, setMecaIdSearch] = useState('');
  const [memberLookupResult, setMemberLookupResult] = useState<any>(null);
  const [lookingUpMember, setLookingUpMember] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  // Transfer ownership state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Delete team state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Role change state
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null);

  useEffect(() => {
    fetchTeam();
  }, [member.id, businessMembershipData?.membershipId]);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      setError(null);

      let teamData: Team | null = null;

      // For retailers/manufacturers, the team ID is the membership ID
      if (businessMembershipData?.membershipId) {
        try {
          teamData = await teamsApi.getPublicTeamById(businessMembershipData.membershipId);
        } catch {
          // Business team might not exist yet, continue to check regular teams
        }
      }

      // If no business team found, check for regular teams (competitor teams, etc.)
      if (!teamData) {
        teamData = await teamsApi.getTeamByUserId(member.id);
      }

      setTeam(teamData);
      if (teamData) {
        setEditForm({
          name: teamData.name || '',
          description: teamData.description || '',
          bio: teamData.bio || '',
          location: teamData.location || '',
          website: teamData.website || '',
          maxMembers: teamData.maxMembers || 50,
          teamType: teamData.teamType || 'competitive',
          isPublic: teamData.isPublic ?? true,
          requiresApproval: teamData.requiresApproval ?? true,
        });
      }
    } catch (err) {
      console.error('Error fetching team:', err);
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const showSuccessMessage = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Save team details
  const handleSaveDetails = async () => {
    if (!team) return;
    try {
      setSaving(true);
      setError(null);
      await teamsApi.updateTeam(team.id, {
        name: editForm.name,
        description: editForm.description,
        bio: editForm.bio,
        location: editForm.location,
        website: editForm.website,
        max_members: editForm.maxMembers,
        team_type: editForm.teamType,
        is_public: editForm.isPublic,
        requires_approval: editForm.requiresApproval,
      });
      await fetchTeam();
      setIsEditingDetails(false);
      showSuccessMessage('Team details updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update team');
    } finally {
      setSaving(false);
    }
  };

  // Lookup member by MECA ID
  const handleLookupMember = async () => {
    if (!mecaIdSearch.trim()) return;
    try {
      setLookingUpMember(true);
      setMemberLookupResult(null);
      const result = await teamsApi.lookupMemberByMecaId(mecaIdSearch.trim());
      setMemberLookupResult(result);
    } catch (err) {
      setMemberLookupResult({ found: false, message: 'Failed to lookup member' });
    } finally {
      setLookingUpMember(false);
    }
  };

  // Add member to team
  const handleAddMember = async (userId: string) => {
    if (!team) return;
    try {
      setAddingMember(true);
      setError(null);
      await teamsApi.addMember(team.id, userId);
      await fetchTeam();
      setShowAddMemberModal(false);
      setMecaIdSearch('');
      setMemberLookupResult(null);
      showSuccessMessage('Member added successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  // Remove member from team
  const handleRemoveMember = async (userId: string) => {
    if (!team) return;
    if (!confirm('Are you sure you want to remove this member from the team?')) return;
    try {
      setSaving(true);
      setError(null);
      await teamsApi.removeMember(team.id, userId);
      await fetchTeam();
      showSuccessMessage('Member removed successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setSaving(false);
    }
  };

  // Change member role
  const handleChangeRole = async (userId: string, newRole: 'owner' | 'co_owner' | 'moderator' | 'member') => {
    if (!team) return;
    try {
      setSaving(true);
      setError(null);
      await teamsApi.updateMemberRole(team.id, userId, newRole);
      await fetchTeam();
      setChangingRoleFor(null);
      showSuccessMessage('Member role updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  // Approve join request
  const handleApproveRequest = async (userId: string) => {
    if (!team) return;
    try {
      setSaving(true);
      setError(null);
      await teamsApi.approveJoinRequest(team.id, userId);
      await fetchTeam();
      showSuccessMessage('Join request approved');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setSaving(false);
    }
  };

  // Reject join request
  const handleRejectRequest = async (userId: string) => {
    if (!team) return;
    try {
      setSaving(true);
      setError(null);
      await teamsApi.rejectJoinRequest(team.id, userId);
      await fetchTeam();
      showSuccessMessage('Join request rejected');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setSaving(false);
    }
  };

  // Cancel invite
  const handleCancelInvite = async (userId: string) => {
    if (!team) return;
    try {
      setSaving(true);
      setError(null);
      await teamsApi.cancelInvite(team.id, userId);
      await fetchTeam();
      showSuccessMessage('Invite cancelled');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel invite');
    } finally {
      setSaving(false);
    }
  };

  // Transfer ownership
  const handleTransferOwnership = async () => {
    if (!team || !transferTargetId) return;
    try {
      setTransferring(true);
      setError(null);
      await teamsApi.transferOwnership(team.id, transferTargetId);
      await fetchTeam();
      setShowTransferModal(false);
      setTransferTargetId('');
      showSuccessMessage('Ownership transferred successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to transfer ownership');
    } finally {
      setTransferring(false);
    }
  };

  // Delete team
  const handleDeleteTeam = async () => {
    if (!team) return;
    try {
      setDeleting(true);
      setError(null);
      await teamsApi.deleteTeam(team.id);
      setTeam(null);
      setShowDeleteConfirm(false);
      showSuccessMessage('Team deleted successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete team');
    } finally {
      setDeleting(false);
    }
  };

  const TEAM_TYPE_OPTIONS = [
    { value: 'competitive', label: 'Competitive Team' },
    { value: 'casual', label: 'Casual Team' },
    { value: 'shop', label: 'Shop Team' },
    { value: 'club', label: 'Club' },
  ];

  const ROLE_OPTIONS = [
    { value: 'owner', label: 'Owner', color: 'bg-orange-500/20 text-orange-400' },
    { value: 'co_owner', label: 'Co-Owner', color: 'bg-yellow-500/20 text-yellow-400' },
    { value: 'moderator', label: 'Moderator', color: 'bg-blue-500/20 text-blue-400' },
    { value: 'member', label: 'Member', color: 'bg-slate-500/20 text-slate-400' },
  ];

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Team Management</h2>
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4">Loading team data...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Team Management</h2>
        <div className="bg-slate-700 rounded-lg p-8 text-center">
          <UsersIcon className="h-16 w-16 mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400 mb-2">This member does not have a team</p>
          <p className="text-sm text-gray-500">
            To create a team, assign a membership with the Team Add-on from the Memberships tab.
          </p>
        </div>
      </div>
    );
  }

  // Find member's role in the team
  const memberRecord = team.members?.find((m) => m.userId === member.id);
  const isOwner = team.captainId === member.id;
  const activeMembers = team.members?.filter((m) => m.status === 'active') || [];
  const pendingRequests = team.pendingRequests || team.members?.filter((m) => m.status === 'pending_approval') || [];
  const pendingInvites = team.pendingInvites || team.members?.filter((m) => m.status === 'pending_invite') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Team Management</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/teams/${team.id}`)}
            className="px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors inline-flex items-center gap-2 text-sm"
          >
            <ExternalLink className="h-4 w-4" />
            View Public Profile
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2 text-sm"
          >
            <Trash2 className="h-4 w-4" />
            Delete Team
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-400">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Team Details Section */}
      <div className="bg-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Team Details</h3>
          {!isEditingDetails ? (
            <button
              onClick={() => setIsEditingDetails(true)}
              className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors inline-flex items-center gap-2 text-sm"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingDetails(false)}
                className="px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDetails}
                disabled={saving}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {!isEditingDetails ? (
          // Display mode
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              {team.logoUrl ? (
                <img src={team.logoUrl} alt={team.name} className="w-20 h-20 rounded-lg object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-slate-600 flex items-center justify-center">
                  <UsersIcon className="h-10 w-10 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-xl font-semibold text-white">{team.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    team.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {team.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 capitalize">
                    {team.teamType?.replace('_', ' ')}
                  </span>
                </div>
                {team.description && <p className="text-gray-400">{team.description}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Location</span>
                <p className="text-white">{team.location || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Website</span>
                <p className="text-white">{team.website || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500">Max Members</span>
                <p className="text-white">{team.maxMembers}</p>
              </div>
              <div>
                <span className="text-gray-500">Created</span>
                <p className="text-white">{formatDate(team.createdAt)}</p>
              </div>
              <div>
                <span className="text-gray-500">Public</span>
                <p className="text-white">{team.isPublic ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <span className="text-gray-500">Requires Approval</span>
                <p className="text-white">{team.requiresApproval ? 'Yes' : 'No'}</p>
              </div>
            </div>
            {team.bio && (
              <div>
                <span className="text-gray-500 text-sm">Bio</span>
                <p className="text-gray-300 whitespace-pre-wrap mt-1">{team.bio}</p>
              </div>
            )}
          </div>
        ) : (
          // Edit mode
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Team Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Team Type</label>
              <select
                value={editForm.teamType}
                onChange={(e) => setEditForm({ ...editForm, teamType: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              >
                {TEAM_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <input
                type="text"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                placeholder="Short description"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Bio</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                placeholder="Detailed bio/about section"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Location</label>
              <input
                type="text"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Website</label>
              <input
                type="url"
                value={editForm.website}
                onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                placeholder="https://"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Max Members</label>
              <input
                type="number"
                value={editForm.maxMembers}
                onChange={(e) => setEditForm({ ...editForm, maxMembers: parseInt(e.target.value) || 50 })}
                min={1}
                max={100}
                className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isPublic}
                  onChange={(e) => setEditForm({ ...editForm, isPublic: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-500 bg-slate-600 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-300">Public Team</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.requiresApproval}
                  onChange={(e) => setEditForm({ ...editForm, requiresApproval: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-500 bg-slate-600 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-300">Requires Approval</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Member's Role in Team */}
      <div className="bg-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          {member.first_name}'s Role in Team
        </h3>
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            isOwner ? 'bg-orange-500/20 text-orange-400' :
            memberRecord?.role === 'co_owner' ? 'bg-yellow-500/20 text-yellow-400' :
            memberRecord?.role === 'moderator' ? 'bg-blue-500/20 text-blue-400' :
            'bg-slate-500/20 text-slate-400'
          }`}>
            {isOwner ? 'Owner' : memberRecord?.role?.replace('_', ' ') || 'Member'}
          </span>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            memberRecord?.status === 'active' ? 'bg-green-500/20 text-green-400' :
            memberRecord?.status === 'pending_approval' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {memberRecord?.status?.replace('_', ' ') || 'Unknown'}
          </span>
          {memberRecord?.joinedAt && (
            <span className="text-sm text-gray-400">
              Joined {formatDate(memberRecord.joinedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Team Members Section */}
      <div className="bg-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Team Members ({activeMembers.length}/{team.maxMembers})
          </h3>
          <button
            onClick={() => setShowAddMemberModal(true)}
            className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors inline-flex items-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        </div>

        {activeMembers.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No active members</p>
        ) : (
          <div className="space-y-2">
            {activeMembers.map((teamMember) => (
              <div
                key={teamMember.id}
                className="flex items-center justify-between p-3 bg-slate-600/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {teamMember.user?.profile_picture_url ? (
                    <img
                      src={teamMember.user.profile_picture_url}
                      alt={teamMember.user.first_name || 'Member'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-500 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-white font-medium">
                      {teamMember.user?.first_name} {teamMember.user?.last_name}
                      {teamMember.user?.meca_id && (
                        <span className="text-orange-400 ml-2">#{teamMember.user.meca_id}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{teamMember.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {changingRoleFor === teamMember.userId ? (
                    <select
                      value={teamMember.role}
                      onChange={(e) => handleChangeRole(teamMember.userId, e.target.value as any)}
                      onBlur={() => setChangingRoleFor(null)}
                      autoFocus
                      className="px-2 py-1 bg-slate-600 border border-slate-500 rounded text-sm text-white focus:border-orange-500 focus:outline-none"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setChangingRoleFor(teamMember.userId)}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        ROLE_OPTIONS.find((r) => r.value === teamMember.role)?.color || 'bg-slate-500/20 text-slate-400'
                      } hover:opacity-80 transition-opacity`}
                    >
                      {teamMember.role.replace('_', ' ')}
                    </button>
                  )}
                  {teamMember.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(teamMember.userId)}
                      className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                      title="Remove member"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Requests Section */}
      {pendingRequests.length > 0 && (
        <div className="bg-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Pending Join Requests ({pendingRequests.length})
          </h3>
          <div className="space-y-2">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {request.user?.profile_picture_url ? (
                    <img
                      src={request.user.profile_picture_url}
                      alt={request.user.first_name || 'Member'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-500 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-white font-medium">
                      {request.user?.first_name} {request.user?.last_name}
                    </p>
                    {request.requestMessage && (
                      <p className="text-xs text-gray-400 italic">"{request.requestMessage}"</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproveRequest(request.userId)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectRequest(request.userId)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Invites Section */}
      {pendingInvites.length > 0 && (
        <div className="bg-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Pending Invites ({pendingInvites.length})
          </h3>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {invite.user?.profile_picture_url ? (
                    <img
                      src={invite.user.profile_picture_url}
                      alt={invite.user.first_name || 'Member'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-500 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-white font-medium">
                      {invite.user?.first_name} {invite.user?.last_name}
                    </p>
                    <p className="text-xs text-gray-400">Invite sent</p>
                  </div>
                </div>
                <button
                  onClick={() => handleCancelInvite(invite.userId)}
                  className="px-3 py-1.5 bg-slate-600 text-white rounded text-sm hover:bg-slate-500 transition-colors"
                >
                  Cancel Invite
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfer Ownership Section */}
      <div className="bg-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Transfer Ownership</h3>
        <p className="text-gray-400 text-sm mb-4">
          Transfer team ownership to another active member. The current owner will become a co-owner.
        </p>
        <button
          onClick={() => setShowTransferModal(true)}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Transfer Ownership
        </button>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Add Team Member</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Search by MECA ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mecaIdSearch}
                    onChange={(e) => setMecaIdSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLookupMember()}
                    placeholder="Enter MECA ID"
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  />
                  <button
                    onClick={handleLookupMember}
                    disabled={lookingUpMember || !mecaIdSearch.trim()}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    {lookingUpMember ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>

              {memberLookupResult && (
                <div className={`p-4 rounded-lg ${
                  memberLookupResult.found && memberLookupResult.member?.canInvite
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  {memberLookupResult.found && memberLookupResult.member ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {memberLookupResult.member.profile_picture_url ? (
                          <img
                            src={memberLookupResult.member.profile_picture_url}
                            alt="Member"
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">
                            {memberLookupResult.member.first_name} {memberLookupResult.member.last_name}
                          </p>
                          <p className="text-xs text-gray-400">MECA #{memberLookupResult.member.meca_id}</p>
                        </div>
                      </div>
                      {memberLookupResult.member.canInvite ? (
                        <button
                          onClick={() => handleAddMember(memberLookupResult.member.id)}
                          disabled={addingMember}
                          className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {addingMember ? 'Adding...' : 'Add to Team'}
                        </button>
                      ) : (
                        <span className="text-sm text-red-400">{memberLookupResult.member.reason}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-red-400">{memberLookupResult.message || 'Member not found'}</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setMecaIdSearch('');
                  setMemberLookupResult(null);
                }}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Transfer Team Ownership</h3>
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                Select a member to become the new team owner. The current owner will be demoted to co-owner.
              </p>
              <div>
                <label className="block text-sm text-gray-400 mb-1">New Owner</label>
                <select
                  value={transferTargetId}
                  onChange={(e) => setTransferTargetId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Select a member</option>
                  {activeMembers
                    .filter((m) => m.role !== 'owner')
                    .map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user?.first_name} {m.user?.last_name} ({m.role.replace('_', ' ')})
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferTargetId('');
                }}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferOwnership}
                disabled={!transferTargetId || transferring}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
              >
                {transferring ? 'Transferring...' : 'Transfer Ownership'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Team Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Team</h3>
                <p className="text-sm text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete <strong>{team.name}</strong>? This will remove all team members
              and permanently delete the team.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTeam}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Super Admin users who can override MECA IDs
// Only James Ryan and Mick Mahkool can use this feature
const SUPER_ADMIN_EMAILS = [
  'james@mecacaraudio.com',
  'mick@mecausa.com',
];

function isSuperAdmin(profile: Profile | null): boolean {
  if (!profile?.email) return false;
  return SUPER_ADMIN_EMAILS.includes(profile.email.toLowerCase());
}

function MembershipsTab({ member }: { member: Profile }) {
  const navigate = useNavigate();
  const { profile: currentUserProfile } = useAuth();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('edit_user');
  const canOverrideMecaId = canEdit && isSuperAdmin(currentUserProfile);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [_membershipTypes, setMembershipTypes] = useState<MembershipTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMembershipWizard, setShowMembershipWizard] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Team name editing state
  const [showTeamNameModal, setShowTeamNameModal] = useState(false);
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [savingTeamName, setSavingTeamName] = useState(false);
  // Full edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    paymentStatus: string;
    startDate: string;
    endDate: string;
    competitorName: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleColor: string;
    vehicleLicensePlate: string;
    hasTeamAddon: boolean;
    teamName: string;
    teamDescription: string;
    businessName: string;
    businessWebsite: string;
  }>({
    paymentStatus: 'paid',
    startDate: '',
    endDate: '',
    competitorName: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleColor: '',
    vehicleLicensePlate: '',
    hasTeamAddon: false,
    teamName: '',
    teamDescription: '',
    businessName: '',
    businessWebsite: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  // Secondary membership modal state
  const [showAddSecondaryModal, setShowAddSecondaryModal] = useState(false);
  const [selectedMasterMembership, setSelectedMasterMembership] = useState<Membership | null>(null);
  // Secondary memberships data (keyed by master membership ID)
  const [secondaryMemberships, setSecondaryMemberships] = useState<Record<string, SecondaryMembershipInfo[]>>({});
  const [showEditSecondaryModal, setShowEditSecondaryModal] = useState(false);
  const [editingSecondary, setEditingSecondary] = useState<SecondaryMembershipInfo | null>(null);

  // Super Admin MECA ID Override modal state
  const [showMecaIdOverrideModal, setShowMecaIdOverrideModal] = useState(false);
  const [overrideMembership, setOverrideMembership] = useState<Membership | null>(null);
  const [overrideNewMecaId, setOverrideNewMecaId] = useState('');
  const [overridePassword, setOverridePassword] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Auto-Renewal Management state
  const [showAutoRenewalModal, setShowAutoRenewalModal] = useState(false);
  const [autoRenewalMembership, setAutoRenewalMembership] = useState<Membership | null>(null);
  const [autoRenewalAction, setAutoRenewalAction] = useState<'cancel' | 'enable'>('cancel');
  const [autoRenewalReason, setAutoRenewalReason] = useState('');
  const [autoRenewalCancelImmediately, setAutoRenewalCancelImmediately] = useState(false);
  const [autoRenewalLoading, setAutoRenewalLoading] = useState(false);
  const [autoRenewalError, setAutoRenewalError] = useState<string | null>(null);

  useEffect(() => {
    fetchMemberships();
    fetchMembershipTypes();
  }, [member.id]);

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const data = await membershipsApi.getAllByUserId(member.id);
      setMemberships(data);

      // Fetch secondary memberships for each membership that could be a master
      const secondariesMap: Record<string, SecondaryMembershipInfo[]> = {};
      for (const m of data) {
        // Only fetch for non-secondary, paid memberships
        if ((m as any).accountType !== 'secondary' && m.paymentStatus === 'paid') {
          try {
            const secondaries = await membershipsApi.getSecondaryMemberships(m.id);
            if (secondaries.length > 0) {
              secondariesMap[m.id] = secondaries;
            }
          } catch (err) {
            // Not a master or error - that's ok
          }
        }
      }
      setSecondaryMemberships(secondariesMap);
    } catch (error) {
      console.error('Error fetching memberships:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembershipTypes = async () => {
    try {
      const data = await membershipTypeConfigsApi.getAll(true);
      setMembershipTypes(data);
    } catch (error) {
      console.error('Error fetching membership types:', error);
    }
  };

  // Handler for when a membership is created via the wizard
  const handleMembershipCreated = (result: AdminCreateMembershipResult) => {
    fetchMemberships();
    alert(result.message);
  };

  const handleDeleteMembership = async (membershipId: string) => {
    if (!confirm('Are you sure you want to delete this membership? This action cannot be undone.')) {
      return;
    }

    setDeletingId(membershipId);
    try {
      await membershipsApi.delete(membershipId);
      fetchMemberships();
      alert('Membership deleted successfully!');
    } catch (error) {
      console.error('Error deleting membership:', error);
      alert('Failed to delete membership');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditTeamName = (membership: Membership) => {
    setEditingMembership(membership);
    setNewTeamName(membership.teamName || '');
    setShowTeamNameModal(true);
  };

  const handleSaveTeamName = async () => {
    if (!editingMembership || !newTeamName.trim()) {
      alert('Please enter a team name');
      return;
    }

    setSavingTeamName(true);
    try {
      // Pass isAdmin=true to bypass the 30-day edit window
      await membershipsApi.updateTeamName(editingMembership.id, newTeamName.trim(), true);
      setShowTeamNameModal(false);
      setEditingMembership(null);
      setNewTeamName('');
      fetchMemberships();
      alert('Team name updated successfully!');
    } catch (error) {
      console.error('Error updating team name:', error);
      alert('Failed to update team name');
    } finally {
      setSavingTeamName(false);
    }
  };

  const handleOpenEditModal = (membership: Membership) => {
    setEditingMembership(membership);
    // Format dates for input[type="date"]
    const formatForInput = (dateStr: string | undefined) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    };
    setEditFormData({
      paymentStatus: membership.paymentStatus || 'paid',
      startDate: formatForInput(membership.startDate),
      endDate: formatForInput(membership.endDate),
      competitorName: membership.competitorName || '',
      vehicleMake: membership.vehicleMake || '',
      vehicleModel: membership.vehicleModel || '',
      vehicleColor: membership.vehicleColor || '',
      vehicleLicensePlate: membership.vehicleLicensePlate || '',
      hasTeamAddon: membership.hasTeamAddon || false,
      teamName: membership.teamName || '',
      teamDescription: membership.teamDescription || '',
      businessName: membership.businessName || '',
      businessWebsite: membership.businessWebsite || '',
    });
    setShowEditModal(true);
  };

  const handleAddSecondary = (membership: Membership) => {
    setSelectedMasterMembership(membership);
    setShowAddSecondaryModal(true);
  };

  const handleSecondaryCreated = () => {
    fetchMemberships();
    setShowAddSecondaryModal(false);
    setSelectedMasterMembership(null);
  };

  const handleEditSecondary = (secondary: SecondaryMembershipInfo) => {
    setEditingSecondary(secondary);
    setShowEditSecondaryModal(true);
  };

  const handleSecondaryEdited = () => {
    fetchMemberships();
    setShowEditSecondaryModal(false);
    setEditingSecondary(null);
  };

  // Super Admin MECA ID Override handlers
  const handleOpenMecaIdOverride = (membership: Membership) => {
    setOverrideMembership(membership);
    setOverrideNewMecaId(membership.mecaId?.toString() || '');
    setOverridePassword('');
    setOverrideReason('');
    setOverrideError(null);
    setShowMecaIdOverrideModal(true);
  };

  const handleMecaIdOverrideSubmit = async () => {
    if (!overrideMembership) return;

    // Validation
    if (!overrideNewMecaId.trim()) {
      setOverrideError('Please enter a MECA ID');
      return;
    }
    const newMecaId = parseInt(overrideNewMecaId.trim(), 10);
    if (isNaN(newMecaId) || newMecaId <= 0) {
      setOverrideError('MECA ID must be a positive number');
      return;
    }
    if (!overridePassword.trim()) {
      setOverrideError('Please enter the Super Admin password');
      return;
    }
    if (!overrideReason.trim()) {
      setOverrideError('Please provide a reason for this override');
      return;
    }

    setOverrideLoading(true);
    setOverrideError(null);
    try {
      const result = await membershipsApi.superAdminOverrideMecaId(
        overrideMembership.id,
        newMecaId,
        overridePassword.trim(),
        overrideReason.trim()
      );
      alert(result.message || 'MECA ID updated successfully!');
      setShowMecaIdOverrideModal(false);
      setOverrideMembership(null);
      fetchMemberships();
    } catch (error: any) {
      console.error('Error overriding MECA ID:', error);
      setOverrideError(error.response?.data?.message || 'Failed to override MECA ID');
    } finally {
      setOverrideLoading(false);
    }
  };

  // Auto-Renewal Management handlers
  const handleOpenAutoRenewalModal = (membership: Membership, action: 'cancel' | 'enable') => {
    setAutoRenewalMembership(membership);
    setAutoRenewalAction(action);
    setAutoRenewalReason('');
    setAutoRenewalCancelImmediately(false);
    setAutoRenewalError(null);
    setShowAutoRenewalModal(true);
  };

  const handleAutoRenewalSubmit = async () => {
    if (!autoRenewalMembership) return;

    if (autoRenewalAction === 'cancel' && !autoRenewalReason.trim()) {
      setAutoRenewalError('Please provide a reason for cancellation');
      return;
    }

    setAutoRenewalLoading(true);
    setAutoRenewalError(null);
    try {
      if (autoRenewalAction === 'cancel') {
        await membershipsApi.adminCancelAutoRenewal(
          autoRenewalMembership.id,
          autoRenewalReason.trim(),
          autoRenewalCancelImmediately
        );
        alert('Auto-renewal has been cancelled successfully.');
      } else {
        await membershipsApi.adminEnableAutoRenewal(autoRenewalMembership.id);
        alert('Auto-renewal has been enabled successfully.');
      }
      setShowAutoRenewalModal(false);
      setAutoRenewalMembership(null);
      fetchMemberships();
    } catch (error: any) {
      console.error('Error managing auto-renewal:', error);
      setAutoRenewalError(error.response?.data?.message || `Failed to ${autoRenewalAction} auto-renewal`);
    } finally {
      setAutoRenewalLoading(false);
    }
  };

  // Helper to get auto-renewal status display
  const getAutoRenewalStatus = (membership: Membership): { label: string; color: string } => {
    if (membership.stripeSubscriptionId) {
      return { label: 'On', color: 'text-green-400' };
    }
    if (membership.hadLegacySubscription) {
      return { label: 'Legacy', color: 'text-yellow-400' };
    }
    return { label: 'Off', color: 'text-gray-400' };
  };

  // Helper to get relationship label
  const getRelationshipLabel = (relationship?: string): string => {
    if (!relationship) return '';
    const found = RELATIONSHIP_TYPES.find((r) => r.value === relationship);
    return found ? found.label : relationship;
  };

  const handleSaveEdit = async () => {
    if (!editingMembership) return;

    setSavingEdit(true);
    try {
      const updateData: any = {
        paymentStatus: editFormData.paymentStatus,
        competitorName: editFormData.competitorName || undefined,
        vehicleMake: editFormData.vehicleMake || undefined,
        vehicleModel: editFormData.vehicleModel || undefined,
        vehicleColor: editFormData.vehicleColor || undefined,
        vehicleLicensePlate: editFormData.vehicleLicensePlate || undefined,
        hasTeamAddon: editFormData.hasTeamAddon,
        teamName: editFormData.teamName || undefined,
        teamDescription: editFormData.teamDescription || undefined,
        businessName: editFormData.businessName || undefined,
        businessWebsite: editFormData.businessWebsite || undefined,
      };

      // Only include dates if they're valid
      if (editFormData.startDate) {
        updateData.startDate = new Date(editFormData.startDate).toISOString();
      }
      if (editFormData.endDate) {
        updateData.endDate = new Date(editFormData.endDate).toISOString();
      }

      await membershipsApi.update(editingMembership.id, updateData);
      setShowEditModal(false);
      setEditingMembership(null);
      fetchMemberships();
      alert('Membership updated successfully!');
    } catch (error) {
      console.error('Error updating membership:', error);
      alert('Failed to update membership');
    } finally {
      setSavingEdit(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  const getStatusBadge = (membership: Membership) => {
    if (isExpired(membership.endDate || '')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <X className="h-3 w-3" /> Expired
        </span>
      );
    }
    if (membership.paymentStatus === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Check className="h-3 w-3" /> Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="h-3 w-3" /> {membership.paymentStatus}
      </span>
    );
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Memberships & Subscriptions</h2>
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4">Loading memberships...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Memberships & Subscriptions</h2>
        {canEdit && (
          <button
            onClick={() => setShowMembershipWizard(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Assign Membership
          </button>
        )}
      </div>

      {memberships.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-slate-700 rounded-lg">
          <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-500" />
          <p>No memberships found</p>
          {canEdit && (
            <button
              onClick={() => setShowMembershipWizard(true)}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Assign First Membership
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {memberships.map((membership) => (
            <div
              key={membership.id}
              className={`bg-slate-700 rounded-lg p-4 border-l-4 ${
                isExpired(membership.endDate || '') ? 'border-red-500' : 'border-green-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {membership.membershipTypeConfig?.name || 'Membership'}
                    </h3>
                    {getStatusBadge(membership)}
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    {/* MECA ID - prominently displayed with admin override option */}
                    {membership.mecaId && (
                      <div className="col-span-2 mb-2 flex items-center gap-2">
                        <span className="text-gray-400">MECA ID: </span>
                        <span className="text-orange-400 font-mono font-semibold text-lg">
                          #{membership.mecaId}
                        </span>
                        {canOverrideMecaId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenMecaIdOverride(membership);
                            }}
                            className="ml-2 px-2 py-1 text-xs bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded flex items-center gap-1"
                            title="Super Admin: Override MECA ID"
                          >
                            <Key size={12} />
                            Override
                          </button>
                        )}
                      </div>
                    )}
                    <div>
                      <span className="text-gray-400">Category: </span>
                      <span className="text-gray-200">
                        {membership.membershipTypeConfig?.category || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Amount Paid: </span>
                      <span className="text-gray-200">
                        ${membership.amountPaid?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    {/* Competitor Name */}
                    {membership.competitorName && (
                      <div>
                        <span className="text-gray-400">Competitor: </span>
                        <span className="text-gray-200">{membership.competitorName}</span>
                      </div>
                    )}
                    {/* Vehicle Info */}
                    {(membership.vehicleMake || membership.vehicleModel) && (
                      <div>
                        <span className="text-gray-400">Vehicle: </span>
                        <span className="text-gray-200">
                          {[membership.vehicleMake, membership.vehicleModel].filter(Boolean).join(' ')}
                          {membership.vehicleColor && ` (${membership.vehicleColor})`}
                        </span>
                      </div>
                    )}
                    {membership.vehicleLicensePlate && (
                      <div>
                        <span className="text-gray-400">License Plate: </span>
                        <span className="text-gray-200 font-mono">{membership.vehicleLicensePlate}</span>
                      </div>
                    )}
                    {/* Team Info */}
                    {membership.hasTeamAddon && (
                      <div>
                        <span className="text-gray-400">Team Add-on: </span>
                        <span className="text-green-400">Yes</span>
                      </div>
                    )}
                    {membership.teamName && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Team Name: </span>
                        <span className="text-gray-200">{membership.teamName}</span>
                        {canEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTeamName(membership);
                            }}
                            className="ml-2 text-orange-400 hover:text-orange-300 text-xs"
                          >
                            (Edit)
                          </button>
                        )}
                      </div>
                    )}
                    {/* Business Info */}
                    {membership.businessName && (
                      <div>
                        <span className="text-gray-400">Business: </span>
                        <span className="text-gray-200">{membership.businessName}</span>
                      </div>
                    )}
                    {membership.businessWebsite && (
                      <div>
                        <span className="text-gray-400">Website: </span>
                        <a href={membership.businessWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                          {membership.businessWebsite}
                        </a>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-400">Start Date: </span>
                      <span className="text-gray-200">
                        {membership.startDate ? formatDate(membership.startDate) : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">End Date: </span>
                      <span className={`${isExpired(membership.endDate || '') ? 'text-red-400' : 'text-gray-200'}`}>
                        {membership.endDate ? formatDate(membership.endDate) : 'N/A'}
                      </span>
                    </div>
                    {/* Auto-Renewal Status */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Auto-Renewal: </span>
                      <span className={getAutoRenewalStatus(membership).color}>
                        {getAutoRenewalStatus(membership).label}
                      </span>
                      {/* Admin can only CANCEL auto-renewal, not enable it */}
                      {canEdit && membership.stripeSubscriptionId && membership.paymentStatus === 'paid' && !isExpired(membership.endDate || '') && (
                        <button
                          onClick={() => handleOpenAutoRenewalModal(membership, 'cancel')}
                          className="ml-2 text-xs px-2 py-0.5 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded"
                          title="Cancel auto-renewal"
                        >
                          Cancel
                        </button>
                      )}
                      {membership.hadLegacySubscription && !membership.stripeSubscriptionId && (
                        <span className="ml-1 text-xs text-yellow-400" title="This member had recurring billing in the old PMPro system">
                          (needs re-setup)
                        </span>
                      )}
                    </div>
                    {membership.transactionId && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Transaction ID: </span>
                        <span className="text-gray-200 font-mono text-xs">
                          {membership.transactionId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2 ml-4">
                    {/* Add Secondary button - only for non-secondary memberships with paid status */}
                    {(membership as any).accountType !== 'secondary' && membership.paymentStatus === 'paid' && (
                      <button
                        onClick={() => handleAddSecondary(membership)}
                        className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors"
                        title="Add secondary member"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEditModal(membership)}
                      className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Edit membership"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMembership(membership.id)}
                      disabled={deletingId === membership.id}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete membership"
                    >
                      {deletingId === membership.id ? (
                        <div className="animate-spin h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Secondary Memberships Section */}
              {secondaryMemberships[membership.id] && secondaryMemberships[membership.id].length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-600">
                  <h4 className="text-sm font-semibold text-purple-400 flex items-center gap-2 mb-3">
                    <UsersIcon className="h-4 w-4" />
                    Secondary Members ({secondaryMemberships[membership.id].length})
                  </h4>
                  <div className="space-y-2">
                    {secondaryMemberships[membership.id].map((secondary) => (
                      <div
                        key={secondary.id}
                        className="bg-slate-600/50 rounded-lg p-3 border border-slate-500/50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium">
                                {secondary.competitorName}
                              </span>
                              {secondary.relationshipToMaster && (
                                <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                                  {getRelationshipLabel(secondary.relationshipToMaster)}
                                </span>
                              )}
                              {secondary.hasOwnLogin && (
                                <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                                  Has Login
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                              {secondary.mecaId && (
                                <div>
                                  <span className="text-gray-400">MECA ID: </span>
                                  <span className="text-orange-400 font-mono font-semibold">
                                    #{secondary.mecaId}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-400">Status: </span>
                                <span className={secondary.isActive ? 'text-green-400' : 'text-red-400'}>
                                  {secondary.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              {(secondary.vehicleMake || secondary.vehicleModel) && (
                                <div>
                                  <span className="text-gray-400">Vehicle: </span>
                                  <span className="text-gray-300">
                                    {[secondary.vehicleMake, secondary.vehicleModel].filter(Boolean).join(' ')}
                                    {secondary.vehicleColor && ` (${secondary.vehicleColor})`}
                                  </span>
                                </div>
                              )}
                              {secondary.vehicleLicensePlate && (
                                <div>
                                  <span className="text-gray-400">Plate: </span>
                                  <span className="text-gray-300 font-mono">{secondary.vehicleLicensePlate}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            {/* View Profile Link - if they have their own login */}
                            {secondary.hasOwnLogin && secondary.profileId && (
                              <button
                                onClick={() => navigate(`/admin/members/${secondary.profileId}`)}
                                className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
                                title="View secondary's profile"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {/* Edit Secondary */}
                            {canEdit && (
                              <button
                                onClick={() => handleEditSecondary(secondary)}
                                className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded transition-colors"
                                title="Edit secondary member"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Membership Wizard */}
      <AdminMembershipWizard
        userId={member.id}
        userEmail={member.email}
        userFirstName={member.first_name}
        userLastName={member.last_name}
        userPhone={member.phone}
        isOpen={showMembershipWizard}
        onClose={() => setShowMembershipWizard(false)}
        onSuccess={handleMembershipCreated}
      />

      {/* Edit Team Name Modal */}
      {showTeamNameModal && editingMembership && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-white mb-4">
              Edit Team Name
            </h2>

            <div className="space-y-4">
              <div className="bg-slate-700 rounded-lg p-3 text-sm">
                <p className="text-gray-400">Membership:</p>
                <p className="text-white font-medium">
                  {editingMembership.membershipTypeConfig?.name}
                  {editingMembership.mecaId && (
                    <span className="ml-2 text-orange-400 font-mono">
                      (MECA #{editingMembership.mecaId})
                    </span>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Enter team name"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-400">
                <p className="font-medium mb-1">Admin Override</p>
                <p>As an admin, you can edit the team name at any time. Regular users can only edit within 30 days of purchase/renewal.</p>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => {
                    setShowTeamNameModal(false);
                    setEditingMembership(null);
                    setNewTeamName('');
                  }}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                  disabled={savingTeamName}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTeamName}
                  disabled={savingTeamName || !newTeamName.trim()}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingTeamName ? 'Saving...' : 'Save Team Name'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Membership Modal */}
      {showEditModal && editingMembership && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-4">
              Edit Membership
            </h2>

            <div className="bg-slate-700 rounded-lg p-3 mb-4">
              <p className="text-gray-400 text-sm">Membership Type:</p>
              <p className="text-white font-medium">
                {editingMembership.membershipTypeConfig?.name}
                {editingMembership.mecaId && (
                  <span className="ml-2 text-orange-400 font-mono">
                    (MECA #{editingMembership.mecaId})
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-4">
              {/* Status & Dates Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Payment Status
                  </label>
                  <select
                    value={editFormData.paymentStatus}
                    onChange={(e) => setEditFormData({ ...editFormData, paymentStatus: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editFormData.startDate}
                    onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editFormData.endDate}
                    onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Business Info Section - FIRST for Retailer/Manufacturer */}
              {(editingMembership?.membershipTypeConfig?.category === 'retail' ||
                editingMembership?.membershipTypeConfig?.category === 'manufacturer') && (
                <div className="border-t border-slate-600 pt-4">
                  <h3 className="text-lg font-medium text-white mb-3">Business Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Business Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.businessName}
                        onChange={(e) => setEditFormData({ ...editFormData, businessName: e.target.value })}
                        placeholder="Business name"
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Business Website
                      </label>
                      <input
                        type="url"
                        value={editFormData.businessWebsite}
                        onChange={(e) => setEditFormData({ ...editFormData, businessWebsite: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Competitor Info Section - Only for competitor memberships */}
              {editingMembership?.membershipTypeConfig?.category !== 'retail' &&
                editingMembership?.membershipTypeConfig?.category !== 'manufacturer' && (
                <div className="border-t border-slate-600 pt-4">
                  <h3 className="text-lg font-medium text-white mb-3">Competitor Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Competitor Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.competitorName}
                        onChange={(e) => setEditFormData({ ...editFormData, competitorName: e.target.value })}
                        placeholder="Competitor name"
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Vehicle Info Section - Only for competitor memberships */}
              {editingMembership?.membershipTypeConfig?.category !== 'retail' &&
                editingMembership?.membershipTypeConfig?.category !== 'manufacturer' && (
                <div className="border-t border-slate-600 pt-4">
                  <h3 className="text-lg font-medium text-white mb-3">Vehicle Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Make
                      </label>
                      <input
                        type="text"
                        value={editFormData.vehicleMake}
                        onChange={(e) => setEditFormData({ ...editFormData, vehicleMake: e.target.value })}
                        placeholder="e.g., Toyota"
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Model
                      </label>
                      <input
                        type="text"
                        value={editFormData.vehicleModel}
                        onChange={(e) => setEditFormData({ ...editFormData, vehicleModel: e.target.value })}
                        placeholder="e.g., Camry"
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Color
                      </label>
                      <input
                        type="text"
                        value={editFormData.vehicleColor}
                        onChange={(e) => setEditFormData({ ...editFormData, vehicleColor: e.target.value })}
                        placeholder="e.g., Black"
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        License Plate
                      </label>
                      <input
                        type="text"
                        value={editFormData.vehicleLicensePlate}
                        onChange={(e) => setEditFormData({ ...editFormData, vehicleLicensePlate: e.target.value })}
                        placeholder="License plate"
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Team Info Section - Only for competitor memberships */}
              {editingMembership?.membershipTypeConfig?.category !== 'retail' &&
                editingMembership?.membershipTypeConfig?.category !== 'manufacturer' && (
                <div className="border-t border-slate-600 pt-4">
                  <h3 className="text-lg font-medium text-white mb-3">Team Info</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="hasTeamAddon"
                        checked={editFormData.hasTeamAddon}
                        onChange={(e) => setEditFormData({ ...editFormData, hasTeamAddon: e.target.checked })}
                        className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500"
                      />
                      <label htmlFor="hasTeamAddon" className="text-gray-300">
                        Has Team Add-on
                      </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Team Name
                        </label>
                        <input
                          type="text"
                          value={editFormData.teamName}
                          onChange={(e) => setEditFormData({ ...editFormData, teamName: e.target.value })}
                          placeholder="Team name"
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Team Description
                        </label>
                        <input
                          type="text"
                          value={editFormData.teamDescription}
                          onChange={(e) => setEditFormData({ ...editFormData, teamDescription: e.target.value })}
                          placeholder="Team description"
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Business Info Section - At bottom for competitor memberships */}
              {editingMembership?.membershipTypeConfig?.category !== 'retail' &&
                editingMembership?.membershipTypeConfig?.category !== 'manufacturer' && (
                <div className="border-t border-slate-600 pt-4">
                  <h3 className="text-lg font-medium text-white mb-3">Business Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Business Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.businessName}
                        onChange={(e) => setEditFormData({ ...editFormData, businessName: e.target.value })}
                        placeholder="Business name"
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Business Website
                      </label>
                      <input
                        type="url"
                        value={editFormData.businessWebsite}
                        onChange={(e) => setEditFormData({ ...editFormData, businessWebsite: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-600">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingMembership(null);
                  }}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Secondary Modal */}
      {selectedMasterMembership && (
        <AddSecondaryModal
          isOpen={showAddSecondaryModal}
          onClose={() => {
            setShowAddSecondaryModal(false);
            setSelectedMasterMembership(null);
          }}
          masterMembershipId={selectedMasterMembership.id}
          onSuccess={handleSecondaryCreated}
        />
      )}

      {/* Edit Secondary Modal */}
      {editingSecondary && (
        <EditSecondaryModal
          isOpen={showEditSecondaryModal}
          onClose={() => {
            setShowEditSecondaryModal(false);
            setEditingSecondary(null);
          }}
          secondary={editingSecondary}
          requestingUserId={member.id}
          onSuccess={handleSecondaryEdited}
        />
      )}

      {/* Super Admin MECA ID Override Modal */}
      {showMecaIdOverrideModal && overrideMembership && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-purple-500/30">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="text-purple-400" size={24} />
              <h3 className="text-lg font-bold text-white">Super Admin: Override MECA ID</h3>
            </div>

            <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3 mb-4">
              <p className="text-yellow-300 text-sm">
                <AlertTriangle className="inline mr-1" size={14} />
                This action bypasses normal MECA ID rules. An audit record will be created.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Current MECA ID</label>
                <div className="px-3 py-2 bg-slate-700 rounded text-orange-400 font-mono">
                  #{overrideMembership.mecaId || 'Not assigned'}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">New MECA ID *</label>
                <input
                  type="number"
                  value={overrideNewMecaId}
                  onChange={(e) => setOverrideNewMecaId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white font-mono focus:border-purple-500 focus:outline-none"
                  placeholder="Enter new MECA ID"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Super Admin Password *</label>
                <input
                  type="password"
                  value={overridePassword}
                  onChange={(e) => setOverridePassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Enter password"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Reason for Override *</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-purple-500 focus:outline-none resize-none"
                  rows={3}
                  placeholder="Explain why this override is necessary..."
                />
              </div>

              {overrideError && (
                <div className="p-3 bg-red-900/30 border border-red-600 rounded text-red-300 text-sm">
                  {overrideError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowMecaIdOverrideModal(false);
                    setOverrideMembership(null);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded"
                  disabled={overrideLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleMecaIdOverrideSubmit}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded flex items-center justify-center gap-2"
                  disabled={overrideLoading}
                >
                  {overrideLoading ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Key size={16} />
                      Override MECA ID
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Renewal Cancellation Modal (Admin can only cancel, not enable) */}
      {showAutoRenewalModal && autoRenewalMembership && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-600">
            <h3 className="text-lg font-bold text-white mb-4">Cancel Auto-Renewal</h3>

            <div className="space-y-4">
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-gray-400">Membership Type:</p>
                <p className="text-white font-medium">{autoRenewalMembership.membershipTypeConfig?.name || 'Unknown'}</p>
                {autoRenewalMembership.mecaId && (
                  <>
                    <p className="text-sm text-gray-400 mt-2">MECA ID:</p>
                    <p className="text-orange-400 font-mono">#{autoRenewalMembership.mecaId}</p>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Cancellation Type</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="radio"
                      name="cancelType"
                      checked={!autoRenewalCancelImmediately}
                      onChange={() => setAutoRenewalCancelImmediately(false)}
                      className="text-orange-500"
                    />
                    <span>Cancel at end of current period</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6">
                    Member keeps access until: {autoRenewalMembership.endDate ? formatDate(autoRenewalMembership.endDate) : 'N/A'}
                  </p>
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="radio"
                      name="cancelType"
                      checked={autoRenewalCancelImmediately}
                      onChange={() => setAutoRenewalCancelImmediately(true)}
                      className="text-orange-500"
                    />
                    <span>Cancel immediately</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6">
                    Subscription stops now, no more charges
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Reason for Cancellation <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={autoRenewalReason}
                  onChange={(e) => setAutoRenewalReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-orange-500 focus:outline-none resize-none"
                  rows={3}
                  placeholder="Explain why auto-renewal is being cancelled..."
                />
              </div>

              {autoRenewalError && (
                <div className="p-3 bg-red-900/30 border border-red-600 rounded text-red-300 text-sm">
                  {autoRenewalError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowAutoRenewalModal(false);
                    setAutoRenewalMembership(null);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded"
                  disabled={autoRenewalLoading}
                >
                  Close
                </button>
                <button
                  onClick={handleAutoRenewalSubmit}
                  className="flex-1 px-4 py-2 text-white rounded flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500"
                  disabled={autoRenewalLoading}
                >
                  {autoRenewalLoading ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} />
                      Processing...
                    </>
                  ) : (
                    'Cancel Auto-Renewal'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersInvoicesTab({ member }: { member: Profile }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'invoices'>('orders');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [ordersRes, invoicesRes] = await Promise.all([
          fetch(`/api/orders/user/${member.id}`).then(r => r.json()),
          fetch(`/api/invoices/user/${member.id}`).then(r => r.json()),
        ]);
        setOrders(ordersRes.data || []);
        setInvoices(invoicesRes.data || []);
      } catch (error) {
        console.error('Error fetching orders/invoices:', error);
      } finally {
        setLoading(false);
      }
    };

    if (member.id) {
      fetchData();
    }
  }, [member.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-900/50 text-yellow-400',
      processing: 'bg-blue-900/50 text-blue-400',
      completed: 'bg-green-900/50 text-green-400',
      cancelled: 'bg-gray-800/50 text-gray-400',
      refunded: 'bg-orange-900/50 text-orange-400',
      draft: 'bg-gray-800/50 text-gray-400',
      sent: 'bg-blue-900/50 text-blue-400',
      paid: 'bg-green-900/50 text-green-400',
      overdue: 'bg-red-900/50 text-red-400',
    };
    return colors[status] || 'bg-gray-800/50 text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Orders & Invoices</h2>

      {/* Sub-tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeSubTab === 'orders'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeSubTab === 'invoices'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Invoices ({invoices.length})
        </button>
      </div>

      {/* Orders List */}
      {activeSubTab === 'orders' && (
        <>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-500" />
              <p>No orders found</p>
            </div>
          ) : (
            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {order.orderNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {order.orderType?.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white text-right">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <a
                          href={`/admin/billing/orders/${order.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-medium rounded-lg transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          View Details
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Invoices List */}
      {activeSubTab === 'invoices' && (
        <>
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-500" />
              <p>No invoices found</p>
            </div>
          ) : (
            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white text-right">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          View PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventRegistrationsTab({ member: _member }: { member: Profile }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Event Registrations</h2>
      <div className="text-center py-12 text-gray-400">
        <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-500" />
        <p>No event registrations</p>
      </div>
    </div>
  );
}

function CompetitionResultsTab({ member }: { member: Profile }) {
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [eventMap, setEventMap] = useState<Record<string, string>>({});
  const [eventsData, setEventsData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    seasonId: '',
    country: '',
    state: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!member.meca_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch results and seasons in parallel
        const [data, seasonsData] = await Promise.all([
          competitionResultsApi.getByMecaId(member.meca_id),
          seasonsApi.getAll(),
        ]);

        setResults(data);
        setSeasons(seasonsData);

        // Default to current season
        const currentSeason = seasonsData.find((s: Season) => s.is_current);
        if (currentSeason) {
          setFilters(prev => ({ ...prev, seasonId: currentSeason.id }));
        }

        // Fetch events to get event names and location data for lookup
        const eventIds = [...new Set(data.map(r => r.eventId || r.event_id).filter(Boolean))];
        if (eventIds.length > 0) {
          try {
            const eventsResponse = await axios.get('/api/events');
            if (eventsResponse.data) {
              const events = eventsResponse.data;
              const nameMap: Record<string, string> = {};
              const dataMap: Record<string, any> = {};
              events.forEach((event: any) => {
                nameMap[event.id] = event.title || event.name;
                dataMap[event.id] = event;
              });
              setEventMap(nameMap);
              setEventsData(dataMap);
            }
          } catch (eventErr) {
            console.error('Error fetching events for names:', eventErr);
          }
        }
      } catch (err) {
        console.error('Error fetching competition results:', err);
        setError('Failed to load competition results');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [member.meca_id]);

  // Get unique countries and states from events
  const uniqueCountries = [...new Set(
    results
      .map(r => {
        const eventId = r.eventId || r.event_id;
        const event = r.event || eventsData[eventId || ''];
        return event?.venue_country || event?.venueCountry;
      })
      .filter(Boolean)
  )].sort();

  const uniqueStates = [...new Set(
    results
      .filter(r => {
        if (!filters.country) return true;
        const eventId = r.eventId || r.event_id;
        const event = r.event || eventsData[eventId || ''];
        const country = event?.venue_country || event?.venueCountry;
        return country === filters.country;
      })
      .map(r => {
        const eventId = r.eventId || r.event_id;
        const event = r.event || eventsData[eventId || ''];
        return event?.venue_state || event?.venueState;
      })
      .filter(Boolean)
  )].sort();

  // Filter results
  const filteredResults = results.filter(result => {
    const eventId = result.eventId || result.event_id;
    const event = result.event || eventsData[eventId || ''];
    const eventName = event?.name || event?.title || eventMap[eventId || ''] || '';

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesEvent = eventName.toLowerCase().includes(searchLower);
      const matchesClass = (result.competitionClass || result.competition_class || '').toLowerCase().includes(searchLower);
      if (!matchesEvent && !matchesClass) return false;
    }

    // Season filter
    if (filters.seasonId) {
      const resultSeasonId = result.seasonId || result.season_id || event?.season_id || event?.seasonId;
      if (resultSeasonId !== filters.seasonId) return false;
    }

    // Country filter
    if (filters.country) {
      const eventCountry = event?.venue_country || event?.venueCountry;
      if (eventCountry !== filters.country) return false;
    }

    // State filter
    if (filters.state) {
      const eventState = event?.venue_state || event?.venueState;
      if (eventState !== filters.state) return false;
    }

    return true;
  });

  const hasActiveFilters = filters.search || filters.seasonId || filters.country || filters.state;

  const clearFilters = () => {
    setFilters({ search: '', seasonId: '', country: '', state: '' });
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Competition Results</h2>
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Competition Results</h2>
        <div className="text-center py-12 text-red-400">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!member.meca_id) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Competition Results</h2>
        <div className="text-center py-12 text-gray-400">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-500" />
          <p>No MECA ID assigned - cannot look up competition results</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Competition Results</h2>
        <div className="text-center py-12 text-gray-400">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-500" />
          <p>No competition results found for MECA ID: {member.meca_id}</p>
        </div>
      </div>
    );
  }

  // Calculate totals (from all results, not filtered)
  const totalPoints = results.reduce((sum, r) => sum + (r.pointsEarned || r.points_earned || 0), 0);
  const totalEvents = new Set(results.map(r => r.eventId || r.event_id)).size;
  const firstPlaceCount = results.filter(r => r.placement === 1).length;

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Competition Results</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Results</p>
          <p className="text-2xl font-bold text-white">{results.length}</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Events Competed</p>
          <p className="text-2xl font-bold text-white">{totalEvents}</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Points</p>
          <p className="text-2xl font-bold text-orange-500">{totalPoints}</p>
        </div>
        <div className="bg-slate-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">1st Place Finishes</p>
          <p className="text-2xl font-bold text-yellow-500">{firstPlaceCount}</p>
        </div>
      </div>

      {/* Event Filters Section */}
      <div className="bg-slate-800 rounded-xl p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            Event
          </h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Season Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={filters.seasonId}
              onChange={(e) => setFilters(prev => ({ ...prev, seasonId: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="">All Seasons</option>
              {seasons.map(season => (
                <option key={season.id} value={season.id}>
                  {season.name} {season.is_current && '(Current)'}
                </option>
              ))}
            </select>
          </div>

          {/* Country Filter */}
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={filters.country}
              onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value, state: '' }))}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="">All Countries</option>
              {uniqueCountries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          {/* State Filter */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={filters.state}
              onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none cursor-pointer"
              disabled={uniqueStates.length === 0}
            >
              <option value="">All States</option>
              {uniqueStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      {hasActiveFilters && (
        <div className="text-sm text-gray-400 mb-4">
          Showing {filteredResults.length} of {results.length} result{results.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Results Table */}
      <div className="bg-slate-700 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-600">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Event</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Class</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Format</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Score</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Place</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">Points</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-600">
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No results match the current filters
                </td>
              </tr>
            ) : (
              filteredResults.map((result) => (
                <tr key={result.id} className="hover:bg-slate-600/50">
                  <td className="px-4 py-3 text-white">
                    {result.event?.name || result.event?.title || eventMap[result.eventId || result.event_id || ''] || 'Unknown Event'}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {result.competitionClass || result.competition_class}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {result.format || '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-white font-medium">
                    {result.score?.toFixed(2) || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                      result.placement === 1 ? 'bg-yellow-500 text-black' :
                      result.placement === 2 ? 'bg-gray-300 text-black' :
                      result.placement === 3 ? 'bg-amber-600 text-white' :
                      'bg-slate-500 text-white'
                    }`}>
                      {result.placement}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-orange-400 font-medium">
                    {result.pointsEarned || result.points_earned || 0}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {result.createdAt || result.created_at
                      ? new Date(result.createdAt || result.created_at!).toLocaleDateString()
                      : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CommunicationsTab({ member: _member }: { member: Profile }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Communications</h2>
      <div className="text-center py-12 text-gray-400">
        <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-500" />
        <p>No communication history</p>
      </div>
    </div>
  );
}

function PermissionsTab({ member, onUpdate }: { member: Profile; onUpdate: (updated: Profile) => void }) {
  const [isTrainer, setIsTrainer] = useState(member.is_trainer ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [judgeEdStatus, setJudgeEdStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Judge permission state
  const [judgeEnabled, setJudgeEnabled] = useState(false);
  const [judgeExpiration, setJudgeExpiration] = useState<string>('');
  const [savingJudge, setSavingJudge] = useState(false);

  // ED permission state
  const [edEnabled, setEdEnabled] = useState(false);
  const [edExpiration, setEdExpiration] = useState<string>('');
  const [savingEd, setSavingEd] = useState(false);

  // Fetch Judge/ED status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const status = await profilesApi.getJudgeEdStatus(member.id, session.access_token);
          setJudgeEdStatus(status);
          setJudgeEnabled(status.judge.permissionEnabled);
          setEdEnabled(status.eventDirector.permissionEnabled);
          setJudgeExpiration(status.judge.expirationDate || '');
          setEdExpiration(status.eventDirector.expirationDate || '');
        }
      } catch (err) {
        console.error('Error fetching Judge/ED status:', err);
      } finally {
        setLoadingStatus(false);
      }
    };
    fetchStatus();
  }, [member.id]);

  const handleTrainerToggle = async (checked: boolean) => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await profilesApi.update(member.id, { is_trainer: checked });
      setIsTrainer(checked);
      onUpdate(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update permissions');
      setIsTrainer(!checked);
    } finally {
      setSaving(false);
    }
  };

  const handleJudgePermissionToggle = async (checked: boolean) => {
    setSavingJudge(true);
    setError(null);
    setSuccess(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      await profilesApi.updateJudgePermission(
        member.id,
        {
          enabled: checked,
          expirationDate: judgeExpiration || null,
        },
        session.access_token
      );
      setJudgeEnabled(checked);

      // Refresh status
      const status = await profilesApi.getJudgeEdStatus(member.id, session.access_token);
      setJudgeEdStatus(status);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update judge permission');
      setJudgeEnabled(!checked);
    } finally {
      setSavingJudge(false);
    }
  };

  const handleEdPermissionToggle = async (checked: boolean) => {
    setSavingEd(true);
    setError(null);
    setSuccess(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      await profilesApi.updateEventDirectorPermission(
        member.id,
        {
          enabled: checked,
          expirationDate: edExpiration || null,
        },
        session.access_token
      );
      setEdEnabled(checked);

      // Refresh status
      const status = await profilesApi.getJudgeEdStatus(member.id, session.access_token);
      setJudgeEdStatus(status);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update event director permission');
      setEdEnabled(!checked);
    } finally {
      setSavingEd(false);
    }
  };

  const handleUpdateJudgeExpiration = async () => {
    setSavingJudge(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      await profilesApi.updateJudgePermission(
        member.id,
        {
          enabled: judgeEnabled,
          expirationDate: judgeExpiration || null,
        },
        session.access_token
      );

      const status = await profilesApi.getJudgeEdStatus(member.id, session.access_token);
      setJudgeEdStatus(status);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update judge expiration');
    } finally {
      setSavingJudge(false);
    }
  };

  const handleUpdateEdExpiration = async () => {
    setSavingEd(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      await profilesApi.updateEventDirectorPermission(
        member.id,
        {
          enabled: edEnabled,
          expirationDate: edExpiration || null,
        },
        session.access_token
      );

      const status = await profilesApi.getJudgeEdStatus(member.id, session.access_token);
      setJudgeEdStatus(status);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update event director expiration');
    } finally {
      setSavingEd(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'text-green-400';
      case 'Pending': return 'text-yellow-400';
      case 'Rejected': return 'text-red-400';
      case 'Expired': return 'text-orange-400';
      case 'Disabled': return 'text-slate-400';
      default: return 'text-slate-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <Check className="h-4 w-4 text-green-400" />;
      case 'Pending': return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'Rejected': return <X className="h-4 w-4 text-red-400" />;
      case 'Expired': return <AlertTriangle className="h-4 w-4 text-orange-400" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Permissions</h2>

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-900/50 border border-green-500 rounded-lg text-green-200">
          Permissions updated successfully
        </div>
      )}

      {/* Training Permissions */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">MECA Training</h3>

        <label className="flex items-center justify-between p-4 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
          <div>
            <p className="text-white font-medium">Is Trainer</p>
            <p className="text-slate-400 text-sm mt-1">
              Allow this user to be selected as a trainer for MECA training records
            </p>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={isTrainer}
              onChange={(e) => handleTrainerToggle(e.target.checked)}
              disabled={saving}
              className="sr-only"
            />
            <div className={`w-14 h-8 rounded-full transition-colors ${
              isTrainer ? 'bg-orange-500' : 'bg-slate-500'
            } ${saving ? 'opacity-50' : ''}`}>
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                isTrainer ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </div>
          </div>
        </label>
      </div>

      {/* Judge Permissions */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Judge</h3>

        <div
          onClick={() => !savingJudge && !loadingStatus && handleJudgePermissionToggle(!judgeEnabled)}
          className={`flex items-center justify-between p-4 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors ${
            savingJudge || loadingStatus ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <div>
            <p className="text-white font-medium">Can Apply as Judge</p>
            <p className="text-slate-400 text-sm mt-1">
              Allow this user to apply as a MECA Judge and access judging features
            </p>
          </div>
          <div className="relative flex-shrink-0 ml-4">
            <input
              type="checkbox"
              checked={judgeEnabled}
              onChange={(e) => handleJudgePermissionToggle(e.target.checked)}
              disabled={savingJudge || loadingStatus}
              className="sr-only"
            />
            <div className={`w-14 h-8 rounded-full transition-colors ${
              judgeEnabled ? 'bg-orange-500' : 'bg-slate-500'
            }`}>
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                judgeEnabled ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </div>
          </div>
        </div>

        {loadingStatus ? (
          <div className="text-slate-400 mt-4">Loading status...</div>
        ) : judgeEdStatus && (
          <div className="space-y-4 mt-4 pt-4 border-t border-slate-700">
            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Status:</span>
              <span className={`font-medium flex items-center gap-1 ${getStatusColor(judgeEdStatus.judge.status)}`}>
                {getStatusIcon(judgeEdStatus.judge.status)}
                {judgeEdStatus.judge.status}
              </span>
              {judgeEdStatus.judge.judgeRecord && (
                <span className="text-slate-400">
                  (Level: {judgeEdStatus.judge.judgeRecord.level.replace('_', ' ')})
                </span>
              )}
            </div>

            {/* Granted Info */}
            {judgeEdStatus.judge.grantedAt && (
              <div className="text-sm text-slate-400">
                Granted: {new Date(judgeEdStatus.judge.grantedAt).toLocaleDateString()}
                {judgeEdStatus.judge.grantedBy && (
                  <span> by {judgeEdStatus.judge.grantedBy.name}</span>
                )}
              </div>
            )}

            {/* Expiration Date */}
            {judgeEnabled && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-400">Expires:</label>
                <input
                  type="date"
                  value={judgeExpiration ? judgeExpiration.split('T')[0] : ''}
                  onChange={(e) => setJudgeExpiration(e.target.value)}
                  className="bg-slate-700 text-white px-3 py-1.5 rounded border border-slate-600 focus:border-orange-500 focus:outline-none text-sm"
                />
                <button
                  onClick={handleUpdateJudgeExpiration}
                  disabled={savingJudge}
                  className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded disabled:opacity-50"
                >
                  {savingJudge ? 'Saving...' : 'Update'}
                </button>
                {judgeExpiration && (
                  <button
                    onClick={() => {
                      setJudgeExpiration('');
                      handleUpdateJudgeExpiration();
                    }}
                    className="text-slate-400 hover:text-white text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Links - only show if record or application exists */}
            {judgeEdStatus.judge.judgeRecord && (
              <div className="flex gap-3 pt-2">
                <a
                  href={`/admin/judges/${judgeEdStatus.judge.judgeRecord.id}`}
                  className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1"
                >
                  <User className="h-4 w-4" />
                  Manage Judge Profile
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Event Director Permissions */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Event Director</h3>

        <div
          onClick={() => !savingEd && !loadingStatus && handleEdPermissionToggle(!edEnabled)}
          className={`flex items-center justify-between p-4 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors ${
            savingEd || loadingStatus ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <div>
            <p className="text-white font-medium">Can Apply as Event Director</p>
            <p className="text-slate-400 text-sm mt-1">
              Allow this user to apply as a MECA Event Director and host events
            </p>
          </div>
          <div className="relative flex-shrink-0 ml-4">
            <input
              type="checkbox"
              checked={edEnabled}
              onChange={(e) => handleEdPermissionToggle(e.target.checked)}
              disabled={savingEd || loadingStatus}
              className="sr-only"
            />
            <div className={`w-14 h-8 rounded-full transition-colors ${
              edEnabled ? 'bg-orange-500' : 'bg-slate-500'
            }`}>
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                edEnabled ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </div>
          </div>
        </div>

        {loadingStatus ? (
          <div className="text-slate-400 mt-4">Loading status...</div>
        ) : judgeEdStatus && (
          <div className="space-y-4 mt-4 pt-4 border-t border-slate-700">
            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Status:</span>
              <span className={`font-medium flex items-center gap-1 ${getStatusColor(judgeEdStatus.eventDirector.status)}`}>
                {getStatusIcon(judgeEdStatus.eventDirector.status)}
                {judgeEdStatus.eventDirector.status}
              </span>
            </div>

            {/* Granted Info */}
            {judgeEdStatus.eventDirector.grantedAt && (
              <div className="text-sm text-slate-400">
                Granted: {new Date(judgeEdStatus.eventDirector.grantedAt).toLocaleDateString()}
                {judgeEdStatus.eventDirector.grantedBy && (
                  <span> by {judgeEdStatus.eventDirector.grantedBy.name}</span>
                )}
              </div>
            )}

            {/* Expiration Date */}
            {edEnabled && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-400">Expires:</label>
                <input
                  type="date"
                  value={edExpiration ? edExpiration.split('T')[0] : ''}
                  onChange={(e) => setEdExpiration(e.target.value)}
                  className="bg-slate-700 text-white px-3 py-1.5 rounded border border-slate-600 focus:border-orange-500 focus:outline-none text-sm"
                />
                <button
                  onClick={handleUpdateEdExpiration}
                  disabled={savingEd}
                  className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded disabled:opacity-50"
                >
                  {savingEd ? 'Saving...' : 'Update'}
                </button>
                {edExpiration && (
                  <button
                    onClick={() => {
                      setEdExpiration('');
                      handleUpdateEdExpiration();
                    }}
                    className="text-slate-400 hover:text-white text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Links - only show if ED record exists */}
            {judgeEdStatus.eventDirector.edRecord && (
              <div className="flex gap-3 pt-2">
                <a
                  href={`/admin/event-directors/${judgeEdStatus.eventDirector.edRecord.id}`}
                  className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1"
                >
                  <User className="h-4 w-4" />
                  Manage ED Profile
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Judge/ED History Summary */}
      {judgeEdStatus && (judgeEdStatus.eventsJudged.length > 0 || judgeEdStatus.eventsDirected.length > 0) && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Event History</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Events Judged */}
            {judgeEdStatus.eventsJudged.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-2">
                  Events Judged ({judgeEdStatus.eventsJudged.length})
                </h4>
                <div className="space-y-2">
                  {judgeEdStatus.eventsJudged.slice(0, 5).map((event: any) => (
                    <a
                      key={event.id}
                      href={`/admin/events/${event.id}`}
                      className="block p-2 bg-slate-700 rounded hover:bg-slate-600 transition-colors"
                    >
                      <p className="text-white text-sm">{event.name}</p>
                      <p className="text-slate-400 text-xs">
                        {new Date(event.date).toLocaleDateString()}
                      </p>
                    </a>
                  ))}
                  {judgeEdStatus.eventsJudged.length > 5 && (
                    <p className="text-slate-400 text-sm">
                      +{judgeEdStatus.eventsJudged.length - 5} more events
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Events Directed */}
            {judgeEdStatus.eventsDirected.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-400 mb-2">
                  Events Directed ({judgeEdStatus.eventsDirected.length})
                </h4>
                <div className="space-y-2">
                  {judgeEdStatus.eventsDirected.slice(0, 5).map((event: any) => (
                    <a
                      key={event.id}
                      href={`/admin/events/${event.id}`}
                      className="block p-2 bg-slate-700 rounded hover:bg-slate-600 transition-colors"
                    >
                      <p className="text-white text-sm">{event.name}</p>
                      <p className="text-slate-400 text-xs">
                        {new Date(event.date).toLocaleDateString()}
                      </p>
                    </a>
                  ))}
                  {judgeEdStatus.eventsDirected.length > 5 && (
                    <p className="text-slate-400 text-sm">
                      +{judgeEdStatus.eventsDirected.length - 5} more events
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
