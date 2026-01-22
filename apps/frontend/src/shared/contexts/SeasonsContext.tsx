import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { seasonsApi, Season } from '@/seasons/seasons.api-client';

interface SeasonsContextType {
  seasons: Season[];
  currentSeason: Season | null;
  loading: boolean;
  error: string | null;
  getSeasonById: (id: string) => Season | undefined;
  refresh: () => Promise<void>;
}

const SeasonsContext = createContext<SeasonsContextType | undefined>(undefined);

export function SeasonsProvider({ children }: { children: ReactNode }) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSeasons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await seasonsApi.getAll();
      setSeasons(data);

      // Find current season from the list
      const current = data.find(s => s.is_current || s.isCurrent);
      setCurrentSeason(current || null);
    } catch (err) {
      console.error('Error fetching seasons:', err);
      setError('Failed to load seasons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  const getSeasonById = useCallback((id: string): Season | undefined => {
    return seasons.find(s => s.id === id);
  }, [seasons]);

  const refresh = useCallback(async () => {
    await fetchSeasons();
  }, [fetchSeasons]);

  return (
    <SeasonsContext.Provider
      value={{
        seasons,
        currentSeason,
        loading,
        error,
        getSeasonById,
        refresh,
      }}
    >
      {children}
    </SeasonsContext.Provider>
  );
}

export function useSeasons() {
  const context = useContext(SeasonsContext);
  if (context === undefined) {
    throw new Error('useSeasons must be used within a SeasonsProvider');
  }
  return context;
}
