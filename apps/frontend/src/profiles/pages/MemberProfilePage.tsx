import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Car, Music, ArrowLeft, Award, MapPin, Calendar, X, Move, Check, Trophy } from 'lucide-react';
import { profilesApi, Profile } from '@/profiles';
import { useAuth } from '@/auth';
import { AchievementsGallery } from '@/achievements';

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Position editing state
  const [isEditingPosition, setIsEditingPosition] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [savingPosition, setSavingPosition] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Check if logged-in user is viewing their own profile
  const isOwnProfile = user?.id === id;

  useEffect(() => {
    if (id) {
      fetchProfile();
    }
  }, [id]);

  useEffect(() => {
    // Initialize position from profile data
    if (profile?.cover_image_position) {
      setPosition(profile.cover_image_position);
    }
  }, [profile]);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditingPosition) return;
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setPosition({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isEditingPosition) return;
    setIsDragging(true);
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !imageContainerRef.current) return;

    const touch = e.touches[0];
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));

    setPosition({ x, y });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const savePosition = async () => {
    if (!profile) return;

    try {
      setSavingPosition(true);
      await profilesApi.updateCoverImagePosition(profile.id, position);
      setProfile({ ...profile, cover_image_position: position });
      setIsEditingPosition(false);
    } catch (err) {
      console.error('Error saving position:', err);
    } finally {
      setSavingPosition(false);
    }
  };

  const cancelEditing = () => {
    // Reset to saved position
    if (profile?.cover_image_position) {
      setPosition(profile.cover_image_position);
    } else {
      setPosition({ x: 50, y: 50 });
    }
    setIsEditingPosition(false);
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

  const coverImage = profile.profile_picture_url || profile.profile_images?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-400">Member Profile</h2>
          <button
            onClick={() => navigate('/members')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Member Directory
          </button>
        </div>

        {/* Profile Header */}
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg mb-6">
          <div
            ref={imageContainerRef}
            className={`relative h-64 bg-gradient-to-br from-slate-700 to-slate-800 ${isEditingPosition ? 'cursor-move' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {coverImage ? (
              <img
                src={coverImage}
                alt={`${profile.first_name}'s profile`}
                className={`w-full h-full object-cover ${!isEditingPosition ? 'cursor-pointer' : ''} select-none`}
                style={{ objectPosition: `${position.x}% ${position.y}%` }}
                onClick={() => !isEditingPosition && setLightboxImage(coverImage)}
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="h-32 w-32 text-slate-600" />
              </div>
            )}

            {/* Position editing overlay */}
            {isEditingPosition && coverImage && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                <div className="bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
                  Drag to reposition image
                </div>
              </div>
            )}

            {/* Edit position button - only show for own profile with an image */}
            {isOwnProfile && coverImage && !isEditingPosition && (
              <button
                onClick={() => setIsEditingPosition(true)}
                className="absolute bottom-3 right-3 bg-black/70 hover:bg-black/90 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                <Move className="h-4 w-4" />
                Adjust Position
              </button>
            )}

            {/* Save/Cancel buttons when editing */}
            {isEditingPosition && (
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  onClick={cancelEditing}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={savePosition}
                  disabled={savingPosition}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {savingPosition ? 'Saving...' : 'Save'}
                </button>
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

        {/* Achievements */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-white">Achievements</h2>
          </div>
          <AchievementsGallery
            profileId={profile.id}
            showEmpty={false}
          />
        </div>
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
