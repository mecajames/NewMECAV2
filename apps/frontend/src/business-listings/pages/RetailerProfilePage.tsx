import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Store,
  MapPin,
  Globe,
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  ShoppingCart,
  X,
  ExternalLink,
  Move,
  Check,
  Tag,
  Sparkles,
} from 'lucide-react';
import { getRetailerById, updateMyRetailerListing, adminUpdateRetailer, RetailerListing } from '@/business-listings';
import { useAuth } from '@/auth';
import { SEOHead, useRetailerProfileSEO } from '@/shared/seo';

const STORE_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  brick_and_mortar: { label: 'Physical Store', description: 'Visit us at our physical location' },
  online: { label: 'Online Store', description: 'Shop with us online' },
  both: { label: 'Physical & Online', description: 'Shop online or visit us in store' },
};

const STORE_TYPE_COLORS: Record<string, string> = {
  brick_and_mortar: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  online: 'bg-green-500/10 text-green-400 border-green-500/20',
  both: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export default function RetailerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [retailer, setRetailer] = useState<RetailerListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Position editing state
  const [isEditingPosition, setIsEditingPosition] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [savingPosition, setSavingPosition] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Check if logged-in user is the retailer owner or an admin
  const isOwner = user?.id && retailer?.user?.id && user.id === retailer.user.id;
  const isAdmin = profile?.role === 'admin';
  const canEdit = isOwner || isAdmin;

  useEffect(() => {
    if (id) {
      fetchRetailer();
    }
  }, [id]);

  useEffect(() => {
    if (retailer?.coverImagePosition) {
      setPosition(retailer.coverImagePosition);
    }
  }, [retailer]);

  const fetchRetailer = async () => {
    try {
      setLoading(true);
      const data = await getRetailerById(id!);
      setRetailer(data);
      // Immediately set position from fetched data to avoid race condition
      if (data?.coverImagePosition) {
        setPosition(data.coverImagePosition);
      }
    } catch (err: any) {
      console.error('Error fetching retailer:', err);
      setError('Retailer not found');
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
    if (!retailer || !user?.id) return;

    try {
      setSavingPosition(true);
      // Use admin API if admin, otherwise use user API
      if (isAdmin && !isOwner) {
        await adminUpdateRetailer(user.id, retailer.id, { cover_image_position: position });
      } else {
        await updateMyRetailerListing(user.id, { cover_image_position: position });
      }
      setRetailer({ ...retailer, coverImagePosition: position });
      setIsEditingPosition(false);
    } catch (err) {
      console.error('Error saving position:', err);
    } finally {
      setSavingPosition(false);
    }
  };

  const cancelEditing = () => {
    if (retailer?.coverImagePosition) {
      setPosition(retailer.coverImagePosition);
    } else {
      setPosition({ x: 50, y: 50 });
    }
    setIsEditingPosition(false);
  };

  const formatAddress = () => {
    if (!retailer) return null;
    const parts = [
      retailer.streetAddress,
      retailer.city,
      retailer.state,
      retailer.postalCode,
      retailer.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  if (error || !retailer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Store className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Retailer Not Found</h2>
          <p className="text-gray-400 mb-6">{error || 'This retailer is not available'}</p>
          <button
            onClick={() => navigate('/retailers')}
            className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Retailer Directory
          </button>
        </div>
      </div>
    );
  }

  const address = formatAddress();
  const storeTypeInfo = STORE_TYPE_LABELS[retailer.storeType] || { label: retailer.storeType, description: '' };

  const seoProps = useRetailerProfileSEO(retailer ? {
    id: retailer.id,
    name: retailer.businessName,
    description: retailer.description,
    image: retailer.profileImageUrl,
    address: {
      street: retailer.streetAddress,
      city: retailer.city,
      state: retailer.state,
      zip: retailer.postalCode,
      country: retailer.country,
    },
    phone: retailer.businessPhone,
    email: retailer.businessEmail,
    website: retailer.website,
  } : null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      {seoProps && <SEOHead {...seoProps} />}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-400">Retailer Profile</h2>
          <button
            onClick={() => navigate('/retailers')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Retailer Directory
          </button>
        </div>

        {/* Retailer Header */}
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
            {retailer.profileImageUrl ? (
              <img
                src={retailer.profileImageUrl}
                alt={`${retailer.businessName} logo`}
                className={`w-full h-full object-cover ${!isEditingPosition ? 'cursor-pointer' : ''} select-none`}
                style={{ objectPosition: `${position.x}% ${position.y}%` }}
                onClick={() => !isEditingPosition && setLightboxImage(retailer.profileImageUrl!)}
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Store className="h-32 w-32 text-slate-600" />
              </div>
            )}

            {/* Position editing overlay */}
            {isEditingPosition && retailer.profileImageUrl && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                <div className="bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
                  Drag to reposition image
                </div>
              </div>
            )}

            {/* Sponsor Badge */}
            {retailer.isSponsor && (
              <div className="absolute top-3 left-3 bg-orange-500 text-white text-sm px-3 py-1 rounded-full font-semibold">
                MECA Sponsor
              </div>
            )}

            {/* Edit position button - only show for owner or admin with an image */}
            {canEdit && retailer.profileImageUrl && !isEditingPosition && (
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
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {retailer.businessName}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-gray-400">
                  {address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {retailer.city}, {retailer.state}
                    </span>
                  )}
                </div>
              </div>

              <div className={`px-4 py-2 rounded-full border font-medium ${STORE_TYPE_COLORS[retailer.storeType] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                {storeTypeInfo.label}
              </div>
            </div>

            {/* Description */}
            {retailer.description && (
              <div className="mt-6">
                <p className="text-gray-300 whitespace-pre-wrap">{retailer.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Special Offer Section */}
        {retailer.offerText && (
          <div className="bg-gradient-to-r from-red-900/40 via-red-800/30 to-orange-900/40 border-2 border-red-500/50 rounded-xl p-6 shadow-lg mb-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-12 h-12 bg-red-500/20 rounded-full">
                  <Tag className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">Exclusive MECA Member Offer</h2>
                    <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
                  </div>
                  <p className="text-red-400 text-sm font-medium">Special discount for MECA members</p>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4 border border-red-500/30">
                <p className="text-white text-lg font-medium">{retailer.offerText}</p>
              </div>
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-orange-500" />
              Contact Information
            </h2>
            <div className="space-y-4">
              {retailer.businessEmail && (
                <a
                  href={`mailto:${retailer.businessEmail}`}
                  className="flex items-center gap-3 text-gray-300 hover:text-orange-500 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Email</div>
                    <div>{retailer.businessEmail}</div>
                  </div>
                </a>
              )}

              {retailer.businessPhone && (
                <a
                  href={`tel:${retailer.businessPhone}`}
                  className="flex items-center gap-3 text-gray-300 hover:text-orange-500 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Phone</div>
                    <div>{retailer.businessPhone}</div>
                  </div>
                </a>
              )}

              {retailer.website && (
                <a
                  href={retailer.website.startsWith('http') ? retailer.website : `https://${retailer.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-gray-300 hover:text-orange-500 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Website</div>
                    <div className="flex items-center gap-1">
                      {retailer.website}
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </div>
                </a>
              )}

              {!retailer.businessEmail && !retailer.businessPhone && !retailer.website && (
                <p className="text-gray-400">No contact information available</p>
              )}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-500" />
              Location & Store Type
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                  {retailer.storeType === 'online' ? (
                    <ShoppingCart className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Building2 className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="text-sm text-gray-400">Store Type</div>
                  <div className="text-gray-300">{storeTypeInfo.label}</div>
                  <div className="text-sm text-gray-500">{storeTypeInfo.description}</div>
                </div>
              </div>

              {address && (retailer.storeType === 'brick_and_mortar' || retailer.storeType === 'both') && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Address</div>
                    <div className="text-gray-300">{address}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gallery */}
        {retailer.galleryImages && retailer.galleryImages.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4">Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {retailer.galleryImages.map((image, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative group"
                  onClick={() => image.productLink ? window.open(image.productLink, '_blank') : setLightboxImage(image.url)}
                >
                  <img
                    src={image.url}
                    alt={image.caption || `Gallery image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {image.productLink && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-orange-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                        <ShoppingCart className="h-4 w-4" />
                        View Product
                      </div>
                    </div>
                  )}
                  {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="text-white text-sm">{image.caption}</p>
                    </div>
                  )}
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
