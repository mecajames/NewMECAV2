import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import {
  membershipCompsApi,
  MembershipComp,
  MembershipCompType,
} from '@/api-client/membership-comps.api-client';

/**
 * Top-of-page indicator on the admin Member Detail screen — shows when the
 * member has any active comp on any of their memberships, with a brief
 * description of what they've got. Clicking opens the Memberships tab.
 */
export default function AdminMemberCompBadge({
  userId,
  onClick,
}: {
  userId: string;
  onClick?: () => void;
}) {
  const [comps, setComps] = useState<MembershipComp[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await membershipCompsApi.listActiveForUser(userId);
        if (!cancelled) setComps(data);
      } catch {
        // Silently degrade — this is an at-a-glance badge, not blocking UI
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (!loaded || comps.length === 0) return null;

  // Summarize. Free-period comps take priority because they're the most
  // operationally significant ("this member is currently comped").
  const TYPE_SHORT: Record<MembershipCompType, string> = {
    free_period: 'Free Membership',
    free_secondary_slots: 'Free Secondary Slot(s)',
    renewal_discount_pct: '% Renewal Discount',
    renewal_discount_fixed: '$ Renewal Discount',
  };
  const counts = new Map<MembershipCompType, number>();
  for (const c of comps) {
    counts.set(c.comp_type, (counts.get(c.comp_type) ?? 0) + 1);
  }
  // Build a compact label like "1 Free Membership · 2 Free Secondary Slot(s)"
  const labelParts: string[] = [];
  for (const [type, n] of counts.entries()) {
    labelParts.push(n === 1 ? TYPE_SHORT[type] : `${n} × ${TYPE_SHORT[type]}`);
  }
  const label = labelParts.join(' · ');

  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1.5 hover:bg-emerald-500/25 transition-colors"
      title="Click to view active comps on the Memberships tab"
    >
      <Gift className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
