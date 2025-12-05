import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  MembershipTypeConfigsService,
  CreateMembershipTypeConfigDto,
  UpdateMembershipTypeConfigDto,
} from './membership-type-configs.service';
import { MembershipCategory } from './membership-type-configs.entity';

@Controller('api/membership-type-configs')
export class MembershipTypeConfigsController {
  constructor(
    private readonly membershipTypeConfigsService: MembershipTypeConfigsService,
  ) {}

  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.membershipTypeConfigsService.findAll(include);
  }

  @Get('active')
  async findActive() {
    return this.membershipTypeConfigsService.findActive();
  }

  @Get('featured')
  async findFeatured() {
    return this.membershipTypeConfigsService.findFeatured();
  }

  /**
   * Get memberships visible on the public website
   * Excludes manufacturer memberships
   */
  @Get('public')
  async findPublic() {
    return this.membershipTypeConfigsService.findPublic();
  }

  @Get('category/:category')
  async findByCategory(@Param('category') category: MembershipCategory) {
    return this.membershipTypeConfigsService.findByCategory(category);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.membershipTypeConfigsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: CreateMembershipTypeConfigDto) {
    return this.membershipTypeConfigsService.create(data);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateMembershipTypeConfigDto,
  ) {
    return this.membershipTypeConfigsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.membershipTypeConfigsService.delete(id);
  }

  @Post(':id/toggle-active')
  async toggleActive(@Param('id') id: string) {
    return this.membershipTypeConfigsService.toggleActive(id);
  }

  @Put('display-order')
  async updateDisplayOrder(
    @Body() updates: Array<{ id: string; displayOrder: number }>,
  ) {
    await this.membershipTypeConfigsService.updateDisplayOrder(updates);
    return { success: true };
  }
}
