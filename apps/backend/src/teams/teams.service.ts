import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { MembershipCategory, PaymentStatus, RegistrationStatus } from '@newmeca/shared';
import { Team } from './team.entity';
import { TeamMember, TeamMemberRole, TeamMemberStatus } from './team-member.entity';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';
import { Membership } from '../memberships/memberships.entity';
import { CompetitionResult } from '../competition-results/competition-results.entity';
import { EventRegistration } from '../event-registrations/event-registrations.entity';
import { Event } from '../events/events.entity';
import { Season } from '../seasons/seasons.entity';
import { MembershipTypeConfig } from '../membership-type-configs/membership-type-configs.entity';

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

// Roles that can manage join requests (approve/reject)
const JOIN_REQUEST_MANAGEMENT_ROLES: TeamMemberRole[] = ['owner', 'co_owner', 'moderator'];

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
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /**
   * Create a team for a membership.
   * This is called automatically when:
   * 1. A competitor membership with team add-on is purchased
   * 2. A retailer or manufacturer membership is purchased (team is included)
   *
   * @param membership The membership to create a team for
   * @returns The created team
   */
  async createTeamForMembership(membership: Membership): Promise<Team> {
    const em = this.em.fork();

    // Load the membership with user if not already loaded
    const fullMembership = await em.findOne(Membership, { id: membership.id }, {
      populate: ['user', 'membershipTypeConfig'],
    });

    if (!fullMembership) {
      throw new NotFoundException('Membership not found');
    }

    if (!fullMembership.user) {
      throw new BadRequestException('Cannot create a team for a membership without a user');
    }

    const userId = fullMembership.user.id;
    const category = fullMembership.membershipTypeConfig.category;

    // Check if team creation is appropriate for this membership type
    // Also check if membership config includesTeam (for "Competitor w/Team" type)
    const shouldHaveTeam =
      category === MembershipCategory.RETAIL ||
      category === MembershipCategory.MANUFACTURER ||
      category === MembershipCategory.TEAM ||
      fullMembership.membershipTypeConfig.includesTeam ||
      (category === MembershipCategory.COMPETITOR && fullMembership.hasTeamAddon);

    if (!shouldHaveTeam) {
      throw new BadRequestException('This membership type does not include a team');
    }

    // Generate team name if not provided
    let teamName = fullMembership.teamName;
    if (!teamName) {
      if (category === MembershipCategory.RETAIL || category === MembershipCategory.MANUFACTURER) {
        teamName = fullMembership.businessName || `${fullMembership.user.first_name || 'New'}'s Team`;
      } else {
        teamName = `${fullMembership.user.first_name || 'New'}'s Team`;
      }
    }

    // Sanitize team name
    const sanitizedName = sanitizeTeamName(teamName);
    if (!sanitizedName) {
      throw new BadRequestException('Team name cannot be empty');
    }

    // Check if user already has a team from this membership
    const existingTeam = await em.findOne(Team, { membership: fullMembership.id });
    if (existingTeam) {
      this.logger.warn(`Team already exists for membership ${fullMembership.id}`);
      return existingTeam;
    }

    // Check if user is already an owner of another team
    const existingTeamAsOwner = await em.findOne(Team, { captainId: userId, isActive: true });
    if (existingTeamAsOwner) {
      // Link existing team to this membership instead of creating new
      existingTeamAsOwner.membership = fullMembership;
      await em.flush();
      this.logger.log(`Linked existing team ${existingTeamAsOwner.id} to membership ${fullMembership.id}`);
      return existingTeamAsOwner;
    }

    // Determine team type based on membership category
    let teamType = 'competitive';
    if (category === MembershipCategory.RETAIL) {
      teamType = 'shop';
    } else if (category === MembershipCategory.MANUFACTURER) {
      teamType = 'club';
    }

    // Create the team
    const team = em.create(Team, {
      name: sanitizedName,
      description: fullMembership.teamDescription,
      captainId: userId,
      membership: fullMembership,
      teamType,
      maxMembers: 50, // Default max members for teams
      isPublic: true,
      requiresApproval: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await em.persistAndFlush(team);

    // Add owner as a team member
    const ownerMember = em.create(TeamMember, {
      teamId: team.id,
      userId,
      membership: fullMembership,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
    });

    await em.persistAndFlush(ownerMember);

    this.logger.log(`Created team ${team.id} (${sanitizedName}) for membership ${fullMembership.id}`);

    return team;
  }

  /**
   * Get the team associated with a membership
   */
  async getTeamByMembership(membershipId: string): Promise<Team | null> {
    const em = this.em.fork();
    return em.findOne(Team, { membership: membershipId });
  }

  /**
   * Check if a membership should have a team and if one exists
   */
  async checkMembershipTeamStatus(membershipId: string): Promise<{
    shouldHaveTeam: boolean;
    hasTeam: boolean;
    team?: Team;
    category?: MembershipCategory;
  }> {
    const em = this.em.fork();

    const membership = await em.findOne(Membership, { id: membershipId }, {
      populate: ['membershipTypeConfig'],
    });

    if (!membership) {
      return { shouldHaveTeam: false, hasTeam: false };
    }

    const category = membership.membershipTypeConfig.category;
    const shouldHaveTeam =
      category === MembershipCategory.RETAIL ||
      category === MembershipCategory.MANUFACTURER ||
      category === MembershipCategory.TEAM ||
      membership.membershipTypeConfig.includesTeam ||
      (category === MembershipCategory.COMPETITOR && membership.hasTeamAddon);

    const team = await em.findOne(Team, { membership: membershipId });

    return {
      shouldHaveTeam,
      hasTeam: !!team,
      team: team || undefined,
      category,
    };
  }

  // Helper to build member with user data from a pre-loaded profile map
  private buildMemberWithUserFromMap(member: TeamMember, profileMap: Map<string, Profile>): MemberWithUser {
    const user = profileMap.get(member.userId);
    return {
      ...member,
      user: user ? {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        meca_id: user.meca_id,
        profile_picture_url: user.profile_picture_url || user.profile_images?.[0] || undefined,
        email: user.email,
        membership_status: user.membership_status,
      } : undefined,
    } as MemberWithUser;
  }

  // Helper to build member with user data (single query - kept for single-member use)
  private async buildMemberWithUser(em: EntityManager, member: TeamMember): Promise<MemberWithUser> {
    const user = await em.findOne(Profile, { id: member.userId });
    return {
      ...member,
      user: user ? {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        meca_id: user.meca_id,
        profile_picture_url: user.profile_picture_url || user.profile_images?.[0] || undefined,
        email: user.email,
        membership_status: user.membership_status,
      } : undefined,
    } as MemberWithUser;
  }

  // Batch-load profiles by IDs into a Map for efficient lookups
  private async loadProfileMap(em: EntityManager, userIds: string[]): Promise<Map<string, Profile>> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) return new Map();
    const profiles = await em.find(Profile, { id: { $in: uniqueIds } });
    const map = new Map<string, Profile>();
    for (const p of profiles) {
      map.set(p.id, p);
    }
    return map;
  }

  async findAll(): Promise<TeamWithMembers[]> {
    const em = this.em.fork();
    const teams = await em.find(Team, { isActive: true }, {
      orderBy: { name: 'ASC' },
    });

    if (teams.length === 0) return [];

    const teamIds = teams.map(t => t.id);

    // Batch-load all active members for all teams in one query
    const allMembers = await em.find(TeamMember, { teamId: { $in: teamIds }, status: 'active' });

    // Collect all user IDs (owners + members)
    const allUserIds = [
      ...teams.map(t => t.captainId),
      ...allMembers.map(m => m.userId),
    ];

    // Batch-load all profiles in one query
    const profileMap = await this.loadProfileMap(em, allUserIds);

    // Group members by team
    const membersByTeam = new Map<string, TeamMember[]>();
    for (const member of allMembers) {
      const list = membersByTeam.get(member.teamId) || [];
      list.push(member);
      membersByTeam.set(member.teamId, list);
    }

    // Build results using pre-loaded data
    return teams.map(team => {
      const owner = profileMap.get(team.captainId);
      const members = membersByTeam.get(team.id) || [];
      const membersWithUsers = members.map(m => this.buildMemberWithUserFromMap(m, profileMap));

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
    });
  }

  async findById(id: string, requesterId?: string): Promise<TeamWithMembers> {
    const em = this.em.fork();
    const team = await em.findOne(Team, { id });
    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    // Get active members
    const activeMembers = await em.find(TeamMember, { teamId: team.id, status: 'active' });

    // Collect all user IDs we'll need (owner + members + requester)
    const userIds = [team.captainId, ...activeMembers.map(m => m.userId)];

    let pendingRequests: TeamMember[] = [];
    let pendingInvites: TeamMember[] = [];

    // If requester, check permissions and possibly load pending members
    if (requesterId) {
      userIds.push(requesterId);
      const requesterRole = await this.getUserTeamRole(em, id, requesterId);

      // Pre-load requester profile to check admin
      const profileMap = await this.loadProfileMap(em, [requesterId]);
      const requester = profileMap.get(requesterId);
      const isAdmin = isAdminUser(requester);

      if (requesterRole === 'owner' || requesterRole === 'co_owner' || isAdmin) {
        pendingRequests = await em.find(TeamMember, { teamId: team.id, status: 'pending_approval' });
        pendingInvites = await em.find(TeamMember, { teamId: team.id, status: 'pending_invite' });
        // Add pending member user IDs for batch loading
        userIds.push(...pendingRequests.map(m => m.userId), ...pendingInvites.map(m => m.userId));
      }
    }

    // Batch-load all profiles in one query
    const profileMap = await this.loadProfileMap(em, userIds);
    const owner = profileMap.get(team.captainId);

    const membersWithUsers = activeMembers.map(m => this.buildMemberWithUserFromMap(m, profileMap));

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

    if (pendingRequests.length > 0) {
      result.pendingRequests = pendingRequests.map(m => this.buildMemberWithUserFromMap(m, profileMap));
    }
    if (pendingInvites.length > 0) {
      result.pendingInvites = pendingInvites.map(m => this.buildMemberWithUserFromMap(m, profileMap));
    }

    return result;
  }

  // Helper to get a user's EFFECTIVE role in a team. The team's captainId is
  // the source of truth for ownership: the captain is always 'owner', and a
  // team_members row claiming 'owner' for anyone else is bad data (legit
  // ownership transfers demote the old owner to co_owner, never leave
  // 'owner') — such rows confer NO privileges and count as plain members.
  // This feeds every permission check, so it locks down team edits, image
  // uploads, invites, and role management against corrupted owner rows.
  private async getUserTeamRole(em: EntityManager, teamId: string, userId: string): Promise<TeamMemberRole | null> {
    const team = await em.findOne(Team, { id: teamId });
    if (team && team.captainId === userId) {
      return 'owner';
    }
    const membership = await em.findOne(TeamMember, { teamId, userId });
    if (!membership?.role) return null;
    return membership.role === 'owner' ? 'member' : membership.role;
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
    if (isAdminUser(requester)) {
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
    if (membership) {
      // Guard against orphaned team_members rows pointing at a deleted team
      const team = await em.findOne(Team, { id: membership.teamId });
      if (team) {
        return this.findById(membership.teamId, userId);
      }
    }

    // Check if user is an owner (captainId on team)
    const teamAsOwner = await em.findOne(Team, { captainId: userId, isActive: true });
    if (teamAsOwner) {
      return this.findById(teamAsOwner.id, userId);
    }
    return null;
  }

  // Check if a user has an active team membership (required to create a team)
  // Team eligibility comes from:
  // 1. Retailer or Manufacturer membership (always includes team)
  // 2. Competitor membership with hasTeamAddon: true
  // 3. Any membership with membershipTypeConfig.includesTeam: true
  // 4. Legacy TEAM category membership
  async hasTeamMembership(userId: string): Promise<boolean> {
    const em = this.em.fork();

    // Check for active team membership - NO admin bypass here
    // Admins must also have a team membership to create teams
    const now = new Date();

    // First check for Retailer/Manufacturer memberships (always include team)
    const retailerOrManufacturerMembership = await em.findOne(Membership, {
      user: userId,
      paymentStatus: PaymentStatus.PAID,
      membershipTypeConfig: { category: { $in: [MembershipCategory.RETAIL, MembershipCategory.MANUFACTURER] } },
      $and: [
        { startDate: { $lte: now } },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
      ],
    }, { populate: ['membershipTypeConfig'] });

    if (retailerOrManufacturerMembership) {
      return true;
    }

    // Check for Competitor with team add-on OR membership config that includes team
    const competitorWithTeam = await em.findOne(Membership, {
      user: userId,
      paymentStatus: PaymentStatus.PAID,
      $and: [
        { startDate: { $lte: now } },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
        {
          $or: [
            { hasTeamAddon: true },
            { membershipTypeConfig: { includesTeam: true } },
          ],
        },
      ],
    }, { populate: ['membershipTypeConfig'] });

    if (competitorWithTeam) {
      return true;
    }

    // Check for legacy TEAM category membership
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

    // Check if user already owns a team (users can only OWN one team since it's a paid membership)
    // Note: Users CAN join multiple teams as a member, but can only own ONE team
    const existingTeamAsOwner = await em.findOne(Team, { captainId: ownerId, isActive: true });
    if (existingTeamAsOwner) {
      throw new BadRequestException('You already own a team. Each team membership allows you to own only one team.');
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
    const isAdmin = isAdminUser(requester);

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

    // Check if user is already a member of THIS specific team
    const existingMembershipOnThisTeam = await em.findOne(TeamMember, { teamId, userId, status: 'active' });
    if (existingMembershipOnThisTeam) {
      throw new BadRequestException('User is already a member of this team');
    }

    // Note: Users can now be on multiple teams - no cross-team constraint

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
    const isAdmin = isAdminUser(requester);
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

    // If not admin and not self, check role hierarchy. The actual captain
    // outranks everyone — including stray owner-role rows held by members
    // who are not the captain (bad data the captain must be able to remove).
    if (!isAdmin && !isSelf && requesterRole) {
      const requesterLevel = requesterId === team.captainId ? 5 : roleHierarchy[requesterRole];
      // A non-captain row claiming 'owner' is bad data — rank it as a plain
      // member so legitimate managers can remove it.
      const targetEffectiveRole = targetMember.role === 'owner' ? 'member' : targetMember.role;
      const targetLevel = userId === team.captainId ? 5 : roleHierarchy[targetEffectiveRole];
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

    // Cannot change the actual owner's role (keyed on captainId, NOT the
    // row's role — stray owner-role rows on teams captained by someone else
    // are bad data and must stay demotable)
    if (userId === team.captainId) {
      throw new BadRequestException('Cannot change the owner\'s role. Transfer ownership first.');
    }

    // Cannot promote to owner
    if (newRole === 'owner') {
      throw new BadRequestException('Cannot promote to owner. Use transfer ownership instead.');
    }

    // Co-owners cannot promote to co-owner (only owner can)
    const requester = await em.findOne(Profile, { id: requesterId });
    const isAdmin = isAdminUser(requester);
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
    const isAdmin = isAdminUser(requester);

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

  async leaveTeam(teamId: string, userId: string): Promise<void> {
    const em = this.em.fork();

    // Find the membership for THIS specific team. A user can be an active
    // member of multiple teams, so we MUST match on teamId — matching by
    // userId alone removes an arbitrary (wrong) team membership.
    const membership = await em.findOne(TeamMember, { teamId, userId, status: 'active' });
    if (!membership) {
      throw new BadRequestException('You are not on this team');
    }

    const team = await em.findOne(Team, { id: teamId });
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

    // Note: Users can now be on multiple teams, so we only check for active MECA membership
    // The actual invite process will check for duplicate membership on the specific team

    let canInvite = true;
    let reason: string | undefined;

    if (!hasActiveMembership) {
      canInvite = false;
      reason = 'This member does not have an active MECA membership';
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

    // Check if user is already a member of THIS specific team
    const existingMembershipOnThisTeam = await em.findOne(TeamMember, { teamId, userId: targetUserId, status: 'active' });
    if (existingMembershipOnThisTeam) {
      throw new BadRequestException('This member is already on this team');
    }

    // Note: Users can now be on multiple teams - no cross-team constraint

    // Check if there's already a pending invite to THIS team
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

    // Check if user is already a member of THIS specific team
    const existingMembershipOnThisTeam = await em.findOne(TeamMember, { teamId, userId, status: 'active' });
    if (existingMembershipOnThisTeam) {
      throw new BadRequestException('You are already a member of this team');
    }

    // Note: Users can now be on multiple teams - no cross-team constraint

    // Check if there's already a pending request to THIS team
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
      JOIN_REQUEST_MANAGEMENT_ROLES,
      'Only team owners, co-owners, or moderators can approve join requests'
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
      JOIN_REQUEST_MANAGEMENT_ROLES,
      'Only team owners, co-owners, or moderators can reject join requests'
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

    // Note: Users can now be on multiple teams - no cross-team constraint
    // The invite process already ensures there's no duplicate membership on this specific team

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

    if (invites.length === 0) return [];

    // Batch-load all teams in one query
    const teamIds = [...new Set(invites.map(i => i.teamId))];
    const teams = await em.find(Team, { id: { $in: teamIds } });
    const teamMap = new Map(teams.map(t => [t.id, t]));

    return invites.map(invite => ({
      ...invite,
      team: teamMap.get(invite.teamId) || undefined,
    }));
  }

  // Get user's pending join requests
  async getMyPendingRequests(userId: string): Promise<Array<TeamMember & { team?: Team }>> {
    const em = this.em.fork();

    const requests = await em.find(TeamMember, { userId, status: 'pending_approval' });

    if (requests.length === 0) return [];

    // Batch-load all teams in one query
    const teamIds = [...new Set(requests.map(r => r.teamId))];
    const teams = await em.find(Team, { id: { $in: teamIds } });
    const teamMap = new Map(teams.map(t => [t.id, t]));

    return requests.map(request => ({
      ...request,
      team: teamMap.get(request.teamId) || undefined,
    }));
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

    let memberUserIds: string[] = [];

    // First try to find a legacy team
    const team = await em.findOne(Team, { id: teamId });
    if (team) {
      // Get all active team member user IDs for legacy team
      const members = await em.find(TeamMember, { teamId, status: 'active' });
      memberUserIds = members.map(m => m.userId);
    } else {
      // Not a legacy team - check if it's a membership-based team
      try {
        const membershipResult = await em.getConnection().execute(`
          SELECT m.user_id
          FROM memberships m
          JOIN membership_type_configs mtc ON mtc.id = m.membership_type_config_id
          WHERE m.id = ?
          AND m.payment_status = 'paid'
          AND (
            mtc.category = 'retail'
            OR mtc.category = 'manufacturer'
            OR mtc.category = 'team'
            OR mtc.includes_team = true
            OR mtc.name LIKE '%Team%'
            OR m.has_team_addon = true
          )
        `, [teamId]);

        if (membershipResult && membershipResult.length > 0) {
          memberUserIds = [membershipResult[0].user_id];
        }
      } catch (sqlError: any) {
        this.logger.warn(`Failed membership-based team lookup for ${teamId}: ${sqlError.message}`);
        // Try simpler query as fallback
        try {
          const simpleResult = await em.getConnection().execute(
            `SELECT user_id FROM memberships WHERE id = ? AND payment_status = 'paid'`,
            [teamId]
          );
          if (simpleResult && simpleResult.length > 0) {
            memberUserIds = [simpleResult[0].user_id];
          }
        } catch (fallbackError: any) {
          this.logger.warn(`Fallback membership lookup also failed: ${fallbackError.message}`);
        }
      }

      if (memberUserIds.length === 0) {
        throw new NotFoundException(`Team with ID ${teamId} not found`);
      }
    }

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

    // If seasonId is provided, filter at the query level for efficiency
    if (seasonId) {
      resultsQuery.event = { season: { id: seasonId } };
    }

    // Get all competition results for team members
    let allResults: CompetitionResult[] = [];
    try {
      allResults = await em.find(CompetitionResult, resultsQuery, {
        populate: ['event', 'event.season'],
        orderBy: { score: 'DESC' },
      });
    } catch (queryErr: any) {
      this.logger.warn(`Failed to query competition results for team ${teamId}: ${queryErr.message}`);
    }

    // Separate SPL and SQ results (SPL formats typically have higher scores > 100)
    // Note: score is type 'decimal' which PostgreSQL returns as strings, so use Number() conversion
    const splResults = allResults.filter(r => {
      const className = r.competitionClass?.toLowerCase() || '';
      const format = r.format?.toLowerCase() || '';
      const numScore = Number(r.score) || 0;
      return className.includes('spl') || className.includes('db') || className.includes('bass') ||
             format.includes('spl') || format.includes('bass') ||
             (numScore > 100); // SPL scores are typically in dB (100+)
    });

    const sqResults = allResults.filter(r => {
      const className = r.competitionClass?.toLowerCase() || '';
      const format = r.format?.toLowerCase() || '';
      const numScore = Number(r.score) || 0;
      return className.includes('sq') || className.includes('sound quality') || className.includes('install') ||
             format.includes('sq') || format.includes('sound quality') ||
             (numScore <= 100 && !splResults.includes(r)); // SQ scores are typically 0-100
    });

    // Get top 3 SPL scores
    const topSplScores = splResults.slice(0, 3).map(r => ({
      competitorName: r.competitorName,
      score: Number(r.score) || 0,
      eventName: r.event?.title,
      date: r.event?.eventDate ? new Date(r.event.eventDate).toISOString().split('T')[0] : undefined,
      placement: r.placement,
    }));

    // Get top 3 SQ scores
    const topSqScores = sqResults.slice(0, 3).map(r => ({
      competitorName: r.competitorName,
      score: Number(r.score) || 0,
      eventName: r.event?.title,
      date: r.event?.eventDate ? new Date(r.event.eventDate).toISOString().split('T')[0] : undefined,
      placement: r.placement,
    }));

    // Get event registrations for team members (paid/confirmed only)
    let registrations: EventRegistration[] = [];
    let totalEventsAttended = 0;
    let recentEvents: Array<{ id: string; name: string; date: string; location?: string; membersAttended: number }> = [];

    try {
      registrations = await em.find(EventRegistration, {
        user: { $in: memberUserIds },
        paymentStatus: PaymentStatus.PAID,
      }, {
        populate: ['event', 'event.season'],
      });

      // Filter registrations by season if specified
      if (seasonId) {
        registrations = registrations.filter(r => {
          const eventSeasonId = r.event?.season?.id || (r.event as any)?.season_id;
          return eventSeasonId === seasonId;
        });
      }

      // Count unique events attended
      const uniqueEventIds = new Set(registrations.map(r => r.event?.id).filter(Boolean));
      totalEventsAttended = uniqueEventIds.size;

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
      recentEvents = Array.from(eventMemberCounts.values())
        .filter(e => e.event.eventDate)
        .sort((a, b) => new Date(b.event.eventDate!).getTime() - new Date(a.event.eventDate!).getTime())
        .slice(0, 5)
        .map(e => ({
          id: e.event.id,
          name: e.event.title,
          date: new Date(e.event.eventDate!).toISOString().split('T')[0],
          location: e.event.venueCity && e.event.venueState ? `${e.event.venueCity}, ${e.event.venueState}` : undefined,
          membersAttended: e.count,
        }));
    } catch (regError: any) {
      this.logger.warn(`Failed to fetch event registrations for team ${teamId}: ${regError.message}`);
    }

    // Count placements
    const totalFirstPlace = allResults.filter(r => r.placement === 1).length;
    const totalSecondPlace = allResults.filter(r => r.placement === 2).length;
    const totalThirdPlace = allResults.filter(r => r.placement === 3).length;

    // Total competitions and points
    // Note: pointsEarned may come as string from decimal column
    const totalCompetitions = allResults.length;
    const totalPoints = allResults.reduce((sum, r) => sum + (Number(r.pointsEarned) || 0), 0);

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
   * Full team analytics — the team-level counterpart of the personal
   * analytics tab in My MECA. All season-scoped sections honor the optional
   * seasonId filter; the records board is always all-time.
   */
  async getTeamAnalytics(teamId: string, seasonId?: string): Promise<any> {
    const em = this.em.fork();

    // Resolve member user IDs (mirrors getTeamPublicStats: legacy team rows
    // first, then membership-based synthetic teams)
    let memberUserIds: string[] = [];
    const team = await em.findOne(Team, { id: teamId });
    if (team) {
      const members = await em.find(TeamMember, { teamId, status: 'active' });
      memberUserIds = members.map(m => m.userId);
    } else {
      try {
        const membershipResult = await em.getConnection().execute(
          `SELECT user_id FROM memberships WHERE id = ? AND payment_status = 'paid'`,
          [teamId],
        );
        if (membershipResult && membershipResult.length > 0) {
          memberUserIds = [membershipResult[0].user_id];
        }
      } catch (sqlError: any) {
        this.logger.warn(`Membership-based team lookup failed for ${teamId}: ${sqlError.message}`);
      }
    }
    if (memberUserIds.length === 0) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    const profileMap = await this.loadProfileMap(em, memberUserIds);
    const nameOf = (uid: string): string => {
      const p = profileMap.get(uid);
      return p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown' : 'Unknown';
    };
    const mecaOf = (uid: string): string | undefined => {
      const p = profileMap.get(uid);
      return p?.meca_id != null ? String(p.meca_id) : undefined;
    };

    // One query for ALL results (every season) — records come from the full
    // set, everything else from the season-filtered subset.
    let allResults: CompetitionResult[] = [];
    try {
      allResults = await em.find(CompetitionResult, {
        competitorId: { $in: memberUserIds },
        needsClassReview: false,
      }, { populate: ['event'] });
    } catch (queryErr: any) {
      this.logger.warn(`Failed to query results for team analytics ${teamId}: ${queryErr.message}`);
    }
    const seasonResults = seasonId ? allResults.filter(r => r.seasonId === seasonId) : allResults;

    // SPL vs SQ classification — same heuristic as getTeamPublicStats
    const isSpl = (r: CompetitionResult): boolean => {
      const cls = (r.competitionClass || '').toLowerCase();
      const fmt = (r.format || '').toLowerCase();
      const score = Number(r.score) || 0;
      return cls.includes('spl') || cls.includes('db') || cls.includes('bass')
        || fmt.includes('spl') || fmt.includes('bass') || score > 100;
    };
    const avg = (nums: number[]): number => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
    const round1 = (n: number): number => Math.round(n * 10) / 10;

    // ---- Member contribution leaderboard (season-scoped, full roster) ----
    const memberLeaderboard = memberUserIds.map(uid => {
      const mine = seasonResults.filter(r => r.competitorId === uid);
      const splScores = mine.filter(isSpl).map(r => Number(r.score) || 0);
      const sqScores = mine.filter(r => !isSpl(r)).map(r => Number(r.score) || 0);
      return {
        userId: uid,
        name: nameOf(uid),
        mecaId: mecaOf(uid),
        points: mine.reduce((s, r) => s + (Number(r.pointsEarned) || 0), 0),
        competitions: mine.length,
        first: mine.filter(r => r.placement === 1).length,
        second: mine.filter(r => r.placement === 2).length,
        third: mine.filter(r => r.placement === 3).length,
        bestSpl: splScores.length ? round1(Math.max(...splScores)) : null,
        avgSpl: splScores.length ? round1(avg(splScores)) : null,
        bestSq: sqScores.length ? round1(Math.max(...sqScores)) : null,
        avgSq: sqScores.length ? round1(avg(sqScores)) : null,
      };
    }).sort((a, b) => b.points - a.points || b.competitions - a.competitions);

    // ---- Cumulative points over time (season-scoped) ----
    const byEvent = new Map<string, { date: string; eventName: string; points: number }>();
    for (const r of seasonResults) {
      const eventDate = r.event?.eventDate ? new Date(r.event.eventDate).toISOString().split('T')[0] : null;
      if (!eventDate) continue;
      const key = r.event!.id;
      const entry = byEvent.get(key) || { date: eventDate, eventName: r.event!.title, points: 0 };
      entry.points += Number(r.pointsEarned) || 0;
      byEvent.set(key, entry);
    }
    let running = 0;
    const pointsOverTime = Array.from(byEvent.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(e => {
        running += e.points;
        return { ...e, cumulative: running };
      });

    // ---- Format breakdown (season-scoped) ----
    const byFormat = new Map<string, CompetitionResult[]>();
    for (const r of seasonResults) {
      const fmt = (r.format || 'Other').trim() || 'Other';
      const list = byFormat.get(fmt) || [];
      list.push(r);
      byFormat.set(fmt, list);
    }
    const formatBreakdown = Array.from(byFormat.entries()).map(([format, rs]) => {
      const scores = rs.map(r => Number(r.score) || 0);
      const wins = rs.filter(r => r.placement === 1).length;
      return {
        format,
        competitions: rs.length,
        points: rs.reduce((s, r) => s + (Number(r.pointsEarned) || 0), 0),
        wins,
        podiums: rs.filter(r => r.placement >= 1 && r.placement <= 3).length,
        winRate: rs.length ? Math.round((wins / rs.length) * 100) : 0,
        avgScore: round1(avg(scores)),
        bestScore: scores.length ? round1(Math.max(...scores)) : 0,
      };
    }).sort((a, b) => b.competitions - a.competitions);

    // ---- Per-class leaders within the team (season-scoped) ----
    const byClass = new Map<string, CompetitionResult[]>();
    for (const r of seasonResults) {
      const cls = (r.competitionClass || 'Unknown').trim() || 'Unknown';
      const list = byClass.get(cls) || [];
      list.push(r);
      byClass.set(cls, list);
    }
    const classLeaders = Array.from(byClass.entries()).map(([className, rs]) => {
      const scores = rs.map(r => Number(r.score) || 0);
      // points leader: member with most points in this class
      const pointsByMember = new Map<string, number>();
      for (const r of rs) {
        if (!r.competitorId) continue;
        pointsByMember.set(r.competitorId, (pointsByMember.get(r.competitorId) || 0) + (Number(r.pointsEarned) || 0));
      }
      const pointsLeaderEntry = Array.from(pointsByMember.entries()).sort((a, b) => b[1] - a[1])[0];
      // score leader: member holding the highest score in this class
      const bestResult = rs.reduce((best, r) => (Number(r.score) || 0) > (Number(best.score) || 0) ? r : best, rs[0]);
      return {
        className,
        format: bestResult.format || null,
        isSpl: isSpl(bestResult),
        entries: rs.length,
        members: new Set(rs.map(r => r.competitorId).filter(Boolean)).size,
        avgScore: round1(avg(scores)),
        pointsLeader: pointsLeaderEntry ? {
          name: nameOf(pointsLeaderEntry[0]),
          mecaId: mecaOf(pointsLeaderEntry[0]),
          points: pointsLeaderEntry[1],
        } : null,
        scoreLeader: bestResult.competitorId ? {
          name: nameOf(bestResult.competitorId),
          mecaId: mecaOf(bestResult.competitorId),
          score: round1(Number(bestResult.score) || 0),
        } : null,
      };
    }).sort((a, b) => b.entries - a.entries);

    // ---- Wattage & frequency (season-scoped) ----
    const wattResults = seasonResults.filter(r => (r.wattage || 0) > 0);
    const freqResults = seasonResults.filter(r => (r.frequency || 0) > 0);
    const maxWattResult = wattResults.reduce<CompetitionResult | null>(
      (best, r) => (!best || (r.wattage || 0) > (best.wattage || 0)) ? r : best, null);
    // top wattage per member
    const wattByMember = new Map<string, number>();
    for (const r of wattResults) {
      if (!r.competitorId) continue;
      wattByMember.set(r.competitorId, Math.max(wattByMember.get(r.competitorId) || 0, r.wattage || 0));
    }
    const wattageFrequency = {
      avgWattage: wattResults.length ? Math.round(avg(wattResults.map(r => r.wattage || 0))) : null,
      maxWattage: maxWattResult ? {
        value: maxWattResult.wattage,
        name: maxWattResult.competitorId ? nameOf(maxWattResult.competitorId) : maxWattResult.competitorName,
        eventName: maxWattResult.event?.title,
      } : null,
      topWattageByMember: Array.from(wattByMember.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([uid, watts]) => ({ name: nameOf(uid), mecaId: mecaOf(uid), wattage: watts })),
      avgFrequency: freqResults.length ? Math.round(avg(freqResults.map(r => r.frequency || 0))) : null,
      minFrequency: freqResults.length ? Math.min(...freqResults.map(r => r.frequency || 0)) : null,
      maxFrequency: freqResults.length ? Math.max(...freqResults.map(r => r.frequency || 0)) : null,
    };

    // ---- All-time team records board ----
    const describe = (r: CompetitionResult) => ({
      score: round1(Number(r.score) || 0),
      name: r.competitorId ? nameOf(r.competitorId) : r.competitorName,
      mecaId: r.competitorId ? mecaOf(r.competitorId) : undefined,
      eventName: r.event?.title,
      date: r.event?.eventDate ? new Date(r.event.eventDate).toISOString().split('T')[0] : undefined,
      className: r.competitionClass,
    });
    const allSpl = allResults.filter(isSpl);
    const allSq = allResults.filter(r => !isSpl(r));
    const bestSplEver = allSpl.length ? allSpl.reduce((b, r) => (Number(r.score) || 0) > (Number(b.score) || 0) ? r : b) : null;
    const bestSqEver = allSq.length ? allSq.reduce((b, r) => (Number(r.score) || 0) > (Number(b.score) || 0) ? r : b) : null;
    const maxWattEver = allResults.filter(r => (r.wattage || 0) > 0)
      .reduce<CompetitionResult | null>((b, r) => (!b || (r.wattage || 0) > (b.wattage || 0)) ? r : b, null);
    // biggest single-event points haul by one member
    const haulMap = new Map<string, { uid: string; eventName?: string; date?: string; points: number }>();
    for (const r of allResults) {
      if (!r.competitorId || !r.event) continue;
      const key = `${r.competitorId}|${r.event.id}`;
      const entry = haulMap.get(key) || {
        uid: r.competitorId,
        eventName: r.event.title,
        date: r.event.eventDate ? new Date(r.event.eventDate).toISOString().split('T')[0] : undefined,
        points: 0,
      };
      entry.points += Number(r.pointsEarned) || 0;
      haulMap.set(key, entry);
    }
    const biggestHaul = Array.from(haulMap.values()).sort((a, b) => b.points - a.points)[0] || null;
    const records = {
      bestSpl: bestSplEver ? describe(bestSplEver) : null,
      bestSq: bestSqEver ? describe(bestSqEver) : null,
      maxWattage: maxWattEver ? {
        value: maxWattEver.wattage,
        name: maxWattEver.competitorId ? nameOf(maxWattEver.competitorId) : maxWattEver.competitorName,
        eventName: maxWattEver.event?.title,
        date: maxWattEver.event?.eventDate ? new Date(maxWattEver.event.eventDate).toISOString().split('T')[0] : undefined,
      } : null,
      biggestEventPoints: biggestHaul ? {
        points: biggestHaul.points,
        name: nameOf(biggestHaul.uid),
        mecaId: mecaOf(biggestHaul.uid),
        eventName: biggestHaul.eventName,
        date: biggestHaul.date,
      } : null,
    };

    // ---- Season vs previous season comparison ----
    let seasonComparison: any = null;
    if (seasonId) {
      const season = await em.findOne(Season, { id: seasonId });
      if (season) {
        const previous = await em.findOne(Season, {
          startDate: { $lt: season.startDate },
        }, { orderBy: { startDate: 'DESC' } });
        const totalsFor = (sid: string) => {
          const rs = allResults.filter(r => r.seasonId === sid);
          return {
            points: rs.reduce((s, r) => s + (Number(r.pointsEarned) || 0), 0),
            competitions: rs.length,
            podiums: rs.filter(r => r.placement >= 1 && r.placement <= 3).length,
            events: new Set(rs.map(r => r.event?.id).filter(Boolean)).size,
          };
        };
        seasonComparison = {
          current: { seasonName: season.name, ...totalsFor(season.id) },
          previous: previous ? { seasonName: previous.name, ...totalsFor(previous.id) } : null,
        };
      }
    }

    // ---- Geographic footprint (season-scoped, distinct events per state) ----
    const stateEvents = new Map<string, Set<string>>();
    for (const r of seasonResults) {
      const state = r.event?.venueState || r.stateCode;
      if (!state || !r.event?.id) continue;
      const set = stateEvents.get(state) || new Set<string>();
      set.add(r.event.id);
      stateEvents.set(state, set);
    }
    const states = Array.from(stateEvents.entries())
      .map(([state, evts]) => ({ state, events: evts.size }))
      .sort((a, b) => b.events - a.events);

    // ---- Upcoming events members are registered for ----
    let upcomingEvents: Array<{ id: string; name: string; date: string; location?: string; membersRegistered: number }> = [];
    try {
      const registrations = await em.find(EventRegistration, {
        user: { $in: memberUserIds },
        paymentStatus: PaymentStatus.PAID,
      }, { populate: ['event'] });
      const now = new Date();
      const upcoming = new Map<string, { event: Event; count: number }>();
      for (const reg of registrations) {
        const evt = reg.event;
        if (!evt?.eventDate || new Date(evt.eventDate) < now) continue;
        const entry = upcoming.get(evt.id) || { event: evt, count: 0 };
        entry.count++;
        upcoming.set(evt.id, entry);
      }
      upcomingEvents = Array.from(upcoming.values())
        .sort((a, b) => new Date(a.event.eventDate!).getTime() - new Date(b.event.eventDate!).getTime())
        .slice(0, 5)
        .map(e => ({
          id: e.event.id,
          name: e.event.title,
          date: new Date(e.event.eventDate!).toISOString().split('T')[0],
          location: e.event.venueCity && e.event.venueState ? `${e.event.venueCity}, ${e.event.venueState}` : undefined,
          membersRegistered: e.count,
        }));
    } catch (regErr: any) {
      this.logger.warn(`Failed to fetch upcoming registrations for team ${teamId}: ${regErr.message}`);
    }

    // ---- Team rank among all teams by member points (season-scoped) ----
    let teamRank: { rank: number; totalTeams: number; points: number } | null = null;
    try {
      const rankSql = `
        SELECT t.id, COALESCE(SUM(cr.points_earned), 0) AS pts
        FROM teams t
        JOIN team_members tm ON tm.team_id = t.id AND tm.status = 'active'
        JOIN competition_results cr ON cr.competitor_id = tm.user_id
          AND cr.needs_class_review = false
          ${seasonId ? 'AND cr.season_id = ?' : ''}
        WHERE t.is_active = true
        GROUP BY t.id
        ORDER BY pts DESC`;
      const rows = await em.getConnection().execute(rankSql, seasonId ? [seasonId] : []);
      const idx = rows.findIndex((row: any) => row.id === teamId);
      if (idx >= 0) {
        teamRank = { rank: idx + 1, totalTeams: rows.length, points: Number(rows[idx].pts) || 0 };
      }
    } catch (rankErr: any) {
      this.logger.warn(`Failed to compute team rank for ${teamId}: ${rankErr.message}`);
    }

    return {
      memberLeaderboard,
      pointsOverTime,
      formatBreakdown,
      classLeaders,
      wattageFrequency,
      records,
      seasonComparison,
      states,
      upcomingEvents,
      teamRank,
    };
  }

  /**
   * Get all teams from active memberships (retailers, manufacturers, competitor teams)
   * This is the primary source of teams in the system.
   */
  async findAllMembershipTeams(): Promise<Array<{
    id: string;
    name: string;
    teamType: 'retailer' | 'manufacturer' | 'competitor_team';
    representativeName: string;
    mecaId: string;
    userId: string;
    memberCount: number;
    logoUrl?: string;
    location?: string;
    isPublic: boolean;
  }>> {
    const em = this.em.fork();

    // Query active memberships that have team eligibility
    const result = await em.getConnection().execute(`
      SELECT
        m.id as membership_id,
        m.user_id,
        m.meca_id,
        m.team_name,
        m.business_name,
        m.competitor_name,
        m.has_team_addon,
        m.status,
        mtc.name as membership_type_name,
        mtc.category as membership_category,
        mtc.includes_team,
        p.first_name,
        p.last_name,
        p.full_name,
        p.meca_id as profile_meca_id,
        p.profile_picture_url,
        p.city,
        p.state
      FROM memberships m
      JOIN membership_type_configs mtc ON mtc.id = m.membership_type_config_id
      LEFT JOIN profiles p ON p.id = m.user_id
      WHERE m.status = 'active'
      AND m.payment_status = 'paid'
      AND (m.end_date >= CURRENT_DATE OR m.end_date IS NULL)
      AND p.membership_status = 'active'
      AND (
        mtc.category = 'retail'
        OR mtc.category = 'manufacturer'
        OR mtc.category = 'team'
        OR mtc.includes_team = true
        OR mtc.name LIKE '%Team%'
        OR m.has_team_addon = true
      )
      ORDER BY m.team_name, m.business_name, p.last_name
    `);

    const teams: Array<{
      id: string;
      name: string;
      teamType: 'retailer' | 'manufacturer' | 'competitor_team';
      representativeName: string;
      mecaId: string;
      userId: string;
      memberCount: number;
      logoUrl?: string;
      location?: string;
      isPublic: boolean;
    }> = [];

    for (const m of result) {
      const mecaId = String(m.meca_id || m.profile_meca_id || '');
      const firstName = m.first_name || '';
      const lastName = m.last_name || '';
      const fullName = m.full_name || `${firstName} ${lastName}`.trim();

      let teamName: string;
      let teamType: 'retailer' | 'manufacturer' | 'competitor_team';
      let representativeName: string;

      if (m.membership_category === 'retail') {
        teamName = m.business_name || m.team_name || m.competitor_name || fullName;
        teamType = 'retailer';
        representativeName = (firstName && lastName) ? `${firstName} ${lastName}` : fullName;
      } else if (m.membership_category === 'manufacturer') {
        teamName = m.business_name || m.team_name || m.competitor_name || fullName;
        teamType = 'manufacturer';
        representativeName = (firstName && lastName) ? `${firstName} ${lastName}` : fullName;
      } else {
        teamType = 'competitor_team';
        representativeName = (firstName && lastName) ? `${firstName} ${lastName}` : fullName;

        if (m.team_name && m.team_name.trim()) {
          teamName = m.team_name.trim();
        } else {
          // Placeholder for teams without a name set
          const safeName = `${firstName}_${lastName}`.replace(/\s+/g, '_').toLowerCase();
          teamName = `${safeName}_team_not_populated`;
        }
      }

      // Build location string
      const location = (m.city && m.state) ? `${m.city}, ${m.state}` : undefined;

      teams.push({
        id: m.membership_id, // Use membership ID as team ID for membership-based teams
        name: teamName,
        teamType,
        representativeName,
        mecaId,
        userId: m.user_id,
        memberCount: 1, // Membership-based teams have 1 member by default
        logoUrl: m.profile_picture_url || undefined,
        location,
        isPublic: true,
      });
    }

    return teams;
  }

  /**
   * Get all public teams with basic info for the directory
   * Returns both legacy teams from the teams table AND membership-based teams
   */
  async findAllPublicTeams(): Promise<any[]> {
    const em = this.em.fork();

    // Get legacy teams from teams table (populate membership so we can
    // dedupe the synthetic membership-teams against rows that already
    // exist in `teams` and link to the same membership).
    const legacyTeams = await em.find(Team, { isActive: true, isPublic: true }, {
      orderBy: { name: 'ASC' },
      populate: ['membership'],
    });

    // Get membership-based teams
    const membershipTeams = await this.findAllMembershipTeams();

    // Batch-load all legacy team members and profiles
    const legacyTeamIds = legacyTeams.map(t => t.id);
    const allLegacyMembers = legacyTeamIds.length > 0
      ? await em.find(TeamMember, { teamId: { $in: legacyTeamIds }, status: 'active' })
      : [];

    // Collect all user IDs for batch profile loading
    const legacyUserIds = [
      ...legacyTeams.map(t => t.captainId),
      ...allLegacyMembers.map(m => m.userId),
    ];
    const legacyProfileMap = await this.loadProfileMap(em, legacyUserIds);

    // Group members by team
    const legacyMembersByTeam = new Map<string, TeamMember[]>();
    for (const member of allLegacyMembers) {
      const list = legacyMembersByTeam.get(member.teamId) || [];
      list.push(member);
      legacyMembersByTeam.set(member.teamId, list);
    }

    // Build legacy teams with details (no more N+1)
    // Filter out teams whose owner does not have an active membership
    const legacyTeamsWithDetails = legacyTeams
      .filter(team => {
        const owner = legacyProfileMap.get(team.captainId);
        return owner?.membership_status === 'active';
      })
      .map(team => {
      const owner = legacyProfileMap.get(team.captainId);
      const members = legacyMembersByTeam.get(team.id) || [];
      const membersWithUsers = members.map(m => this.buildMemberWithUserFromMap(m, legacyProfileMap));

      return {
        id: team.id,
        name: team.name,
        teamType: team.teamType || 'competitive',
        description: team.description,
        logoUrl: team.logoUrl,
        location: team.location,
        isPublic: team.isPublic,
        memberCount: members.length,
        source: 'legacy' as const,
        owner: owner ? {
          id: owner.id,
          first_name: owner.first_name,
          last_name: owner.last_name,
          meca_id: owner.meca_id,
          profile_picture_url: owner.profile_picture_url || owner.profile_images?.[0] || undefined,
        } : undefined,
        members: membersWithUsers,
      };
    });

    // Dedupe: if a legacy team is already linked to a membership, skip the
    // synthetic membership-team for that same membership. (Without this,
    // every retail/manufacturer membership shows up twice in the directory:
    // once from the teams table and once from findAllMembershipTeams.)
    const membershipIdsCoveredByLegacy = new Set(
      legacyTeams.map(t => (t as any).membership?.id).filter(Boolean),
    );
    const dedupedMembershipTeams = membershipTeams.filter(
      mt => !membershipIdsCoveredByLegacy.has(mt.id),
    );

    // Transform membership teams to match the format
    const membershipTeamsFormatted = dedupedMembershipTeams.map(team => ({
      id: team.id,
      name: team.name,
      teamType: team.teamType,
      description: undefined,
      logoUrl: team.logoUrl,
      location: team.location,
      isPublic: team.isPublic,
      memberCount: team.memberCount,
      source: 'membership' as const,
      representativeName: team.representativeName,
      mecaId: team.mecaId,
      userId: team.userId,
      owner: {
        first_name: team.representativeName.split(' ')[0] || '',
        last_name: team.representativeName.split(' ').slice(1).join(' ') || '',
        meca_id: team.mecaId,
        profile_picture_url: team.logoUrl,
      },
      members: [],
    }));

    // Combine and sort by name
    const allTeams = [...legacyTeamsWithDetails, ...membershipTeamsFormatted];
    allTeams.sort((a, b) => a.name.localeCompare(b.name));

    return allTeams;
  }

  /**
   * Get public team profile by ID
   * Supports both legacy teams (from teams table) and membership-based teams (from memberships)
   */
  async getPublicTeamById(id: string): Promise<any | null> {
    const em = this.em.fork();

    // First try to find a legacy team
    const team = await em.findOne(Team, { id, isActive: true });

    if (team) {
      // Legacy team found - return with full details
      const activeMembers = await em.find(TeamMember, { teamId: team.id, status: 'active' });
      const userIds = [team.captainId, ...activeMembers.map(m => m.userId)];
      const profileMap = await this.loadProfileMap(em, userIds);
      const owner = profileMap.get(team.captainId);
      const membersWithUsers = activeMembers.map(m => this.buildMemberWithUserFromMap(m, profileMap));

      return {
        ...team,
        source: 'legacy',
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

    // Not a legacy team - check if it's a membership ID for a membership-based team
    const membershipResult = await em.getConnection().execute(`
      SELECT
        m.id as membership_id,
        m.user_id,
        m.meca_id,
        m.team_name,
        m.business_name,
        m.competitor_name,
        m.status,
        mtc.name as membership_type_name,
        mtc.category as membership_category,
        p.id as profile_id,
        p.first_name,
        p.last_name,
        p.full_name,
        p.meca_id as profile_meca_id,
        p.profile_picture_url,
        p.city,
        p.state,
        p.bio
      FROM memberships m
      JOIN membership_type_configs mtc ON mtc.id = m.membership_type_config_id
      LEFT JOIN profiles p ON p.id = m.user_id
      WHERE m.id = ?
      AND m.status = 'active'
      AND (
        mtc.category = 'retail'
        OR mtc.category = 'manufacturer'
        OR mtc.category = 'team'
        OR mtc.includes_team = true
        OR mtc.name LIKE '%Team%'
        OR m.has_team_addon = true
      )
    `, [id]);

    if (!membershipResult || membershipResult.length === 0) {
      return null;
    }

    const m = membershipResult[0];
    const firstName = m.first_name || '';
    const lastName = m.last_name || '';
    const fullName = m.full_name || `${firstName} ${lastName}`.trim();

    let teamName: string;
    let teamType: string;
    let representativeName: string;

    if (m.membership_category === 'retail') {
      teamName = m.business_name || m.team_name || m.competitor_name || fullName;
      teamType = 'retailer';
      representativeName = (firstName && lastName) ? `${firstName} ${lastName}` : fullName;
    } else if (m.membership_category === 'manufacturer') {
      teamName = m.business_name || m.team_name || m.competitor_name || fullName;
      teamType = 'manufacturer';
      representativeName = (firstName && lastName) ? `${firstName} ${lastName}` : fullName;
    } else {
      teamType = 'competitor_team';
      representativeName = (firstName && lastName) ? `${firstName} ${lastName}` : fullName;

      if (m.team_name && m.team_name.trim()) {
        teamName = m.team_name.trim();
      } else {
        const safeName = `${firstName}_${lastName}`.replace(/\s+/g, '_').toLowerCase();
        teamName = `${safeName}_team_not_populated`;
      }
    }

    const location = (m.city && m.state) ? `${m.city}, ${m.state}` : undefined;

    // Return membership-based team
    return {
      id: m.membership_id,
      name: teamName,
      teamType,
      description: m.bio || undefined,
      logoUrl: m.profile_picture_url || undefined,
      location,
      isPublic: true,
      isActive: true,
      memberCount: 1,
      source: 'membership',
      captainId: m.user_id,
      owner: {
        id: m.user_id,
        first_name: firstName,
        last_name: lastName,
        meca_id: m.meca_id || m.profile_meca_id,
        profile_picture_url: m.profile_picture_url,
      },
      representativeName,
      mecaId: m.meca_id || m.profile_meca_id,
      userId: m.user_id,
      members: [{
        id: m.membership_id,
        teamId: m.membership_id,
        userId: m.user_id,
        role: 'owner',
        status: 'active',
        user: {
          id: m.user_id,
          first_name: firstName,
          last_name: lastName,
          meca_id: m.meca_id || m.profile_meca_id,
          profile_picture_url: m.profile_picture_url,
        },
      }],
    };
  }

  /**
   * Get all teams a user is associated with (owned and member of)
   * Users can be on multiple teams now
   */
  async findAllTeamsByUserId(userId: string): Promise<{
    ownedTeams: TeamWithMembers[];
    memberTeams: TeamWithMembers[];
  }> {
    const em = this.em.fork();

    // Find teams where user is the owner (captainId)
    const ownedTeamsRaw = await em.find(Team, { captainId: userId, isActive: true }, {
      orderBy: { name: 'ASC' },
    });

    // Find teams where user is a member (but not owner)
    const memberships = await em.find(TeamMember, { userId, status: 'active' });
    const memberTeamIds = memberships
      .map(m => m.teamId)
      .filter(teamId => !ownedTeamsRaw.some(t => t.id === teamId));

    const memberTeamsRaw = memberTeamIds.length > 0
      ? await em.find(Team, { id: { $in: memberTeamIds }, isActive: true }, { orderBy: { name: 'ASC' } })
      : [];

    // Batch-load all team members for all teams in one query
    const allTeamIds = [...ownedTeamsRaw, ...memberTeamsRaw].map(t => t.id);
    const allTeamMembers = allTeamIds.length > 0
      ? await em.find(TeamMember, { teamId: { $in: allTeamIds }, status: 'active' })
      : [];

    // Collect all user IDs for batch profile loading
    const allUserIds = [
      ...ownedTeamsRaw.map(t => t.captainId),
      ...memberTeamsRaw.map(t => t.captainId),
      ...allTeamMembers.map(m => m.userId),
    ];
    const profileMap = await this.loadProfileMap(em, allUserIds);

    // Group members by team
    const membersByTeam = new Map<string, TeamMember[]>();
    for (const member of allTeamMembers) {
      const list = membersByTeam.get(member.teamId) || [];
      list.push(member);
      membersByTeam.set(member.teamId, list);
    }

    // Build details using pre-loaded data
    const buildTeamDetails = (team: Team): TeamWithMembers => {
      const owner = profileMap.get(team.captainId);
      const members = membersByTeam.get(team.id) || [];
      const membersWithUsers = members.map(m => this.buildMemberWithUserFromMap(m, profileMap));
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
    };

    const ownedTeams = ownedTeamsRaw.map(buildTeamDetails);
    const memberTeams = memberTeamsRaw.map(buildTeamDetails);

    return { ownedTeams, memberTeams };
  }

  /**
   * Check if a user owns any team
   */
  async userOwnsAnyTeam(userId: string): Promise<boolean> {
    const em = this.em.fork();
    const ownedTeam = await em.findOne(Team, { captainId: userId, isActive: true });
    return !!ownedTeam;
  }

  // ============================================
  // ADMIN TEAM MANAGEMENT
  // ============================================

  async assertAdmin(userId: string): Promise<void> {
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: userId });
    if (!isAdminUser(profile)) {
      throw new ForbiddenException('Admin access required');
    }
  }

  private buildAdminTeamSummary(
    team: Team,
    allMembers: TeamMember[],
    profileMap: Map<string, Profile>,
  ) {
    const teamMembers = allMembers.filter(m => m.teamId === team.id);
    const owner = profileMap.get(team.captainId);
    return {
      id: team.id,
      name: team.name,
      teamType: team.teamType,
      location: team.location,
      isActive: team.isActive,
      isPublic: team.isPublic,
      createdAt: team.createdAt,
      membershipId: (team as any).membership?.id || (team as any).membership || null,
      activeMemberCount: teamMembers.filter(m => m.status === 'active').length,
      pendingCount: teamMembers.filter(m => m.status === 'pending_approval' || m.status === 'pending_invite').length,
      owner: owner ? {
        id: owner.id,
        first_name: owner.first_name,
        last_name: owner.last_name,
        meca_id: owner.meca_id != null ? String(owner.meca_id) : undefined,
        email: owner.email,
        membership_status: owner.membership_status,
      } : { id: team.captainId },
    };
  }

  /**
   * Admin: search teams by name (or list all when query is empty).
   * Includes inactive and non-public teams so admins can find anything.
   */
  async adminSearchTeams(query?: string): Promise<any[]> {
    const em = this.em.fork();

    const where: Record<string, unknown> = {};
    const trimmed = query?.trim();
    if (trimmed) {
      where.name = { $ilike: `%${trimmed}%` };
    }

    const teams = await em.find(Team, where, { orderBy: { name: 'ASC' }, limit: 1000 });
    if (teams.length === 0) return [];

    const teamIds = teams.map(t => t.id);
    const allMembers = await em.find(TeamMember, { teamId: { $in: teamIds } });
    const profileMap = await this.loadProfileMap(em, teams.map(t => t.captainId));

    return teams.map(t => this.buildAdminTeamSummary(t, allMembers, profileMap));
  }

  /**
   * Admin: search members (profiles) by name, email, or MECA ID, with the
   * count of team associations each has — so admins can jump from a person
   * to their teams.
   */
  async adminSearchMembers(query: string): Promise<any[]> {
    const em = this.em.fork();
    const trimmed = query?.trim();
    if (!trimmed) return [];

    const term = `%${trimmed}%`;
    const rows = await em.getConnection().execute(
      `SELECT p.id, p.first_name, p.last_name, p.email, p.meca_id, p.membership_status,
              (SELECT COUNT(*) FROM teams t WHERE t.captain_id = p.id) AS owned_team_count,
              (SELECT COUNT(*) FROM team_members tm WHERE tm.user_id = p.id) AS team_member_rows
       FROM profiles p
       WHERE p.first_name ILIKE ? OR p.last_name ILIKE ?
          OR (p.first_name || ' ' || p.last_name) ILIKE ?
          OR p.email ILIKE ? OR p.meca_id::text ILIKE ?
       ORDER BY p.last_name, p.first_name
       LIMIT 25`,
      [term, term, term, term, term],
    );

    return rows.map((r: any) => ({
      id: r.id,
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      meca_id: r.meca_id != null ? String(r.meca_id) : undefined,
      membership_status: r.membership_status,
      ownedTeamCount: Number(r.owned_team_count) || 0,
      teamMemberRows: Number(r.team_member_rows) || 0,
    }));
  }

  /**
   * Admin: every team association for a user — teams they captain (including
   * inactive ones) and every team_members row regardless of status. This is
   * the forensic view for cleaning up bad data.
   */
  async adminGetUserTeams(userId: string): Promise<{
    profile: any;
    ownedTeams: any[];
    memberRows: any[];
  }> {
    const em = this.em.fork();

    const profile = await em.findOne(Profile, { id: userId });
    if (!profile) {
      throw new NotFoundException('User not found');
    }

    const ownedTeams = await em.find(Team, { captainId: userId }, { orderBy: { name: 'ASC' } });
    const memberRows = await em.find(TeamMember, { userId });

    const memberTeamIds = memberRows.map(m => m.teamId);
    const memberTeams = memberTeamIds.length > 0
      ? await em.find(Team, { id: { $in: memberTeamIds } })
      : [];
    const teamMap = new Map(memberTeams.map(t => [t.id, t]));

    const allTeams = [...ownedTeams, ...memberTeams];
    const allMembers = allTeams.length > 0
      ? await em.find(TeamMember, { teamId: { $in: allTeams.map(t => t.id) } })
      : [];
    const profileMap = await this.loadProfileMap(em, allTeams.map(t => t.captainId));

    return {
      profile: {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        meca_id: profile.meca_id != null ? String(profile.meca_id) : undefined,
        membership_status: profile.membership_status,
      },
      ownedTeams: ownedTeams.map(t => this.buildAdminTeamSummary(t, allMembers, profileMap)),
      memberRows: memberRows.map(m => {
        const team = teamMap.get(m.teamId);
        return {
          teamId: m.teamId,
          role: m.role,
          status: m.status,
          joinedAt: m.joinedAt,
          requestedAt: m.requestedAt,
          team: team ? this.buildAdminTeamSummary(team, allMembers, profileMap) : null,
        };
      }),
    };
  }

  /**
   * Admin: reassign a team to a different owner by MECA ID, in one step.
   * Unlike transferOwnership, the new owner does NOT need to already be on
   * the roster — a member row is created if missing. The previous owner's
   * row is demoted to member, or removed entirely when removePrevious is set
   * (for fixing teams that were assigned to the wrong person).
   */
  async adminReassignOwner(teamId: string, mecaId: string, removePrevious: boolean): Promise<Team> {
    const em = this.em.fork();

    const team = await em.findOne(Team, { id: teamId });
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    const trimmedMecaId = String(mecaId ?? '').trim();
    if (!trimmedMecaId) {
      throw new BadRequestException('MECA ID is required');
    }
    const newOwner = await em.findOne(Profile, { meca_id: trimmedMecaId });
    if (!newOwner) {
      throw new NotFoundException(`No member found with MECA ID ${trimmedMecaId}`);
    }
    if (newOwner.id === team.captainId) {
      throw new BadRequestException('That member already owns this team');
    }

    const previousCaptainId = team.captainId;

    // Ensure the new owner has an active owner-role row on this team
    const existingRow = await em.findOne(TeamMember, { teamId, userId: newOwner.id });
    if (existingRow) {
      existingRow.role = 'owner';
      existingRow.status = 'active';
      if (!existingRow.joinedAt) existingRow.joinedAt = new Date();
    } else {
      em.persist(em.create(TeamMember, {
        teamId,
        userId: newOwner.id,
        role: 'owner',
        status: 'active',
        joinedAt: new Date(),
      }));
    }

    // Demote or remove the previous owner's roster row
    const previousRow = await em.findOne(TeamMember, { teamId, userId: previousCaptainId });
    if (previousRow) {
      if (removePrevious) {
        em.remove(previousRow);
      } else {
        previousRow.role = 'member';
      }
    }

    team.captainId = newOwner.id;
    team.updatedAt = new Date();
    await em.flush();

    this.logger.log(`Admin reassigned team ${team.id} (${team.name}) from ${previousCaptainId} to ${newOwner.id} (MECA ${trimmedMecaId})${removePrevious ? ', previous owner removed' : ''}`);
    return team;
  }

  /**
   * Admin: activate or deactivate a team without deleting it.
   */
  async adminSetTeamActive(teamId: string, isActive: boolean): Promise<Team> {
    const em = this.em.fork();
    const team = await em.findOne(Team, { id: teamId });
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }
    team.isActive = isActive;
    team.updatedAt = new Date();
    await em.flush();
    return team;
  }
}
