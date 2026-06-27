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
  Inject,
  forwardRef,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { PaymentsService } from './payments.service';
import { PaymentFulfillmentService } from './payment-fulfillment.service';
import { Payment } from './payments.entity';
import { Membership } from '../memberships/memberships.entity';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';
import { PaymentMethod, CreatePaymentDto, UserRole } from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';

@Controller('api/payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    @Inject(forwardRef(() => PaymentFulfillmentService))
    private readonly fulfillment: PaymentFulfillmentService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  // Helper to get authenticated user from token
  private async getAuthenticatedUser(authHeader?: string) {
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
    return { user, profile };
  }

  // Helper to require admin OR owner access
  private async requireAdminOrOwner(authHeader: string | undefined, targetUserId: string) {
    const { user, profile } = await this.getAuthenticatedUser(authHeader);

    if (isAdminUser(profile)) {
      return { user, profile, isAdmin: true };
    }

    if (user.id !== targetUserId) {
      throw new ForbiddenException('You can only access your own payment data');
    }

    return { user, profile, isAdmin: false };
  }

  // Helper to require admin authentication
  private async requireAdmin(authHeader?: string) {
    const { user, profile } = await this.getAuthenticatedUser(authHeader);

    if (!isAdminUser(profile)) {
      throw new ForbiddenException('Admin access required');
    }

    return { user, profile };
  }

  @Get(':id')
  async getPayment(@Param('id') id: string): Promise<Payment> {
    return this.paymentsService.findById(id);
  }

  @Get('user/:userId')
  async getUserPayments(
    @Headers('authorization') authHeader: string,
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<Payment[]> {
    await this.requireAdminOrOwner(authHeader, userId);
    return this.paymentsService.findByUser(userId, page, limit);
  }

  /**
   * Latest payment per membership for a member (admin/owner) — powers the
   * "last payment" quick info + order/invoice deep-links on the membership card.
   */
  @Get('user/:userId/latest-by-membership')
  async getLatestByMembership(
    @Headers('authorization') authHeader: string,
    @Param('userId') userId: string,
  ) {
    await this.requireAdminOrOwner(authHeader, userId);
    return this.paymentsService.getLatestPaymentByMembership(userId);
  }

  /**
   * OWNER-ONLY: reconstruct missing billing records (Payment / Order / Invoice)
   * for ONE member, so historical members (esp. subscription buyers) show their
   * orders/invoices/payments. ?dryRun=true (default) = no-write PREVIEW that
   * reports what would be created; ?dryRun=false = APPLY. Invoice emails are
   * suppressed. Idempotent — safe to re-run.
   */
  @Post('admin/backfill-member/:memberId')
  @HttpCode(HttpStatus.OK)
  async backfillMemberBilling(
    @Headers('authorization') authHeader: string,
    @Param('memberId') memberId: string,
    @Query('dryRun') dryRun?: string,
  ) {
    const { profile } = await this.requireAdmin(authHeader);
    if (String((profile as any)?.meca_id) !== '202401') {
      throw new ForbiddenException('Billing backfill is restricted to the system owner (MECA 202401).');
    }
    const isDryRun = dryRun !== 'false';
    return this.fulfillment.backfillMemberBilling(memberId, { dryRun: isDryRun });
  }

  /**
   * OWNER-ONLY (James, MECA 202401): GLOBAL billing backfill — reconstruct
   * missing Payment / Order / Invoice records across ALL members (esp.
   * historical subscription buyers). ?dryRun=true (default) reports counts of
   * what would be created; ?dryRun=false applies. Invoice emails suppressed.
   * Idempotent.
   */
  @Post('admin/backfill-all')
  @HttpCode(HttpStatus.OK)
  async backfillAllBilling(
    @Headers('authorization') authHeader: string,
    @Query('dryRun') dryRun?: string,
  ) {
    const { profile } = await this.requireAdmin(authHeader);
    if (String((profile as any)?.meca_id) !== '202401') {
      throw new ForbiddenException('Billing backfill is restricted to the system owner (MECA 202401).');
    }
    const isDryRun = dryRun !== 'false';
    return this.fulfillment.backfillAllBilling({ dryRun: isDryRun });
  }

  @Get('user/:userId/stats')
  async getUserPaymentStats(
    @Headers('authorization') authHeader: string,
    @Param('userId') userId: string,
  ): Promise<{
    totalPaid: number;
    totalRefunded: number;
    totalPending: number;
    paymentCount: number;
  }> {
    await this.requireAdminOrOwner(authHeader, userId);
    return this.paymentsService.getPaymentStats(userId);
  }

  @Get('membership/:membershipId')
  async getMembershipPayments(@Param('membershipId') membershipId: string): Promise<Payment[]> {
    return this.paymentsService.findByMembership(membershipId);
  }

  @Get('transaction/:transactionId')
  async getPaymentByTransactionId(@Param('transactionId') transactionId: string): Promise<Payment | null> {
    return this.paymentsService.findByTransactionId(transactionId);
  }

  @Get('stripe/payment-intent/:paymentIntentId')
  async getPaymentByStripeIntent(@Param('paymentIntentId') paymentIntentId: string): Promise<Payment | null> {
    return this.paymentsService.findByStripePaymentIntent(paymentIntentId);
  }

  @Get('wordpress/order/:orderId')
  async getPaymentByWordpressOrder(@Param('orderId') orderId: string): Promise<Payment | null> {
    return this.paymentsService.findByWordpressOrderId(orderId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPayment(
    @Headers('authorization') authHeader: string,
    @Body() data: CreatePaymentDto,
  ): Promise<Payment> {
    await this.requireAdmin(authHeader);
    return this.paymentsService.create(data);
  }

  @Post('membership')
  @HttpCode(HttpStatus.CREATED)
  async createMembershipPayment(
    @Headers('authorization') authHeader: string,
    @Body()
    data: {
      userId: string;
      membershipTypeConfigId: string;
      amount: number;
      paymentMethod: PaymentMethod;
      stripePaymentIntentId?: string;
      stripeCustomerId?: string;
      wordpressOrderId?: string;
      wordpressSubscriptionId?: string;
    },
  ): Promise<{ payment: Payment; membership: Membership }> {
    await this.requireAdmin(authHeader);
    return this.paymentsService.createMembershipPayment(
      data.userId,
      data.membershipTypeConfigId,
      data.amount,
      data.paymentMethod,
      {
        stripePaymentIntentId: data.stripePaymentIntentId,
        stripeCustomerId: data.stripeCustomerId,
        wordpressOrderId: data.wordpressOrderId,
        wordpressSubscriptionId: data.wordpressSubscriptionId,
      },
    );
  }

  @Post('wordpress/sync')
  @HttpCode(HttpStatus.CREATED)
  async syncWordpressPayment(
    @Headers('authorization') authHeader: string,
    @Body()
    data: {
      wordpressOrderId: string;
      wordpressSubscriptionId?: string;
      userId: string;
      membershipTypeConfigId: string;
      amount: number;
      expirationDate: string;
      paidAt: string;
    },
  ): Promise<{ payment: Payment; membership: Membership }> {
    await this.requireAdmin(authHeader);
    return this.paymentsService.syncWordpressPayment({
      wordpressOrderId: data.wordpressOrderId,
      wordpressSubscriptionId: data.wordpressSubscriptionId,
      userId: data.userId,
      membershipTypeConfigId: data.membershipTypeConfigId,
      amount: data.amount,
      expirationDate: new Date(data.expirationDate),
      paidAt: new Date(data.paidAt),
    });
  }

  @Put(':id/process')
  async processPayment(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: { transactionId?: string; paidAt?: string },
  ): Promise<Payment> {
    await this.requireAdmin(authHeader);
    return this.paymentsService.processPayment({
      paymentId: id,
      transactionId: data.transactionId,
      paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
    });
  }

  @Put(':id/refund')
  async refundPayment(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: { reason: string },
  ): Promise<Payment> {
    await this.requireAdmin(authHeader);
    return this.paymentsService.refundPayment({
      paymentId: id,
      reason: data.reason,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePayment(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.requireAdmin(authHeader);
    return this.paymentsService.delete(id);
  }
}
