import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Factory,
  MapPin,
  Globe,
  ArrowLeft,
  Phone,
  Mail,
  Tag,
  ShoppingCart,
  X,
  ExternalLink,
  Move,
  Check,
} from 'lucide-react';
import { getManufacturerById, updateMyManufacturerListing, adminUpdateManufacturer, ManufacturerListing } from '@/business-listings';
import { useAuth } from '@/auth';

export default function ManufacturerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [manufacturer, setManufacturer] = useState<ManufacturerListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Position editing state
  const [isEditingPosition, setIsEditingPosition] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [savingPosition, setSavingPosition] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Check if logged-in user is the manufacturer owner or an admin
  const isOwner = user?.id && manufacturer?.user?.id && user.id === manufacturer.user.id;
  const isAdmin = profile?.role === 'admin';
  const canEdit = isOwner || isAdmin;

  useEffect(() => {
    if (id) {
      fetchManufacturer();
    }
  }, [id]);

  useEffect(() => {
    if (manufacturer?.coverImagePosition) {
      setPosition(manufacturer.coverImagePosition);
    }
  }, [manufacturer]);

  const fetchManufacturer = async () => {
    try {
      setLoading(true);
      const data = await getManufacturerById(id!);
      setManufacturer(data);
      // Immediately set position from fetched data to avoid race condition
      if (data?.coverImagePosition) {
        setPosition(data.coverImagePosition);
      }
    } catch (err: any) {
      console.error('Error fetching manufacturer:', err);
      setError('Manufacturer not found');
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
    if (!manufacturer || !user?.id) return;

    try {
      setSavingPosition(true);
      // Use admin API if admin, otherwise use user API
      if (isAdmin && !isOwner) {
        await adminUpdateManufacturer(user.id, manufacturer.id, { cover_image_position: position });
      } else {
        await updateMyManufacturerListing(user.id, { cover_image_position: position });
      }
      setManufacturer({ ...manufacturer, coverImagePosition: position });
      setIsEditingPosition(false);
    } catch (err) {
      console.error('Error saving position:', err);
    } finally {
      setSavingPosition(false);
    }
  };

  const cancelEditing = () => {
    if (manufacturer?.coverImagePosition) {
      setPosition(manufacturer.coverImagePosition);
    } else {
      setPosition({ x: 50, y: 50 });
    }
    setIsEditingPosition(false);
  };

  const formatAddress = () => {
    if (!manufacturer) return null;
    const parts = [
      manufacturer.streetAddress,
      manufacturer.city,
      manufacturer.state,
      manufacturer.postalCode,
      manufacturer.country,
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

  if (error || !manufacturer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Factory className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Manufacturer Not Found</h2>
          <p className="text-gray-400 mb-6">{error || 'This manufacturer is not available'}</p>
          <button
            onClick={() => navigate('/manufacturers')}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Manufacturer Directory
          </button>
        </div>
      </div>
    );
  }

  const address = formatAddress();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-400">Manufacturer Profile</h2>
          <button
            onClick={() => navigate('/manufacturers')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Manufacturer Directory
          </button>
        </div>

        {/* Manufacturer Header */}
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
            {manufacturer.profileImageUrl ? (
              <img
                src={manufacturer.profileImageUrl}
                alt={`${manufacturer.businessName} logo`}
                className={`w-full h-full object-cover ${!isEditingPosition ? 'cursor-pointer' : ''} select-none`}
                style={{ objectPosition: `${position.x}% ${position.y}%` }}
                onClick={() => !isEditingPosition && setLightboxImage(manufacturer.profileImageUrl!)}
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Factory className="h-32 w-32 text-slate-600" />
              </div>
            )}

            {/* Position editing overlay */}
            {isEditingPosition && manufacturer.profileImageUrl && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                <div className="bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
                  Drag to reposition image
                </div>
              </div>
            )}

            {/* Sponsor Badge */}
            {manufacturer.isSponsor && (
              <div className="absolute top-3 left-3 bg-orange-500 text-white text-sm px-3 py-1 rounded-full font-semibold">
                MECA Sponsor
              </div>
            )}

            {/* Edit position button - only show for owner or admin with an image */}
            {canEdit && manufacturer.profileImageUrl && !isEditingPosition && (
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
                  {manufacturer.businessName}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-gray-400">
                  {(manufacturer.city || manufacturer.state) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {[manufacturer.city, manufacturer.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>

              {manufacturer.isSponsor && (
                <div className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-4 py-2 rounded-full font-medium">
                  MECA Sponsor
                </div>
              )}
            </div>

            {/* Description */}
            {manufacturer.description && (
              <div className="mt-6">
                <p className="text-gray-300 whitespace-pre-wrap">{manufacturer.description}</p>
              </div>
            )}

            {/* Product Categories */}
            {manufacturer.productCategories && manufacturer.productCategories.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Product Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {manufacturer.productCategories.map((category, index) => (
                    <span
                      key={index}
                      className="bg-slate-700 text-gray-300 px-3 py-1 rounded-full flex items-center gap-1 text-sm"
                    >
                      <Tag className="h-3 w-3" />
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-orange-500" />
              Contact Information
            </h2>
            <div className="space-y-4">
              {manufacturer.businessEmail && (
                <a
                  href={`mailto:${manufacturer.businessEmail}`}
                  className="flex items-center gap-3 text-gray-300 hover:text-orange-500 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Email</div>
                    <div>{manufacturer.businessEmail}</div>
                  </div>
                </a>
              )}

              {manufacturer.businessPhone && (
                <a
                  href={`tel:${manufacturer.businessPhone}`}
                  className="flex items-center gap-3 text-gray-300 hover:text-orange-500 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Phone</div>
                    <div>{manufacturer.businessPhone}</div>
                  </div>
                </a>
              )}

              {manufacturer.website && (
                <a
                  href={manufacturer.website.startsWith('http') ? manufacturer.website : `https://${manufacturer.website}`}
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
                      {manufacturer.website}
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </div>
                </a>
              )}

              {!manufacturer.businessEmail && !manufacturer.businessPhone && !manufacturer.website && (
                <p className="text-gray-400">No contact information available</p>
              )}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-500" />
              Location
            </h2>
            <div className="space-y-4">
              {address ? (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Address</div>
                    <div className="text-gray-300">{address}</div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">No address available</p>
              )}
            </div>
          </div>
        </div>

        {/* Gallery */}
        {manufacturer.galleryImages && manufacturer.galleryImages.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4">Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {manufacturer.galleryImages.map((image, index) => (
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
