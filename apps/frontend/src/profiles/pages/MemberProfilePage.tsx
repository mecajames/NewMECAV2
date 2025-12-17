import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Car, Music, ArrowLeft, Award, MapPin, Calendar, X } from 'lucide-react';
import { profilesApi, Profile } from '@/profiles';

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchProfile();
    }
  }, [id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await profilesApi.getPublicProfileById(id!);
      setProfile(data);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError('Profile not found or is not public');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <User className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Profile Not Found</h2>
          <p className="text-gray-400 mb-6">{error || 'This profile is not available'}</p>
          <button
            onClick={() => navigate('/members')}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/members')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Member Directory
        </button>

        {/* Profile Header */}
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg mb-6">
          <div className="relative h-64 bg-gradient-to-br from-slate-700 to-slate-800">
            {profile.profile_picture_url ? (
              <img
                src={profile.profile_picture_url}
                alt={`${profile.first_name}'s profile`}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightboxImage(profile.profile_picture_url!)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="h-32 w-32 text-slate-600" />
              </div>
            )}
          </div>

          <div className="p-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {profile.first_name} {profile.last_name}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-gray-400">
                  {profile.meca_id && (
                    <span className="flex items-center gap-1 text-orange-500 font-mono font-semibold">
                      MECA ID: #{profile.meca_id}
                    </span>
                  )}

                  {(profile.city || profile.state) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {profile.city}{profile.city && profile.state && ', '}{profile.state}
                    </span>
                  )}

                  {profile.created_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Member since {new Date(profile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </span>
                  )}
                </div>
              </div>

              {profile.membership_status === 'active' && (
                <div className="bg-green-500/10 text-green-400 px-4 py-2 rounded-full flex items-center gap-2 font-medium">
                  <Award className="h-5 w-5" />
                  Active Member
                </div>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="mt-6">
                <p className="text-gray-300">{profile.bio}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vehicle Information */}
          {profile.vehicle_info && (
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Car className="h-5 w-5 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-white">Vehicle</h2>
              </div>
              <p className="text-gray-300 whitespace-pre-wrap">{profile.vehicle_info}</p>
            </div>
          )}

          {/* Audio System */}
          {profile.car_audio_system && (
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Music className="h-5 w-5 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-white">Audio System</h2>
              </div>
              <p className="text-gray-300 whitespace-pre-wrap">{profile.car_audio_system}</p>
            </div>
          )}
        </div>

        {/* Image Gallery */}
        {profile.profile_images && profile.profile_images.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg mt-6">
            <h2 className="text-xl font-bold text-white mb-4">Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {profile.profile_images.map((imageUrl, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setLightboxImage(imageUrl)}
                >
                  <img
                    src={imageUrl}
                    alt={`Gallery image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setLightboxImage(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
