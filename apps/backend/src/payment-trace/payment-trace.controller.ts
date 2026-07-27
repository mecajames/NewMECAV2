import {
  Controller,
  Get,
  Query,
  Headers,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { PaymentTraceService } from './payment-trace.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';

@Controller('api/billing/trace')
export class PaymentTraceController {
  constructor(
    private readonly paymentTraceService: PaymentTraceService,
    private readonly supabaseAdmin: SupabaseAdminService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  private async requireAdmin(authHeader?: string): Promise<void> {
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
    if (!isAdminUser(profile)) {
      throw new ForbiddenException('Admin access required');
    }
  }

  /**
   * Trace any payment identifier (pi_/ch_/sub_/cus_/in_/re_, PayPal I-..., our
   * invoice/order number, MECA ID, or email) across Stripe and the local
   * ledger. Built for chargebacks that arrive with nothing but a gateway id.
   */
  @Get()
  async trace(
    @Headers('authorization') authHeader: string,
    @Query('q') q: string,
  ) {
    await this.requireAdmin(authHeader);
    const query = (q || '').trim();
    if (query.length < 3) {
      throw new BadRequestException('Enter at least 3 characters to trace (e.g. pi_..., ch_..., sub_..., cus_..., an email, or a MECA ID)');
    }
    return this.paymentTraceService.trace(query);
  }
}
