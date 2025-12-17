import { useEffect, useState, useMemo } from 'react';
import { BookOpen, FileText, Archive as ArchiveIcon, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { rulebooksApi, Rulebook } from '@/rulebooks';

export default function RulebooksPage() {
  const navigate = useNavigate();
  const [rulebooks, setRulebooks] = useState<Rulebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('');

  useEffect(() => {
    fetchActiveRulebooks();
  }, []);

  const fetchActiveRulebooks = async () => {
    try {
      const data = await rulebooksApi.getActiveRulebooks();

      // Sort by category first, then by season descending
      const sorted = data.sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return b.season.localeCompare(a.season);
      });

      setRulebooks(sorted);
    } catch (error) {
      console.error('Error fetching active rulebooks:', error);
    }
    setLoading(false);
  };

  // Get unique years from rulebooks (sorted descending)
  const availableYears = useMemo(() => {
    const years = [...new Set(rulebooks.map((r) => String(r.season)))];
    return years.sort((a, b) => Number(b) - Number(a));
  }, [rulebooks]);

  // Filter rulebooks by selected year
  const filteredRulebooks = selectedYear
    ? rulebooks.filter((rulebook) => String(rulebook.season) === selectedYear)
    : rulebooks;

  const groupedRulebooks = filteredRulebooks.reduce((acc, rulebook) => {
    if (!acc[rulebook.category]) {
      acc[rulebook.category] = [];
    }
    acc[rulebook.category].push(rulebook);
    return acc;
  }, {} as Record<string, Rulebook[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="text-center py-20">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="h-10 w-10 text-orange-500" />
              <h1 className="text-4xl font-bold text-white">Rulebooks</h1>
            </div>
            <p className="text-gray-400">
              Official competition rulebooks for all MECA categories
            </p>
          </div>
          <button
            onClick={() => navigate('/rulebooks/archive')}
            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArchiveIcon className="h-5 w-5" />
            View Archive
          </button>
        </div>

        <div className="mb-6 max-w-xs">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
            <Calendar className="h-4 w-4 text-orange-500" />
            Filter by Year
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Years</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}{year === String(new Date().getFullYear()) ? ' (Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {Object.keys(groupedRulebooks).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedRulebooks).map(([category, categoryRulebooks]) => (
              <div key={category} className="bg-slate-800 rounded-xl p-8 shadow-xl">
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-3">
                  {category}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryRulebooks.map((rulebook) => (
                    <button
                      key={rulebook.id}
                      onClick={() => navigate(`/rulebooks/${rulebook.id}`)}
                      className="bg-slate-700 hover:bg-slate-600 rounded-xl p-6 text-left transition-all transform hover:-translate-y-2 hover:shadow-xl"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-7 w-7 text-orange-500" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-white mb-2">
                            {rulebook.title}
                          </h3>
                          <p className="text-sm text-gray-400 mb-3">Season {rulebook.season}</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-600">
                        <span className="text-orange-500 text-sm font-medium">
                          View Rulebook →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <BookOpen className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">No Active Rulebooks</h3>
            <p className="text-gray-400 mb-6">
              There are currently no active rulebooks available.
            </p>
            <button
              onClick={() => navigate('/rulebooks/archive')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              <ArchiveIcon className="h-5 w-5" />
              Browse Archive
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
