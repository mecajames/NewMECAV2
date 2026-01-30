import { useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { useSeasons } from '@/shared/contexts';

interface SeasonSelectorProps {
  selectedSeasonId: string;
  onSeasonChange: (seasonId: string) => void;
  showAllOption?: boolean;
  label?: string;
  className?: string;
  autoSelectCurrent?: boolean;
}

export default function SeasonSelector({
  selectedSeasonId,
  onSeasonChange,
  showAllOption = true,
  label = 'Filter by Season',
  className = '',
  autoSelectCurrent = false,
}: SeasonSelectorProps) {
  const { seasons, currentSeason, loading } = useSeasons();
  const hasAutoSelected = useRef(false);

  // Auto-select current season once when requested and no season is selected
  useEffect(() => {
    if (autoSelectCurrent && !selectedSeasonId && currentSeason && !hasAutoSelected.current && !loading) {
      hasAutoSelected.current = true;
      onSeasonChange(currentSeason.id);
    }
  }, [autoSelectCurrent, selectedSeasonId, currentSeason, onSeasonChange, loading]);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 text-gray-300">
        <Calendar className="h-5 w-5 text-orange-500" />
        <span className="font-medium">{label}:</span>
      </div>
      <select
        value={selectedSeasonId}
        onChange={(e) => onSeasonChange(e.target.value)}
        disabled={loading}
        className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {showAllOption && <option value="">All Seasons</option>}
        {seasons.map((season) => (
          <option key={season.id} value={season.id}>
            {season.name}
            {season.is_current ? ' (Current)' : ''}
            {season.is_next ? ' (Next)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
