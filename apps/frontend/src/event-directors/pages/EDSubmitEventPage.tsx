import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '@/lib/axios';
import {
  Calendar, MapPin, Send, AlertCircle, CheckCircle,
  Clock, FileText, DollarSign, Users, Zap, ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/auth';
import { getMyEventDirectorProfile, EventDirector } from '@/event-directors';
import { eventHostingRequestsApi, EventHostingRequestStatus, HostType, IndoorOutdoor, EventTypeOption, EDAssignmentStatus } from '@/event-hosting-requests/event-hosting-requests.api-client';
import { countries, getStatesForCountry, getStateLabel, getPostalCodeLabel } from '@/utils/countries';

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

const INDOOR_OUTDOOR_OPTIONS = [
  { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'both', label: 'Both' },
];

interface CompetitionFormat {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export default function EDSubmitEventPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [edProfile, setEdProfile] = useState<EventDirector | null>(null);
  const [competitionFormats, setCompetitionFormats] = useState<CompetitionFormat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    // Host Information (pre-filled from ED profile)
    hostType: 'individual',
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
    hasHostedBefore: 'yes', // EDs have hosted before
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

  useEffect(() => {
    if (profile) {
      fetchEDProfile();
      fetchCompetitionFormats();
    }
  }, [profile]);

  const fetchEDProfile = async () => {
    try {
      const ed = await getMyEventDirectorProfile();
      if (ed && ed.is_active) {
        setEdProfile(ed);
        // Pre-fill contact information from profile
        setFormData(prev => ({
          ...prev,
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          email: profile?.email || '',
          phone: profile?.phone || '',
        }));
      } else {
        // Not an active event director, redirect
        navigate('/dashboard/mymeca');
      }
    } catch (error) {
      console.error('Error fetching ED profile:', error);
      navigate('/dashboard/mymeca');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompetitionFormats = async () => {
    try {
      const response = await axios.get('/api/competition-formats/active');
      setCompetitionFormats(response.data);
    } catch (error) {
      console.error('Error fetching competition formats:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleMultiSelect = (name: string, value: string) => {
    setFormData(prev => {
      const currentValues = prev[name as keyof typeof prev] as string[];
      if (currentValues.includes(value)) {
        return { ...prev, [name]: currentValues.filter(v => v !== value) };
      } else {
        return { ...prev, [name]: [...currentValues, value] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      // Build the request data
      const requestData = {
        // Host Information
        host_type: formData.hostType as HostType,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        business_name: formData.businessName || undefined,
        user_id: profile?.id,
        // Venue Information
        venue_name: formData.venueName || undefined,
        venue_type: formData.venueType || undefined,
        indoor_outdoor: (formData.indoorOutdoor || undefined) as IndoorOutdoor | undefined,
        power_available: formData.powerAvailable === 'yes',
        // Event Information
        event_name: formData.eventName,
        event_type: formData.eventType as EventTypeOption,
        event_type_other: formData.eventType === 'Other' ? formData.eventTypeOther : undefined,
        event_description: formData.eventDescription,
        // Event Schedule
        event_start_date: formData.eventStartDate || undefined,
        event_start_time: formData.eventStartTime || undefined,
        event_end_date: formData.eventEndDate || undefined,
        event_end_time: formData.eventEndTime || undefined,
        // Multi-day support
        is_multi_day: formData.isMultiDay,
        day_2_date: formData.isMultiDay ? formData.day2Date || undefined : undefined,
        day_2_start_time: formData.isMultiDay ? formData.day2StartTime || undefined : undefined,
        day_2_end_time: formData.isMultiDay ? formData.day2EndTime || undefined : undefined,
        day_3_date: formData.isMultiDay ? formData.day3Date || undefined : undefined,
        day_3_start_time: formData.isMultiDay ? formData.day3StartTime || undefined : undefined,
        day_3_end_time: formData.isMultiDay ? formData.day3EndTime || undefined : undefined,
        // Competition Formats
        competition_formats: formData.selectedFormats.length > 0 ? formData.selectedFormats : undefined,
        // Location
        address_line_1: formData.addressLine1 || undefined,
        address_line_2: formData.addressLine2 || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postal_code: formData.postalCode || undefined,
        country: formData.country || undefined,
        // Additional Details
        expected_participants: formData.expectedParticipants ? parseInt(formData.expectedParticipants) : undefined,
        has_hosted_before: formData.hasHostedBefore === 'yes',
        // Registration & Entry Fees (always required)
        has_registration_fee: true,
        member_entry_fee: formData.memberEntryFee || undefined,
        non_member_entry_fee: formData.nonMemberEntryFee || undefined,
        pre_registration_available: formData.preRegistrationAvailable === 'yes',
        // Gate Fee
        has_gate_fee: formData.hasGateFee === 'yes',
        gate_fee: formData.gateFee || undefined,
        // Budget
        estimated_budget: formData.estimatedBudget || undefined,
        // Services
        additional_services: formData.additionalServices.length > 0 ? formData.additionalServices : undefined,
        other_services_details: formData.otherServicesDetails || undefined,
        other_requests: formData.otherRequests || undefined,
        additional_info: formData.additionalInfo || undefined,
        // Status - ED submitted, so it goes to ED_ACCEPTED state (pending admin approval)
        status: EventHostingRequestStatus.ED_ACCEPTED,
        // Auto-assign to this ED
        assigned_event_director_id: edProfile?.id,
        ed_status: EDAssignmentStatus.ACCEPTED,
      };

      await eventHostingRequestsApi.create(requestData);

      setSubmitMessage({
        type: 'success',
        text: 'Your event has been submitted for admin approval. You will be notified when it is reviewed.',
      });

      // Reset form after short delay
      setTimeout(() => {
        navigate('/event-directors/hosting-requests');
      }, 2000);
    } catch (error) {
      console.error('Error submitting event:', error);
      setSubmitMessage({
        type: 'error',
        text: 'Failed to submit event. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const states = getStatesForCountry(formData.country);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  if (!profile || !edProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <p className="text-gray-400">You must be an active Event Director to submit events.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => navigate('/event-directors/hosting-requests')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Hosting Requests
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Submit New Event</h1>
          <p className="text-gray-400">
            Submit a new event for admin approval. Once approved, it will be added to the events calendar.
          </p>
        </div>

        {/* Success/Error Message */}
        {submitMessage && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              submitMessage.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            {submitMessage.type === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <p>{submitMessage.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Event Information */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              Event Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="eventName"
                  value={formData.eventName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter event name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="eventType"
                  value={formData.eventType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select event type</option>
                  {EVENT_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {formData.eventType === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Specify Event Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="eventTypeOther"
                    value={formData.eventTypeOther}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter event type"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="eventDescription"
                  value={formData.eventDescription}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="Describe your event..."
                />
              </div>
            </div>
          </div>

          {/* Event Schedule */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Event Schedule
            </h2>

            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isMultiDay"
                  checked={formData.isMultiDay}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-600 bg-slate-700 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-gray-300">This is a multi-day event</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {formData.isMultiDay ? 'Day 1 Date' : 'Event Date'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="eventStartDate"
                  value={formData.eventStartDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
                  <input
                    type="time"
                    name="eventStartTime"
                    value={formData.eventStartTime}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
                  <input
                    type="time"
                    name="eventEndTime"
                    value={formData.eventEndTime}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {formData.isMultiDay && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Day 2 Date</label>
                    <input
                      type="date"
                      name="day2Date"
                      value={formData.day2Date}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Day 2 Start</label>
                      <input
                        type="time"
                        name="day2StartTime"
                        value={formData.day2StartTime}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Day 2 End</label>
                      <input
                        type="time"
                        name="day2EndTime"
                        value={formData.day2EndTime}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Day 3 Date (Optional)</label>
                    <input
                      type="date"
                      name="day3Date"
                      value={formData.day3Date}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Day 3 Start</label>
                      <input
                        type="time"
                        name="day3StartTime"
                        value={formData.day3StartTime}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Day 3 End</label>
                      <input
                        type="time"
                        name="day3EndTime"
                        value={formData.day3EndTime}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Competition Formats */}
          {competitionFormats.length > 0 && (
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                Competition Formats
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {competitionFormats
                  .filter(format => !format.name.toLowerCase().includes('phat'))
                  .map(format => (
                  <label
                    key={format.id}
                    className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                      formData.selectedFormats.includes(format.name)
                        ? 'bg-orange-500/20 border border-orange-500'
                        : 'bg-slate-700 border border-slate-600 hover:bg-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.selectedFormats.includes(format.name)}
                      onChange={() => handleMultiSelect('selectedFormats', format.name)}
                      className="sr-only"
                    />
                    <span className="text-gray-300 text-sm">{format.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Venue Information */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-500" />
              Venue Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Venue Name</label>
                <input
                  type="text"
                  name="venueName"
                  value={formData.venueName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter venue name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Venue Type</label>
                <select
                  name="venueType"
                  value={formData.venueType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select venue type</option>
                  {VENUE_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Indoor/Outdoor</label>
                <select
                  name="indoorOutdoor"
                  value={formData.indoorOutdoor}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select setting</option>
                  {INDOOR_OUTDOOR_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Zap className="h-4 w-4 inline mr-1" />
                  Power Available
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="powerAvailable"
                      value="yes"
                      checked={formData.powerAvailable === 'yes'}
                      onChange={handleChange}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-gray-300">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="powerAvailable"
                      value="no"
                      checked={formData.powerAvailable === 'no'}
                      onChange={handleChange}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-gray-300">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-500" />
              Location
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Address Line 1</label>
                <input
                  type="text"
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Street address"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Address Line 2</label>
                <input
                  type="text"
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Suite, unit, building (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {countries.map(country => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getStateLabel(formData.country)}
                </label>
                {states.length > 0 ? (
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select {getStateLabel(formData.country).toLowerCase()}</option>
                    {states.map(state => (
                      <option key={state.code} value={state.code}>{state.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder={getStateLabel(formData.country)}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {getPostalCodeLabel(formData.country)}
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder={getPostalCodeLabel(formData.country)}
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              Additional Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Expected Participants</label>
                <input
                  type="number"
                  name="expectedParticipants"
                  value={formData.expectedParticipants}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Number of expected participants"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Estimated Budget</label>
                <input
                  type="text"
                  name="estimatedBudget"
                  value={formData.estimatedBudget}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., $500 - $1000"
                />
              </div>
            </div>
          </div>

          {/* Entry Fees */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-500" />
              Registration & Entry Fees
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Member Entry Fee <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="memberEntryFee"
                  value={formData.memberEntryFee}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., $25"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Non-Member Entry Fee <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nonMemberEntryFee"
                  value={formData.nonMemberEntryFee}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., $35"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Gate Fee?</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="hasGateFee"
                      value="yes"
                      checked={formData.hasGateFee === 'yes'}
                      onChange={handleChange}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-gray-300">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="hasGateFee"
                      value="no"
                      checked={formData.hasGateFee === 'no'}
                      onChange={handleChange}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-gray-300">No</span>
                  </label>
                </div>
              </div>

              {formData.hasGateFee === 'yes' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Gate Fee Amount</label>
                  <input
                    type="text"
                    name="gateFee"
                    value={formData.gateFee}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g., $10"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Pre-Registration Available on Event Listing?</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="preRegistrationAvailable"
                      value="yes"
                      checked={formData.preRegistrationAvailable === 'yes'}
                      onChange={handleChange}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-gray-300">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="preRegistrationAvailable"
                      value="no"
                      checked={formData.preRegistrationAvailable === 'no'}
                      onChange={handleChange}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-gray-300">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Services */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Additional Services Needed</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {ADDITIONAL_SERVICES_OPTIONS.map(service => (
                <label
                  key={service}
                  className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                    formData.additionalServices.includes(service)
                      ? 'bg-orange-500/20 border border-orange-500'
                      : 'bg-slate-700 border border-slate-600 hover:bg-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.additionalServices.includes(service)}
                    onChange={() => handleMultiSelect('additionalServices', service)}
                    className="sr-only"
                  />
                  <span className="text-gray-300 text-sm">{service}</span>
                </label>
              ))}
            </div>

            {formData.additionalServices.includes('Other') && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Other Services Details
                </label>
                <textarea
                  name="otherServicesDetails"
                  value={formData.otherServicesDetails}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="Please describe the other services you need..."
                />
              </div>
            )}
          </div>

          {/* Additional Notes */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Additional Notes</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Other Requests
                </label>
                <textarea
                  name="otherRequests"
                  value={formData.otherRequests}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="Any other requests or special requirements..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Additional Information
                </label>
                <textarea
                  name="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="Any additional information you'd like to share..."
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 sm:px-8 py-2.5 sm:py-4 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Submit Event for Approval
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
