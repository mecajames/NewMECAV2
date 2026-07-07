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
import { NotificationsService } from '../notifications/notifications.service';

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
    private readonly notificationsService: NotificationsService,
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
      throw new BadRequestException(
        `Master membership must be paid before secondaries can be added — this one is currently "${masterMembership.paymentStatus}". ` +
        `If it really was paid (e.g. the payment sits on a deleted duplicate membership), use Record Payment on the master membership first, then add the secondary.`,
      );
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

    // Check if email already exists (if email provided). Two profiles can
    // never share an email, so a colliding address can't become the
    // secondary's login.
    let email = dto.email;
    let createLogin = dto.createLogin;
    if (email) {
      const existingProfile = await em.findOne(Profile, { email });
      if (existingProfile) {
        const masterOwnerId = (masterMembership.user as any)?.id ?? masterMembership.user;
        if (existingProfile.id === masterOwnerId) {
          // The master owner's OWN email — a self-secondary or a shared
          // household address. Don't reject: create the secondary without
          // its own login (it's managed from the master account anyway) and
          // let the profile get a placeholder address.
          this.logger.log(
            `Secondary email ${email} is the master owner's own address — creating secondary without its own login`,
          );
          email = undefined;
          createLogin = false;
        } else {
          throw new BadRequestException(
            `The email ${email} already belongs to another MECA account${existingProfile.full_name ? ` (${existingProfile.full_name})` : ''}. ` +
            `Uncheck "give their own login" to add this secondary without a login, or use a different email address.`,
          );
        }
      }
    }

    // Generate a placeholder email if none provided (for non-login secondaries)
    const secondaryEmail = email || `secondary-${Date.now()}-${Math.random().toString(36).substring(7)}@placeholder.meca.local`;

    const firstName = competitorName.split(' ')[0];
    const lastName = competitorName.split(' ').slice(1).join(' ') || '';

    // profiles.id → auth.users(id) FK: EVERY profile row needs a Supabase
    // auth user behind it, so create the auth user FIRST and reuse its id
    // (same reason fixSecondaryMembershipsWithoutProfiles does this).
    // Inserting a bare Profile with a random uuid violates the FK on prod →
    // "This references a users record that no longer exists." Non-login
    // secondaries get an unguessable random password + can_login=false; the
    // auth row exists purely to satisfy the FK.
    const authResult = await this.supabaseAdminService.createUserWithPassword({
      email: secondaryEmail,
      password: this.supabaseAdminService.generatePassword(16),
      firstName,
      lastName,
      // Real-login secondaries must set their own password on first sign-in.
      forcePasswordChange: createLogin,
    });
    if (!authResult.success || !authResult.userId) {
      throw new BadRequestException(
        `Could not create the secondary member's account: ${authResult.error || 'auth user creation failed'}`,
      );
    }

    // On prod a DB trigger on auth.users auto-provisions a skeleton profiles
    // row the moment the auth user is inserted, so a blind INSERT here dies on
    // profiles_pkey with 409 "A record with that id already exists" (same
    // trigger that 500'd the Create User wizard on 2026-06-11 — see
    // ProfilesService.createWithPassword). Adopt the row if it exists; local
    // dev has no trigger, so the insert path still runs there.
    let secondaryProfile = await em.findOne(Profile, { id: authResult.userId });
    if (!secondaryProfile) {
      secondaryProfile = new Profile();
      secondaryProfile.id = authResult.userId;
      em.persist(secondaryProfile);
    }
    secondaryProfile.email = secondaryEmail;
    secondaryProfile.first_name = firstName;
    secondaryProfile.last_name = lastName;
    secondaryProfile.full_name = competitorName;
    secondaryProfile.is_secondary_account = true;
    secondaryProfile.master_profile = masterMembership.user;
    secondaryProfile.can_login = createLogin; // New field to track if they can log in

    if (createLogin) {
      secondaryProfile.force_password_change = true; // They'll need to set their password
    }

    // Create the secondary membership
    const secondary = new Membership();
    secondary.user = secondaryProfile;
    secondary.membershipTypeConfig = membershipConfig;
    secondary.competitorName = competitorName;
    secondary.accountType = MembershipAccountType.SECONDARY;
    secondary.masterMembership = masterMembership;
    secondary.hasOwnLogin = createLogin;
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
    try {
      await em.flush();
    } catch (err) {
      // The auth user was created before the DB insert — don't leak it if
      // the profile/membership insert failed.
      await this.supabaseAdminService.deleteUser(authResult.userId);
      throw err;
    }

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
      const master_profile = secondary.masterMembership?.user;
      const membershipConfig = secondary.membershipTypeConfig;

      // Only send if secondary has their own valid email (not a placeholder)
      if (secondaryProfile?.email && !secondaryProfile.email.includes('@placeholder.meca.local')) {
        await this.emailService.sendSecondaryMemberWelcomeEmail({
          to: secondaryProfile.email,
          secondaryMemberName: secondary.competitorName || secondaryProfile.full_name || secondaryProfile.first_name || 'Member',
          mecaId: secondary.mecaId!,
          membershipType: membershipConfig?.name || 'MECA Membership',
          masterMemberName: master_profile?.full_name || master_profile?.first_name || 'Primary Member',
          expiryDate: secondary.endDate!,
        });
        this.logger.log(`Sent secondary member welcome email for membership ${secondaryMembershipId} to ${secondaryProfile.email}`);
      }

      if (secondaryProfile?.id) {
        await this.notificationsService.createForUser({
          userId: secondaryProfile.id,
          title: `Welcome to MECA — ${membershipConfig?.name || 'Membership'}`,
          message: `Your secondary membership is active. Your MECA ID is ${secondary.mecaId}.`,
          type: 'info',
          link: '/dashboard',
        });
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
      try {
        const isActive = secondary.paymentStatus === PaymentStatus.PAID &&
                        secondary.startDate <= now &&
                        (!secondary.endDate || secondary.endDate >= now);

        secondaries.push({
          id: secondary.id,
          mecaId: secondary.mecaId || null,
          competitorName: secondary.competitorName || secondary.getCompetitorDisplayName(),
          relationshipToMaster: secondary.relationshipToMaster,
          hasOwnLogin: secondary.hasOwnLogin || false,
          profileId: (secondary.hasOwnLogin && secondary.user) ? secondary.user.id : null,
          membershipType: secondary.membershipTypeConfig ? {
            id: secondary.membershipTypeConfig.id,
            name: secondary.membershipTypeConfig.name,
            category: secondary.membershipTypeConfig.category,
            price: Number(secondary.membershipTypeConfig.price),
          } : { id: '', name: 'Unknown', category: MembershipCategory.COMPETITOR, price: 0 },
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
      } catch (err) {
        this.logger.error(`Error processing secondary membership ${secondary.id}:`, err);
      }
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
  async removeSecondary(secondaryMembershipId: string, requestingUserId: string, opts: { isAdmin?: boolean } = {}): Promise<Membership> {
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

    // Check permission - only the master account owner (or an admin) can remove secondaries
    if (!opts.isAdmin && secondary.masterMembership?.user.id !== requestingUserId) {
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
        secondaryProfile.is_secondary_account = false;
        secondaryProfile.master_profile = undefined;
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
        secondaryProfile.is_secondary_account = false;
        secondaryProfile.master_profile = undefined;
      }
    }

    await em.flush();

    this.logger.log(`Upgraded secondary membership ${secondaryMembershipId} to independent`);
    return secondary;
  }

  /**
   * Split a SECONDARY membership off into its own full, standalone (INDEPENDENT)
   * account — the admin escape hatch for "the master isn't renewing but this
   * secondary wants to keep/manage their own membership."
   *
   * The secondary already has its OWN profile, MECA ID, term, and points, so this
   * is mostly a promotion: clear the master links, detach the profile, and — for a
   * no-login secondary — enable a real login so the person can sign in and renew
   * it themselves. Nothing about their competition history/points changes (those
   * follow the unchanged MECA ID on this membership row). Admin-only upstream.
   */
  async splitOffSecondary(
    secondaryMembershipId: string,
    opts: { email?: string; adminId?: string } = {},
  ): Promise<Membership> {
    const em = this.em.fork();

    const secondary = await em.findOne(Membership, { id: secondaryMembershipId }, {
      populate: ['user', 'masterMembership', 'masterMembership.user', 'membershipTypeConfig'],
    });
    if (!secondary) {
      throw new NotFoundException('Secondary membership not found');
    }
    if (secondary.accountType !== MembershipAccountType.SECONDARY) {
      throw new BadRequestException('This membership is not a secondary — nothing to split off.');
    }
    const profile = secondary.user;
    if (!profile) {
      throw new BadRequestException('Secondary has no profile to split off.');
    }

    // Does this secondary already have a usable login, or must we create one?
    const hasPlaceholderEmail = !profile.email || profile.email.includes('@placeholder.meca.local');
    const needsLogin = !secondary.hasOwnLogin || !profile.can_login || hasPlaceholderEmail;

    if (needsLogin) {
      const email = opts.email?.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new BadRequestException(
          'This secondary has no login. Provide a valid email address to create their login as part of the split-off.',
        );
      }
      // Email must be free (not already attached to another profile/account).
      const clash = await em.findOne(Profile, { email });
      if (clash && clash.id !== profile.id) {
        throw new BadRequestException('A profile with that email already exists. Use a different email.');
      }
      // Enable login on the secondary's EXISTING auth user (profiles.id ===
      // auth.users.id). Do this BEFORE mutating the DB so a failure aborts cleanly.
      const tempPassword = this.supabaseAdminService.generatePassword(16);
      const result = await this.supabaseAdminService.enableLogin(profile.id, email, tempPassword, true);
      if (!result.success) {
        throw new BadRequestException(
          `Could not enable login for this secondary (${result.error || 'auth update failed'}). ` +
          `Their auth account may need to be repaired first — contact the development team.`,
        );
      }
      profile.email = email;
      profile.can_login = true;
      profile.force_password_change = true;
    }

    // Promote the membership to a standalone INDEPENDENT account.
    const formerMaster = secondary.masterMembership;
    secondary.accountType = MembershipAccountType.INDEPENDENT;
    secondary.masterMembership = undefined;
    secondary.masterBillingProfile = undefined;
    secondary.linkedAt = undefined;
    secondary.hasOwnLogin = true;

    // Detach the profile from the master.
    profile.is_secondary_account = false;
    profile.master_profile = undefined;

    // Make sure the now-standalone membership can bill on its own: fill any empty
    // billing contact fields from the former master's record.
    if (formerMaster) {
      secondary.billingFirstName = secondary.billingFirstName || formerMaster.billingFirstName;
      secondary.billingLastName = secondary.billingLastName || formerMaster.billingLastName;
      secondary.billingAddress = secondary.billingAddress || formerMaster.billingAddress;
      secondary.billingCity = secondary.billingCity || formerMaster.billingCity;
      secondary.billingState = secondary.billingState || formerMaster.billingState;
      secondary.billingPostalCode = secondary.billingPostalCode || formerMaster.billingPostalCode;
      secondary.billingCountry = secondary.billingCountry || formerMaster.billingCountry;
      secondary.billingPhone = secondary.billingPhone || formerMaster.billingPhone;
    }

    await em.flush();

    this.logger.log(
      `Split off secondary ${secondaryMembershipId} into an independent account${opts.adminId ? ` (by admin ${opts.adminId})` : ''}`,
    );

    // Let the member know they now own the account and how to sign in.
    try {
      await this.notificationsService.createForUser({
        userId: profile.id,
        title: 'Your MECA membership is now your own account',
        message:
          `Your membership (MECA ID ${secondary.mecaId ?? 'pending'}) has been split into its own account. ` +
          `You can log in and manage or renew it yourself. If you haven't set a password yet, use "Forgot Password" on the login page with ${profile.email}.`,
        type: 'info',
        link: '/dashboard',
      });
    } catch (notifyErr) {
      this.logger.error(`Split-off succeeded but notification failed for ${secondaryMembershipId}: ${notifyErr}`);
    }

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
    return profile?.is_secondary_account === true;
  }

  /**
   * Get the master profile for a secondary profile
   */
  async getMasterProfile(secondaryProfileId: string): Promise<Profile | null> {
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: secondaryProfileId }, {
      populate: ['master_profile'],
    });
    return profile?.master_profile || null;
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
          // Generate a secure random password - they won't use it since can_login=false
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
          const connection = em.getConnection();
          await connection.execute(
            `INSERT INTO profiles (id, email, first_name, last_name, full_name, force_password_change, account_type, is_secondary_account, can_login, master_profile_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, false, 'member', true, false, ?, NOW(), NOW())`,
            [createResult.userId, placeholderEmail, firstName, lastName, secondary.competitorName || 'Unknown', masterUserId]
          );

          // Update the membership to point to the new profile
          await connection.execute(
            `UPDATE memberships SET user_id = ? WHERE id = ?`,
            [createResult.userId, secondary.id]
          );

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
    opts: { isAdmin?: boolean } = {},
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

    if (!opts.isAdmin && !isSecondaryOwner && !isMasterOwner) {
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
