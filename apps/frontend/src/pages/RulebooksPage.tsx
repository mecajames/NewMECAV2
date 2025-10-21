import { useEffect, useState } from 'react';
import { BookOpen, FileText, Archive as ArchiveIcon } from 'lucide-react';
import { supabase, Rulebook } from '../lib/supabase';

interface RulebooksPageProps {
  onNavigate: (page: string, data?: any) => void;
}

export default function RulebooksPage({ onNavigate }: RulebooksPageProps) {
  const [rulebooks, setRulebooks] = useState<Rulebook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveRulebooks();
  }, []);

  const fetchActiveRulebooks = async () => {
    const { data, error } = await supabase
      .from('rulebooks')
      .select('*')
      .eq('status', 'active')
      .order('category')
      .order('season', { ascending: false });

    if (!error && data) {
      setRulebooks(data);
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
            onClick={() => onNavigate('rulebook-archive')}
            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArchiveIcon className="h-5 w-5" />
            View Archive
          </button>
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
                      onClick={() => onNavigate('rulebook-detail', { rulebookId: rulebook.id })}
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
              onClick={() => onNavigate('rulebook-archive')}
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
