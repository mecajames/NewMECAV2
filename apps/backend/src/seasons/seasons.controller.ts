import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { AuthGuard, PermissionGuard } from '../auth';

@Controller('api/seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Get()
  async list() {
    return this.seasonsService.findAll();
  }

  @Get('current')
  async getCurrent() {
    return this.seasonsService.findCurrent();
  }

  @Get('next')
  async getNext() {
    return this.seasonsService.findNext();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.seasonsService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.seasonsService.create(data);
  }

  @Put(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  async update(@Param('id') id: string, @Body() data: any) {
    return this.seasonsService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.seasonsService.delete(id);
  }
}
