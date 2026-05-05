import { Injectable, Inject, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { RetailerListing, GalleryImage } from './retailer-listing.entity';
import { ManufacturerListing } from './manufacturer-listing.entity';
import { Profile } from '../profiles/profiles.entity';
import { NotificationsService } from '../notifications/notifications.service';

interface CreateRetailerDto {
  businessName: string;
  description?: string;
  offerText?: string; // Special offer/discount/coupon text for MECA members
  businessEmail?: string;
  businessPhone?: string;
  website?: string;
  storeType?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  profileImageUrl?: string;
  galleryImages?: GalleryImage[];
  startDate?: Date | string;
  endDate?: Date | string;
}

interface UpdateRetailerDto extends Partial<CreateRetailerDto> {
  coverImagePosition?: { x: number; y: number };
  isSponsor?: boolean;
  sponsorOrder?: number;
  isActive?: boolean;
  isApproved?: boolean;
  userId?: string; // For reassigning the listing to a different user
}

interface CreateManufacturerDto {
  businessName: string;
  description?: string;
  businessEmail?: string;
  businessPhone?: string;
  website?: string;
  productCategories?: string[];
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  profileImageUrl?: string;
  galleryImages?: GalleryImage[];
  startDate?: Date | string;
  endDate?: Date | string;
}

interface UpdateManufacturerDto extends Partial<CreateManufacturerDto> {
  coverImagePosition?: { x: number; y: number };
  isSponsor?: boolean;
  sponsorOrder?: number;
  isActive?: boolean;
  isApproved?: boolean;
  userId?: string; // For reassigning the listing to a different user
}

@Injectable()
export class BusinessListingsService {
  private readonly logger = new Logger(BusinessListingsService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Resolve admin recipient IDs for moderation notifications. */
  private async getAdminUserIds(): Promise<string[]> {
    const em = this.em.fork();
    const admins = await em.find(
      Profile,
      { $or: [{ role: 'admin' }, { is_staff: true }] },
      { fields: ['id'] },
    );
    return admins.map(a => a.id);
  }

  private async notifyAdminsOfPendingEdit(args: {
    listingType: 'retailer' | 'manufacturer';
    listingId: string;
    businessName: string;
    ownerEmail?: string;
  }): Promise<void> {
    try {
      const adminIds = await this.getAdminUserIds();
      if (adminIds.length === 0) return;
      await this.notificationsService.adminSendNotification({
        recipientIds: adminIds,
        title: `Listing edit awaiting review — ${args.businessName}`,
        message:
          `${args.ownerEmail || 'A user'} submitted edits to their ${args.listingType} listing. ` +
          `The live version is unchanged until you approve.`,
        type: 'alert',
        link: '/admin/business-listings?tab=pending',
      });
    } catch (err) {
      this.logger.error('Failed to notify admins of pending listing edit', err as any);
    }
  }

  private async notifyOwnerOfModeration(args: {
    ownerId: string;
    businessName: string;
    outcome: 'approved' | 'rejected';
    notes?: string;
  }): Promise<void> {
    try {
      const isApproval = args.outcome === 'approved';
      await this.notificationsService.createForUser({
        userId: args.ownerId,
        title: isApproval
          ? `Your listing edits are now live — ${args.businessName}`
          : `Listing edits not approved — ${args.businessName}`,
        message: isApproval
          ? 'Your edits to your business listing have been approved and are visible in the public directory.'
          : `An admin reviewed your edits and did not approve them${args.notes ? `: ${args.notes}` : '.'} The live version of your listing is unchanged.`,
        type: isApproval ? 'info' : 'alert',
        link: '/dashboard/business-listing',
      });
    } catch (err) {
      this.logger.error('Failed to notify owner of moderation outcome', err as any);
    }
  }

  // ============================================
  // RETAILER LISTINGS
  // ============================================

  async findAllRetailers(includeInactive = false): Promise<RetailerListing[]> {
    const em = this.em.fork();
    const query: any = {};
    if (!includeInactive) {
      query.isActive = true;
      query.isApproved = true;
      query.user = { membership_status: 'active' };
    }
    return em.find(RetailerListing, query, {
      populate: ['user'],
      orderBy: { businessName: 'ASC' },
    });
  }

  async findRetailerById(id: string): Promise<RetailerListing | null> {
    const em = this.em.fork();
    return em.findOne(RetailerListing, { id }, { populate: ['user'] });
  }

  async findRetailerByUserId(userId: string): Promise<RetailerListing | null> {
    const em = this.em.fork();
    return em.findOne(RetailerListing, { user: userId }, { populate: ['user'] });
  }

  async createRetailer(userId: string, data: CreateRetailerDto): Promise<RetailerListing> {
    const em = this.em.fork();

    // Check if user already has a retailer listing
    const existing = await em.findOne(RetailerListing, { user: userId });
    if (existing) {
      throw new ForbiddenException('User already has a retailer listing');
    }

    const listing = em.create(RetailerListing, {
      user: em.getReference(Profile, userId),
      businessName: data.businessName,
      description: data.description,
      offerText: data.offerText,
      businessEmail: data.businessEmail,
      businessPhone: data.businessPhone,
      website: data.website,
      storeType: data.storeType || 'both',
      streetAddress: data.streetAddress,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country || 'USA',
      profileImageUrl: data.profileImageUrl,
      galleryImages: data.galleryImages,
      isSponsor: false,
      isActive: true,
      isApproved: false, // Requires admin approval
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await em.persistAndFlush(listing);
    return listing;
  }

  async updateRetailer(
    id: string,
    data: UpdateRetailerDto,
    requestingUserId: string,
    isAdmin = false,
  ): Promise<RetailerListing> {
    const em = this.em.fork();
    const listing = await em.findOne(RetailerListing, { id }, { populate: ['user'] });

    if (!listing) {
      throw new NotFoundException(`Retailer listing with ID ${id} not found`);
    }

    // Only owner or admin can update
    if (listing.user?.id !== requestingUserId && !isAdmin) {
      throw new ForbiddenException('Not authorized to update this listing');
    }

    // Non-admins cannot change sponsor/approval status or reassign user
    if (!isAdmin) {
      delete data.isSponsor;
      delete data.sponsorOrder;
      delete data.isApproved;
      delete data.userId;
      delete data.startDate;
      delete data.endDate;
    }

    // Handle user reassignment separately (admin only)
    if (data.userId && isAdmin) {
      listing.user = em.getReference(Profile, data.userId);
    }
    // Always remove userId - it's handled via the user relation above,
    // and the entity's userId is a read-only getter that em.assign() can't set
    delete data.userId;

    // Filter out undefined values to prevent MikroORM issues
    const filteredData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        filteredData[key] = value;
      }
    }

    // Moderation flow: if a non-admin owner edits an already-approved listing,
    // their changes land in pendingChanges instead of mutating the live row,
    // so the public directory keeps showing the approved version until an
    // admin reviews. New (never-approved) listings and admin edits write
    // straight through.
    const isLiveListing = listing.isApproved === true;
    if (!isAdmin && isLiveListing) {
      listing.pendingChanges = filteredData;
      listing.pendingSubmittedAt = new Date();
      listing.pendingReviewNotes = undefined;
      listing.updatedAt = new Date();
      await em.flush();
      await this.notifyAdminsOfPendingEdit({
        listingType: 'retailer',
        listingId: listing.id,
        businessName: listing.businessName,
        ownerEmail: listing.user?.email,
      });
      return listing;
    }

    em.assign(listing, {
      ...filteredData,
      updatedAt: new Date(),
    });

    await em.flush();
    return listing;
  }

  async deleteRetailer(id: string, requestingUserId: string, isAdmin = false): Promise<void> {
    const em = this.em.fork();
    const listing = await em.findOne(RetailerListing, { id }, { populate: ['user'] });

    if (!listing) {
      throw new NotFoundException(`Retailer listing with ID ${id} not found`);
    }

    if (listing.user?.id !== requestingUserId && !isAdmin) {
      throw new ForbiddenException('Not authorized to delete this listing');
    }

    await em.removeAndFlush(listing);
  }

  async getRetailerSponsors(): Promise<RetailerListing[]> {
    const em = this.em.fork();
    return em.find(
      RetailerListing,
      { isSponsor: true, isActive: true, isApproved: true },
      { orderBy: { sponsorOrder: 'ASC', businessName: 'ASC' } },
    );
  }

  // ============================================
  // MANUFACTURER LISTINGS
  // ============================================

  async findAllManufacturers(includeInactive = false): Promise<ManufacturerListing[]> {
    const em = this.em.fork();
    const query: any = {};
    if (!includeInactive) {
      query.isActive = true;
      query.isApproved = true;
      query.user = { membership_status: 'active' };
    }
    return em.find(ManufacturerListing, query, {
      populate: ['user'],
      orderBy: { businessName: 'ASC' },
    });
  }

  async findManufacturerById(id: string): Promise<ManufacturerListing | null> {
    const em = this.em.fork();
    return em.findOne(ManufacturerListing, { id }, { populate: ['user'] });
  }

  async findManufacturerByUserId(userId: string): Promise<ManufacturerListing | null> {
    const em = this.em.fork();
    return em.findOne(ManufacturerListing, { user: userId }, { populate: ['user'] });
  }

  async createManufacturer(userId: string, data: CreateManufacturerDto): Promise<ManufacturerListing> {
    const em = this.em.fork();

    // Check if user already has a manufacturer listing
    const existing = await em.findOne(ManufacturerListing, { user: userId });
    if (existing) {
      throw new ForbiddenException('User already has a manufacturer listing');
    }

    const listing = em.create(ManufacturerListing, {
      user: em.getReference(Profile, userId),
      businessName: data.businessName,
      description: data.description,
      businessEmail: data.businessEmail,
      businessPhone: data.businessPhone,
      website: data.website,
      productCategories: data.productCategories,
      streetAddress: data.streetAddress,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country || 'USA',
      profileImageUrl: data.profileImageUrl,
      galleryImages: data.galleryImages,
      isSponsor: false,
      isActive: true,
      isApproved: false, // Requires admin approval
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await em.persistAndFlush(listing);
    return listing;
  }

  async updateManufacturer(
    id: string,
    data: UpdateManufacturerDto,
    requestingUserId: string,
    isAdmin = false,
  ): Promise<ManufacturerListing> {
    const em = this.em.fork();
    const listing = await em.findOne(ManufacturerListing, { id }, { populate: ['user'] });

    if (!listing) {
      throw new NotFoundException(`Manufacturer listing with ID ${id} not found`);
    }

    // Only owner or admin can update
    if (listing.user?.id !== requestingUserId && !isAdmin) {
      throw new ForbiddenException('Not authorized to update this listing');
    }

    // Non-admins cannot change sponsor/approval status or reassign user
    if (!isAdmin) {
      delete data.isSponsor;
      delete data.sponsorOrder;
      delete data.isApproved;
      delete data.userId;
      delete data.startDate;
      delete data.endDate;
    }

    // Handle user reassignment separately (admin only)
    if (data.userId && isAdmin) {
      listing.user = em.getReference(Profile, data.userId);
    }
    // Always remove userId - it's handled via the user relation above,
    // and the entity's userId is a read-only getter that em.assign() can't set
    delete data.userId;

    // Filter out undefined values to prevent MikroORM issues
    const filteredData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        filteredData[key] = value;
      }
    }

    // Moderation flow: same semantics as updateRetailer — non-admin owner
    // edits to an already-approved listing land in pendingChanges. The live
    // row stays public until an admin merges or rejects.
    const isLiveListing = listing.isApproved === true;
    if (!isAdmin && isLiveListing) {
      listing.pendingChanges = filteredData;
      listing.pendingSubmittedAt = new Date();
      listing.pendingReviewNotes = undefined;
      listing.updatedAt = new Date();
      await em.flush();
      await this.notifyAdminsOfPendingEdit({
        listingType: 'manufacturer',
        listingId: listing.id,
        businessName: listing.businessName,
        ownerEmail: listing.user?.email,
      });
      return listing;
    }

    em.assign(listing, {
      ...filteredData,
      updatedAt: new Date(),
    });

    await em.flush();
    return listing;
  }

  async deleteManufacturer(id: string, requestingUserId: string, isAdmin = false): Promise<void> {
    const em = this.em.fork();
    const listing = await em.findOne(ManufacturerListing, { id }, { populate: ['user'] });

    if (!listing) {
      throw new NotFoundException(`Manufacturer listing with ID ${id} not found`);
    }

    if (listing.user?.id !== requestingUserId && !isAdmin) {
      throw new ForbiddenException('Not authorized to delete this listing');
    }

    await em.removeAndFlush(listing);
  }

  async getManufacturerSponsors(): Promise<ManufacturerListing[]> {
    const em = this.em.fork();
    return em.find(
      ManufacturerListing,
      { isSponsor: true, isActive: true, isApproved: true },
      { orderBy: { sponsorOrder: 'ASC', businessName: 'ASC' } },
    );
  }

  // ============================================
  // COMBINED SPONSORS (for home page carousel)
  // ============================================

  async getAllSponsors(): Promise<{ retailers: RetailerListing[]; manufacturers: ManufacturerListing[] }> {
    const [retailers, manufacturers] = await Promise.all([
      this.getRetailerSponsors(),
      this.getManufacturerSponsors(),
    ]);
    return { retailers, manufacturers };
  }

  // ============================================
  // ADMIN FUNCTIONS
  // ============================================

  async adminCreateRetailer(data: CreateRetailerDto & { userId: string; isApproved?: boolean }): Promise<RetailerListing> {
    const em = this.em.fork();

    const listing = em.create(RetailerListing, {
      user: em.getReference(Profile, data.userId),
      businessName: data.businessName,
      description: data.description,
      offerText: data.offerText,
      businessEmail: data.businessEmail,
      businessPhone: data.businessPhone,
      website: data.website,
      storeType: data.storeType || 'both',
      streetAddress: data.streetAddress,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country || 'USA',
      profileImageUrl: data.profileImageUrl,
      galleryImages: data.galleryImages,
      isSponsor: false,
      isActive: true,
      isApproved: data.isApproved ?? true, // Admin can auto-approve
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await em.persistAndFlush(listing);
    return listing;
  }

  async adminCreateManufacturer(data: CreateManufacturerDto & { userId: string; isApproved?: boolean }): Promise<ManufacturerListing> {
    const em = this.em.fork();

    const listing = em.create(ManufacturerListing, {
      user: em.getReference(Profile, data.userId),
      businessName: data.businessName,
      description: data.description,
      businessEmail: data.businessEmail,
      businessPhone: data.businessPhone,
      website: data.website,
      productCategories: data.productCategories,
      streetAddress: data.streetAddress,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country || 'USA',
      profileImageUrl: data.profileImageUrl,
      galleryImages: data.galleryImages,
      isSponsor: false,
      isActive: true,
      isApproved: data.isApproved ?? true, // Admin can auto-approve
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await em.persistAndFlush(listing);
    return listing;
  }

  async approveRetailer(id: string): Promise<RetailerListing> {
    const em = this.em.fork();
    const listing = await em.findOne(RetailerListing, { id });

    if (!listing) {
      throw new NotFoundException(`Retailer listing with ID ${id} not found`);
    }

    listing.isApproved = true;
    listing.updatedAt = new Date();
    await em.flush();
    return listing;
  }

  async approveManufacturer(id: string): Promise<ManufacturerListing> {
    const em = this.em.fork();
    const listing = await em.findOne(ManufacturerListing, { id });

    if (!listing) {
      throw new NotFoundException(`Manufacturer listing with ID ${id} not found`);
    }

    listing.isApproved = true;
    listing.updatedAt = new Date();
    await em.flush();
    return listing;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Moderation: pending changes review queue
  // ─────────────────────────────────────────────────────────────────────

  /** Lists retailer + manufacturer listings with unreviewed pending edits. */
  async findPendingChanges(): Promise<{
    retailers: RetailerListing[];
    manufacturers: ManufacturerListing[];
  }> {
    const em = this.em.fork();
    const [retailers, manufacturers] = await Promise.all([
      em.find(
        RetailerListing,
        { pendingChanges: { $ne: null } },
        { populate: ['user'], orderBy: { pendingSubmittedAt: 'ASC' } },
      ),
      em.find(
        ManufacturerListing,
        { pendingChanges: { $ne: null } },
        { populate: ['user'], orderBy: { pendingSubmittedAt: 'ASC' } },
      ),
    ]);
    return { retailers, manufacturers };
  }

  /**
   * Merge pending_changes onto the live row, clear the draft. The listing
   * stays approved; this is purely an "accept the edits" operation.
   */
  async approvePendingRetailer(id: string): Promise<RetailerListing> {
    const em = this.em.fork();
    const listing = await em.findOne(RetailerListing, { id }, { populate: ['user'] });
    if (!listing) throw new NotFoundException(`Retailer listing ${id} not found`);
    if (!listing.pendingChanges) {
      throw new NotFoundException('No pending changes to approve on this listing');
    }
    em.assign(listing, { ...listing.pendingChanges, updatedAt: new Date() });
    const ownerId = listing.user?.id;
    const businessName = listing.businessName;
    listing.pendingChanges = undefined;
    listing.pendingSubmittedAt = undefined;
    listing.pendingReviewNotes = undefined;
    listing.isApproved = true;
    await em.flush();
    if (ownerId) {
      await this.notifyOwnerOfModeration({ ownerId, businessName, outcome: 'approved' });
    }
    return listing;
  }

  async approvePendingManufacturer(id: string): Promise<ManufacturerListing> {
    const em = this.em.fork();
    const listing = await em.findOne(ManufacturerListing, { id }, { populate: ['user'] });
    if (!listing) throw new NotFoundException(`Manufacturer listing ${id} not found`);
    if (!listing.pendingChanges) {
      throw new NotFoundException('No pending changes to approve on this listing');
    }
    em.assign(listing, { ...listing.pendingChanges, updatedAt: new Date() });
    const ownerId = listing.user?.id;
    const businessName = listing.businessName;
    listing.pendingChanges = undefined;
    listing.pendingSubmittedAt = undefined;
    listing.pendingReviewNotes = undefined;
    listing.isApproved = true;
    await em.flush();
    if (ownerId) {
      await this.notifyOwnerOfModeration({ ownerId, businessName, outcome: 'approved' });
    }
    return listing;
  }

  /** Discard pending edits, leave live row untouched, store the reason. */
  async rejectPendingRetailer(id: string, notes?: string): Promise<RetailerListing> {
    const em = this.em.fork();
    const listing = await em.findOne(RetailerListing, { id }, { populate: ['user'] });
    if (!listing) throw new NotFoundException(`Retailer listing ${id} not found`);
    if (!listing.pendingChanges) {
      throw new NotFoundException('No pending changes to reject on this listing');
    }
    const ownerId = listing.user?.id;
    const businessName = listing.businessName;
    listing.pendingChanges = undefined;
    listing.pendingSubmittedAt = undefined;
    listing.pendingReviewNotes = notes ?? undefined;
    listing.updatedAt = new Date();
    await em.flush();
    if (ownerId) {
      await this.notifyOwnerOfModeration({ ownerId, businessName, outcome: 'rejected', notes });
    }
    return listing;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Reassign cleanup tool — surfaces listings still owned by a protected
  // super-admin profile alongside suggested member matches, so admins can
  // re-link bulk-seeded directory rows to the right business owner.
  // ─────────────────────────────────────────────────────────────────────

  private slugify(s: string): string {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private suggestMatchesForListing(
    businessName: string,
    candidates: Array<{ id: string; email: string; first_name?: string; last_name?: string; meca_id?: number; membership_business_name?: string }>,
  ): typeof candidates {
    const bnLower = (businessName || '').toLowerCase().trim();
    const bnSlug = this.slugify(businessName);
    const scored = candidates.map(c => {
      let score = 0;
      let reason = '';
      const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim().toLowerCase();
      if (fullName === bnLower) { score = 100; reason = 'exact name match'; }
      else if ((c.membership_business_name || '').toLowerCase().trim() === bnLower) { score = 95; reason = 'membership business name'; }
      else if ((c.first_name || '').toLowerCase().trim() === bnLower) { score = 80; reason = 'profile first_name match'; }
      else {
        const emailSlug = this.slugify(c.email || '');
        if (bnSlug && emailSlug.includes(bnSlug)) { score = 70; reason = `email contains "${bnSlug}"`; }
      }
      return { c, score, reason };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
    return scored.map(x => ({ ...x.c, _matchReason: x.reason } as any));
  }

  async findReassignCandidates(): Promise<{
    retailers: Array<{ listing: RetailerListing; suggestions: any[] }>;
    manufacturers: Array<{ listing: ManufacturerListing; suggestions: any[] }>;
  }> {
    const PROTECTED_MECA_IDS = ['202401', '700947'];
    const em = this.em.fork();
    const conn = em.getConnection();

    type Cand = { id: string; email: string; first_name?: string; last_name?: string; meca_id?: number; membership_business_name?: string };
    const fetchCandidates = async (category: 'retail' | 'manufacturer'): Promise<Cand[]> => {
      const rows: any[] = await conn.execute(
        `SELECT DISTINCT p.id, p.email, p.meca_id, p.first_name, p.last_name,
                m.business_name AS membership_business_name
         FROM profiles p
         JOIN memberships m ON m.user_id = p.id AND m.payment_status = 'paid'
                            AND m.cancelled_at IS NULL
                            AND (m.end_date IS NULL OR m.end_date > now())
         JOIN membership_type_configs mtc ON mtc.id = m.membership_type_config_id
         WHERE mtc.category = ?`,
        [category],
      );
      return rows;
    };

    const fetchSuperAdminOwned = async (table: 'retailer_listings' | 'manufacturer_listings'): Promise<string[]> => {
      const rows: any[] = await conn.execute(
        `SELECT l.id
         FROM "${table}" l
         JOIN profiles p ON p.id = l.user_id
         WHERE p.meca_id IN (${PROTECTED_MECA_IDS.join(',')})
         ORDER BY l.business_name`,
      );
      return rows.map(r => r.id);
    };

    const retailerIds = await fetchSuperAdminOwned('retailer_listings');
    const manufacturerIds = await fetchSuperAdminOwned('manufacturer_listings');

    const retailers = retailerIds.length > 0
      ? await em.find(RetailerListing, { id: { $in: retailerIds } }, { populate: ['user'] })
      : [];
    const manufacturers = manufacturerIds.length > 0
      ? await em.find(ManufacturerListing, { id: { $in: manufacturerIds } }, { populate: ['user'] })
      : [];

    const retailCandidates = await fetchCandidates('retail');
    const mfgCandidates = await fetchCandidates('manufacturer');

    return {
      retailers: retailers.map(l => ({
        listing: l,
        suggestions: this.suggestMatchesForListing(l.businessName, retailCandidates),
      })),
      manufacturers: manufacturers.map(l => ({
        listing: l,
        suggestions: this.suggestMatchesForListing(l.businessName, mfgCandidates),
      })),
    };
  }

  async rejectPendingManufacturer(id: string, notes?: string): Promise<ManufacturerListing> {
    const em = this.em.fork();
    const listing = await em.findOne(ManufacturerListing, { id }, { populate: ['user'] });
    if (!listing) throw new NotFoundException(`Manufacturer listing ${id} not found`);
    if (!listing.pendingChanges) {
      throw new NotFoundException('No pending changes to reject on this listing');
    }
    const ownerId = listing.user?.id;
    const businessName = listing.businessName;
    listing.pendingChanges = undefined;
    listing.pendingSubmittedAt = undefined;
    listing.pendingReviewNotes = notes ?? undefined;
    listing.updatedAt = new Date();
    await em.flush();
    if (ownerId) {
      await this.notifyOwnerOfModeration({ ownerId, businessName, outcome: 'rejected', notes });
    }
    return listing;
  }
}
