import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { EntityManager, Reference } from '@mikro-orm/core';
import { Event } from './events.entity';
import { Season } from '../seasons/seasons.entity';
import { Profile } from '../profiles/profiles.entity';
import { EventRegistration } from '../event-registrations/event-registrations.entity';
import { CompetitionResult } from '../competition-results/competition-results.entity';
import { EventDirector } from '../event-directors/event-director.entity';
import { EventDirectorAssignment } from '../event-directors/event-director-assignment.entity';
import { Ticket } from '../tickets/ticket.entity';
import { Rating } from '../ratings/rating.entity';
import { SplWorldRecord, SplWorldRecordHistory } from '../spl-world-records/spl-world-records.entity';
import { AchievementRecipient } from '../achievements/achievement-recipient.entity';
import { EventHostingRequest } from '../event-hosting-requests/event-hosting-requests.entity';
import { StateFinalsDate } from '../states/state-finals-date.entity';
import { ChampionshipArchive } from '../championship-archives/championship-archives.entity';
import { EventJudgeAssignment } from '../judges/event-judge-assignment.entity';
import { ResultsEntrySession } from '../audit/results-entry-session.entity';
import { ResultFileUpload } from '../competition-results/entities/result-file-upload.entity';
import { isUuid, makeUniqueSlug } from '../common/slug.util';
import {
  EventStatus,
  RegistrationStatus,
  MultiDayResultsMode,
  EventAssignmentStatus,
  AssignmentRequestType,
  MembershipStatus,
} from '@newmeca/shared';
import { randomUUID } from 'crypto';
import { EmailService } from '../email/email.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly emailService: EmailService,
    private readonly geocodingService: GeocodingService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(page: number = 1, limit: number = 10): Promise<Event[]> {
    const em = this.em.fork();
    const offset = (page - 1) * limit;
    const events = await em.find(Event, {}, {
      limit,
      offset,
      orderBy: { eventDate: 'DESC' }
    });
    return this.attachResultCounts(em, events);
  }

  /** Build a unique SEO slug for an event: slugify(title)-year, deduped. */
  private async generateEventSlug(em: EntityManager, title: string, eventDate?: Date | string | null): Promise<string> {
    const year = eventDate ? new Date(eventDate).getFullYear() : undefined;
    const base = year ? `${title}-${year}` : title || 'event';
    return makeUniqueSlug(
      base,
      async (candidate) => !!(await em.findOne(Event, { slug: candidate })),
      'event',
    );
  }

  // Accepts either a UUID or an SEO slug (e.g. /events/the-ohio-car-audio-show-3-2026).
  async findById(idOrSlug: string): Promise<Event> {
    const em = this.em.fork();
    const where = isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug };
    const event = await em.findOne(Event, where);
    if (!event) {
      throw new NotFoundException(`Event with ID ${idOrSlug} not found`);
    }
    // Same ED + judges enrichment as the public list, so the detail page's
    // info section can show who's running/judging (assignment-system aware).
    const [enriched] = await this.attachDirectorsAndJudges(em, [event]);
    return enriched as Event;
  }

  async findUpcoming(): Promise<Event[]> {
    const em = this.em.fork();
    return em.find(Event, {
      eventDate: { $gte: new Date() },
      status: EventStatus.UPCOMING
    }, {
      orderBy: { eventDate: 'ASC' }
    });
  }

  async findByStatus(status: string): Promise<Event[]> {
    const em = this.em.fork();
    return em.find(Event, { status: status as any });
  }

  
  async findBySeason(seasonId: string, page: number = 1, limit: number = 10): Promise<Event[]> {
    const em = this.em.fork();
    const offset = (page - 1) * limit;
    const events = await em.find(Event, { season: seasonId }, {
      limit,
      offset,
      orderBy: { eventDate: 'DESC' }
    });
    return this.attachResultCounts(em, events);
  }

  private async attachResultCounts(em: EntityManager, events: Event[]): Promise<any[]> {
    if (events.length === 0) return events;
    const ids = events.map(e => e.id);
    const placeholders = ids.map(() => '?').join(',');
    const rows: { event_id: string; count: string }[] = await em.getConnection().execute(
      `SELECT event_id, COUNT(*)::integer as count FROM competition_results WHERE event_id IN (${placeholders}) GROUP BY event_id`,
      ids,
    );
    const countMap = new Map(rows.map(r => [r.event_id, Number(r.count)]));
    return events.map(e => {
      const plain = (e as any).toJSON ? (e as any).toJSON() : { ...e };
      (plain as any).result_count = countMap.get(e.id) || 0;
      return plain;
    });
  }

  async findByDirector(directorId: string): Promise<Event[]> {
    const em = this.em.fork();
    return em.find(Event, { eventDirector: directorId }, {
      orderBy: { eventDate: 'DESC' },
    });
  }

  /**
   * Find all events in a multi-day event group
   */
  async findByMultiDayGroup(multiDayGroupId: string): Promise<Event[]> {
    const em = this.em.fork();
    return em.find(Event, { multiDayGroupId }, {
      orderBy: { dayNumber: 'ASC' }
    });
  }

  /**
   * Find public events with server-side filtering and pagination
   * Excludes 'not_public' events
   */
  async findPublicEvents(options: {
    page?: number;
    limit?: number;
    seasonId?: string;
    status?: string;
  }): Promise<{ events: Event[]; total: number; page: number; limit: number }> {
    try {
      const em = this.em.fork();
      const { page = 1, limit = 20, seasonId, status } = options;
      const offset = (page - 1) * limit;

      // Build filter - only include public-facing statuses
      // Use $in with known valid statuses instead of $ne with 'not_public'
      // because the PostgreSQL enum may not include 'not_public' yet
      const filter: any = {};

      if (status && status !== 'all') {
        filter.status = status;
      } else {
        filter.status = { $in: [EventStatus.UPCOMING, EventStatus.ONGOING, EventStatus.COMPLETED, EventStatus.CANCELLED] };
      }

      if (seasonId) {
        filter.season = seasonId;
      }

      const [events, total] = await Promise.all([
        em.find(Event, filter, {
          limit,
          offset,
          orderBy: { eventDate: 'DESC' }
        }),
        em.count(Event, filter)
      ]);

      // Enrich each event with its assigned EVENT DIRECTOR (name + contact)
      // and accepted/confirmed JUDGES — the public calendar shows who's
      // running/judging each event straight from the existing assignments,
      // so admins never re-enter this per event (James 2026-07-05).
      // Two batch queries for the page — no per-event N+1.
      const enriched = await this.attachDirectorsAndJudges(em, events);

      return { events: enriched as any, total, page, limit };
    } catch (error) {
      this.logger.error('Error in findPublicEvents:', error);
      throw error;
    }
  }

  /**
   * Attach `event_director {name,email,phone}` and `judges [{name}]` to
   * serialized event rows. Director = the event's event_director_id profile;
   * judges = accepted/confirmed/completed EventJudgeAssignments (requested /
   * declined ones aren't public). Judge display name prefers the judge's
   * preferred name. Never throws — the calendar must render even if this
   * enrichment hits a schema/migration lag.
   */
  private async attachDirectorsAndJudges(em: EntityManager, events: Event[]): Promise<any[]> {
    const plain = () =>
      events.map((e) => (typeof (e as any).toJSON === 'function' ? (e as any).toJSON() : { ...e }));
    if (events.length === 0) return [];
    try {
      const conn = em.getConnection();
      const eventIds = events.map((e) => e.id);
      const directorIds = [
        ...new Set(events.map((e) => (e.eventDirector as any)?.id ?? e.eventDirector).filter(Boolean)),
      ] as string[];

      // One `?` per id — MikroORM's raw `?` binding expands arrays into comma
      // lists, so ANY(?) is a syntax error (see tickets.service).
      const evPlaceholders = eventIds.map(() => '?').join(',');

      const [directorRows, edAssignmentRows, judgeRows] = await Promise.all([
        directorIds.length > 0
          ? conn.execute(
              // show_email_publicly: the ED's own opt-in (default false) —
              // site policy is no emails on public pages unless the director
              // chose to show theirs.
              `SELECT p.id, p.first_name, p.last_name, p.email, p.phone, p.avatar_url,
                      COALESCE(ed.show_email_publicly, false) AS show_email_publicly
                 FROM public.profiles p
            LEFT JOIN public.event_directors ed ON ed.user_id = p.id
                WHERE p.id IN (${directorIds.map(() => '?').join(',')})`,
              directorIds,
            )
          : Promise.resolve([] as any[]),
        // EDs assigned through the ASSIGNMENT system (Add Staff) — most events
        // are staffed this way and never set events.event_director_id, which
        // is why the calendar/detail showed no director for them.
        conn.execute(
          `SELECT a.event_id, p.first_name, p.last_name, p.email, p.phone, p.avatar_url,
                  COALESCE(ed.show_email_publicly, false) AS show_email_publicly
             FROM public.event_director_assignments a
             JOIN public.event_directors ed ON ed.id = a.event_director_id
        LEFT JOIN public.profiles p ON p.id = ed.user_id
            WHERE a.event_id IN (${evPlaceholders})
              AND a.status IN ('accepted', 'confirmed', 'completed')
            ORDER BY a.created_at ASC`,
          eventIds,
        ),
        conn.execute(
          `SELECT a.event_id, j.preferred_name, p.first_name, p.last_name
             FROM public.event_judge_assignments a
             JOIN public.judges j ON j.id = a.judge_id
        LEFT JOIN public.profiles p ON p.id = j.user_id
            WHERE a.event_id IN (${evPlaceholders})
              AND a.status IN ('accepted', 'confirmed', 'completed')
            ORDER BY p.first_name NULLS LAST`,
          eventIds,
        ),
      ]);

      const directorMap = new Map<string, any>((directorRows as any[]).map((d) => [d.id, d]));
      // First accepted/confirmed ED assignment per event.
      const edAssignmentByEvent = new Map<string, any>();
      for (const r of edAssignmentRows as any[]) {
        if (!edAssignmentByEvent.has(r.event_id)) edAssignmentByEvent.set(r.event_id, r);
      }
      const judgesByEvent = new Map<string, Array<{ name: string }>>();
      for (const j of judgeRows as any[]) {
        const name =
          (j.preferred_name || '').trim() ||
          [j.first_name, j.last_name].filter(Boolean).join(' ').trim();
        if (!name) continue;
        const list = judgesByEvent.get(j.event_id) ?? [];
        list.push({ name });
        judgesByEvent.set(j.event_id, list);
      }

      return events.map((e) => {
        const json = typeof (e as any).toJSON === 'function' ? (e as any).toJSON() : { ...e };
        // Prefer the assignment-system ED (the live staffing flow); fall back
        // to the event's legacy event_director_id field.
        const assigned = edAssignmentByEvent.get(e.id);
        const dirId = (e.eventDirector as any)?.id ?? e.eventDirector;
        const d = assigned ?? (dirId ? directorMap.get(dirId as string) : null);
        json.event_director = d
          ? {
              name: [d.first_name, d.last_name].filter(Boolean).join(' ').trim() || null,
              // Email only with the ED's explicit opt-in (show_email_publicly
              // on their event_directors record) — no emails on public pages
              // otherwise.
              email: d.show_email_publicly ? (d.email ?? null) : null,
              phone: d.phone ?? null,
              avatar_url: d.avatar_url ?? null,
            }
          : null;
        json.judges = judgesByEvent.get(e.id) ?? [];
        return json;
      });
    } catch (err) {
      this.logger.error('attachDirectorsAndJudges failed (non-fatal, calendar renders without them):', err);
      return plain();
    }
  }

  /**
   * Find completed events with result counts - optimized for Results page
   */
  async findCompletedWithResultCounts(options: {
    page?: number;
    limit?: number;
    seasonId?: string;
  }): Promise<{ events: any[]; total: number }> {
    const em = this.em.fork();
    const { page = 1, limit = 20, seasonId } = options;
    const offset = (page - 1) * limit;

    // Build parameterized WHERE conditions
    const conditions: string[] = [`e.status = ?`];
    const countParams: any[] = ['completed'];

    if (seasonId) {
      conditions.push(`e.season_id = ?`);
      countParams.push(seasonId);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM events e WHERE ${whereClause}`;
    const countResult = await em.getConnection().execute(countSql, countParams);
    const total = Number(countResult[0]?.total || 0);

    // Build params for main query (separate array to avoid mutation issues)
    const mainParams: any[] = [...countParams, limit, offset];

    // Get events with result counts using a single efficient query
    const sql = `
      SELECT
        e.*,
        COALESCE(rc.result_count, 0)::integer as result_count
      FROM events e
      LEFT JOIN (
        SELECT event_id, COUNT(*)::integer as result_count
        FROM competition_results
        GROUP BY event_id
      ) rc ON rc.event_id = e.id
      WHERE ${whereClause}
      ORDER BY e.event_date DESC
      LIMIT ? OFFSET ?
    `;

    const events = await em.getConnection().execute(sql, mainParams);

    return { events, total };
  }

  /**
   * Find the appropriate season for a given event date
   */
  private async findSeasonForEventDate(em: EntityManager, eventDate: Date): Promise<Season | null> {
    const seasons = await em.find(Season, {});

    // Find season where event date falls within start_date and end_date
    const matchingSeason = seasons.find(season => {
      const startDate = new Date(season.startDate);
      const endDate = new Date(season.endDate);
      const eventDateTime = new Date(eventDate);

      return eventDateTime >= startDate && eventDateTime <= endDate;
    });

    return matchingSeason || null;
  }

  /**
   * Auto-detect event status based on event date
   * Returns: 'upcoming', 'ongoing', or 'completed'
   */
  private detectStatusFromDate(eventDate: Date): EventStatus {
    const now = new Date();
    const event = new Date(eventDate);

    // Add 24 hours to event date to account for full-day events
    const eventEnd = new Date(event.getTime() + (24 * 60 * 60 * 1000));

    if (event > now) {
      return EventStatus.UPCOMING;
    } else if (eventEnd > now) {
      return EventStatus.ONGOING;
    } else {
      return EventStatus.COMPLETED;
    }
  }

  async create(data: Partial<Event>): Promise<Event> {
    const em = this.em.fork();

    try {
      console.log('📝 CREATE EVENT - Received data:', JSON.stringify(data, null, 2));

      // Transform snake_case API fields to camelCase entity properties
      const transformedData: any = {};

      // Map snake_case to camelCase
      if ((data as any).event_date !== undefined) transformedData.eventDate = (data as any).event_date;
      if ((data as any).registration_deadline !== undefined) transformedData.registrationDeadline = (data as any).registration_deadline;
      if ((data as any).venue_name !== undefined) transformedData.venueName = (data as any).venue_name;
      if ((data as any).venue_address !== undefined) transformedData.venueAddress = (data as any).venue_address;
      if ((data as any).venue_city !== undefined) transformedData.venueCity = (data as any).venue_city;
      if ((data as any).venue_state !== undefined) transformedData.venueState = (data as any).venue_state;
      if ((data as any).venue_postal_code !== undefined) transformedData.venuePostalCode = (data as any).venue_postal_code;
      if ((data as any).venue_country !== undefined) transformedData.venueCountry = (data as any).venue_country;
      if ((data as any).flyer_url !== undefined) transformedData.flyerUrl = (data as any).flyer_url;
      if ((data as any).max_participants !== undefined) transformedData.maxParticipants = (data as any).max_participants;
      if ((data as any).registration_fee !== undefined) transformedData.registrationFee = (data as any).registration_fee;
      if ((data as any).member_entry_fee !== undefined) transformedData.memberEntryFee = (data as any).member_entry_fee;
      if ((data as any).non_member_entry_fee !== undefined) transformedData.nonMemberEntryFee = (data as any).non_member_entry_fee;
      if ((data as any).has_gate_fee !== undefined) transformedData.hasGateFee = (data as any).has_gate_fee;
      if ((data as any).gate_fee !== undefined) transformedData.gateFee = (data as any).gate_fee;
      if ((data as any).allow_pre_registration !== undefined) transformedData.allowPreRegistration = (data as any).allow_pre_registration;

      // Handle relationships using Reference.createFromPK for proper MikroORM pattern
      const eventDirectorId = (data as any).event_director_id;
      if (eventDirectorId && eventDirectorId.trim() !== '') {
        transformedData.eventDirector = Reference.createFromPK(Profile, eventDirectorId);
      }

      const seasonId = (data as any).season_id;
      if (seasonId && seasonId.trim() !== '') {
        transformedData.season = Reference.createFromPK(Season, seasonId);
      }

      // Copy fields that don't need transformation
      if (data.title !== undefined) transformedData.title = data.title;
      if (data.description !== undefined) transformedData.description = data.description;
      if (data.latitude !== undefined) transformedData.latitude = data.latitude;
      if (data.longitude !== undefined) transformedData.longitude = data.longitude;
      if (data.status !== undefined) transformedData.status = data.status;
      if (data.formats !== undefined) transformedData.formats = data.formats;
      if ((data as any).points_multiplier !== undefined) transformedData.pointsMultiplier = (data as any).points_multiplier;
      if ((data as any).event_type !== undefined) transformedData.eventType = (data as any).event_type;

      // Auto-assign season based on event date (if not manually set)
      if (transformedData.eventDate && !transformedData.season) {
        const season = await this.findSeasonForEventDate(em, new Date(transformedData.eventDate));
        if (season) {
          transformedData.season = season;
        }
      }

      // Auto-detect status based on event date (if not manually set to cancelled or not_public)
      if (transformedData.eventDate && (!transformedData.status ||
          (transformedData.status !== EventStatus.CANCELLED && transformedData.status !== EventStatus.NOT_PUBLIC))) {
        transformedData.status = this.detectStatusFromDate(new Date(transformedData.eventDate));
      }

      // Auto-geocode if lat/long not provided but address fields exist
      if (transformedData.latitude == null && transformedData.longitude == null && transformedData.venueAddress) {
        try {
          const coords = await this.geocodingService.geocodeAddress(
            transformedData.venueAddress,
            transformedData.venueCity,
            transformedData.venueState,
            transformedData.venuePostalCode,
            transformedData.venueCountry,
          );
          if (coords) {
            transformedData.latitude = coords.latitude;
            transformedData.longitude = coords.longitude;
          }
        } catch (err) {
          this.logger.warn('Geocoding failed during event creation, continuing without coordinates', err);
        }
      }

      console.log('📝 CREATE EVENT - Transformed data:', JSON.stringify(transformedData, null, 2));

      // Assign an SEO-friendly slug at creation so new events get clean URLs.
      if (!transformedData.slug && transformedData.title) {
        transformedData.slug = await this.generateEventSlug(em, transformedData.title, transformedData.eventDate);
      }

      const event = em.create(Event, transformedData);
      await em.persistAndFlush(event);

      // Keep event_director_assignments in sync — Edit Event modal only sets
      // events.event_director_id, but the ED dashboard reads from assignments.
      if ((data as any).event_director_id) {
        await this.ensureEventDirectorAssignment(em, event.id, (data as any).event_director_id);
      }

      console.log('📝 CREATE EVENT - Success, ID:', event.id);
      return event;
    } catch (error) {
      console.error('❌ CREATE EVENT - Error:', error);
      throw error;
    }
  }

  /**
   * Create a multi-day event (creates separate event entries for each day)
   * @param data Base event data
   * @param numberOfDays Number of days (1, 2, or 3)
   * @param dayDates Array of ISO date strings for each day
   * @param dayMultipliers Optional array of per-day points multipliers (1-4)
   * @param multiDayResultsMode Optional mode for how to calculate results across days
   * @returns Array of created events
   */
  async createMultiDay(
    data: Partial<Event>,
    numberOfDays: number,
    dayDates: string[],
    dayMultipliers?: number[],
    multiDayResultsMode?: MultiDayResultsMode
  ): Promise<Event[]> {
    const em = this.em.fork();

    try {
      console.log('📝 CREATE MULTI-DAY EVENT - Received data:', JSON.stringify(data, null, 2));
      console.log('📝 CREATE MULTI-DAY EVENT - Days:', numberOfDays, 'Dates:', dayDates);
      console.log('📝 CREATE MULTI-DAY EVENT - Day Multipliers:', dayMultipliers);
      console.log('📝 CREATE MULTI-DAY EVENT - Results Mode:', multiDayResultsMode);

      // ONE OVERALL TALLY (like World Finals: qualifying days, then results
      // tabulated on the finals day): EVERY day still gets its own event row
      // so the public calendar shows the full schedule — but results are
      // entered ONCE, on the FINAL day. Non-final day rows of a single-tally
      // group are hidden from results entry and from the public results
      // browser (see carriesResults in the frontend events api-client), so
      // competitors never see an empty "Day 1" results listing.
      const singleTally = multiDayResultsMode === MultiDayResultsMode.SINGLE_TALLY;

      // Generate a shared group ID for all days of this event
      const multiDayGroupId = randomUUID();

      // Auto-geocode once for all days if lat/long not provided
      let geocodedCoords: { latitude: number; longitude: number } | null = null;
      if (data.latitude == null && data.longitude == null && (data as any).venue_address) {
        try {
          geocodedCoords = await this.geocodingService.geocodeAddress(
            (data as any).venue_address,
            (data as any).venue_city,
            (data as any).venue_state,
            (data as any).venue_postal_code,
            (data as any).venue_country,
          );
        } catch (err) {
          this.logger.warn('Geocoding failed during multi-day event creation, continuing without coordinates', err);
        }
      }

      const createdEvents: Event[] = [];

      for (let dayNum = 1; dayNum <= numberOfDays; dayNum++) {
        const dayDate = dayDates[dayNum - 1];
        if (!dayDate) {
          throw new Error(`Missing date for day ${dayNum}`);
        }

        // Transform snake_case API fields to camelCase entity properties
        const transformedData: any = {};

        // Map snake_case to camelCase
        if ((data as any).venue_name !== undefined) transformedData.venueName = (data as any).venue_name;
        if ((data as any).venue_address !== undefined) transformedData.venueAddress = (data as any).venue_address;
        if ((data as any).venue_city !== undefined) transformedData.venueCity = (data as any).venue_city;
        if ((data as any).venue_state !== undefined) transformedData.venueState = (data as any).venue_state;
        if ((data as any).venue_postal_code !== undefined) transformedData.venuePostalCode = (data as any).venue_postal_code;
        if ((data as any).venue_country !== undefined) transformedData.venueCountry = (data as any).venue_country;
        if ((data as any).flyer_url !== undefined) transformedData.flyerUrl = (data as any).flyer_url;
        if ((data as any).max_participants !== undefined) transformedData.maxParticipants = (data as any).max_participants;
        if ((data as any).registration_fee !== undefined) transformedData.registrationFee = (data as any).registration_fee;
        if ((data as any).member_entry_fee !== undefined) transformedData.memberEntryFee = (data as any).member_entry_fee;
        if ((data as any).non_member_entry_fee !== undefined) transformedData.nonMemberEntryFee = (data as any).non_member_entry_fee;
        if ((data as any).has_gate_fee !== undefined) transformedData.hasGateFee = (data as any).has_gate_fee;
        if ((data as any).gate_fee !== undefined) transformedData.gateFee = (data as any).gate_fee;
        if ((data as any).allow_pre_registration !== undefined) transformedData.allowPreRegistration = (data as any).allow_pre_registration;

        // Handle relationships using Reference.createFromPK for proper MikroORM pattern
        const eventDirectorId = (data as any).event_director_id;
        if (eventDirectorId && eventDirectorId.trim() !== '') {
          transformedData.eventDirector = Reference.createFromPK(Profile, eventDirectorId);
        }

        const seasonId = (data as any).season_id;
        if (seasonId && seasonId.trim() !== '') {
          transformedData.season = Reference.createFromPK(Season, seasonId);
        }

        // Copy fields that don't need transformation
        if (data.title !== undefined) transformedData.title = data.title;
        if (data.latitude !== undefined) transformedData.latitude = data.latitude;
        if (data.longitude !== undefined) transformedData.longitude = data.longitude;
        if (data.status !== undefined) transformedData.status = data.status;
        if (data.formats !== undefined) transformedData.formats = data.formats;
        if ((data as any).event_type !== undefined) transformedData.eventType = (data as any).event_type;

        // Apply geocoded coordinates if available and not manually set
        if (geocodedCoords && transformedData.latitude == null && transformedData.longitude == null) {
          transformedData.latitude = geocodedCoords.latitude;
          transformedData.longitude = geocodedCoords.longitude;
        }

        // Set points multiplier - use per-day multiplier if provided, otherwise use base multiplier
        if (dayMultipliers && dayMultipliers[dayNum - 1] !== undefined) {
          transformedData.pointsMultiplier = dayMultipliers[dayNum - 1];
        } else if ((data as any).points_multiplier !== undefined) {
          transformedData.pointsMultiplier = (data as any).points_multiplier;
        }

        // Set the date for this specific day
        transformedData.eventDate = dayDate;

        // Set multi-day fields — every day gets a row (full calendar).
        transformedData.multiDayGroupId = multiDayGroupId;
        transformedData.dayNumber = dayNum;

        // Set multi-day results mode (same for all days in the group)
        if (multiDayResultsMode) {
          transformedData.multiDayResultsMode = multiDayResultsMode;
        }
        if (singleTally) {
          // duration_days on every row lets any consumer decide "is this the
          // results-carrying final day?" (day_number === duration_days).
          transformedData.durationDays = numberOfDays;
        }

        // Append day number to description
        const baseDescription = data.description || '';
        const dayNote = singleTally
          ? `(Day ${dayNum} of ${numberOfDays} — results for the whole event are entered on Day ${numberOfDays})`
          : `(Day ${dayNum} of ${numberOfDays})`;
        transformedData.description = baseDescription
          ? `${baseDescription}\n\n${dayNote}`
          : dayNote;

        // Handle registration deadline - only set on day 1
        if (dayNum === 1 && (data as any).registration_deadline) {
          transformedData.registrationDeadline = (data as any).registration_deadline;
        }

        // Auto-assign season based on event date (if not manually set)
        if (transformedData.eventDate && !transformedData.season) {
          const season = await this.findSeasonForEventDate(em, new Date(transformedData.eventDate));
          if (season) {
            transformedData.season = season;
          }
        }

        // Auto-detect status based on event date (if not manually set to cancelled or not_public)
        if (transformedData.eventDate && (!transformedData.status ||
            (transformedData.status !== EventStatus.CANCELLED && transformedData.status !== EventStatus.NOT_PUBLIC))) {
          transformedData.status = this.detectStatusFromDate(new Date(transformedData.eventDate));
        }

        console.log(`📝 CREATE MULTI-DAY EVENT - Day ${dayNum} transformed data:`, JSON.stringify(transformedData, null, 2));

        if (!transformedData.slug && transformedData.title) {
          transformedData.slug = await this.generateEventSlug(em, transformedData.title, transformedData.eventDate);
        }

        const event = em.create(Event, transformedData);
        createdEvents.push(event);
      }

      // Persist all events
      await em.persistAndFlush(createdEvents);

      // Mirror events.event_director_id into event_director_assignments
      // for every day so the ED's dashboard picks the events up.
      const multiDayDirectorId = (data as any).event_director_id;
      if (multiDayDirectorId) {
        for (const ev of createdEvents) {
          await this.ensureEventDirectorAssignment(em, ev.id, multiDayDirectorId);
        }
      }

      console.log('📝 CREATE MULTI-DAY EVENT - Success, IDs:', createdEvents.map(e => e.id));
      return createdEvents;
    } catch (error) {
      console.error('❌ CREATE MULTI-DAY EVENT - Error:', error);
      throw error;
    }
  }

  async update(id: string, data: Partial<Event>): Promise<Event> {
    const em = this.em.fork();
    const event = await em.findOne(Event, { id });
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    console.log('🔍 UPDATE EVENT - Received data keys:', Object.keys(data));
    console.log('🔍 UPDATE EVENT - Received data:', JSON.stringify(data, null, 2));
    console.log('🔍 UPDATE EVENT - Current event date:', event.eventDate);

    // Transform snake_case API fields to camelCase entity properties
    const transformedData: any = {};

    // Map snake_case to camelCase
    if ((data as any).event_date !== undefined) transformedData.eventDate = (data as any).event_date;
    if ((data as any).registration_deadline !== undefined) transformedData.registrationDeadline = (data as any).registration_deadline;
    if ((data as any).venue_name !== undefined) transformedData.venueName = (data as any).venue_name;
    if ((data as any).venue_address !== undefined) transformedData.venueAddress = (data as any).venue_address;
    if ((data as any).venue_city !== undefined) transformedData.venueCity = (data as any).venue_city;
    if ((data as any).venue_state !== undefined) transformedData.venueState = (data as any).venue_state;
    if ((data as any).venue_postal_code !== undefined) transformedData.venuePostalCode = (data as any).venue_postal_code;
    if ((data as any).venue_country !== undefined) transformedData.venueCountry = (data as any).venue_country;
    if ((data as any).flyer_url !== undefined) transformedData.flyerUrl = (data as any).flyer_url;

    // Handle relationships using Reference.createFromPK - allow null/empty to clear relation
    if ((data as any).event_director_id !== undefined) {
      const directorId = (data as any).event_director_id;
      if (directorId && directorId.trim() !== '') {
        transformedData.eventDirector = Reference.createFromPK(Profile, directorId);
      } else {
        transformedData.eventDirector = null;
      }
    }
    if ((data as any).season_id !== undefined) {
      const seasonId = (data as any).season_id;
      if (seasonId && seasonId.trim() !== '') {
        transformedData.season = Reference.createFromPK(Season, seasonId);
      } else {
        transformedData.season = null;
      }
    }

    if ((data as any).max_participants !== undefined) transformedData.maxParticipants = (data as any).max_participants;
    if ((data as any).registration_fee !== undefined) transformedData.registrationFee = (data as any).registration_fee;
    if ((data as any).member_entry_fee !== undefined) transformedData.memberEntryFee = (data as any).member_entry_fee;
    if ((data as any).non_member_entry_fee !== undefined) transformedData.nonMemberEntryFee = (data as any).non_member_entry_fee;
    if ((data as any).has_gate_fee !== undefined) transformedData.hasGateFee = (data as any).has_gate_fee;
    if ((data as any).gate_fee !== undefined) transformedData.gateFee = (data as any).gate_fee;
    if ((data as any).allow_pre_registration !== undefined) transformedData.allowPreRegistration = (data as any).allow_pre_registration;

    // Copy fields that don't need transformation
    if (data.title !== undefined) transformedData.title = data.title;
    if (data.description !== undefined) transformedData.description = data.description;
    if (data.latitude !== undefined) transformedData.latitude = data.latitude;
    if (data.longitude !== undefined) transformedData.longitude = data.longitude;
    if (data.status !== undefined) transformedData.status = data.status;
    if (data.formats !== undefined) transformedData.formats = data.formats;
    if ((data as any).points_multiplier !== undefined) transformedData.pointsMultiplier = (data as any).points_multiplier;
    if ((data as any).event_type !== undefined) transformedData.eventType = (data as any).event_type;
    if ((data as any).flyer_image_position !== undefined) transformedData.flyerImagePosition = (data as any).flyer_image_position;
    if ((data as any).multi_day_results_mode !== undefined) transformedData.multiDayResultsMode = (data as any).multi_day_results_mode;

    console.log('🔍 UPDATE EVENT - Transformed eventDate:', transformedData.eventDate);

    // Auto-assign season based on event date (if not manually set and event date changed)
    if (transformedData.eventDate && !transformedData.season) {
      const season = await this.findSeasonForEventDate(em, new Date(transformedData.eventDate));
      if (season) {
        transformedData.season = season;
      }
    }

    // Auto-detect status based on event date (if not manually set to cancelled or not_public and event date changed)
    if (transformedData.eventDate && (!transformedData.status ||
        (transformedData.status !== EventStatus.CANCELLED && transformedData.status !== EventStatus.NOT_PUBLIC))) {
      transformedData.status = this.detectStatusFromDate(new Date(transformedData.eventDate));
    }

    // Auto-geocode if address fields changed and lat/long weren't explicitly provided
    const addressChanged = transformedData.venueAddress !== undefined ||
      transformedData.venueCity !== undefined ||
      transformedData.venueState !== undefined ||
      transformedData.venuePostalCode !== undefined;

    if (addressChanged && transformedData.latitude == null && transformedData.longitude == null) {
      try {
        const address = transformedData.venueAddress ?? event.venueAddress;
        const city = transformedData.venueCity ?? event.venueCity;
        const state = transformedData.venueState ?? event.venueState;
        const postalCode = transformedData.venuePostalCode ?? event.venuePostalCode;
        const country = transformedData.venueCountry ?? event.venueCountry;

        const coords = await this.geocodingService.geocodeAddress(address, city, state, postalCode, country);
        if (coords) {
          transformedData.latitude = coords.latitude;
          transformedData.longitude = coords.longitude;
        }
      } catch (err) {
        this.logger.warn('Geocoding failed during event update, continuing without coordinates', err);
      }
    }

    // Apply transformedData via explicit property assignment instead of
    // em.assign() — Event has serializedName on event_date, venue_*,
    // flyer_url, and many others. em.assign() can mis-map keys when
    // serializedName differs from property name, so we set properties
    // one-by-one to be safe.
    for (const [key, value] of Object.entries(transformedData)) {
      (event as any)[key] = value;
    }
    console.log('🔍 UPDATE EVENT - After explicit assign, event date:', event.eventDate);

    await em.flush();
    console.log('🔍 UPDATE EVENT - After flush, event date:', event.eventDate);

    // Sync the assignment row when admin (re)assigns a director via the
    // Edit Event modal. Idempotent — already-linked pairs are skipped.
    if ((data as any).event_director_id !== undefined && (data as any).event_director_id) {
      await this.ensureEventDirectorAssignment(em, event.id, (data as any).event_director_id);
    }

    return event;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const event = await em.findOne(Event, { id });
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    // High-value dependents we must NOT silently destroy: competition results
    // (they drive standings + World Finals invites), registrations (members
    // signed up / paid), judge/director ratings (member-authored reviews),
    // and SPL world records. Surface a specific, actionable reason rather
    // than letting the DB throw an opaque foreign-key 500. Any OTHER blocking
    // reference is caught + explained by the global AllExceptionsFilter.
    const [resultsCount, registrationsCount, ratingsCount, recordsCount] = await Promise.all([
      em.count(CompetitionResult, { event: id }),
      em.count(EventRegistration, { event: id }),
      em.count(Rating, { event: id }),
      em.count(SplWorldRecord, { event: id }),
    ]);
    const blockers: string[] = [];
    if (resultsCount > 0) blockers.push(`${resultsCount} competition result${resultsCount === 1 ? '' : 's'}`);
    if (registrationsCount > 0) blockers.push(`${registrationsCount} registration${registrationsCount === 1 ? '' : 's'}`);
    if (ratingsCount > 0) blockers.push(`${ratingsCount} judge/director rating${ratingsCount === 1 ? '' : 's'}`);
    if (recordsCount > 0) blockers.push(`${recordsCount} SPL world record${recordsCount === 1 ? '' : 's'}`);
    if (blockers.length > 0) {
      throw new ConflictException(
        `Can't delete "${event.title}" because it still has ${blockers.join(' and ')}. ` +
        `Remove or reassign ${blockers.length > 1 ? 'them' : 'it'} first, then delete the event.`,
      );
    }

    // Everything else that references the event is safe to clean up
    // automatically, in one transaction with the delete:
    // - DETACH (keep the row, clear its event link): support tickets (a
    //   submitter picking an event on a ticket is informational and must
    //   never block deleting the event), achievements earned at the event,
    //   hosting-request "created event" back-links, state-finals date links,
    //   championship-archive World Finals links, world-record history rows.
    // - DELETE (rows are meaningless without their event): judge/director
    //   assignments, results-entry audit sessions, import file records.
    await em.transactional(async (tem) => {
      await tem.nativeUpdate(Ticket, { event: id }, { event: null });
      await tem.nativeUpdate(AchievementRecipient, { event: id }, { event: null });
      await tem.nativeUpdate(EventHostingRequest, { createdEvent: id }, { createdEvent: null });
      await tem.nativeUpdate(StateFinalsDate, { event: id }, { event: null });
      await tem.nativeUpdate(ChampionshipArchive, { worldFinalsEvent: id }, { worldFinalsEvent: null });
      await tem.nativeUpdate(SplWorldRecordHistory, { event: id }, { event: null });
      await tem.nativeDelete(EventJudgeAssignment, { event: id });
      await tem.nativeDelete(EventDirectorAssignment, { event: id });
      await tem.nativeDelete(ResultsEntrySession, { event: id });
      await tem.nativeDelete(ResultFileUpload, { event: id });
      await tem.nativeDelete(Event, { id });
    });
  }

  /**
   * Ensure an `event_director_assignments` row exists for the given event +
   * director-user pair. The Edit Event modal sets `events.event_director_id`
   * (which points at a Profile), but the ED dashboard / Event History views
   * read from the `event_director_assignments` table — without this sync,
   * admin-assigned directors don't see the events they're directing.
   *
   * Non-destructive: if a row already exists (any status) we leave it alone
   * so a DECLINED / NO_SHOW assignment isn't silently flipped back to
   * CONFIRMED on a no-op event edit. Old assignments for previous directors
   * are also left in place as historical record.
   *
   * Skips silently if the director-user has no EventDirector entity (e.g.
   * the dropdown allows any Profile; only profiles with an event_directors
   * row should produce a dashboard entry). A later call to this method
   * after the ED entity is provisioned will create the missing assignment.
   */
  private async ensureEventDirectorAssignment(
    em: EntityManager,
    eventId: string,
    directorUserId: string | null | undefined,
  ): Promise<void> {
    if (!directorUserId) return;
    const ed = await em.findOne(EventDirector, { user: { id: directorUserId } });
    if (!ed) return;

    const existing = await em.findOne(EventDirectorAssignment, {
      event: { id: eventId },
      eventDirector: { id: ed.id },
    });
    if (existing) return;

    const assignment = new EventDirectorAssignment();
    assignment.event = em.getReference(Event, eventId);
    assignment.eventDirector = ed;
    assignment.status = EventAssignmentStatus.CONFIRMED;
    assignment.requestType = AssignmentRequestType.ADMIN_ASSIGN;
    assignment.requestedAt = new Date();
    em.persist(assignment);
    await em.flush();
  }

  /**
   * One-shot backfill: walk every event with `event_director_id` set and
   * create the matching `event_director_assignments` row when missing.
   * Safe to run repeatedly — `ensureEventDirectorAssignment` is idempotent.
   * Returns counts so the caller can show the admin a summary.
   */
  async backfillEventDirectorAssignments(): Promise<{
    eventsScanned: number;
    assignmentsCreated: number;
    skippedNoEd: number;
    alreadyLinked: number;
  }> {
    const em = this.em.fork();
    const events = await em.find(Event, { eventDirector: { $ne: null } }, {
      populate: ['eventDirector'],
    });
    let assignmentsCreated = 0;
    let skippedNoEd = 0;
    let alreadyLinked = 0;
    for (const event of events) {
      const directorUserId = event.eventDirector?.id;
      if (!directorUserId) continue;
      const ed = await em.findOne(EventDirector, { user: { id: directorUserId } });
      if (!ed) { skippedNoEd++; continue; }
      const existing = await em.findOne(EventDirectorAssignment, {
        event: { id: event.id },
        eventDirector: { id: ed.id },
      });
      if (existing) { alreadyLinked++; continue; }
      const assignment = new EventDirectorAssignment();
      assignment.event = em.getReference(Event, event.id);
      assignment.eventDirector = ed;
      assignment.status = EventAssignmentStatus.CONFIRMED;
      assignment.requestType = AssignmentRequestType.ADMIN_ASSIGN;
      assignment.requestedAt = event.createdAt || new Date();
      em.persist(assignment);
      assignmentsCreated++;
    }
    await em.flush();
    return {
      eventsScanned: events.length,
      assignmentsCreated,
      skippedNoEd,
      alreadyLinked,
    };
  }

  async getStats(seasonId?: string): Promise<{ totalEvents: number; upcomingEvents: number; totalAllTime: number }> {
    const em = this.em.fork();
    const where: any = {};
    if (seasonId) where.season = seasonId;
    const [totalEvents, upcomingEvents, totalAllTime] = await Promise.all([
      em.count(Event, where),
      // Events still LEFT (not yet run) in the scope — powers the admin
      // dashboard "remaining / season total" pair.
      em.count(Event, {
        ...where,
        eventDate: { $gte: new Date() },
        status: { $nin: ['completed', 'cancelled'] },
      }),
      em.count(Event, {}),
    ]);
    return { totalEvents, upcomingEvents, totalAllTime };
  }

  // In-memory progress tracking for backfill jobs
  private backfillJobs = new Map<string, {
    total: number;
    completed: number;
    updated: number;
    skipped: number;
    failed: number;
    done: boolean;
    currentEvent?: string;
  }>();

  /**
   * Count events that need geocoding within a date range
   */
  async countEventsNeedingGeocode(startDate?: string, endDate?: string): Promise<number> {
    const em = this.em.fork();
    const filter: any = {
      venueAddress: { $ne: null },
      $or: [
        { latitude: null },
        { longitude: null },
      ],
    };
    if (startDate) filter.eventDate = { ...filter.eventDate, $gte: new Date(startDate) };
    if (endDate) filter.eventDate = { ...filter.eventDate, $lte: new Date(endDate) };
    return em.count(Event, filter);
  }

  /**
   * Start a backfill geocode job. Returns a jobId for progress tracking.
   */
  async startBackfillGeocode(startDate?: string, endDate?: string): Promise<{ jobId: string; total: number }> {
    const em = this.em.fork();

    const filter: any = {
      venueAddress: { $ne: null },
      $or: [
        { latitude: null },
        { longitude: null },
      ],
    };
    if (startDate) filter.eventDate = { ...filter.eventDate, $gte: new Date(startDate) };
    if (endDate) filter.eventDate = { ...filter.eventDate, $lte: new Date(endDate) };

    const events = await em.find(Event, filter, { orderBy: { eventDate: 'ASC' } });
    const jobId = randomUUID();

    const progress = {
      total: events.length,
      completed: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      done: false,
    };
    this.backfillJobs.set(jobId, progress);

    // Run in background (don't await)
    this.runBackfillJob(jobId, events, em).catch(err => {
      this.logger.error(`Backfill job ${jobId} crashed:`, err);
      const job = this.backfillJobs.get(jobId);
      if (job) job.done = true;
    });

    return { jobId, total: events.length };
  }

  private async runBackfillJob(jobId: string, events: Event[], em: EntityManager): Promise<void> {
    const progress = this.backfillJobs.get(jobId)!;

    for (const event of events) {
      progress.currentEvent = event.title;
      try {
        const coords = await this.geocodingService.geocodeAddress(
          event.venueAddress,
          event.venueCity,
          event.venueState,
          event.venuePostalCode,
          event.venueCountry,
        );

        if (coords) {
          event.latitude = coords.latitude;
          event.longitude = coords.longitude;
          progress.updated++;
        } else {
          progress.skipped++;
        }

        // Small delay to respect Google rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        this.logger.warn(`Backfill geocode failed for event ${event.id}:`, err);
        progress.failed++;
      }
      progress.completed++;
    }

    await em.flush();
    progress.done = true;
    progress.currentEvent = undefined;
    this.logger.log(`Backfill job ${jobId} complete: ${progress.updated} updated, ${progress.skipped} skipped, ${progress.failed} failed`);

    // Clean up after 5 minutes
    setTimeout(() => this.backfillJobs.delete(jobId), 5 * 60 * 1000);
  }

  /**
   * Get progress for a backfill job
   */
  getBackfillProgress(jobId: string) {
    return this.backfillJobs.get(jobId) || null;
  }

  /**
   * Send rating request emails to all participants of a completed event
   * @param eventId The ID of the event
   * @returns Summary of emails sent
   */
  async sendRatingRequestEmails(eventId: string): Promise<{ sent: number; failed: number; errors: string[] }> {
    const em = this.em.fork();

    // Find the event and verify it's completed
    const event = await em.findOne(Event, { id: eventId });
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (event.status !== EventStatus.COMPLETED) {
      throw new BadRequestException(`Event is not completed. Current status: ${event.status}`);
    }

    // Recipients come from TWO sources, deduped by email:
    //   1) Site registrations (confirmed or checked-in) — the original source.
    //   2) Competitors in the event's RESULTS who hold an ACTIVE membership.
    // Source 2 is essential: most results are imported from score sheets, so
    // competitors usually never registered on the site — registrations alone
    // made real events report "no eligible participants found".
    const registrations = await em.find(
      EventRegistration,
      {
        event: eventId,
        $or: [
          { registrationStatus: RegistrationStatus.CONFIRMED },
          { checkedIn: true },
        ],
      },
      { populate: ['user'] }
    );

    // Distinct MECA IDs from this event's results (trimmed — imported rows
    // can carry stray spaces; skip the 999999/0 guest sentinels).
    const resultIdRows: Array<{ meca_id: string }> = await em.getConnection().execute(
      `SELECT DISTINCT trim(meca_id) AS meca_id
         FROM public.competition_results
        WHERE event_id = ?
          AND trim(meca_id) ~ '^[0-9]+$'
          AND trim(meca_id) NOT IN ('999999', '0')`,
      [eventId],
    );
    const resultMecaIds = resultIdRows.map((r) => r.meca_id);
    const resultProfiles = resultMecaIds.length > 0
      ? await em.find(Profile, {
          meca_id: { $in: resultMecaIds },
          membership_status: MembershipStatus.ACTIVE,
        })
      : [];

    if (registrations.length === 0 && resultProfiles.length === 0) {
      return {
        sent: 0,
        failed: 0,
        errors: ['No eligible participants found for this event (no site registrations, and no competitors in the results hold an active membership)'],
      };
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://meca.com';
    const ratingUrl = `${frontendUrl}/events/${eventId}#ratings`;

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Unified recipient list. Registrations first (they may carry a fresher
    // contact email than the profile), then results-based active members.
    const recipients: Array<{ email?: string | null; firstName?: string | null; userId?: string; sourceLabel: string }> = [
      ...registrations.map((registration) => ({
        email: registration.email || registration.user?.email,
        firstName: registration.firstName || registration.user?.first_name,
        userId: registration.user?.id,
        sourceLabel: `Registration ${registration.id}`,
      })),
      ...resultProfiles.map((profile) => ({
        email: profile.email,
        firstName: profile.first_name,
        userId: profile.id,
        sourceLabel: `Competitor ${profile.meca_id}`,
      })),
    ];

    // Track emails sent to avoid duplicates
    const sentEmails = new Set<string>();

    for (const recipient of recipients) {
      const { email, firstName } = recipient;

      if (!email) {
        errors.push(`${recipient.sourceLabel} has no email`);
        failed++;
        continue;
      }

      // Skip duplicate emails
      if (sentEmails.has(email.toLowerCase())) {
        continue;
      }
      sentEmails.add(email.toLowerCase());

      try {
        const result = await this.emailService.sendEventRatingRequestEmail({
          to: email,
          firstName: firstName || undefined,
          eventName: event.title,
          eventDate: event.eventDate,
          ratingUrl,
        });

        if (result.success) {
          sent++;
        } else {
          failed++;
          errors.push(`Failed to send to ${email}: ${result.error}`);
        }

        if (recipient.userId) {
          await this.notificationsService.createForUser({
            userId: recipient.userId,
            title: `Rate your experience at ${event.title}`,
            message: `How was the event? Take a moment to share your feedback.`,
            type: 'info',
            link: ratingUrl.startsWith('http') ? ratingUrl : '/events',
          });
        }
      } catch (error) {
        failed++;
        errors.push(`Error sending to ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { sent, failed, errors };
  }
}
