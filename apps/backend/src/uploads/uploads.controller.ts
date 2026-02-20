import {
  Controller,
  Post,
  Delete,
  UploadedFile,
  UseInterceptors,
  Headers,
  Body,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { UserRole } from '@newmeca/shared';
import { FileInterceptor } from '@nestjs/platform-express';
import { EntityManager } from '@mikro-orm/postgresql';
import { UploadsService, UploadResult } from './uploads.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';

@Controller('api/uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(
    private readonly uploadsService: UploadsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  /**
   * Authenticates the request and returns the user's profile.
   * Any authenticated user can call this endpoint.
   */
  private async requireAuth(authHeader?: string): Promise<Profile> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Invalid authorization token');
    }

    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id }, {
      fields: ['id', 'email', 'role'] as any,
    });

    if (!profile) {
      throw new UnauthorizedException('User profile not found');
    }

    return profile;
  }

  /**
   * Upload a file to Supabase storage.
   *
   * POST /api/uploads
   * Content-Type: multipart/form-data
   *
   * Fields:
   *   - file: The file to upload (required)
   *   - destination: Upload destination key (required) — e.g., 'product-images', 'profile-images'
   *   - entityId: Optional entity ID for scoping (e.g., team ID for team uploads)
   *
   * Returns: { publicUrl, storagePath, bucket, fileSize, mimeType }
   */
  @Post()
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB hard cap (individual destinations have lower limits)
    },
  }))
  async uploadFile(
    @Headers('authorization') authHeader: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('destination') destination: string,
    @Body('entityId') entityId?: string,
  ): Promise<UploadResult> {
    // Authenticate
    const profile = await this.requireAuth(authHeader);

    // Validate inputs
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!destination) {
      throw new BadRequestException(
        `"destination" field is required. Valid destinations: ${this.uploadsService.getDestinations().join(', ')}`,
      );
    }

    this.logger.log(
      `Upload request from ${profile.email} (${profile.role}) to "${destination}" — ${file.originalname} (${file.size} bytes)`,
    );

    // Delegate to service (handles auth checks, validation, and upload)
    return this.uploadsService.uploadFile(
      file,
      destination,
      profile.id,
      profile.role || 'user',
      entityId,
    );
  }

  /**
   * Delete a file from Supabase storage.
   * Admin only.
   *
   * DELETE /api/uploads
   * Body: { bucket: string, storagePath: string }
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteFile(
    @Headers('authorization') authHeader: string,
    @Body() body: { bucket: string; storagePath: string },
  ): Promise<{ success: boolean }> {
    const profile = await this.requireAuth(authHeader);

    if (profile.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required to delete files');
    }

    if (!body.bucket || !body.storagePath) {
      throw new BadRequestException('"bucket" and "storagePath" are required');
    }

    const success = await this.uploadsService.deleteFile(body.bucket, body.storagePath);
    return { success };
  }
}
