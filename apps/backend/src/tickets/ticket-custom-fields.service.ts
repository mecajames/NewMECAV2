import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import {
  CreateTicketCustomFieldDto,
  UpdateTicketCustomFieldDto,
  TicketCustomFieldType,
  TicketCustomFieldAnswerInput,
  TicketCustomFieldValue,
} from '@newmeca/shared';
import { TicketCustomField } from './entities/ticket-custom-field.entity';
import { TicketCustomFieldAnswer } from './entities/ticket-custom-field-answer.entity';
import { Ticket } from './ticket.entity';

@Injectable()
export class TicketCustomFieldsService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // ── Definitions: admin CRUD ────────────────────────────────────────────────

  async findAll(): Promise<TicketCustomField[]> {
    const em = this.em.fork();
    return em.find(TicketCustomField, {}, { orderBy: { displayOrder: 'ASC', createdAt: 'ASC' } });
  }

  async findById(id: string): Promise<TicketCustomField> {
    const em = this.em.fork();
    const field = await em.findOne(TicketCustomField, { id });
    if (!field) throw new NotFoundException(`Custom field ${id} not found`);
    return field;
  }

  /**
   * Active fields that apply to `category`, in display order. `visibleOnly`
   * drops admin-only fields (for the public/member submission form).
   */
  async getFieldsForCategory(
    category: string,
    opts?: { visibleOnly?: boolean },
  ): Promise<TicketCustomField[]> {
    const em = this.em.fork();
    const all = await em.find(
      TicketCustomField,
      { isActive: true },
      { orderBy: { displayOrder: 'ASC', createdAt: 'ASC' } },
    );
    return all.filter(
      (f) =>
        Array.isArray(f.categories) &&
        f.categories.includes(category) &&
        (!opts?.visibleOnly || f.visibleToUser),
    );
  }

  async create(dto: CreateTicketCustomFieldDto): Promise<TicketCustomField> {
    const em = this.em.fork();
    const existing = await em.findOne(TicketCustomField, { fieldKey: dto.field_key });
    if (existing) {
      throw new BadRequestException(`A custom field with key "${dto.field_key}" already exists`);
    }
    this.assertOptions(dto.field_type, dto.options ?? null);
    const field = em.create(TicketCustomField, {
      fieldKey: dto.field_key,
      label: dto.label,
      fieldType: dto.field_type,
      helpText: dto.help_text ?? undefined,
      options: this.needsOptions(dto.field_type) ? dto.options ?? [] : undefined,
      categories: dto.categories,
      required: dto.required ?? false,
      visibleToUser: dto.visible_to_user ?? true,
      showWhen: dto.show_when ?? undefined,
      displayOrder: dto.display_order ?? 0,
      isActive: dto.is_active ?? true,
    } as any);
    await em.persistAndFlush(field);
    return field;
  }

  async update(id: string, dto: UpdateTicketCustomFieldDto): Promise<TicketCustomField> {
    const em = this.em.fork();
    const field = await em.findOne(TicketCustomField, { id });
    if (!field) throw new NotFoundException(`Custom field ${id} not found`);

    // field_key is immutable once created (answers reference the field by id,
    // but the key is the stable contract for any external consumer).
    if (dto.field_key !== undefined && dto.field_key !== field.fieldKey) {
      const clash = await em.findOne(TicketCustomField, { fieldKey: dto.field_key });
      if (clash && clash.id !== id) {
        throw new BadRequestException(`A custom field with key "${dto.field_key}" already exists`);
      }
      field.fieldKey = dto.field_key;
    }
    if (dto.label !== undefined) field.label = dto.label;
    if (dto.field_type !== undefined) field.fieldType = dto.field_type;
    if (dto.help_text !== undefined) field.helpText = dto.help_text ?? undefined;
    if (dto.categories !== undefined) field.categories = dto.categories;
    if (dto.required !== undefined) field.required = dto.required;
    if (dto.visible_to_user !== undefined) field.visibleToUser = dto.visible_to_user;
    if (dto.show_when !== undefined) field.showWhen = dto.show_when ?? undefined;
    if (dto.display_order !== undefined) field.displayOrder = dto.display_order;
    if (dto.is_active !== undefined) field.isActive = dto.is_active;
    if (dto.options !== undefined) field.options = dto.options ?? undefined;

    const effectiveType = dto.field_type ?? (field.fieldType as TicketCustomFieldType);
    this.assertOptions(effectiveType, field.options ?? null);
    await em.flush();
    return field;
  }

  async remove(id: string): Promise<void> {
    const em = this.em.fork();
    const field = await em.findOne(TicketCustomField, { id });
    if (!field) throw new NotFoundException(`Custom field ${id} not found`);
    // Answers cascade-delete via the FK rule on TicketCustomFieldAnswer.
    await em.removeAndFlush(field);
  }

  // ── Submission: validation + persistence ────────────────────────────────────

  /**
   * Validate a submission's answers against the active VISIBLE fields for the
   * category. Throws BadRequest listing any missing required fields. Returns the
   * visible fields (for persistence) and the resolved event id from an
   * event_reference answer (so the caller can set ticket.event).
   */
  async validateForSubmission(
    category: string,
    answers: TicketCustomFieldAnswerInput[] = [],
  ): Promise<{ fields: TicketCustomField[]; eventId: string | null }> {
    const fields = await this.getFieldsForCategory(category, { visibleOnly: true });
    const byId = new Map(answers.map((a) => [a.field_id, a.value]));
    const missing: string[] = [];
    let eventId: string | null = null;

    for (const f of fields) {
      // A field hidden by its show_when condition is never required, and its
      // answer is ignored (matches Zendesk/Intercom semantics).
      if (!this.isFieldVisible(f, byId)) continue;
      const val = byId.get(f.id);
      if (f.required && this.isEmpty(f.fieldType, val ?? null)) {
        missing.push(f.label);
      }
      if (f.fieldType === TicketCustomFieldType.EVENT_REFERENCE && typeof val === 'string' && val) {
        eventId = val;
      }
    }

    if (missing.length > 0) {
      throw new BadRequestException(`Please complete required field(s): ${missing.join(', ')}`);
    }
    return { fields, eventId };
  }

  /**
   * Persist answer rows for a ticket. event_reference answers are skipped (they
   * live on ticket.event_id); empty answers are skipped. Call after the ticket
   * is persisted so its id exists.
   */
  async persistAnswers(
    em: EntityManager,
    ticketId: string,
    fields: TicketCustomField[],
    answers: TicketCustomFieldAnswerInput[] = [],
  ): Promise<void> {
    if (!answers.length || !fields.length) return;
    const byId = new Map(fields.map((f) => [f.id, f]));
    const valuesByFieldId = new Map(answers.map((a) => [a.field_id, a.value]));
    let wrote = false;
    for (const a of answers) {
      const field = byId.get(a.field_id);
      if (!field) continue; // unknown / inactive / not-for-category → ignore
      if (!this.isFieldVisible(field, valuesByFieldId)) continue; // hidden → drop answer
      if (field.fieldType === TicketCustomFieldType.EVENT_REFERENCE) continue;
      if (this.isEmpty(field.fieldType, a.value)) continue;
      const row = em.create(TicketCustomFieldAnswer, {
        ticket: em.getReference(Ticket, ticketId),
        field: em.getReference(TicketCustomField, field.id),
        value: this.encodeValue(field.fieldType, a.value),
      } as any);
      em.persist(row);
      wrote = true;
    }
    if (wrote) await em.flush();
  }

  /** Decoded answers (with field metadata) for a ticket, in field display order. */
  async getAnswersForTicket(ticketId: string): Promise<
    Array<{ field_id: string; field_key: string; label: string; field_type: string; value: TicketCustomFieldValue }>
  > {
    const em = this.em.fork();
    const rows = await em.find(
      TicketCustomFieldAnswer,
      { ticket: ticketId },
      { populate: ['field'] },
    );
    return rows
      .filter((r) => !!r.field)
      .sort((a, b) => (a.field.displayOrder ?? 0) - (b.field.displayOrder ?? 0))
      .map((r) => ({
        field_id: r.field.id,
        field_key: r.field.fieldKey,
        label: r.field.label,
        field_type: r.field.fieldType,
        value: this.decodeValue(r.field.fieldType, r.value ?? null),
      }));
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Evaluate a field's show_when condition against the submitted values
   * (keyed by controlling field id). No condition → always visible.
   */
  private isFieldVisible(
    field: TicketCustomField,
    valuesByFieldId: Map<string, TicketCustomFieldValue | undefined>,
  ): boolean {
    const cond = field.showWhen;
    if (!cond || !cond.field_id) return true;
    const raw = valuesByFieldId.get(cond.field_id);
    const condValues = cond.values ?? [];
    switch (cond.operator) {
      case 'is_checked':
        return raw === true || raw === 'true';
      case 'not_empty':
        if (raw === null || raw === undefined) return false;
        if (Array.isArray(raw)) return raw.length > 0;
        return String(raw).trim() !== '';
      case 'equals':
        return condValues.length > 0 && String(raw ?? '') === condValues[0];
      case 'one_of':
        if (Array.isArray(raw)) return raw.some((v) => condValues.includes(String(v)));
        return condValues.includes(String(raw ?? ''));
      default:
        return true;
    }
  }

  private needsOptions(type: string): boolean {
    return type === TicketCustomFieldType.SELECT || type === TicketCustomFieldType.MULTISELECT;
  }

  private assertOptions(type: string, options: { value: string; label: string }[] | null): void {
    if (this.needsOptions(type) && (!options || options.length === 0)) {
      throw new BadRequestException('Dropdown / multi-select fields need at least one option');
    }
  }

  private isEmpty(type: string, value: TicketCustomFieldValue): boolean {
    if (value === null || value === undefined) return true;
    if (type === TicketCustomFieldType.CHECKBOX) return value !== true && value !== 'true';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'string') return value.trim() === '';
    return false; // a present number / boolean
  }

  private encodeValue(type: string, value: TicketCustomFieldValue): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (type === TicketCustomFieldType.MULTISELECT) {
      return JSON.stringify(Array.isArray(value) ? value : [value]);
    }
    if (type === TicketCustomFieldType.CHECKBOX) {
      return value === true || value === 'true' ? 'true' : 'false';
    }
    return String(value);
  }

  private decodeValue(type: string, raw: string | null): TicketCustomFieldValue {
    if (raw === null || raw === undefined) return null;
    if (type === TicketCustomFieldType.MULTISELECT) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    if (type === TicketCustomFieldType.CHECKBOX) return raw === 'true';
    if (type === TicketCustomFieldType.NUMBER) {
      const n = Number(raw);
      return Number.isNaN(n) ? null : n;
    }
    return raw;
  }
}
