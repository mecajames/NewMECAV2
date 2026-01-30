import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth';
import { createJudgeApplication, getMyJudgeApplication, getMyJudgeProfile } from '../judges.api-client';
import type { CreateJudgeApplicationDto } from '@newmeca/shared';
import { JudgeSpecialty, WeekendAvailability, ApplicationStatus } from '@newmeca/shared';
import CountrySelect from '@/shared/fields/CountrySelect';
import StateProvinceSelect from '@/shared/fields/StateProvinceSelect';
import { getPostalCodeLabel, getStateLabel } from '@/utils/countries';

type ApplicationStep = 'personal' | 'location' | 'experience' | 'specialty' | 'essays' | 'references' | 'acknowledgments' | 'review';

const STEPS: ApplicationStep[] = ['personal', 'location', 'experience', 'specialty', 'essays', 'references', 'acknowledgments', 'review'];

const STEP_TITLES: Record<ApplicationStep, string> = {
  personal: 'Personal Information',
  location: 'Location & Travel',
  experience: 'Industry Experience',
  specialty: 'Specialty & Skills',
  essays: 'Essays',
  references: 'Professional References',
  acknowledgments: 'Acknowledgments',
  review: 'Review & Submit',
};

interface Reference {
  name: string;
  relationship: string;
  email: string;
  phone?: string;
  company_name?: string;
}

