import { useEffect, useState } from 'react';
import { useAuth } from '@/auth';
import {
  eventHostingRequestsApi,
  EventHostingRequest,
  EventHostingRequestMessage,
  EventHostingRequestStatus,
  FinalApprovalStatus,
  EDAssignmentStatus,
  EventDirectorOption,
  getStatusLabel,
  getStatusColor,
} from '@/event-hosting-requests';
import { competitionFormatsApi, CompetitionFormat } from '@/competition-formats';
import { countries, getStatesForCountry, getStateLabel, getPostalCodeLabel } from '@/utils/countries';
import {
  Search,
  Eye,
  MessageSquare,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Calendar,
  MapPin,
  Users as UsersIcon,
  FileText,
  AlertCircle,
  UserPlus,
  UserMinus,
  Send,
  Lock,
  ExternalLink,
  RefreshCw,
  Printer,
  Briefcase,
  Building2,
  Users2,
  User,
  Zap,
  DollarSign,
  ClipboardCheck,
  ListChecks,
  Pencil,
} from 'lucide-react';

interface RequestStats {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
}

export default function EventHostingRequestsManagement() {
  const { profile } = useAuth();
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

  // Response Modal
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseStatus, setResponseStatus] = useState<string>('approved');
  const [submitting, setSubmitting] = useState(false);

  // ED Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableEDs, setAvailableEDs] = useState<EventDirectorOption[]>([]);
  const [selectedEDId, setSelectedEDId] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState('');

  // Final Approval Modal
  const [showFinalApprovalModal, setShowFinalApprovalModal] = useState(false);
  const [finalStatus, setFinalStatus] = useState<FinalApprovalStatus>(FinalApprovalStatus.APPROVED);
  const [finalReason, setFinalReason] = useState('');

  // Revoke ED Assignment Modal
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  // Messages
  const [messages, setMessages] = useState<EventHostingRequestMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isPrivateMessage, setIsPrivateMessage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<EventHostingRequest>>({});

  // Competition Formats
  const [competitionFormats, setCompetitionFormats] = useState<CompetitionFormat[]>([]);

  useEffect(() => {
    fetchRequests();
    fetchStats();
    fetchAvailableEDs();
    fetchCompetitionFormats();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedRequest) {
      fetchMessages(selectedRequest.id);
    }
  }, [selectedRequest]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const status = statusFilter !== 'all' ? statusFilter as EventHostingRequestStatus : undefined;
      const result = await eventHostingRequestsApi.getAll(1, 100, status, searchTerm || undefined);
      setRequests(result.data || []);
    } catch (error) {
      console.error('Error fetching event hosting requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await eventHostingRequestsApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAvailableEDs = async () => {
    try {
      const data = await eventHostingRequestsApi.getAvailableEventDirectors();
      setAvailableEDs(data);
    } catch (error) {
      console.error('Error fetching available event directors:', error);
    }
  };

  const fetchCompetitionFormats = async () => {
    try {
      const data = await competitionFormatsApi.getActive();
      setCompetitionFormats(data);
    } catch (error) {
      console.error('Error fetching competition formats:', error);
    }
  };

  const fetchMessages = async (requestId: string) => {
    try {
      setLoadingMessages(true);
      const data = await eventHostingRequestsApi.getMessages(requestId, 'admin');
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSearch = () => {
    fetchRequests();
  };

  const handleViewRequest = (request: EventHostingRequest) => {
    setSelectedRequest(request);
  };

  // Legacy respond (for simple responses)
  const handleRespondClick = (request: EventHostingRequest) => {
    setSelectedRequest(request);
    setResponseText(request.admin_response || '');
    setResponseStatus(request.status === 'pending' ? 'approved' : request.status);
    setShowResponseModal(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedRequest || !responseText.trim() || !profile?.id) return;

    try {
      setSubmitting(true);
      await eventHostingRequestsApi.respond(
        selectedRequest.id,
        responseText,
        responseStatus as EventHostingRequestStatus,
        profile.id
      );

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

  // ED Assignment
  const handleOpenAssignModal = () => {
    setSelectedEDId('');
    setAssignmentNotes('');
    setShowAssignModal(true);
  };

  const handleAssignToED = async () => {
    if (!selectedRequest || !selectedEDId || !profile?.id) return;

    try {
      setSubmitting(true);
      const isReassign = selectedRequest.assigned_event_director_id &&
                         selectedRequest.status === EventHostingRequestStatus.ED_REJECTED;

      if (isReassign) {
        await eventHostingRequestsApi.reassignEventDirector(
          selectedRequest.id,
          selectedEDId,
          profile.id,
          assignmentNotes || undefined
        );
      } else {
        await eventHostingRequestsApi.assignToEventDirector(
          selectedRequest.id,
          selectedEDId,
          profile.id,
          assignmentNotes || undefined
        );
      }

      setShowAssignModal(false);
      fetchRequests();
      fetchStats();
      // Refresh the selected request
      const updated = await eventHostingRequestsApi.getById(selectedRequest.id);
      setSelectedRequest(updated);
    } catch (error) {
      console.error('Error assigning to Event Director:', error);
      alert('Failed to assign request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Final Approval
  const handleOpenFinalApprovalModal = () => {
    setFinalStatus(FinalApprovalStatus.APPROVED_PENDING_INFO);
    setFinalReason('');
    setShowFinalApprovalModal(true);
  };

  const handleSubmitFinalApproval = async () => {
    if (!selectedRequest || !profile?.id) return;

    try {
      setSubmitting(true);
      await eventHostingRequestsApi.setFinalApproval(
        selectedRequest.id,
        profile.id,
        finalStatus,
        finalReason || undefined
      );

      setShowFinalApprovalModal(false);
      fetchRequests();
      fetchStats();
      // Refresh the selected request
      const updated = await eventHostingRequestsApi.getById(selectedRequest.id);
      setSelectedRequest(updated);
    } catch (error) {
      console.error('Error submitting final approval:', error);
      alert('Failed to submit final approval. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Revoke ED Assignment
  const handleOpenRevokeModal = () => {
    setRevokeReason('');
    setShowRevokeModal(true);
  };

  const handleRevokeAssignment = async () => {
    if (!selectedRequest || !profile?.id) return;

    try {
      setSubmitting(true);
      await eventHostingRequestsApi.revokeEDAssignment(
        selectedRequest.id,
        profile.id,
        revokeReason || undefined
      );

      setShowRevokeModal(false);
      setRevokeReason('');
      fetchRequests();
      fetchStats();
      // Refresh the selected request
      const updated = await eventHostingRequestsApi.getById(selectedRequest.id);
      setSelectedRequest(updated);
    } catch (error) {
      console.error('Error revoking ED assignment:', error);
      alert('Failed to revoke assignment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Send Message
  const handleSendMessage = async () => {
    if (!selectedRequest || !newMessage.trim() || !profile?.id) return;

    try {
      setSubmitting(true);
      await eventHostingRequestsApi.addMessage(
        selectedRequest.id,
        profile.id,
        'admin',
        newMessage,
        isPrivateMessage,
        isPrivateMessage ? 'event_director' : 'all'
      );

      setNewMessage('');
      setIsPrivateMessage(false);
      fetchMessages(selectedRequest.id);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Request
  const handleOpenEditModal = () => {
    if (!selectedRequest) return;
    setEditFormData({
      first_name: selectedRequest.first_name || '',
      last_name: selectedRequest.last_name || '',
      email: selectedRequest.email || '',
      phone: selectedRequest.phone || '',
      business_name: selectedRequest.business_name || '',
      host_type: selectedRequest.host_type || '',
      event_name: selectedRequest.event_name || '',
      event_description: selectedRequest.event_description || '',
      event_type: selectedRequest.event_type || '',
      event_type_other: selectedRequest.event_type_other || '',
      event_start_date: selectedRequest.event_start_date || '',
      event_start_time: selectedRequest.event_start_time || '',
      event_end_date: selectedRequest.event_end_date || '',
      event_end_time: selectedRequest.event_end_time || '',
      is_multi_day: selectedRequest.is_multi_day || false,
      day_2_date: selectedRequest.day_2_date || '',
      day_2_start_time: selectedRequest.day_2_start_time || '',
      day_2_end_time: selectedRequest.day_2_end_time || '',
      day_3_date: selectedRequest.day_3_date || '',
      day_3_start_time: selectedRequest.day_3_start_time || '',
      day_3_end_time: selectedRequest.day_3_end_time || '',
      venue_name: selectedRequest.venue_name || '',
      venue_type: selectedRequest.venue_type || '',
      indoor_outdoor: selectedRequest.indoor_outdoor || '',
      power_available: selectedRequest.power_available,
      address_line_1: selectedRequest.address_line_1 || '',
      address_line_2: selectedRequest.address_line_2 || '',
      city: selectedRequest.city || '',
      state: selectedRequest.state || '',
      postal_code: selectedRequest.postal_code || '',
      country: selectedRequest.country || '',
      expected_participants: selectedRequest.expected_participants || '',
      estimated_budget: selectedRequest.estimated_budget || '',
      has_hosted_before: selectedRequest.has_hosted_before,
      member_entry_fee: selectedRequest.member_entry_fee || '',
      non_member_entry_fee: selectedRequest.non_member_entry_fee || '',
      has_gate_fee: selectedRequest.has_gate_fee,
      gate_fee: selectedRequest.gate_fee || '',
      pre_registration_available: selectedRequest.pre_registration_available,
      other_requests: selectedRequest.other_requests || '',
      additional_info: selectedRequest.additional_info || '',
      competition_formats: selectedRequest.competition_formats || [],
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (field: string, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCompetitionFormatToggle = (formatName: string) => {
    const currentFormats = editFormData.competition_formats || [];
    const newFormats = currentFormats.includes(formatName)
      ? currentFormats.filter(f => f !== formatName)
      : [...currentFormats, formatName];
    handleEditFormChange('competition_formats', newFormats);
  };

  const handleSubmitEdit = async () => {
    if (!selectedRequest) return;

    try {
      setSubmitting(true);
      await eventHostingRequestsApi.update(selectedRequest.id, editFormData);
      setShowEditModal(false);
      fetchRequests();
      // Refresh the selected request
      const updated = await eventHostingRequestsApi.getById(selectedRequest.id);
      setSelectedRequest(updated);
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Failed to update request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      await eventHostingRequestsApi.delete(id);
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
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-approved { background: #d1fae5; color: #065f46; }
          .status-rejected { background: #fee2e2; color: #991b1b; }
          .status-under_review { background: #dbeafe; color: #1e40af; }
          .services-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
          .service-tag { background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .format-tag { background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .multi-day { color: #3b82f6; font-weight: bold; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          @media print { body { padding: 0; } .grid-2 { grid-template-columns: 1fr 1fr; } }
        </style>
      </head>
      <body>
        <h1>Event Hosting Request</h1>
        <p><span class="status status-${selectedRequest.status}">${getStatusLabel(selectedRequest.status)}</span></p>
        <p><span class="label">Request Date:</span> ${formatDate(selectedRequest.created_at)}</p>

        <div class="grid-2">
          <div>
            <h2>Host Information</h2>
            <div class="section">
              ${selectedRequest.host_type ? `<div class="field"><span class="label">Host Type:</span> <span class="value" style="text-transform: capitalize;">${selectedRequest.host_type}</span></div>` : ''}
              <div class="field"><span class="label">Contact Name:</span> <span class="value">${selectedRequest.first_name} ${selectedRequest.last_name}</span></div>
              <div class="field"><span class="label">Email:</span> <span class="value">${selectedRequest.email}</span></div>
              ${selectedRequest.phone ? `<div class="field"><span class="label">Phone:</span> <span class="value">${selectedRequest.phone}</span></div>` : ''}
              ${selectedRequest.business_name ? `<div class="field"><span class="label">${selectedRequest.host_type === 'club' ? 'Club Name' : 'Business Name'}:</span> <span class="value">${selectedRequest.business_name}</span></div>` : ''}
            </div>
          </div>

          <div>
            <h2>Venue Information</h2>
            <div class="section">
              ${selectedRequest.venue_name ? `<div class="field"><span class="label">Venue Name:</span> <span class="value">${selectedRequest.venue_name}</span></div>` : ''}
              ${selectedRequest.venue_type ? `<div class="field"><span class="label">Venue Type:</span> <span class="value">${selectedRequest.venue_type}</span></div>` : ''}
              ${selectedRequest.indoor_outdoor ? `<div class="field"><span class="label">Setting:</span> <span class="value" style="text-transform: capitalize;">${selectedRequest.indoor_outdoor === 'both' ? 'Indoor & Outdoor' : selectedRequest.indoor_outdoor}</span></div>` : ''}
              ${selectedRequest.power_available !== undefined && selectedRequest.power_available !== null ? `<div class="field"><span class="label">Power Available:</span> <span class="value">${selectedRequest.power_available ? 'Yes' : 'No'}</span></div>` : ''}
            </div>
          </div>
        </div>

        <h2>Event Details</h2>
        <div class="section">
          <div class="field"><span class="label">Event Name:</span> <span class="value">${selectedRequest.event_name}</span></div>
          <div class="field"><span class="label">Event Type:</span> <span class="value">${selectedRequest.event_type === 'Other' ? selectedRequest.event_type_other : selectedRequest.event_type}</span></div>
          ${selectedRequest.is_multi_day ? `<div class="field multi-day">Multi-Day Event</div>` : ''}
          ${selectedRequest.event_start_date ? `<div class="field"><span class="label">${selectedRequest.is_multi_day ? 'Day 1' : 'Start'}:</span> <span class="value">${formatDate(selectedRequest.event_start_date)} ${formatTime(selectedRequest.event_start_time)}${selectedRequest.event_end_time ? ` - ${formatTime(selectedRequest.event_end_time)}` : ''}</span></div>` : ''}
          ${selectedRequest.is_multi_day && selectedRequest.day_2_date ? `<div class="field"><span class="label">Day 2:</span> <span class="value">${formatDate(selectedRequest.day_2_date)} ${formatTime(selectedRequest.day_2_start_time)}${selectedRequest.day_2_end_time ? ` - ${formatTime(selectedRequest.day_2_end_time)}` : ''}</span></div>` : ''}
          ${selectedRequest.is_multi_day && selectedRequest.day_3_date ? `<div class="field"><span class="label">Day 3:</span> <span class="value">${formatDate(selectedRequest.day_3_date)} ${formatTime(selectedRequest.day_3_start_time)}${selectedRequest.day_3_end_time ? ` - ${formatTime(selectedRequest.day_3_end_time)}` : ''}</span></div>` : ''}
          ${!selectedRequest.is_multi_day && selectedRequest.event_end_date ? `<div class="field"><span class="label">End:</span> <span class="value">${formatDate(selectedRequest.event_end_date)} ${formatTime(selectedRequest.event_end_time)}</span></div>` : ''}
        </div>

        <h2>Event Description</h2>
        <div class="section">
          <p class="value">${selectedRequest.event_description || 'No description provided'}</p>
        </div>

        ${selectedRequest.competition_formats && selectedRequest.competition_formats.length > 0 ? `
        <h2>Competition Formats</h2>
        <div class="section">
          <div class="services-list">
            ${selectedRequest.competition_formats.map((f: string) => `<span class="format-tag">${f}</span>`).join('')}
          </div>
        </div>
        ` : ''}

        <h2>Location</h2>
        <div class="section">
          ${selectedRequest.address_line_1 ? `<div class="field"><span class="value">${selectedRequest.address_line_1}</span></div>` : ''}
          ${selectedRequest.address_line_2 ? `<div class="field"><span class="value">${selectedRequest.address_line_2}</span></div>` : ''}
          <div class="field"><span class="value">${[selectedRequest.city, selectedRequest.state, selectedRequest.postal_code].filter(Boolean).join(', ')}</span></div>
          ${selectedRequest.country ? `<div class="field"><span class="value">${selectedRequest.country}</span></div>` : ''}
        </div>

        <div class="grid-2">
          <div>
            <h2>Additional Information</h2>
            <div class="section">
              ${selectedRequest.expected_participants ? `<div class="field"><span class="label">Expected Participants:</span> <span class="value">${selectedRequest.expected_participants}</span></div>` : ''}
              ${selectedRequest.estimated_budget ? `<div class="field"><span class="label">Estimated Budget:</span> <span class="value">${selectedRequest.estimated_budget}</span></div>` : ''}
              ${selectedRequest.has_hosted_before !== undefined ? `<div class="field"><span class="label">Hosted MECA Events Before:</span> <span class="value">${selectedRequest.has_hosted_before ? 'Yes' : 'No'}</span></div>` : ''}
            </div>
          </div>

          <div>
            <h2>Registration & Fees</h2>
            <div class="section">
              ${selectedRequest.has_registration_fee !== undefined ? `<div class="field"><span class="label">Registration Fee:</span> <span class="value">${selectedRequest.has_registration_fee ? 'Yes' : 'No'}</span></div>` : ''}
              ${selectedRequest.estimated_entry_fee ? `<div class="field"><span class="label">Estimated Entry Fee:</span> <span class="value">${selectedRequest.estimated_entry_fee}</span></div>` : ''}
              ${selectedRequest.pre_registration_available !== undefined ? `<div class="field"><span class="label">Pre-Registration:</span> <span class="value">${selectedRequest.pre_registration_available ? 'Available' : 'Not Available'}</span></div>` : ''}
            </div>
          </div>
        </div>

        ${selectedRequest.additional_services && selectedRequest.additional_services.length > 0 ? `
        <h2>Additional Services Requested</h2>
        <div class="section">
          <div class="services-list">
            ${selectedRequest.additional_services.map((s: string) => `<span class="service-tag">${s}</span>`).join('')}
          </div>
          ${selectedRequest.other_services_details ? `<div class="field" style="margin-top: 8px;"><span class="label">Other Services Details:</span> <span class="value">${selectedRequest.other_services_details}</span></div>` : ''}
        </div>
        ` : ''}

        ${selectedRequest.other_requests ? `
        <h2>Other Requests</h2>
        <div class="section">
          <p class="value">${selectedRequest.other_requests}</p>
        </div>
        ` : ''}

        ${selectedRequest.additional_info ? `
        <h2>Additional Information from Requestor</h2>
        <div class="section">
          <p class="value">${selectedRequest.additional_info}</p>
        </div>
        ` : ''}

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
      assigned_to_ed: UserPlus,
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
    // Use UTC timezone to prevent date shifting due to local timezone conversion
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

  // Convert 24-hour time (HH:MM) to 12-hour format (h:MM AM/PM)
  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return timeString;
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getEDName = (edId: string) => {
    const ed = availableEDs.find(e => e.id === edId);
    if (ed) {
      return `${ed.first_name || ''} ${ed.last_name || ''}`.trim() || ed.email || 'Unknown';
    }
    return 'Unknown';
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
              <option value="assigned_to_ed">Assigned to ED</option>
              <option value="ed_accepted">ED Accepted</option>
              <option value="ed_rejected">ED Rejected</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="approved_pending_info">Approved - Pending Info</option>
              <option value="pending_info">Pending Info</option>
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
                  className={`p-4 rounded-lg transition-colors ${
                    selectedRequest?.id === request.id
                      ? 'bg-slate-700 border border-orange-500'
                      : 'bg-slate-700/50 hover:bg-slate-700 border border-transparent'
                  }`}
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => handleViewRequest(request)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate">
                          {request.first_name} {request.last_name}
                        </p>
                        <p className="text-sm text-gray-400 truncate">{request.event_name}</p>
                        {request.assigned_event_director_id && (
                          <p className="text-xs text-blue-400 mt-1">
                            ED: {getEDName(request.assigned_event_director_id)}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center text-xs text-gray-400">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(request.created_at)}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRequest(request.id);
                      }}
                      className="p-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition-colors"
                      title="Delete request"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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
                  <h3 className="text-2xl font-bold text-white mb-2">{selectedRequest.event_name}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(selectedRequest.status)}
                    {selectedRequest.created_event_id && (
                      <a
                        href={`/admin?tab=events&id=${selectedRequest.created_event_id}`}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500 hover:bg-green-500/20"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Created Event
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {/* Assign to ED Button - show for pending, under_review, or ed_rejected */}
                  {(selectedRequest.status === EventHostingRequestStatus.PENDING ||
                    selectedRequest.status === EventHostingRequestStatus.UNDER_REVIEW ||
                    selectedRequest.status === EventHostingRequestStatus.ED_REJECTED) && (
                    <button
                      onClick={handleOpenAssignModal}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-1.5"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {selectedRequest.status === EventHostingRequestStatus.ED_REJECTED ? 'Reassign' : 'Assign ED'}
                    </button>
                  )}

                  {/* Final Approval Button */}
                  {(selectedRequest.status === EventHostingRequestStatus.ED_ACCEPTED ||
                    selectedRequest.status === EventHostingRequestStatus.PENDING ||
                    selectedRequest.status === EventHostingRequestStatus.UNDER_REVIEW) && (
                    <button
                      onClick={handleOpenFinalApprovalModal}
                      className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Approve
                    </button>
                  )}

                  {/* Legacy Response Button */}
                  <button
                    onClick={() => handleRespondClick(selectedRequest)}
                    className="px-2.5 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-1.5"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Respond
                  </button>

                  {/* Edit Button */}
                  <button
                    onClick={handleOpenEditModal}
                    className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </div>
              </div>

              {/* ED Assignment Status */}
              {selectedRequest.assigned_event_director_id && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-semibold flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-blue-500" />
                      Event Director Assignment
                    </h4>
                    <button
                      onClick={handleOpenRevokeModal}
                      className="px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                    >
                      <UserMinus className="h-4 w-4" />
                      Revoke Assignment
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Assigned To:</p>
                      <p className="text-white font-medium">{getEDName(selectedRequest.assigned_event_director_id)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">ED Status:</p>
                      <p className="text-white">{selectedRequest.ed_status || 'Pending Review'}</p>
                    </div>
                    {selectedRequest.assigned_at && (
                      <div>
                        <p className="text-gray-400">Assigned At:</p>
                        <p className="text-white">{formatDateTime(selectedRequest.assigned_at)}</p>
                      </div>
                    )}
                    {selectedRequest.ed_rejection_reason && (
                      <div className="col-span-2">
                        <p className="text-gray-400">ED Rejection Reason:</p>
                        <p className="text-orange-400">{selectedRequest.ed_rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Print Link */}
              <div className="flex justify-end mb-2">
                <button
                  onClick={handlePrintRequest}
                  className="text-sm text-gray-400 hover:text-orange-400 transition-colors flex items-center gap-1"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Host/Contact Information */}
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
                        <span className="text-gray-400">Host Type:</span>{' '}
                        <span className="capitalize">{selectedRequest.host_type}</span>
                      </p>
                    )}
                    <p className="text-gray-300">
                      <span className="text-gray-400">Contact Name:</span> {selectedRequest.first_name} {selectedRequest.last_name}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-400">Email:</span> {selectedRequest.email}
                    </p>
                    {selectedRequest.phone && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">Phone:</span> {selectedRequest.phone}
                      </p>
                    )}
                    {selectedRequest.business_name && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">
                          {selectedRequest.host_type === 'club' ? 'Club Name:' : 'Business Name:'}
                        </span>{' '}
                        {selectedRequest.business_name}
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
                      <span className="text-gray-400">Type:</span> {selectedRequest.event_type === 'Other' ? selectedRequest.event_type_other : selectedRequest.event_type}
                    </p>
                    {selectedRequest.is_multi_day && (
                      <p className="text-blue-400 font-medium">
                        Multi-Day Event
                      </p>
                    )}
                    {selectedRequest.event_start_date && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">{selectedRequest.is_multi_day ? 'Day 1:' : 'Start:'}</span>{' '}
                        {formatDate(selectedRequest.event_start_date)}{' '}
                        {selectedRequest.event_start_time && formatTime(selectedRequest.event_start_time)}
                        {selectedRequest.event_end_time && ` - ${formatTime(selectedRequest.event_end_time)}`}
                      </p>
                    )}
                    {selectedRequest.is_multi_day && selectedRequest.day_2_date && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">Day 2:</span>{' '}
                        {formatDate(selectedRequest.day_2_date)}{' '}
                        {selectedRequest.day_2_start_time && formatTime(selectedRequest.day_2_start_time)}
                        {selectedRequest.day_2_end_time && ` - ${formatTime(selectedRequest.day_2_end_time)}`}
                      </p>
                    )}
                    {selectedRequest.is_multi_day && selectedRequest.day_3_date && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">Day 3:</span>{' '}
                        {formatDate(selectedRequest.day_3_date)}{' '}
                        {selectedRequest.day_3_start_time && formatTime(selectedRequest.day_3_start_time)}
                        {selectedRequest.day_3_end_time && ` - ${formatTime(selectedRequest.day_3_end_time)}`}
                      </p>
                    )}
                    {!selectedRequest.is_multi_day && selectedRequest.event_end_date && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">End:</span> {formatDate(selectedRequest.event_end_date)} {formatTime(selectedRequest.event_end_time)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Venue Information */}
                {(selectedRequest.venue_name || selectedRequest.indoor_outdoor || selectedRequest.venue_type) && (
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-orange-500" />
                      Venue Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      {selectedRequest.venue_name && (
                        <p className="text-gray-300">
                          <span className="text-gray-400">Venue Name:</span> {selectedRequest.venue_name}
                        </p>
                      )}
                      {selectedRequest.venue_type && (
                        <p className="text-gray-300">
                          <span className="text-gray-400">Venue Type:</span> {selectedRequest.venue_type}
                        </p>
                      )}
                      {selectedRequest.indoor_outdoor && (
                        <p className="text-gray-300">
                          <span className="text-gray-400">Setting:</span>{' '}
                          <span className="capitalize">{selectedRequest.indoor_outdoor === 'both' ? 'Indoor & Outdoor' : selectedRequest.indoor_outdoor}</span>
                        </p>
                      )}
                      {selectedRequest.power_available !== undefined && selectedRequest.power_available !== null && (
                        <p className="text-gray-300 flex items-center gap-1">
                          <Zap className={`h-4 w-4 ${selectedRequest.power_available ? 'text-green-400' : 'text-gray-500'}`} />
                          <span className="text-gray-400">Power:</span>{' '}
                          {selectedRequest.power_available ? (
                            <span className="text-green-400">Available</span>
                          ) : (
                            <span className="text-red-400">Not Available</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Location */}
                {(selectedRequest.address_line_1 || selectedRequest.city) && (
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-orange-500" />
                      Location
                    </h4>
                    <div className="space-y-1 text-sm text-gray-300">
                      {selectedRequest.address_line_1 && <p>{selectedRequest.address_line_1}</p>}
                      {selectedRequest.address_line_2 && <p>{selectedRequest.address_line_2}</p>}
                      <p>
                        {selectedRequest.city && `${selectedRequest.city}, `}
                        {selectedRequest.state} {selectedRequest.postal_code}
                      </p>
                      {selectedRequest.country && <p>{selectedRequest.country}</p>}
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
                    {selectedRequest.expected_participants && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">Expected Participants:</span> {selectedRequest.expected_participants}
                      </p>
                    )}
                    {selectedRequest.estimated_budget && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">Budget:</span> {selectedRequest.estimated_budget}
                      </p>
                    )}
                    {selectedRequest.has_hosted_before !== undefined && (
                      <p className="text-gray-300">
                        <span className="text-gray-400">Hosted Before:</span> {selectedRequest.has_hosted_before ? 'Yes' : 'No'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedRequest.event_description && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3">Event Description</h4>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedRequest.event_description}</p>
                </div>
              )}

              {/* Competition Formats */}
              {selectedRequest.competition_formats && selectedRequest.competition_formats.length > 0 && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-orange-500" />
                    Competition Formats
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.competition_formats.map((format: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm"
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Registration & Fees */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-orange-500" />
                  Registration & Fees
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Member Entry Fee (per class)</p>
                    <p className="text-white">{selectedRequest.member_entry_fee || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Non-Member Entry Fee (per class)</p>
                    <p className="text-white">{selectedRequest.non_member_entry_fee || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Gate Fee</p>
                    <p className="text-white">
                      {selectedRequest.has_gate_fee ? (
                        <span className="text-green-400">{selectedRequest.gate_fee || 'Yes (amount not specified)'}</span>
                      ) : (
                        <span className="text-gray-500">No</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Pre-Registration</p>
                    <p className="text-white">
                      {selectedRequest.pre_registration_available ? (
                        <span className="text-green-400">Available</span>
                      ) : (
                        <span className="text-gray-500">Not Available</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Services Requested */}
              {selectedRequest.additional_services && selectedRequest.additional_services.length > 0 && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-orange-500" />
                    Additional Services Requested
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.additional_services.map((service: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full text-sm"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                  {selectedRequest.other_services_details && (
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <p className="text-gray-400 text-xs mb-1">Other Services Details:</p>
                      <p className="text-gray-300 text-sm">{selectedRequest.other_services_details}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Other Requests */}
              {selectedRequest.other_requests && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-500" />
                    Other Requests
                  </h4>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedRequest.other_requests}</p>
                </div>
              )}

              {/* Additional Information */}
              {selectedRequest.additional_info && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    Additional Information
                  </h4>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedRequest.additional_info}</p>
                </div>
              )}

              {/* Message Thread */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-orange-500" />
                  Message Thread
                </h4>

                {/* Messages List */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto mb-4">
                  {loadingMessages ? (
                    <div className="text-center py-4">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-orange-500 border-r-transparent"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">No messages yet</p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.sender_role === 'admin'
                            ? 'bg-orange-500/10 border-l-2 border-orange-500'
                            : msg.sender_role === 'event_director'
                            ? 'bg-blue-500/10 border-l-2 border-blue-500'
                            : 'bg-slate-600/50 border-l-2 border-gray-500'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${
                              msg.sender_role === 'admin' ? 'text-orange-400' :
                              msg.sender_role === 'event_director' ? 'text-blue-400' :
                              'text-gray-400'
                            }`}>
                              {msg.sender_role === 'admin' ? 'Admin' :
                               msg.sender_role === 'event_director' ? 'Event Director' :
                               'Requestor'}
                            </span>
                            {msg.is_private && (
                              <span className="inline-flex items-center text-xs text-yellow-400">
                                <Lock className="h-3 w-3 mr-1" />
                                Private
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">{formatDateTime(msg.created_at)}</span>
                        </div>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* New Message Input */}
                <div className="space-y-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPrivateMessage}
                        onChange={(e) => setIsPrivateMessage(e.target.checked)}
                        className="rounded border-slate-500 text-orange-500 focus:ring-orange-500"
                      />
                      <Lock className="h-4 w-4" />
                      Private (ED/Admin only)
                    </label>
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || submitting}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                    >
                      <Send className="h-4 w-4" />
                      Send
                    </button>
                  </div>
                </div>
              </div>

              {/* Legacy Admin Response */}
              {selectedRequest.admin_response && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Legacy Admin Response</h4>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap mb-2">{selectedRequest.admin_response}</p>
                  {selectedRequest.admin_response_date && (
                    <p className="text-gray-400 text-xs">
                      Responded on {formatDate(selectedRequest.admin_response_date)}
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

      {/* ED Assignment Modal */}
      {showAssignModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              {selectedRequest.status === EventHostingRequestStatus.ED_REJECTED ? 'Reassign' : 'Assign'} Event Director
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Event Director</label>
                <select
                  value={selectedEDId}
                  onChange={(e) => setSelectedEDId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Choose an Event Director...</option>
                  {availableEDs.map((ed) => (
                    <option key={ed.id} value={ed.id}>
                      {`${ed.first_name || ''} ${ed.last_name || ''}`.trim() || ed.email} ({ed.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Assignment Notes (Optional)</label>
                <textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes for the Event Director..."
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignToED}
                  disabled={submitting || !selectedEDId}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <UserPlus className="h-5 w-5" />
                  {submitting ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Final Approval Modal */}
      {showFinalApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-orange-500" />
              Final Approval Decision
            </h3>

            {/* Pre-Approval Checklist */}
            <div className="mb-6 bg-slate-700/50 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-blue-400" />
                Pre-Approval Checklist
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Required Fields */}
                <div className="flex items-center gap-2">
                  {selectedRequest.event_name ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={selectedRequest.event_name ? 'text-gray-300' : 'text-red-400'}>Event Name</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRequest.event_description ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={selectedRequest.event_description ? 'text-gray-300' : 'text-red-400'}>Event Description</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRequest.event_start_date ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={selectedRequest.event_start_date ? 'text-gray-300' : 'text-red-400'}>Event Date</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRequest.event_start_time ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={selectedRequest.event_start_time ? 'text-gray-300' : 'text-red-400'}>Event Time</span>
                </div>
                <div className="flex items-center gap-2">
                  {(selectedRequest.address_line_1 || selectedRequest.city) ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={(selectedRequest.address_line_1 || selectedRequest.city) ? 'text-gray-300' : 'text-red-400'}>Location/Address</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRequest.state ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={selectedRequest.state ? 'text-gray-300' : 'text-red-400'}>State</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRequest.competition_formats && selectedRequest.competition_formats.length > 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                  )}
                  <span className={selectedRequest.competition_formats && selectedRequest.competition_formats.length > 0 ? 'text-gray-300' : 'text-yellow-400'}>Competition Formats</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRequest.venue_name || selectedRequest.business_name ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                  )}
                  <span className={(selectedRequest.venue_name || selectedRequest.business_name) ? 'text-gray-300' : 'text-yellow-400'}>Venue/Host Name</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRequest.indoor_outdoor ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                  )}
                  <span className={selectedRequest.indoor_outdoor ? 'text-gray-300' : 'text-yellow-400'}>Indoor/Outdoor Setting</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRequest.power_available !== undefined && selectedRequest.power_available !== null ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                  )}
                  <span className={(selectedRequest.power_available !== undefined && selectedRequest.power_available !== null) ? 'text-gray-300' : 'text-yellow-400'}>Power Availability</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRequest.expected_participants ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                  )}
                  <span className={selectedRequest.expected_participants ? 'text-gray-300' : 'text-yellow-400'}>Expected Participants</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRequest.assigned_event_director_id ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                  )}
                  <span className={selectedRequest.assigned_event_director_id ? 'text-gray-300' : 'text-yellow-400'}>Event Director Assigned</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-600">
                <p className="text-xs text-gray-400">
                  <span className="text-green-400">●</span> Complete{' '}
                  <span className="text-yellow-400">●</span> Optional/Missing{' '}
                  <span className="text-red-400">●</span> Required
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Approval Status</label>
                <select
                  value={finalStatus}
                  onChange={(e) => setFinalStatus(e.target.value as FinalApprovalStatus)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value={FinalApprovalStatus.APPROVED_PENDING_INFO}>Approved - Pending Additional Information</option>
                  <option value={FinalApprovalStatus.PENDING_INFO}>Pending - Request More Information</option>
                  <option value={FinalApprovalStatus.REJECTED}>Rejected</option>
                </select>
                {finalStatus === FinalApprovalStatus.APPROVED_PENDING_INFO && (
                  <p className="text-xs text-green-400 mt-1">
                    An event will be automatically created with "Pending" status and can be published from the Event Manager.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {finalStatus === FinalApprovalStatus.REJECTED ? 'Rejection Reason *' :
                   finalStatus === FinalApprovalStatus.PENDING_INFO ? 'What information is needed? *' :
                   'What additional information is needed? (Optional)'}
                </label>
                <textarea
                  value={finalReason}
                  onChange={(e) => setFinalReason(e.target.value)}
                  rows={4}
                  placeholder={
                    finalStatus === FinalApprovalStatus.REJECTED ? 'Explain why this request is being rejected...' :
                    finalStatus === FinalApprovalStatus.PENDING_INFO ? 'Describe what additional information is required...' :
                    'List any additional information that should be collected before the event is published...'
                  }
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => setShowFinalApprovalModal(false)}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFinalApproval}
                  disabled={submitting || ((finalStatus === FinalApprovalStatus.REJECTED || finalStatus === FinalApprovalStatus.PENDING_INFO) && !finalReason.trim())}
                  className={`px-6 py-3 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                    finalStatus === FinalApprovalStatus.REJECTED ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  <CheckCircle className="h-5 w-5" />
                  {submitting ? 'Submitting...' : 'Submit Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revoke ED Assignment Modal */}
      {showRevokeModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <UserMinus className="h-6 w-6 text-red-500" />
              Revoke ED Assignment
            </h3>

            <p className="text-gray-300 mb-4">
              Are you sure you want to revoke the assignment from{' '}
              <span className="font-semibold text-white">
                {getEDName(selectedRequest.assigned_event_director_id!)}
              </span>
              ?
            </p>
            <p className="text-gray-400 text-sm mb-4">
              The request will be set back to "Under Review" status and you can assign it to a different Event Director.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Reason for Revocation (Optional)</label>
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why you're revoking this assignment..."
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => {
                    setShowRevokeModal(false);
                    setRevokeReason('');
                  }}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevokeAssignment}
                  disabled={submitting}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <UserMinus className="h-5 w-5" />
                  {submitting ? 'Revoking...' : 'Revoke Assignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Response Modal */}
      {showResponseModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-4">
              Quick Response to {selectedRequest.first_name} {selectedRequest.last_name}
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

      {/* Edit Request Modal */}
      {showEditModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Pencil className="h-6 w-6 text-amber-500" />
              Edit Request: {selectedRequest.event_name}
            </h3>

            <div className="space-y-6">
              {/* Host Information */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-4">Host Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
                    <input
                      type="text"
                      value={editFormData.first_name || ''}
                      onChange={(e) => handleEditFormChange('first_name', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={editFormData.last_name || ''}
                      onChange={(e) => handleEditFormChange('last_name', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={editFormData.email || ''}
                      onChange={(e) => handleEditFormChange('email', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                    <input
                      type="text"
                      value={editFormData.phone || ''}
                      onChange={(e) => handleEditFormChange('phone', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Business/Club Name</label>
                    <input
                      type="text"
                      value={editFormData.business_name || ''}
                      onChange={(e) => handleEditFormChange('business_name', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Host Type</label>
                    <select
                      value={editFormData.host_type || ''}
                      onChange={(e) => handleEditFormChange('host_type', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select...</option>
                      <option value="individual">Individual</option>
                      <option value="business">Business</option>
                      <option value="club">Club</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-4">Event Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Event Name</label>
                    <input
                      type="text"
                      value={editFormData.event_name || ''}
                      onChange={(e) => handleEditFormChange('event_name', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Event Description</label>
                    <textarea
                      value={editFormData.event_description || ''}
                      onChange={(e) => handleEditFormChange('event_description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={editFormData.event_start_date ? editFormData.event_start_date.split('T')[0] : ''}
                      onChange={(e) => handleEditFormChange('event_start_date', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={editFormData.event_start_time || ''}
                      onChange={(e) => handleEditFormChange('event_start_time', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                    <input
                      type="date"
                      value={editFormData.event_end_date ? editFormData.event_end_date.split('T')[0] : ''}
                      onChange={(e) => handleEditFormChange('event_end_date', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">End Time</label>
                    <input
                      type="time"
                      value={editFormData.event_end_time || ''}
                      onChange={(e) => handleEditFormChange('event_end_time', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Venue & Location */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-4">Venue & Location</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Venue Name</label>
                    <input
                      type="text"
                      value={editFormData.venue_name || ''}
                      onChange={(e) => handleEditFormChange('venue_name', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Venue Type</label>
                    <input
                      type="text"
                      value={editFormData.venue_type || ''}
                      onChange={(e) => handleEditFormChange('venue_type', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Indoor/Outdoor</label>
                    <select
                      value={editFormData.indoor_outdoor || ''}
                      onChange={(e) => handleEditFormChange('indoor_outdoor', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select...</option>
                      <option value="indoor">Indoor</option>
                      <option value="outdoor">Outdoor</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Power Available</label>
                    <select
                      value={editFormData.power_available === true ? 'yes' : editFormData.power_available === false ? 'no' : ''}
                      onChange={(e) => handleEditFormChange('power_available', e.target.value === 'yes' ? true : e.target.value === 'no' ? false : null)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select...</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Address Line 1</label>
                    <input
                      type="text"
                      value={editFormData.address_line_1 || ''}
                      onChange={(e) => handleEditFormChange('address_line_1', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Address Line 2</label>
                    <input
                      type="text"
                      value={editFormData.address_line_2 || ''}
                      onChange={(e) => handleEditFormChange('address_line_2', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Country</label>
                    <select
                      value={editFormData.country || 'US'}
                      onChange={(e) => {
                        handleEditFormChange('country', e.target.value);
                        handleEditFormChange('state', ''); // Reset state when country changes
                      }}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
                    <input
                      type="text"
                      value={editFormData.city || ''}
                      onChange={(e) => handleEditFormChange('city', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{getStateLabel(editFormData.country || 'US')}</label>
                    {getStatesForCountry(editFormData.country || 'US').length > 0 ? (
                      <select
                        value={editFormData.state || ''}
                        onChange={(e) => handleEditFormChange('state', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select {getStateLabel(editFormData.country || 'US')}</option>
                        {getStatesForCountry(editFormData.country || 'US').map((state) => (
                          <option key={state.code} value={state.code}>
                            {state.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={editFormData.state || ''}
                        onChange={(e) => handleEditFormChange('state', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder={getStateLabel(editFormData.country || 'US')}
                      />
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">{getPostalCodeLabel(editFormData.country || 'US')}</label>
                    <input
                      type="text"
                      value={editFormData.postal_code || ''}
                      onChange={(e) => handleEditFormChange('postal_code', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Info & Fees */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-4">Additional Info & Fees</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Expected Participants</label>
                    <input
                      type="text"
                      value={editFormData.expected_participants || ''}
                      onChange={(e) => handleEditFormChange('expected_participants', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Estimated Budget</label>
                    <input
                      type="text"
                      value={editFormData.estimated_budget || ''}
                      onChange={(e) => handleEditFormChange('estimated_budget', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Member Entry Fee (per class)</label>
                    <input
                      type="text"
                      value={editFormData.member_entry_fee || ''}
                      onChange={(e) => handleEditFormChange('member_entry_fee', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., $20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Non-Member Entry Fee (per class)</label>
                    <input
                      type="text"
                      value={editFormData.non_member_entry_fee || ''}
                      onChange={(e) => handleEditFormChange('non_member_entry_fee', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., $25"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Has Gate Fee?</label>
                    <select
                      value={editFormData.has_gate_fee === true ? 'yes' : editFormData.has_gate_fee === false ? 'no' : ''}
                      onChange={(e) => handleEditFormChange('has_gate_fee', e.target.value === 'yes' ? true : e.target.value === 'no' ? false : null)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select...</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  {editFormData.has_gate_fee && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Gate Fee Amount</label>
                      <input
                        type="text"
                        value={editFormData.gate_fee || ''}
                        onChange={(e) => handleEditFormChange('gate_fee', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="e.g., $5"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Pre-Registration Available?</label>
                    <select
                      value={editFormData.pre_registration_available === true ? 'yes' : editFormData.pre_registration_available === false ? 'no' : ''}
                      onChange={(e) => handleEditFormChange('pre_registration_available', e.target.value === 'yes' ? true : e.target.value === 'no' ? false : null)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select...</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Hosted MECA Events Before?</label>
                    <select
                      value={editFormData.has_hosted_before === true ? 'yes' : editFormData.has_hosted_before === false ? 'no' : ''}
                      onChange={(e) => handleEditFormChange('has_hosted_before', e.target.value === 'yes' ? true : e.target.value === 'no' ? false : null)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select...</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Competition Formats */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-4">Competition Formats</h4>
                <p className="text-sm text-gray-400 mb-3">Select all competition formats that will be available at this event</p>
                {competitionFormats.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {competitionFormats.map((format) => (
                      <label
                        key={format.id}
                        className={`flex items-center p-2 rounded-lg border cursor-pointer transition-all ${
                          (editFormData.competition_formats || []).includes(format.name)
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-slate-500 hover:border-slate-400 bg-slate-600/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={(editFormData.competition_formats || []).includes(format.name)}
                          onChange={() => handleCompetitionFormatToggle(format.name)}
                          className="w-4 h-4 bg-slate-700 border-slate-600 rounded text-orange-500 focus:ring-2 focus:ring-orange-500 mr-2"
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
                {(editFormData.competition_formats || []).length === 0 && (
                  <p className="text-xs text-yellow-400 mt-2">No competition formats selected</p>
                )}
              </div>

              {/* Other Requests */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-4">Other Requests & Notes</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Other Requests</label>
                    <textarea
                      value={editFormData.other_requests || ''}
                      onChange={(e) => handleEditFormChange('other_requests', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Additional Information</label>
                    <textarea
                      value={editFormData.additional_info || ''}
                      onChange={(e) => handleEditFormChange('additional_info', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 justify-end pt-4 border-t border-slate-600">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitEdit}
                  disabled={submitting}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Pencil className="h-5 w-5" />
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
