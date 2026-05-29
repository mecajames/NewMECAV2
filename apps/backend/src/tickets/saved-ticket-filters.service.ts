import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { SavedTicketFilter } from './entities/saved-ticket-filter.entity';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';

/**
 * Server-backed per-agent saved ticket filters. Replaces the
 * per-browser localStorage approach (which does not sync across
 * devices and is not visible to admins for auditing).
 *
 * Sharing model:
 *   - is_shared_with_team=false: only the owner can see/use it
 *   - is_shared_with_team=true: every support staff sees it in their
 *     dropdown, but only the owner can edit/delete it.
 *
 * Authorization:
 *   - The caller passes the auth user's profile (must be admin/staff)
 *     and the resource userId. Write ops verify the caller is either
 *     the owner OR an admin (admins can clean up stale shared
 *     filters when an agent leaves the team).
 */
@Injectable()
export class SavedTicketFiltersService {
  private readonly MAX_PER_USER = 20;
  private readonly MAX_NAME_LENGTH = 60;

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /**
   * Returns the filters visible to this agent: their own plus
   * anything shared by other staff. Default ordering puts the user's
   * own filters first (by sort_order, then name), then shared ones.
   */
  async listVisibleTo(userId: string): Promise<SavedTicketFilter[]> {
    const em = this.em.fork();
    const rows = await em.find(SavedTicketFilter, {
      $or: [
        { user: userId },
        { isSharedWithTeam: true },
      ],
    }, {
      populate: ['user'],
      orderBy: { sortOrder: 'ASC', name: 'ASC' },
    });
    return rows.sort((a, b) => {
      const aOwn = a.user?.id === userId ? 0 : 1;
      const bOwn = b.user?.id === userId ? 0 : 1;
      if (aOwn !== bOwn) return aOwn - bOwn;
      return a.sortOrder - b.sortOrder;
    });
  }

  async findById(id: string): Promise<SavedTicketFilter> {
    const em = this.em.fork();
    const row = await em.findOne(SavedTicketFilter, { id }, { populate: ['user'] });
    if (!row) throw new NotFoundException('Saved filter not found');
    return row;
  }

  async create(
    userId: string,
    dto: {
      name: string;
      criteria: Record<string, unknown>;
      is_default?: boolean;
      is_shared_with_team?: boolean;
    },
  ): Promise<SavedTicketFilter> {
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: userId });
    if (!profile) throw new NotFoundException('Profile not found');

    const name = (dto.name ?? '').trim();
    if (!name) throw new BadRequestException('Name is required');
    if (name.length > this.MAX_NAME_LENGTH) {
      throw new BadRequestException(`Name exceeds ${this.MAX_NAME_LENGTH} characters`);
    }

    const existingCount = await em.count(SavedTicketFilter, { user: userId });
    if (existingCount >= this.MAX_PER_USER) {
      throw new BadRequestException(
        `You already have ${this.MAX_PER_USER} saved filters. Delete one before adding another.`,
      );
    }

    const dup = await em.findOne(SavedTicketFilter, { user: userId, name });
    if (dup) throw new BadRequestException('A filter with that name already exists');

    // If they want this one to be the default, clear any prior default
    // for the user. Without this the partial unique index would 500.
    if (dto.is_default) {
      await em.nativeUpdate(SavedTicketFilter, { user: userId, isDefault: true }, { isDefault: false });
    }

    const row = new SavedTicketFilter();
    row.user = profile;
    row.name = name;
    row.criteria = sanitizeCriteria(dto.criteria);
    row.isDefault = !!dto.is_default;
    row.isSharedWithTeam = !!dto.is_shared_with_team;
    row.sortOrder = existingCount;
    em.persist(row);
    await em.flush();
    return row;
  }

  async update(
    id: string,
    actor: { id: string; profile: Profile | null },
    dto: {
      name?: string;
      criteria?: Record<string, unknown>;
      is_default?: boolean;
      is_shared_with_team?: boolean;
      sort_order?: number;
    },
  ): Promise<SavedTicketFilter> {
    const em = this.em.fork();
    const row = await em.findOne(SavedTicketFilter, { id }, { populate: ['user'] });
    if (!row) throw new NotFoundException('Saved filter not found');
    this.assertCanWrite(row, actor);

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Name is required');
      if (name.length > this.MAX_NAME_LENGTH) {
        throw new BadRequestException(`Name exceeds ${this.MAX_NAME_LENGTH} characters`);
      }
      if (name !== row.name) {
        const dup = await em.findOne(SavedTicketFilter, { user: row.user.id, name });
        if (dup) throw new BadRequestException('A filter with that name already exists');
        row.name = name;
      }
    }
    if (dto.criteria !== undefined) row.criteria = sanitizeCriteria(dto.criteria);
    if (dto.is_shared_with_team !== undefined) row.isSharedWithTeam = !!dto.is_shared_with_team;
    if (dto.sort_order !== undefined) row.sortOrder = dto.sort_order;
    if (dto.is_default !== undefined) {
      if (dto.is_default && !row.isDefault) {
        await em.nativeUpdate(SavedTicketFilter, { user: row.user.id, isDefault: true }, { isDefault: false });
      }
      row.isDefault = !!dto.is_default;
    }

    await em.flush();
    return row;
  }

  async delete(id: string, actor: { id: string; profile: Profile | null }): Promise<void> {
    const em = this.em.fork();
    const row = await em.findOne(SavedTicketFilter, { id }, { populate: ['user'] });
    if (!row) throw new NotFoundException('Saved filter not found');
    this.assertCanWrite(row, actor);
    await em.removeAndFlush(row);
  }

  private assertCanWrite(row: SavedTicketFilter, actor: { id: string; profile: Profile | null }) {
    const ownerId = row.user?.id;
    if (ownerId === actor.id) return;
    if (isAdminUser(actor.profile)) return;
    throw new ForbiddenException('You can only modify your own saved filters');
  }
}

/**
 * Strip unknown / unsafe fields from the criteria JSON before
 * persisting. The schema mirrors the ticket-list query but is
 * deliberately narrow: we never want a saved filter to inject SQL or
 * exotic shapes. Unknown keys are dropped silently.
 */
function sanitizeCriteria(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object') return {};
  const src = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const KNOWN = [
    'status', 'priority', 'department', 'department_id',
    'assigned_to_id', 'last_reply_by', 'waiting_on',
    'category', 'event_id', 'search',
  ] as const;
  for (const k of KNOWN) {
    if (src[k] === undefined) continue;
    const v = src[k];
    if (Array.isArray(v)) {
      out[k] = v.filter(x => typeof x === 'string').slice(0, 50);
    } else if (typeof v === 'string') {
      out[k] = v.slice(0, 500);
    } else if (typeof v === 'boolean' || typeof v === 'number') {
      out[k] = v;
    }
  }
  return out;
}
