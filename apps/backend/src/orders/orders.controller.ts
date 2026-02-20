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

@Controller('api/orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
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
    if (profile?.role !== UserRole.ADMIN) {
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
  async getStatusCounts() {
    return this.ordersService.getStatusCounts();
  }

  /**
   * Get recent orders (admin dashboard)
   * Note: Must be before :id route to avoid matching 'stats' as an ID
   */
  @Get('stats/recent')
  async getRecentOrders(@Query('limit') limit?: number) {
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
    await this.requireAdmin(authHeader);
    const validatedData = UpdateOrderStatusSchema.parse(data);
    return this.ordersService.updateStatus(id, validatedData);
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
    await this.requireAdmin(authHeader);
    const validatedData = CancelOrderSchema.parse(data);
    return this.ordersService.cancel(id, validatedData);
  }
}
