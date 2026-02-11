import { useEffect, useState } from 'react';
import {
  Store,
  Factory,
  Award,
  Edit,
  Plus,
  X,
  Save,
  Eye,
  Image,
  Link,
  CheckCircle,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/auth';
import {
  getMyRetailerListing,
  getMyManufacturerListing,
  createMyRetailerListing,
  updateMyRetailerListing,
  createMyManufacturerListing,
  updateMyManufacturerListing,
  RetailerListing,
  ManufacturerListing,
  GalleryImage,
} from '@/business-listings';
import { membershipsApi } from '@/memberships/memberships.api-client';
import { useNavigate } from 'react-router-dom';

interface RetailerDashboardProps {
  onNavigate: (page: string, data?: any) => void;
}

type ListingType = 'retailer' | 'manufacturer';

export default function RetailerDashboard({ onNavigate }: RetailerDashboardProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [retailerListing, setRetailerListing] = useState<RetailerListing | null>(null);
  const [manufacturerListing, setManufacturerListing] = useState<ManufacturerListing | null>(null);
  const [activeTab, setActiveTab] = useState<ListingType>('retailer');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Membership category determines which listing type to show
  const [membershipCategory, setMembershipCategory] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    business_name: '',
    description: '',
    business_email: '',
    business_phone: '',
    website: '',
    store_type: 'both',
    product_categories: [] as string[],
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA',
    profile_image_url: '',
    gallery_images: [] as GalleryImage[],
  });

  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const userId = profile?.id;
      if (!userId) return;

      // First get the user's active membership to determine which listing type to show
      const membership = await membershipsApi.getUserActiveMembership(userId);
      const category = membership?.membershipTypeConfig?.category;
      setMembershipCategory(category || null);

      // Only fetch the relevant listing based on membership category
      if (category === 'retail') {
        const retailer = await getMyRetailerListing(userId);
        setRetailerListing(retailer);
        setActiveTab('retailer');
      } else if (category === 'manufacturer') {
        const manufacturer = await getMyManufacturerListing(userId);
        setManufacturerListing(manufacturer);
        setActiveTab('manufacturer');
      }
    } catch (err: any) {
      console.error('Error fetching listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFormData = (listing: RetailerListing | ManufacturerListing | null, _type: ListingType) => {
    if (listing) {
      setFormData({
        business_name: listing.businessName || '',
        description: listing.description || '',
        business_email: listing.businessEmail || '',
        business_phone: listing.businessPhone || '',
        website: listing.website || '',
        store_type: 'storeType' in listing ? listing.storeType : 'both',
        product_categories: 'productCategories' in listing ? listing.productCategories || [] : [],
        street_address: listing.streetAddress || '',
        city: listing.city || '',
        state: listing.state || '',
        postal_code: listing.postalCode || '',
        country: listing.country || 'USA',
        profile_image_url: listing.profileImageUrl || '',
        gallery_images: listing.galleryImages || [],
      });
    } else {
      setFormData({
        business_name: '',
        description: '',
        business_email: profile?.email || '',
        business_phone: '',
        website: '',
        store_type: 'both',
        product_categories: [],
        street_address: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'USA',
        profile_image_url: '',
        gallery_images: [],
      });
    }
  };

  const handleEditClick = (type: ListingType) => {
    setActiveTab(type);
    loadFormData(type === 'retailer' ? retailerListing : manufacturerListing, type);
    setIsEditing(true);
  };

  const handleCreateClick = (type: ListingType) => {
    setActiveTab(type);
    loadFormData(null, type);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!formData.business_name) {
      setError('Business name is required');
      return;
    }

    const userId = profile?.id;
    if (!userId) {
      setError('You must be logged in');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (activeTab === 'retailer') {
        if (retailerListing) {
          await updateMyRetailerListing(userId, {
            business_name: formData.business_name,
            description: formData.description,
            business_email: formData.business_email,
            business_phone: formData.business_phone,
            website: formData.website,
            store_type: formData.store_type,
            street_address: formData.street_address,
            city: formData.city,
            state: formData.state,
            postal_code: formData.postal_code,
            country: formData.country,
            profile_image_url: formData.profile_image_url,
            gallery_images: formData.gallery_images,
          });
        } else {
          await createMyRetailerListing(userId, {
            business_name: formData.business_name,
            description: formData.description,
            business_email: formData.business_email,
            business_phone: formData.business_phone,
            website: formData.website,
            store_type: formData.store_type,
            street_address: formData.street_address,
            city: formData.city,
            state: formData.state,
            postal_code: formData.postal_code,
            country: formData.country,
            profile_image_url: formData.profile_image_url,
            gallery_images: formData.gallery_images,
          });
        }
      } else {
        if (manufacturerListing) {
          await updateMyManufacturerListing(userId, {
            business_name: formData.business_name,
            description: formData.description,
            business_email: formData.business_email,
            business_phone: formData.business_phone,
            website: formData.website,
            product_categories: formData.product_categories,
            street_address: formData.street_address,
            city: formData.city,
            state: formData.state,
            postal_code: formData.postal_code,
            country: formData.country,
            profile_image_url: formData.profile_image_url,
            gallery_images: formData.gallery_images,
          });
        } else {
          await createMyManufacturerListing(userId, {
            business_name: formData.business_name,
            description: formData.description,
            business_email: formData.business_email,
            business_phone: formData.business_phone,
            website: formData.website,
            product_categories: formData.product_categories,
            street_address: formData.street_address,
            city: formData.city,
            state: formData.state,
            postal_code: formData.postal_code,
            country: formData.country,
            profile_image_url: formData.profile_image_url,
            gallery_images: formData.gallery_images,
          });
        }
      }

      setSuccess('Listing saved successfully!');
      setIsEditing(false);
      await fetchListings();
    } catch (err: any) {
      console.error('Error saving listing:', err);
      setError(err.response?.data?.message || 'Failed to save listing');
    } finally {
      setSaving(false);
    }
  };

  const addGalleryImage = () => {
    if (formData.gallery_images.length >= 6) return;
    setFormData({
      ...formData,
      gallery_images: [...formData.gallery_images, { url: '', caption: '', productLink: '' }],
    });
  };

  const updateGalleryImage = (index: number, field: keyof GalleryImage, value: string) => {
    const updated = [...formData.gallery_images];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, gallery_images: updated });
  };

  const removeGalleryImage = (index: number) => {
    const updated = formData.gallery_images.filter((_, i) => i !== index);
    setFormData({ ...formData, gallery_images: updated });
  };

  const addCategory = () => {
    if (!newCategory.trim()) return;
    if (formData.product_categories.includes(newCategory.trim())) return;
    setFormData({
      ...formData,
      product_categories: [...formData.product_categories, newCategory.trim()],
    });
    setNewCategory('');
  };

  const removeCategory = (category: string) => {
    setFormData({
      ...formData,
      product_categories: formData.product_categories.filter(c => c !== category),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  // Editing mode
  if (isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              {activeTab === 'retailer' ? (
                <Store className="h-8 w-8 text-orange-500" />
              ) : (
                <Factory className="h-8 w-8 text-cyan-500" />
              )}
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                {retailerListing || manufacturerListing ? 'Edit' : 'Create'}{' '}
                {activeTab === 'retailer' ? 'Retailer' : 'Manufacturer'} Listing
              </h1>
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <div className="bg-slate-800 rounded-xl p-8 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  placeholder="Your business name"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
                  placeholder="Tell us about your business..."
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Business Email
                </label>
                <input
                  type="email"
                  value={formData.business_email}
                  onChange={(e) => setFormData({ ...formData, business_email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  placeholder="contact@business.com"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Business Phone
                </label>
                <input
                  type="tel"
                  value={formData.business_phone}
                  onChange={(e) => setFormData({ ...formData, business_phone: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  placeholder="https://www.yourbusiness.com"
                />
              </div>

              {activeTab === 'retailer' && (
                <div className="md:col-span-2">
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Store Type
                  </label>
                  <select
                    value={formData.store_type}
                    onChange={(e) => setFormData({ ...formData, store_type: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  >
                    <option value="brick_and_mortar">Physical Store Only</option>
                    <option value="online">Online Only</option>
                    <option value="both">Physical & Online</option>
                  </select>
                </div>
              )}

              {activeTab === 'manufacturer' && (
                <div className="md:col-span-2">
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Product Categories
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                      className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                      placeholder="Add a category (e.g., Amplifiers, Subwoofers)"
                    />
                    <button
                      type="button"
                      onClick={addCategory}
                      className="px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  {formData.product_categories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.product_categories.map((category, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-slate-700 text-gray-300 rounded-full text-sm"
                        >
                          {category}
                          <button
                            type="button"
                            onClick={() => removeCategory(category)}
                            className="text-gray-500 hover:text-red-400"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Address */}
            <div className="border-t border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.street_address}
                    onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    placeholder="12345"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    placeholder="USA"
                  />
                </div>
              </div>
            </div>

            {/* Profile Image */}
            <div className="border-t border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Profile Image</h3>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Profile Image URL
                </label>
                <input
                  type="url"
                  value={formData.profile_image_url}
                  onChange={(e) => setFormData({ ...formData, profile_image_url: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  placeholder="https://..."
                />
                {formData.profile_image_url && (
                  <div className="mt-3">
                    <img
                      src={formData.profile_image_url}
                      alt="Profile preview"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Gallery Images */}
            <div className="border-t border-slate-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Gallery Images (up to 6)</h3>
                {formData.gallery_images.length < 6 && (
                  <button
                    type="button"
                    onClick={addGalleryImage}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Image
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {formData.gallery_images.map((image, index) => (
                  <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="block text-gray-400 text-xs mb-1">
                            Image URL
                          </label>
                          <div className="flex gap-2">
                            <Image className="h-5 w-5 text-gray-500 mt-3" />
                            <input
                              type="url"
                              value={image.url}
                              onChange={(e) => updateGalleryImage(index, 'url', e.target.value)}
                              className="flex-1 px-3 py-2 bg-slate-600 text-white rounded-lg border border-slate-500 focus:border-orange-500 outline-none text-sm"
                              placeholder="https://..."
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-gray-400 text-xs mb-1">
                            Caption (optional)
                          </label>
                          <input
                            type="text"
                            value={image.caption || ''}
                            onChange={(e) => updateGalleryImage(index, 'caption', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg border border-slate-500 focus:border-orange-500 outline-none text-sm"
                            placeholder="Image caption"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 text-xs mb-1">
                            Product Link (optional)
                          </label>
                          <div className="flex gap-2">
                            <Link className="h-5 w-5 text-gray-500 mt-2" />
                            <input
                              type="url"
                              value={image.productLink || ''}
                              onChange={(e) => updateGalleryImage(index, 'productLink', e.target.value)}
                              className="flex-1 px-3 py-2 bg-slate-600 text-white rounded-lg border border-slate-500 focus:border-orange-500 outline-none text-sm"
                              placeholder="https://store.com/product"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        {image.url && (
                          <img
                            src={image.url}
                            alt={`Gallery ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(index)}
                          className="text-red-400 hover:text-red-300 p-2"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-6 border-t border-slate-700">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="h-5 w-5" />
                {saving ? 'Saving...' : 'Save Listing'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard view
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-400">My MECA</h2>
          <button
            onClick={() => navigate('/dashboard/mymeca')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>

        {/* Title Row */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
              {membershipCategory === 'retail' ? 'Retailer' : membershipCategory === 'manufacturer' ? 'Manufacturer' : 'Business'} Directory Listing
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">Manage your business listing and directory presence</p>
          </div>
        </div>

        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <p className="text-green-400">{success}</p>
          </div>
        )}

        {/* Show message if user doesn't have a retailer or manufacturer membership */}
        {membershipCategory && membershipCategory !== 'retail' && membershipCategory !== 'manufacturer' && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 text-center">
            <p className="text-yellow-400">
              Business directory listings are only available for Retailer and Manufacturer members.
            </p>
          </div>
        )}

        {/* Listing Card - matches Profile page style */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          {/* Retailer Listing - Only for retail members */}
          {membershipCategory === 'retail' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <Store className="h-6 w-6 text-orange-500" />
                <h2 className="text-xl font-bold text-white">Listing Information</h2>
              </div>
              {retailerListing ? (
                <div>
                  <div className="flex items-start gap-4 mb-6">
                    {retailerListing.profileImageUrl ? (
                      <img
                        src={retailerListing.profileImageUrl}
                        alt={retailerListing.businessName}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-slate-700 rounded-lg flex items-center justify-center">
                        <Store className="h-10 w-10 text-slate-500" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white">
                        {retailerListing.businessName}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {[retailerListing.city, retailerListing.state].filter(Boolean).join(', ')}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {retailerListing.isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full">
                            <CheckCircle className="h-3 w-3" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-full">
                            <Clock className="h-3 w-3" />
                            Pending Approval
                          </span>
                        )}
                        {retailerListing.isSponsor && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/10 text-orange-400 text-xs rounded-full">
                            <Award className="h-3 w-3" />
                            Sponsor
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEditClick('retailer')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Listing
                    </button>
                    <button
                      onClick={() => navigate(`/retailers/${retailerListing.id}`)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      View Public Listing
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Store className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 mb-4">
                    You haven't created a retailer listing yet
                  </p>
                  <button
                    onClick={() => handleCreateClick('retailer')}
                    className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    Create Retailer Listing
                  </button>
                </div>
              )}
            </>
          )}

          {/* Manufacturer Listing - Only for manufacturer members */}
          {membershipCategory === 'manufacturer' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <Factory className="h-6 w-6 text-cyan-500" />
                <h2 className="text-xl font-bold text-white">Listing Information</h2>
              </div>
              {manufacturerListing ? (
                <div>
                  <div className="flex items-start gap-4 mb-6">
                    {manufacturerListing.profileImageUrl ? (
                      <img
                        src={manufacturerListing.profileImageUrl}
                        alt={manufacturerListing.businessName}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-slate-700 rounded-lg flex items-center justify-center">
                        <Factory className="h-10 w-10 text-slate-500" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white">
                        {manufacturerListing.businessName}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {[manufacturerListing.city, manufacturerListing.state].filter(Boolean).join(', ')}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {manufacturerListing.isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full">
                            <CheckCircle className="h-3 w-3" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-full">
                            <Clock className="h-3 w-3" />
                            Pending Approval
                          </span>
                        )}
                        {manufacturerListing.isSponsor && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/10 text-cyan-400 text-xs rounded-full">
                            <Award className="h-3 w-3" />
                            Sponsor
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEditClick('manufacturer')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Listing
                    </button>
                    <button
                      onClick={() => navigate(`/manufacturers/${manufacturerListing.id}`)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      View Public Listing
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Factory className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 mb-4">
                    You haven't created a manufacturer listing yet
                  </p>
                  <button
                    onClick={() => handleCreateClick('manufacturer')}
                    className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    Create Manufacturer Listing
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
