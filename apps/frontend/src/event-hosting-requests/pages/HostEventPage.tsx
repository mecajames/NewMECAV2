import { Calendar, Users, Megaphone, CheckCircle, Send, AlertCircle, Building2, User, Users2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ReCaptchaV2Widget } from '@/shared';
import type { ReCaptchaV2Ref } from '@/shared';
import { recaptchaApi } from '@/recaptcha';
import { countries, getStatesForCountry, getStateLabel, getPostalCodeLabel } from '@/utils/countries';
import { CompetitionFormat } from '@/competition-formats';
import { SEOHead, useStaticPageSEO } from '@/shared/seo';

const ADDITIONAL_SERVICES_OPTIONS = [
  'Staffing',
  'Judges',
  'TermLab SPL Meter',
  'Tents',
  'Score Sheets',
  'Vendors',
  'Advertising & Marketing',
  'Sponsors',
  'Security',
  'SPL or SQL Judge Training',
  'Other',
];

const EVENT_TYPE_OPTIONS = [
  { value: '1x Event', label: '1x Event' },
  { value: '2x Event', label: '2x Event' },
  { value: '3x Event', label: '3x Event' },
  { value: '4x Event', label: '4x Event' },
  { value: 'Branded Event', label: 'Branded Event' },
  { value: 'Sponsored Event', label: 'Sponsored Event' },
  { value: 'Other', label: 'Other' },
];

const VENUE_TYPE_OPTIONS = [
  { value: 'retail-shop', label: 'Retail Shop' },
  { value: 'car-show', label: 'Car Show Venue' },
  { value: 'outdoor-lot', label: 'Outdoor Lot' },
  { value: 'convention-center', label: 'Convention Center' },
  { value: 'parking-lot', label: 'Parking Lot' },
  { value: 'event-center', label: 'Event Center' },
  { value: 'other', label: 'Other' },
];

const HOST_TYPE_OPTIONS = [
  { value: 'business', label: 'Business', icon: Building2 },
  { value: 'club', label: 'Club', icon: Users2 },
  { value: 'individual', label: 'Individual', icon: User },
];

const INDOOR_OUTDOOR_OPTIONS = [
  { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'both', label: 'Both' },
];

