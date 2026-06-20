/**
 * Shared audience + role-gating controls for the ticket Department and Category
 * admin screens. `audience` decides who sees the item on the public form;
 * `required_roles` (when non-empty) further restricts it to members holding one
 * of those roles (implies members-only).
 */

const AUDIENCES: { value: string; label: string }[] = [
  { value: 'all', label: 'Everyone (guests + members)' },
  { value: 'members', label: 'Members only (logged in)' },
  { value: 'guests', label: 'Guests only (not logged in)' },
];

// Roles that can gate a department/category. Matches Profile.role values.
const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'event_director', label: 'Event Director' },
  { value: 'judge', label: 'Judge' },
];

export function AudienceRoleFields({
  audience,
  requiredRoles,
  onChange,
}: {
  audience: string;
  requiredRoles: string[];
  onChange: (next: { audience: string; required_roles: string[] }) => void;
}) {
  const toggleRole = (role: string) => {
    const next = requiredRoles.includes(role)
      ? requiredRoles.filter((r) => r !== role)
      : [...requiredRoles, role];
    onChange({ audience, required_roles: next });
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Who can see this</label>
        <select
          value={audience}
          onChange={(e) => onChange({ audience: e.target.value, required_roles: requiredRoles })}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {AUDIENCES.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Restrict to roles (optional — checking any implies members only)
        </label>
        <div className="flex flex-wrap gap-3">
          {ROLE_OPTIONS.map((r) => (
            <label key={r.value} className="flex items-center gap-1.5 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={requiredRoles.includes(r.value)}
                onChange={() => toggleRole(r.value)}
                className="rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500"
              />
              {r.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Compact read-only display of audience + role gating for list rows. */
export function AudienceBadge({
  audience,
  requiredRoles,
}: {
  audience?: string | null;
  requiredRoles?: string[] | null;
}) {
  const roles = requiredRoles ?? [];
  const aud = audience || 'all';
  const audLabel = aud === 'members' ? 'Members' : aud === 'guests' ? 'Guests' : 'Everyone';
  const audClass =
    aud === 'all'
      ? 'bg-slate-600/40 text-gray-300'
      : aud === 'members'
        ? 'bg-blue-500/10 text-blue-300 border border-blue-500/40'
        : 'bg-amber-500/10 text-amber-300 border border-amber-500/40';
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className={`px-2 py-0.5 text-xs rounded-full ${audClass}`}>{audLabel}</span>
      {roles.map((r) => (
        <span
          key={r}
          className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/40"
          title={`Role: ${r}`}
        >
          {r === 'event_director' ? 'ED' : r === 'judge' ? 'Judge' : r}
        </span>
      ))}
    </div>
  );
}
