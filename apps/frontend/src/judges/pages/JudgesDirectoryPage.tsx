import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Award, Star, Filter, Users, Scale } from 'lucide-react';
import { getJudgesDirectory, PublicJudge } from '../judges.api-client';
import { SEOHead, useJudgeDirectorySEO } from '@/shared/seo';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
];

const SPECIALTIES = [
  { value: 'sql', label: 'Sound Quality (SQL)' },
  { value: 'spl', label: 'Sound Pressure Level (SPL)' },
  { value: 'both', label: 'SQL & SPL' },
];

const LEVEL_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  in_training: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  certified: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  head_judge: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  master_judge: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
};

export default function JudgesDirectoryPage() {
  const [judges, setJudges] = useState<PublicJudge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const seoProps = useJudgeDirectorySEO();

  useEffect(() => {
    loadJudges();
  }, [stateFilter, specialtyFilter]);

  async function loadJudges() {
    setLoading(true);
    setError(null);
    try {
      const filters: { state?: string; specialty?: string } = {};
      if (stateFilter) filters.state = stateFilter;
      if (specialtyFilter) filters.specialty = specialtyFilter;
      const data = await getJudgesDirectory(filters);
      setJudges(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load judges');
    } finally {
      setLoading(false);
    }
  }

  // Filter by search query (name, city)
  const filteredJudges = judges.filter((judge) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      judge.name.toLowerCase().includes(query) ||
      judge.city.toLowerCase().includes(query) ||
      judge.state.toLowerCase().includes(query)
    );
  });

  const getLevelLabel = (level: string) => {
    return level.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getSpecialtyLabel = (specialty: string) => {
    const found = SPECIALTIES.find((s) => s.value === specialty);
    return found ? found.label : specialty.toUpperCase();
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
        />
      );
    }
    return stars;
  };

  return (
    <>
      <SEOHead {...seoProps} />
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-500/20 mb-6">
              <Scale className="h-10 w-10 text-orange-500" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">MECA Certified Judges</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Find certified MECA judges in your area. Our judges are trained professionals
            dedicated to fair and accurate competition scoring.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-slate-800 rounded-xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, city, or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* Filter Toggle (Mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600"
            >
              <Filter className="h-5 w-5" />
              Filters
            </button>

            {/* Desktop Filters */}
            <div className="hidden lg:flex gap-4">
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none min-w-[180px]"
              >
                <option value="">All States</option>
                {US_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>

              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none min-w-[200px]"
              >
                <option value="">All Specialties</option>
                {SPECIALTIES.map((spec) => (
                  <option key={spec.value} value={spec.value}>{spec.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile Filters */}
          {showFilters && (
            <div className="lg:hidden mt-4 pt-4 border-t border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">State</label>
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                >
                  <option value="">All States</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Specialty</label>
                <select
                  value={specialtyFilter}
                  onChange={(e) => setSpecialtyFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                >
                  <option value="">All Specialties</option>
                  {SPECIALTIES.map((spec) => (
                    <option key={spec.value} value={spec.value}>{spec.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-gray-400">
            <Users className="h-5 w-5" />
            <span>{filteredJudges.length} judge{filteredJudges.length !== 1 ? 's' : ''} found</span>
          </div>
          {(stateFilter || specialtyFilter) && (
            <button
              onClick={() => {
                setStateFilter('');
                setSpecialtyFilter('');
              }}
              className="text-orange-500 hover:text-orange-400 text-sm"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent mb-4"></div>
            <p className="text-gray-400">Loading judges...</p>
          </div>
        ) : filteredJudges.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <Scale className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Judges Found</h3>
            <p className="text-gray-400">
              {searchQuery || stateFilter || specialtyFilter
                ? 'Try adjusting your search or filters'
                : 'There are no judges in the directory yet'}
            </p>
          </div>
        ) : (
          /* Judges Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJudges.map((judge) => {
              const levelStyle = LEVEL_STYLES[judge.level] || LEVEL_STYLES.certified;

              return (
                <Link
                  key={judge.id}
                  to={`/judges/${judge.id}`}
                  className="bg-slate-800 rounded-xl p-6 hover:bg-slate-700/80 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    {judge.avatar_url ? (
                      <img
                        src={judge.avatar_url}
                        alt={judge.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-slate-600 group-hover:border-orange-500 transition-colors"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center border-2 border-slate-600 group-hover:border-orange-500 transition-colors">
                        <Scale className="h-8 w-8 text-slate-500" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate group-hover:text-orange-400 transition-colors">
                        {judge.name}
                      </h3>
                      <div className="flex items-center gap-1 text-gray-400 text-sm mt-1">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{judge.city}, {judge.state}</span>
                      </div>
                    </div>
                  </div>

                  {/* Level Badge */}
                  <div className="mt-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${levelStyle.bg} ${levelStyle.text} ${levelStyle.border}`}>
                      {getLevelLabel(judge.level)}
                    </span>
                  </div>

                  {/* Specialty */}
                  <div className="mt-3">
                    <span className="text-sm text-gray-400">Specialty: </span>
                    <span className="text-sm text-white">{getSpecialtyLabel(judge.specialty)}</span>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1">
                        <Award className="h-4 w-4 text-orange-500" />
                        <span className="text-lg font-semibold text-white">{judge.total_events_judged}</span>
                      </div>
                      <p className="text-xs text-gray-400">Events Judged</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        {renderStars(Math.round(judge.average_rating))}
                      </div>
                      <p className="text-xs text-gray-400">
                        {judge.average_rating > 0 ? `${judge.average_rating.toFixed(1)} avg` : 'No ratings'}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-orange-600/20 to-orange-500/10 rounded-2xl p-8 text-center border border-orange-500/20">
          <h2 className="text-2xl font-bold text-white mb-4">Interested in Becoming a MECA Judge?</h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-6">
            Join our team of certified judges and help maintain fair competition standards
            in the car audio community. We provide training and certification.
          </p>
          <Link
            to="/apply/judge"
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Apply to Become a Judge
          </Link>
          </div>
        </div>
      </div>
    </>
  );
}
