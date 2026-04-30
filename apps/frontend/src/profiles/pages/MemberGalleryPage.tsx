import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Upload, X, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/auth/contexts/AuthContext';
import { profilesApi } from '@/profiles';
import { uploadFile } from '@/api-client/uploads.api-client';
import ProfileViewSelector from '@/profiles/components/ProfileViewSelector';

const MAX_IMAGES = 6;

export default function MemberGalleryPage() {
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileImages, setProfileImages] = useState<string[]>([]);
  const [selectedProfilePicture, setSelectedProfilePicture] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setProfileImages(profile.profile_images || []);
      setSelectedProfilePicture(profile.profile_picture_url || null);
    }
  }, [profile]);

  const flashSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 2500);
  };

  const persist = async (images: string[], primary: string | null) => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      await profilesApi.update(profile.id, {
        profile_images: images,
        profile_picture_url: primary || undefined,
      });
      if (refreshProfile) await refreshProfile();
    } catch (err: any) {
      console.error('Error saving gallery:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save gallery');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (profileImages.length >= MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const result = await uploadFile(file, 'gallery-images');
      const newImages = [...profileImages, result.publicUrl];
      setProfileImages(newImages);
      await persist(newImages, selectedProfilePicture);
      flashSuccess('Image uploaded');
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.response?.data?.message || err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async (imageUrl: string) => {
    const newImages = profileImages.filter(url => url !== imageUrl);
    const newPrimary = selectedProfilePicture === imageUrl ? null : selectedProfilePicture;
    setProfileImages(newImages);
    setSelectedProfilePicture(newPrimary);
    await persist(newImages, newPrimary);
    flashSuccess('Image removed');
  };

  const handleSelectProfilePicture = async (imageUrl: string) => {
    setSelectedProfilePicture(imageUrl);
    await persist(profileImages, imageUrl);
    flashSuccess('Profile picture updated');
  };

  if (!profile || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-400">Account Settings</h2>
          <button
            onClick={() => navigate('/dashboard/mymeca')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">My Gallery</h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Upload up to {MAX_IMAGES} photos and select one as your profile picture. Changes save automatically.
          </p>
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

        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Photos</h2>
                <p className="text-gray-400 text-sm">
                  {profileImages.length}/{MAX_IMAGES} uploaded {saving && '· Saving...'}
                </p>
              </div>
            </div>
            <ProfileViewSelector active="gallery" />
          </div>

          {profileImages.length === 0 ? (
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-12 text-center">
              <ImageIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">Your competition photos will appear here</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="inline-flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadingImage ? 'Uploading...' : 'Upload First Photo'}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {profileImages.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <div
                      className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
                        selectedProfilePicture === imageUrl
                          ? 'border-orange-500'
                          : 'border-transparent hover:border-slate-500'
                      }`}
                      onClick={() => setLightboxImage(imageUrl)}
                    >
                      <img
                        src={imageUrl}
                        alt={`Gallery image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2 pointer-events-none">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSelectProfilePicture(imageUrl); }}
                        className={`pointer-events-auto p-2 rounded-full ${
                          selectedProfilePicture === imageUrl
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                        }`}
                        title="Set as profile picture"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(imageUrl); }}
                        className="pointer-events-auto p-2 rounded-full bg-red-600 text-white hover:bg-red-700"
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

                {profileImages.length < MAX_IMAGES && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="aspect-square border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50"
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

              <p className="text-gray-500 text-xs mt-4">
                Click an image to view it full-size. Hover to set as profile picture or remove.
              </p>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
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
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Full view"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
