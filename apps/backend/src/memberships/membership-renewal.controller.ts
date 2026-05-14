import { Body, Controller, Get, Post, HttpCode, HttpStatus, Param, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { MembershipRenewalTokenService } from './membership-renewal-token.service';
import { MecaIdService } from './meca-id.service';
import { MembershipsService } from './memberships.service';
import { StripeService } from '../stripe/stripe.service';
import { TaxService } from '../tax/tax.service';
import { PayPalService } from '../paypal/paypal.service';
import { PayPalPaymentType } from '@newmeca/shared';

/**
 * Public, token-gated endpoints used by the post-expiry renewal flow.
 *
 * The renewal email contains `/renew/:token`. The frontend page validates
 * the token, displays the renewing member's info, and lets them pay via
 * embedded Stripe Elements — all WITHOUT requiring a login. The expired
 * member literally cannot log in (ActiveMembershipGuard blocks them), so
 * the token is the only credential for the entire renewal flow.
 *
 * The actual membership creation runs in `payment_intent.succeeded`
 * webhook → `PaymentFulfillmentService.fulfillMembershipPayment()`, which
 * calls `MembershipsService.createMembership()`. That flow already applies
 * the A1 date math, MECA ID grace tier logic, and 999999 → real-ID
 * result back-fill. The renewal token is marked `used_at` inside that
 * fulfillment when `metadata.renewalTokenId` is present.
 */
@Controller('api/memberships/renew')
export class MembershipRenewalController {
  constructor(
    private readonly tokenService: MembershipRenewalTokenService,
    private readonly mecaIdService: MecaIdService,
    private readonly membershipsService: MembershipsService,
    @Inject(forwardRef(() => StripeService))
    private readonly stripeService: StripeService,
    private readonly taxService: TaxService,
    @Inject(forwardRef(() => PayPalService))
    private readonly paypalService: PayPalService,
  ) {}

  @Public()
  @Get('token/:token')
  async lookupByToken(@Param('token') token: string) {
    const { row, membership, user } = await this.tokenService.validateToken(token);
    const eligibility = this.mecaIdService.checkReactivationEligibility(membership);
    const config = membership.membershipTypeConfig;
    const price = Number(config?.price ?? 0);
    const tax = await this.taxService.calculateTax(price);

    return {
      token: row.token,
      tokenExpiresAt: row.expiresAt,
      member: {
        firstName: user.first_name ?? null,
        lastName: user.last_name ?? null,
        email: user.email ?? null,
        mecaId: membership.mecaId ?? null,
      },
      membership: {
        id: membership.id,
        typeName: config?.name ?? 'Membership',
        category: config?.category ?? null,
        endDate: membership.endDate,
      },
      pricing: {
        price,
        taxAmount: Number(tax.taxAmount ?? 0),
        taxRate: Number(tax.taxRate ?? 0),
        total: Number((price + (tax.taxAmount ?? 0)).toFixed(2)),
        currency: config?.currency ?? 'usd',
      },
      billing: {
        firstName: membership.billingFirstName ?? null,
        lastName: membership.billingLastName ?? null,
        phone: membership.billingPhone ?? null,
        address: membership.billingAddress ?? null,
        city: membership.billingCity ?? null,
        state: membership.billingState ?? null,
        postalCode: membership.billingPostalCode ?? null,
        country: membership.billingCountry ?? null,
      },
      mecaIdGrace: {
        tier: eligibility.tier,
        daysRemaining: eligibility.daysRemaining,
        canKeepId: eligibility.canSelfReclaim,
      },
    };
  }

  /**
   * Token-gated Stripe PaymentIntent creation for the renewal flow.
   *
   * Body (all optional — fall back to the prior membership's stored billing):
   *   {
   *     billing?: { firstName, lastName, phone, address, city, state, postalCode, country }
   *   }
   *
   * Returns: { clientSecret, paymentIntentId, amount, currency }
   */
  @Public()
  @Post('token/:token/payment-intent')
  @HttpCode(HttpStatus.OK)
  async createRenewalPaymentIntent(
    @Param('token') token: string,
    @Body() body: {
      billing?: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
    },
  ) {
    const { row, membership, user } = await this.tokenService.validateToken(token);
    const config = membership.membershipTypeConfig;
    if (!config) {
      throw new BadRequestException('Membership type missing for renewal.');
    }
    if (!user.email) {
      throw new BadRequestException('Member has no email on file. Contact support to renew.');
    }

    const price = Number(config.price ?? 0);
    const tax = await this.taxService.calculateTax(price);
    const amountInCents = Math.round((price + (tax.taxAmount ?? 0)) * 100);

    // Merge submitted billing with what's on the prior membership so a
    // member who never updates billing still gets a valid payment.
    const b = body?.billing ?? {};
    const metadata: Record<string, string> = {
      paymentType: 'membership',
      email: user.email.toLowerCase(),
      userId: user.id,
      membershipTypeConfigId: config.id,
      membershipCategory: config.category,
      membershipPrice: price.toFixed(2),
      taxAmount: Number(tax.taxAmount ?? 0).toFixed(2),
      taxRate: String(tax.taxRate ?? 0),
      renewalTokenId: row.id,
      renewalTokenToken: row.token,
      // Pass through billing — payment-fulfillment.service reads these
      // when calling createMembership().
      billingFirstName: b.firstName ?? membership.billingFirstName ?? user.first_name ?? '',
      billingLastName: b.lastName ?? membership.billingLastName ?? user.last_name ?? '',
      billingPhone: b.phone ?? membership.billingPhone ?? '',
      billingAddress: b.address ?? membership.billingAddress ?? '',
      billingCity: b.city ?? membership.billingCity ?? '',
      billingState: b.state ?? membership.billingState ?? '',
      billingPostalCode: b.postalCode ?? membership.billingPostalCode ?? '',
      billingCountry: b.country ?? membership.billingCountry ?? 'USA',
      // Carry over competitor info from the prior membership so renewal
      // doesn't lose the vehicle and team association.
      competitorName: membership.competitorName ?? '',
      vehicleLicensePlate: membership.vehicleLicensePlate ?? '',
      vehicleColor: membership.vehicleColor ?? '',
      vehicleMake: membership.vehicleMake ?? '',
      vehicleModel: membership.vehicleModel ?? '',
      hasTeamAddon: String(!!membership.hasTeamAddon),
      teamName: membership.teamName ?? '',
      teamDescription: membership.teamDescription ?? '',
      businessName: membership.businessName ?? '',
      businessWebsite: membership.businessWebsite ?? '',
    };

    // Strip empty strings from metadata (Stripe limits + cleanliness)
    for (const k of Object.keys(metadata)) {
      if (metadata[k] === '' || metadata[k] == null) delete metadata[k];
    }

    const intent = await this.stripeService.createPaymentIntent({
      amount: amountInCents,
      currency: config.currency || 'usd',
      membershipTypeConfigId: config.id,
      membershipTypeName: config.name,
      email: user.email,
      metadata,
    });

    return {
      clientSecret: intent.clientSecret,
      paymentIntentId: intent.paymentIntentId,
      amount: amountInCents,
      currency: config.currency || 'usd',
    };
  }

  /**
   * Token-gated PayPal order creation for the renewal flow.
   *
   * Mirrors create-renewal-payment-intent for PayPal. The order's metadata
   * includes `renewalTokenId`; PayPal capture webhook → fulfillment service
   * picks it up exactly like the Stripe path and marks the token used.
   */
  @Public()
  @Post('token/:token/paypal-order')
  @HttpCode(HttpStatus.OK)
  async createRenewalPaypalOrder(
    @Param('token') token: string,
    @Body() body: {
      billing?: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
    },
  ): Promise<{ paypalOrderId: string }> {
    const { row, membership, user } = await this.tokenService.validateToken(token);
    const config = membership.membershipTypeConfig;
    if (!config) throw new BadRequestException('Membership type missing for renewal.');
    if (!user.email) throw new BadRequestException('Member has no email on file. Contact support to renew.');

    const price = Number(config.price ?? 0);
    const tax = await this.taxService.calculateTax(price);
    const totalAmount = price + (tax.taxAmount ?? 0);

    const b = body?.billing ?? {};
    const metadata: Record<string, string> = {
      paymentType: PayPalPaymentType.MEMBERSHIP,
      membershipTypeConfigId: config.id,
      membershipCategory: config.category,
      email: user.email.toLowerCase(),
      userId: user.id,
      taxAmount: Number(tax.taxAmount ?? 0).toFixed(2),
      taxRate: String(tax.taxRate ?? 0),
      renewalTokenId: row.id,
      renewalTokenToken: row.token,
      billingFirstName: b.firstName ?? membership.billingFirstName ?? user.first_name ?? '',
      billingLastName: b.lastName ?? membership.billingLastName ?? user.last_name ?? '',
      billingPhone: b.phone ?? membership.billingPhone ?? '',
      billingAddress: b.address ?? membership.billingAddress ?? '',
      billingCity: b.city ?? membership.billingCity ?? '',
      billingState: b.state ?? membership.billingState ?? '',
      billingPostalCode: b.postalCode ?? membership.billingPostalCode ?? '',
      billingCountry: b.country ?? membership.billingCountry ?? 'USA',
      competitorName: membership.competitorName ?? '',
      vehicleLicensePlate: membership.vehicleLicensePlate ?? '',
      vehicleColor: membership.vehicleColor ?? '',
      vehicleMake: membership.vehicleMake ?? '',
      vehicleModel: membership.vehicleModel ?? '',
      hasTeamAddon: String(!!membership.hasTeamAddon),
      teamName: membership.teamName ?? '',
      teamDescription: membership.teamDescription ?? '',
      businessName: membership.businessName ?? '',
      businessWebsite: membership.businessWebsite ?? '',
    };
    for (const k of Object.keys(metadata)) {
      if (metadata[k] === '' || metadata[k] == null) delete metadata[k];
    }

    const order = await this.paypalService.createOrder({
      amount: totalAmount,
      currency: config.currency || 'usd',
      description: `MECA Renewal: ${config.name}`,
      metadata,
    });

    return { paypalOrderId: order.id };
  }
}
