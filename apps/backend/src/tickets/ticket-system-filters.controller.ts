import { Controller, Get, Headers, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { SupabaseAdminService } from '../auth/supabase-admin.service';
import { Profile } from '../profiles/profiles.entity';
import { isAdminUser } from '../auth/is-admin.helper';

/**
 * System (server-defined) ticket filters. Replaces the per-browser
 * localStorage "quick filter" buttons. Returned to authenticated
 * staff so the front-end can render a consistent set of chips above
 * the ticket queue.
 *
 * The `$me` placeholder in criteria values is resolved client-side to
 * the current user's UUID before the criteria is sent to the
 * ticket-list endpoint. This keeps the controller stateless and the
 * filter definitions safely copy-pastable.
 */
@Controller('api/ticket-tools/system-filters')
export class TicketSystemFiltersController {
  constructor(
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly em: EntityManager,
  ) {}

  private async requireStaff(authHeader?: string): Promise<{ userId: string; profile: Profile }> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await this.supabaseAdmin.getClient().auth.getUser(token);
    if (error || !user) throw new UnauthorizedException('Invalid authorization token');
    const em = this.em.fork();
    const profile = await em.findOne(Profile, { id: user.id });
    if (!profile) throw new ForbiddenException('Profile not found');
    if (!isAdminUser(profile)) throw new ForbiddenException('Staff or admin access required');
    return { userId: user.id, profile };
  }

  @Get()
  async list(@Headers('authorization') authHeader: string): Promise<SystemFilter[]> {
    await this.requireStaff(authHeader);
    return SYSTEM_FILTERS;
  }
}

interface SystemFilter {
  id: string;
  label: string;
  description: string;
  icon: string; // lucide-react icon name
  criteria: Record<string, string>;
  // Order in which the chip appears in the UI. Lower = leftmost.
  sort_order: number;
}

/**
 * Curated list, ordered by typical-usage frequency: things the agent
 * needs to act on most are leftmost. Editing this list ships to every
 * agent on next deploy - the localStorage-presets surface is reserved
 * for personal customizations on top of these.
 */
const SYSTEM_FILTERS: SystemFilter[] = [
  {
    id: 'awaiting_my_reply',
    label: 'Awaiting My Reply',
    description: 'Tickets assigned to you where the ball is in your court.',
    icon: 'MessageSquare',
    criteria: { assigned_to_id: '$me', waiting_on: 'staff' },
    sort_order: 10,
  },
  {
    id: 'awaiting_customer',
    label: 'Awaiting Customer',
    description: 'Tickets where staff replied last and we are waiting on a customer response.',
    icon: 'Clock',
    criteria: { waiting_on: 'customer' },
    sort_order: 20,
  },
  {
    id: 'unassigned_awaiting_staff',
    label: 'Unassigned (Needs Pickup)',
    description: 'Unassigned tickets where a staff reply is overdue.',
    icon: 'Users',
    criteria: { assigned_to_id: 'unassigned', waiting_on: 'staff' },
    sort_order: 30,
  },
  {
    id: 'critical_open',
    label: 'Critical & Open',
    description: 'High-priority tickets that are still in the open bucket.',
    icon: 'AlertCircle',
    criteria: { priority: 'critical', status: 'open' },
    sort_order: 40,
  },
  {
    id: 'on_hold',
    label: 'On Hold',
    description: 'Paused tickets waiting on external input or scheduled work.',
    icon: 'PauseCircle',
    criteria: { status: 'on_hold' },
    sort_order: 50,
  },
  {
    id: 'my_recently_closed',
    label: 'My Recently Closed',
    description: 'Tickets you closed in the last 7 days.',
    icon: 'CheckCircle',
    criteria: { assigned_to_id: '$me', status: 'closed' },
    sort_order: 60,
  },
];
