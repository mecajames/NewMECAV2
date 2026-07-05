import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { UserRole } from '@newmeca/shared';
import { TicketDepartmentsService } from './ticket-departments.service';
import { TicketStaffService } from './ticket-staff.service';
import { TicketRoutingService } from './ticket-routing.service';
import { TicketSettingsService } from './ticket-settings.service';
import { TicketCustomFieldsService } from './ticket-custom-fields.service';
import { TicketCategoriesService } from './ticket-categories.service';
import { viewerFromQuery } from './ticket-audience.util';
import { TicketRefundService, RefundablePurchaseType } from './ticket-refund.service';
import { TicketStaff } from './entities/ticket-staff.entity';
import { TicketsService } from './tickets.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';
import { Public } from '../auth/public.decorator';
import {
  CreateTicketDepartmentDto,
  UpdateTicketDepartmentDto,
  CreateTicketStaffDto,
  UpdateTicketStaffDto,
  CreateTicketRoutingRuleDto,
  UpdateTicketRoutingRuleDto,
  CreateTicketCustomFieldDto,
  UpdateTicketCustomFieldDto,
  CreateTicketCategoryDto,
  UpdateTicketCategoryDto,
} from '@newmeca/shared';

@Controller('api/tickets/admin')
export class TicketAdminController {
  constructor(
    private readonly departmentsService: TicketDepartmentsService,
    private readonly staffService: TicketStaffService,
    private readonly routingService: TicketRoutingService,
    private readonly settingsService: TicketSettingsService,
    private readonly customFieldsService: TicketCustomFieldsService,
    private readonly categoriesService: TicketCategoriesService,
    private readonly refundService: TicketRefundService,
    private readonly ticketsService: TicketsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  // Helper to require admin authentication
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

  // ==========================================================================
  // Department Endpoints
  // ==========================================================================

  @Get('departments')
  async listDepartments(
    @Headers('authorization') authHeader: string,
    @Query('include_inactive') includeInactive?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.departmentsService.findAll(includeInactive === 'true');
  }

  @Public()
  @Get('departments/public')
  async listPublicDepartments(
    @Query('audience') audience?: string,
    @Query('roles') roles?: string,
  ) {
    // Public endpoint — drives the ticket form's Department dropdown. The form
    // passes audience=guest|member (+ the member's roles) so we can hide
    // member-only / role-gated departments from guests. Filtering only controls
    // what's OFFERED, so trusting the client-supplied roles here is safe.
    return this.departmentsService.findForForm(viewerFromQuery(audience, roles));
  }

  @Get('departments/:id')
  async getDepartment(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.departmentsService.findById(id);
  }

  @Post('departments')
  @HttpCode(HttpStatus.CREATED)
  async createDepartment(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateTicketDepartmentDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.departmentsService.create(data);
  }

  @Put('departments/:id')
  async updateDepartment(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: UpdateTicketDepartmentDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.departmentsService.update(id, data);
  }

  @Delete('departments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDepartment(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.departmentsService.delete(id);
  }

  // ==========================================================================
  // Staff Endpoints
  // ==========================================================================

  @Get('staff')
  async listStaff(
    @Headers('authorization') authHeader: string,
    @Query('include_inactive') includeInactive?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.staffService.findAll(includeInactive === 'true');
  }

  /**
   * Aggregate customer-rating data per support agent. Declared before the
   * `staff/:id` route so it isn't shadowed (NestJS matches routes in
   * declaration order; both are single-segment under `staff/`).
   */
  @Get('staff/ratings')
  async getStaffRatings(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.ticketsService.getStaffRatings();
  }

  @Get('staff/:id')
  async getStaff(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.staffService.findById(id);
  }

  @Get('staff/by-profile/:profileId')
  async getStaffByProfile(
    @Headers('authorization') authHeader: string,
    @Param('profileId') profileId: string,
  ) {
    await this.requireAdmin(authHeader);
    const staff = await this.staffService.findByProfileId(profileId);
    if (!staff) {
      return { is_staff: false };
    }
    return this.staffService.findById(staff.id);
  }

  @Get('staff/check/:profileId')
  async checkIsStaff(
    @Headers('authorization') authHeader: string,
    @Param('profileId') profileId: string,
  ) {
    await this.requireAdmin(authHeader);
    const isStaff = await this.staffService.isStaff(profileId);
    const permissionLevel = await this.staffService.getPermissionLevel(profileId);
    return { is_staff: isStaff, permission_level: permissionLevel };
  }

  @Post('staff')
  @HttpCode(HttpStatus.CREATED)
  async createStaff(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateTicketStaffDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.staffService.create(data);
  }

  @Put('staff/:id')
  async updateStaff(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: UpdateTicketStaffDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.staffService.update(id, data);
  }

  @Delete('staff/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStaff(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.staffService.delete(id);
  }

  // Staff-Department Assignment

  @Post('staff/:staffId/departments')
  @HttpCode(HttpStatus.OK)
  async assignStaffToDepartments(
    @Headers('authorization') authHeader: string,
    @Param('staffId') staffId: string,
    @Body() data: { department_ids: string[] },
  ) {
    await this.requireAdmin(authHeader);
    await this.staffService.assignToDepartments(staffId, data.department_ids);
    return this.staffService.findById(staffId);
  }

  @Delete('staff/:staffId/departments/:departmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeStaffFromDepartment(
    @Headers('authorization') authHeader: string,
    @Param('staffId') staffId: string,
    @Param('departmentId') departmentId: string,
  ) {
    await this.requireAdmin(authHeader);
    await this.staffService.removeDepartmentAssignment(staffId, departmentId);
  }

  @Put('staff/:staffId/departments/:departmentId/head')
  async setDepartmentHead(
    @Headers('authorization') authHeader: string,
    @Param('staffId') staffId: string,
    @Param('departmentId') departmentId: string,
    @Body() data: { is_department_head: boolean },
  ) {
    await this.requireAdmin(authHeader);
    await this.staffService.setDepartmentHead(staffId, departmentId, data.is_department_head);
    return this.staffService.findById(staffId);
  }

  @Get('departments/:departmentId/staff')
  async getStaffForDepartment(
    @Headers('authorization') authHeader: string,
    @Param('departmentId') departmentId: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.staffService.getStaffForDepartment(departmentId);
  }

  // ==========================================================================
  // Routing Rules Endpoints
  // ==========================================================================

  @Get('routing-rules')
  async listRoutingRules(
    @Headers('authorization') authHeader: string,
    @Query('include_inactive') includeInactive?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.routingService.findAll(includeInactive === 'true');
  }

  @Get('routing-rules/:id')
  async getRoutingRule(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.routingService.findById(id);
  }

  @Post('routing-rules')
  @HttpCode(HttpStatus.CREATED)
  async createRoutingRule(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateTicketRoutingRuleDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.routingService.create(data);
  }

  @Put('routing-rules/:id')
  async updateRoutingRule(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: UpdateTicketRoutingRuleDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.routingService.update(id, data);
  }

  @Delete('routing-rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRoutingRule(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.routingService.delete(id);
  }

  @Post('routing-rules/test')
  async testRouting(
    @Headers('authorization') authHeader: string,
    @Body() data: { title: string; description: string; category: string; user_membership_status?: string },
  ) {
    await this.requireAdmin(authHeader);
    const result = await this.routingService.executeRouting({
      title: data.title,
      description: data.description,
      category: data.category,
      userMembershipStatus: data.user_membership_status,
    });
    return {
      matched: !!result.matchedRule,
      rule_name: result.matchedRule?.name,
      department_id: result.departmentId,
      staff_id: result.staffId,
      priority: result.priority,
    };
  }

  // ==========================================================================
  // Category Endpoints (managed, department-scoped)
  // ==========================================================================

  @Public()
  @Get('categories/public')
  async listPublicCategories(
    @Query('department_id') departmentId?: string,
    @Query('audience') audience?: string,
    @Query('roles') roles?: string,
  ) {
    // Public — drives the form's Category dropdown (active categories for the
    // chosen department), filtered by the viewer's audience/role.
    return this.categoriesService.findForForm(departmentId, viewerFromQuery(audience, roles));
  }

  // Public — key→label pairs for DISPLAYING stored ticket categories
  // (includes inactive categories: old tickets keep their key forever).
  // Labels only, nothing sensitive. Powers the frontend's label lookup so
  // a ticket never renders its raw key ("Ma Renewal" ← ma_renewal).
  @Public()
  @Get('categories/labels')
  async listCategoryLabels() {
    return this.categoriesService.listLabels();
  }

  @Get('categories')
  async listCategories(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.categoriesService.findAll();
  }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateTicketCategoryDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.categoriesService.create(data);
  }

