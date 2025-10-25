import { Entity, PrimaryKey, Property, Enum } from '@mikro-orm/core';
import { UserRole, MembershipStatus } from '../types/enums';

@Entity({ tableName: 'profiles', schema: 'public' })
export class Profile {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'text' })
  email!: string;

  @Property({ type: 'text', fieldName: 'full_name' })
  fullName!: string;

  @Property({ type: 'text', nullable: true })
  phone?: string;

  @Enum(() => UserRole)
  role: UserRole = UserRole.USER;

  @Enum(() => MembershipStatus)
  @Property({ fieldName: 'membership_status' })
  membershipStatus: MembershipStatus = MembershipStatus.NONE;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'membership_expiry' })
  membershipExpiry?: Date;

  @Property({ type: 'text', nullable: true, fieldName: 'avatar_url' })
  avatarUrl?: string;

  @Property({ type: 'text', nullable: true })
  bio?: string;

  @Property({ type: 'timestamptz', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
