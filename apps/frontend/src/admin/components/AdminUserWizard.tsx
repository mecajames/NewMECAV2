import { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  User,
  Shield,
  Check,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Mail,
  Copy,
  CheckCircle,
  CreditCard,
  DollarSign,
  Building2,
  Car,
  Users,
  FileText,
  Search,
  Link,
  UserPlus,
} from 'lucide-react';
import { profilesApi, CreateUserWithPasswordDto, Profile } from '../../profiles/profiles.api-client';
import {
  generatePassword,
  calculatePasswordStrength,
  MIN_PASSWORD_STRENGTH,
} from '../../utils/passwordUtils';
import { PasswordStrengthIndicator } from '../../shared/components/PasswordStrengthIndicator';
import { membershipTypeConfigsApi, MembershipTypeConfig, MembershipCategory, ManufacturerTier } from '@/membership-type-configs';
import { membershipsApi, AdminPaymentMethod, AdminCreateMembershipDto, AdminCreateMembershipResult, Membership, MembershipAccountType } from '@/memberships';
import { countries, getStatesForCountry, getStateLabel, getPostalCodeLabel } from '../../utils/countries';

// User types
type UserType = 'staff' | 'membership';
type StaffRole = 'admin' | 'event_director' | 'judge';

interface AdminUserWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: { user: any; message: string; membership?: AdminCreateMembershipResult }) => void;
}

type WizardStep =
  | 'user-type'
  | 'basic-info'
  | 'password'
  | 'role'
  | 'membership-type'
  | 'secondary-option'
  | 'membership-details'
  | 'billing'
  | 'payment'
  | 'review';

// Interface for found master membership
interface MasterMembershipSearch {
  membership: Membership;
  user: Profile;
}

interface FormData {
  // User type
  userType: UserType | null;
  // Basic info
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  mecaId: string; // Optional - for migrated users from old system
  // Password
  passwordOption: 'generate' | 'manual';
  password: string;
  confirmPassword: string;
  forcePasswordChange: boolean;
  sendEmail: boolean;
  // Staff role
  staffRole: StaffRole | null;
  // Whether to also add membership (for staff users)
  addMembership: boolean;
  // Membership fields (for membership users)
  membershipTypeConfigId: string | null;
  paymentMethod: AdminPaymentMethod;
  // Secondary membership fields
  isSecondaryMembership: boolean;
  masterMembershipId: string | null;
  giveSecondaryLogin: boolean;
  // Competitor fields
  competitorName: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleLicensePlate: string;
  // Team add-on
  hasTeamAddon: boolean;
  teamName: string;
  teamDescription: string;
  // Business fields (Retailer/Manufacturer)
  businessName: string;
  businessWebsite: string;
  manufacturerTier: ManufacturerTier | null;
  // Billing info
  billingFirstName: string;
  billingLastName: string;
  billingEmail: string;
  billingPhone: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingPostalCode: string;
  billingCountry: string;
  // Payment details
  checkNumber: string;
  complimentaryReason: string;
  notes: string;
}

const initialFormData: FormData = {
  userType: null,
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  mecaId: '',
  passwordOption: 'generate',
  password: '',
  confirmPassword: '',
  forcePasswordChange: true,
  sendEmail: true,
  staffRole: null,
  addMembership: false,
  // Membership fields
  membershipTypeConfigId: null,
  paymentMethod: AdminPaymentMethod.CASH,
  // Secondary membership fields
  isSecondaryMembership: false,
  masterMembershipId: null,
  giveSecondaryLogin: false,
  // Competitor fields
  competitorName: '',
  vehicleMake: '',
  vehicleModel: '',
  vehicleColor: '',
  vehicleLicensePlate: '',
  hasTeamAddon: false,
  teamName: '',
  teamDescription: '',
  businessName: '',
  businessWebsite: '',
  manufacturerTier: null,
  billingFirstName: '',
  billingLastName: '',
  billingEmail: '',
  billingPhone: '',
  billingAddress: '',
  billingCity: '',
  billingState: '',
  billingPostalCode: '',
  billingCountry: 'US',
  checkNumber: '',
  complimentaryReason: '',
  notes: '',
};

