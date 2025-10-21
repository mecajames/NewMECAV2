import { useEffect, useState } from 'react';
import { FileText, Search, Filter, Archive } from 'lucide-react';
import { supabase, Rulebook, RulebookCategory } from '../lib/supabase';

interface RulebookArchivePageProps {
  onNavigate: (page: string, data?: any) => void;
}

export default function RulebookArchivePage({ onNavigate }: RulebookArchivePageProps) {
  const [rulebooks, setRulebooks] = useState<Rulebook[]>([]);
  const [filteredRulebooks, setFilteredRulebooks] = useState<Rulebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');

  const categories: RulebookCategory[] = [
    'SPL Rulebook',
    'SQL Rulebook',
    'MECA Kids',
    'Dueling Demos',
    'Show and Shine',
    'Ride the Light',
  ];

  useEffect(() => {
    fetchArchivedRulebooks();
  }, []);

  useEffect(() => {
    filterRulebooks();
  }, [rulebooks, searchTerm, selectedCategory, selectedSeason]);

  const fetchArchivedRulebooks = async () => {
    const { data, error } = await supabase
      .from('rulebooks')
      .select('*')
      .eq('status', 'archive')
      .order('season', { ascending: false })
      .order('category');

    if (!error && data) {
      setRulebooks(data);
    }
    setLoading(false);
  };

  const filterRulebooks = () => {
    let filtered = [...rulebooks];

    if (searchTerm) {
      filtered = filtered.filter(
        (rb) =>
          rb.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rb.season.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((rb) => rb.category === selectedCategory);
    }

    if (selectedSeason !== 'all') {
      filtered = filtered.filter((rb) => rb.season === selectedSeason);
    }

    setFilteredRulebooks(filtered);
  };

  const uniqueSeasons = Array.from(new Set(rulebooks.map((rb) => rb.season))).sort().reverse();

  const groupedByCategory = filteredRulebooks.reduce((acc, rulebook) => {
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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Archive className="h-10 w-10 text-orange-500" />
            <h1 className="text-4xl font-bold text-white">Rulebook Archive</h1>
          </div>
          <p className="text-gray-400">Browse historical rulebooks by category and season</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search rulebooks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Seasons</option>
                {uniqueSeasons.map((season) => (
                  <option key={season} value={season}>
                    {season}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-400">
            Showing {filteredRulebooks.length} of {rulebooks.length} archived rulebooks
          </div>
        </div>

        {Object.keys(groupedByCategory).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedByCategory).map(([category, categoryRulebooks]) => (
              <div key={category} className="bg-slate-800 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">{category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryRulebooks.map((rulebook) => (
                    <button
                      key={rulebook.id}
                      onClick={() => onNavigate('rulebook-detail', { rulebookId: rulebook.id })}
                      className="bg-slate-700 hover:bg-slate-600 rounded-lg p-6 text-left transition-all transform hover:-translate-y-1"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-6 w-6 text-orange-500" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {rulebook.title}
                          </h3>
                          <p className="text-sm text-gray-400">Season {rulebook.season}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <Archive className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">No Archived Rulebooks Found</h3>
            <p className="text-gray-400">
              {searchTerm || selectedCategory !== 'all' || selectedSeason !== 'all'
                ? 'Try adjusting your filters'
                : 'No rulebooks have been archived yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
