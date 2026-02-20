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
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { BusinessListingsService } from './business-listings.service';
import { RetailerListing, GalleryImage } from './retailer-listing.entity';
import { ManufacturerListing } from './manufacturer-listing.entity';
import { Profile } from '../profiles/profiles.entity';
import { UserRole } from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';

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
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  // Helper to validate Bearer token via Supabase and return authenticated user ID
  private async requireAuth(authHeader?: string): Promise<string> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }
    return user.id;
  }

  // Helper to require admin authentication
  private async requireAdmin(authHeader?: string): Promise<string> {
    const userId = await this.requireAuth(authHeader);
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: userId });
    if (profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
    return userId;
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
  async getMyRetailerListing(@Headers('authorization') authHeader: string): Promise<RetailerListing | null> {
    const userId = await this.requireAuth(authHeader);
    return this.businessListingsService.findRetailerByUserId(userId);
  }

  @Post('my/retailer')
  async createMyRetailerListing(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateRetailerDto,
  ): Promise<RetailerListing> {
    const userId = await this.requireAuth(authHeader);
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
    @Headers('authorization') authHeader: string,
    @Body() data: any,
  ): Promise<RetailerListing> {
    const userId = await this.requireAuth(authHeader);
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
  async getMyManufacturerListing(@Headers('authorization') authHeader: string): Promise<ManufacturerListing | null> {
    const userId = await this.requireAuth(authHeader);
    return this.businessListingsService.findManufacturerByUserId(userId);
  }

  @Post('my/manufacturer')
  async createMyManufacturerListing(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateManufacturerDto,
  ): Promise<ManufacturerListing> {
    const userId = await this.requireAuth(authHeader);
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
    @Headers('authorization') authHeader: string,
    @Body() data: any,
  ): Promise<ManufacturerListing> {
    const userId = await this.requireAuth(authHeader);
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

  @Get('admin/retailers/user/:userId')
  async adminGetRetailerByUserId(
    @Headers('authorization') authHeader: string,
    @Param('userId') userId: string,
  ): Promise<RetailerListing | null> {
    await this.requireAdmin(authHeader);
    return this.businessListingsService.findRetailerByUserId(userId);
  }

  @Get('admin/manufacturers/user/:userId')
  async adminGetManufacturerByUserId(
    @Headers('authorization') authHeader: string,
    @Param('userId') userId: string,
  ): Promise<ManufacturerListing | null> {
    await this.requireAdmin(authHeader);
    return this.businessListingsService.findManufacturerByUserId(userId);
  }

  @Get('admin/retailers')
  async adminGetAllRetailers(
    @Headers('authorization') authHeader: string,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<RetailerListing[]> {
    await this.requireAdmin(authHeader);
    return this.businessListingsService.findAllRetailers(includeInactive === 'true');
  }

  @Post('admin/retailers')
  async adminCreateRetailer(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateRetailerDto & { user_id: string; is_approved?: boolean },
  ): Promise<RetailerListing> {
    await this.requireAdmin(authHeader);
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
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: any,
  ): Promise<RetailerListing> {
    const userId = await this.requireAdmin(authHeader);
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
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<RetailerListing> {
    await this.requireAdmin(authHeader);
    return this.businessListingsService.approveRetailer(id);
  }

  @Delete('admin/retailers/:id')
  async adminDeleteRetailer(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<void> {
    const userId = await this.requireAdmin(authHeader);
    return this.businessListingsService.deleteRetailer(id, userId, true);
  }

  @Get('admin/manufacturers')
  async adminGetAllManufacturers(
    @Headers('authorization') authHeader: string,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<ManufacturerListing[]> {
    await this.requireAdmin(authHeader);
    return this.businessListingsService.findAllManufacturers(includeInactive === 'true');
  }

  @Post('admin/manufacturers')
  async adminCreateManufacturer(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateManufacturerDto & { user_id: string; is_approved?: boolean },
  ): Promise<ManufacturerListing> {
    await this.requireAdmin(authHeader);
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
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: any,
  ): Promise<ManufacturerListing> {
    const userId = await this.requireAdmin(authHeader);
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
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<ManufacturerListing> {
    await this.requireAdmin(authHeader);
    return this.businessListingsService.approveManufacturer(id);
  }

  @Delete('admin/manufacturers/:id')
  async adminDeleteManufacturer(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<void> {
    const userId = await this.requireAdmin(authHeader);
    return this.businessListingsService.deleteManufacturer(id, userId, true);
  }
}
