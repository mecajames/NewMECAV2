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
  Request,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { AuthGuard, PermissionGuard } from '../auth';

@Controller('api/teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  async list() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.teamsService.findById(id);
  }

  @Get(':id/members')
  async getMembers(@Param('id') id: string) {
    return this.teamsService.getTeamMembers(id);
  }

  @Get('owner/:ownerId')
  async getByOwner(@Param('ownerId') ownerId: string) {
    return this.teamsService.findByOwner(ownerId);
  }

  @Get('user/:userId/teams')
  async getUserTeams(@Param('userId') userId: string) {
    return this.teamsService.getUserTeams(userId);
  }

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() data: any) {
    const userId = req.user.id;
    return this.teamsService.create(userId, data);
  }

  @Put(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  async update(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    const userId = req.user.id;
    return this.teamsService.update(id, userId, data);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    await this.teamsService.delete(id, userId);
  }

  @Post(':id/members')
  @UseGuards(AuthGuard, PermissionGuard)
  async addMember(@Param('id') id: string, @Body() { memberId, role }: any) {
    return this.teamsService.addMember(id, memberId, role);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(AuthGuard, PermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(@Request() req: any, @Param('id') id: string, @Param('memberId') memberId: string) {
    const userId = req.user.id;
    await this.teamsService.removeMember(id, memberId, userId);
  }

  @Put(':id/members/:memberId/role')
  @UseGuards(AuthGuard, PermissionGuard)
  async updateMemberRole(
    @Request() req: any,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() { role }: any,
  ) {
    const userId = req.user.id;
    return this.teamsService.updateMemberRole(id, memberId, userId, role);
  }
}
