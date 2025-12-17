import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { EntityManager, Reference } from '@mikro-orm/core';
import { TicketStaff } from './entities/ticket-staff.entity';
import { TicketStaffDepartment } from './entities/ticket-staff-department.entity';
import { TicketDepartment } from './entities/ticket-department.entity';
import { Profile } from '../profiles/profiles.entity';
import { CreateTicketStaffDto, UpdateTicketStaffDto } from '@newmeca/shared';

@Injectable()
export class TicketStaffService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(includeInactive: boolean = false): Promise<any[]> {
    const em = this.em.fork();
    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }

    const staff = await em.find(TicketStaff, where, {
      populate: ['profile'],
      orderBy: { createdAt: 'DESC' },
    });

    // Fetch department assignments for each staff member
    const result = await Promise.all(staff.map(async (s) => {
      const assignments = await em.find(TicketStaffDepartment, { staff: s.id }, {
        populate: ['department'],
      });

      return {
        id: s.id,
        profile_id: s.profile.id,
        permission_level: s.permissionLevel,
        is_active: s.isActive,
        can_be_assigned_tickets: s.canBeAssignedTickets,
        receive_email_notifications: s.receiveEmailNotifications,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
        profile: {
          id: s.profile.id,
          email: s.profile.email,
          first_name: s.profile.first_name,
          last_name: s.profile.last_name,
          role: s.profile.role,
        },
        departments: assignments.map((a) => ({
          id: a.department.id,
          name: a.department.name,
          slug: a.department.slug,
          is_department_head: a.isDepartmentHead,
        })),
      };
    }));

    return result;
  }

  async findById(id: string): Promise<any> {
    const em = this.em.fork();
    const staff = await em.findOne(TicketStaff, { id }, { populate: ['profile'] });

    if (!staff) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    const assignments = await em.find(TicketStaffDepartment, { staff: id }, {
      populate: ['department'],
    });

    return {
      id: staff.id,
      profile_id: staff.profile.id,
      permission_level: staff.permissionLevel,
      is_active: staff.isActive,
      can_be_assigned_tickets: staff.canBeAssignedTickets,
      receive_email_notifications: staff.receiveEmailNotifications,
      created_at: staff.createdAt,
      updated_at: staff.updatedAt,
      profile: {
        id: staff.profile.id,
        email: staff.profile.email,
        first_name: staff.profile.first_name,
        last_name: staff.profile.last_name,
        role: staff.profile.role,
      },
      departments: assignments.map((a) => ({
        id: a.department.id,
        name: a.department.name,
        slug: a.department.slug,
        is_department_head: a.isDepartmentHead,
      })),
    };
  }

  async findByProfileId(profileId: string): Promise<TicketStaff | null> {
    const em = this.em.fork();
    return em.findOne(TicketStaff, { profile: profileId });
  }

  async isStaff(profileId: string): Promise<boolean> {
    const staff = await this.findByProfileId(profileId);
    return staff !== null && staff.isActive;
  }

  async getPermissionLevel(profileId: string): Promise<number> {
    const staff = await this.findByProfileId(profileId);
    return staff?.isActive ? staff.permissionLevel : 0;
  }

  async create(data: CreateTicketStaffDto): Promise<any> {
    const em = this.em.fork();

    // Check if profile exists
    const profile = await em.findOne(Profile, { id: data.profile_id });
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${data.profile_id} not found`);
    }

    // Check if already a staff member
    const existing = await em.findOne(TicketStaff, { profile: data.profile_id });
    if (existing) {
      throw new ConflictException('This user is already a ticket staff member');
    }

    const staff = em.create(TicketStaff, {
      profile: profile,
      permissionLevel: data.permission_level ?? 1,
      canBeAssignedTickets: data.can_be_assigned_tickets ?? true,
      receiveEmailNotifications: data.receive_email_notifications ?? true,
    } as any);

    await em.persistAndFlush(staff);

    // Assign to departments if provided
    if (data.department_ids && data.department_ids.length > 0) {
      await this.assignToDepartmentsInternal(em, staff, data.department_ids);
    }

    return this.findById(staff.id);
  }

  async update(id: string, data: UpdateTicketStaffDto): Promise<any> {
    const em = this.em.fork();
    const staff = await em.findOne(TicketStaff, { id });

    if (!staff) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    const updateData: Partial<TicketStaff> = {};
    if (data.permission_level !== undefined) updateData.permissionLevel = data.permission_level;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;
    if (data.can_be_assigned_tickets !== undefined) updateData.canBeAssignedTickets = data.can_be_assigned_tickets;
    if (data.receive_email_notifications !== undefined) updateData.receiveEmailNotifications = data.receive_email_notifications;

    em.assign(staff, updateData);
    await em.flush();
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const staff = await em.findOne(TicketStaff, { id });

    if (!staff) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    // Delete department assignments first
    await em.nativeDelete(TicketStaffDepartment, { staff: id });

    await em.removeAndFlush(staff);
  }

  async assignToDepartments(staffId: string, departmentIds: string[]): Promise<void> {
    const em = this.em.fork();

    const staff = await em.findOne(TicketStaff, { id: staffId });
    if (!staff) {
      throw new NotFoundException(`Staff member with ID ${staffId} not found`);
    }

    // Verify all departments exist
    const departments = await em.find(TicketDepartment, { id: { $in: departmentIds } });
    if (departments.length !== departmentIds.length) {
      throw new NotFoundException('One or more departments not found');
    }

    // Remove existing assignments
    await em.nativeDelete(TicketStaffDepartment, { staff: staffId });

    // Create new assignments
    const deptMap = new Map(departments.map(d => [d.id, d]));
    for (const deptId of departmentIds) {
      const department = deptMap.get(deptId)!;
      const assignment = em.create(TicketStaffDepartment, {
        staff: staff,
        department: department,
        isDepartmentHead: false,
      } as any);
      em.persist(assignment);
    }

    await em.flush();
  }

  private async assignToDepartmentsInternal(em: EntityManager, staff: TicketStaff, departmentIds: string[]): Promise<void> {
    // Verify all departments exist
    const departments = await em.find(TicketDepartment, { id: { $in: departmentIds } });
    if (departments.length !== departmentIds.length) {
      throw new NotFoundException('One or more departments not found');
    }

    // Create new assignments
    for (const department of departments) {
      const assignment = em.create(TicketStaffDepartment, {
        staff: staff,
        department: department,
        isDepartmentHead: false,
      } as any);
      em.persist(assignment);
    }

    await em.flush();
  }

  async removeDepartmentAssignment(staffId: string, departmentId: string): Promise<void> {
    const em = this.em.fork();

    const assignment = await em.findOne(TicketStaffDepartment, {
      staff: staffId,
      department: departmentId,
    });

    if (!assignment) {
      throw new NotFoundException('Department assignment not found');
    }

    await em.removeAndFlush(assignment);
  }

  async setDepartmentHead(staffId: string, departmentId: string, isHead: boolean): Promise<void> {
    const em = this.em.fork();

    const assignment = await em.findOne(TicketStaffDepartment, {
      staff: staffId,
      department: departmentId,
    });

    if (!assignment) {
      throw new NotFoundException('Department assignment not found');
    }

    // If setting as head, unset any other head for this department
    if (isHead) {
      await em.nativeUpdate(
        TicketStaffDepartment,
        { department: departmentId, isDepartmentHead: true },
        { isDepartmentHead: false }
      );
    }

    assignment.isDepartmentHead = isHead;
    await em.flush();
  }

  async getStaffForDepartment(departmentId: string): Promise<TicketStaff[]> {
    const em = this.em.fork();

    const assignments = await em.find(TicketStaffDepartment,
      { department: departmentId },
      { populate: ['staff', 'staff.profile'] }
    );

    return assignments
      .filter(a => a.staff.isActive && a.staff.canBeAssignedTickets)
      .map(a => a.staff);
  }

  async getDepartmentsForStaff(staffId: string): Promise<string[]> {
    const em = this.em.fork();

    const assignments = await em.find(TicketStaffDepartment, { staff: staffId });
    return assignments.map(a => a.department.id);
  }

  /**
   * Get department IDs for a staff member by their profile ID.
   * Returns empty array if the user is not a staff member.
   */
  async getStaffDepartmentIds(profileId: string): Promise<string[]> {
    const staff = await this.findByProfileId(profileId);
    if (!staff || !staff.isActive) {
      return [];
    }
    return this.getDepartmentsForStaff(staff.id);
  }
}
