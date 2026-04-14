import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { EntityManager, wrap } from '@mikro-orm/core';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { isAdminUser } from '../auth/is-admin.helper';
import { Profile } from '../profiles/profiles.entity';
import { CouponsService } from './coupons.service';

@Controller('api/coupons')
export class CouponsController {
  constructor(
    private readonly couponsService: CouponsService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // The global auth guard attaches request.user for non-@Public() routes.
  // This helper loads the profile and checks admin role.
  private async requireAdmin(req: Request) {
    const authUser = (req as any).user;
    if (!authUser?.id) {
      throw new ForbiddenException('Authentication required');
    }
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: authUser.id });
    if (!isAdminUser(profile)) {
      throw new ForbiddenException('Admin access required');
    }
    return { userId: authUser.id, profile };
  }

  // ── Admin Endpoints ──────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCoupon(@Req() req: Request, @Body() data: any) {
    const { userId } = await this.requireAdmin(req);
    return this.couponsService.create(data, userId);
  }

  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  async createBatch(
    @Req() req: Request,
    @Body() data: { quantity: number; coupon: any },
  ) {
    const { userId } = await this.requireAdmin(req);
    const coupons = await this.couponsService.createBatch(data.coupon, data.quantity, userId);
    return { created: coupons.length, coupons };
  }

  @Get()
  async listCoupons(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('scope') scope?: string,
    @Query('search') search?: string,
  ) {
    await this.requireAdmin(req);
    return this.couponsService.findAll({ status, scope, search });
  }

  @Get(':id')
  async getCoupon(@Req() req: Request, @Param('id') id: string) {
    await this.requireAdmin(req);
    const coupon = await this.couponsService.findById(id);
    const stats = await this.couponsService.getUsageStats(id);
    return { ...wrap(coupon).toObject(), ...stats };
  }

  @Put(':id')
  async updateCoupon(@Req() req: Request, @Param('id') id: string, @Body() data: any) {
    await this.requireAdmin(req);
    return this.couponsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateCoupon(@Req() req: Request, @Param('id') id: string) {
    await this.requireAdmin(req);
    await this.couponsService.deactivate(id);
  }

  @Get(':id/usages')
  async getUsages(@Req() req: Request, @Param('id') id: string) {
    await this.requireAdmin(req);
    return this.couponsService.getUsages(id);
  }

  @Post('generate-preview')
  async generatePreview(
    @Req() req: Request,
    @Body() data: { prefix?: string; suffix?: string; length?: number },
  ) {
    await this.requireAdmin(req);
    const code = this.couponsService.generatePreview(data.prefix, data.suffix, data.length || 8);
    return { code };
  }

  // ── Public Endpoints ─────────────────────────────────────────────────────

  @Public()
  @Post('validate')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @HttpCode(HttpStatus.OK)
  async validateCoupon(
    @Body() data: {
      code: string;
      scope: 'membership' | 'shop' | 'all';
      subtotal: number;
      productIds?: string[];
      membershipTypeConfigId?: string;
      userId?: string;
      email?: string;
    },
  ) {
    return this.couponsService.validateCoupon(data.code, {
      scope: data.scope,
      subtotal: data.subtotal,
      productIds: data.productIds,
      membershipTypeConfigId: data.membershipTypeConfigId,
      userId: data.userId,
      email: data.email,
    });
  }
}
