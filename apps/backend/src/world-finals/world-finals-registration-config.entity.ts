import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'world_finals_registration_config', schema: 'public' })
export class WorldFinalsRegistrationConfig {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'uuid', unique: true, fieldName: 'season_id', serializedName: 'season_id' })
  seasonId!: string;

  @Property({ type: 'timestamptz', fieldName: 'registration_open_date', serializedName: 'registration_open_date', default: 'now()' })
  registrationOpenDate: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'early_bird_deadline', serializedName: 'early_bird_deadline', default: 'now()' })
  earlyBirdDeadline: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'registration_close_date', serializedName: 'registration_close_date', default: 'now()' })
  registrationCloseDate: Date = new Date();

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

  @Property({ type: 'jsonb', fieldName: 'available_tshirt_sizes', serializedName: 'available_tshirt_sizes' })
  availableTshirtSizes: string[] = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

  @Property({ type: 'jsonb', fieldName: 'available_ring_sizes', serializedName: 'available_ring_sizes' })
  availableRingSizes: string[] = ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13', '14', '15'];

  @Property({ type: 'boolean', default: false, fieldName: 'collect_extra_tshirts', serializedName: 'collect_extra_tshirts' })
  collectExtraTshirts: boolean = false;

  @Property({ type: 'decimal', precision: 10, scale: 2, default: 25, fieldName: 'extra_tshirt_price', serializedName: 'extra_tshirt_price' })
  extraTshirtPrice: number = 25;

  @Property({ type: 'integer', default: 5, fieldName: 'max_extra_tshirts', serializedName: 'max_extra_tshirts' })
  maxExtraTshirts: number = 5;

  // Custom field labels/descriptions (shown to registrants)
  @Property({ type: 'text', nullable: true, fieldName: 'tshirt_field_label', serializedName: 'tshirt_field_label' })
  tshirtFieldLabel?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'ring_field_label', serializedName: 'ring_field_label' })
  ringFieldLabel?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'hotel_field_label', serializedName: 'hotel_field_label' })
  hotelFieldLabel?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'guest_count_field_label', serializedName: 'guest_count_field_label' })
  guestCountFieldLabel?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'extra_tshirt_field_label', serializedName: 'extra_tshirt_field_label' })
  extraTshirtFieldLabel?: string;

  // Hotel info text displayed to registrants
  @Property({ type: 'text', nullable: true, fieldName: 'hotel_info_text', serializedName: 'hotel_info_text' })
  hotelInfoText?: string;

  // Custom image for the pre-registration page
  @Property({ type: 'text', nullable: true, fieldName: 'registration_image_url', serializedName: 'registration_image_url' })
  registrationImageUrl?: string;

  @Property({ type: 'boolean', default: false, fieldName: 'is_active', serializedName: 'is_active' })
  isActive: boolean = false;

  @Property({ type: 'timestamptz', fieldName: 'created_at', serializedName: 'created_at', onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'updated_at', serializedName: 'updated_at', onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
