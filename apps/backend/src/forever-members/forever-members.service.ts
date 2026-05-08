import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ForeverMember } from './forever-members.entity';

export interface ForeverMemberStats {
  totalEvents: number;
  totalPoints: number;
  firstPlace: number;
  secondPlace: number;
  thirdPlace: number;
  bestScoresByFormat: { format: string; bestScore: number }[];
  formatsCompeted: string[];
  yearsActive: { first: number; last: number } | null;
}

@Injectable()
export class ForeverMembersService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAllPublished(): Promise<ForeverMember[]> {
    const em = this.em.fork();
    return em.find(ForeverMember, { isPublished: true }, {
      orderBy: { displayOrder: 'ASC', fullName: 'ASC' },
    });
  }

  async findAll(): Promise<ForeverMember[]> {
    const em = this.em.fork();
    return em.find(ForeverMember, {}, {
      orderBy: { displayOrder: 'ASC', fullName: 'ASC' },
    });
  }

  async findById(id: string): Promise<ForeverMember> {
    const em = this.em.fork();
    const member = await em.findOne(ForeverMember, { id });
    if (!member) throw new NotFoundException(`Forever member ${id} not found`);
    return member;
  }

  async create(data: Partial<ForeverMember>): Promise<ForeverMember> {
    const em = this.em.fork();
    const member = new ForeverMember();
    // Direct property assignment — ForeverMember has serializedName.
    // em.assign() can mis-map keys when serializedName is set (documented
    // MECA bug pattern). Iterating Object.entries sets each property by
    // its actual TypeScript name without going through em.assign's resolver.
    for (const [key, value] of Object.entries(data)) {
      (member as any)[key] = value;
    }
    await em.persistAndFlush(member);
    return member;
  }

  async update(id: string, data: Partial<ForeverMember>): Promise<ForeverMember> {
    const em = this.em.fork();
    const member = await em.findOne(ForeverMember, { id });
    if (!member) throw new NotFoundException(`Forever member ${id} not found`);
    for (const [key, value] of Object.entries(data)) {
      (member as any)[key] = value;
    }
    await em.flush();
    return member;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const member = await em.findOne(ForeverMember, { id });
    if (!member) throw new NotFoundException(`Forever member ${id} not found`);
    await em.removeAndFlush(member);
  }

  async getStats(mecaId: string): Promise<ForeverMemberStats> {
    const em = this.em.fork();
    const conn = em.getConnection();

    // Aggregate stats from competition_results
    const [summary] = await conn.execute(
      `SELECT
        COUNT(DISTINCT event_id) as total_events,
        COALESCE(SUM(points_earned), 0) as total_points,
        COUNT(*) FILTER (WHERE placement = 1) as first_place,
        COUNT(*) FILTER (WHERE placement = 2) as second_place,
        COUNT(*) FILTER (WHERE placement = 3) as third_place,
        MIN(EXTRACT(YEAR FROM created_at)) as first_year,
        MAX(EXTRACT(YEAR FROM created_at)) as last_year
      FROM competition_results
      WHERE meca_id = ?`,
      [mecaId]
    );

    // Best scores by format
    const bestScores = await conn.execute(
      `SELECT format, MAX(score) as best_score
      FROM competition_results
      WHERE meca_id = ? AND format IS NOT NULL AND score > 0
      GROUP BY format
      ORDER BY format`,
      [mecaId]
    );

    // Distinct formats
    const formats = await conn.execute(
      `SELECT DISTINCT format FROM competition_results
      WHERE meca_id = ? AND format IS NOT NULL
      ORDER BY format`,
      [mecaId]
    );

    const firstYear = summary?.first_year ? Number(summary.first_year) : null;
    const lastYear = summary?.last_year ? Number(summary.last_year) : null;

    return {
      totalEvents: Number(summary?.total_events || 0),
      totalPoints: Number(summary?.total_points || 0),
      firstPlace: Number(summary?.first_place || 0),
      secondPlace: Number(summary?.second_place || 0),
      thirdPlace: Number(summary?.third_place || 0),
      bestScoresByFormat: bestScores.map((r: any) => ({
        format: r.format,
        bestScore: Number(r.best_score),
      })),
      formatsCompeted: formats.map((r: any) => r.format),
      yearsActive: firstYear && lastYear ? { first: firstYear, last: lastYear } : null,
    };
  }
}
