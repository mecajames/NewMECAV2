import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../../profiles/profiles.entity';
import { Event } from '../../events/events.entity';

@Entity({ tableName: 'result_file_uploads', schema: 'public' })
export class ResultFileUpload {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  // Event the results were uploaded for
  @ManyToOne(() => Event, { fieldName: 'event_id' })
  event!: Event;

  // Who uploaded the file
  @ManyToOne(() => Profile, { fieldName: 'uploaded_by_id' })
  uploadedBy!: Profile;

  // Original filename
  @Property({ type: 'text' })
  filename!: string;

  // Number of records imported
  @Property({ type: 'integer', fieldName: 'records_count' })
  recordsCount!: number;

  // Number of records that had errors
  @Property({ type: 'integer', default: 0, fieldName: 'error_count' })
  errorCount: number = 0;

  // Any errors encountered during import (JSON array)
  @Property({ type: 'jsonb', nullable: true })
  errors?: Array<{ row: number; message: string }>;

  // File size in bytes
  @Property({ type: 'integer', nullable: true, fieldName: 'file_size' })
  fileSize?: number;

  @Property({ onCreate: () => new Date(), fieldName: 'uploaded_at' })
  uploadedAt: Date = new Date();
}
