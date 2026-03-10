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
import { RulebooksService } from './rulebooks.service';
import { Rulebook } from './rulebooks.entity';
import { Public } from '../auth/public.decorator';

@Controller('api/rulebooks')
export class RulebooksController {
  constructor(private readonly rulebooksService: RulebooksService) {}

  @Public()
  @Get()
  async getAllRulebooks(): Promise<Rulebook[]> {
    return this.rulebooksService.findAll();
  }

  @Get('admin/all')
  async getAllRulebooksForAdmin(): Promise<Rulebook[]> {
    return this.rulebooksService.findAllIncludingInactive();
  }

  @Public()
  @Get(':id')
  async getRulebook(@Param('id') id: string): Promise<Rulebook> {
    return this.rulebooksService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRulebook(@Body() data: Partial<Rulebook>): Promise<Rulebook> {
    return this.rulebooksService.create(data);
  }

  @Put('reorder')
  async reorderRulebooks(
    @Body() items: { id: string; displayOrder: number }[],
  ): Promise<void> {
    return this.rulebooksService.reorder(items);
  }

  @Put(':id')
  async updateRulebook(
    @Param('id') id: string,
    @Body() data: Partial<Rulebook>,
  ): Promise<Rulebook> {
    return this.rulebooksService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRulebook(@Param('id') id: string): Promise<void> {
    return this.rulebooksService.delete(id);
  }
}
