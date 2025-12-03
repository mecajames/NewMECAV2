import React, { useState, useEffect } from 'react';
import { X, Download, FileText, FileSpreadsheet, User, Edit2, Trash2, Clock, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface AuditSession {
  id: string;
  eventId: string;
  userId: string;
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  entryMethod: 'manual' | 'excel' | 'termlab';
  format: string | null;
  filePath: string | null;
  originalFilename: string | null;
  resultCount: number;
  sessionStart: string;
  sessionEnd: string | null;
  createdAt: string;
}

interface AuditLogEntry {
  id: string;
  session_id: string | null;
  result_id: string | null;
  action: 'create' | 'update' | 'delete';
  old_data: any;
  new_data: any;
  timestamp: string;
  user_id: string;
  user_email: string;
  user_first_name: string | null;
  user_last_name: string | null;
  ip_address: string | null;
}

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
}

type TabType = 'imports' | 'modifications' | 'deletions';

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose, eventId }) => {
  const [activeTab, setActiveTab] = useState<TabType>('imports');
  const [sessions, setSessions] = useState<AuditSession[]>([]);
  const [modifications, setModifications] = useState<AuditLogEntry[]>([]);
  const [deletions, setDeletions] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (isOpen && eventId) {
      fetchAllAuditData();
    }
  }, [isOpen, eventId]);

  const fetchAllAuditData = async () => {
    setLoading(true);
    try {
      // Fetch sessions from the original working endpoint
      const sessionsResponse = await axios.get(`${API_BASE_URL}/api/audit/event/${eventId}/sessions`);
      setSessions(sessionsResponse.data || []);

      // Try to fetch modifications and deletions from new endpoints (may not be deployed yet)
      try {
        const [modificationsResponse, deletionsResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/audit/event/${eventId}/modifications`),
          axios.get(`${API_BASE_URL}/api/audit/event/${eventId}/deletions`),
        ]);
        setModifications(modificationsResponse.data || []);
        setDeletions(deletionsResponse.data || []);
      } catch (err) {
        // New endpoints may not be deployed yet - that's ok
        console.log('Modifications/deletions endpoints not available yet');
        setModifications([]);
        setDeletions([]);
      }
    } catch (error) {
      console.error('Error fetching audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = async (sessionId: string, filename: string) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/audit/session/${sessionId}/download`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || `session-${sessionId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  const getEntryMethodIcon = (method: string) => {
    switch (method) {
      case 'excel':
        return <FileSpreadsheet className="h-5 w-5 text-green-400" />;
      case 'termlab':
        return <FileText className="h-5 w-5 text-blue-400" />;
      case 'manual':
        return <User className="h-5 w-5 text-purple-400" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getEntryMethodLabel = (method: string) => {
    switch (method) {
      case 'excel':
        return 'Excel Import';
      case 'termlab':
        return 'TermLab Import';
      case 'manual':
        return 'Manual Entry';
      default:
        return 'Unknown';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSessionDuration = (start: string, end: string | null) => {
    if (!end) return 'In Progress';

    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationMin = Math.floor(durationMs / 60000);
    const durationSec = Math.floor((durationMs % 60000) / 1000);

    if (durationMin > 0) {
      return `${durationMin}m ${durationSec}s`;
    }
    return `${durationSec}s`;
  };

  const getUserName = (log: AuditLogEntry) => {
    if (log.user_first_name && log.user_last_name) {
      return `${log.user_first_name} ${log.user_last_name}`;
    }
    return log.user_email || 'Unknown User';
  };

  const getCompetitorName = (data: any) => {
    return data?.competitor_name || data?.competitorName || data?.name || 'Unknown';
  };

  const getCompetitorClass = (data: any) => {
    return data?.competition_class || data?.competitionClass || data?.class || 'N/A';
  };

  const viewLogDetails = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const tabCounts = {
    imports: sessions.length,
    modifications: modifications.length,
    deletions: deletions.length,
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="h-6 w-6 text-orange-500" />
              Audit Log
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setActiveTab('imports')}
              className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${
                activeTab === 'imports'
                  ? 'text-orange-500 border-b-2 border-orange-500 bg-slate-700/50'
                  : 'text-gray-400 hover:text-white hover:bg-slate-700/30'
              }`}
            >
              <FileSpreadsheet className="h-5 w-5" />
              Imports
              <span className="ml-2 px-2 py-0.5 bg-slate-600 text-xs rounded-full">
                {tabCounts.imports}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('modifications')}
              className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${
                activeTab === 'modifications'
                  ? 'text-yellow-500 border-b-2 border-yellow-500 bg-slate-700/50'
                  : 'text-gray-400 hover:text-white hover:bg-slate-700/30'
              }`}
            >
              <Edit2 className="h-5 w-5" />
              Modifications
              <span className="ml-2 px-2 py-0.5 bg-slate-600 text-xs rounded-full">
                {tabCounts.modifications}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('deletions')}
              className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${
                activeTab === 'deletions'
                  ? 'text-red-500 border-b-2 border-red-500 bg-slate-700/50'
                  : 'text-gray-400 hover:text-white hover:bg-slate-700/30'
              }`}
            >
              <Trash2 className="h-5 w-5" />
              Deletions
              <span className="ml-2 px-2 py-0.5 bg-slate-600 text-xs rounded-full">
                {tabCounts.deletions}
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-400">Loading audit data...</div>
              </div>
            ) : (
              <>
                {/* Imports Tab */}
                {activeTab === 'imports' && (
                  <div className="space-y-4">
                    {sessions.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-gray-400">No import sessions found for this event</div>
                      </div>
                    ) : (
                      sessions.map((session) => (
                        <div
                          key={session.id}
                          className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-orange-500 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              <div className="mt-1">
                                {getEntryMethodIcon(session.entryMethod)}
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white">
                                    {getEntryMethodLabel(session.entryMethod)}
                                  </span>
                                  {session.format && (
                                    <span className="px-2 py-1 bg-slate-600 text-xs rounded text-gray-300">
                                      {session.format}
                                    </span>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-400">Uploaded by:</span>
                                    <span className="ml-2 text-gray-200">
                                      {session.user?.email || 'Unknown'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Started:</span>
                                    <span className="ml-2 text-gray-200">
                                      {formatDateTime(session.sessionStart)}
                                    </span>
                                  </div>
                                  {session.sessionEnd && (
                                    <div>
                                      <span className="text-gray-400">Duration:</span>
                                      <span className="ml-2 text-gray-200">
                                        {getSessionDuration(session.sessionStart, session.sessionEnd)}
                                      </span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-gray-400">Results:</span>
                                    <span className="ml-2 text-gray-200">
                                      {session.resultCount}
                                    </span>
                                  </div>
                                  {session.originalFilename && (
                                    <div className="col-span-2">
                                      <span className="text-gray-400">File:</span>
                                      <span className="ml-2 text-gray-200">
                                        {session.originalFilename}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {session.filePath && (
                              <button
                                onClick={() =>
                                  handleDownloadFile(
                                    session.id,
                                    session.originalFilename || 'download.xlsx'
                                  )
                                }
                                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                              >
                                <Download className="h-4 w-4" />
                                Download file
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Modifications Tab */}
                {activeTab === 'modifications' && (
                  <div className="space-y-4">
                    {modifications.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-gray-400">No modifications found for this event</div>
                      </div>
                    ) : (
                      modifications.map((log) => (
                        <div
                          key={log.id}
                          className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-yellow-500 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              <div className="mt-1">
                                <Edit2 className="h-5 w-5 text-yellow-400" />
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white">
                                    Result Modified
                                  </span>
                                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                                    UPDATE
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-400">Competitor:</span>
                                    <span className="ml-2 text-gray-200">
                                      {getCompetitorName(log.old_data || log.new_data)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Class:</span>
                                    <span className="ml-2 text-gray-200">
                                      {getCompetitorClass(log.old_data || log.new_data)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Modified by:</span>
                                    <span className="ml-2 text-gray-200">
                                      {getUserName(log)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Date/Time:</span>
                                    <span className="ml-2 text-gray-200">
                                      {formatDateTime(log.timestamp)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => viewLogDetails(log)}
                              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                              View Changes
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Deletions Tab */}
                {activeTab === 'deletions' && (
                  <div className="space-y-4">
                    {deletions.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-gray-400">No deletions found for this event</div>
                      </div>
                    ) : (
                      deletions.map((log) => (
                        <div
                          key={log.id}
                          className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-red-500 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              <div className="mt-1">
                                <Trash2 className="h-5 w-5 text-red-400" />
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white">
                                    Result Deleted
                                  </span>
                                  <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                                    DELETE
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-400">Competitor:</span>
                                    <span className="ml-2 text-gray-200">
                                      {getCompetitorName(log.old_data)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Class:</span>
                                    <span className="ml-2 text-gray-200">
                                      {getCompetitorClass(log.old_data)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Deleted by:</span>
                                    <span className="ml-2 text-gray-200">
                                      {getUserName(log)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Date/Time:</span>
                                    <span className="ml-2 text-gray-200">
                                      {formatDateTime(log.timestamp)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => viewLogDetails(log)}
                              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-700">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal for viewing before/after changes */}
      {showDetailModal && selectedLog && (
        <AuditDetailModal
          log={selectedLog}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedLog(null);
          }}
        />
      )}
    </>
  );
};

// Sub-component for detailed view of changes
interface AuditDetailModalProps {
  log: AuditLogEntry;
  onClose: () => void;
}

const AuditDetailModal: React.FC<AuditDetailModalProps> = ({ log, onClose }) => {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getUserName = () => {
    if (log.user_first_name && log.user_last_name) {
      return `${log.user_first_name} ${log.user_last_name}`;
    }
    return log.user_email || 'Unknown User';
  };

  // Fields to display with friendly labels
  const fieldLabels: Record<string, string> = {
    competitor_name: 'Competitor Name',
    competitorName: 'Competitor Name',
    meca_id: 'MECA ID',
    mecaId: 'MECA ID',
    competition_class: 'Competition Class',
    competitionClass: 'Competition Class',
    format: 'Format',
    score: 'Score',
    placement: 'Placement',
    points_earned: 'Points Earned',
    pointsEarned: 'Points Earned',
    vehicle_info: 'Vehicle Info',
    vehicleInfo: 'Vehicle Info',
    notes: 'Notes',
    wattage: 'Wattage',
    frequency: 'Frequency',
    classId: 'Class ID',
    class_id: 'Class ID',
    seasonId: 'Season ID',
    season_id: 'Season ID',
    createdBy: 'Created By',
    created_by: 'Created By',
    updatedBy: 'Updated By',
    updated_by: 'Updated By',
    revisionCount: 'Revision Count',
    revision_count: 'Revision Count',
  };

  // Fields to skip in display (internal fields and UUIDs that have human-readable alternatives)
  const skipFields = [
    'id', 'created_at', 'createdAt', 'updated_at', 'updatedAt',
    'event_id', 'eventId', 'competitor', 'event',
    'competitor_id', 'competitorId', '__entity', '__helper', '__meta',
    // Skip UUID fields that have human-readable alternatives
    'classId', 'class_id',       // Use competitionClass instead
    'seasonId', 'season_id',     // Season info usually not needed in audit display
    'createdBy', 'created_by',   // "Action by" already shows who did it
    'updatedBy', 'updated_by',   // Same as above
  ];

  // Get all changed fields
  const getChangedFields = () => {
    const changes: { field: string; label: string; oldValue: any; newValue: any }[] = [];
    const oldData = log.old_data || {};
    const newData = log.new_data || {};

    // Get all unique keys from both old and new data
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    allKeys.forEach((key) => {
      // Skip internal fields
      if (skipFields.includes(key)) {
        return;
      }

      const oldValue = oldData[key];
      const newValue = newData[key];

      // Skip if both values are null/undefined
      if (oldValue == null && newValue == null) {
        return;
      }

      // Check if values are different
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          label: fieldLabels[key] || key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim(),
          oldValue: oldValue ?? '-',
          newValue: newValue ?? '-',
        });
      }
    });

    return changes;
  };

  const changes = log.action === 'update' ? getChangedFields() : [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-slate-700 ${
          log.action === 'delete' ? 'bg-red-500/10' : 'bg-yellow-500/10'
        }`}>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            {log.action === 'delete' ? (
              <>
                <Trash2 className="h-6 w-6 text-red-500" />
                Deleted Result Details
              </>
            ) : (
              <>
                <Edit2 className="h-6 w-6 text-yellow-500" />
                Modification Details
              </>
            )}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Metadata */}
        <div className="p-6 border-b border-slate-700 bg-slate-750">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Action by:</span>
              <span className="ml-2 text-white font-medium">{getUserName()}</span>
            </div>
            <div>
              <span className="text-gray-400">Email:</span>
              <span className="ml-2 text-gray-200">{log.user_email}</span>
            </div>
            <div>
              <span className="text-gray-400">Date/Time:</span>
              <span className="ml-2 text-white font-medium">{formatDateTime(log.timestamp)}</span>
            </div>
            {log.ip_address && (
              <div>
                <span className="text-gray-400">IP Address:</span>
                <span className="ml-2 text-gray-200 font-mono text-xs">{log.ip_address}</span>
              </div>
            )}
            <div className="col-span-2">
              <span className="text-gray-400">Result ID:</span>
              <span className="ml-2 text-gray-200 font-mono text-xs">
                {log.result_id || log.old_data?.id || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {log.action === 'delete' ? (
            // Show deleted record data
            <div>
              {log.new_data?.deletion_reason && (
                <div className="mb-4 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <h4 className="text-sm font-semibold text-yellow-400 mb-1">Deletion Reason</h4>
                  <p className="text-white">{log.new_data.deletion_reason}</p>
                </div>
              )}
              <h4 className="text-lg font-semibold text-white mb-4">Deleted Record Data</h4>
              <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(log.old_data || {}).map(([key, value]) => {
                    // Skip internal fields
                    if (skipFields.includes(key)) {
                      return null;
                    }
                    // Skip null/undefined values
                    if (value == null) {
                      return null;
                    }
                    return (
                      <div key={key} className="text-sm">
                        <span className="text-gray-400">
                          {fieldLabels[key] || key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="ml-2 text-red-300">
                          {String(value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            // Show before/after comparison for modifications
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Changes Made</h4>
              {changes.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  No specific field changes detected
                </div>
              ) : (
                <div className="space-y-3">
                  {changes.map((change, index) => (
                    <div
                      key={index}
                      className="bg-slate-700 rounded-lg p-4 border border-slate-600"
                    >
                      <div className="text-sm font-medium text-gray-300 mb-2 capitalize">
                        {change.label}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-red-500/10 rounded p-3 border border-red-500/30">
                          <div className="text-xs text-red-400 mb-1">Before</div>
                          <div className="text-white">
                            {typeof change.oldValue === 'object'
                              ? JSON.stringify(change.oldValue)
                              : String(change.oldValue)}
                          </div>
                        </div>
                        <div className="bg-green-500/10 rounded p-3 border border-green-500/30">
                          <div className="text-xs text-green-400 mb-1">After</div>
                          <div className="text-white">
                            {typeof change.newValue === 'object'
                              ? JSON.stringify(change.newValue)
                              : String(change.newValue)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
