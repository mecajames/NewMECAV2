import { Injectable, Inject, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { TicketDepartment } from './entities/ticket-department.entity';
import { TicketCategoryEntity } from './entities/ticket-category.entity';
import { TicketRoutingRule } from './entities/ticket-routing-rule.entity';
import { Ticket } from './ticket.entity';
import {
  TARGET_DEPARTMENTS,
  TARGET_CATEGORIES,
  TARGET_ROUTING_RULES,
  TICKET_DEPARTMENT_REMAP,
} from './ticket-config-seed';

export interface TicketConfigSyncReport {
  dry_run: boolean;
  departments: { created: string[]; updated: string[]; deactivated: string[]; unchanged: number };
  categories: { created: string[]; updated: string[]; unchanged: number };
  routing_rules: { created: string[]; updated: string[]; unchanged: number };
  tickets_moved: Array<{ ticket_number: string; title: string; from: string; to: string }>;
  tickets_moved_count: number;
  warnings: string[];
}

/** Internal signal used to roll back the transaction in dry-run (preview) mode. */
class DryRunRollback extends Error {
  constructor(public readonly report: TicketConfigSyncReport) {
    super('dry-run');
  }
}

/**
 * One-shot, IDEMPOTENT sync of the ticket configuration (departments,
 * categories, routing rules) to match the canonical seed extracted from local
 * dev — and safe reassignment of any tickets sitting in a department that the
 * sync deactivates.
 *
 * Safety guarantees:
 *  - Tickets are NEVER deleted. Departments are DEACTIVATED, never deleted, so
 *    no FK SET-NULL orphaning. Tickets in a now-inactive department are MOVED
 *    (department_id repointed) to the mapped active successor (see
 *    TICKET_DEPARTMENT_REMAP), defaulting to Triage.
 *  - Idempotent: re-running converges to the same state and reports 0 changes.
 *  - Dry-run does every write inside a transaction and rolls it back, so the
 *    returned report is an EXACT preview of what an apply would do.
 *
 * Gated to James (MECA 202401) at the controller layer.
 */
@Injectable()
export class TicketConfigSyncService {
  private readonly logger = new Logger(TicketConfigSyncService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async syncTicketConfig(adminId: string, opts: { dryRun: boolean }): Promise<TicketConfigSyncReport> {
    const em = this.em.fork();
    let captured: TicketConfigSyncReport | undefined;
    try {
      await em.transactional(async (tem) => {
        captured = await this.run(tem, opts.dryRun);
        if (opts.dryRun) throw new DryRunRollback(captured);
      });
    } catch (e) {
      if (e instanceof DryRunRollback) {
        this.logger.log(`Ticket config sync DRY-RUN by ${adminId}: ${e.report.tickets_moved_count} tickets would move`);
        return e.report;
      }
      throw e;
    }
    this.logger.log(`Ticket config sync APPLIED by ${adminId}: ${captured!.tickets_moved_count} tickets moved`);
    return captured!;
  }

  private async run(em: EntityManager, dryRun: boolean): Promise<TicketConfigSyncReport> {
    const report: TicketConfigSyncReport = {
      dry_run: dryRun,
      departments: { created: [], updated: [], deactivated: [], unchanged: 0 },
      categories: { created: [], updated: [], unchanged: 0 },
      routing_rules: { created: [], updated: [], unchanged: 0 },
      tickets_moved: [],
      tickets_moved_count: 0,
      warnings: [],
    };

    // ---- 1. Departments: upsert by slug -------------------------------------
    const existingDepts = await em.find(TicketDepartment, {});
    const deptBySlug = new Map(existingDepts.map((d) => [d.slug, d]));
    const targetSlugs = new Set(TARGET_DEPARTMENTS.map((d) => d.slug));

    for (const t of TARGET_DEPARTMENTS) {
      const existing = deptBySlug.get(t.slug);
      if (!existing) {
        const dep = em.create(TicketDepartment, {
          name: t.name,
          slug: t.slug,
          description: t.description ?? undefined,
          isActive: t.isActive,
          isPrivate: t.isPrivate,
          isDefault: t.isDefault,
          displayOrder: t.displayOrder,
          audience: t.audience,
          requiredRoles: t.requiredRoles ?? undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        em.persist(dep);
        deptBySlug.set(t.slug, dep);
        report.departments.created.push(t.name);
        continue;
      }
      const wasActive = existing.isActive;
      const changed =
        existing.name !== t.name ||
        (existing.description ?? null) !== (t.description ?? null) ||
        existing.isActive !== t.isActive ||
        existing.isPrivate !== t.isPrivate ||
        existing.isDefault !== t.isDefault ||
        existing.displayOrder !== t.displayOrder ||
        existing.audience !== t.audience ||
        JSON.stringify(existing.requiredRoles ?? null) !== JSON.stringify(t.requiredRoles ?? null);
      if (changed) {
        existing.name = t.name;
        existing.description = t.description ?? undefined;
        existing.isActive = t.isActive;
        existing.isPrivate = t.isPrivate;
        existing.isDefault = t.isDefault;
        existing.displayOrder = t.displayOrder;
        existing.audience = t.audience;
        existing.requiredRoles = t.requiredRoles ?? undefined;
        if (wasActive && !t.isActive) report.departments.deactivated.push(t.name);
        else report.departments.updated.push(t.name);
      } else {
        report.departments.unchanged++;
      }
    }

    // Prod-only departments (exist here, not in the canonical set) → deactivate.
    for (const existing of existingDepts) {
      if (targetSlugs.has(existing.slug)) continue;
      if (existing.isActive) {
        existing.isActive = false;
        report.departments.deactivated.push(existing.name);
      } else {
        report.departments.unchanged++;
      }
    }

    await em.flush(); // ensure created departments have ids for the steps below

    const allDepts = await em.find(TicketDepartment, {});
    const deptBySlugNow = new Map(allDepts.map((d) => [d.slug, d]));

    // ---- 2. Categories: upsert by key ---------------------------------------
    for (const t of TARGET_CATEGORIES) {
      const deptId = t.departmentSlug ? deptBySlugNow.get(t.departmentSlug)?.id ?? undefined : undefined;
      if (t.departmentSlug && !deptId) {
        report.warnings.push(`Category "${t.key}": department "${t.departmentSlug}" not found.`);
      }
      const existing = await em.findOne(TicketCategoryEntity, { key: t.key });
      if (!existing) {
        const cat = em.create(TicketCategoryEntity, {
          key: t.key,
          label: t.label,
          departmentId: deptId,
          description: t.description ?? undefined,
          displayOrder: t.displayOrder,
          isActive: t.isActive,
          audience: t.audience,
          requiredRoles: t.requiredRoles ?? undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        em.persist(cat);
        report.categories.created.push(t.key);
        continue;
      }
      const changed =
        existing.label !== t.label ||
        (existing.departmentId ?? null) !== (deptId ?? null) ||
        (existing.description ?? null) !== (t.description ?? null) ||
        existing.displayOrder !== t.displayOrder ||
        existing.isActive !== t.isActive ||
        existing.audience !== t.audience ||
        JSON.stringify(existing.requiredRoles ?? null) !== JSON.stringify(t.requiredRoles ?? null);
      if (changed) {
        existing.label = t.label;
        existing.departmentId = deptId;
        existing.description = t.description ?? undefined;
        existing.displayOrder = t.displayOrder;
        existing.isActive = t.isActive;
        existing.audience = t.audience;
        existing.requiredRoles = t.requiredRoles ?? undefined;
        report.categories.updated.push(t.key);
      } else {
        report.categories.unchanged++;
      }
    }

    // ---- 3. Routing rules: upsert by name -----------------------------------
    for (const t of TARGET_ROUTING_RULES) {
      const dept = t.assignToDepartmentSlug ? deptBySlugNow.get(t.assignToDepartmentSlug) : null;
      if (t.assignToDepartmentSlug && !dept) {
        report.warnings.push(`Routing rule "${t.name}": department "${t.assignToDepartmentSlug}" not found.`);
      }
      const existing = await em.findOne(TicketRoutingRule, { name: t.name });
      if (!existing) {
        const rule = em.create(TicketRoutingRule, {
          name: t.name,
          description: t.description ?? undefined,
          isActive: t.isActive,
          priority: t.priority,
          conditions: t.conditions as any,
          assignToDepartment: dept ?? undefined,
          assignToStaff: undefined, // staff profiles differ per environment
          setPriority: t.setPriority ?? undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        em.persist(rule);
        report.routing_rules.created.push(t.name);
        continue;
      }
      const changed =
        (existing.description ?? null) !== (t.description ?? null) ||
        existing.isActive !== t.isActive ||
        existing.priority !== t.priority ||
        JSON.stringify(existing.conditions ?? {}) !== JSON.stringify(t.conditions ?? {}) ||
        (existing.assignToDepartment?.id ?? null) !== (dept?.id ?? null) ||
        (existing.setPriority ?? null) !== (t.setPriority ?? null);
      if (changed) {
        existing.description = t.description ?? undefined;
        existing.isActive = t.isActive;
        existing.priority = t.priority;
        existing.conditions = t.conditions as any;
        existing.assignToDepartment = dept ?? undefined;
        existing.assignToStaff = undefined;
        existing.setPriority = t.setPriority ?? undefined;
        report.routing_rules.updated.push(t.name);
      } else {
        report.routing_rules.unchanged++;
      }
    }

    await em.flush();

    // ---- 4. Reassign tickets out of now-inactive departments ----------------
    const inactiveDepts = allDepts.filter((d) => !d.isActive);
    const inactiveIds = inactiveDepts.map((d) => d.id);
    const triage = deptBySlugNow.get('triage');

    if (inactiveIds.length > 0) {
      const orphanTickets = await em.find(
        Ticket,
        { departmentEntity: { $in: inactiveIds } },
        { populate: ['departmentEntity'] },
      );
      for (const ticket of orphanTickets) {
        const fromDept = ticket.departmentEntity;
        if (!fromDept) continue;
        const toSlug = TICKET_DEPARTMENT_REMAP[fromDept.slug] || 'triage';
        const toDept = deptBySlugNow.get(toSlug) || triage;
        if (!toDept) {
          report.warnings.push(`Ticket ${ticket.ticketNumber}: no active successor department found.`);
          continue;
        }
        report.tickets_moved.push({
          ticket_number: ticket.ticketNumber,
          title: ticket.title,
          from: fromDept.name,
          to: toDept.name,
        });
        ticket.departmentEntity = em.getReference(TicketDepartment, toDept.id);
      }
      await em.flush();
    }

    report.tickets_moved_count = report.tickets_moved.length;
    return report;
  }
}
