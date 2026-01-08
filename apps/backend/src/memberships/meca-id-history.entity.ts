import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Membership } from './memberships.entity';
import { Profile } from '../profiles/profiles.entity';

/**
 * Tracks the history of MECA ID assignments.
 *
 * MECA IDs can be assigned to:
 * 1. Memberships (for competitors, retailers, manufacturers)
 * 2. Profiles (for role-based assignments like Event Directors, Judges)
 *
 * Each record tracks when an ID was assigned, expired, or reactivated.
 */
@Entity({ tableName: 'meca_id_history', schema: 'public' })
export class MecaIdHistory {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  // The MECA ID number (700500+)
  @Property({ type: 'integer', fieldName: 'meca_id' })
  mecaId!: number;

  // Link to membership (for paid membership IDs)
  @ManyToOne(() => Membership, { nullable: true, fieldName: 'membership_id' })
  membership?: Membership;

  // Link to profile (for role-based IDs like Event Director, Judge)
  @ManyToOne(() => Profile, { nullable: true, fieldName: 'profile_id' })
  profile?: Profile;

  // When this MECA ID was first assigned
  @Property({ type: 'timestamptz', fieldName: 'assigned_at' })
  assignedAt: Date = new Date();

  // When this MECA ID expired (membership ended)
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'expired_at' })
  expiredAt?: Date;

  // When this MECA ID was reactivated (renewed within 90-day window)
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'reactivated_at' })
  reactivatedAt?: Date;

  // The end date of the previous membership period (for reactivation tracking)
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'previous_end_date' })
  previousEndDate?: Date;

  // Optional notes about this assignment
  @Property({ type: 'text', nullable: true })
  notes?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();

  /**
   * Check if this MECA ID is currently active
   */
  isActive(): boolean {
    return !this.expiredAt || this.reactivatedAt !== undefined;
  }

  /**
   * Check if this MECA ID can be reactivated (within 90-day window)
   */
  canReactivate(): boolean {
    if (!this.expiredAt || this.reactivatedAt) return false;
    const now = new Date();
    const daysSinceExpiry = (now.getTime() - this.expiredAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceExpiry <= 90;
  }
}
