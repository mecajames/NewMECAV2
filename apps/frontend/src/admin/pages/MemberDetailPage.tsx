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
  Settings,
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
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { usePermissions } from '@/auth';
import { profilesApi, ActivityItem, UpcomingEvent } from '@/profiles';
import { competitionResultsApi, CompetitionResult } from '@/competition-results';
import { membershipsApi, Membership, AdminCreateMembershipResult, AddSecondaryModal } from '@/memberships';
import { membershipTypeConfigsApi, MembershipTypeConfig } from '@/membership-type-configs';
import AdminMembershipWizard from '../components/AdminMembershipWizard';
import { UserPlus } from 'lucide-react';
import { teamsApi, Team } from '@/teams';
import { countries, getStatesForCountry, getStateLabel, getPostalCodeLabel } from '../../utils/countries';
import { generatePassword, calculatePasswordStrength, MIN_PASSWORD_STRENGTH } from '../../utils/passwordUtils';
import { PasswordStrengthIndicator } from '../../shared/components/PasswordStrengthIndicator';

type TabType =
  | 'overview'
  | 'personal'
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', memberId)
        .single();

      if (error) throw error;

      // Add computed full_name
      if (data) {
        data.full_name = `${data.first_name || ''} ${data.last_name || ''}`.trim();
      }

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
      const { data: membershipsData } = await supabase
        .from('memberships')
        .select(`
          payment_status,
          end_date,
          account_type,
          has_team_addon,
          membership_type_configs (category)
        `)
        .eq('user_id', memberId)
        .in('payment_status', ['paid', 'pending'])
        .order('created_at', { ascending: false });

      if (!membershipsData || membershipsData.length === 0) {
        setDerivedMembershipStatus('none');
        setDerivedMembershipType(null);
        return;
      }

      // Find best membership status and type
      // Priority: paid non-secondary > pending non-secondary > paid secondary > pending secondary
      let bestStatus = 'none';
      let bestPriority = 999;
      let bestMembershipType: string | null = null;
      let bestHasTeamAddon = false;

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
      } else {
        setDerivedMembershipType(null);
      }
    } catch (error) {
      console.error('Error fetching membership status for header:', error);
      setDerivedMembershipStatus('none');
      setDerivedMembershipType(null);
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
      await profilesApi.resetPassword(memberId!, {
        newPassword: passwordToUse,
        forcePasswordChange: resetForceChange,
        sendEmail: resetSendEmail && emailServiceConfigured,
      });

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
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: memberId,
          from_user_id: user?.id,
          title: messageTitle,
          message: messageBody,
          type: 'message',
          link: 'dashboard', // Could link to messages page when implemented
        });

      if (error) throw error;

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
                  onClick={() => {
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
          {activeTab === 'media' && <MediaGalleryTab member={member} />}
          {activeTab === 'teams' && <TeamsTab member={member} />}
          {activeTab === 'memberships' && <MembershipsTab member={member} />}
          {activeTab === 'orders' && <OrdersInvoicesTab member={member} />}
          {activeTab === 'events' && <EventRegistrationsTab member={member} />}
          {activeTab === 'results' && <CompetitionResultsTab member={member} />}
          {activeTab === 'communications' && <CommunicationsTab member={member} />}
          {activeTab === 'permissions' && <PermissionsTab member={member} />}
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
function OverviewTab({ member, derivedMembershipStatus }: { member: Profile; derivedMembershipStatus: string }) {
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
            {new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
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

function PersonalInfoTab({ member, onUpdate }: { member: Profile; onUpdate: () => void }) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('edit_user');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: member.first_name,
    last_name: member.last_name,
    phone: member.phone || '',
    meca_id: member.meca_id || '',
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
      await profilesApi.update(member.id, formData);

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating member:', error);
      alert('Failed to update member information');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: member.first_name,
      last_name: member.last_name,
      phone: member.phone || '',
      meca_id: member.meca_id || '',
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
            {isEditing ? (
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
    // Fetch hidden images from a table that tracks moderation status
    try {
      const { data } = await supabase
        .from('moderated_images')
        .select('image_url')
        .eq('user_id', member.id)
        .eq('is_hidden', true);

      if (data) {
        setHiddenImages(new Set(data.map(d => d.image_url)));
      }
    } catch (error) {
      // Table might not exist yet, that's okay
      console.log('Moderated images table not available');
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
      const newHiddenState = !image.isHidden;

      // Upsert the moderation record
      const { error } = await supabase
        .from('moderated_images')
        .upsert({
          user_id: member.id,
          image_url: image.url,
          image_type: image.type,
          is_hidden: newHiddenState,
          moderated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,image_url' });

      if (error) throw error;

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

      // Send notification to user if hiding
      if (newHiddenState) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('notifications').insert({
          user_id: member.id,
          from_user_id: user?.id,
          title: 'Image Hidden from Public View',
          message: `One of your ${image.type === 'profile' ? 'profile' : 'team gallery'} images has been hidden from public view by an administrator. Please review your images and ensure they comply with MECA guidelines.`,
          type: 'alert',
          link: image.type === 'profile' ? '/public-profile' : `/teams/${image.teamId}`,
        });
      }
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

      // Send notification to user
      const { data: { user } } = await supabase.auth.getUser();

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

      await supabase.from('notifications').insert({
        user_id: member.id,
        from_user_id: user?.id,
        title: notificationTitle,
        message: notificationMessage,
        type: 'alert',
        link: selectedImage.type === 'profile' ? '/public-profile' : `/teams/${selectedImage.teamId}`,
      });

      // Log the moderation action (table might not exist)
      try {
        await supabase.from('moderation_log').insert({
          user_id: member.id,
          moderator_id: user?.id,
          action: 'image_deleted',
          reason: deleteReason,
          details: {
            image_url: selectedImage.url,
            image_type: selectedImage.type,
            custom_message: customMessage,
          },
        });
      } catch {
        // Log table might not exist
      }

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

function TeamsTab({ member }: { member: Profile }) {
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
  }, [member.id]);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      setError(null);
      const teamData = await teamsApi.getTeamByUserId(member.id);
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

function MembershipsTab({ member }: { member: Profile }) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('edit_user');
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

  useEffect(() => {
    fetchMemberships();
    fetchMembershipTypes();
  }, [member.id]);

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const data = await membershipsApi.getAllByUserId(member.id);
      setMemberships(data);
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
                    {/* MECA ID - prominently displayed */}
                    {membership.mecaId && (
                      <div className="col-span-2 mb-2">
                        <span className="text-gray-400">MECA ID: </span>
                        <span className="text-orange-400 font-mono font-semibold text-lg">
                          #{membership.mecaId}
                        </span>
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

              {/* Competitor Info Section */}
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

              {/* Vehicle Info Section */}
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

              {/* Team Info Section */}
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

              {/* Business Info Section */}
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!member.meca_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await competitionResultsApi.getByMecaId(member.meca_id);
        setResults(data);

        // Fetch events to get event names for lookup
        // Get unique event IDs from results
        const eventIds = [...new Set(data.map(r => r.eventId || r.event_id).filter(Boolean))];
        if (eventIds.length > 0) {
          try {
            const eventsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/events`);
            if (eventsResponse.ok) {
              const events = await eventsResponse.json();
              const map: Record<string, string> = {};
              events.forEach((event: any) => {
                map[event.id] = event.title || event.name;
              });
              setEventMap(map);
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

    fetchResults();
  }, [member.meca_id]);

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

  // Calculate totals
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
            {results.map((result) => (
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
            ))}
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

function PermissionsTab({ member: _member }: { member: Profile }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Permissions</h2>
      <div className="text-center py-12 text-gray-400">
        <Settings className="h-16 w-16 mx-auto mb-4 text-gray-500" />
        <p>Permission management coming soon</p>
      </div>
    </div>
  );
}
