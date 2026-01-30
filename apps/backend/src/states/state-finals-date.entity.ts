import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Event } from '../events/events.entity';
import { Season } from '../seasons/seasons.entity';

@Entity({ tableName: 'state_finals_dates', schema: 'public' })
export class StateFinalsDate {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Event, { fieldName: 'event_id', nullable: true })
  event?: Event;

  @Property({ type: 'varchar', fieldName: 'state_code', serializedName: 'state_code' })
  stateCode!: string;

  @ManyToOne(() => Season, { fieldName: 'season_id', nullable: true })
  season?: Season;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'created_at', serializedName: 'created_at', onCreate: () => new Date() })
  createdAt?: Date = new Date();
}
