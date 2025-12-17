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
import { TicketDepartmentsService } from './ticket-departments.service';
import { TicketStaffService } from './ticket-staff.service';
import { TicketRoutingService } from './ticket-routing.service';
import { TicketSettingsService } from './ticket-settings.service';
import {
  CreateTicketDepartmentDto,
  UpdateTicketDepartmentDto,
  CreateTicketStaffDto,
  UpdateTicketStaffDto,
  CreateTicketRoutingRuleDto,
  UpdateTicketRoutingRuleDto,
} from '@newmeca/shared';

@Controller('api/tickets/admin')
export class TicketAdminController {
  constructor(
    private readonly departmentsService: TicketDepartmentsService,
    private readonly staffService: TicketStaffService,
    private readonly routingService: TicketRoutingService,
    private readonly settingsService: TicketSettingsService,
  ) {}

  // ==========================================================================
  // Department Endpoints
  // ==========================================================================

  @Get('departments')
  async listDepartments(@Query('include_inactive') includeInactive?: string) {
    return this.departmentsService.findAll(includeInactive === 'true');
  }

  @Get('departments/public')
  async listPublicDepartments() {
    return this.departmentsService.findPublic();
  }

  @Get('departments/:id')
  async getDepartment(@Param('id') id: string) {
    return this.departmentsService.findById(id);
  }

  @Post('departments')
  @HttpCode(HttpStatus.CREATED)
  async createDepartment(@Body() data: CreateTicketDepartmentDto) {
    return this.departmentsService.create(data);
  }

  @Put('departments/:id')
  async updateDepartment(
    @Param('id') id: string,
    @Body() data: UpdateTicketDepartmentDto,
  ) {
    return this.departmentsService.update(id, data);
  }

  @Delete('departments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDepartment(@Param('id') id: string) {
    return this.departmentsService.delete(id);
  }

  // ==========================================================================
  // Staff Endpoints
  // ==========================================================================

  @Get('staff')
  async listStaff(@Query('include_inactive') includeInactive?: string) {
    return this.staffService.findAll(includeInactive === 'true');
  }

  @Get('staff/:id')
  async getStaff(@Param('id') id: string) {
    return this.staffService.findById(id);
  }

  @Get('staff/by-profile/:profileId')
  async getStaffByProfile(@Param('profileId') profileId: string) {
    const staff = await this.staffService.findByProfileId(profileId);
    if (!staff) {
      return { is_staff: false };
    }
    return this.staffService.findById(staff.id);
  }

  @Get('staff/check/:profileId')
  async checkIsStaff(@Param('profileId') profileId: string) {
    const isStaff = await this.staffService.isStaff(profileId);
    const permissionLevel = await this.staffService.getPermissionLevel(profileId);
    return { is_staff: isStaff, permission_level: permissionLevel };
  }

  @Post('staff')
  @HttpCode(HttpStatus.CREATED)
  async createStaff(@Body() data: CreateTicketStaffDto) {
    return this.staffService.create(data);
  }

  @Put('staff/:id')
  async updateStaff(
    @Param('id') id: string,
    @Body() data: UpdateTicketStaffDto,
  ) {
    return this.staffService.update(id, data);
  }

  @Delete('staff/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStaff(@Param('id') id: string) {
    return this.staffService.delete(id);
  }

  // Staff-Department Assignment

  @Post('staff/:staffId/departments')
  @HttpCode(HttpStatus.OK)
  async assignStaffToDepartments(
    @Param('staffId') staffId: string,
    @Body() data: { department_ids: string[] },
  ) {
    await this.staffService.assignToDepartments(staffId, data.department_ids);
    return this.staffService.findById(staffId);
  }

  @Delete('staff/:staffId/departments/:departmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeStaffFromDepartment(
    @Param('staffId') staffId: string,
    @Param('departmentId') departmentId: string,
  ) {
    await this.staffService.removeDepartmentAssignment(staffId, departmentId);
  }

  @Put('staff/:staffId/departments/:departmentId/head')
  async setDepartmentHead(
    @Param('staffId') staffId: string,
    @Param('departmentId') departmentId: string,
    @Body() data: { is_department_head: boolean },
  ) {
    await this.staffService.setDepartmentHead(staffId, departmentId, data.is_department_head);
    return this.staffService.findById(staffId);
  }

  @Get('departments/:departmentId/staff')
  async getStaffForDepartment(@Param('departmentId') departmentId: string) {
    return this.staffService.getStaffForDepartment(departmentId);
  }

  // ==========================================================================
  // Routing Rules Endpoints
  // ==========================================================================

  @Get('routing-rules')
  async listRoutingRules(@Query('include_inactive') includeInactive?: string) {
    return this.routingService.findAll(includeInactive === 'true');
  }

  @Get('routing-rules/:id')
  async getRoutingRule(@Param('id') id: string) {
    return this.routingService.findById(id);
  }

  @Post('routing-rules')
  @HttpCode(HttpStatus.CREATED)
  async createRoutingRule(@Body() data: CreateTicketRoutingRuleDto) {
    return this.routingService.create(data);
  }

  @Put('routing-rules/:id')
  async updateRoutingRule(
    @Param('id') id: string,
    @Body() data: UpdateTicketRoutingRuleDto,
  ) {
    return this.routingService.update(id, data);
  }

  @Delete('routing-rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRoutingRule(@Param('id') id: string) {
    return this.routingService.delete(id);
  }

  @Post('routing-rules/test')
  async testRouting(
    @Body() data: { title: string; description: string; category: string; user_membership_status?: string },
  ) {
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
  // Settings Endpoints
  // ==========================================================================

  @Get('settings')
  async listSettings() {
    return this.settingsService.findAll();
  }

  @Get('settings/map')
  async getSettingsMap() {
    return this.settingsService.getSettings();
  }

  @Get('settings/:key')
  async getSetting(@Param('key') key: string) {
    return this.settingsService.findByKey(key);
  }

  @Put('settings/:key')
  async updateSetting(
    @Param('key') key: string,
    @Body() data: { value: string; type?: string; description?: string },
  ) {
    return this.settingsService.upsert(key, data.value, data.type, data.description);
  }
}
