import { useEffect, useState } from 'react';
import { BookOpen, FileText, Archive as ArchiveIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { rulebooksApi, Rulebook } from '@/rulebooks';
import { SEOHead, useRulebooksSEO } from '@/shared/seo';

export default function RulebooksPage() {
  const navigate = useNavigate();
  const [rulebooks, setRulebooks] = useState<Rulebook[]>([]);
  const [loading, setLoading] = useState(true);
  const seoProps = useRulebooksSEO();

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

  const groupedRulebooks = rulebooks.reduce((acc, rulebook) => {
    if (!acc[rulebook.category]) {
      acc[rulebook.category] = [];
    }
    acc[rulebook.category].push(rulebook);
    return acc;
  }, {} as Record<string, Rulebook[]>);

  if (loading) {
    return (
      <>
        <SEOHead {...seoProps} />
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead {...seoProps} />
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="h-10 w-10 text-orange-500" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Rulebooks</h1>
              </div>
              <p className="text-gray-400">
                Official competition rulebooks for all MECA categories
            </p>
          </div>
          <button
            onClick={() => navigate('/rulebooks/archive')}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArchiveIcon className="h-5 w-5" />
            View Archive
          </button>
        </div>

        {Object.keys(groupedRulebooks).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Object.entries(groupedRulebooks).map(([category, categoryRulebooks]) =>
              categoryRulebooks.map((rulebook) => (
                <button
                  key={rulebook.id}
                  onClick={() => navigate(`/rulebooks/${rulebook.id}`)}
                  className="bg-slate-800 hover:bg-slate-700 rounded-xl p-5 sm:p-6 text-left transition-all transform hover:-translate-y-1 hover:shadow-xl border border-slate-700 hover:border-orange-500/50"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-6 w-6 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-white mb-1 leading-tight">
                        {rulebook.title}
                      </h3>
                      <p className="text-xs text-gray-400">Season {rulebook.season}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                    <span className="text-xs text-gray-500 truncate">{category}</span>
                    <span className="text-orange-500 text-sm font-medium whitespace-nowrap">
                      View →
                    </span>
                  </div>
                </button>
              ))
            )}
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
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              <ArchiveIcon className="h-5 w-5" />
              Browse Archive
            </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
