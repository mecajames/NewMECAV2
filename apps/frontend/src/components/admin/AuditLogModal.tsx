import React, { useState, useEffect } from 'react';
import { X, Download, FileText, FileSpreadsheet, Clock, User } from 'lucide-react';
import axios from 'axios';

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

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose, eventId }) => {
  const [sessions, setSessions] = useState<AuditSession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && eventId) {
      fetchAuditSessions();
    }
  }, [isOpen, eventId]);

  const fetchAuditSessions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:3001/api/audit/event/${eventId}/sessions`);
      setSessions(response.data);
    } catch (error) {
      console.error('Error fetching audit sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = async (sessionId: string, filename: string) => {
    try {
      const response = await axios.get(
        `http://localhost:3001/api/audit/session/${sessionId}/download`,
        { responseType: 'blob' }
      );

      // Create a download link
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400">Loading audit sessions...</div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400">No audit sessions found for this event</div>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-orange-500 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Icon */}
                      <div className="mt-1">
                        {getEntryMethodIcon(session.entryMethod)}
                      </div>

                      {/* Session Info */}
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

                    {/* Download Button */}
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
              ))}
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
