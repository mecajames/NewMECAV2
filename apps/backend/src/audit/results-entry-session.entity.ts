import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Event } from '../events/events.entity';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'results_entry_sessions', schema: 'public' })
export class ResultsEntrySession {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'uuid', fieldName: 'event_id', serializedName: 'eventId', persist: false })
  eventId!: string;

  @ManyToOne(() => Event, { fieldName: 'event_id', hidden: true })
  event!: Event;

  @Property({ type: 'uuid', fieldName: 'user_id', serializedName: 'userId', persist: false })
  userId!: string;

  @ManyToOne(() => Profile, { fieldName: 'user_id', nullable: true })
  user?: Profile;

  @Property({ type: 'text', fieldName: 'entry_method', serializedName: 'entryMethod' })
  entryMethod!: 'manual' | 'excel' | 'termlab';

  @Property({ type: 'text', nullable: true })
  format?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'file_path', serializedName: 'filePath' })
  filePath?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'original_filename', serializedName: 'originalFilename' })
  originalFilename?: string;

  @Property({ type: 'integer', fieldName: 'result_count', serializedName: 'resultCount', default: 0 })
  resultCount: number = 0;

  @Property({ type: 'timestamptz', fieldName: 'session_start', serializedName: 'sessionStart' })
  sessionStart!: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'session_end', serializedName: 'sessionEnd' })
  sessionEnd?: Date;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'createdAt' })
  createdAt: Date = new Date();
}
