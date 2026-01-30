import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { EntityManager, wrap } from '@mikro-orm/postgresql';
import { Membership } from './memberships.entity';
import { Profile } from '../profiles/profiles.entity';
import { MembershipTypeConfig } from '../membership-type-configs/membership-type-configs.entity';
import { MembershipAccountType, PaymentStatus, MembershipCategory, InvoiceStatus, InvoiceItemType } from '@newmeca/shared';
import { MecaIdService } from './meca-id.service';
import { Invoice } from '../invoices/invoices.entity';
import { InvoiceItem } from '../invoices/invoice-items.entity';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { EmailService } from '../email/email.service';

// DTO for creating a secondary membership
export interface CreateSecondaryMembershipDto {
  masterMembershipId: string;
  membershipTypeConfigId: string;
  competitorName?: string; // Optional for 'self' relationship (uses master's name)
  relationshipToMaster: string; // 'self', 'spouse', 'child', 'sibling', 'friend'
  createLogin: boolean;
  email?: string; // Required if createLogin is true
  // Vehicle info - required for user-facing forms, optional for admin creation
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehicleLicensePlate?: string;
  teamName?: string;
  teamDescription?: string;
}

// DTO for upgrading to master
export interface UpgradeToMasterDto {
  membershipId: string;
}

// DTO for upgrading to independent
export interface UpgradeToIndependentDto {
  secondaryMembershipId: string;
}

// Response type for secondary membership
export interface SecondaryMembershipInfo {
  id: string;
  mecaId: number | null;
  competitorName: string;
  relationshipToMaster?: string;
  hasOwnLogin: boolean;
  profileId: string | null;
  membershipType: {
    id: string;
    name: string;
    category: MembershipCategory;
    price: number;
  };
  // Vehicle info
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehicleLicensePlate?: string;
  linkedAt: Date | null;
  startDate: Date;
  endDate: Date | null;
  paymentStatus: PaymentStatus;
  isActive: boolean;
}

// Response for master membership with secondaries
export interface MasterMembershipInfo {
  id: string;
  mecaId: number | null;
  accountType: MembershipAccountType;
  secondaries: SecondaryMembershipInfo[];
  maxSecondaries: number;
  canAddMore: boolean;
}

@Injectable()
export class MasterSecondaryService {
  private readonly logger = new Logger(MasterSecondaryService.name);

