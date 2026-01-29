import { Injectable, Inject, NotFoundException, BadRequestException, Logger, forwardRef } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import {
  PaymentStatus,
  MembershipCategory,
  AdminPaymentMethod,
  AdminCreateMembershipDto,
  OrderStatus,
  OrderType,
  OrderItemType,
  InvoiceStatus,
  InvoiceItemType,
  ManufacturerTier,
} from '@newmeca/shared';
import { Membership } from './memberships.entity';
import { MembershipTypeConfig } from '../membership-type-configs/membership-type-configs.entity';
import { Profile } from '../profiles/profiles.entity';
import { MecaIdService } from './meca-id.service';
import { MembershipSyncService } from './membership-sync.service';
import { TeamsService } from '../teams/teams.service';
import { Order } from '../orders/orders.entity';
import { OrderItem } from '../orders/order-items.entity';
import { Invoice } from '../invoices/invoices.entity';
import { InvoiceItem } from '../invoices/invoice-items.entity';
import { EmailService } from '../email/email.service';

// Legacy interface - kept for backwards compatibility
export interface AdminAssignMembershipDto {
  userId: string;
  membershipTypeConfigId: string;
  durationMonths?: number; // Default 12 months
  notes?: string;
}

// Response type for admin membership creation
export interface AdminCreateMembershipResult {
  membership: Membership;
  order?: Order;
  invoice?: Invoice;
  message: string;
}

export interface CreateMembershipDto {
  userId: string;
  membershipTypeConfigId: string;
  amountPaid: number;
  stripePaymentIntentId?: string;
  transactionId?: string;
  // Competitor info
  competitorName?: string;
  vehicleLicensePlate?: string;
  vehicleColor?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  // Team info
  hasTeamAddon?: boolean;
  teamName?: string;
  teamDescription?: string;
  // Business info
  businessName?: string;
  businessWebsite?: string;
  // Billing info
  billingFirstName?: string;
  billingLastName?: string;
  billingPhone?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
}

@Injectable()
export class MembershipsService {
  private readonly logger = new Logger(MembershipsService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly mecaIdService: MecaIdService,
    @Inject(forwardRef(() => MembershipSyncService))
    private readonly membershipSyncService: MembershipSyncService,
    @Inject(forwardRef(() => TeamsService))
    private readonly teamsService: TeamsService,
    private readonly emailService: EmailService,
  ) {}

  async findById(id: string): Promise<Membership> {
    const em = this.em.fork();
    const membership = await em.findOne(Membership, { id }, { populate: ['user', 'membershipTypeConfig'] });
    if (!membership) {
      throw new NotFoundException(`Membership with ID ${id} not found`);
    }

    // Populate team info from the Team entity if exists
    const team = await this.teamsService.getTeamByMembership(id);
    if (team) {
      membership.teamName = team.name;
      membership.teamDescription = team.description;
    }

    return membership;
  }

  async create(data: Partial<Membership>): Promise<Membership> {
    const em = this.em.fork();
    const membership = em.create(Membership, data as any);
    await em.persistAndFlush(membership);
    return membership;
  }

  async update(id: string, data: Partial<Membership>): Promise<Membership> {
    const em = this.em.fork();
    const membership = await em.findOne(Membership, { id }, { populate: ['user', 'membershipTypeConfig'] });
    if (!membership) {
      throw new NotFoundException(`Membership with ID ${id} not found`);
    }
    em.assign(membership, data);
    await em.flush();
    return membership;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const membership = await em.findOne(Membership, { id });
    if (!membership) {
      throw new NotFoundException(`Membership with ID ${id} not found`);
    }
    await em.removeAndFlush(membership);
  }

  async findByUser(userId: string): Promise<Membership[]> {
    const em = this.em.fork();
    return em.find(Membership, { user: userId }, { populate: ['membershipTypeConfig'] });
  }

  async getActiveMembership(userId: string): Promise<Membership | null> {
    const em = this.em.fork();

    // Get all active memberships for the user
    const memberships = await em.find(
      Membership,
      {
        user: userId,
        $or: [
          { endDate: { $gte: new Date() } },
          { endDate: null },
        ],
        paymentStatus: PaymentStatus.PAID,
      },
      { populate: ['membershipTypeConfig', 'user'] }
    );

    if (memberships.length === 0) {
      return null;
    }

    // Find the base membership (not upgrade-only)
    const baseMembership = memberships.find(m => !m.membershipTypeConfig?.isUpgradeOnly);

    // Find if there's a team upgrade add-on
    const teamUpgrade = memberships.find(m => m.membershipTypeConfig?.isUpgradeOnly === true);

    // If no base membership found, return the first one (shouldn't happen but fallback)
    if (!baseMembership) {
      return memberships[0];
    }

    // If user has both base membership and team upgrade, modify the display name
    if (teamUpgrade && baseMembership.membershipTypeConfig) {
      // Clone the config to avoid mutating the original
      const configWithTeam = { ...baseMembership.membershipTypeConfig };
      configWithTeam.name = `${baseMembership.membershipTypeConfig.name.replace(' Membership', '')} w/Team`;
      configWithTeam.includesTeam = true;
      (baseMembership as any).membershipTypeConfig = configWithTeam;
    }

    // If the membership doesn't have a mecaId but the user/profile does, populate it
    if (!baseMembership.mecaId) {
      const profile = await em.findOne(Profile, { id: userId });
      if (profile?.meca_id) {
        (baseMembership as any).mecaId = profile.meca_id;
      }
    }

    return baseMembership;
  }

