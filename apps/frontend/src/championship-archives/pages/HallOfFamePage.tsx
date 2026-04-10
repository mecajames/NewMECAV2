import { useState, useEffect, useMemo } from 'react';
import { Trophy, Users, Store, Gavel, Star, Award } from 'lucide-react';
import { SEOHead, useStaticPageSEO } from '@/shared/seo';
import { hallOfFameApi, type HallOfFameInductee } from '@/hall-of-fame/hall-of-fame.api-client';
import { getStorageUrl } from '@/lib/storage';

const KNOWN_ICONS: Record<string, typeof Trophy> = {
  competitors: Trophy,
  teams: Users,
  retailers: Store,
  judges: Gavel,
};

function formatLabel(key: string) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export default function HallOfFamePage() {
  const seoProps = useStaticPageSEO('hallOfFame');
  const [inductees, setInductees] = useState<HallOfFameInductee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('competitors');

  useEffect(() => {
    hallOfFameApi.getAll().then((data) => {
      setInductees(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Derive categories dynamically from data
  const categories = useMemo(() => {
    const known = ['competitors', 'teams', 'retailers', 'judges'];
    const fromData = new Set(inductees.map((i) => i.category));
    // Start with known categories that exist in data, then add any custom ones
    const ordered: string[] = [];
    for (const k of known) {
      if (fromData.has(k)) ordered.push(k);
    }
    for (const cat of fromData) {
      if (!known.includes(cat)) ordered.push(cat);
    }
    return ordered;
  }, [inductees]);

  // If active category no longer exists in data, reset to first
  useEffect(() => {
    if (!loading && categories.length > 0 && !categories.includes(activeCategory)) {
      setActiveCategory(categories[0]);
    }
  }, [categories, loading, activeCategory]);

  const filtered = useMemo(
    () => inductees.filter((i) => i.category === activeCategory),
    [inductees, activeCategory],
  );

  const groupedByYear = useMemo(() => {
    const groups: Record<number, HallOfFameInductee[]> = {};
    for (const ind of filtered) {
      if (!groups[ind.induction_year]) groups[ind.induction_year] = [];
      groups[ind.induction_year].push(ind);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, items]) => ({ year: Number(year), items }));
  }, [filtered]);

  const ActiveIcon = KNOWN_ICONS[activeCategory] || Award;

  return (
    <>
      <SEOHead {...seoProps} />
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Star className="w-8 h-8 text-yellow-400" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                MECA Hall of Fame
              </h1>
              <Star className="w-8 h-8 text-yellow-400" />
            </div>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Celebrating the legends and pioneers of car audio competition
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {categories.map((catKey) => {
              const Icon = KNOWN_ICONS[catKey] || Award;
              const isActive = activeCategory === catKey;
              return (
                <button
                  key={catKey}
                  onClick={() => setActiveCategory(catKey)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all text-sm sm:text-base ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                      : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {formatLabel(catKey)}
                  {!loading && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-orange-600 text-orange-100' : 'bg-slate-600 text-gray-400'
                    }`}>
                      {inductees.filter((i) => i.category === catKey).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-gray-400 text-base sm:text-lg text-center max-w-4xl mx-auto mb-6">
            The MECA Hall of Fame was created at the 2005 Finals Soundfest. The Hall of Fame was established to recognize members of MECA (Competitors, Judges, Retailers and Teams) that have significantly impacted MECA and are worthy of recognition for their achievements and dedication.
          </p>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-r-transparent" />
            </div>
          ) : groupedByYear.length === 0 ? (
            <div className="bg-slate-800/50 rounded-xl p-12 text-center">
              <ActiveIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No {formatLabel(activeCategory).toLowerCase()} inducted yet</p>
            </div>
          ) : (
            <div className="space-y-10">
              {groupedByYear.map(({ year, items }) => (
                <div key={year}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-700" />
                    <h2 className="text-xl font-bold text-orange-400 flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-400" />
                      {year} Inductees
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-700" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items.map((inductee) => (
                      <div
                        key={inductee.id}
                        className="bg-slate-800/70 border border-slate-700/50 rounded-lg p-4 hover:border-orange-500/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {inductee.image_url && (
                            <img
                              src={getStorageUrl(inductee.image_url)}
                              alt={inductee.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-slate-600 flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <h3 className="font-semibold text-white text-sm">
                              {inductee.name}
                            </h3>
                            <div className="mt-1.5 space-y-0.5">
                              {inductee.state && (
                                <p className="text-gray-400 text-xs">{inductee.state}</p>
                              )}
                              {inductee.location && (
                                <p className="text-gray-400 text-xs">{inductee.location}</p>
                              )}
                              {inductee.team_affiliation && (
                                <p className="text-orange-400/70 text-xs">{inductee.team_affiliation}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {inductee.bio && (
                          <p className="text-gray-500 text-xs mt-2 line-clamp-2">{inductee.bio}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
