import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { HallOfFameInductee } from './hall-of-fame.entity';

@Injectable()
export class HallOfFameService {
  private readonly logger = new Logger(HallOfFameService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(category?: string, year?: number): Promise<HallOfFameInductee[]> {
    const em = this.em.fork();
    const where: any = {};
    if (category) where.category = category;
    if (year) where.inductionYear = year;
    return em.find(HallOfFameInductee, where, {
      orderBy: [{ inductionYear: 'DESC' }, { name: 'ASC' }],
    });
  }

  async findById(id: string): Promise<HallOfFameInductee> {
    const em = this.em.fork();
    const inductee = await em.findOne(HallOfFameInductee, { id });
    if (!inductee) {
      throw new NotFoundException('Inductee not found');
    }
    return inductee;
  }

  async getDistinctYears(): Promise<number[]> {
    const em = this.em.fork();
    const conn = em.getConnection();
    const rows = await conn.execute(
      `SELECT DISTINCT induction_year FROM public.hall_of_fame_inductees ORDER BY induction_year DESC`,
    );
    return rows.map((r: any) => r.induction_year);
  }

  async create(data: any, userId: string): Promise<HallOfFameInductee> {
    const em = this.em.fork();
    const conn = em.getConnection();
    const result = await conn.execute(
      `INSERT INTO public.hall_of_fame_inductees
        (category, induction_year, name, state, team_affiliation, location, bio, image_url, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [
        data.category, data.inductionYear, data.name,
        data.state || null, data.teamAffiliation || null,
        data.location || null, data.bio || null,
        data.imageUrl || null, userId,
      ],
    );
    const newId = result[0]?.id;
    this.logger.log(`Created Hall of Fame inductee: ${data.name} (${data.category}, ${data.inductionYear})`);
    return em.findOneOrFail(HallOfFameInductee, { id: newId });
  }

  async update(id: string, data: any, userId: string): Promise<HallOfFameInductee> {
    const em = this.em.fork();
    const inductee = await em.findOne(HallOfFameInductee, { id });
    if (!inductee) {
      throw new NotFoundException('Inductee not found');
    }

    if (data.category !== undefined) inductee.category = data.category;
    if (data.inductionYear !== undefined) inductee.inductionYear = data.inductionYear;
    if (data.name !== undefined) inductee.name = data.name;
    if (data.state !== undefined) inductee.state = data.state;
    if (data.teamAffiliation !== undefined) inductee.teamAffiliation = data.teamAffiliation;
    if (data.location !== undefined) inductee.location = data.location;
    if (data.bio !== undefined) inductee.bio = data.bio;
    if (data.imageUrl !== undefined) inductee.imageUrl = data.imageUrl;
    inductee.updatedBy = userId;
    inductee.updatedAt = new Date();

    await em.flush();
    this.logger.log(`Updated Hall of Fame inductee: ${inductee.name}`);
    return inductee;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const inductee = await em.findOne(HallOfFameInductee, { id });
    if (!inductee) {
      throw new NotFoundException('Inductee not found');
    }
    await em.removeAndFlush(inductee);
    this.logger.log(`Deleted Hall of Fame inductee: ${inductee.name}`);
  }
}
