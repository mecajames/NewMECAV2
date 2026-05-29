import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { StaffSignature } from './entities/staff-signature.entity';
import { Profile } from '../profiles/profiles.entity';

/**
 * Per-agent signature CRUD. The signature row is keyed by user_id so
 * each agent has exactly zero or one signature.
 *
 * Security: HTML is sanitized server-side on every write via a strict
 * allowlist (see sanitizeSignatureHtml). The frontend is expected to
 * also run DOMPurify on render - defense in depth - but the server is
 * the only source of truth, and a signature in the DB is always safe
 * to render in email templates without further escaping.
 *
 * The maximum allowed length is 20 000 chars (enforced both by a
 * Postgres CHECK constraint and by a pre-sanitize guard). After
 * sanitization the result is typically much smaller than the
 * pre-sanitize input.
 */
@Injectable()
export class StaffSignaturesService {
  private readonly MAX_HTML_LENGTH = 20_000;

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  /**
   * Fetch a user's signature row, or null if they have none. Use
   * `getActiveForEmail` instead when assembling outbound email - that
   * one also honors the is_active flag.
   */
  async findByUserId(userId: string): Promise<StaffSignature | null> {
    const em = this.em.fork();
    return em.findOne(StaffSignature, { userId });
  }

  /**
   * Returns the signature only if the agent has one AND it's
   * currently active. Null otherwise - callers should append nothing.
   */
  async getActiveForEmail(userId: string): Promise<{ html: string; plainText: string } | null> {
    const row = await this.findByUserId(userId);
    if (!row || !row.isActive) return null;
    if (!row.html && !row.plainText) return null;
    return { html: row.html, plainText: row.plainText };
  }

  /**
   * Upsert the signature for `userId`. Sanitizes HTML on the way in.
   * Trims the plain-text version to MAX_HTML_LENGTH as well.
   *
   * `userId` is treated as authoritative - the caller must have
   * already verified that the requesting auth user is allowed to
   * write this row (i.e. they ARE this user, or an admin).
   */
  async upsert(
    userId: string,
    dto: { html?: string; plain_text?: string; is_active?: boolean },
  ): Promise<StaffSignature> {
    const em = this.em.fork();

    // Make sure the profile actually exists before we INSERT - the FK
    // would catch this anyway but a friendly 400 beats a 500 from a
    // constraint violation.
    const profile = await em.findOne(Profile, { id: userId });
    if (!profile) throw new NotFoundException('Profile not found');

    const rawHtml = dto.html ?? '';
    const rawPlain = dto.plain_text ?? '';
    if (rawHtml.length > this.MAX_HTML_LENGTH) {
      throw new BadRequestException(`Signature HTML exceeds ${this.MAX_HTML_LENGTH} characters`);
    }
    if (rawPlain.length > this.MAX_HTML_LENGTH) {
      throw new BadRequestException(`Signature plain text exceeds ${this.MAX_HTML_LENGTH} characters`);
    }

    const cleanHtml = sanitizeSignatureHtml(rawHtml);
    const cleanPlain = rawPlain.normalize('NFC').slice(0, this.MAX_HTML_LENGTH);

    let row = await em.findOne(StaffSignature, { userId });
    if (!row) {
      row = new StaffSignature();
      row.userId = userId;
      row.html = cleanHtml;
      row.plainText = cleanPlain;
      row.isActive = dto.is_active ?? true;
      em.persist(row);
    } else {
      if (dto.html !== undefined) row.html = cleanHtml;
      if (dto.plain_text !== undefined) row.plainText = cleanPlain;
      if (dto.is_active !== undefined) row.isActive = dto.is_active;
    }
    await em.flush();
    return row;
  }

  /**
   * Remove the agent's signature entirely. Idempotent - no error if
   * the row doesn't exist.
   */
  async deleteByUserId(userId: string): Promise<void> {
    const em = this.em.fork();
    const row = await em.findOne(StaffSignature, { userId });
    if (row) {
      await em.removeAndFlush(row);
    }
  }
}

// ============================================================================
// Sanitization (strict allowlist)
// ============================================================================

/**
 * Allowlist of tag names. Anything else is stripped (both opening and
 * closing). Tags here intentionally cover signature-style formatting:
 * a few inline styles, hyperlinks, an image (for MECA logo / agent
 * photo), and minimal block structure (paragraphs, breaks, lists,
 * small headers).
 */
const ALLOWED_TAGS = new Set([
  'a', 'b', 'br', 'div', 'em', 'h2', 'h3', 'h4', 'i', 'img',
  'li', 'ol', 'p', 'span', 'strong', 'u', 'ul',
]);

/**
 * Per-tag allowlist of attributes. URLs are further sanitized to
 * reject javascript:/data: schemes (except data:image/* for inline
 * images, which is permitted on the <img> tag only).
 */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel', 'title']),
  img: new Set(['src', 'alt', 'width', 'height', 'title']),
  span: new Set(['style']),
  div: new Set(['style']),
  p: new Set(['style']),
};

