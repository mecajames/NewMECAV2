import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  UnauthorizedException,
  Query,
  Inject,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { BusinessListingsService } from './business-listings.service';
import { RetailerListing, GalleryImage } from './retailer-listing.entity';
import { ManufacturerListing } from './manufacturer-listing.entity';
import { Profile } from '../profiles/profiles.entity';

interface CreateRetailerDto {
  business_name: string;
  description?: string;
  offer_text?: string; // Special offer/discount/coupon text for MECA members
  business_email?: string;
  business_phone?: string;
  website?: string;
  store_type?: string;
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  profile_image_url?: string;
  gallery_images?: GalleryImage[];
}

interface CreateManufacturerDto {
  business_name: string;
  description?: string;
  business_email?: string;
  business_phone?: string;
  website?: string;
  product_categories?: string[];
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  profile_image_url?: string;
  gallery_images?: GalleryImage[];
}

@Controller('api/business-listings')
export class BusinessListingsController {
  constructor(
    private readonly businessListingsService: BusinessListingsService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // Helper to extract user ID from request header (set by auth middleware)
  private getUserId(headers: any): string {
    const userId = headers['x-user-id'];
    if (!userId) {
      throw new UnauthorizedException('User ID not found in request');
    }
    return userId;
  }

  // Check if the user has admin role
  private async isAdmin(headers: any): Promise<boolean> {
    try {
      const userId = headers['x-user-id'];
      if (!userId) return false;

      const em = this.em.fork();
      const profile = await em.findOne(Profile, { id: userId });
      return profile?.role === 'admin';
    } catch {
      return false;
    }
  }

  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================

  @Get('retailers')
  async getAllRetailers(): Promise<RetailerListing[]> {
    return this.businessListingsService.findAllRetailers(false);
  }

  @Get('retailers/:id')
  async getRetailerById(@Param('id') id: string): Promise<RetailerListing | null> {
    return this.businessListingsService.findRetailerById(id);
  }

  @Get('manufacturers')
  async getAllManufacturers(): Promise<ManufacturerListing[]> {
    return this.businessListingsService.findAllManufacturers(false);
  }

  @Get('manufacturers/:id')
  async getManufacturerById(@Param('id') id: string): Promise<ManufacturerListing | null> {
    return this.businessListingsService.findManufacturerById(id);
  }

  @Get('sponsors')
  async getAllSponsors(): Promise<{ retailers: RetailerListing[]; manufacturers: ManufacturerListing[] }> {
    return this.businessListingsService.getAllSponsors();
  }

  // ============================================
  // USER ENDPOINTS (Requires Auth)
  // ============================================

  @Get('my/retailer')
  async getMyRetailerListing(@Headers() headers: any): Promise<RetailerListing | null> {
    const userId = this.getUserId(headers);
    return this.businessListingsService.findRetailerByUserId(userId);
  }

  @Post('my/retailer')
  async createMyRetailerListing(
    @Headers() headers: any,
    @Body() data: CreateRetailerDto,
  ): Promise<RetailerListing> {
    const userId = this.getUserId(headers);
    return this.businessListingsService.createRetailer(userId, {
      businessName: data.business_name,
      description: data.description,
      offerText: data.offer_text,
      businessEmail: data.business_email,
      businessPhone: data.business_phone,
      website: data.website,
      storeType: data.store_type,
      streetAddress: data.street_address,
      city: data.city,
      state: data.state,
      postalCode: data.postal_code,
      country: data.country,
      profileImageUrl: data.profile_image_url,
      galleryImages: data.gallery_images,
    });
  }

  @Put('my/retailer')
  async updateMyRetailerListing(
    @Headers() headers: any,
    @Body() data: any,
  ): Promise<RetailerListing> {
    const userId = this.getUserId(headers);
    const listing = await this.businessListingsService.findRetailerByUserId(userId);
    if (!listing) {
      throw new UnauthorizedException('No retailer listing found for this user');
    }
    return this.businessListingsService.updateRetailer(
      listing.id,
      {
        businessName: data.business_name,
        description: data.description,
        offerText: data.offer_text,
        businessEmail: data.business_email,
        businessPhone: data.business_phone,
        website: data.website,
        storeType: data.store_type,
        streetAddress: data.street_address,
        city: data.city,
        state: data.state,
        postalCode: data.postal_code,
        country: data.country,
        profileImageUrl: data.profile_image_url,
        galleryImages: data.gallery_images,
        coverImagePosition: data.cover_image_position,
      },
      userId,
      false,
    );
  }

  @Get('my/manufacturer')
  async getMyManufacturerListing(@Headers() headers: any): Promise<ManufacturerListing | null> {
    const userId = this.getUserId(headers);
    return this.businessListingsService.findManufacturerByUserId(userId);
  }

  @Post('my/manufacturer')
  async createMyManufacturerListing(
    @Headers() headers: any,
    @Body() data: CreateManufacturerDto,
  ): Promise<ManufacturerListing> {
    const userId = this.getUserId(headers);
    return this.businessListingsService.createManufacturer(userId, {
      businessName: data.business_name,
      description: data.description,
      businessEmail: data.business_email,
      businessPhone: data.business_phone,
      website: data.website,
      productCategories: data.product_categories,
      streetAddress: data.street_address,
      city: data.city,
      state: data.state,
      postalCode: data.postal_code,
      country: data.country,
      profileImageUrl: data.profile_image_url,
      galleryImages: data.gallery_images,
    });
  }

  @Put('my/manufacturer')
  async updateMyManufacturerListing(
    @Headers() headers: any,
    @Body() data: any,
  ): Promise<ManufacturerListing> {
    const userId = this.getUserId(headers);
    const listing = await this.businessListingsService.findManufacturerByUserId(userId);
    if (!listing) {
      throw new UnauthorizedException('No manufacturer listing found for this user');
    }
    return this.businessListingsService.updateManufacturer(
      listing.id,
      {
        businessName: data.business_name,
        description: data.description,
        businessEmail: data.business_email,
        businessPhone: data.business_phone,
        website: data.website,
        productCategories: data.product_categories,
        streetAddress: data.street_address,
        city: data.city,
        state: data.state,
        postalCode: data.postal_code,
        country: data.country,
        profileImageUrl: data.profile_image_url,
        galleryImages: data.gallery_images,
        coverImagePosition: data.cover_image_position,
      },
      userId,
      false,
    );
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  @Get('admin/retailers')
  async adminGetAllRetailers(
    @Headers() headers: any,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<RetailerListing[]> {
    const admin = await this.isAdmin(headers);
    if (!admin) {
      throw new UnauthorizedException('Admin access required');
    }
    return this.businessListingsService.findAllRetailers(includeInactive === 'true');
  }

  @Post('admin/retailers')
  async adminCreateRetailer(
    @Headers() headers: any,
    @Body() data: CreateRetailerDto & { user_id: string; is_approved?: boolean },
  ): Promise<RetailerListing> {
    const admin = await this.isAdmin(headers);
    if (!admin) {
      throw new UnauthorizedException('Admin access required');
    }
    return this.businessListingsService.adminCreateRetailer({
      userId: data.user_id,
      businessName: data.business_name,
      description: data.description,
      offerText: data.offer_text,
      businessEmail: data.business_email,
      businessPhone: data.business_phone,
      website: data.website,
      storeType: data.store_type,
      streetAddress: data.street_address,
      city: data.city,
      state: data.state,
      postalCode: data.postal_code,
      country: data.country,
      profileImageUrl: data.profile_image_url,
      galleryImages: data.gallery_images,
      isApproved: data.is_approved,
    });
  }

  @Put('admin/retailers/:id')
  async adminUpdateRetailer(
    @Headers() headers: any,
    @Param('id') id: string,
    @Body() data: any,
  ): Promise<RetailerListing> {
    const admin = await this.isAdmin(headers);
    if (!admin) {
      throw new UnauthorizedException('Admin access required');
    }
    const userId = this.getUserId(headers);
    return this.businessListingsService.updateRetailer(
      id,
      {
        businessName: data.business_name,
        description: data.description,
        offerText: data.offer_text,
        businessEmail: data.business_email,
        businessPhone: data.business_phone,
        website: data.website,
        storeType: data.store_type,
        streetAddress: data.street_address,
        city: data.city,
        state: data.state,
        postalCode: data.postal_code,
        country: data.country,
        profileImageUrl: data.profile_image_url,
        galleryImages: data.gallery_images,
        coverImagePosition: data.cover_image_position,
        isSponsor: data.is_sponsor,
        sponsorOrder: data.sponsor_order,
        isActive: data.is_active,
        isApproved: data.is_approved,
        userId: data.user_id,
        startDate: data.start_date,
        endDate: data.end_date,
      },
      userId,
      true,
    );
  }

  @Put('admin/retailers/:id/approve')
  async approveRetailer(
    @Headers() headers: any,
    @Param('id') id: string,
  ): Promise<RetailerListing> {
    const admin = await this.isAdmin(headers);
    if (!admin) {
      throw new UnauthorizedException('Admin access required');
    }
    return this.businessListingsService.approveRetailer(id);
  }

  @Delete('admin/retailers/:id')
  async adminDeleteRetailer(
    @Headers() headers: any,
    @Param('id') id: string,
  ): Promise<void> {
    const admin = await this.isAdmin(headers);
    if (!admin) {
      throw new UnauthorizedException('Admin access required');
    }
    const userId = this.getUserId(headers);
    return this.businessListingsService.deleteRetailer(id, userId, true);
  }

  @Get('admin/manufacturers')
  async adminGetAllManufacturers(
    @Headers() headers: any,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<ManufacturerListing[]> {
    const admin = await this.isAdmin(headers);
    if (!admin) {
      throw new UnauthorizedException('Admin access required');
    }
    return this.businessListingsService.findAllManufacturers(includeInactive === 'true');
  }

  @Post('admin/manufacturers')
  async adminCreateManufacturer(
    @Headers() headers: any,
    @Body() data: CreateManufacturerDto & { user_id: string; is_approved?: boolean },
  ): Promise<ManufacturerListing> {
    const admin = await this.isAdmin(headers);
    if (!admin) {
      throw new UnauthorizedException('Admin access required');
    }
    return this.businessListingsService.adminCreateManufacturer({
      userId: data.user_id,
      businessName: data.business_name,
      description: data.description,
      businessEmail: data.business_email,
      businessPhone: data.business_phone,
      website: data.website,
      productCategories: data.product_categories,
      streetAddress: data.street_address,
      city: data.city,
      state: data.state,
      postalCode: data.postal_code,
      country: data.country,
      profileImageUrl: data.profile_image_url,
      galleryImages: data.gallery_images,
      isApproved: data.is_approved,
    });
  }

  @Put('admin/manufacturers/:id')
  async adminUpdateManufacturer(
    @Headers() headers: any,
    @Param('id') id: string,
    @Body() data: any,
  ): Promise<ManufacturerListing> {
    const admin = await this.isAdmin(headers);
    if (!admin) {
      throw new UnauthorizedException('Admin access required');
    }
    const userId = this.getUserId(headers);
    return this.businessListingsService.updateManufacturer(
      id,
      {
        businessName: data.business_name,
        description: data.description,
        businessEmail: data.business_email,
        businessPhone: data.business_phone,
        website: data.website,
        productCategories: data.product_categories,
        streetAddress: data.street_address,
        city: data.city,
        state: data.state,
        postalCode: data.postal_code,
        country: data.country,
        profileImageUrl: data.profile_image_url,
        galleryImages: data.gallery_images,
        coverImagePosition: data.cover_image_position,
        isSponsor: data.is_sponsor,
        sponsorOrder: data.sponsor_order,
        isActive: data.is_active,
        isApproved: data.is_approved,
        userId: data.user_id,
        startDate: data.start_date,
        endDate: data.end_date,
      },
      userId,
      true,
    );
  }

  @Put('admin/manufacturers/:id/approve')
  async approveManufacturer(
    @Headers() headers: any,
    @Param('id') id: string,
  ): Promise<ManufacturerListing> {
    const admin = await this.isAdmin(headers);
    if (!admin) {
      throw new UnauthorizedException('Admin access required');
    }
    return this.businessListingsService.approveManufacturer(id);
  }

  @Delete('admin/manufacturers/:id')
  async adminDeleteManufacturer(
    @Headers() headers: any,
    @Param('id') id: string,
  ): Promise<void> {
    const admin = await this.isAdmin(headers);
    if (!admin) {
      throw new UnauthorizedException('Admin access required');
    }
    const userId = this.getUserId(headers);
    return this.businessListingsService.deleteManufacturer(id, userId, true);
  }
}
