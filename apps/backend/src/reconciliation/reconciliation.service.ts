import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/core';
import { PaymentStatus, RefundGateway } from '@newmeca/shared';
import { EmailService } from '../email/email.service';
import { StripeService } from '../stripe/stripe.service';
import { PayPalService } from '../paypal/paypal.service';
import { Profile } from '../profiles/profiles.entity';
import { Payment } from '../payments/payments.entity';
import { Refund } from '../payments/refund.entity';
import { SiteSettings } from '../site-settings/site-settings.entity';
import { adminRecipientWhere } from '../auth/is-admin.helper';

export type ReconSeverity = 'info' | 'warning' | 'critical';

export interface ReconCheck {
  key: string;
  label: string;
  description: string;
  severity: ReconSeverity;
  count: number;
  /** A capped sample of offending rows for the admin dashboard. */
  sample: Array<Record<string, any>>;
}

export interface ReconciliationReport {
  generatedAt: string;
  windowDays: number;
  totalIssues: number;
  criticalIssues: number;
  checks: ReconCheck[];
}

const REPORT_KEY = 'reconciliation_last_report';
const LIVE_REPORT_KEY = 'reconciliation_live_last_report';
const ALERT_MARKER_KEY = 'reconciliation_last_alert_date';
const LIVE_ALERT_MARKER_KEY = 'reconciliation_live_last_alert_date';
const SAMPLE_LIMIT = 25;
// Cap per-record live verify calls so a busy window can't fan out unbounded
// gateway API calls. If exceeded, the report says so (no silent truncation).
const LIVE_VERIFY_CAP = 200;

