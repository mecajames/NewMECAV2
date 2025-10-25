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
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { Profile } from './profiles.entity';
import { AuthGuard, PermissionGuard, RequirePermissions } from '../auth';

/**
 * ProfilesController
 *
 * Handles HTTP requests for profile operations.
 * Routes are automatically registered by NestJS from decorators.
 *
 * All routes are prefixed with /api/profiles
 *
 * Security:
 * - Controller-level: AuthGuard & PermissionGuard (all routes require authentication)
 * - Method-level: Specific permission requirements
 */
@Controller('api/profiles')
@UseGuards(AuthGuard, PermissionGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  /**
   * GET /api/profiles
   * List all profiles with pagination
   * Requires: view_users permission
   */
  @Get()
  @RequirePermissions('view_users')
  async listProfiles(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.profilesService.findAll(pageNum, limitNum);
  }

  /**
   * GET /api/profiles/:id
   * Get single profile by ID
   * Requires: view_users permission
   */
  @Get(':id')
  @RequirePermissions('view_users')
  async getProfile(@Param('id') id: string) {
    const profile = await this.profilesService.findById(id);

    if (!profile) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    return profile;
  }

  /**
   * POST /api/profiles
   * Create new profile
   * Requires: create_user permission
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('create_user')
  async createProfile(@Body() data: Partial<Profile>) {
    return this.profilesService.create(data);
  }

  /**
   * PUT /api/profiles/:id
   * Update existing profile
   * Requires: edit_user permission
   */
  @Put(':id')
  @RequirePermissions('edit_user')
  async updateProfile(
    @Param('id') id: string,
    @Body() data: Partial<Profile>,
  ) {
    return this.profilesService.update(id, data);
  }

  /**
   * DELETE /api/profiles/:id
   * Delete profile
   * Requires: delete_user permission
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('delete_user')
  async deleteProfile(@Param('id') id: string) {
    await this.profilesService.delete(id);
  }
}
