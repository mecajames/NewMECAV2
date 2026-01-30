import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { EventRegistration } from './event-registrations.entity';

@Entity({ tableName: 'event_registration_classes', schema: 'public' })
export class EventRegistrationClass {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => EventRegistration, { fieldName: 'event_registration_id' })
  eventRegistration!: EventRegistration;

  @Property({ type: 'uuid', fieldName: 'competition_class_id' })
  competitionClassId!: string;

  @Property({ type: 'text' })
  format!: string;

  @Property({ type: 'text', fieldName: 'class_name' })
  className!: string;

  @Property({ type: 'decimal', precision: 10, scale: 2, fieldName: 'fee_charged' })
  feeCharged!: number;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();
}
