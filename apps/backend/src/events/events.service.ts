import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EntityManager, Reference } from '@mikro-orm/core';
import { Event } from './events.entity';
import { Season } from '../seasons/seasons.entity';
import { Profile } from '../profiles/profiles.entity';
import { EventRegistration } from '../event-registrations/event-registrations.entity';
import { EventStatus, RegistrationStatus, MultiDayResultsMode } from '@newmeca/shared';
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

  async findById(id: string): Promise<Event> {
    const em = this.em.fork();
    const event = await em.findOne(Event, { id });
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return event;
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

      return { events, total, page, limit };
    } catch (error) {
      this.logger.error('Error in findPublicEvents:', error);
      throw error;
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

      const event = em.create(Event, transformedData);
      await em.persistAndFlush(event);

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

        // Set multi-day fields
        transformedData.multiDayGroupId = multiDayGroupId;
        transformedData.dayNumber = dayNum;

        // Set multi-day results mode (same for all days in the group)
        if (multiDayResultsMode) {
          transformedData.multiDayResultsMode = multiDayResultsMode;
        }

        // Append day number to description
        const baseDescription = data.description || '';
        transformedData.description = baseDescription
          ? `${baseDescription}\n\n(Day ${dayNum} of ${numberOfDays})`
          : `(Day ${dayNum} of ${numberOfDays})`;

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

        const event = em.create(Event, transformedData);
        createdEvents.push(event);
      }

      // Persist all events
      await em.persistAndFlush(createdEvents);

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

    return event;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const event = await em.findOne(Event, { id });
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    await em.removeAndFlush(event);
  }

  async getStats(): Promise<{ totalEvents: number }> {
    const em = this.em.fork();
    const totalEvents = await em.count(Event, {});
    return { totalEvents };
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

    // Find all registrations for this event with confirmed status or checked in
    // EventRegistration has registrationStatus field and uses 'user' for the profile relationship
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

    if (registrations.length === 0) {
      return { sent: 0, failed: 0, errors: ['No eligible participants found for this event'] };
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://meca.com';
    const ratingUrl = `${frontendUrl}/events/${eventId}#ratings`;

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Track emails sent to avoid duplicates
    const sentEmails = new Set<string>();

    // Send email to each participant
    for (const registration of registrations) {
      // Use email from registration or from user profile
      const email = registration.email || registration.user?.email;
      const firstName = registration.firstName || registration.user?.first_name;

      if (!email) {
        errors.push(`Registration ${registration.id} has no email`);
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

        if (registration.user?.id) {
          await this.notificationsService.createForUser({
            userId: registration.user.id,
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
