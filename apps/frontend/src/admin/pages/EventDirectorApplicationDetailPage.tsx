import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Clock, CheckCircle } from 'lucide-react';
import { getEventDirectorApplication, reviewEventDirectorApplication } from '@/event-directors';
import type { EventDirectorApplication } from '@/event-directors';
import type { ApplicationStatus } from '@newmeca/shared';

const APPLICATION_STATUS = {
  PENDING: 'pending' as const,
  UNDER_REVIEW: 'under_review' as const,
  APPROVED: 'approved' as const,
  REJECTED: 'rejected' as const,
};

export default function EventDirectorApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<EventDirectorApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    if (id) {
      loadApplication();
    }
  }, [id]);

  async function loadApplication() {
    setLoading(true);
    setError(null);
    try {
      const data = await getEventDirectorApplication(id!);
      setApplication(data);
      setAdminNotes(data.admin_notes || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load application');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    setSubmitting(true);
    setError(null);
    try {
      await reviewEventDirectorApplication(id!, {
        status: APPLICATION_STATUS.APPROVED as ApplicationStatus,
        admin_notes: adminNotes,
      });
      navigate('/admin/event-director-applications', { state: { message: 'Application approved successfully!' } });
    } catch (err: any) {
      setError(err.message || 'Failed to approve application');
      setSubmitting(false);
    }
  }

  async function handleReject() {
    setSubmitting(true);
    setError(null);
    try {
      await reviewEventDirectorApplication(id!, {
        status: APPLICATION_STATUS.REJECTED as ApplicationStatus,
        admin_notes: adminNotes,
      });
      navigate('/admin/event-director-applications', { state: { message: 'Application rejected.' } });
    } catch (err: any) {
      setError(err.message || 'Failed to reject application');
      setSubmitting(false);
    }
  }

  async function handleMarkUnderReview() {
    setSubmitting(true);
    try {
      await reviewEventDirectorApplication(id!, {
        status: APPLICATION_STATUS.UNDER_REVIEW as ApplicationStatus,
        admin_notes: adminNotes,
      });
      await loadApplication();
    } catch (err: any) {
      setError(err.message || 'Failed to update application');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddNote() {
    if (!newNote.trim()) return;

    const timestamp = new Date().toLocaleString();
    const updatedNotes = adminNotes
      ? `${adminNotes}\n\n[${timestamp}]\n${newNote.trim()}`
      : `[${timestamp}]\n${newNote.trim()}`;

    setSubmitting(true);
    try {
      await reviewEventDirectorApplication(id!, {
        status: application!.status as ApplicationStatus,
        admin_notes: updatedNotes,
      });
      setAdminNotes(updatedNotes);
      setNewNote('');
      await loadApplication();
    } catch (err: any) {
      setError(err.message || 'Failed to add note');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkReferenceChecked(refIndex: number, checked: boolean) {
    // Update admin notes to track reference checks
    const ref = application?.references?.[refIndex];
    if (!ref) return;

    const timestamp = new Date().toLocaleString();
    const note = `[${timestamp}] Reference ${ref.name} marked as ${checked ? 'VERIFIED' : 'PENDING'}`;
    const updatedNotes = adminNotes ? `${adminNotes}\n\n${note}` : note;

    setSubmitting(true);
    try {
      await reviewEventDirectorApplication(id!, {
        status: application!.status as ApplicationStatus,
        admin_notes: updatedNotes,
      });
      setAdminNotes(updatedNotes);
      await loadApplication();
    } catch (err: any) {
      setError(err.message || 'Failed to update reference status');
    } finally {
      setSubmitting(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      under_review: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm border ${styles[status] || 'bg-gray-500/20'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-slate-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 text-red-200">
            {error || 'Application not found'}
          </div>
          <button
            onClick={() => navigate('/admin/event-director-applications')}
            className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Applications
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header with Back Button on Right */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">{application.full_name || 'Applicant'}</h1>
            <p className="text-slate-400">
              Applied on {formatDate(application.application_date)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {getStatusBadge(application.status)}
            {application.status === APPLICATION_STATUS.PENDING && (
              <button
                onClick={handleMarkUnderReview}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Mark Under Review
              </button>
            )}
            <button
              onClick={() => navigate('/admin/event-director-applications')}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Applications
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Info */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Personal Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-sm">Full Name</label>
                  <p className="text-white">{application.full_name || 'Not provided'}</p>
                </div>
                {application.preferred_name && (
                  <div>
                    <label className="text-slate-400 text-sm">Preferred Name</label>
                    <p className="text-white">{application.preferred_name}</p>
                  </div>
                )}
                <div>
                  <label className="text-slate-400 text-sm">Date of Birth</label>
                  <p className="text-white">{formatDate(application.date_of_birth)}</p>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Phone</label>
                  <p className="text-white">{application.phone || 'Not provided'}</p>
                </div>
                {application.secondary_phone && (
                  <div>
                    <label className="text-slate-400 text-sm">Secondary Phone</label>
                    <p className="text-white">{application.secondary_phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Location & Availability */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Location & Availability</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-sm">Location</label>
                  <p className="text-white">{application.city}, {application.state}</p>
                  <p className="text-slate-400 text-sm">{application.country} {application.zip}</p>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Travel Radius</label>
                  <p className="text-white">{application.travel_radius || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Weekend Availability</label>
                  <p className="text-white capitalize">{application.weekend_availability?.replace('_', ' ') || 'Not specified'}</p>
                </div>
                {application.additional_regions && application.additional_regions.length > 0 && (
                  <div>
                    <label className="text-slate-400 text-sm">Additional Regions</label>
                    <p className="text-white">{application.additional_regions.join(', ')}</p>
                  </div>
                )}
                {application.availability_notes && (
                  <div className="col-span-2">
                    <label className="text-slate-400 text-sm">Availability Notes</label>
                    <p className="text-white">{application.availability_notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Experience */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Experience & Qualifications</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 text-sm">Years in Industry</label>
                    <p className="text-white">{application.years_in_industry ?? 'N/A'} years</p>
                  </div>
                </div>
                {application.event_management_experience && (
                  <div>
                    <label className="text-slate-400 text-sm">Event Management Experience</label>
                    <p className="text-white whitespace-pre-wrap">{application.event_management_experience}</p>
                  </div>
                )}
                {application.team_management_experience && (
                  <div>
                    <label className="text-slate-400 text-sm">Team Management Experience</label>
                    <p className="text-white whitespace-pre-wrap">{application.team_management_experience}</p>
                  </div>
                )}
                {application.equipment_resources && (
                  <div>
                    <label className="text-slate-400 text-sm">Equipment & Resources</label>
                    <p className="text-white whitespace-pre-wrap">{application.equipment_resources}</p>
                  </div>
                )}
                {application.specialized_formats && application.specialized_formats.length > 0 && (
                  <div>
                    <label className="text-slate-400 text-sm">Specialized Formats</label>
                    <p className="text-white">{application.specialized_formats.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Candidate Responses (formerly Essays) */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Candidate Responses</h2>
              <div className="space-y-6">
                <div>
                  <label className="text-slate-400 text-sm">Why do you want to become a MECA Event Director?</label>
                  <div className="text-white whitespace-pre-wrap mt-1 bg-slate-700/50 p-4 rounded-lg min-h-[80px]">
                    {application.essay_why_ed || <span className="text-slate-500 italic">No response provided</span>}
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">What qualifies you to be a MECA Event Director?</label>
                  <div className="text-white whitespace-pre-wrap mt-1 bg-slate-700/50 p-4 rounded-lg min-h-[80px]">
                    {application.essay_qualifications || <span className="text-slate-500 italic">No response provided</span>}
                  </div>
                </div>
                {application.essay_additional && (
                  <div>
                    <label className="text-slate-400 text-sm">Additional Information</label>
                    <p className="text-white whitespace-pre-wrap mt-1 bg-slate-700/50 p-4 rounded-lg">
                      {application.essay_additional}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* References */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">References</h2>
              <div className="space-y-4">
                {application.references && application.references.length > 0 ? (
                  application.references.map((ref: any, index: number) => (
                    <div key={index} className="bg-slate-700/50 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-white font-medium">{ref.name || 'Unknown'}</p>
                          <p className="text-slate-400 text-sm">{ref.relationship}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {ref.email_verified ? (
                            <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              VERIFIED
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              PENDING
                            </span>
                          )}
                          <button
                            onClick={() => handleMarkReferenceChecked(index, !ref.email_verified)}
                            disabled={submitting}
                            className={`px-2 py-1 rounded text-xs ${
                              ref.email_verified
                                ? 'bg-yellow-600 hover:bg-yellow-700'
                                : 'bg-green-600 hover:bg-green-700'
                            } text-white disabled:opacity-50`}
                          >
                            {ref.email_verified ? 'Mark Pending' : 'Mark Verified'}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-slate-400">Email: </span>
                          <span className="text-white">{ref.email}</span>
                        </div>
                        {ref.phone && (
                          <div>
                            <span className="text-slate-400">Phone: </span>
                            <span className="text-white">{ref.phone}</span>
                          </div>
                        )}
                        {ref.company_name && (
                          <div>
                            <span className="text-slate-400">Company: </span>
                            <span className="text-white">{ref.company_name}</span>
                          </div>
                        )}
                      </div>
                      {ref.verification_response && (
                        <div className="mt-3 pt-3 border-t border-slate-600">
                          <p className="text-slate-400 text-sm mb-1">Reference Response:</p>
                          <p className="text-white text-sm">{ref.verification_response}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">No references provided</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Card */}
            {(application.status === APPLICATION_STATUS.PENDING ||
              application.status === APPLICATION_STATUS.UNDER_REVIEW) && (
              <div className="bg-slate-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Review Actions</h3>
                <div className="space-y-4">
                  <button
                    onClick={() => setShowApproveModal(true)}
                    className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    Approve Application
                  </button>

                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                  >
                    Reject Application
                  </button>
                </div>
              </div>
            )}

            {/* Admin Notes */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Admin Notes</h3>

              {/* Existing Notes */}
              {adminNotes && (
                <div className="mb-4 bg-slate-700/50 p-3 rounded-lg text-sm text-white whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {adminNotes}
                </div>
              )}

              {/* Add New Note */}
              <div className="space-y-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none h-20 text-sm"
                  placeholder="Add a new note..."
                />
                <button
                  onClick={handleAddNote}
                  disabled={submitting || !newNote.trim()}
                  className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Add Note
                </button>
              </div>
            </div>

            {/* Acknowledgments */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Acknowledgments</h3>
              <div className="space-y-2">
                <div className={`flex items-center gap-2 text-sm ${application.ack_independent_contractor ? 'text-green-400' : 'text-red-400'}`}>
                  {application.ack_independent_contractor ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  <span>Independent Contractor</span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${application.ack_code_of_conduct ? 'text-green-400' : 'text-red-400'}`}>
                  {application.ack_code_of_conduct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  <span>Code of Conduct</span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${application.ack_background_check ? 'text-green-400' : 'text-red-400'}`}>
                  {application.ack_background_check ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  <span>Background Check</span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${application.ack_terms_conditions ? 'text-green-400' : 'text-red-400'}`}>
                  {application.ack_terms_conditions ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  <span>Terms & Conditions</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Timeline</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Submitted</span>
                  <span className="text-white">{formatDate(application.application_date)}</span>
                </div>
                {application.reviewed_date && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reviewed</span>
                    <span className="text-white">{formatDate(application.reviewed_date)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Updated</span>
                  <span className="text-white">{formatDate(application.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Approve Application</h3>
            <p className="text-slate-300 mb-4">
              This will create a new Event Director profile for {application.full_name}.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                disabled={submitting}
              >
                {submitting ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Reject Application</h3>
            <p className="text-slate-300 mb-4">
              Are you sure you want to reject this application from {application.full_name}?
            </p>

            <div className="mb-4">
              <label className="block text-slate-400 text-sm mb-1">Reason (optional)</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-orange-500 focus:outline-none h-24"
                placeholder="Reason for rejection..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                disabled={submitting}
              >
                {submitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
