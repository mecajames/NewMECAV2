import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { TicketRoutingRule, RoutingConditions } from './entities/ticket-routing-rule.entity';
import { TicketDepartment } from './entities/ticket-department.entity';
import { TicketStaff } from './entities/ticket-staff.entity';
import { TicketDepartmentsService } from './ticket-departments.service';
import { CreateTicketRoutingRuleDto, UpdateTicketRoutingRuleDto } from '@newmeca/shared';

export interface RoutingResult {
  departmentId?: string;
  staffId?: string;
  priority?: string;
  matchedRule?: TicketRoutingRule;
}

@Injectable()
export class TicketRoutingService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly departmentsService: TicketDepartmentsService,
  ) {}

  async findAll(includeInactive: boolean = false): Promise<TicketRoutingRule[]> {
    const em = this.em.fork();
    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    return em.find(TicketRoutingRule, where, {
      populate: ['assignToDepartment', 'assignToStaff', 'assignToStaff.profile'],
      orderBy: { priority: 'DESC', createdAt: 'ASC' },
    });
  }

  async findById(id: string): Promise<TicketRoutingRule> {
    const em = this.em.fork();
    const rule = await em.findOne(TicketRoutingRule, { id }, {
      populate: ['assignToDepartment', 'assignToStaff', 'assignToStaff.profile'],
    });
    if (!rule) {
      throw new NotFoundException(`Routing rule with ID ${id} not found`);
    }
    return rule;
  }

  async create(data: CreateTicketRoutingRuleDto): Promise<TicketRoutingRule> {
    const em = this.em.fork();

    // Fetch related entities if specified
    let department: TicketDepartment | undefined;
    let staff: TicketStaff | undefined;

    if (data.assign_to_department_id) {
      department = await em.findOne(TicketDepartment, { id: data.assign_to_department_id }) ?? undefined;
      if (!department) {
        throw new NotFoundException(`Department with ID ${data.assign_to_department_id} not found`);
      }
    }

    if (data.assign_to_staff_id) {
      staff = await em.findOne(TicketStaff, { id: data.assign_to_staff_id }) ?? undefined;
      if (!staff) {
        throw new NotFoundException(`Staff with ID ${data.assign_to_staff_id} not found`);
      }
    }

    const rule = em.create(TicketRoutingRule, {
      name: data.name,
      description: data.description,
      isActive: data.is_active ?? true,
      priority: data.priority ?? 0,
      conditions: data.conditions ?? {},
      setPriority: data.set_priority,
      assignToDepartment: department,
      assignToStaff: staff,
    } as any);

    await em.persistAndFlush(rule);
    return this.findById(rule.id);
  }

  async update(id: string, data: UpdateTicketRoutingRuleDto): Promise<TicketRoutingRule> {
    const em = this.em.fork();
    const rule = await em.findOne(TicketRoutingRule, { id });

    if (!rule) {
      throw new NotFoundException(`Routing rule with ID ${id} not found`);
    }

    const updateData: Partial<TicketRoutingRule> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description ?? undefined;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.conditions !== undefined) updateData.conditions = data.conditions;
    if (data.set_priority !== undefined) updateData.setPriority = data.set_priority ?? undefined;

    if (data.assign_to_department_id !== undefined) {
      if (data.assign_to_department_id) {
        const department = await em.findOne(TicketDepartment, { id: data.assign_to_department_id });
        if (!department) {
          throw new NotFoundException(`Department with ID ${data.assign_to_department_id} not found`);
        }
        updateData.assignToDepartment = department;
      } else {
        updateData.assignToDepartment = undefined;
      }
    }

    if (data.assign_to_staff_id !== undefined) {
      if (data.assign_to_staff_id) {
        const staff = await em.findOne(TicketStaff, { id: data.assign_to_staff_id });
        if (!staff) {
          throw new NotFoundException(`Staff with ID ${data.assign_to_staff_id} not found`);
        }
        updateData.assignToStaff = staff;
      } else {
        updateData.assignToStaff = undefined;
      }
    }

    em.assign(rule, updateData);
    await em.flush();
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const rule = await em.findOne(TicketRoutingRule, { id });

    if (!rule) {
      throw new NotFoundException(`Routing rule with ID ${id} not found`);
    }

    await em.removeAndFlush(rule);
  }

  /**
   * Execute routing rules against a ticket to determine assignment
   */
  async executeRouting(ticket: {
    title: string;
    description: string;
    category: string;
    userMembershipStatus?: string;
  }): Promise<RoutingResult> {
    const rules = await this.findAll(false); // Only active rules
    const result: RoutingResult = {};

    for (const rule of rules) {
      if (this.matchesConditions(ticket, rule.conditions)) {
        if (rule.assignToDepartment) {
          result.departmentId = rule.assignToDepartment.id;
        }
        if (rule.assignToStaff) {
          result.staffId = rule.assignToStaff.id;
        }
        if (rule.setPriority) {
          result.priority = rule.setPriority;
        }
        result.matchedRule = rule;
        break; // Stop at first matching rule (highest priority)
      }
    }

    // If no rule matched, use default department
    if (!result.departmentId) {
      const defaultDept = await this.departmentsService.findDefault();
      if (defaultDept) {
        result.departmentId = defaultDept.id;
      }
    }

    return result;
  }

  /**
   * Check if ticket matches rule conditions
   */
  private matchesConditions(
    ticket: {
      title: string;
      description: string;
      category: string;
      userMembershipStatus?: string;
    },
    conditions: RoutingConditions
  ): boolean {
    // Category match
    if (conditions.category && conditions.category !== ticket.category) {
      return false;
    }

    // Membership status match
    if (conditions.user_membership_status && conditions.user_membership_status !== ticket.userMembershipStatus) {
      return false;
    }

    // Title contains
    if (conditions.title_contains) {
      const searchTerm = conditions.title_contains.toLowerCase();
      if (!ticket.title.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }

    // Description contains
    if (conditions.description_contains) {
      const searchTerm = conditions.description_contains.toLowerCase();
      if (!ticket.description.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }

    // Keywords match (any keyword in title or description)
    if (conditions.keywords && conditions.keywords.length > 0) {
      const text = `${ticket.title} ${ticket.description}`.toLowerCase();
      const hasKeyword = conditions.keywords.some(keyword =>
        text.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) {
        return false;
      }
    }

    return true;
  }
}
