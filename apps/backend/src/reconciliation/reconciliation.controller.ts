import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  Ip,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ReconciliationService } from './reconciliation.service';
import { RemediationService } from './remediation.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';

@Controller('api/billing/reconciliation')
export class ReconciliationController {
  constructor(
    private readonly reconciliationService: ReconciliationService,
    private readonly remediationService: RemediationService,
    private readonly supabaseAdmin: SupabaseAdminService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  private async requireAdmin(authHeader?: string) {
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
    return { user, profile };
  }

  /** Return the most recently stored nightly reconciliation report. */
  @Get()
  async getLatest(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    const report = await this.reconciliationService.getLastReport();
    return report ?? { generatedAt: null, windowDays: 0, totalIssues: 0, criticalIssues: 0, checks: [] };
  }

  /** Run reconciliation on demand (optionally over a custom trailing window). */
  @Post('run')
  async runNow(
    @Headers('authorization') authHeader: string,
    @Query('windowDays') windowDays?: string,
  ) {
    await this.requireAdmin(authHeader);
    const days = Math.min(Math.max(parseInt(windowDays || '30', 10) || 30, 1), 365);
    return this.reconciliationService.runReconciliation(days);
  }

  /** Latest stored LIVE (gateway) reconciliation report. */
  @Get('live')
  async getLatestLive(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    const report = await this.reconciliationService.getLastLiveReport();
    return report ?? { generatedAt: null, windowDays: 0, totalIssues: 0, criticalIssues: 0, checks: [] };
  }

  /** Run LIVE gateway reconciliation on demand (trailing window, capped at 31d for PayPal). */
  @Post('live/run')
  async runLiveNow(
    @Headers('authorization') authHeader: string,
    @Query('windowDays') windowDays?: string,
  ) {
    await this.requireAdmin(authHeader);
    const days = Math.min(Math.max(parseInt(windowDays || '7', 10) || 7, 1), 31);
    return this.reconciliationService.runLiveReconciliation(days);
  }

  /** Map of check-key → human label for the discrepancies that can be one-click fixed. */
  @Get('remediable')
  async getRemediable(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return RemediationService.REMEDIABLE;
  }

  /**
   * Apply a one-click remediation for a single flagged discrepancy. DB-side only
   * (records gateway/ledger-confirmed truth; never moves money). Re-verifies the
   * discrepancy before acting and audits the action.
   */
  @Post('remediate')
  async remediate(
    @Headers('authorization') authHeader: string,
    @Ip() ip: string,
    @Body() body: { checkKey?: string; payload?: Record<string, any> },
  ) {
    const { profile } = await this.requireAdmin(authHeader);
    if (!body?.checkKey || !body?.payload) {
      throw new BadRequestException('checkKey and payload are required.');
    }
    return this.remediationService.remediate(body.checkKey, body.payload, profile?.id || 'unknown', ip);
  }
}