  /**
   * Get all active memberships for a user (they can have multiple)
   */
  async getActiveMemberships(userId: string): Promise<Membership[]> {
    const em = this.em.fork();
    return em.find(
      Membership,
      {
        user: userId,
        $or: [
          { endDate: { $gte: new Date() } },
          { endDate: null },
        ],
        paymentStatus: PaymentStatus.PAID,
      },
      { populate: ['membershipTypeConfig'] }
    );
  }

  /**
   * Check if user can purchase a specific membership type.
   * - Retailer: Max 1 per user
   * - Manufacturer: Max 1 per user
   * - Competitor: Unlimited
   */
  async canPurchaseMembership(userId: string, membershipTypeConfigId: string): Promise<{
    allowed: boolean;
    reason?: string;
    existingMembershipId?: string;
  }> {
    const em = this.em.fork();

    // Get the membership type config
    const config = await em.findOne(MembershipTypeConfig, { id: membershipTypeConfigId });
    if (!config) {
      return { allowed: false, reason: 'Membership type not found' };
    }

    // Check limits based on category
    if (config.category === MembershipCategory.RETAIL || config.category === MembershipCategory.MANUFACTURER) {
      // Check if user already has an active membership of this category
      const existingMembership = await em.findOne(Membership, {
        user: userId,
        membershipTypeConfig: { category: config.category },
        paymentStatus: PaymentStatus.PAID,
        $or: [
          { endDate: { $gte: new Date() } },
          { endDate: null },
        ],
      }, { populate: ['membershipTypeConfig'] });

      if (existingMembership) {
        return {
          allowed: false,
          reason: `You already have an active ${config.category} membership. You can only have one ${config.category} membership at a time.`,
          existingMembershipId: existingMembership.id,
        };
      }

      // Check for recently expired that could be renewed
      const expiredMembership = await em.findOne(Membership, {
        user: userId,
        membershipTypeConfig: { category: config.category },
        paymentStatus: PaymentStatus.PAID,
        endDate: { $lt: new Date() },
      }, {
        populate: ['membershipTypeConfig'],
        orderBy: { endDate: 'DESC' },
      });

      if (expiredMembership) {
        const eligibility = this.mecaIdService.checkReactivationEligibility(expiredMembership);
        if (eligibility.canReactivate) {
          return {
            allowed: true,
            reason: `Your previous ${config.category} membership can be renewed. Your MECA ID will be reactivated.`,
            existingMembershipId: expiredMembership.id,
          };
        }
      }
    }

    // Competitors can have unlimited memberships
    return { allowed: true };
  }

