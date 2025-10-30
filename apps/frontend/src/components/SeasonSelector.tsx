import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Season } from '../types/database';

interface SeasonSelectorProps {
  selectedSeasonId: string;
  onSeasonChange: (seasonId: string) => void;
  showAllOption?: boolean;
  label?: string;
  className?: string;
}

export default function SeasonSelector({
  selectedSeasonId,
  onSeasonChange,
  showAllOption = true,
  label = 'Filter by Season',
  className = '',
}: SeasonSelectorProps) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('year', { ascending: false });

    if (!error && data) {
      setSeasons(data);
      // If no season is selected and we have seasons, select the current one by default
      if (!selectedSeasonId && data.length > 0) {
        const currentSeason = data.find((s) => s.is_current);
        if (currentSeason) {
          onSeasonChange(currentSeason.id);
        }
      }
    }
    setLoading(false);
  };

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