  // Default max secondaries per master (can be made configurable via system settings)
  private readonly DEFAULT_MAX_SECONDARIES = 10;

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly mecaIdService: MecaIdService,
    private readonly supabaseAdminService: SupabaseAdminService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Upgrade an independent membership to master status
   */
  async upgradeToMaster(membershipId: string): Promise<Membership> {
    const em = this.em.fork();

    const membership = await em.findOne(Membership, { id: membershipId }, {
      populate: ['user', 'membershipTypeConfig'],
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (membership.accountType === MembershipAccountType.MASTER) {
      throw new BadRequestException('Membership is already a master account');
    }

    if (membership.accountType === MembershipAccountType.SECONDARY) {
      throw new BadRequestException('Cannot upgrade a secondary membership to master. Upgrade to independent first.');
    }

    if (membership.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('Only paid memberships can become master accounts');
    }

    membership.accountType = MembershipAccountType.MASTER;
    await em.flush();

    this.logger.log(`Upgraded membership ${membershipId} to master status`);
    return membership;
  }

  /**
   * Create a secondary membership linked to a master
   */
  async createSecondaryMembership(dto: CreateSecondaryMembershipDto): Promise<Membership> {
    const em = this.em.fork();

    // Find and validate master membership
    const masterMembership = await em.findOne(Membership, { id: dto.masterMembershipId }, {
      populate: ['user', 'membershipTypeConfig', 'secondaryMemberships'],
    });

    if (!masterMembership) {
      throw new NotFoundException('Master membership not found');
    }

    // If not already a master, upgrade it
    if (masterMembership.accountType === MembershipAccountType.INDEPENDENT) {
      masterMembership.accountType = MembershipAccountType.MASTER;
    }

    if (masterMembership.accountType === MembershipAccountType.SECONDARY) {
      throw new BadRequestException('Cannot add secondary to a secondary membership');
    }

    if (masterMembership.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('Master membership must be paid to add secondaries');
    }

    // Check max secondaries limit
    const secondaryCount = masterMembership.secondaryMemberships.length;
    if (secondaryCount >= this.DEFAULT_MAX_SECONDARIES) {
      throw new BadRequestException(`Maximum of ${this.DEFAULT_MAX_SECONDARIES} secondary memberships allowed`);
    }

    // Validate email if creating login
    if (dto.createLogin && !dto.email) {
      throw new BadRequestException('Email is required when creating a login for the secondary');
    }

    // Handle "self" relationship - use master's competitor name
    let competitorName = dto.competitorName?.trim();
    if (dto.relationshipToMaster === 'self') {
      // For "self" relationship, use the master's name
      competitorName = masterMembership.competitorName || masterMembership.user?.full_name || masterMembership.user?.first_name || 'Unknown';
      this.logger.log(`Using master's name "${competitorName}" for self-secondary membership`);
    } else if (!competitorName) {
      throw new BadRequestException('Competitor name is required for non-self relationships');
    }

    // Get membership type config
    const membershipConfig = await em.findOne(MembershipTypeConfig, { id: dto.membershipTypeConfigId });
    if (!membershipConfig) {
      throw new NotFoundException('Membership type configuration not found');
    }

    // ALWAYS create a Profile for secondary members
    // Every competitor needs their own Profile for:
    // - Their own MECA ID
    // - Competition results tracking
    // - Individual member information
    // The hasOwnLogin flag only determines if they can log in, not if they have a profile

    // Check if email already exists (if email provided)
    if (dto.email) {
      const existingProfile = await em.findOne(Profile, { email: dto.email });
      if (existingProfile) {
        throw new BadRequestException('A profile with this email already exists');
      }
    }

    // Generate a placeholder email if none provided (for non-login secondaries)
    const secondaryEmail = dto.email || `secondary-${Date.now()}-${Math.random().toString(36).substring(7)}@placeholder.meca.local`;

    const secondaryProfile = new Profile();
    secondaryProfile.email = secondaryEmail;
    secondaryProfile.first_name = competitorName.split(' ')[0];
    secondaryProfile.last_name = competitorName.split(' ').slice(1).join(' ') || '';
    secondaryProfile.full_name = competitorName;
    secondaryProfile.isSecondaryAccount = true;
    secondaryProfile.masterProfile = masterMembership.user;
    secondaryProfile.canLogin = dto.createLogin; // New field to track if they can log in

    if (dto.createLogin) {
      secondaryProfile.force_password_change = true; // They'll need to set their password
    }

    em.persist(secondaryProfile);

    // Create the secondary membership
    const secondary = new Membership();
    secondary.user = secondaryProfile;
    secondary.membershipTypeConfig = membershipConfig;
    secondary.competitorName = competitorName;
    secondary.accountType = MembershipAccountType.SECONDARY;
    secondary.masterMembership = masterMembership;
    secondary.hasOwnLogin = dto.createLogin;
    secondary.masterBillingProfile = masterMembership.user;
    secondary.linkedAt = new Date();

    // Copy relationship info if provided
    if (dto.relationshipToMaster) secondary.relationshipToMaster = dto.relationshipToMaster;

    // Copy vehicle info if provided
    if (dto.vehicleMake) secondary.vehicleMake = dto.vehicleMake;
    if (dto.vehicleModel) secondary.vehicleModel = dto.vehicleModel;
    if (dto.vehicleColor) secondary.vehicleColor = dto.vehicleColor;
    if (dto.vehicleLicensePlate) secondary.vehicleLicensePlate = dto.vehicleLicensePlate;

    // Copy team info if provided
    if (dto.teamName) secondary.teamName = dto.teamName;
    if (dto.teamDescription) secondary.teamDescription = dto.teamDescription;

    // Set dates - secondary starts now and ends when master ends (or 1 year if no end date)
    secondary.startDate = new Date();
    secondary.endDate = masterMembership.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    // Payment starts as pending (needs to be processed separately)
    secondary.paymentStatus = PaymentStatus.PENDING;
    secondary.amountPaid = 0;

    // Copy billing info from master
    secondary.billingFirstName = masterMembership.billingFirstName;
    secondary.billingLastName = masterMembership.billingLastName;
    secondary.billingAddress = masterMembership.billingAddress;
    secondary.billingCity = masterMembership.billingCity;
    secondary.billingState = masterMembership.billingState;
    secondary.billingPostalCode = masterMembership.billingPostalCode;
    secondary.billingCountry = masterMembership.billingCountry;
    secondary.billingPhone = masterMembership.billingPhone;

    em.persist(secondary);
    await em.flush();

    // Create an invoice for the secondary membership
    // Invoice is billed to the master account owner
    const invoiceNumber = `INV-${new Date().getFullYear()}-SEC-${Date.now().toString().slice(-6)}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days to pay

    const price = Number(membershipConfig.price);

    const invoice = em.create(Invoice, {
      invoiceNumber,
      user: masterMembership.user, // Billed to master account owner
      status: InvoiceStatus.SENT, // Ready to be paid
      subtotal: price.toFixed(2),
      tax: '0.00',
      discount: '0.00',
      total: price.toFixed(2),
      currency: 'USD',
      dueDate,
      sentAt: new Date(), // Mark as sent immediately
      notes: `Secondary membership for ${competitorName}`,
      billingAddress: {
        name: `${masterMembership.billingFirstName || ''} ${masterMembership.billingLastName || ''}`.trim(),
        address1: masterMembership.billingAddress || '',
        city: masterMembership.billingCity || '',
        state: masterMembership.billingState || '',
        postalCode: masterMembership.billingPostalCode || '',
        country: masterMembership.billingCountry || 'USA',
      },
      companyInfo: {
        name: 'Mobile Electronics Competition Association',
        email: 'billing@mecacaraudio.com',
        website: 'https://mecacaraudio.com',
      },
      // Link to master membership for billing consolidation
      masterMembership: masterMembership,
      isMasterInvoice: false, // This is a secondary invoice, not a consolidated master invoice
    });

    // Create invoice item for the secondary membership
    const invoiceItem = em.create(InvoiceItem, {
      invoice,
      description: `${membershipConfig.name} - Secondary Membership (${competitorName})`,
      quantity: 1,
      unitPrice: price.toFixed(2),
      total: price.toFixed(2),
      itemType: InvoiceItemType.MEMBERSHIP,
      referenceId: secondary.id,
      secondaryMembership: secondary,
    });
    invoice.items.add(invoiceItem);

    await em.persistAndFlush(invoice);

    this.logger.log(`Created secondary membership ${secondary.id} with invoice ${invoice.invoiceNumber} for master ${masterMembership.id}`);
    return secondary;
  }

  /**
   * Mark a secondary membership as paid and assign MECA ID
   */
  async markSecondaryPaid(secondaryMembershipId: string, amountPaid: number, transactionId?: string): Promise<Membership> {
    const em = this.em.fork();

    const secondary = await em.findOne(Membership, { id: secondaryMembershipId }, {
      populate: ['masterMembership', 'masterMembership.user', 'user', 'membershipTypeConfig'],
    });

    if (!secondary) {
      throw new NotFoundException('Secondary membership not found');
    }

    if (secondary.accountType !== MembershipAccountType.SECONDARY) {
      throw new BadRequestException('Membership is not a secondary');
    }

    secondary.paymentStatus = PaymentStatus.PAID;
    secondary.amountPaid = amountPaid;
    if (transactionId) {
      secondary.transactionId = transactionId;
    }

    // Assign MECA ID
    await this.mecaIdService.assignMecaIdToMembership(secondary, undefined, em);

    await em.flush();

    this.logger.log(`Marked secondary membership ${secondaryMembershipId} as paid with MECA ID ${secondary.mecaId}`);

    // Send welcome email to secondary member
    try {
      const secondaryProfile = secondary.user;
      const masterProfile = secondary.masterMembership?.user;
      const membershipConfig = secondary.membershipTypeConfig;

      // Only send if secondary has their own valid email (not a placeholder)
      if (secondaryProfile?.email && !secondaryProfile.email.includes('@placeholder.meca.local')) {
        await this.emailService.sendSecondaryMemberWelcomeEmail({
          to: secondaryProfile.email,
          secondaryMemberName: secondary.competitorName || secondaryProfile.full_name || secondaryProfile.first_name || 'Member',
          mecaId: secondary.mecaId!,
          membershipType: membershipConfig?.name || 'MECA Membership',
          masterMemberName: masterProfile?.full_name || masterProfile?.first_name || 'Primary Member',
          expiryDate: secondary.endDate!,
        });
        this.logger.log(`Sent secondary member welcome email for membership ${secondaryMembershipId} to ${secondaryProfile.email}`);
      }
    } catch (emailError) {
      this.logger.error(`Failed to send secondary member welcome email for membership ${secondaryMembershipId}:`, emailError);
      // Don't fail the payment marking if email fails
    }

    return secondary;
  }

  /**
   * Get all secondary memberships for a master
   */
  async getSecondaryMemberships(masterMembershipId: string): Promise<SecondaryMembershipInfo[]> {
    const em = this.em.fork();

    const masterMembership = await em.findOne(Membership, { id: masterMembershipId }, {
      populate: ['secondaryMemberships', 'secondaryMemberships.user', 'secondaryMemberships.membershipTypeConfig'],
    });

    if (!masterMembership) {
      throw new NotFoundException('Master membership not found');
    }

    const now = new Date();
    const secondaries: SecondaryMembershipInfo[] = [];

    for (const secondary of masterMembership.secondaryMemberships) {
      const isActive = secondary.paymentStatus === PaymentStatus.PAID &&
                      secondary.startDate <= now &&
                      (!secondary.endDate || secondary.endDate >= now);

      secondaries.push({
        id: secondary.id,
        mecaId: secondary.mecaId || null,
        competitorName: secondary.competitorName || secondary.getCompetitorDisplayName(),
        relationshipToMaster: secondary.relationshipToMaster,
        hasOwnLogin: secondary.hasOwnLogin || false,
        profileId: secondary.hasOwnLogin ? secondary.user.id : null,
        membershipType: {
          id: secondary.membershipTypeConfig.id,
          name: secondary.membershipTypeConfig.name,
          category: secondary.membershipTypeConfig.category,
          price: Number(secondary.membershipTypeConfig.price),
        },
        // Vehicle info
        vehicleMake: secondary.vehicleMake,
        vehicleModel: secondary.vehicleModel,
        vehicleColor: secondary.vehicleColor,
        vehicleLicensePlate: secondary.vehicleLicensePlate,
        linkedAt: secondary.linkedAt || null,
        startDate: secondary.startDate,
        endDate: secondary.endDate || null,
        paymentStatus: secondary.paymentStatus,
        isActive,
      });
    }

    return secondaries;
  }

  /**
   * Get master membership info including secondaries
   */
  async getMasterMembershipInfo(membershipId: string): Promise<MasterMembershipInfo> {
    const em = this.em.fork();

    const membership = await em.findOne(Membership, { id: membershipId }, {
      populate: ['secondaryMemberships', 'secondaryMemberships.user', 'secondaryMemberships.membershipTypeConfig'],
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    const secondaries = await this.getSecondaryMemberships(membershipId);
    const canAddMore = secondaries.length < this.DEFAULT_MAX_SECONDARIES;

    return {
      id: membership.id,
      mecaId: membership.mecaId || null,
      accountType: membership.accountType || MembershipAccountType.INDEPENDENT,
      secondaries,
      maxSecondaries: this.DEFAULT_MAX_SECONDARIES,
      canAddMore,
    };
  }

  /**
   * Remove a secondary membership from master
   * This doesn't delete the membership, it unlinks it and makes it independent
   */
  async removeSecondary(secondaryMembershipId: string, requestingUserId: string): Promise<Membership> {
    const em = this.em.fork();

    const secondary = await em.findOne(Membership, { id: secondaryMembershipId }, {
      populate: ['masterMembership', 'masterMembership.user', 'user'],
    });

    if (!secondary) {
      throw new NotFoundException('Secondary membership not found');
    }

    if (secondary.accountType !== MembershipAccountType.SECONDARY) {
      throw new BadRequestException('Membership is not a secondary');
    }

    // Check permission - only master user can remove secondaries
    if (secondary.masterMembership?.user.id !== requestingUserId) {
      throw new ForbiddenException('Only the master account owner can remove secondaries');
    }

    // Upgrade to independent
    secondary.accountType = MembershipAccountType.INDEPENDENT;
    secondary.masterMembership = undefined;
    secondary.masterBillingProfile = undefined;
    secondary.linkedAt = undefined;

    // If secondary has own profile, update it
    if (secondary.hasOwnLogin) {
      const secondaryProfile = await em.findOne(Profile, { id: secondary.user.id });
      if (secondaryProfile) {
        secondaryProfile.isSecondaryAccount = false;
        secondaryProfile.masterProfile = undefined;
      }
    }

    await em.flush();

    this.logger.log(`Removed secondary membership ${secondaryMembershipId} from master`);
    return secondary;
  }

  /**
   * Upgrade a secondary membership to independent status
   * This is requested by the secondary and approved by master or admin
   */
  async upgradeToIndependent(secondaryMembershipId: string): Promise<Membership> {
    const em = this.em.fork();

    const secondary = await em.findOne(Membership, { id: secondaryMembershipId }, {
      populate: ['user', 'masterMembership'],
    });

    if (!secondary) {
      throw new NotFoundException('Secondary membership not found');
    }

    if (secondary.accountType !== MembershipAccountType.SECONDARY) {
      throw new BadRequestException('Membership is not a secondary');
    }

    // Upgrade to independent
    secondary.accountType = MembershipAccountType.INDEPENDENT;
    secondary.masterMembership = undefined;
    secondary.masterBillingProfile = undefined;

    // If secondary has own profile, update it
    if (secondary.hasOwnLogin) {
      const secondaryProfile = await em.findOne(Profile, { id: secondary.user.id });
      if (secondaryProfile) {
        secondaryProfile.isSecondaryAccount = false;
        secondaryProfile.masterProfile = undefined;
      }
    }

    await em.flush();

    this.logger.log(`Upgraded secondary membership ${secondaryMembershipId} to independent`);
    return secondary;
  }

  /**
   * Get all MECA IDs controlled by a user (their own + all secondaries)
   */
  async getControlledMecaIds(userId: string): Promise<Array<{
    mecaId: number;
    membershipId: string;
    profileId: string;
    competitorName: string;
    isOwn: boolean;
    relationshipToMaster?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    vehicleLicensePlate?: string;
  }>> {
    const em = this.em.fork();

    // Get user's own memberships that are master or independent
    const ownMemberships = await em.find(Membership, {
      user: userId,
      accountType: { $ne: MembershipAccountType.SECONDARY },
      mecaId: { $ne: null },
    }, {
      populate: ['user'],
    });

    const result: Array<{
      mecaId: number;
      membershipId: string;
      profileId: string;
      competitorName: string;
      isOwn: boolean;
      relationshipToMaster?: string;
      vehicleMake?: string;
      vehicleModel?: string;
      vehicleColor?: string;
      vehicleLicensePlate?: string;
    }> = [];

    for (const membership of ownMemberships) {
      if (membership.mecaId) {
        result.push({
          mecaId: membership.mecaId,
          membershipId: membership.id,
          profileId: membership.user.id,
          competitorName: membership.competitorName || membership.getCompetitorDisplayName(),
          isOwn: true,
          // Include vehicle info for the primary as well
          vehicleMake: membership.vehicleMake,
          vehicleModel: membership.vehicleModel,
          vehicleColor: membership.vehicleColor,
          vehicleLicensePlate: membership.vehicleLicensePlate,
        });

        // If master, also get secondaries
        if (membership.accountType === MembershipAccountType.MASTER) {
          const secondaries = await em.find(Membership, {
            masterMembership: membership.id,
            mecaId: { $ne: null },
          }, {
            populate: ['user'],
          });

          for (const secondary of secondaries) {
            if (secondary.mecaId) {
              result.push({
                mecaId: secondary.mecaId,
                membershipId: secondary.id,
                profileId: secondary.user.id,
                competitorName: secondary.competitorName || secondary.getCompetitorDisplayName(),
                isOwn: false,
                relationshipToMaster: secondary.relationshipToMaster,
                vehicleMake: secondary.vehicleMake,
                vehicleModel: secondary.vehicleModel,
                vehicleColor: secondary.vehicleColor,
                vehicleLicensePlate: secondary.vehicleLicensePlate,
              });
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Check if a user has access to view/manage a specific MECA ID
   */
  async hasAccessToMecaId(userId: string, mecaId: number): Promise<boolean> {
    const controlledMecaIds = await this.getControlledMecaIds(userId);
    return controlledMecaIds.some(m => m.mecaId === mecaId);
  }

  /**
   * Check if a profile is a secondary account
   */
  async isSecondaryProfile(profileId: string): Promise<boolean> {
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: profileId });
    return profile?.isSecondaryAccount === true;
  }

  /**
   * Get the master profile for a secondary profile
   */
  async getMasterProfile(secondaryProfileId: string): Promise<Profile | null> {
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: secondaryProfileId }, {
      populate: ['masterProfile'],
    });
    return profile?.masterProfile || null;
  }

  /**
   * Fix existing secondary memberships that don't have their own profile
   * This creates a Supabase user and Profile for each secondary that shares the master's profile
   */
  async fixSecondaryMembershipsWithoutProfiles(): Promise<{ fixed: number; errors: string[] }> {
    const em = this.em.fork();
    const errors: string[] = [];
    let fixed = 0;

    // Find all secondary memberships
    const secondaryMemberships = await em.find(Membership, {
      accountType: MembershipAccountType.SECONDARY,
    }, {
      populate: ['user', 'masterMembership', 'masterMembership.user'],
    });

    for (const secondary of secondaryMemberships) {
      try {
        // Check if this secondary shares the master's profile
        const masterUserId = secondary.masterMembership?.user?.id;
        const secondaryUserId = secondary.user?.id;

        if (masterUserId && secondaryUserId && masterUserId === secondaryUserId) {
          // This secondary doesn't have its own profile - create one
          this.logger.log(`Creating profile for secondary membership ${secondary.id} (${secondary.competitorName})`);

          const placeholderEmail = `secondary-${secondary.id.substring(0, 8)}-${Date.now()}@placeholder.meca.local`;
          const nameParts = (secondary.competitorName || 'Unknown').split(' ');
          const firstName = nameParts[0] || 'Unknown';
          const lastName = nameParts.slice(1).join(' ') || '';

          // Create a Supabase user first (required due to FK constraint)
          // Generate a secure random password - they won't use it since canLogin=false
          const randomPassword = this.supabaseAdminService.generatePassword(16);

          const createResult = await this.supabaseAdminService.createUserWithPassword({
            email: placeholderEmail,
            password: randomPassword,
            firstName,
            lastName,
            forcePasswordChange: false, // Won't log in anyway
          });

          if (!createResult.success || !createResult.userId) {
            throw new Error(`Failed to create Supabase user: ${createResult.error}`);
          }

          this.logger.log(`Created Supabase user ${createResult.userId} for secondary ${secondary.id}`);

          // Now create the Profile with the same ID as the Supabase user
          // We need to use raw SQL to set the specific ID
          // Use the knex query builder through em.getConnection()
          const connection = em.getConnection();
          await connection.execute(`
            INSERT INTO profiles (id, email, first_name, last_name, full_name, force_password_change, account_type, is_secondary_account, can_login, master_profile_id, created_at, updated_at)
            VALUES ('${createResult.userId}', '${placeholderEmail}', '${firstName.replace(/'/g, "''")}', '${lastName.replace(/'/g, "''")}', '${(secondary.competitorName || 'Unknown').replace(/'/g, "''")}', false, 'member', true, false, '${masterUserId}', NOW(), NOW())
          `);

          // Update the membership to point to the new profile
          await connection.execute(`
            UPDATE memberships SET user_id = '${createResult.userId}' WHERE id = '${secondary.id}'
          `);

          fixed++;
          this.logger.log(`Created profile ${createResult.userId} for secondary ${secondary.id}`);
        }
      } catch (error) {
        const errMsg = `Failed to fix secondary ${secondary.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        this.logger.error(errMsg);
        errors.push(errMsg);
      }
    }

    this.logger.log(`Fixed ${fixed} secondary memberships, ${errors.length} errors`);
    return { fixed, errors };
  }