/**
 * Nightly billing reconciliation. Runs DB-internal consistency checks across the
 * four ledgers (orders / invoices / payments / refunds + the source tables) and
 * surfaces gateway webhook-processing errors, so money discrepancies are caught
 * instead of silently accumulating. No external gateway calls — fast, rate-limit
 * free, safe to run often. Stores the latest report for the admin dashboard and
 * emails admins (once/day, idempotent) when a CRITICAL discrepancy appears.
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly emailService: EmailService,
    @Inject(forwardRef(() => StripeService))
    private readonly stripeService: StripeService,
    @Inject(forwardRef(() => PayPalService))
    private readonly paypalService: PayPalService,
  ) {}

  /** Nightly at 6 AM Eastern — pinned TZ so every instance agrees on the time. */
  @Cron('0 6 * * *', { name: 'nightly-billing-reconciliation', timeZone: 'America/New_York' })
  async nightlyReconciliation(): Promise<void> {
    this.logger.log('Running nightly billing reconciliation...');
    try {
      const report = await this.runReconciliation(30);
      await this.storeReport(report);
      this.logger.log(
        `Reconciliation complete: ${report.totalIssues} issue(s), ${report.criticalIssues} critical.`,
      );
      if (report.criticalIssues > 0) {
        await this.maybeAlertAdmins(report);
      }
    } catch (err) {
      this.logger.error(`Nightly reconciliation failed: ${err}`);
    }
  }

  /**
   * Daily LIVE reconciliation at 7 AM Eastern — verifies the local ledger against
   * the real Stripe/PayPal accounts (catches money that never reached the DB).
   * Runs after the internal pass and after PayPal's ~3h data lag clears the prior
   * day. Read-only; report-only. Degrades cleanly when a gateway is unconfigured.
   */
  @Cron('0 7 * * *', { name: 'daily-live-reconciliation', timeZone: 'America/New_York' })
  async dailyLiveReconciliation(): Promise<void> {
    this.logger.log('Running daily LIVE gateway reconciliation...');
    try {
      const report = await this.runLiveReconciliation(7);
      await this.storeReport(report, LIVE_REPORT_KEY);
      this.logger.log(
        `Live reconciliation complete: ${report.totalIssues} issue(s), ${report.criticalIssues} critical.`,
      );
      if (report.criticalIssues > 0) {
        await this.maybeAlertAdmins(report, {
          markerKey: LIVE_ALERT_MARKER_KEY,
          subjectPrefix: 'MECA Gateway Reconciliation',
          heading: 'Gateway reconciliation found critical discrepancies',
        });
      }
    } catch (err) {
      this.logger.error(`Daily live reconciliation failed: ${err}`);
    }
  }

  /**
   * Run every consistency check over the trailing `windowDays` and return a
   * structured report. Each check is independent — one failing query degrades to
   * an error-marked check rather than aborting the whole run.
   */
  async runReconciliation(windowDays = 30): Promise<ReconciliationReport> {
    const conn = this.em.getConnection();
    const since = new Date(Date.now() - windowDays * 86400000);

    const checkDefs: Array<{
      key: string;
      label: string;
      description: string;
      severity: ReconSeverity;
      sql: string;
      params: any[];
    }> = [
      {
        key: 'stripe_webhook_errors',
        label: 'Stripe webhook processing errors',
        description: 'Stripe webhook events that failed to process (money may not have been recorded).',
        severity: 'warning',
        sql: `
          SELECT stripe_event_id, event_type, payment_intent_id, error_message, processed_at
          FROM processed_webhook_events
          WHERE processed_at >= ?
            AND (processing_result = 'error' OR error_message IS NOT NULL)
          ORDER BY processed_at DESC
          LIMIT ${SAMPLE_LIMIT}
        `,
        params: [since],
      },
      {
        key: 'paypal_webhook_errors',
        label: 'PayPal webhook processing errors',
        description: 'PayPal webhook events that failed to process.',
        severity: 'warning',
        sql: `
          SELECT paypal_event_id, event_type, paypal_order_id, error_message, processed_at
          FROM processed_paypal_webhooks
          WHERE processed_at >= ?
            AND (processing_result = 'error' OR error_message IS NOT NULL)
          ORDER BY processed_at DESC
          LIMIT ${SAMPLE_LIMIT}
        `,
        params: [since],
      },
      {
        key: 'completed_orders_without_payment',
        label: 'Completed orders with no payment record',
        description: 'Orders marked completed that have no linked Payment ledger row — the money trail is missing.',
        severity: 'warning',
        sql: `
          SELECT o.id, o.order_number, o.order_type, o.total, o.created_at
          FROM orders o
          WHERE o.status = 'completed'
            AND o.created_at >= ?
            AND o.payment_id IS NULL
            AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id)
          ORDER BY o.created_at DESC
          LIMIT ${SAMPLE_LIMIT}
        `,
        params: [since],
      },
      {
        key: 'paid_payments_without_order',
        label: 'Paid non-membership payments with no order',
        description: 'Captured payments (shop/event) not linked to any Order — invisible in the Orders ledger. Membership renewals are excluded (legitimately order-less).',
        severity: 'warning',
        sql: `
          SELECT p.id, p.payment_type, p.payment_method, p.amount, p.stripe_payment_intent_id, p.paypal_capture_id, p.created_at
          FROM payments p
          WHERE p.created_at >= ?
            AND p.payment_status = 'paid'
            AND p.order_id IS NULL
            AND p.payment_type <> 'membership'
          ORDER BY p.created_at DESC
          LIMIT ${SAMPLE_LIMIT}
        `,
        params: [since],
      },
      {
        key: 'refund_total_mismatch',
        label: 'Refund total mismatches',
        description: 'Payments whose amount_refunded does not equal the sum of their refund ledger rows — the refund records disagree on how much was returned.',
        severity: 'critical',
        sql: `
          SELECT p.id, p.amount, p.amount_refunded,
                 COALESCE((SELECT SUM(r.amount) FROM refunds r WHERE r.payment_id = p.id), 0) AS refunds_sum,
                 p.created_at
          FROM payments p
          WHERE p.created_at >= ?
            AND COALESCE(p.amount_refunded, 0) <> COALESCE((SELECT SUM(r.amount) FROM refunds r WHERE r.payment_id = p.id), 0)
          ORDER BY p.created_at DESC
          LIMIT ${SAMPLE_LIMIT}
        `,
        params: [since],
      },
      {
        key: 'paid_membership_without_payment',
        label: 'Paid memberships with no payment record',
        description: 'Memberships marked paid (with a non-zero amount) that have no Payment ledger row and no Stripe payment intent — the money cannot be reconciled.',
        severity: 'warning',
        sql: `
          SELECT m.id, m.amount_paid, m.payment_status, m.created_at
          FROM memberships m
          WHERE m.created_at >= ?
            AND m.payment_status = 'paid'
            AND COALESCE(m.amount_paid, 0) > 0
            AND m.stripe_payment_intent_id IS NULL
            AND m.paypal_capture_id IS NULL
            AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.membership_id = m.id)
          ORDER BY m.created_at DESC
          LIMIT ${SAMPLE_LIMIT}
        `,
        params: [since],
      },
      {
        key: 'order_refund_status_drift',
        label: 'Order/payment refund-status drift',
        description: 'Orders flagged refunded whose payment is not refunded, or fully-refunded payments whose order is still completed.',
        severity: 'warning',
        sql: `
          SELECT o.id, o.order_number, o.status AS order_status, p.payment_status, p.amount, p.amount_refunded, o.created_at
          FROM orders o
          JOIN payments p ON (p.order_id = o.id OR p.id = o.payment_id)
          WHERE o.created_at >= ?
            AND (
              (o.status = 'refunded' AND p.payment_status <> 'refunded')
              OR (p.payment_status = 'refunded' AND o.status = 'completed')
            )
          ORDER BY o.created_at DESC
          LIMIT ${SAMPLE_LIMIT}
        `,
        params: [since],
      },
    ];

    const checks: ReconCheck[] = [];
    for (const def of checkDefs) {
      try {
        const rows = await conn.execute<Array<Record<string, any>>>(def.sql, def.params);
        checks.push({
          key: def.key,
          label: def.label,
          description: def.description,
          severity: def.severity,
          // Sample is capped by the LIMIT; count reflects what we surfaced. (For a
          // capped check, the dashboard's "run" can widen the window if needed.)
          count: rows.length,
          sample: rows,
        });
      } catch (err) {
        this.logger.error(`Reconciliation check ${def.key} failed: ${err}`);
        checks.push({
          key: def.key,
          label: def.label,
          description: def.description,
          severity: def.severity,
          count: 0,
          sample: [{ error: String(err) }],
        });
      }
    }

    const totalIssues = checks.reduce((n, c) => n + c.count, 0);
    const criticalIssues = checks
      .filter((c) => c.severity === 'critical')
      .reduce((n, c) => n + c.count, 0);

    return {
      generatedAt: new Date().toISOString(),
      windowDays,
      totalIssues,
      criticalIssues,
      checks,
    };
  }

  // ===========================================================================
  // LIVE reconciliation — gateway is the source of truth
  // ===========================================================================

  private mkCheck(
    key: string,
    label: string,
    description: string,
    severity: ReconSeverity,
    rows: Array<Record<string, any>>,
    countOverride?: number,
  ): ReconCheck {
    return {
      key,
      label,
      description,
      severity,
      count: countOverride ?? rows.length,
      sample: rows.slice(0, SAMPLE_LIMIT),
    };
  }

  /**
   * LIVE reconciliation: pull the real Stripe/PayPal records for the window and
   * diff against the local ledger in both directions (gateway→DB orphans and
   * DB→gateway verification). Read-only / report-only. Each gateway degrades to
   * an explanatory "unavailable" check rather than crashing when its keys/feature
   * are missing — so the dashboard never shows a false "clean".
   */
  async runLiveReconciliation(windowDays = 7): Promise<ReconciliationReport> {
    const nowMs = Date.now();
    const sinceMs = nowMs - Math.min(windowDays, 31) * 86400000;
    const since = new Date(sinceMs);
    const sinceUnix = Math.floor(sinceMs / 1000);
    const untilUnix = Math.floor(nowMs / 1000);

    const em = this.em.fork();
    const localPayments = await em.find(
      Payment,
      { createdAt: { $gte: since } },
      { fields: ['stripePaymentIntentId', 'paypalCaptureId', 'transactionId', 'paymentStatus', 'amount', 'amountRefunded', 'createdAt'] as any },
    );
    const localRefunds = await em.find(
      Refund,
      { createdAt: { $gte: since } },
      { fields: ['gateway', 'gatewayRefundId', 'amount', 'status', 'createdAt'] as any },
    );

    const checks: ReconCheck[] = [];
    try {
      checks.push(...(await this.stripeLiveChecks(localPayments, localRefunds, sinceUnix, untilUnix)));
    } catch (err) {
      this.logger.error(`Stripe live checks failed: ${err}`);
      checks.push(this.mkCheck('live_stripe_error', 'Stripe live checks errored', String(err), 'warning', [{ error: String(err) }], 0));
    }
    try {
      checks.push(...(await this.paypalLiveChecks(localPayments, localRefunds, since, new Date(nowMs))));
    } catch (err) {
      this.logger.error(`PayPal live checks failed: ${err}`);
      checks.push(this.mkCheck('live_paypal_error', 'PayPal live checks errored', String(err), 'warning', [{ error: String(err) }], 0));
    }

    const totalIssues = checks.reduce((n, c) => n + c.count, 0);
    const criticalIssues = checks.filter((c) => c.severity === 'critical').reduce((n, c) => n + c.count, 0);

    return { generatedAt: new Date().toISOString(), windowDays: Math.min(windowDays, 31), totalIssues, criticalIssues, checks };
  }

  private cents(v: any): number {
    return Math.round(parseFloat(String(v ?? '0')) * 100);
  }

  private async stripeLiveChecks(
    localPayments: Payment[],
    localRefunds: Refund[],
    sinceUnix: number,
    untilUnix: number,
  ): Promise<ReconCheck[]> {
    const chargesRes = await this.stripeService.listChargesInWindow(sinceUnix, untilUnix);
    if (!chargesRes.available) {
      return [
        this.mkCheck(
          'live_stripe_unavailable',
          'Stripe live reconciliation skipped',
          'Stripe is not configured or its API was unavailable, so gateway verification of Stripe payments was skipped this run.',
          'info',
          [{ note: 'Stripe API unavailable — configure STRIPE_SECRET_KEY or check connectivity.' }],
          0,
        ),
      ];
    }
    const refundsRes = await this.stripeService.listRefundsInWindow(sinceUnix, untilUnix);

    // Local Stripe index.
    const localStripeIds = new Set<string>();
    const localByPi = new Map<string, Payment>();
    for (const p of localPayments) {
      if (p.stripePaymentIntentId) {
        localStripeIds.add(p.stripePaymentIntentId);
        localByPi.set(p.stripePaymentIntentId, p);
      }
      if (p.transactionId && p.transactionId.startsWith('pi_')) localStripeIds.add(p.transactionId);
    }
    const chargeByPi = new Map(chargesRes.charges.filter((c) => c.paymentIntentId).map((c) => [c.paymentIntentId as string, c]));

    const out: ReconCheck[] = [];

    // 1. Gateway→DB: succeeded charge with no local payment.
    const orphans = chargesRes.charges
      .filter((c) => c.status === 'succeeded' && (!c.paymentIntentId || !localStripeIds.has(c.paymentIntentId)))
      .map((c) => ({ chargeId: c.id, paymentIntentId: c.paymentIntentId, amount: (c.amountCents / 100).toFixed(2), created: new Date(c.created * 1000).toISOString() }));
    out.push(this.mkCheck('live_stripe_unrecorded_charges', 'Stripe charges with no local payment',
      'Succeeded Stripe charges in the window that have NO matching local payment row — money collected the DB never recorded (likely a missed webhook).', 'critical', orphans));

    // 2. DB→Gateway: local paid payment whose charge is not succeeded.
    const drift = localPayments
      .filter((p) => p.paymentStatus === PaymentStatus.PAID && p.stripePaymentIntentId && chargeByPi.has(p.stripePaymentIntentId))
      .map((p) => ({ pi: p.stripePaymentIntentId, charge: chargeByPi.get(p.stripePaymentIntentId!)! }))
      .filter((x) => x.charge.status !== 'succeeded')
      .map((x) => ({ paymentIntentId: x.pi, stripeStatus: x.charge.status, localStatus: 'paid' }));
    out.push(this.mkCheck('live_stripe_paid_not_succeeded', 'Local "paid" but Stripe not succeeded',
      'Payments marked paid locally whose Stripe charge is not in a succeeded state — possible fake/over-stated revenue.', 'critical', drift));

    // 3. Amount mismatches.
    const mismatch = localPayments
      .filter((p) => p.stripePaymentIntentId && chargeByPi.has(p.stripePaymentIntentId))
      .map((p) => ({ p, c: chargeByPi.get(p.stripePaymentIntentId!)! }))
      .filter((x) => this.cents(x.p.amount) !== x.c.amountCents)
      .map((x) => ({ paymentIntentId: x.p.stripePaymentIntentId, localAmount: (this.cents(x.p.amount) / 100).toFixed(2), stripeAmount: (x.c.amountCents / 100).toFixed(2) }));
    out.push(this.mkCheck('live_stripe_amount_mismatch', 'Stripe amount mismatches',
      'Payments whose local amount differs from the Stripe charge amount.', 'warning', mismatch));

    // 4. Gateway→DB: succeeded refund with no local refund row.
    if (refundsRes.available) {
      const localStripeRefundIds = new Set(localRefunds.filter((r) => r.gateway === RefundGateway.STRIPE && r.gatewayRefundId).map((r) => r.gatewayRefundId as string));
      const orphanRefunds = refundsRes.refunds
        .filter((r) => r.status === 'succeeded' && !localStripeRefundIds.has(r.id))
        .map((r) => ({ refundId: r.id, paymentIntentId: r.paymentIntentId, amount: (r.amountCents / 100).toFixed(2), created: new Date(r.created * 1000).toISOString() }));
      out.push(this.mkCheck('live_stripe_unrecorded_refunds', 'Stripe refunds with no local record',
        'Refunds that succeeded at Stripe but have no local refund ledger row — money returned the DB never recorded.', 'warning', orphanRefunds));
    }

    if (chargesRes.capped || refundsRes.capped) {
      out.push(this.mkCheck('live_stripe_capped', 'Stripe result set was capped',
        'The Stripe list hit the page cap for this window — narrow the window for a complete pass.', 'info',
        [{ note: 'Some Stripe records were not pulled (page cap reached).' }], 0));
    }
    return out;
  }

  private async paypalLiveChecks(
    localPayments: Payment[],
    localRefunds: Refund[],
    since: Date,
    until: Date,
  ): Promise<ReconCheck[]> {
    const search = await this.paypalService.searchTransactions(since.toISOString(), until.toISOString());
    const out: ReconCheck[] = [];

    if (search.reason === 'not_configured') {
      return [
        this.mkCheck('live_paypal_unavailable', 'PayPal live reconciliation skipped',
          'PayPal is not configured, so gateway verification of PayPal payments was skipped this run.', 'info',
          [{ note: 'PayPal API unavailable — configure PAYPAL_CLIENT_ID.' }], 0),
      ];
    }

    const localCaptureSet = new Set(localPayments.map((p) => p.paypalCaptureId).filter(Boolean) as string[]);
    const paidPaypal = localPayments.filter((p) => p.paymentStatus === PaymentStatus.PAID && p.paypalCaptureId);

    if (search.available) {
      const gwCaptures = search.transactions.filter((t) => t.amountCents > 0 && t.status === 'S');
      const gwCaptureSet = new Set(gwCaptures.map((t) => t.captureId));

      // Gateway→DB orphans.
      const orphanCaps = gwCaptures
        .filter((t) => !localCaptureSet.has(t.captureId))
        .map((t) => ({ captureId: t.captureId, amount: (t.amountCents / 100).toFixed(2), date: t.date }));
      out.push(this.mkCheck('live_paypal_unrecorded_captures', 'PayPal captures with no local payment',
        'Successful PayPal captures in the window with NO matching local payment row — money collected the DB never recorded.', 'critical', orphanCaps));

      // DB→Gateway: local paid capture not present at the gateway (buffer past the ~3h lag).
      const lagCutoff = until.getTime() - 6 * 3600 * 1000;
      const notAtGw = paidPaypal
        .filter((p) => !gwCaptureSet.has(p.paypalCaptureId as string) && (p.createdAt?.getTime() ?? 0) < lagCutoff)
        .map((p) => ({ captureId: p.paypalCaptureId, localStatus: 'paid', created: p.createdAt?.toISOString() }));
      out.push(this.mkCheck('live_paypal_paid_not_found', 'Local "paid" PayPal not found at gateway',
        'Payments marked paid locally whose PayPal capture did not appear in the gateway transaction search for the window.', 'critical', notAtGw));

      if (search.capped) {
        out.push(this.mkCheck('live_paypal_capped', 'PayPal result set was capped',
          'PayPal Transaction Search hit the page cap for this window — narrow the window for a complete pass.', 'info',
          [{ note: 'Some PayPal records were not pulled (page cap reached).' }], 0));
      }
    } else {
      // Transaction Search unavailable → orphan discovery not possible; fall back
      // to per-record verification (bounded) for the DB→gateway direction.
      const reasonNote = search.reason === 'transaction_search_not_enabled'
        ? 'Enable the "Transaction Search" feature on the PayPal REST app to detect unrecorded PayPal captures (orphans).'
        : 'PayPal Transaction Search was unavailable this run; orphan discovery skipped.';
      out.push(this.mkCheck('live_paypal_search_unavailable', 'PayPal orphan discovery unavailable',
        reasonNote, 'warning', [{ note: reasonNote, reason: search.reason }], 0));

      const toVerify = paidPaypal.slice(0, LIVE_VERIFY_CAP);
      const bad: Array<Record<string, any>> = [];
      for (const p of toVerify) {
        const cap = await this.paypalService.getCapture(p.paypalCaptureId as string);
        if (cap && cap.status !== 'COMPLETED') bad.push({ captureId: p.paypalCaptureId, gatewayStatus: cap.status, localStatus: 'paid' });
      }
      out.push(this.mkCheck('live_paypal_paid_not_confirmed', 'Local "paid" PayPal not confirmed at gateway',
        'Payments marked paid locally whose PayPal capture is not COMPLETED at the gateway (per-record verify).', 'critical', bad));
      if (paidPaypal.length > LIVE_VERIFY_CAP) {
        out.push(this.mkCheck('live_paypal_verify_capped', 'PayPal verify was capped', '', 'info',
          [{ note: `Only the first ${LIVE_VERIFY_CAP} PayPal payments were verified this run.` }], 0));
      }
    }

    // Refund verification (per-record, bounded) — confirm recorded PayPal refunds
    // actually completed at the gateway (the "refund returned no money" class).
    const localPaypalRefunds = localRefunds.filter((r) => r.gateway === RefundGateway.PAYPAL && r.gatewayRefundId).slice(0, LIVE_VERIFY_CAP);
    const refundBad: Array<Record<string, any>> = [];
    for (const r of localPaypalRefunds) {
      const d = await this.paypalService.getRefundDetails(r.gatewayRefundId as string);
      if (d && d.status !== 'COMPLETED') refundBad.push({ refundId: r.gatewayRefundId, gatewayStatus: d.status, amount: r.amount });
    }
    out.push(this.mkCheck('live_paypal_refund_not_confirmed', 'PayPal refunds not confirmed at gateway',
      'Locally-recorded PayPal refunds whose gateway status is not COMPLETED — a refund the books show but the customer may not have received.', 'critical', refundBad));

    return out;
  }

  /** Read the most recently stored DB-internal (ledger) report. */
  async getLastReport(): Promise<ReconciliationReport | null> {
    return this.readReport(REPORT_KEY);
  }

  /** Read the most recently stored live (gateway) report. */
  async getLastLiveReport(): Promise<ReconciliationReport | null> {
    return this.readReport(LIVE_REPORT_KEY);
  }

  private async readReport(key: string): Promise<ReconciliationReport | null> {
    const em = this.em.fork();
    const row = await em.findOne(SiteSettings, { setting_key: key });
    if (!row?.setting_value) return null;
    try {
      return JSON.parse(row.setting_value) as ReconciliationReport;
    } catch {
      return null;
    }
  }

  private async storeReport(report: ReconciliationReport, key = REPORT_KEY): Promise<void> {
    const em = this.em.fork();
    const existing = await em.findOne(SiteSettings, { setting_key: key });
    if (existing) {
      existing.setting_value = JSON.stringify(report);
      existing.setting_type = 'json';
      existing.updated_at = new Date();
    } else {
      em.create(SiteSettings, {
        setting_key: key,
        setting_value: JSON.stringify(report),
        setting_type: 'json',
        description: 'Latest billing reconciliation report (JSON).',
      } as any);
    }
    await em.flush();
  }

  /**
   * Email admins about critical discrepancies — at most once per calendar day,
   * serialised across instances with an advisory lock + a date marker so a
   * multi-instance deploy can't fan out duplicate alerts.
   */
  private async maybeAlertAdmins(
    report: ReconciliationReport,
    opts: { markerKey: string; subjectPrefix: string; heading: string } = {
      markerKey: ALERT_MARKER_KEY,
      subjectPrefix: 'MECA Billing Reconciliation',
      heading: 'Billing reconciliation found critical discrepancies',
    },
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    // Idempotent across instances: a single INSERT into cron_send_log (PK on
    // job_key + range_id) means only ONE instance can claim today's alert, even
    // when every instance fires the cron at the same instant. The previous
    // advisory-lock scheme ran via getConnection().execute() on a pooled,
    // autocommit connection (not the transaction's), so the lock released
    // immediately and didn't actually serialise concurrent firings.
    try {
      await this.em.getConnection().execute(
        'INSERT INTO cron_send_log (job_key, range_id) VALUES (?, ?)',
        [opts.markerKey, today],
      );
    } catch (err: any) {
      const code = err?.code ?? err?.cause?.code;
      if (code === '23505' || /duplicate key|unique/i.test(String(err?.message ?? ''))) {
        this.logger.log('Reconciliation alert already sent today by another instance — skipping.');
      } else {
        this.logger.error(`Reconciliation alert claim failed (skipping alert): ${err}`);
      }
      return;
    }

    const adminEmails = await this.getAdminEmails();
    if (adminEmails.length === 0) return;

    const critical = report.checks.filter((c) => c.severity === 'critical' && c.count > 0);
    const rows = critical
      .map((c) => `<li><strong>${c.label}:</strong> ${c.count} — ${c.description}</li>`)
      .join('');
    const html = `
      <h2>${opts.heading}</h2>
      <p>Reconciliation (trailing ${report.windowDays} days) flagged issues that need review:</p>
      <ul>${rows}</ul>
      <p><a href="${(process.env.FRONTEND_URL || 'https://mecacaraudio.com')}/admin/billing/reconciliation">Open the reconciliation dashboard</a></p>
    `;

    for (const email of adminEmails) {
      try {
        await this.emailService.sendEmail({
          to: email,
          subject: `${opts.subjectPrefix} — ${report.criticalIssues} critical issue(s)`,
          html,
          from: 'noreply@mecacaraudio.com',
        });
      } catch (err) {
        this.logger.error(`Failed to send reconciliation alert to ${email}: ${err}`);
      }
    }
    this.logger.log(`Reconciliation critical alert sent to ${adminEmails.length} admin(s).`);
  }

  private async getAdminEmails(): Promise<string[]> {
    const em = this.em.fork();
    const admins = await em.find(Profile, adminRecipientWhere() as any, { fields: ['email'] });
    const seen = new Set<string>();
    const emails: string[] = [];
    for (const a of admins) {
      const email = a.email?.trim();
      if (!email) continue;
      const key = email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      emails.push(email);
    }
    return emails;
  }
}
