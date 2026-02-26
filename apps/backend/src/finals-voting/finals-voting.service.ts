import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { VotingSessionStatus, VotingAnswerType } from '@newmeca/shared';
import type {
  CreateVotingSessionDto,
  UpdateVotingSessionDto,
  CreateVotingCategoryDto,
  UpdateVotingCategoryDto,
  CreateVotingQuestionDto,
  UpdateVotingQuestionDto,
  SubmitResponsesDto,
  CloneSessionDto,
  VotingSessionResults,
  VotingCategoryResult,
  VotingQuestionResult,
  VotingPublicStatus,
  EntitySearchResult,
} from '@newmeca/shared';
import { VotingSession } from './entities/voting-session.entity';
import { VotingCategory } from './entities/voting-category.entity';
import { VotingQuestion } from './entities/voting-question.entity';
import { VotingResponse } from './entities/voting-response.entity';
import { Profile } from '../profiles/profiles.entity';
import { Team } from '../teams/team.entity';
import { Season } from '../seasons/seasons.entity';
import { MembershipsService } from '../memberships/memberships.service';

// Profile-based answer types that store selected_member_id
const PROFILE_ANSWER_TYPES = new Set([
  VotingAnswerType.MEMBER,
  VotingAnswerType.JUDGE,
  VotingAnswerType.EVENT_DIRECTOR,
]);

// Text-based answer types that store business/venue name in text_answer
const TEXT_ENTITY_TYPES = new Set([
  VotingAnswerType.RETAILER,
  VotingAnswerType.MANUFACTURER,
  VotingAnswerType.VENUE,
]);

// 2023 Template Data
const TEMPLATE_2023 = {
  categories: [
    {
      name: 'General Awards',
      description: 'Overall MECA season awards',
      questions: [
        { title: 'MECAhead of the Year', answer_type: VotingAnswerType.MEMBER },
        { title: 'Competitor of the Year', answer_type: VotingAnswerType.MEMBER },
        { title: 'Retail Member of the Year', answer_type: VotingAnswerType.RETAILER },
        { title: 'Manufacturer of the Year', answer_type: VotingAnswerType.MANUFACTURER },
        { title: 'Event Director of the Year', answer_type: VotingAnswerType.EVENT_DIRECTOR },
        { title: 'Venue of the Year', answer_type: VotingAnswerType.VENUE },
        { title: 'Team of the Year', answer_type: VotingAnswerType.TEAM },
        { title: 'Judge Team of the Year', answer_type: VotingAnswerType.TEXT },
        { title: 'High School Student of the Year', answer_type: VotingAnswerType.MEMBER },
        { title: '12 Volt Industry Award', answer_type: VotingAnswerType.MEMBER },
        { title: 'Distinguished Service Award', answer_type: VotingAnswerType.MEMBER },
        { title: 'Pioneer Award', answer_type: VotingAnswerType.MEMBER },
        { title: 'Alma Gates Lifetime Achievement Award', answer_type: VotingAnswerType.MEMBER },
        { title: 'TCB (Taking Care of Business Award)', answer_type: VotingAnswerType.MEMBER },
        { title: 'Johnny Appleseed Award', answer_type: VotingAnswerType.MEMBER },
        { title: 'Best Penmanship', answer_type: VotingAnswerType.MEMBER },
      ],
    },
    {
      name: 'SPL Awards',
      description: 'Sound Pressure Level competition awards',
      questions: [
        { title: 'SPL Judge of the Year', answer_type: VotingAnswerType.JUDGE },
        { title: 'SPL Spirit Award', answer_type: VotingAnswerType.MEMBER },
        { title: 'SPL Rookie of the Year', answer_type: VotingAnswerType.MEMBER },
        { title: 'SPL Survivor Award', answer_type: VotingAnswerType.MEMBER },
        { title: 'SPL Loud Spouses', answer_type: VotingAnswerType.TEXT },
        { title: 'SPL Hatfield & McCoy Award #1', answer_type: VotingAnswerType.MEMBER },
        { title: 'SPL Hatfield & McCoy Award #2', answer_type: VotingAnswerType.MEMBER },
        { title: 'Stinking Loud Award', answer_type: VotingAnswerType.MEMBER },
        { title: 'Motormouth Award', answer_type: VotingAnswerType.MEMBER },
        { title: 'Neighborhood Nuisance Award', answer_type: VotingAnswerType.MEMBER },
        { title: 'Park & Pound Spirit Award', answer_type: VotingAnswerType.MEMBER },
      ],
    },
    {
      name: 'SQL Awards',
      description: 'Sound Quality League competition awards',
      questions: [
        { title: 'SQL Judge of the Year', answer_type: VotingAnswerType.JUDGE },
        { title: '"The Silverman" SQL Spirit Award', answer_type: VotingAnswerType.MEMBER },
        { title: 'Mike Bayler SQL Sportsmanship Award', answer_type: VotingAnswerType.MEMBER },
        { title: 'SQL Rookie of the Year', answer_type: VotingAnswerType.MEMBER },
        { title: 'SQL Survivor Award', answer_type: VotingAnswerType.MEMBER },
        { title: 'SQL Spouses', answer_type: VotingAnswerType.TEXT },
        { title: 'SQL Hatfield & McCoy Award #1', answer_type: VotingAnswerType.MEMBER },
        { title: 'SQL Hatfield & McCoy Award #2', answer_type: VotingAnswerType.MEMBER },
        { title: 'SQL Dueling Demos Hatfield & McCoy Award #1', answer_type: VotingAnswerType.MEMBER },
        { title: 'SQL Dueling Demos Hatfield & McCoy Award #2', answer_type: VotingAnswerType.MEMBER },
      ],
    },
    {
      name: 'Format Spirit Awards',
      description: 'Spirit awards for MECA competition formats',
      questions: [
        { title: 'MECA Spirit Award', answer_type: VotingAnswerType.MEMBER },
        { title: 'Dueling Demos Spirit Award', answer_type: VotingAnswerType.MEMBER },
        { title: 'Show & Shine Spirit Award', answer_type: VotingAnswerType.MEMBER },
      ],
    },
  ],
};

