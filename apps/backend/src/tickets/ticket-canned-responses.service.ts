import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { TicketCannedResponse } from './entities/ticket-canned-response.entity';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';

/**
 * Per-agent reply templates ("canned responses"). Owner can list,
 * create, update, delete. Shared responses (is_shared=true) are
 * read-only to non-owners and surface in every agent's picker.
 *
 * Variable substitution is intentionally a frontend concern: the body
 * is stored raw with {{variable}} markers, and the dropdown UI
 * resolves them at insert time against the current ticket context.
 * Keeping the server out of the substitution loop means an admin can
 * preview the raw template later without losing the variables.
 */
@Injectable()
export class TicketCannedResponsesService {
  private readonly MAX_PER_USER = 100;
  private readonly MAX_TITLE_LENGTH = 120;
  private readonly MAX_BODY_LENGTH = 20_000;
  private readonly MAX_CATEGORY_LENGTH = 60;

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /**
   * Returns templates visible to this agent: their own plus shared
   * ones from other agents. Ordered by category then sort_order so
   * the UI can group by category in dropdowns.
   */
  async listVisibleTo(userId: string): Promise<TicketCannedResponse[]> {
    const em = this.em.fork();
    const rows = await em.find(TicketCannedResponse, {
      $or: [
        { user: userId },
        { isShared: true },
      ],
    }, {
      populate: ['user'],
      orderBy: { category: 'ASC', sortOrder: 'ASC', title: 'ASC' },
    });
    return rows;
  }

  async findById(id: string): Promise<TicketCannedResponse> {
    const em = this.em.fork();
    const row = await em.findOne(TicketCannedResponse, { id }, { populate: ['user'] });
    if (!row) throw new NotFoundException('Canned response not found');
    return row;
  }

  async create(
    userId: string,
    dto: {
      title: string;
      body: string;
      category?: string | null;
      is_shared?: boolean;
      sort_order?: number;
    },
  ): Promise<TicketCannedResponse> {
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: userId });
    if (!profile) throw new NotFoundException('Profile not found');

    const title = (dto.title ?? '').trim();
    const body = (dto.body ?? '').trim();
    if (!title) throw new BadRequestException('Title is required');
    if (!body) throw new BadRequestException('Body is required');
    if (title.length > this.MAX_TITLE_LENGTH) {
      throw new BadRequestException(`Title exceeds ${this.MAX_TITLE_LENGTH} characters`);
    }
    if (body.length > this.MAX_BODY_LENGTH) {
      throw new BadRequestException(`Body exceeds ${this.MAX_BODY_LENGTH} characters`);
    }
    const category = dto.category ? dto.category.trim().slice(0, this.MAX_CATEGORY_LENGTH) : null;

    const existingCount = await em.count(TicketCannedResponse, { user: userId });
    if (existingCount >= this.MAX_PER_USER) {
      throw new BadRequestException(
        `You already have ${this.MAX_PER_USER} canned responses. Delete one before adding another.`,
      );
    }

    const row = new TicketCannedResponse();
    row.user = profile;
    row.title = title;
    row.body = body;
    row.category = category ?? undefined;
    row.isShared = !!dto.is_shared;
    row.sortOrder = dto.sort_order ?? existingCount;
    em.persist(row);
    await em.flush();
    return row;
  }

  async update(
    id: string,
    actor: { id: string; profile: Profile | null },
    dto: {
      title?: string;
      body?: string;
      category?: string | null;
      is_shared?: boolean;
      sort_order?: number;
    },
  ): Promise<TicketCannedResponse> {
    const em = this.em.fork();
    const row = await em.findOne(TicketCannedResponse, { id }, { populate: ['user'] });
    if (!row) throw new NotFoundException('Canned response not found');
    this.assertCanWrite(row, actor);

    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) throw new BadRequestException('Title is required');
      if (title.length > this.MAX_TITLE_LENGTH) {
        throw new BadRequestException(`Title exceeds ${this.MAX_TITLE_LENGTH} characters`);
      }
      row.title = title;
    }
    if (dto.body !== undefined) {
      const body = dto.body.trim();
      if (!body) throw new BadRequestException('Body is required');
      if (body.length > this.MAX_BODY_LENGTH) {
        throw new BadRequestException(`Body exceeds ${this.MAX_BODY_LENGTH} characters`);
      }
      row.body = body;
    }
    if (dto.category !== undefined) {
      row.category = dto.category
        ? dto.category.trim().slice(0, this.MAX_CATEGORY_LENGTH)
        : undefined;
    }
    if (dto.is_shared !== undefined) row.isShared = !!dto.is_shared;
    if (dto.sort_order !== undefined) row.sortOrder = dto.sort_order;

    await em.flush();
    return row;
  }

  async delete(id: string, actor: { id: string; profile: Profile | null }): Promise<void> {
    const em = this.em.fork();
    const row = await em.findOne(TicketCannedResponse, { id }, { populate: ['user'] });
    if (!row) throw new NotFoundException('Canned response not found');
    this.assertCanWrite(row, actor);
    await em.removeAndFlush(row);
  }

  private assertCanWrite(row: TicketCannedResponse, actor: { id: string; profile: Profile | null }) {
    const ownerId = row.user?.id;
    if (ownerId === actor.id) return;
    if (isAdminUser(actor.profile)) return;
    throw new ForbiddenException('You can only modify your own canned responses');
  }
}
