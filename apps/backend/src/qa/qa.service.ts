import { Injectable, BadRequestException, NotFoundException, Inject, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { QaRoundStatus, QaAssignmentStatus, QaResponseStatus, QaFixStatus } from '@newmeca/shared';
import { QaRound } from './qa-round.entity';
import { QaRoundAssignment } from './qa-round-assignment.entity';
import { QaChecklistItem } from './qa-checklist-item.entity';
import { QaItemResponse } from './qa-item-response.entity';
import { QaDeveloperFix } from './qa-developer-fix.entity';
import { QaMasterItem } from './qa-master-item.entity';
import { Profile } from '../profiles/profiles.entity';
import { CHECKLIST_SECTIONS } from './qa-checklist-data';

// Shape used by both round-creation and mid-round add for new custom items.
export interface CustomItemInput {
  sectionId?: string;        // optional — defaults to a 'custom' bucket
  sectionTitle?: string;
  title: string;
  steps: string[];
  expectedResult: string;
  pageUrl?: string;
  promoteToMaster?: boolean; // if true, also written to qa_master_items
}

// What the round-creation endpoint accepts. Backwards-compatible: omitting
// both fields seeds the round with every active master item.
export interface RoundItemSelection {
  /** Master item IDs to include. Omit to include every active master item. */
  masterItemIds?: string[];
  /** Custom items to add to the round on creation. */
  customItems?: CustomItemInput[];
}

@Injectable()
export class QaService {
  private readonly logger = new Logger(QaService.name);

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // =========================================================================
  // ROUNDS
  // =========================================================================

  /**
   * Lazy-seed the master items table from the hard-coded CHECKLIST_SECTIONS
   * constant. After the first call the database is the source of truth, so
   * subsequent edits to the constant won't propagate (intentional — keeps
   * the source-of-truth in one place once admins start editing master).
   */
  private async ensureMasterSeeded(em = this.em.fork()): Promise<void> {
    const count = await em.count(QaMasterItem, {});
    if (count > 0) return;

    let sectionOrder = 0;
    for (const section of CHECKLIST_SECTIONS) {
      let itemOrder = 0;
      for (const item of section.items) {
        const master = em.create(QaMasterItem, {
          sectionId: section.id,
          sectionTitle: section.title,
          sectionDescription: section.description,
          sectionOrder,
          itemKey: item.id,
          itemTitle: item.title,
          itemOrder,
          steps: item.steps,
          expectedResult: item.expectedResult,
          pageUrl: item.pageUrl,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        em.persist(master);
        itemOrder++;
      }
      sectionOrder++;
    }
    await em.flush();
    this.logger.log(`Seeded ${CHECKLIST_SECTIONS.length} master sections into qa_master_items`);
  }

  /**
   * List active master items grouped by section. Used by the round-creation
   * picker and the "Add from master" modal on the round detail page.
   */
  async listMasterSections() {
    const em = this.em.fork();
    await this.ensureMasterSeeded(em);

    const items = await em.find(QaMasterItem, { isActive: true }, {
      orderBy: { sectionOrder: 'ASC', itemOrder: 'ASC' },
    });

    type SectionRow = {
      id: string;
      title: string;
      description?: string;
      sectionOrder: number;
      items: Array<{
        id: string;
        key: string;
        title: string;
        steps: string[];
        expectedResult: string;
        pageUrl?: string;
        order: number;
      }>;
    };
    const sections = new Map<string, SectionRow>();
    for (const it of items) {
      let sec = sections.get(it.sectionId);
      if (!sec) {
        sec = {
          id: it.sectionId,
          title: it.sectionTitle,
          description: it.sectionDescription,
          sectionOrder: it.sectionOrder,
          items: [],
        };
        sections.set(it.sectionId, sec);
      }
      sec.items.push({
        id: it.id,
        key: it.itemKey,
        title: it.itemTitle,
        steps: it.steps,
        expectedResult: it.expectedResult,
        pageUrl: it.pageUrl,
        order: it.itemOrder,
      });
    }
    return Array.from(sections.values()).sort((a, b) => a.sectionOrder - b.sectionOrder);
  }

  async createRound(
    title: string,
    description: string | undefined,
    createdById: string,
    selection?: RoundItemSelection,
  ) {
    const em = this.em.fork();
    await this.ensureMasterSeeded(em);

    // Auto-increment version number
    const existingRounds = await em.find(QaRound, {}, { orderBy: { versionNumber: 'DESC' }, limit: 1 });
    const versionNumber = existingRounds.length > 0 ? existingRounds[0].versionNumber + 1 : 1;

    const round = em.create(QaRound, {
      title,
      description,
      versionNumber,
      status: QaRoundStatus.DRAFT,
      suspended: false,
      createdBy: em.getReference(Profile, createdById),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await em.persistAndFlush(round);

    // Resolve master items for the round. If the caller didn't pick a
    // subset, include every active master item — matches old behaviour.
    const masterFilter = selection?.masterItemIds && selection.masterItemIds.length > 0
      ? { id: { $in: selection.masterItemIds }, isActive: true }
      : { isActive: true };
    const masters = await em.find(QaMasterItem, masterFilter, {
      orderBy: { sectionOrder: 'ASC', itemOrder: 'ASC' },
    });

    // Snapshot master items into the round
    let nextItemOrder = 0;
    let lastSectionId = '';
    for (const m of masters) {
      if (m.sectionId !== lastSectionId) { nextItemOrder = 0; lastSectionId = m.sectionId; }
      const checklistItem = em.create(QaChecklistItem, {
        round: em.getReference(QaRound, round.id),
        sectionId: m.sectionId,
        sectionTitle: m.sectionTitle,
        sectionDescription: m.sectionDescription,
        sectionOrder: m.sectionOrder,
        itemKey: m.itemKey,
        itemTitle: m.itemTitle,
        itemOrder: nextItemOrder++,
        steps: m.steps,
        expectedResult: m.expectedResult,
        pageUrl: m.pageUrl,
        isCustom: false,
        sourceMasterId: m.id,
      });
      em.persist(checklistItem);
    }

    // Persist custom items provided alongside round creation. They go into
    // a 'custom' section at the end so reviewers see them grouped.
    if (selection?.customItems?.length) {
      const customSectionOrder = (masters[masters.length - 1]?.sectionOrder ?? 0) + 1;
      let customOrder = 0;
      for (const c of selection.customItems) {
        const sectionId = c.sectionId || 'custom';
        const sectionTitle = c.sectionTitle || 'Custom Items';
        if (c.promoteToMaster) {
          await this.upsertMasterFromCustom(em, c, sectionId, sectionTitle, customSectionOrder, customOrder);
        }
        const ci = em.create(QaChecklistItem, {
          round: em.getReference(QaRound, round.id),
          sectionId,
          sectionTitle,
          sectionOrder: customSectionOrder,
          itemKey: `custom-${Date.now()}-${customOrder}`,
          itemTitle: c.title,
          itemOrder: customOrder++,
          steps: c.steps,
          expectedResult: c.expectedResult,
          pageUrl: c.pageUrl,
          isCustom: true,
        });
        em.persist(ci);
      }
    }

    await em.flush();
    return this.getRound(round.id);
  }

  /**
   * Adds master items to an existing round (any status — including ACTIVE).
   * For each existing assignment, a NOT_STARTED response row is created so
   * the new item shows up in the reviewer's checklist immediately.
   *
   * Idempotent: master items already represented in the round (matched by
   * sourceMasterId) are silently skipped.
   */
  async addMasterItemsToRound(roundId: string, masterItemIds: string[]) {
    if (!masterItemIds.length) return this.getRound(roundId);
    const em = this.em.fork();
    const round = await em.findOneOrFail(QaRound, roundId);
    if (round.status === QaRoundStatus.COMPLETED) {
      throw new BadRequestException('Cannot add items to a completed round');
    }

    const masters = await em.find(QaMasterItem, { id: { $in: masterItemIds }, isActive: true });
    if (masters.length === 0) {
      throw new NotFoundException('No matching master items found');
    }

    const existing = await em.find(QaChecklistItem, {
      round: { id: roundId },
      sourceMasterId: { $in: masters.map(m => m.id) },
    });
    const alreadyHave = new Set(existing.map(e => e.sourceMasterId));

    const assignments = await em.find(QaRoundAssignment, { round: { id: roundId } });

    // Group new items by section so we can compute itemOrder per section
    const orderBySection = new Map<string, number>();
    const existingItems = await em.find(QaChecklistItem, { round: { id: roundId } });
    for (const it of existingItems) {
      orderBySection.set(it.sectionId, Math.max(orderBySection.get(it.sectionId) ?? -1, it.itemOrder));
    }

    for (const m of masters) {
      if (alreadyHave.has(m.id)) continue;
      const nextOrder = (orderBySection.get(m.sectionId) ?? -1) + 1;
      orderBySection.set(m.sectionId, nextOrder);
      const item = em.create(QaChecklistItem, {
        round: em.getReference(QaRound, roundId),
        sectionId: m.sectionId,
        sectionTitle: m.sectionTitle,
        sectionDescription: m.sectionDescription,
        sectionOrder: m.sectionOrder,
        itemKey: m.itemKey,
        itemTitle: m.itemTitle,
        itemOrder: nextOrder,
        steps: m.steps,
        expectedResult: m.expectedResult,
        pageUrl: m.pageUrl,
        isCustom: false,
        sourceMasterId: m.id,
      });
      em.persist(item);
      await em.flush();

      // Create NOT_STARTED responses for each existing assignment so the new
      // item shows up in everyone's checklist
      for (const a of assignments) {
        em.persist(em.create(QaItemResponse, {
          item: em.getReference(QaChecklistItem, item.id),
          assignment: em.getReference(QaRoundAssignment, a.id),
          reviewer: a.assignee,
          status: QaResponseStatus.NOT_STARTED,
        }));
      }
      await em.flush();
    }

    return this.getRound(roundId);
  }

  /**
   * Add a single custom item to an existing round. Optionally also writes
   * it to qa_master_items so future rounds inherit it.
   */
  async addCustomItemToRound(roundId: string, input: CustomItemInput) {
    const em = this.em.fork();
    const round = await em.findOneOrFail(QaRound, roundId);
    if (round.status === QaRoundStatus.COMPLETED) {
      throw new BadRequestException('Cannot add items to a completed round');
    }
    if (!input.title?.trim()) throw new BadRequestException('Item title is required');
    if (!input.expectedResult?.trim()) throw new BadRequestException('Expected result is required');
    if (!Array.isArray(input.steps) || input.steps.length === 0) {
      throw new BadRequestException('At least one step is required');
    }

    const sectionId = input.sectionId || 'custom';
    const sectionTitle = input.sectionTitle || 'Custom Items';

    // Pick a sectionOrder that puts custom items at the end if 'custom',
    // or matches the existing section if a real section was chosen.
    let sectionOrder: number;
    if (sectionId === 'custom') {
      const max = await em.find(QaChecklistItem, { round: { id: roundId } }, {
        orderBy: { sectionOrder: 'DESC' }, limit: 1,
      });
      sectionOrder = (max[0]?.sectionOrder ?? -1) + 1;
    } else {
      const sample = await em.findOne(QaChecklistItem, { round: { id: roundId }, sectionId });
      sectionOrder = sample?.sectionOrder ?? 9999;
    }

    const itemsInSection = await em.find(QaChecklistItem, {
      round: { id: roundId }, sectionId,
    });
    const itemOrder = itemsInSection.reduce((mx, it) => Math.max(mx, it.itemOrder), -1) + 1;

    if (input.promoteToMaster) {
      await this.upsertMasterFromCustom(em, input, sectionId, sectionTitle, sectionOrder, itemOrder);
    }

    const item = em.create(QaChecklistItem, {
      round: em.getReference(QaRound, roundId),
      sectionId,
      sectionTitle,
      sectionOrder,
      itemKey: `custom-${Date.now()}-${itemOrder}`,
      itemTitle: input.title.trim(),
      itemOrder,
      steps: input.steps.map(s => s.trim()).filter(Boolean),
      expectedResult: input.expectedResult.trim(),
      pageUrl: input.pageUrl?.trim() || undefined,
      isCustom: true,
    });
    em.persist(item);
    await em.flush();

    // Create responses for existing assignments
    const assignments = await em.find(QaRoundAssignment, { round: { id: roundId } });
    for (const a of assignments) {
      em.persist(em.create(QaItemResponse, {
        item: em.getReference(QaChecklistItem, item.id),
        assignment: em.getReference(QaRoundAssignment, a.id),
        reviewer: a.assignee,
        status: QaResponseStatus.NOT_STARTED,
      }));
    }
    await em.flush();

    return this.getRound(roundId);
  }

  /**
   * Promote an existing custom round-item to the master checklist so future
   * rounds inherit it. Rejected if the item is already from master.
   */
  async promoteCustomItemToMaster(itemId: string) {
    const em = this.em.fork();
    const item = await em.findOneOrFail(QaChecklistItem, itemId);
    if (!item.isCustom) {
      throw new BadRequestException('Only custom items can be promoted to the master checklist');
    }
    await this.ensureMasterSeeded(em);

    const master = await this.upsertMasterFromCustom(em,
      {
        title: item.itemTitle,
        steps: item.steps,
        expectedResult: item.expectedResult,
        pageUrl: item.pageUrl,
      },
      item.sectionId,
      item.sectionTitle,
      item.sectionOrder,
      item.itemOrder,
    );

    item.sourceMasterId = master.id;
    await em.flush();
    return { promoted: true, masterId: master.id };
  }

  /**
   * Helper: create or update a master item from a custom-item payload. Idempotent
   * on (sectionId, itemKey-derived). The same custom item being promoted twice
   * just updates the existing master row.
   */
  private async upsertMasterFromCustom(
    em: EntityManager,
    c: { title: string; steps: string[]; expectedResult: string; pageUrl?: string },
    sectionId: string,
    sectionTitle: string,
    sectionOrder: number,
    itemOrder: number,
  ): Promise<QaMasterItem> {
    const itemKey = `custom-${c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}`;
    const existing = await em.findOne(QaMasterItem, { sectionId, itemKey });
    if (existing) {
      existing.itemTitle = c.title;
      existing.steps = c.steps;
      existing.expectedResult = c.expectedResult;
      existing.pageUrl = c.pageUrl;
      existing.isActive = true;
      await em.flush();
      return existing;
    }
    const master = em.create(QaMasterItem, {
      sectionId,
      sectionTitle,
      sectionOrder,
      itemKey,
      itemTitle: c.title,
      itemOrder,
      steps: c.steps,
      expectedResult: c.expectedResult,
      pageUrl: c.pageUrl,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    em.persist(master);
    await em.flush();
    return master;
  }

  /**
   * Remove a single item from a round. Cascades responses + dev fixes. Allowed
   * in any non-completed status — the admin UI confirms when responses exist.
   */
  async removeItemFromRound(itemId: string) {
    const em = this.em.fork();
    const item = await em.findOneOrFail(QaChecklistItem, itemId, { populate: ['round'] });
    if (item.round.status === QaRoundStatus.COMPLETED) {
      throw new BadRequestException('Cannot remove items from a completed round');
    }
    await em.transactional(async (txEm) => {
      await txEm.getConnection().execute(
        `DELETE FROM qa_developer_fixes
         WHERE response_id IN (SELECT id FROM qa_item_responses WHERE item_id = ?)`,
        [itemId],
      );
      await txEm.nativeDelete(QaItemResponse, { item: { id: itemId } });
      await txEm.nativeDelete(QaChecklistItem, { id: itemId });
    });
    return { removed: true };
  }

  /**
   * Returns the items currently in a round, grouped by section. Used by the
   * "Manage Items" panel on the round detail page.
   */
  async getRoundItems(roundId: string) {
    const em = this.em.fork();
    const items = await em.find(QaChecklistItem, { round: { id: roundId } }, {
      orderBy: { sectionOrder: 'ASC', itemOrder: 'ASC' },
    });
    type SectionRow = {
      id: string; title: string; description?: string; sectionOrder: number;
      items: Array<{
        id: string; key: string; title: string; steps: string[]; expectedResult: string;
        pageUrl?: string; isCustom: boolean; sourceMasterId?: string;
      }>;
    };
    const sections = new Map<string, SectionRow>();
    for (const it of items) {
      let sec = sections.get(it.sectionId);
      if (!sec) {
        sec = { id: it.sectionId, title: it.sectionTitle, description: it.sectionDescription, sectionOrder: it.sectionOrder, items: [] };
        sections.set(it.sectionId, sec);
      }
      sec.items.push({
        id: it.id, key: it.itemKey, title: it.itemTitle, steps: it.steps,
        expectedResult: it.expectedResult, pageUrl: it.pageUrl,
        isCustom: it.isCustom, sourceMasterId: it.sourceMasterId,
      });
    }
    return Array.from(sections.values()).sort((a, b) => a.sectionOrder - b.sectionOrder);
  }

  async createRoundFromPrevious(previousRoundId: string, title: string, createdById: string) {
    const em = this.em.fork();

    const previousRound = await em.findOneOrFail(QaRound, previousRoundId);

    // Find all items with at least one FAIL response
    const failedResponses = await em.find(QaItemResponse, {
      assignment: { round: { id: previousRoundId } },
      status: QaResponseStatus.FAIL,
    }, { populate: ['item'] });

    // Deduplicate by item ID
    const failedItemIds = [...new Set(failedResponses.map(r => r.item.id))];

    if (failedItemIds.length === 0) {
      throw new BadRequestException('No failed items found in the previous round');
    }

    const failedItems = await em.find(QaChecklistItem, { id: { $in: failedItemIds } }, {
      orderBy: { sectionOrder: 'ASC', itemOrder: 'ASC' },
    });

    // Create new round
    const round = em.create(QaRound, {
      title,
      versionNumber: previousRound.versionNumber + 1,
      status: QaRoundStatus.DRAFT,
      suspended: false,
      parentRound: em.getReference(QaRound, previousRoundId),
      createdBy: em.getReference(Profile, createdById),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await em.persistAndFlush(round);

    // Create items from failed items, preserving section grouping
    let itemIdx = 0;
    for (const failedItem of failedItems) {
      const newItem = em.create(QaChecklistItem, {
        round: em.getReference(QaRound, round.id),
        sectionId: failedItem.sectionId,
        sectionTitle: failedItem.sectionTitle,
        sectionDescription: failedItem.sectionDescription,
        sectionOrder: failedItem.sectionOrder,
        itemKey: failedItem.itemKey,
        itemTitle: failedItem.itemTitle,
        itemOrder: itemIdx,
        steps: failedItem.steps,
        expectedResult: failedItem.expectedResult,
        pageUrl: failedItem.pageUrl,
        sourceItem: em.getReference(QaChecklistItem, failedItem.id),
        // Preserve custom-vs-master classification across re-test rounds so a
        // failed custom item carries its custom badge into the next round.
        isCustom: failedItem.isCustom,
        sourceMasterId: failedItem.sourceMasterId,
      });
      em.persist(newItem);
      itemIdx++;
    }

    await em.flush();
    return this.getRound(round.id);
  }

  async activateRound(roundId: string) {
    const em = this.em.fork();
    const round = await em.findOneOrFail(QaRound, roundId);

    if (round.status !== QaRoundStatus.DRAFT) {
      throw new BadRequestException('Only draft rounds can be activated');
    }

    // Check for at least one assignment
    const assignmentCount = await em.count(QaRoundAssignment, { round: { id: roundId } });
    if (assignmentCount === 0) {
      throw new BadRequestException('Assign at least one reviewer before activating');
    }

    round.status = QaRoundStatus.ACTIVE;
    await em.flush();
    return this.getRound(roundId);
  }

  async completeRound(roundId: string) {
    const em = this.em.fork();
    const round = await em.findOneOrFail(QaRound, roundId);

    if (round.status !== QaRoundStatus.ACTIVE) {
      throw new BadRequestException('Only active rounds can be completed');
    }

    round.status = QaRoundStatus.COMPLETED;
    await em.flush();
    return this.getRound(roundId);
  }

  /**
   * Edit round metadata. Title and description are always editable; we don't
   * touch status/version/parent. Useful for typo fixes or clarifying scope
   * after reviewers report confusion.
   */
  async updateRound(roundId: string, data: { title?: string; description?: string | null }) {
    const em = this.em.fork();
    const round = await em.findOneOrFail(QaRound, roundId);
    if (data.title !== undefined) {
      const trimmed = data.title.trim();
      if (!trimmed) throw new BadRequestException('Title cannot be empty');
      round.title = trimmed;
    }
    if (data.description !== undefined) {
      round.description = data.description?.trim() || undefined;
    }
    await em.flush();
    return this.getRound(roundId);
  }

  /**
   * Toggle the suspension flag. When suspended:
   *   - reviewers see the round but submitResponse will reject
   *   - developers can't submit fixes
   * Reversible — clearing the flag returns the round to its prior state.
   */
  async setSuspended(roundId: string, suspended: boolean) {
    const em = this.em.fork();
    const round = await em.findOneOrFail(QaRound, roundId);
    round.suspended = suspended;
    await em.flush();
    return this.getRound(roundId);
  }

  /**
   * Hard-delete a round and everything attached to it: developer fixes,
   * responses, assignments, and checklist items. Wrapped in a transaction
   * so a partial delete can't strand orphan rows.
   *
   * Allowed in any state. The admin UI confirms before invoking, including
   * for ACTIVE/COMPLETED rounds where reviewer work is being thrown away.
   */
  async deleteRound(roundId: string) {
    const em = this.em.fork();
    const round = await em.findOneOrFail(QaRound, roundId);

    await em.transactional(async (txEm) => {
      // Developer fixes reference responses → delete them first
      await txEm.getConnection().execute(
        `DELETE FROM qa_developer_fixes
         WHERE response_id IN (
           SELECT r.id FROM qa_item_responses r
           JOIN qa_round_assignments a ON a.id = r.assignment_id
           WHERE a.round_id = ?
         )`,
        [roundId],
      );
      // Responses → assignments → items → round
      await txEm.nativeDelete(QaItemResponse, { assignment: { round: { id: roundId } } });
      await txEm.nativeDelete(QaRoundAssignment, { round: { id: roundId } });
      await txEm.nativeDelete(QaChecklistItem, { round: { id: roundId } });
      await txEm.nativeDelete(QaRound, { id: roundId });
    });

    return { id: round.id, deleted: true };
  }

  async getRound(roundId: string) {
    const em = this.em.fork();
    const round = await em.findOneOrFail(QaRound, roundId, {
      populate: ['createdBy', 'parentRound'],
    });

    const items = await em.find(QaChecklistItem, { round: { id: roundId } }, {
      orderBy: { sectionOrder: 'ASC', itemOrder: 'ASC' },
    });

    const assignments = await em.find(QaRoundAssignment, { round: { id: roundId } }, {
      populate: ['assignee'],
    });

    // Get response counts per assignment
    const assignmentDetails = await Promise.all(assignments.map(async (a) => {
      const responses = await em.find(QaItemResponse, { assignment: { id: a.id } });
      const counts = {
        total: responses.length,
        pass: responses.filter(r => r.status === QaResponseStatus.PASS).length,
        fail: responses.filter(r => r.status === QaResponseStatus.FAIL).length,
        skip: responses.filter(r => r.status === QaResponseStatus.SKIP).length,
        not_started: responses.filter(r => r.status === QaResponseStatus.NOT_STARTED).length,
      };
      return {
        id: a.id,
        assignee: {
          id: a.assignee.id,
          firstName: a.assignee.first_name,
          lastName: a.assignee.last_name,
          email: a.assignee.email,
        },
        status: a.status,
        assignedAt: a.assignedAt,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
        counts,
      };
    }));

    // Aggregate stats
    const allResponses = await em.find(QaItemResponse, {
      assignment: { round: { id: roundId } },
    });
    const totalResponses = allResponses.length;
    const passCount = allResponses.filter(r => r.status === QaResponseStatus.PASS).length;
    const failCount = allResponses.filter(r => r.status === QaResponseStatus.FAIL).length;
    const skipCount = allResponses.filter(r => r.status === QaResponseStatus.SKIP).length;

    return {
      id: round.id,
      versionNumber: round.versionNumber,
      title: round.title,
      description: round.description,
      status: round.status,
      suspended: round.suspended,
      parentRoundId: round.parentRound?.id || null,
      createdBy: {
        id: round.createdBy.id,
        firstName: round.createdBy.first_name,
        lastName: round.createdBy.last_name,
      },
      createdAt: round.createdAt,
      updatedAt: round.updatedAt,
      totalItems: items.length,
      assignments: assignmentDetails,
      stats: {
        totalResponses,
        pass: passCount,
        fail: failCount,
        skip: skipCount,
        notStarted: totalResponses - passCount - failCount - skipCount,
      },
    };
  }

  async listRounds() {
    const em = this.em.fork();
    const rounds = await em.find(QaRound, {}, {
      orderBy: { createdAt: 'DESC' },
      populate: ['createdBy'],
    });

    return Promise.all(rounds.map(async (round) => {
      const itemCount = await em.count(QaChecklistItem, { round: { id: round.id } });
      const assignmentCount = await em.count(QaRoundAssignment, { round: { id: round.id } });
      const responses = await em.find(QaItemResponse, { assignment: { round: { id: round.id } } });
      const passCount = responses.filter(r => r.status === QaResponseStatus.PASS).length;
      const failCount = responses.filter(r => r.status === QaResponseStatus.FAIL).length;
      const completedCount = responses.filter(r => r.status !== QaResponseStatus.NOT_STARTED).length;

      return {
        id: round.id,
        versionNumber: round.versionNumber,
        title: round.title,
        status: round.status,
        suspended: round.suspended,
        createdBy: {
          id: round.createdBy.id,
          firstName: round.createdBy.first_name,
          lastName: round.createdBy.last_name,
        },
        createdAt: round.createdAt,
        totalItems: itemCount,
        assignmentCount,
        totalResponses: responses.length,
        passCount,
        failCount,
        completedCount,
      };
    }));
  }

  // =========================================================================
  // ASSIGNMENTS
  // =========================================================================

  async assignReviewers(roundId: string, profileIds: string[], assignedById: string) {
    const em = this.em.fork();
    const round = await em.findOneOrFail(QaRound, roundId);

    if (round.status === QaRoundStatus.COMPLETED) {
      throw new BadRequestException('Cannot assign reviewers to a completed round');
    }

    const items = await em.find(QaChecklistItem, { round: { id: roundId } });

    for (const profileId of profileIds) {
      // Check for existing assignment
      const existing = await em.findOne(QaRoundAssignment, {
        round: { id: roundId },
        assignee: { id: profileId },
      });
      if (existing) continue;

      const assignment = em.create(QaRoundAssignment, {
        round: em.getReference(QaRound, roundId),
        assignee: em.getReference(Profile, profileId),
        assignedBy: em.getReference(Profile, assignedById),
        status: QaAssignmentStatus.ASSIGNED,
        assignedAt: new Date(),
      });
      em.persist(assignment);
      await em.flush(); // Need to flush to get ID

      // Pre-create response rows
      for (const item of items) {
        const response = em.create(QaItemResponse, {
          item: em.getReference(QaChecklistItem, item.id),
          assignment: em.getReference(QaRoundAssignment, assignment.id),
          reviewer: em.getReference(Profile, profileId),
          status: QaResponseStatus.NOT_STARTED,
        });
        em.persist(response);
      }
      await em.flush();
    }

    return this.getRound(roundId);
  }

  async removeAssignment(assignmentId: string) {
    const em = this.em.fork();
    const assignment = await em.findOneOrFail(QaRoundAssignment, assignmentId, {
      populate: ['round'],
    });

    // Removal is allowed in any round status — admins occasionally pick the
    // wrong reviewer or someone needs to be swapped mid-round. Anything the
    // reviewer has submitted is cascade-deleted (caller is expected to confirm).
    await em.transactional(async (txEm) => {
      // Developer fixes reference responses → wipe them first
      await txEm.getConnection().execute(
        `DELETE FROM qa_developer_fixes
         WHERE response_id IN (
           SELECT id FROM qa_item_responses WHERE assignment_id = ?
         )`,
        [assignmentId],
      );
      await txEm.nativeDelete(QaItemResponse, { assignment: { id: assignmentId } });
      await txEm.nativeDelete(QaRoundAssignment, { id: assignmentId });
    });
  }

  async getMyAssignments(profileId: string) {
    const em = this.em.fork();
    const assignments = await em.find(QaRoundAssignment, {
      assignee: { id: profileId },
      round: { status: { $ne: QaRoundStatus.DRAFT } },
    }, {
      populate: ['round'],
      orderBy: { assignedAt: 'DESC' },
    });

    return Promise.all(assignments.map(async (a) => {
      const responses = await em.find(QaItemResponse, { assignment: { id: a.id } });
      const counts = {
        total: responses.length,
        pass: responses.filter(r => r.status === QaResponseStatus.PASS).length,
        fail: responses.filter(r => r.status === QaResponseStatus.FAIL).length,
        skip: responses.filter(r => r.status === QaResponseStatus.SKIP).length,
        not_started: responses.filter(r => r.status === QaResponseStatus.NOT_STARTED).length,
      };
      return {
        id: a.id,
        round: {
          id: a.round.id,
          versionNumber: a.round.versionNumber,
          title: a.round.title,
          status: a.round.status,
          suspended: a.round.suspended,
        },
        status: a.status,
        assignedAt: a.assignedAt,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
        counts,
      };
    }));
  }

  async getAssignment(assignmentId: string) {
    const em = this.em.fork();
    const assignment = await em.findOneOrFail(QaRoundAssignment, assignmentId, {
      populate: ['round', 'assignee'],
    });

    const items = await em.find(QaChecklistItem, { round: { id: assignment.round.id } }, {
      orderBy: { sectionOrder: 'ASC', itemOrder: 'ASC' },
    });

    const responses = await em.find(QaItemResponse, { assignment: { id: assignmentId } }, {
      populate: ['item'],
    });

    // Build response map by item ID
    const responseMap: Record<string, any> = {};
    for (const r of responses) {
      responseMap[r.item.id] = {
        id: r.id,
        status: r.status,
        comment: r.comment,
        pageUrl: r.pageUrl,
        screenshotUrl: r.screenshotUrl,
        respondedAt: r.respondedAt,
      };
    }

    // Group items by section
    const sections: any[] = [];
    let currentSectionId = '';
    let currentSection: any = null;

    for (const item of items) {
      if (item.sectionId !== currentSectionId) {
        currentSectionId = item.sectionId;
        currentSection = {
          id: item.sectionId,
          title: item.sectionTitle,
          description: item.sectionDescription,
          items: [],
        };
        sections.push(currentSection);
      }
      currentSection.items.push({
        id: item.id,
        key: item.itemKey,
        title: item.itemTitle,
        steps: item.steps,
        expectedResult: item.expectedResult,
        pageUrl: item.pageUrl,
        response: responseMap[item.id] || null,
      });
    }

    const counts = {
      total: responses.length,
      pass: responses.filter(r => r.status === QaResponseStatus.PASS).length,
      fail: responses.filter(r => r.status === QaResponseStatus.FAIL).length,
      skip: responses.filter(r => r.status === QaResponseStatus.SKIP).length,
      not_started: responses.filter(r => r.status === QaResponseStatus.NOT_STARTED).length,
    };

    return {
      id: assignment.id,
      round: {
        id: assignment.round.id,
        versionNumber: assignment.round.versionNumber,
        title: assignment.round.title,
        status: assignment.round.status,
        suspended: assignment.round.suspended,
      },
      assignee: {
        id: assignment.assignee.id,
        firstName: assignment.assignee.first_name,
        lastName: assignment.assignee.last_name,
        email: assignment.assignee.email,
      },
      status: assignment.status,
      assignedAt: assignment.assignedAt,
      startedAt: assignment.startedAt,
      completedAt: assignment.completedAt,
      counts,
      sections,
    };
  }

  // =========================================================================
  // RESPONSES
  // =========================================================================

  async submitResponse(
    assignmentId: string,
    itemId: string,
    data: { status: QaResponseStatus; comment?: string; pageUrl?: string; screenshotUrl?: string },
    reviewerId: string,
  ) {
    const em = this.em.fork();

    // Validate fail requires comment
    if (data.status === QaResponseStatus.FAIL && (!data.comment || data.comment.trim() === '')) {
      throw new BadRequestException('A comment is required when marking an item as FAIL');
    }

    const assignment = await em.findOneOrFail(QaRoundAssignment, assignmentId, {
      populate: ['round'],
    });
    if (assignment.round.suspended) {
      throw new BadRequestException('This QA round is currently paused by an admin. Try again once it is resumed.');
    }
    if (assignment.round.status === QaRoundStatus.COMPLETED) {
      throw new BadRequestException('This QA round is closed and no longer accepting responses.');
    }

    // Verify reviewer matches
    const response = await em.findOneOrFail(QaItemResponse, {
      assignment: { id: assignmentId },
      item: { id: itemId },
    });

    response.status = data.status;
    response.comment = data.comment || undefined;
    response.pageUrl = data.pageUrl || undefined;
    response.screenshotUrl = data.screenshotUrl || undefined;
    response.respondedAt = new Date();

    // Update assignment status
    if (assignment.status === QaAssignmentStatus.ASSIGNED) {
      assignment.status = QaAssignmentStatus.IN_PROGRESS;
      assignment.startedAt = new Date();
    }

    await em.flush();

    // Check if all items are responded to
    const remaining = await em.count(QaItemResponse, {
      assignment: { id: assignmentId },
      status: QaResponseStatus.NOT_STARTED,
    });

    if (remaining === 0) {
      assignment.status = QaAssignmentStatus.COMPLETED;
      assignment.completedAt = new Date();
      await em.flush();
    }

    return {
      id: response.id,
      status: response.status,
      comment: response.comment,
      pageUrl: response.pageUrl,
      screenshotUrl: response.screenshotUrl,
      respondedAt: response.respondedAt,
      assignmentStatus: assignment.status,
    };
  }

  // =========================================================================
  // FAILED ITEMS & DEVELOPER FIXES
  // =========================================================================

  async getFailedItems(roundId: string) {
    const em = this.em.fork();

    const failedResponses = await em.find(QaItemResponse, {
      assignment: { round: { id: roundId } },
      status: QaResponseStatus.FAIL,
    }, {
      populate: ['item', 'reviewer', 'assignment'],
    });

    // Group by item
    const itemMap = new Map<string, any>();
    for (const r of failedResponses) {
      if (!itemMap.has(r.item.id)) {
        // Get any developer fixes for this item
        const fixes = await em.find(QaDeveloperFix, {
          response: { item: { id: r.item.id }, assignment: { round: { id: roundId } } },
        }, { populate: ['developer'] });

        itemMap.set(r.item.id, {
          item: {
            id: r.item.id,
            key: r.item.itemKey,
            title: r.item.itemTitle,
            sectionTitle: r.item.sectionTitle,
            steps: r.item.steps,
            expectedResult: r.item.expectedResult,
          },
          failedReviews: [],
          fixes: fixes.map(f => ({
            id: f.id,
            developer: {
              id: f.developer.id,
              firstName: f.developer.first_name,
              lastName: f.developer.last_name,
            },
            fixNotes: f.fixNotes,
            status: f.status,
            fixedAt: f.fixedAt,
            createdAt: f.createdAt,
          })),
        });
      }
      itemMap.get(r.item.id).failedReviews.push({
        responseId: r.id,
        reviewer: {
          id: r.reviewer.id,
          firstName: r.reviewer.first_name,
          lastName: r.reviewer.last_name,
        },
        comment: r.comment,
        pageUrl: r.pageUrl,
        screenshotUrl: r.screenshotUrl,
        respondedAt: r.respondedAt,
      });
    }

    return Array.from(itemMap.values());
  }

  async submitFix(responseId: string, data: { fixNotes: string; status: QaFixStatus }, developerId: string) {
    const em = this.em.fork();

    const response = await em.findOneOrFail(QaItemResponse, responseId, {
      populate: ['assignment.round'],
    });
    if (response.assignment.round.suspended) {
      throw new BadRequestException('Cannot record fixes on a paused round. Resume the round first.');
    }

    // Check for existing fix
    let fix = await em.findOne(QaDeveloperFix, { response: { id: responseId } });

    if (fix) {
      fix.fixNotes = data.fixNotes;
      fix.status = data.status;
      fix.fixedAt = data.status === QaFixStatus.FIXED ? new Date() : undefined;
    } else {
      fix = em.create(QaDeveloperFix, {
        response: em.getReference(QaItemResponse, responseId),
        developer: em.getReference(Profile, developerId),
        fixNotes: data.fixNotes,
        status: data.status,
        fixedAt: data.status === QaFixStatus.FIXED ? new Date() : undefined,
        createdAt: new Date(),
      });
      em.persist(fix);
    }

    await em.flush();
    return fix;
  }

  // =========================================================================
  // DASHBOARD
  // =========================================================================

  async getDashboard() {
    const em = this.em.fork();
    const rounds = await this.listRounds();
    const activeRounds = rounds.filter(r => r.status === QaRoundStatus.ACTIVE);
    const latestRound = rounds[0] || null;

    return {
      totalRounds: rounds.length,
      activeRounds: activeRounds.length,
      latestRound,
      rounds,
    };
  }

  // =========================================================================
  // ADMIN USERS LIST (for assignment dropdown)
  // =========================================================================

  async getAdminUsers() {
    const em = this.em.fork();
    const admins = await em.find(Profile, { $or: [{ role: 'admin' }, { is_staff: true }] }, {
      fields: ['id', 'first_name', 'last_name', 'email'],
      orderBy: { last_name: 'ASC', first_name: 'ASC' },
    });
    return admins.map(a => ({
      id: a.id,
      firstName: a.first_name,
      lastName: a.last_name,
      email: a.email,
    }));
  }
}
