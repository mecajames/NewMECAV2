import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { RetailerListing, GalleryImage } from './retailer-listing.entity';
import { ManufacturerListing } from './manufacturer-listing.entity';
import { Profile } from '../profiles/profiles.entity';

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
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // ============================================
  // RETAILER LISTINGS
  // ============================================

  async findAllRetailers(includeInactive = false): Promise<RetailerListing[]> {
    const em = this.em.fork();
    const query: any = {};
    if (!includeInactive) {
      query.isActive = true;
      query.isApproved = true;
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
      delete data.userId;
    }

    // Filter out undefined values to prevent MikroORM issues
    const filteredData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        filteredData[key] = value;
      }
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
      delete data.userId;
    }

    // Filter out undefined values to prevent MikroORM issues
    const filteredData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        filteredData[key] = value;
      }
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
}
