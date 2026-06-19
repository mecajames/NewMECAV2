import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { TicketQuickLink } from './entities/ticket-quick-link.entity';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';

/**
 * Quick "Insert link" entries for the ticket reply composer. Mirrors the
 * canned-responses model: GLOBAL links (shared with all staff, admin-managed)
 * plus each agent's PERSONAL links (owned, private to them).
 */
@Injectable()
export class TicketQuickLinksService {
  private readonly MAX_PER_USER = 100;
  private readonly MAX_LABEL = 120;
  private readonly MAX_URL = 2000;
  private readonly MAX_CATEGORY = 60;

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /** Global links + the caller's own personal links. */
  async listVisibleTo(userId: string): Promise<TicketQuickLink[]> {
    const em = this.em.fork();
    return em.find(
      TicketQuickLink,
      { $or: [{ isGlobal: true }, { user: userId }] },
      { populate: ['user'], orderBy: { isGlobal: 'DESC', category: 'ASC', sortOrder: 'ASC', label: 'ASC' } },
    );
  }

  async create(
    actor: { id: string; profile: Profile | null },
    dto: { label: string; url: string; category?: string | null; is_global?: boolean; sort_order?: number },
  ): Promise<TicketQuickLink> {
    const em = this.em.fork();
    const label = (dto.label ?? '').trim();
    if (!label) throw new BadRequestException('Label is required');
    if (label.length > this.MAX_LABEL) throw new BadRequestException(`Label exceeds ${this.MAX_LABEL} characters`);
    const url = this.normalizeUrl(dto.url);
    const category = dto.category ? dto.category.trim().slice(0, this.MAX_CATEGORY) : null;
    const isGlobal = !!dto.is_global;

    if (isGlobal && !isAdminUser(actor.profile)) {
      throw new ForbiddenException('Only admins can create global links');
    }

    const row = new TicketQuickLink();
    if (!isGlobal) {
      const owner = await em.findOne(Profile, { id: actor.id });
      if (!owner) throw new NotFoundException('Profile not found');
      const count = await em.count(TicketQuickLink, { user: actor.id });
      if (count >= this.MAX_PER_USER) {
        throw new BadRequestException(
          `You already have ${this.MAX_PER_USER} personal links. Delete one before adding another.`,
        );
      }
      row.user = owner;
    }
    row.label = label;
    row.url = url;
    row.category = category ?? undefined;
    row.isGlobal = isGlobal;
    row.sortOrder = dto.sort_order ?? 0;
    em.persist(row);
    await em.flush();
    return row;
  }

  async update(
    id: string,
    actor: { id: string; profile: Profile | null },
    dto: { label?: string; url?: string; category?: string | null; is_global?: boolean; sort_order?: number },
  ): Promise<TicketQuickLink> {
    const em = this.em.fork();
    const row = await em.findOne(TicketQuickLink, { id }, { populate: ['user'] });
    if (!row) throw new NotFoundException('Link not found');
    this.assertCanWrite(row, actor);

    if (dto.label !== undefined) {
      const label = dto.label.trim();
      if (!label) throw new BadRequestException('Label is required');
      if (label.length > this.MAX_LABEL) throw new BadRequestException(`Label exceeds ${this.MAX_LABEL} characters`);
      row.label = label;
    }
    if (dto.url !== undefined) row.url = this.normalizeUrl(dto.url);
    if (dto.category !== undefined) {
      row.category = dto.category ? dto.category.trim().slice(0, this.MAX_CATEGORY) : undefined;
    }
    if (dto.sort_order !== undefined) row.sortOrder = dto.sort_order;
    if (dto.is_global !== undefined && dto.is_global !== row.isGlobal) {
      if (!isAdminUser(actor.profile)) {
        throw new ForbiddenException('Only admins can change a link’s global status');
      }
      row.isGlobal = dto.is_global;
      if (dto.is_global) row.user = undefined; // global links are ownerless
    }

    await em.flush();
    return row;
  }

  async delete(id: string, actor: { id: string; profile: Profile | null }): Promise<void> {
    const em = this.em.fork();
    const row = await em.findOne(TicketQuickLink, { id }, { populate: ['user'] });
    if (!row) throw new NotFoundException('Link not found');
    this.assertCanWrite(row, actor);
    await em.removeAndFlush(row);
  }

  private assertCanWrite(row: TicketQuickLink, actor: { id: string; profile: Profile | null }) {
    if (row.isGlobal) {
      if (isAdminUser(actor.profile)) return;
      throw new ForbiddenException('Only admins can modify global links');
    }
    if (row.user?.id === actor.id) return;
    if (isAdminUser(actor.profile)) return;
    throw new ForbiddenException('You can only modify your own links');
  }

  private normalizeUrl(raw?: string): string {
    const v = (raw ?? '').trim();
    if (!v) throw new BadRequestException('URL is required');
    if (/^\s*(javascript|data|vbscript):/i.test(v)) throw new BadRequestException('Invalid URL');
    let out: string;
    if (/^https?:\/\//i.test(v)) out = v;
    else if (v.startsWith('/')) out = v; // relative site path
    else out = `https://${v}`;
    if (out.length > this.MAX_URL) throw new BadRequestException('URL is too long');
    return out;
  }
}
