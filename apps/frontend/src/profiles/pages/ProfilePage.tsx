import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, Shield, CreditCard, Lock, ArrowLeft, Phone, MapPin, Building, Pencil, Save, X, Users, Car, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/auth';
import ChangePassword from '@/profiles/components/ChangePassword';
import { CountrySelect, StateProvinceSelect, PhoneInput } from '@/shared/fields';
import { MecaIdSwitcher } from '@/shared/components';
import { profilesApi, Profile as ProfileType } from '../profiles.api-client';
import { membershipsApi, ControlledMecaId, Membership } from '@/memberships';
import { countries, getStatesForCountry } from '@/utils/countries';

// Helper to get country name from code
function getCountryName(code: string): string {
  if (!code) return 'Not set';
  const country = countries.find(c => c.code === code);
  return country?.name || code;
}

// Helper to get state/province name from code
function getStateName(stateCode: string, countryCode: string): string {
  if (!stateCode) return 'Not set';
  const states = getStatesForCountry(countryCode);
  const state = states.find((s: { code: string; name: string }) => s.code === stateCode);
  return state?.name || stateCode;
}

interface AddressFormData {
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  billing_street: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  billing_country: string;
}

interface SecondaryFormData {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface VehicleFormData {
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleLicensePlate: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile switching state
  const [controlledMecaIds, setControlledMecaIds] = useState<ControlledMecaId[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ProfileType | null>(null);
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isViewingSecondary, setIsViewingSecondary] = useState(false);

  // Primary user's membership (for vehicle info)
  const [primaryMembership, setPrimaryMembership] = useState<Membership | null>(null);

  const [formData, setFormData] = useState<AddressFormData>({
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    billing_street: '',
    billing_city: '',
    billing_state: '',
    billing_zip: '',
    billing_country: '',
  });

  const [secondaryFormData, setSecondaryFormData] = useState<SecondaryFormData>({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
  });

  const [vehicleFormData, setVehicleFormData] = useState<VehicleFormData>({
    vehicleMake: '',
    vehicleModel: '',
    vehicleColor: '',
    vehicleLicensePlate: '',
  });

  // Load controlled MECA IDs and primary membership
  useEffect(() => {
    const loadControlledMecaIds = async () => {
      if (!profile?.id) return;
      try {
        const mecaIds = await membershipsApi.getControlledMecaIds(profile.id);
        setControlledMecaIds(mecaIds);

        // Load primary membership for vehicle info
        const ownMecaId = mecaIds.find(m => m.isOwn);
        if (ownMecaId) {
          const membership = await membershipsApi.getById(ownMecaId.membershipId);
          setPrimaryMembership(membership);
          // Initialize vehicle form data for primary user
          setVehicleFormData({
            vehicleMake: membership.vehicleMake || '',
            vehicleModel: membership.vehicleModel || '',
            vehicleColor: membership.vehicleColor || '',
            vehicleLicensePlate: membership.vehicleLicensePlate || '',
          });
        }
      } catch (error) {
        console.error('Failed to load controlled MECA IDs:', error);
      }
    };
    loadControlledMecaIds();
  }, [profile?.id]);

  // Initialize form data when profile loads or changes
  useEffect(() => {
    if (profile && !isViewingSecondary) {
      setFormData({
        phone: profile.phone || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        postal_code: profile.postal_code || '',
        country: profile.country || '',
        billing_street: profile.billing_street || '',
        billing_city: profile.billing_city || '',
        billing_state: profile.billing_state || '',
        billing_zip: profile.billing_zip || '',
        billing_country: profile.billing_country || '',
      });
    }
  }, [profile, isViewingSecondary]);

