import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { Team } from './team.entity';
import { TeamMember, TeamMemberRole } from './team-member.entity';
import { SupabaseAdminService } from '../auth/supabase-admin.service';

interface CreateTeamDto {
  name: string;
  description?: string;
  bio?: string;
  logo_url?: string;
  season_id?: string;
  team_type?: string;
  location?: string;
  max_members?: number;
  website?: string;
  is_public?: boolean;
  requires_approval?: boolean;
  gallery_images?: string[];
}

interface UpdateTeamDto {
  name?: string;
  description?: string;
  bio?: string;
  logo_url?: string;
  team_type?: string;
  location?: string;
  max_members?: number;
  website?: string;
  is_public?: boolean;
  requires_approval?: boolean;
  gallery_images?: string[];
  cover_image_position?: { x: number; y: number };
}

interface AddMemberDto {
  user_id: string;
}

interface UpdateMemberRoleDto {
  role: TeamMemberRole;
}

interface TransferOwnershipDto {
  new_owner_id: string;
}

// Keep for backward compatibility
interface TransferCaptaincyDto {
  new_captain_id: string;
}

interface InviteMemberDto {
  user_id: string;
  message?: string;
}

interface RequestToJoinDto {
  message?: string;
}

interface LookupMemberDto {
  meca_id: string;
}

