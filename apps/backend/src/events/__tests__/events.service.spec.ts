import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventsService } from '../events.service';
import { Event } from '../events.entity';
import { Season } from '../../seasons/seasons.entity';
import { EventRegistration } from '../../event-registrations/event-registrations.entity';
import { EmailService } from '../../email/email.service';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { createMockEvent } from '../../../test/utils/test-utils';
import { EventStatus, RegistrationStatus } from '@newmeca/shared';
import { EntityManager } from '@mikro-orm/core';

describe('EventsService', () => {
  let service: EventsService;
  let mockEm: jest.Mocked<EntityManager>;
  let mockEmailService: jest.Mocked<Partial<EmailService>>;
  let mockConnection: { execute: jest.Mock };

  beforeEach(async () => {
    mockEm = createMockEntityManager();

    // Setup getConnection mock for raw SQL queries
    mockConnection = { execute: jest.fn().mockResolvedValue([]) };
    (mockEm as any).getConnection = jest.fn().mockReturnValue(mockConnection);

    mockEmailService = {
      sendEventRatingRequestEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: 'EntityManager',
          useValue: mockEm,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('should return paginated events ordered by eventDate DESC', async () => {
      const mockEvents = [
        createMockEvent({ id: 'event-1' }),
        createMockEvent({ id: 'event-2' }),
      ];
      mockEm.find.mockResolvedValue(mockEvents as any);

      const result = await service.findAll(1, 10);

      expect(result).toEqual(mockEvents);
      expect(mockEm.fork).toHaveBeenCalled();
      expect(mockEm.find).toHaveBeenCalledWith(
        Event,
        {},
        {
          limit: 10,
          offset: 0,
          orderBy: { eventDate: 'DESC' },
        },
      );
    });

    it('should calculate correct offset for page 2', async () => {
      mockEm.find.mockResolvedValue([]);

      await service.findAll(2, 10);

      expect(mockEm.find).toHaveBeenCalledWith(
        Event,
        {},
        expect.objectContaining({ offset: 10 }),
      );
    });

    it('should calculate correct offset for page 3 with limit 5', async () => {
      mockEm.find.mockResolvedValue([]);

      await service.findAll(3, 5);

      expect(mockEm.find).toHaveBeenCalledWith(
        Event,
        {},
        expect.objectContaining({ offset: 10, limit: 5 }),
      );
    });

    it('should use default values when no arguments are provided', async () => {
      mockEm.find.mockResolvedValue([]);

      await service.findAll();

      expect(mockEm.find).toHaveBeenCalledWith(
        Event,
        {},
        expect.objectContaining({ limit: 10, offset: 0 }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------
  describe('findById', () => {
    it('should return the event when found', async () => {
      const mockEvent = createMockEvent({ id: 'event-123' });
      mockEm.findOne.mockResolvedValue(mockEvent as any);

      const result = await service.findById('event-123');

      expect(result).toEqual(mockEvent);
      expect(mockEm.fork).toHaveBeenCalled();
      expect(mockEm.findOne).toHaveBeenCalledWith(Event, { id: 'event-123' });
    });

    it('should throw NotFoundException when event is not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        'Event with ID nonexistent-id not found',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findUpcoming
  // ---------------------------------------------------------------------------
  describe('findUpcoming', () => {
    it('should find events with eventDate >= now and status UPCOMING, ordered ASC', async () => {
      const upcomingEvents = [
        createMockEvent({ id: 'event-1', status: EventStatus.UPCOMING }),
        createMockEvent({ id: 'event-2', status: EventStatus.UPCOMING }),
      ];
      mockEm.find.mockResolvedValue(upcomingEvents as any);

      const result = await service.findUpcoming();

      expect(result).toEqual(upcomingEvents);
      expect(mockEm.fork).toHaveBeenCalled();
      expect(mockEm.find).toHaveBeenCalledWith(
        Event,
        {
          eventDate: { $gte: expect.any(Date) },
          status: EventStatus.UPCOMING,
        },
        {
          orderBy: { eventDate: 'ASC' },
        },
      );
    });

    it('should return empty array when no upcoming events exist', async () => {
      mockEm.find.mockResolvedValue([]);

      const result = await service.findUpcoming();

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // findBySeason
  // ---------------------------------------------------------------------------
  describe('findBySeason', () => {
    it('should find events by seasonId with pagination', async () => {
      const events = [createMockEvent({ id: 'event-1' })];
      mockEm.find.mockResolvedValue(events as any);

      const result = await service.findBySeason('season-123', 1, 10);

      expect(result).toEqual(events);
      expect(mockEm.find).toHaveBeenCalledWith(
        Event,
        { season: 'season-123' },
        {
          limit: 10,
          offset: 0,
          orderBy: { eventDate: 'DESC' },
        },
      );
    });

    it('should use correct offset for page 2', async () => {
      mockEm.find.mockResolvedValue([]);

      await service.findBySeason('season-123', 2, 5);

      expect(mockEm.find).toHaveBeenCalledWith(
        Event,
        { season: 'season-123' },
        expect.objectContaining({ offset: 5, limit: 5 }),
      );
    });

    it('should use default pagination values', async () => {
      mockEm.find.mockResolvedValue([]);

      await service.findBySeason('season-123');

      expect(mockEm.find).toHaveBeenCalledWith(
        Event,
        { season: 'season-123' },
        expect.objectContaining({ limit: 10, offset: 0 }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findByDirector
  // ---------------------------------------------------------------------------
  describe('findByDirector', () => {
    it('should find events by director id ordered by eventDate DESC', async () => {
      const events = [createMockEvent({ id: 'event-1' })];
      mockEm.find.mockResolvedValue(events as any);

      const result = await service.findByDirector('director-123');

      expect(result).toEqual(events);
      expect(mockEm.find).toHaveBeenCalledWith(
        Event,
        { eventDirector: 'director-123' },
        { orderBy: { eventDate: 'DESC' } },
      );
    });

    it('should return empty array when director has no events', async () => {
      mockEm.find.mockResolvedValue([]);

      const result = await service.findByDirector('director-no-events');

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // findByMultiDayGroup
  // ---------------------------------------------------------------------------
  describe('findByMultiDayGroup', () => {
    it('should find events by multiDayGroupId ordered by dayNumber ASC', async () => {
      const events = [
        createMockEvent({ id: 'day-1', dayNumber: 1 }),
        createMockEvent({ id: 'day-2', dayNumber: 2 }),
      ];
      mockEm.find.mockResolvedValue(events as any);

      const result = await service.findByMultiDayGroup('group-123');

      expect(result).toEqual(events);
      expect(mockEm.find).toHaveBeenCalledWith(
        Event,
        { multiDayGroupId: 'group-123' },
        { orderBy: { dayNumber: 'ASC' } },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findPublicEvents
  // ---------------------------------------------------------------------------
  describe('findPublicEvents', () => {
    it('should return public events with default pagination', async () => {
      const events = [createMockEvent({ id: 'event-1' })];
      mockEm.find.mockResolvedValue(events as any);
      mockEm.count.mockResolvedValue(1);

      const result = await service.findPublicEvents({});

      expect(result).toEqual({
        events,
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('should filter by $in for public statuses when no status or status is "all"', async () => {
      mockEm.find.mockResolvedValue([]);
      mockEm.count.mockResolvedValue(0);

      await service.findPublicEvents({});

      const expectedFilter = {
        status: {
          $in: [
            EventStatus.UPCOMING,
            EventStatus.ONGOING,
            EventStatus.COMPLETED,
            EventStatus.CANCELLED,
          ],
        },
      };
      expect(mockEm.find).toHaveBeenCalledWith(Event, expectedFilter, expect.any(Object));
      expect(mockEm.count).toHaveBeenCalledWith(Event, expectedFilter);
    });

    it('should filter by $in for public statuses when status is "all"', async () => {
      mockEm.find.mockResolvedValue([]);
      mockEm.count.mockResolvedValue(0);

      await service.findPublicEvents({ status: 'all' });

      expect(mockEm.find).toHaveBeenCalledWith(
        Event,
        expect.objectContaining({
          status: {
            $in: [
              EventStatus.UPCOMING,
              EventStatus.ONGOING,
              EventStatus.COMPLETED,
              EventStatus.CANCELLED,
            ],
          },
        }),
        expect.any(Object),
      );
    });

    it('should filter by specific status when provided', async () => {
      mockEm.find.mockResolvedValue([]);
      mockEm.count.mockResolvedValue(0);

      await service.findPublicEvents({ status: 'upcoming' });

      expect(mockEm.find).toHaveBeenCalledWith(
        Event,
        expect.objectContaining({ status: 'upcoming' }),
        expect.any(Object),
      );
    });

    it('should filter by seasonId when provided', async () => {
      mockEm.find.mockResolvedValue([]);
      mockEm.count.mockResolvedValue(0);

      await service.findPublicEvents({ seasonId: 'season-123' });

      expect(mockEm.find).toHaveBeenCalledWith(
        Event,
        expect.objectContaining({ season: 'season-123' }),
        expect.any(Object),
      );
    });

    it('should apply pagination correctly', async () => {
      mockEm.find.mockResolvedValue([]);
      mockEm.count.mockResolvedValue(0);

      await service.findPublicEvents({ page: 3, limit: 5 });

      expect(mockEm.find).toHaveBeenCalledWith(
        Event,
        expect.any(Object),
        expect.objectContaining({ limit: 5, offset: 10 }),
      );
    });

    it('should rethrow errors from em.find', async () => {
      const dbError = new Error('Database connection failed');
      mockEm.find.mockRejectedValue(dbError);

      await expect(service.findPublicEvents({})).rejects.toThrow('Database connection failed');
    });
  });

  // ---------------------------------------------------------------------------
  // findCompletedWithResultCounts
  // ---------------------------------------------------------------------------
  describe('findCompletedWithResultCounts', () => {
    it('should execute raw SQL for count and main query', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([{ total: '5' }]) // count query
        .mockResolvedValueOnce([
          { id: 'event-1', result_count: 10 },
          { id: 'event-2', result_count: 3 },
        ]); // main query

      const result = await service.findCompletedWithResultCounts({});

      expect(result.total).toBe(5);
      expect(result.events).toHaveLength(2);
      expect(result.events[0].result_count).toBe(10);

      // Verify count SQL was called
      expect(mockConnection.execute).toHaveBeenCalledTimes(2);
      const countCall = mockConnection.execute.mock.calls[0];
      expect(countCall[0]).toContain("e.status = 'completed'");
      expect(countCall[0]).toContain('COUNT(*)');
    });

    it('should include seasonId condition when provided', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([{ total: '2' }])
        .mockResolvedValueOnce([]);

      await service.findCompletedWithResultCounts({ seasonId: 'season-123' });

      const countCall = mockConnection.execute.mock.calls[0];
      expect(countCall[0]).toContain('e.season_id = ?');
      expect(countCall[1]).toContain('season-123');

      const mainCall = mockConnection.execute.mock.calls[1];
      expect(mainCall[0]).toContain('e.season_id = ?');
      expect(mainCall[1]).toContain('season-123');
    });

    it('should apply pagination with default values', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([{ total: '0' }])
        .mockResolvedValueOnce([]);

      await service.findCompletedWithResultCounts({});

      const mainCall = mockConnection.execute.mock.calls[1];
      // Default limit=20, offset=0
      expect(mainCall[1]).toContain(20);
      expect(mainCall[1]).toContain(0);
    });

    it('should calculate correct offset for custom page/limit', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([{ total: '50' }])
        .mockResolvedValueOnce([]);

      await service.findCompletedWithResultCounts({ page: 3, limit: 10 });

      const mainCall = mockConnection.execute.mock.calls[1];
      // page 3, limit 10 -> offset 20
      expect(mainCall[1]).toContain(10);
      expect(mainCall[1]).toContain(20);
    });

    it('should return total of 0 when count result is empty', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([]) // empty count result
        .mockResolvedValueOnce([]);

      const result = await service.findCompletedWithResultCounts({});

      expect(result.total).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('should transform snake_case fields to camelCase and create an event', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const inputData: any = {
        title: 'Test Event',
        event_date: futureDate,
        venue_name: 'Test Venue',
        venue_address: '123 Main St',
        venue_city: 'Test City',
        venue_state: 'TX',
        venue_postal_code: '75001',
        venue_country: 'US',
        max_participants: 50,
        registration_fee: 25.0,
        member_entry_fee: 15.0,
        non_member_entry_fee: 20.0,
        has_gate_fee: true,
        gate_fee: 5.0,
        points_multiplier: 2,
        event_type: 'standard',
      };

      const createdEvent = { id: 'new-event-id', ...inputData };
      mockEm.create.mockReturnValue(createdEvent as any);
      mockEm.persistAndFlush.mockResolvedValue(undefined);
      // No seasons found so no auto-assign
      mockEm.find.mockResolvedValue([]);

      const result = await service.create(inputData);

      expect(mockEm.fork).toHaveBeenCalled();
      expect(mockEm.create).toHaveBeenCalledWith(
        Event,
        expect.objectContaining({
          title: 'Test Event',
          eventDate: futureDate,
          venueName: 'Test Venue',
          venueAddress: '123 Main St',
          venueCity: 'Test City',
          venueState: 'TX',
          venuePostalCode: '75001',
          venueCountry: 'US',
          maxParticipants: 50,
          registrationFee: 25.0,
          memberEntryFee: 15.0,
          nonMemberEntryFee: 20.0,
          hasGateFee: true,
          gateFee: 5.0,
          pointsMultiplier: 2,
          eventType: 'standard',
        }),
      );
      expect(mockEm.persistAndFlush).toHaveBeenCalledWith(createdEvent);
      expect(result).toEqual(createdEvent);
    });

    it('should auto-detect status as UPCOMING for future event dates', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const inputData: any = {
        title: 'Future Event',
        event_date: futureDate,
        venue_name: 'Venue',
        venue_address: '123 St',
      };

      mockEm.create.mockReturnValue({ id: 'event-1', ...inputData } as any);
      mockEm.find.mockResolvedValue([]); // no seasons

      await service.create(inputData);

      expect(mockEm.create).toHaveBeenCalledWith(
        Event,
        expect.objectContaining({
          status: EventStatus.UPCOMING,
        }),
      );
    });

    it('should auto-detect status as COMPLETED for past event dates', async () => {
      // Event date more than 24h in the past
      const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const inputData: any = {
        title: 'Past Event',
        event_date: pastDate,
        venue_name: 'Venue',
        venue_address: '123 St',
      };

      mockEm.create.mockReturnValue({ id: 'event-1', ...inputData } as any);
      mockEm.find.mockResolvedValue([]); // no seasons

      await service.create(inputData);

      expect(mockEm.create).toHaveBeenCalledWith(
        Event,
        expect.objectContaining({
          status: EventStatus.COMPLETED,
        }),
      );
    });

    it('should not override CANCELLED status with auto-detection', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const inputData: any = {
        title: 'Cancelled Event',
        event_date: futureDate,
        venue_name: 'Venue',
        venue_address: '123 St',
        status: EventStatus.CANCELLED,
      };

      mockEm.create.mockReturnValue({ id: 'event-1', ...inputData } as any);
      mockEm.find.mockResolvedValue([]); // no seasons

      await service.create(inputData);

      expect(mockEm.create).toHaveBeenCalledWith(
        Event,
        expect.objectContaining({
          status: EventStatus.CANCELLED,
        }),
      );
    });

    it('should not override NOT_PUBLIC status with auto-detection', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const inputData: any = {
        title: 'Private Event',
        event_date: futureDate,
        venue_name: 'Venue',
        venue_address: '123 St',
        status: EventStatus.NOT_PUBLIC,
      };

      mockEm.create.mockReturnValue({ id: 'event-1', ...inputData } as any);
      mockEm.find.mockResolvedValue([]); // no seasons

      await service.create(inputData);

      expect(mockEm.create).toHaveBeenCalledWith(
        Event,
        expect.objectContaining({
          status: EventStatus.NOT_PUBLIC,
        }),
      );
    });

    it('should auto-assign season when event date falls within a season range', async () => {
      const eventDate = '2026-06-15T00:00:00.000Z';
      const inputData: any = {
        title: 'Seasonal Event',
        event_date: eventDate,
        venue_name: 'Venue',
        venue_address: '123 St',
      };

      const mockSeason = {
        id: 'season-2026',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      };
      // First find call is for seasons (in findSeasonForEventDate)
      mockEm.find.mockResolvedValue([mockSeason] as any);
      mockEm.create.mockReturnValue({ id: 'event-1' } as any);

      await service.create(inputData);

      expect(mockEm.create).toHaveBeenCalledWith(
        Event,
        expect.objectContaining({
          season: mockSeason,
        }),
      );
    });

    it('should not auto-assign season when season_id is explicitly provided', async () => {
      const eventDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const inputData: any = {
        title: 'Event With Season',
        event_date: eventDate,
        venue_name: 'Venue',
        venue_address: '123 St',
        season_id: 'explicit-season-id',
      };

      mockEm.create.mockReturnValue({ id: 'event-1' } as any);
      // Should not call find for seasons since season is explicitly set

      await service.create(inputData);

      // The season should be set via Reference.createFromPK, not auto-assigned
      expect(mockEm.create).toHaveBeenCalledWith(
        Event,
        expect.not.objectContaining({
          season: expect.objectContaining({ id: expect.any(String) }),
        }),
      );
    });

    it('should copy fields that do not need transformation', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const inputData: any = {
        title: 'Test Event',
        description: 'A description',
        event_date: futureDate,
        venue_name: 'Venue',
        venue_address: '123 St',
        latitude: 32.7767,
        longitude: -96.797,
        formats: ['SQ', 'SPL'],
      };

      mockEm.create.mockReturnValue({ id: 'event-1' } as any);
      mockEm.find.mockResolvedValue([]);

      await service.create(inputData);

      expect(mockEm.create).toHaveBeenCalledWith(
        Event,
        expect.objectContaining({
          title: 'Test Event',
          description: 'A description',
          latitude: 32.7767,
          longitude: -96.797,
          formats: ['SQ', 'SPL'],
        }),
      );
    });

    it('should rethrow errors from persistAndFlush', async () => {
      const inputData: any = {
        title: 'Failing Event',
        event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        venue_name: 'Venue',
        venue_address: '123 St',
      };

      mockEm.create.mockReturnValue({ id: 'event-1' } as any);
      mockEm.find.mockResolvedValue([]);
      mockEm.persistAndFlush.mockRejectedValue(new Error('DB write failed'));

      await expect(service.create(inputData)).rejects.toThrow('DB write failed');
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('should find the event, transform data, assign, and flush', async () => {
      const existingEvent = createMockEvent({ id: 'event-123', title: 'Old Title' });
      mockEm.findOne.mockResolvedValue(existingEvent as any);
      mockEm.find.mockResolvedValue([]); // no seasons

      const updateData: any = {
        title: 'New Title',
        venue_name: 'New Venue',
        venue_city: 'New City',
      };

      const result = await service.update('event-123', updateData);

      expect(mockEm.findOne).toHaveBeenCalledWith(Event, { id: 'event-123' });
      expect(mockEm.assign).toHaveBeenCalledWith(
        existingEvent,
        expect.objectContaining({
          title: 'New Title',
          venueName: 'New Venue',
          venueCity: 'New City',
        }),
      );
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should throw NotFoundException when event is not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', { title: 'X' } as any)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update('nonexistent-id', { title: 'X' } as any)).rejects.toThrow(
        'Event with ID nonexistent-id not found',
      );
    });

    it('should transform snake_case fields to camelCase on update', async () => {
      const existingEvent = createMockEvent({ id: 'event-123' });
      mockEm.findOne.mockResolvedValue(existingEvent as any);
      mockEm.find.mockResolvedValue([]);

      const updateData: any = {
        event_date: '2026-08-01T00:00:00.000Z',
        registration_deadline: '2026-07-25T00:00:00.000Z',
        venue_address: '456 New St',
        venue_state: 'CA',
        venue_postal_code: '90210',
        flyer_url: 'https://example.com/flyer.jpg',
        max_participants: 200,
        registration_fee: 30,
        member_entry_fee: 20,
        non_member_entry_fee: 25,
        has_gate_fee: false,
        gate_fee: 0,
        points_multiplier: 3,
        event_type: 'finals',
        flyer_image_position: { x: 50, y: 50 },
        multi_day_results_mode: 'combined_score',
      };

      await service.update('event-123', updateData);

      expect(mockEm.assign).toHaveBeenCalledWith(
        existingEvent,
        expect.objectContaining({
          eventDate: '2026-08-01T00:00:00.000Z',
          registrationDeadline: '2026-07-25T00:00:00.000Z',
          venueAddress: '456 New St',
          venueState: 'CA',
          venuePostalCode: '90210',
          flyerUrl: 'https://example.com/flyer.jpg',
          maxParticipants: 200,
          registrationFee: 30,
          memberEntryFee: 20,
          nonMemberEntryFee: 25,
          hasGateFee: false,
          gateFee: 0,
          pointsMultiplier: 3,
          eventType: 'finals',
          flyerImagePosition: { x: 50, y: 50 },
          multiDayResultsMode: 'combined_score',
        }),
      );
    });

    it('should auto-detect status when event_date changes and status is not CANCELLED', async () => {
      const existingEvent = createMockEvent({ id: 'event-123' });
      mockEm.findOne.mockResolvedValue(existingEvent as any);
      mockEm.find.mockResolvedValue([]); // no seasons

      const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const updateData: any = {
        event_date: futureDate,
      };

      await service.update('event-123', updateData);

      expect(mockEm.assign).toHaveBeenCalledWith(
        existingEvent,
        expect.objectContaining({
          status: EventStatus.UPCOMING,
        }),
      );
    });

    it('should not override CANCELLED status on update', async () => {
      const existingEvent = createMockEvent({ id: 'event-123' });
      mockEm.findOne.mockResolvedValue(existingEvent as any);

      const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const updateData: any = {
        event_date: futureDate,
        status: EventStatus.CANCELLED,
      };

      await service.update('event-123', updateData);

      expect(mockEm.assign).toHaveBeenCalledWith(
        existingEvent,
        expect.objectContaining({
          status: EventStatus.CANCELLED,
        }),
      );
    });

    it('should clear event_director when empty string is provided', async () => {
      const existingEvent = createMockEvent({ id: 'event-123' });
      mockEm.findOne.mockResolvedValue(existingEvent as any);

      const updateData: any = {
        event_director_id: '',
      };

      await service.update('event-123', updateData);

      expect(mockEm.assign).toHaveBeenCalledWith(
        existingEvent,
        expect.objectContaining({
          eventDirector: null,
        }),
      );
    });

    it('should clear season when empty string is provided', async () => {
      const existingEvent = createMockEvent({ id: 'event-123' });
      mockEm.findOne.mockResolvedValue(existingEvent as any);

      const updateData: any = {
        season_id: '',
      };

      await service.update('event-123', updateData);

      expect(mockEm.assign).toHaveBeenCalledWith(
        existingEvent,
        expect.objectContaining({
          season: null,
        }),
      );
    });

    it('should auto-assign season when event date changes and no season_id provided', async () => {
      const existingEvent = createMockEvent({ id: 'event-123' });
      mockEm.findOne.mockResolvedValue(existingEvent as any);

      const mockSeason = {
        id: 'season-2026',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      };
      mockEm.find.mockResolvedValue([mockSeason] as any);

      const updateData: any = {
        event_date: '2026-06-15T00:00:00.000Z',
      };

      await service.update('event-123', updateData);

      expect(mockEm.assign).toHaveBeenCalledWith(
        existingEvent,
        expect.objectContaining({
          season: mockSeason,
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('should find the event and remove it', async () => {
      const existingEvent = createMockEvent({ id: 'event-123' });
      mockEm.findOne.mockResolvedValue(existingEvent as any);

      await service.delete('event-123');

      expect(mockEm.findOne).toHaveBeenCalledWith(Event, { id: 'event-123' });
      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(existingEvent);
    });

    it('should throw NotFoundException when event is not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.delete('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.delete('nonexistent-id')).rejects.toThrow(
        'Event with ID nonexistent-id not found',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getStats
  // ---------------------------------------------------------------------------
  describe('getStats', () => {
    it('should return total event count', async () => {
      mockEm.count.mockResolvedValue(42);

      const result = await service.getStats();

      expect(result).toEqual({ totalEvents: 42 });
      expect(mockEm.count).toHaveBeenCalledWith(Event, {});
    });

    it('should return 0 when there are no events', async () => {
      mockEm.count.mockResolvedValue(0);

      const result = await service.getStats();

      expect(result).toEqual({ totalEvents: 0 });
    });
  });

  // ---------------------------------------------------------------------------
  // sendRatingRequestEmails
  // ---------------------------------------------------------------------------
  describe('sendRatingRequestEmails', () => {
    const completedEvent = {
      id: 'event-123',
      title: 'Completed Event',
      status: EventStatus.COMPLETED,
      eventDate: new Date('2026-01-15'),
    };

    it('should send emails to all eligible participants', async () => {
      mockEm.findOne.mockResolvedValue(completedEvent as any);

      const registrations = [
        {
          id: 'reg-1',
          email: 'user1@example.com',
          firstName: 'Alice',
          registrationStatus: RegistrationStatus.CONFIRMED,
          user: { email: 'user1@example.com', first_name: 'Alice' },
        },
        {
          id: 'reg-2',
          email: 'user2@example.com',
          firstName: 'Bob',
          registrationStatus: RegistrationStatus.CONFIRMED,
          user: { email: 'user2@example.com', first_name: 'Bob' },
        },
      ];
      mockEm.find.mockResolvedValue(registrations as any);

      const result = await service.sendRatingRequestEmails('event-123');

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockEmailService.sendEventRatingRequestEmail).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException when event is not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.sendRatingRequestEmails('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when event is not completed', async () => {
      const upcomingEvent = {
        id: 'event-123',
        title: 'Upcoming Event',
        status: EventStatus.UPCOMING,
        eventDate: new Date(),
      };
      mockEm.findOne.mockResolvedValue(upcomingEvent as any);

      await expect(service.sendRatingRequestEmails('event-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.sendRatingRequestEmails('event-123')).rejects.toThrow(
        'Event is not completed',
      );
    });

    it('should return zero counts when no eligible participants are found', async () => {
      mockEm.findOne.mockResolvedValue(completedEvent as any);
      mockEm.find.mockResolvedValue([]);

      const result = await service.sendRatingRequestEmails('event-123');

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toContain('No eligible participants found for this event');
      expect(mockEmailService.sendEventRatingRequestEmail).not.toHaveBeenCalled();
    });

    it('should skip participants without email and count them as failed', async () => {
      mockEm.findOne.mockResolvedValue(completedEvent as any);

      const registrations = [
        {
          id: 'reg-1',
          email: null,
          firstName: 'NoEmail',
          user: null, // no user profile either
        },
      ];
      mockEm.find.mockResolvedValue(registrations as any);

      const result = await service.sendRatingRequestEmails('event-123');

      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('has no email');
      expect(mockEmailService.sendEventRatingRequestEmail).not.toHaveBeenCalled();
    });

    it('should skip duplicate emails', async () => {
      mockEm.findOne.mockResolvedValue(completedEvent as any);

      const registrations = [
        {
          id: 'reg-1',
          email: 'same@example.com',
          firstName: 'Alice',
          user: { email: 'same@example.com', first_name: 'Alice' },
        },
        {
          id: 'reg-2',
          email: 'Same@Example.com', // same email, different case
          firstName: 'Bob',
          user: { email: 'same@example.com', first_name: 'Bob' },
        },
      ];
      mockEm.find.mockResolvedValue(registrations as any);

      const result = await service.sendRatingRequestEmails('event-123');

      expect(result.sent).toBe(1);
      // Only one email should be sent (duplicate skipped)
      expect(mockEmailService.sendEventRatingRequestEmail).toHaveBeenCalledTimes(1);
    });

    it('should fall back to user profile email when registration email is missing', async () => {
      mockEm.findOne.mockResolvedValue(completedEvent as any);

      const registrations = [
        {
          id: 'reg-1',
          email: null,
          firstName: null,
          user: { email: 'profile@example.com', first_name: 'ProfileName' },
        },
      ];
      mockEm.find.mockResolvedValue(registrations as any);

      const result = await service.sendRatingRequestEmails('event-123');

      expect(result.sent).toBe(1);
      expect(mockEmailService.sendEventRatingRequestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'profile@example.com',
          firstName: 'ProfileName',
        }),
      );
    });

    it('should handle email service failures gracefully', async () => {
      mockEm.findOne.mockResolvedValue(completedEvent as any);

      const registrations = [
        {
          id: 'reg-1',
          email: 'user1@example.com',
          firstName: 'Alice',
          user: null,
        },
      ];
      mockEm.find.mockResolvedValue(registrations as any);
      (mockEmailService.sendEventRatingRequestEmail as jest.Mock).mockResolvedValue({
        success: false,
        error: 'SMTP error',
      });

      const result = await service.sendRatingRequestEmails('event-123');

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('SMTP error');
    });

    it('should handle email service throwing an exception', async () => {
      mockEm.findOne.mockResolvedValue(completedEvent as any);

      const registrations = [
        {
          id: 'reg-1',
          email: 'user1@example.com',
          firstName: 'Alice',
          user: null,
        },
      ];
      mockEm.find.mockResolvedValue(registrations as any);
      (mockEmailService.sendEventRatingRequestEmail as jest.Mock).mockRejectedValue(
        new Error('Connection refused'),
      );

      const result = await service.sendRatingRequestEmails('event-123');

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('Connection refused');
    });

    it('should include correct rating URL in email', async () => {
      const originalEnv = process.env.FRONTEND_URL;
      process.env.FRONTEND_URL = 'https://app.meca.com';

      mockEm.findOne.mockResolvedValue(completedEvent as any);
      const registrations = [
        {
          id: 'reg-1',
          email: 'user@example.com',
          firstName: 'Test',
          user: null,
        },
      ];
      mockEm.find.mockResolvedValue(registrations as any);

      await service.sendRatingRequestEmails('event-123');

      expect(mockEmailService.sendEventRatingRequestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          ratingUrl: 'https://app.meca.com/events/event-123#ratings',
        }),
      );

      process.env.FRONTEND_URL = originalEnv;
    });

    it('should query registrations with correct filter criteria', async () => {
      mockEm.findOne.mockResolvedValue(completedEvent as any);
      mockEm.find.mockResolvedValue([]);

      await service.sendRatingRequestEmails('event-123');

      expect(mockEm.find).toHaveBeenCalledWith(
        EventRegistration,
        {
          event: 'event-123',
          $or: [
            { registrationStatus: RegistrationStatus.CONFIRMED },
            { checkedIn: true },
          ],
        },
        { populate: ['user'] },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findByStatus
  // ---------------------------------------------------------------------------
  describe('findByStatus', () => {
    it('should find events by status string', async () => {
      const events = [createMockEvent({ status: 'completed' })];
      mockEm.find.mockResolvedValue(events as any);

      const result = await service.findByStatus('completed');

      expect(result).toEqual(events);
      expect(mockEm.find).toHaveBeenCalledWith(Event, { status: 'completed' });
    });
  });
});