  // Load secondary profile and membership when switching
  const handleProfileSwitch = async (_mecaId: number, membershipId: string, profileId: string, _competitorName: string) => {
    setIsEditing(false);

    // Check if switching back to own profile
    const ownMecaId = controlledMecaIds.find(m => m.isOwn);
    const isOwnProfile = ownMecaId && ownMecaId.profileId === profileId;

    if (isOwnProfile) {
      setIsViewingSecondary(false);
      setSelectedProfile(null);
      setSelectedMembership(null);
      return;
    }

    // Loading secondary profile
    setLoadingProfile(true);
    setIsViewingSecondary(true);

    try {
      // Load the secondary's profile
      const secondaryProfile = await profilesApi.getById(profileId);
      setSelectedProfile(secondaryProfile);

      // Load the membership for vehicle info
      const membership = await membershipsApi.getById(membershipId);
      setSelectedMembership(membership);

      // Initialize secondary form data
      setSecondaryFormData({
        first_name: secondaryProfile.first_name || '',
        last_name: secondaryProfile.last_name || '',
        phone: secondaryProfile.phone || '',
        address: secondaryProfile.address || '',
        city: secondaryProfile.city || '',
        state: secondaryProfile.state || '',
        postal_code: secondaryProfile.postal_code || '',
        country: secondaryProfile.country || '',
      });

      // Initialize vehicle form data from membership
      setVehicleFormData({
        vehicleMake: membership.vehicleMake || '',
        vehicleModel: membership.vehicleModel || '',
        vehicleColor: membership.vehicleColor || '',
        vehicleLicensePlate: membership.vehicleLicensePlate || '',
      });
    } catch (error) {
      console.error('Failed to load secondary profile:', error);
      alert('Failed to load secondary profile. Please try again.');
      setIsViewingSecondary(false);
      setSelectedProfile(null);
      setSelectedMembership(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (isViewingSecondary && selectedProfile && selectedMembership) {
        // Save secondary profile
        await profilesApi.update(selectedProfile.id, {
          first_name: secondaryFormData.first_name,
          last_name: secondaryFormData.last_name,
          phone: secondaryFormData.phone,
          address: secondaryFormData.address,
          city: secondaryFormData.city,
          state: secondaryFormData.state,
          postal_code: secondaryFormData.postal_code,
          country: secondaryFormData.country,
        });

        // Save vehicle info via membership update
        await membershipsApi.updateVehicleInfo(selectedMembership.id, {
          vehicleMake: vehicleFormData.vehicleMake,
          vehicleModel: vehicleFormData.vehicleModel,
          vehicleColor: vehicleFormData.vehicleColor,
          vehicleLicensePlate: vehicleFormData.vehicleLicensePlate,
        });

        // Reload the secondary profile and membership
        const updatedProfile = await profilesApi.getById(selectedProfile.id);
        const updatedMembership = await membershipsApi.getById(selectedMembership.id);
        setSelectedProfile(updatedProfile);
        setSelectedMembership(updatedMembership);
      } else if (profile?.id) {
        // Save own profile
        await profilesApi.update(profile.id, formData);

        // Save vehicle info for primary membership
        if (primaryMembership) {
          await membershipsApi.updateVehicleInfo(primaryMembership.id, {
            vehicleMake: vehicleFormData.vehicleMake,
            vehicleModel: vehicleFormData.vehicleModel,
            vehicleColor: vehicleFormData.vehicleColor,
            vehicleLicensePlate: vehicleFormData.vehicleLicensePlate,
          });
          // Reload the primary membership
          const updatedMembership = await membershipsApi.getById(primaryMembership.id);
          setPrimaryMembership(updatedMembership);
        }

        await refreshProfile();
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isViewingSecondary && selectedProfile && selectedMembership) {
      // Reset secondary form data
      setSecondaryFormData({
        first_name: selectedProfile.first_name || '',
        last_name: selectedProfile.last_name || '',
        phone: selectedProfile.phone || '',
        address: selectedProfile.address || '',
        city: selectedProfile.city || '',
        state: selectedProfile.state || '',
        postal_code: selectedProfile.postal_code || '',
        country: selectedProfile.country || '',
      });
      setVehicleFormData({
        vehicleMake: selectedMembership.vehicleMake || '',
        vehicleModel: selectedMembership.vehicleModel || '',
        vehicleColor: selectedMembership.vehicleColor || '',
        vehicleLicensePlate: selectedMembership.vehicleLicensePlate || '',
      });
    } else if (profile) {
      // Reset own profile form data
      setFormData({
        phone: profile.phone || '',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        postal_code: profile.postal_code || '',
        country: profile.country || '',
        billing_street: profile.billing_street || '',
        billing_city: profile.billing_city || '',
        billing_state: profile.billing_state || '',
        billing_zip: profile.billing_zip || '',
        billing_country: profile.billing_country || '',
      });
      // Reset vehicle form data for primary user
      if (primaryMembership) {
        setVehicleFormData({
          vehicleMake: primaryMembership.vehicleMake || '',
          vehicleModel: primaryMembership.vehicleModel || '',
          vehicleColor: primaryMembership.vehicleColor || '',
          vehicleLicensePlate: primaryMembership.vehicleLicensePlate || '',
        });
      }
    }
    setIsEditing(false);
  };

  if (!profile || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  // Loading state when switching profiles
  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  // For secondary profiles, we need the data loaded
  if (isViewingSecondary && (!selectedProfile || !selectedMembership)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Failed to load profile data.</p>
          <button
            onClick={() => {
              setIsViewingSecondary(false);
              setSelectedProfile(null);
              setSelectedMembership(null);
            }}
            className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
          >
            Return to My Profile
          </button>
        </div>
      </div>
    );
  }

  const hasMultipleMecaIds = controlledMecaIds.length > 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-400">
            {isViewingSecondary ? 'Secondary Member Profile' : 'Account Settings'}
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>

        {/* Profile Switcher for Master Accounts */}
        {hasMultipleMecaIds && (
          <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="text-sm font-medium text-white">Manage Profiles</p>
                  <p className="text-xs text-gray-400">
                    You have {controlledMecaIds.length - 1} secondary member{controlledMecaIds.length - 1 !== 1 ? 's' : ''} under your account
                  </p>
                </div>
              </div>
              <MecaIdSwitcher
                userId={profile.id}
                onMecaIdChange={handleProfileSwitch}
              />
            </div>
          </div>
        )}

        {/* Secondary Profile Banner */}
        {isViewingSecondary && selectedProfile && (
          <div className="mb-6 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="text-sm font-medium text-purple-300">
                    Viewing Secondary Member Profile
                  </p>
                  <p className="text-white font-medium">
                    {selectedProfile.first_name} {selectedProfile.last_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsViewingSecondary(false);
                  setSelectedProfile(null);
                  setSelectedMembership(null);
                  setIsEditing(false);
                }}
                className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm transition-colors"
              >
                Back to My Profile
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
              {isViewingSecondary ? `${selectedProfile?.first_name || ''} ${selectedProfile?.last_name || ''}`.trim() || 'Secondary Member' : 'My Account'}
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">
              {isViewingSecondary
                ? 'Manage this secondary member\'s profile and vehicle information'
                : 'Manage your profile and account settings'}
            </p>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-6">
          {/* Profile Information - Different view for secondary vs own profile */}
          {isViewingSecondary && selectedProfile ? (
            <>
              {/* Secondary Profile Information */}
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-purple-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Secondary Member Information</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    {isEditing ? (
                      <>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={secondaryFormData.first_name}
                          onChange={(e) => setSecondaryFormData(prev => ({ ...prev, first_name: e.target.value }))}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="First name"
                        />
                      </>
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          First Name
                        </label>
                        <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                          {selectedProfile.first_name || 'N/A'}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    {isEditing ? (
                      <>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={secondaryFormData.last_name}
                          onChange={(e) => setSecondaryFormData(prev => ({ ...prev, last_name: e.target.value }))}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="Last name"
                        />
                      </>
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Last Name
                        </label>
                        <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                          {selectedProfile.last_name || 'N/A'}
                        </div>
                      </>
                    )}
                  </div>

                  {selectedMembership?.mecaId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        MECA ID
                      </label>
                      <div className="bg-slate-700 px-4 py-3 rounded-lg text-orange-400 font-mono font-bold">
                        #{selectedMembership.mecaId}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Membership Type
                    </label>
                    <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                      {selectedMembership?.membershipTypeConfig?.name || 'Competitor'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Payment Status
                    </label>
                    <div className="bg-slate-700 px-4 py-3 rounded-lg">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                          selectedMembership?.paymentStatus === 'paid'
                            ? 'bg-green-500/10 text-green-400'
                            : selectedMembership?.paymentStatus === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-gray-500/10 text-gray-400'
                        }`}
                      >
                        <CreditCard className="h-4 w-4" />
                        <span className="capitalize">{selectedMembership?.paymentStatus || 'Unknown'}</span>
                      </span>
                    </div>
                  </div>

                  {selectedMembership?.startDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Membership Start
                      </label>
                      <div className="bg-slate-700 px-4 py-3 rounded-lg text-white flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(selectedMembership.startDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Required Vehicle Details */}
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-orange-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <Car className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Required Vehicle Details</h2>
                    <p className="text-gray-400 text-sm">This information is required for competition entry</p>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-orange-300 text-sm">
                    Vehicle make, model, and license plate are required for all competitors to participate in MECA events.
                    Your MECA ID will not be activated until this information is complete.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    {isEditing ? (
                      <>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Vehicle Make <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={vehicleFormData.vehicleMake}
                          onChange={(e) => setVehicleFormData(prev => ({ ...prev, vehicleMake: e.target.value }))}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="e.g., Toyota, Honda, Ford"
                        />
                      </>
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Vehicle Make <span className="text-red-500">*</span>
                        </label>
                        <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                          {selectedMembership?.vehicleMake || 'Not set'}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    {isEditing ? (
                      <>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Vehicle Model <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={vehicleFormData.vehicleModel}
                          onChange={(e) => setVehicleFormData(prev => ({ ...prev, vehicleModel: e.target.value }))}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="e.g., Camry, Civic, F-150"
                        />
                      </>
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Vehicle Model <span className="text-red-500">*</span>
                        </label>
                        <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                          {selectedMembership?.vehicleModel || 'Not set'}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    {isEditing ? (
                      <>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Vehicle Color
                        </label>
                        <input
                          type="text"
                          value={vehicleFormData.vehicleColor}
                          onChange={(e) => setVehicleFormData(prev => ({ ...prev, vehicleColor: e.target.value }))}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="e.g., Blue, Red, Black"
                        />
                      </>
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Vehicle Color
                        </label>
                        <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                          {selectedMembership?.vehicleColor || 'Not set'}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    {isEditing ? (
                      <>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          License Plate <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={vehicleFormData.vehicleLicensePlate}
                          onChange={(e) => setVehicleFormData(prev => ({ ...prev, vehicleLicensePlate: e.target.value }))}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                          placeholder="e.g., ABC1234"
                        />
                      </>
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          License Plate <span className="text-red-500">*</span>
                        </label>
                        <div className="bg-slate-700 px-4 py-3 rounded-lg text-white font-mono">
                          {selectedMembership?.vehicleLicensePlate || 'Not set'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Secondary Contact Information */}
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Contact Information</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    {isEditing ? (
                      <PhoneInput
                        value={secondaryFormData.phone}
                        onChange={(value) => setSecondaryFormData(prev => ({ ...prev, phone: value }))}
                        label="Phone Number"
                      />
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Phone Number
                        </label>
                        <div className="bg-slate-700 px-4 py-3 rounded-lg text-white flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {selectedProfile.phone || 'Not set'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Secondary Address */}
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Address</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    {isEditing ? (
                      <>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Street Address
                        </label>
                        <input
                          type="text"
                          value={secondaryFormData.address}
                          onChange={(e) => setSecondaryFormData(prev => ({ ...prev, address: e.target.value }))}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="Enter street address"
                        />
                      </>
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Street Address
                        </label>
                        <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                          {selectedProfile.address || 'Not set'}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    {isEditing ? (
                      <>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          value={secondaryFormData.city}
                          onChange={(e) => setSecondaryFormData(prev => ({ ...prev, city: e.target.value }))}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="Enter city"
                        />
                      </>
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          City
                        </label>
                        <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                          {selectedProfile.city || 'Not set'}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    {isEditing ? (
                      <CountrySelect
                        value={secondaryFormData.country}
                        onChange={(value) => setSecondaryFormData(prev => ({ ...prev, country: value, state: '' }))}
                        label="Country"
                        showIcon={false}
                      />
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Country
                        </label>
                        <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                          {getCountryName(selectedProfile.country || '')}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    {isEditing ? (
                      <StateProvinceSelect
                        value={secondaryFormData.state}
                        onChange={(value) => setSecondaryFormData(prev => ({ ...prev, state: value }))}
                        country={secondaryFormData.country}
                        showIcon={false}
                      />
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          State / Province
                        </label>
                        <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                          {getStateName(selectedProfile.state || '', selectedProfile.country || '')}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    {isEditing ? (
                      <>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={secondaryFormData.postal_code}
                          onChange={(e) => setSecondaryFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="Enter postal code"
                        />
                      </>
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Postal Code
                        </label>
                        <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                          {selectedProfile.postal_code || 'Not set'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Own Profile Information */
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Profile Information</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    First Name
                  </label>
                  <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                    {profile.first_name || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Last Name
                  </label>
                  <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                    {profile.last_name || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Email Address
                  </label>
                  <div className="bg-slate-700 px-4 py-3 rounded-lg text-white flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {profile.email}
                  </div>
                </div>

                {profile.meca_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      MECA ID
                    </label>
                    <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                      #{profile.meca_id}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Role
                  </label>
                  <div className="bg-slate-700 px-4 py-3 rounded-lg text-white flex items-center gap-2">
                    <Shield className="h-4 w-4 text-orange-500" />
                    <span className="capitalize">{profile.role}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Membership Status
                  </label>
                  <div className="bg-slate-700 px-4 py-3 rounded-lg">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                        profile.membership_status === 'active'
                          ? 'bg-green-500/10 text-green-400'
                          : profile.membership_status === 'expired'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-gray-500/10 text-gray-400'
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span className="capitalize">{profile.membership_status}</span>
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Member Since
                  </label>
                  <div className="bg-slate-700 px-4 py-3 rounded-lg text-white flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>

                {profile.membership_expiry && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Membership Expires
                    </label>
                    <div className="bg-slate-700 px-4 py-3 rounded-lg text-white flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {new Date(profile.membership_expiry).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Own Profile Sections - Only show when not viewing secondary */}
          {!isViewingSecondary && (
            <>
              {/* Contact Information */}
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Contact Information</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    {isEditing ? (
                      <PhoneInput
                        value={formData.phone}
                        onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                        label="Phone Number"
                      />
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Phone Number
                        </label>
                        <div className="bg-slate-700 px-4 py-3 rounded-lg text-white flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {profile.phone || 'Not set'}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

          {/* Physical Address */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Physical Address</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                {isEditing ? (
                  <>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter street address"
                    />
                  </>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Street Address
                    </label>
                    <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                      {profile.address || 'Not set'}
                    </div>
                  </>
                )}
              </div>

              <div>
                {isEditing ? (
                  <>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter city"
                    />
                  </>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      City
                    </label>
                    <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                      {profile.city || 'Not set'}
                    </div>
                  </>
                )}
              </div>

              <div>
                {isEditing ? (
                  <CountrySelect
                    value={formData.country}
                    onChange={(value) => setFormData(prev => ({ ...prev, country: value, state: '' }))}
                    label="Country"
                    showIcon={false}
                  />
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Country
                    </label>
                    <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                      {getCountryName(profile.country || '')}
                    </div>
                  </>
                )}
              </div>

              <div>
                {isEditing ? (
                  <StateProvinceSelect
                    value={formData.state}
                    onChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
                    country={formData.country}
                    showIcon={false}
                  />
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      State / Province
                    </label>
                    <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                      {getStateName(profile.state || '', profile.country || '')}
                    </div>
                  </>
                )}
              </div>

              <div>
                {isEditing ? (
                  <>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter postal code"
                    />
                  </>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Postal Code
                    </label>
                    <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                      {profile.postal_code || 'Not set'}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Required Vehicle Details - Only show if user has a membership */}
          {primaryMembership && (
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-orange-500/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Car className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Required Vehicle Details</h2>
                  <p className="text-gray-400 text-sm">This information is required for competition entry</p>
                </div>
              </div>

              <div className="mb-4 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" />
                <p className="text-orange-300 text-sm">
                  Vehicle make, model, and license plate are required for all competitors to participate in MECA events.
                  Your MECA ID will not be activated until this information is complete.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  {isEditing ? (
                    <>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Vehicle Make <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={vehicleFormData.vehicleMake}
                        onChange={(e) => setVehicleFormData(prev => ({ ...prev, vehicleMake: e.target.value }))}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="e.g., Toyota, Honda, Ford"
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Vehicle Make <span className="text-red-500">*</span>
                      </label>
                      <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                        {primaryMembership.vehicleMake || 'Not set'}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  {isEditing ? (
                    <>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Vehicle Model <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={vehicleFormData.vehicleModel}
                        onChange={(e) => setVehicleFormData(prev => ({ ...prev, vehicleModel: e.target.value }))}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="e.g., Camry, Civic, F-150"
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Vehicle Model <span className="text-red-500">*</span>
                      </label>
                      <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                        {primaryMembership.vehicleModel || 'Not set'}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  {isEditing ? (
                    <>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Vehicle Color
                      </label>
                      <input
                        type="text"
                        value={vehicleFormData.vehicleColor}
                        onChange={(e) => setVehicleFormData(prev => ({ ...prev, vehicleColor: e.target.value }))}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="e.g., Blue, Red, Black"
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Vehicle Color
                      </label>
                      <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                        {primaryMembership.vehicleColor || 'Not set'}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  {isEditing ? (
                    <>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        License Plate <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={vehicleFormData.vehicleLicensePlate}
                        onChange={(e) => setVehicleFormData(prev => ({ ...prev, vehicleLicensePlate: e.target.value }))}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                        placeholder="e.g., ABC1234"
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        License Plate <span className="text-red-500">*</span>
                      </label>
                      <div className="bg-slate-700 px-4 py-3 rounded-lg text-white font-mono">
                        {primaryMembership.vehicleLicensePlate || 'Not set'}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Billing Address */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Building className="h-5 w-5 text-purple-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Billing Address</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                {isEditing ? (
                  <>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={formData.billing_street}
                      onChange={(e) => setFormData(prev => ({ ...prev, billing_street: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter billing street address"
                    />
                  </>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Street Address
                    </label>
                    <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                      {profile.billing_street || 'Not set'}
                    </div>
                  </>
                )}
              </div>

              <div>
                {isEditing ? (
                  <>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.billing_city}
                      onChange={(e) => setFormData(prev => ({ ...prev, billing_city: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter billing city"
                    />
                  </>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      City
                    </label>
                    <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                      {profile.billing_city || 'Not set'}
                    </div>
                  </>
                )}
              </div>

              <div>
                {isEditing ? (
                  <CountrySelect
                    value={formData.billing_country}
                    onChange={(value) => setFormData(prev => ({ ...prev, billing_country: value, billing_state: '' }))}
                    label="Country"
                    showIcon={false}
                  />
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Country
                    </label>
                    <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                      {getCountryName(profile.billing_country || '')}
                    </div>
                  </>
                )}
              </div>

              <div>
                {isEditing ? (
                  <StateProvinceSelect
                    value={formData.billing_state}
                    onChange={(value) => setFormData(prev => ({ ...prev, billing_state: value }))}
                    country={formData.billing_country}
                    showIcon={false}
                  />
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      State / Province
                    </label>
                    <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                      {getStateName(profile.billing_state || '', profile.billing_country || '')}
                    </div>
                  </>
                )}
              </div>

              <div>
                {isEditing ? (
                  <>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.billing_zip}
                      onChange={(e) => setFormData(prev => ({ ...prev, billing_zip: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter billing postal code"
                    />
                  </>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Postal Code
                    </label>
                    <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                      {profile.billing_zip || 'Not set'}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Security Settings</h2>
              </div>
              {!showChangePassword && (
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Change Password
                </button>
              )}
            </div>

              {showChangePassword ? (
                <ChangePassword onClose={() => setShowChangePassword(false)} />
              ) : (
                <div className="bg-slate-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">
                    Keep your account secure by using a strong password and changing it regularly.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                    <Lock className="h-4 w-4" />
                    <span>Last password change: {new Date(user.updated_at || user.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
