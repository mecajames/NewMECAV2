import { useEffect, useState } from 'react';
import { BookOpen, Download, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Rulebook {
  id: string;
  title: string;
  description: string;
  year: number;
  category: string;
  pdf_url: string;
  summary_points: any;
  is_active: boolean;
  display_order: number;
}

export default function RulebooksPage() {
  const [rulebooks, setRulebooks] = useState<Rulebook[]>([]);
  const [selectedRulebook, setSelectedRulebook] = useState<Rulebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchRulebooks();
  }, [filter]);

  const fetchRulebooks = async () => {
    let query = supabase
      .from('rulebooks')
      .select('*')
      .order('year', { ascending: false })
      .order('display_order', { ascending: true });

    if (filter !== 'all') {
      query = query.eq('category', filter);
    }

    const { data } = await query;

    if (data) {
      setRulebooks(data);
      if (data.length > 0 && !selectedRulebook) {
        setSelectedRulebook(data[0]);
      }
    }
    setLoading(false);
  };

  const categories = ['SPL', 'SQL', 'Show N Shine', 'General'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Competition Rulebooks</h1>
          <p className="text-gray-400 text-lg">
            Official rules and regulations for MECA car audio competitions
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                filter === category
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : rulebooks.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg sticky top-24">
                <h2 className="text-xl font-bold text-white mb-4">Available Rulebooks</h2>
                <div className="space-y-3">
                  {rulebooks.map((rulebook) => (
                    <button
                      key={rulebook.id}
                      onClick={() => setSelectedRulebook(rulebook)}
                      className={`w-full text-left p-4 rounded-lg transition-all ${
                        selectedRulebook?.id === rulebook.id
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <BookOpen className="h-5 w-5 flex-shrink-0 mt-1" />
                        <div>
                          <p className="font-semibold">{rulebook.title}</p>
                          <div className="flex items-center gap-2 text-sm opacity-75 mt-1">
                            <Calendar className="h-3 w-3" />
                            {rulebook.year}
                          </div>
                          <span className="inline-block mt-2 px-2 py-1 text-xs rounded bg-white/10">
                            {rulebook.category}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedRulebook && (
                <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
                  <div className="p-6 border-b border-slate-700">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-3xl font-bold text-white mb-2">
                          {selectedRulebook.title}
                        </h2>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {selectedRulebook.year}
                          </span>
                          <span className="px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full">
                            {selectedRulebook.category}
                          </span>
                        </div>
                      </div>
                      <a
                        href={selectedRulebook.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Download PDF
                      </a>
                    </div>

                    {selectedRulebook.description && (
                      <p className="text-gray-300 leading-relaxed">
                        {selectedRulebook.description}
                      </p>
                    )}

                    {selectedRulebook.summary_points &&
                      Array.isArray(selectedRulebook.summary_points) &&
                      selectedRulebook.summary_points.length > 0 && (
                        <div className="mt-6">
                          <h3 className="text-lg font-semibold text-white mb-3">
                            Key Points
                          </h3>
                          <ul className="space-y-2">
                            {selectedRulebook.summary_points.map((point: string, index: number) => (
                              <li key={index} className="flex items-start gap-2 text-gray-300">
                                <span className="text-orange-500 mt-1">•</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>

                  <div className="aspect-[8.5/11] bg-slate-900">
                    <iframe
                      src={selectedRulebook.pdf_url}
                      className="w-full h-full"
                      title={selectedRulebook.title}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-800 rounded-xl">
            <BookOpen className="h-20 w-20 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-xl">No rulebooks available at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
