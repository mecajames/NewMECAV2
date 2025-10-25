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
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { Profile } from './profiles.entity';

/**
 * ProfilesController
 *
 * Handles HTTP requests for profile operations.
 * Routes are automatically registered by NestJS from decorators.
 *
 * All routes are prefixed with /api/profiles
 */
@Controller('api/profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  /**
   * GET /api/profiles
   * List all profiles with pagination
   */
  @Get()
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
   */
  @Get(':id')
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
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProfile(@Body() data: Partial<Profile>) {
    return this.profilesService.create(data);
  }

  /**
   * PUT /api/profiles/:id
   * Update existing profile
   */
  @Put(':id')
  async updateProfile(
    @Param('id') id: string,
    @Body() data: Partial<Profile>,
  ) {
    return this.profilesService.update(id, data);
  }

  /**
   * DELETE /api/profiles/:id
   * Delete profile
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(@Param('id') id: string) {
    await this.profilesService.delete(id);
  }
}
