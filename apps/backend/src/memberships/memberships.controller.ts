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
import { MembershipsService } from './memberships.service';
import { Membership } from './memberships.entity';
import { MembershipType } from '../types/enums';

@Controller('api/memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  async listMemberships(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.membershipsService.findAll(pageNum, limitNum);
  }

  @Get('user/:userId')
  async getMembershipsByUser(@Param('userId') userId: string) {
    return this.membershipsService.findByUser(userId);
  }

  @Get('user/:userId/active')
  async getActiveMembership(@Param('userId') userId: string) {
    const membership = await this.membershipsService.getActiveMembership(userId);

    if (!membership) {
      throw new NotFoundException(`No active membership found for user ${userId}`);
    }

    return membership;
  }

  @Post('user/:userId/renew')
  @HttpCode(HttpStatus.CREATED)
  async renewMembership(
    @Param('userId') userId: string,
    @Body('membershipType') membershipType: MembershipType,
  ) {
    return this.membershipsService.renewMembership(userId, membershipType);
  }

  @Get(':id')
  async getMembership(@Param('id') id: string) {
    const membership = await this.membershipsService.findById(id);

    if (!membership) {
      throw new NotFoundException(`Membership with ID ${id} not found`);
    }

    return membership;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createMembership(@Body() data: Partial<Membership>) {
    return this.membershipsService.create(data);
  }

  @Put(':id')
  async updateMembership(
    @Param('id') id: string,
    @Body() data: Partial<Membership>,
  ) {
    return this.membershipsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMembership(@Param('id') id: string) {
    await this.membershipsService.delete(id);
  }
}
