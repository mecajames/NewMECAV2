import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { MembershipCategory, PaymentStatus, RegistrationStatus } from '@newmeca/shared';
import { Team } from './team.entity';
import { TeamMember, TeamMemberRole, TeamMemberStatus } from './team-member.entity';
import { Profile } from '../profiles/profiles.entity';
import { Membership } from '../memberships/memberships.entity';
import { CompetitionResult } from '../competition-results/competition-results.entity';
import { EventRegistration } from '../event-registrations/event-registrations.entity';
import { Event } from '../events/events.entity';

interface MemberWithUser extends TeamMember {
  user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    meca_id?: string;
    profile_picture_url?: string | null;
    email?: string;
    membership_status?: string;
  };
}

interface TeamWithMembers extends Team {
  owner?: Partial<Profile>;
  members?: MemberWithUser[];
  pendingRequests?: MemberWithUser[];
  pendingInvites?: MemberWithUser[];
}

// Valid team member roles
const VALID_ROLES: TeamMemberRole[] = ['owner', 'co_owner', 'moderator', 'member'];

// Roles that can manage team settings (edit team info)
const TEAM_MANAGEMENT_ROLES: TeamMemberRole[] = ['owner', 'co_owner'];

// Roles that can manage members (add/remove)
const MEMBER_MANAGEMENT_ROLES: TeamMemberRole[] = ['owner', 'co_owner', 'moderator'];

// Roles that can change other members' roles
const ROLE_MANAGEMENT_ROLES: TeamMemberRole[] = ['owner', 'co_owner'];

/**
 * Sanitize team name by removing any variant of "team" from the name.
 * Handles common leetspeak variants: t/T, e/E/3, a/A/4/@, m/M
 * Examples: "Team LowerHz" -> "LowerHz", "LowerHz T3am" -> "LowerHz"
 */
function sanitizeTeamName(name: string): string {
  // Regex pattern to match "team" and common leetspeak variants
  // t/T, e/E/3, a/A/4/@, m/M
  const teamPattern = /[tT][eE3][aA4@][mM]/gi;
  return name
    .replace(teamPattern, '')  // Remove "team" variants
    .replace(/\s+/g, ' ')      // Collapse multiple spaces
    .trim();
}

