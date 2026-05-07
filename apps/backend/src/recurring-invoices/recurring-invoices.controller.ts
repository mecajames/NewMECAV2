import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  RecurringInvoicesService,
  CreateRecurringTemplateDto,
  UpdateRecurringTemplateDto,
} from './recurring-invoices.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';
import { AdminAuditService } from '../user-activity/admin-audit.service';

@Controller('api/recurring-invoices')
export class RecurringInvoicesController {
  constructor(
    private readonly recurringService: RecurringInvoicesService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  private async requireAdmin(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) throw new UnauthorizedException('Invalid authorization token');
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    if (!isAdminUser(profile)) throw new ForbiddenException('Admin access required');
    return { user, profile };
  }

  @Get()
  async list(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.recurringService.findAll();
  }

  @Get(':id')
  async get(@Headers('authorization') authHeader: string, @Param('id') id: string) {
    await this.requireAdmin(authHeader);
    return this.recurringService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateRecurringTemplateDto,
  ) {
    const { user } = await this.requireAdmin(authHeader);
    const created = await this.recurringService.create(data);
    this.adminAuditService.logAction({
      adminUserId: user.id,
      action: 'recurring_template_create',
      resourceType: 'recurring_invoice_template',
      resourceId: created.id,
      description: `Created recurring template "${created.name}" (${created.frequency})`,
      newValues: { name: created.name, frequency: created.frequency, items: created.lineItems.length },
    });
    return created;
  }

  @Put(':id')
  async update(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: UpdateRecurringTemplateDto,
  ) {
    const { user } = await this.requireAdmin(authHeader);
    const updated = await this.recurringService.update(id, data);
    this.adminAuditService.logAction({
      adminUserId: user.id,
      action: 'recurring_template_update',
      resourceType: 'recurring_invoice_template',
      resourceId: id,
      description: `Updated recurring template "${updated.name}"`,
    });
    return updated;
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activate(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    const { user } = await this.requireAdmin(authHeader);
    const updated = await this.recurringService.activate(id);
    this.adminAuditService.logAction({
      adminUserId: user.id,
      action: 'recurring_template_activate',
      resourceType: 'recurring_invoice_template',
      resourceId: id,
      description: `Activated recurring template "${updated.name}"`,
    });
    return updated;
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    const { user } = await this.requireAdmin(authHeader);
    const updated = await this.recurringService.deactivate(id);
    this.adminAuditService.logAction({
      adminUserId: user.id,
      action: 'recurring_template_deactivate',
      resourceType: 'recurring_invoice_template',
      resourceId: id,
      description: `Deactivated recurring template "${updated.name}"`,
    });
    return updated;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    const { user } = await this.requireAdmin(authHeader);
    await this.recurringService.delete(id);
    this.adminAuditService.logAction({
      adminUserId: user.id,
      action: 'recurring_template_delete',
      resourceType: 'recurring_invoice_template',
      resourceId: id,
      description: `Deleted recurring template`,
    });
    return { ok: true };
  }

  /**
   * Manually trigger the run-due-templates job (admin trigger; normally
   * runs via cron daily).
   */
  @Post('run')
  @HttpCode(HttpStatus.OK)
  async runDue(@Headers('authorization') authHeader: string) {
    const { user } = await this.requireAdmin(authHeader);
    const result = await this.recurringService.processDueTemplates();
    this.adminAuditService.logAction({
      adminUserId: user.id,
      action: 'recurring_templates_manual_run',
      resourceType: 'recurring_invoice_template',
      description: `Manual run: generated ${result.generated}, failed ${result.failed}`,
      newValues: result,
    });
    return result;
  }
}
