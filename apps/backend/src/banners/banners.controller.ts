import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BannersService } from './banners.service';
import { AuthGuard, PermissionGuard, RequirePermissions } from '../auth';

@Controller('api/banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  async listBanners(@Query('type') type?: string) {
    return this.bannersService.findAllBanners(type);
  }

  @Get(':id')
  async getBanner(@Param('id') id: string) {
    return this.bannersService.findBannerById(id);
  }

  @Get('user/:userId')
  @UseGuards(AuthGuard, PermissionGuard)
  async getUserBanners(@Param('userId') userId: string) {
    return this.bannersService.findUserBanners(userId);
  }

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @HttpCode(HttpStatus.CREATED)
  async createBanner(@Body() data: any) {
    return this.bannersService.createBanner(data);
  }

  @Put(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  async updateBanner(@Param('id') id: string, @Body() data: any) {
    return this.bannersService.updateBanner(id, data);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBanner(@Param('id') id: string) {
    await this.bannersService.deleteBanner(id);
  }

  @Post(':id/impression')
  async trackImpression(@Param('id') id: string) {
    await this.bannersService.trackImpression(id);
    return { success: true };
  }

  @Post(':id/click')
  async trackClick(@Param('id') id: string) {
    await this.bannersService.trackClick(id);
    return { success: true };
  }
}

@Controller('api/manufacturer-ads')
export class ManufacturerAdsController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  async listAds(@Query('placement') placement?: string) {
    return this.bannersService.findAllAds(placement);
  }

  @Get(':id')
  async getAd(@Param('id') id: string) {
    return this.bannersService.findAdById(id);
  }

  @Get('manufacturer/:manufacturerId')
  @UseGuards(AuthGuard, PermissionGuard)
  async getManufacturerAds(@Param('manufacturerId') manufacturerId: string) {
    return this.bannersService.findManufacturerAds(manufacturerId);
  }

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions('manage_banner_ads')
  @HttpCode(HttpStatus.CREATED)
  async createAd(@Body() data: any) {
    return this.bannersService.createAd(data);
  }

  @Put(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions('manage_banner_ads')
  async updateAd(@Param('id') id: string, @Body() data: any) {
    return this.bannersService.updateAd(id, data);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @RequirePermissions('manage_banner_ads')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAd(@Param('id') id: string) {
    await this.bannersService.deleteAd(id);
  }
}
