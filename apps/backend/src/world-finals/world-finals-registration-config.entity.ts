import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'world_finals_registration_config', schema: 'public' })
export class WorldFinalsRegistrationConfig {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'uuid', unique: true, fieldName: 'season_id', serializedName: 'season_id' })
  seasonId!: string;

  @Property({ type: 'timestamptz', fieldName: 'registration_open_date', serializedName: 'registration_open_date' })
  registrationOpenDate!: Date;

  @Property({ type: 'timestamptz', fieldName: 'early_bird_deadline', serializedName: 'early_bird_deadline' })
  earlyBirdDeadline!: Date;

  @Property({ type: 'timestamptz', fieldName: 'registration_close_date', serializedName: 'registration_close_date' })
  registrationCloseDate!: Date;

  @Property({ type: 'boolean', default: true, fieldName: 'collect_tshirt_size', serializedName: 'collect_tshirt_size' })
  collectTshirtSize: boolean = true;

  @Property({ type: 'boolean', default: true, fieldName: 'collect_ring_size', serializedName: 'collect_ring_size' })
  collectRingSize: boolean = true;

  @Property({ type: 'boolean', default: true, fieldName: 'collect_hotel_info', serializedName: 'collect_hotel_info' })
  collectHotelInfo: boolean = true;

  @Property({ type: 'boolean', default: true, fieldName: 'collect_guest_count', serializedName: 'collect_guest_count' })
  collectGuestCount: boolean = true;

  @Property({ type: 'text', nullable: true, fieldName: 'custom_message', serializedName: 'custom_message' })
  customMessage?: string;

  // 'single' = one registration per season (all packages in one checkout)
  // 'per_package' = can register for each package separately
  @Property({ type: 'text', default: 'single', fieldName: 'registration_mode', serializedName: 'registration_mode' })
  registrationMode: string = 'single';

  @Property({ type: 'boolean', default: false, fieldName: 'is_active', serializedName: 'is_active' })
  isActive: boolean = false;

  @Property({ type: 'timestamptz', fieldName: 'created_at', serializedName: 'created_at', onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'updated_at', serializedName: 'updated_at', onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
