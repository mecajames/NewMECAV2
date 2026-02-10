import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  User, Calendar, Trophy, Award, CreditCard, Mail, Clock, CheckCircle, XCircle,
  Eye, MessageSquare, Settings, Users, FileText, Image, BarChart3, UserPlus, Crown, LogOut, Trash2, Plus, X, Loader2,
  TrendingUp, TrendingDown, Minus, Star, Bell, Check
} from 'lucide-react';
import { notificationsApi, Notification } from '@/notifications/notifications.api-client';
import { useAuth } from '@/auth';
import { supabase, EventRegistration, CompetitionResult } from '@/lib/supabase';
import axios from 'axios';
import { teamsApi, Team, TeamType, TeamMemberRole, CreateTeamDto, UpgradeEligibilityResponse, MemberLookupResult, MyTeamsResponse } from '@/teams';
import { Camera, Globe, MapPin, HelpCircle, Upload, Edit3, Shield, ShieldCheck, UserCog, Ticket, Gavel, ClipboardList, Search, Filter, Store } from 'lucide-react';
import { getMyJudgeProfile, getMyAssignments as getMyJudgeAssignments, EventJudgeAssignment } from '@/judges';
import { getMyEventDirectorProfile, getMyEDAssignments, EventDirectorAssignment, EventDirector } from '@/event-directors';
import type { Judge } from '@newmeca/shared';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { EventRatingsPanel } from '@/ratings';
import { seasonsApi, Season } from '@/seasons/seasons.api-client';
import { AchievementsGallery } from '@/achievements';
import { membershipsApi, Membership, MemberCancelMembershipModal } from '@/memberships';

interface EventHostingRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  eventName: string;
  eventType: string;
  status: string;
  adminResponse?: string;
  adminResponseDate?: string;
  createdAt: string;
}

type TabType = 'overview' | 'profile' | 'gallery' | 'team' | 'events' | 'results' | 'analytics';