/**
 * CSS property allowlist for `style="..."` attributes. Keeps the
 * surface small (color, font-weight, etc.) - no positioning,
 * transforms, or anything that could distort the email layout.
 */
const ALLOWED_CSS_PROPS = new Set([
  'color', 'background-color', 'font-weight', 'font-style', 'font-size',
  'text-decoration', 'text-align', 'margin', 'padding', 'line-height',
]);

/**
 * Strict, regex-based sanitizer. Parses tag-by-tag, drops anything
 * not on the allowlist, normalizes attribute quoting, and rejects
 * dangerous URL schemes.
 *
 * Not a general-purpose HTML cleaner - only safe for the narrow set
 * of formatting we permit in signatures. If the allowlist needs to
 * grow significantly, switch to `sanitize-html` or a real HTML
 * parser.
 */
export function sanitizeSignatureHtml(input: string): string {
  if (!input) return '';
  // Hard kill any CR/LF escapes that could confuse downstream email
  // headers. Keep regular newlines for content.
  const cleaned = input.replace(/\r/g, '');

  let out = '';
  let i = 0;
  while (i < cleaned.length) {
    const ch = cleaned[i];
    if (ch !== '<') {
      // Text node - escape angles / amps proactively so any literal
      // angle-bracket in user-typed signature doesn't break later.
      // Don't touch already-escaped entities.
      out += ch
        .replace(/&(?!(amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
        .replace(/</g, '&lt;');
      i++;
      continue;
    }

    // We're at a '<' - try to match a tag. If parse fails we drop
    // until the next '>' so we never emit half a tag.
    const tagMatch = cleaned.slice(i).match(/^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/);
    if (!tagMatch) {
      // Stray '<' - escape and move on.
      out += '&lt;';
      i++;
      continue;
    }
    const [full, slash, rawName, rawAttrs] = tagMatch;
    const name = rawName.toLowerCase();
    i += full.length;

    if (!ALLOWED_TAGS.has(name)) continue; // tag dropped, attributes too

    if (slash) {
      out += `</${name}>`;
      continue;
    }

    // Open tag - sanitize attributes.
    const allowedAttrs = ALLOWED_ATTRS[name];
    const attrParts: string[] = [];
    if (allowedAttrs && rawAttrs.trim()) {
      const attrRegex = /([a-zA-Z][a-zA-Z0-9:-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'<>`]+))/g;
      let m: RegExpExecArray | null;
      while ((m = attrRegex.exec(rawAttrs)) !== null) {
        const attrName = m[1].toLowerCase();
        const value = (m[3] ?? m[4] ?? m[5] ?? '').trim();
        if (!allowedAttrs.has(attrName)) continue;
        // on* event handler attributes are never allowed.
        if (attrName.startsWith('on')) continue;
        let safeValue: string = value;
        if (attrName === 'href' || attrName === 'src') {
          const url = sanitizeUrl(value, name === 'img');
          if (url === null) continue;
          safeValue = url;
        } else if (attrName === 'style') {
          const styled = sanitizeStyle(value);
          if (!styled) continue;
          safeValue = styled;
        }
        // Always re-quote with double quotes; escape any internal "
        attrParts.push(`${attrName}="${safeValue.replace(/"/g, '&quot;')}"`);
      }
    }

    // Force noopener/noreferrer on external links - safer default.
    if (name === 'a' && attrParts.some(p => p.startsWith('href='))) {
      const hasRel = attrParts.some(p => p.startsWith('rel='));
      if (!hasRel) attrParts.push('rel="noopener noreferrer"');
      const hasTarget = attrParts.some(p => p.startsWith('target='));
      if (!hasTarget) attrParts.push('target="_blank"');
    }

    const isVoid = name === 'br' || name === 'img';
    out += `<${name}${attrParts.length ? ' ' + attrParts.join(' ') : ''}${isVoid ? '/' : ''}>`;
  }
  return out;
}

function sanitizeUrl(raw: string, allowDataImage: boolean): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Reject control chars
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return null;
  // Allow http/https/mailto/relative ('/') URLs
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
  // Allow data:image/* on <img> only (e.g. inline-encoded MECA logo).
  if (allowDataImage && /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function sanitizeStyle(raw: string): string {
  if (!raw) return '';
  const parts = raw.split(';');
  const safe: string[] = [];
  for (const part of parts) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const propRaw = part.slice(0, idx).trim().toLowerCase();
    const valueRaw = part.slice(idx + 1).trim();
    if (!ALLOWED_CSS_PROPS.has(propRaw)) continue;
    // Reject CSS values that could contain URLs / expressions.
    if (/url\s*\(|expression\s*\(|@import/i.test(valueRaw)) continue;
    // Reject control chars
    if (/[\x00-\x1F\x7F]/.test(valueRaw)) continue;
    safe.push(`${propRaw}: ${valueRaw}`);
  }
  return safe.join('; ');
}
