import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Sparkles } from 'lucide-react';
import { membershipCompsApi, MembershipComp } from '@/api-client/membership-comps.api-client';

/**
 * Member-facing badge that surfaces active comps on the MyMECA dashboard.
 * Three flavors:
 *   - Free Period (with end date or indefinite)
 *   - Free Secondary Slot(s) — claimable, deep-links to claim flow
 *   - Renewal Discount — informational
 *
 * Hidden when no active comps. Membership benefits are admin-granted, so
 * this card only appears when the member actually has something to show.
 */
export default function MyCompsBadge() {
  const navigate = useNavigate();
  const [comps, setComps] = useState<MembershipComp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await membershipCompsApi.listMyActive();
        setComps(data);
      } catch {
        // Silently degrade — badge hides on fetch failure.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || comps.length === 0) return null;

  const fmtDate = (s?: string | null) =>
    s ? new Date(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null;

  const renderOne = (c: MembershipComp) => {
    // Backend serializes the FK relation under `membership_id` (due to the
    // entity's serializedName). When populated, the value is the Membership
    // object; when not, it's the UUID string. Handle both.
    const membershipObj: any = (c as any).membership_id && typeof (c as any).membership_id === 'object'
      ? (c as any).membership_id
      : (c as any).membership;
    const membershipName = membershipObj?.membershipTypeConfig?.name
      || membershipObj?.membership_type_config?.name
      || 'Membership';
    const membershipId = membershipObj?.id ?? (typeof (c as any).membership_id === 'string' ? (c as any).membership_id : '');
    switch (c.comp_type) {
      case 'free_period':
        return (
          <div key={c.id} className="flex items-start justify-between gap-3 py-2">
            <div>
              <div className="text-white font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                {c.ends_at
                  ? `${membershipName} is comped through ${fmtDate(c.ends_at)}`
                  : `${membershipName} is a lifetime comp`}
              </div>
              <p className="text-emerald-200/80 text-sm mt-0.5">
                You won't be charged for renewal during this period.
              </p>
            </div>
          </div>
        );
      case 'free_secondary_slots': {
        const remaining = c.uses_remaining ?? parseInt(c.value, 10);
        return (
          <div key={c.id} className="flex items-start justify-between gap-3 py-2">
            <div>
              <div className="text-white font-medium flex items-center gap-2">
                <Gift className="h-4 w-4 text-emerald-300" />
                {remaining} free secondary membership{remaining > 1 ? 's' : ''} available
              </div>
              <p className="text-emerald-200/80 text-sm mt-0.5">
                Add a family/team member at no charge
                {c.ends_at && ` (claim by ${fmtDate(c.ends_at)})`}.
              </p>
            </div>
            <button
              onClick={() => navigate(`/dashboard/membership?addSecondary=${membershipId}`)}
              className="px-3 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-md whitespace-nowrap"
            >
              Claim Slot
            </button>
          </div>
        );
      }
      case 'renewal_discount_pct':
        return (
          <div key={c.id} className="flex items-start justify-between gap-3 py-2">
            <div>
              <div className="text-white font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                {c.value}% off your next renewal
              </div>
              <p className="text-emerald-200/80 text-sm mt-0.5">
                Applied automatically at checkout
                {c.ends_at && ` — expires ${fmtDate(c.ends_at)}`}.
              </p>
            </div>
          </div>
        );
      case 'renewal_discount_fixed':
        return (
          <div key={c.id} className="flex items-start justify-between gap-3 py-2">
            <div>
              <div className="text-white font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                ${c.value} off your next renewal
              </div>
              <p className="text-emerald-200/80 text-sm mt-0.5">
                Applied automatically at checkout
                {c.ends_at && ` — expires ${fmtDate(c.ends_at)}`}.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/40 rounded-xl p-5 mb-6">
      <h3 className="text-emerald-200 font-semibold text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
        <Gift className="h-4 w-4" />
        Your Member Benefits
      </h3>
      <div className="divide-y divide-emerald-500/20">
        {comps.map(renderOne)}
      </div>
    </div>
  );
}