export default function HostEventPage() {
  const seoProps = useStaticPageSEO('hostEvent');
  const [competitionFormats, setCompetitionFormats] = useState<CompetitionFormat[]>([]);
  const [formData, setFormData] = useState({
    // Host Information
    hostType: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    // Venue Information
    venueName: '',
    venueType: '',
    indoorOutdoor: '',
    powerAvailable: '',
    // Event Information
    eventName: '',
    eventType: '',
    eventTypeOther: '',
    eventDescription: '',
    // Event Schedule - Day 1
    eventStartDate: '',
    eventStartTime: '',
    eventEndDate: '',
    eventEndTime: '',
    // Multi-day support
    isMultiDay: false,
    day2Date: '',
    day2StartTime: '',
    day2EndTime: '',
    day3Date: '',
    day3StartTime: '',
    day3EndTime: '',
    // Competition Formats
    selectedFormats: [] as string[],
    // Location
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    // Additional Details
    expectedParticipants: '',
    hasHostedBefore: '',
    // Registration & Entry Fees
    hasRegistrationFee: '',
    memberEntryFee: '',
    nonMemberEntryFee: '',
    preRegistrationAvailable: '',
    // Gate Fee
    hasGateFee: '',
    gateFee: '',
    // Budget
    estimatedBudget: '',
    // Services
    additionalServices: [] as string[],
    otherServicesDetails: '',
    otherRequests: '',
    additionalInfo: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const recaptchaRef = useRef<ReCaptchaV2Ref>(null);

  // Fetch competition formats on mount
  useEffect(() => {
    const fetchFormats = async () => {
      try {
        // Add timeout to prevent hanging if backend is down
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/competition-formats/active`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (response.ok) {
          const formats = await response.json();
          setCompetitionFormats(formats);
        } else {
          console.warn('Failed to fetch competition formats, using defaults');
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('Competition formats fetch timed out');
        } else {
          console.error('Error fetching competition formats:', error);
        }
      }
    };
    fetchFormats();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      // Get reCAPTCHA token from widget
      const token = recaptchaRef.current?.getToken();

      if (!token) {
        setSubmitMessage({
          type: 'error',
          text: 'Please complete the reCAPTCHA verification.',
        });
        setIsSubmitting(false);
        return;
      }

      // Verify token with backend
      const verification = await recaptchaApi.verify(token);

      if (!verification.success) {
        setSubmitMessage({
          type: 'error',
          text: 'reCAPTCHA verification failed. Please try again.',
        });
        recaptchaRef.current?.reset();
        setIsSubmitting(false);
        return;
      }

      // Transform form data to match backend API expectations (snake_case)
      const requestData = {
        // Host Information
        host_type: formData.hostType || null,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        business_name: formData.businessName,
        // Venue Information
        venue_name: formData.venueName,
        venue_type: formData.venueType,
        indoor_outdoor: formData.indoorOutdoor || null,
        power_available: formData.powerAvailable === 'yes' ? true : formData.powerAvailable === 'no' ? false : null,
        // Event Information
        event_name: formData.eventName,
        event_type: formData.eventType,
        event_type_other: formData.eventTypeOther,
        event_description: formData.eventDescription,
        // Event Schedule
        event_start_date: formData.eventStartDate || null,
        event_start_time: formData.eventStartTime || null,
        event_end_date: formData.eventEndDate || null,
        event_end_time: formData.eventEndTime || null,
        // Multi-day
        is_multi_day: formData.isMultiDay,
        day_2_date: formData.isMultiDay && formData.day2Date ? formData.day2Date : null,
        day_2_start_time: formData.isMultiDay ? formData.day2StartTime : null,
        day_2_end_time: formData.isMultiDay ? formData.day2EndTime : null,
        day_3_date: formData.isMultiDay && formData.day3Date ? formData.day3Date : null,
        day_3_start_time: formData.isMultiDay ? formData.day3StartTime : null,
        day_3_end_time: formData.isMultiDay ? formData.day3EndTime : null,
        // Competition Formats
        competition_formats: formData.selectedFormats,
        // Location
        address_line_1: formData.addressLine1,
        address_line_2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postalCode,
        country: formData.country,
        // Additional Details
        expected_participants: formData.expectedParticipants ? parseInt(formData.expectedParticipants) : null,
        has_hosted_before: formData.hasHostedBefore === 'yes',
        // Registration & Fees
        has_registration_fee: formData.hasRegistrationFee === 'yes' ? true : formData.hasRegistrationFee === 'no' ? false : null,
        member_entry_fee: formData.memberEntryFee || null,
        non_member_entry_fee: formData.nonMemberEntryFee || null,
        pre_registration_available: formData.preRegistrationAvailable === 'yes' ? true : formData.preRegistrationAvailable === 'no' ? false : null,
        // Gate Fee
        has_gate_fee: formData.hasGateFee === 'yes' ? true : formData.hasGateFee === 'no' ? false : null,
        gate_fee: formData.gateFee || null,
        // Budget
        estimated_budget: formData.estimatedBudget,
        // Services
        additional_services: formData.additionalServices,
        other_services_details: formData.otherServicesDetails,
        other_requests: formData.otherRequests,
        additional_info: formData.additionalInfo,
      };

      await axios.post('/api/event-hosting-requests', requestData);

      setSubmitMessage({
        type: 'success',
        text: 'Thank you for your interest in hosting a MECA event! We have received your request and will contact you soon.',
      });

      // Reset form and reCAPTCHA
      setFormData({
        hostType: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        businessName: '',
        venueName: '',
        venueType: '',
        indoorOutdoor: '',
        powerAvailable: '',
        eventName: '',
        eventType: '',
        eventTypeOther: '',
        eventDescription: '',
        eventStartDate: '',
        eventStartTime: '',
        eventEndDate: '',
        eventEndTime: '',
        isMultiDay: false,
        day2Date: '',
        day2StartTime: '',
        day2EndTime: '',
        day3Date: '',
        day3StartTime: '',
        day3EndTime: '',
        selectedFormats: [],
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
        expectedParticipants: '',
        hasHostedBefore: '',
        hasRegistrationFee: '',
        memberEntryFee: '',
        nonMemberEntryFee: '',
        preRegistrationAvailable: '',
        hasGateFee: '',
        gateFee: '',
        estimatedBudget: '',
        additionalServices: [],
        otherServicesDetails: '',
        otherRequests: '',
        additionalInfo: '',
      });
      recaptchaRef.current?.reset();
    } catch (error) {
      console.error('Error submitting event hosting request:', error);
      setSubmitMessage({
        type: 'error',
        text: 'There was an error submitting your request. Please try again later.',
      });
      recaptchaRef.current?.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCheckboxChange = (service: string) => {
    setFormData({
      ...formData,
      additionalServices: formData.additionalServices.includes(service)
        ? formData.additionalServices.filter((s) => s !== service)
        : [...formData.additionalServices, service],
    });
  };

  const handleFormatChange = (formatName: string) => {
    setFormData({
      ...formData,
      selectedFormats: formData.selectedFormats.includes(formatName)
        ? formData.selectedFormats.filter((f) => f !== formatName)
        : [...formData.selectedFormats, formatName],
    });
  };

  const benefits = [
    {
      icon: Users,
      title: 'Attract Customers',
      description: 'Bring car audio enthusiasts and potential customers to your location',
    },
    {
      icon: Megaphone,
      title: 'Brand Exposure',
      description: 'Get your business featured in MECA promotional materials and events calendar',
    },
    {
      icon: Calendar,
      title: 'Flexible Scheduling',
      description: 'Work with us to find dates that fit your business calendar',
    },
    {
      icon: CheckCircle,
      title: 'Full Support',
      description: 'MECA provides judging and event management support',
    },
  ];

  return (
    <>
      <SEOHead {...seoProps} />
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="relative bg-gradient-to-r from-orange-600 to-red-600 py-12 sm:py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">Host a MECA Event</h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-3xl mx-auto">
            Partner with MECA to bring exciting car audio competitions to your location
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        {/* Benefits Section */}
        <div className="mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white text-center mb-8 sm:mb-12">
            Why Host a MECA Event?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-slate-800 p-6 rounded-xl shadow-lg"
              >
                <benefit.icon className="h-12 w-12 text-orange-500 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">
                  {benefit.title}
                </h3>
                <p className="text-gray-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Information Section */}
        <div className="mb-16 bg-slate-800 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Event Requirements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-300">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Venue Requirements</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Adequate space for competitor parking and setup</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Access to power outlets (for SPL events)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Location that can accommodate sound pressure levels (for SPL)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Weather contingency plan for outdoor events</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">What MECA Provides</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Certified judges and scoring equipment</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Event promotion and registration management</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Official MECA rulebooks and guidelines</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-500 mr-2">•</span>
                  <span>Awards and recognition for participants</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Application Form */}
        <div className="bg-slate-800 rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-white mb-6">Event Hosting Application</h2>

          {submitMessage && (
            <div
              className={`mb-6 p-4 rounded-lg flex items-start ${
                submitMessage.type === 'success'
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}
            >
              {submitMessage.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              )}
              <p
                className={`text-sm ${
                  submitMessage.type === 'success' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {submitMessage.text}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Host Type Selection */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Who is hosting this event? *</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {HOST_TYPE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.hostType === option.value
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="hostType"
                      value={option.value}
                      checked={formData.hostType === option.value}
                      onChange={handleChange}
                      className="sr-only"
                      required
                    />
                    <option.icon className={`h-6 w-6 mr-3 ${formData.hostType === option.value ? 'text-orange-500' : 'text-gray-400'}`} />
                    <span className={`font-medium ${formData.hostType === option.value ? 'text-white' : 'text-gray-300'}`}>
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Personal/Business Information */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Your Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>

                {(formData.hostType === 'business' || formData.hostType === 'club') && (
                  <div className="md:col-span-2">
                    <label htmlFor="businessName" className="block text-sm font-medium text-gray-300 mb-2">
                      {formData.hostType === 'club' ? 'Club Name' : 'Business Name'}
                    </label>
                    <input
                      type="text"
                      id="businessName"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder={formData.hostType === 'club' ? 'Your club name' : 'Your business name'}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Venue Information */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Venue Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="venueName" className="block text-sm font-medium text-gray-300 mb-2">
                    Venue Name *
                  </label>
                  <input
                    type="text"
                    id="venueName"
                    name="venueName"
                    value={formData.venueName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Name of the venue where the event will be held"
                  />
                </div>

                <div>
                  <label htmlFor="venueType" className="block text-sm font-medium text-gray-300 mb-2">
                    Venue Type *
                  </label>
                  <select
                    id="venueType"
                    name="venueType"
                    value={formData.venueType}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select venue type</option>
                    {VENUE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="indoorOutdoor" className="block text-sm font-medium text-gray-300 mb-2">
                    Indoor/Outdoor *
                  </label>
                  <select
                    id="indoorOutdoor"
                    name="indoorOutdoor"
                    value={formData.indoorOutdoor}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select option</option>
                    {INDOOR_OUTDOOR_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="powerAvailable" className="block text-sm font-medium text-gray-300 mb-2">
                    Power Available? *
                  </label>
                  <select
                    id="powerAvailable"
                    name="powerAvailable"
                    value={formData.powerAvailable}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select option</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Event Information */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Event Details</h3>
              <div className="space-y-6">
                <div>
                  <label htmlFor="eventName" className="block text-sm font-medium text-gray-300 mb-2">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    id="eventName"
                    name="eventName"
                    value={formData.eventName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Your event name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="eventType" className="block text-sm font-medium text-gray-300 mb-2">
                      Event Type *
                    </label>
                    <select
                      id="eventType"
                      name="eventType"
                      value={formData.eventType}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Select event type</option>
                      {EVENT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.eventType === 'Other' && (
                    <div>
                      <label htmlFor="eventTypeOther" className="block text-sm font-medium text-gray-300 mb-2">
                        Please specify event type *
                      </label>
                      <input
                        type="text"
                        id="eventTypeOther"
                        name="eventTypeOther"
                        value={formData.eventTypeOther}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Specify event type"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="expectedParticipants" className="block text-sm font-medium text-gray-300 mb-2">
                      Expected Participants
                    </label>
                    <input
                      type="number"
                      id="expectedParticipants"
                      name="expectedParticipants"
                      value={formData.expectedParticipants}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Estimated number"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="eventDescription" className="block text-sm font-medium text-gray-300 mb-2">
                    Event Description *
                  </label>
                  <textarea
                    id="eventDescription"
                    name="eventDescription"
                    value={formData.eventDescription}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    placeholder="Describe your event..."
                  />
                </div>
              </div>
            </div>

            {/* Competition Formats */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Competition Formats *</h3>
              <p className="text-sm text-gray-400 mb-4">Select all competition formats that will be available at this event (at least one required)</p>
              {competitionFormats.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {competitionFormats.map((format) => (
                    <label
                      key={format.id}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                        formData.selectedFormats.includes(format.name)
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedFormats.includes(format.name)}
                        onChange={() => handleFormatChange(format.name)}
                        className="w-4 h-4 bg-slate-700 border-slate-600 rounded text-orange-500 focus:ring-2 focus:ring-orange-500 mr-3"
                      />
                      <div>
                        <span className="text-sm font-medium text-white">{format.name}</span>
                        {format.abbreviation && (
                          <span className="text-xs text-gray-400 ml-1">({format.abbreviation})</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">Loading competition formats...</p>
              )}
            </div>

            {/* Event Schedule */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Event Schedule</h3>

              {/* Multi-day toggle */}
              <div className="mb-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isMultiDay}
                    onChange={(e) => setFormData({ ...formData, isMultiDay: e.target.checked })}
                    className="w-5 h-5 bg-slate-700 border-slate-600 rounded text-orange-500 focus:ring-2 focus:ring-orange-500 mr-3"
                  />
                  <span className="text-gray-300">This is a multi-day event (up to 3 days)</span>
                </label>
              </div>

              {/* Day 1 */}
              <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                <h4 className="text-md font-medium text-white mb-4">{formData.isMultiDay ? 'Day 1' : 'Event Date & Time'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="eventStartDate" className="block text-sm font-medium text-gray-300 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      id="eventStartDate"
                      name="eventStartDate"
                      value={formData.eventStartDate}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="eventStartTime" className="block text-sm font-medium text-gray-300 mb-2">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      id="eventStartTime"
                      name="eventStartTime"
                      value={formData.eventStartTime}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="eventEndDate" className="block text-sm font-medium text-gray-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="eventEndDate"
                      name="eventEndDate"
                      value={formData.eventEndDate}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="eventEndTime" className="block text-sm font-medium text-gray-300 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      id="eventEndTime"
                      name="eventEndTime"
                      value={formData.eventEndTime}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Day 2 */}
              {formData.isMultiDay && (
                <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                  <h4 className="text-md font-medium text-white mb-4">Day 2</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="day2Date" className="block text-sm font-medium text-gray-300 mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        id="day2Date"
                        name="day2Date"
                        value={formData.day2Date}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="day2StartTime" className="block text-sm font-medium text-gray-300 mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        id="day2StartTime"
                        name="day2StartTime"
                        value={formData.day2StartTime}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="day2EndTime" className="block text-sm font-medium text-gray-300 mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        id="day2EndTime"
                        name="day2EndTime"
                        value={formData.day2EndTime}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Day 3 */}
              {formData.isMultiDay && (
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="text-md font-medium text-white mb-4">Day 3 (Optional)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="day3Date" className="block text-sm font-medium text-gray-300 mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        id="day3Date"
                        name="day3Date"
                        value={formData.day3Date}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="day3StartTime" className="block text-sm font-medium text-gray-300 mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        id="day3StartTime"
                        name="day3StartTime"
                        value={formData.day3StartTime}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="day3EndTime" className="block text-sm font-medium text-gray-300 mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        id="day3EndTime"
                        name="day3EndTime"
                        value={formData.day3EndTime}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Location Information */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Event Location</h3>
              <div className="space-y-6">
                <div>
                  <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-300 mb-2">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    id="addressLine1"
                    name="addressLine1"
                    value={formData.addressLine1}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="123 Main Street"
                  />
                </div>

                <div>
                  <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-300 mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    id="addressLine2"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Suite, building, etc."
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-300 mb-2">
                    Country *
                  </label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select country</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-300 mb-2">
                      {getStateLabel(formData.country)} *
                    </label>
                    {getStatesForCountry(formData.country).length > 0 ? (
                      <select
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">Select {getStateLabel(formData.country).toLowerCase()}</option>
                        {getStatesForCountry(formData.country).map((state) => (
                          <option key={state.code} value={state.code}>
                            {state.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder={getStateLabel(formData.country)}
                      />
                    )}
                  </div>

                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-300 mb-2">
                      {getPostalCodeLabel(formData.country)} *
                    </label>
                    <input
                      type="text"
                      id="postalCode"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder={getPostalCodeLabel(formData.country)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Registration & Fees */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Registration & Fees</h3>
              <div className="space-y-6">
                {/* Entry Fee Section */}
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="text-md font-medium text-white mb-4">Entry Fee (Per Class/Format)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="memberEntryFee" className="block text-sm font-medium text-gray-300 mb-2">
                        Member Entry Fee (per class)
                      </label>
                      <input
                        type="text"
                        id="memberEntryFee"
                        name="memberEntryFee"
                        value={formData.memberEntryFee}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="$20"
                      />
                    </div>
                    <div>
                      <label htmlFor="nonMemberEntryFee" className="block text-sm font-medium text-gray-300 mb-2">
                        Non-Member Entry Fee (per class)
                      </label>
                      <input
                        type="text"
                        id="nonMemberEntryFee"
                        name="nonMemberEntryFee"
                        value={formData.nonMemberEntryFee}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="$25"
                      />
                    </div>
                  </div>
                </div>

                {/* Gate Fee Section */}
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="text-md font-medium text-white mb-4">Gate Fee</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="hasGateFee" className="block text-sm font-medium text-gray-300 mb-2">
                        Will there be a gate fee?
                      </label>
                      <select
                        id="hasGateFee"
                        name="hasGateFee"
                        value={formData.hasGateFee}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">Select option</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>

                    {formData.hasGateFee === 'yes' && (
                      <div>
                        <label htmlFor="gateFee" className="block text-sm font-medium text-gray-300 mb-2">
                          Gate Fee Amount
                        </label>
                        <input
                          type="text"
                          id="gateFee"
                          name="gateFee"
                          value={formData.gateFee}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="$5"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Other Registration Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="preRegistrationAvailable" className="block text-sm font-medium text-gray-300 mb-2">
                      Pre-registration Available?
                    </label>
                    <select
                      id="preRegistrationAvailable"
                      name="preRegistrationAvailable"
                      value={formData.preRegistrationAvailable}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Select option</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="estimatedBudget" className="block text-sm font-medium text-gray-300 mb-2">
                      Estimated Budget
                    </label>
                    <input
                      type="text"
                      id="estimatedBudget"
                      name="estimatedBudget"
                      value={formData.estimatedBudget}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="$5,000 - $10,000"
                    />
                  </div>

                  <div>
                    <label htmlFor="hasHostedBefore" className="block text-sm font-medium text-gray-300 mb-2">
                      Hosted MECA Events Before?
                    </label>
                    <select
                      id="hasHostedBefore"
                      name="hasHostedBefore"
                    value={formData.hasHostedBefore}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select option</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
              </div>
            </div>

            {/* Additional Services */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Additional Services Needed</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ADDITIONAL_SERVICES_OPTIONS.map((service) => (
                  <label key={service} className="flex items-center space-x-3 text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.additionalServices.includes(service)}
                      onChange={() => handleCheckboxChange(service)}
                      className="w-4 h-4 bg-slate-700 border-slate-600 rounded text-orange-500 focus:ring-2 focus:ring-orange-500"
                    />
                    <span className="text-sm">{service}</span>
                  </label>
                ))}
              </div>

              {formData.additionalServices.includes('Other') && (
                <div className="mt-4">
                  <label htmlFor="otherServicesDetails" className="block text-sm font-medium text-gray-300 mb-2">
                    Provide details of other services needed
                  </label>
                  <textarea
                    id="otherServicesDetails"
                    name="otherServicesDetails"
                    value={formData.otherServicesDetails}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    placeholder="Describe other services you need..."
                  />
                </div>
              )}
            </div>

            {/* Other Requests */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Additional Information</h3>
              <div className="space-y-6">
                <div>
                  <label htmlFor="otherRequests" className="block text-sm font-medium text-gray-300 mb-2">
                    Other Requests
                  </label>
                  <textarea
                    id="otherRequests"
                    name="otherRequests"
                    value={formData.otherRequests}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    placeholder="Any other requests or information..."
                  />
                </div>

                <div>
                  <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-300 mb-2">
                    Additional Information
                  </label>
                  <textarea
                    id="additionalInfo"
                    name="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={handleChange}
                    rows={6}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    placeholder="Tell us more about your venue, parking availability, previous events, etc."
                  />
                </div>
              </div>
            </div>

            {/* reCAPTCHA v2 Widget */}
            <div className="flex justify-center mt-6">
              <ReCaptchaV2Widget ref={recaptchaRef} />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || formData.selectedFormats.length === 0}
              className={`w-full flex items-center justify-center px-6 py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors ${
                isSubmitting || formData.selectedFormats.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Send className="h-5 w-5 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>

            {formData.selectedFormats.length === 0 && (
              <p className="text-xs text-orange-400 text-center mt-2">
                Please select at least one competition format
              </p>
            )}

            {/* reCAPTCHA Badge Notice */}
            <p className="text-xs text-gray-400 text-center mt-4">
              This site is protected by reCAPTCHA and the Google{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">
                Terms of Service
              </a>{' '}
              apply.
            </p>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
