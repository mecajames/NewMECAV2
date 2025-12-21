import axios from 'axios';

// Team member roles
export type TeamMemberRole = 'owner' | 'co_owner' | 'moderator' | 'member';

// Team member status (for join request/invite workflow)
export type TeamMemberStatus = 'active' | 'pending_approval' | 'pending_invite' | 'pending_renewal' | 'inactive';

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  joinedAt?: string;
  requestedAt?: string;
  requestMessage?: string;
  user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    meca_id?: string;
    profile_picture_url?: string;
    email?: string;
    membership_status?: string;
  };
}

export type TeamType = 'competitive' | 'casual' | 'shop' | 'club';

export interface Team {
  id: string;
  name: string;
  description?: string;
  bio?: string; // Detailed bio/about section for team profile
  logoUrl?: string;
  captainId: string; // Keep for backward compat - this is the owner ID
  seasonId?: string;
  teamType: TeamType;
  location?: string;
  maxMembers: number;
  website?: string;
  isPublic: boolean;
  requiresApproval: boolean;
  galleryImages?: string[];
  coverImagePosition?: { x: number; y: number };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // New field - owner info (replaces captain)
  owner?: {
    id: string;
    first_name?: string;
    last_name?: string;
    meca_id?: string;
    profile_picture_url?: string;
    email?: string;
  };
  // Keep for backward compatibility
  captain?: {
    id: string;
    first_name?: string;
    last_name?: string;
    meca_id?: string;
    profile_picture_url?: string;
    email?: string;
  };
  members?: TeamMember[];
  // Pending requests (only visible to owner/co-owner)
  pendingRequests?: TeamMember[];
  // Pending invites (only visible to owner/co-owner)
  pendingInvites?: TeamMember[];
}

// Member lookup result for inviting by MECA ID
export interface MemberLookupResult {
  found: boolean;
  message?: string;
  member?: {
    id: string;
    first_name?: string;
    last_name?: string;
    meca_id?: string;
    profile_picture_url?: string;
    membership_status?: string;
    canInvite: boolean;
    reason?: string;
  };
}

// Pending invite with team info
export interface PendingInvite extends TeamMember {
  team?: Team;
}

// Pending request with team info
export interface PendingRequest extends TeamMember {
  team?: Team;
}

export interface CreateTeamDto {
  name: string;
  description?: string;
  bio?: string;
  logo_url?: string;
  season_id?: string;
  team_type?: TeamType;
  location?: string;
  max_members?: number;
  website?: string;
  is_public?: boolean;
  requires_approval?: boolean;
  gallery_images?: string[];
}

export interface UpdateTeamDto {
  name?: string;
  description?: string;
  bio?: string;
  logo_url?: string | null;
  team_type?: TeamType;
  location?: string;
  max_members?: number;
  website?: string;
  is_public?: boolean;
  requires_approval?: boolean;
  gallery_images?: string[];
}

export interface UpgradeEligibilityResponse {
  canUpgrade: boolean;
  hasCompetitorMembership: boolean;
  hasTeamMembership: boolean;
  reason?: string;
}

export interface CanCreateTeamResponse {
  canCreate: boolean;
  reason?: string;
}

export interface TeamPublicStats {
  topSplScores: Array<{ competitorName: string; score: number; eventName?: string; date?: string; placement: number }>;
  topSqScores: Array<{ competitorName: string; score: number; eventName?: string; date?: string; placement: number }>;
  totalEventsAttended: number;
  recentEvents: Array<{ id: string; name: string; date: string; location?: string; membersAttended: number }>;
  totalFirstPlace: number;
  totalSecondPlace: number;
  totalThirdPlace: number;
  totalCompetitions: number;
  totalPoints: number;
}

