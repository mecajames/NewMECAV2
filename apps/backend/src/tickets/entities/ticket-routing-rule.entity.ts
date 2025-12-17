import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { TicketDepartment } from './ticket-department.entity';
import { TicketStaff } from './ticket-staff.entity';

export interface RoutingConditions {
  category?: string;
  keywords?: string[];
  user_membership_status?: string;
  title_contains?: string;
  description_contains?: string;
}

@Entity({ tableName: 'ticket_routing_rules', schema: 'public' })
export class TicketRoutingRule {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'varchar', length: 100 })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'boolean', fieldName: 'is_active', serializedName: 'is_active', default: true })
  isActive: boolean = true;

  @Property({ type: 'integer', default: 0 })
  priority: number = 0; // Higher = checked first

  @Property({ type: 'json', default: '{}' })
  conditions: RoutingConditions = {};

  @ManyToOne(() => TicketDepartment, { nullable: true, fieldName: 'assign_to_department_id', serializedName: 'assign_to_department_id' })
  assignToDepartment?: TicketDepartment;

  @ManyToOne(() => TicketStaff, { nullable: true, fieldName: 'assign_to_staff_id', serializedName: 'assign_to_staff_id' })
  assignToStaff?: TicketStaff;

  @Property({ type: 'varchar', length: 20, nullable: true, fieldName: 'set_priority', serializedName: 'set_priority' })
  setPriority?: string; // 'low', 'medium', 'high', 'critical'

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at' })
  updatedAt: Date = new Date();
}
