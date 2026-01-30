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
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ShopService } from './shop.service';
import { ShippingService } from './shipping.service';
import {
  ShopProductCategory,
  ShopOrderStatus,
  CreateShopProductDto,
  UpdateShopProductDto,
  ShopAddress,
  UserRole,
} from '@newmeca/shared';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';

@Controller('api/shop')
export class ShopController {
  constructor(
    private readonly shopService: ShopService,
    private readonly shippingService: ShippingService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  // Helper to get authenticated user
  private async getUser(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);

    if (error || !user) {
      return null;
    }

    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    return { user, profile };
  }

  // Helper to require authentication
  private async requireAuth(authHeader?: string) {
    const result = await this.getUser(authHeader);
    if (!result) {
      throw new UnauthorizedException('Authentication required');
    }
    return result;
  }

  // Helper to require admin authentication
  private async requireAdmin(authHeader?: string) {
    const result = await this.requireAuth(authHeader);
    if (result.profile?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
    return result;
  }

  // =============================================================================
  // PUBLIC ENDPOINTS
  // =============================================================================

  @Get('products')
  async getProducts(@Query('category') category?: ShopProductCategory) {
    return this.shopService.findActiveProducts(category);
  }

  @Get('products/featured')
  async getFeaturedProducts() {
    return this.shopService.findFeaturedProducts();
  }

  @Get('products/:id')
  async getProduct(@Param('id') id: string) {
    return this.shopService.findProductById(id);
  }

  @Get('categories')
  async getCategories() {
    return this.shopService.getCategories();
  }

  @Post('check-availability')
  @HttpCode(HttpStatus.OK)
  async checkAvailability(@Body() body: { items: Array<{ productId: string; quantity: number }> }) {
    return this.shopService.checkStockAvailability(body.items);
  }

  @Post('shipping-rates')
  @HttpCode(HttpStatus.OK)
  async getShippingRates(
    @Body() body: {
      items: Array<{ productId: string; quantity: number }>;
      destinationZip: string;
      destinationCountry?: string;
    },
  ) {
    return this.shippingService.calculateRates({
      items: body.items,
      destinationZip: body.destinationZip,
      destinationCountry: body.destinationCountry || 'US',
    });
  }

  // =============================================================================
  // AUTHENTICATED ENDPOINTS
  // =============================================================================

  @Get('orders/my')
  async getMyOrders(@Headers('authorization') authHeader: string) {
    const { user } = await this.requireAuth(authHeader);
    return this.shopService.findOrdersByUser(user.id);
  }

  @Get('orders/:id')
  async getOrder(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    const { user, profile } = await this.requireAuth(authHeader);
    const order = await this.shopService.findOrderById(id);

    // Allow if admin or if the order belongs to the user
    if (profile?.role !== UserRole.ADMIN && order.user?.id !== user.id) {
      throw new ForbiddenException('Access denied to this order');
    }

    return order;
  }

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Body() body: {
      items: Array<{ productId: string; quantity: number }>;
      guestEmail?: string;
      guestName?: string;
      shippingAddress?: ShopAddress;
      billingAddress?: ShopAddress;
      notes?: string;
      stripePaymentIntentId?: string;
      shippingMethod?: 'standard' | 'priority';
      shippingAmount?: number;
    },
    @Headers('authorization') authHeader?: string,
  ) {
    // Optional auth - allows guest checkout
    const userResult = await this.getUser(authHeader);

    return this.shopService.createOrder({
      userId: userResult?.user?.id,
      guestEmail: body.guestEmail,
      guestName: body.guestName,
      items: body.items,
      shippingAddress: body.shippingAddress,
      billingAddress: body.billingAddress,
      notes: body.notes,
      stripePaymentIntentId: body.stripePaymentIntentId,
      shippingMethod: body.shippingMethod,
      shippingAmount: body.shippingAmount,
    });
  }

  // =============================================================================
  // ADMIN ENDPOINTS
  // =============================================================================

  @Get('admin/products')
  async adminGetProducts(
    @Headers('authorization') authHeader: string,
    @Query('category') category?: ShopProductCategory,
    @Query('isActive') isActive?: string,
    @Query('isFeatured') isFeatured?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.shopService.findAllProducts({
      category,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isFeatured: isFeatured === 'true' ? true : isFeatured === 'false' ? false : undefined,
    });
  }

  @Post('admin/products')
  @HttpCode(HttpStatus.CREATED)
  async createProduct(
    @Headers('authorization') authHeader: string,
    @Body() data: CreateShopProductDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.shopService.createProduct(data);
  }

  @Put('admin/products/:id')
  async updateProduct(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() data: UpdateShopProductDto,
  ) {
    await this.requireAdmin(authHeader);
    return this.shopService.updateProduct(id, data);
  }

  @Delete('admin/products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.shopService.deleteProduct(id);
  }

  @Get('admin/orders')
  async adminGetOrders(
    @Headers('authorization') authHeader: string,
    @Query('status') status?: ShopOrderStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.shopService.findAllOrders({
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('admin/orders/:id')
  async adminGetOrder(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    return this.shopService.findOrderById(id);
  }

  @Put('admin/orders/:id/status')
  async updateOrderStatus(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: { status: ShopOrderStatus },
  ) {
    await this.requireAdmin(authHeader);
    return this.shopService.updateOrderStatus(id, body.status);
  }

  @Put('admin/orders/:id/tracking')
  async addTrackingNumber(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: { trackingNumber: string },
  ) {
    await this.requireAdmin(authHeader);
    return this.shopService.addTrackingNumber(id, body.trackingNumber);
  }

  @Put('admin/orders/:id/notes')
  async updateAdminNotes(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: { adminNotes: string },
  ) {
    await this.requireAdmin(authHeader);
    return this.shopService.updateAdminNotes(id, body.adminNotes);
  }

  @Get('admin/stats')
  async getStats(@Headers('authorization') authHeader: string) {
    await this.requireAdmin(authHeader);
    return this.shopService.getStats();
  }

  @Put('admin/orders/:id/refund')
  async refundOrder(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    await this.requireAdmin(authHeader);
    return this.shopService.processRefund(id, body.reason);
  }
}
