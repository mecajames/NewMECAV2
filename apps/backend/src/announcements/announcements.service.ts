import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Announcement } from './entities/announcement.entity';
import { Profile } from '../profiles/profiles.entity';
import {
  UserRole,
  MembershipStatus,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  PublicAnnouncement,
  AnnouncementAudience,
} from '@newmeca/shared';

@Injectable()
export class AnnouncementsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // ---------------------------------------------------------------------------
  // Admin CRUD
  // ---------------------------------------------------------------------------
  async findAll(): Promise<Announcement[]> {
    const em = this.em.fork();
    return em.find(Announcement, {}, { orderBy: { priority: 'DESC', startsAt: 'DESC' } });
  }

  async findById(id: string): Promise<Announcement | null> {
    const em = this.em.fork();
    return em.findOne(Announcement, { id });
  }

  async create(dto: CreateAnnouncementDto, createdBy?: string | null): Promise<Announcement> {
    const em = this.em.fork();
    const announcement = new Announcement();
    this.applyDto(announcement, dto);
    announcement.createdBy = createdBy ?? null;
    await em.persistAndFlush(announcement);
    return announcement;
  }

  async update(id: string, dto: UpdateAnnouncementDto): Promise<Announcement> {
    const em = this.em.fork();
    const announcement = await em.findOneOrFail(Announcement, { id });
    this.applyDto(announcement, dto);
    await em.flush();
    return announcement;
  }

  async remove(id: string): Promise<boolean> {
    const em = this.em.fork();
    const announcement = await em.findOne(Announcement, { id });
    if (!announcement) return false;
    await em.removeAndFlush(announcement);
    return true;
  }

  private applyDto(a: Announcement, dto: Partial<CreateAnnouncementDto>): void {
    if (dto.title !== undefined) a.title = dto.title;
    if (dto.body !== undefined) a.body = dto.body;
    if (dto.type !== undefined) a.type = dto.type;
    if (dto.panelColor !== undefined) a.panelColor = dto.panelColor ?? null;
    if (dto.textColor !== undefined) a.textColor = dto.textColor ?? null;
    if (dto.startsAt !== undefined) a.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) a.endsAt = new Date(dto.endsAt);
    if (dto.isActive !== undefined) a.isActive = dto.isActive;
    if (dto.priority !== undefined) a.priority = dto.priority;
    if (dto.dismissible !== undefined) a.dismissible = dto.dismissible;
    if (dto.audience !== undefined) a.audience = dto.audience;
  }

  // ---------------------------------------------------------------------------
  // Public: active announcements visible to a given viewer (anonymous or member)
  // ---------------------------------------------------------------------------
  async getActiveForViewer(profile: Profile | null): Promise<PublicAnnouncement[]> {
    const em = this.em.fork();
    const now = new Date();
    const active = await em.find(
      Announcement,
      { isActive: true, startsAt: { $lte: now }, endsAt: { $gte: now } },
      { orderBy: { priority: 'DESC', createdAt: 'DESC' } },
    );

    return active
      .filter((a) => this.matchesAudience(a.audience, profile))
      .map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        type: a.type,
        panelColor: a.panelColor ?? null,
        textColor: a.textColor ?? null,
        dismissible: a.dismissible,
        priority: a.priority,
      }));
  }

  /**
   * A viewer matches if ANY enabled audience rule applies. `everyone` is the only
   * rule that applies to anonymous (logged-out) viewers; everything else needs a
   * resolved profile. Targeting is enforced here, server-side — never trusted to
   * the client.
   */
  private matchesAudience(
    audience: AnnouncementAudience | null | undefined,
    profile: Profile | null,
  ): boolean {
    const a = audience;
    if (!a) return false;
    if (a.everyone) return true;
    if (!profile) return false; // remaining rules require a logged-in viewer

    if (a.authenticated) return true;
    if (a.activeMembers && profile.membership_status === MembershipStatus.ACTIVE) return true;
    if (a.staff && profile.is_staff === true) return true;

    const role = profile.role;
    if (role && Array.isArray(a.roles) && a.roles.length > 0) {
      if (a.roles.includes(role as UserRole)) return true;
      // Legacy 'user' role is equivalent to competitor.
      if (role === UserRole.USER && a.roles.includes(UserRole.COMPETITOR)) return true;
      if (role === UserRole.COMPETITOR && a.roles.includes(UserRole.USER)) return true;
    }

    if (Array.isArray(a.memberIds) && a.memberIds.includes(profile.id)) return true;

    return false;
  }
}
