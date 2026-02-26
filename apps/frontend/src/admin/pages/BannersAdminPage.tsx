import { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Image, X, ExternalLink, BarChart3, Upload, Loader2, ArrowLeft, Wand2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { BannerPosition, BannerPositionLabels, BannerStatus, BannerSize, BannerSizeLabels, type Banner, type Advertiser, type CreateBannerDto, type UpdateBannerDto } from '@newmeca/shared';
import {
  getBanners,
  getActiveAdvertisers,
  createBanner,
  updateBanner,
  deleteBanner,
  uploadBannerImage,
  autoDetectBannerSizes,
} from '../../api-client/banners.api-client';

interface FormData {
  name: string;
  imageUrl: string;
  clickUrl: string;
  position: BannerPosition;
  status: BannerStatus;
  startDate: string;
  endDate: string;
  priority: number;
  advertiserId: string;
  altText: string;
  size: string;
  // Frequency capping
  maxImpressionsPerUser: number;
  maxTotalImpressions: number;
  rotationWeight: number;
}

const initialFormData: FormData = {
  name: '',
  imageUrl: '',
  clickUrl: '',
  position: BannerPosition.EVENTS_PAGE_TOP,
  status: BannerStatus.DRAFT,
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  priority: 0,
  advertiserId: '',
  altText: '',
  size: '',
  maxImpressionsPerUser: 0,
  maxTotalImpressions: 0,
  rotationWeight: 100,
};

const bannerSizeOptions: { value: BannerSize; label: string }[] = Object.entries(BannerSizeLabels).map(
  ([value, label]) => ({ value: value as BannerSize, label })
);

const statusOptions = [
  { value: BannerStatus.DRAFT, label: 'Draft', color: 'bg-slate-500/20 text-slate-400' },
  { value: BannerStatus.ACTIVE, label: 'Active', color: 'bg-green-500/20 text-green-400' },
  { value: BannerStatus.PAUSED, label: 'Paused', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: BannerStatus.ARCHIVED, label: 'Archived', color: 'bg-red-500/20 text-red-400' },
];

const positionOptions = Object.entries(BannerPositionLabels).map(
  ([value, label]) => ({ value: value as BannerPosition, label })
);

/** Parse "WIDTHxHEIGHT" from a BannerSize enum value */
function parseSizeDimensions(size: string): { width: number; height: number } | null {
  const match = size.match(/^(\d+)x(\d+)$/);
  if (!match) return null;
  return { width: parseInt(match[1]), height: parseInt(match[2]) };
}

/** Check image dimensions by loading it in the browser */
function checkImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

/** Check a File's image dimensions before upload */
function checkFileDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export default function BannersAdminPage() {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bannersData, advertisersData] = await Promise.all([
        getBanners(),
        getActiveAdvertisers(),
      ]);
      setBanners(bannersData);
      setAdvertisers(advertisersData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoDetect = async () => {
    setDetecting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await autoDetectBannerSizes();
      const messages: string[] = [];
      if (result.updated > 0) messages.push(`Updated ${result.updated} banner(s) with detected sizes.`);
      if (result.failed.length > 0) messages.push(`Could not detect: ${result.failed.join('; ')}`);
      if (result.updated === 0 && result.failed.length === 0) messages.push('All banners already have sizes assigned.');
      setSuccessMessage(messages.join(' '));
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to auto-detect sizes');
    } finally {
      setDetecting(false);
    }
  };

  const openCreateModal = () => {
    setEditingBanner(null);
    setFormData({
      ...initialFormData,
      advertiserId: advertisers[0]?.id || '',
    });
    setImageError(null);
    setShowModal(true);
  };

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      name: banner.name,
      imageUrl: banner.imageUrl,
      clickUrl: banner.clickUrl || '',
      position: banner.position,
      status: banner.status,
      startDate: new Date(banner.startDate).toISOString().split('T')[0],
      endDate: new Date(banner.endDate).toISOString().split('T')[0],
      priority: banner.priority,
      advertiserId: banner.advertiserId || banner.advertiser?.id || '',
      altText: banner.altText || '',
      size: banner.size || '',
      maxImpressionsPerUser: banner.maxImpressionsPerUser || 0,
      maxTotalImpressions: banner.maxTotalImpressions || 0,
      rotationWeight: banner.rotationWeight || 100,
    });
    setImageError(null);
    setShowModal(true);
  };

  const validateImageDimensions = async (url: string, selectedSize: string): Promise<boolean> => {
    if (!selectedSize) return true; // No size selected, skip validation
    const expected = parseSizeDimensions(selectedSize);
    if (!expected) return true;

    try {
      const actual = await checkImageDimensions(url);
      if (actual.width !== expected.width || actual.height !== expected.height) {
        setImageError(
          `Image is ${actual.width}x${actual.height}, but the selected size requires ${expected.width}x${expected.height}. Please upload an image with the correct dimensions.`
        );
        return false;
      }
      setImageError(null);
      return true;
    } catch {
      // Can't validate, allow it
      return true;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (PNG, JPEG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    // Validate dimensions BEFORE uploading if a size is selected
    if (formData.size) {
      const expected = parseSizeDimensions(formData.size);
      if (expected) {
        try {
          const actual = await checkFileDimensions(file);
          if (actual.width !== expected.width || actual.height !== expected.height) {
            setImageError(
              `Image is ${actual.width}x${actual.height}, but the selected size requires ${expected.width}x${expected.height}. Please use an image with the correct dimensions.`
            );
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }
        } catch {
          // Can't check, proceed with upload
        }
      }
    }

    try {
      setUploading(true);
      setError(null);
      setImageError(null);
      const imageUrl = await uploadBannerImage(file);
      setFormData(prev => ({ ...prev, imageUrl }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImageUrlPaste = async (url: string) => {
    setFormData(prev => ({ ...prev, imageUrl: url }));
    setImageError(null);
    // Validate after a short delay to let the image load
    if (url && formData.size) {
      setTimeout(() => validateImageDimensions(url, formData.size), 500);
    }
  };

  const handleSizeChange = async (newSize: string) => {
    setFormData(prev => ({ ...prev, size: newSize }));
    setImageError(null);
    // Re-validate current image against new size
    if (formData.imageUrl && newSize) {
      setTimeout(() => validateImageDimensions(formData.imageUrl, newSize), 300);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.size) {
      setError('Please select a banner size.');
      return;
    }

    // Final dimension check before submit
    if (formData.imageUrl && formData.size) {
      const valid = await validateImageDimensions(formData.imageUrl, formData.size);
      if (!valid) return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingBanner) {
        const dto: UpdateBannerDto = {
          name: formData.name,
          imageUrl: formData.imageUrl,
          clickUrl: formData.clickUrl || undefined,
          position: formData.position,
          status: formData.status,
          startDate: new Date(formData.startDate),
          endDate: new Date(formData.endDate),
          priority: formData.priority,
          advertiserId: formData.advertiserId,
          altText: formData.altText || undefined,
          size: (formData.size as BannerSize) || null,
          maxImpressionsPerUser: formData.maxImpressionsPerUser,
          maxTotalImpressions: formData.maxTotalImpressions,
          rotationWeight: formData.rotationWeight,
        };
        await updateBanner(editingBanner.id, dto);
      } else {
        const dto: CreateBannerDto = {
          name: formData.name,
          imageUrl: formData.imageUrl,
          clickUrl: formData.clickUrl || undefined,
          position: formData.position,
          status: formData.status,
          startDate: new Date(formData.startDate),
          endDate: new Date(formData.endDate),
          priority: formData.priority,
          advertiserId: formData.advertiserId,
          altText: formData.altText || undefined,
          size: formData.size as BannerSize,
          maxImpressionsPerUser: formData.maxImpressionsPerUser,
          maxTotalImpressions: formData.maxTotalImpressions,
          rotationWeight: formData.rotationWeight,
        };
        await createBanner(dto);
      }

      setShowModal(false);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBanner(id);
      setDeleteConfirm(null);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete banner');
    }
  };

  const getStatusStyle = (status: BannerStatus) => {
    return statusOptions.find(s => s.value === status)?.color || 'bg-slate-500/20 text-slate-400';
  };

  const getSizeLabel = (size: string | null | undefined) => {
    if (!size) return '-';
    return BannerSizeLabels[size as BannerSize] || size;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const bannersWithoutSize = banners.filter(b => !b.size).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Image className="h-8 w-8 text-orange-500" />
              Banner Ads
            </h1>
            <p className="text-gray-400">Manage banner advertisements</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/banners/analytics"
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              <BarChart3 className="h-5 w-5" />
              Analytics
            </Link>
            <button
              onClick={openCreateModal}
              disabled={advertisers.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-5 w-5" />
              Add Banner
            </button>
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Auto-detect sizes banner */}
        {bannersWithoutSize > 0 && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500 rounded-lg flex items-center justify-between">
            <span className="text-blue-400">
              {bannersWithoutSize} banner(s) don't have a size assigned. Auto-detect from image dimensions?
            </span>
            <button
              onClick={handleAutoDetect}
              disabled={detecting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {detecting ? 'Detecting...' : 'Auto-detect Sizes'}
            </button>
          </div>
        )}

        {/* Warning if no advertisers */}
        {advertisers.length === 0 && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500 rounded-lg text-yellow-400">
            You need to create at least one advertiser before creating banners.{' '}
            <Link to="/admin/advertisers" className="underline hover:text-yellow-300">
              Create an advertiser
            </Link>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500 rounded-lg text-green-400">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Banners Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Banner</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Advertiser</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Size</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Dates</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Status</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {banners.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No banners found. Create your first banner to get started.
                    </td>
                  </tr>
                ) : (
                  banners.map((banner) => (
                    <tr key={banner.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-12 bg-slate-700 rounded overflow-hidden flex-shrink-0">
                            <img
                              src={banner.imageUrl}
                              alt={banner.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
                              }}
                            />
                          </div>
                          <div>
                            <p className="text-white font-medium">{banner.name}</p>
                            {banner.clickUrl && (
                              <a
                                href={banner.clickUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-slate-400 hover:text-orange-500 flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Link
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-white">
                        {banner.advertiser?.companyName || 'Unknown'}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-sm ${banner.size ? 'text-white' : 'text-slate-500'}`}>
                          {getSizeLabel(banner.size)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-white">
                          {formatDate(banner.startDate)} - {formatDate(banner.endDate)}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Priority: {banner.priority} | Weight: {banner.rotationWeight}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(banner.status)}`}>
                          {statusOptions.find(s => s.value === banner.status)?.label || banner.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(banner)}
                            className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(banner.id)}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">
                {editingBanner ? 'Edit Banner' : 'Add Banner'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Banner Size - FIRST and REQUIRED */}
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <label className="block text-sm font-medium text-orange-400 mb-2">
                  Banner Size * (select first)
                </label>
                <select
                  value={formData.size}
                  onChange={(e) => handleSizeChange(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select banner size...</option>
                  {bannerSizeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {formData.size && (
                  <p className="text-xs text-slate-400 mt-2">
                    Uploaded images must be exactly {formData.size} pixels.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Banner Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Advertiser *
                  </label>
                  <select
                    value={formData.advertiserId}
                    onChange={(e) => setFormData({ ...formData, advertiserId: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select advertiser...</option>
                    {advertisers.map((adv) => (
                      <option key={adv.id} value={adv.id}>
                        {adv.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Banner Image * {formData.size ? `(must be ${formData.size})` : ''}
                </label>
                <div className="flex gap-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || !formData.size}
                    title={!formData.size ? 'Select a banner size first' : undefined}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload Image
                      </>
                    )}
                  </button>
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={(e) => handleImageUrlPaste(e.target.value)}
                    required
                    disabled={!formData.size}
                    placeholder={formData.size ? 'Or paste image URL...' : 'Select a size first...'}
                    className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                  />
                </div>
                {imageError && (
                  <div className="mt-2 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
                    {imageError}
                  </div>
                )}
                {formData.imageUrl && !imageError && (
                  <div className="mt-2 p-2 bg-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400 mb-2">Preview:</p>
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="max-w-full h-auto rounded"
                      style={{ maxHeight: '120px' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Click URL (where the banner links to)
                </label>
                <input
                  type="url"
                  value={formData.clickUrl}
                  onChange={(e) => setFormData({ ...formData, clickUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Position
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value as BannerPosition })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {positionOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as BannerStatus })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Priority
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">Higher = shown first</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    min={formData.startDate}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Frequency Capping Section */}
              <div className="border-t border-slate-700 pt-4 mt-4">
                <h3 className="text-lg font-medium text-white mb-4">Frequency & Rotation Settings</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Max Impressions Per User
                    </label>
                    <input
                      type="number"
                      value={formData.maxImpressionsPerUser}
                      onChange={(e) => setFormData({ ...formData, maxImpressionsPerUser: parseInt(e.target.value) || 0 })}
                      min={0}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">0 = unlimited</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Max Total Impressions
                    </label>
                    <input
                      type="number"
                      value={formData.maxTotalImpressions}
                      onChange={(e) => setFormData({ ...formData, maxTotalImpressions: parseInt(e.target.value) || 0 })}
                      min={0}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">0 = unlimited</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Rotation Weight
                    </label>
                    <input
                      type="number"
                      value={formData.rotationWeight}
                      onChange={(e) => setFormData({ ...formData, rotationWeight: Math.max(1, Math.min(1000, parseInt(e.target.value) || 100)) })}
                      min={1}
                      max={1000}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">Higher = more frequent</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Alt Text (for accessibility)
                </label>
                <input
                  type="text"
                  value={formData.altText}
                  onChange={(e) => setFormData({ ...formData, altText: e.target.value })}
                  placeholder="Describe the banner..."
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading || !!imageError}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingBanner ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-4">Delete Banner?</h3>
            <p className="text-slate-300 mb-6">
              This will permanently delete the banner and all engagement data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
