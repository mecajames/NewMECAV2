import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, MapPin, User, Globe, Shield } from 'lucide-react';
import { teamsApi, Team } from '../teams.api-client';
import { SEOHead, useTeamDirectorySEO } from '@/shared/seo';

const TEAM_TYPE_LABELS: Record<string, string> = {
  competitive: 'Competitive',
  casual: 'Casual',
  shop: 'Shop',
  club: 'Club',
};

const TEAM_TYPE_COLORS: Record<string, string> = {
  competitive: 'bg-red-500/10 text-red-400',
  casual: 'bg-blue-500/10 text-blue-400',
  shop: 'bg-green-500/10 text-green-400',
  club: 'bg-purple-500/10 text-purple-400',
};

export default function TeamDirectoryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [teamTypeFilter, setTeamTypeFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const seoProps = useTeamDirectorySEO();

  useEffect(() => {
    fetchPublicTeams();
  }, []);

  const fetchPublicTeams = async () => {
    try {
      setLoading(true);
      const data = await teamsApi.getPublicTeams();
      setTeams(data);
    } catch (err: any) {
      console.error('Error fetching teams:', err);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch =
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.owner?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.owner?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = teamTypeFilter === 'all' || team.teamType === teamTypeFilter;

    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <>
        <SEOHead {...seoProps} />
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead {...seoProps} />
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-10 w-10 text-orange-500" />
              <h1 className="text-4xl font-bold text-white">Team Directory</h1>
            </div>
            <p className="text-gray-400">Browse MECA competition teams</p>
          </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by team name, location, or owner..."
              className="w-full pl-12 pr-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>

          <select
            value={teamTypeFilter}
            onChange={(e) => setTeamTypeFilter(e.target.value)}
            className="px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
          >
            <option value="all">All Types</option>
            <option value="competitive">Competitive</option>
            <option value="casual">Casual</option>
            <option value="shop">Shop</option>
            <option value="club">Club</option>
          </select>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <p className="text-gray-400">
            Showing {filteredTeams.length} of {teams.length} teams
          </p>
        </div>

        {/* Teams Grid */}
        {filteredTeams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team) => (
              <div
                key={team.id}
                className="bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
                onClick={() => navigate(`/teams/${team.id}`)}
              >
                {/* Team Header with Logo */}
                <div className="relative h-48 bg-gradient-to-br from-slate-700 to-slate-800">
                  {team.logoUrl ? (
                    <img
                      src={team.logoUrl}
                      alt={`${team.name} logo`}
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: team.coverImagePosition
                          ? `${team.coverImagePosition.x}% ${team.coverImagePosition.y}%`
                          : '50% 50%'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Shield className="h-24 w-24 text-slate-600" />
                    </div>
                  )}

                  {/* Team Type Badge */}
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium ${TEAM_TYPE_COLORS[team.teamType] || 'bg-slate-500/10 text-slate-400'}`}>
                    {TEAM_TYPE_LABELS[team.teamType] || team.teamType}
                  </div>

                  {/* Member Count Badge */}
                  <div className="absolute top-3 left-3 bg-slate-900/80 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {team.members?.length || 0} members
                  </div>
                </div>

                {/* Team Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-1">
                    Team {team.name}
                  </h3>

                  {team.location && (
                    <p className="text-gray-400 text-sm mb-3 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {team.location}
                    </p>
                  )}

                  {team.description && (
                    <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                      {team.description}
                    </p>
                  )}

                  {/* Owner Info */}
                  {team.owner && (
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-700">
                      {team.owner.profile_picture_url ? (
                        <img
                          src={team.owner.profile_picture_url}
                          alt={`${team.owner.first_name}'s avatar`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                          <User className="h-5 w-5 text-slate-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-400">Team Owner</p>
                        <p className="text-white font-medium">
                          {team.owner.first_name} {team.owner.last_name}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Website Link */}
                  {team.website && (
                    <a
                      href={team.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-4 flex items-center gap-2 text-orange-500 hover:text-orange-400 text-sm transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                      Visit Website
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Shield className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Teams Found</h3>
            <p className="text-gray-400">
              {searchTerm || teamTypeFilter !== 'all'
                ? 'No teams match your search criteria'
                : 'No teams have been registered yet'}
            </p>
          </div>
        )}
        </div>
      </div>
    </>
  );
}