@Controller('api/teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly supabaseAdmin: SupabaseAdminService,
  ) {}

  // Helper to validate Bearer token via Supabase and return authenticated user ID
  private async requireAuth(authHeader?: string): Promise<string> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }
    return user.id;
  }

  @Get()
  async getAllTeams(): Promise<Team[]> {
    return this.teamsService.findAll();
  }

  // Public endpoint - get all public teams for directory
  @Get('public')
  async getPublicTeams(): Promise<Team[]> {
    return this.teamsService.findAllPublicTeams();
  }

  // Public endpoint - get public team by ID
  @Get('public/:id')
  async getPublicTeamById(@Param('id') id: string): Promise<Team | null> {
    return this.teamsService.getPublicTeamById(id);
  }

  // Public endpoint - get team stats (optionally filtered by season)
  @Get('public/:id/stats')
  async getTeamPublicStats(
    @Param('id') id: string,
    @Query('seasonId') seasonId?: string,
  ): Promise<any> {
    return this.teamsService.getTeamPublicStats(id, seasonId);
  }

  @Get('can-create')
  async canCreateTeam(@Headers('authorization') authHeader: string): Promise<{ canCreate: boolean; reason?: string }> {
    try {
      const userId = await this.requireAuth(authHeader);
      const canCreate = await this.teamsService.hasTeamMembership(userId);
      return {
        canCreate,
        reason: canCreate ? undefined : 'Team membership required to create a team',
      };
    } catch {
      return { canCreate: false, reason: 'Not authenticated' };
    }
  }

  @Get('can-upgrade')
  async canUpgradeToTeam(@Headers('authorization') authHeader: string): Promise<{
    canUpgrade: boolean;
    hasCompetitorMembership: boolean;
    hasTeamMembership: boolean;
    reason?: string;
  }> {
    try {
      const userId = await this.requireAuth(authHeader);
      const result = await this.teamsService.checkUpgradeEligibility(userId);
      return result;
    } catch {
      return {
        canUpgrade: false,
        hasCompetitorMembership: false,
        hasTeamMembership: false,
        reason: 'Not authenticated',
      };
    }
  }

  @Get('my-team')
  async getMyTeam(@Headers('authorization') authHeader: string): Promise<Team | null> {
    const userId = await this.requireAuth(authHeader);
    return this.teamsService.findByUserId(userId);
  }

  // Get all teams the user is associated with (owned and member of)
  @Get('my-teams')
  async getMyTeams(@Headers('authorization') authHeader: string): Promise<{
    ownedTeams: Team[];
    memberTeams: Team[];
  }> {
    const userId = await this.requireAuth(authHeader);
    return this.teamsService.findAllTeamsByUserId(userId);
  }

  // Check if the user owns any team
  @Get('owns-team')
  async ownsTeam(@Headers('authorization') authHeader: string): Promise<{ ownsTeam: boolean }> {
    try {
      const userId = await this.requireAuth(authHeader);
      const ownsTeam = await this.teamsService.userOwnsAnyTeam(userId);
      return { ownsTeam };
    } catch {
      return { ownsTeam: false };
    }
  }

  // Get my pending invites (must be before :id route)
  @Get('my-invites')
  async getMyPendingInvites(@Headers('authorization') authHeader: string): Promise<any[]> {
    const userId = await this.requireAuth(authHeader);
    return this.teamsService.getMyPendingInvites(userId);
  }

  // Get my pending join requests (must be before :id route)
  @Get('my-requests')
  async getMyPendingRequests(@Headers('authorization') authHeader: string): Promise<any[]> {
    const userId = await this.requireAuth(authHeader);
    return this.teamsService.getMyPendingRequests(userId);
  }

  @Get('user/:userId')
  async getTeamByUserId(@Param('userId') userId: string): Promise<Team | null> {
    return this.teamsService.findByUserId(userId);
  }

  @Get(':id')
  async getTeam(@Param('id') id: string, @Headers('authorization') authHeader: string): Promise<Team> {
    try {
      const userId = await this.requireAuth(authHeader);
      return this.teamsService.findById(id, userId);
    } catch {
      // Not authenticated, return without pending data
      return this.teamsService.findById(id);
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTeam(
    @Body() data: CreateTeamDto,
    @Headers('authorization') authHeader: string,
  ): Promise<Team> {
    const userId = await this.requireAuth(authHeader);
    return this.teamsService.create(
      {
        name: data.name,
        description: data.description,
        bio: data.bio,
        logoUrl: data.logo_url,
        seasonId: data.season_id,
        teamType: data.team_type,
        location: data.location,
        maxMembers: data.max_members,
        website: data.website,
        isPublic: data.is_public,
        requiresApproval: data.requires_approval,
        galleryImages: data.gallery_images,
      },
      userId,
    );
  }

  @Put(':id')
  async updateTeam(
    @Param('id') id: string,
    @Body() data: UpdateTeamDto,
    @Headers('authorization') authHeader: string,
  ): Promise<Team> {
    const userId = await this.requireAuth(authHeader);
    return this.teamsService.update(
      id,
      {
        name: data.name,
        description: data.description,
        bio: data.bio,
        logoUrl: data.logo_url,
        teamType: data.team_type,
        location: data.location,
        maxMembers: data.max_members,
        website: data.website,
        isPublic: data.is_public,
        requiresApproval: data.requires_approval,
        galleryImages: data.gallery_images,
        coverImagePosition: data.cover_image_position,
      },
      userId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTeam(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ): Promise<void> {
    const userId = await this.requireAuth(authHeader);
    return this.teamsService.delete(id, userId);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('id') teamId: string,
    @Body() data: AddMemberDto,
    @Headers('authorization') authHeader: string,
  ): Promise<TeamMember> {
    const userId = await this.requireAuth(authHeader);
    return this.teamsService.addMember(teamId, data.user_id, userId);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id') teamId: string,
    @Param('userId') memberId: string,
    @Headers('authorization') authHeader: string,
  ): Promise<void> {
    const requesterId = await this.requireAuth(authHeader);
    return this.teamsService.removeMember(teamId, memberId, requesterId);
  }

  @Patch(':id/members/:userId/role')
  async updateMemberRole(
    @Param('id') teamId: string,
    @Param('userId') memberId: string,
    @Body() data: UpdateMemberRoleDto,
    @Headers('authorization') authHeader: string,
  ): Promise<TeamMember> {
    const requesterId = await this.requireAuth(authHeader);
    return this.teamsService.updateMemberRole(teamId, memberId, data.role, requesterId);
  }

  @Put(':id/transfer-ownership')
  async transferOwnership(
    @Param('id') teamId: string,
    @Body() data: TransferOwnershipDto,
    @Headers('authorization') authHeader: string,
  ): Promise<Team> {
    const userId = await this.requireAuth(authHeader);
    return this.teamsService.transferOwnership(teamId, data.new_owner_id, userId);
  }

  // Keep for backward compatibility
  @Put(':id/transfer-captaincy')
  async transferCaptaincy(
    @Param('id') teamId: string,
    @Body() data: TransferCaptaincyDto,
    @Headers('authorization') authHeader: string,
  ): Promise<Team> {
    const userId = await this.requireAuth(authHeader);
    return this.teamsService.transferCaptaincy(teamId, data.new_captain_id, userId);
  }

  @Post('leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveTeam(@Headers('authorization') authHeader: string): Promise<void> {
    const userId = await this.requireAuth(authHeader);
    return this.teamsService.leaveTeam(userId);
  }

  // ============================================
  // INVITE SYSTEM ENDPOINTS
  // ============================================

  // Lookup member by MECA ID for invite preview
  @Post('lookup-member')
  async lookupMember(@Body() data: LookupMemberDto): Promise<any> {
    const result = await this.teamsService.lookupMemberByMecaId(data.meca_id);
    if (!result) {
      return { found: false, message: 'No member found with this MECA ID' };
    }
    return { found: true, member: result };
  }

  // Invite a member to the team
  @Post(':id/invite')
  @HttpCode(HttpStatus.CREATED)
  async inviteMember(
    @Param('id') teamId: string,
    @Body() data: InviteMemberDto,
    @Headers('authorization') authHeader: string,
  ): Promise<TeamMember> {
    const requesterId = await this.requireAuth(authHeader);
    return this.teamsService.inviteMember(teamId, data.user_id, requesterId, data.message);
  }

  // Cancel a sent invite
  @Delete(':id/invite/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelInvite(
    @Param('id') teamId: string,
    @Param('userId') inviteeId: string,
    @Headers('authorization') authHeader: string,
  ): Promise<void> {
    const requesterId = await this.requireAuth(authHeader);
    return this.teamsService.cancelInvite(teamId, inviteeId, requesterId);
  }

  // Accept an invite
  @Post(':id/accept-invite')
  async acceptInvite(
    @Param('id') teamId: string,
    @Headers('authorization') authHeader: string,
  ): Promise<TeamMember> {
    const userId = await this.requireAuth(authHeader);
    return this.teamsService.acceptInvite(teamId, userId);
  }

  // Decline an invite
  @Post(':id/decline-invite')
  @HttpCode(HttpStatus.NO_CONTENT)
  async declineInvite(
    @Param('id') teamId: string,
    @Headers('authorization') authHeader: string,
  ): Promise<void> {
    const userId = await this.requireAuth(authHeader);
    return this.teamsService.declineInvite(teamId, userId);
  }

  // ============================================
  // JOIN REQUEST SYSTEM ENDPOINTS
  // ============================================

  // Request to join a team
  @Post(':id/request-join')
  @HttpCode(HttpStatus.CREATED)
  async requestToJoin(
    @Param('id') teamId: string,
    @Body() data: RequestToJoinDto,
    @Headers('authorization') authHeader: string,
  ): Promise<TeamMember> {
    const userId = await this.requireAuth(authHeader);
    return this.teamsService.requestToJoin(teamId, userId, data.message);
  }

  // Cancel my join request
  @Delete(':id/request-join')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelJoinRequest(
    @Param('id') teamId: string,
    @Headers('authorization') authHeader: string,
  ): Promise<void> {
    const userId = await this.requireAuth(authHeader);
    return this.teamsService.cancelJoinRequest(teamId, userId);
  }

  // Approve a join request (owner/co-owner)
  @Post(':id/approve-request/:userId')
  async approveJoinRequest(
    @Param('id') teamId: string,
    @Param('userId') requesterId: string,
    @Headers('authorization') authHeader: string,
  ): Promise<TeamMember> {
    const approverId = await this.requireAuth(authHeader);
    return this.teamsService.approveJoinRequest(teamId, requesterId, approverId);
  }

  // Reject a join request (owner/co-owner)
  @Delete(':id/reject-request/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async rejectJoinRequest(
    @Param('id') teamId: string,
    @Param('userId') requesterId: string,
    @Headers('authorization') authHeader: string,
  ): Promise<void> {
    const approverId = await this.requireAuth(authHeader);
    return this.teamsService.rejectJoinRequest(teamId, requesterId, approverId);
  }
}
