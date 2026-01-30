import axios from '@/lib/axios';
import {
  TraineeType,
  TrainingType,
  TrainingResult,
} from '@newmeca/shared';

const API_BASE = '/api/training-records';

export interface TrainingRecord {
  id: string;
  trainee_type: TraineeType;
  trainee_id: string;
  training_type: TrainingType;
  training_date: string;
  result: TrainingResult;
  trainer_id: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  trainer?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

export interface CreateTrainingRecordDto {
  trainee_type: TraineeType;
  trainee_id: string;
  training_type: TrainingType;
  training_date: string;
  result: TrainingResult;
  trainer_id: string;
  notes?: string;
}

export interface UpdateTrainingRecordDto {
  training_type?: TrainingType;
  training_date?: string;
  result?: TrainingResult;
  trainer_id?: string;
  notes?: string;
}

export interface Trainer {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role: string;
}

export const trainingRecordsApi = {
  /**
   * Get all training records for a trainee (judge or event director)
   */
  getByTrainee: async (traineeType: TraineeType, traineeId: string): Promise<TrainingRecord[]> => {
    const response = await axios.get(`${API_BASE}/trainee/${traineeType}/${traineeId}`);
    return response.data;
  },

  /**
   * Get a single training record by ID
   */
  getById: async (id: string): Promise<TrainingRecord> => {
    const response = await axios.get(`${API_BASE}/${id}`);
    return response.data;
  },

  /**
   * Create a new training record
   */
  create: async (dto: CreateTrainingRecordDto): Promise<TrainingRecord> => {
    const response = await axios.post(API_BASE, dto);
    return response.data;
  },

  /**
   * Update an existing training record
   */
  update: async (id: string, dto: UpdateTrainingRecordDto): Promise<TrainingRecord> => {
    const response = await axios.put(`${API_BASE}/${id}`, dto);
    return response.data;
  },

  /**
   * Delete a training record
   */
  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE}/${id}`);
  },

  /**
   * Get list of potential trainers (judges and admins)
   */
  getPotentialTrainers: async (): Promise<Trainer[]> => {
    const response = await axios.get(`${API_BASE}/meta/trainers`);
    return response.data;
  },
};
