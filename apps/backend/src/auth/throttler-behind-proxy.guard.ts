import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate-limit tracker that sees the real visitor IP behind Cloudflare + nginx.
 *
 * Express is not configured with `trust proxy`, so `req.ip` is the proxy hop
 * (nginx / Cloudflare), not the visitor. The stock ThrottlerGuard tracks by
 * `req.ip`, which put EVERY site visitor into one shared per-"IP" window in
 * production — tight public limits (e.g. POST /memberships/active-meca-ids,
 * 10/min) then 429'd site-wide under normal traffic, and the results pages
 * rendered false "Member profile not active" for genuinely active members.
 *
 * Resolution order:
 *   1. CF-Connecting-IP — set by Cloudflare; it overwrites any
 *      client-supplied copy, so it can't be spoofed through Cloudflare.
 *   2. First X-Forwarded-For hop — same idiom the rest of the codebase uses
 *      for audit/IP logging (tickets, contact, user-activity controllers).
 *   3. req.ips[0] / req.ip — direct connections (local dev).
 */
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const cf = req.headers?.['cf-connecting-ip'];
    if (typeof cf === 'string' && cf.trim()) return cf.trim();

    const xff = req.headers?.['x-forwarded-for'];
    const firstHop = (Array.isArray(xff) ? xff[0] : xff)
      ?.toString()
      .split(',')[0]
      ?.trim();
    if (firstHop) return firstHop;

    return req.ips?.length ? req.ips[0] : req.ip;
  }
}
