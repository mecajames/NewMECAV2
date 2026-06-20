import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { CreateTicketCategoryDto, UpdateTicketCategoryDto } from '@newmeca/shared';
import { TicketCategoryEntity } from './entities/ticket-category.entity';
import { TicketAudienceViewer, isVisibleToViewer } from './ticket-audience.util';

@Injectable()
export class TicketCategoriesService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /** All categories (admin). */
  async findAll(): Promise<TicketCategoryEntity[]> {
    const em = this.em.fork();
    return em.find(TicketCategoryEntity, {}, { orderBy: { displayOrder: 'ASC', label: 'ASC' } });
  }

  /**
   * Active categories for a department (public — drives the form's second
   * dropdown). Pass no department to get all active categories.
   */
  async findForForm(departmentId?: string, viewer?: TicketAudienceViewer): Promise<TicketCategoryEntity[]> {
    const em = this.em.fork();
    const where: Record<string, unknown> = { isActive: true };
    if (departmentId) where.departmentId = departmentId;
    const cats = await em.find(TicketCategoryEntity, where, { orderBy: { displayOrder: 'ASC', label: 'ASC' } });
    // When a viewer is supplied (public form), hide categories that don't match
    // their audience/role. Admin callers pass none → see everything.
    if (!viewer) return cats;
    return cats.filter((c) => isVisibleToViewer(c.audience, c.requiredRoles, viewer));
  }

  async findById(id: string): Promise<TicketCategoryEntity> {
    const em = this.em.fork();
    const cat = await em.findOne(TicketCategoryEntity, { id });
    if (!cat) throw new NotFoundException(`Category ${id} not found`);
    return cat;
  }

  async create(dto: CreateTicketCategoryDto): Promise<TicketCategoryEntity> {
    const em = this.em.fork();
    const existing = await em.findOne(TicketCategoryEntity, { key: dto.key });
    if (existing) throw new BadRequestException(`A category with key "${dto.key}" already exists`);
    const cat = em.create(TicketCategoryEntity, {
      key: dto.key,
      label: dto.label,
      departmentId: dto.department_id ?? undefined,
      description: dto.description ?? undefined,
      displayOrder: dto.display_order ?? 0,
      isActive: dto.is_active ?? true,
      audience: dto.audience ?? 'all',
      requiredRoles: dto.required_roles?.length ? dto.required_roles : undefined,
    } as any);
    await em.persistAndFlush(cat);
    return cat;
  }

  async update(id: string, dto: UpdateTicketCategoryDto): Promise<TicketCategoryEntity> {
    const em = this.em.fork();
    const cat = await em.findOne(TicketCategoryEntity, { id });
    if (!cat) throw new NotFoundException(`Category ${id} not found`);
    if (dto.key !== undefined && dto.key !== cat.key) {
      const clash = await em.findOne(TicketCategoryEntity, { key: dto.key });
      if (clash && clash.id !== id) throw new BadRequestException(`A category with key "${dto.key}" already exists`);
      cat.key = dto.key;
    }
    if (dto.label !== undefined) cat.label = dto.label;
    if (dto.department_id !== undefined) cat.departmentId = dto.department_id ?? undefined;
    if (dto.description !== undefined) cat.description = dto.description ?? undefined;
    if (dto.display_order !== undefined) cat.displayOrder = dto.display_order;
    if (dto.is_active !== undefined) cat.isActive = dto.is_active;
    if (dto.audience !== undefined) cat.audience = dto.audience;
    if (dto.required_roles !== undefined) {
      cat.requiredRoles = dto.required_roles?.length ? dto.required_roles : undefined;
    }
    await em.flush();
    return cat;
  }

  async remove(id: string): Promise<void> {
    const em = this.em.fork();
    const cat = await em.findOne(TicketCategoryEntity, { id });
    if (!cat) throw new NotFoundException(`Category ${id} not found`);
    await em.removeAndFlush(cat);
  }
}
