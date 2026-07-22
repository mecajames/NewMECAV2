import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { useSeasons } from '@/shared/contexts/SeasonsContext';
import type { Season } from '@/seasons/seasons.api-client';

const startOf = (s: Season): string | undefined => s.start_date ?? s.startDate;
const endOf = (s: Season): string | undefined => {
  const raw = s.end_date ?? s.endDate;
  if (!raw) return undefined;
  // Make the season's last day inclusive for date-range (revenue) queries.
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T23:59:59.999` : raw;
};
const isCurrentSeason = (s: Season): boolean => !!(s.is_current ?? s.isCurrent);

export interface SeasonDateRange {
  startDate?: string;
  endDate?: string;
}

/**
 * Season-filter state for a stats bar. Defaults to the CURRENT season once
 * seasons load; the user can switch to any season or "All time" (null).
 * Exposes both the seasonId (for season_id-scoped endpoints, e.g. events /
 * registrations / results) and the season's date range (for time-based
 * endpoints that only have created_at, e.g. billing revenue / orders).
 */
export function useSeasonFilter() {
  const { seasons, currentSeason, loading } = useSeasons();
  const [seasonId, setSeasonIdState] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  // Default to the current season the first time it resolves, unless the user
  // has already made a selection.
  useEffect(() => {
    if (!touched && currentSeason?.id) setSeasonIdState(currentSeason.id);
  }, [touched, currentSeason?.id]);

  const setSeasonId = (id: string | null) => {
    setTouched(true);
    setSeasonIdState(id);
  };

  const season = seasons.find((s) => s.id === seasonId) ?? null;
  const dateRange: SeasonDateRange = season
    ? { startDate: startOf(season), endDate: endOf(season) }
    : {};

  // Stay "loading" until the current-season default has actually been applied
  // (the effect above runs a render AFTER seasons resolve). Without this, a
  // consumer's `if (loading) return` fetch guard passes while seasonId is
  // still null and fires an unwanted ALL-TIME fetch that races the real
  // season-scoped one — the heavier all-time response lands last and wins.
  const pendingDefault = !touched && !!currentSeason?.id && seasonId === null;

  return { seasonId, setSeasonId, season, dateRange, seasons, currentSeason, loading: loading || pendingDefault };
}

export interface SeasonSelectProps {
  value: string | null;
  onChange: (seasonId: string | null) => void;
  /** Show an "All time" option (value = null). Defaults to true. */
  includeAllTime?: boolean;
  className?: string;
}

/** Compact season dropdown for stats bars. Pairs with useSeasonFilter(). */
export function SeasonSelect({ value, onChange, includeAllTime = true, className = '' }: SeasonSelectProps) {
  const { seasons, loading } = useSeasons();
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
      <select
        value={value ?? ''}
        disabled={loading}
        onChange={(e) => onChange(e.target.value || null)}
        className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
      >
        {includeAllTime && <option value="">All time</option>}
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {isCurrentSeason(s) ? ' (current)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
