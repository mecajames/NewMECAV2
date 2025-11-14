import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Search,
  Filter,
  Eye,
  MessageSquare,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  Building,
  Calendar,
  MapPin,
  Users as UsersIcon,
  DollarSign,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface EventHostingRequest {
  id: string;
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  business_name?: string;
  businessName?: string;
  event_name?: string;
  eventName?: string;
  event_type?: string;
  eventType?: string;
  event_type_other?: string;
  eventTypeOther?: string;
  event_description?: string;
  eventDescription?: string;
  event_start_date?: string;
  eventStartDate?: string;
  event_start_time?: string;
  eventStartTime?: string;
  event_end_date?: string;
  eventEndDate?: string;
  event_end_time?: string;
  eventEndTime?: string;
  address_line_1?: string;
  addressLine1?: string;
  address_line_2?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  postalCode?: string;
  country?: string;
  venue_type?: string;
  venueType?: string;
  expected_participants?: number;
  expectedParticipants?: number;
  has_hosted_before?: boolean;
  hasHostedBefore?: boolean;
  additional_services?: string[];
  additionalServices?: string[];
  other_services_details?: string;
  otherServicesDetails?: string;
  other_requests?: string;
  otherRequests?: string;
  additional_info?: string;
  additionalInfo?: string;
  estimated_budget?: string;
  estimatedBudget?: string;
  status: string;
  admin_response?: string;
  adminResponse?: string;
  admin_response_date?: string;
  adminResponseDate?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

interface RequestStats {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
}

export default function EventHostingRequestsManagement() {
  const [requests, setRequests] = useState<EventHostingRequest[]>([]);
  const [stats, setStats] = useState<RequestStats>({
    total: 0,
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<EventHostingRequest | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseStatus, setResponseStatus] = useState<string>('approved');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 100 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await axios.get('/api/event-hosting-requests', { params });
      setRequests(response.data.data || []);
    } catch (error) {
      console.error('Error fetching event hosting requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/event-hosting-requests/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSearch = () => {
    fetchRequests();
  };

  const handleViewRequest = (request: EventHostingRequest) => {
    setSelectedRequest(request);
  };

  const handleRespondClick = (request: EventHostingRequest) => {
    setSelectedRequest(request);
    setResponseText(request.adminResponse || '');
    setResponseStatus(request.status === 'pending' ? 'approved' : request.status);
    setShowResponseModal(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedRequest || !responseText.trim()) return;

    try {
      setSubmitting(true);
      await axios.post(`/api/event-hosting-requests/${selectedRequest.id}/respond`, {
        response: responseText,
        status: responseStatus,
        admin_id: 'current-admin-id', // TODO: Replace with actual admin ID from auth context
      });

      setShowResponseModal(false);
      setResponseText('');
      setSelectedRequest(null);
      fetchRequests();
      fetchStats();
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Failed to submit response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickApprove = async (request: EventHostingRequest) => {
    try {
      await axios.post(`/api/event-hosting-requests/${request.id}/respond`, {
        response: 'Your event hosting request has been approved. We will contact you shortly with next steps.',
        status: 'approved',
        admin_id: 'current-admin-id',
      });
      fetchRequests();
      fetchStats();
      if (selectedRequest?.id === request.id) {
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request. Please try again.');
    }
  };

  const handleQuickReject = async (request: EventHostingRequest) => {
    const reason = prompt('Please provide a reason for rejection (optional):');
    try {
      await axios.post(`/api/event-hosting-requests/${request.id}/respond`, {
        response: reason || 'Thank you for your interest. Unfortunately, we are unable to accommodate your event hosting request at this time.',
        status: 'rejected',
        admin_id: 'current-admin-id',
      });
      fetchRequests();
      fetchStats();
      if (selectedRequest?.id === request.id) {
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request. Please try again.');
    }
  };

  // Helper function to get field value with fallback to snake_case
  const getField = (request: EventHostingRequest, camelCase: string, snakeCase: string) => {
    return (request as any)[camelCase] || (request as any)[snakeCase] || '';
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      await axios.delete(`/api/event-hosting-requests/${id}`);
      fetchRequests();
      fetchStats();
      if (selectedRequest?.id === id) {
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Failed to delete request. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { color: string; icon: any; label: string } } = {
      pending: { color: 'bg-yellow-500/10 text-yellow-500', icon: Clock, label: 'Pending' },
      under_review: { color: 'bg-blue-500/10 text-blue-500', icon: Eye, label: 'Under Review' },
      approved: { color: 'bg-green-500/10 text-green-500', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'bg-red-500/10 text-red-500', icon: XCircle, label: 'Rejected' },
      cancelled: { color: 'bg-gray-500/10 text-gray-500', icon: XCircle, label: 'Cancelled' },
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
          <p className="text-gray-400 text-sm mb-1">Total Requests</p>
          <p className="text-white font-bold text-2xl">{stats.total}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
          <p className="text-gray-400 text-sm mb-1">Pending</p>
          <p className="text-yellow-500 font-bold text-2xl">{stats.pending}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
          <p className="text-gray-400 text-sm mb-1">Under Review</p>
          <p className="text-blue-500 font-bold text-2xl">{stats.underReview}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
          <p className="text-gray-400 text-sm mb-1">Approved</p>
          <p className="text-green-500 font-bold text-2xl">{stats.approved}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
          <p className="text-gray-400 text-sm mb-1">Rejected</p>
          <p className="text-red-500 font-bold text-2xl">{stats.rejected}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, event name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Search className="h-5 w-5" />
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requests List */}
        <div className="lg:col-span-1 bg-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Requests ({requests.length})</h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No requests found</p>
              </div>
            ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  onClick={() => handleViewRequest(request)}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${
                    selectedRequest?.id === request.id
                      ? 'bg-slate-700 border border-orange-500'
                      : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">
                        {getField(request, 'firstName', 'first_name')} {getField(request, 'lastName', 'last_name')}
                      </p>
                      <p className="text-sm text-gray-400 truncate">{getField(request, 'eventName', 'event_name')}</p>
                      <p className="text-xs text-gray-500 mt-1 truncate">{getField(request, 'eventType', 'event_type')}</p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="flex items-center text-xs text-gray-400 mt-2">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(getField(request, 'createdAt', 'created_at'))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Request Details */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl p-6">
          {selectedRequest ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">{getField(selectedRequest, 'eventName', 'event_name')}</h3>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {selectedRequest.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleQuickApprove(selectedRequest)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleQuickReject(selectedRequest)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleRespondClick(selectedRequest)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {selectedRequest.status === 'pending' ? 'Custom Response' : 'Respond'}
                  </button>
                  <button
                    onClick={() => handleDeleteRequest(selectedRequest.id)}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-orange-500" />
                    Contact Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300">
                      <span className="text-gray-400">Name:</span> {getField(selectedRequest, 'firstName', 'first_name')}{' '}
                      {getField(selectedRequest, 'lastName', 'last_name')}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-400">Email:</span> {selectedRequest.email}
                    </p>
                    {getField(selectedRequest, 'phone', 'phone') && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">Phone:</span> {getField(selectedRequest, 'phone', 'phone')}
                      </p>
                    )}
                    {getField(selectedRequest, 'businessName', 'business_name') && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">Business:</span> {getField(selectedRequest, 'businessName', 'business_name')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Event Details */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-orange-500" />
                    Event Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300">
                      <span className="text-gray-400">Type:</span>{' '}
                      {getField(selectedRequest, 'eventType', 'event_type') === 'Other'
                        ? getField(selectedRequest, 'eventTypeOther', 'event_type_other')
                        : getField(selectedRequest, 'eventType', 'event_type')}
                    </p>
                    {getField(selectedRequest, 'venueType', 'venue_type') && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">Venue:</span> {getField(selectedRequest, 'venueType', 'venue_type')}
                      </p>
                    )}
                    {getField(selectedRequest, 'eventStartDate', 'event_start_date') && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">Start:</span> {formatDate(getField(selectedRequest, 'eventStartDate', 'event_start_date'))}{' '}
                        {getField(selectedRequest, 'eventStartTime', 'event_start_time')}
                      </p>
                    )}
                    {getField(selectedRequest, 'eventEndDate', 'event_end_date') && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">End:</span> {formatDate(getField(selectedRequest, 'eventEndDate', 'event_end_date'))}{' '}
                        {getField(selectedRequest, 'eventEndTime', 'event_end_time')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Location */}
                {(getField(selectedRequest, 'addressLine1', 'address_line_1') || getField(selectedRequest, 'city', 'city')) && (
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-orange-500" />
                      Location
                    </h4>
                    <div className="space-y-1 text-sm text-gray-300">
                      {getField(selectedRequest, 'addressLine1', 'address_line_1') && <p>{getField(selectedRequest, 'addressLine1', 'address_line_1')}</p>}
                      {getField(selectedRequest, 'addressLine2', 'address_line_2') && <p>{getField(selectedRequest, 'addressLine2', 'address_line_2')}</p>}
                      <p>
                        {getField(selectedRequest, 'city', 'city') && `${getField(selectedRequest, 'city', 'city')}, `}
                        {getField(selectedRequest, 'state', 'state')} {getField(selectedRequest, 'postalCode', 'postal_code')}
                      </p>
                      {getField(selectedRequest, 'country', 'country') && <p>{getField(selectedRequest, 'country', 'country')}</p>}
                    </div>
                  </div>
                )}

                {/* Additional Info */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <UsersIcon className="h-5 w-5 text-orange-500" />
                    Additional Info
                  </h4>
                  <div className="space-y-2 text-sm">
                    {getField(selectedRequest, 'expectedParticipants', 'expected_participants') && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">Expected Participants:</span>{' '}
                        {getField(selectedRequest, 'expectedParticipants', 'expected_participants')}
                      </p>
                    )}
                    {getField(selectedRequest, 'estimatedBudget', 'estimated_budget') && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">Budget:</span> {getField(selectedRequest, 'estimatedBudget', 'estimated_budget')}
                      </p>
                    )}
                    {(getField(selectedRequest, 'hasHostedBefore', 'has_hosted_before') !== undefined && getField(selectedRequest, 'hasHostedBefore', 'has_hosted_before') !== '') && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">Hosted Before:</span>{' '}
                        {getField(selectedRequest, 'hasHostedBefore', 'has_hosted_before') ? 'Yes' : 'No'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">Event Description</h4>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{getField(selectedRequest, 'eventDescription', 'event_description')}</p>
              </div>

              {/* Additional Services */}
              {(() => {
                const services = getField(selectedRequest, 'additionalServices', 'additional_services');
                return services && (Array.isArray(services) ? services.length > 0 : true);
              })() && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3">Additional Services Requested</h4>
                  <div className="flex flex-wrap gap-2">
                    {(getField(selectedRequest, 'additionalServices', 'additional_services') as string[] || []).map((service, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-orange-500/10 text-orange-500 rounded-full text-xs font-medium"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                  {getField(selectedRequest, 'otherServicesDetails', 'other_services_details') && (
                    <p className="text-gray-300 text-sm mt-3">{getField(selectedRequest, 'otherServicesDetails', 'other_services_details')}</p>
                  )}
                </div>
              )}

              {/* Other Requests & Additional Info */}
              {(getField(selectedRequest, 'otherRequests', 'other_requests') || getField(selectedRequest, 'additionalInfo', 'additional_info')) && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3">Additional Information</h4>
                  {getField(selectedRequest, 'otherRequests', 'other_requests') && (
                    <div className="mb-3">
                      <p className="text-gray-400 text-xs mb-1">Other Requests:</p>
                      <p className="text-gray-300 text-sm whitespace-pre-wrap">{getField(selectedRequest, 'otherRequests', 'other_requests')}</p>
                    </div>
                  )}
                  {getField(selectedRequest, 'additionalInfo', 'additional_info') && (
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Additional Info:</p>
                      <p className="text-gray-300 text-sm whitespace-pre-wrap">{getField(selectedRequest, 'additionalInfo', 'additional_info')}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Response */}
              {getField(selectedRequest, 'adminResponse', 'admin_response') && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Admin Response</h4>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap mb-2">{getField(selectedRequest, 'adminResponse', 'admin_response')}</p>
                  {getField(selectedRequest, 'adminResponseDate', 'admin_response_date') && (
                    <p className="text-gray-400 text-xs">
                      Responded on {formatDate(getField(selectedRequest, 'adminResponseDate', 'admin_response_date'))}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20">
              <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Select a request to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Response Modal */}
      {showResponseModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-4">
              Respond to {selectedRequest.firstName} {selectedRequest.lastName}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Response Status</label>
                <select
                  value={responseStatus}
                  onChange={(e) => setResponseStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Your Response</label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={8}
                  placeholder="Write your response to the event hosting request..."
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => {
                    setShowResponseModal(false);
                    setResponseText('');
                  }}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitResponse}
                  disabled={submitting || !responseText.trim()}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <MessageSquare className="h-5 w-5" />
                  {submitting ? 'Sending...' : 'Send Response'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