export default function MyMecaDashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [hostingRequests, setHostingRequests] = useState<EventHostingRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<EventHostingRequest | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalPoints: 0,
    bestPlacement: null as number | null,
  });
  const [loading, setLoading] = useState(true);
  const [expandedRatingEventId, setExpandedRatingEventId] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [teamError, setTeamError] = useState('');
  const [canCreateTeam, setCanCreateTeam] = useState(false);
  const [_canCreateReason, setCanCreateReason] = useState('');
  const [upgradeEligibility, setUpgradeEligibility] = useState<UpgradeEligibilityResponse | null>(null);

  // Multi-team support
  const [allTeams, setAllTeams] = useState<MyTeamsResponse>({ ownedTeams: [], memberTeams: [] });
  const [ownsTeam, setOwnsTeam] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Active membership for displaying membership type badge
  const [activeMembership, setActiveMembership] = useState<Membership | null>(null);

  // Auto-renewal/subscription status
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    autoRenewalStatus: 'on' | 'legacy' | 'off';
    stripeSubscriptionId: string | null;
    hadLegacySubscription: boolean;
    stripeSubscription: {
      status: string;
      currentPeriodEnd: string;
      cancelAtPeriodEnd: boolean;
    } | null;
  } | null>(null);
  const [billingPortalLoading, setBillingPortalLoading] = useState(false);
  const [disableAutoRenewalLoading, setDisableAutoRenewalLoading] = useState(false);
  const [showDisableAutoRenewalModal, setShowDisableAutoRenewalModal] = useState(false);
  const [disableAutoRenewalReason, setDisableAutoRenewalReason] = useState('');

  // Cancel membership modal state
  const [showCancelMembershipModal, setShowCancelMembershipModal] = useState(false);

  // Judge and Event Director state
  const [judgeProfile, setJudgeProfile] = useState<Judge | null>(null);
  const [edProfile, setEdProfile] = useState<EventDirector | null>(null);
  const [judgeAssignments, setJudgeAssignments] = useState<EventJudgeAssignment[]>([]);
  const [edAssignments, setEdAssignments] = useState<EventDirectorAssignment[]>([]);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [deletingNotificationId, setDeletingNotificationId] = useState<string | null>(null);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);

  // Event Registrations filter state
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [registrationFilters, setRegistrationFilters] = useState({
    search: '',
    seasonId: '',
    country: '',
    state: '',
  });

  // Analytics filter state
  const [analyticsFilters, setAnalyticsFilters] = useState({
    seasonId: '',
    state: '',
  });

  // Results filter state
  const [resultsFilters, setResultsFilters] = useState({
    seasonId: '',
    state: '',
  });

  // Profile image selector state
  const [showProfileImageSelector, setShowProfileImageSelector] = useState(false);
  const [updatingProfileImage, setUpdatingProfileImage] = useState(false);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  // Team image upload state
  const teamLogoInputRef = useRef<HTMLInputElement>(null);
  const teamGalleryInputRef = useRef<HTMLInputElement>(null);
  const [uploadingTeamLogo, setUploadingTeamLogo] = useState(false);
  const [uploadingTeamGallery, setUploadingTeamGallery] = useState(false);
  const [teamLogoUrl, setTeamLogoUrl] = useState<string | null>(null);
  const [teamGalleryImages, setTeamGalleryImages] = useState<string[]>([]);

  // Edit Team modal state
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<{
    name: string;
    description: string;
    bio: string;
    team_type: TeamType;
    location: string;
    max_members: number;
    website: string;
    is_public: boolean;
    requires_approval: boolean;
  } | null>(null);

  // Member management state
  const [selectedMember, setSelectedMember] = useState<{
    userId: string;
    name: string;
    currentRole: TeamMemberRole;
  } | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showTransferOwnershipModal, setShowTransferOwnershipModal] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);

  // Invite member state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteMecaId, setInviteMecaId] = useState('');
  const [lookupResult, setLookupResult] = useState<MemberLookupResult | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  // User's own pending invites/requests state (when not on a team)
  const [myPendingInvites, setMyPendingInvites] = useState<any[]>([]);
  const [myPendingJoinRequests, setMyPendingJoinRequests] = useState<any[]>([]);
  const [cancellingRequest, setCancellingRequest] = useState<string | null>(null);

  // Enhanced team form state
  const [newTeam, setNewTeam] = useState<CreateTeamDto>({
    name: '',
    description: '',
    team_type: 'competitive',
    location: '',
    max_members: 50,
    website: '',
    is_public: true,
    requires_approval: true,
  });

  useEffect(() => {
    // Wait for auth to finish loading before making API calls
    // This ensures the axios interceptor has the user ID set
    if (profile && !authLoading) {
      fetchUserData();
      fetchTeamData();
      fetchJudgeEDData();
      fetchNotifications();
      fetchActiveMembership();
    }
  }, [profile, authLoading]);

  // Fetch active membership to display membership type badge and subscription status
  const fetchActiveMembership = async () => {
    if (!profile?.id) return;
    try {
      const membership = await membershipsApi.getUserActiveMembership(profile.id);
      setActiveMembership(membership);

      // Fetch subscription status if we have an active membership
      if (membership) {
        try {
          const subStatus = await membershipsApi.getSubscriptionStatus(membership.id);
          setSubscriptionStatus(subStatus);
        } catch (subError) {
          console.error('Error fetching subscription status:', subError);
          // Default to using the membership fields directly if endpoint fails
          setSubscriptionStatus({
            autoRenewalStatus: membership.stripeSubscriptionId ? 'on' : (membership.hadLegacySubscription ? 'legacy' : 'off'),
            stripeSubscriptionId: membership.stripeSubscriptionId || null,
            hadLegacySubscription: membership.hadLegacySubscription || false,
            stripeSubscription: null,
          });
        }
      } else {
        setSubscriptionStatus(null);
      }
    } catch (error) {
      console.error('Error fetching active membership:', error);
    }
  };

  // Open Stripe Billing Portal for managing payment methods and subscriptions
  const handleOpenBillingPortal = async () => {
    setBillingPortalLoading(true);
    try {
      const result = await membershipsApi.getBillingPortalUrl(window.location.href);
      window.open(result.url, '_blank');
    } catch (error: any) {
      console.error('Error opening billing portal:', error);
      alert(error.response?.data?.message || 'Failed to open billing portal. Please try again.');
    } finally {
      setBillingPortalLoading(false);
    }
  };

  // Disable auto-renewal for the member
  const handleDisableAutoRenewal = async () => {
    if (!activeMembership) return;
    setDisableAutoRenewalLoading(true);
    try {
      await membershipsApi.memberDisableAutoRenewal(activeMembership.id, disableAutoRenewalReason);
      alert('Auto-renewal has been disabled. Your membership will remain active until the end of your current billing period.');
      setShowDisableAutoRenewalModal(false);
      setDisableAutoRenewalReason('');
      fetchActiveMembership();
    } catch (error: any) {
      console.error('Error disabling auto-renewal:', error);
      alert(error.response?.data?.message || 'Failed to disable auto-renewal. Please try again.');
    } finally {
      setDisableAutoRenewalLoading(false);
    }
  };

  // Fetch seasons for filtering
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const seasonsData = await seasonsApi.getAll();
        setSeasons(seasonsData);

        // Default filters to current season
        const currentSeason = seasonsData.find(s => s.is_current);
        if (currentSeason) {
          setResultsFilters(prev => ({ ...prev, seasonId: currentSeason.id }));
          setAnalyticsFilters(prev => ({ ...prev, seasonId: currentSeason.id }));
        }
      } catch (error) {
        console.error('Error fetching seasons:', error);
      }
    };
    fetchSeasons();
  }, []);

  // Fetch judge and event director data
  const fetchJudgeEDData = async () => {
    try {
      const [judge, ed] = await Promise.all([
        getMyJudgeProfile(),
        getMyEventDirectorProfile(),
      ]);
      // DEBUG: Log the returned values
      console.log('DEBUG - Profile permissions:', {
        can_apply_judge: (profile as any)?.can_apply_judge,
        can_apply_event_director: (profile as any)?.can_apply_event_director,
      });
      console.log('DEBUG - Judge profile:', judge);
      console.log('DEBUG - ED profile:', ed);
      setJudgeProfile(judge);
      setEdProfile(ed);

      // If user is a judge or ED, fetch their assignments
      if (judge) {
        const assignments = await getMyJudgeAssignments({ upcoming: true });
        setJudgeAssignments(assignments);
      }
      if (ed) {
        const assignments = await getMyEDAssignments({ upcoming: true });
        setEdAssignments(assignments);
      }
    } catch (error) {
      console.error('Error fetching judge/ED data:', error);
    }
  };

  // Fetch user notifications
  const fetchNotifications = async () => {
    if (!profile?.id) return;
    try {
      setNotificationsLoading(true);
      const data = await notificationsApi.getUserNotifications(profile.id, 50);
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    if (!profile?.id) return;
    try {
      setMarkingReadId(notificationId);
      await notificationsApi.markAsRead(notificationId, profile.id);
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      setMarkingReadId(null);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!profile?.id) return;
    try {
      await notificationsApi.markAllAsRead(profile.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!profile?.id) return;
    try {
      setDeletingNotificationId(notificationId);
      await notificationsApi.deleteNotification(notificationId, profile.id);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setDeletingNotificationId(null);
    }
  };

  // Initialize team gallery images when team data loads
  useEffect(() => {
    if (team?.galleryImages) {
      setTeamGalleryImages(team.galleryImages);
    } else {
      setTeamGalleryImages([]);
    }
  }, [team?.id]);

  // Handle URL parameters for tab navigation and actions (e.g., after team membership purchase)
  useEffect(() => {
    const tab = searchParams.get('tab');
    const action = searchParams.get('action');

    // Set active tab from URL parameter
    if (tab && ['overview', 'profile', 'gallery', 'team', 'events', 'results', 'analytics'].includes(tab)) {
      setActiveTab(tab as TabType);
    }

    // Handle create team action (redirect from checkout after team membership purchase)
    if (tab === 'team' && action === 'create') {
      setShowCreateTeamModal(true);
      // Clear the URL params after handling
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const fetchTeamData = async () => {
    try {
      setTeamLoading(true);
      const [userTeam, eligibility, upgradeElig, pendingInvites, pendingRequests, myTeams, ownsTeamResult] = await Promise.all([
        teamsApi.getTeamByUserId(profile!.id),
        teamsApi.canCreateTeam(),
        teamsApi.canUpgradeToTeam(),
        teamsApi.getMyPendingInvites(),
        teamsApi.getMyPendingRequests(),
        teamsApi.getMyTeams(),
        teamsApi.ownsTeam(),
      ]);
      setTeam(userTeam);
      setCanCreateTeam(eligibility.canCreate);
      setCanCreateReason(eligibility.reason || '');
      setUpgradeEligibility(upgradeElig);
      setMyPendingInvites(pendingInvites);
      setMyPendingJoinRequests(pendingRequests);
      setAllTeams(myTeams);
      setOwnsTeam(ownsTeamResult.ownsTeam);
      // Set selectedTeamId to owned team first, or first member team
      if (!selectedTeamId) {
        const firstOwnedTeam = myTeams.ownedTeams[0];
        const firstMemberTeam = myTeams.memberTeams[0];
        setSelectedTeamId(firstOwnedTeam?.id || firstMemberTeam?.id || userTeam?.id || null);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setTeamLoading(false);
    }
  };

  /**
   * Check if team name contains any variation of "team"
   * Includes: team, Team, TEAM, t3@m, T3AM, maet (backwards), spaced variations
   * Returns true if the name is INVALID (contains team word)
   */
  const containsTeamWord = (name: string): boolean => {
    if (!name) return false;

    const normalized = name.toLowerCase().trim();

    // Direct match for "team"
    if (normalized.includes('team')) return true;

    // Backwards "team" -> "maet"
    if (normalized.includes('maet')) return true;

    // Leet speak variations: t3@m, t3am, te@m, t34m, etc.
    const leetNormalized = normalized
      .replace(/3/g, 'e')
      .replace(/@/g, 'a')
      .replace(/4/g, 'a')
      .replace(/0/g, 'o')
      .replace(/1/g, 'i')
      .replace(/\$/g, 's')
      .replace(/7/g, 't');

    if (leetNormalized.includes('team') || leetNormalized.includes('maet')) return true;

    // Check for spaced out variations: t e a m, t-e-a-m, t.e.a.m
    const noSpaces = normalized.replace(/[\s\-._]/g, '');
    const noSpacesLeet = noSpaces
      .replace(/3/g, 'e')
      .replace(/@/g, 'a')
      .replace(/4/g, 'a');

    if (noSpacesLeet.includes('team') || noSpacesLeet.includes('maet')) return true;

    return false;
  };

  const handleCreateTeam = async () => {
    const trimmedName = newTeam.name.trim();

    if (!trimmedName) {
      setTeamError('Team name is required');
      return;
    }

    // Reject team names containing "team" or variations
    if (containsTeamWord(trimmedName)) {
      setTeamError('Team name cannot contain the word "team" or variations (T3@M, TEAM, backwards, etc.). Please choose a different name.');
      return;
    }

    try {
      setTeamError('');
      const createdTeam = await teamsApi.createTeam({
        name: trimmedName,
        description: newTeam.description?.trim() || undefined,
        logo_url: teamLogoUrl || undefined,
        team_type: newTeam.team_type,
        location: newTeam.location?.trim() || undefined,
        max_members: newTeam.max_members,
        website: newTeam.website?.trim() || undefined,
        is_public: newTeam.is_public,
        requires_approval: newTeam.requires_approval,
      });
      setTeam(createdTeam);
      setShowCreateTeamModal(false);
      resetTeamForm();
      fetchTeamData();
    } catch (error: any) {
      setTeamError(error.response?.data?.message || 'Failed to create team');
    }
  };

  const resetTeamForm = () => {
    setNewTeam({
      name: '',
      description: '',
      team_type: 'competitive',
      location: '',
      max_members: 50,
      website: '',
      is_public: true,
      requires_approval: true,
    });
    setTeamError('');
    setTeamLogoUrl(null);
    setTeamGalleryImages([]);
  };

  // Open Edit Team modal
  const handleOpenEditTeam = () => {
    if (!team) return;
    setEditingTeam({
      name: team.name,
      description: team.description || '',
      bio: team.bio || '',
      team_type: team.teamType,
      location: team.location || '',
      max_members: team.maxMembers,
      website: team.website || '',
      is_public: team.isPublic,
      requires_approval: team.requiresApproval,
    });
    setShowEditTeamModal(true);
  };

  // Save edited team
  const handleSaveEditTeam = async () => {
    if (!team || !editingTeam) return;

    const trimmedName = editingTeam.name.trim();

    if (!trimmedName) {
      setTeamError('Team name is required');
      return;
    }

    // Reject team names containing "team" or variations
    if (containsTeamWord(trimmedName)) {
      setTeamError('Team name cannot contain the word "team" or variations (T3@M, TEAM, backwards, etc.). Please choose a different name.');
      return;
    }

    try {
      setTeamError('');
      const updatedTeam = await teamsApi.updateTeam(team.id, {
        name: trimmedName,
        description: editingTeam.description || undefined,
        bio: editingTeam.bio || undefined,
        team_type: editingTeam.team_type,
        location: editingTeam.location || undefined,
        max_members: editingTeam.max_members,
        website: editingTeam.website || undefined,
        is_public: editingTeam.is_public,
        requires_approval: editingTeam.requires_approval,
      });
      setTeam(updatedTeam);
      setShowEditTeamModal(false);
      setEditingTeam(null);
      fetchTeamData();
    } catch (error: any) {
      setTeamError(error.response?.data?.message || 'Failed to update team');
    }
  };

  // Handle member role change
  const handleChangeMemberRole = async (newRole: TeamMemberRole) => {
    if (!team || !selectedMember) return;

    setUpdatingRole(true);
    setTeamError('');

    try {
      await teamsApi.updateMemberRole(team.id, selectedMember.userId, newRole);
      setShowRoleModal(false);
      setSelectedMember(null);
      fetchTeamData();
    } catch (error: any) {
      setTeamError(error.response?.data?.message || 'Failed to update member role');
    } finally {
      setUpdatingRole(false);
    }
  };

  // Handle transfer ownership
  const handleTransferOwnership = async () => {
    if (!team || !selectedMember) return;

    setUpdatingRole(true);
    setTeamError('');

    try {
      await teamsApi.transferOwnership(team.id, selectedMember.userId);
      setShowTransferOwnershipModal(false);
      setSelectedMember(null);
      fetchTeamData();
    } catch (error: any) {
      setTeamError(error.response?.data?.message || 'Failed to transfer ownership');
    } finally {
      setUpdatingRole(false);
    }
  };

  // Handle remove member
  const handleRemoveMember = async (userId: string) => {
    if (!team) return;

    if (!confirm('Are you sure you want to remove this member from the team?')) {
      return;
    }

    setTeamError('');
    try {
      await teamsApi.removeMember(team.id, userId);
      fetchTeamData();
    } catch (error: any) {
      setTeamError(error.response?.data?.message || 'Failed to remove member');
    }
  };

  // ============================================
  // INVITE SYSTEM HANDLERS
  // ============================================

  // Lookup member by MECA ID
  const handleLookupMember = async () => {
    const trimmedId = inviteMecaId.trim();
    if (!trimmedId) return;

    // Validate that MECA ID is numeric
    if (!/^\d+$/.test(trimmedId)) {
      setTeamError('MECA ID must be a number (e.g., 202401)');
      setLookupResult(null);
      return;
    }

    setLookingUp(true);
    setLookupResult(null);
    setTeamError('');

    try {
      const result = await teamsApi.lookupMemberByMecaId(trimmedId);
      setLookupResult(result);
    } catch (error: any) {
      setTeamError(error.response?.data?.message || 'Failed to lookup member');
    } finally {
      setLookingUp(false);
    }
  };

  // Send invite to member
  const handleSendInvite = async () => {
    if (!team || !lookupResult?.member?.id) return;

    setSendingInvite(true);
    setTeamError('');

    try {
      await teamsApi.inviteMember(team.id, lookupResult.member.id, inviteMessage || undefined);
      setShowInviteModal(false);
      setInviteMecaId('');
      setLookupResult(null);
      setInviteMessage('');
      fetchTeamData();
    } catch (error: any) {
      setTeamError(error.response?.data?.message || 'Failed to send invite');
    } finally {
      setSendingInvite(false);
    }
  };

  // Approve join request
  const handleApproveRequest = async (userId: string) => {
    if (!team) return;

    setProcessingRequest(userId);
    setTeamError('');

    try {
      await teamsApi.approveJoinRequest(team.id, userId);
      fetchTeamData();
    } catch (error: any) {
      setTeamError(error.response?.data?.message || 'Failed to approve request');
    } finally {
      setProcessingRequest(null);
    }
  };

  // Reject join request
  const handleRejectRequest = async (userId: string) => {
    if (!team) return;

    if (!confirm('Are you sure you want to reject this join request?')) {
      return;
    }

    setProcessingRequest(userId);
    setTeamError('');

    try {
      await teamsApi.rejectJoinRequest(team.id, userId);
      fetchTeamData();
    } catch (error: any) {
      setTeamError(error.response?.data?.message || 'Failed to reject request');
    } finally {
      setProcessingRequest(null);
    }
  };

  // Cancel sent invite
  const handleCancelInvite = async (userId: string) => {
    if (!team) return;

    if (!confirm('Are you sure you want to cancel this invite?')) {
      return;
    }

    setProcessingRequest(userId);
    setTeamError('');

    try {
      await teamsApi.cancelInvite(team.id, userId);
      fetchTeamData();
    } catch (error: any) {
      setTeamError(error.response?.data?.message || 'Failed to cancel invite');
    } finally {
      setProcessingRequest(null);
    }
  };

  // Cancel my own join request
  const handleCancelMyJoinRequest = async (teamId: string) => {
    if (!confirm('Are you sure you want to cancel this join request?')) {
      return;
    }

    setCancellingRequest(teamId);

    try {
      await teamsApi.cancelJoinRequest(teamId);
      fetchTeamData();
    } catch (error: any) {
      setTeamError(error.response?.data?.message || 'Failed to cancel request');
    } finally {
      setCancellingRequest(null);
    }
  };

  // Get role display info
  const getRoleInfo = (role: TeamMemberRole) => {
    switch (role) {
      case 'owner':
        return { label: 'Owner', color: 'bg-yellow-500/20 text-yellow-400', icon: Crown };
      case 'co_owner':
        return { label: 'Co-Owner', color: 'bg-orange-500/20 text-orange-400', icon: ShieldCheck };
      case 'moderator':
        return { label: 'Moderator', color: 'bg-blue-500/20 text-blue-400', icon: Shield };
      case 'member':
      default:
        return { label: 'Member', color: 'bg-slate-600 text-gray-300', icon: User };
    }
  };

  // Handle team logo upload
  const handleTeamLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setTeamError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setTeamError('Image must be less than 5MB');
      return;
    }

    setUploadingTeamLogo(true);
    setTeamError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `team-logos/${profile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      setTeamLogoUrl(publicUrl);
    } catch (err: any) {
      console.error('Error uploading team logo:', err);
      setTeamError(err.message || 'Failed to upload team logo');
    } finally {
      setUploadingTeamLogo(false);
      if (teamLogoInputRef.current) {
        teamLogoInputRef.current.value = '';
      }
    }
  };

  // Handle team gallery image upload
  const handleTeamGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile || !team) return;

    if (teamGalleryImages.length >= 6) {
      setTeamError('Maximum 6 gallery images allowed');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setTeamError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setTeamError('Image must be less than 5MB');
      return;
    }

    setUploadingTeamGallery(true);
    setTeamError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `team-gallery/${team.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      const newGalleryImages = [...teamGalleryImages, publicUrl];
      setTeamGalleryImages(newGalleryImages);

      // Save to team
      await teamsApi.updateTeam(team.id, { gallery_images: newGalleryImages });
      setTeam({ ...team, galleryImages: newGalleryImages });
    } catch (err: any) {
      console.error('Error uploading gallery image:', err);
      setTeamError(err.message || 'Failed to upload gallery image');
    } finally {
      setUploadingTeamGallery(false);
      if (teamGalleryInputRef.current) {
        teamGalleryInputRef.current.value = '';
      }
    }
  };

  // Remove team gallery image
  const handleRemoveTeamGalleryImage = async (imageUrl: string) => {
    if (!team) return;

    const newGalleryImages = teamGalleryImages.filter(url => url !== imageUrl);
    setTeamGalleryImages(newGalleryImages);

    try {
      await teamsApi.updateTeam(team.id, { gallery_images: newGalleryImages });
      setTeam({ ...team, galleryImages: newGalleryImages });
    } catch (err: any) {
      console.error('Error removing gallery image:', err);
      setTeamError('Failed to remove image');
    }
  };

  // Update team logo for existing team
  const handleUpdateTeamLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile || !team) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setTeamError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setTeamError('Image must be less than 5MB');
      return;
    }

    setUploadingTeamLogo(true);
    setTeamError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `team-logos/${team.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      await teamsApi.updateTeam(team.id, { logo_url: publicUrl });
      setTeam({ ...team, logoUrl: publicUrl });
    } catch (err: any) {
      console.error('Error updating team logo:', err);
      setTeamError(err.message || 'Failed to update team logo');
    } finally {
      setUploadingTeamLogo(false);
      if (teamLogoInputRef.current) {
        teamLogoInputRef.current.value = '';
      }
    }
  };

  // Handle selecting an existing profile image as the main profile picture
  const handleSelectProfileImage = async (imageUrl: string) => {
    if (!profile) return;
    setUpdatingProfileImage(true);
    try {
      await axios.put(`/api/profiles/${profile.id}`, {
        profile_picture_url: imageUrl,
      });
      // Refresh the auth context to get updated profile
      window.location.reload();
    } catch (err: any) {
      console.error('Error updating profile image:', err);
      alert('Failed to update profile image');
    } finally {
      setUpdatingProfileImage(false);
      setShowProfileImageSelector(false);
    }
  };

  // Handle uploading a new profile image
  const handleUploadProfileImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUpdatingProfileImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `profile-pictures/${profile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      // Update profile with new image URL and add to profile_images array
      const newProfileImages = [...(profile.profile_images || []), publicUrl];
      await axios.put(`/api/profiles/${profile.id}`, {
        profile_picture_url: publicUrl,
        profile_images: newProfileImages,
      });

      // Refresh the auth context to get updated profile
      window.location.reload();
    } catch (err: any) {
      console.error('Error uploading profile image:', err);
      alert('Failed to upload profile image');
    } finally {
      setUpdatingProfileImage(false);
      setShowProfileImageSelector(false);
      if (profileImageInputRef.current) {
        profileImageInputRef.current.value = '';
      }
    }
  };

  // Helper to change tabs and update URL for browser history
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'overview') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  const handleLeaveTeam = async () => {
    if (!confirm('Are you sure you want to leave this team?')) return;

    try {
      await teamsApi.leaveTeam();
      setTeam(null);
      fetchTeamData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to leave team');
    }
  };

  const handleDeleteTeam = async () => {
    if (!team) return;
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) return;

    try {
      await teamsApi.deleteTeam(team.id);
      setTeam(null);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete team');
    }
  };

  const fetchUserData = async () => {
    const [regData, resultsData] = await Promise.all([
      supabase
        .from('event_registrations')
        .select('*, event:events(*)')
        .eq('user_id', profile!.id)
        .order('registration_date', { ascending: false }),
      supabase
        .from('competition_results')
        .select('*, event:events(*)')
        .eq('competitor_id', profile!.id)
        .order('created_at', { ascending: false }),
    ]);

    if (regData.data) setRegistrations(regData.data);
    if (resultsData.data) {
      setResults(resultsData.data);

      const totalPoints = resultsData.data.reduce(
        (sum, r) => sum + r.points_earned,
        0
      );
      const bestPlacement =
        resultsData.data.length > 0
          ? Math.min(...resultsData.data.map((r) => r.placement))
          : null;

      setStats({
        totalEvents: resultsData.data.length,
        totalPoints,
        bestPlacement,
      });
    }

    // Fetch event hosting requests
    try {
      const response = await axios.get(`/api/event-hosting-requests/user/${profile!.id}`);
      if (response.data && Array.isArray(response.data)) {
        setHostingRequests(response.data);
      }
    } catch (error) {
      console.error('Error fetching hosting requests:', error);
      setHostingRequests([]);
    }

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { color: string; icon: any; label: string } } = {
      pending: { color: 'bg-yellow-500/10 text-yellow-500', icon: Clock, label: 'Pending' },
      under_review: { color: 'bg-blue-500/10 text-blue-500', icon: Eye, label: 'Under Review' },
      approved: { color: 'bg-green-500/10 text-green-500', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'bg-red-500/10 text-red-500', icon: XCircle, label: 'Rejected' },
      cancelled: { color: 'bg-gray-500/10 text-gray-500', icon: XCircle, label: 'Cancelled' },
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleViewRequest = (request: EventHostingRequest) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-xl mb-4">Please sign in to view your dashboard</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'profile', label: 'Profile', icon: Settings },
    { id: 'gallery', label: 'Gallery', icon: Image },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'events', label: 'Event Registrations', icon: Calendar },
    { id: 'results', label: 'Results', icon: Trophy },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'profile':
        return renderProfile();
      case 'gallery':
        return renderGallery();
      case 'team':
        return renderTeam();
      case 'events':
        return renderEvents();
      case 'results':
        return renderResults();
      case 'analytics':
        return renderAnalytics();
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
              <User className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Membership</p>
              <p className="text-white font-semibold capitalize">
                {profile?.membership_status}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Events</p>
              <p className="text-white font-semibold text-2xl">{stats.totalEvents}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Points</p>
              <p className="text-white font-semibold text-2xl">{stats.totalPoints}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Award className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Best Place</p>
              <p className="text-white font-semibold text-2xl">
                {stats.bestPlacement ? `#${stats.bestPlacement}` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Membership CTA */}
      {profile?.membership_status === 'none' && (
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Become a Member Today
              </h3>
              <p className="text-white/90">
                Get access to exclusive features, event discounts, and more
              </p>
            </div>
            <button
              onClick={() => navigate('/membership')}
              className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-white text-orange-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <CreditCard className="h-5 w-5" />
              Purchase Membership
            </button>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <button
          onClick={() => handleTabChange('profile')}
          className="bg-slate-800 rounded-xl p-6 shadow-lg hover:bg-slate-700 transition-colors text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <Settings className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Manage Profile</h3>
              <p className="text-gray-400 text-sm">Edit your account details</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleTabChange('gallery')}
          className="bg-slate-800 rounded-xl p-6 shadow-lg hover:bg-slate-700 transition-colors text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
              <Image className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Photo Gallery</h3>
              <p className="text-gray-400 text-sm">View your competition photos</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleTabChange('team')}
          className="bg-slate-800 rounded-xl p-6 shadow-lg hover:bg-slate-700 transition-colors text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
              <Users className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">My Team</h3>
              <p className="text-gray-400 text-sm">View or join a team</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/tickets')}
          className="bg-slate-800 rounded-xl p-6 shadow-lg hover:bg-slate-700 transition-colors text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
              <Ticket className="h-6 w-6 text-pink-500" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Support Tickets</h3>
              <p className="text-gray-400 text-sm">Get help or track requests</p>
            </div>
          </div>
        </button>

        {/* Judge Card - Only show if user has judge permission enabled */}
        {/* Show "My Judging" only if permission ON AND record exists AND is_active */}
        {/* Show "Become a Judge" only if permission ON AND no record exists */}
        {(profile as any)?.can_apply_judge && (
          judgeProfile && judgeProfile.is_active ? (
            <button
              onClick={() => navigate('/judges/assignments')}
              className="bg-slate-800 rounded-xl p-6 shadow-lg hover:bg-slate-700 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                  <Gavel className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">My Judging</h3>
                  <p className="text-gray-400 text-sm">
                    {judgeAssignments.length > 0
                      ? `${judgeAssignments.length} upcoming assignment${judgeAssignments.length > 1 ? 's' : ''}`
                      : 'View assignments'}
                  </p>
                </div>
              </div>
            </button>
          ) : !judgeProfile ? (
            <button
              onClick={() => navigate('/judges/apply')}
              className="bg-slate-800 rounded-xl p-6 shadow-lg hover:bg-slate-700 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                  <Gavel className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Become a Judge</h3>
                  <p className="text-gray-400 text-sm">Apply to judge MECA events</p>
                </div>
              </div>
            </button>
          ) : null /* Judge record exists but inactive - show nothing */
        )}

        {/* Event Director Card - Only show if user has ED permission enabled */}
        {/* Show "My Event Directing" only if permission ON AND record exists AND is_active */}
        {/* Show "Become an Event Director" only if permission ON AND no record exists */}
        {(profile as any)?.can_apply_event_director && (
          edProfile && edProfile.is_active ? (
            <button
              onClick={() => navigate('/event-directors/assignments')}
              className="bg-slate-800 rounded-xl p-6 shadow-lg hover:bg-slate-700 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <ClipboardList className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">My Event Directing</h3>
                  <p className="text-gray-400 text-sm">
                    {edAssignments.length > 0
                      ? `${edAssignments.length} upcoming event${edAssignments.length > 1 ? 's' : ''}`
                      : 'View assignments'}
                  </p>
                </div>
              </div>
            </button>
          ) : !edProfile ? (
            <button
              onClick={() => navigate('/event-directors/apply')}
              className="bg-slate-800 rounded-xl p-6 shadow-lg hover:bg-slate-700 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <ClipboardList className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Become an Event Director</h3>
                  <p className="text-gray-400 text-sm">Apply to direct MECA events</p>
                </div>
              </div>
            </button>
          ) : null /* ED record exists but inactive - show nothing */
        )}

        {/* ED Hosting Requests Card - Only show for active Event Directors */}
        {(profile as any)?.can_apply_event_director && edProfile && edProfile.is_active && (
          <button
            onClick={() => navigate('/event-directors/hosting-requests')}
            className="bg-slate-800 rounded-xl p-6 shadow-lg hover:bg-slate-700 transition-colors text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                <Mail className="h-6 w-6 text-cyan-500" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Hosting Requests</h3>
                <p className="text-gray-400 text-sm">Review assigned event requests</p>
              </div>
            </div>
          </button>
        )}

        {/* ED Submit New Event Card - Only show for active Event Directors */}
        {(profile as any)?.can_apply_event_director && edProfile && edProfile.is_active && (
          <button
            onClick={() => navigate('/event-directors/submit-event')}
            className="bg-slate-800 rounded-xl p-6 shadow-lg hover:bg-slate-700 transition-colors text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                <Calendar className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Submit New Event</h3>
                <p className="text-gray-400 text-sm">Submit an event for approval</p>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Event Hosting Requests */}
      {hostingRequests.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Mail className="h-6 w-6 text-orange-500" />
            My Event Hosting Requests
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hostingRequests.map((request) => (
              <div
                key={request.id}
                className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors cursor-pointer"
                onClick={() => handleViewRequest(request)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-white text-sm flex-1 pr-2">
                    {request.eventName}
                  </h4>
                  {getStatusBadge(request.status)}
                </div>
                <div className="space-y-1 text-xs text-gray-400">
                  <p className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Submitted {formatDate(request.createdAt)}
                  </p>
                  {request.adminResponse && (
                    <p className="flex items-center gap-1 text-blue-400">
                      <MessageSquare className="h-3 w-3" />
                      Admin responded
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            Recent Registrations
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
            </div>
          ) : registrations.length > 0 ? (
            <div className="space-y-3">
              {registrations.slice(0, 3).map((reg) => (
                <div
                  key={reg.id}
                  className="bg-slate-700 rounded-lg p-3 hover:bg-slate-600 transition-colors cursor-pointer"
                  onClick={() => reg.event && navigate(`/events/${reg.event.id}`)}
                >
                  <h4 className="font-medium text-white text-sm mb-1">
                    {reg.event?.title}
                  </h4>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">
                      {reg.event && new Date(reg.event.event_date).toLocaleDateString()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium ${
                        reg.status === 'confirmed'
                          ? 'bg-green-500/10 text-green-400'
                          : reg.status === 'pending'
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {reg.status}
                    </span>
                  </div>
                </div>
              ))}
              {registrations.length > 3 && (
                <button
                  onClick={() => handleTabChange('events')}
                  className="text-orange-500 hover:text-orange-400 text-sm font-medium"
                >
                  View all {registrations.length} registrations
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm mb-3">No event registrations yet</p>
              <button
                onClick={() => navigate('/events')}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Browse Events
              </button>
            </div>
          )}
        </div>

        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-orange-500" />
            Recent Results
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-3">
              {results.slice(0, 3).map((result) => (
                <div
                  key={result.id}
                  className="bg-slate-700 rounded-lg p-3 hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-white text-sm">
                      {result.event?.title}
                    </h4>
                    <span className="text-lg font-bold text-orange-500">
                      #{result.placement}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{result.competition_class}</span>
                    <span className="text-orange-400 font-medium">
                      {result.points_earned} pts
                    </span>
                  </div>
                </div>
              ))}
              {results.length > 3 && (
                <button
                  onClick={() => handleTabChange('results')}
                  className="text-orange-500 hover:text-orange-400 text-sm font-medium"
                >
                  View all {results.length} results
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No competition results yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Achievements Section */}
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg mt-8">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-orange-500" />
          My Achievements
        </h2>
        <AchievementsGallery
          profileId={profile?.id}
          maxItems={6}
          showEmpty={true}
        />
      </div>

      {/* Notifications Section */}
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-500" />
            My Notifications
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </h2>
          {notifications.some(n => !n.read) && (
            <button
              onClick={handleMarkAllNotificationsRead}
              className="text-orange-500 hover:text-orange-400 text-sm font-medium"
            >
              Mark all read
            </button>
          )}
        </div>

        {notificationsLoading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-lg p-4 transition-colors ${
                  notification.read ? 'bg-slate-700/50' : 'bg-slate-700 border-l-4 border-orange-500'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-medium text-sm ${notification.read ? 'text-gray-300' : 'text-white'}`}>
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></span>
                      )}
                    </div>
                    <p className={`text-sm ${notification.read ? 'text-gray-500' : 'text-gray-400'}`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {notification.fromUser && (
                        <span>
                          From: {notification.fromUser.first_name} {notification.fromUser.last_name}
                        </span>
                      )}
                      <span>
                        {new Date(notification.createdAt).toLocaleDateString()} at{' '}
                        {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkNotificationRead(notification.id)}
                        disabled={markingReadId === notification.id}
                        className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded transition-colors disabled:opacity-50"
                        title="Mark as read"
                      >
                        {markingReadId === notification.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteNotification(notification.id)}
                      disabled={deletingNotificationId === notification.id}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                      title="Delete notification"
                    >
                      {deletingNotificationId === notification.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No notifications yet</p>
            <p className="text-gray-500 text-xs mt-1">You'll see important updates here</p>
          </div>
        )}
      </div>
    </>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-6">Profile Settings</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate('/profile')}
            className="bg-slate-700 rounded-xl p-6 hover:bg-slate-600 transition-colors text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Settings className="h-7 w-7 text-blue-500" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Personal Profile</h3>
                <p className="text-gray-400 text-sm mt-1">Edit your account details, contact info, and vehicle information</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/public-profile')}
            className="bg-slate-700 rounded-xl p-6 hover:bg-slate-600 transition-colors text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                <Users className="h-7 w-7 text-green-500" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Public Profile</h3>
                <p className="text-gray-400 text-sm mt-1">Manage your public presence, bio, and visibility settings</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/billing')}
            className="bg-slate-700 rounded-xl p-6 hover:bg-slate-600 transition-colors text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <FileText className="h-7 w-7 text-purple-500" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Billing & Invoices</h3>
                <p className="text-gray-400 text-sm mt-1">View your payment history and invoices</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate(activeMembership ? '/dashboard/membership' : '/membership')}
            className="bg-slate-700 rounded-xl p-6 hover:bg-slate-600 transition-colors text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                <CreditCard className="h-7 w-7 text-orange-500" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Membership</h3>
                <p className="text-gray-400 text-sm mt-1">
                  {activeMembership ? 'Manage your membership and billing' : 'View membership options and upgrade your plan'}
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/tickets')}
            className="bg-slate-700 rounded-xl p-6 hover:bg-slate-600 transition-colors text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                <Ticket className="h-7 w-7 text-pink-500" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Support Tickets</h3>
                <p className="text-gray-400 text-sm mt-1">View your support tickets or submit a new request</p>
              </div>
            </div>
          </button>

          {/* Business Listing Card - Only show for retail or manufacturer members */}
          {(activeMembership?.membershipTypeConfig?.category === 'retail' ||
            activeMembership?.membershipTypeConfig?.category === 'manufacturer') && (
            <button
              onClick={() => navigate('/dashboard/business-listing')}
              className="bg-slate-700 rounded-xl p-6 hover:bg-slate-600 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  activeMembership?.membershipTypeConfig?.category === 'manufacturer'
                    ? 'bg-purple-500/10 group-hover:bg-purple-500/20'
                    : 'bg-green-500/10 group-hover:bg-green-500/20'
                }`}>
                  <Store className={`h-7 w-7 ${
                    activeMembership?.membershipTypeConfig?.category === 'manufacturer'
                      ? 'text-purple-500'
                      : 'text-green-500'
                  }`} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">
                    {activeMembership?.membershipTypeConfig?.category === 'manufacturer'
                      ? 'Manufacturer Listing'
                      : 'Retailer Listing'}
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">Manage your business directory listing</p>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderGallery = () => {
    const profileImages = profile?.profile_images || [];

    return (
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Photo Gallery</h2>
          <button
            onClick={() => navigate('/public-profile')}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Manage Photos
          </button>
        </div>

        {profileImages.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {profileImages.map((imageUrl, index) => (
              <div
                key={index}
                className="aspect-square rounded-lg overflow-hidden bg-slate-700 cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all"
                onClick={() => window.open(imageUrl, '_blank')}
              >
                <img
                  src={imageUrl}
                  alt={`Gallery image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Image className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">Your competition photos will appear here</p>
            <p className="text-gray-500 text-sm">Upload photos from your public profile page</p>
          </div>
        )}
      </div>
    );
  };

  const renderTeam = () => {
    if (teamLoading) {
      return (
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-white mb-6">My Team</h2>
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        </div>
      );
    }

    if (team) {
      // Get current user's role in the team
      const myMembership = team.members?.find(m => m.userId === profile?.id);

      // Normalize role - handle legacy 'captain' as 'owner'
      const normalizeRole = (role: string | undefined): TeamMemberRole => {
        if (!role) return 'member';
        if (role === 'captain') return 'owner';
        return role as TeamMemberRole;
      };

      // Determine user's role: from membership, from being captainId, or default to member
      let myRole: TeamMemberRole = 'member';
      if (myMembership) {
        myRole = normalizeRole(myMembership.role);
      } else if (team.captainId === profile?.id) {
        myRole = 'owner';
      }

      const isOwner = myRole === 'owner';
      const isCoOwner = myRole === 'co_owner';
      const isModerator = myRole === 'moderator';
      const canManageTeam = isOwner || isCoOwner; // Can edit team settings
      const canManageRoles = isOwner || isCoOwner; // Can change roles
      const canManageJoinRequests = isOwner || isCoOwner || isModerator; // Can approve/reject join requests

      // Get owner info (prefer owner field, fallback to captain)
      const ownerInfo = team.owner || team.captain;

      console.log('Team Debug:', { teamId: team.id, myUserId: profile?.id, myMembership, myRole, isOwner, canManageTeam });

      // Calculate total teams the user is on
      const totalTeamsCount = allTeams.ownedTeams.length + allTeams.memberTeams.length;
      const allTeamsList = [...allTeams.ownedTeams, ...allTeams.memberTeams];

      return (
        <div className="space-y-6">
          {/* Hidden file inputs for team management */}
          <input
            type="file"
            ref={teamLogoInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleUpdateTeamLogo}
          />
          <input
            type="file"
            ref={teamGalleryInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleTeamGalleryUpload}
          />

          {/* Team Switcher - only show if user is on multiple teams */}
          {totalTeamsCount > 1 && (
            <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-orange-500" />
                  <span className="text-gray-400 text-sm">Viewing team:</span>
                  <select
                    value={selectedTeamId || team.id}
                    onChange={(e) => {
                      setSelectedTeamId(e.target.value);
                      const selectedTeam = allTeamsList.find(t => t.id === e.target.value);
                      if (selectedTeam) {
                        setTeam(selectedTeam as Team);
                      }
                    }}
                    className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    {allTeams.ownedTeams.length > 0 && (
                      <optgroup label="My Teams (Owner)">
                        {allTeams.ownedTeams.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {allTeams.memberTeams.length > 0 && (
                      <optgroup label="Teams I'm On">
                        {allTeams.memberTeams.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <span className="text-gray-500 text-sm">
                  {totalTeamsCount} team{totalTeamsCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Team Header */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            {teamError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg">
                <p className="text-red-500 text-sm">{teamError}</p>
              </div>
            )}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  {team.logoUrl ? (
                    <img src={team.logoUrl} alt={team.name} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <Users className="h-8 w-8 text-orange-500" />
                    </div>
                  )}
                  {canManageTeam && (
                    <button
                      onClick={() => teamLogoInputRef.current?.click()}
                      disabled={uploadingTeamLogo}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {uploadingTeamLogo ? (
                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                      ) : (
                        <Camera className="h-5 w-5 text-white" />
                      )}
                    </button>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    {team.name}
                    {(() => {
                      const roleInfo = getRoleInfo(myRole);
                      const RoleIcon = roleInfo.icon;
                      return (
                        <span className={`text-xs ${roleInfo.color} px-2 py-1 rounded-full flex items-center gap-1`}>
                          <RoleIcon className="h-3 w-3" />
                          {roleInfo.label}
                        </span>
                      );
                    })()}
                  </h2>
                  {team.description && <p className="text-gray-400 mt-1">{team.description}</p>}
                  {team.bio && <p className="text-gray-300 mt-2 text-sm">{team.bio}</p>}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {canManageTeam && (
                  <button
                    onClick={handleOpenEditTeam}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit Team
                  </button>
                )}
                {!isOwner && (
                  <button
                    onClick={handleLeaveTeam}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Leave Team
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={handleDeleteTeam}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Team
                  </button>
                )}
              </div>
            </div>

            {/* Team Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-white">{team.members?.length || 1}</p>
                <p className="text-gray-400 text-sm">Members</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-orange-400">
                  {ownerInfo?.first_name} {ownerInfo?.last_name}
                </p>
                <p className="text-gray-400 text-sm">Team Owner</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-400">Active</p>
                <p className="text-gray-400 text-sm">Status</p>
              </div>
            </div>

            {/* Team Members */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Team Members</h3>
                {canManageTeam && (
                  <button
                    onClick={() => {
                      setShowInviteModal(true);
                      setInviteMecaId('');
                      setLookupResult(null);
                      setInviteMessage('');
                    }}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite Member
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {team.members?.map((member) => {
                  const memberRole = ((member.role as string) === 'captain' ? 'owner' : member.role) as TeamMemberRole;
                  const roleInfo = getRoleInfo(memberRole);
                  const RoleIcon = roleInfo.icon;
                  const isMe = member.userId === profile?.id;
                  const isMemberOwner = memberRole === 'owner';

                  // Role hierarchy for permission checks
                  const roleLevel = { owner: 4, co_owner: 3, moderator: 2, member: 1 };
                  const myLevel = roleLevel[myRole] || 0;
                  const memberLevel = roleLevel[memberRole] || 0;
                  const canEditThisMember = canManageRoles && !isMe && memberLevel < myLevel;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        {member.user?.profile_picture_url ? (
                          <img
                            src={member.user.profile_picture_url}
                            alt={`${member.user.first_name} ${member.user.last_name}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium flex items-center gap-2">
                            {member.user?.first_name} {member.user?.last_name}
                            {isMe && <span className="text-xs text-gray-500">(You)</span>}
                          </p>
                          {member.user?.meca_id && (
                            <p className="text-gray-400 text-sm font-mono">{member.user.meca_id}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${roleInfo.color}`}>
                          <RoleIcon className="h-3 w-3" />
                          {roleInfo.label}
                        </span>
                        {canEditThisMember && !isMemberOwner && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedMember({
                                  userId: member.userId,
                                  name: `${member.user?.first_name || ''} ${member.user?.last_name || ''}`.trim(),
                                  currentRole: memberRole,
                                });
                                setShowRoleModal(true);
                              }}
                              className="p-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                              title="Change role"
                            >
                              <UserCog className="h-4 w-4" />
                            </button>
                            {isOwner && (
                              <button
                                onClick={() => {
                                  setSelectedMember({
                                    userId: member.userId,
                                    name: `${member.user?.first_name || ''} ${member.user?.last_name || ''}`.trim(),
                                    currentRole: memberRole,
                                  });
                                  setShowTransferOwnershipModal(true);
                                }}
                                className="p-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors"
                                title="Transfer ownership"
                              >
                                <Crown className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveMember(member.userId)}
                              className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                              title="Remove member"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pending Join Requests - Visible to owner/co-owner/moderator */}
            {canManageJoinRequests && team.pendingRequests && team.pendingRequests.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  Pending Join Requests ({team.pendingRequests.length})
                </h3>
                <div className="space-y-3">
                  {team.pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                          {request.user?.profile_picture_url ? (
                            <img
                              src={request.user.profile_picture_url}
                              alt={request.user.first_name || 'User'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {request.user?.first_name} {request.user?.last_name}
                          </p>
                          <p className="text-gray-400 text-sm">MECA ID: {request.user?.meca_id || 'N/A'}</p>
                          {request.requestMessage && (
                            <p className="text-gray-300 text-sm mt-1 italic">"{request.requestMessage}"</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApproveRequest(request.userId)}
                          disabled={processingRequest === request.userId}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          {processingRequest === request.userId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.userId)}
                          disabled={processingRequest === request.userId}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Invites - Only visible to owner/co-owner */}
            {canManageTeam && team.pendingInvites && team.pendingInvites.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-cyan-500" />
                  Pending Invites ({team.pendingInvites.length})
                </h3>
                <div className="space-y-3">
                  {team.pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                          {invite.user?.profile_picture_url ? (
                            <img
                              src={invite.user.profile_picture_url}
                              alt={invite.user.first_name || 'User'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {invite.user?.first_name} {invite.user?.last_name}
                          </p>
                          <p className="text-gray-400 text-sm">MECA ID: {invite.user?.meca_id || 'N/A'}</p>
                          <p className="text-cyan-400 text-xs">Invite sent - waiting for response</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelInvite(invite.userId)}
                        disabled={processingRequest === invite.userId}
                        className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        {processingRequest === invite.userId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        Cancel Invite
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Team Gallery Section */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Image className="h-5 w-5 text-orange-500" />
                Team Gallery
              </h3>
              {canManageTeam && teamGalleryImages.length < 6 && (
                <button
                  onClick={() => teamGalleryInputRef.current?.click()}
                  disabled={uploadingTeamGallery}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {uploadingTeamGallery ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Photo ({teamGalleryImages.length}/6)
                    </>
                  )}
                </button>
              )}
            </div>

            {teamGalleryImages.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {teamGalleryImages.map((imageUrl, index) => (
                  <div key={index} className="relative group aspect-square rounded-lg overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={`Team gallery ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {canManageTeam && (
                      <button
                        onClick={() => handleRemoveTeamGalleryImage(imageUrl)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Image className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">
                  {canManageTeam ? 'Add photos to showcase your team' : 'No team photos yet'}
                </p>
              </div>
            )}
          </div>

          {/* Edit Team Modal */}
          {showEditTeamModal && editingTeam && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                  <h3 className="text-xl font-bold text-white">Edit Team</h3>
                  <button
                    onClick={() => {
                      setShowEditTeamModal(false);
                      setEditingTeam(null);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {teamError && (
                    <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg">
                      <p className="text-red-500 text-sm">{teamError}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">Team Name</label>
                    <input
                      type="text"
                      value={editingTeam.name}
                      onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                      className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                        containsTeamWord(editingTeam.name) ? 'border-red-500' : 'border-slate-600'
                      }`}
                      placeholder="e.g., Thunder Audio, Bass Hunters, Sound Warriors"
                    />
                    {containsTeamWord(editingTeam.name) && (
                      <p className="text-red-500 text-xs mt-1">
                        Team name cannot contain "team" or variations (T3@M, TEAM, backwards, etc.)
                      </p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      Note: The word "team" is not allowed in team names.
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">Short Description</label>
                    <textarea
                      value={editingTeam.description}
                      onChange={(e) => setEditingTeam({ ...editingTeam, description: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                      rows={2}
                      placeholder="Brief description shown in team listings"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">Team Bio</label>
                    <textarea
                      value={editingTeam.bio}
                      onChange={(e) => setEditingTeam({ ...editingTeam, bio: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                      rows={4}
                      placeholder="Detailed about section for your team profile"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">Team Type</label>
                      <select
                        value={editingTeam.team_type}
                        onChange={(e) => setEditingTeam({ ...editingTeam, team_type: e.target.value as TeamType })}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="competitive">Competitive</option>
                        <option value="casual">Casual</option>
                        <option value="shop">Shop</option>
                        <option value="club">Club</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">Location</label>
                      <input
                        type="text"
                        value={editingTeam.location}
                        onChange={(e) => setEditingTeam({ ...editingTeam, location: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="City, State"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">Max Members</label>
                      <input
                        type="number"
                        value={editingTeam.max_members}
                        onChange={(e) => setEditingTeam({ ...editingTeam, max_members: parseInt(e.target.value) || 50 })}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        min={1}
                        max={200}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">Website</label>
                      <input
                        type="url"
                        value={editingTeam.website}
                        onChange={(e) => setEditingTeam({ ...editingTeam, website: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="https://"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Public Team</span>
                    <button
                      type="button"
                      onClick={() => setEditingTeam({ ...editingTeam, is_public: !editingTeam.is_public })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        editingTeam.is_public ? 'bg-cyan-600' : 'bg-slate-600'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        editingTeam.is_public ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Require Approval to Join</span>
                    <button
                      type="button"
                      onClick={() => setEditingTeam({ ...editingTeam, requires_approval: !editingTeam.requires_approval })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        editingTeam.requires_approval ? 'bg-cyan-600' : 'bg-slate-600'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        editingTeam.requires_approval ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-slate-700">
                  <button
                    onClick={() => {
                      setShowEditTeamModal(false);
                      setEditingTeam(null);
                      setTeamError('');
                    }}
                    className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEditTeam}
                    className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Change Role Modal */}
          {showRoleModal && selectedMember && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl max-w-md w-full">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                  <h3 className="text-xl font-bold text-white">Change Role</h3>
                  <button
                    onClick={() => {
                      setShowRoleModal(false);
                      setSelectedMember(null);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6">
                  <p className="text-gray-300 mb-4">
                    Change role for <span className="font-semibold text-white">{selectedMember.name}</span>
                  </p>

                  <div className="space-y-2">
                    {(['co_owner', 'moderator', 'member'] as TeamMemberRole[]).map((role) => {
                      const roleInfo = getRoleInfo(role);
                      const RoleIcon = roleInfo.icon;
                      const isCurrentRole = selectedMember.currentRole === role;

                      return (
                        <button
                          key={role}
                          onClick={() => handleChangeMemberRole(role)}
                          disabled={isCurrentRole || updatingRole}
                          className={`w-full p-4 rounded-lg flex items-center gap-3 transition-colors ${
                            isCurrentRole
                              ? 'bg-cyan-600/20 border border-cyan-500'
                              : 'bg-slate-700 hover:bg-slate-600 border border-transparent'
                          } ${updatingRole ? 'opacity-50' : ''}`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${roleInfo.color}`}>
                            <RoleIcon className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-white font-medium">{roleInfo.label}</p>
                            <p className="text-gray-400 text-sm">
                              {role === 'co_owner' && 'Can manage team settings and members'}
                              {role === 'moderator' && 'Can add and remove members'}
                              {role === 'member' && 'Basic team membership'}
                            </p>
                          </div>
                          {isCurrentRole && (
                            <span className="ml-auto text-cyan-400 text-sm">Current</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transfer Ownership Modal */}
          {showTransferOwnershipModal && selectedMember && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl max-w-md w-full">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                  <h3 className="text-xl font-bold text-white">Transfer Ownership</h3>
                  <button
                    onClick={() => {
                      setShowTransferOwnershipModal(false);
                      setSelectedMember(null);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6">
                  <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mb-6">
                    <p className="text-yellow-400 text-sm">
                      <strong>Warning:</strong> You are about to transfer team ownership to{' '}
                      <span className="font-semibold">{selectedMember.name}</span>.
                    </p>
                    <ul className="text-yellow-400 text-sm mt-2 list-disc list-inside space-y-1">
                      <li>They will become the new team owner</li>
                      <li>You will be demoted to Co-Owner</li>
                      <li>The new owner will manage team billing</li>
                      <li>This action cannot be undone without their consent</li>
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowTransferOwnershipModal(false);
                        setSelectedMember(null);
                      }}
                      className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleTransferOwnership}
                      disabled={updatingRole}
                      className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {updatingRole ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Crown className="h-4 w-4" />
                      )}
                      Transfer Ownership
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invite Member Modal */}
          {showInviteModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl max-w-md w-full">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                  <h3 className="text-xl font-bold text-white">Invite Member by MECA ID</h3>
                  <button
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteMecaId('');
                      setLookupResult(null);
                      setInviteMessage('');
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {teamError && (
                    <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg">
                      <p className="text-red-500 text-sm">{teamError}</p>
                    </div>
                  )}

                  {/* MECA ID Lookup */}
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">Enter MECA ID</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inviteMecaId}
                        onChange={(e) => setInviteMecaId(e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="e.g., 202401"
                      />
                      <button
                        onClick={handleLookupMember}
                        disabled={!inviteMecaId.trim() || lookingUp}
                        className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {lookingUp ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        Lookup
                      </button>
                    </div>
                  </div>

                  {/* Lookup Result */}
                  {lookupResult && (
                    <div className={`p-4 rounded-lg ${lookupResult.found ? 'bg-slate-700' : 'bg-red-500/10 border border-red-500'}`}>
                      {!lookupResult.found ? (
                        <p className="text-red-400 text-sm">{lookupResult.message || 'Member not found'}</p>
                      ) : lookupResult.member ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            {lookupResult.member.profile_picture_url ? (
                              <img
                                src={lookupResult.member.profile_picture_url}
                                alt={lookupResult.member.first_name || 'User'}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center">
                                <User className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="text-white font-medium">
                                {lookupResult.member.first_name} {lookupResult.member.last_name}
                              </p>
                              <p className="text-gray-400 text-sm font-mono">
                                MECA ID: {lookupResult.member.meca_id}
                              </p>
                            </div>
                          </div>
                          {lookupResult.member.canInvite ? (
                            <p className="text-green-400 text-sm flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              This member can be invited to your team
                            </p>
                          ) : (
                            <p className="text-red-400 text-sm flex items-center gap-1">
                              <XCircle className="h-4 w-4" />
                              {lookupResult.member.reason}
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Invite Message (optional) */}
                  {lookupResult?.found && lookupResult.member?.canInvite && (
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Invite Message (optional)
                      </label>
                      <textarea
                        value={inviteMessage}
                        onChange={(e) => setInviteMessage(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                        rows={2}
                        placeholder="Add a personal message to the invite..."
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-slate-700">
                  <button
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteMecaId('');
                      setLookupResult(null);
                      setInviteMessage('');
                    }}
                    className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendInvite}
                    disabled={!lookupResult?.member?.canInvite || sendingInvite}
                    className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {sendingInvite ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Send Invite
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Browse & Join Other Teams - always visible */}
          <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 text-gray-400" />
                <span className="text-gray-300">Looking to join another team?</span>
              </div>
              <button
                onClick={() => navigate('/teams')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Browse & Join Other Teams
              </button>
            </div>
          </div>

          {/* Create Your Team CTA - show when user has team membership but doesn't own a team */}
          {canCreateTeam && !ownsTeam && (
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Crown className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Ready to lead your own team?</p>
                    <p className="text-gray-400 text-sm">You have a team membership - create your own team!</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateTeamModal(true)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Your Team
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // No team - show options to join or create
    // Determine what buttons to show based on membership status
    const showUpgradeButton = upgradeEligibility?.canUpgrade;
    const showCreateButton = canCreateTeam;

    return (
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-6">My Team</h2>

        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">You're not on a team yet</h3>
          <p className="text-gray-400 mb-6">Join an existing team or create your own</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/teams')}
              className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="h-5 w-5" />
              Browse Teams
            </button>

            {showCreateButton ? (
              <button
                onClick={() => setShowCreateTeamModal(true)}
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Create a Team
              </button>
            ) : showUpgradeButton ? (
              <button
                onClick={() => navigate('/membership/checkout/afcf450a-0beb-4575-a5d1-a8fb81105cb4')}
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="h-5 w-5" />
                Upgrade to Team
              </button>
            ) : (
              <button
                onClick={() => navigate('/membership')}
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="h-5 w-5" />
                Get Membership
              </button>
            )}
          </div>

          {!showCreateButton && showUpgradeButton && (
            <p className="text-gray-500 text-sm mt-4">
              Upgrade your competitor membership to create and manage your own team
            </p>
          )}
          {!showCreateButton && !showUpgradeButton && !upgradeEligibility?.hasCompetitorMembership && (
            <p className="text-gray-500 text-sm mt-4">
              A competitor membership is required before you can upgrade to a team membership
            </p>
          )}
        </div>

        {/* User's Pending Join Requests */}
        {myPendingJoinRequests.length > 0 && (
          <div className="mt-8 pt-8 border-t border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Your Pending Join Requests ({myPendingJoinRequests.length})
            </h3>
            <div className="space-y-3">
              {myPendingJoinRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center overflow-hidden">
                      {request.team?.logoUrl ? (
                        <img
                          src={request.team.logoUrl}
                          alt={request.team?.name || 'Team'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="h-6 w-6 text-orange-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        Team {request.team?.name || 'Unknown'}
                      </p>
                      <p className="text-yellow-400 text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Pending approval
                      </p>
                      {request.requestedAt && (
                        <p className="text-gray-400 text-xs">
                          Requested {new Date(request.requestedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelMyJoinRequest(request.teamId)}
                    disabled={cancellingRequest === request.teamId}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    {cancellingRequest === request.teamId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    Cancel Request
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User's Pending Invites */}
        {myPendingInvites.length > 0 && (
          <div className="mt-8 pt-8 border-t border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-cyan-500" />
              Invitations to Join ({myPendingInvites.length})
            </h3>
            <div className="space-y-3">
              {myPendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center overflow-hidden">
                      {invite.team?.logoUrl ? (
                        <img
                          src={invite.team.logoUrl}
                          alt={invite.team?.name || 'Team'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="h-6 w-6 text-cyan-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        Team {invite.team?.name || 'Unknown'}
                      </p>
                      <p className="text-cyan-400 text-sm">
                        You've been invited to join!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/teams/${invite.teamId}`)}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    View Team
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Create Team Modal */}
        {showCreateTeamModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <h3 className="text-xl font-bold text-white">Create New Team</h3>
                <button
                  onClick={() => {
                    setShowCreateTeamModal(false);
                    resetTeamForm();
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                {teamError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg">
                    <p className="text-red-500 text-sm">{teamError}</p>
                  </div>
                )}

                {/* Team Logo Upload */}
                <div className="text-center mb-6">
                  <label className="text-sm font-medium text-gray-300 flex items-center justify-center gap-1 mb-3">
                    Team Logo
                    <HelpCircle className="h-4 w-4 text-gray-500" />
                  </label>
                  <input
                    type="file"
                    ref={teamLogoInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleTeamLogoUpload}
                  />
                  <div className="w-20 h-20 rounded-full bg-slate-700 mx-auto flex items-center justify-center mb-3 overflow-hidden">
                    {teamLogoUrl ? (
                      <img src={teamLogoUrl} alt="Team Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="h-8 w-8 text-gray-500" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => teamLogoInputRef.current?.click()}
                    disabled={uploadingTeamLogo}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {uploadingTeamLogo ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {teamLogoUrl ? 'Change Logo' : 'Upload Logo'}
                      </>
                    )}
                  </button>
                  {teamLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setTeamLogoUrl(null)}
                      className="ml-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded-lg"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Team Name and Team Type row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300 flex items-center gap-1 mb-2">
                        Team Name
                        <HelpCircle className="h-4 w-4 text-gray-500" />
                      </label>
                      <input
                        type="text"
                        value={newTeam.name}
                        onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                        className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                          containsTeamWord(newTeam.name) ? 'border-red-500' : 'border-slate-600'
                        }`}
                        placeholder="e.g., Thunder Audio, Bass Hunters, Sound Warriors"
                      />
                      {containsTeamWord(newTeam.name) && (
                        <p className="text-red-500 text-xs mt-1">
                          Team name cannot contain "team" or variations (T3@M, TEAM, backwards, etc.)
                        </p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">
                        Note: The word "team" is not allowed in team names.
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-300 flex items-center gap-1 mb-2">
                        Team Type
                        <HelpCircle className="h-4 w-4 text-gray-500" />
                      </label>
                      <select
                        value={newTeam.team_type}
                        onChange={(e) => setNewTeam({ ...newTeam, team_type: e.target.value as TeamType })}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="competitive">Competitive</option>
                        <option value="casual">Casual</option>
                        <option value="shop">Shop</option>
                        <option value="club">Club</option>
                      </select>
                    </div>
                  </div>

                  {/* Location and Max Members row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300 flex items-center gap-1 mb-2">
                        Location
                        <HelpCircle className="h-4 w-4 text-gray-500" />
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={newTeam.location || ''}
                          onChange={(e) => setNewTeam({ ...newTeam, location: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          placeholder="City, State"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-300 flex items-center gap-1 mb-2">
                        Max Members
                        <HelpCircle className="h-4 w-4 text-gray-500" />
                      </label>
                      <input
                        type="number"
                        value={newTeam.max_members || 50}
                        onChange={(e) => setNewTeam({ ...newTeam, max_members: parseInt(e.target.value) || 50 })}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        min={1}
                        max={200}
                      />
                    </div>
                  </div>

                  {/* Website */}
                  <div>
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-1 mb-2">
                      Website
                      <HelpCircle className="h-4 w-4 text-gray-500" />
                    </label>
                    <input
                      type="url"
                      value={newTeam.website || ''}
                      onChange={(e) => setNewTeam({ ...newTeam, website: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="https://example.com"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-1 mb-2">
                      Description
                      <HelpCircle className="h-4 w-4 text-gray-500" />
                    </label>
                    <textarea
                      value={newTeam.description || ''}
                      onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="Enter team description"
                      rows={3}
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTeam.is_public}
                        onChange={(e) => setNewTeam({ ...newTeam, is_public: e.target.checked })}
                        className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-800"
                      />
                      <span className="text-sm text-gray-300 flex items-center gap-1">
                        Public Team
                        <HelpCircle className="h-4 w-4 text-gray-500" />
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTeam.requires_approval}
                        onChange={(e) => setNewTeam({ ...newTeam, requires_approval: e.target.checked })}
                        className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-800"
                      />
                      <span className="text-sm text-gray-300 flex items-center gap-1">
                        Requires Approval
                        <HelpCircle className="h-4 w-4 text-gray-500" />
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-slate-700">
                <button
                  onClick={() => {
                    setShowCreateTeamModal(false);
                    resetTeamForm();
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTeam}
                  className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Team
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  const renderEvents = () => {
    // Get unique countries and states from registrations for filter dropdowns
    const uniqueCountries = [...new Set(
      registrations
        .map(reg => reg.event?.venue_country)
        .filter(Boolean)
    )].sort();

    const uniqueStates = [...new Set(
      registrations
        .filter(reg => !registrationFilters.country || reg.event?.venue_country === registrationFilters.country)
        .map(reg => reg.event?.venue_state)
        .filter(Boolean)
    )].sort();

    // Filter registrations based on current filters
    const filteredRegistrations = registrations.filter(reg => {
      const event = reg.event;
      if (!event) return false;

      // Search filter - search in event title, venue name, city
      if (registrationFilters.search) {
        const searchLower = registrationFilters.search.toLowerCase();
        const matchesSearch =
          event.title?.toLowerCase().includes(searchLower) ||
          event.venue_name?.toLowerCase().includes(searchLower) ||
          event.venue_city?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Season filter
      if (registrationFilters.seasonId && event.season_id !== registrationFilters.seasonId) {
        return false;
      }

      // Country filter
      if (registrationFilters.country && event.venue_country !== registrationFilters.country) {
        return false;
      }

      // State filter
      if (registrationFilters.state && event.venue_state !== registrationFilters.state) {
        return false;
      }

      return true;
    });

    const clearFilters = () => {
      setRegistrationFilters({
        search: '',
        seasonId: '',
        country: '',
        state: '',
      });
    };

    const hasActiveFilters = registrationFilters.search || registrationFilters.seasonId ||
                             registrationFilters.country || registrationFilters.state;

    return (
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-orange-500" />
            Event Registrations
          </h2>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={registrationFilters.search}
              onChange={(e) => setRegistrationFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Season Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={registrationFilters.seasonId}
              onChange={(e) => setRegistrationFilters(prev => ({ ...prev, seasonId: e.target.value }))}
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
              value={registrationFilters.country}
              onChange={(e) => setRegistrationFilters(prev => ({ ...prev, country: e.target.value, state: '' }))}
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
              value={registrationFilters.state}
              onChange={(e) => setRegistrationFilters(prev => ({ ...prev, state: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none cursor-pointer"
              disabled={!registrationFilters.country && uniqueStates.length === 0}
            >
              <option value="">All States</option>
              {uniqueStates.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        {registrations.length > 0 && (
          <div className="text-sm text-gray-400 mb-4">
            Showing {filteredRegistrations.length} of {registrations.length} registration{registrations.length !== 1 ? 's' : ''}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : filteredRegistrations.length > 0 ? (
          <div className="space-y-4">
            {filteredRegistrations.map((reg) => (
              <div
                key={reg.id}
                className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors cursor-pointer"
                onClick={() => reg.event && navigate(`/events/${reg.event.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">
                      {reg.event?.title}
                    </h4>
                    <div className="space-y-1 text-sm text-gray-400">
                      <p className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {reg.event?.venue_name}
                        {reg.event?.venue_city && `, ${reg.event.venue_city}`}
                        {reg.event?.venue_state && `, ${reg.event.venue_state}`}
                        {reg.event?.venue_country && reg.event.venue_country !== 'USA' && `, ${reg.event.venue_country}`}
                      </p>
                      <p className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {reg.event && new Date(reg.event.event_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      {reg.event?.season_id && (
                        <p className="text-xs text-gray-500">
                          Season: {seasons.find(s => s.id === reg.event?.season_id)?.name || 'Unknown'}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      reg.status === 'confirmed'
                        ? 'bg-green-500/10 text-green-400'
                        : reg.status === 'pending'
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {reg.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : registrations.length > 0 ? (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No registrations match your filters</p>
            <button
              onClick={clearFilters}
              className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No event registrations yet</p>
            <button
              onClick={() => navigate('/events')}
              className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              Browse Events
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderResults = () => {
    // Get unique states from results for filter dropdown
    const availableResultsStates = [...new Set(
      results
        .map(r => r.event?.venue_state)
        .filter((s): s is string => !!s)
    )].sort();

    // Apply filters to results
    const filteredResultsData = results.filter(r => {
      // Season filter
      if (resultsFilters.seasonId && r.season_id !== resultsFilters.seasonId) {
        return false;
      }
      // State filter
      if (resultsFilters.state && r.event?.venue_state !== resultsFilters.state) {
        return false;
      }
      return true;
    });

    // Note: eventIds can be computed from filteredResultsData if needed for duplicate rating panel detection

    return (
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Trophy className="h-6 w-6 text-orange-500" />
          My Competition Results
        </h2>

        {/* Results Filters */}
        <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <span className="text-gray-300 font-medium">Filters:</span>
            </div>
            <select
              value={resultsFilters.seasonId}
              onChange={(e) => setResultsFilters({ ...resultsFilters, seasonId: e.target.value })}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">All Seasons</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
            <select
              value={resultsFilters.state}
              onChange={(e) => setResultsFilters({ ...resultsFilters, state: e.target.value })}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">All States</option>
              {availableResultsStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            {(resultsFilters.seasonId || resultsFilters.state) && (
              <button
                onClick={() => setResultsFilters({ seasonId: '', state: '' })}
                className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            )}
            <span className="text-gray-500 text-sm ml-auto">
              {filteredResultsData.length} of {results.length} results
            </span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : filteredResultsData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Event</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Class</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Score</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm">Place</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">Points</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm">Rate Staff</th>
                </tr>
              </thead>
              <tbody>
                {filteredResultsData.map((result) => (
                  <React.Fragment key={result.id}>
                    <tr className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-white font-medium">{result.event?.title}</p>
                          <p className="text-gray-400 text-sm">{result.event && new Date(result.event.event_date).toLocaleDateString()}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{result.competition_class}</td>
                      <td className="py-3 px-4 text-gray-300">{result.score}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                          result.placement === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                          result.placement === 2 ? 'bg-gray-400/20 text-gray-300' :
                          result.placement === 3 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-slate-600 text-gray-300'
                        }`}>
                          {result.placement}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-orange-500 font-semibold">{result.points_earned}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {result.event?.id && (
                          <button
                            onClick={() => setExpandedRatingEventId(
                              expandedRatingEventId === result.event?.id ? null : result.event?.id || null
                            )}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                              expandedRatingEventId === result.event?.id
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                            }`}
                          >
                            <Star className="h-4 w-4" />
                            Rate
                          </button>
                        )}
                      </td>
                    </tr>
                    {/* Expanded Rating Panel */}
                    {expandedRatingEventId === result.event?.id && result.event && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <div className="bg-slate-700/50 p-4 border-b border-slate-600">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-white font-semibold flex items-center gap-2">
                                <Star className="h-5 w-5 text-yellow-500" />
                                Rate Staff for {result.event.title}
                              </h4>
                              <button
                                onClick={() => setExpandedRatingEventId(null)}
                                className="text-gray-400 hover:text-white"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                            <EventRatingsPanel
                              eventId={result.event.id}
                              eventName={result.event.title}
                              onRatingSubmitted={() => {
                                // Optionally refresh or show success message
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : results.length > 0 ? (
          <div className="text-center py-12">
            <Filter className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No results match the selected filters</p>
            <button
              onClick={() => setResultsFilters({ seasonId: '', state: '' })}
              className="mt-4 text-orange-400 hover:text-orange-300"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No competition results yet</p>
          </div>
        )}
      </div>
    );
  };

  const renderAnalytics = () => {
    // Get unique states from results for filter dropdown
    const availableStates = [...new Set(
      results
        .map(r => r.event?.venue_state)
        .filter((s): s is string => !!s)
    )].sort();

    // Apply filters to results
    const filteredResults = results.filter(r => {
      // Season filter
      if (analyticsFilters.seasonId && r.season_id !== analyticsFilters.seasonId) {
        return false;
      }
      // State filter
      if (analyticsFilters.state && r.event?.venue_state !== analyticsFilters.state) {
        return false;
      }
      return true;
    });

    // Helper to detect format from result - checks multiple fields
    const getResultFormat = (r: CompetitionResult): string => {
      // Check direct format field first (may exist on some results)
      if ((r as any).format) return (r as any).format;

      // Check class.format (from joined CompetitionClass)
      if (r.class?.format) return r.class.format;

      // Check event.format
      if (r.event?.format) return r.event.format;

      // Try to extract from competition_class string (e.g., "SPL Street", "SQL Amateur")
      const classStr = (r.competition_class || '').toUpperCase();
      if (classStr.includes('SPL')) return 'SPL';
      if (classStr.includes('SQL') || classStr.includes('SQ')) return 'SQL';
      if (classStr.includes('SHOW') || classStr.includes('SHINE')) return 'Show and Shine';
      if (classStr.includes('RIDE') || classStr.includes('LIGHT')) return 'Ride the Light';

      // Default to SPL if we can't determine (most common format)
      return 'SPL';
    };

    // Calculate format/category stats from filtered results data
    const formatStats = filteredResults.reduce((acc, r) => {
      const format = getResultFormat(r);
      if (!acc[format]) {
        acc[format] = { count: 0, points: 0, totalPoints: 0, scores: [] as number[], pointsHistory: [] as number[], bestScore: 0, wins: 0 };
      }
      acc[format].count++;
      acc[format].points += r.points_earned || 0;
      acc[format].totalPoints += r.points_earned || 0;
      acc[format].scores.push(r.score || 0);
      acc[format].pointsHistory.push(r.points_earned || 0);
      acc[format].bestScore = Math.max(acc[format].bestScore, r.score || 0);
      if (r.placement === 1) acc[format].wins++;
      return acc;
    }, {} as Record<string, { count: number; points: number; totalPoints: number; scores: number[]; pointsHistory: number[]; bestScore: number; wins: number }>);

    const placementBreakdown = {
      first: filteredResults.filter(r => r.placement === 1).length,
      second: filteredResults.filter(r => r.placement === 2).length,
      third: filteredResults.filter(r => r.placement === 3).length,
      other: filteredResults.filter(r => r.placement > 3).length,
    };

    // Chart colors
    const CHART_COLORS = {
      primary: '#f97316', // orange-500
      secondary: '#3b82f6', // blue-500
      yellow: '#eab308', // yellow-500
      red: '#ef4444', // red-500
      green: '#22c55e', // green-500
      gray: '#6b7280', // gray-500
      cyan: '#06b6d4', // cyan-500
    };

    const PLACEMENT_COLORS = ['#eab308', '#ef4444', '#3b82f6', '#6b7280'];

    // Get results by format for charts (only formats with actual data)
    const getFormatChartData = (formatName: string) => {
      const formatResults = filteredResults
        .filter(r => getResultFormat(r) === formatName)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .slice(-12);

      return formatResults.map((r, index) => ({
        name: `#${index + 1}`,
        score: r.score || 0,
        points: r.points_earned || 0,
        event: r.event?.title || `Event ${index + 1}`,
      }));
    };

    // Calculate placement stats
    const totalPlacements = placementBreakdown.first + placementBreakdown.second + placementBreakdown.third + placementBreakdown.other;
    const winRate = totalPlacements > 0 ? ((placementBreakdown.first / totalPlacements) * 100).toFixed(0) : '0';
    const placedRate = totalPlacements > 0 ? (((placementBreakdown.first + placementBreakdown.second + placementBreakdown.third) / totalPlacements) * 100).toFixed(0) : '0';

    const placementChartData = [
      { name: '1st', value: placementBreakdown.first },
      { name: '2nd', value: placementBreakdown.second },
      { name: '3rd', value: placementBreakdown.third },
      { name: 'Other', value: placementBreakdown.other },
    ].filter(d => d.value > 0);

    // Calculate trends for each format
    const getTrend = (scores: number[]) => {
      if (scores.length < 2) return 'neutral';
      const recent = scores.slice(-3);
      const earlier = scores.slice(-6, -3);
      if (earlier.length === 0) return 'neutral';
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
      if (recentAvg > earlierAvg * 1.02) return 'up';
      if (recentAvg < earlierAvg * 0.98) return 'down';
      return 'neutral';
    };

    // Custom tooltip for bar charts
    const CustomBarTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-slate-700 border border-slate-600 rounded-lg p-3 shadow-lg">
            <p className="text-white font-medium">{payload[0]?.payload?.event}</p>
            <p className="text-orange-400">Score: {payload[0]?.value}</p>
          </div>
        );
      }
      return null;
    };

    // Get formats that have actual results (show all formats with data)
    const formatsWithData = Object.keys(formatStats).filter(f => formatStats[f].count > 0);

    return (
      <div className="space-y-6">
        {/* Analytics Filters */}
        <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <span className="text-gray-300 font-medium">Filters:</span>
            </div>
            <select
              value={analyticsFilters.seasonId}
              onChange={(e) => setAnalyticsFilters({ ...analyticsFilters, seasonId: e.target.value })}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">All Seasons</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
            <select
              value={analyticsFilters.state}
              onChange={(e) => setAnalyticsFilters({ ...analyticsFilters, state: e.target.value })}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">All States</option>
              {availableStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            {(analyticsFilters.seasonId || analyticsFilters.state) && (
              <button
                onClick={() => setAnalyticsFilters({ seasonId: '', state: '' })}
                className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            )}
            <span className="text-gray-500 text-sm ml-auto">
              {filteredResults.length} of {results.length} results
            </span>
          </div>
        </div>

        {/* Summary Stats (filtered) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg text-center">
            <p className="text-3xl font-bold text-white mb-1">{filteredResults.length}</p>
            <p className="text-gray-400 text-sm">Results</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg text-center">
            <p className="text-3xl font-bold text-orange-500 mb-1">
              {filteredResults.reduce((sum, r) => sum + (r.points_earned || 0), 0)}
            </p>
            <p className="text-gray-400 text-sm">Total Points</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg text-center">
            <p className="text-3xl font-bold text-yellow-400 mb-1">{placementBreakdown.first}</p>
            <p className="text-gray-400 text-sm">1st Place Finishes</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg text-center">
            <p className="text-3xl font-bold text-green-400 mb-1">
              {filteredResults.length > 0
                ? `#${Math.min(...filteredResults.map(r => r.placement).filter(p => p > 0))}`
                : 'N/A'}
            </p>
            <p className="text-gray-400 text-sm">Best Placement</p>
          </div>
        </div>

        {/* Original Placement Breakdown */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-white mb-4">Placement Breakdown</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center mb-2">
                <span className="text-2xl">🥇</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400">{placementBreakdown.first}</p>
              <p className="text-gray-400 text-sm">1st Place</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-400/20 flex items-center justify-center mb-2">
                <span className="text-2xl">🥈</span>
              </div>
              <p className="text-2xl font-bold text-gray-300">{placementBreakdown.second}</p>
              <p className="text-gray-400 text-sm">2nd Place</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/20 flex items-center justify-center mb-2">
                <span className="text-2xl">🥉</span>
              </div>
              <p className="text-2xl font-bold text-orange-400">{placementBreakdown.third}</p>
              <p className="text-gray-400 text-sm">3rd Place</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-600/50 flex items-center justify-center mb-2">
                <Trophy className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-300">{placementBreakdown.other}</p>
              <p className="text-gray-400 text-sm">Other</p>
            </div>
          </div>
        </div>

        {/* Original Points by Format */}
        {Object.keys(formatStats).length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4">Points by Format</h3>
            <div className="space-y-4">
              {Object.entries(formatStats).map(([format, data]) => (
                <div key={format} className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{format}</p>
                    <p className="text-gray-400 text-sm">{data.count} events</p>
                  </div>
                  <div className="text-right">
                    <p className="text-orange-500 font-bold text-xl">{data.points}</p>
                    <p className="text-gray-400 text-sm">points</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NEW: Performance Summary Charts Section - Only show if there are results */}
        {results.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6">Performance Summary</h2>

            <div className={`grid grid-cols-1 gap-6 ${formatsWithData.length > 0 ? 'lg:grid-cols-' + Math.min(formatsWithData.length + 1, 3) : ''}`}>
              {/* Dynamic format charts - only show formats the user has competed in */}
              {formatsWithData.map((format) => {
                const chartData = getFormatChartData(format);
                const stats = formatStats[format];
                const avgScore = stats.count > 0 ? (stats.scores.reduce((a, b) => a + b, 0) / stats.count).toFixed(1) : '0';
                const isSPL = format.toUpperCase().includes('SPL');

                if (chartData.length === 0) return null;

                return (
                  <div key={format} className="bg-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">{format} Performance</h3>
                      <span className="text-sm text-cyan-400">{stats.count} Events</span>
                    </div>

                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                          <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                          <Tooltip content={<CustomBarTooltip />} />
                          <Bar dataKey="score" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex justify-between mt-4 text-sm">
                      <div>
                        <span className="text-gray-400">Avg: </span>
                        <span className="text-white font-semibold">{avgScore}{isSPL ? ' dB' : ''}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Best: </span>
                        <span className="text-orange-400 font-semibold">{stats.bestScore.toFixed(1)}{isSPL ? ' dB' : ''}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Placements Donut Chart */}
              {placementChartData.length > 0 && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Placements</h3>
                    <span className="text-sm text-cyan-400">{totalPlacements} Total</span>
                  </div>

                  <div className="h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={placementChartData}
                          cx="40%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {placementChartData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={PLACEMENT_COLORS[index % PLACEMENT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#334155', border: 'none', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <div className="absolute left-[40%] top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-white">{totalPlacements}</span>
                    </div>
                    {/* Legend */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.yellow }}></div>
                        <span className="text-gray-300">1st: {placementBreakdown.first}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.red }}></div>
                        <span className="text-gray-300">2nd: {placementBreakdown.second}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.secondary }}></div>
                        <span className="text-gray-300">3rd: {placementBreakdown.third}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.gray }}></div>
                        <span className="text-gray-300">Other: {placementBreakdown.other}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between mt-4 text-sm">
                    <div>
                      <span className="text-gray-400">Win Rate: </span>
                      <span className="text-white font-semibold">{winRate}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Placed: </span>
                      <span className="text-orange-400 font-semibold">{placedRate}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NEW: Performance by Format Table */}
        {formatsWithData.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6">Performance by Format</h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm uppercase tracking-wider">Format</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm uppercase tracking-wider">Events</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm uppercase tracking-wider">Avg Score</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm uppercase tracking-wider">Best Score</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm uppercase tracking-wider">Wins</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium text-sm uppercase tracking-wider">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {formatsWithData.map((format) => {
                    const data = formatStats[format];
                    const avgScore = data.count > 0 ? (data.scores.reduce((a, b) => a + b, 0) / data.count).toFixed(1) : '0';
                    const trend = getTrend(data.scores);
                    const isSPL = format.toUpperCase().includes('SPL');

                    return (
                      <tr key={format} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                            {format}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center text-white">{data.count}</td>
                        <td className="py-4 px-4 text-center text-white">
                          {avgScore}{isSPL ? ' dB' : ''}
                        </td>
                        <td className="py-4 px-4 text-center text-orange-400 font-semibold">
                          {data.bestScore.toFixed(1)}{isSPL ? ' dB' : ''}
                        </td>
                        <td className="py-4 px-4 text-center text-white">{data.wins}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* Mini trend sparkline */}
                            <div className="w-16 h-4 flex items-end gap-0.5">
                              {data.scores.slice(-6).map((score, idx) => {
                                const maxScore = Math.max(...data.scores.slice(-6));
                                const height = maxScore > 0 ? (score / maxScore) * 100 : 0;
                                return (
                                  <div
                                    key={idx}
                                    className={`flex-1 rounded-t ${trend === 'up' ? 'bg-green-500' : trend === 'down' ? 'bg-red-500' : 'bg-blue-500'}`}
                                    style={{ height: `${Math.max(height, 10)}%` }}
                                  />
                                );
                              })}
                            </div>
                            {/* Trend arrow */}
                            {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                            {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                            {trend === 'neutral' && <Minus className="h-4 w-4 text-gray-500" />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* NEW: Points Progress Line Chart - Only show if there are enough results */}
        {filteredResults.length > 2 && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6">Points Progress</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredResults
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .slice(-20)
                  .map((r, index) => ({
                    name: `${index + 1}`,
                    points: r.points_earned || 0,
                  }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#334155', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="points"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.primary, strokeWidth: 2 }}
                    name="Points Earned"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* NEW: SPL Score Progress Line Chart - Only show if there are SPL results */}
        {formatStats['SPL'] && formatStats['SPL'].count > 2 && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6">SPL Score Progress</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredResults
                  .filter(r => getResultFormat(r) === 'SPL')
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .slice(-20)
                  .map((r, index) => ({
                    name: `${index + 1}`,
                    score: r.score || 0,
                    event: r.event?.title || `Competition ${index + 1}`,
                  }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#334155', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number) => [`${value.toFixed(1)} dB`, 'Score']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.event || `Competition ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={CHART_COLORS.secondary}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.secondary, strokeWidth: 2 }}
                    name="SPL Score (dB)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Wattage Progress Line Chart */}
        {filteredResults.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6">Wattage Progress</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredResults
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .slice(-20)
                  .map((r, index) => ({
                    name: `${index + 1}`,
                    wattage: r.wattage || 0,
                    event: r.event?.title || `Competition ${index + 1}`,
                  }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#334155', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number) => [`${value.toLocaleString()} W`, 'Wattage']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.event || `Competition ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="wattage"
                    stroke={CHART_COLORS.green}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.green, strokeWidth: 2 }}
                    name="Power (Watts)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Frequency Progress Line Chart */}
        {filteredResults.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6">Frequency Progress</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredResults
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .slice(-20)
                  .map((r, index) => ({
                    name: `${index + 1}`,
                    frequency: r.frequency || 0,
                    event: r.event?.title || `Competition ${index + 1}`,
                  }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#334155', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number) => [`${value} Hz`, 'Frequency']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.event || `Competition ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="frequency"
                    stroke={CHART_COLORS.yellow}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.yellow, strokeWidth: 2 }}
                    name="Frequency (Hz)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {results.length === 0 && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg text-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Analytics will appear once you have competition results</p>
          </div>
        )}

        {results.length > 0 && filteredResults.length === 0 && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg text-center py-12">
            <Filter className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No results match the selected filters</p>
            <button
              onClick={() => setAnalyticsFilters({ seasonId: '', state: '' })}
              className="mt-4 text-orange-400 hover:text-orange-300"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hidden file input for profile image upload */}
        <input
          type="file"
          ref={profileImageInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleUploadProfileImage}
        />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div
              onClick={() => setShowProfileImageSelector(true)}
              className="relative group cursor-pointer"
              title="Click to change profile picture"
            >
              {(profile.profile_picture_url || (profile.profile_images && profile.profile_images.length > 0)) ? (
                <img
                  src={profile.profile_picture_url || profile.profile_images?.[0]}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border-2 border-orange-500 group-hover:opacity-80 transition-opacity"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                  <User className="h-8 w-8 text-orange-500" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">My MECA</h1>
              <p className="text-gray-400">Welcome back, {`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {profile?.meca_id && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 rounded-lg">
                <span className="text-gray-400 text-sm">MECA ID:</span>
                <span className="text-orange-500 font-mono font-semibold">{profile.meca_id}</span>
              </div>
            )}
            {activeMembership?.membershipTypeConfig?.category && (
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${
                activeMembership.membershipTypeConfig.category === 'competitor' ? 'bg-blue-500/10 text-blue-400' :
                activeMembership.membershipTypeConfig.category === 'retail' ? 'bg-green-500/10 text-green-400' :
                activeMembership.membershipTypeConfig.category === 'manufacturer' ? 'bg-purple-500/10 text-purple-400' :
                activeMembership.membershipTypeConfig.category === 'team' ? 'bg-cyan-500/10 text-cyan-400' :
                'bg-gray-500/10 text-gray-400'
              }`}>
                <span className="font-semibold capitalize">
                  {activeMembership.membershipTypeConfig.category === 'retail' ? 'Retailer' :
                   activeMembership.membershipTypeConfig.category}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex space-x-2 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-800 text-gray-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {renderContent()}

        {/* Request Details Modal */}
        {showRequestModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">{selectedRequest.eventName}</h3>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setSelectedRequest(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3">Request Details</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300">
                      <span className="text-gray-400">Event Type:</span> {selectedRequest.eventType}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-400">Submitted:</span> {formatDate(selectedRequest.createdAt)}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-400">Status:</span>{' '}
                      <span className="capitalize">{selectedRequest.status.replace('_', ' ')}</span>
                    </p>
                  </div>
                </div>

                {selectedRequest.adminResponse && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                      Admin Response
                    </h4>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap mb-2">
                      {selectedRequest.adminResponse}
                    </p>
                    {selectedRequest.adminResponseDate && (
                      <p className="text-gray-400 text-xs">
                        Responded on {formatDate(selectedRequest.adminResponseDate)}
                      </p>
                    )}
                  </div>
                )}

                {!selectedRequest.adminResponse && selectedRequest.status === 'pending' && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <p className="text-yellow-400 text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Your request is pending review. We'll contact you soon!
                    </p>
                  </div>
                )}

                {!selectedRequest.adminResponse && selectedRequest.status === 'under_review' && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-blue-400 text-sm flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Your request is currently under review by our team.
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowRequestModal(false);
                      setSelectedRequest(null);
                    }}
                    className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Image Selector Modal */}
        {showProfileImageSelector && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Choose Profile Picture</h3>
                <button
                  onClick={() => setShowProfileImageSelector(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {updatingProfileImage && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                  <span className="text-white ml-3">Updating profile picture...</span>
                </div>
              )}

              {!updatingProfileImage && (
                <>
                  {/* Upload new image */}
                  <div className="mb-6">
                    <button
                      onClick={() => profileImageInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      <Upload className="h-5 w-5" />
                      Upload New Photo
                    </button>
                  </div>

                  {/* Existing images */}
                  {profile?.profile_images && profile.profile_images.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-sm mb-3">Or select from your gallery:</p>
                      <div className="grid grid-cols-3 gap-3">
                        {profile.profile_images.map((imageUrl, index) => (
                          <button
                            key={index}
                            onClick={() => handleSelectProfileImage(imageUrl)}
                            className={`aspect-square rounded-lg overflow-hidden bg-slate-700 hover:ring-2 hover:ring-orange-500 transition-all ${
                              profile.profile_picture_url === imageUrl ? 'ring-2 ring-orange-500' : ''
                            }`}
                          >
                            <img
                              src={imageUrl}
                              alt={`Profile option ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!profile?.profile_images || profile.profile_images.length === 0) && (
                    <div className="text-center py-4">
                      <Image className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No images in your gallery yet.</p>
                      <p className="text-gray-500 text-xs mt-1">Upload a photo to get started!</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Cancel Membership Modal */}
        <MemberCancelMembershipModal
          isOpen={showCancelMembershipModal}
          onClose={() => setShowCancelMembershipModal(false)}
          onSuccess={() => {
            setShowCancelMembershipModal(false);
            // Refresh membership data
            fetchActiveMembership();
          }}
          membershipId={activeMembership?.id || ''}
          membershipType={activeMembership?.membershipTypeConfig?.name || 'Membership'}
          endDate={activeMembership?.endDate}
        />

        {/* Disable Auto-Renewal Modal */}
        {showDisableAutoRenewalModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Disable Auto-Renewal</h3>
                <button
                  onClick={() => {
                    setShowDisableAutoRenewalModal(false);
                    setDisableAutoRenewalReason('');
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-gray-300 text-sm">
                    Your membership will remain active until <strong className="text-white">
                      {activeMembership?.endDate
                        ? new Date(activeMembership.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                        : 'the end of your billing period'}
                    </strong>, but you will not be charged again.
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Reason for disabling (optional)
                  </label>
                  <textarea
                    value={disableAutoRenewalReason}
                    onChange={(e) => setDisableAutoRenewalReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-orange-500 focus:outline-none resize-none"
                    rows={3}
                    placeholder="Help us understand why you're disabling auto-renewal..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDisableAutoRenewalModal(false);
                      setDisableAutoRenewalReason('');
                    }}
                    className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                    disabled={disableAutoRenewalLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDisableAutoRenewal}
                    disabled={disableAutoRenewalLoading}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {disableAutoRenewalLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Disable Auto-Renewal'
                    )}
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
