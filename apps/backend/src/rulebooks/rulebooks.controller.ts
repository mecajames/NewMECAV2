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
  NotFoundException,
} from '@nestjs/common';
import { RulebooksService } from './rulebooks.service';
import { Rulebook } from './rulebooks.entity';

@Controller('api/rulebooks')
export class RulebooksController {
  constructor(private readonly rulebooksService: RulebooksService) {}

  @Get()
  async listRulebooks(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.rulebooksService.findAll(pageNum, limitNum);
  }

  @Get('active')
  async getActiveRulebooks() {
    return this.rulebooksService.findActive();
  }

  @Get('year/:year')
  async getRulebooksByYear(@Param('year') year: string) {
    const yearNum = parseInt(year, 10);
    return this.rulebooksService.findByYear(yearNum);
  }

  @Get('category/:category')
  async getRulebooksByCategory(@Param('category') category: string) {
    return this.rulebooksService.findByCategory(category);
  }

  @Get(':id')
  async getRulebook(@Param('id') id: string) {
    const rulebook = await this.rulebooksService.findById(id);

    if (!rulebook) {
      throw new NotFoundException(`Rulebook with ID ${id} not found`);
    }

    return rulebook;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRulebook(@Body() data: Partial<Rulebook>) {
    return this.rulebooksService.create(data);
  }

  @Put(':id')
  async updateRulebook(
    @Param('id') id: string,
    @Body() data: Partial<Rulebook>,
  ) {
    return this.rulebooksService.update(id, data);
  }

  @Put(':id/display-order')
  async setDisplayOrder(
    @Param('id') id: string,
    @Body('displayOrder') displayOrder: number,
  ) {
    return this.rulebooksService.setDisplayOrder(id, displayOrder);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRulebook(@Param('id') id: string) {
    await this.rulebooksService.delete(id);
  }
}
