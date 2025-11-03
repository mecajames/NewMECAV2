import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { Season } from '../types/database';
import { seasonsApi } from '../api-client/seasons.api-client';

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSeasons = async () => {
      setLoading(true);
      try {
        const data = await seasonsApi.getAll();
        setSeasons(data as any);
      } catch (error) {
        console.error('Error fetching seasons:', error);
        setSeasons([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSeasons();
  }, []);

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
