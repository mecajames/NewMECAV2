import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Factory,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Trash2,
  Eye,
  Star,
  Plus,
  X,
  Save,
  Edit,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/auth';
import { CountrySelect, StateProvinceSelect } from '@/shared/fields';
import { getPostalCodeLabel } from '@/utils/countries';
import {
  adminGetAllRetailers,
  adminGetAllManufacturers,
  adminApproveRetailer,
  adminApproveManufacturer,
  adminUpdateRetailer,
  adminUpdateManufacturer,
  adminDeleteRetailer,
  adminDeleteManufacturer,
  adminCreateRetailer,
  adminCreateManufacturer,
  RetailerListing,
  ManufacturerListing,
} from '@/business-listings';
import { profilesApi } from '@/profiles';

type Tab = 'retailers' | 'manufacturers';

interface UserOption {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export default function BusinessListingsAdminPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('retailers');
  const [loading, setLoading] = useState(true);
  const [retailers, setRetailers] = useState<RetailerListing[]>([]);
  const [manufacturers, setManufacturers] = useState<ManufacturerListing[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved'>('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create/Edit modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [createType, setCreateType] = useState<Tab>('retailers');
  const [editType, setEditType] = useState<Tab>('retailers');
  const [editingListing, setEditingListing] = useState<RetailerListing | ManufacturerListing | null>(null);
  const [saving, setSaving] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserOption[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [createForm, setCreateForm] = useState({
    business_name: '',
    description: '',
    offer_text: '',
    business_email: '',
    business_phone: '',
    website: '',
    store_type: 'both',
    product_categories: [] as string[],
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    profile_image_url: '',
    is_approved: true,
    is_sponsor: false,
    sponsor_order: 0,
    start_date: '',
    end_date: '',
  });
  const [editForm, setEditForm] = useState({
    business_name: '',
    description: '',
    offer_text: '',
    business_email: '',
    business_phone: '',
    website: '',
    store_type: 'both',
    product_categories: [] as string[],
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    profile_image_url: '',
    is_approved: true,
    is_sponsor: false,
    sponsor_order: 0,
    user_id: '',
    start_date: '',
    end_date: '',
  });

  // For user reassignment in edit modal
  const [editUserSearch, setEditUserSearch] = useState('');
  const [editUserResults, setEditUserResults] = useState<UserOption[]>([]);
  const [searchingEditUsers, setSearchingEditUsers] = useState(false);
  const [selectedEditUser, setSelectedEditUser] = useState<UserOption | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const userId = profile?.id;
    if (!userId) return;
    try {
      setLoading(true);
      const [retailersData, manufacturersData] = await Promise.all([
        adminGetAllRetailers(userId, true),
        adminGetAllManufacturers(userId, true),
      ]);
      setRetailers(retailersData);
      setManufacturers(manufacturersData);
    } catch (err: any) {
      console.error('Error fetching listings:', err);
      setError('Failed to load business listings');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, type: Tab) => {
    const userId = profile?.id;
    if (!userId) return;
    try {
      if (type === 'retailers') {
        await adminApproveRetailer(userId, id);
      } else {
        await adminApproveManufacturer(userId, id);
      }
      setSuccess(`${type === 'retailers' ? 'Retailer' : 'Manufacturer'} approved successfully`);
      await fetchData();
    } catch (err: any) {
      console.error('Error approving listing:', err);
      setError('Failed to approve listing');
    }
  };

  const handleToggleSponsor = async (listing: RetailerListing | ManufacturerListing, type: Tab) => {
    const userId = profile?.id;
    if (!userId) return;
    try {
      if (type === 'retailers') {
        await adminUpdateRetailer(userId, listing.id, {
          is_sponsor: !listing.isSponsor,
        });
      } else {
        await adminUpdateManufacturer(userId, listing.id, {
          is_sponsor: !listing.isSponsor,
        });
      }
      setSuccess(`Sponsor status updated successfully`);
      await fetchData();
    } catch (err: any) {
      console.error('Error updating sponsor status:', err);
      setError('Failed to update sponsor status');
    }
  };

  const handleToggleActive = async (listing: RetailerListing | ManufacturerListing, type: Tab) => {
    const userId = profile?.id;
    if (!userId) return;
    try {
      if (type === 'retailers') {
        await adminUpdateRetailer(userId, listing.id, {
          is_active: !listing.isActive,
        });
      } else {
        await adminUpdateManufacturer(userId, listing.id, {
          is_active: !listing.isActive,
        });
      }
      setSuccess(`Listing ${listing.isActive ? 'deactivated' : 'activated'} successfully`);
      await fetchData();
    } catch (err: any) {
      console.error('Error updating active status:', err);
      setError('Failed to update listing status');
    }
  };

  const handleDelete = async (id: string, type: Tab) => {
    const userId = profile?.id;
    if (!userId) return;
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      return;
    }

    try {
      if (type === 'retailers') {
        await adminDeleteRetailer(userId, id);
      } else {
        await adminDeleteManufacturer(userId, id);
      }
      setSuccess('Listing deleted successfully');
      await fetchData();
    } catch (err: any) {
      console.error('Error deleting listing:', err);
      setError('Failed to delete listing');
    }
  };

  // Search for users
  const handleUserSearch = async (query: string) => {
    setUserSearch(query);
    if (query.length < 2) {
      setUserResults([]);
      return;
    }

    try {
      setSearchingUsers(true);
      const results = await profilesApi.searchProfiles(query);
      setUserResults(
        results.map((p: any) => ({
          id: p.id,
          email: p.email,
          firstName: p.first_name,
          lastName: p.last_name,
        }))
      );
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Search for users in edit modal
  const handleEditUserSearch = async (query: string) => {
    setEditUserSearch(query);
    if (query.length < 2) {
      setEditUserResults([]);
      return;
    }

    try {
      setSearchingEditUsers(true);
      const results = await profilesApi.searchProfiles(query);
      setEditUserResults(
        results.map((p: any) => ({
          id: p.id,
          email: p.email,
          firstName: p.first_name,
          lastName: p.last_name,
        }))
      );
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearchingEditUsers(false);
    }
  };

  // Open create modal
  const openCreateModal = (type: Tab) => {
    setCreateType(type);
    setSelectedUser(null);
    setUserSearch('');
    setUserResults([]);
    setCreateForm({
      business_name: '',
      description: '',
      offer_text: '',
      business_email: '',
      business_phone: '',
      website: '',
      store_type: 'both',
      product_categories: [],
      street_address: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US',
      profile_image_url: '',
      is_approved: true,
      is_sponsor: false,
      sponsor_order: 0,
      start_date: '',
      end_date: '',
    });
    setShowCreateModal(true);
  };

  // Handle create listing
  const handleCreate = async () => {
    const userId = profile?.id;
    if (!userId || !selectedUser) {
      setError('Please select a user for this listing');
      return;
    }

    if (!createForm.business_name) {
      setError('Business name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (createType === 'retailers') {
        const newListing = await adminCreateRetailer(userId, {
          user_id: selectedUser.id,
          business_name: createForm.business_name,
          description: createForm.description,
          offer_text: createForm.offer_text,
          business_email: createForm.business_email || selectedUser.email,
          business_phone: createForm.business_phone,
          website: createForm.website,
          store_type: createForm.store_type,
          street_address: createForm.street_address,
          city: createForm.city,
          state: createForm.state,
          postal_code: createForm.postal_code,
          country: createForm.country,
          profile_image_url: createForm.profile_image_url,
          is_approved: createForm.is_approved,
        });
        // Set sponsor status and dates if enabled
        if (createForm.is_sponsor || createForm.start_date || createForm.end_date) {
          await adminUpdateRetailer(userId, newListing.id, {
            is_sponsor: createForm.is_sponsor,
            sponsor_order: createForm.sponsor_order,
            start_date: createForm.start_date || undefined,
            end_date: createForm.end_date || undefined,
          });
        }
      } else {
        const newListing = await adminCreateManufacturer(userId, {
          user_id: selectedUser.id,
          business_name: createForm.business_name,
          description: createForm.description,
          business_email: createForm.business_email || selectedUser.email,
          business_phone: createForm.business_phone,
          website: createForm.website,
          product_categories: createForm.product_categories,
          street_address: createForm.street_address,
          city: createForm.city,
          state: createForm.state,
          postal_code: createForm.postal_code,
          country: createForm.country,
          profile_image_url: createForm.profile_image_url,
          is_approved: createForm.is_approved,
        });
        // Set sponsor status and dates if enabled
        if (createForm.is_sponsor || createForm.start_date || createForm.end_date) {
          await adminUpdateManufacturer(userId, newListing.id, {
            is_sponsor: createForm.is_sponsor,
            sponsor_order: createForm.sponsor_order,
            start_date: createForm.start_date || undefined,
            end_date: createForm.end_date || undefined,
          });
        }
      }

      setSuccess(`${createType === 'retailers' ? 'Retailer' : 'Manufacturer'} listing created successfully`);
      setShowCreateModal(false);
      setSearchTerm(''); // Clear search to show all listings including the new one
      await fetchData();
    } catch (err: any) {
      console.error('Error creating listing:', err);
      setError('Failed to create listing');
    } finally {
      setSaving(false);
    }
  };

  // Open edit modal
  const openEditModal = (listing: RetailerListing | ManufacturerListing, type: Tab) => {
    setEditType(type);
    setEditingListing(listing);

    // Format dates for input fields (YYYY-MM-DD)
    const formatDate = (date: Date | string | undefined): string => {
      if (!date) return '';
      const d = new Date(date);
      return d.toISOString().split('T')[0];
    };

    // Normalize country code (handle legacy 'USA' values)
    const normalizeCountry = (country: string | undefined): string => {
      if (!country) return 'US';
      const upper = country.toUpperCase();
      if (upper === 'USA' || upper === 'UNITED STATES') return 'US';
      if (upper === 'CANADA') return 'CA';
      if (upper === 'MEXICO') return 'MX';
      if (upper === 'UNITED KINGDOM' || upper === 'UK') return 'GB';
      return country; // Return as-is if already an ISO code
    };

    setEditForm({
      business_name: listing.businessName || '',
      description: listing.description || '',
      offer_text: 'offerText' in listing ? (listing as any).offerText || '' : '',
      business_email: listing.businessEmail || '',
      business_phone: listing.businessPhone || '',
      website: listing.website || '',
      store_type: 'storeType' in listing ? listing.storeType : 'both',
      product_categories: 'productCategories' in listing ? listing.productCategories || [] : [],
      street_address: listing.streetAddress || '',
      city: listing.city || '',
      state: listing.state || '',
      postal_code: listing.postalCode || '',
      country: normalizeCountry(listing.country),
      profile_image_url: listing.profileImageUrl || '',
      is_approved: listing.isApproved,
      is_sponsor: listing.isSponsor,
      sponsor_order: listing.sponsorOrder || 0,
      user_id: listing.user?.id || '',
      start_date: formatDate(listing.startDate),
      end_date: formatDate(listing.endDate),
    });

    // Set the selected user for the reassignment dropdown
    if (listing.user) {
      setSelectedEditUser({
        id: listing.user.id,
        email: listing.user.email,
        firstName: listing.user.first_name,
        lastName: listing.user.last_name,
      });
    } else {
      setSelectedEditUser(null);
    }

    setEditUserSearch('');
    setEditUserResults([]);
    setShowEditModal(true);
  };

  // Handle convert listing type (retailer <-> manufacturer)
  const handleConvertListingType = async () => {
    const userId = profile?.id;
    if (!userId || !editingListing) return;

    const currentType = editType;
    const newType = currentType === 'retailers' ? 'manufacturers' : 'retailers';
    const confirmMessage = `Are you sure you want to convert this ${currentType === 'retailers' ? 'Retailer' : 'Manufacturer'} to a ${newType === 'retailers' ? 'Retailer' : 'Manufacturer'}?\n\nThis will delete the current listing and create a new one.`;

    if (!confirm(confirmMessage)) return;

    try {
      setSaving(true);
      setError(null);

      // Get the user ID from the listing
      const listingUserId = editingListing.user?.id;
      if (!listingUserId) {
        setError('Cannot convert: listing has no associated user');
        return;
      }

      // Delete the current listing
      if (currentType === 'retailers') {
        await adminDeleteRetailer(userId, editingListing.id);
      } else {
        await adminDeleteManufacturer(userId, editingListing.id);
      }

      // Create new listing of the other type
      let newListing;
      if (newType === 'retailers') {
        newListing = await adminCreateRetailer(userId, {
          user_id: listingUserId,
          business_name: editForm.business_name,
          description: editForm.description,
          business_email: editForm.business_email,
          business_phone: editForm.business_phone,
          website: editForm.website,
          store_type: editForm.store_type || 'both',
          street_address: editForm.street_address,
          city: editForm.city,
          state: editForm.state,
          postal_code: editForm.postal_code,
          country: editForm.country,
          profile_image_url: editForm.profile_image_url,
          is_approved: editForm.is_approved,
        });
        // Preserve sponsor status
        if (editForm.is_sponsor) {
          await adminUpdateRetailer(userId, newListing.id, {
            is_sponsor: editForm.is_sponsor,
            sponsor_order: editForm.sponsor_order,
          });
        }
      } else {
        newListing = await adminCreateManufacturer(userId, {
          user_id: listingUserId,
          business_name: editForm.business_name,
          description: editForm.description,
          business_email: editForm.business_email,
          business_phone: editForm.business_phone,
          website: editForm.website,
          product_categories: editForm.product_categories || [],
          street_address: editForm.street_address,
          city: editForm.city,
          state: editForm.state,
          postal_code: editForm.postal_code,
          country: editForm.country,
          profile_image_url: editForm.profile_image_url,
          is_approved: editForm.is_approved,
        });
        // Preserve sponsor status
        if (editForm.is_sponsor) {
          await adminUpdateManufacturer(userId, newListing.id, {
            is_sponsor: editForm.is_sponsor,
            sponsor_order: editForm.sponsor_order,
          });
        }
      }

      setSuccess(`Successfully converted to ${newType === 'retailers' ? 'Retailer' : 'Manufacturer'}`);
      setShowEditModal(false);
      setEditingListing(null);
      setActiveTab(newType);
      await fetchData();
    } catch (err: any) {
      console.error('Error converting listing:', err);
      setError('Failed to convert listing type');
    } finally {
      setSaving(false);
    }
  };

  // Handle edit listing
  const handleEdit = async () => {
    const userId = profile?.id;
    if (!userId || !editingListing) {
      return;
    }

    if (!editForm.business_name) {
      setError('Business name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (editType === 'retailers') {
        await adminUpdateRetailer(userId, editingListing.id, {
          business_name: editForm.business_name,
          description: editForm.description,
          offer_text: editForm.offer_text,
          business_email: editForm.business_email,
          business_phone: editForm.business_phone,
          website: editForm.website,
          store_type: editForm.store_type,
          street_address: editForm.street_address,
          city: editForm.city,
          state: editForm.state,
          postal_code: editForm.postal_code,
          country: editForm.country,
          profile_image_url: editForm.profile_image_url,
          is_approved: editForm.is_approved,
          is_sponsor: editForm.is_sponsor,
          sponsor_order: editForm.sponsor_order,
          user_id: selectedEditUser?.id || editForm.user_id,
          start_date: editForm.start_date || undefined,
          end_date: editForm.end_date || undefined,
        });
      } else {
        await adminUpdateManufacturer(userId, editingListing.id, {
          business_name: editForm.business_name,
          description: editForm.description,
          business_email: editForm.business_email,
          business_phone: editForm.business_phone,
          website: editForm.website,
          product_categories: editForm.product_categories,
          street_address: editForm.street_address,
          city: editForm.city,
          state: editForm.state,
          postal_code: editForm.postal_code,
          country: editForm.country,
          profile_image_url: editForm.profile_image_url,
          is_approved: editForm.is_approved,
          is_sponsor: editForm.is_sponsor,
          sponsor_order: editForm.sponsor_order,
          user_id: selectedEditUser?.id || editForm.user_id,
          start_date: editForm.start_date || undefined,
          end_date: editForm.end_date || undefined,
        });
      }

      setSuccess(`${editType === 'retailers' ? 'Retailer' : 'Manufacturer'} listing updated successfully`);
      setShowEditModal(false);
      setEditingListing(null);
      setSearchTerm(''); // Clear search to show all listings
      await fetchData();
    } catch (err: any) {
      console.error('Error updating listing:', err);
      setError('Failed to update listing');
    } finally {
      setSaving(false);
    }
  };

  const filteredRetailers = retailers.filter((r) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      r.businessName.toLowerCase().includes(search) ||
      r.city?.toLowerCase().includes(search) ||
      r.state?.toLowerCase().includes(search) ||
      r.user?.email?.toLowerCase().includes(search) ||
      r.businessEmail?.toLowerCase().includes(search);

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'pending' && !r.isApproved) ||
      (filterStatus === 'approved' && r.isApproved);

    return matchesSearch && matchesStatus;
  });

  const filteredManufacturers = manufacturers.filter((m) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      m.businessName.toLowerCase().includes(search) ||
      m.city?.toLowerCase().includes(search) ||
      m.state?.toLowerCase().includes(search) ||
      m.user?.email?.toLowerCase().includes(search) ||
      m.businessEmail?.toLowerCase().includes(search);

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'pending' && !m.isApproved) ||
      (filterStatus === 'approved' && m.isApproved);

    return matchesSearch && matchesStatus;
  });

  const pendingRetailers = retailers.filter((r) => !r.isApproved).length;
  const pendingManufacturers = manufacturers.filter((m) => !m.isApproved).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  const renderListingRow = (listing: RetailerListing | ManufacturerListing, type: Tab) => (
    <tr key={listing.id} className="border-b border-slate-700 hover:bg-slate-700/50">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          {listing.profileImageUrl ? (
            <img
              src={listing.profileImageUrl}
              alt={listing.businessName}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
              {type === 'retailers' ? (
                <Store className="h-5 w-5 text-slate-500" />
              ) : (
                <Factory className="h-5 w-5 text-slate-500" />
              )}
            </div>
          )}
          <div>
            <p className="text-white font-medium">{listing.businessName}</p>
            <p className="text-gray-400 text-sm">
              {[listing.city, listing.state].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          {listing.isApproved ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full">
              <CheckCircle className="h-3 w-3" />
              Approved
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-full">
              <Clock className="h-3 w-3" />
              Pending
            </span>
          )}
          {!listing.isActive && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-full">
              <XCircle className="h-3 w-3" />
              Inactive
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        {listing.isSponsor ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/10 text-orange-400 text-xs rounded-full">
            <Star className="h-3 w-3 fill-current" />
            Sponsor
          </span>
        ) : (
          <span className="text-gray-500 text-sm">-</span>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          {!listing.isApproved && (
            <button
              onClick={() => handleApprove(listing.id, type)}
              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              title="Approve"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => openEditModal(listing, type)}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleToggleSponsor(listing, type)}
            className={`p-2 ${
              listing.isSponsor
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-slate-600 hover:bg-slate-500'
            } text-white rounded-lg transition-colors`}
            title={listing.isSponsor ? 'Remove Sponsor' : 'Make Sponsor'}
          >
            <Award className="h-4 w-4" />
          </button>
          <button
            onClick={() =>
              navigate(type === 'retailers' ? `/retailers/${listing.id}` : `/manufacturers/${listing.id}`)
            }
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleToggleActive(listing, type)}
            className={`p-2 ${
              listing.isActive
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-green-600 hover:bg-green-700'
            } text-white rounded-lg transition-colors`}
            title={listing.isActive ? 'Deactivate' : 'Activate'}
          >
            {listing.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          </button>
          <button
            onClick={() => handleDelete(listing.id, type)}
            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Business Listings Management</h1>
            <p className="text-gray-400">Manage retailer and manufacturer directory listings</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </button>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Store className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Retailers</p>
                <p className="text-white font-semibold text-2xl">{retailers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Pending Retailers</p>
                <p className="text-white font-semibold text-2xl">{pendingRetailers}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center">
                <Factory className="h-6 w-6 text-cyan-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Manufacturers</p>
                <p className="text-white font-semibold text-2xl">{manufacturers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Pending Manufacturers</p>
                <p className="text-white font-semibold text-2xl">{pendingManufacturers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs and Add Button */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('retailers')}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-lg font-medium transition-colors ${
                activeTab === 'retailers'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-800 text-gray-400 hover:text-white'
              }`}
            >
              <Store className="h-5 w-5" />
              Retailers
              {pendingRetailers > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-black text-xs rounded-full">
                  {pendingRetailers}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('manufacturers')}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-lg font-medium transition-colors ${
                activeTab === 'manufacturers'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-gray-400 hover:text-white'
              }`}
            >
              <Factory className="h-5 w-5" />
              Manufacturers
              {pendingManufacturers > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-black text-xs rounded-full">
                  {pendingManufacturers}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={() => openCreateModal(activeTab)}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-lg font-medium transition-colors bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-5 w-5" />
            Add New Listing
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by business name or location..."
              className="w-full pl-12 pr-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'approved')}
            className="px-4 py-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
          </select>
        </div>

        {/* Listings Table */}
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Business</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Status</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Sponsor</th>
                <th className="px-4 py-3 text-left text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeTab === 'retailers' ? (
                filteredRetailers.length > 0 ? (
                  filteredRetailers.map((r) => renderListingRow(r, 'retailers'))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      No retailers found
                    </td>
                  </tr>
                )
              ) : filteredManufacturers.length > 0 ? (
                filteredManufacturers.map((m) => renderListingRow(m, 'manufacturers'))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No manufacturers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <Plus className="h-6 w-6 text-green-500" />
                <h2 className="text-xl font-bold text-white">
                  Add New Business Listing
                </h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Listing Type Selector */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Listing Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateType('retailers')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                      createType === 'retailers'
                        ? 'bg-orange-600 text-white ring-2 ring-orange-400'
                        : 'bg-slate-700 text-gray-400 hover:bg-slate-600 hover:text-white'
                    }`}
                  >
                    <Store className="h-5 w-5" />
                    Retailer
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateType('manufacturers')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                      createType === 'manufacturers'
                        ? 'bg-cyan-600 text-white ring-2 ring-cyan-400'
                        : 'bg-slate-700 text-gray-400 hover:bg-slate-600 hover:text-white'
                    }`}
                  >
                    <Factory className="h-5 w-5" />
                    Manufacturer
                  </button>
                </div>
              </div>

              {/* User Selection */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Assign to User *
                </label>
                {selectedUser ? (
                  <div className="flex items-center justify-between bg-slate-700 rounded-lg p-3">
                    <div>
                      <p className="text-white font-medium">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </p>
                      <p className="text-gray-400 text-sm">{selectedUser.email}</p>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => handleUserSearch(e.target.value)}
                      placeholder="Search by name or email..."
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                    {searchingUsers && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-orange-500 border-r-transparent"></div>
                      </div>
                    )}
                    {userResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 rounded-lg border border-slate-600 max-h-48 overflow-y-auto z-10">
                        {userResults.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => {
                              setSelectedUser(user);
                              setUserSearch('');
                              setUserResults([]);
                              setCreateForm((prev) => ({
                                ...prev,
                                business_email: user.email,
                              }));
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-600 first:rounded-t-lg last:rounded-b-lg"
                          >
                            <p className="text-white">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-gray-400 text-sm">{user.email}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={createForm.business_name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, business_name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  placeholder="Business name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
                  placeholder="Business description..."
                />
              </div>

              {/* Special Offer - Retailers Only */}
              {createType === 'retailers' && (
                <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-500/30 rounded-lg p-4">
                  <label className="block text-red-400 text-sm font-medium mb-2">
                    🏷️ Special Offer for MECA Members (Optional)
                  </label>
                  <textarea
                    value={createForm.offer_text}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, offer_text: e.target.value })
                    }
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none"
                    placeholder="e.g., 10% off all purchases with code MECA10, Free shipping on orders over $50..."
                  />
                  <p className="text-gray-500 text-xs mt-2">
                    Enter any special discount, coupon code, or offer available to MECA members. This will be prominently displayed on the listing.
                  </p>
                </div>
              )}

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Business Email
                  </label>
                  <input
                    type="email"
                    value={createForm.business_email}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, business_email: e.target.value })
                    }
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
                    value={createForm.business_phone}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, business_phone: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={createForm.website}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, website: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  placeholder="https://www.business.com"
                />
              </div>

              {/* Store Type (for retailers only) */}
              {createType === 'retailers' && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Store Type
                  </label>
                  <select
                    value={createForm.store_type}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, store_type: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  >
                    <option value="brick_and_mortar">Physical Store Only</option>
                    <option value="online">Online Only</option>
                    <option value="both">Physical & Online</option>
                  </select>
                </div>
              )}

              {/* Product Categories (for manufacturers only) */}
              {createType === 'manufacturers' && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Product Categories
                  </label>
                  <input
                    type="text"
                    value={createForm.product_categories.join(', ')}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        product_categories: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                    placeholder="Amplifiers, Subwoofers, Speakers (comma separated)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter categories separated by commas
                  </p>
                </div>
              )}

              {/* Location - ISO Standard: Country, Address, City, State, Postal Code */}
              <CountrySelect
                value={createForm.country}
                onChange={(code) =>
                  setCreateForm({ ...createForm, country: code, state: '' })
                }
                label="Country"
              />

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  value={createForm.street_address}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, street_address: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={createForm.city}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, city: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    placeholder="City"
                  />
                </div>
                <StateProvinceSelect
                  value={createForm.state}
                  onChange={(code) =>
                    setCreateForm({ ...createForm, state: code })
                  }
                  country={createForm.country}
                  showIcon={false}
                />
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    {getPostalCodeLabel(createForm.country)}
                  </label>
                  <input
                    type="text"
                    value={createForm.postal_code}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, postal_code: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    placeholder="12345"
                  />
                </div>
              </div>

              {/* Profile Image URL */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Profile/Logo Image URL
                </label>
                <input
                  type="url"
                  value={createForm.profile_image_url}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, profile_image_url: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  placeholder="https://..."
                />
              </div>

              {/* Admin Options */}
              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Admin Options</h3>

                <div className="space-y-4">
                  {/* Auto-approve checkbox */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="is_approved"
                      checked={createForm.is_approved}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, is_approved: e.target.checked })
                      }
                      className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500"
                    />
                    <label htmlFor="is_approved" className="text-gray-300">
                      Auto-approve this listing (visible in directory)
                    </label>
                  </div>

                  {/* Sponsor checkbox */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="create_is_sponsor"
                      checked={createForm.is_sponsor}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, is_sponsor: e.target.checked })
                      }
                      className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-orange-500"
                    />
                    <label htmlFor="create_is_sponsor" className="text-gray-300">
                      Featured Sponsor (shown on homepage carousel)
                    </label>
                  </div>

                  {/* Sponsor Order */}
                  {createForm.is_sponsor && (
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Sponsor Display Order
                      </label>
                      <input
                        type="number"
                        value={createForm.sponsor_order}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, sponsor_order: parseInt(e.target.value) || 0 })
                        }
                        min="0"
                        className="w-32 px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                      />
                      <p className="text-gray-500 text-xs mt-1">Lower numbers appear first</p>
                    </div>
                  )}

                  {/* Listing Validity Period */}
                  <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600 mt-4">
                    <label className="block text-gray-300 text-sm font-medium mb-3">
                      Listing Validity Period (Optional)
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">Start Date</label>
                        <input
                          type="date"
                          value={createForm.start_date}
                          onChange={(e) =>
                            setCreateForm({ ...createForm, start_date: e.target.value })
                          }
                          className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs mb-1">End Date</label>
                        <input
                          type="date"
                          value={createForm.end_date}
                          onChange={(e) =>
                            setCreateForm({ ...createForm, end_date: e.target.value })
                          }
                          className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Set the listing's validity period. Leave blank for no expiration.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-4 p-6 border-t border-slate-700">
              <button
                onClick={handleCreate}
                disabled={saving || !selectedUser || !createForm.business_name}
                className={`flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base ${
                  createType === 'retailers'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-cyan-600 hover:bg-cyan-700'
                } text-white font-semibold rounded-lg transition-colors disabled:opacity-50`}
              >
                <Save className="h-5 w-5" />
                {saving ? 'Creating...' : 'Create Listing'}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingListing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                {editType === 'retailers' ? (
                  <Store className="h-6 w-6 text-orange-500" />
                ) : (
                  <Factory className="h-6 w-6 text-cyan-500" />
                )}
                <h2 className="text-xl font-bold text-white">
                  Edit {editType === 'retailers' ? 'Retailer' : 'Manufacturer'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingListing(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Assigned User */}
              <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Assigned User
                </label>
                {selectedEditUser ? (
                  <div className="flex items-center justify-between bg-slate-700 rounded-lg p-3">
                    <div>
                      <p className="text-white font-medium">
                        {selectedEditUser.firstName} {selectedEditUser.lastName}
                      </p>
                      <p className="text-gray-400 text-sm">{selectedEditUser.email}</p>
                    </div>
                    <button
                      onClick={() => setSelectedEditUser(null)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={editUserSearch}
                      onChange={(e) => handleEditUserSearch(e.target.value)}
                      placeholder="Search for a different user..."
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                    {searchingEditUsers && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-orange-500 border-r-transparent"></div>
                      </div>
                    )}
                    {editUserResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 rounded-lg border border-slate-600 max-h-48 overflow-y-auto z-10">
                        {editUserResults.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => {
                              setSelectedEditUser(user);
                              setEditUserSearch('');
                              setEditUserResults([]);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-600 first:rounded-t-lg last:rounded-b-lg"
                          >
                            <p className="text-white">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-gray-400 text-sm">{user.email}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Listing Dates */}
              <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <label className="block text-gray-300 text-sm font-medium mb-3">
                  Listing Validity Period
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Start Date</label>
                    <input
                      type="date"
                      value={editForm.start_date}
                      onChange={(e) =>
                        setEditForm({ ...editForm, start_date: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">End Date</label>
                    <input
                      type="date"
                      value={editForm.end_date}
                      onChange={(e) =>
                        setEditForm({ ...editForm, end_date: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  These dates will eventually sync with membership dates when the member system is complete.
                </p>
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={editForm.business_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, business_name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  placeholder="Business name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
                  placeholder="Business description..."
                />
              </div>

              {/* Special Offer - Retailers Only */}
              {editType === 'retailers' && (
                <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-500/30 rounded-lg p-4">
                  <label className="block text-red-400 text-sm font-medium mb-2">
                    🏷️ Special Offer for MECA Members (Optional)
                  </label>
                  <textarea
                    value={editForm.offer_text}
                    onChange={(e) =>
                      setEditForm({ ...editForm, offer_text: e.target.value })
                    }
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg border border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none"
                    placeholder="e.g., 10% off all purchases with code MECA10, Free shipping on orders over $50..."
                  />
                  <p className="text-gray-500 text-xs mt-2">
                    Enter any special discount, coupon code, or offer available to MECA members. This will be prominently displayed on the listing.
                  </p>
                </div>
              )}

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Business Email
                  </label>
                  <input
                    type="email"
                    value={editForm.business_email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, business_email: e.target.value })
                    }
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
                    value={editForm.business_phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, business_phone: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Website */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={editForm.website}
                  onChange={(e) =>
                    setEditForm({ ...editForm, website: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  placeholder="https://www.business.com"
                />
              </div>

              {/* Store Type (for retailers only) */}
              {editType === 'retailers' && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Store Type
                  </label>
                  <select
                    value={editForm.store_type}
                    onChange={(e) =>
                      setEditForm({ ...editForm, store_type: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  >
                    <option value="brick_and_mortar">Physical Store Only</option>
                    <option value="online">Online Only</option>
                    <option value="both">Physical & Online</option>
                  </select>
                </div>
              )}

              {/* Product Categories (for manufacturers only) */}
              {editType === 'manufacturers' && (
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Product Categories
                  </label>
                  <input
                    type="text"
                    value={editForm.product_categories.join(', ')}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        product_categories: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                    placeholder="Amplifiers, Subwoofers, Speakers (comma separated)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter categories separated by commas
                  </p>
                </div>
              )}

              {/* Location - ISO Standard: Country, Address, City, State, Postal Code */}
              <CountrySelect
                value={editForm.country}
                onChange={(code) =>
                  setEditForm({ ...editForm, country: code, state: '' })
                }
                label="Country"
              />

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  value={editForm.street_address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, street_address: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) =>
                      setEditForm({ ...editForm, city: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    placeholder="City"
                  />
                </div>
                <StateProvinceSelect
                  value={editForm.state}
                  onChange={(code) =>
                    setEditForm({ ...editForm, state: code })
                  }
                  country={editForm.country}
                  showIcon={false}
                />
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    {getPostalCodeLabel(editForm.country)}
                  </label>
                  <input
                    type="text"
                    value={editForm.postal_code}
                    onChange={(e) =>
                      setEditForm({ ...editForm, postal_code: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    placeholder="12345"
                  />
                </div>
              </div>

              {/* Profile Image URL */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Profile/Logo Image URL
                </label>
                <input
                  type="url"
                  value={editForm.profile_image_url}
                  onChange={(e) =>
                    setEditForm({ ...editForm, profile_image_url: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  placeholder="https://..."
                />
                {editForm.profile_image_url && (
                  <div className="mt-3">
                    <img
                      src={editForm.profile_image_url}
                      alt="Profile preview"
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Admin Options */}
              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Admin Options</h3>

                <div className="space-y-4">
                  {/* Approved checkbox */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="edit_is_approved"
                      checked={editForm.is_approved}
                      onChange={(e) =>
                        setEditForm({ ...editForm, is_approved: e.target.checked })
                      }
                      className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500"
                    />
                    <label htmlFor="edit_is_approved" className="text-gray-300">
                      Approved (visible in directory)
                    </label>
                  </div>

                  {/* Sponsor checkbox */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="edit_is_sponsor"
                      checked={editForm.is_sponsor}
                      onChange={(e) =>
                        setEditForm({ ...editForm, is_sponsor: e.target.checked })
                      }
                      className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-orange-500"
                    />
                    <label htmlFor="edit_is_sponsor" className="text-gray-300">
                      Featured Sponsor (shown on homepage carousel)
                    </label>
                  </div>

                  {/* Sponsor Order */}
                  {editForm.is_sponsor && (
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Sponsor Display Order
                      </label>
                      <input
                        type="number"
                        value={editForm.sponsor_order}
                        onChange={(e) =>
                          setEditForm({ ...editForm, sponsor_order: parseInt(e.target.value) || 0 })
                        }
                        min="0"
                        className="w-32 px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                      />
                      <p className="text-gray-500 text-xs mt-1">Lower numbers appear first</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col gap-4 p-6 border-t border-slate-700">
              <div className="flex gap-4">
                <button
                  onClick={handleEdit}
                  disabled={saving || !editForm.business_name}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base ${
                    editType === 'retailers'
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-cyan-600 hover:bg-cyan-700'
                  } text-white font-semibold rounded-lg transition-colors disabled:opacity-50`}
                >
                  <Save className="h-5 w-5" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingListing(null);
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
              <button
                onClick={handleConvertListingType}
                disabled={saving}
                className={`w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base ${
                  editType === 'retailers'
                    ? 'bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-600/50'
                    : 'bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-600/50'
                } font-medium rounded-lg transition-colors disabled:opacity-50`}
              >
                {editType === 'retailers' ? (
                  <>
                    <Factory className="h-5 w-5" />
                    Convert to Manufacturer
                  </>
                ) : (
                  <>
                    <Store className="h-5 w-5" />
                    Convert to Retailer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
