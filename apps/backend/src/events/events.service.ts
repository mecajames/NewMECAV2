import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Event } from './events.entity';
import { Season } from '../seasons/seasons.entity';
import { EventStatus } from '../types/enums';

@Injectable()
export class EventsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(page: number = 1, limit: number = 10): Promise<Event[]> {
    const em = this.em.fork();
    const offset = (page - 1) * limit;
    return em.find(Event, {}, {
      limit,
      offset,
      orderBy: { eventDate: 'ASC' }
    });
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
    return em.find(Event, { season: seasonId }, {
      limit,
      offset,
      orderBy: { eventDate: 'ASC' }
    });
  }

  async findByDirector(directorId: string): Promise<Event[]> {
    const em = this.em.fork();
    return em.find(Event, { eventDirector: directorId });
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
    if ((data as any).event_director_id !== undefined) transformedData.eventDirector = (data as any).event_director_id;
    if ((data as any).season_id !== undefined) transformedData.season = (data as any).season_id;
    if ((data as any).max_participants !== undefined) transformedData.maxParticipants = (data as any).max_participants;
    if ((data as any).registration_fee !== undefined) transformedData.registrationFee = (data as any).registration_fee;

    // Copy fields that don't need transformation
    if (data.title !== undefined) transformedData.title = data.title;
    if (data.description !== undefined) transformedData.description = data.description;
    if (data.latitude !== undefined) transformedData.latitude = data.latitude;
    if (data.longitude !== undefined) transformedData.longitude = data.longitude;
    if (data.status !== undefined) transformedData.status = data.status;

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

    const event = em.create(Event, transformedData);
    await em.persistAndFlush(event);
    return event;
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
    if ((data as any).event_director_id !== undefined) transformedData.eventDirector = (data as any).event_director_id;
    if ((data as any).season_id !== undefined) transformedData.season = (data as any).season_id;
    if ((data as any).max_participants !== undefined) transformedData.maxParticipants = (data as any).max_participants;
    if ((data as any).registration_fee !== undefined) transformedData.registrationFee = (data as any).registration_fee;

    // Copy fields that don't need transformation
    if (data.title !== undefined) transformedData.title = data.title;
    if (data.description !== undefined) transformedData.description = data.description;
    if (data.latitude !== undefined) transformedData.latitude = data.latitude;
    if (data.longitude !== undefined) transformedData.longitude = data.longitude;
    if (data.status !== undefined) transformedData.status = data.status;

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

    em.assign(event, transformedData);
    console.log('🔍 UPDATE EVENT - After em.assign, event date:', event.eventDate);

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
}
