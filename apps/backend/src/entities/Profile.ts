import { Entity, PrimaryKey, Property, Enum } from '@mikro-orm/core';

export enum UserRole {
  USER = 'user',
  EVENT_DIRECTOR = 'event_director',
  ADMIN = 'admin'
}

export enum MembershipStatus {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  SUSPENDED = 'suspended'
}

@Entity({ tableName: 'profiles', schema: 'mecacaraudio' })
export class Profile {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'text', nullable: true })
  firstName?: string;

  @Property({ type: 'text', nullable: true })
  lastName?: string;

  @Property({ type: 'text', unique: true })
  email!: string;

  @Property({ type: 'text', nullable: true })
  phone?: string;

  @Property({ type: 'text', nullable: true })
  address?: string;

  @Property({ type: 'text', nullable: true })
  city?: string;

  @Property({ type: 'text', nullable: true })
  state?: string;

  @Property({ type: 'text', nullable: true })
  zipCode?: string;

  @Property({ type: 'text', nullable: true })
  country?: string;

  @Enum(() => UserRole)
  role: UserRole = UserRole.USER;

  @Enum(() => MembershipStatus)
  membershipStatus: MembershipStatus = MembershipStatus.INACTIVE;

  @Property({ type: 'date', nullable: true })
  membershipExpiry?: Date;

  @Property({ type: 'text', nullable: true })
  stripeCustomerId?: string;

  @Property({ type: 'text', nullable: true })
  avatarUrl?: string;

  @Property({ type: 'timestamp', onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ type: 'timestamp', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
