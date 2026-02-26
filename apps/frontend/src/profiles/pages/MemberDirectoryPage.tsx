import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Car, Music, User, Award } from 'lucide-react';
import { profilesApi, Profile } from '@/profiles';
import { SEOHead, useMemberDirectorySEO } from '@/shared/seo';
import { Pagination } from '@/shared/components';
import { BannerDisplay, useBanners } from '@/banners';
import { BannerPosition } from '@newmeca/shared';

export default function MemberDirectoryPage() {
  const navigate = useNavigate();
  const [initialLoading, setInitialLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const seoProps = useMemberDirectorySEO();
  const { banners: membersBanners } = useBanners(BannerPosition.MEMBERS_TOP);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [membersPerPage, setMembersPerPage] = useState(50);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search input
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm]);

  // Fetch profiles when page, limit, or debounced search changes
  const fetchPublicProfiles = useCallback(async () => {
    try {
      setSearching(true);
      setError(null);
      const data = await profilesApi.getPublicProfiles({
        search: debouncedSearch || undefined,
        page: currentPage,
        limit: membersPerPage,
      });
      setProfiles(data.profiles);
      setTotalProfiles(data.total);
    } catch (err: any) {
      console.error('Error fetching public profiles:', err);
      setError('Failed to load member profiles');
    } finally {
      setSearching(false);
      setInitialLoading(false);
    }
  }, [debouncedSearch, currentPage, membersPerPage]);

  useEffect(() => {
    fetchPublicProfiles();
  }, [fetchPublicProfiles]);

  const totalPages = Math.ceil(totalProfiles / membersPerPage);

  if (initialLoading) {
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
            <Users className="h-10 w-10 text-orange-500" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Member Directory</h1>
          </div>
          <p className="text-gray-400">Browse MECA members who have made their profiles public</p>
        </div>

        {/* MEMBERS_TOP banner */}
        {membersBanners.length > 0 && <BannerDisplay banner={membersBanners[0]} />}

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
            Showing {totalProfiles} active member{totalProfiles !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Profile Grid */}
        {searching && (
          <div className="mb-4 flex items-center gap-2 text-gray-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-r-transparent"></div>
            <span className="text-sm">Searching...</span>
          </div>
        )}
        {profiles.length > 0 ? (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
              >
                {/* Profile Header with Image */}
                <div className="relative h-48 bg-gradient-to-br from-slate-700 to-slate-800">
                  {(profile.profile_picture_url || profile.profile_images?.[0]) ? (
                    <img
                      src={profile.profile_picture_url || profile.profile_images?.[0]}
                      alt={`${profile.first_name}'s profile`}
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: profile.cover_image_position
                          ? `${profile.cover_image_position.x}% ${profile.cover_image_position.y}%`
                          : '50% 50%'
                      }}
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

          {/* Pagination */}
          <div className="mt-6 rounded-xl overflow-hidden">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={membersPerPage}
              totalItems={totalProfiles}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setMembersPerPage}
            />
          </div>
          </>
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
    </>
  );
}