@Injectable()
export class FinalsVotingService {
  private readonly logger = new Logger(FinalsVotingService.name);

  // In-memory cache for finalized results (immutable, 5-min TTL)
  private resultsCache = new Map<string, { data: VotingSessionResults; expiry: number }>();
  private statusCache: { data: VotingPublicStatus; expiry: number } | null = null;

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
    private readonly membershipsService: MembershipsService,
  ) {}

  // =========================================================================
  // SESSIONS (Admin)
  // =========================================================================

  async getAllSessions(): Promise<VotingSession[]> {
    const em = this.em.fork();
    return em.find(VotingSession, {}, {
      populate: ['season', 'categories', 'categories.questions'],
      orderBy: { createdAt: 'DESC' },
    });
  }

  async getSessionById(id: string): Promise<VotingSession> {
    const em = this.em.fork();
    const session = await em.findOne(VotingSession, { id }, {
      populate: ['season', 'categories', 'categories.questions'],
    });
    if (!session) {
      throw new NotFoundException(`Voting session not found`);
    }
    return session;
  }

  async createSession(dto: CreateVotingSessionDto): Promise<VotingSession> {
    const em = this.em.fork();
    const season = await em.findOne(Season, { id: dto.season_id });
    if (!season) {
      throw new BadRequestException('Season not found');
    }

    const session = new VotingSession();
    session.season = em.getReference(Season, dto.season_id);
    session.title = dto.title;
    session.description = dto.description ?? undefined;
    session.startDate = new Date(dto.start_date);
    session.endDate = new Date(dto.end_date);
    session.status = VotingSessionStatus.DRAFT;

    em.persist(session);
    await em.flush();

    this.clearStatusCache();
    return this.getSessionById(session.id);
  }

  async updateSession(id: string, dto: UpdateVotingSessionDto): Promise<VotingSession> {
    const em = this.em.fork();
    const session = await em.findOne(VotingSession, { id });
    if (!session) {
      throw new NotFoundException('Voting session not found');
    }

    if (session.status !== VotingSessionStatus.DRAFT) {
      if (dto.title) session.title = dto.title;
      if (dto.description !== undefined) session.description = dto.description ?? undefined;
      if (dto.end_date) session.endDate = new Date(dto.end_date);
    } else {
      if (dto.title) session.title = dto.title;
      if (dto.description !== undefined) session.description = dto.description ?? undefined;
      if (dto.start_date) session.startDate = new Date(dto.start_date);
      if (dto.end_date) session.endDate = new Date(dto.end_date);
    }

    await em.flush();
    this.clearStatusCache();
    return this.getSessionById(id);
  }

  async deleteSession(id: string): Promise<void> {
    const em = this.em.fork();
    const session = await em.findOne(VotingSession, { id });
    if (!session) {
      throw new NotFoundException('Voting session not found');
    }
    if (session.status !== VotingSessionStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT sessions can be deleted');
    }

    // Delete questions and categories via cascade
    await em.nativeDelete(VotingQuestion, {
      category: { session: { id } },
    });
    await em.nativeDelete(VotingCategory, { session: { id } });
    await em.removeAndFlush(session);
    this.clearStatusCache();
  }

  async openSession(id: string): Promise<VotingSession> {
    const em = this.em.fork();
    const session = await em.findOne(VotingSession, { id }, {
      populate: ['categories', 'categories.questions'],
    });
    if (!session) {
      throw new NotFoundException('Voting session not found');
    }
    if (session.status !== VotingSessionStatus.DRAFT) {
      throw new BadRequestException(`Cannot open session in ${session.status} status. Must be DRAFT.`);
    }

    // Validate session has at least one category with at least 1 question
    const categories = session.categories.getItems();
    if (categories.length === 0) {
      throw new BadRequestException('Session must have at least one category before opening');
    }
    for (const cat of categories) {
      if (cat.questions.getItems().length < 1) {
        throw new BadRequestException(`Category "${cat.name}" must have at least 1 question before opening`);
      }
    }

    session.status = VotingSessionStatus.OPEN;
    await em.flush();
    this.clearStatusCache();
    return this.getSessionById(id);
  }

  async closeSession(id: string): Promise<VotingSession> {
    const em = this.em.fork();
    const session = await em.findOne(VotingSession, { id });
    if (!session) {
      throw new NotFoundException('Voting session not found');
    }
    if (session.status !== VotingSessionStatus.OPEN) {
      throw new BadRequestException(`Cannot close session in ${session.status} status. Must be OPEN.`);
    }

    session.status = VotingSessionStatus.CLOSED;
    await em.flush();
    this.clearStatusCache();
    return this.getSessionById(id);
  }

  async finalizeSession(id: string): Promise<VotingSession> {
    const em = this.em.fork();
    const session = await em.findOne(VotingSession, { id });
    if (!session) {
      throw new NotFoundException('Voting session not found');
    }
    if (session.status !== VotingSessionStatus.CLOSED) {
      throw new BadRequestException(`Cannot finalize session in ${session.status} status. Must be CLOSED.`);
    }

    session.status = VotingSessionStatus.FINALIZED;
    session.resultsFinalizedAt = new Date();
    await em.flush();
    this.clearStatusCache();
    return this.getSessionById(id);
  }

  // =========================================================================
  // CLONE SESSION (Admin)
  // =========================================================================

  async cloneSession(sourceId: string, dto: CloneSessionDto): Promise<VotingSession> {
    const em = this.em.fork();

    const source = await em.findOne(VotingSession, { id: sourceId }, {
      populate: ['categories', 'categories.questions'],
    });
    if (!source) {
      throw new NotFoundException('Source session not found');
    }

    const season = await em.findOne(Season, { id: dto.season_id });
    if (!season) {
      throw new BadRequestException('Season not found');
    }

    return em.transactional(async (txEm) => {
      // Create new session
      const newSession = new VotingSession();
      newSession.season = txEm.getReference(Season, dto.season_id);
      newSession.title = dto.title;
      newSession.description = dto.description ?? undefined;
      newSession.startDate = new Date(dto.start_date);
      newSession.endDate = new Date(dto.end_date);
      newSession.status = VotingSessionStatus.DRAFT;
      txEm.persist(newSession);

      // Clone categories and questions
      for (const srcCat of source.categories.getItems().sort((a, b) => a.displayOrder - b.displayOrder)) {
        const newCat = new VotingCategory();
        newCat.session = newSession;
        newCat.name = srcCat.name;
        newCat.description = srcCat.description;
        newCat.displayOrder = srcCat.displayOrder;
        txEm.persist(newCat);

        for (const srcQ of srcCat.questions.getItems().sort((a, b) => a.displayOrder - b.displayOrder)) {
          const newQ = new VotingQuestion();
          newQ.category = newCat;
          newQ.title = srcQ.title;
          newQ.description = srcQ.description;
          newQ.imageUrl = srcQ.imageUrl;
          newQ.answerType = srcQ.answerType;
          newQ.displayOrder = srcQ.displayOrder;
          txEm.persist(newQ);
        }
      }

      await txEm.flush();
      this.logger.log(`Cloned session ${sourceId} → ${newSession.id}`);
      return newSession;
    });
  }

  // =========================================================================
  // SEED TEMPLATE (Admin)
  // =========================================================================

  async seedTemplate(sessionId: string, templateName: string): Promise<VotingSession> {
    const em = this.em.fork();

    const session = await em.findOne(VotingSession, { id: sessionId }, {
      populate: ['categories'],
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.status !== VotingSessionStatus.DRAFT) {
      throw new BadRequestException('Can only seed template into DRAFT sessions');
    }
    if (session.categories.getItems().length > 0) {
      throw new BadRequestException('Session already has categories. Seed only works on empty sessions.');
    }

    const template = templateName === '2023' ? TEMPLATE_2023 : null;
    if (!template) {
      throw new BadRequestException(`Unknown template: ${templateName}`);
    }

    return em.transactional(async (txEm) => {
      for (let catIdx = 0; catIdx < template.categories.length; catIdx++) {
        const catData = template.categories[catIdx];
        const cat = new VotingCategory();
        cat.session = txEm.getReference(VotingSession, sessionId);
        cat.name = catData.name;
        cat.description = catData.description;
        cat.displayOrder = catIdx;
        txEm.persist(cat);

        for (let qIdx = 0; qIdx < catData.questions.length; qIdx++) {
          const qData = catData.questions[qIdx];
          const question = new VotingQuestion();
          question.category = cat;
          question.title = qData.title;
          question.answerType = qData.answer_type;
          question.displayOrder = qIdx;
          txEm.persist(question);
        }
      }

      await txEm.flush();
      this.logger.log(`Seeded session ${sessionId} with ${templateName} template`);
      return session;
    });
  }

  // =========================================================================
  // ENTITY SEARCH
  // =========================================================================

  async searchEntities(
    type: string,
    query: string,
    sessionId: string,
    limit = 20,
  ): Promise<EntitySearchResult[]> {
    const em = this.em.fork();
    const effectiveLimit = Math.min(limit, 500);
    const searchTerm = `%${query}%`;

    switch (type) {
      case VotingAnswerType.MEMBER: {
        const rows = await em.getConnection().execute<Array<{
          id: string; first_name: string; last_name: string; meca_id: string | null; avatar_url: string | null;
        }>>(
          `SELECT id, first_name, last_name, meca_id::text, avatar_url
           FROM profiles
           WHERE membership_status = 'active'
             AND (
               first_name ILIKE ?
               OR last_name ILIKE ?
               OR (first_name || ' ' || last_name) ILIKE ?
               OR CAST(meca_id AS text) ILIKE ?
             )
           ORDER BY first_name, last_name
           LIMIT ?`,
          [searchTerm, searchTerm, searchTerm, searchTerm, effectiveLimit],
        );
        return rows.map(r => ({
          id: r.id,
          name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Unknown',
          meca_id: r.meca_id ? parseInt(r.meca_id, 10) : null,
          avatar_url: r.avatar_url,
        }));
      }

      case VotingAnswerType.JUDGE: {
        const rows = await em.getConnection().execute<Array<{
          id: string; first_name: string; last_name: string; meca_id: string | null; avatar_url: string | null;
          level: string; specialty: string;
        }>>(
          `SELECT p.id, p.first_name, p.last_name, p.meca_id::text, p.avatar_url,
                  j.level, j.specialty
           FROM judges j
           JOIN profiles p ON p.id = j.user_id
           WHERE j.is_active = true
             AND (
               p.first_name ILIKE ?
               OR p.last_name ILIKE ?
               OR (p.first_name || ' ' || p.last_name) ILIKE ?
               OR CAST(p.meca_id AS text) ILIKE ?
             )
           ORDER BY p.first_name, p.last_name
           LIMIT ?`,
          [searchTerm, searchTerm, searchTerm, searchTerm, effectiveLimit],
        );
        return rows.map(r => ({
          id: r.id,
          name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Unknown',
          subtitle: `${r.level} - ${r.specialty}`,
          meca_id: r.meca_id ? parseInt(r.meca_id, 10) : null,
          avatar_url: r.avatar_url,
        }));
      }

      case VotingAnswerType.EVENT_DIRECTOR: {
        const rows = await em.getConnection().execute<Array<{
          id: string; first_name: string; last_name: string; meca_id: string | null; avatar_url: string | null;
        }>>(
          `SELECT DISTINCT p.id, p.first_name, p.last_name, p.meca_id::text, p.avatar_url
           FROM profiles p
           WHERE (p.role = 'event_director' OR p.role = 'admin')
             AND (
               p.first_name ILIKE ?
               OR p.last_name ILIKE ?
               OR (p.first_name || ' ' || p.last_name) ILIKE ?
               OR CAST(p.meca_id AS text) ILIKE ?
             )
           ORDER BY p.first_name, p.last_name
           LIMIT ?`,
          [searchTerm, searchTerm, searchTerm, searchTerm, effectiveLimit],
        );
        return rows.map(r => ({
          id: r.id,
          name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Unknown',
          subtitle: 'Event Director',
          meca_id: r.meca_id ? parseInt(r.meca_id, 10) : null,
          avatar_url: r.avatar_url,
        }));
      }

      case VotingAnswerType.RETAILER: {
        // Query retailer_listings table (the source of truth for retailer directory)
        const rows = await em.getConnection().execute<Array<{
          business_name: string; profile_image_url: string | null;
          city: string | null; state: string | null;
        }>>(
          `SELECT business_name, profile_image_url, city, state
           FROM retailer_listings
           WHERE is_active = true
             AND is_approved = true
             AND business_name IS NOT NULL
             AND business_name != ''
             AND business_name ILIKE ?
           ORDER BY business_name
           LIMIT ?`,
          [searchTerm, effectiveLimit],
        );
        return rows.map(r => {
          const location = [r.city, r.state].filter(Boolean).join(', ');
          return {
            id: r.business_name, // Use business name as ID (stored as text_answer)
            name: r.business_name,
            subtitle: location || undefined,
            avatar_url: r.profile_image_url,
          };
        });
      }

      case VotingAnswerType.MANUFACTURER: {
        // Query manufacturer_listings table (the source of truth for manufacturer directory)
        const rows = await em.getConnection().execute<Array<{
          business_name: string; profile_image_url: string | null;
          city: string | null; state: string | null;
        }>>(
          `SELECT business_name, profile_image_url, city, state
           FROM manufacturer_listings
           WHERE is_active = true
             AND is_approved = true
             AND business_name IS NOT NULL
             AND business_name != ''
             AND business_name ILIKE ?
           ORDER BY business_name
           LIMIT ?`,
          [searchTerm, effectiveLimit],
        );
        return rows.map(r => {
          const location = [r.city, r.state].filter(Boolean).join(', ');
          return {
            id: r.business_name, // Use business name as ID (stored as text_answer)
            name: r.business_name,
            subtitle: location || undefined,
            avatar_url: r.profile_image_url,
          };
        });
      }

      case VotingAnswerType.VENUE: {
        // Get the session to find its season
        const session = await em.findOne(VotingSession, { id: sessionId }, { populate: ['season'] });
        if (!session) {
          throw new NotFoundException('Session not found');
        }

        const rows = await em.getConnection().execute<Array<{
          venue_name: string; venue_city: string | null; venue_state: string | null;
        }>>(
          `SELECT DISTINCT venue_name, venue_city, venue_state
           FROM events
           WHERE season_id = ?
             AND venue_name IS NOT NULL
             AND venue_name != ''
             AND venue_name ILIKE ?
           ORDER BY venue_name
           LIMIT ?`,
          [session.season.id, searchTerm, effectiveLimit],
        );
        return rows.map(r => {
          const location = [r.venue_city, r.venue_state].filter(Boolean).join(', ');
          return {
            id: r.venue_name, // Use venue name as the ID since venues are text-based
            name: r.venue_name,
            subtitle: location || undefined,
          };
        });
      }

      case VotingAnswerType.TEAM: {
        const rows = await em.getConnection().execute<Array<{
          id: string; name: string; logo_url: string | null; location: string | null;
        }>>(
          `SELECT id, name, logo_url, location
           FROM teams
           WHERE is_active = true
             AND name ILIKE ?
           ORDER BY name
           LIMIT ?`,
          [searchTerm, effectiveLimit],
        );
        return rows.map(r => ({
          id: r.id,
          name: r.name,
          subtitle: r.location || undefined,
          avatar_url: r.logo_url,
        }));
      }

      default:
        throw new BadRequestException(`Unknown entity type: ${type}`);
    }
  }

  // =========================================================================
  // CATEGORIES (Admin)
  // =========================================================================

  async createCategory(dto: CreateVotingCategoryDto): Promise<VotingCategory> {
    const em = this.em.fork();
    const session = await em.findOne(VotingSession, { id: dto.session_id });
    if (!session) {
      throw new NotFoundException('Voting session not found');
    }
    if (session.status !== VotingSessionStatus.DRAFT) {
      throw new BadRequestException('Cannot modify categories after session leaves DRAFT status');
    }

    const category = new VotingCategory();
    category.session = em.getReference(VotingSession, dto.session_id);
    category.name = dto.name;
    category.description = dto.description ?? undefined;
    category.displayOrder = dto.display_order ?? 0;

    em.persist(category);
    await em.flush();
    return category;
  }

  async updateCategory(id: string, dto: UpdateVotingCategoryDto): Promise<VotingCategory> {
    const em = this.em.fork();
    const category = await em.findOne(VotingCategory, { id }, { populate: ['session'] });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (category.session.status !== VotingSessionStatus.DRAFT) {
      throw new BadRequestException('Cannot modify categories after session leaves DRAFT status');
    }

    if (dto.name) category.name = dto.name;
    if (dto.description !== undefined) category.description = dto.description ?? undefined;
    if (dto.display_order !== undefined) category.displayOrder = dto.display_order;

    await em.flush();
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    const em = this.em.fork();
    const category = await em.findOne(VotingCategory, { id }, { populate: ['session'] });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (category.session.status !== VotingSessionStatus.DRAFT) {
      throw new BadRequestException('Cannot modify categories after session leaves DRAFT status');
    }

    await em.nativeDelete(VotingQuestion, { category: { id } });
    await em.removeAndFlush(category);
  }

  // =========================================================================
  // QUESTIONS (Admin)
  // =========================================================================

  async createQuestion(dto: CreateVotingQuestionDto): Promise<VotingQuestion> {
    const em = this.em.fork();
    const category = await em.findOne(VotingCategory, { id: dto.category_id }, { populate: ['session'] });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (category.session.status !== VotingSessionStatus.DRAFT) {
      throw new BadRequestException('Cannot modify questions after session leaves DRAFT status');
    }

    const question = new VotingQuestion();
    question.category = em.getReference(VotingCategory, dto.category_id);
    question.title = dto.title;
    question.description = dto.description ?? undefined;
    question.imageUrl = dto.image_url ?? undefined;
    question.answerType = dto.answer_type;
    question.displayOrder = dto.display_order ?? 0;

    em.persist(question);
    await em.flush();
    return question;
  }

  async updateQuestion(id: string, dto: UpdateVotingQuestionDto): Promise<VotingQuestion> {
    const em = this.em.fork();
    const question = await em.findOne(VotingQuestion, { id }, { populate: ['category.session'] });
    if (!question) {
      throw new NotFoundException('Question not found');
    }
    if (question.category.session.status !== VotingSessionStatus.DRAFT) {
      throw new BadRequestException('Cannot modify questions after session leaves DRAFT status');
    }

    if (dto.category_id && dto.category_id !== question.category.id) {
      const newCategory = await em.findOne(VotingCategory, { id: dto.category_id }, { populate: ['session'] });
      if (!newCategory) {
        throw new NotFoundException('Target category not found');
      }
      if (newCategory.session.id !== question.category.session.id) {
        throw new BadRequestException('Cannot move question to a category in a different session');
      }
      question.category = newCategory;
    }

    if (dto.title) question.title = dto.title;
    if (dto.description !== undefined) question.description = dto.description ?? undefined;
    if (dto.image_url !== undefined) question.imageUrl = dto.image_url ?? undefined;
    if (dto.answer_type) question.answerType = dto.answer_type;
    if (dto.display_order !== undefined) question.displayOrder = dto.display_order;

    await em.flush();
    return question;
  }

  async deleteQuestion(id: string): Promise<void> {
    const em = this.em.fork();
    const question = await em.findOne(VotingQuestion, { id }, { populate: ['category.session'] });
    if (!question) {
      throw new NotFoundException('Question not found');
    }
    if (question.category.session.status !== VotingSessionStatus.DRAFT) {
      throw new BadRequestException('Cannot modify questions after session leaves DRAFT status');
    }

    await em.removeAndFlush(question);
  }

  // =========================================================================
  // VOTING (Member)
  // =========================================================================

  async getActiveSession(): Promise<{
    session: VotingSession;
    categories: Array<{
      id: string;
      name: string;
      description: string | null;
      display_order: number;
      questions: Array<{
        id: string;
        title: string;
        description: string | null;
        image_url: string | null;
        answer_type: string;
        display_order: number;
      }>;
    }>;
  } | null> {
    const em = this.em.fork();
    const now = new Date();

    const session = await em.findOne(
      VotingSession,
      {
        status: VotingSessionStatus.OPEN,
        startDate: { $lte: now },
        endDate: { $gte: now },
      },
      { populate: ['season', 'categories', 'categories.questions'] },
    );

    if (!session) return null;

    const categories = session.categories.getItems()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description ?? null,
        display_order: cat.displayOrder,
        questions: cat.questions.getItems()
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map(q => ({
            id: q.id,
            title: q.title,
            description: q.description ?? null,
            image_url: q.imageUrl ?? null,
            answer_type: q.answerType,
            display_order: q.displayOrder,
          })),
      }));

    return { session, categories };
  }

  async getSessionPreview(sessionId: string): Promise<{
    session: VotingSession;
    categories: Array<{
      id: string;
      name: string;
      description: string | null;
      display_order: number;
      questions: Array<{
        id: string;
        title: string;
        description: string | null;
        image_url: string | null;
        answer_type: string;
        display_order: number;
      }>;
    }>;
  }> {
    const em = this.em.fork();
    const session = await em.findOne(
      VotingSession,
      { id: sessionId },
      { populate: ['season', 'categories', 'categories.questions'] },
    );

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const categories = session.categories.getItems()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description ?? null,
        display_order: cat.displayOrder,
        questions: cat.questions.getItems()
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map(q => ({
            id: q.id,
            title: q.title,
            description: q.description ?? null,
            image_url: q.imageUrl ?? null,
            answer_type: q.answerType,
            display_order: q.displayOrder,
          })),
      }));

    return { session, categories };
  }

  async submitResponses(userId: string, dto: SubmitResponsesDto): Promise<VotingResponse[]> {
    const em = this.em.fork();

    // 1. Validate session exists and is OPEN
    const session = await em.findOne(VotingSession, { id: dto.session_id }, {
      populate: ['categories', 'categories.questions'],
    });
    if (!session) {
      throw new NotFoundException('Voting session not found');
    }
    if (session.status !== VotingSessionStatus.OPEN) {
      throw new BadRequestException('Voting session is not currently open');
    }

    // 2. Validate within time window
    const now = new Date();
    if (now < session.startDate || now > session.endDate) {
      throw new BadRequestException('Voting is not currently within the active time window');
    }

    // 3. Validate active membership
    const activeMembership = await this.membershipsService.getActiveMembership(userId);
    if (!activeMembership) {
      throw new ForbiddenException('Only active MECA members can vote');
    }

    // 4. Check if user already voted
    const existingResponse = await em.findOne(VotingResponse, {
      session: { id: dto.session_id },
      voter: { id: userId },
    });
    if (existingResponse) {
      throw new BadRequestException('You have already voted in this session');
    }

    // 5. Build question map from session
    const allQuestions = new Map<string, VotingQuestion>();
    for (const cat of session.categories.getItems()) {
      for (const q of cat.questions.getItems()) {
        allQuestions.set(q.id, q);
      }
    }

    // 6. Validate all questions have a response
    const responseQuestionIds = new Set(dto.responses.map(r => r.question_id));
    for (const [qId] of allQuestions) {
      if (!responseQuestionIds.has(qId)) {
        const q = allQuestions.get(qId)!;
        throw new BadRequestException(`Missing response for question: ${q.title}`);
      }
    }

    if (dto.responses.length !== allQuestions.size) {
      throw new BadRequestException('Must submit exactly one response per question');
    }

    // 7. Validate each response based on answer type
    const memberIdsToValidate: string[] = [];
    const teamIdsToValidate: string[] = [];

    for (const resp of dto.responses) {
      const question = allQuestions.get(resp.question_id);
      if (!question) {
        throw new BadRequestException(`Invalid question: ${resp.question_id}`);
      }

      if (PROFILE_ANSWER_TYPES.has(question.answerType)) {
        if (!resp.selected_member_id) {
          throw new BadRequestException(`Question "${question.title}" requires selecting a ${question.answerType}`);
        }
        memberIdsToValidate.push(resp.selected_member_id);
      } else if (question.answerType === VotingAnswerType.TEAM) {
        if (!resp.selected_team_id) {
          throw new BadRequestException(`Question "${question.title}" requires selecting a team`);
        }
        teamIdsToValidate.push(resp.selected_team_id);
      } else if (TEXT_ENTITY_TYPES.has(question.answerType)) {
        // Retailer, manufacturer, venue — stored as text_answer (business/venue name)
        if (!resp.text_answer || resp.text_answer.trim().length === 0) {
          throw new BadRequestException(`Question "${question.title}" requires a selection`);
        }
      } else if (question.answerType === VotingAnswerType.TEXT) {
        if (!resp.text_answer || resp.text_answer.trim().length === 0) {
          throw new BadRequestException(`Question "${question.title}" requires a text answer`);
        }
      }
    }

    // 8. Batch-validate member IDs
    if (memberIdsToValidate.length > 0) {
      const uniqueMemberIds = [...new Set(memberIdsToValidate)];
      const validMembers = await em.find(Profile, { id: { $in: uniqueMemberIds } });
      const validIds = new Set(validMembers.map(m => m.id));
      for (const memberId of uniqueMemberIds) {
        if (!validIds.has(memberId)) {
          throw new BadRequestException(`Invalid member selected: ${memberId}`);
        }
      }
    }

    // 9. Batch-validate team IDs
    if (teamIdsToValidate.length > 0) {
      const uniqueTeamIds = [...new Set(teamIdsToValidate)];
      const validTeams = await em.find(Team, { id: { $in: uniqueTeamIds } });
      const validIds = new Set(validTeams.map(t => t.id));
      for (const teamId of uniqueTeamIds) {
        if (!validIds.has(teamId)) {
          throw new BadRequestException(`Invalid team selected: ${teamId}`);
        }
      }
    }

    // 10. Insert all responses in a single transaction
    const responses = await em.transactional(async (txEm) => {
      const created: VotingResponse[] = [];
      for (const resp of dto.responses) {
        const question = allQuestions.get(resp.question_id)!;
        const response = new VotingResponse();
        response.session = txEm.getReference(VotingSession, dto.session_id);
        response.question = txEm.getReference(VotingQuestion, resp.question_id);
        response.voter = txEm.getReference(Profile, userId);

        if (PROFILE_ANSWER_TYPES.has(question.answerType) && resp.selected_member_id) {
          response.selectedMember = txEm.getReference(Profile, resp.selected_member_id);
        } else if (question.answerType === VotingAnswerType.TEAM && resp.selected_team_id) {
          response.selectedTeam = txEm.getReference(Team, resp.selected_team_id);
        } else if (TEXT_ENTITY_TYPES.has(question.answerType) || question.answerType === VotingAnswerType.TEXT) {
          // Retailer, manufacturer, venue, and text — all use text_answer
          response.textAnswer = resp.text_answer?.trim();
        }

        txEm.persist(response);
        created.push(response);
      }
      return created;
    });

    this.logger.log(`User ${userId} submitted responses for session ${dto.session_id} (${responses.length} responses)`);
    return responses;
  }

  async getMyResponses(userId: string, sessionId: string): Promise<VotingResponse[]> {
    const em = this.em.fork();
    return em.find(
      VotingResponse,
      { session: { id: sessionId }, voter: { id: userId } },
      { populate: ['question', 'selectedMember', 'selectedTeam'] },
    );
  }

  async hasUserVoted(userId: string, sessionId: string): Promise<boolean> {
    const em = this.em.fork();
    const count = await em.count(VotingResponse, {
      session: { id: sessionId },
      voter: { id: userId },
    });
    return count > 0;
  }

  // =========================================================================
  // RESULTS
  // =========================================================================

  async getResults(sessionId: string, adminPreview = false): Promise<VotingSessionResults> {
    // Check cache for finalized results
    const cached = this.resultsCache.get(sessionId);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    const em = this.em.fork();
    const session = await em.findOne(VotingSession, { id: sessionId }, {
      populate: ['categories', 'categories.questions'],
    });
    if (!session) {
      throw new NotFoundException('Voting session not found');
    }

    // Public access requires FINALIZED status
    if (!adminPreview && session.status !== VotingSessionStatus.FINALIZED) {
      throw new BadRequestException('Results are not yet available');
    }

    // Admin preview allowed for CLOSED or FINALIZED
    if (adminPreview && session.status === VotingSessionStatus.DRAFT) {
      throw new BadRequestException('Cannot preview results for DRAFT sessions');
    }

    // Get total unique voters
    const voterCount = await em.getConnection().execute<Array<{ count: string }>>(
      `SELECT COUNT(DISTINCT voter_id)::text as count FROM voting_responses WHERE session_id = ?`,
      [sessionId],
    );
    const totalVoters = parseInt(voterCount[0]?.count || '0', 10);

    // Build results per category
    const categories: VotingCategoryResult[] = [];

    for (const cat of session.categories.getItems().sort((a, b) => a.displayOrder - b.displayOrder)) {
      const questionResults: VotingQuestionResult[] = [];

      for (const question of cat.questions.getItems().sort((a, b) => a.displayOrder - b.displayOrder)) {
        if (PROFILE_ANSWER_TYPES.has(question.answerType)) {
          // Aggregate member votes (works for member, judge, event_director)
          const memberVotes = await em.getConnection().execute<Array<{
            selected_member_id: string;
            vote_count: string;
            first_name: string;
            last_name: string;
            meca_id: string | null;
            avatar_url: string | null;
          }>>(
            `SELECT vr.selected_member_id, COUNT(*)::text as vote_count,
                    p.first_name, p.last_name, p.meca_id::text, p.avatar_url
             FROM voting_responses vr
             JOIN profiles p ON p.id = vr.selected_member_id
             WHERE vr.question_id = ? AND vr.selected_member_id IS NOT NULL
             GROUP BY vr.selected_member_id, p.first_name, p.last_name, p.meca_id, p.avatar_url
             ORDER BY vote_count DESC`,
            [question.id],
          );

          const totalResponses = memberVotes.reduce((sum, mv) => sum + parseInt(mv.vote_count, 10), 0);

          questionResults.push({
            question_id: question.id,
            question_title: question.title,
            question_description: question.description ?? null,
            question_image_url: question.imageUrl ?? null,
            answer_type: question.answerType,
            total_responses: totalResponses,
            member_votes: memberVotes.map(mv => ({
              member_id: mv.selected_member_id,
              member_name: `${mv.first_name || ''} ${mv.last_name || ''}`.trim() || 'Unknown',
              member_meca_id: mv.meca_id ? parseInt(mv.meca_id, 10) : null,
              member_avatar_url: mv.avatar_url ?? null,
              vote_count: parseInt(mv.vote_count, 10),
            })),
          });
        } else if (question.answerType === VotingAnswerType.TEAM) {
          // Aggregate team votes
          const teamVotes = await em.getConnection().execute<Array<{
            selected_team_id: string;
            vote_count: string;
            team_name: string;
            logo_url: string | null;
          }>>(
            `SELECT vr.selected_team_id, COUNT(*)::text as vote_count,
                    t.name as team_name, t.logo_url
             FROM voting_responses vr
             JOIN teams t ON t.id = vr.selected_team_id
             WHERE vr.question_id = ? AND vr.selected_team_id IS NOT NULL
             GROUP BY vr.selected_team_id, t.name, t.logo_url
             ORDER BY vote_count DESC`,
            [question.id],
          );

          const totalResponses = teamVotes.reduce((sum, tv) => sum + parseInt(tv.vote_count, 10), 0);

          questionResults.push({
            question_id: question.id,
            question_title: question.title,
            question_description: question.description ?? null,
            question_image_url: question.imageUrl ?? null,
            answer_type: question.answerType,
            total_responses: totalResponses,
            team_votes: teamVotes.map(tv => ({
              team_id: tv.selected_team_id,
              team_name: tv.team_name,
              team_logo_url: tv.logo_url ?? null,
              vote_count: parseInt(tv.vote_count, 10),
            })),
          });
        } else if (TEXT_ENTITY_TYPES.has(question.answerType)) {
          // Aggregate text-entity votes (retailer, manufacturer, venue — all stored as text_answer)
          const entityVotes = await em.getConnection().execute<Array<{
            text_answer: string;
            vote_count: string;
          }>>(
            `SELECT text_answer, COUNT(*)::text as vote_count
             FROM voting_responses
             WHERE question_id = ? AND text_answer IS NOT NULL AND text_answer != ''
             GROUP BY text_answer
             ORDER BY vote_count DESC`,
            [question.id],
          );

          const totalResponses = entityVotes.reduce((sum, ev) => sum + parseInt(ev.vote_count, 10), 0);

          questionResults.push({
            question_id: question.id,
            question_title: question.title,
            question_description: question.description ?? null,
            question_image_url: question.imageUrl ?? null,
            answer_type: question.answerType,
            total_responses: totalResponses,
            venue_votes: entityVotes.map(ev => ({
              venue_name: ev.text_answer,
              vote_count: parseInt(ev.vote_count, 10),
            })),
          });
        } else {
          // Text answers
          const textResponses = await em.getConnection().execute<Array<{
            text_answer: string;
          }>>(
            `SELECT text_answer FROM voting_responses
             WHERE question_id = ? AND text_answer IS NOT NULL AND text_answer != ''
             ORDER BY created_at ASC`,
            [question.id],
          );

          questionResults.push({
            question_id: question.id,
            question_title: question.title,
            question_description: question.description ?? null,
            question_image_url: question.imageUrl ?? null,
            answer_type: question.answerType,
            total_responses: textResponses.length,
            text_answers: textResponses.map(r => r.text_answer),
          });
        }
      }

      categories.push({
        category_id: cat.id,
        category_name: cat.name,
        category_description: cat.description ?? null,
        questions: questionResults,
      });
    }

    const results: VotingSessionResults = {
      session: {
        id: session.id,
        title: session.title,
        description: session.description ?? null,
        season_id: session.season.id,
        status: session.status,
      },
      categories,
      total_voters: totalVoters,
    };

    // Cache finalized results for 5 minutes
    if (session.status === VotingSessionStatus.FINALIZED) {
      this.resultsCache.set(sessionId, {
        data: results,
        expiry: Date.now() + 5 * 60 * 1000,
      });
    }

    return results;
  }

  // =========================================================================
  // PUBLIC STATUS
  // =========================================================================

  async getPublicStatus(userId?: string): Promise<VotingPublicStatus> {
    if (this.statusCache && Date.now() < this.statusCache.expiry && !userId) {
      return this.statusCache.data;
    }

    const noSessionStatus: VotingPublicStatus = {
      has_active_session: false,
      session_id: null,
      title: null,
      status: null,
      start_date: null,
      end_date: null,
    };

    let sessions: VotingSession[];
    try {
      const em = this.em.fork();
      sessions = await em.find(
        VotingSession,
        {},
        { orderBy: { createdAt: 'DESC' }, limit: 10 },
      );
    } catch (err: any) {
      // Table may not exist if migrations haven't been run
      if (err.message?.includes('does not exist') || err.code === '42P01') {
        this.logger.warn('voting_sessions table does not exist. Run migrations on this environment.');
        return noSessionStatus;
      }
      throw err;
    }

    const openSession = sessions.find(s => s.status === VotingSessionStatus.OPEN);
    const closedSession = sessions.find(s => s.status === VotingSessionStatus.CLOSED);
    const finalizedSession = sessions.find(s => s.status === VotingSessionStatus.FINALIZED);
    const draftSession = sessions.find(
      s => s.status === VotingSessionStatus.DRAFT && s.startDate > new Date(),
    );

    const activeSession = openSession || closedSession || finalizedSession || draftSession;

    if (!activeSession) {
      if (!userId) {
        this.statusCache = { data: noSessionStatus, expiry: Date.now() + 30000 };
      }
      return noSessionStatus;
    }

    const status: VotingPublicStatus = {
      has_active_session: true,
      session_id: activeSession.id,
      title: activeSession.title,
      status: activeSession.status,
      start_date: activeSession.startDate.toISOString(),
      end_date: activeSession.endDate.toISOString(),
    };

    if (userId && activeSession.status === VotingSessionStatus.OPEN) {
      status.user_has_voted = await this.hasUserVoted(userId, activeSession.id);
    }

    if (!userId) {
      this.statusCache = { data: status, expiry: Date.now() + 30000 };
    }

    return status;
  }

  private clearStatusCache(): void {
    this.statusCache = null;
  }
}
