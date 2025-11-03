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
import { CompetitionFormatsService } from './competition-formats.service';
import { CompetitionFormat } from './competition-formats.entity';

@Controller('api/competition-formats')
export class CompetitionFormatsController {
  constructor(private readonly competitionFormatsService: CompetitionFormatsService) {}

  @Get()
  async getAllFormats(): Promise<CompetitionFormat[]> {
    return this.competitionFormatsService.findAll();
  }

  @Get('active')
  async getActiveFormats(): Promise<CompetitionFormat[]> {
    return this.competitionFormatsService.findActive();
  }

  @Get(':id')
  async getFormat(@Param('id') id: string): Promise<CompetitionFormat> {
    return this.competitionFormatsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createFormat(@Body() data: Partial<CompetitionFormat>): Promise<CompetitionFormat> {
    return this.competitionFormatsService.create(data);
  }

  @Put(':id')
  async updateFormat(
    @Param('id') id: string,
    @Body() data: Partial<CompetitionFormat>,
  ): Promise<CompetitionFormat> {
    return this.competitionFormatsService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFormat(@Param('id') id: string): Promise<void> {
    return this.competitionFormatsService.delete(id);
  }
}