export default function JudgeApplicationPage() {
  const { user: _user, profile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<ApplicationStep>('personal');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [isJudge, setIsJudge] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    // Personal
    full_name: '',
    preferred_name: '',
    date_of_birth: '',
    phone: '',
    secondary_phone: '',
    headshot_url: '',

    // Location
    country: 'US',
    state: '',
    city: '',
    zip: '',
    travel_radius: '',
    additional_regions: [] as string[],
    weekend_availability: WeekendAvailability.BOTH,
    availability_notes: '',

    // Experience
    years_in_industry: 0,
    industry_positions: '',
    company_names: '',
    education_training: '',
    competition_history: '',
    judging_experience: '',

    // Specialty
    specialty: JudgeSpecialty.BOTH,
    sub_specialties: [] as string[],
    additional_skills: '',

    // Essays
    essay_why_judge: '',
    essay_qualifications: '',
    essay_additional: '',

    // References
    references: [
      { name: '', relationship: '', email: '', phone: '', company_name: '' },
      { name: '', relationship: '', email: '', phone: '', company_name: '' },
    ] as Reference[],

    // Acknowledgments
    ack_independent_contractor: false,
    ack_code_of_conduct: false,
    ack_background_check: false,
    ack_terms_conditions: false,
  });

  useEffect(() => {
    // Check if user has permission to access judge features
    if (profile && !(profile as any).can_apply_judge) {
      setPermissionDenied(true);
      setLoading(false);
      return;
    }
    checkExistingApplication();
  }, [profile]);

  async function checkExistingApplication() {
    setLoading(true);
    try {
      const [application, judgeProfile] = await Promise.all([
        getMyJudgeApplication(),
        getMyJudgeProfile(),
      ]);

      if (judgeProfile) {
        setIsJudge(true);
      } else if (application) {
        setExistingApplication(application);
      }
    } catch (err) {
      console.error('Error checking application:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleReferenceChange = (index: number, field: keyof Reference, value: string) => {
    setFormData(prev => {
      const newRefs = [...prev.references];
      newRefs[index] = { ...newRefs[index], [field]: value };
      return { ...prev, references: newRefs };
    });
  };

  const currentStepIndex = STEPS.indexOf(currentStep);

  const goNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1]);
    }
  };

  const goPrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const dto: CreateJudgeApplicationDto = {
        ...formData,
        date_of_birth: new Date(formData.date_of_birth),
        references: formData.references.filter(r => r.name && r.email),
        weekend_availability: formData.weekend_availability as WeekendAvailability,
      };

      await createJudgeApplication(dto);
      navigate('/dashboard', { state: { message: 'Judge application submitted successfully!' } });
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  // Show permission denied message if user doesn't have judge permission
  if (permissionDenied) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 rounded-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-slate-400 mb-6">
            You don't currently have permission to access judge features. Please contact MECA administration if you believe this is an error.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (isJudge) {
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="max-w-2xl mx-auto bg-slate-800 rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">You're Already a Judge!</h1>
          <p className="text-slate-300 mb-6">
            You're already registered as a MECA Judge. View your dashboard to see your assignments and stats.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (existingApplication) {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-500',
      under_review: 'bg-blue-500',
      approved: 'bg-green-500',
      rejected: 'bg-red-500',
    };

    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="max-w-2xl mx-auto bg-slate-800 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-white mb-4">Application Status</h1>
          <div className="flex items-center gap-3 mb-6">
            <span className={`px-3 py-1 rounded-full text-white text-sm ${statusColors[existingApplication.status] || 'bg-gray-500'}`}>
              {existingApplication.status.replace('_', ' ').toUpperCase()}
            </span>
            <span className="text-slate-400">
              Submitted on {new Date(existingApplication.applicationDate).toLocaleDateString()}
            </span>
          </div>

          {existingApplication.status === ApplicationStatus.PENDING && (
            <p className="text-slate-300 mb-4">
              Your application is pending review. We'll notify you via email once it has been reviewed.
            </p>
          )}

          {existingApplication.status === ApplicationStatus.UNDER_REVIEW && (
            <p className="text-slate-300 mb-4">
              Your application is currently under review. Thank you for your patience.
            </p>
          )}

          {existingApplication.status === ApplicationStatus.REJECTED && (
            <p className="text-slate-300 mb-4">
              Unfortunately, your application was not approved at this time.
              Please contact support for more information.
            </p>
          )}

          <button
            onClick={() => navigate('/dashboard')}
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Judge Application</h1>
          <p className="text-slate-400">
            Apply to become a MECA certified judge. Complete all sections below.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className={`flex flex-col items-center ${
                  index <= currentStepIndex ? 'text-orange-500' : 'text-slate-500'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${
                    index < currentStepIndex
                      ? 'bg-orange-500 text-white'
                      : index === currentStepIndex
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {index + 1}
                </div>
                <span className="text-xs hidden md:block">{STEP_TITLES[step]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-slate-800 rounded-lg p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
              {error}
            </div>
          )}

          <h2 className="text-xl font-semibold text-white mb-6">{STEP_TITLES[currentStep]}</h2>

          {/* Step Content */}
          {currentStep === 'personal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Preferred Name</label>
                  <input
                    type="text"
                    value={formData.preferred_name}
                    onChange={(e) => handleInputChange('preferred_name', e.target.value)}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">Primary Phone *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-1">Secondary Phone</label>
                <input
                  type="tel"
                  value={formData.secondary_phone}
                  onChange={(e) => handleInputChange('secondary_phone', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {currentStep === 'location' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CountrySelect
                  value={formData.country}
                  onChange={(code) => {
                    handleInputChange('country', code);
                    // Clear state when country changes
                    handleInputChange('state', '');
                  }}
                  label="Country"
                  required
                  showIcon={false}
                />
                <StateProvinceSelect
                  value={formData.state}
                  onChange={(code) => handleInputChange('state', code)}
                  country={formData.country}
                  label={getStateLabel(formData.country)}
                  required
                  showIcon={false}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm mb-1">City *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-1">{getPostalCodeLabel(formData.country)} *</label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => handleInputChange('zip', e.target.value)}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-1">Travel Radius *</label>
                <select
                  value={formData.travel_radius}
                  onChange={(e) => handleInputChange('travel_radius', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                  required
                >
                  <option value="">Select...</option>
                  <option value="50 miles">Within 50 miles</option>
                  <option value="100 miles">Within 100 miles</option>
                  <option value="250 miles">Within 250 miles</option>
                  <option value="500 miles">Within 500 miles</option>
                  <option value="nationwide">Nationwide</option>
                  <option value="international">International</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-1">Weekend Availability *</label>
                <select
                  value={formData.weekend_availability}
                  onChange={(e) => handleInputChange('weekend_availability', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                  required
                >
                  <option value={WeekendAvailability.BOTH}>Both Saturday & Sunday</option>
                  <option value={WeekendAvailability.SATURDAY}>Saturday Only</option>
                  <option value={WeekendAvailability.SUNDAY}>Sunday Only</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-1">Availability Notes</label>
                <textarea
                  value={formData.availability_notes}
                  onChange={(e) => handleInputChange('availability_notes', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none h-24"
                  placeholder="Any blackout dates or special scheduling considerations..."
                />
              </div>
            </div>
          )}

          {currentStep === 'experience' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-1">Years in Car Audio Industry *</label>
                <input
                  type="number"
                  min="0"
                  value={formData.years_in_industry}
                  onChange={(e) => handleInputChange('years_in_industry', parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-1">Industry Positions Held *</label>
                <textarea
                  value={formData.industry_positions}
                  onChange={(e) => handleInputChange('industry_positions', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none h-24"
                  placeholder="Describe positions you've held in the car audio industry..."
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-1">Company Names</label>
                <textarea
                  value={formData.company_names}
                  onChange={(e) => handleInputChange('company_names', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none h-20"
                  placeholder="List companies you've worked for..."
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-1">Competition History</label>
                <textarea
                  value={formData.competition_history}
                  onChange={(e) => handleInputChange('competition_history', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none h-24"
                  placeholder="Describe your history as a competitor (if any)..."
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-1">Previous Judging Experience</label>
                <textarea
                  value={formData.judging_experience}
                  onChange={(e) => handleInputChange('judging_experience', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none h-24"
                  placeholder="Describe any previous judging experience..."
                />
              </div>
            </div>
          )}

          {currentStep === 'specialty' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-1">Primary Specialty *</label>
                <select
                  value={formData.specialty}
                  onChange={(e) => handleInputChange('specialty', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                  required
                >
                  <option value={JudgeSpecialty.BOTH}>Both SQL & SPL</option>
                  <option value={JudgeSpecialty.SQL}>SQL (Sound Quality League)</option>
                  <option value={JudgeSpecialty.SPL}>SPL (Sound Pressure League)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-1">Additional Skills</label>
                <textarea
                  value={formData.additional_skills}
                  onChange={(e) => handleInputChange('additional_skills', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none h-24"
                  placeholder="Any additional skills or certifications relevant to judging..."
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-1">Education & Training</label>
                <textarea
                  value={formData.education_training}
                  onChange={(e) => handleInputChange('education_training', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none h-24"
                  placeholder="Relevant education, certifications, or training..."
                />
              </div>
            </div>
          )}

          {currentStep === 'essays' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-1">Why do you want to become a MECA Judge? *</label>
                <textarea
                  value={formData.essay_why_judge}
                  onChange={(e) => handleInputChange('essay_why_judge', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none h-32"
                  placeholder="Minimum 100 characters..."
                  required
                />
                <span className="text-xs text-slate-400">{formData.essay_why_judge.length} / 100 min characters</span>
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-1">What qualifies you to be a MECA Judge? *</label>
                <textarea
                  value={formData.essay_qualifications}
                  onChange={(e) => handleInputChange('essay_qualifications', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none h-32"
                  placeholder="Minimum 100 characters..."
                  required
                />
                <span className="text-xs text-slate-400">{formData.essay_qualifications.length} / 100 min characters</span>
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-1">Anything else you'd like us to know?</label>
                <textarea
                  value={formData.essay_additional}
                  onChange={(e) => handleInputChange('essay_additional', e.target.value)}
                  className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none h-24"
                />
              </div>
            </div>
          )}

          {currentStep === 'references' && (
            <div className="space-y-6">
              <p className="text-slate-400 text-sm">
                Please provide at least 2 professional references who can vouch for your qualifications.
                We will send them an email to verify the reference.
              </p>

              {formData.references.map((ref, index) => (
                <div key={index} className="p-4 bg-slate-700/50 rounded-lg space-y-3">
                  <h4 className="text-white font-medium">Reference {index + 1}</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 text-sm mb-1">Name *</label>
                      <input
                        type="text"
                        value={ref.name}
                        onChange={(e) => handleReferenceChange(index, 'name', e.target.value)}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm mb-1">Relationship *</label>
                      <input
                        type="text"
                        value={ref.relationship}
                        onChange={(e) => handleReferenceChange(index, 'relationship', e.target.value)}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                        placeholder="e.g., Former Employer, Industry Colleague"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 text-sm mb-1">Email *</label>
                      <input
                        type="email"
                        value={ref.email}
                        onChange={(e) => handleReferenceChange(index, 'email', e.target.value)}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm mb-1">Phone</label>
                      <input
                        type="tel"
                        value={ref.phone || ''}
                        onChange={(e) => handleReferenceChange(index, 'phone', e.target.value)}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm mb-1">Company</label>
                    <input
                      type="text"
                      value={ref.company_name || ''}
                      onChange={(e) => handleReferenceChange(index, 'company_name', e.target.value)}
                      className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              ))}

              {formData.references.length < 4 && (
                <button
                  type="button"
                  onClick={() => handleInputChange('references', [
                    ...formData.references,
                    { name: '', relationship: '', email: '', phone: '', company_name: '' }
                  ])}
                  className="text-orange-500 hover:text-orange-400 text-sm"
                >
                  + Add Another Reference
                </button>
              )}
            </div>
          )}

          {currentStep === 'acknowledgments' && (
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ack_independent_contractor}
                  onChange={(e) => handleInputChange('ack_independent_contractor', e.target.checked)}
                  className="mt-1"
                />
                <span className="text-slate-300 text-sm">
                  I understand that MECA Judges are independent contractors and not employees of MECA. *
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ack_code_of_conduct}
                  onChange={(e) => handleInputChange('ack_code_of_conduct', e.target.checked)}
                  className="mt-1"
                />
                <span className="text-slate-300 text-sm">
                  I agree to abide by the MECA Judge Code of Conduct and maintain professional standards. *
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ack_background_check}
                  onChange={(e) => handleInputChange('ack_background_check', e.target.checked)}
                  className="mt-1"
                />
                <span className="text-slate-300 text-sm">
                  I consent to a background check as part of the application process. *
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ack_terms_conditions}
                  onChange={(e) => handleInputChange('ack_terms_conditions', e.target.checked)}
                  className="mt-1"
                />
                <span className="text-slate-300 text-sm">
                  I have read and agree to the MECA Terms and Conditions. *
                </span>
              </label>
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-6">
              <p className="text-slate-400">
                Please review your application before submitting. You can go back to any section to make changes.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <h4 className="text-orange-500 font-medium mb-2">Personal Information</h4>
                  <p className="text-white">{formData.full_name}</p>
                  <p className="text-slate-400">{formData.phone}</p>
                  <p className="text-slate-400">DOB: {formData.date_of_birth}</p>
                </div>

                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <h4 className="text-orange-500 font-medium mb-2">Location</h4>
                  <p className="text-white">{formData.city}, {formData.state}</p>
                  <p className="text-slate-400">Travel: {formData.travel_radius}</p>
                </div>

                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <h4 className="text-orange-500 font-medium mb-2">Experience</h4>
                  <p className="text-white">{formData.years_in_industry} years in industry</p>
                  <p className="text-slate-400">Specialty: {formData.specialty}</p>
                </div>

                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <h4 className="text-orange-500 font-medium mb-2">References</h4>
                  {formData.references.filter(r => r.name).map((ref, i) => (
                    <p key={i} className="text-white">{ref.name}</p>
                  ))}
                </div>
              </div>

              <div className="bg-slate-700/50 p-4 rounded-lg">
                <h4 className="text-orange-500 font-medium mb-2">Acknowledgments</h4>
                <ul className="text-slate-400 text-sm space-y-1">
                  <li>✓ Independent Contractor Agreement</li>
                  <li>✓ Code of Conduct</li>
                  <li>✓ Background Check Consent</li>
                  <li>✓ Terms and Conditions</li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentStepIndex === 0}
              className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentStep === 'review' ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !formData.ack_independent_contractor || !formData.ack_code_of_conduct || !formData.ack_background_check || !formData.ack_terms_conditions}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
