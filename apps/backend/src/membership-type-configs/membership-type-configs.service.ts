import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { MembershipTypeConfig, MembershipCategory, ManufacturerTier } from './membership-type-configs.entity';

export interface CreateMembershipTypeConfigDto {
  name: string;
  description?: string;
  category: MembershipCategory;
  tier?: ManufacturerTier; // Only for manufacturer memberships
  price: number;
  currency?: string;
  benefits?: string[];
  requiredFields?: string[];
  optionalFields?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
  showOnPublicSite?: boolean; // False for manufacturer memberships
  displayOrder?: number;
  stripePriceId?: string;
  stripeProductId?: string;
  quickbooksItemId?: string;
  quickbooksAccountId?: string;
}

export interface UpdateMembershipTypeConfigDto {
  name?: string;
  description?: string;
  tier?: ManufacturerTier;
  price?: number;
  currency?: string;
  benefits?: string[];
  requiredFields?: string[];
  optionalFields?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
  showOnPublicSite?: boolean;
  displayOrder?: number;
  stripePriceId?: string;
  stripeProductId?: string;
  quickbooksItemId?: string;
  quickbooksAccountId?: string;
}

@Injectable()
export class MembershipTypeConfigsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(includeInactive: boolean = false): Promise<MembershipTypeConfig[]> {
    const em = this.em.fork();
    const where = includeInactive ? {} : { isActive: true };

    return em.find(MembershipTypeConfig, where, {
      orderBy: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async findActive(): Promise<MembershipTypeConfig[]> {
    const em = this.em.fork();
    return em.find(
      MembershipTypeConfig,
      { isActive: true },
      {
        orderBy: { displayOrder: 'ASC', name: 'ASC' },
      },
    );
  }

  /**
   * Find memberships visible on the public website
   * Excludes manufacturer memberships (showOnPublicSite = false)
   */
  async findPublic(): Promise<MembershipTypeConfig[]> {
    const em = this.em.fork();
    return em.find(
      MembershipTypeConfig,
      { isActive: true, showOnPublicSite: true },
      {
        orderBy: { displayOrder: 'ASC', name: 'ASC' },
      },
    );
  }

  async findByCategory(category: MembershipCategory): Promise<MembershipTypeConfig[]> {
    const em = this.em.fork();
    return em.find(
      MembershipTypeConfig,
      { category, isActive: true },
      {
        orderBy: { displayOrder: 'ASC', name: 'ASC' },
      },
    );
  }

  async findFeatured(): Promise<MembershipTypeConfig[]> {
    const em = this.em.fork();
    return em.find(
      MembershipTypeConfig,
      { isFeatured: true, isActive: true },
      {
        orderBy: { displayOrder: 'ASC', name: 'ASC' },
      },
    );
  }

  async findById(id: string): Promise<MembershipTypeConfig> {
    const em = this.em.fork();
    const config = await em.findOne(MembershipTypeConfig, { id });

    if (!config) {
      throw new NotFoundException(`Membership type config with ID ${id} not found`);
    }

    return config;
  }

  async create(data: CreateMembershipTypeConfigDto): Promise<MembershipTypeConfig> {
    const em = this.em.fork();

    // Check for duplicate name
    const existing = await em.findOne(MembershipTypeConfig, { name: data.name });
    if (existing) {
      throw new BadRequestException(`Membership type with name "${data.name}" already exists`);
    }

    // Manufacturer memberships should not show on public site by default
    const showOnPublic = data.showOnPublicSite !== undefined
      ? data.showOnPublicSite
      : data.category !== MembershipCategory.MANUFACTURER;

    const config = em.create(MembershipTypeConfig, {
      name: data.name,
      description: data.description,
      category: data.category,
      tier: data.tier,
      price: data.price,
      currency: data.currency || 'USD',
      benefits: data.benefits || [],
      requiredFields: data.requiredFields || this.getDefaultRequiredFields(data.category),
      optionalFields: data.optionalFields || this.getDefaultOptionalFields(data.category),
      isActive: data.isActive !== undefined ? data.isActive : true,
      isFeatured: data.isFeatured || false,
      showOnPublicSite: showOnPublic,
      displayOrder: data.displayOrder || 0,
      stripePriceId: data.stripePriceId,
      stripeProductId: data.stripeProductId,
      quickbooksItemId: data.quickbooksItemId,
      quickbooksAccountId: data.quickbooksAccountId,
    } as any);

    await em.persistAndFlush(config);
    return config;
  }

  async update(id: string, data: UpdateMembershipTypeConfigDto): Promise<MembershipTypeConfig> {
    const em = this.em.fork();
    const config = await em.findOne(MembershipTypeConfig, { id });

    if (!config) {
      throw new NotFoundException(`Membership type config with ID ${id} not found`);
    }

    // Check for duplicate name if name is being changed
    if (data.name && data.name !== config.name) {
      const existing = await em.findOne(MembershipTypeConfig, { name: data.name });
      if (existing) {
        throw new BadRequestException(`Membership type with name "${data.name}" already exists`);
      }
    }

    em.assign(config, data);
    await em.flush();
    return config;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const config = await em.findOne(MembershipTypeConfig, { id });

    if (!config) {
      throw new NotFoundException(`Membership type config with ID ${id} not found`);
    }

    await em.removeAndFlush(config);
  }

  async toggleActive(id: string): Promise<MembershipTypeConfig> {
    const em = this.em.fork();
    const config = await em.findOne(MembershipTypeConfig, { id });

    if (!config) {
      throw new NotFoundException(`Membership type config with ID ${id} not found`);
    }

    config.isActive = !config.isActive;
    await em.flush();
    return config;
  }

  async updateDisplayOrder(updates: Array<{ id: string; displayOrder: number }>): Promise<void> {
    const em = this.em.fork();

    for (const update of updates) {
      const config = await em.findOne(MembershipTypeConfig, { id: update.id });
      if (config) {
        config.displayOrder = update.displayOrder;
      }
    }

    await em.flush();
  }

  private getDefaultRequiredFields(category: MembershipCategory): string[] {
    const commonFields = ['name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'country'];

    switch (category) {
      case MembershipCategory.COMPETITOR:
        return [...commonFields];

      case MembershipCategory.TEAM:
        return [...commonFields, 'team_name', 'contact_name'];

      case MembershipCategory.RETAIL:
        return [...commonFields, 'business_name', 'website'];

      case MembershipCategory.MANUFACTURER:
        return [...commonFields, 'company_name', 'website', 'product_categories'];

      default:
        return commonFields;
    }
  }

  private getDefaultOptionalFields(category: MembershipCategory): string[] {
    const commonOptional = ['phone_secondary', 'website', 'bio'];

    switch (category) {
      case MembershipCategory.COMPETITOR:
        return [...commonOptional, 'vehicle_info', 'competition_classes'];

      case MembershipCategory.TEAM:
        return [...commonOptional, 'team_logo', 'social_media'];

      case MembershipCategory.RETAIL:
        return [...commonOptional, 'business_hours', 'services_offered'];

      case MembershipCategory.MANUFACTURER:
        return [...commonOptional, 'product_catalog', 'distributor_info'];

      default:
        return commonOptional;
    }
  }
}
