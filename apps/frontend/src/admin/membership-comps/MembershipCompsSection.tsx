import { useState, useEffect } from 'react';
import { Gift, Plus, RefreshCw, X } from 'lucide-react';
import {
  membershipCompsApi,
  MembershipComp,
  MembershipCompType,
} from '@/api-client/membership-comps.api-client';
import AddCompModal from './AddCompModal';

interface MembershipCompsSectionProps {
  membershipId: string;
  membershipName: string;
  /** Hint to the modal whether comps make sense (e.g. Forever Members blocked server-side anyway). */
  showAddButton?: boolean;
}

const TYPE_LABEL: Record<MembershipCompType, string> = {
  free_period: 'Free Period',
  free_secondary_slots: 'Free Secondary Slot(s)',
  renewal_discount_pct: '% Renewal Discount',
  renewal_discount_fixed: '$ Renewal Discount',
};

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  expired_unused: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  consumed: 'bg-slate-700 text-slate-400 border-slate-600',
  revoked: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

const formatDate = (s?: string | null) => s ? new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const describe = (c: MembershipComp): string => {
  const v = c.value;
  switch (c.comp_type) {
    case 'free_period':
      return c.ends_at ? `Free until ${formatDate(c.ends_at)}` : 'Free (indefinite)';
    case 'free_secondary_slots':
      return `${c.uses_remaining ?? c.value} of ${c.max_uses ?? c.value} slot(s) remaining` +
        (c.ends_at ? ` · claim by ${formatDate(c.ends_at)}` : '');
    case 'renewal_discount_pct':
      return `${v}% off · ${c.uses_remaining ?? c.max_uses ?? 1} use(s) left`;
    case 'renewal_discount_fixed':
      return `$${v} off · ${c.uses_remaining ?? c.max_uses ?? 1} use(s) left`;
    default:
      return 'Comp';
  }
};

export default function MembershipCompsSection({
  membershipId,
  membershipName,
  showAddButton = true,
}: MembershipCompsSectionProps) {
  const [comps, setComps] = useState<MembershipComp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const data = await membershipCompsApi.listForMembership(membershipId);
      setComps(data);
    } catch (err) {
      // Silently degrade — section just shows empty state if fetch fails.
      console.error('Failed to load comps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, [membershipId]);

  const activeComps = comps.filter(c => c.status === 'active');
  const historyComps = comps.filter(c => c.status !== 'active');

  const handleRevoke = async (comp: MembershipComp) => {
    if (!window.confirm(`Revoke ${TYPE_LABEL[comp.comp_type]}? This is logged to the audit trail and takes effect immediately.`)) return;
    const reason = window.prompt('Reason for revoking (optional):') || undefined;
    setRevokingId(comp.id);
    try {
      await membershipCompsApi.revoke(comp.id, reason);
      await fetch();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to revoke comp');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="mt-3 px-3 py-2 bg-slate-800/40 border border-slate-700/50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-400 font-medium">
          <Gift className="h-3.5 w-3.5" />
          Comps
          {activeComps.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px]">
              {activeComps.length} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {historyComps.length > 0 && (
            <button
              onClick={() => setShowHistory(v => !v)}
              className="text-[11px] text-gray-400 hover:text-white"
            >
              {showHistory ? 'Hide' : `Show history (${historyComps.length})`}
            </button>
          )}
          {showAddButton && (
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-medium rounded border border-emerald-500/30"
            >
              <Plus className="h-3 w-3" />
              Add Comp
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-[11px] text-gray-500 py-1">Loading…</div>
      ) : (
        <>
          {/* Active comps */}
          {activeComps.length === 0 && (
            <div className="text-[11px] text-gray-500 py-1">No active comps</div>
          )}
          {activeComps.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_STYLE[c.status]}`}>
                    {TYPE_LABEL[c.comp_type]}
                  </span>
                  <span className="text-gray-300">{describe(c)}</span>
                </div>
                {c.reason && <div className="text-[10px] text-gray-500 mt-0.5">{c.reason}</div>}
              </div>
              <button
                onClick={() => handleRevoke(c)}
                disabled={revokingId === c.id}
                className="p-1 text-rose-400 hover:text-rose-300 hover:bg-slate-700 rounded disabled:opacity-50"
                title="Revoke comp"
              >
                {revokingId === c.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              </button>
            </div>
          ))}

          {/* History */}
          {showHistory && historyComps.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-1">
              {historyComps.map(c => (
                <div key={c.id} className="flex items-start gap-2 py-1 text-[11px] text-gray-500">
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${STATUS_STYLE[c.status]}`}>
                    {c.status.replace('_', ' ')}
                  </span>
                  <div className="flex-1">
                    <span className="text-gray-400">{TYPE_LABEL[c.comp_type]}</span>{' · '}
                    {describe(c)}
                    <span className="text-gray-600">{' · granted '}{formatDate(c.granted_at)}</span>
                    {c.revoked_at && <span className="text-gray-600">{' · revoked '}{formatDate(c.revoked_at)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showAdd && (
        <AddCompModal
          membershipId={membershipId}
          membershipName={membershipName}
          onClose={() => setShowAdd(false)}
          onGranted={() => {
            setShowAdd(false);
            fetch();
          }}
        />
      )}
    </div>
  );
}
