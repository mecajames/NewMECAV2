import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EntityManager, wrap } from '@mikro-orm/core';
import { InvoiceItemType } from '@newmeca/shared';
import {
  RecurringInvoiceTemplate,
  RecurringFrequency,
  RecurringLineItem,
  RecurringBillingAddress,
} from './recurring-invoice-template.entity';
import { Profile } from '../profiles/profiles.entity';
import { InvoicesService } from '../invoices/invoices.service';

export interface CreateRecurringTemplateDto {
  userId?: string;
  name: string;
  lineItems: RecurringLineItem[];
  billingAddress?: RecurringBillingAddress;
  tax?: string;
  discount?: string;
  couponCode?: string;
  currency?: string;
  notes?: string;
  frequency: RecurringFrequency;
  nextRunDate: string; // ISO date
  active?: boolean;
}

export interface UpdateRecurringTemplateDto extends Partial<CreateRecurringTemplateDto> {}

@Injectable()
export class RecurringInvoicesService {
  private readonly logger = new Logger(RecurringInvoicesService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly invoicesService: InvoicesService,
  ) {}

  /**
   * Advance a JS Date by the recurring frequency. Day-of-month is preserved
   * where the target month allows it (Jan 31 → Feb 28 / 29).
   */
  private advanceDate(date: Date, frequency: RecurringFrequency): Date {
    const next = new Date(date);
    if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
    else if (frequency === 'quarterly') next.setMonth(next.getMonth() + 3);
    else if (frequency === 'annual') next.setFullYear(next.getFullYear() + 1);
    return next;
  }

  async findAll(): Promise<RecurringInvoiceTemplate[]> {
    const em = this.em.fork();
    return em.find(
      RecurringInvoiceTemplate,
      {},
      { populate: ['user'], orderBy: { nextRunDate: 'ASC' } },
    );
  }

  async findById(id: string): Promise<RecurringInvoiceTemplate> {
    const em = this.em.fork();
    const tpl = await em.findOne(RecurringInvoiceTemplate, { id }, { populate: ['user', 'lastInvoice'] });
    if (!tpl) throw new NotFoundException(`Recurring template ${id} not found`);
    return tpl;
  }

  async create(data: CreateRecurringTemplateDto): Promise<RecurringInvoiceTemplate> {
    const em = this.em.fork();
    let user: Profile | undefined;
    if (data.userId) {
      const found = await em.findOne(Profile, { id: data.userId });
      if (!found) throw new NotFoundException(`User ${data.userId} not found`);
      user = found;
    }
    if (!data.lineItems || data.lineItems.length === 0) {
      throw new BadRequestException('At least one line item is required');
    }

    const template = em.create(RecurringInvoiceTemplate, {
      user,
      name: data.name,
      lineItems: data.lineItems,
      billingAddress: data.billingAddress,
      tax: data.tax ?? '0',
      discount: data.discount ?? '0',
      couponCode: data.couponCode,
      currency: data.currency ?? 'USD',
      notes: data.notes,
      frequency: data.frequency,
      nextRunDate: new Date(data.nextRunDate),
      active: data.active ?? true,
    } as Partial<RecurringInvoiceTemplate> as RecurringInvoiceTemplate);

    await em.persistAndFlush(template);
    return template;
  }

  async update(id: string, data: UpdateRecurringTemplateDto): Promise<RecurringInvoiceTemplate> {
    const em = this.em.fork();
    const tpl = await em.findOne(RecurringInvoiceTemplate, { id });
    if (!tpl) throw new NotFoundException(`Recurring template ${id} not found`);

    const patch: Partial<RecurringInvoiceTemplate> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.lineItems !== undefined) patch.lineItems = data.lineItems;
    if (data.billingAddress !== undefined) patch.billingAddress = data.billingAddress;
    if (data.tax !== undefined) patch.tax = data.tax;
    if (data.discount !== undefined) patch.discount = data.discount;
    if (data.couponCode !== undefined) patch.couponCode = data.couponCode;
    if (data.currency !== undefined) patch.currency = data.currency;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.frequency !== undefined) patch.frequency = data.frequency;
    if (data.nextRunDate !== undefined) patch.nextRunDate = new Date(data.nextRunDate);
    if (data.active !== undefined) patch.active = data.active;

    if (data.userId !== undefined) {
      if (data.userId === null as any || data.userId === '') {
        patch.user = undefined;
      } else {
        const found = await em.findOne(Profile, { id: data.userId });
        if (!found) throw new NotFoundException(`User ${data.userId} not found`);
        patch.user = found;
      }
    }

    // Direct property assignment — RecurringInvoiceTemplate has fieldName
    // serializedName entries. Avoid em.assign() (documented mis-mapping bug).
    for (const [key, value] of Object.entries(patch)) {
      (tpl as any)[key] = value;
    }
    await em.flush();
    return tpl;
  }

  async deactivate(id: string): Promise<RecurringInvoiceTemplate> {
    return this.update(id, { active: false });
  }

  async activate(id: string): Promise<RecurringInvoiceTemplate> {
    return this.update(id, { active: true });
  }

  async delete(id: string): Promise<void> {
    const em = this.em.fork();
    const tpl = await em.findOne(RecurringInvoiceTemplate, { id });
    if (!tpl) throw new NotFoundException(`Recurring template ${id} not found`);
    em.remove(tpl);
    await em.flush();
  }

  /**
   * Process all active templates whose next_run_date <= today. For each:
   *  1. Materialize an Invoice (which auto-creates a paired Order via
   *     InvoicesService.create)
   *  2. Advance next_run_date by the template's frequency
   *  3. Increment run_count
   *  4. Stash last_invoice_id + last_run_at
   *
   * Failures don't stop the batch — each template is wrapped so a single
   * bad row can't poison the whole run.
   */
  async processDueTemplates(): Promise<{ generated: number; failed: number }> {
    const em = this.em.fork();
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const due = await em.find(
      RecurringInvoiceTemplate,
      { active: true, nextRunDate: { $lte: today } },
      { populate: ['user'] },
    );

    let generated = 0;
    let failed = 0;
    for (const tpl of due) {
      try {
        const invoice = await this.invoicesService.create({
          userId: tpl.user?.id,
          items: tpl.lineItems.map(li => ({
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            itemType: (li.itemType as InvoiceItemType) ?? InvoiceItemType.OTHER,
            referenceId: li.referenceId,
          })),
          billingAddress: tpl.billingAddress as any,
          tax: tpl.tax,
          discount: tpl.discount,
          couponCode: tpl.couponCode,
          currency: tpl.currency,
          notes: tpl.notes
            ? `${tpl.notes}\n[Generated from recurring template "${tpl.name}"]`
            : `[Generated from recurring template "${tpl.name}"]`,
          sendEmail: false,
        });

        tpl.lastInvoice = invoice;
        tpl.lastRunAt = new Date();
        tpl.runCount = (tpl.runCount ?? 0) + 1;
        tpl.nextRunDate = this.advanceDate(tpl.nextRunDate, tpl.frequency);
        await em.flush();
        generated++;
        this.logger.log(
          `Recurring template "${tpl.name}" generated invoice ${invoice.invoiceNumber}; next run ${tpl.nextRunDate.toISOString().slice(0, 10)}`,
        );
      } catch (err) {
        failed++;
        this.logger.error(`Recurring template "${tpl.name}" (${tpl.id}) failed to run:`, err as any);
      }
    }
    return { generated, failed };
  }
}
