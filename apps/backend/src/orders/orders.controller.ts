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
} from '@nestjs/common';
import {
  CreateOrderDto,
  CreateOrderSchema,
  UpdateOrderStatusDto,
  UpdateOrderStatusSchema,
  CancelOrderDto,
  CancelOrderSchema,
  OrderListQuery,
  OrderListQuerySchema,
} from '@newmeca/shared';
import { OrdersService } from './orders.service';

@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Get all orders with filters (admin)
   */
  @Get()
  async findAll(@Query() query: OrderListQuery) {
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
  async create(@Body() data: CreateOrderDto) {
    const validatedData = CreateOrderSchema.parse(data);
    return this.ordersService.create(validatedData);
  }

  /**
   * Update order status
   */
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() data: UpdateOrderStatusDto,
  ) {
    const validatedData = UpdateOrderStatusSchema.parse(data);
    return this.ordersService.updateStatus(id, validatedData);
  }

  /**
   * Cancel an order
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string, @Body() data: CancelOrderDto) {
    const validatedData = CancelOrderSchema.parse(data);
    return this.ordersService.cancel(id, validatedData);
  }
}
