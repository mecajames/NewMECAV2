import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Music, Eye, EyeOff, Loader2, Save, ArrowLeft, Users } from 'lucide-react';
import { useAuth } from '@/auth/contexts/AuthContext';
import { profilesApi, Profile as ProfileType } from '@/profiles';
import { AUDIO_SYSTEM_COMPONENT_FIELDS, type AudioSystem } from '@newmeca/shared';
import { membershipsApi, ControlledMecaId, Membership, RELATIONSHIP_TYPES } from '@/memberships';
import { MecaIdSwitcher } from '@/shared/components/MecaIdSwitcher';
import ProfileViewSelector from '@/profiles/components/ProfileViewSelector';

export default function PublicProfilePage() {
  const navigate = useNavigate();
  const { profile, user, refreshProfile } = useAuth();
  const audioSystemRef = useRef<HTMLTextAreaElement>(null);

  const [_loading, _setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile switching state (for managing secondary profiles)
  const [controlledMecaIds, setControlledMecaIds] = useState<ControlledMecaId[]>([]);
  const [isViewingSecondary, setIsViewingSecondary] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileType | null>(null);
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [primaryMembership, setPrimaryMembership] = useState<Membership | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Form state - Profile fields (gallery managed on its own page)
  const [isPublic, setIsPublic] = useState(false);
  // Per-section visibility opt-ins (default private)
  const [vehiclePublic, setVehiclePublic] = useState(false);
  const [audioPublic, setAudioPublic] = useState(false);
  // Structured audio system components (legacy free-text car_audio_system is
  // folded into the description field the first time it's edited here)
  const [audioSystem, setAudioSystem] = useState<AudioSystem>({});

  // Competitor name (per membership/MECA ID)
  const [competitorName, setCompetitorName] = useState('');
  const [relationshipToMaster, setRelationshipToMaster] = useState('');

  // Load controlled MECA IDs and primary membership
  useEffect(() => {
    const loadControlledMecaIds = async () => {
      if (!profile?.id) return;
      try {
        const mecaIds = await membershipsApi.getControlledMecaIds(profile.id);
        setControlledMecaIds(mecaIds);

        // Load primary membership data for vehicle info
        const ownMecaId = mecaIds.find(m => m.isOwn);
        if (ownMecaId) {
          const membership = await membershipsApi.getById(ownMecaId.membershipId);
          setPrimaryMembership(membership);
          // Initialize competitor name
          setCompetitorName(membership.competitorName || `${profile.first_name || ''} ${profile.last_name || ''}`.trim());
        }
      } catch (error) {
        console.error('Failed to load controlled MECA IDs:', error);
      }
    };
    loadControlledMecaIds();
  }, [profile?.id]);

  // Seed the structured audio editor from a profile: prefer the structured
  // column; fall back to folding the legacy free-text description in.
  const seedAudioSystem = (p: ProfileType) => {
    if (p.audio_system && Object.values(p.audio_system).some((v) => v)) {
      setAudioSystem(p.audio_system);
    } else {
      setAudioSystem(p.car_audio_system ? { description: p.car_audio_system } : {});
    }
  };

  // Initialize form data when profile loads or changes
  useEffect(() => {
    if (profile && !isViewingSecondary) {
      setIsPublic(profile.is_public || false);
      setVehiclePublic(profile.vehicle_public || false);
      setAudioPublic(profile.audio_system_public || false);
      seedAudioSystem(profile);
    }
  }, [profile, isViewingSecondary]);

  // Auto-resize the description textarea when content changes
  useEffect(() => {
    if (audioSystemRef.current) {
      audioSystemRef.current.style.height = 'auto';
      audioSystemRef.current.style.height = audioSystemRef.current.scrollHeight + 'px';
    }
  }, [audioSystem.description]);

  // Handle switching between profiles
  const handleProfileSwitch = async (_mecaId: number, membershipId: string, profileId: string, _competitorName: string) => {
    // Check if switching back to own profile
    const ownMecaId = controlledMecaIds.find(m => m.isOwn);
    const isOwnProfile = ownMecaId && ownMecaId.profileId === profileId;

    if (isOwnProfile) {
      setIsViewingSecondary(false);
      setSelectedProfile(null);
      setSelectedMembership(null);
      return;
    }

    // Find the controlled MECA ID info (which now includes relationshipToMaster)
    // We use membershipId to find the info rather than mecaId
    const selectedMecaInfo = controlledMecaIds.find(m => m.membershipId === membershipId);

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

      // Initialize form with secondary's data
      setIsPublic(secondaryProfile.is_public || false);
      setVehiclePublic(secondaryProfile.vehicle_public || false);
      setAudioPublic(secondaryProfile.audio_system_public || false);
      seedAudioSystem(secondaryProfile);
      setCompetitorName(membership.competitorName || selectedMecaInfo?.competitorName || `${secondaryProfile.first_name || ''} ${secondaryProfile.last_name || ''}`.trim());
      // Get relationshipToMaster from controlled MECA IDs data
      setRelationshipToMaster(selectedMecaInfo?.relationshipToMaster || '');
    } catch (error) {
      console.error('Failed to load secondary profile:', error);
      setError('Failed to load secondary profile. Please try again.');
      setIsViewingSecondary(false);
      setSelectedProfile(null);
      setSelectedMembership(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSave = async () => {
    // Validate required fields
    const targetProfile = isViewingSecondary ? selectedProfile : profile;
    const targetMembership = isViewingSecondary ? selectedMembership : primaryMembership;

    if (!targetProfile) return;

    // Competitor name validation
    if (targetMembership && !competitorName.trim()) {
      setError('Competitor name is required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Save profile public data (gallery fields are managed on the dedicated
      // gallery page). Empty component strings are dropped so the stored JSON
      // stays clean.
      const cleanedAudio: AudioSystem = Object.fromEntries(
        Object.entries(audioSystem).filter(([, v]) => typeof v === 'string' && v.trim().length > 0),
      );
      await profilesApi.update(targetProfile.id, {
        is_public: isPublic,
        vehicle_public: vehiclePublic,
        audio_system_public: audioPublic,
        audio_system: cleanedAudio,
      });

      // Competitor name is LOCKED — it's the member's name in results/standings and
      // can't be changed here (the input above is read-only; the backend also rejects
      // a non-admin change). For a secondary membership the RELATIONSHIP is still
      // editable, so we update only that.
      if (targetMembership && profile && isViewingSecondary) {
        await membershipsApi.updateSecondaryDetails(
          targetMembership.id,
          profile.id, // Master is the requesting user
          {
            relationshipToMaster: relationshipToMaster || undefined,
          }
        );
      }

      // Refresh the profile in context (only for own profile)
      if (!isViewingSecondary && refreshProfile) {
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

  const hasMultipleMecaIds = controlledMecaIds.length > 1;

  if (!profile || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-xl mb-4">Please sign in to manage your public profile</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
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

  const currentProfileName = isViewingSecondary && selectedProfile
    ? `${selectedProfile.first_name || ''} ${selectedProfile.last_name || ''}`.trim() || competitorName
    : `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-400">Profile Settings</h2>
          <button
            onClick={() => navigate('/dashboard/mymeca')}
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
                  <p className="text-sm font-medium text-white">Manage Public Profiles</p>
                  <p className="text-xs text-gray-400">
                    Select a MECA ID to manage that competitor's public profile
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
                    Managing Secondary Member's Public Profile
                  </p>
                  <p className="text-white font-medium">
                    {currentProfileName} {selectedMembership?.mecaId && `(#${selectedMembership.mecaId})`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsViewingSecondary(false);
                  setSelectedProfile(null);
                  setSelectedMembership(null);
                }}
                className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm transition-colors"
              >
                Back to My Profile
              </button>
            </div>
          </div>
        )}

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
            {isViewingSecondary ? `${currentProfileName}'s Public Profile` : 'Public Profile'}
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            {isViewingSecondary
              ? 'Manage how this competitor appears to other MECA members'
              : 'Manage how other MECA members see your profile'}
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

        <div className="grid gap-6">
          {/* Visibility Toggle */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            {!isViewingSecondary && (
              <div className="flex justify-end mb-4">
                <ProfileViewSelector active="public" />
              </div>
            )}
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

          {/* Competitor Information */}
          {(primaryMembership || (isViewingSecondary && selectedMembership)) && (
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Competitor Information</h2>
                  <p className="text-gray-400 text-sm">
                    {isViewingSecondary
                      ? 'Required information for this competitor'
                      : 'Your name as it will appear in results and standings'}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className={isViewingSecondary ? '' : 'md:col-span-2'}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Competitor Name
                  </label>
                  <div className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600">
                    {competitorName || 'N/A'}
                  </div>
                </div>

                {isViewingSecondary && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Relationship to You
                    </label>
                    <select
                      value={relationshipToMaster}
                      onChange={(e) => setRelationshipToMaster(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    >
                      <option value="">Select relationship...</option>
                      {RELATIONSHIP_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Helps identify this membership (e.g., "Spouse", "Child")
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Photo gallery moved to its own page at /member-profile-gallery — switch via the dropdown above. */}

          {/* Vehicle Information - Display from membership data */}
          {(primaryMembership || (isViewingSecondary && selectedMembership)) && (
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Car className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Vehicle Information</h2>
                    <p className="text-gray-400 text-sm">
                      Changes require a support ticket. {vehiclePublic
                        ? 'Shown on the public profile (license plate is never shown).'
                        : 'Only you and MECA staff can see this.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400">{vehiclePublic ? 'Public' : 'Private'}</span>
                  <button
                    onClick={() => setVehiclePublic(!vehiclePublic)}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      vehiclePublic ? 'bg-orange-600' : 'bg-slate-600'
                    }`}
                    aria-label="Toggle vehicle visibility"
                  >
                    <div
                      className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                        vehiclePublic ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-xs mb-1">Make</p>
                  <p className="text-white font-medium">
                    {(isViewingSecondary ? selectedMembership?.vehicleMake : primaryMembership?.vehicleMake) || 'Not set'}
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-xs mb-1">Model</p>
                  <p className="text-white font-medium">
                    {(isViewingSecondary ? selectedMembership?.vehicleModel : primaryMembership?.vehicleModel) || 'Not set'}
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-xs mb-1">Color</p>
                  <p className="text-white font-medium">
                    {(isViewingSecondary ? selectedMembership?.vehicleColor : primaryMembership?.vehicleColor) || 'Not set'}
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-xs mb-1">License Plate</p>
                  <p className="text-white font-medium font-mono">
                    {(isViewingSecondary ? selectedMembership?.vehicleLicensePlate : primaryMembership?.vehicleLicensePlate) || 'Not set'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Car Audio System — structured components */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Music className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Car Audio System</h2>
                  <p className="text-gray-400 text-sm">
                    {audioPublic
                      ? 'Shown on the public profile.'
                      : 'Only you and MECA staff can see this.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">{audioPublic ? 'Public' : 'Private'}</span>
                <button
                  onClick={() => setAudioPublic(!audioPublic)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    audioPublic ? 'bg-orange-600' : 'bg-slate-600'
                  }`}
                  aria-label="Toggle audio system visibility"
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      audioPublic ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {AUDIO_SYSTEM_COMPONENT_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={audioSystem[field.key] || ''}
                    onChange={(e) =>
                      setAudioSystem((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Build Description
              </label>
              <textarea
                ref={audioSystemRef}
                value={audioSystem.description || ''}
                onChange={(e) =>
                  setAudioSystem((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={2}
                className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none overflow-hidden"
                style={{ minHeight: '80px' }}
                placeholder="Tell the story of your build — install details, goals, competition history..."
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => navigate('/dashboard/mymeca')}
              className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
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
