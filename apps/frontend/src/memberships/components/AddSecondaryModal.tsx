import { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  User,
  Car,
  Mail,
  Check,
  Loader2,
  AlertCircle,
  Users,
} from 'lucide-react';
import {
  membershipsApi,
  CreateSecondaryMembershipDto,
  Membership,
  RELATIONSHIP_TYPES,
} from '../memberships.api-client';
import {
  membershipTypeConfigsApi,
  MembershipTypeConfig,
  MembershipCategory,
} from '@/membership-type-configs';

type WizardStep = 'details' | 'login-option' | 'membership-type' | 'review';

interface AddSecondaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterMembershipId: string;
  onSuccess: (secondary: Membership) => void;
}

interface FormData {
  competitorName: string;
  relationshipToMaster: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleLicensePlate: string;
  giveLogin: boolean;
  email: string;
  membershipTypeConfigId: string;
}

const initialFormData: FormData = {
  competitorName: '',
  relationshipToMaster: '',
  vehicleMake: '',
  vehicleModel: '',
  vehicleColor: '',
  vehicleLicensePlate: '',
  giveLogin: false,
  email: '',
  membershipTypeConfigId: '',
};

export function AddSecondaryModal({
  isOpen,
  onClose,
  masterMembershipId,
  onSuccess,
}: AddSecondaryModalProps) {
  const [step, setStep] = useState<WizardStep>('details');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [membershipTypes, setMembershipTypes] = useState<MembershipTypeConfig[]>([]);
  const [selectedType, setSelectedType] = useState<MembershipTypeConfig | null>(null);
  const [loadingTypes, setLoadingTypes] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setStep('details');
      setError(null);
      setSelectedType(null);
      loadMembershipTypes();
    }
  }, [isOpen]);

  const loadMembershipTypes = async () => {
    setLoadingTypes(true);
    try {
      const types = await membershipTypeConfigsApi.getAll(true);
      // Filter to only competitor types for secondaries
      // Exclude upgrade-only types - those are for upgrading existing memberships, not new secondaries
      // Secondary memberships cannot have team upgrades
      setMembershipTypes(
        types.filter(
          (t) => t.isActive &&
                 t.category === MembershipCategory.COMPETITOR &&
                 !t.isUpgradeOnly // Use the isUpgradeOnly flag instead of name matching
        )
      );
    } catch (err) {
      console.error('Failed to load membership types:', err);
    } finally {
      setLoadingTypes(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateStep = (): boolean => {
    setError(null);

    switch (step) {
      case 'details':
        // Relationship is required
        if (!formData.relationshipToMaster) {
          setError('Please select a relationship type');
          return false;
        }
        // For non-self relationships, competitor name is required
        if (formData.relationshipToMaster !== 'self' && !formData.competitorName.trim()) {
          setError('Competitor name is required');
          return false;
        }
        // Vehicle info is always required (unique vehicle = unique MECA ID)
        if (
          !formData.vehicleMake ||
          !formData.vehicleModel ||
          !formData.vehicleColor ||
          !formData.vehicleLicensePlate
        ) {
          setError('All vehicle fields are required');
          return false;
        }
        return true;

      case 'login-option':
        if (formData.giveLogin && !formData.email.trim()) {
          setError('Email is required when giving secondary their own login');
          return false;
        }
        if (
          formData.giveLogin &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
        ) {
          setError('Please enter a valid email address');
          return false;
        }
        return true;

      case 'membership-type':
        if (!selectedType) {
          setError('Please select a membership type');
          return false;
        }
        return true;

      case 'review':
        return true;

      default:
        return true;
    }
  };

  const getSteps = (): WizardStep[] => {
    return ['details', 'login-option', 'membership-type', 'review'];
  };

  const handleNext = () => {
    if (!validateStep()) return;

    const steps = getSteps();
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps = getSteps();
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep() || !selectedType) return;

    setLoading(true);
    setError(null);

    try {
      const dto: CreateSecondaryMembershipDto = {
        membershipTypeConfigId: selectedType.id,
        // For "self" relationship, backend will use master's name
        competitorName: formData.relationshipToMaster === 'self'
          ? undefined
          : formData.competitorName.trim(),
        relationshipToMaster: formData.relationshipToMaster,
        createLogin: formData.giveLogin,
        email: formData.giveLogin ? formData.email.toLowerCase().trim() : undefined,
        vehicleMake: formData.vehicleMake,
        vehicleModel: formData.vehicleModel,
        vehicleColor: formData.vehicleColor,
        vehicleLicensePlate: formData.vehicleLicensePlate,
      };

      const secondary = await membershipsApi.createSecondaryMembership(
        masterMembershipId,
        dto
      );

      onSuccess(secondary);
      onClose();
    } catch (err: any) {
      console.error('Failed to create secondary:', err);
      setError(err.response?.data?.message || 'Failed to create secondary membership');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentStepIndex = getSteps().indexOf(step);
  const totalSteps = getSteps().length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              Add Secondary Member
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Step {currentStepIndex + 1} of {totalSteps}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-700 h-1">
          <div
            className="bg-orange-500 h-1 transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Competitor Details */}
          {step === 'details' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <User className="h-5 w-5 text-blue-400" />
                Secondary Membership
              </h3>

              {/* Relationship - Required and shown first */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Who is this membership for? <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.relationshipToMaster}
                  onChange={(e) => handleInputChange('relationshipToMaster', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select relationship...</option>
                  {RELATIONSHIP_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {formData.relationshipToMaster === 'self' && (
                  <p className="text-xs text-blue-400 mt-1">
                    This is for your own additional vehicle. Each vehicle gets its own MECA ID.
                  </p>
                )}
              </div>

              {/* Competitor Name - Only show for non-self relationships */}
              {formData.relationshipToMaster && formData.relationshipToMaster !== 'self' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Competitor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.competitorName}
                    onChange={(e) => handleInputChange('competitorName', e.target.value)}
                    placeholder="Full name of the competitor"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-700">
                <h4 className="text-md font-medium text-white flex items-center gap-2 mb-4">
                  <Car className="h-4 w-4 text-blue-400" />
                  Vehicle Information
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Make <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.vehicleMake}
                      onChange={(e) => handleInputChange('vehicleMake', e.target.value)}
                      placeholder="Toyota"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Model <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.vehicleModel}
                      onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                      placeholder="Camry"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Color <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.vehicleColor}
                      onChange={(e) => handleInputChange('vehicleColor', e.target.value)}
                      placeholder="Blue"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      License Plate <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.vehicleLicensePlate}
                      onChange={(e) => handleInputChange('vehicleLicensePlate', e.target.value)}
                      placeholder="ABC123"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Step 2: Login Option */}
          {step === 'login-option' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">
                Account Login Option
              </h3>
              <p className="text-sm text-gray-400">
                Choose whether this secondary member should have their own login credentials.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleInputChange('giveLogin', false)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    !formData.giveLogin
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-white">No separate login</div>
                      <div className="text-sm text-gray-400 mt-1">
                        You'll manage this membership from your account. The secondary cannot log in separately.
                      </div>
                    </div>
                    {!formData.giveLogin && <Check className="h-5 w-5 text-orange-500" />}
                  </div>
                </button>

                <button
                  onClick={() => handleInputChange('giveLogin', true)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    formData.giveLogin
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-white">Give their own login</div>
                      <div className="text-sm text-gray-400 mt-1">
                        They can log in, compete, and edit their profile. You still handle all billing.
                      </div>
                    </div>
                    {formData.giveLogin && <Check className="h-5 w-5 text-orange-500" />}
                  </div>
                </button>
              </div>

              {formData.giveLogin && (
                <div className="pt-4 border-t border-slate-700">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Secondary's Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Login credentials will be sent to this email address.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Membership Type */}
          {step === 'membership-type' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">
                Select Membership Type
              </h3>

              {loadingTypes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {membershipTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => {
                        setSelectedType(type);
                        handleInputChange('membershipTypeConfigId', type.id);
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        selectedType?.id === type.id
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Car className="h-5 w-5 text-blue-400" />
                        <div className="text-left">
                          <div className="font-medium text-white">{type.name}</div>
                          <div className="text-sm text-gray-400 capitalize">{type.category}</div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="font-medium text-white">
                          ${Number(type.price).toFixed(2)}
                        </span>
                        {selectedType?.id === type.id && (
                          <Check className="h-5 w-5 text-orange-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 'review' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Review & Confirm</h3>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Relationship:</span>
                  <span className="text-white">
                    {RELATIONSHIP_TYPES.find(r => r.value === formData.relationshipToMaster)?.label || formData.relationshipToMaster}
                  </span>
                </div>
                {formData.relationshipToMaster !== 'self' && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Competitor:</span>
                    <span className="text-white font-medium">{formData.competitorName}</span>
                  </div>
                )}
                {formData.relationshipToMaster === 'self' && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Competitor:</span>
                    <span className="text-blue-400 italic">Same as your account</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Vehicle:</span>
                  <span className="text-white">
                    {formData.vehicleColor} {formData.vehicleMake} {formData.vehicleModel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">License Plate:</span>
                  <span className="text-white font-mono">{formData.vehicleLicensePlate}</span>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Login:</span>
                  <span className={formData.giveLogin ? 'text-green-400' : 'text-gray-400'}>
                    {formData.giveLogin ? 'Own account' : 'Managed by you'}
                  </span>
                </div>
                {formData.giveLogin && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white">{formData.email}</span>
                  </div>
                )}
              </div>

              {selectedType && (
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Membership:</span>
                    <span className="text-white">{selectedType.name}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-600">
                    <span className="text-gray-300 font-medium">Price:</span>
                    <span className="text-white font-bold">
                      ${Number(selectedType.price).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300">
                The secondary will be created with PENDING payment status. You'll need to complete payment separately.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-between">
          {currentStepIndex > 0 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step === 'review' ? (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  Add Secondary
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
            >
              Next
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddSecondaryModal;
