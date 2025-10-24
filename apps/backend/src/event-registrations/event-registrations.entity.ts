import { Entity, PrimaryKey, Property, Enum, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { RegistrationStatus, PaymentStatus } from '../types/enums';
import { Event } from '../events/events.entity';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'event_registrations', schema: 'public' })
export class EventRegistration {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Event, { fieldName: 'event_id' })
  event!: Event;

  @ManyToOne(() => Profile, { fieldName: 'user_id' })
  user!: Profile;

  @Enum(() => RegistrationStatus)
  @Property({ fieldName: 'registration_status' })
  registrationStatus: RegistrationStatus = RegistrationStatus.PENDING;

  @Enum(() => PaymentStatus)
  @Property({ fieldName: 'payment_status' })
  paymentStatus: PaymentStatus = PaymentStatus.PENDING;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true, fieldName: 'amount_paid' })
  amountPaid?: number;

  @Property({ type: 'text', nullable: true, fieldName: 'transaction_id' })
  transactionId?: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'registered_at' })
  registeredAt?: Date;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
