import { Injectable, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Team, TeamMember } from './team.entity';

@Injectable()
export class TeamsService {
  constructor(private readonly em: EntityManager) {}

  // Teams CRUD
  async findAll() {
    return this.em.find(Team, {});
  }

  async findById(id: string) {
    return this.em.findOne(Team, { id });
  }

  async findByOwner(ownerId: string) {
    return this.em.find(Team, { owner: ownerId });
  }

  async create(ownerId: string, data: Partial<Team>) {
    const team = this.em.create(Team, { ...data, owner: ownerId });
    await this.em.persistAndFlush(team);

    // Add owner as team member with owner role
    const ownerMember = this.em.create(TeamMember, {
      team: team.id,
      member: ownerId,
      role: 'owner',
    });
    await this.em.persistAndFlush(ownerMember);

    return team;
  }

  async update(id: string, userId: string, data: Partial<Team>) {
    const team = await this.em.findOneOrFail(Team, { id });

    // Check if user is owner
    if (team.owner !== userId) {
      throw new ForbiddenException('Only team owner can update team');
    }

    this.em.assign(team, data);
    await this.em.flush();
    return team;
  }

  async delete(id: string, userId: string) {
    const team = await this.em.findOneOrFail(Team, { id });

    // Check if user is owner
    if (team.owner !== userId) {
      throw new ForbiddenException('Only team owner can delete team');
    }

    await this.em.removeAndFlush(team);
  }

  // Team Members
  async getTeamMembers(teamId: string) {
    return this.em.find(TeamMember, { team: teamId });
  }

  async addMember(teamId: string, memberId: string, role: string = 'member') {
    const member = this.em.create(TeamMember, {
      team: teamId,
      member: memberId,
      role,
    });
    await this.em.persistAndFlush(member);
    return member;
  }

  async removeMember(teamId: string, memberId: string, requesterId: string) {
    const team = await this.em.findOneOrFail(Team, { id: teamId });

    // Check if requester is owner
    if (team.owner !== requesterId) {
      throw new ForbiddenException('Only team owner can remove members');
    }

    const member = await this.em.findOne(TeamMember, { team: teamId, member: memberId });
    if (member) {
      await this.em.removeAndFlush(member);
    }
  }

  async updateMemberRole(teamId: string, memberId: string, requesterId: string, role: string) {
    const team = await this.em.findOneOrFail(Team, { id: teamId });

    // Check if requester is owner
    if (team.owner !== requesterId) {
      throw new ForbiddenException('Only team owner can update member roles');
    }

    const member = await this.em.findOneOrFail(TeamMember, { team: teamId, member: memberId });
    member.role = role;
    await this.em.flush();
    return member;
  }

  async getUserTeams(userId: string) {
    const memberships = await this.em.find(TeamMember, { member: userId });
    return memberships;
  }
}
