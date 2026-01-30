import { Entity, PrimaryKey, Property, Enum, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { RegistrationStatus, PaymentStatus } from '@newmeca/shared';
import { Event } from '../events/events.entity';
import { Profile } from '../profiles/profiles.entity';
import { Membership } from '../memberships/memberships.entity';
import { EventRegistrationClass } from './event-registration-classes.entity';

@Entity({ tableName: 'event_registrations', schema: 'public' })
export class EventRegistration {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Event, { fieldName: 'event_id' })
  event!: Event;

  @ManyToOne(() => Profile, { fieldName: 'user_id', nullable: true })
  user?: Profile;

  // Contact Information (for both logged-in and guest registrations)
  @Property({ type: 'text', nullable: true })
  email?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'first_name' })
  firstName?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'last_name' })
  lastName?: string;

  @Property({ type: 'text', nullable: true })
  phone?: string;

  // Address
  @Property({ type: 'text', nullable: true })
  address?: string;

  @Property({ type: 'text', nullable: true })
  city?: string;

  @Property({ type: 'text', nullable: true })
  state?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'postal_code' })
  postalCode?: string;

  @Property({ type: 'text', nullable: true, default: 'US' })
  country?: string;

  // Vehicle Information
  @Property({ type: 'text', nullable: true, fieldName: 'vehicle_year' })
  vehicleYear?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'vehicle_make' })
  vehicleMake?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'vehicle_model' })
  vehicleModel?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'vehicle_info' })
  vehicleInfo?: string;

  // Registration Status
  @Enum(() => RegistrationStatus)
  @Property({ fieldName: 'registration_status' })
  registrationStatus: RegistrationStatus = RegistrationStatus.PENDING;

  // Payment Information
  @Enum(() => PaymentStatus)
  @Property({ fieldName: 'payment_status' })
  paymentStatus: PaymentStatus = PaymentStatus.PENDING;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true, fieldName: 'amount_paid' })
  amountPaid?: number;

  @Property({ type: 'text', nullable: true, fieldName: 'transaction_id' })
  transactionId?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'stripe_payment_intent_id' })
  stripePaymentIntentId?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'stripe_customer_id' })
  stripeCustomerId?: string;

  // Membership Upsell
  @Property({ type: 'boolean', default: false, fieldName: 'membership_purchased_during_registration' })
  membershipPurchasedDuringRegistration: boolean = false;

  @ManyToOne(() => Membership, { fieldName: 'membership_id', nullable: true })
  membership?: Membership;

  // MECA ID used for this registration (from membership)
  @Property({ type: 'integer', nullable: true, fieldName: 'meca_id' })
  mecaId?: number;

  // QR Code / Check-in
  @Property({ type: 'text', nullable: true, unique: true, fieldName: 'check_in_code' })
  checkInCode?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'qr_code_data' })
  qrCodeData?: string;

  @Property({ type: 'boolean', default: false, fieldName: 'checked_in' })
  checkedIn: boolean = false;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'checked_in_at' })
  checkedInAt?: Date;

  @ManyToOne(() => Profile, { fieldName: 'checked_in_by', nullable: true })
  checkedInBy?: Profile;

  // Additional
  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'registered_at' })
  registeredAt?: Date;

  // Classes registered for this registration
  @OneToMany(() => EventRegistrationClass, (erc) => erc.eventRegistration)
  classes = new Collection<EventRegistrationClass>(this);

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
