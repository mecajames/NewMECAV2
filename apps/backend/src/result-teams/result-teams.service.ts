import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { ResultTeam } from './result-team.entity';
import { CompetitionResult } from '../competition-results/competition-results.entity';

// DTOs
export interface CreateResultTeamDto {
  resultId: string;
  teamId: string;
  memberId?: string;
}

export interface TeamMemberData {
  teamId: string;
  memberId?: string;
}

@Injectable()
export class ResultTeamsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // ============================================
  // QUERY METHODS
  // ============================================

  /**
   * Get all result teams for a specific result
   */
  async getResultTeamsByResultId(resultId: string): Promise<ResultTeam[]> {
    const em = this.em.fork();
    return em.find(ResultTeam, { result: resultId }, {
      populate: ['team', 'member'],
    });
  }

  /**
   * Get all result teams for a specific team
   */
  async getResultTeamsByTeamId(teamId: string): Promise<ResultTeam[]> {
    const em = this.em.fork();
    return em.find(ResultTeam, { team: teamId }, {
      populate: ['result', 'member'],
      orderBy: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all result teams for a specific member
   */
  async getResultTeamsByMemberId(memberId: string): Promise<ResultTeam[]> {
    const em = this.em.fork();
    return em.find(ResultTeam, { member: memberId }, {
      populate: ['result', 'team'],
      orderBy: { createdAt: 'DESC' },
    });
  }

  /**
   * Get team results for a specific season
   */
  async getTeamResultsForSeason(teamId: string, seasonId: string): Promise<ResultTeam[]> {
    const em = this.em.fork();

    // First get all result teams for this team
    const resultTeams = await em.find(ResultTeam, { team: teamId }, {
      populate: ['result', 'member'],
    });

    // Filter by season (via the result's season)
    const filteredResults: ResultTeam[] = [];
    for (const rt of resultTeams) {
      if (rt.result) {
        const result = await em.findOne(CompetitionResult, { id: (rt.result as any).id || rt.result });
        if (result && result.seasonId === seasonId) {
          filteredResults.push(rt);
        }
      }
    }

    return filteredResults;
  }

  // ============================================
  // AGGREGATION METHODS
  // ============================================

  /**
   * Get total points for a team in a season
   */
  async getTeamPointsForSeason(teamId: string, seasonId: string): Promise<number> {
    const em = this.em.fork();

    // Get all result teams for this team
    const resultTeams = await em.find(ResultTeam, { team: teamId }, {
      populate: ['result'],
    });

    let totalPoints = 0;

    for (const rt of resultTeams) {
      if (rt.result) {
        const result = await em.findOne(CompetitionResult, { id: (rt.result as any).id || rt.result });
        if (result && result.seasonId === seasonId) {
          totalPoints += result.pointsEarned || 0;
        }
      }
    }

    return totalPoints;
  }

  /**
   * Get top teams by points for a season
   */
  async getTopTeamsBySeason(
    seasonId: string,
    limit: number = 10,
  ): Promise<{ teamId: string; totalPoints: number }[]> {
    const em = this.em.fork();

    // Get all result teams with their results
    const resultTeams = await em.find(ResultTeam, {}, {
      populate: ['result', 'team'],
    });

    // Aggregate points by team for this season
    const teamPoints = new Map<string, number>();

    for (const rt of resultTeams) {
      if (rt.result && rt.team) {
        const result = await em.findOne(CompetitionResult, { id: (rt.result as any).id || rt.result });
        if (result && result.seasonId === seasonId) {
          const teamId = (rt.team as any).id || rt.team;
          const currentPoints = teamPoints.get(teamId) || 0;
          teamPoints.set(teamId, currentPoints + (result.pointsEarned || 0));
        }
      }
    }

    // Sort and return top teams
    const sortedTeams = Array.from(teamPoints.entries())
      .map(([teamId, totalPoints]) => ({ teamId, totalPoints }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);

    return sortedTeams;
  }

  // ============================================
  // WRITE METHODS
  // ============================================

  /**
   * Create a result team entry
   */
  async createResultTeam(data: CreateResultTeamDto): Promise<ResultTeam> {
    const em = this.em.fork();

    const resultTeam = em.create(ResultTeam, {
      id: randomUUID(),
      result: data.resultId,
      team: data.teamId,
      member: data.memberId,
    } as any);

    await em.persistAndFlush(resultTeam);
    return resultTeam;
  }

  /**
   * Delete a result team entry
   */
  async deleteResultTeam(id: string): Promise<void> {
    const em = this.em.fork();

    const resultTeam = await em.findOne(ResultTeam, { id });
    if (!resultTeam) {
      throw new NotFoundException(`ResultTeam with ID ${id} not found`);
    }

    await em.removeAndFlush(resultTeam);
  }

  /**
   * Bulk create result team entries for a single result
   */
  async bulkCreateResultTeams(
    resultId: string,
    teamMembers: TeamMemberData[],
  ): Promise<ResultTeam[]> {
    const em = this.em.fork();

    const resultTeams: ResultTeam[] = [];

    for (const tm of teamMembers) {
      const resultTeam = em.create(ResultTeam, {
        id: randomUUID(),
        result: resultId,
        team: tm.teamId,
        member: tm.memberId,
      } as any);
      em.persist(resultTeam);
      resultTeams.push(resultTeam);
    }

    await em.flush();
    return resultTeams;
  }
}
