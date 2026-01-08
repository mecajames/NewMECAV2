import { Entity, PrimaryKey, Property, ManyToOne, Enum, Unique } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';
import { Event } from '../events/events.entity';
import { RatingEntityType } from '@newmeca/shared';

@Entity({ tableName: 'ratings', schema: 'public' })
@Unique({ properties: ['event', 'ratedEntityType', 'ratedEntityId', 'ratedBy'] })
export class Rating {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Event, { fieldName: 'event_id' })
  event!: Event;

  @Enum({ items: () => RatingEntityType, fieldName: 'entity_type' })
  ratedEntityType!: RatingEntityType;

  @Property({ type: 'uuid', fieldName: 'entity_id' })
  ratedEntityId!: string;

  @ManyToOne(() => Profile, { fieldName: 'rater_user_id' })
  ratedBy!: Profile;

  @Property({ type: 'integer' })
  rating!: number;

  @Property({ type: 'text', nullable: true })
  comment?: string;

  @Property({ type: 'boolean', fieldName: 'is_anonymous', default: true })
  isAnonymous: boolean = true;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();
}
