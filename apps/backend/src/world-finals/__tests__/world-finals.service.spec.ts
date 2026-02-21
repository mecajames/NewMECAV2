import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { WorldFinalsService } from '../world-finals.service';
import { WorldFinalsQualification } from '../world-finals-qualification.entity';
import { FinalsRegistration } from '../finals-registration.entity';
import { FinalsVote } from '../finals-vote.entity';
import { Season } from '../../seasons/seasons.entity';
import { Profile } from '../../profiles/profiles.entity';
import { CompetitionResult } from '../../competition-results/competition-results.entity';
import { Notification } from '../../notifications/notifications.entity';
import { EmailService } from '../../email/email.service';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { EntityManager } from '@mikro-orm/core';

describe('WorldFinalsService', () => {
  let service: WorldFinalsService;
  let mockEm: jest.Mocked<EntityManager>;
  let mockEmailService: { sendEmail: jest.Mock };

  const TEST_USER_ID = 'user_test_123';
  const TEST_SEASON_ID = 'season_test_123';
  const TEST_QUALIFICATION_ID = 'qual_test_123';
  const TEST_REGISTRATION_ID = 'reg_test_123';
  const TEST_VOTE_ID = 'vote_test_123';

  function createMockSeason(overrides: Partial<Season> = {}): Partial<Season> {
    return {
      id: TEST_SEASON_ID,
      name: '2026 Season',
      isCurrent: true,
      qualificationPointsThreshold: 100,
      ...overrides,
    };
  }

  function createMockQualification(overrides: Partial<WorldFinalsQualification> = {}): Partial<WorldFinalsQualification> {
    return {
      id: TEST_QUALIFICATION_ID,
      season: TEST_SEASON_ID as any,
      mecaId: 1001,
      competitorName: 'Test Competitor',
      competitionClass: 'SQL 1',
      user: TEST_USER_ID as any,
      totalPoints: 150,
      qualifiedAt: new Date(),
      notificationSent: false,
      notificationSentAt: undefined,
      emailSent: false,
      emailSentAt: undefined,
      invitationSent: false,
      invitationSentAt: undefined,
      invitationToken: undefined,
      invitationRedeemed: false,
      invitationRedeemedAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  function createMockRegistration(overrides: Partial<FinalsRegistration> = {}): Partial<FinalsRegistration> {
    return {
      id: TEST_REGISTRATION_ID,
      user: TEST_USER_ID as any,
      season: TEST_SEASON_ID as any,
      division: 'Pro',
      competitionClass: 'SQL 1',
      registeredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  function createMockVote(overrides: Partial<FinalsVote> = {}): Partial<FinalsVote> {
    return {
      id: TEST_VOTE_ID,
      voter: TEST_USER_ID as any,
      category: 'Best Install',
      voteValue: 'Competitor A',
      details: undefined,
      createdAt: new Date(),
      ...overrides,
    };
  }

  function createMockProfile(overrides: Record<string, unknown> = {}): Partial<Profile> {
    return {
      id: TEST_USER_ID,
      email: 'test@example.com',
      meca_id: 1001,
      first_name: 'Test',
      last_name: 'User',
      full_name: 'Test User',
      ...overrides,
    } as any;
  }

  beforeEach(async () => {
    mockEm = createMockEntityManager();
    mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorldFinalsService,
        { provide: 'EntityManager', useValue: mockEm },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<WorldFinalsService>(WorldFinalsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // getCurrentSeasonQualifications
  // ============================================

  describe('getCurrentSeasonQualifications', () => {
    it('should return empty array when no current season exists', async () => {
      mockEm.findOne.mockResolvedValue(null);

      const result = await service.getCurrentSeasonQualifications();

      expect(result).toEqual([]);
      expect(mockEm.findOne).toHaveBeenCalledWith(Season, { isCurrent: true });
    });

    it('should return qualifications for the current season', async () => {
      const season = createMockSeason();
      const qualification = createMockQualification();

      // First call: findOne for Season (getCurrentSeasonQualifications)
      // Second call: findOne for Profile (inside getSeasonQualifications -> loadProfile)
      mockEm.findOne.mockResolvedValueOnce(season as any);

      // find for WorldFinalsQualification
      mockEm.find.mockResolvedValueOnce([qualification]);
      // find for Profile (loadProfiles)
      mockEm.find.mockResolvedValueOnce([createMockProfile()]);

      const result = await service.getCurrentSeasonQualifications();

      expect(result).toHaveLength(1);
      expect(mockEm.findOne).toHaveBeenCalledWith(Season, { isCurrent: true });
    });
  });

  // ============================================
  // getSeasonQualifications
  // ============================================

  describe('getSeasonQualifications', () => {
    it('should return qualifications ordered by class and points', async () => {
      const qual1 = createMockQualification({ competitionClass: 'SQL 1', totalPoints: 200 });
      const qual2 = createMockQualification({ id: 'qual_2', competitionClass: 'SQL 2', totalPoints: 150, user: 'user_2' as any });

      mockEm.find
        .mockResolvedValueOnce([qual1, qual2]) // qualifications
        .mockResolvedValueOnce([createMockProfile()]); // profiles

      const result = await service.getSeasonQualifications(TEST_SEASON_ID);

      expect(result).toHaveLength(2);
      expect(mockEm.find).toHaveBeenCalledWith(
        WorldFinalsQualification,
        { season: TEST_SEASON_ID },
        expect.objectContaining({
          populate: ['season'],
          orderBy: { competitionClass: 'ASC', totalPoints: 'DESC' },
        }),
      );
    });

    it('should return empty array when no qualifications exist', async () => {
      mockEm.find
        .mockResolvedValueOnce([]) // no qualifications
        .mockResolvedValueOnce([]); // no profiles (loadProfiles with empty array)

      const result = await service.getSeasonQualifications(TEST_SEASON_ID);

      expect(result).toEqual([]);
    });

    it('should attach user profile data to qualifications', async () => {
      const qual = createMockQualification();
      const profile = createMockProfile();

      // Add toJSON to the qualification mock
      (qual as any).toJSON = () => ({ ...qual });

      mockEm.find
        .mockResolvedValueOnce([qual])
        .mockResolvedValueOnce([profile]);

      const result = await service.getSeasonQualifications(TEST_SEASON_ID);

      expect(result).toHaveLength(1);
      expect(result[0].user).toEqual({
        id: TEST_USER_ID,
        email: 'test@example.com',
        meca_id: 1001,
        first_name: 'Test',
        last_name: 'User',
        full_name: 'Test User',
      });
    });
  });

  // ============================================
  // isQualified
  // ============================================

  describe('isQualified', () => {
    it('should return true when qualification exists', async () => {
      mockEm.findOne.mockResolvedValue(createMockQualification() as any);

      const result = await service.isQualified(1001, TEST_SEASON_ID);

      expect(result).toBe(true);
      expect(mockEm.findOne).toHaveBeenCalledWith(
        WorldFinalsQualification,
        { season: TEST_SEASON_ID, mecaId: 1001 },
      );
    });

    it('should return false when no qualification exists', async () => {
      mockEm.findOne.mockResolvedValue(null);

      const result = await service.isQualified(9999, TEST_SEASON_ID);

      expect(result).toBe(false);
    });

    it('should filter by competitionClass when provided', async () => {
      mockEm.findOne.mockResolvedValue(createMockQualification() as any);

      await service.isQualified(1001, TEST_SEASON_ID, 'SQL 1');

      expect(mockEm.findOne).toHaveBeenCalledWith(
        WorldFinalsQualification,
        { season: TEST_SEASON_ID, mecaId: 1001, competitionClass: 'SQL 1' },
      );
    });
  });

  // ============================================
  // getQualificationStatuses
  // ============================================

  describe('getQualificationStatuses', () => {
    it('should return a map of mecaId to qualified classes', async () => {
      const quals = [
        createMockQualification({ mecaId: 1001, competitionClass: 'SQL 1' }),
        createMockQualification({ mecaId: 1001, competitionClass: 'SQL 2' }),
        createMockQualification({ mecaId: 2002, competitionClass: 'SQ' }),
      ];
      mockEm.find.mockResolvedValue(quals as any);

      const result = await service.getQualificationStatuses([1001, 2002, 3003], TEST_SEASON_ID);

      expect(result.get(1001)).toEqual(['SQL 1', 'SQL 2']);
      expect(result.get(2002)).toEqual(['SQ']);
      expect(result.get(3003)).toEqual([]);
    });

    it('should return empty arrays for all mecaIds when no qualifications', async () => {
      mockEm.find.mockResolvedValue([]);

      const result = await service.getQualificationStatuses([1001, 2002], TEST_SEASON_ID);

      expect(result.get(1001)).toEqual([]);
      expect(result.get(2002)).toEqual([]);
    });
  });

  // ============================================
  // checkAndUpdateQualification
  // ============================================

  describe('checkAndUpdateQualification', () => {
    it('should return null when season does not exist', async () => {
      mockEm.findOne.mockResolvedValue(null);

      const result = await service.checkAndUpdateQualification(1001, 'Competitor', TEST_USER_ID, TEST_SEASON_ID, 'SQL 1');

      expect(result).toBeNull();
    });

    it('should return null when season has no qualification threshold', async () => {
      mockEm.findOne.mockResolvedValue(createMockSeason({ qualificationPointsThreshold: undefined as any }) as any);

      const result = await service.checkAndUpdateQualification(1001, 'Competitor', TEST_USER_ID, TEST_SEASON_ID, 'SQL 1');

      expect(result).toBeNull();
    });

    it('should return null when total points are below threshold', async () => {
      const season = createMockSeason({ qualificationPointsThreshold: 100 });
      mockEm.findOne.mockResolvedValueOnce(season as any); // find season
      mockEm.find.mockResolvedValueOnce([{ pointsEarned: 50 }] as any); // competition results below threshold

      const result = await service.checkAndUpdateQualification(1001, 'Competitor', TEST_USER_ID, TEST_SEASON_ID, 'SQL 1');

      expect(result).toBeNull();
    });

    it('should update existing qualification when already qualified', async () => {
      const season = createMockSeason({ qualificationPointsThreshold: 100 });
      const existingQual = createMockQualification({ totalPoints: 100 });

      // findOne: season, then existingQualification
      mockEm.findOne
        .mockResolvedValueOnce(season as any)
        .mockResolvedValueOnce(existingQual as any);

      // find: competition results (total = 150)
      mockEm.find.mockResolvedValueOnce([{ pointsEarned: 80 }, { pointsEarned: 70 }] as any);

      const result = await service.checkAndUpdateQualification(1001, 'Competitor', TEST_USER_ID, TEST_SEASON_ID, 'SQL 1');

      expect(result).toBeDefined();
      expect(result!.totalPoints).toBe(150);
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should create new qualification when points meet threshold and no existing record', async () => {
      const season = createMockSeason({ qualificationPointsThreshold: 100 });

      // findOne: season, then null (no existing qualification)
      mockEm.findOne
        .mockResolvedValueOnce(season as any)
        .mockResolvedValueOnce(null); // no existing qualification

      // find: competition results (total = 120)
      mockEm.find.mockResolvedValueOnce([{ pointsEarned: 60 }, { pointsEarned: 60 }] as any);

      // findOne for profile in sendQualificationEmail
      mockEm.findOne.mockResolvedValueOnce(createMockProfile() as any);

      const newQual = createMockQualification({ totalPoints: 120 });
      mockEm.create.mockReturnValue(newQual as any);

      const result = await service.checkAndUpdateQualification(1001, 'Competitor', TEST_USER_ID, TEST_SEASON_ID, 'SQL 1');

      expect(result).toBeDefined();
      expect(mockEm.persist).toHaveBeenCalled();
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should send notification and email when creating new qualification with userId', async () => {
      const season = createMockSeason({ qualificationPointsThreshold: 100 });

      mockEm.findOne
        .mockResolvedValueOnce(season as any) // season
        .mockResolvedValueOnce(null) // no existing qualification
        .mockResolvedValueOnce(createMockProfile() as any); // profile for email

      mockEm.find.mockResolvedValueOnce([{ pointsEarned: 120 }] as any);

      const newQual = createMockQualification({ totalPoints: 120, user: TEST_USER_ID as any });
      mockEm.create.mockReturnValue(newQual as any);

      await service.checkAndUpdateQualification(1001, 'Competitor', TEST_USER_ID, TEST_SEASON_ID, 'SQL 1');

      // Should persist both the qualification and the notification
      expect(mockEm.persist).toHaveBeenCalled();
      // Should attempt to send email
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });

    it('should skip notification when no userId is provided', async () => {
      const season = createMockSeason({ qualificationPointsThreshold: 100 });

      mockEm.findOne
        .mockResolvedValueOnce(season as any) // season
        .mockResolvedValueOnce(null); // no existing qualification

      mockEm.find.mockResolvedValueOnce([{ pointsEarned: 120 }] as any);

      const newQual = createMockQualification({ totalPoints: 120, user: undefined });
      mockEm.create.mockReturnValue(newQual as any);

      await service.checkAndUpdateQualification(1001, 'Competitor', null, TEST_SEASON_ID, 'SQL 1');

      // Should still persist qualification
      expect(mockEm.persist).toHaveBeenCalled();
      // Email should not be sent (no user profile to look up)
      // The notification create should NOT be called for the notification entity
      // (only qualification is created, not notification)
    });
  });

  // ============================================
  // sendInvitation
  // ============================================

  describe('sendInvitation', () => {
    it('should throw NotFoundException when qualification not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.sendInvitation('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should generate invitation token and send email', async () => {
      const qual = createMockQualification({ user: TEST_USER_ID as any });
      const profile = createMockProfile();

      mockEm.findOne
        .mockResolvedValueOnce(qual as any) // find qualification
        .mockResolvedValueOnce(profile as any); // find profile for email

      const result = await service.sendInvitation(TEST_QUALIFICATION_ID);

      expect(result).toBeDefined();
      expect(result.invitationSent).toBe(true);
      expect(result.invitationToken).toBeDefined();
      expect(result.invitationSentAt).toBeInstanceOf(Date);
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should not fail when user has no email', async () => {
      const qual = createMockQualification({ user: undefined });

      mockEm.findOne.mockResolvedValueOnce(qual as any); // qualification found

      const result = await service.sendInvitation(TEST_QUALIFICATION_ID);

      expect(result.invitationSent).toBe(true);
      // Email should not have been sent since no profile was found
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // sendAllPendingInvitations
  // ============================================

  describe('sendAllPendingInvitations', () => {
    it('should send invitations to all pending qualifications', async () => {
      const pendingQuals = [
        createMockQualification({ id: 'q1', invitationSent: false }),
        createMockQualification({ id: 'q2', invitationSent: false }),
      ];

      // find pending qualifications
      mockEm.find.mockResolvedValueOnce(pendingQuals as any);

      // For each sendInvitation call:
      // q1: findOne qualification, findOne profile
      mockEm.findOne
        .mockResolvedValueOnce({ ...pendingQuals[0] } as any)
        .mockResolvedValueOnce(createMockProfile() as any)
        // q2: findOne qualification, findOne profile
        .mockResolvedValueOnce({ ...pendingQuals[1] } as any)
        .mockResolvedValueOnce(createMockProfile() as any);

      const result = await service.sendAllPendingInvitations(TEST_SEASON_ID);

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should count failures when individual invitations fail', async () => {
      const pendingQuals = [
        createMockQualification({ id: 'q1', invitationSent: false }),
        createMockQualification({ id: 'q2', invitationSent: false }),
      ];

      mockEm.find.mockResolvedValueOnce(pendingQuals as any);

      // First sendInvitation succeeds
      mockEm.findOne
        .mockResolvedValueOnce({ ...pendingQuals[0] } as any)
        .mockResolvedValueOnce(createMockProfile() as any);

      // Second sendInvitation fails (qualification not found)
      mockEm.findOne.mockResolvedValueOnce(null);

      const result = await service.sendAllPendingInvitations(TEST_SEASON_ID);

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should return zero counts when no pending qualifications', async () => {
      mockEm.find.mockResolvedValueOnce([]);

      const result = await service.sendAllPendingInvitations(TEST_SEASON_ID);

      expect(result).toEqual({ sent: 0, failed: 0 });
    });
  });

  // ============================================
  // redeemInvitation
  // ============================================

  describe('redeemInvitation', () => {
    it('should return null when token is invalid', async () => {
      mockEm.findOne.mockResolvedValue(null);

      const result = await service.redeemInvitation('invalid_token');

      expect(result).toBeNull();
    });

    it('should return null when token is already redeemed', async () => {
      // findOne returns null because query includes invitationRedeemed: false
      mockEm.findOne.mockResolvedValue(null);

      const result = await service.redeemInvitation('already_redeemed_token');

      expect(result).toBeNull();
      expect(mockEm.findOne).toHaveBeenCalledWith(
        WorldFinalsQualification,
        { invitationToken: 'already_redeemed_token', invitationRedeemed: false },
        expect.anything(),
      );
    });

    it('should mark invitation as redeemed and return qualification', async () => {
      const qual = createMockQualification({
        invitationToken: 'valid_token',
        invitationRedeemed: false,
      });
      mockEm.findOne.mockResolvedValue(qual as any);

      const result = await service.redeemInvitation('valid_token');

      expect(result).toBeDefined();
      expect(result!.invitationRedeemed).toBe(true);
      expect(result!.invitationRedeemedAt).toBeInstanceOf(Date);
      expect(mockEm.flush).toHaveBeenCalled();
    });
  });

  // ============================================
  // getQualificationStats
  // ============================================

  describe('getQualificationStats', () => {
    it('should return zero stats when no season found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      const result = await service.getQualificationStats();

      expect(result).toEqual({
        totalQualifications: 0,
        uniqueCompetitors: 0,
        classesByQualifications: [],
        notificationsSent: 0,
        emailsSent: 0,
        invitationsSent: 0,
        invitationsRedeemed: 0,
        qualificationThreshold: null,
      });
    });

    it('should return stats for specified season', async () => {
      const season = createMockSeason({ qualificationPointsThreshold: 100 });
      const quals = [
        createMockQualification({ mecaId: 1001, competitionClass: 'SQL 1', notificationSent: true, emailSent: true, invitationSent: true, invitationRedeemed: true }),
        createMockQualification({ mecaId: 1001, competitionClass: 'SQL 2', notificationSent: true, emailSent: false, invitationSent: false, invitationRedeemed: false }),
        createMockQualification({ mecaId: 2002, competitionClass: 'SQL 1', notificationSent: false, emailSent: false, invitationSent: false, invitationRedeemed: false }),
      ];

      mockEm.findOne.mockResolvedValue(season as any);
      mockEm.find.mockResolvedValue(quals as any);

      const result = await service.getQualificationStats(TEST_SEASON_ID);

      expect(result.totalQualifications).toBe(3);
      expect(result.uniqueCompetitors).toBe(2);
      expect(result.classesByQualifications).toHaveLength(2);
      expect(result.notificationsSent).toBe(2);
      expect(result.emailsSent).toBe(1);
      expect(result.invitationsSent).toBe(1);
      expect(result.invitationsRedeemed).toBe(1);
      expect(result.qualificationThreshold).toBe(100);
    });

    it('should use current season when no seasonId is provided', async () => {
      const season = createMockSeason();
      mockEm.findOne.mockResolvedValue(season as any);
      mockEm.find.mockResolvedValue([]);

      await service.getQualificationStats();

      expect(mockEm.findOne).toHaveBeenCalledWith(Season, { isCurrent: true });
    });

    it('should look up season by id when seasonId is provided', async () => {
      const season = createMockSeason();
      mockEm.findOne.mockResolvedValue(season as any);
      mockEm.find.mockResolvedValue([]);

      await service.getQualificationStats('specific_season_id');

      expect(mockEm.findOne).toHaveBeenCalledWith(Season, { id: 'specific_season_id' });
    });
  });

  // ============================================
  // recalculateSeasonQualifications
  // ============================================

  describe('recalculateSeasonQualifications', () => {
    it('should return zero counts when season not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      const result = await service.recalculateSeasonQualifications(TEST_SEASON_ID);

      expect(result).toEqual({ newQualifications: 0, updatedQualifications: 0 });
    });

    it('should return zero counts when season has no threshold', async () => {
      mockEm.findOne.mockResolvedValue(createMockSeason({ qualificationPointsThreshold: undefined as any }) as any);

      const result = await service.recalculateSeasonQualifications(TEST_SEASON_ID);

      expect(result).toEqual({ newQualifications: 0, updatedQualifications: 0 });
    });

    it('should skip guest MECA IDs (999999 and 0)', async () => {
      const season = createMockSeason({ qualificationPointsThreshold: 50 });
      const results = [
        { mecaId: '999999', competitionClass: 'SQL 1', pointsEarned: 100, competitorName: 'Guest', competitorId: null },
        { mecaId: '0', competitionClass: 'SQL 1', pointsEarned: 100, competitorName: 'Guest2', competitorId: null },
      ];

      mockEm.findOne.mockResolvedValueOnce(season as any); // season
      mockEm.find.mockResolvedValueOnce(results as any); // competition results

      const result = await service.recalculateSeasonQualifications(TEST_SEASON_ID);

      expect(result).toEqual({ newQualifications: 0, updatedQualifications: 0 });
    });

    it('should create new qualification when competitor crosses threshold', async () => {
      const season = createMockSeason({ qualificationPointsThreshold: 100 });
      const competitionResults = [
        { mecaId: '1001', competitionClass: 'SQL 1', pointsEarned: 60, competitorName: 'Test', competitorId: TEST_USER_ID },
        { mecaId: '1001', competitionClass: 'SQL 1', pointsEarned: 50, competitorName: 'Test', competitorId: TEST_USER_ID },
      ];

      mockEm.findOne
        .mockResolvedValueOnce(season as any) // season
        .mockResolvedValueOnce(null) // no existing qualification for 1001:SQL 1
        .mockResolvedValueOnce(createMockProfile() as any); // profile for email

      mockEm.find.mockResolvedValueOnce(competitionResults as any);

      const newQual = createMockQualification({ totalPoints: 110 });
      mockEm.create.mockReturnValue(newQual as any);

      const result = await service.recalculateSeasonQualifications(TEST_SEASON_ID);

      expect(result.newQualifications).toBe(1);
      expect(result.updatedQualifications).toBe(0);
      expect(mockEm.persist).toHaveBeenCalled();
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should update existing qualification when points changed', async () => {
      const season = createMockSeason({ qualificationPointsThreshold: 100 });
      const competitionResults = [
        { mecaId: '1001', competitionClass: 'SQL 1', pointsEarned: 120, competitorName: 'Test', competitorId: TEST_USER_ID },
      ];
      const existingQual = createMockQualification({ totalPoints: 100 });

      mockEm.findOne
        .mockResolvedValueOnce(season as any) // season
        .mockResolvedValueOnce(existingQual as any); // existing qualification

      mockEm.find.mockResolvedValueOnce(competitionResults as any);

      const result = await service.recalculateSeasonQualifications(TEST_SEASON_ID);

      expect(result.newQualifications).toBe(0);
      expect(result.updatedQualifications).toBe(1);
      expect(existingQual.totalPoints).toBe(120);
    });

    it('should not count as updated when points are the same', async () => {
      const season = createMockSeason({ qualificationPointsThreshold: 100 });
      const competitionResults = [
        { mecaId: '1001', competitionClass: 'SQL 1', pointsEarned: 150, competitorName: 'Test', competitorId: TEST_USER_ID },
      ];
      const existingQual = createMockQualification({ totalPoints: 150 });

      mockEm.findOne
        .mockResolvedValueOnce(season as any)
        .mockResolvedValueOnce(existingQual as any);

      mockEm.find.mockResolvedValueOnce(competitionResults as any);

      const result = await service.recalculateSeasonQualifications(TEST_SEASON_ID);

      expect(result.updatedQualifications).toBe(0);
    });
  });

  // ============================================
  // REGISTRATION METHODS
  // ============================================

  describe('createRegistration', () => {
    it('should throw NotFoundException when season does not exist', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(
        service.createRegistration(TEST_USER_ID, { seasonId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when duplicate registration exists', async () => {
      const season = createMockSeason();
      const existingReg = createMockRegistration();

      mockEm.findOne
        .mockResolvedValueOnce(season as any) // season exists
        .mockResolvedValueOnce(existingReg as any); // duplicate found

      await expect(
        service.createRegistration(TEST_USER_ID, { seasonId: TEST_SEASON_ID, competitionClass: 'SQL 1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create registration successfully', async () => {
      const season = createMockSeason();
      const newReg = createMockRegistration();

      mockEm.findOne
        .mockResolvedValueOnce(season as any) // season exists
        .mockResolvedValueOnce(null); // no duplicate

      mockEm.create.mockReturnValue(newReg as any);

      const result = await service.createRegistration(TEST_USER_ID, {
        seasonId: TEST_SEASON_ID,
        division: 'Pro',
        competitionClass: 'SQL 1',
      });

      expect(result).toBeDefined();
      expect(mockEm.persistAndFlush).toHaveBeenCalledWith(newReg);
    });
  });

  describe('getMyRegistration', () => {
    it('should return registration for user and season', async () => {
      const reg = createMockRegistration();
      mockEm.findOne.mockResolvedValue(reg as any);

      const result = await service.getMyRegistration(TEST_USER_ID, TEST_SEASON_ID);

      expect(result).toBeDefined();
      expect(mockEm.findOne).toHaveBeenCalledWith(
        FinalsRegistration,
        { user: TEST_USER_ID, season: TEST_SEASON_ID },
        expect.objectContaining({ populate: ['season'] }),
      );
    });

    it('should return null when no registration exists', async () => {
      mockEm.findOne.mockResolvedValue(null);

      const result = await service.getMyRegistration(TEST_USER_ID, TEST_SEASON_ID);

      expect(result).toBeNull();
    });
  });

  describe('getMyRegistrations', () => {
    it('should return all registrations for a user', async () => {
      const regs = [createMockRegistration(), createMockRegistration({ id: 'reg_2' })];
      mockEm.find.mockResolvedValue(regs as any);

      const result = await service.getMyRegistrations(TEST_USER_ID);

      expect(result).toHaveLength(2);
      expect(mockEm.find).toHaveBeenCalledWith(
        FinalsRegistration,
        { user: TEST_USER_ID },
        expect.objectContaining({ populate: ['season'], orderBy: { registeredAt: 'DESC' } }),
      );
    });

    it('should return empty array when user has no registrations', async () => {
      mockEm.find.mockResolvedValue([]);

      const result = await service.getMyRegistrations(TEST_USER_ID);

      expect(result).toEqual([]);
    });
  });

  describe('updateRegistration', () => {
    it('should throw NotFoundException when registration not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(
        service.updateRegistration('nonexistent', TEST_USER_ID, { division: 'Amateur' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own registration', async () => {
      const reg = createMockRegistration({ user: 'other_user' as any });
      mockEm.findOne.mockResolvedValue(reg as any);

      await expect(
        service.updateRegistration(TEST_REGISTRATION_ID, TEST_USER_ID, { division: 'Amateur' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update registration successfully', async () => {
      const reg = createMockRegistration({ user: TEST_USER_ID as any });
      mockEm.findOne.mockResolvedValue(reg as any);

      const result = await service.updateRegistration(TEST_REGISTRATION_ID, TEST_USER_ID, {
        division: 'Amateur',
        competitionClass: 'SQ',
      });

      expect(result).toBeDefined();
      expect(mockEm.assign).toHaveBeenCalledWith(reg, {
        division: 'Amateur',
        competitionClass: 'SQ',
      });
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('should keep existing values when update fields are undefined', async () => {
      const reg = createMockRegistration({ user: TEST_USER_ID as any, division: 'Pro', competitionClass: 'SQL 1' });
      mockEm.findOne.mockResolvedValue(reg as any);

      await service.updateRegistration(TEST_REGISTRATION_ID, TEST_USER_ID, {});

      expect(mockEm.assign).toHaveBeenCalledWith(reg, {
        division: 'Pro',
        competitionClass: 'SQL 1',
      });
    });
  });

  describe('deleteRegistration', () => {
    it('should throw NotFoundException when registration not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(
        service.deleteRegistration('nonexistent', TEST_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own registration', async () => {
      const reg = createMockRegistration({ user: 'other_user' as any });
      mockEm.findOne.mockResolvedValue(reg as any);

      await expect(
        service.deleteRegistration(TEST_REGISTRATION_ID, TEST_USER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delete registration successfully', async () => {
      const reg = createMockRegistration({ user: TEST_USER_ID as any });
      mockEm.findOne.mockResolvedValue(reg as any);

      await service.deleteRegistration(TEST_REGISTRATION_ID, TEST_USER_ID);

      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(reg);
    });
  });

  describe('getRegistrationsBySeasonAndClass', () => {
    it('should return registrations for a season', async () => {
      const regs = [createMockRegistration()];

      // Add toJSON to mock
      (regs[0] as any).toJSON = () => ({ ...regs[0] });

      mockEm.find
        .mockResolvedValueOnce(regs as any) // registrations
        .mockResolvedValueOnce([createMockProfile()]); // profiles

      const result = await service.getRegistrationsBySeasonAndClass(TEST_SEASON_ID);

      expect(result).toHaveLength(1);
      expect(mockEm.find).toHaveBeenCalledWith(
        FinalsRegistration,
        { season: TEST_SEASON_ID },
        expect.objectContaining({ populate: ['season'], orderBy: { registeredAt: 'ASC' } }),
      );
    });

    it('should filter by competitionClass when provided', async () => {
      mockEm.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getRegistrationsBySeasonAndClass(TEST_SEASON_ID, 'SQL 1');

      expect(mockEm.find).toHaveBeenCalledWith(
        FinalsRegistration,
        { season: TEST_SEASON_ID, competitionClass: 'SQL 1' },
        expect.anything(),
      );
    });
  });

  describe('getRegistrationStats', () => {
    it('should return stats grouped by division and class', async () => {
      const regs = [
        createMockRegistration({ division: 'Pro', competitionClass: 'SQL 1' }),
        createMockRegistration({ division: 'Pro', competitionClass: 'SQL 2' }),
        createMockRegistration({ division: 'Amateur', competitionClass: 'SQL 1' }),
      ];
      mockEm.find.mockResolvedValue(regs as any);

      const result = await service.getRegistrationStats(TEST_SEASON_ID);

      expect(result.totalRegistrations).toBe(3);
      expect(result.byDivision).toHaveLength(2);
      expect(result.byClass).toHaveLength(2);

      // Pro should be first (count 2)
      expect(result.byDivision[0]).toEqual({ division: 'Pro', count: 2 });
      expect(result.byDivision[1]).toEqual({ division: 'Amateur', count: 1 });

      // SQL 1 should be first (count 2)
      expect(result.byClass[0]).toEqual({ competitionClass: 'SQL 1', count: 2 });
      expect(result.byClass[1]).toEqual({ competitionClass: 'SQL 2', count: 1 });
    });

    it('should return empty stats when no registrations', async () => {
      mockEm.find.mockResolvedValue([]);

      const result = await service.getRegistrationStats(TEST_SEASON_ID);

      expect(result).toEqual({
        totalRegistrations: 0,
        byDivision: [],
        byClass: [],
      });
    });
  });

  // ============================================
  // VOTING METHODS
  // ============================================

  describe('submitVote', () => {
    it('should throw BadRequestException when user has already voted in category', async () => {
      const existingVote = createMockVote();
      mockEm.findOne.mockResolvedValue(existingVote as any);

      await expect(
        service.submitVote(TEST_USER_ID, { category: 'Best Install', voteValue: 'Competitor B' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create vote successfully', async () => {
      mockEm.findOne.mockResolvedValue(null); // no existing vote

      const newVote = createMockVote();
      mockEm.create.mockReturnValue(newVote as any);

      const result = await service.submitVote(TEST_USER_ID, {
        category: 'Best Install',
        voteValue: 'Competitor A',
      });

      expect(result).toBeDefined();
      expect(mockEm.persistAndFlush).toHaveBeenCalledWith(newVote);
    });

    it('should include details when provided', async () => {
      mockEm.findOne.mockResolvedValue(null);

      const newVote = createMockVote({ details: { reason: 'Great build' } });
      mockEm.create.mockReturnValue(newVote as any);

      const result = await service.submitVote(TEST_USER_ID, {
        category: 'Best Install',
        voteValue: 'Competitor A',
        details: { reason: 'Great build' },
      });

      expect(result.details).toEqual({ reason: 'Great build' });
    });
  });

  describe('hasUserVoted', () => {
    it('should return true when vote exists', async () => {
      mockEm.findOne.mockResolvedValue(createMockVote() as any);

      const result = await service.hasUserVoted(TEST_USER_ID, 'Best Install');

      expect(result).toBe(true);
      expect(mockEm.findOne).toHaveBeenCalledWith(FinalsVote, {
        voter: TEST_USER_ID,
        category: 'Best Install',
      });
    });

    it('should return false when no vote exists', async () => {
      mockEm.findOne.mockResolvedValue(null);

      const result = await service.hasUserVoted(TEST_USER_ID, 'Best Install');

      expect(result).toBe(false);
    });
  });

  describe('getMyVotes', () => {
    it('should return all votes for a user', async () => {
      const votes = [
        createMockVote({ category: 'Best Install' }),
        createMockVote({ id: 'vote_2', category: 'Best Sound' }),
      ];
      mockEm.find.mockResolvedValue(votes as any);

      const result = await service.getMyVotes(TEST_USER_ID);

      expect(result).toHaveLength(2);
      expect(mockEm.find).toHaveBeenCalledWith(
        FinalsVote,
        { voter: TEST_USER_ID },
        expect.objectContaining({ orderBy: { createdAt: 'DESC' } }),
      );
    });

    it('should return empty array when user has no votes', async () => {
      mockEm.find.mockResolvedValue([]);

      const result = await service.getMyVotes(TEST_USER_ID);

      expect(result).toEqual([]);
    });
  });

  describe('getVotesByCategory', () => {
    it('should return votes with voter profiles attached', async () => {
      const vote = createMockVote();
      (vote as any).toJSON = () => ({ ...vote });

      mockEm.find
        .mockResolvedValueOnce([vote]) // votes
        .mockResolvedValueOnce([createMockProfile()]); // voter profiles

      const result = await service.getVotesByCategory('Best Install');

      expect(result).toHaveLength(1);
      expect(result[0].voter).toEqual({
        id: TEST_USER_ID,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        full_name: 'Test User',
      });
    });

    it('should return empty array when no votes in category', async () => {
      mockEm.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getVotesByCategory('Nonexistent Category');

      expect(result).toEqual([]);
    });
  });

  describe('getVoteSummary', () => {
    it('should return summary with total votes and top choices per category', async () => {
      const votes = [
        createMockVote({ category: 'Best Install', voteValue: 'Competitor A' }),
        createMockVote({ category: 'Best Install', voteValue: 'Competitor A' }),
        createMockVote({ category: 'Best Install', voteValue: 'Competitor B' }),
        createMockVote({ category: 'Best Sound', voteValue: 'Competitor C' }),
      ];
      mockEm.find.mockResolvedValue(votes as any);

      const result = await service.getVoteSummary();

      expect(result.totalVotes).toBe(4);
      expect(result.byCategory).toHaveLength(2);

      // Best Install should be first (3 votes)
      const bestInstall = result.byCategory.find(c => c.category === 'Best Install');
      expect(bestInstall).toBeDefined();
      expect(bestInstall!.count).toBe(3);
      expect(bestInstall!.topChoice).toBe('Competitor A');

      const bestSound = result.byCategory.find(c => c.category === 'Best Sound');
      expect(bestSound).toBeDefined();
      expect(bestSound!.count).toBe(1);
      expect(bestSound!.topChoice).toBe('Competitor C');
    });

    it('should return empty summary when no votes exist', async () => {
      mockEm.find.mockResolvedValue([]);

      const result = await service.getVoteSummary();

      expect(result).toEqual({ totalVotes: 0, byCategory: [] });
    });
  });
});
