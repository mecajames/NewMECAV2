import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Car, Music, Eye, EyeOff, Upload, X, Check, Loader2, Image as ImageIcon, Save } from 'lucide-react';
import { useAuth } from '@/auth';
import { profilesApi } from '@/profiles';
import { supabase } from '@/lib/supabase';

export default function PublicProfilePage() {
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [isPublic, setIsPublic] = useState(false);
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [carAudioSystem, setCarAudioSystem] = useState('');
  const [profileImages, setProfileImages] = useState<string[]>([]);
  const [selectedProfilePicture, setSelectedProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setIsPublic(profile.is_public || false);
      setVehicleInfo(profile.vehicle_info || '');
      setCarAudioSystem(profile.car_audio_system || '');
      setProfileImages(profile.profile_images || []);
      setSelectedProfilePicture(profile.profile_picture_url || null);
    }
  }, [profile]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (profileImages.length >= 6) {
      setError('Maximum 6 images allowed');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      setProfileImages(prev => [...prev, publicUrl]);
      setSuccess('Image uploaded successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async (imageUrl: string) => {
    // Remove from local state
    setProfileImages(prev => prev.filter(url => url !== imageUrl));

    // If this was the selected profile picture, clear it
    if (selectedProfilePicture === imageUrl) {
      setSelectedProfilePicture(null);
    }
  };

  const handleSelectProfilePicture = (imageUrl: string) => {
    setSelectedProfilePicture(imageUrl);
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await profilesApi.update(profile.id, {
        is_public: isPublic,
        vehicle_info: vehicleInfo,
        car_audio_system: carAudioSystem,
        profile_images: profileImages,
        profile_picture_url: selectedProfilePicture || undefined,
      });

      // Refresh the profile in context
      if (refreshProfile) {
        await refreshProfile();
      }

      setSuccess('Public profile saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (!profile || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-xl mb-4">Please sign in to manage your public profile</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Public Profile</h1>
          <p className="text-gray-400">Manage how other MECA members see your profile</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <p className="text-green-400">{success}</p>
          </div>
        )}

        <div className="grid gap-6">
          {/* Visibility Toggle */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  {isPublic ? (
                    <Eye className="h-6 w-6 text-orange-500" />
                  ) : (
                    <EyeOff className="h-6 w-6 text-gray-500" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Profile Visibility</h2>
                  <p className="text-gray-400 text-sm">
                    {isPublic
                      ? 'Your profile is visible in the Member Directory'
                      : 'Your profile is hidden from the Member Directory'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  isPublic ? 'bg-orange-600' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                    isPublic ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Profile Images */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Profile Images</h2>
                <p className="text-gray-400 text-sm">Upload up to 5 images and select one as your profile picture</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
              {profileImages.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Profile image ${index + 1}`}
                    className={`w-full aspect-square object-cover rounded-lg border-2 transition-colors ${
                      selectedProfilePicture === imageUrl
                        ? 'border-orange-500'
                        : 'border-transparent hover:border-slate-600'
                    }`}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleSelectProfilePicture(imageUrl)}
                      className={`p-2 rounded-full ${
                        selectedProfilePicture === imageUrl
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                      title="Set as profile picture"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveImage(imageUrl)}
                      className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700"
                      title="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {selectedProfilePicture === imageUrl && (
                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                      Profile
                    </div>
                  )}
                </div>
              ))}

              {profileImages.length < 5 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="w-full aspect-square border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50"
                >
                  {uploadingImage ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8" />
                      <span className="text-sm">Upload</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <p className="text-gray-500 text-xs">
              {profileImages.length}/5 images uploaded. Click on an image to set it as your profile picture.
            </p>
          </div>

          {/* Vehicle Information */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Car className="h-5 w-5 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Vehicle Information</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Describe your vehicle (make, model, year, modifications, etc.)
              </label>
              <textarea
                value={vehicleInfo}
                onChange={(e) => setVehicleInfo(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
                placeholder="e.g., 2022 Honda Civic Si, custom wrap, aftermarket wheels..."
              />
            </div>
          </div>

          {/* Car Audio System */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Music className="h-5 w-5 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Car Audio System</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Describe your audio system (head unit, speakers, amps, subs, etc.)
              </label>
              <textarea
                value={carAudioSystem}
                onChange={(e) => setCarAudioSystem(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
                placeholder="e.g., Pioneer DMH-WT8600NEX head unit, JL Audio C3-650 components, Rockford Fosgate T1500-1bdCP amp..."
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Public Profile
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
