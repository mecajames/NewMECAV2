import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { Membership } from './memberships.entity';

@Controller('api/memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get(':id')
  async getMembership(@Param('id') id: string): Promise<Membership> {
    return this.membershipsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createMembership(@Body() data: Partial<Membership>): Promise<Membership> {
    return this.membershipsService.create(data);
  }

  @Put(':id')
  async updateMembership(
    @Param('id') id: string,
    @Body() data: Partial<Membership>,
  ): Promise<Membership> {
    return this.membershipsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMembership(@Param('id') id: string): Promise<void> {
    return this.membershipsService.delete(id);
  }

  @Get('user/:userId/active')
  async getUserActiveMembership(@Param('userId') userId: string): Promise<Membership> {
    return this.membershipsService.getActiveMembership(userId);
  }

  @Post('user/:userId/renew')
  async renewMembership(
    @Param('userId') userId: string,
    @Body('membershipType') membershipType: string,
  ): Promise<Membership> {
    return this.membershipsService.renewMembership(userId, membershipType);
  }
}
