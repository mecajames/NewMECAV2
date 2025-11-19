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
  HttpStatus 
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { Profile } from './profiles.entity';

@Controller('api/profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  async listProfiles(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<Profile[]> {
    return this.profilesService.findAll(page, limit);
  }

  @Get('stats')
  async getStats(): Promise<{ totalUsers: number; totalMembers: number }> {
    return this.profilesService.getStats();
  }

  @Get(':id')
  async getProfile(@Param('id') id: string): Promise<Profile> {
    return this.profilesService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProfile(@Body() data: Partial<Profile>): Promise<Profile> {
    return this.profilesService.create(data);
  }

  @Put(':id')
  async updateProfile(
    @Param('id') id: string,
    @Body() data: Partial<Profile>,
  ): Promise<Profile> {
    return this.profilesService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(@Param('id') id: string): Promise<void> {
    return this.profilesService.delete(id);
  }
}
