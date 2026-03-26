import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';
import { Season } from '../seasons/seasons.entity';

@Entity({ tableName: 'finals_registrations', schema: 'public' })
export class FinalsRegistration {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Profile, { fieldName: 'user_id', nullable: true })
  user?: Profile;

  @ManyToOne(() => Season, { fieldName: 'season_id', nullable: true })
  season?: Season;

  @Property({ type: 'text', nullable: true, fieldName: 'meca_id', serializedName: 'meca_id' })
  mecaId?: string;

  @Property({ type: 'text', nullable: true })
  email?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'first_name', serializedName: 'first_name' })
  firstName?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'last_name', serializedName: 'last_name' })
  lastName?: string;

  @Property({ type: 'text', nullable: true })
  phone?: string;

  @Property({ type: 'varchar', nullable: true })
  division?: string;

  @Property({ type: 'varchar', nullable: true, fieldName: 'competition_class', serializedName: 'competition_class' })
  competitionClass?: string;

  @Property({ type: 'jsonb', nullable: true })
  classes?: any[];

  @Property({ type: 'uuid', nullable: true, fieldName: 'package_id', serializedName: 'package_id' })
  packageId?: string;

  @Property({ type: 'uuid', nullable: true, fieldName: 'wf_event_id', serializedName: 'wf_event_id' })
  wfEventId?: string;

  @Property({ type: 'jsonb', nullable: true, fieldName: 'addon_items', serializedName: 'addon_items' })
  addonItems?: any[];

  @Property({ type: 'text', nullable: true, fieldName: 'tshirt_size', serializedName: 'tshirt_size' })
  tshirtSize?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'ring_size', serializedName: 'ring_size' })
  ringSize?: string;

  @Property({ type: 'boolean', nullable: true, fieldName: 'hotel_needed', serializedName: 'hotel_needed' })
  hotelNeeded?: boolean;

  @Property({ type: 'text', nullable: true, fieldName: 'hotel_notes', serializedName: 'hotel_notes' })
  hotelNotes?: string;

  @Property({ type: 'integer', default: 0, fieldName: 'guest_count', serializedName: 'guest_count' })
  guestCount: number = 0;

  @Property({ type: 'text', nullable: true, fieldName: 'pricing_tier', serializedName: 'pricing_tier' })
  pricingTier?: string;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true, fieldName: 'base_amount', serializedName: 'base_amount' })
  baseAmount?: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true, fieldName: 'addons_amount', serializedName: 'addons_amount' })
  addonsAmount?: number;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true, fieldName: 'total_amount', serializedName: 'total_amount' })
  totalAmount?: number;

  @Property({ type: 'text', default: 'pending', fieldName: 'payment_status', serializedName: 'payment_status' })
  paymentStatus: string = 'pending';

  @Property({ type: 'text', nullable: true, fieldName: 'stripe_payment_intent_id', serializedName: 'stripe_payment_intent_id' })
  stripePaymentIntentId?: string;

  @Property({ type: 'text', default: 'pending', fieldName: 'registration_status', serializedName: 'registration_status' })
  registrationStatus: string = 'pending';

  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'registered_at', serializedName: 'registered_at' })
  registeredAt?: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'created_at', serializedName: 'created_at', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'updated_at', serializedName: 'updated_at', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
