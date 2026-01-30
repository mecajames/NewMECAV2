import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  Inject,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { TrainingRecordsService } from './training-records.service';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import {
  CreateTrainingRecordDto,
  UpdateTrainingRecordDto,
  TraineeType,
  UserRole,
} from '@newmeca/shared';

// Training Records API endpoints for managing MECA training records
@Controller('api/training-records')
export class TrainingRecordsController {
  constructor(
    private readonly trainingRecordsService: TrainingRecordsService,
    private readonly supabaseAdmin: SupabaseAdminService,
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // Helper to require admin authentication
  private async requireAdmin(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const token = authHeader.substring(7);

    let user;
    try {
      const result = await this.supabaseAdmin.getClient().auth.getUser(token);
      if (result.error || !result.data?.user) {
        console.error('[TrainingRecords] Auth error:', result.error?.message);
        throw new UnauthorizedException('Invalid authorization token');
      }
      user = result.data.user;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error;
      console.error('[TrainingRecords] Supabase auth error:', error.message);
      throw new UnauthorizedException('Authentication failed');
    }

    try {
      const em = this.em.fork();
      const profile = await em.findOne(Profile, { id: user.id });
      if (!profile) {
        console.error('[TrainingRecords] Profile not found for user:', user.id);
        throw new ForbiddenException('Profile not found');
      }
      if (profile.role !== UserRole.ADMIN) {
        throw new ForbiddenException('Admin access required');
      }
      return { user, profile };
    } catch (error: any) {
      if (error instanceof ForbiddenException) throw error;
      console.error('[TrainingRecords] Profile lookup error:', error.message);
      throw new ForbiddenException('Authorization check failed');
    }
  }

  /**
   * Health check endpoint - no auth required
   */
  @Get('health')
  healthCheck() {
    return { status: 'ok', module: 'training-records' };
  }

  /**
   * Get list of potential trainers (judges and admins)
   * NOTE: This route must come before :id to avoid being caught by that route
   */
  @Get('meta/trainers')
  async getPotentialTrainers(
    @Headers('authorization') authHeader: string,
  ) {
    try {
      await this.requireAdmin(authHeader);
      const trainers = await this.trainingRecordsService.getPotentialTrainers();

      return trainers.map(trainer => ({
        id: trainer.id,
        first_name: trainer.first_name,
        last_name: trainer.last_name,
        email: trainer.email,
        role: trainer.role,
      }));
    } catch (error: any) {
      console.error('[TrainingRecords] getPotentialTrainers error:', error.message, error.stack);
      throw error;
    }
  }

  /**
   * Get training records for a specific trainee (judge or event director)
   */
  @Get('trainee/:traineeType/:traineeId')
  async getByTrainee(
    @Headers('authorization') authHeader: string,
    @Param('traineeType') traineeType: TraineeType,
    @Param('traineeId') traineeId: string,
  ) {
    try {
      await this.requireAdmin(authHeader);
      const records = await this.trainingRecordsService.getByTrainee(traineeType, traineeId);

      // Transform to snake_case response
      return records.map(record => ({
        id: record.id,
        trainee_type: record.trainee_type,
        trainee_id: record.trainee_id,
        training_type: record.training_type,
        training_date: record.training_date,
        result: record.result,
        trainer_id: record.trainer?.id,
        notes: record.notes,
        created_at: record.created_at,
        updated_at: record.updated_at,
        trainer: record.trainer ? {
          id: record.trainer.id,
          first_name: record.trainer.first_name,
          last_name: record.trainer.last_name,
          email: record.trainer.email,
        } : undefined,
      }));
    } catch (error: any) {
      console.error('[TrainingRecords] getByTrainee error:', error.message, error.stack);
      throw error;
    }
  }

  /**
   * Get a single training record by ID
   */
  @Get(':id')
  async getById(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    const record = await this.trainingRecordsService.getById(id);

    return {
      id: record.id,
      trainee_type: record.trainee_type,
      trainee_id: record.trainee_id,
      training_type: record.training_type,
      training_date: record.training_date,
      result: record.result,
      trainer_id: record.trainer?.id,
      notes: record.notes,
      created_at: record.created_at,
      updated_at: record.updated_at,
      trainer: record.trainer ? {
        id: record.trainer.id,
        first_name: record.trainer.first_name,
        last_name: record.trainer.last_name,
        email: record.trainer.email,
      } : undefined,
    };
  }

  /**
   * Create a new training record
   */
  @Post()
  async create(
    @Headers('authorization') authHeader: string,
    @Body() dto: CreateTrainingRecordDto,
  ) {
    await this.requireAdmin(authHeader);
    const record = await this.trainingRecordsService.create(dto);

    // Re-fetch with trainer populated
    const fullRecord = await this.trainingRecordsService.getById(record.id);

    return {
      id: fullRecord.id,
      trainee_type: fullRecord.trainee_type,
      trainee_id: fullRecord.trainee_id,
      training_type: fullRecord.training_type,
      training_date: fullRecord.training_date,
      result: fullRecord.result,
      trainer_id: fullRecord.trainer?.id,
      notes: fullRecord.notes,
      created_at: fullRecord.created_at,
      updated_at: fullRecord.updated_at,
      trainer: fullRecord.trainer ? {
        id: fullRecord.trainer.id,
        first_name: fullRecord.trainer.first_name,
        last_name: fullRecord.trainer.last_name,
        email: fullRecord.trainer.email,
      } : undefined,
    };
  }

  /**
   * Update an existing training record
   */
  @Put(':id')
  async update(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() dto: UpdateTrainingRecordDto,
  ) {
    await this.requireAdmin(authHeader);
    const record = await this.trainingRecordsService.update(id, dto);

    return {
      id: record.id,
      trainee_type: record.trainee_type,
      trainee_id: record.trainee_id,
      training_type: record.training_type,
      training_date: record.training_date,
      result: record.result,
      trainer_id: record.trainer?.id,
      notes: record.notes,
      created_at: record.created_at,
      updated_at: record.updated_at,
      trainer: record.trainer ? {
        id: record.trainer.id,
        first_name: record.trainer.first_name,
        last_name: record.trainer.last_name,
        email: record.trainer.email,
      } : undefined,
    };
  }

  /**
   * Delete a training record
   */
  @Delete(':id')
  async delete(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    await this.requireAdmin(authHeader);
    await this.trainingRecordsService.delete(id);
    return { success: true };
  }
}
