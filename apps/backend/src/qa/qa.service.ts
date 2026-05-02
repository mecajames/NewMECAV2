import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { QaRoundStatus, QaAssignmentStatus, QaResponseStatus, QaFixStatus } from '@newmeca/shared';
import { QaRound } from './qa-round.entity';
import { QaRoundAssignment } from './qa-round-assignment.entity';
import { QaChecklistItem } from './qa-checklist-item.entity';
import { QaItemResponse } from './qa-item-response.entity';
import { QaDeveloperFix } from './qa-developer-fix.entity';
import { Profile } from '../profiles/profiles.entity';
import { CHECKLIST_SECTIONS } from './qa-checklist-data';

@Injectable()
export class QaService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // =========================================================================
  // ROUNDS
  // =========================================================================

  async createRound(title: string, description: string | undefined, createdById: string) {
    const em = this.em.fork();

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

    // Seed checklist items from master data
    let sectionOrder = 0;
    for (const section of CHECKLIST_SECTIONS) {
      let itemOrder = 0;
      for (const item of section.items) {
        const checklistItem = em.create(QaChecklistItem, {
          round: em.getReference(QaRound, round.id),
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
        });
        em.persist(checklistItem);
        itemOrder++;
      }
      sectionOrder++;
    }

    await em.flush();
    return this.getRound(round.id);
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

    if (assignment.round.status !== QaRoundStatus.DRAFT) {
      throw new BadRequestException('Can only remove assignments from draft rounds');
    }

    // Delete responses first (cascades via FK but be explicit)
    await em.nativeDelete(QaItemResponse, { assignment: { id: assignmentId } });
    await em.removeAndFlush(assignment);
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
