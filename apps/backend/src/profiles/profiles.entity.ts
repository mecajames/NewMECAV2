import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'profiles', schema: 'public' })
export class Profile {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', nullable: true })
  email?: string;

  @Property({ type: 'text', nullable: true, unique: true, fieldName: 'meca_id' })
  meca_id?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'full_name' })
  full_name?: string;

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

  @Property({ type: 'text', nullable: true })
  role?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'membership_status' })
  membership_status?: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'membership_expiry' })
  membership_expiry?: Date;

  @Property({ type: 'text', nullable: true, fieldName: 'avatar_url' })
  avatar_url?: string;

  @Property({ type: 'text', nullable: true })
  bio?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  created_at: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updated_at: Date = new Date();
}
