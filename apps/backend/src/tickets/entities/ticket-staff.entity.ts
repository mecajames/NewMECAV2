import { Entity, PrimaryKey, Property, ManyToOne, Collection, OneToMany } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../../profiles/profiles.entity';

@Entity({ tableName: 'ticket_staff', schema: 'public' })
export class TicketStaff {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Profile, { fieldName: 'profile_id', serializedName: 'profile_id', unique: true })
  profile!: Profile;

  @Property({ type: 'integer', fieldName: 'permission_level', serializedName: 'permission_level', default: 1 })
  permissionLevel: number = 1; // 1=Staff, 2=Supervisor, 3=Admin

  @Property({ type: 'boolean', fieldName: 'is_active', serializedName: 'is_active', default: true })
  isActive: boolean = true;

  @Property({ type: 'boolean', fieldName: 'can_be_assigned_tickets', serializedName: 'can_be_assigned_tickets', default: true })
  canBeAssignedTickets: boolean = true;

  @Property({ type: 'boolean', fieldName: 'receive_email_notifications', serializedName: 'receive_email_notifications', default: true })
  receiveEmailNotifications: boolean = true;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at' })
  updatedAt: Date = new Date();
}