  @Put('categories/:id')
  async updateCategory(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: UpdateTicketCategoryDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.categoriesService.update(id, data);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.categoriesService.remove(id);
  }

  // ==========================================================================
  // Staff (public list for the staff_reference form field)
  // ==========================================================================

  @Public()
  @Get('staff/public')
  async listPublicStaff() {
    const em = this.em.fork();
    const staff = await em.find(
      TicketStaff,
      { isActive: true, canBeAssignedTickets: true } as any,
      { populate: ['profile'] },
    );
    return staff
      .filter((s) => (s.profile as any)?.id)
      .map((s) => {
        const p = s.profile as any;
        const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || p.email || 'Staff';
        return { id: s.id, name };
      });
  }

  // ==========================================================================
  // Ticket-driven refunds (shop / event / world-finals; membership uses its
  // own endpoint). Real gateway refunds, full or partial.
  // ==========================================================================

  @Post('refund-purchase')
  async refundPurchase(
    @Headers('authorization') authHeader: string,
    @Body() body: { type: RefundablePurchaseType; id: string; amountCents?: number; reason: string },
  ) {
    await this.requireAdmin(authHeader);
    return this.refundService.refundPurchase(body);
  }

  // ==========================================================================
  // Custom Field Endpoints
  // ==========================================================================

