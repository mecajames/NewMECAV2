import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { Season } from './seasons.entity';

@Controller('api/seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Get()
  async getAllSeasons(): Promise<Season[]> {
    return this.seasonsService.findAll();
  }

  @Get('current')
  async getCurrentSeason(): Promise<Season | null> {
    return this.seasonsService.getCurrentSeason();
  }

  @Get('next')
  async getNextSeason(): Promise<Season | null> {
    return this.seasonsService.getNextSeason();
  }

  @Get(':id')
  async getSeason(@Param('id') id: string): Promise<Season> {
    return this.seasonsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSeason(@Body() data: Partial<Season>): Promise<Season> {
    return this.seasonsService.create(data);
  }

  @Put(':id')
  async updateSeason(
    @Param('id') id: string,
    @Body() data: Partial<Season>,
  ): Promise<Season> {
    return this.seasonsService.update(id, data);
  }

  @Put(':id/set-current')
  async setAsCurrent(@Param('id') id: string): Promise<Season> {
    return this.seasonsService.setAsCurrent(id);
  }

  @Put(':id/set-next')
  async setAsNext(@Param('id') id: string): Promise<Season> {
    return this.seasonsService.setAsNext(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSeason(@Param('id') id: string): Promise<void> {
    return this.seasonsService.delete(id);
  }
}
