import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { AdvertisersService } from './advertisers.service';
import { CreateAdvertiserDto, UpdateAdvertiserDto, UserRole } from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';

@Controller('api/admin/advertisers')
export class AdvertisersController {
  constructor(
    private readonly advertisersService: AdvertisersService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  private async requireAdmin(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }

    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });

    if (profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    return { user, profile };
  }

  @Get()
  async findAll(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.advertisersService.findAll();
  }

  @Get('active')
  async findActive(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.advertisersService.findActive();
  }

  @Get(':id')
  async findOne(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.advertisersService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Headers('authorization') authHeader: string,
    @Body() dto: CreateAdvertiserDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.advertisersService.create(dto);
  }

  @Put(':id')
  async update(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() dto: UpdateAdvertiserDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.advertisersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    await this.advertisersService.delete(id);
  }
}
