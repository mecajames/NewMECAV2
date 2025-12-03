import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClassNameMappingsService } from './class-name-mappings.service';

@Controller('api/class-name-mappings')
export class ClassNameMappingsController {
  constructor(private readonly service: ClassNameMappingsService) {}

  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Get('active')
  async findActive() {
    return this.service.findActive();
  }

  @Get('unmapped')
  async getUnmapped() {
    return this.service.getUnmappedClassNames();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() data: {
      sourceName: string;
      targetClassId?: string;
      sourceSystem?: string;
      isActive?: boolean;
      notes?: string;
    }
  ) {
    return this.service.create(data);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  async bulkCreate(
    @Body() data: {
      mappings: {
        sourceName: string;
        targetClassId?: string;
        sourceSystem?: string;
        notes?: string;
      }[];
    }
  ) {
    return this.service.bulkCreateMappings(data.mappings);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: {
      sourceName?: string;
      targetClassId?: string | null;
      sourceSystem?: string;
      isActive?: boolean;
      notes?: string;
    }
  ) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
