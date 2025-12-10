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
} from '@nestjs/common';
import { MediaFilesService } from './media-files.service';
import { MediaFile } from './media-files.entity';
import { MediaType } from '@newmeca/shared';

@Controller('api/media-files')
export class MediaFilesController {
  constructor(private readonly mediaFilesService: MediaFilesService) {}

  @Get()
  async getAllMediaFiles(@Query('fileType') fileType?: MediaType): Promise<MediaFile[]> {
    return this.mediaFilesService.findAll(fileType);
  }

  @Get('search')
  async searchMediaFiles(
    @Query('q') searchTerm: string,
    @Query('fileType') fileType?: MediaType,
  ): Promise<MediaFile[]> {
    return this.mediaFilesService.search(searchTerm, fileType);
  }

  @Get(':id')
  async getMediaFile(@Param('id') id: string): Promise<MediaFile> {
    return this.mediaFilesService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createMediaFile(@Body() data: Partial<MediaFile>): Promise<MediaFile> {
    return this.mediaFilesService.create(data);
  }

  @Put(':id')
  async updateMediaFile(
    @Param('id') id: string,
    @Body() data: Partial<MediaFile>,
  ): Promise<MediaFile> {
    return this.mediaFilesService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMediaFile(@Param('id') id: string): Promise<void> {
    return this.mediaFilesService.delete(id);
  }
}
