import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Car, Music, User, Trophy, Award } from 'lucide-react';
import { profilesApi, Profile } from '../api-client/profiles.api-client';

export default function MemberDirectoryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicProfiles();
  }, []);

  const fetchPublicProfiles = async () => {
    try {
      setLoading(true);
      const data = await profilesApi.getPublicProfiles();
      setProfiles(data);
    } catch (err: any) {
      console.error('Error fetching public profiles:', err);
      setError('Failed to load member profiles');
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(profile => {
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.toLowerCase();
    const mecaId = profile.meca_id?.toLowerCase() || '';
    const vehicle = profile.vehicle_info?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();

    return fullName.includes(search) || mecaId.includes(search) || vehicle.includes(search);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-10 w-10 text-orange-500" />
            <h1 className="text-4xl font-bold text-white">Member Directory</h1>
          </div>
          <p className="text-gray-400">Browse MECA members who have made their profiles public</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, MECA ID, or vehicle..."
              className="w-full pl-12 pr-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <p className="text-gray-400">
            Showing {filteredProfiles.length} of {profiles.length} public profiles
          </p>
        </div>

        {/* Profile Grid */}
        {filteredProfiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
              >
                {/* Profile Header with Image */}
                <div className="relative h-48 bg-gradient-to-br from-slate-700 to-slate-800">
                  {profile.profile_picture_url ? (
                    <img
                      src={profile.profile_picture_url}
                      alt={`${profile.first_name}'s profile`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="h-24 w-24 text-slate-600" />
                    </div>
                  )}

                  {/* MECA ID Badge */}
                  {profile.meca_id && (
                    <div className="absolute top-3 right-3 bg-orange-500/90 text-white text-xs px-3 py-1 rounded-full font-mono font-semibold">
                      #{profile.meca_id}
                    </div>
                  )}

                  {/* Membership Badge */}
                  {profile.membership_status === 'active' && (
                    <div className="absolute top-3 left-3 bg-green-500/90 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                      <Award className="h-3 w-3" />
                      Active Member
                    </div>
                  )}
                </div>

                {/* Profile Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {profile.first_name} {profile.last_name}
                  </h3>

                  {profile.city && profile.state && (
                    <p className="text-gray-400 text-sm mb-4">
                      {profile.city}, {profile.state}
                    </p>
                  )}

                  {/* Vehicle Info */}
                  {profile.vehicle_info && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-1">
                        <Car className="h-4 w-4" />
                        Vehicle
                      </div>
                      <p className="text-gray-300 text-sm line-clamp-2">
                        {profile.vehicle_info}
                      </p>
                    </div>
                  )}

                  {/* Audio System */}
                  {profile.car_audio_system && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-1">
                        <Music className="h-4 w-4" />
                        Audio System
                      </div>
                      <p className="text-gray-300 text-sm line-clamp-2">
                        {profile.car_audio_system}
                      </p>
                    </div>
                  )}

                  {/* Image Gallery Preview */}
                  {profile.profile_images && profile.profile_images.length > 1 && (
                    <div className="mt-4 flex gap-2">
                      {profile.profile_images.slice(0, 4).map((img, index) => (
                        <div key={index} className="w-12 h-12 rounded-lg overflow-hidden">
                          <img
                            src={img}
                            alt={`Gallery ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {profile.profile_images.length > 4 && (
                        <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center text-gray-400 text-sm">
                          +{profile.profile_images.length - 4}
                        </div>
                      )}
                    </div>
                  )}

                  {/* View Profile Button */}
                  <button
                    onClick={() => navigate(`/members/${profile.id}`)}
                    className="w-full mt-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    View Full Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Members Found</h3>
            <p className="text-gray-400">
              {searchTerm
                ? 'No members match your search criteria'
                : 'No members have made their profiles public yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
