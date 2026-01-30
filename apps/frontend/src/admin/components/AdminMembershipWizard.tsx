import { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  CheckCircle,
  CreditCard,
  DollarSign,
  Building2,
  Car,
  Users,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import { membershipTypeConfigsApi, MembershipTypeConfig, MembershipCategory, ManufacturerTier } from '@/membership-type-configs';
import { membershipsApi, AdminPaymentMethod, AdminCreateMembershipDto, AdminCreateMembershipResult } from '@/memberships';
import { countries, getStatesForCountry, getStateLabel, getPostalCodeLabel } from '../../utils/countries';

interface AdminMembershipWizardProps {
  userId: string;
  userEmail: string;
  userFirstName?: string;
  userLastName?: string;
  userPhone?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: AdminCreateMembershipResult) => void;
}

type WizardStep = 'membership-type' | 'details' | 'billing' | 'payment' | 'review';

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'membership-type', label: 'Membership Type' },
  { id: 'details', label: 'Details' },
  { id: 'billing', label: 'Billing' },
  { id: 'payment', label: 'Payment' },
  { id: 'review', label: 'Review' },
];

export default function AdminMembershipWizard({
  userId,
  userEmail,
  userFirstName,
  userLastName,
  userPhone,
  isOpen,
  onClose,
  onSuccess,
}: AdminMembershipWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('membership-type');
  const [membershipTypes, setMembershipTypes] = useState<MembershipTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState<Partial<AdminCreateMembershipDto>>({
    userId,
    paymentMethod: AdminPaymentMethod.CASH,
    billingFirstName: userFirstName || '',
    billingLastName: userLastName || '',
    billingEmail: userEmail,
    billingPhone: userPhone || '',
    billingCountry: 'US',
    hasTeamAddon: false,
  });

  const [selectedMembershipType, setSelectedMembershipType] = useState<MembershipTypeConfig | null>(null);

  // Load membership types
  useEffect(() => {
    if (isOpen) {
      loadMembershipTypes();
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('membership-type');
      setFormData({
        userId,
        paymentMethod: AdminPaymentMethod.CASH,
        billingFirstName: userFirstName || '',
        billingLastName: userLastName || '',
        billingEmail: userEmail,
        billingPhone: userPhone || '',
        billingCountry: 'US',
        hasTeamAddon: false,
      });
      setSelectedMembershipType(null);
      setError(null);
    }
  }, [isOpen, userId, userEmail, userFirstName, userLastName, userPhone]);

  const loadMembershipTypes = async () => {
    try {
      setLoading(true);
      const types = await membershipTypeConfigsApi.getAll(true); // Include inactive for admin
      // Filter to only active types
      setMembershipTypes(types.filter(t => t.isActive && !t.isUpgradeOnly));
    } catch (err) {
      console.error('Error loading membership types:', err);
      setError('Failed to load membership types');
    } finally {
      setLoading(false);
    }
  };

  const handleMembershipTypeSelect = (type: MembershipTypeConfig) => {
    setSelectedMembershipType(type);
    setFormData(prev => ({
      ...prev,
      membershipTypeConfigId: type.id,
      // Reset category-specific fields when type changes
      vehicleMake: undefined,
      vehicleModel: undefined,
      vehicleColor: undefined,
      vehicleLicensePlate: undefined,
      competitorName: undefined,
      businessName: undefined,
      businessWebsite: undefined,
      manufacturerTier: undefined,
      hasTeamAddon: false,
      teamName: undefined,
      teamDescription: undefined,
    }));
  };

  const updateFormData = (field: keyof AdminCreateMembershipDto, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateCurrentStep = (): boolean => {
    setError(null);

    if (currentStep === 'membership-type') {
      if (!selectedMembershipType) {
        setError('Please select a membership type');
        return false;
      }
    }

    if (currentStep === 'details') {
      if (selectedMembershipType?.category === MembershipCategory.COMPETITOR) {
        if (!formData.vehicleMake || !formData.vehicleModel || !formData.vehicleColor || !formData.vehicleLicensePlate) {
          setError('Vehicle information is required for competitor memberships');
          return false;
        }
      }
      if (selectedMembershipType?.category === MembershipCategory.RETAIL || selectedMembershipType?.category === MembershipCategory.MANUFACTURER) {
        if (!formData.businessName) {
          setError('Business name is required');
          return false;
        }
      }
      if (selectedMembershipType?.category === MembershipCategory.MANUFACTURER && !formData.manufacturerTier) {
        setError('Please select a manufacturer tier');
        return false;
      }
      // Team name is now optional for "Competitor + Team" - member creates team after payment
    }

    if (currentStep === 'payment') {
      if (formData.paymentMethod === AdminPaymentMethod.CHECK && !formData.checkNumber) {
        setError('Check number is required for check payments');
        return false;
      }
      if (formData.paymentMethod === AdminPaymentMethod.COMPLIMENTARY && !formData.complimentaryReason) {
        setError('A reason is required for complimentary memberships');
        return false;
      }
    }

    return true;
  };

  const goToNextStep = () => {
    if (!validateCurrentStep()) return;

    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    if (!selectedMembershipType) return;

    setSubmitting(true);
    setError(null);

    try {
      // Always create invoice and receipt for all payment types
      const submitData = {
        ...formData,
        createInvoice: true,
      } as AdminCreateMembershipDto;

      const result = await membershipsApi.adminCreate(submitData);
      onSuccess(result);
      onClose();
    } catch (err: any) {
      console.error('Error creating membership:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create membership');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotal = (): number => {
    if (!selectedMembershipType) return 0;
    return Number(selectedMembershipType.price);
  };

  if (!isOpen) return null;

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Create Membership</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    index < currentStepIndex
                      ? 'bg-green-500 text-white'
                      : index === currentStepIndex
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-600 text-gray-400'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`ml-2 text-sm hidden sm:block ${
                    index === currentStepIndex ? 'text-white font-medium' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-gray-500 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Step 1: Membership Type Selection */}
              {currentStep === 'membership-type' && (
                <div className="space-y-4">
                  <p className="text-gray-400 mb-4">Select a membership type for this user.</p>
                  <div className="grid gap-3">
                    {membershipTypes.map(type => (
                      <div
                        key={type.id}
                        className={`rounded-lg border transition-colors ${
                          selectedMembershipType?.id === type.id
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        <button
                          onClick={() => handleMembershipTypeSelect(type)}
                          className="w-full flex items-center justify-between p-4 text-left"
                        >
                          <div className="flex items-center gap-3">
                            {type.category === MembershipCategory.COMPETITOR && <Car className="h-5 w-5 text-blue-400" />}
                            {type.category === MembershipCategory.RETAIL && <Building2 className="h-5 w-5 text-purple-400" />}
                            {type.category === MembershipCategory.MANUFACTURER && <Building2 className="h-5 w-5 text-amber-400" />}
                            {type.category === MembershipCategory.TEAM && <Users className="h-5 w-5 text-green-400" />}
                            <div>
                              <div className="font-medium text-white">{type.name}</div>
                              <div className="text-sm text-gray-400">
                                <span className="capitalize">{type.category}</span>
                                {/* Retailer/Manufacturer get team permissions by default */}
                                {(type.category === MembershipCategory.RETAIL || type.category === MembershipCategory.MANUFACTURER) && (
                                  <span className="text-green-400 ml-2">(includes team)</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-white">
                              ${Number(type.price).toFixed(2)}
                            </div>
                            {selectedMembershipType?.id === type.id && (
                              <Check className="h-5 w-5 text-orange-500 inline-block ml-2" />
                            )}
                          </div>
                        </button>

                        {/* Show "Includes Team" badge for Retailer/Manufacturer or membership types with includesTeam */}
                        {(type.category === MembershipCategory.RETAIL ||
                          type.category === MembershipCategory.MANUFACTURER ||
                          type.includesTeam) && selectedMembershipType?.id === type.id && (
                          <div className="px-4 pb-4 pt-0 border-t border-slate-600 mt-2">
                            <div className="flex items-center gap-2 py-2">
                              <Users className="h-4 w-4 text-green-400" />
                              <span className="text-green-400 font-medium">(includes team)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Category-Specific Details */}
              {currentStep === 'details' && selectedMembershipType && (
                <div className="space-y-6">
                  {/* Competitor Details */}
                  {selectedMembershipType.category === MembershipCategory.COMPETITOR && (
                    <>
                      <div>
                        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                          <Car className="h-5 w-5 text-blue-400" />
                          Vehicle Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Vehicle Make <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={formData.vehicleMake || ''}
                              onChange={e => updateFormData('vehicleMake', e.target.value)}
                              placeholder="e.g., Toyota"
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Vehicle Model <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={formData.vehicleModel || ''}
                              onChange={e => updateFormData('vehicleModel', e.target.value)}
                              placeholder="e.g., Camry"
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Vehicle Color <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={formData.vehicleColor || ''}
                              onChange={e => updateFormData('vehicleColor', e.target.value)}
                              placeholder="e.g., Blue"
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              License Plate <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={formData.vehicleLicensePlate || ''}
                              onChange={e => updateFormData('vehicleLicensePlate', e.target.value)}
                              placeholder="e.g., ABC123"
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Competitor Name (optional)
                          </label>
                          <input
                            type="text"
                            value={formData.competitorName || ''}
                            onChange={e => updateFormData('competitorName', e.target.value)}
                            placeholder="If different from account holder (e.g., family member)"
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Team Details - show for membership types that include team */}
                      {selectedMembershipType?.includesTeam && (
                        <div className="border-t border-slate-700 pt-6">
                          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                            <Users className="h-5 w-5 text-green-400" />
                            Team Information
                            <span className="text-sm text-gray-400">(optional)</span>
                          </h3>
                          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-4">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                              <div className="text-sm text-gray-300">
                                Team will be created by the member from their dashboard after the invoice is <strong className="text-green-400">PAID</strong>.
                                You may optionally pre-fill the team name and description below.
                              </div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                Team Name <span className="text-gray-500">(optional)</span>
                              </label>
                              <input
                                type="text"
                                value={formData.teamName || ''}
                                onChange={e => updateFormData('teamName', e.target.value)}
                                placeholder="Leave blank - member will choose when creating team"
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">
                                Team Description <span className="text-gray-500">(optional)</span>
                              </label>
                              <textarea
                                value={formData.teamDescription || ''}
                                onChange={e => updateFormData('teamDescription', e.target.value)}
                                placeholder="Brief description of the team"
                                rows={2}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Retailer/Manufacturer Details */}
                  {(selectedMembershipType.category === MembershipCategory.RETAIL || selectedMembershipType.category === MembershipCategory.MANUFACTURER) && (
                    <>
                      <div>
                        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-purple-400" />
                          Business Information
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Business Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={formData.businessName || ''}
                              onChange={e => updateFormData('businessName', e.target.value)}
                              placeholder="Enter business name"
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Business Website
                            </label>
                            <input
                              type="url"
                              value={formData.businessWebsite || ''}
                              onChange={e => updateFormData('businessWebsite', e.target.value)}
                              placeholder="https://example.com"
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Manufacturer Tier Selection */}
                      {selectedMembershipType.category === MembershipCategory.MANUFACTURER && (
                        <div className="border-t border-slate-700 pt-6">
                          <h3 className="text-lg font-medium text-white mb-4">Manufacturer Tier</h3>
                          <div className="grid grid-cols-3 gap-4">
                            {Object.values(ManufacturerTier).map(tier => (
                              <button
                                key={tier}
                                onClick={() => updateFormData('manufacturerTier', tier)}
                                className={`p-4 rounded-lg border text-center transition-colors ${
                                  formData.manufacturerTier === tier
                                    ? 'border-orange-500 bg-orange-500/10'
                                    : 'border-slate-600 hover:border-slate-500'
                                }`}
                              >
                                <div className={`text-lg font-bold capitalize ${
                                  tier === ManufacturerTier.BRONZE ? 'text-amber-600' :
                                  tier === ManufacturerTier.SILVER ? 'text-gray-300' :
                                  'text-yellow-400'
                                }`}>
                                  {tier}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Team Info (auto-included for retailer/manufacturer) */}
                      <div className="border-t border-slate-700 pt-6">
                        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                          <Users className="h-5 w-5 text-green-400" />
                          Team Information
                          <span className="text-sm text-gray-400">(included with membership)</span>
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Team Name
                            </label>
                            <input
                              type="text"
                              value={formData.teamName || ''}
                              onChange={e => updateFormData('teamName', e.target.value)}
                              placeholder="Enter team name (can use business name)"
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Team Description
                            </label>
                            <textarea
                              value={formData.teamDescription || ''}
                              onChange={e => updateFormData('teamDescription', e.target.value)}
                              placeholder="Brief description of the team"
                              rows={2}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 3: Billing Information */}
              {currentStep === 'billing' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white mb-4">Billing Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
                      <input
                        type="text"
                        value={formData.billingFirstName || ''}
                        onChange={e => updateFormData('billingFirstName', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={formData.billingLastName || ''}
                        onChange={e => updateFormData('billingLastName', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.billingEmail || ''}
                        onChange={e => updateFormData('billingEmail', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={formData.billingPhone || ''}
                        onChange={e => updateFormData('billingPhone', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  {/* Country FIRST - so state dropdown populates correctly */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Country</label>
                    <select
                      value={formData.billingCountry || 'US'}
                      onChange={e => {
                        updateFormData('billingCountry', e.target.value);
                        // Reset state when country changes
                        updateFormData('billingState', '');
                      }}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      {countries.map(country => (
                        <option key={country.code} value={country.code}>{country.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                    <input
                      type="text"
                      value={formData.billingAddress || ''}
                      onChange={e => updateFormData('billingAddress', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
                      <input
                        type="text"
                        value={formData.billingCity || ''}
                        onChange={e => updateFormData('billingCity', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        {getStateLabel(formData.billingCountry || 'US')}
                      </label>
                      <select
                        value={formData.billingState || ''}
                        onChange={e => updateFormData('billingState', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">Select...</option>
                        {getStatesForCountry(formData.billingCountry || 'US').map(state => (
                          <option key={state.code} value={state.code}>{state.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      {getPostalCodeLabel(formData.billingCountry || 'US')}
                    </label>
                    <input
                      type="text"
                      value={formData.billingPostalCode || ''}
                      onChange={e => updateFormData('billingPostalCode', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Payment Method */}
              {currentStep === 'payment' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white mb-4">Payment Method</h3>

                  <div className="space-y-3">
                    {/* Cash */}
                    <button
                      onClick={() => updateFormData('paymentMethod', AdminPaymentMethod.CASH)}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-colors text-left ${
                        formData.paymentMethod === AdminPaymentMethod.CASH
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <DollarSign className="h-6 w-6 text-green-400" />
                      <div>
                        <div className="font-medium text-white">Cash</div>
                        <div className="text-sm text-gray-400">Payment received in cash</div>
                      </div>
                    </button>

                    {/* Check */}
                    <button
                      onClick={() => updateFormData('paymentMethod', AdminPaymentMethod.CHECK)}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-colors text-left ${
                        formData.paymentMethod === AdminPaymentMethod.CHECK
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <FileText className="h-6 w-6 text-blue-400" />
                      <div>
                        <div className="font-medium text-white">Check</div>
                        <div className="text-sm text-gray-400">Payment received by check</div>
                      </div>
                    </button>

                    {/* Credit Card / Invoice */}
                    <button
                      onClick={() => updateFormData('paymentMethod', AdminPaymentMethod.CREDIT_CARD_INVOICE)}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-colors text-left ${
                        formData.paymentMethod === AdminPaymentMethod.CREDIT_CARD_INVOICE
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <CreditCard className="h-6 w-6 text-purple-400" />
                      <div>
                        <div className="font-medium text-white">Credit Card (Send Invoice)</div>
                        <div className="text-sm text-gray-400">Create invoice - user pays online. Membership stays PENDING until paid.</div>
                      </div>
                    </button>

                    {/* Complimentary */}
                    <button
                      onClick={() => updateFormData('paymentMethod', AdminPaymentMethod.COMPLIMENTARY)}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-colors text-left ${
                        formData.paymentMethod === AdminPaymentMethod.COMPLIMENTARY
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <Check className="h-6 w-6 text-amber-400" />
                      <div>
                        <div className="font-medium text-white">Complimentary</div>
                        <div className="text-sm text-gray-400">No charge - free membership</div>
                      </div>
                    </button>
                  </div>

                  {/* Payment-specific fields */}
                  {formData.paymentMethod === AdminPaymentMethod.CASH && (
                    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                        <div className="text-sm text-gray-300">
                          An invoice and payment receipt will be automatically created to record this cash payment.
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.paymentMethod === AdminPaymentMethod.CHECK && (
                    <div className="mt-4 p-4 bg-slate-700/50 rounded-lg space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Check Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.checkNumber || ''}
                          onChange={e => updateFormData('checkNumber', e.target.value)}
                          placeholder="Enter check number"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex items-start gap-3 pt-2 border-t border-slate-600">
                        <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                        <div className="text-sm text-gray-300">
                          An invoice and payment receipt will be automatically created to record this check payment.
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.paymentMethod === AdminPaymentMethod.CREDIT_CARD_INVOICE && (
                    <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                        <div className="text-sm text-gray-300">
                          An invoice will be created and can be sent to the user. The membership will remain in <strong className="text-yellow-400">PENDING</strong> status until the invoice is paid.
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.paymentMethod === AdminPaymentMethod.COMPLIMENTARY && (
                    <div className="mt-4 p-4 bg-slate-700/50 rounded-lg space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Reason for Complimentary Membership <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={formData.complimentaryReason || ''}
                          onChange={e => updateFormData('complimentaryReason', e.target.value)}
                          placeholder="e.g., VIP sponsor, competition winner, staff member..."
                          rows={2}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex items-start gap-3 pt-2 border-t border-slate-600">
                        <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                        <div className="text-sm text-gray-300">
                          An invoice and receipt will be automatically created showing $0.00 paid (complimentary).
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Admin notes */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Admin Notes (optional)
                    </label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={e => updateFormData('notes', e.target.value)}
                      placeholder="Internal notes about this membership"
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Step 5: Review */}
              {currentStep === 'review' && selectedMembershipType && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-white mb-4">Review & Confirm</h3>

                  {/* Membership Summary */}
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">Membership</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Type:</span>
                        <span className="text-white">{selectedMembershipType.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Category:</span>
                        <span className="text-white capitalize">{selectedMembershipType.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Base Price:</span>
                        <span className="text-white">${Number(selectedMembershipType.price).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-600">
                        <span className="text-gray-300 font-medium">Total:</span>
                        <span className="text-white font-bold">${calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Details Summary */}
                  {selectedMembershipType.category === MembershipCategory.COMPETITOR && (
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h4 className="font-medium text-white mb-3">Vehicle Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Vehicle:</span>
                          <span className="text-white">{formData.vehicleMake} {formData.vehicleModel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Color:</span>
                          <span className="text-white">{formData.vehicleColor}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">License Plate:</span>
                          <span className="text-white">{formData.vehicleLicensePlate}</span>
                        </div>
                        {formData.competitorName && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Competitor Name:</span>
                            <span className="text-white">{formData.competitorName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(selectedMembershipType.category === MembershipCategory.RETAIL || selectedMembershipType.category === MembershipCategory.MANUFACTURER) && (
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h4 className="font-medium text-white mb-3">Business Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Business Name:</span>
                          <span className="text-white">{formData.businessName}</span>
                        </div>
                        {formData.businessWebsite && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Website:</span>
                            <span className="text-white">{formData.businessWebsite}</span>
                          </div>
                        )}
                        {formData.manufacturerTier && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Tier:</span>
                            <span className="text-white capitalize">{formData.manufacturerTier}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(formData.teamName || selectedMembershipType?.includesTeam) && (
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h4 className="font-medium text-white mb-3">Team</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Team Name:</span>
                          <span className={formData.teamName ? "text-white" : "text-blue-400"}>
                            {formData.teamName || 'Member will create after payment'}
                          </span>
                        </div>
                        {formData.teamDescription && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Description:</span>
                            <span className="text-white">{formData.teamDescription}</span>
                          </div>
                        )}
                        {!formData.teamName && selectedMembershipType?.includesTeam && (
                          <div className="pt-2 border-t border-slate-600 mt-2">
                            <p className="text-blue-400 text-xs flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Team will be created by member from their dashboard
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Payment Summary */}
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3">Payment</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Method:</span>
                        <span className="text-white capitalize">
                          {formData.paymentMethod === AdminPaymentMethod.CREDIT_CARD_INVOICE
                            ? 'Credit Card (Invoice)'
                            : formData.paymentMethod?.replace('_', ' ')}
                        </span>
                      </div>
                      {formData.paymentMethod === AdminPaymentMethod.CHECK && formData.checkNumber && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Check #:</span>
                          <span className="text-white">{formData.checkNumber}</span>
                        </div>
                      )}
                      {formData.paymentMethod === AdminPaymentMethod.COMPLIMENTARY && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Reason:</span>
                          <span className="text-white">{formData.complimentaryReason}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-slate-600">
                        <span className="text-gray-400">Invoice & Receipt:</span>
                        <span className="text-green-400">Will be auto-created</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Status Warning */}
                  {formData.paymentMethod === AdminPaymentMethod.CREDIT_CARD_INVOICE && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                        <div className="text-sm text-gray-300">
                          The membership will be created with <strong className="text-yellow-400">PENDING</strong> status.
                          The user must pay the invoice before the membership becomes active.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700">
          <button
            onClick={currentStepIndex === 0 ? onClose : goToPreviousStep}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" />
            {currentStepIndex === 0 ? 'Cancel' : 'Back'}
          </button>

          {currentStep === 'review' ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  Create Membership
                </>
              )}
            </button>
          ) : (
            <button
              onClick={goToNextStep}
              className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
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
