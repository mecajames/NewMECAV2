import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, CheckCircle, XCircle, AlertCircle, MessageSquare,
  MapPin, User, Building2, Users2, Eye, Send, Lock, ChevronRight,
  RefreshCw, FileText, Phone, Mail, DollarSign, Zap, Printer, ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/auth';
import {
  eventHostingRequestsApi,
  EventHostingRequest,
  EventHostingRequestMessage,
  EventHostingRequestStatus,
  getStatusLabel,
} from '@/event-hosting-requests/event-hosting-requests.api-client';
import { getMyEventDirectorProfile, EventDirector } from '@/event-directors';

export default function EDHostingRequestsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [edProfile, setEdProfile] = useState<EventDirector | null>(null);
  const [requests, setRequests] = useState<EventHostingRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<EventHostingRequest | null>(null);
  const [messages, setMessages] = useState<EventHostingRequestMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Message input state
  const [newMessage, setNewMessage] = useState('');
  const [isPrivateMessage, setIsPrivateMessage] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Decline modal state
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  // Stats
  const [stats, setStats] = useState({
    assigned: 0,
    pendingReview: 0,
    accepted: 0,
  });

  useEffect(() => {
    if (profile) {
      fetchEDProfile();
    }
  }, [profile]);

  useEffect(() => {
    if (edProfile) {
      fetchRequests();
      fetchStats();
    }
  }, [edProfile]);

  const fetchEDProfile = async () => {
    try {
      const ed = await getMyEventDirectorProfile();
      if (ed) {
        setEdProfile(ed);
      } else {
        // Not an event director, redirect
        navigate('/dashboard/mymeca');
      }
    } catch (error) {
      console.error('Error fetching ED profile:', error);
      navigate('/dashboard/mymeca');
    }
  };

  const fetchRequests = async () => {
    if (!edProfile) return;

    try {
      setLoading(true);
      const data = await eventHostingRequestsApi.getByEventDirector(edProfile.id);
      setRequests(data);

      // Auto-select first request if none selected
      if (data.length > 0 && !selectedRequest) {
        handleSelectRequest(data[0]);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!edProfile) return;

    try {
      const data = await eventHostingRequestsApi.getEventDirectorStats(edProfile.id);
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSelectRequest = async (request: EventHostingRequest) => {
    setSelectedRequest(request);
    await fetchMessages(request.id);
  };

  const fetchMessages = async (requestId: string) => {
    try {
      setMessagesLoading(true);
      const data = await eventHostingRequestsApi.getMessages(requestId, 'event_director');
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!selectedRequest || !edProfile || !profile) return;

    try {
      setActionLoading(true);
      await eventHostingRequestsApi.edAcceptAssignment(selectedRequest.id, edProfile.id);

      // Refresh data
      await fetchRequests();
      await fetchStats();

      // Re-select the updated request
      const updatedRequest = requests.find(r => r.id === selectedRequest.id);
      if (updatedRequest) {
        setSelectedRequest({ ...updatedRequest, status: EventHostingRequestStatus.ED_ACCEPTED });
      }
    } catch (error) {
      console.error('Error accepting assignment:', error);
      alert('Failed to accept assignment. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedRequest || !edProfile || !declineReason.trim()) return;

    try {
      setActionLoading(true);
      await eventHostingRequestsApi.edRejectAssignment(selectedRequest.id, edProfile.id, declineReason);

      setShowDeclineModal(false);
      setDeclineReason('');

      // Refresh data
      await fetchRequests();
      await fetchStats();

      // Clear selection since this request will be removed from our list
      setSelectedRequest(null);
      setMessages([]);
    } catch (error) {
      console.error('Error declining assignment:', error);
      alert('Failed to decline assignment. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedRequest || !profile || !newMessage.trim()) return;

    try {
      setSendingMessage(true);
      await eventHostingRequestsApi.addMessage(
        selectedRequest.id,
        profile.id,
        'event_director',
        newMessage,
        isPrivateMessage,
        isPrivateMessage ? 'admin' : 'all'
      );

      setNewMessage('');
      setIsPrivateMessage(false);

      // Refresh messages
      await fetchMessages(selectedRequest.id);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colorMap: { [key: string]: string } = {
      pending: 'bg-yellow-500/10 text-yellow-500',
      assigned_to_ed: 'bg-blue-500/10 text-blue-500',
      ed_reviewing: 'bg-blue-500/10 text-blue-500',
      ed_accepted: 'bg-cyan-500/10 text-cyan-500',
      ed_rejected: 'bg-orange-500/10 text-orange-500',
      under_review: 'bg-blue-500/10 text-blue-500',
      approved: 'bg-green-500/10 text-green-500',
      approved_pending_info: 'bg-lime-500/10 text-lime-500',
      pending_info: 'bg-purple-500/10 text-purple-500',
      rejected: 'bg-red-500/10 text-red-500',
      cancelled: 'bg-gray-500/10 text-gray-500',
    };

    const iconMap: { [key: string]: any } = {
      pending: Clock,
      assigned_to_ed: Eye,
      ed_reviewing: Eye,
      ed_accepted: CheckCircle,
      ed_rejected: RefreshCw,
      under_review: Eye,
      approved: CheckCircle,
      approved_pending_info: CheckCircle,
      pending_info: AlertCircle,
      rejected: XCircle,
      cancelled: XCircle,
    };

    const color = colorMap[status] || colorMap.pending;
    const Icon = iconMap[status] || Clock;
    const label = getStatusLabel(status as EventHostingRequestStatus);

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return timeString;
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handlePrintRequest = () => {
    if (!selectedRequest) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Event Hosting Request - ${selectedRequest.event_name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #333; border-bottom: 2px solid #f97316; padding-bottom: 10px; }
          h2 { color: #666; margin-top: 20px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .section { margin-bottom: 20px; }
          .field { margin-bottom: 8px; }
          .label { font-weight: bold; color: #555; }
          .value { color: #333; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Event Hosting Request</h1>
        <p><strong>Status:</strong> ${getStatusLabel(selectedRequest.status as EventHostingRequestStatus)}</p>
        <p><strong>Request Date:</strong> ${formatDate(selectedRequest.created_at)}</p>

        <h2>Host Information</h2>
        <div class="section">
          ${selectedRequest.host_type ? `<div class="field"><span class="label">Host Type:</span> <span class="value" style="text-transform: capitalize;">${selectedRequest.host_type}</span></div>` : ''}
          <div class="field"><span class="label">Contact Name:</span> <span class="value">${selectedRequest.first_name} ${selectedRequest.last_name}</span></div>
          <div class="field"><span class="label">Email:</span> <span class="value">${selectedRequest.email}</span></div>
          ${selectedRequest.phone ? `<div class="field"><span class="label">Phone:</span> <span class="value">${selectedRequest.phone}</span></div>` : ''}
          ${selectedRequest.business_name ? `<div class="field"><span class="label">Business Name:</span> <span class="value">${selectedRequest.business_name}</span></div>` : ''}
        </div>

        <h2>Event Details</h2>
        <div class="section">
          <div class="field"><span class="label">Event Name:</span> <span class="value">${selectedRequest.event_name}</span></div>
          <div class="field"><span class="label">Event Type:</span> <span class="value">${selectedRequest.event_type === 'Other' ? selectedRequest.event_type_other : selectedRequest.event_type}</span></div>
          ${selectedRequest.is_multi_day ? `<div class="field"><strong>Multi-Day Event</strong></div>` : ''}
          ${selectedRequest.event_start_date ? `<div class="field"><span class="label">${selectedRequest.is_multi_day ? 'Day 1' : 'Date'}:</span> <span class="value">${formatDate(selectedRequest.event_start_date)} ${formatTime(selectedRequest.event_start_time)}</span></div>` : ''}
        </div>

        <h2>Location</h2>
        <div class="section">
          ${selectedRequest.venue_name ? `<div class="field"><span class="label">Venue:</span> <span class="value">${selectedRequest.venue_name}</span></div>` : ''}
          ${selectedRequest.address_line_1 ? `<div class="field"><span class="value">${selectedRequest.address_line_1}</span></div>` : ''}
          <div class="field"><span class="value">${[selectedRequest.city, selectedRequest.state, selectedRequest.postal_code].filter(Boolean).join(', ')}</span></div>
          ${selectedRequest.country ? `<div class="field"><span class="value">${selectedRequest.country}</span></div>` : ''}
        </div>

        <h2>Event Description</h2>
        <div class="section">
          <p>${selectedRequest.event_description || 'No description provided'}</p>
        </div>

        <p style="margin-top: 30px; color: #999; font-size: 12px; text-align: center;">
          Printed on ${new Date().toLocaleString()}
        </p>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <p className="text-gray-400">Please sign in to view your hosting requests.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Event Hosting Requests</h1>
            <p className="text-gray-400">Review and manage event hosting requests assigned to you</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/dashboard/mymeca')}
              className="flex items-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Dashboard
            </button>
            <button
              onClick={() => navigate('/event-directors/submit-event')}
              className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Calendar className="h-5 w-5" />
              Submit New Event
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
            <p className="text-gray-400 text-sm mb-1">Total Assigned</p>
            <p className="text-white font-bold text-2xl">{stats.assigned}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
            <p className="text-gray-400 text-sm mb-1">Pending Review</p>
            <p className="text-yellow-500 font-bold text-2xl">{stats.pendingReview}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
            <p className="text-gray-400 text-sm mb-1">Accepted</p>
            <p className="text-green-500 font-bold text-2xl">{stats.accepted}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Hosting Requests</h3>
            <p className="text-gray-400">You don't have any event hosting requests assigned to you yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Requests List */}
            <div className="lg:col-span-1 bg-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">My Requests ({requests.length})</h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className={`p-4 rounded-lg transition-colors cursor-pointer ${
                      selectedRequest?.id === request.id
                        ? 'bg-slate-700 border border-orange-500'
                        : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
                    }`}
                    onClick={() => handleSelectRequest(request)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate">{request.event_name}</p>
                        <p className="text-sm text-gray-400 truncate">
                          {request.first_name} {request.last_name}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    </div>
                    <div className="flex items-center justify-between">
                      {getStatusBadge(request.status)}
                      <span className="text-xs text-gray-400">
                        {formatDate(request.event_start_date)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Request Details */}
            <div className="lg:col-span-2 space-y-6">
              {selectedRequest ? (
                <>
                  {/* Event Info Card */}
                  <div className="bg-slate-800 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-2">{selectedRequest.event_name}</h2>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(selectedRequest.status)}
                          {selectedRequest.created_event_id && (
                            <a
                              href={`/events/${selectedRequest.created_event_id}`}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500 hover:bg-green-500/20"
                            >
                              View Created Event
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={handlePrintRequest}
                        className="p-2 text-gray-400 hover:text-orange-400 transition-colors"
                        title="Print request"
                      >
                        <Printer className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Action Buttons */}
                    {(selectedRequest.status === EventHostingRequestStatus.ASSIGNED_TO_ED ||
                      selectedRequest.status === EventHostingRequestStatus.ED_REVIEWING) && (
                      <div className="flex gap-3 mb-6">
                        <button
                          onClick={handleAccept}
                          disabled={actionLoading}
                          className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="h-5 w-5" />
                          Accept Assignment
                        </button>
                        <button
                          onClick={() => setShowDeclineModal(true)}
                          disabled={actionLoading}
                          className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <XCircle className="h-5 w-5" />
                          Decline
                        </button>
                      </div>
                    )}

                    {/* Event Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Host Information */}
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                          {selectedRequest.host_type === 'business' ? (
                            <Building2 className="h-5 w-5 text-orange-500" />
                          ) : selectedRequest.host_type === 'club' ? (
                            <Users2 className="h-5 w-5 text-orange-500" />
                          ) : (
                            <User className="h-5 w-5 text-orange-500" />
                          )}
                          Host Information
                        </h4>
                        <div className="space-y-2 text-sm">
                          {selectedRequest.host_type && (
                            <p className="text-gray-300">
                              <span className="text-gray-400">Type:</span>{' '}
                              <span className="capitalize">{selectedRequest.host_type}</span>
                            </p>
                          )}
                          <p className="text-gray-300">
                            <span className="text-gray-400">Contact:</span>{' '}
                            {selectedRequest.first_name} {selectedRequest.last_name}
                          </p>
                          <p className="text-gray-300 flex items-center gap-1">
                            <Mail className="h-3 w-3 text-gray-400" />
                            {selectedRequest.email}
                          </p>
                          {selectedRequest.phone && (
                            <p className="text-gray-300 flex items-center gap-1">
                              <Phone className="h-3 w-3 text-gray-400" />
                              {selectedRequest.phone}
                            </p>
                          )}
                          {selectedRequest.business_name && (
                            <p className="text-gray-300">
                              <span className="text-gray-400">Business:</span>{' '}
                              {selectedRequest.business_name}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Event Dates */}
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-orange-500" />
                          Event Schedule
                        </h4>
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-300">
                            <span className="text-gray-400">Type:</span>{' '}
                            {selectedRequest.event_type === 'Other'
                              ? selectedRequest.event_type_other
                              : selectedRequest.event_type}
                          </p>
                          {selectedRequest.is_multi_day && (
                            <p className="text-blue-400 font-medium">Multi-Day Event</p>
                          )}
                          {selectedRequest.event_start_date && (
                            <p className="text-gray-300">
                              <span className="text-gray-400">
                                {selectedRequest.is_multi_day ? 'Day 1:' : 'Date:'}
                              </span>{' '}
                              {formatDate(selectedRequest.event_start_date)} {formatTime(selectedRequest.event_start_time)}
                              {selectedRequest.event_end_time && ` - ${formatTime(selectedRequest.event_end_time)}`}
                            </p>
                          )}
                          {selectedRequest.is_multi_day && selectedRequest.day_2_date && (
                            <p className="text-gray-300">
                              <span className="text-gray-400">Day 2:</span>{' '}
                              {formatDate(selectedRequest.day_2_date)} {formatTime(selectedRequest.day_2_start_time)}
                              {selectedRequest.day_2_end_time && ` - ${formatTime(selectedRequest.day_2_end_time)}`}
                            </p>
                          )}
                          {selectedRequest.is_multi_day && selectedRequest.day_3_date && (
                            <p className="text-gray-300">
                              <span className="text-gray-400">Day 3:</span>{' '}
                              {formatDate(selectedRequest.day_3_date)} {formatTime(selectedRequest.day_3_start_time)}
                              {selectedRequest.day_3_end_time && ` - ${formatTime(selectedRequest.day_3_end_time)}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Location */}
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-orange-500" />
                          Location
                        </h4>
                        <div className="space-y-2 text-sm">
                          {selectedRequest.venue_name && (
                            <p className="text-gray-300 font-medium">{selectedRequest.venue_name}</p>
                          )}
                          {selectedRequest.venue_type && (
                            <p className="text-gray-300">
                              <span className="text-gray-400">Venue Type:</span> {selectedRequest.venue_type}
                            </p>
                          )}
                          {selectedRequest.indoor_outdoor && (
                            <p className="text-gray-300">
                              <span className="text-gray-400">Setting:</span>{' '}
                              <span className="capitalize">
                                {selectedRequest.indoor_outdoor === 'both'
                                  ? 'Indoor & Outdoor'
                                  : selectedRequest.indoor_outdoor}
                              </span>
                            </p>
                          )}
                          {selectedRequest.address_line_1 && (
                            <p className="text-gray-300">{selectedRequest.address_line_1}</p>
                          )}
                          {selectedRequest.address_line_2 && (
                            <p className="text-gray-300">{selectedRequest.address_line_2}</p>
                          )}
                          <p className="text-gray-300">
                            {[selectedRequest.city, selectedRequest.state, selectedRequest.postal_code]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                          {selectedRequest.country && (
                            <p className="text-gray-300">{selectedRequest.country}</p>
                          )}
                          {selectedRequest.power_available !== undefined && (
                            <p className="text-gray-300 flex items-center gap-1">
                              <Zap className="h-3 w-3 text-gray-400" />
                              Power: {selectedRequest.power_available ? 'Available' : 'Not Available'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-orange-500" />
                          Additional Details
                        </h4>
                        <div className="space-y-2 text-sm">
                          {selectedRequest.expected_participants && (
                            <p className="text-gray-300">
                              <span className="text-gray-400">Expected Participants:</span>{' '}
                              {selectedRequest.expected_participants}
                            </p>
                          )}
                          {selectedRequest.estimated_budget && (
                            <p className="text-gray-300">
                              <span className="text-gray-400">Budget:</span>{' '}
                              {selectedRequest.estimated_budget}
                            </p>
                          )}
                          {selectedRequest.has_registration_fee !== undefined && (
                            <p className="text-gray-300">
                              <span className="text-gray-400">Registration Fee:</span>{' '}
                              {selectedRequest.has_registration_fee ? 'Yes' : 'No'}
                            </p>
                          )}
                          {selectedRequest.estimated_entry_fee && (
                            <p className="text-gray-300">
                              <span className="text-gray-400">Entry Fee:</span>{' '}
                              {selectedRequest.estimated_entry_fee}
                            </p>
                          )}
                          {selectedRequest.has_hosted_before !== undefined && (
                            <p className="text-gray-300">
                              <span className="text-gray-400">Hosted Before:</span>{' '}
                              {selectedRequest.has_hosted_before ? 'Yes' : 'No'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Competition Formats */}
                    {selectedRequest.competition_formats && selectedRequest.competition_formats.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-white font-semibold mb-3">Competition Formats</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedRequest.competition_formats.map((format, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm"
                            >
                              {format}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Event Description */}
                    {selectedRequest.event_description && (
                      <div className="mt-6">
                        <h4 className="text-white font-semibold mb-3">Event Description</h4>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">
                          {selectedRequest.event_description}
                        </p>
                      </div>
                    )}

                    {/* Additional Services */}
                    {selectedRequest.additional_services && selectedRequest.additional_services.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-white font-semibold mb-3">Requested Services</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedRequest.additional_services.map((service, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-slate-700 text-gray-300 rounded-full text-sm"
                            >
                              {service}
                            </span>
                          ))}
                        </div>
                        {selectedRequest.other_services_details && (
                          <p className="text-gray-400 text-sm mt-2">{selectedRequest.other_services_details}</p>
                        )}
                      </div>
                    )}

                    {/* Other Requests / Additional Info */}
                    {(selectedRequest.other_requests || selectedRequest.additional_info) && (
                      <div className="mt-6">
                        <h4 className="text-white font-semibold mb-3">Other Notes</h4>
                        {selectedRequest.other_requests && (
                          <p className="text-gray-300 text-sm mb-2">{selectedRequest.other_requests}</p>
                        )}
                        {selectedRequest.additional_info && (
                          <p className="text-gray-300 text-sm">{selectedRequest.additional_info}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Messages Section */}
                  <div className="bg-slate-800 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-orange-500" />
                      Messages
                    </h3>

                    {/* Messages List */}
                    <div className="space-y-4 max-h-[400px] overflow-y-auto mb-6">
                      {messagesLoading ? (
                        <div className="text-center py-8">
                          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No messages yet</p>
                        </div>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={`p-4 rounded-lg ${
                              message.sender_role === 'event_director'
                                ? 'bg-purple-500/10 border border-purple-500/20 ml-4'
                                : message.sender_role === 'admin'
                                ? 'bg-orange-500/10 border border-orange-500/20'
                                : 'bg-slate-700/50 mr-4'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${
                                  message.sender_role === 'event_director'
                                    ? 'text-purple-400'
                                    : message.sender_role === 'admin'
                                    ? 'text-orange-400'
                                    : 'text-gray-300'
                                }`}>
                                  {message.sender_role === 'event_director'
                                    ? 'You'
                                    : message.sender_role === 'admin'
                                    ? 'Admin'
                                    : 'Requestor'}
                                </span>
                                {message.is_private && (
                                  <span className="flex items-center text-xs text-yellow-500">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Private
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDateTime(message.created_at)}
                              </span>
                            </div>
                            <p className="text-gray-300 text-sm whitespace-pre-wrap">{message.message}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* New Message Input */}
                    <div className="border-t border-slate-700 pt-4">
                      <div className="mb-3">
                        <textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          rows={3}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isPrivateMessage}
                            onChange={(e) => setIsPrivateMessage(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 bg-slate-700 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="text-sm text-gray-400 flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Private (admin only)
                          </span>
                        </label>
                        <button
                          onClick={handleSendMessage}
                          disabled={sendingMessage || !newMessage.trim()}
                          className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                        >
                          {sendingMessage ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-slate-800 rounded-xl p-12 text-center">
                  <Eye className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Select a Request</h3>
                  <p className="text-gray-400">Choose a request from the list to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Decline Assignment</h3>
            <p className="text-gray-400 mb-4">
              Please provide a reason for declining this event hosting request. This will be sent back to the admin.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Reason for declining..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineReason('');
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={actionLoading || !declineReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {actionLoading ? 'Declining...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
