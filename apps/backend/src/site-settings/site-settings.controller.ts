import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { SiteSettingsService } from './site-settings.service';

interface UpsertSettingDto {
  key: string;
  value: string;
  type: string;
  description?: string;
  updatedBy: string;
}

@Controller('api/site-settings')
export class SiteSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  @Get()
  async listSettings() {
    return this.siteSettingsService.findAll();
  }

  @Get(':key')
  async getSetting(@Param('key') key: string) {
    return this.siteSettingsService.findByKey(key);
  }

  @Post('upsert')
  @HttpCode(HttpStatus.OK)
  async upsertSetting(@Body() dto: UpsertSettingDto) {
    return this.siteSettingsService.upsert(
      dto.key,
      dto.value,
      dto.type,
      dto.description,
      dto.updatedBy
    );
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSetting(@Param('key') key: string) {
    await this.siteSettingsService.delete(key);
  }
}
