import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { MembershipTypesService } from './membership-types.service';
import { MembershipType } from './membership-type.entity';
import { AuthGuard, PermissionGuard, RequirePermissions } from '../auth';

@Controller('api/membership-types')
export class MembershipTypesController {
  constructor(private readonly membershipTypesService: MembershipTypesService) {}

  @Get()
  async list() {
    return this.membershipTypesService.findAll();
  }

  @Get('active')
  async listActive() {
    return this.membershipTypesService.getActiveTypes();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const type = await this.membershipTypesService.findById(id);
    if (!type) {
      throw new NotFoundException(`Membership type ${id} not found`);
    }
    return type;
  }

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions('manage_membership_types')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: Partial<MembershipType>) {
    return this.membershipTypesService.create(data);
  }

  @Put(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions('manage_membership_types')
  async update(@Param('id') id: string, @Body() data: Partial<MembershipType>) {
    return this.membershipTypesService.update(id, data);
  }

  @Put(':id/features')
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions('manage_membership_types')
  async updateFeatures(@Param('id') id: string, @Body() features: any) {
    return this.membershipTypesService.updateFeatures(id, features);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions('manage_membership_types')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.membershipTypesService.delete(id);
  }
}
