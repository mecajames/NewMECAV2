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
import { MembershipsService, CreateGuestMembershipDto, CreateUserMembershipDto } from './memberships.service';
import { Membership } from './memberships.entity';

@Controller('api/memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  /**
   * Create a membership for a guest (no user account)
   * Used for guest checkout flow
   */
  @Post('guest')
  @HttpCode(HttpStatus.CREATED)
  async createGuestMembership(@Body() data: CreateGuestMembershipDto): Promise<Membership> {
    return this.membershipsService.createGuestMembership(data);
  }

  /**
   * Create a membership for an existing user
   */
  @Post('user')
  @HttpCode(HttpStatus.CREATED)
  async createUserMembership(@Body() data: CreateUserMembershipDto): Promise<Membership> {
    return this.membershipsService.createUserMembership(data);
  }

  /**
   * Link orphan memberships to a user after they create an account
   */
  @Post('link-to-user')
  @HttpCode(HttpStatus.OK)
  async linkMembershipsToUser(
    @Body('email') email: string,
    @Body('userId') userId: string,
  ): Promise<Membership[]> {
    return this.membershipsService.linkMembershipsToUser(email, userId);
  }

  /**
   * Get memberships by email (for guest lookup)
   */
  @Get('email/:email')
  async getMembershipsByEmail(@Param('email') email: string): Promise<Membership[]> {
    return this.membershipsService.findByEmail(email);
  }

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
  async getUserActiveMembership(@Param('userId') userId: string): Promise<Membership | null> {
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
