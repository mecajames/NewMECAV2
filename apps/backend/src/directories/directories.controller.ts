import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DirectoriesService } from './directories.service';
import { AuthGuard, PermissionGuard, RequirePermissions } from '../auth';

@Controller('api/directories')
export class DirectoriesController {
  constructor(private readonly directoriesService: DirectoriesService) {}

  @Get()
  async list(@Query('type') type?: string) {
    return this.directoriesService.findAll(type);
  }

  @Get('featured')
  async listFeatured(@Query('type') type?: string) {
    return this.directoriesService.getFeatured(type);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.directoriesService.findById(id);
  }

  @Get('profile/:profileId')
  async getByProfile(@Param('profileId') profileId: string) {
    return this.directoriesService.findByProfile(profileId);
  }

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.directoriesService.create(data);
  }

  @Put(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  async update(@Param('id') id: string, @Body() data: any) {
    return this.directoriesService.update(id, data);
  }

  @Put(':id/featured')
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions('manage_directory_listings')
  async setFeatured(@Param('id') id: string, @Body() { featured }: any) {
    return this.directoriesService.setFeatured(id, featured);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions('manage_directory_listings')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.directoriesService.delete(id);
  }
}