export default function AdminUserWizard({
  isOpen,
  onClose,
  onSuccess,
}: AdminUserWizardProps) {
  const [step, setStep] = useState<WizardStep>('user-type');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [emailServiceConfigured, setEmailServiceConfigured] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [membershipTypes, setMembershipTypes] = useState<MembershipTypeConfig[]>([]);
  const [selectedMembershipType, setSelectedMembershipType] = useState<MembershipTypeConfig | null>(null);
  const [loadingMembershipTypes, setLoadingMembershipTypes] = useState(false);

  // Master search for secondary memberships
  const [masterSearchQuery, setMasterSearchQuery] = useState('');
  const [masterSearchResults, setMasterSearchResults] = useState<MasterMembershipSearch[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<MasterMembershipSearch | null>(null);
  const [searchingMaster, setSearchingMaster] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setStep('user-type');
      setError(null);
      setSelectedMembershipType(null);
      setMasterSearchQuery('');
      setMasterSearchResults([]);
      setSelectedMaster(null);
      checkEmailService();
    }
  }, [isOpen]);

  // Generate password when option changes
  useEffect(() => {
    if (formData.passwordOption === 'generate' && !formData.password) {
      handleGeneratePassword();
    }
  }, [formData.passwordOption]);

  // Load membership types when step changes to membership-type
  useEffect(() => {
    if (step === 'membership-type' && membershipTypes.length === 0) {
      loadMembershipTypes();
    }
  }, [step]);

  // Initialize billing info from user info when reaching billing step
  useEffect(() => {
    if (step === 'billing' && !formData.billingEmail) {
      setFormData(prev => ({
        ...prev,
        billingFirstName: prev.firstName,
        billingLastName: prev.lastName,
        billingEmail: prev.email,
        billingPhone: prev.phone,
      }));
    }
  }, [step]);

  const loadMembershipTypes = async () => {
    try {
      setLoadingMembershipTypes(true);
      const types = await membershipTypeConfigsApi.getAll(true);
      setMembershipTypes(types.filter(t => t.isActive && !t.isUpgradeOnly));
    } catch (err) {
      console.error('Error loading membership types:', err);
      setError('Failed to load membership types');
    } finally {
      setLoadingMembershipTypes(false);
    }
  };

  // Search for master memberships by MECA ID or email
  const searchMasterMemberships = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setMasterSearchResults([]);
      return;
    }

    setSearchingMaster(true);
    try {
      // Search profiles by email or name
      const profiles = await profilesApi.searchProfiles(query);

      // For each profile, get their active membership
      const results: MasterMembershipSearch[] = [];

      for (const profile of profiles.slice(0, 5)) {
        try {
          const membership = await membershipsApi.getUserActiveMembership(profile.id);
          if (membership && membership.mecaId) {
            // Only include memberships that can be masters (INDEPENDENT or already MASTER)
            const accountType = (membership as any).accountType;
            if (!accountType || accountType === MembershipAccountType.INDEPENDENT || accountType === MembershipAccountType.MASTER) {
              results.push({
                membership,
                user: profile,
              });
            }
          }
        } catch {
          // Profile doesn't have an active membership, skip
        }
      }

      // Also search by MECA ID if query is numeric
      if (/^\d+$/.test(query)) {
        try {
          const allMemberships = await membershipsApi.getAll();
          const matchingMembership = allMemberships.find(m => m.mecaId?.toString() === query);
          if (matchingMembership && matchingMembership.user) {
            const accountType = (matchingMembership as any).accountType;
            if (!accountType || accountType === MembershipAccountType.INDEPENDENT || accountType === MembershipAccountType.MASTER) {
              // Check if not already in results
              if (!results.find(r => r.membership.id === matchingMembership.id)) {
                results.push({
                  membership: matchingMembership,
                  user: matchingMembership.user as unknown as Profile,
                });
              }
            }
          }
        } catch {
          // Ignore errors
        }
      }

      setMasterSearchResults(results);
    } catch (err) {
      console.error('Error searching master memberships:', err);
    } finally {
      setSearchingMaster(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (masterSearchQuery) {
        searchMasterMemberships(masterSearchQuery);
      } else {
        setMasterSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [masterSearchQuery]);

  const checkEmailService = async () => {
    try {
      const status = await profilesApi.getEmailServiceStatus();
      setEmailServiceConfigured(status.configured);
    } catch (err) {
      console.error('Failed to check email service:', err);
      setEmailServiceConfigured(false);
    }
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword(14);
    setFormData(prev => ({
      ...prev,
      password: newPassword,
      confirmPassword: newPassword,
    }));
  };

  const copyPasswordToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formData.password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleMembershipTypeSelect = (type: MembershipTypeConfig) => {
    setSelectedMembershipType(type);
    setFormData(prev => ({
      ...prev,
      membershipTypeConfigId: type.id,
      // Reset category-specific fields when type changes
      vehicleMake: '',
      vehicleModel: '',
      vehicleColor: '',
      vehicleLicensePlate: '',
      competitorName: '',
      businessName: '',
      businessWebsite: '',
      manufacturerTier: null,
      hasTeamAddon: false,
      teamName: '',
      teamDescription: '',
    }));
  };

  const validateStep = (): boolean => {
    switch (step) {
      case 'user-type':
        if (!formData.userType) {
          setError('Please select a user type');
          return false;
        }
        return true;

      case 'basic-info':
        if (!formData.email) {
          setError('Email is required');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          setError('Please enter a valid email address');
          return false;
        }
        if (!formData.firstName) {
          setError('First name is required');
          return false;
        }
        if (!formData.lastName) {
          setError('Last name is required');
          return false;
        }
        // Validate MECA ID format if provided
        if (formData.mecaId && !/^\d{6}$/.test(formData.mecaId)) {
          setError('MECA ID must be exactly 6 digits');
          return false;
        }
        return true;

      case 'password':
        if (!formData.password) {
          setError('Password is required');
          return false;
        }
        const strength = calculatePasswordStrength(formData.password);
        if (strength.score < MIN_PASSWORD_STRENGTH) {
          setError(`Password must have a strength of at least ${MIN_PASSWORD_STRENGTH}`);
          return false;
        }
        if (formData.passwordOption === 'manual' && formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        return true;

      case 'role':
        if (formData.userType === 'staff' && !formData.staffRole) {
          setError('Please select a role');
          return false;
        }
        return true;

      case 'membership-type':
        if (!selectedMembershipType) {
          setError('Please select a membership type');
          return false;
        }
        return true;

      case 'secondary-option':
        if (formData.isSecondaryMembership) {
          if (!selectedMaster) {
            setError('Please search and select a master account');
            return false;
          }
          // If giving secondary a login, email is required
          if (formData.giveSecondaryLogin && !formData.email) {
            setError('Email is required when giving secondary their own login');
            return false;
          }
        }
        return true;

      case 'membership-details':
        // COMPETITOR and TEAM categories require vehicle info
        if (selectedMembershipType?.category === MembershipCategory.COMPETITOR || selectedMembershipType?.category === MembershipCategory.TEAM) {
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
        // TEAM category always requires team name, as does any membership with includesTeam
        if ((selectedMembershipType?.category === MembershipCategory.TEAM || selectedMembershipType?.includesTeam) && !formData.teamName) {
          setError('Team name is required for this membership type');
          return false;
        }
        return true;

      case 'payment':
        if (formData.paymentMethod === AdminPaymentMethod.CHECK && !formData.checkNumber) {
          setError('Check number is required for check payments');
          return false;
        }
        if (formData.paymentMethod === AdminPaymentMethod.COMPLIMENTARY && !formData.complimentaryReason) {
          setError('A reason is required for complimentary memberships');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const getStepsForUserType = (): WizardStep[] => {
    if (formData.userType === 'staff') {
      return ['user-type', 'basic-info', 'password', 'role', 'review'];
    } else {
      // For membership users, include secondary-option step after membership-type
      const baseSteps: WizardStep[] = ['user-type', 'basic-info', 'password', 'membership-type', 'secondary-option'];

      // If secondary and NOT giving login, skip billing/payment (master handles it)
      if (formData.isSecondaryMembership && !formData.giveSecondaryLogin) {
        return [...baseSteps, 'membership-details', 'review'];
      }

      // If secondary with login but payment handled by master
      if (formData.isSecondaryMembership) {
        return [...baseSteps, 'membership-details', 'review'];
      }

      // Normal independent membership flow
      return [...baseSteps, 'membership-details', 'billing', 'payment', 'review'];
    }
  };

  const getNextStep = (): WizardStep | null => {
    const steps = getStepsForUserType();
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      return steps[currentIndex + 1];
    }
    return null;
  };

  const getPrevStep = (): WizardStep | null => {
    const steps = getStepsForUserType();
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      return steps[currentIndex - 1];
    }
    return null;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    const nextStep = getNextStep();
    if (nextStep) {
      setStep(nextStep);
      setError(null);
    }
  };

  const handleBack = () => {
    const prevStep = getPrevStep();
    if (prevStep) {
      setStep(prevStep);
      setError(null);
    }
  };

  const calculateTotal = (): number => {
    if (!selectedMembershipType) return 0;
    return Number(selectedMembershipType.price);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    setError(null);

    try {
      // SECONDARY MEMBERSHIP - special flow
      if (formData.userType === 'membership' && formData.isSecondaryMembership && selectedMaster && selectedMembershipType) {
        // Creating a secondary membership linked to a master
        const competitorName = formData.competitorName || `${formData.firstName} ${formData.lastName}`.trim();

        const secondaryMembership = await membershipsApi.createSecondaryMembership(
          selectedMaster.membership.id,
          {
            membershipTypeConfigId: selectedMembershipType.id,
            competitorName,
            relationshipToMaster: 'friend', // Default for admin-created secondaries
            createLogin: formData.giveSecondaryLogin,
            email: formData.giveSecondaryLogin ? formData.email.toLowerCase().trim() : undefined,
            vehicleMake: formData.vehicleMake || undefined,
            vehicleModel: formData.vehicleModel || undefined,
            vehicleColor: formData.vehicleColor || undefined,
            vehicleLicensePlate: formData.vehicleLicensePlate || undefined,
            teamName: formData.teamName || undefined,
            teamDescription: formData.teamDescription || undefined,
          }
        );

        let message = `Secondary membership created for ${competitorName}!`;
        message += ` Linked to master account #${selectedMaster.membership.mecaId}.`;

        if (formData.giveSecondaryLogin) {
          message += ' A login account was created for the secondary.';
        } else {
          message += ' No separate login - master manages this membership.';
        }

        message += ' Payment is pending - use "Mark Paid" when payment is received.';

        onSuccess({
          user: secondaryMembership.user || selectedMaster.user,
          message,
          membership: { membership: secondaryMembership, message } as any,
        });
        onClose();
        return;
      }

      // STANDARD FLOW - Independent membership or staff user

      // Determine the role based on user type
      let role = 'user';
      if (formData.userType === 'staff' && formData.staffRole) {
        role = formData.staffRole;
      }

      // First, create the user
      const userDto: CreateUserWithPasswordDto = {
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim() || undefined,
        role,
        forcePasswordChange: formData.forcePasswordChange,
        sendEmail: formData.sendEmail && emailServiceConfigured,
        mecaId: formData.mecaId.trim() || undefined,
      };

      const user = await profilesApi.createWithPassword(userDto);

      let message = `User ${user.first_name} ${user.last_name} created successfully!`;
      let membershipResult: AdminCreateMembershipResult | undefined;

      // If membership user, create the membership
      if (formData.userType === 'membership' && selectedMembershipType) {
        try {
          const membershipDto: AdminCreateMembershipDto = {
            userId: user.id,
            membershipTypeConfigId: selectedMembershipType.id,
            paymentMethod: formData.paymentMethod,
            // Competitor fields
            competitorName: formData.competitorName || undefined,
            vehicleMake: formData.vehicleMake || undefined,
            vehicleModel: formData.vehicleModel || undefined,
            vehicleColor: formData.vehicleColor || undefined,
            vehicleLicensePlate: formData.vehicleLicensePlate || undefined,
            // Team add-on
            hasTeamAddon: formData.hasTeamAddon,
            teamName: formData.teamName || undefined,
            teamDescription: formData.teamDescription || undefined,
            // Business fields
            businessName: formData.businessName || undefined,
            businessWebsite: formData.businessWebsite || undefined,
            manufacturerTier: formData.manufacturerTier || undefined,
            // Billing info
            billingFirstName: formData.billingFirstName || undefined,
            billingLastName: formData.billingLastName || undefined,
            billingEmail: formData.billingEmail || undefined,
            billingPhone: formData.billingPhone || undefined,
            billingAddress: formData.billingAddress || undefined,
            billingCity: formData.billingCity || undefined,
            billingState: formData.billingState || undefined,
            billingPostalCode: formData.billingPostalCode || undefined,
            billingCountry: formData.billingCountry || undefined,
            // Payment details
            checkNumber: formData.checkNumber || undefined,
            createInvoice: true, // Always create invoice and receipt for all payment types
            complimentaryReason: formData.complimentaryReason || undefined,
            notes: formData.notes || undefined,
          };

          membershipResult = await membershipsApi.adminCreate(membershipDto);
          message += ` ${selectedMembershipType.name} membership assigned.`;

          if (formData.paymentMethod === AdminPaymentMethod.CREDIT_CARD_INVOICE) {
            message += ' Invoice created - membership is PENDING until paid.';
          }
        } catch (membershipError: any) {
          console.error('Error creating membership:', membershipError);
          message += ` Warning: User created but membership failed: ${membershipError.message}`;
        }
      }

      // If staff user wants to add membership, note that they need to do it separately
      if (formData.userType === 'staff' && formData.addMembership) {
        message += ' You can now add a membership from their profile page.';
      }

      if (formData.sendEmail && emailServiceConfigured) {
        message += ' An email with login credentials has been sent.';
      } else if (!emailServiceConfigured) {
        message += ` Password: ${formData.password}`;
      }

      onSuccess({ user, message, membership: membershipResult });
      onClose();
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role: StaffRole): string => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'event_director':
        return 'Event Director';
      case 'judge':
        return 'Judge';
      default:
        return role;
    }
  };

  const getRoleDescription = (role: StaffRole): string => {
    switch (role) {
      case 'admin':
        return 'Full access to all system features and settings';
      case 'event_director':
        return 'Can create and manage events, view registrations';
      case 'judge':
        return 'Can score competitors at events';
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  const steps = getStepsForUserType();
  const currentStepIndex = steps.indexOf(step);
  const totalSteps = steps.length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Create New User</h2>
            <p className="text-sm text-gray-400 mt-1">
              Step {currentStepIndex + 1} of {totalSteps}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: User Type Selection */}
          {step === 'user-type' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">What type of user?</h3>

              <button
                onClick={() => handleInputChange('userType', 'staff')}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  formData.userType === 'staff'
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    formData.userType === 'staff' ? 'bg-orange-500' : 'bg-slate-700'
                  }`}>
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Application User (Staff)</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Admin, Event Director, or Judge - no payment required
                    </p>
                  </div>
                  {formData.userType === 'staff' && (
                    <Check className="h-5 w-5 text-orange-500 ml-auto" />
                  )}
                </div>
              </button>

              <button
                onClick={() => handleInputChange('userType', 'membership')}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  formData.userType === 'membership'
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    formData.userType === 'membership' ? 'bg-orange-500' : 'bg-slate-700'
                  }`}>
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Membership User</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Competitor, Retailer, or Manufacturer - includes membership setup
                    </p>
                  </div>
                  {formData.userType === 'membership' && (
                    <Check className="h-5 w-5 text-orange-500 ml-auto" />
                  )}
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Basic Information */}
          {step === 'basic-info' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="user@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              {/* MECA ID - for migrated users */}
              <div className="pt-4 border-t border-slate-600">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  MECA ID (Optional - for migrated users only)
                </label>
                <input
                  type="text"
                  value={formData.mecaId}
                  onChange={(e) => {
                    // Only allow digits and max 6 characters
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    handleInputChange('mecaId', value);
                  }}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Leave blank for new users (auto-assigned)"
                  maxLength={6}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Only enter if migrating a user from the old system who already has a MECA ID.
                  New users will automatically receive a MECA ID starting from 701500.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Password Setup */}
          {step === 'password' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Password Setup</h3>

              {/* Password Option Toggle */}
              <div className="flex gap-2 p-1 bg-slate-700 rounded-lg">
                <button
                  onClick={() => {
                    handleInputChange('passwordOption', 'generate');
                    handleGeneratePassword();
                  }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    formData.passwordOption === 'generate'
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Generate Password
                </button>
                <button
                  onClick={() => {
                    handleInputChange('passwordOption', 'manual');
                    handleInputChange('password', '');
                    handleInputChange('confirmPassword', '');
                  }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    formData.passwordOption === 'manual'
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Set Manually
                </button>
              </div>

              {formData.passwordOption === 'generate' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Generated Password
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          readOnly
                          className="w-full px-4 py-3 pr-20 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                        <button
                          type="button"
                          onClick={copyPasswordToClipboard}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {copiedPassword ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Copy className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={handleGeneratePassword}
                        className="px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white hover:bg-slate-600 transition-colors"
                      >
                        <RefreshCw className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  {formData.password && (
                    <PasswordStrengthIndicator password={formData.password} />
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="w-full px-4 py-3 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Confirm Password *
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Confirm password"
                    />
                  </div>
                  {formData.password && (
                    <PasswordStrengthIndicator password={formData.password} />
                  )}
                </div>
              )}

              {/* Password Options */}
              <div className="space-y-3 pt-4 border-t border-slate-700">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.forcePasswordChange}
                    onChange={(e) => handleInputChange('forcePasswordChange', e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-gray-300">Require password change on first login</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sendEmail}
                    onChange={(e) => handleInputChange('sendEmail', e.target.checked)}
                    disabled={!emailServiceConfigured}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500 disabled:opacity-50"
                  />
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className={!emailServiceConfigured ? 'text-gray-500' : 'text-gray-300'}>
                      Send login credentials via email
                    </span>
                  </div>
                </label>
                {!emailServiceConfigured && (
                  <p className="text-sm text-yellow-500 ml-8">
                    Email service is not configured. You'll need to share the password manually.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Role Selection (Staff only) */}
          {step === 'role' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Select Role</h3>

              {(['admin', 'event_director', 'judge'] as StaffRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => handleInputChange('staffRole', role)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    formData.staffRole === role
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-white">{getRoleDisplayName(role)}</h4>
                      <p className="text-sm text-gray-400 mt-1">{getRoleDescription(role)}</p>
                    </div>
                    {formData.staffRole === role && (
                      <Check className="h-5 w-5 text-orange-500" />
                    )}
                  </div>
                </button>
              ))}

              {/* Option to also add membership */}
              <div className="pt-4 border-t border-slate-700">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.addMembership}
                    onChange={(e) => handleInputChange('addMembership', e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500"
                  />
                  <div>
                    <span className="text-gray-300">Also add a membership</span>
                    <p className="text-sm text-gray-500">
                      You can add a membership from their profile page after creation
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Membership Type Selection (Membership users only) */}
          {step === 'membership-type' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Select Membership Type</h3>

              {loadingMembershipTypes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                </div>
              ) : (
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
              )}
            </div>
          )}

          {/* Secondary Option Step (Membership users only) */}
          {step === 'secondary-option' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-4">Membership Type</h3>

              {/* Independent vs Secondary Selection */}
              <div className="space-y-4">
                <button
                  onClick={() => {
                    handleInputChange('isSecondaryMembership', false);
                    setSelectedMaster(null);
                    handleInputChange('masterMembershipId', null);
                  }}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    !formData.isSecondaryMembership
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      !formData.isSecondaryMembership ? 'bg-orange-500' : 'bg-slate-700'
                    }`}>
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">Independent Membership</h4>
                      <p className="text-sm text-gray-400 mt-1">
                        Standard membership with their own billing and full account access
                      </p>
                    </div>
                    {!formData.isSecondaryMembership && (
                      <Check className="h-5 w-5 text-orange-500" />
                    )}
                  </div>
                </button>

                <button
                  onClick={() => handleInputChange('isSecondaryMembership', true)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    formData.isSecondaryMembership
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      formData.isSecondaryMembership ? 'bg-orange-500' : 'bg-slate-700'
                    }`}>
                      <Link className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">Secondary Membership</h4>
                      <p className="text-sm text-gray-400 mt-1">
                        Linked to a master account - billing handled by master, own MECA ID assigned
                      </p>
                    </div>
                    {formData.isSecondaryMembership && (
                      <Check className="h-5 w-5 text-orange-500" />
                    )}
                  </div>
                </button>
              </div>

              {/* Master Search (only when secondary selected) */}
              {formData.isSecondaryMembership && (
                <div className="border-t border-slate-700 pt-6 space-y-4">
                  <h4 className="font-medium text-white flex items-center gap-2">
                    <Search className="h-5 w-5 text-gray-400" />
                    Find Master Account
                  </h4>

                  <div className="relative">
                    <input
                      type="text"
                      value={masterSearchQuery}
                      onChange={(e) => setMasterSearchQuery(e.target.value)}
                      placeholder="Search by MECA ID, email, or name..."
                      className="w-full px-4 py-3 pl-10 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    {searchingMaster && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-500 animate-spin" />
                    )}
                  </div>

                  {/* Search Results */}
                  {masterSearchResults.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {masterSearchResults.map((result) => (
                        <button
                          key={result.membership.id}
                          onClick={() => {
                            setSelectedMaster(result);
                            handleInputChange('masterMembershipId', result.membership.id);
                            setMasterSearchQuery('');
                            setMasterSearchResults([]);
                          }}
                          className="w-full p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-white">
                                {`${result.user.first_name || ''} ${result.user.last_name || ''}`.trim() || result.user.email}
                              </div>
                              <div className="text-sm text-gray-400">
                                {result.user.email}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-orange-400 font-mono font-bold">
                                #{result.membership.mecaId}
                              </div>
                              <div className="text-xs text-gray-500">
                                {result.membership.membershipTypeConfig?.name}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {masterSearchQuery && masterSearchResults.length === 0 && !searchingMaster && (
                    <p className="text-sm text-gray-400 text-center py-4">
                      No master accounts found matching "{masterSearchQuery}"
                    </p>
                  )}

                  {/* Selected Master Display */}
                  {selectedMaster && (
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm text-green-400 font-medium mb-1">Selected Master Account</div>
                          <div className="text-white font-medium">
                            {`${selectedMaster.user.first_name || ''} ${selectedMaster.user.last_name || ''}`.trim() || selectedMaster.user.email}
                          </div>
                          <div className="text-sm text-gray-400">{selectedMaster.user.email}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-orange-400 font-mono font-bold text-lg">
                            #{selectedMaster.membership.mecaId}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedMaster(null);
                              handleInputChange('masterMembershipId', null);
                            }}
                            className="text-xs text-red-400 hover:text-red-300 mt-1"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Login Option for Secondary */}
                  {selectedMaster && (
                    <div className="border-t border-slate-700 pt-4 space-y-3">
                      <h4 className="font-medium text-white">Secondary Account Login</h4>

                      <button
                        onClick={() => handleInputChange('giveSecondaryLogin', false)}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          !formData.giveSecondaryLogin
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-gray-400" />
                          <div>
                            <div className="font-medium text-white">No separate login</div>
                            <div className="text-xs text-gray-400">
                              Master manages everything - secondary cannot log in separately
                            </div>
                          </div>
                          {!formData.giveSecondaryLogin && <Check className="h-4 w-4 text-orange-500 ml-auto" />}
                        </div>
                      </button>

                      <button
                        onClick={() => handleInputChange('giveSecondaryLogin', true)}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          formData.giveSecondaryLogin
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <UserPlus className="h-5 w-5 text-gray-400" />
                          <div>
                            <div className="font-medium text-white">Give their own login</div>
                            <div className="text-xs text-gray-400">
                              Secondary can log in, compete, edit profile (no billing access)
                            </div>
                          </div>
                          {formData.giveSecondaryLogin && <Check className="h-4 w-4 text-orange-500 ml-auto" />}
                        </div>
                      </button>

                      {formData.giveSecondaryLogin && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300">
                          The email entered in Step 2 will be used for the secondary's login. They'll receive login credentials.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Membership Details (Membership users only) */}
          {step === 'membership-details' && selectedMembershipType && (
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
                          value={formData.vehicleMake}
                          onChange={e => handleInputChange('vehicleMake', e.target.value)}
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
                          value={formData.vehicleModel}
                          onChange={e => handleInputChange('vehicleModel', e.target.value)}
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
                          value={formData.vehicleColor}
                          onChange={e => handleInputChange('vehicleColor', e.target.value)}
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
                          value={formData.vehicleLicensePlate}
                          onChange={e => handleInputChange('vehicleLicensePlate', e.target.value)}
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
                        value={formData.competitorName}
                        onChange={e => handleInputChange('competitorName', e.target.value)}
                        placeholder="If different from account holder (e.g., family member)"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Team Details - only show if team add-on was selected in previous step */}
                  {/* Team Information - show for membership types that include team */}
                  {selectedMembershipType?.includesTeam && (
                    <div className="border-t border-slate-700 pt-6">
                      <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5 text-green-400" />
                        Team Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Team Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.teamName}
                            onChange={e => handleInputChange('teamName', e.target.value)}
                            placeholder="Enter team name"
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Team Description
                          </label>
                          <textarea
                            value={formData.teamDescription}
                            onChange={e => handleInputChange('teamDescription', e.target.value)}
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
                          value={formData.businessName}
                          onChange={e => handleInputChange('businessName', e.target.value)}
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
                          value={formData.businessWebsite}
                          onChange={e => handleInputChange('businessWebsite', e.target.value)}
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
                            onClick={() => handleInputChange('manufacturerTier', tier)}
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
                          value={formData.teamName}
                          onChange={e => handleInputChange('teamName', e.target.value)}
                          placeholder="Enter team name (can use business name)"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Team Description
                        </label>
                        <textarea
                          value={formData.teamDescription}
                          onChange={e => handleInputChange('teamDescription', e.target.value)}
                          placeholder="Brief description of the team"
                          rows={2}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Team Category Details (for "Competitor w/Team" type memberships) */}
              {selectedMembershipType.category === MembershipCategory.TEAM && (
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
                          value={formData.vehicleMake}
                          onChange={e => handleInputChange('vehicleMake', e.target.value)}
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
                          value={formData.vehicleModel}
                          onChange={e => handleInputChange('vehicleModel', e.target.value)}
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
                          value={formData.vehicleColor}
                          onChange={e => handleInputChange('vehicleColor', e.target.value)}
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
                          value={formData.vehicleLicensePlate}
                          onChange={e => handleInputChange('vehicleLicensePlate', e.target.value)}
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
                        value={formData.competitorName}
                        onChange={e => handleInputChange('competitorName', e.target.value)}
                        placeholder="If different from account holder (e.g., family member)"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Team Information (always included for TEAM category) */}
                  <div className="border-t border-slate-700 pt-6">
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-400" />
                      Team Information
                      <span className="text-sm text-gray-400">(included with membership)</span>
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Team Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.teamName}
                          onChange={e => handleInputChange('teamName', e.target.value)}
                          placeholder="Enter team name"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Team Description
                        </label>
                        <textarea
                          value={formData.teamDescription}
                          onChange={e => handleInputChange('teamDescription', e.target.value)}
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

          {/* Billing Information (Membership users only) */}
          {step === 'billing' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white mb-4">Billing Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.billingFirstName}
                    onChange={e => handleInputChange('billingFirstName', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.billingLastName}
                    onChange={e => handleInputChange('billingLastName', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.billingEmail}
                    onChange={e => handleInputChange('billingEmail', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.billingPhone}
                    onChange={e => handleInputChange('billingPhone', e.target.value)}
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
                    handleInputChange('billingCountry', e.target.value);
                    // Reset state when country changes
                    handleInputChange('billingState', '');
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
                  value={formData.billingAddress}
                  onChange={e => handleInputChange('billingAddress', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.billingCity}
                    onChange={e => handleInputChange('billingCity', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {getStateLabel(formData.billingCountry || 'US')}
                  </label>
                  <select
                    value={formData.billingState}
                    onChange={e => handleInputChange('billingState', e.target.value)}
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
                  value={formData.billingPostalCode}
                  onChange={e => handleInputChange('billingPostalCode', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Payment Method (Membership users only) */}
          {step === 'payment' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white mb-4">Payment Method</h3>

              <div className="space-y-3">
                {/* Cash */}
                <button
                  onClick={() => handleInputChange('paymentMethod', AdminPaymentMethod.CASH)}
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
                  onClick={() => handleInputChange('paymentMethod', AdminPaymentMethod.CHECK)}
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
                  onClick={() => handleInputChange('paymentMethod', AdminPaymentMethod.CREDIT_CARD_INVOICE)}
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
                  onClick={() => handleInputChange('paymentMethod', AdminPaymentMethod.COMPLIMENTARY)}
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
                      value={formData.checkNumber}
                      onChange={e => handleInputChange('checkNumber', e.target.value)}
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
                      value={formData.complimentaryReason}
                      onChange={e => handleInputChange('complimentaryReason', e.target.value)}
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
                  value={formData.notes}
                  onChange={e => handleInputChange('notes', e.target.value)}
                  placeholder="Internal notes about this membership"
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Review Step */}
          {step === 'review' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-4">Review & Create</h3>

              {/* User Info Summary */}
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-4">
                <div>
                  <p className="text-sm text-gray-400">User Type</p>
                  <p className="text-white font-medium">
                    {formData.userType === 'staff' ? 'Application User (Staff)' : 'Membership User'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Name</p>
                    <p className="text-white font-medium">
                      {formData.firstName} {formData.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="text-white font-medium">{formData.email}</p>
                  </div>
                </div>

                {formData.phone && (
                  <div>
                    <p className="text-sm text-gray-400">Phone</p>
                    <p className="text-white font-medium">{formData.phone}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-400">MECA ID</p>
                  <p className="text-white font-medium">
                    {formData.mecaId ? (
                      <span>{formData.mecaId} <span className="text-xs text-yellow-500">(migrated)</span></span>
                    ) : (
                      <span className="text-gray-400">Will be auto-assigned</span>
                    )}
                  </p>
                </div>

                {formData.userType === 'staff' && formData.staffRole && (
                  <div>
                    <p className="text-sm text-gray-400">Role</p>
                    <p className="text-white font-medium">{getRoleDisplayName(formData.staffRole)}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-600">
                  <p className="text-sm text-gray-400 mb-2">Password Settings</p>
                  <ul className="space-y-1 text-sm text-gray-300">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Password has been {formData.passwordOption === 'generate' ? 'generated' : 'set manually'}
                    </li>
                    {formData.forcePasswordChange && (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        User will be required to change password on first login
                      </li>
                    )}
                    {formData.sendEmail && emailServiceConfigured ? (
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Login credentials will be emailed to user
                      </li>
                    ) : (
                      <li className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        You'll need to share the password manually
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Secondary Membership Info (when applicable) */}
              {formData.userType === 'membership' && formData.isSecondaryMembership && selectedMaster && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="font-medium text-purple-400 mb-3 flex items-center gap-2">
                    <Link className="h-5 w-5" />
                    Secondary Membership
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Linked to Master:</span>
                      <span className="text-white">
                        {`${selectedMaster.user.first_name || ''} ${selectedMaster.user.last_name || ''}`.trim() || selectedMaster.user.email}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Master MECA ID:</span>
                      <span className="text-orange-400 font-mono font-bold">#{selectedMaster.membership.mecaId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Secondary Login:</span>
                      <span className={formData.giveSecondaryLogin ? 'text-green-400' : 'text-gray-400'}>
                        {formData.giveSecondaryLogin ? 'Yes - own account' : 'No - managed by master'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Billing:</span>
                      <span className="text-blue-400">Handled by master account</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-500/30 text-xs text-purple-300">
                    Secondary will get their own MECA ID after payment is marked as received.
                  </div>
                </div>
              )}

              {/* Membership Summary (for membership users) */}
              {formData.userType === 'membership' && selectedMembershipType && (
                <>
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
                        <span className="text-gray-400">Account Type:</span>
                        <span className={formData.isSecondaryMembership ? 'text-purple-400' : 'text-white'}>
                          {formData.isSecondaryMembership ? 'Secondary (linked)' : 'Independent'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Base Price:</span>
                        <span className="text-white">${Number(selectedMembershipType.price).toFixed(2)}</span>
                      </div>
                      {!formData.isSecondaryMembership && (
                        <div className="flex justify-between pt-2 border-t border-slate-600">
                          <span className="text-gray-300 font-medium">Total:</span>
                          <span className="text-white font-bold">${calculateTotal().toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vehicle/Business Details Summary */}
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

                  {/* Team Summary */}
                  {(formData.teamName || selectedMembershipType?.includesTeam) && (
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h4 className="font-medium text-white mb-3">Team</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Team Name:</span>
                          <span className="text-white">{formData.teamName || 'Not set'}</span>
                        </div>
                        {formData.teamDescription && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Description:</span>
                            <span className="text-white">{formData.teamDescription}</span>
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
                </>
              )}

              {/* Staff with membership note */}
              {formData.userType === 'staff' && formData.addMembership && (
                <div className="pt-4 border-t border-slate-600">
                  <div className="flex items-start gap-2 text-sm text-blue-400">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>
                      After creating the user, go to their profile page to assign a membership.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 'user-type' || loading}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            Back
          </button>

          {step === 'review' ? (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  {formData.userType === 'membership'
                    ? formData.isSecondaryMembership
                      ? 'Create Secondary Membership'
                      : 'Create User & Membership'
                    : 'Create User'}
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
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
