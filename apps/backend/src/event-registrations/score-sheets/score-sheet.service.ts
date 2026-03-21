import { Injectable, Inject, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import { EventRegistration } from '../event-registrations.entity';
import { EventRegistrationClass } from '../event-registration-classes.entity';
import { Event } from '../../events/events.entity';
import { Profile } from '../../profiles/profiles.entity';
import { TeamMember } from '../../teams/team-member.entity';
import { Team } from '../../teams/team.entity';

type TemplateKey = 'dd' | 'install' | 'music-authority' | 'rtl' | 'sq' | 'ss' | 'spl';

const TEMPLATE_FILES: Record<string, string> = {
  dd: 'dd.png',
  install: 'install.png',
  'music-authority': 'music-authority.png',
  rtl: 'rtl.png',
  sq: 'sq.png',
  ss: 'ss.png',
  spl: 'spl.png',
};

const TEMPLATE_NAMES: Record<string, string> = {
  spl: 'SPL / Sound Pressure',
  install: 'Install',
  dd: 'Dueling Demos',
  sq: 'SQ / Sound Quality',
  ss: 'Show and Shine',
  rtl: 'Ride the Light',
  'music-authority': 'Music Authority',
};

// PDF page dimensions (US Letter)
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

// Template PNG dimensions
const PNG_W = 1545;
const PNG_H = 2000;

// Convert PNG pixel coords to PDF points
const toPdfX = (pngX: number) => (pngX / PNG_W) * PAGE_WIDTH;
const toPdfY = (pngY: number) => PAGE_HEIGHT - ((pngY / PNG_H) * PAGE_HEIGHT);

export interface FieldCoord {
  x: number;
  y: number;
  fontSize?: number;
}

export interface TemplateCoords {
  eventName: FieldCoord;
  date: FieldCoord;
  mecaId: FieldCoord;
  name: FieldCoord;
  team: FieldCoord;
  address: FieldCoord;
  email: FieldCoord;
  city: FieldCoord;
  state: FieldCoord;
  phone: FieldCoord;
}

// Default font sizes per field type
const DEFAULT_FONT_SIZES: Record<keyof TemplateCoords, number> = {
  eventName: 14,
  date: 14,
  mecaId: 24,
  name: 14,
  team: 14,
  address: 14,
  email: 14,
  city: 14,
  state: 14,
  phone: 14,
};

const DEFAULT_COORDS: TemplateCoords = {
  eventName: { x: 320, y: 248, fontSize: 14 },
  date: { x: 1000, y: 248, fontSize: 14 },
  mecaId: { x: 1300, y: 55, fontSize: 24 },
  name: { x: 145, y: 1910, fontSize: 14 },
  team: { x: 710, y: 1910, fontSize: 14 },
  address: { x: 175, y: 1938, fontSize: 14 },
  email: { x: 650, y: 1938, fontSize: 14 },
  city: { x: 105, y: 1966, fontSize: 14 },
  state: { x: 380, y: 1966, fontSize: 14 },
  phone: { x: 870, y: 1966, fontSize: 14 },
};

export interface MappingRule {
  pattern: string;
  template: string;
  priority?: number;
}

export interface TemplateMappings {
  classNameRules: MappingRule[];
  formatRules: MappingRule[];
  mecaKidsRules: MappingRule[];
  defaultTemplate: string;
  worldFinals: {
    classNameRules: MappingRule[];
    formatRules: MappingRule[];
    defaultTemplate: string;
  };
}

@Injectable()
export class ScoreSheetService implements OnModuleInit {
  private readonly logger = new Logger(ScoreSheetService.name);
  private templateCache = new Map<string, Uint8Array>();
  private coordsMap = new Map<string, TemplateCoords>();
  private mappings!: TemplateMappings;
  private assetsDir: string;

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {
    this.assetsDir = path.join(__dirname, '..', '..', '..', 'assets', 'score-sheet-templates');
  }

  async onModuleInit() {
    this.loadTemplates();
    this.loadCoords();
    this.loadMappings();
  }

  private loadTemplates() {
    for (const [key, filename] of Object.entries(TEMPLATE_FILES)) {
      const filePath = path.join(this.assetsDir, filename);
      try {
        const data = fs.readFileSync(filePath);
        this.templateCache.set(key, new Uint8Array(data));
        this.logger.log(`Loaded score sheet template: ${filename}`);
      } catch (err) {
        this.logger.warn(`Could not load score sheet template ${filename}: ${err}`);
      }
    }
  }

  private loadCoords() {
    const coordsPath = path.join(this.assetsDir, 'coords.json');
    try {
      const raw = fs.readFileSync(coordsPath, 'utf-8');
      const data = JSON.parse(raw);
      for (const [key, coords] of Object.entries(data)) {
        this.coordsMap.set(key, { ...DEFAULT_COORDS, ...(coords as any) });
      }
      this.logger.log(`Loaded score sheet coordinates for ${this.coordsMap.size} templates`);
    } catch (err) {
      this.logger.warn(`Could not load coords.json, using defaults: ${err}`);
    }
  }

  private loadMappings() {
    const mappingsPath = path.join(this.assetsDir, 'mappings.json');
    try {
      const raw = fs.readFileSync(mappingsPath, 'utf-8');
      this.mappings = JSON.parse(raw);
      this.logger.log(`Loaded score sheet mappings`);
    } catch (err) {
      this.logger.warn(`Could not load mappings.json, using defaults: ${err}`);
      this.mappings = {
        classNameRules: [],
        formatRules: [],
        mecaKidsRules: [],
        defaultTemplate: 'spl',
        worldFinals: { classNameRules: [], formatRules: [], defaultTemplate: 'spl' },
      };
    }
  }

  private getCoordsForTemplate(key: string): TemplateCoords {
    return this.coordsMap.get(key) || DEFAULT_COORDS;
  }

  // ---- Public API for template editor ----

  getTemplateList(): string[] {
    return [...this.templateCache.keys()];
  }

  getTemplateConfigs(): Array<{ key: string; name: string; coords: TemplateCoords }> {
    const keys = new Set([...Object.keys(TEMPLATE_FILES), ...this.templateCache.keys()]);
    return [...keys].map(key => ({
      key,
      name: TEMPLATE_NAMES[key] || key,
      coords: this.getCoordsForTemplate(key),
    }));
  }

  getTemplateImage(key: string): Uint8Array | null {
    return this.templateCache.get(key) || null;
  }

  saveTemplateCoords(key: string, coords: TemplateCoords) {
    this.coordsMap.set(key, coords);

    // Persist to JSON file
    const coordsPath = path.join(this.assetsDir, 'coords.json');
    const allCoords: Record<string, TemplateCoords> = {};
    for (const [k, v] of this.coordsMap.entries()) {
      allCoords[k] = v;
    }
    fs.writeFileSync(coordsPath, JSON.stringify(allCoords, null, 2));
    this.logger.log(`Saved coordinates for template: ${key}`);
  }

  uploadTemplateImage(key: string, imageBuffer: Buffer, displayName?: string) {
    // Save image to assets directory
    const filename = `${key}.png`;
    const filePath = path.join(this.assetsDir, filename);
    fs.writeFileSync(filePath, imageBuffer);

    // Update caches
    this.templateCache.set(key, new Uint8Array(imageBuffer));
    TEMPLATE_FILES[key] = filename;
    if (displayName) {
      TEMPLATE_NAMES[key] = displayName;
    }

    // Initialize default coords if new template
    if (!this.coordsMap.has(key)) {
      this.coordsMap.set(key, { ...DEFAULT_COORDS });
      this.saveTemplateCoords(key, DEFAULT_COORDS);
    }

    this.logger.log(`Uploaded template image: ${key} (${imageBuffer.length} bytes)`);
  }

  getMappings(): TemplateMappings {
    return this.mappings;
  }

  saveMappings(mappings: TemplateMappings) {
    this.mappings = mappings;
    const mappingsPath = path.join(this.assetsDir, 'mappings.json');
    fs.writeFileSync(mappingsPath, JSON.stringify(mappings, null, 2));
    this.logger.log('Saved score sheet mappings');
  }

  // ---- Template resolution ----

  resolveTemplate(format: string, className: string, isWorldFinals: boolean = false): string {
    const cn = className.toLowerCase();
    const fmt = format.toLowerCase();

    // Use world finals rules if applicable
    const rules = isWorldFinals && this.mappings.worldFinals
      ? this.mappings.worldFinals
      : this.mappings;

    const classRules = rules.classNameRules || [];
    const fmtRules = rules.formatRules || [];
    const defaultTmpl = rules.defaultTemplate || 'spl';

    // 1. Check class name rules (contains match, priority order)
    for (const rule of classRules.sort((a, b) => (a.priority || 99) - (b.priority || 99))) {
      if (cn.includes(rule.pattern.toLowerCase())) {
        return rule.template;
      }
    }

    // 2. MECA Kids sub-matching (only for regular season)
    if (!isWorldFinals && (cn.includes('meca kids') || cn.includes('meca kid'))) {
      const kidsRules = this.mappings.mecaKidsRules || [];
      for (const rule of kidsRules) {
        if (cn.includes(rule.pattern.toLowerCase())) {
          return rule.template;
        }
      }
      return defaultTmpl;
    }

    // 3. Check format rules (case-insensitive match)
    for (const rule of fmtRules) {
      if (fmt === rule.pattern.toLowerCase()) {
        return rule.template;
      }
    }

    return defaultTmpl;
  }

  // ---- PDF generation ----

  async generateForRegistration(registrationId: string): Promise<Buffer> {
    const em = this.em.fork();
    const registration = await em.findOne(EventRegistration, { id: registrationId }, {
      populate: ['event', 'user', 'classes'],
    });
    if (!registration) {
      throw new NotFoundException(`Registration ${registrationId} not found`);
    }

    const event = registration.event as Event;
    const isWorldFinals = event?.eventType === 'world_finals';
    const classes = await em.find(EventRegistrationClass, { eventRegistration: registrationId });
    const teamName = await this.getTeamName(em, registration);
    const mecaId = await this.getMecaId(em, registration);

    const pdfDoc = await PDFDocument.create();
    if (classes.length === 0) {
      await this.addScoreSheetPage(pdfDoc, 'spl', event, registration, teamName, mecaId);
    } else {
      for (const cls of classes) {
        const templateKey = this.resolveTemplate(cls.format, cls.className, isWorldFinals);
        await this.addScoreSheetPage(pdfDoc, templateKey, event, registration, teamName, mecaId);
      }
    }

    return Buffer.from(await pdfDoc.save());
  }

  async generateForEvent(eventId: string, formatFilter?: string): Promise<Buffer> {
    const em = this.em.fork();
    const event = await em.findOne(Event, { id: eventId });
    if (!event) throw new NotFoundException(`Event ${eventId} not found`);
    const isWorldFinals = event.eventType === 'world_finals';

    const registrations = await em.find(EventRegistration, {
      event: eventId,
      registrationStatus: { $ne: 'interested' as any },
    }, {
      populate: ['user', 'classes'],
      orderBy: { lastName: 'ASC', firstName: 'ASC' },
    });

    const userIds = registrations.filter(r => r.user).map(r => (r.user as any).id || r.user);
    const teamMap = await this.getTeamNamesForUsers(em, userIds);
    const mecaIdMap = await this.getMecaIdsForUsers(em, userIds);

    const pdfDoc = await PDFDocument.create();
    for (const registration of registrations) {
      const classes = await em.find(EventRegistrationClass, { eventRegistration: registration.id });
      const userId = registration.user ? ((registration.user as any).id || registration.user) : null;
      const teamName = userId ? (teamMap.get(userId) || '') : '';
      let mecaId = registration.mecaId ? String(registration.mecaId) : '';
      if (!mecaId && userId) mecaId = mecaIdMap.get(userId) || '';

      const filteredClasses = formatFilter
        ? classes.filter(c => c.format.toLowerCase() === formatFilter.toLowerCase())
        : classes;

      if (filteredClasses.length === 0 && !formatFilter) {
        await this.addScoreSheetPage(pdfDoc, 'spl', event, registration, teamName, mecaId);
      } else {
        for (const cls of filteredClasses) {
          await this.addScoreSheetPage(pdfDoc, this.resolveTemplate(cls.format, cls.className, isWorldFinals), event, registration, teamName, mecaId);
        }
      }
    }

    if (pdfDoc.getPageCount() === 0) {
      await this.addScoreSheetPage(pdfDoc, 'spl', event, {} as any, '', '');
    }

    return Buffer.from(await pdfDoc.save());
  }

  private async addScoreSheetPage(
    pdfDoc: PDFDocument,
    templateKey: string,
    event: Event,
    registration: EventRegistration,
    teamName: string,
    mecaId: string,
  ): Promise<void> {
    let templateData = this.templateCache.get(templateKey);
    if (!templateData) {
      templateData = this.templateCache.get('spl');
      if (!templateData) throw new Error('No score sheet templates loaded');
    }

    const coords = this.getCoordsForTemplate(templateKey);
    const pngImage = await pdfDoc.embedPng(templateData);
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawImage(pngImage, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT });

    const color = rgb(0, 0, 0);
    const s = (v: any) => String(v || '');
    const fs = (field: keyof TemplateCoords) => coords[field].fontSize || DEFAULT_FONT_SIZES[field];

    // Header
    page.drawText(s(event?.title), {
      x: toPdfX(coords.eventName.x), y: toPdfY(coords.eventName.y),
      size: fs('eventName'), color,
    });

    const eventDate = event?.eventDate
      ? new Date(event.eventDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
      : '';
    page.drawText(eventDate, {
      x: toPdfX(coords.date.x), y: toPdfY(coords.date.y),
      size: fs('date'), color,
    });

    // MECA ID
    if (mecaId) {
      page.drawText(String(mecaId), {
        x: toPdfX(coords.mecaId.x), y: toPdfY(coords.mecaId.y),
        size: fs('mecaId'), color,
      });
    }

    // Competitor Info
    const name = [registration.firstName, registration.lastName].filter(Boolean).join(' ');
    page.drawText(name, { x: toPdfX(coords.name.x), y: toPdfY(coords.name.y), size: fs('name'), color });
    page.drawText(s(teamName), { x: toPdfX(coords.team.x), y: toPdfY(coords.team.y), size: fs('team'), color });
    page.drawText(s(registration.address), { x: toPdfX(coords.address.x), y: toPdfY(coords.address.y), size: fs('address'), color });
    page.drawText(s(registration.email), { x: toPdfX(coords.email.x), y: toPdfY(coords.email.y), size: fs('email'), color });
    page.drawText(s(registration.city), { x: toPdfX(coords.city.x), y: toPdfY(coords.city.y), size: fs('city'), color });
    page.drawText(s(registration.state), { x: toPdfX(coords.state.x), y: toPdfY(coords.state.y), size: fs('state'), color });
    page.drawText(s(registration.phone), { x: toPdfX(coords.phone.x), y: toPdfY(coords.phone.y), size: fs('phone'), color });
  }

  // ---- Helpers ----

  private async getMecaId(em: EntityManager, registration: EventRegistration): Promise<string> {
    if (registration.mecaId) return String(registration.mecaId);
    if (!registration.user) return '';
    const userId = (registration.user as any).id || registration.user;
    const profile = await em.findOne(Profile, { id: userId });
    return profile?.meca_id || '';
  }

  private async getMecaIdsForUsers(em: EntityManager, userIds: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (userIds.length === 0) return result;
    const profiles = await em.find(Profile, { id: { $in: userIds } });
    for (const p of profiles) {
      if (p.meca_id) result.set(p.id, p.meca_id);
    }
    return result;
  }

  private async getTeamName(em: EntityManager, registration: EventRegistration): Promise<string> {
    if (!registration.user) return '';
    const userId = (registration.user as any).id || registration.user;
    const teamMember = await em.findOne(TeamMember, { userId, status: 'active' });
    if (!teamMember) return '';
    const team = await em.findOne(Team, { id: teamMember.teamId });
    return team?.name || '';
  }

  private async getTeamNamesForUsers(em: EntityManager, userIds: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (userIds.length === 0) return result;
    const teamMembers = await em.find(TeamMember, { userId: { $in: userIds }, status: 'active' });
    if (teamMembers.length === 0) return result;
    const teamIds = [...new Set(teamMembers.map(tm => tm.teamId))];
    const teams = await em.find(Team, { id: { $in: teamIds } });
    const teamMap = new Map(teams.map(t => [t.id, t.name]));
    for (const tm of teamMembers) {
      const teamName = teamMap.get(tm.teamId);
      if (teamName) result.set(tm.userId, teamName);
    }
    return result;
  }
}
