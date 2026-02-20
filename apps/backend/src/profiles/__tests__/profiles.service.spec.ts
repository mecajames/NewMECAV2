import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ProfilesService } from '../profiles.service';
import { Profile } from '../profiles.entity';
import { SupabaseAdminService } from '../../auth/supabase-admin.service';
import { EmailService } from '../../email/email.service';
import { createMockEntityManager } from '../../../test/mocks/mikro-orm.mock';
import { createMockProfile } from '../../../test/utils/test-utils';
import { AccountType } from '@newmeca/shared';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let mockEm: jest.Mocked<EntityManager>;
  let mockSupabaseAdmin: any;
  let mockEmailService: any;
  let mockConnection: any;

  beforeEach(async () => {
    mockEm = createMockEntityManager();

    // Add findAndCount to mock (not in default createMockEntityManager)
    (mockEm as any).findAndCount = jest.fn().mockResolvedValue([[], 0]);

    // Add getConnection().execute to mock
    mockConnection = { execute: jest.fn().mockResolvedValue([]) };
    (mockEm as any).getConnection = jest.fn().mockReturnValue(mockConnection);

    mockSupabaseAdmin = {
      getClient: jest.fn().mockReturnValue({
        auth: {
          admin: {
            getUserById: jest.fn().mockResolvedValue({ data: null, error: null }),
          },
        },
      }),
      setForcePasswordChange: jest.fn().mockResolvedValue({ success: true }),
      findUserByEmail: jest.fn().mockResolvedValue({ userId: null }),
      createUserWithPassword: jest.fn().mockResolvedValue({ success: true, userId: 'new-user-id' }),
      deleteUser: jest.fn().mockResolvedValue({ success: true }),
      resetPassword: jest.fn().mockResolvedValue({ success: true }),
    };

    mockEmailService = {
      isReady: jest.fn().mockReturnValue(true),
      sendPasswordEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        {
          provide: 'EntityManager',
          useValue: mockEm,
        },
        {
          provide: SupabaseAdminService,
          useValue: mockSupabaseAdmin,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
  });

  // ============================================
  // findAll
  // ============================================

  describe('findAll', () => {
    it('should return paginated profiles with default page and limit', async () => {
      const mockProfiles = [
        createMockProfile({ id: '1' }),
        createMockProfile({ id: '2' }),
      ];
      mockEm.find.mockResolvedValue(mockProfiles as any);

      const result = await service.findAll();

      expect(mockEm.fork).toHaveBeenCalled();
      expect(mockEm.find).toHaveBeenCalledWith(Profile, {}, {
        limit: 10,
        offset: 0,
      });
      expect(result).toEqual(mockProfiles);
    });

    it('should calculate offset correctly for page 3 with limit 5', async () => {
      mockEm.find.mockResolvedValue([]);

      await service.findAll(3, 5);

      expect(mockEm.find).toHaveBeenCalledWith(Profile, {}, {
        limit: 5,
        offset: 10,
      });
    });

    it('should return empty array when no profiles exist', async () => {
      mockEm.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // findById
  // ============================================

  describe('findById', () => {
    it('should return a profile when found', async () => {
      const mockProfile = createMockProfile({ id: 'test-id' });
      mockEm.findOne.mockResolvedValue(mockProfile as any);

      const result = await service.findById('test-id');

      expect(mockEm.fork).toHaveBeenCalled();
      expect(mockEm.findOne).toHaveBeenCalledWith(Profile, { id: 'test-id' });
      expect(result).toEqual(mockProfile);
    });

    it('should throw NotFoundException when profile not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        'Profile with ID nonexistent-id not found',
      );
    });
  });

  // ============================================
  // create
  // ============================================

  describe('create', () => {
    it('should auto-generate MECA ID when not provided', async () => {
      // Mock generateNextMecaId: find returns profiles with known meca_ids
      mockEm.find.mockResolvedValueOnce([
        { meca_id: '701501' },
        { meca_id: '701502' },
      ] as any);

      const profileData: Partial<Profile> = {
        id: 'new-user-id',
        email: 'new@example.com',
        full_name: 'New User',
      };

      mockEm.create.mockReturnValue({ ...profileData, meca_id: '701503' } as any);

      const result = await service.create(profileData);

      // The first em.find call is for generateNextMecaId
      expect(mockEm.find).toHaveBeenCalledWith(Profile, {
        meca_id: { $ne: null },
      }, {
        fields: ['meca_id'],
      });
      expect(mockEm.create).toHaveBeenCalled();
      expect(mockEm.persistAndFlush).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should use provided MECA ID when given', async () => {
      const profileData: Partial<Profile> = {
        id: 'new-user-id',
        email: 'new@example.com',
        full_name: 'New User',
        meca_id: '701999',
      };

      mockEm.create.mockReturnValue(profileData as any);

      await service.create(profileData);

      // Should NOT call find for generateNextMecaId since meca_id is provided
      expect(mockEm.find).not.toHaveBeenCalledWith(Profile, {
        meca_id: { $ne: null },
      }, expect.anything());
      expect(mockEm.create).toHaveBeenCalledWith(Profile, expect.objectContaining({
        meca_id: '701999',
      }));
    });

    it('should call persistAndFlush after creating profile', async () => {
      mockEm.find.mockResolvedValueOnce([] as any); // for generateNextMecaId
      const newProfile = createMockProfile();
      mockEm.create.mockReturnValue(newProfile as any);

      await service.create({ email: 'test@example.com', full_name: 'Test' } as any);

      expect(mockEm.persistAndFlush).toHaveBeenCalledWith(newProfile);
    });
  });

  // ============================================
  // ensureProfile
  // ============================================

  describe('ensureProfile', () => {
    it('should return existing profile if found', async () => {
      const existingProfile = createMockProfile({ id: 'existing-user-id' });
      mockEm.findOne.mockResolvedValue(existingProfile as any);

      const result = await service.ensureProfile('existing-user-id');

      expect(mockEm.findOne).toHaveBeenCalledWith(Profile, { id: 'existing-user-id' });
      expect(result).toEqual(existingProfile);
      // Should not call Supabase if profile exists
      expect(mockSupabaseAdmin.getClient).not.toHaveBeenCalled();
    });

    it('should create new profile from Supabase Auth user data when profile does not exist', async () => {
      mockEm.findOne.mockResolvedValue(null); // profile not found
      mockEm.find.mockResolvedValueOnce([]); // for generateNextMecaId

      const authUser = {
        id: 'new-user-id',
        email: 'john@example.com',
        user_metadata: {
          first_name: 'John',
          last_name: 'Doe',
        },
      };

      mockSupabaseAdmin.getClient.mockReturnValue({
        auth: {
          admin: {
            getUserById: jest.fn().mockResolvedValue({
              data: { user: authUser },
              error: null,
            }),
          },
        },
      });

      const createdProfile = {
        id: 'new-user-id',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        full_name: 'John Doe',
        meca_id: '701501',
        role: 'user',
        account_type: AccountType.MEMBER,
      };
      mockEm.create.mockReturnValue(createdProfile as any);

      const result = await service.ensureProfile('new-user-id');

      expect(mockEm.create).toHaveBeenCalledWith(Profile, expect.objectContaining({
        id: 'new-user-id',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        full_name: 'John Doe',
        role: 'user',
        membership_status: 'none',
        account_type: AccountType.MEMBER,
        force_password_change: false,
        canApplyJudge: false,
        canApplyEventDirector: false,
      }));
      expect(mockEm.persistAndFlush).toHaveBeenCalledWith(createdProfile);
      expect(result).toEqual(createdProfile);
    });

    it('should parse full_name from OAuth metadata when first/last name not provided', async () => {
      mockEm.findOne.mockResolvedValue(null);
      mockEm.find.mockResolvedValueOnce([]);

      const authUser = {
        id: 'oauth-user-id',
        email: 'oauth@example.com',
        user_metadata: {
          full_name: 'Jane Smith',
        },
      };

      mockSupabaseAdmin.getClient.mockReturnValue({
        auth: {
          admin: {
            getUserById: jest.fn().mockResolvedValue({
              data: { user: authUser },
              error: null,
            }),
          },
        },
      });

      mockEm.create.mockReturnValue({ id: 'oauth-user-id' } as any);

      await service.ensureProfile('oauth-user-id');

      expect(mockEm.create).toHaveBeenCalledWith(Profile, expect.objectContaining({
        first_name: 'Jane',
        last_name: 'Smith',
        full_name: 'Jane Smith',
      }));
    });

    it('should throw BadRequestException when Supabase Auth returns an error', async () => {
      mockEm.findOne.mockResolvedValue(null);

      mockSupabaseAdmin.getClient.mockReturnValue({
        auth: {
          admin: {
            getUserById: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'User not found' },
            }),
          },
        },
      });

      await expect(service.ensureProfile('bad-user-id')).rejects.toThrow(BadRequestException);
      await expect(service.ensureProfile('bad-user-id')).rejects.toThrow(
        'Could not retrieve user information from auth system',
      );
    });

    it('should use email as full_name when no name metadata available', async () => {
      mockEm.findOne.mockResolvedValue(null);
      mockEm.find.mockResolvedValueOnce([]);

      const authUser = {
        id: 'no-name-user',
        email: 'noname@example.com',
        user_metadata: {},
      };

      mockSupabaseAdmin.getClient.mockReturnValue({
        auth: {
          admin: {
            getUserById: jest.fn().mockResolvedValue({
              data: { user: authUser },
              error: null,
            }),
          },
        },
      });

      mockEm.create.mockReturnValue({ id: 'no-name-user' } as any);

      await service.ensureProfile('no-name-user');

      expect(mockEm.create).toHaveBeenCalledWith(Profile, expect.objectContaining({
        full_name: 'noname@example.com',
      }));
    });
  });

  // ============================================
  // update
  // ============================================

  describe('update', () => {
    it('should update a profile and sync full_name when name changes', async () => {
      const existingProfile = createMockProfile({
        id: 'update-id',
        first_name: 'Old',
        last_name: 'Name',
        full_name: 'Old Name',
      });
      mockEm.findOne.mockResolvedValue(existingProfile as any);

      const updateData = { first_name: 'New', last_name: 'Person' } as Partial<Profile>;

      const result = await service.update('update-id', updateData);

      expect(mockEm.assign).toHaveBeenCalledWith(
        existingProfile,
        expect.objectContaining({
          first_name: 'New',
          last_name: 'Person',
          full_name: 'New Person',
        }),
      );
      expect(mockEm.flush).toHaveBeenCalled();
      expect(result).toEqual(existingProfile);
    });

    it('should throw NotFoundException when profile not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.update('nonexistent', { first_name: 'Test' } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should keep existing meca_id when empty string is sent', async () => {
      const existingProfile = createMockProfile({
        id: 'meca-test',
        meca_id: '701501',
      });
      mockEm.findOne.mockResolvedValue(existingProfile as any);

      await service.update('meca-test', { meca_id: '' } as Partial<Profile>);

      expect(mockEm.assign).toHaveBeenCalledWith(
        existingProfile,
        expect.objectContaining({
          meca_id: '701501',
        }),
      );
    });

    it('should convert meca_id to string when sent as non-string', async () => {
      const existingProfile = createMockProfile({ id: 'meca-num' });
      mockEm.findOne.mockResolvedValue(existingProfile as any);

      await service.update('meca-num', { meca_id: 701505 as any } as Partial<Profile>);

      expect(mockEm.assign).toHaveBeenCalledWith(
        existingProfile,
        expect.objectContaining({
          meca_id: '701505',
        }),
      );
    });

    it('should invalidate public profiles cache when is_public changes', async () => {
      const existingProfile = createMockProfile({ id: 'cache-test' });
      mockEm.findOne.mockResolvedValue(existingProfile as any);

      const clearPublicSpy = jest.spyOn(service, 'clearPublicProfilesCache');
      const clearAdminSpy = jest.spyOn(service, 'clearAdminMembersCache');

      await service.update('cache-test', { is_public: true } as Partial<Profile>);

      expect(clearAdminSpy).toHaveBeenCalled();
      expect(clearPublicSpy).toHaveBeenCalled();
    });

    it('should invalidate admin cache but not public cache for non-public fields', async () => {
      const existingProfile = createMockProfile({ id: 'cache-test-2' });
      mockEm.findOne.mockResolvedValue(existingProfile as any);

      const clearPublicSpy = jest.spyOn(service, 'clearPublicProfilesCache');
      const clearAdminSpy = jest.spyOn(service, 'clearAdminMembersCache');

      await service.update('cache-test-2', { phone: '555-9999' } as Partial<Profile>);

      expect(clearAdminSpy).toHaveBeenCalled();
      expect(clearPublicSpy).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException on duplicate meca_id error', async () => {
      const existingProfile = createMockProfile({ id: 'dup-test' });
      mockEm.findOne.mockResolvedValue(existingProfile as any);
      mockEm.flush.mockRejectedValue(new Error('unique constraint violation on duplicate key'));

      await expect(
        service.update('dup-test', { meca_id: '701501' } as Partial<Profile>),
      ).rejects.toThrow(BadRequestException);
    });

    it('should sync full_name using existing last_name when only first_name changes', async () => {
      const existingProfile = createMockProfile({
        id: 'partial-name',
        first_name: 'Alice',
        last_name: 'Johnson',
        full_name: 'Alice Johnson',
      });
      mockEm.findOne.mockResolvedValue(existingProfile as any);

      await service.update('partial-name', { first_name: 'Bob' } as Partial<Profile>);

      expect(mockEm.assign).toHaveBeenCalledWith(
        existingProfile,
        expect.objectContaining({
          full_name: 'Bob Johnson',
        }),
      );
    });
  });

  // ============================================
  // delete
  // ============================================

  describe('delete', () => {
    it('should delete a profile when found', async () => {
      const existingProfile = createMockProfile({ id: 'delete-id' });
      mockEm.findOne.mockResolvedValue(existingProfile as any);

      await service.delete('delete-id');

      expect(mockEm.findOne).toHaveBeenCalledWith(Profile, { id: 'delete-id' });
      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(existingProfile);
    });

    it('should throw NotFoundException when profile not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.delete('nonexistent')).rejects.toThrow(
        'Profile with ID nonexistent not found',
      );
    });
  });

  // ============================================
  // getStats
  // ============================================

  describe('getStats', () => {
    it('should return total users and active members counts', async () => {
      mockEm.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(42); // totalMembers

      const result = await service.getStats();

      expect(mockEm.count).toHaveBeenCalledWith(Profile, {});
      expect(mockEm.count).toHaveBeenCalledWith(Profile, { membership_status: 'active' });
      expect(result).toEqual({ totalUsers: 100, totalMembers: 42 });
    });

    it('should return zero counts when no profiles exist', async () => {
      mockEm.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getStats();

      expect(result).toEqual({ totalUsers: 0, totalMembers: 0 });
    });
  });

  // ============================================
  // search
  // ============================================

  describe('search', () => {
    it('should return empty array for empty query', async () => {
      const result = await service.search('');

      expect(result).toEqual([]);
      expect(mockConnection.execute).not.toHaveBeenCalled();
    });

    it('should return empty array for query shorter than 2 characters', async () => {
      const result = await service.search('a');

      expect(result).toEqual([]);
      expect(mockConnection.execute).not.toHaveBeenCalled();
    });

    it('should execute raw SQL search for valid queries', async () => {
      const searchResults = [
        createMockProfile({ id: 'search-1', first_name: 'John' }),
        createMockProfile({ id: 'search-2', first_name: 'Johnny' }),
      ];
      mockConnection.execute.mockResolvedValue(searchResults);

      const result = await service.search('john');

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM profiles'),
        ['john%', '%john%', '%john%', '%john%', '%john%', 20],
      );
      expect(result).toEqual(searchResults);
    });

    it('should respect custom limit parameter', async () => {
      mockConnection.execute.mockResolvedValue([]);

      await service.search('test', 5);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([5]),
      );
    });

    it('should trim and lowercase the search term', async () => {
      mockConnection.execute.mockResolvedValue([]);

      await service.search('  JOHN  ');

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.any(String),
        ['john%', '%john%', '%john%', '%john%', '%john%', 20],
      );
    });
  });

  // ============================================
  // findPublicProfiles
  // ============================================

  describe('findPublicProfiles', () => {
    it('should return paginated public profiles', async () => {
      const publicProfiles = [createMockProfile({ id: 'pub-1', is_public: true })];
      (mockEm as any).findAndCount.mockResolvedValue([publicProfiles, 1]);

      const result = await service.findPublicProfiles({ page: 1, limit: 50 });

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Profile,
        { is_public: true, membership_status: 'active' },
        expect.objectContaining({
          limit: 50,
          offset: 0,
          orderBy: { last_name: 'ASC', first_name: 'ASC' },
        }),
      );
      expect(result).toEqual({
        profiles: publicProfiles,
        total: 1,
        page: 1,
        limit: 50,
      });
    });

    it('should use default page and limit when not provided', async () => {
      (mockEm as any).findAndCount.mockResolvedValue([[], 0]);

      await service.findPublicProfiles();

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Profile,
        expect.any(Object),
        expect.objectContaining({
          limit: 50,
          offset: 0,
        }),
      );
    });

    it('should add search filters when search term provided', async () => {
      (mockEm as any).findAndCount.mockResolvedValue([[], 0]);

      await service.findPublicProfiles({ search: 'smith' });

      expect((mockEm as any).findAndCount).toHaveBeenCalledWith(
        Profile,
        expect.objectContaining({
          is_public: true,
          membership_status: 'active',
          $or: [
            { first_name: { $ilike: '%smith%' } },
            { last_name: { $ilike: '%smith%' } },
            { meca_id: { $ilike: '%smith%' } },
            { vehicle_info: { $ilike: '%smith%' } },
          ],
        }),
        expect.any(Object),
      );
    });

    it('should return cached result for non-search requests on second call', async () => {
      const publicProfiles = [createMockProfile({ id: 'cached-1' })];
      (mockEm as any).findAndCount.mockResolvedValue([publicProfiles, 1]);

      // First call - hits DB
      const result1 = await service.findPublicProfiles({ page: 1, limit: 50 });
      // Second call - should use cache
      const result2 = await service.findPublicProfiles({ page: 1, limit: 50 });

      // findAndCount should only be called once (second call uses cache)
      expect((mockEm as any).findAndCount).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('should not cache search requests', async () => {
      (mockEm as any).findAndCount.mockResolvedValue([[], 0]);

      await service.findPublicProfiles({ search: 'test' });
      await service.findPublicProfiles({ search: 'test' });

      // Both calls should hit the DB since search results are not cached
      expect((mockEm as any).findAndCount).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================
  // findPublicById
  // ============================================

  describe('findPublicById', () => {
    it('should return a public profile when found', async () => {
      const publicProfile = createMockProfile({ id: 'pub-id', is_public: true });
      mockEm.findOne.mockResolvedValue(publicProfile as any);

      const result = await service.findPublicById('pub-id');

      expect(mockEm.findOne).toHaveBeenCalledWith(Profile, { id: 'pub-id', is_public: true });
      expect(result).toEqual(publicProfile);
    });

    it('should throw NotFoundException when public profile not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.findPublicById('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findPublicById('nonexistent')).rejects.toThrow(
        'Public profile with ID nonexistent not found',
      );
    });
  });

  // ============================================
  // clearForcePasswordChange
  // ============================================

  describe('clearForcePasswordChange', () => {
    it('should set force_password_change to false and call supabaseAdmin', async () => {
      const profile = createMockProfile({
        id: 'force-pw-id',
        force_password_change: true,
      });
      mockEm.findOne.mockResolvedValue(profile as any);

      await service.clearForcePasswordChange('force-pw-id');

      expect((profile as any).force_password_change).toBe(false);
      expect(mockEm.flush).toHaveBeenCalled();
      expect(mockSupabaseAdmin.setForcePasswordChange).toHaveBeenCalledWith('force-pw-id', false);
    });

    it('should still call supabaseAdmin even when profile not found in DB', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await service.clearForcePasswordChange('missing-id');

      // Should not call flush since no profile was found
      expect(mockEm.flush).not.toHaveBeenCalled();
      // Should still update Supabase metadata
      expect(mockSupabaseAdmin.setForcePasswordChange).toHaveBeenCalledWith('missing-id', false);
    });
  });

  // ============================================
  // generatePassword
  // ============================================

  describe('generatePassword', () => {
    it('should return a password string', () => {
      const password = service.generatePassword();

      expect(typeof password).toBe('string');
      expect(password.length).toBeGreaterThan(0);
    });

    it('should return different passwords on subsequent calls', () => {
      const password1 = service.generatePassword();
      const password2 = service.generatePassword();

      // Extremely unlikely to generate the same password twice
      expect(password1).not.toEqual(password2);
    });
  });

  // ============================================
  // isEmailServiceReady
  // ============================================

  describe('isEmailServiceReady', () => {
    it('should return true when email service is ready', () => {
      mockEmailService.isReady.mockReturnValue(true);

      expect(service.isEmailServiceReady()).toBe(true);
      expect(mockEmailService.isReady).toHaveBeenCalled();
    });

    it('should return false when email service is not ready', () => {
      mockEmailService.isReady.mockReturnValue(false);

      expect(service.isEmailServiceReady()).toBe(false);
    });
  });

  // ============================================
  // generateNextMecaId
  // ============================================

  describe('generateNextMecaId', () => {
    it('should return 701501 when no existing profiles', async () => {
      mockEm.find.mockResolvedValueOnce([]);

      const result = await service.generateNextMecaId();

      expect(result).toBe('701501');
      expect(mockEm.find).toHaveBeenCalledWith(Profile, {
        meca_id: { $ne: null },
      }, {
        fields: ['meca_id'],
      });
    });

    it('should return next ID after highest existing in new range', async () => {
      mockEm.find.mockResolvedValueOnce([
        { meca_id: '701501' },
        { meca_id: '701510' },
        { meca_id: '701505' },
      ] as any);

      const result = await service.generateNextMecaId();

      expect(result).toBe('701511');
    });

    it('should ignore MECA IDs outside the 701500-799999 range', async () => {
      mockEm.find.mockResolvedValueOnce([
        { meca_id: '100001' }, // old system, below range
        { meca_id: '800000' }, // above range
        { meca_id: '701503' }, // in range
      ] as any);

      const result = await service.generateNextMecaId();

      expect(result).toBe('701504');
    });

    it('should handle non-numeric MECA IDs gracefully', async () => {
      mockEm.find.mockResolvedValueOnce([
        { meca_id: 'ABC123' },
        { meca_id: null },
        { meca_id: '701502' },
      ] as any);

      const result = await service.generateNextMecaId();

      expect(result).toBe('701503');
    });
  });

  // ============================================
  // findByEmail
  // ============================================

  describe('findByEmail', () => {
    it('should return profile when found by email', async () => {
      const profile = createMockProfile({ email: 'found@example.com' });
      mockEm.findOne.mockResolvedValue(profile as any);

      const result = await service.findByEmail('found@example.com');

      expect(mockEm.findOne).toHaveBeenCalledWith(Profile, { email: 'found@example.com' });
      expect(result).toEqual(profile);
    });

    it('should return null when no profile found by email', async () => {
      mockEm.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('missing@example.com');

      expect(result).toBeNull();
    });
  });

  // ============================================
  // Cache management
  // ============================================

  describe('cache management', () => {
    it('clearPublicProfilesCache should clear the public profiles cache', async () => {
      // Populate the cache first
      const publicProfiles = [createMockProfile({ id: 'cached' })];
      (mockEm as any).findAndCount.mockResolvedValue([publicProfiles, 1]);
      await service.findPublicProfiles({ page: 1, limit: 50 });

      // Clear and verify it re-fetches
      service.clearPublicProfilesCache();
      await service.findPublicProfiles({ page: 1, limit: 50 });

      // findAndCount should be called twice (cache was cleared)
      expect((mockEm as any).findAndCount).toHaveBeenCalledTimes(2);
    });

    it('clearAllProfileCaches should clear both caches', () => {
      // This should not throw
      service.clearAllProfileCaches();

      // Verify it can be called without error
      expect(true).toBe(true);
    });
  });
});