  @Public()
  @Get('custom-fields/public')
  async listPublicCustomFields(@Query('category') category?: string) {
    // Public — used by the member + guest ticket forms to render the
    // category's user-visible fields. Returns only active, visible fields.
    if (!category) return [];
    return this.customFieldsService.getFieldsForCategory(category, { visibleOnly: true });
  }

  @Get('custom-fields')
  async listCustomFields(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.customFieldsService.findAll();
  }

  @Post('custom-fields')
  @HttpCode(HttpStatus.CREATED)
  async createCustomField(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateTicketCustomFieldDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.customFieldsService.create(data);
  }

  @Put('custom-fields/:id')
  async updateCustomField(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: UpdateTicketCustomFieldDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.customFieldsService.update(id, data);
  }

  @Delete('custom-fields/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCustomField(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.customFieldsService.remove(id);
  }

  // ==========================================================================
  // Settings Endpoints
  // ==========================================================================

  @Get('settings')
  async listSettings(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.settingsService.findAll();
  }

  @Get('settings/map')
  async getSettingsMap(
    @Headers('authorization') authHeader: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.settingsService.getSettings();
  }

  @Get('settings/:key')
  async getSetting(
    @Headers('authorization') authHeader: string,
    @Param('key') key: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.settingsService.findByKey(key);
  }

  @Put('settings/:key')
  async updateSetting(
    @Headers('authorization') authHeader: string,
    @Param('key') key: string,
    @Body() data: { value: string; type?: string; description?: string },
  ) {
    await this.requireAdmin(authHeader);
    return this.settingsService.upsert(key, data.value, data.type, data.description);
  }
}
