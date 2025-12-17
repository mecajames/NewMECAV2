import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { TicketDepartment } from './entities/ticket-department.entity';
import { CreateTicketDepartmentDto, UpdateTicketDepartmentDto } from '@newmeca/shared';

@Injectable()
export class TicketDepartmentsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async findAll(includeInactive: boolean = false): Promise<TicketDepartment[]> {
    const em = this.em.fork();
    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    return em.find(TicketDepartment, where, {
      orderBy: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async findPublic(): Promise<TicketDepartment[]> {
    const em = this.em.fork();
    return em.find(TicketDepartment, { isActive: true, isPrivate: false }, {
      orderBy: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async findById(id: string): Promise<TicketDepartment> {
    const em = this.em.fork();
    const department = await em.findOne(TicketDepartment, { id });
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    return department;
  }

  async findBySlug(slug: string): Promise<TicketDepartment> {
    const em = this.em.fork();
    const department = await em.findOne(TicketDepartment, { slug });
    if (!department) {
      throw new NotFoundException(`Department with slug ${slug} not found`);
    }
    return department;
  }

  async findDefault(): Promise<TicketDepartment | null> {
    const em = this.em.fork();
    return em.findOne(TicketDepartment, { isDefault: true, isActive: true });
  }

  async create(data: CreateTicketDepartmentDto): Promise<TicketDepartment> {
    const em = this.em.fork();

    // Check for duplicate name or slug
    const existing = await em.findOne(TicketDepartment, {
      $or: [{ name: data.name }, { slug: data.slug }],
    });
    if (existing) {
      throw new ConflictException('Department with this name or slug already exists');
    }

    // If this is set as default, unset any other default
    if (data.is_default) {
      await em.nativeUpdate(TicketDepartment, { isDefault: true }, { isDefault: false });
    }

    const department = em.create(TicketDepartment, {
      name: data.name,
      slug: data.slug,
      description: data.description ?? undefined,
      isPrivate: data.is_private ?? false,
      isDefault: data.is_default ?? false,
      displayOrder: data.display_order ?? 0,
    } as any);

    await em.persistAndFlush(department);
    return department;
  }

  async update(id: string, data: UpdateTicketDepartmentDto): Promise<TicketDepartment> {
    const em = this.em.fork();
    const department = await em.findOne(TicketDepartment, { id });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    // Check for duplicate name or slug (excluding self)
    if (data.name || data.slug) {
      const existing = await em.findOne(TicketDepartment, {
        $and: [
          { id: { $ne: id } },
          { $or: [
            ...(data.name ? [{ name: data.name }] : []),
            ...(data.slug ? [{ slug: data.slug }] : []),
          ]},
        ],
      });
      if (existing) {
        throw new ConflictException('Department with this name or slug already exists');
      }
    }

    // If this is set as default, unset any other default
    if (data.is_default === true) {
      await em.nativeUpdate(TicketDepartment, { isDefault: true, id: { $ne: id } }, { isDefault: false });
    }

    // Prevent making default department private
    if (department.isDefault && data.is_private === true) {
      throw new ConflictException('Cannot make the default department private');
    }

    const updateData: Partial<TicketDepartment> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description ?? undefined;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;
    if (data.is_private !== undefined) updateData.isPrivate = data.is_private;
    if (data.is_default !== undefined) updateData.isDefault = data.is_default;
    if (data.display_order !== undefined) updateData.displayOrder = data.display_order;

    em.assign(department, updateData);
    await em.flush();
    return department;
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const department = await em.findOne(TicketDepartment, { id });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    if (department.isDefault) {
      throw new ConflictException('Cannot delete the default department');
    }

    await em.removeAndFlush(department);
  }
}