  /**
   * Update a secondary membership's details (competitor name, relationship, vehicle info)
   * This can be called by the master to update their secondary's info
   */
  async updateSecondaryDetails(
    secondaryMembershipId: string,
    requestingUserId: string,
    data: {
      competitorName?: string;
      relationshipToMaster?: string;
      vehicleMake?: string;
      vehicleModel?: string;
      vehicleColor?: string;
      vehicleLicensePlate?: string;
    },
  ): Promise<Membership> {
    const em = this.em.fork();

    const secondary = await em.findOne(Membership, { id: secondaryMembershipId }, {
      populate: ['user', 'masterMembership', 'masterMembership.user', 'membershipTypeConfig'],
    });

    if (!secondary) {
      throw new NotFoundException('Secondary membership not found');
    }

    // Check authorization: either the secondary themselves (if they have login)
    // or the master can update
    const isSecondaryOwner = secondary.user?.id === requestingUserId;
    const isMasterOwner = secondary.masterMembership?.user?.id === requestingUserId;

    if (!isSecondaryOwner && !isMasterOwner) {
      throw new ForbiddenException('You do not have permission to update this membership');
    }

    // Update the fields
    // Handle relationship change to/from "self"
    if (data.relationshipToMaster !== undefined) {
      secondary.relationshipToMaster = data.relationshipToMaster;

      // If changing to "self", update competitor name to match master
      if (data.relationshipToMaster === 'self' && secondary.masterMembership) {
        const masterName = secondary.masterMembership.competitorName ||
          secondary.masterMembership.user?.full_name ||
          secondary.masterMembership.user?.first_name ||
          'Unknown';
        secondary.competitorName = masterName;
        this.logger.log(`Updated secondary ${secondary.id} competitor name to "${masterName}" for self relationship`);
      }
    }

    // Only update competitor name if not a "self" relationship
    if (data.competitorName !== undefined && secondary.relationshipToMaster !== 'self') {
      secondary.competitorName = data.competitorName.trim();
    }
    if (data.vehicleMake !== undefined) {
      secondary.vehicleMake = data.vehicleMake;
    }
    if (data.vehicleModel !== undefined) {
      secondary.vehicleModel = data.vehicleModel;
    }
    if (data.vehicleColor !== undefined) {
      secondary.vehicleColor = data.vehicleColor;
    }
    if (data.vehicleLicensePlate !== undefined) {
      secondary.vehicleLicensePlate = data.vehicleLicensePlate;
    }

    // Also update the profile's name if the secondary has their own profile
    // For "self" relationship, use the competitor name we just set from master
    const nameToUse = secondary.relationshipToMaster === 'self'
      ? secondary.competitorName
      : data.competitorName?.trim();

    if (nameToUse && secondary.user) {
      const nameParts = nameToUse.split(' ');
      secondary.user.first_name = nameParts[0] || '';
      secondary.user.last_name = nameParts.slice(1).join(' ') || '';
      secondary.user.full_name = nameToUse;
    }

    await em.flush();

    this.logger.log(`Updated secondary membership ${secondaryMembershipId} details`);
    return secondary;
  }
}
