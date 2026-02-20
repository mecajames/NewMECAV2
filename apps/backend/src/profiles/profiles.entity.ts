import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AccountType } from '@newmeca/shared';

@Entity({ tableName: 'profiles', schema: 'public' })
export class Profile {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', nullable: true })
  email?: string;

  @Property({ type: 'text', nullable: true, unique: true, fieldName: 'meca_id' })
  meca_id?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'first_name' })
  first_name?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'last_name' })
  last_name?: string;

  @Property({ type: 'text', fieldName: 'full_name' })
  full_name!: string;

  @Property({ type: 'text', nullable: true })
  phone?: string;

  @Property({ type: 'text', nullable: true })
  address?: string;

  @Property({ type: 'text', nullable: true })
  city?: string;

  @Property({ type: 'text', nullable: true })
  state?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'postal_code' })
  postal_code?: string;

  @Property({ type: 'text', nullable: true, default: 'US' })
  country?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'billing_street' })
  billing_street?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'billing_city' })
  billing_city?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'billing_state' })
  billing_state?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'billing_zip' })
  billing_zip?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'billing_country' })
  billing_country?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'shipping_street' })
  shipping_street?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'shipping_city' })
  shipping_city?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'shipping_state' })
  shipping_state?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'shipping_zip' })
  shipping_zip?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'shipping_country' })
  shipping_country?: string;

  @Property({ type: 'boolean', nullable: true, default: false, fieldName: 'use_billing_for_shipping' })
  use_billing_for_shipping?: boolean;

  @Property({ type: 'text', nullable: true, fieldName: 'profile_picture_url' })
  profile_picture_url?: string;

  @Property({ type: 'text', nullable: true })
  role?: string;

  // Whether this user can act as a MECA Training Trainer
  @Property({ type: 'boolean', nullable: true, default: false, fieldName: 'is_trainer' })
  is_trainer?: boolean = false;

  // =============================================================================
  // Judge and Event Director Permissions
  // =============================================================================

  // Permission to access judge features and apply to be a judge
  @Property({ type: 'boolean', default: false, fieldName: 'can_apply_judge' })
  canApplyJudge: boolean = false;

  // Permission to access event director features and apply to be an ED
  @Property({ type: 'boolean', default: false, fieldName: 'can_apply_event_director' })
  canApplyEventDirector: boolean = false;

  // Audit trail for judge permission
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'judge_permission_granted_at' })
  judgePermissionGrantedAt?: Date;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'judge_permission_granted_by' })
  judgePermissionGrantedBy?: Profile;

  // Audit trail for event director permission
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'ed_permission_granted_at' })
  edPermissionGrantedAt?: Date;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'ed_permission_granted_by' })
  edPermissionGrantedBy?: Profile;

  // Optional certification expiration dates
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'judge_certification_expires' })
  judgeCertificationExpires?: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'ed_certification_expires' })
  edCertificationExpires?: Date;

  @Property({ type: 'text', nullable: true, fieldName: 'membership_status' })
  membership_status?: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'membership_expiry' })
  membership_expiry?: Date;

  @Property({ type: 'text', nullable: true, fieldName: 'avatar_url' })
  avatar_url?: string;

  @Property({ type: 'text', nullable: true })
  bio?: string;

  // Public profile fields
  @Property({ type: 'boolean', nullable: true, default: false, fieldName: 'is_public' })
  is_public?: boolean;

  @Property({ type: 'text', nullable: true, fieldName: 'vehicle_info' })
  vehicle_info?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'car_audio_system' })
  car_audio_system?: string;

  @Property({ type: 'json', nullable: true, fieldName: 'profile_images' })
  profile_images?: string[];

  // Cover image position for header display (x, y as percentages 0-100)
  @Property({ type: 'json', nullable: true, fieldName: 'cover_image_position' })
  cover_image_position?: { x: number; y: number };

  @Property({ type: 'boolean', default: false, fieldName: 'force_password_change' })
  force_password_change: boolean = false;

  // Account type: 'member' for full members, 'basic' for guest registrations converted to accounts
  @Property({ type: 'text', default: AccountType.MEMBER, fieldName: 'account_type' })
  account_type: AccountType = AccountType.MEMBER;

  // =============================================================================
  // Master/Secondary Account Hierarchy
  // =============================================================================

  // Whether this profile is a secondary account (managed by a master)
  // Secondary accounts have restricted access (no billing, limited management)
  @Property({ type: 'boolean', nullable: true, default: false, fieldName: 'is_secondary_account' })
  isSecondaryAccount?: boolean = false;

  // Whether this profile can log in (false for secondaries without their own login)
  // All profiles exist for MECA ID and competition tracking, but not all can log in
  @Property({ type: 'boolean', nullable: true, default: true, fieldName: 'can_login' })
  canLogin?: boolean = true;

  // For secondary accounts: the master profile that controls this account
  @ManyToOne(() => Profile, { nullable: true, fieldName: 'master_profile_id' })
  masterProfile?: Profile;

  // For master profiles: collection of secondary profiles they control
  @OneToMany(() => Profile, profile => profile.masterProfile)
  secondaryProfiles = new Collection<Profile>(this);

  // Original membership date (preserved from V1 migration or set to earliest membership start_date)
  // Falls back to created_at on the frontend if null
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'member_since' })
  member_since?: Date;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  created_at: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updated_at: Date = new Date();
}