  /**
   * Create a membership for an existing user with all details
   */
  async createMembership(data: CreateMembershipDto): Promise<Membership> {
    const em = this.em.fork();

    // Check if purchase is allowed
    const canPurchase = await this.canPurchaseMembership(data.userId, data.membershipTypeConfigId);
    if (!canPurchase.allowed) {
      throw new BadRequestException(canPurchase.reason);
    }

    // Get membership config
    const config = await em.findOne(MembershipTypeConfig, { id: data.membershipTypeConfigId });
    if (!config) {
      throw new NotFoundException('Membership type not found');
    }

    // Validate required fields for competitor memberships
    if (config.category === MembershipCategory.COMPETITOR) {
      if (!data.vehicleLicensePlate || !data.vehicleColor || !data.vehicleMake || !data.vehicleModel) {
        throw new BadRequestException('Vehicle information (license plate, color, make, model) is required for competitor memberships');
      }
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year membership

    const membership = new Membership();
    membership.user = em.getReference(Profile, data.userId);
    membership.membershipTypeConfig = config;
    membership.startDate = startDate;
    membership.endDate = endDate;
    membership.amountPaid = data.amountPaid;
    membership.paymentStatus = PaymentStatus.PAID;
    membership.stripePaymentIntentId = data.stripePaymentIntentId;
    membership.transactionId = data.transactionId;

    // Competitor info
    membership.competitorName = data.competitorName;
    membership.vehicleLicensePlate = data.vehicleLicensePlate;
    membership.vehicleColor = data.vehicleColor;
    membership.vehicleMake = data.vehicleMake;
    membership.vehicleModel = data.vehicleModel;

    // Team add-on (for competitors) or included team (for retailer/manufacturer)
    // Also check if membership type config includes team automatically
    membership.hasTeamAddon = config.includesTeam || data.hasTeamAddon || false;
    membership.teamName = data.teamName;
    membership.teamDescription = data.teamDescription;
    if (data.teamName) {
      membership.teamNameLastEdited = new Date(); // Start 30-day edit window
    }

    // Business info
    membership.businessName = data.businessName;
    membership.businessWebsite = data.businessWebsite;

    // Billing info
    membership.billingFirstName = data.billingFirstName;
    membership.billingLastName = data.billingLastName;
    membership.billingPhone = data.billingPhone;
    membership.billingAddress = data.billingAddress;
    membership.billingCity = data.billingCity;
    membership.billingState = data.billingState;
    membership.billingPostalCode = data.billingPostalCode;
    membership.billingCountry = data.billingCountry || 'USA';

    await em.persistAndFlush(membership);

    // Assign MECA ID - check for renewal
    const previousMembership = canPurchase.existingMembershipId
      ? await em.findOne(Membership, { id: canPurchase.existingMembershipId })
      : await this.mecaIdService.findPreviousMembership(data.userId, config.category);

    await this.mecaIdService.assignMecaIdToMembership(membership, previousMembership || undefined, em);
    await em.flush();

    this.logger.log(`Created membership ${membership.id} with MECA ID ${membership.mecaId} for user ${data.userId}`);

    // Auto-create team if needed (for retailer/manufacturer/team category or competitor with team add-on/includes team)
    const shouldCreateTeam =
      config.category === MembershipCategory.RETAIL ||
      config.category === MembershipCategory.MANUFACTURER ||
      config.category === MembershipCategory.TEAM ||
      config.includesTeam ||
      (config.category === MembershipCategory.COMPETITOR && data.hasTeamAddon);

    if (shouldCreateTeam) {
      try {
        // createTeamForMembership will generate a default name if none is provided
        const team = await this.teamsService.createTeamForMembership(membership);
        this.logger.log(`Auto-created team ${team.id} for membership ${membership.id}`);
      } catch (teamError) {
        this.logger.error(`Failed to auto-create team for membership ${membership.id}:`, teamError);
        // Don't fail the membership creation if team creation fails
      }
    }

    // Sync profile membership status to ACTIVE
    await this.membershipSyncService.setProfileActive(data.userId);

    // Send welcome email
    try {
      const user = await em.findOne(Profile, { id: data.userId });
      if (user?.email) {
        await this.emailService.sendMembershipWelcomeEmail({
          to: user.email,
          firstName: user.first_name || undefined,
          mecaId: membership.mecaId!,
          membershipType: config.name,
          membershipCategory: config.category,
          expiryDate: membership.endDate!,
          teamName: data.teamName,
          businessName: data.businessName,
        });
        this.logger.log(`Sent welcome email for membership ${membership.id} to ${user.email}`);
      }
    } catch (emailError) {
      this.logger.error(`Failed to send welcome email for membership ${membership.id}:`, emailError);
      // Don't fail the membership creation if email fails
    }

    return membership;
  }

  async renewMembership(userId: string, membershipTypeConfigId: string): Promise<Membership> {
    const em = this.em.fork();

    // Get the config
    const config = await em.findOne(MembershipTypeConfig, { id: membershipTypeConfigId });
    if (!config) {
      throw new NotFoundException('Membership type not found');
    }

    // Find previous membership for this category
    const previousMembership = await this.mecaIdService.findPreviousMembership(userId, config.category);

    const newMembership = new Membership();
    newMembership.user = em.getReference(Profile, userId);
    newMembership.membershipTypeConfig = config;
    newMembership.startDate = new Date();
    newMembership.endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
    newMembership.amountPaid = 0; // Will be set when payment is processed
    newMembership.paymentStatus = PaymentStatus.PENDING;

    // Copy over vehicle info from previous membership if available
    if (previousMembership) {
      newMembership.competitorName = previousMembership.competitorName;
      newMembership.vehicleLicensePlate = previousMembership.vehicleLicensePlate;
      newMembership.vehicleColor = previousMembership.vehicleColor;
      newMembership.vehicleMake = previousMembership.vehicleMake;
      newMembership.vehicleModel = previousMembership.vehicleModel;
      newMembership.teamName = previousMembership.teamName;
      newMembership.teamDescription = previousMembership.teamDescription;
      newMembership.hasTeamAddon = previousMembership.hasTeamAddon;
      newMembership.businessName = previousMembership.businessName;
      newMembership.businessWebsite = previousMembership.businessWebsite;
      // Reset team name edit window - user can edit once after renewal
      // teamNameLastEdited is intentionally NOT copied so user gets a fresh edit opportunity
    }

    await em.persistAndFlush(newMembership);
    return newMembership;
  }

  /**
   * Update team name for a membership.
   * Users can only edit their team name ONCE after purchase/renewal.
   * Once edited, they cannot edit again until next renewal.
   * Admins can always edit.
   */
  async updateTeamName(
    membershipId: string,
    teamName: string,
    isAdmin: boolean = false
  ): Promise<Membership> {
    const em = this.em.fork();
    const membership = await em.findOne(Membership, { id: membershipId });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // Check if team name can be edited (admin can always edit)
    if (!isAdmin && !membership.canEditTeamName()) {
      throw new BadRequestException(
        'You have already edited your team name for this membership period. Team names can only be changed once after purchase or renewal. Contact an admin if you need to make changes.'
      );
    }

    membership.teamName = teamName;
    // Only mark as edited if user is making the edit (not admin)
    // This tracks that the user has used their one allowed edit
    if (!isAdmin) {
      membership.teamNameLastEdited = new Date();
    }

    await em.flush();
    return membership;
  }

  /**
   * Update vehicle info for a membership
   */
  async updateVehicleInfo(
    membershipId: string,
    vehicleInfo: {
      vehicleLicensePlate?: string;
      vehicleColor?: string;
      vehicleMake?: string;
      vehicleModel?: string;
    }
  ): Promise<Membership> {
    const em = this.em.fork();
    const membership = await em.findOne(Membership, { id: membershipId });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (vehicleInfo.vehicleLicensePlate !== undefined) {
      membership.vehicleLicensePlate = vehicleInfo.vehicleLicensePlate;
    }
    if (vehicleInfo.vehicleColor !== undefined) {
      membership.vehicleColor = vehicleInfo.vehicleColor;
    }
    if (vehicleInfo.vehicleMake !== undefined) {
      membership.vehicleMake = vehicleInfo.vehicleMake;
    }
    if (vehicleInfo.vehicleModel !== undefined) {
      membership.vehicleModel = vehicleInfo.vehicleModel;
    }

    await em.flush();
    return membership;
  }

  async isExpired(membership: Membership): Promise<boolean> {
    if (!membership.endDate) {
      return false;
    }
    return membership.endDate < new Date();
  }

  /**
   * Admin function to assign a membership to a user without payment
   */
  async adminAssignMembership(data: AdminAssignMembershipDto): Promise<Membership> {
    const em = this.em.fork();

    // Get the membership type config
    const membershipConfig = await em.findOne(MembershipTypeConfig, { id: data.membershipTypeConfigId });
    if (!membershipConfig) {
      throw new NotFoundException(`Membership type config with ID ${data.membershipTypeConfigId} not found`);
    }

    const startDate = new Date();
    const endDate = new Date();
    const months = data.durationMonths || 12;
    endDate.setMonth(endDate.getMonth() + months);

    // Create membership
    const membership = new Membership();
    membership.user = em.getReference(Profile, data.userId);
    membership.membershipTypeConfig = membershipConfig;
    membership.startDate = startDate;
    membership.endDate = endDate;
    membership.amountPaid = 0; // Admin assigned - no payment
    membership.paymentStatus = PaymentStatus.PAID; // Marked as paid since admin assigned
    membership.transactionId = `ADMIN-${Date.now()}`;

    await em.persistAndFlush(membership);

    // Assign MECA ID - check for previous membership to reactivate
    const previousMembership = await this.mecaIdService.findPreviousMembership(
      data.userId,
      membershipConfig.category
    );
    await this.mecaIdService.assignMecaIdToMembership(membership, previousMembership || undefined, em);
    await em.flush();

    this.logger.log(`Admin assigned membership ${membership.id} with MECA ID ${membership.mecaId} to user ${data.userId}`);

    // Auto-create team for retailer/manufacturer memberships
    if (membershipConfig.category === MembershipCategory.RETAIL ||
        membershipConfig.category === MembershipCategory.MANUFACTURER) {
      try {
        const team = await this.teamsService.createTeamForMembership(membership);
        this.logger.log(`Auto-created team ${team.id} for admin-assigned membership ${membership.id}`);
      } catch (teamError) {
        this.logger.error(`Failed to auto-create team for admin-assigned membership ${membership.id}:`, teamError);
      }
    }

    // Sync profile membership status to ACTIVE
    await this.membershipSyncService.setProfileActive(data.userId);

    // Send welcome email
    try {
      const user = await em.findOne(Profile, { id: data.userId });
      if (user?.email) {
        await this.emailService.sendMembershipWelcomeEmail({
          to: user.email,
          firstName: user.first_name || undefined,
          mecaId: membership.mecaId!,
          membershipType: membershipConfig.name,
          membershipCategory: membershipConfig.category,
          expiryDate: membership.endDate!,
        });
        this.logger.log(`Sent welcome email for admin-assigned membership ${membership.id} to ${user.email}`);
      }
    } catch (emailError) {
      this.logger.error(`Failed to send welcome email for admin-assigned membership ${membership.id}:`, emailError);
      // Don't fail the membership assignment if email fails
    }

    return membership;
  }

  /**
   * Admin function to create a membership with full details and payment options.
   * Supports Cash, Check, Credit Card (Invoice), and Complimentary payment methods.
   */
  async adminCreateMembership(data: AdminCreateMembershipDto): Promise<AdminCreateMembershipResult> {
    const em = this.em.fork();

    // Get the membership type config
    const membershipConfig = await em.findOne(MembershipTypeConfig, { id: data.membershipTypeConfigId });
    if (!membershipConfig) {
      throw new NotFoundException(`Membership type config with ID ${data.membershipTypeConfigId} not found`);
    }

    // Get user
    const user = await em.findOne(Profile, { id: data.userId });
    if (!user) {
      throw new NotFoundException(`User with ID ${data.userId} not found`);
    }

    // Check if user can purchase this type
    const canPurchase = await this.canPurchaseMembership(data.userId, data.membershipTypeConfigId);
    if (!canPurchase.allowed) {
      throw new BadRequestException(canPurchase.reason);
    }

    // Validate required fields based on category
    if (membershipConfig.category === MembershipCategory.COMPETITOR) {
      if (!data.vehicleMake || !data.vehicleModel || !data.vehicleColor || !data.vehicleLicensePlate) {
        throw new BadRequestException(
          'Competitor memberships require vehicle information (make, model, color, license plate)'
        );
      }
    }

    if (membershipConfig.category === MembershipCategory.RETAIL || membershipConfig.category === MembershipCategory.MANUFACTURER) {
      if (!data.businessName) {
        throw new BadRequestException(`${membershipConfig.category} memberships require a business name`);
      }
    }

    if (data.paymentMethod === AdminPaymentMethod.COMPLIMENTARY && !data.complimentaryReason) {
      throw new BadRequestException('A reason is required for complimentary memberships');
    }

    if (data.paymentMethod === AdminPaymentMethod.CHECK && !data.checkNumber) {
      throw new BadRequestException('Check number is required for check payments');
    }

    // Calculate dates (always 1 year)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    // Determine payment status based on payment method
    let paymentStatus: PaymentStatus;
    let amountPaid: number;
    let transactionId: string;

    switch (data.paymentMethod) {
      case AdminPaymentMethod.CASH:
        paymentStatus = PaymentStatus.PAID;
        amountPaid = Number(membershipConfig.price) + (data.hasTeamAddon ? Number(membershipConfig.teamAddonPrice || 0) : 0);
        transactionId = data.cashReceiptNumber ? `CASH-${data.cashReceiptNumber}` : `CASH-${Date.now()}`;
        break;

      case AdminPaymentMethod.CHECK:
        paymentStatus = PaymentStatus.PAID;
        amountPaid = Number(membershipConfig.price) + (data.hasTeamAddon ? Number(membershipConfig.teamAddonPrice || 0) : 0);
        transactionId = `CHECK-${data.checkNumber}`;
        break;

      case AdminPaymentMethod.CREDIT_CARD_INVOICE:
        paymentStatus = PaymentStatus.PENDING; // Will be updated when invoice is paid
        amountPaid = 0;
        transactionId = `INVOICE-PENDING-${Date.now()}`;
        break;

      case AdminPaymentMethod.COMPLIMENTARY:
        paymentStatus = PaymentStatus.PAID;
        amountPaid = 0;
        transactionId = `COMP-${Date.now()}-${data.complimentaryReason?.substring(0, 20).replace(/\s/g, '_')}`;
        break;

      default:
        throw new BadRequestException(`Invalid payment method: ${data.paymentMethod}`);
    }

    // Create membership
    const membership = new Membership();
    membership.user = em.getReference(Profile, data.userId);
    membership.membershipTypeConfig = membershipConfig;
    membership.startDate = startDate;
    membership.endDate = endDate;
    membership.amountPaid = amountPaid;
    membership.paymentStatus = paymentStatus;
    membership.transactionId = transactionId;

    // Competitor info
    membership.competitorName = data.competitorName;
    membership.vehicleMake = data.vehicleMake;
    membership.vehicleModel = data.vehicleModel;
    membership.vehicleColor = data.vehicleColor;
    membership.vehicleLicensePlate = data.vehicleLicensePlate;

    // Team add-on (for competitor) or included team (for retailer/manufacturer)
    // Also check if membership type config includes team automatically
    membership.hasTeamAddon = membershipConfig.includesTeam || data.hasTeamAddon || false;
    membership.teamName = data.teamName;
    membership.teamDescription = data.teamDescription;
    if (data.teamName) {
      membership.teamNameLastEdited = new Date();
    }

    // Business info
    membership.businessName = data.businessName;
    membership.businessWebsite = data.businessWebsite;

    // Billing info
    membership.billingFirstName = data.billingFirstName;
    membership.billingLastName = data.billingLastName;
    membership.billingPhone = data.billingPhone;
    membership.billingAddress = data.billingAddress;
    membership.billingCity = data.billingCity;
    membership.billingState = data.billingState;
    membership.billingPostalCode = data.billingPostalCode;
    membership.billingCountry = data.billingCountry || 'USA';

    // Persist but don't flush yet - we need to assign MECA ID first
    em.persist(membership);

    // Assign MECA ID before initial flush
    const previousMembership = canPurchase.existingMembershipId
      ? await em.findOne(Membership, { id: canPurchase.existingMembershipId })
      : await this.mecaIdService.findPreviousMembership(data.userId, membershipConfig.category);

    await this.mecaIdService.assignMecaIdToMembership(membership, previousMembership || undefined, em);

    // Now flush everything together
    await em.flush();

    // Re-fetch to ensure proper tracking for subsequent operations
    const managedMembership = await em.findOneOrFail(Membership, { id: membership.id });

    this.logger.log(`Admin created membership ${managedMembership.id} with MECA ID ${managedMembership.mecaId} for user ${data.userId}`);

    // Always create Order and Invoice for all payment types (for records)
    let order: Order | undefined;
    let invoice: Invoice | undefined;

    const totalAmount = Number(membershipConfig.price) + (data.hasTeamAddon ? Number(membershipConfig.teamAddonPrice || 0) : 0);

    // Always create order and invoice for all payment types
    {
      // Create Order
      const orderNumber = `ORD-${new Date().getFullYear()}-ADMIN-${Date.now().toString().slice(-6)}`;

      order = em.create(Order, {
        orderNumber,
        member: user,
        status: data.paymentMethod === AdminPaymentMethod.CREDIT_CARD_INVOICE ? OrderStatus.PENDING : OrderStatus.COMPLETED,
        orderType: OrderType.MEMBERSHIP,
        subtotal: totalAmount.toFixed(2),
        tax: '0.00',
        discount: '0.00',
        total: totalAmount.toFixed(2),
        currency: 'USD',
        notes: data.notes,
        billingAddress: {
          name: `${data.billingFirstName || user.first_name || ''} ${data.billingLastName || user.last_name || ''}`.trim(),
          address1: data.billingAddress || '',
          city: data.billingCity || '',
          state: data.billingState || '',
          postalCode: data.billingPostalCode || '',
          country: data.billingCountry || 'USA',
        },
      });

      // Create order items
      const membershipItem = em.create(OrderItem, {
        order,
        description: `${membershipConfig.name} Membership`,
        quantity: 1,
        unitPrice: membershipConfig.price.toString(),
        total: membershipConfig.price.toString(),
        itemType: OrderItemType.MEMBERSHIP,
        referenceId: managedMembership.id,
      });
      order.items.add(membershipItem);

      if (data.hasTeamAddon && membershipConfig.teamAddonPrice) {
        const teamItem = em.create(OrderItem, {
          order,
          description: 'Team Add-on',
          quantity: 1,
          unitPrice: membershipConfig.teamAddonPrice.toString(),
          total: membershipConfig.teamAddonPrice.toString(),
          itemType: OrderItemType.TEAM_ADDON,
          referenceId: managedMembership.id,
        });
        order.items.add(teamItem);
      }

      await em.persistAndFlush(order);

      // Always create Invoice for all payment types (for records)
      const invoiceNumber = `INV-${new Date().getFullYear()}-ADMIN-${Date.now().toString().slice(-6)}`;
      // Due date is today - invoices are due immediately (except manufacturer invoices which can be customized)
      const dueDate = new Date();

      // For Credit Card/Invoice: DRAFT status (awaiting payment)
      // For all other methods (Cash, Check, Complimentary): PAID status
      const invoiceStatus = data.paymentMethod === AdminPaymentMethod.CREDIT_CARD_INVOICE
        ? InvoiceStatus.DRAFT // Will be sent to user
        : InvoiceStatus.PAID; // Already paid

      invoice = em.create(Invoice, {
        invoiceNumber,
        user: user,
        order,
        status: invoiceStatus,
        subtotal: totalAmount.toFixed(2),
        tax: '0.00',
        discount: '0.00',
        total: totalAmount.toFixed(2),
        currency: 'USD',
        dueDate,
        paidAt: invoiceStatus === InvoiceStatus.PAID ? new Date() : undefined,
        notes: data.notes,
        billingAddress: {
          name: `${data.billingFirstName || user.first_name || ''} ${data.billingLastName || user.last_name || ''}`.trim(),
          address1: data.billingAddress || '',
          city: data.billingCity || '',
          state: data.billingState || '',
          postalCode: data.billingPostalCode || '',
          country: data.billingCountry || 'USA',
        },
        companyInfo: {
          name: 'Mobile Electronics Competition Association',
          email: 'billing@mecacaraudio.com',
          website: 'https://mecacaraudio.com',
        },
      });

      // Create invoice items
      const invMembershipItem = em.create(InvoiceItem, {
        invoice,
        description: `${membershipConfig.name} Membership`,
        quantity: 1,
        unitPrice: membershipConfig.price.toString(),
        total: membershipConfig.price.toString(),
        itemType: InvoiceItemType.MEMBERSHIP,
        referenceId: managedMembership.id,
      });
      invoice.items.add(invMembershipItem);

      if (data.hasTeamAddon && membershipConfig.teamAddonPrice) {
        const invTeamItem = em.create(InvoiceItem, {
          invoice,
          description: 'Team Add-on',
          quantity: 1,
          unitPrice: membershipConfig.teamAddonPrice.toString(),
          total: membershipConfig.teamAddonPrice.toString(),
          itemType: InvoiceItemType.OTHER,
          referenceId: managedMembership.id,
        });
        invoice.items.add(invTeamItem);
      }

      order.invoiceId = invoice.id;
      await em.persistAndFlush([invoice, order]);
    }

    // Auto-create team if needed
    // Retailer/Manufacturer/Team category always get a team
    // Competitor gets a team if hasTeamAddon is true OR if membership config includesTeam
    const shouldCreateTeam =
      membershipConfig.category === MembershipCategory.RETAIL ||
      membershipConfig.category === MembershipCategory.MANUFACTURER ||
      membershipConfig.category === MembershipCategory.TEAM ||
      membershipConfig.includesTeam ||
      (membershipConfig.category === MembershipCategory.COMPETITOR && data.hasTeamAddon);

    if (shouldCreateTeam) {
      try {
        // createTeamForMembership will generate a default name if none is provided
        const team = await this.teamsService.createTeamForMembership(managedMembership);
        this.logger.log(`Auto-created team ${team.id} for admin-created membership ${managedMembership.id}`);
      } catch (teamError) {
        this.logger.error(`Failed to auto-create team for admin-created membership ${managedMembership.id}:`, teamError);
      }
    }

    // Send welcome email (only if payment is completed, not for pending invoice payments)
    if (paymentStatus === PaymentStatus.PAID && user?.email) {
      try {
        await this.emailService.sendMembershipWelcomeEmail({
          to: user.email,
          firstName: user.first_name || undefined,
          mecaId: managedMembership.mecaId!,
          membershipType: membershipConfig.name,
          membershipCategory: membershipConfig.category,
          expiryDate: managedMembership.endDate!,
          teamName: data.teamName,
          businessName: data.businessName,
        });
        this.logger.log(`Sent welcome email for admin-created membership ${managedMembership.id} to ${user.email}`);
      } catch (emailError) {
        this.logger.error(`Failed to send welcome email for admin-created membership ${managedMembership.id}:`, emailError);
        // Don't fail the membership creation if email fails
      }
    }

    // Build response message
    let message = `Membership created successfully with MECA ID #${managedMembership.mecaId}.`;
    if (data.paymentMethod === AdminPaymentMethod.CREDIT_CARD_INVOICE) {
      message += ' Invoice has been created and is ready to be sent to the user. Membership will be activated when paid.';
    } else if (data.paymentMethod === AdminPaymentMethod.COMPLIMENTARY) {
      message += ' This is a complimentary membership (no charge). Invoice and receipt have been created for records.';
    } else {
      message += ' Invoice and payment receipt have been created for records.';
    }

    // Sync profile membership status to ACTIVE (only if payment is already completed)
    if (paymentStatus === PaymentStatus.PAID) {
      await this.membershipSyncService.setProfileActive(data.userId);
    }

    return {
      membership: managedMembership,
      order,
      invoice,
      message,
    };
  }

  /**
   * Get all memberships for a user (including expired)
   * Also populates team info from the Team entity if the membership has an associated team
   */
  async getAllMembershipsByUser(userId: string): Promise<Membership[]> {
    const em = this.em.fork();
    const memberships = await em.find(
      Membership,
      { user: userId },
      {
        populate: ['membershipTypeConfig'],
        orderBy: { startDate: 'DESC' }
      }
    );

    // For each membership, check if there's an associated team and populate team info
    for (const membership of memberships) {
      const team = await this.teamsService.getTeamByMembership(membership.id);
      if (team) {
        // Populate the teamName and teamDescription from the Team entity
        // This ensures the edit form shows the current team info
        membership.teamName = team.name;
        membership.teamDescription = team.description;
      }
    }

    return memberships;
  }

  /**
   * Get all memberships in the system (admin)
   * Also populates team info from Team entity
   */
  async getAllMemberships(): Promise<Membership[]> {
    const em = this.em.fork();
    const memberships = await em.find(
      Membership,
      {},
      {
        populate: ['user', 'membershipTypeConfig'],
        orderBy: { createdAt: 'DESC' }
      }
    );

    // Populate team info for memberships that have associated teams
    for (const membership of memberships) {
      const team = await this.teamsService.getTeamByMembership(membership.id);
      if (team) {
        membership.teamName = team.name;
        membership.teamDescription = team.description;
      }
    }

    return memberships;
  }

  /**
   * Get membership by MECA ID
   */
  async findByMecaId(mecaId: number): Promise<Membership | null> {
    const em = this.em.fork();
    return em.findOne(
      Membership,
      { mecaId },
      { populate: ['user', 'membershipTypeConfig'] }
    );
  }

  /**
   * Get all MECA IDs for a user
   */
  async getUserMecaIds(userId: string): Promise<
    Array<{
      mecaId: number;
      membershipId: string;
      category: MembershipCategory;
      competitorName: string;
      isActive: boolean;
      startDate: Date;
      endDate?: Date;
    }>
  > {
    return this.mecaIdService.getUserMecaIds(userId);
  }

  /**
   * Calculate pro-rated team upgrade price for a membership.
   * Price = (teamAddonPrice × remainingDays) / 365
   *
   * @param membershipId The membership to calculate upgrade price for
   * @returns Upgrade details including price, or null if not eligible
   */
  async getTeamUpgradeDetails(membershipId: string): Promise<{
    eligible: boolean;
    reason?: string;
    originalPrice: number;
    proRatedPrice: number;
    daysRemaining: number;
    membershipId: string;
    membershipEndDate: Date;
  } | null> {
    const em = this.em.fork();

    const membership = await em.findOne(Membership, { id: membershipId }, {
      populate: ['membershipTypeConfig'],
    });

    if (!membership) {
      return null;
    }

    // Check if already has team addon
    if (membership.hasTeamAddon) {
      return {
        eligible: false,
        reason: 'This membership already includes team functionality',
        originalPrice: 0,
        proRatedPrice: 0,
        daysRemaining: 0,
        membershipId: membership.id,
        membershipEndDate: membership.endDate || new Date(),
      };
    }

    // Check if it's an active competitor membership
    if (membership.membershipTypeConfig.category !== MembershipCategory.COMPETITOR) {
      return {
        eligible: false,
        reason: 'Team add-on is only available for Competitor memberships',
        originalPrice: 0,
        proRatedPrice: 0,
        daysRemaining: 0,
        membershipId: membership.id,
        membershipEndDate: membership.endDate || new Date(),
      };
    }

    // Check if membership is active
    if (membership.paymentStatus !== PaymentStatus.PAID) {
      return {
        eligible: false,
        reason: 'Membership must be paid to add team functionality',
        originalPrice: 0,
        proRatedPrice: 0,
        daysRemaining: 0,
        membershipId: membership.id,
        membershipEndDate: membership.endDate || new Date(),
      };
    }

    const now = new Date();
    if (membership.endDate && membership.endDate < now) {
      return {
        eligible: false,
        reason: 'Membership has expired. Please renew first.',
        originalPrice: 0,
        proRatedPrice: 0,
        daysRemaining: 0,
        membershipId: membership.id,
        membershipEndDate: membership.endDate,
      };
    }

    // Calculate days remaining
    const endDate = membership.endDate || new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const msRemaining = endDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    // Get team addon price (default to $25 if not set)
    const originalPrice = Number(membership.membershipTypeConfig.teamAddonPrice) || 25.00;

    // Calculate pro-rated price
    const proRatedPrice = Math.round((originalPrice * daysRemaining / 365) * 100) / 100;

    // Minimum price of $5
    const finalPrice = Math.max(5.00, proRatedPrice);

    return {
      eligible: true,
      originalPrice,
      proRatedPrice: finalPrice,
      daysRemaining,
      membershipId: membership.id,
      membershipEndDate: endDate,
    };
  }

  /**
   * Apply team add-on to a membership after payment.
   *
   * @param membershipId The membership to upgrade
   * @param teamName The team name
   * @param teamDescription Optional team description
   * @returns Updated membership
   */
  async applyTeamUpgrade(
    membershipId: string,
    teamName: string,
    teamDescription?: string
  ): Promise<Membership> {
    const em = this.em.fork();

    const membership = await em.findOne(Membership, { id: membershipId }, {
      populate: ['membershipTypeConfig', 'user'],
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (membership.hasTeamAddon) {
      throw new BadRequestException('Membership already has team functionality');
    }

    // Apply the upgrade
    membership.hasTeamAddon = true;
    membership.teamName = teamName;
    membership.teamDescription = teamDescription;
    membership.teamNameLastEdited = undefined; // Give them their one-time edit opportunity

    await em.flush();

    // Create the team
    try {
      const team = await this.teamsService.createTeamForMembership(membership);
      this.logger.log(`Created team ${team.id} for upgraded membership ${membership.id}`);
    } catch (teamError) {
      this.logger.error(`Failed to create team for upgraded membership ${membership.id}:`, teamError);
      // Don't fail the upgrade if team creation fails
    }

    this.logger.log(`Applied team upgrade to membership ${membership.id}`);

    return membership;
  }

  /**
   * Super Admin: Override MECA ID on an existing membership
   * This bypasses normal MECA ID assignment rules
   * Use with extreme caution - only for correcting errors or restoring old IDs
   */
  async superAdminOverrideMecaId(
    membershipId: string,
    newMecaId: number,
    adminUserId: string,
    reason: string,
  ): Promise<{ success: boolean; membership: Membership; message: string }> {
    const em = this.em.fork();

    // Find the membership
    const membership = await em.findOne(Membership, { id: membershipId }, {
      populate: ['user', 'membershipTypeConfig'],
    });

    if (!membership) {
      throw new NotFoundException(`Membership ${membershipId} not found`);
    }

    const oldMecaId = membership.mecaId;

    // Check if the new MECA ID is already in use by another membership
    const existingMembership = await em.findOne(Membership, {
      mecaId: newMecaId,
      id: { $ne: membershipId },
    });

    if (existingMembership) {
      throw new BadRequestException(`MECA ID ${newMecaId} is already assigned to another membership (${existingMembership.id})`);
    }

    // Update the MECA ID
    membership.mecaId = newMecaId;

    // Also update the profile's meca_id if this is the user's primary membership
    if (membership.user) {
      membership.user.meca_id = String(newMecaId);
    }

    // Create audit history record
    try {
      const { MecaIdHistory } = await import('./meca-id-history.entity');
      const historyRecord = new MecaIdHistory();
      historyRecord.mecaId = newMecaId;
      historyRecord.membership = membership;
      historyRecord.profile = membership.user;
      historyRecord.assignedAt = new Date();
      historyRecord.notes = `SUPER ADMIN OVERRIDE by ${adminUserId}: Changed from ${oldMecaId || 'none'} to ${newMecaId}. Reason: ${reason}`;
      em.persist(historyRecord);
    } catch (historyError) {
      this.logger.error('Failed to create MECA ID history record:', historyError);
      // Don't fail the override if history creation fails
    }

    await em.flush();

    this.logger.warn(`MECA ID OVERRIDE COMPLETE: Membership ${membershipId} changed from ${oldMecaId} to ${newMecaId}`);

    return {
      success: true,
      membership,
      message: `MECA ID successfully changed from ${oldMecaId || 'none'} to ${newMecaId}`,
    };
  }

  /**
   * Super Admin: Renew a membership but force keeping the old MECA ID
   * This bypasses the 90-day rule that would normally assign a new ID
   */
  async renewMembershipKeepMecaId(
    userId: string,
    membershipTypeConfigId: string,
    forcedMecaId: number,
    adminUserId: string,
    reason: string,
  ): Promise<{ success: boolean; membership: Membership; message: string }> {
    const em = this.em.fork();

    // Check if the MECA ID is already in use by an ACTIVE membership
    const existingActive = await em.findOne(Membership, {
      mecaId: forcedMecaId,
      paymentStatus: PaymentStatus.PAID,
      endDate: { $gt: new Date() },
    });

    if (existingActive) {
      throw new BadRequestException(`MECA ID ${forcedMecaId} is already assigned to an active membership`);
    }

    // Get the membership type config
    const membershipTypeConfig = await em.findOne(MembershipTypeConfig, { id: membershipTypeConfigId });
    if (!membershipTypeConfig) {
      throw new NotFoundException('Membership type configuration not found');
    }

    // Get the user
    const user = await em.findOne(Profile, { id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate dates
    const now = new Date();
    const endDate = new Date(now);
    endDate.setFullYear(endDate.getFullYear() + 1);

    // Create the new membership with the forced MECA ID
    const newMembership = new Membership();
    newMembership.user = user;
    newMembership.membershipTypeConfig = membershipTypeConfig;
    newMembership.mecaId = forcedMecaId;
    newMembership.startDate = now;
    newMembership.endDate = endDate;
    newMembership.paymentStatus = PaymentStatus.PAID;
    newMembership.amountPaid = parseFloat(String(membershipTypeConfig.price));
    newMembership.competitorName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
    newMembership.hasTeamAddon = false;

    em.persist(newMembership);

    // Update the profile's MECA ID
    user.meca_id = String(forcedMecaId);
    user.membership_status = 'active';

    // Create audit history record
    try {
      const { MecaIdHistory } = await import('./meca-id-history.entity');
      const historyRecord = new MecaIdHistory();
      historyRecord.mecaId = forcedMecaId;
      historyRecord.membership = newMembership;
      historyRecord.profile = user;
      historyRecord.assignedAt = new Date();
      historyRecord.reactivatedAt = new Date();
      historyRecord.notes = `SUPER ADMIN 90-DAY OVERRIDE by ${adminUserId}: Forced MECA ID ${forcedMecaId} on renewal. Reason: ${reason}`;
      em.persist(historyRecord);
    } catch (historyError) {
      this.logger.error('Failed to create MECA ID history record:', historyError);
    }

    await em.flush();

    this.logger.warn(`90-DAY RULE OVERRIDE COMPLETE: New membership ${newMembership.id} created with forced MECA ID ${forcedMecaId}`);

    return {
      success: true,
      membership: newMembership,
      message: `Membership created with MECA ID ${forcedMecaId} (90-day rule bypassed)`,
    };
  }
}
