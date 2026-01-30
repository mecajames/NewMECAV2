import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { TrainingRecord } from './training-record.entity';
import { Profile } from '../profiles/profiles.entity';
import {
  CreateTrainingRecordDto,
  UpdateTrainingRecordDto,
  TraineeType,
} from '@newmeca/shared';

@Injectable()
export class TrainingRecordsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /**
   * Get all training records for a specific trainee (judge or event director)
   */
  async getByTrainee(traineeType: TraineeType, traineeId: string): Promise<TrainingRecord[]> {
    try {
      const em = this.em.fork();
      const records = await em.find(
        TrainingRecord,
        { trainee_type: traineeType, trainee_id: traineeId },
        { populate: ['trainer'], orderBy: { training_date: 'DESC' } }
      );
      return records;
    } catch (error: any) {
      // If table doesn't exist yet (migration not run), return empty array
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.warn('[TrainingRecords] Table does not exist yet - returning empty array');
        return [];
      }
      throw error;
    }
  }

  /**
   * Get a single training record by ID
   */
  async getById(id: string): Promise<TrainingRecord> {
    const em = this.em.fork();
    const record = await em.findOne(TrainingRecord, { id }, { populate: ['trainer'] });
    if (!record) {
      throw new NotFoundException(`Training record with ID ${id} not found`);
    }
    return record;
  }

  /**
   * Create a new training record
   */
  async create(dto: CreateTrainingRecordDto): Promise<TrainingRecord> {
    const em = this.em.fork();
    const trainer = await em.findOneOrFail(Profile, dto.trainer_id);

    const record = new TrainingRecord();
    record.trainee_type = dto.trainee_type;
    record.trainee_id = dto.trainee_id;
    record.training_type = dto.training_type;
    record.training_date = new Date(dto.training_date);
    record.result = dto.result;
    record.trainer = trainer;
    record.notes = dto.notes;

    await em.persistAndFlush(record);
    return record;
  }

  /**
   * Update an existing training record
   */
  async update(id: string, dto: UpdateTrainingRecordDto): Promise<TrainingRecord> {
    const em = this.em.fork();
    const record = await em.findOneOrFail(TrainingRecord, { id }, { populate: ['trainer'] });

    if (dto.training_type !== undefined) {
      record.training_type = dto.training_type;
    }
    if (dto.training_date !== undefined) {
      record.training_date = new Date(dto.training_date);
    }
    if (dto.result !== undefined) {
      record.result = dto.result;
    }
    if (dto.trainer_id !== undefined) {
      record.trainer = await em.findOneOrFail(Profile, dto.trainer_id);
    }
    if (dto.notes !== undefined) {
      record.notes = dto.notes;
    }

    await em.flush();
    return record;
  }

  /**
   * Delete a training record
   */
  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const record = await em.findOneOrFail(TrainingRecord, { id });
    await em.removeAndFlush(record);
  }

  /**
   * Get potential trainers - users marked as trainers via the is_trainer flag
   * Trainers are assigned via the Permissions tab in the Profile admin page
   */
  async getPotentialTrainers(): Promise<Profile[]> {
    try {
      const em = this.em.fork();
      const trainers = await em.find(
        Profile,
        { is_trainer: true },
        { orderBy: { first_name: 'ASC', last_name: 'ASC' } }
      );
      return trainers;
    } catch (error: any) {
      console.error('[TrainingRecords] getPotentialTrainers error:', error.message, error.stack);
      return [];
    }
  }
}
