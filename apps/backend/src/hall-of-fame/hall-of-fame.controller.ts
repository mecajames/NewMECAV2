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
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { HallOfFameService } from './hall-of-fame.service';
import { Profile } from '../profiles/profiles.entity';
import { UserRole } from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';

@Controller('api/hall-of-fame')
export class HallOfFameController {
  constructor(
    private readonly hallOfFameService: HallOfFameService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  private async requireAdminOrEventDirector(authHeader?: string) {
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
    if (profile?.role !== UserRole.ADMIN && profile?.role !== UserRole.EVENT_DIRECTOR) {
      throw new ForbiddenException('Admin or Event Director access required');
    }
    return { user, profile };
  }

  @Get('years')
  async getYears() {
    return this.hallOfFameService.getDistinctYears();
  }

  @Get()
  async getAll(
    @Query('category') category?: string,
    @Query('year') year?: string,
  ) {
    return this.hallOfFameService.findAll(
      category || undefined,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.hallOfFameService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: any,
    @Headers('authorization') authHeader?: string,
  ) {
    const { user } = await this.requireAdminOrEventDirector(authHeader);
    const data = {
      category: body.category,
      inductionYear: body.induction_year,
      name: body.name,
      state: body.state || null,
      teamAffiliation: body.team_affiliation || null,
      location: body.location || null,
      bio: body.bio || null,
      imageUrl: body.image_url || null,
    };
    return this.hallOfFameService.create(data, user.id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @Headers('authorization') authHeader?: string,
  ) {
    const { user } = await this.requireAdminOrEventDirector(authHeader);
    const data: any = {};
    if (body.category !== undefined) data.category = body.category;
    if (body.induction_year !== undefined) data.inductionYear = body.induction_year;
    if (body.name !== undefined) data.name = body.name;
    if (body.state !== undefined) data.state = body.state;
    if (body.team_affiliation !== undefined) data.teamAffiliation = body.team_affiliation;
    if (body.location !== undefined) data.location = body.location;
    if (body.bio !== undefined) data.bio = body.bio;
    if (body.image_url !== undefined) data.imageUrl = body.image_url;
    return this.hallOfFameService.update(id, data, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    await this.requireAdminOrEventDirector(authHeader);
    return this.hallOfFameService.delete(id);
  }
}