export const teamsApi = {
  // ============================================
  // PUBLIC ENDPOINTS (No auth required)
  // ============================================

  // Get all public teams for directory listing
  getPublicTeams: async (): Promise<Team[]> => {
    const response = await axios.get('/api/teams/public');
    return response.data;
  },

  // Get a public team by ID
  getPublicTeamById: async (id: string): Promise<Team | null> => {
    try {
      const response = await axios.get(`/api/teams/public/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Get public stats for a team (optionally filtered by season)
  getTeamPublicStats: async (id: string, seasonId?: string): Promise<TeamPublicStats> => {
    const params = seasonId ? `?seasonId=${seasonId}` : '';
    const response = await axios.get(`/api/teams/public/${id}/stats${params}`);
    return response.data;
  },

  // ============================================
  // AUTHENTICATED ENDPOINTS
  // ============================================

  // Check if user can create a team (has team membership)
  canCreateTeam: async (): Promise<CanCreateTeamResponse> => {
    try {
      const response = await axios.get('/api/teams/can-create');
      return response.data;
    } catch {
      return { canCreate: false, reason: 'Unable to check eligibility' };
    }
  },

  // Check if user can upgrade to team membership (has competitor but not team membership)
  canUpgradeToTeam: async (): Promise<UpgradeEligibilityResponse> => {
    try {
      const response = await axios.get('/api/teams/can-upgrade');
      return response.data;
    } catch {
      return {
        canUpgrade: false,
        hasCompetitorMembership: false,
        hasTeamMembership: false,
        reason: 'Unable to check eligibility',
      };
    }
  },

  // Get all active teams
  getAllTeams: async (): Promise<Team[]> => {
    const response = await axios.get('/api/teams');
    return response.data;
  },

  // Get a specific team by ID
  getTeam: async (id: string): Promise<Team> => {
    const response = await axios.get(`/api/teams/${id}`);
    return response.data;
  },

  // Get the current user's team
  getMyTeam: async (): Promise<Team | null> => {
    try {
      const response = await axios.get('/api/teams/my-team');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Get a team by user ID
  getTeamByUserId: async (userId: string): Promise<Team | null> => {
    try {
      const response = await axios.get(`/api/teams/user/${userId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Create a new team
  createTeam: async (data: CreateTeamDto): Promise<Team> => {
    const response = await axios.post('/api/teams', data);
    return response.data;
  },

  // Update a team
  updateTeam: async (id: string, data: UpdateTeamDto): Promise<Team> => {
    const response = await axios.put(`/api/teams/${id}`, data);
    return response.data;
  },

  // Update team cover image position
  updateCoverImagePosition: async (id: string, position: { x: number; y: number }): Promise<Team> => {
    const response = await axios.put(`/api/teams/${id}`, { cover_image_position: position });
    return response.data;
  },

  // Delete a team
  deleteTeam: async (id: string): Promise<void> => {
    await axios.delete(`/api/teams/${id}`);
  },

  // Add a member to a team
  addMember: async (teamId: string, userId: string): Promise<TeamMember> => {
    const response = await axios.post(`/api/teams/${teamId}/members`, { user_id: userId });
    return response.data;
  },

  // Remove a member from a team
  removeMember: async (teamId: string, userId: string): Promise<void> => {
    await axios.delete(`/api/teams/${teamId}/members/${userId}`);
  },

  // Update a member's role
  updateMemberRole: async (teamId: string, userId: string, role: TeamMemberRole): Promise<TeamMember> => {
    const response = await axios.patch(`/api/teams/${teamId}/members/${userId}/role`, { role });
    return response.data;
  },

  // Transfer ownership to another member
  transferOwnership: async (teamId: string, newOwnerId: string): Promise<Team> => {
    const response = await axios.put(`/api/teams/${teamId}/transfer-ownership`, {
      new_owner_id: newOwnerId,
    });
    return response.data;
  },

  // Transfer captaincy to another member (backward compat alias)
  transferCaptaincy: async (teamId: string, newCaptainId: string): Promise<Team> => {
    const response = await axios.put(`/api/teams/${teamId}/transfer-captaincy`, {
      new_captain_id: newCaptainId,
    });
    return response.data;
  },

  // Leave the current team
  leaveTeam: async (): Promise<void> => {
    await axios.post('/api/teams/leave');
  },

  // ============================================
  // INVITE SYSTEM
  // ============================================

  // Lookup member by MECA ID for invite preview
  lookupMemberByMecaId: async (mecaId: string): Promise<MemberLookupResult> => {
    const response = await axios.post('/api/teams/lookup-member', { meca_id: mecaId });
    return response.data;
  },

  // Invite a member to the team
  inviteMember: async (teamId: string, userId: string, message?: string): Promise<TeamMember> => {
    const response = await axios.post(`/api/teams/${teamId}/invite`, { user_id: userId, message });
    return response.data;
  },

  // Cancel a sent invite
  cancelInvite: async (teamId: string, userId: string): Promise<void> => {
    await axios.delete(`/api/teams/${teamId}/invite/${userId}`);
  },

  // Get my pending invites
  getMyPendingInvites: async (): Promise<PendingInvite[]> => {
    const response = await axios.get('/api/teams/my-invites');
    return response.data;
  },

  // Accept an invite
  acceptInvite: async (teamId: string): Promise<TeamMember> => {
    const response = await axios.post(`/api/teams/${teamId}/accept-invite`);
    return response.data;
  },

  // Decline an invite
  declineInvite: async (teamId: string): Promise<void> => {
    await axios.post(`/api/teams/${teamId}/decline-invite`);
  },

  // ============================================
  // JOIN REQUEST SYSTEM
  // ============================================

  // Request to join a team
  requestToJoin: async (teamId: string, message?: string): Promise<TeamMember> => {
    const response = await axios.post(`/api/teams/${teamId}/request-join`, { message });
    return response.data;
  },

  // Cancel my join request
  cancelJoinRequest: async (teamId: string): Promise<void> => {
    await axios.delete(`/api/teams/${teamId}/request-join`);
  },

  // Get my pending join requests
  getMyPendingRequests: async (): Promise<PendingRequest[]> => {
    const response = await axios.get('/api/teams/my-requests');
    return response.data;
  },

  // Approve a join request (owner/co-owner)
  approveJoinRequest: async (teamId: string, userId: string): Promise<TeamMember> => {
    const response = await axios.post(`/api/teams/${teamId}/approve-request/${userId}`);
    return response.data;
  },

  // Reject a join request (owner/co-owner)
  rejectJoinRequest: async (teamId: string, userId: string): Promise<void> => {
    await axios.delete(`/api/teams/${teamId}/reject-request/${userId}`);
  },
};