@Injectable()
export class TeamsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // Helper to build member with user data
  private async buildMemberWithUser(em: EntityManager, member: TeamMember): Promise<MemberWithUser> {
    const user = await em.findOne(Profile, { id: member.userId });
    return {
      ...member,
      user: user ? {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        meca_id: user.meca_id,
        // Use profile_picture_url if set, otherwise use first image from profile_images
        profile_picture_url: user.profile_picture_url || user.profile_images?.[0] || undefined,
        email: user.email,
        membership_status: user.membership_status,
      } : undefined,
    } as MemberWithUser;
  }

  async findAll(): Promise<TeamWithMembers[]> {
    const em = this.em.fork();
    const teams = await em.find(Team, { isActive: true }, {
      orderBy: { name: 'ASC' },
    });

    // Fetch owners and members for each team
    const teamsWithDetails = await Promise.all(
      teams.map(async (team) => {
        const owner = await em.findOne(Profile, { id: team.captainId });
        // Only fetch active members for public listing
        const members = await em.find(TeamMember, { teamId: team.id, status: 'active' });

        const membersWithUsers = await Promise.all(
          members.map(m => this.buildMemberWithUser(em, m))
        );

        return {
          ...team,
          owner: owner ? {
            id: owner.id,
            first_name: owner.first_name,
            last_name: owner.last_name,
            meca_id: owner.meca_id,
            profile_picture_url: owner.profile_picture_url || owner.profile_images?.[0] || undefined,
          } : undefined,
          members: membersWithUsers,
        };
      })
    );

    return teamsWithDetails;
  }

  async findById(id: string, requesterId?: string): Promise<TeamWithMembers> {
    const em = this.em.fork();
    const team = await em.findOne(Team, { id });
    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    const owner = await em.findOne(Profile, { id: team.captainId });

    // Get active members only
    const activeMembers = await em.find(TeamMember, { teamId: team.id, status: 'active' });
    const membersWithUsers = await Promise.all(
      activeMembers.map(m => this.buildMemberWithUser(em, m))
    );

    const result: TeamWithMembers = {
      ...team,
      owner: owner ? {
        id: owner.id,
        first_name: owner.first_name,
        last_name: owner.last_name,
        meca_id: owner.meca_id,
        profile_picture_url: owner.profile_picture_url || owner.profile_images?.[0] || undefined,
        email: owner.email,
      } : undefined,
      members: membersWithUsers,
    };

    // If requester is owner/co-owner, also include pending requests and invites
    if (requesterId) {
      const requesterRole = await this.getUserTeamRole(em, id, requesterId);
      const requester = await em.findOne(Profile, { id: requesterId });
      const isAdmin = requester?.role === 'admin';

      if (requesterRole === 'owner' || requesterRole === 'co_owner' || isAdmin) {
        const pendingRequests = await em.find(TeamMember, { teamId: team.id, status: 'pending_approval' });
        const pendingInvites = await em.find(TeamMember, { teamId: team.id, status: 'pending_invite' });

        result.pendingRequests = await Promise.all(
          pendingRequests.map(m => this.buildMemberWithUser(em, m))
        );
        result.pendingInvites = await Promise.all(
          pendingInvites.map(m => this.buildMemberWithUser(em, m))
        );
      }
    }

    return result;
  }

  // Helper to get a user's role in a team
  private async getUserTeamRole(em: EntityManager, teamId: string, userId: string): Promise<TeamMemberRole | null> {
    const membership = await em.findOne(TeamMember, { teamId, userId });
    return membership?.role || null;
  }

  // Helper to check if user has permission for an action
  private async checkTeamPermission(
    em: EntityManager,
    teamId: string,
    userId: string,
    allowedRoles: TeamMemberRole[],
    errorMessage: string
  ): Promise<TeamMemberRole> {
    const role = await this.getUserTeamRole(em, teamId, userId);

    // Also check if user is admin
    const requester = await em.findOne(Profile, { id: userId });
    if (requester?.role === 'admin') {
      return 'owner'; // Admins have owner-level access
    }

    if (!role || !allowedRoles.includes(role)) {
      throw new ForbiddenException(errorMessage);
    }
    return role;
  }

  async findByUserId(userId: string): Promise<TeamWithMembers | null> {
    const em = this.em.fork();

    // Find active team membership for the user
    const membership = await em.findOne(TeamMember, { userId, status: 'active' });
    if (!membership) {
      // Check if user is an owner (captainId on team)
      const teamAsOwner = await em.findOne(Team, { captainId: userId, isActive: true });
      if (teamAsOwner) {
        return this.findById(teamAsOwner.id, userId);
      }
      return null;
    }

    return this.findById(membership.teamId, userId);
  }

  // Check if a user has an active team membership (required to create a team)
  async hasTeamMembership(userId: string): Promise<boolean> {
    const em = this.em.fork();

    // Check for active team membership - NO admin bypass here
    // Admins must also have a team membership to create teams
    const now = new Date();
    const teamMembership = await em.findOne(Membership, {
      user: userId,
      paymentStatus: PaymentStatus.PAID,
      membershipTypeConfig: { category: MembershipCategory.TEAM },
      $and: [
        { startDate: { $lte: now } },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
      ],
    }, { populate: ['membershipTypeConfig'] });

    return !!teamMembership;
  }

  // Check if a user has an active competitor membership
  async hasCompetitorMembership(userId: string): Promise<boolean> {
    const em = this.em.fork();

    const now = new Date();
    // Competitor memberships have the COMPETITOR category in their config
    const competitorMembership = await em.findOne(Membership, {
      user: userId,
      paymentStatus: PaymentStatus.PAID,
      membershipTypeConfig: { category: MembershipCategory.COMPETITOR },
      $and: [
        { startDate: { $lte: now } },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
      ],
    }, { populate: ['membershipTypeConfig'] });

    return !!competitorMembership;
  }

  // Check if a user can upgrade to team membership
  async checkUpgradeEligibility(userId: string): Promise<{
    canUpgrade: boolean;
    hasCompetitorMembership: boolean;
    hasTeamMembership: boolean;
    reason?: string;
  }> {
    const hasCompetitorMembership = await this.hasCompetitorMembership(userId);
    const hasTeamMembership = await this.hasTeamMembership(userId);

    // User can upgrade if they have competitor membership but NOT team membership
    const canUpgrade = hasCompetitorMembership && !hasTeamMembership;

    let reason: string | undefined;
    if (!hasCompetitorMembership) {
      reason = 'A competitor membership is required to upgrade to a team membership';
    } else if (hasTeamMembership) {
      reason = 'You already have a team membership';
    }

    return {
      canUpgrade,
      hasCompetitorMembership,
      hasTeamMembership,
      reason,
    };
  }

  async create(data: Partial<Team>, ownerId: string): Promise<Team> {
    const em = this.em.fork();

    if (!data.name) {
      throw new BadRequestException('Team name is required');
    }

    // Sanitize team name - remove any variant of "team" from the name
    const sanitizedName = sanitizeTeamName(data.name);
    if (!sanitizedName) {
      throw new BadRequestException('Team name cannot be empty or consist only of the word "team"');
    }

    // Check if user has team membership
    const hasTeamMembership = await this.hasTeamMembership(ownerId);
    if (!hasTeamMembership) {
      throw new ForbiddenException('You need a Team membership to create a team. Please purchase a Team membership first.');
    }

    // Check if user is already on a team or is an owner
    const existingMembership = await em.findOne(TeamMember, { userId: ownerId });
    const existingTeamAsOwner = await em.findOne(Team, { captainId: ownerId, isActive: true });

    if (existingMembership || existingTeamAsOwner) {
      throw new BadRequestException('You are already on a team. Leave your current team before creating a new one.');
    }

    const team = em.create(Team, {
      name: sanitizedName,
      description: data.description,
      bio: data.bio,
      logoUrl: data.logoUrl,
      captainId: ownerId, // Still using captainId in DB for backward compat
      seasonId: data.seasonId,
      teamType: data.teamType || 'competitive',
      location: data.location,
      maxMembers: data.maxMembers || 50,
      website: data.website,
      isPublic: data.isPublic !== undefined ? data.isPublic : true,
      requiresApproval: data.requiresApproval !== undefined ? data.requiresApproval : true,
      galleryImages: data.galleryImages || [],
      isActive: true,
    });

    await em.persistAndFlush(team);

    // Add owner as a team member with 'owner' role
    const ownerMember = em.create(TeamMember, {
      teamId: team.id,
      userId: ownerId,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
    });
    await em.persistAndFlush(ownerMember);

    return team;
  }

  async update(id: string, data: Partial<Team>, requesterId: string): Promise<Team> {
    const em = this.em.fork();
    const team = await em.findOne(Team, { id });
    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    // Check if requester has team management permission (owner, co_owner, or admin)
    await this.checkTeamPermission(
      em,
      id,
      requesterId,
      TEAM_MANAGEMENT_ROLES,
      'Only team owners, co-owners, or admins can update the team'
    );

    // Sanitize team name if provided
    let sanitizedName = team.name;
    if (data.name !== undefined) {
      sanitizedName = sanitizeTeamName(data.name);
      if (!sanitizedName) {
        throw new BadRequestException('Team name cannot be empty or consist only of the word "team"');
      }
    }

    em.assign(team, {
      name: sanitizedName,
      description: data.description !== undefined ? data.description : team.description,
      bio: data.bio !== undefined ? data.bio : team.bio,
      logoUrl: data.logoUrl !== undefined ? data.logoUrl : team.logoUrl,
      teamType: data.teamType !== undefined ? data.teamType : team.teamType,
      location: data.location !== undefined ? data.location : team.location,
      maxMembers: data.maxMembers !== undefined ? data.maxMembers : team.maxMembers,
      website: data.website !== undefined ? data.website : team.website,
      isPublic: data.isPublic !== undefined ? data.isPublic : team.isPublic,
      requiresApproval: data.requiresApproval !== undefined ? data.requiresApproval : team.requiresApproval,
      galleryImages: data.galleryImages !== undefined ? data.galleryImages : team.galleryImages,
      coverImagePosition: data.coverImagePosition !== undefined ? data.coverImagePosition : team.coverImagePosition,
    });

    await em.flush();
    return team;
  }

  async delete(id: string, requesterId: string): Promise<void> {
    const em = this.em.fork();
    const team = await em.findOne(Team, { id });
    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    // Only owner or admin can delete the team
    const requester = await em.findOne(Profile, { id: requesterId });
    const isOwner = team.captainId === requesterId;
    const isAdmin = requester?.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Only the team owner or an admin can delete the team');
    }

    // Remove all team members first
    const members = await em.find(TeamMember, { teamId: id });
    for (const member of members) {
      await em.removeAndFlush(member);
    }

    await em.removeAndFlush(team);
  }

  async addMember(teamId: string, userId: string, requesterId: string): Promise<TeamMember> {
    const em = this.em.fork();
    const team = await em.findOne(Team, { id: teamId });
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    // Check if requester has member management permission (owner, co_owner, moderator, or admin)
    await this.checkTeamPermission(
      em,
      teamId,
      requesterId,
      MEMBER_MANAGEMENT_ROLES,
      'Only team owners, co-owners, moderators, or admins can add members'
    );

    // Check if user is already on a team
    const existingMembership = await em.findOne(TeamMember, { userId });
    if (existingMembership) {
      throw new BadRequestException('User is already on a team');
    }

    // Check if user is an owner of another team
    const existingTeamAsOwner = await em.findOne(Team, { captainId: userId, isActive: true });
    if (existingTeamAsOwner && existingTeamAsOwner.id !== teamId) {
      throw new BadRequestException('User is the owner of another team');
    }

    const member = em.create(TeamMember, {
      teamId,
      userId,
      role: 'member',
      status: 'active',
      joinedAt: new Date(),
    });

    await em.persistAndFlush(member);
    return member;
  }

  async removeMember(teamId: string, userId: string, requesterId: string): Promise<void> {
    const em = this.em.fork();
    const team = await em.findOne(Team, { id: teamId });
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    const requester = await em.findOne(Profile, { id: requesterId });
    const isAdmin = requester?.role === 'admin';
    const isSelf = userId === requesterId;

    // Get requester's role in the team
    const requesterRole = await this.getUserTeamRole(em, teamId, requesterId);
    const canManageMembers = requesterRole && MEMBER_MANAGEMENT_ROLES.includes(requesterRole);

    if (!canManageMembers && !isAdmin && !isSelf) {
      throw new ForbiddenException('Only team owners, co-owners, moderators, admins, or the member themselves can remove a member');
    }

    // Cannot remove the owner from the team
    if (userId === team.captainId) {
      throw new BadRequestException('Cannot remove the team owner. Transfer ownership first or delete the team.');
    }

    // Check if requester is trying to remove someone with a higher/equal role
    const targetMember = await em.findOne(TeamMember, { teamId, userId });
    if (!targetMember) {
      throw new NotFoundException(`Member not found on this team`);
    }

    // Role hierarchy: owner > co_owner > moderator > member
    const roleHierarchy: Record<TeamMemberRole, number> = {
      owner: 4,
      co_owner: 3,
      moderator: 2,
      member: 1,
    };

    // If not admin and not self, check role hierarchy
    if (!isAdmin && !isSelf && requesterRole) {
      const requesterLevel = roleHierarchy[requesterRole];
      const targetLevel = roleHierarchy[targetMember.role];
      if (targetLevel >= requesterLevel) {
        throw new ForbiddenException('You cannot remove a member with the same or higher role than yours');
      }
    }

    await em.removeAndFlush(targetMember);
  }

  // Update a member's role
  async updateMemberRole(
    teamId: string,
    userId: string,
    newRole: TeamMemberRole,
    requesterId: string
  ): Promise<TeamMember> {
    const em = this.em.fork();

    // Validate role
    if (!VALID_ROLES.includes(newRole)) {
      throw new BadRequestException(`Invalid role: ${newRole}. Valid roles are: ${VALID_ROLES.join(', ')}`);
    }

    const team = await em.findOne(Team, { id: teamId });
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    // Check if requester has role management permission (owner, co_owner, or admin)
    const requesterRole = await this.checkTeamPermission(
      em,
      teamId,
      requesterId,
      ROLE_MANAGEMENT_ROLES,
      'Only team owners, co-owners, or admins can change member roles'
    );

    // Find the target member
    const targetMember = await em.findOne(TeamMember, { teamId, userId });
    if (!targetMember) {
      throw new NotFoundException('Member not found on this team');
    }

    // Cannot change the owner's role
    if (targetMember.role === 'owner') {
      throw new BadRequestException('Cannot change the owner\'s role. Transfer ownership first.');
    }

    // Cannot promote to owner
    if (newRole === 'owner') {
      throw new BadRequestException('Cannot promote to owner. Use transfer ownership instead.');
    }

    // Co-owners cannot promote to co-owner (only owner can)
    const requester = await em.findOne(Profile, { id: requesterId });
    const isAdmin = requester?.role === 'admin';
    if (newRole === 'co_owner' && requesterRole !== 'owner' && !isAdmin) {
      throw new ForbiddenException('Only the team owner or an admin can promote members to co-owner');
    }

    targetMember.role = newRole;
    await em.flush();

    return targetMember;
  }

  // Transfer team ownership to another member
  async transferOwnership(teamId: string, newOwnerId: string, requesterId: string): Promise<Team> {
    const em = this.em.fork();
    const team = await em.findOne(Team, { id: teamId });
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    // Only current owner or admin can transfer ownership
    const requester = await em.findOne(Profile, { id: requesterId });
    const isOwner = team.captainId === requesterId;
    const isAdmin = requester?.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Only the current team owner or an admin can transfer ownership');
    }

    // Check if new owner is on the team
    const newOwnerMembership = await em.findOne(TeamMember, { teamId, userId: newOwnerId });
    if (!newOwnerMembership) {
      throw new BadRequestException('New owner must be a member of the team');
    }

    // Update the old owner's role to co_owner (demote gracefully)
    const oldOwnerMembership = await em.findOne(TeamMember, { teamId, userId: team.captainId });
    if (oldOwnerMembership) {
      oldOwnerMembership.role = 'co_owner';
    }

    // Update the new owner's role
    newOwnerMembership.role = 'owner';

    // Update the team's owner (captainId in DB)
    team.captainId = newOwnerId;

    await em.flush();
    return team;
  }

  // Keep alias for backward compatibility
  async transferCaptaincy(teamId: string, newCaptainId: string, requesterId: string): Promise<Team> {
    return this.transferOwnership(teamId, newCaptainId, requesterId);
  }

  async leaveTeam(userId: string): Promise<void> {
    const em = this.em.fork();

    // Check if user is a member of any team
    const membership = await em.findOne(TeamMember, { userId, status: 'active' });
    if (!membership) {
      throw new BadRequestException('You are not on a team');
    }

    const team = await em.findOne(Team, { id: membership.teamId });
    if (!team) {
      // Team doesn't exist, just remove the membership
      await em.removeAndFlush(membership);
      return;
    }

    // Cannot leave if you're the owner
    if (team.captainId === userId) {
      throw new BadRequestException('Owners cannot leave the team. Transfer ownership first or delete the team.');
    }

    await em.removeAndFlush(membership);
  }

  // ============================================
  // INVITE SYSTEM - Owner/Co-owner invites by MECA ID
  // ============================================

  // Lookup a member by MECA ID for invite preview
  async lookupMemberByMecaId(mecaId: string): Promise<{
    id: string;
    first_name?: string;
    last_name?: string;
    meca_id?: string;
    profile_picture_url?: string;
    membership_status?: string;
    canInvite: boolean;
    reason?: string;
  } | null> {
    const em = this.em.fork();

    // Find user by MECA ID
    const user = await em.findOne(Profile, { meca_id: mecaId });
    if (!user) {
      return null;
    }

    // Check if user has active MECA membership
    const hasActiveMembership = await this.hasActiveMecaMembership(user.id);

    // Check if user is already on a team
    const existingTeamMembership = await em.findOne(TeamMember, { userId: user.id, status: 'active' });
    const existingPendingInvite = await em.findOne(TeamMember, { userId: user.id, status: 'pending_invite' });

    let canInvite = true;
    let reason: string | undefined;

    if (!hasActiveMembership) {
      canInvite = false;
      reason = 'This member does not have an active MECA membership';
    } else if (existingTeamMembership) {
      canInvite = false;
      reason = 'This member is already on a team';
    } else if (existingPendingInvite) {
      canInvite = false;
      reason = 'This member already has a pending team invite';
    }

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      meca_id: user.meca_id,
      profile_picture_url: user.profile_picture_url || user.profile_images?.[0] || undefined,
      membership_status: user.membership_status,
      canInvite,
      reason,
    };
  }

  // Check if a user has any active MECA membership (competitor or team)
  async hasActiveMecaMembership(userId: string): Promise<boolean> {
    const em = this.em.fork();
    const now = new Date();

    const activeMembership = await em.findOne(Membership, {
      user: userId,
      paymentStatus: PaymentStatus.PAID,
      $and: [
        { startDate: { $lte: now } },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
      ],
    });

    return !!activeMembership;
  }

  // Invite a member to join the team (by owner/co-owner)
  async inviteMember(
    teamId: string,
    targetUserId: string,
    requesterId: string,
    message?: string
  ): Promise<TeamMember> {
    const em = this.em.fork();

    const team = await em.findOne(Team, { id: teamId });
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    // Check if requester has permission (owner, co_owner, or admin)
    await this.checkTeamPermission(
      em,
      teamId,
      requesterId,
      TEAM_MANAGEMENT_ROLES,
      'Only team owners or co-owners can invite members'
    );

    // Check if target user exists
    const targetUser = await em.findOne(Profile, { id: targetUserId });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if target has active MECA membership
    const hasActiveMembership = await this.hasActiveMecaMembership(targetUserId);
    if (!hasActiveMembership) {
      throw new BadRequestException('Cannot invite a member without an active MECA membership');
    }

    // Check if user is already on a team
    const existingMembership = await em.findOne(TeamMember, { userId: targetUserId, status: 'active' });
    if (existingMembership) {
      throw new BadRequestException('This member is already on a team');
    }

    // Check if there's already a pending invite
    const existingInvite = await em.findOne(TeamMember, {
      teamId,
      userId: targetUserId,
      status: 'pending_invite'
    });
    if (existingInvite) {
      throw new BadRequestException('An invite has already been sent to this member');
    }

    // Check if there's already a pending join request from this user
    const existingRequest = await em.findOne(TeamMember, {
      teamId,
      userId: targetUserId,
      status: 'pending_approval'
    });
    if (existingRequest) {
      // Auto-approve since owner is inviting them
      existingRequest.status = 'active';
      existingRequest.joinedAt = new Date();
      await em.flush();
      return existingRequest;
    }

    // Create the invite
    const invite = em.create(TeamMember, {
      teamId,
      userId: targetUserId,
      role: 'member',
      status: 'pending_invite',
      requestedAt: new Date(),
      requestMessage: message,
    });

    await em.persistAndFlush(invite);
    return invite;
  }

  // ============================================
  // JOIN REQUEST SYSTEM - Member requests to join
  // ============================================

  // Member requests to join a team
  async requestToJoin(teamId: string, userId: string, message?: string): Promise<TeamMember> {
    const em = this.em.fork();

    const team = await em.findOne(Team, { id: teamId });
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    // Check if user has active MECA membership
    const hasActiveMembership = await this.hasActiveMecaMembership(userId);
    if (!hasActiveMembership) {
      throw new BadRequestException('You must have an active MECA membership to join a team');
    }

    // Check if user is already on a team
    const existingMembership = await em.findOne(TeamMember, { userId, status: 'active' });
    if (existingMembership) {
      throw new BadRequestException('You are already on a team');
    }

    // Check if there's already a pending request
    const existingRequest = await em.findOne(TeamMember, {
      teamId,
      userId,
      status: 'pending_approval'
    });
    if (existingRequest) {
      throw new BadRequestException('You already have a pending request to join this team');
    }

    // Check if there's already a pending invite
    const existingInvite = await em.findOne(TeamMember, {
      teamId,
      userId,
      status: 'pending_invite'
    });
    if (existingInvite) {
      // Auto-accept since user is requesting to join
      existingInvite.status = 'active';
      existingInvite.joinedAt = new Date();
      await em.flush();
      return existingInvite;
    }

    // If team doesn't require approval, add directly
    if (!team.requiresApproval) {
      const member = em.create(TeamMember, {
        teamId,
        userId,
        role: 'member',
        status: 'active',
        joinedAt: new Date(),
      });
      await em.persistAndFlush(member);
      return member;
    }

    // Create the join request
    const request = em.create(TeamMember, {
      teamId,
      userId,
      role: 'member',
      status: 'pending_approval',
      requestedAt: new Date(),
      requestMessage: message,
    });

    await em.persistAndFlush(request);
    return request;
  }

  // Owner/co-owner approves a join request
  async approveJoinRequest(teamId: string, userId: string, requesterId: string): Promise<TeamMember> {
    const em = this.em.fork();

    const team = await em.findOne(Team, { id: teamId });
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    // Check if requester has permission
    await this.checkTeamPermission(
      em,
      teamId,
      requesterId,
      TEAM_MANAGEMENT_ROLES,
      'Only team owners or co-owners can approve join requests'
    );

    // Find the pending request
    const request = await em.findOne(TeamMember, {
      teamId,
      userId,
      status: 'pending_approval'
    });
    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    // Approve the request
    request.status = 'active';
    request.joinedAt = new Date();
    await em.flush();

    return request;
  }

  // Owner/co-owner rejects a join request
  async rejectJoinRequest(teamId: string, userId: string, requesterId: string): Promise<void> {
    const em = this.em.fork();

    const team = await em.findOne(Team, { id: teamId });
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    // Check if requester has permission
    await this.checkTeamPermission(
      em,
      teamId,
      requesterId,
      TEAM_MANAGEMENT_ROLES,
      'Only team owners or co-owners can reject join requests'
    );

    // Find the pending request
    const request = await em.findOne(TeamMember, {
      teamId,
      userId,
      status: 'pending_approval'
    });
    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    // Remove the request
    await em.removeAndFlush(request);
  }

  // User accepts an invite
  async acceptInvite(teamId: string, userId: string): Promise<TeamMember> {
    const em = this.em.fork();

    // Find the pending invite
    const invite = await em.findOne(TeamMember, {
      teamId,
      userId,
      status: 'pending_invite'
    });
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    // Check if user is already on another team
    const existingMembership = await em.findOne(TeamMember, {
      userId,
      status: 'active'
    });
    if (existingMembership) {
      throw new BadRequestException('You are already on a team. Leave your current team first.');
    }

    // Accept the invite
    invite.status = 'active';
    invite.joinedAt = new Date();
    await em.flush();

    return invite;
  }

  // User declines an invite
  async declineInvite(teamId: string, userId: string): Promise<void> {
    const em = this.em.fork();

    // Find the pending invite
    const invite = await em.findOne(TeamMember, {
      teamId,
      userId,
      status: 'pending_invite'
    });
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    // Remove the invite
    await em.removeAndFlush(invite);
  }

  // Cancel a sent invite (by owner/co-owner)
  async cancelInvite(teamId: string, userId: string, requesterId: string): Promise<void> {
    const em = this.em.fork();

    const team = await em.findOne(Team, { id: teamId });
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    // Check if requester has permission
    await this.checkTeamPermission(
      em,
      teamId,
      requesterId,
      TEAM_MANAGEMENT_ROLES,
      'Only team owners or co-owners can cancel invites'
    );

    // Find the pending invite
    const invite = await em.findOne(TeamMember, {
      teamId,
      userId,
      status: 'pending_invite'
    });
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    // Remove the invite
    await em.removeAndFlush(invite);
  }

  // Get all pending invites for a user
  async getMyPendingInvites(userId: string): Promise<Array<TeamMember & { team?: Team }>> {
    const em = this.em.fork();

    const invites = await em.find(TeamMember, { userId, status: 'pending_invite' });

    // Fetch team details for each invite
    const invitesWithTeams = await Promise.all(
      invites.map(async (invite) => {
        const team = await em.findOne(Team, { id: invite.teamId });
        return {
          ...invite,
          team: team || undefined,
        };
      })
    );

    return invitesWithTeams;
  }

  // Get user's pending join requests
  async getMyPendingRequests(userId: string): Promise<Array<TeamMember & { team?: Team }>> {
    const em = this.em.fork();

    const requests = await em.find(TeamMember, { userId, status: 'pending_approval' });

    // Fetch team details for each request
    const requestsWithTeams = await Promise.all(
      requests.map(async (request) => {
        const team = await em.findOne(Team, { id: request.teamId });
        return {
          ...request,
          team: team || undefined,
        };
      })
    );

    return requestsWithTeams;
  }

  // Cancel a pending join request (by the user who made it)
  async cancelJoinRequest(teamId: string, userId: string): Promise<void> {
    const em = this.em.fork();

    // Find the pending request
    const request = await em.findOne(TeamMember, {
      teamId,
      userId,
      status: 'pending_approval'
    });
    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    // Remove the request
    await em.removeAndFlush(request);
  }

  // ============================================
  // PUBLIC TEAM STATS
  // ============================================

  /**
   * Get public stats for a team including:
   * - Top 3 highest SPL scores
   * - Top 3 highest SQ scores
   * - Total events attended by team members
   * - Last 5 events attended by any team member
   * - Total 1st, 2nd, 3rd place finishes
   * @param teamId - The team ID
   * @param seasonId - Optional season ID to filter results by
   */
  async getTeamPublicStats(teamId: string, seasonId?: string): Promise<{
    topSplScores: Array<{ competitorName: string; score: number; eventName?: string; date?: string; placement: number }>;
    topSqScores: Array<{ competitorName: string; score: number; eventName?: string; date?: string; placement: number }>;
    totalEventsAttended: number;
    recentEvents: Array<{ id: string; name: string; date: string; location?: string; membersAttended: number }>;
    totalFirstPlace: number;
    totalSecondPlace: number;
    totalThirdPlace: number;
    totalCompetitions: number;
    totalPoints: number;
  }> {
    const em = this.em.fork();

    // Verify team exists and is public
    const team = await em.findOne(Team, { id: teamId });
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    // Get all active team member user IDs
    const members = await em.find(TeamMember, { teamId, status: 'active' });
    const memberUserIds = members.map(m => m.userId);

    if (memberUserIds.length === 0) {
      return {
        topSplScores: [],
        topSqScores: [],
        totalEventsAttended: 0,
        recentEvents: [],
        totalFirstPlace: 0,
        totalSecondPlace: 0,
        totalThirdPlace: 0,
        totalCompetitions: 0,
        totalPoints: 0,
      };
    }

    // Build competition results query with optional season filter
    const resultsQuery: any = {
      competitorId: { $in: memberUserIds },
    };

    // Get all competition results for team members
    let allResults = await em.find(CompetitionResult, resultsQuery, {
      populate: ['event', 'event.season'],
      orderBy: { score: 'DESC' },
    });

    // Filter by season if specified
    if (seasonId) {
      allResults = allResults.filter(r => {
        // Handle both Reference and loaded entity cases
        const eventSeasonId = r.event?.season?.id || (r.event as any)?.season_id;
        return eventSeasonId === seasonId;
      });
    }

    // Separate SPL and SQ results (SPL formats typically have higher scores > 100)
    // SPL classes often include "SPL", "dB", "Bass" in the name
    // SQ classes typically include "SQ", "Sound Quality", "Install" in the name
    const splResults = allResults.filter(r => {
      const className = r.competitionClass?.toLowerCase() || '';
      const format = r.format?.toLowerCase() || '';
      return className.includes('spl') || className.includes('db') || className.includes('bass') ||
             format.includes('spl') || format.includes('bass') ||
             (r.score > 100); // SPL scores are typically in dB (100+)
    });

    const sqResults = allResults.filter(r => {
      const className = r.competitionClass?.toLowerCase() || '';
      const format = r.format?.toLowerCase() || '';
      return className.includes('sq') || className.includes('sound quality') || className.includes('install') ||
             format.includes('sq') || format.includes('sound quality') ||
             (r.score <= 100 && !splResults.includes(r)); // SQ scores are typically 0-100
    });

    // Get top 3 SPL scores
    const topSplScores = splResults.slice(0, 3).map(r => ({
      competitorName: r.competitorName,
      score: Number(r.score),
      eventName: r.event?.title,
      date: r.event?.eventDate?.toISOString().split('T')[0],
      placement: r.placement,
    }));

    // Get top 3 SQ scores
    const topSqScores = sqResults.slice(0, 3).map(r => ({
      competitorName: r.competitorName,
      score: Number(r.score),
      eventName: r.event?.title,
      date: r.event?.eventDate?.toISOString().split('T')[0],
      placement: r.placement,
    }));

    // Get event registrations for team members (paid/confirmed only)
    let registrations = await em.find(EventRegistration, {
      user: { $in: memberUserIds },
      paymentStatus: PaymentStatus.PAID,
    }, {
      populate: ['event', 'event.season'],
    });

    // Filter registrations by season if specified
    if (seasonId) {
      registrations = registrations.filter(r => {
        // Handle both Reference and loaded entity cases
        const eventSeasonId = r.event?.season?.id || (r.event as any)?.season_id;
        return eventSeasonId === seasonId;
      });
    }

    // Count unique events attended
    const uniqueEventIds = new Set(registrations.map(r => r.event?.id).filter(Boolean));
    const totalEventsAttended = uniqueEventIds.size;

    // Get last 5 events with member counts
    const eventMemberCounts = new Map<string, { event: Event; count: number }>();
    for (const reg of registrations) {
      if (reg.event) {
        const existing = eventMemberCounts.get(reg.event.id);
        if (existing) {
          existing.count++;
        } else {
          eventMemberCounts.set(reg.event.id, { event: reg.event, count: 1 });
        }
      }
    }

    // Sort by event date descending and take last 5
    const recentEvents = Array.from(eventMemberCounts.values())
      .filter(e => e.event.eventDate)
      .sort((a, b) => new Date(b.event.eventDate!).getTime() - new Date(a.event.eventDate!).getTime())
      .slice(0, 5)
      .map(e => ({
        id: e.event.id,
        name: e.event.title,
        date: e.event.eventDate!.toISOString().split('T')[0],
        location: e.event.venueCity && e.event.venueState ? `${e.event.venueCity}, ${e.event.venueState}` : undefined,
        membersAttended: e.count,
      }));

    // Count placements
    const totalFirstPlace = allResults.filter(r => r.placement === 1).length;
    const totalSecondPlace = allResults.filter(r => r.placement === 2).length;
    const totalThirdPlace = allResults.filter(r => r.placement === 3).length;

    // Total competitions and points
    const totalCompetitions = allResults.length;
    const totalPoints = allResults.reduce((sum, r) => sum + (r.pointsEarned || 0), 0);

    return {
      topSplScores,
      topSqScores,
      totalEventsAttended,
      recentEvents,
      totalFirstPlace,
      totalSecondPlace,
      totalThirdPlace,
      totalCompetitions,
      totalPoints,
    };
  }

  /**
   * Get all public teams with basic info for the directory
   */
  async findAllPublicTeams(): Promise<TeamWithMembers[]> {
    const em = this.em.fork();
    const teams = await em.find(Team, { isActive: true, isPublic: true }, {
      orderBy: { name: 'ASC' },
    });

    // Fetch owners and member counts for each team
    const teamsWithDetails = await Promise.all(
      teams.map(async (team) => {
        const owner = await em.findOne(Profile, { id: team.captainId });
        const members = await em.find(TeamMember, { teamId: team.id, status: 'active' });

        const membersWithUsers = await Promise.all(
          members.map(m => this.buildMemberWithUser(em, m))
        );

        return {
          ...team,
          owner: owner ? {
            id: owner.id,
            first_name: owner.first_name,
            last_name: owner.last_name,
            meca_id: owner.meca_id,
            profile_picture_url: owner.profile_picture_url || owner.profile_images?.[0] || undefined,
          } : undefined,
          members: membersWithUsers,
        };
      })
    );

    return teamsWithDetails;
  }

  /**
   * Get public team profile by ID
   */
  async getPublicTeamById(id: string): Promise<TeamWithMembers | null> {
    const em = this.em.fork();
    const team = await em.findOne(Team, { id, isActive: true });

    if (!team) {
      return null;
    }

    // For non-public teams, we still return them but with limited info
    // The frontend can decide how to handle this

    const owner = await em.findOne(Profile, { id: team.captainId });
    const activeMembers = await em.find(TeamMember, { teamId: team.id, status: 'active' });
    const membersWithUsers = await Promise.all(
      activeMembers.map(m => this.buildMemberWithUser(em, m))
    );

    return {
      ...team,
      owner: owner ? {
        id: owner.id,
        first_name: owner.first_name,
        last_name: owner.last_name,
        meca_id: owner.meca_id,
        profile_picture_url: owner.profile_picture_url || owner.profile_images?.[0] || undefined,
        email: owner.email,
      } : undefined,
      members: membersWithUsers,
    };
  }
}
