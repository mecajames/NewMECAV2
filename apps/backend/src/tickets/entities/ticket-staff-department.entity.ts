import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { TicketStaff } from './ticket-staff.entity';
import { TicketDepartment } from './ticket-department.entity';

@Entity({ tableName: 'ticket_staff_departments', schema: 'public' })
export class TicketStaffDepartment {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => TicketStaff, { fieldName: 'staff_id', serializedName: 'staff_id' })
  staff!: TicketStaff;

  @ManyToOne(() => TicketDepartment, { fieldName: 'department_id', serializedName: 'department_id' })
  department!: TicketDepartment;

  @Property({ type: 'boolean', fieldName: 'is_department_head', serializedName: 'is_department_head', default: false })
  isDepartmentHead: boolean = false;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();
}
