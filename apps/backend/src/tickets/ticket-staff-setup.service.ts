import { Injectable, Inject, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { TicketCustomFieldType } from '@newmeca/shared';
import { TicketStaff } from './entities/ticket-staff.entity';
import { TicketStaffDepartment } from './entities/ticket-staff-department.entity';
import { TicketDepartment } from './entities/ticket-department.entity';
import { TicketCustomField } from './entities/ticket-custom-field.entity';
import { Profile } from '../profiles/profiles.entity';
import {
  SEED_STAFF,
  SEED_DEPT_ASSIGNMENTS,
  SEED_DEPT_DEFAULT_ASSIGNEES,
  SEED_EVENT_FIELD,
} from './ticket-staff-seed';

export interface TicketStaffSetupReport {
  dry_run: boolean;
  staff: {
    created: string[];
    updated: string[];
    unchanged: number;
    unresolved: Array<{ name: string; email: string }>;
  };
  department_assignments: { created: string[]; updated: string[]; unchanged: number };
  department_default_assignees: Array<{
    department: string;
    assignee: string | null;
    status: 'set' | 'changed' | 'unchanged' | 'skipped';
    note?: string;
  }>;
  event_field: {
    action: 'created' | 'updated' | 'unchanged' | 'skipped';
    field_key: string;
    categories: string[];
    note?: string;
  };
  warnings: string[];
}

/** Internal signal used to roll back the transaction in dry-run (preview) mode. */
class DryRunRollback extends Error {
  constructor(public readonly report: TicketStaffSetupReport) {
    super('dry-run');
  }
}

/**
 * One-shot, IDEMPOTENT setup of the production support-ticket STAFF, their
 * department assignments, the per-department default assignee, and the
 * event-picker custom field — from the canonical seed (ticket-staff-seed.ts).
 *
 * Safety:
 *  - Matches each person to a prod profile by EMAIL (case-insensitive). An email
 *    that doesn't resolve is reported, never guessed.
 *  - Idempotent: re-running converges and reports mostly "unchanged".
 *  - Only ADDS/UPDATES staff rows, department links, the default assignee, and
 *    the event field. It never deletes a person's other assignments and never
 *    touches tickets.
 *  - Dry-run does every write in a transaction and rolls it back, so the report
 *    is an exact preview.
 *
 * Requires the departments/categories to already exist (run config-sync first)
 * and the ticket_departments.default_assignee_id column (migration
 * 20260627000000) to be applied.
 *
 * Gated to James (MECA 202401) at the controller layer.
 */
@Injectable()
export class TicketStaffSetupService {
  private readonly logger = new Logger(TicketStaffSetupService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async applyStaffSetup(adminId: string, opts: { dryRun: boolean }): Promise<TicketStaffSetupReport> {
    const em = this.em.fork();
    let captured: TicketStaffSetupReport | undefined;
    try {
      await em.transactional(async (tem) => {
        captured = await this.run(tem, opts.dryRun);
        if (opts.dryRun) throw new DryRunRollback(captured);
      });
    } catch (e) {
      if (e instanceof DryRunRollback) {
        this.logger.log(`Ticket staff setup DRY-RUN by ${adminId}`);
        return e.report;
      }
      throw e;
    }
    this.logger.log(`Ticket staff setup APPLIED by ${adminId}`);
    return captured!;
  }

  private async run(em: EntityManager, dryRun: boolean): Promise<TicketStaffSetupReport> {
    const report: TicketStaffSetupReport = {
      dry_run: dryRun,
      staff: { created: [], updated: [], unchanged: 0, unresolved: [] },
      department_assignments: { created: [], updated: [], unchanged: 0 },
      department_default_assignees: [],
      event_field: { action: 'skipped', field_key: SEED_EVENT_FIELD.fieldKey, categories: SEED_EVENT_FIELD.categories },
      warnings: [],
    };

    // ---- 1. Resolve emails -> profiles (case-insensitive) -------------------
    const emailToProfile = new Map<string, Profile>();
    const emailToName = new Map<string, string>();
    for (const s of SEED_STAFF) {
      emailToName.set(s.email, s.name);
      const matches = await em.find(Profile, { email: { $ilike: s.email } });
      if (matches.length === 0) {
        report.staff.unresolved.push({ name: s.name, email: s.email });
        report.warnings.push(`No prod account found for ${s.name} <${s.email}> — skipped.`);
        continue;
      }
      if (matches.length > 1) {
        report.warnings.push(
          `${s.name} <${s.email}> matched ${matches.length} profiles — using the first (id ${matches[0].id}). Clean up the duplicate.`,
        );
      }
      emailToProfile.set(s.email, matches[0]);
    }

    // ---- 2. Staff: upsert by profile ----------------------------------------
    const staffByEmail = new Map<string, TicketStaff>();
    for (const s of SEED_STAFF) {
      const profile = emailToProfile.get(s.email);
      if (!profile) continue;

      let staff = await em.findOne(TicketStaff, { profile: profile.id });
      if (!staff) {
        staff = em.create(TicketStaff, {
          profile,
          permissionLevel: s.permissionLevel,
          isActive: true,
          canBeAssignedTickets: s.canBeAssignedTickets,
          receiveEmailNotifications: s.receiveEmailNotifications,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);
        em.persist(staff);
        report.staff.created.push(s.name);
      } else {
        const changed =
          staff.permissionLevel !== s.permissionLevel ||
          staff.isActive !== true ||
          staff.canBeAssignedTickets !== s.canBeAssignedTickets ||
          staff.receiveEmailNotifications !== s.receiveEmailNotifications;
        if (changed) {
          staff.permissionLevel = s.permissionLevel;
          staff.isActive = true;
          staff.canBeAssignedTickets = s.canBeAssignedTickets;
          staff.receiveEmailNotifications = s.receiveEmailNotifications;
          report.staff.updated.push(s.name);
        } else {
          report.staff.unchanged++;
        }
      }
      staffByEmail.set(s.email, staff);
    }
    await em.flush(); // ensure created staff have ids for the links below

    // ---- 3. Department assignments: upsert by (staff, department) ------------
    for (const da of SEED_DEPT_ASSIGNMENTS) {
      const dept = await em.findOne(TicketDepartment, { slug: da.departmentSlug });
      if (!dept) {
        report.warnings.push(`Department "${da.departmentSlug}" not found — assignments skipped. Run config-sync first.`);
        continue;
      }
      for (const m of da.members) {
        const staff = staffByEmail.get(m.email);
        if (!staff) continue; // unresolved email — already warned
        const name = emailToName.get(m.email) ?? m.email;
        const label = `${name} → ${dept.name} (${m.head ? 'head' : 'member'})`;

        let link = await em.findOne(TicketStaffDepartment, { staff: staff.id, department: dept.id });
        if (!link) {
          link = em.create(TicketStaffDepartment, {
            staff,
            department: dept,
            isDepartmentHead: m.head,
            createdAt: new Date(),
          } as any);
          em.persist(link);
          report.department_assignments.created.push(label);
        } else if (link.isDepartmentHead !== m.head) {
          link.isDepartmentHead = m.head;
          report.department_assignments.updated.push(label);
        } else {
          report.department_assignments.unchanged++;
        }
      }
    }
    await em.flush();

    // ---- 4. Per-department default assignee ----------------------------------
    for (const d of SEED_DEPT_DEFAULT_ASSIGNEES) {
      const dept = await em.findOne(
        TicketDepartment,
        { slug: d.departmentSlug },
        { populate: ['defaultAssignee'] },
      );
      if (!dept) {
        report.department_default_assignees.push({
          department: d.departmentSlug,
          assignee: null,
          status: 'skipped',
          note: 'department not found',
        });
        continue;
      }
      if (!d.primaryEmail) {
        report.department_default_assignees.push({ department: dept.name, assignee: null, status: 'skipped' });
        continue;
      }
      const profile = emailToProfile.get(d.primaryEmail);
      if (!profile) {
        report.department_default_assignees.push({
          department: dept.name,
          assignee: emailToName.get(d.primaryEmail) ?? d.primaryEmail,
          status: 'skipped',
          note: 'assignee account not found',
        });
        continue;
      }
      const oldId = dept.defaultAssignee?.id ?? null;
      const name = emailToName.get(d.primaryEmail) ?? d.primaryEmail;
      if (oldId === profile.id) {
        report.department_default_assignees.push({ department: dept.name, assignee: name, status: 'unchanged' });
      } else {
        dept.defaultAssignee = em.getReference(Profile, profile.id);
        report.department_default_assignees.push({
          department: dept.name,
          assignee: name,
          status: oldId ? 'changed' : 'set',
        });
      }
    }
    await em.flush();

    // ---- 5. Event-picker custom field ---------------------------------------
    // Prefer an existing event_reference field (there should be at most one) so
    // we never create a duplicate event picker; fall back to the canonical key.
    let field =
      (await em.findOne(TicketCustomField, { fieldType: TicketCustomFieldType.EVENT_REFERENCE })) ||
      (await em.findOne(TicketCustomField, { fieldKey: SEED_EVENT_FIELD.fieldKey }));

    if (!field) {
      field = em.create(TicketCustomField, {
        fieldKey: SEED_EVENT_FIELD.fieldKey,
        label: SEED_EVENT_FIELD.label,
        fieldType: TicketCustomFieldType.EVENT_REFERENCE,
        helpText: SEED_EVENT_FIELD.helpText ?? undefined,
        categories: SEED_EVENT_FIELD.categories,
        required: SEED_EVENT_FIELD.required,
        visibleToUser: true,
        displayOrder: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      em.persist(field);
      report.event_field = { action: 'created', field_key: field.fieldKey, categories: SEED_EVENT_FIELD.categories };
    } else {
      const sameCategories =
        Array.isArray(field.categories) &&
        field.categories.length === SEED_EVENT_FIELD.categories.length &&
        SEED_EVENT_FIELD.categories.every((c) => field!.categories.includes(c));
      const changed =
        field.label !== SEED_EVENT_FIELD.label ||
        field.fieldType !== TicketCustomFieldType.EVENT_REFERENCE ||
        (field.helpText ?? null) !== (SEED_EVENT_FIELD.helpText ?? null) ||
        field.required !== SEED_EVENT_FIELD.required ||
        field.visibleToUser !== true ||
        field.isActive !== true ||
        !sameCategories;
      if (changed) {
        field.label = SEED_EVENT_FIELD.label;
        field.fieldType = TicketCustomFieldType.EVENT_REFERENCE;
        field.helpText = SEED_EVENT_FIELD.helpText ?? undefined;
        field.categories = SEED_EVENT_FIELD.categories;
        field.required = SEED_EVENT_FIELD.required;
        field.visibleToUser = true;
        field.isActive = true;
        report.event_field = {
          action: 'updated',
          field_key: field.fieldKey,
          categories: SEED_EVENT_FIELD.categories,
          note: field.fieldKey !== SEED_EVENT_FIELD.fieldKey ? `existing field key "${field.fieldKey}" kept` : undefined,
        };
      } else {
        report.event_field = { action: 'unchanged', field_key: field.fieldKey, categories: SEED_EVENT_FIELD.categories };
      }
    }
    await em.flush();

    return report;
  }
}
