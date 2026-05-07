import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  CreateOrderDto,
  CreateOrderSchema,
  UpdateOrderStatusDto,
  UpdateOrderStatusSchema,
  CancelOrderDto,
  CancelOrderSchema,
  OrderListQuery,
  OrderListQuerySchema,
  UserRole,
} from '@newmeca/shared';
import { OrdersService } from './orders.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';
import { Public } from '../auth/public.decorator';
import { AdminAuditService } from '../user-activity/admin-audit.service';

@Controller('api/orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
    private readonly adminAuditService: AdminAuditService,
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

  /**
   * Get all orders with filters (admin)
   */
  @Get()
  async findAll(
    @Headers('authorization') authHeader: string,
    @Query() query: OrderListQuery,
  ) {
    await this.requireAdmin(authHeader);
    const validatedQuery = OrderListQuerySchema.parse(query);
    return this.ordersService.findAll(validatedQuery);
  }

  /**
   * Get orders by user ID
   * Note: Must be before :id route to avoid matching 'user' as an ID
   */
  @Public()
  @Get('user/:userId')
  async findByUser(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.findByUser(userId, page, limit);
  }

  /**
   * Get order status counts (admin dashboard)
   * Note: Must be before :id route to avoid matching 'stats' as an ID
   */
  @Get('stats/counts')
  async getStatusCounts(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.ordersService.getStatusCounts();
  }

  /**
   * Get recent orders (admin dashboard)
   * Note: Must be before :id route to avoid matching 'stats' as an ID
   */
  @Get('stats/recent')
  async getRecentOrders(
    @Headers('authorization') authHeader: string,
    @Query('limit') limit?: number,
  ) {
    await this.requireAdmin(authHeader);
    return this.ordersService.getRecentOrders(limit);
  }

  /**
   * Get order by ID
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  /**
   * Create a new order (admin)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateOrderDto,
  ) {
    await this.requireAdmin(authHeader);
    const validatedData = CreateOrderSchema.parse(data);
    return this.ordersService.create(validatedData);
  }

  /**
   * Update order status (admin)
   */
  @Put(':id/status')
  async updateStatus(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: UpdateOrderStatusDto,
  ) {
    const { user } = await this.requireAdmin(authHeader);
    const validatedData = UpdateOrderStatusSchema.parse(data);
    const updated = await this.ordersService.updateStatus(id, validatedData);
    this.adminAuditService.logAction({
      adminUserId: user.id,
      action: 'order_update_status',
      resourceType: 'order',
      resourceId: id,
      description: `Updated order ${updated.orderNumber} status → ${validatedData.status}`,
      newValues: { status: validatedData.status, notes: validatedData.notes },
    });
    return updated;
  }

  /**
   * Cancel an order (admin)
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: CancelOrderDto,
  ) {
    const { user } = await this.requireAdmin(authHeader);
    const validatedData = CancelOrderSchema.parse(data);
    const cancelled = await this.ordersService.cancel(id, validatedData);
    this.adminAuditService.logAction({
      adminUserId: user.id,
      action: 'order_cancel',
      resourceType: 'order',
      resourceId: id,
      description: `Cancelled order ${cancelled.orderNumber}: ${validatedData.reason}`,
    });
    return cancelled;
  }

  /**
   * Bulk-cancel multiple orders.
   */
  @Post('bulk/cancel')
  @HttpCode(HttpStatus.OK)
  async bulkCancel(
    @Headers('authorization') authHeader: string,
    @Body() body: { ids: string[]; reason?: string },
  ) {
    const { user } = await this.requireAdmin(authHeader);
    const reason = body?.reason || 'Bulk cancellation by admin';
    const result = await this.ordersService.bulkCancel(body?.ids ?? [], reason);
    const ok = result.filter(r => r.ok).length;
    this.adminAuditService.logAction({
      adminUserId: user.id,
      action: 'order_bulk_cancel',
      resourceType: 'order',
      description: `Bulk cancelled ${ok}/${result.length} orders: ${reason}`,
      newValues: { ids: body?.ids ?? [], reason },
    });
    return result;
  }
}
