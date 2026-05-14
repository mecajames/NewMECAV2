import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { HallOfFameInductee } from './hall-of-fame.entity';
import { HallOfFameComment } from './hall-of-fame-comment.entity';
import { Profile } from '../profiles/profiles.entity';

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

  // ===== Comments =====

  async listComments(inducteeId: string): Promise<any[]> {
    const em = this.em.fork();
    const inductee = await em.findOne(HallOfFameInductee, { id: inducteeId });
    if (!inductee) {
      throw new NotFoundException('Inductee not found');
    }
    const rows = await em.getConnection().execute(
      `SELECT c.id, c.body, c.created_at, c.updated_at, c.user_id,
              p.first_name, p.last_name, p.full_name, p.avatar_url, p.meca_id
         FROM public.hall_of_fame_comments c
         JOIN public.profiles p ON p.id = c.user_id
        WHERE c.inductee_id = ? AND c.is_hidden = false
        ORDER BY c.created_at ASC`,
      [inducteeId],
    );
    return rows.map((r: any) => ({
      id: r.id,
      body: r.body,
      created_at: r.created_at,
      updated_at: r.updated_at,
      author: {
        id: r.user_id,
        first_name: r.first_name,
        last_name: r.last_name,
        full_name: r.full_name,
        avatar_url: r.avatar_url,
        meca_id: r.meca_id,
      },
    }));
  }

  async createComment(inducteeId: string, userId: string, body: string): Promise<HallOfFameComment> {
    const trimmed = (body || '').trim();
    if (!trimmed) {
      throw new BadRequestException('Comment cannot be empty');
    }
    if (trimmed.length > 2000) {
      throw new BadRequestException('Comment is too long (max 2000 characters)');
    }
    const em = this.em.fork();
    const inductee = await em.findOne(HallOfFameInductee, { id: inducteeId });
    if (!inductee) {
      throw new NotFoundException('Inductee not found');
    }
    const profile = await em.findOne(Profile, { id: userId });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    const comment = new HallOfFameComment();
    comment.inductee = inductee;
    comment.user = profile;
    comment.body = trimmed;
    await em.persistAndFlush(comment);
    this.logger.log(`HoF comment added on ${inductee.name} by ${profile.email ?? userId}`);
    return comment;
  }

  async deleteComment(
    commentId: string,
    actingUserId: string,
    isAdmin: boolean,
  ): Promise<void> {
    const em = this.em.fork();
    const comment = await em.findOne(HallOfFameComment, { id: commentId }, { populate: ['user'] });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (!isAdmin && comment.user.id !== actingUserId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    await em.removeAndFlush(comment);
    this.logger.log(`HoF comment ${commentId} deleted by ${actingUserId} (admin=${isAdmin})`);
  }
}
