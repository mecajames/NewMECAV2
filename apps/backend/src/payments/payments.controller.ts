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
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Payment } from './payments.entity';
import { Membership } from '../memberships/memberships.entity';
import { PaymentMethod, MembershipType, CreatePaymentDto, ProcessPaymentDto, RefundPaymentDto } from '@newmeca/shared';

@Controller('api/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':id')
  async getPayment(@Param('id') id: string): Promise<Payment> {
    return this.paymentsService.findById(id);
  }

  @Get('user/:userId')
  async getUserPayments(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<Payment[]> {
    return this.paymentsService.findByUser(userId, page, limit);
  }

  @Get('user/:userId/stats')
  async getUserPaymentStats(@Param('userId') userId: string): Promise<{
    totalPaid: number;
    totalRefunded: number;
    totalPending: number;
    paymentCount: number;
  }> {
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
  async createPayment(@Body() data: CreatePaymentDto): Promise<Payment> {
    return this.paymentsService.create(data);
  }

  @Post('membership')
  @HttpCode(HttpStatus.CREATED)
  async createMembershipPayment(
    @Body()
    data: {
      userId: string;
      membershipType: MembershipType;
      amount: number;
      paymentMethod: PaymentMethod;
      stripePaymentIntentId?: string;
      stripeCustomerId?: string;
      wordpressOrderId?: string;
      wordpressSubscriptionId?: string;
    },
  ): Promise<{ payment: Payment; membership: Membership }> {
    return this.paymentsService.createMembershipPayment(
      data.userId,
      data.membershipType,
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
    @Body()
    data: {
      wordpressOrderId: string;
      wordpressSubscriptionId?: string;
      userId: string;
      membershipType: MembershipType;
      amount: number;
      expirationDate: string;
      paidAt: string;
    },
  ): Promise<{ payment: Payment; membership: Membership }> {
    return this.paymentsService.syncWordpressPayment({
      wordpressOrderId: data.wordpressOrderId,
      wordpressSubscriptionId: data.wordpressSubscriptionId,
      userId: data.userId,
      membershipType: data.membershipType,
      amount: data.amount,
      expirationDate: new Date(data.expirationDate),
      paidAt: new Date(data.paidAt),
    });
  }

  @Put(':id/process')
  async processPayment(
    @Param('id') id: string,
    @Body() data: { transactionId?: string; paidAt?: string },
  ): Promise<Payment> {
    return this.paymentsService.processPayment({
      paymentId: id,
      transactionId: data.transactionId,
      paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
    });
  }

  @Put(':id/refund')
  async refundPayment(@Param('id') id: string, @Body() data: { reason: string }): Promise<Payment> {
    return this.paymentsService.refundPayment({
      paymentId: id,
      reason: data.reason,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePayment(@Param('id') id: string): Promise<void> {
    return this.paymentsService.delete(id);
  }
}
