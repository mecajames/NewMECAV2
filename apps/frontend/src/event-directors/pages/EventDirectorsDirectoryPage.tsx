import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Award, Star, Filter, Users, Megaphone, Globe } from 'lucide-react';
import { getEventDirectorsDirectory, PublicEventDirector } from '../event-directors.api-client';

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

const REGIONS = [
  'Northeast',
  'Southeast',
  'Midwest',
  'Southwest',
  'West Coast',
  'Pacific Northwest',
  'Mountain West',
  'Gulf Coast',
];

export default function EventDirectorsDirectoryPage() {
  const [eventDirectors, setEventDirectors] = useState<PublicEventDirector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadEventDirectors();
  }, [stateFilter, regionFilter]);

  async function loadEventDirectors() {
    setLoading(true);
    setError(null);
    try {
      const filters: { state?: string; region?: string } = {};
      if (stateFilter) filters.state = stateFilter;
      if (regionFilter) filters.region = regionFilter;
      const data = await getEventDirectorsDirectory(filters);
      setEventDirectors(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load event directors');
    } finally {
      setLoading(false);
    }
  }

  // Filter by search query (name, city)
  const filteredEDs = eventDirectors.filter((ed) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ed.name.toLowerCase().includes(query) ||
      ed.city.toLowerCase().includes(query) ||
      ed.state.toLowerCase().includes(query)
    );
  });

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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-500/20 mb-6">
            <Megaphone className="h-10 w-10 text-purple-500" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">MECA Event Directors</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Find certified MECA event directors in your area. Our directors are experienced
            professionals who organize and run car audio competitions.
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
                className="w-full pl-10 pr-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
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
                className="px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none min-w-[180px]"
              >
                <option value="">All States</option>
                {US_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>

              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none min-w-[180px]"
              >
                <option value="">All Regions</option>
                {REGIONS.map((region) => (
                  <option key={region} value={region}>{region}</option>
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
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">All States</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Region</label>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">All Regions</option>
                  {REGIONS.map((region) => (
                    <option key={region} value={region}>{region}</option>
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
            <span>{filteredEDs.length} event director{filteredEDs.length !== 1 ? 's' : ''} found</span>
          </div>
          {(stateFilter || regionFilter) && (
            <button
              onClick={() => {
                setStateFilter('');
                setRegionFilter('');
              }}
              className="text-purple-500 hover:text-purple-400 text-sm"
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
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent mb-4"></div>
            <p className="text-gray-400">Loading event directors...</p>
          </div>
        ) : filteredEDs.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <Megaphone className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Event Directors Found</h3>
            <p className="text-gray-400">
              {searchQuery || stateFilter || regionFilter
                ? 'Try adjusting your search or filters'
                : 'There are no event directors in the directory yet'}
            </p>
          </div>
        ) : (
          /* Event Directors Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEDs.map((ed) => (
              <Link
                key={ed.id}
                to={`/event-directors/${ed.id}`}
                className="bg-slate-800 rounded-xl p-6 hover:bg-slate-700/80 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  {ed.avatar_url ? (
                    <img
                      src={ed.avatar_url}
                      alt={ed.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-slate-600 group-hover:border-purple-500 transition-colors"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center border-2 border-slate-600 group-hover:border-purple-500 transition-colors">
                      <Megaphone className="h-8 w-8 text-slate-500" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate group-hover:text-purple-400 transition-colors">
                      {ed.name}
                    </h3>
                    <div className="flex items-center gap-1 text-gray-400 text-sm mt-1">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{ed.city}, {ed.state}</span>
                    </div>
                  </div>
                </div>

                {/* Regions Managed */}
                {ed.regions_managed && ed.regions_managed.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-1 text-gray-400 text-sm mb-2">
                      <Globe className="h-4 w-4" />
                      <span>Regions:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ed.regions_managed.slice(0, 3).map((region, i) => (
                        <span key={i} className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                          {region}
                        </span>
                      ))}
                      {ed.regions_managed.length > 3 && (
                        <span className="px-2 py-0.5 bg-slate-700 text-slate-400 rounded text-xs">
                          +{ed.regions_managed.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1">
                      <Award className="h-4 w-4 text-purple-500" />
                      <span className="text-lg font-semibold text-white">{ed.total_events_directed}</span>
                    </div>
                    <p className="text-xs text-gray-400">Events Directed</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      {renderStars(Math.round(ed.average_rating))}
                    </div>
                    <p className="text-xs text-gray-400">
                      {ed.average_rating > 0 ? `${ed.average_rating.toFixed(1)} avg` : 'No ratings'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-purple-600/20 to-purple-500/10 rounded-2xl p-8 text-center border border-purple-500/20">
          <h2 className="text-2xl font-bold text-white mb-4">Interested in Becoming an Event Director?</h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-6">
            Join our team of event directors and help bring car audio competitions to your community.
            We provide training and support to help you succeed.
          </p>
          <Link
            to="/apply/event-director"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
          >
            Apply to Become an Event Director
          </Link>
        </div>
      </div>
    </div>
  );
}
