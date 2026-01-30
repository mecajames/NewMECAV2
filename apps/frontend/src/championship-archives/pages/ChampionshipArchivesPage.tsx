import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar } from 'lucide-react';
import { championshipArchivesApi, ChampionshipArchive } from '@/championship-archives';
import { useAuth } from '@/auth';
import { SEOHead, useStaticPageSEO } from '@/shared/seo';

export default function ChampionshipArchivesPage() {
  const { user } = useAuth();
  const [archives, setArchives] = useState<ChampionshipArchive[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'admin';
  const seoProps = useStaticPageSEO('championshipArchives');

  useEffect(() => {
    fetchArchives();
  }, [isAdmin]);

  const fetchArchives = async () => {
    try {
      const data = await championshipArchivesApi.getAll(isAdmin);
      setArchives(data);
    } catch (error) {
      console.error('Error fetching archives:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead {...seoProps} />
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
        {/* Hero Image */}
        <div className="relative w-full h-[350px] md:h-[500px] lg:h-[600px] overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#1a0a05' }}>
          <img
            src="/championship-archive-hero.png"
            alt="Championship Archives"
            className="w-full h-auto max-h-full object-contain"
          />
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute bottom-0 left-0 right-0 pb-4 md:pb-6">
            <div className="relative z-10 text-center px-4">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Championship Archives</h1>
            <p className="text-lg md:text-xl text-white/90">Celebrating Excellence Since 1997</p>
          </div>
        </div>
      </div>

      {/* Archives Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading archives...</p>
          </div>
        ) : archives.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-300 text-xl mb-2">No Archives Yet</p>
            <p className="text-gray-400">
              Championship archives will appear here once seasons are completed.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-2">Browse by Year</h2>
              <p className="text-gray-400">
                Select a year to view championship results and highlights
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {archives.map((archive) => (
                <Link
                  key={archive.id}
                  to={`/championship-archives/${archive.year}`}
                  className="group relative bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                >
                  {/* Card Content */}
                  <div className="p-6">
                    {/* Year Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-gradient-to-r from-orange-600 to-orange-800 text-white px-4 py-2 rounded-lg font-bold text-2xl">
                        {archive.year}
                      </div>
                      <Trophy className="w-8 h-8 text-orange-500 group-hover:text-orange-400 transition-colors" />
                    </div>

                    {/* Title */}
                    <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-orange-500 transition-colors">
                      {archive.title}
                    </h3>

                    {/* Status Badges */}
                    <div className="flex items-center gap-2 mb-4">
                      {!archive.published && isAdmin && (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-md border border-yellow-500/30">
                          Draft
                        </span>
                      )}
                      {archive.published && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-md border border-green-500/30">
                          Published
                        </span>
                      )}
                    </div>

                    {/* View Button */}
                    <div className="flex items-center text-orange-500 group-hover:text-orange-400 font-medium">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>View Champions</span>
                      <svg
                        className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Hover Effect Border */}
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-orange-500 rounded-xl transition-all pointer-events-none" />
                </Link>
              ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
