import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Ticket,
  AlertTriangle,
  Loader2,
  XCircle,
  Send,
  Clock,
  CheckCircle2,
  MessageSquare,
  User,
  Headphones,
  ArrowLeft,
} from 'lucide-react';
import * as guestApi from '../ticket-guest.api-client';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: 'Open', color: 'bg-blue-500', icon: <Clock className="w-4 h-4" /> },
  in_progress: { label: 'In Progress', color: 'bg-yellow-500', icon: <Loader2 className="w-4 h-4" /> },
  waiting_on_customer: { label: 'Waiting on You', color: 'bg-purple-500', icon: <User className="w-4 h-4" /> },
  resolved: { label: 'Resolved', color: 'bg-green-500', icon: <CheckCircle2 className="w-4 h-4" /> },
  closed: { label: 'Closed', color: 'bg-gray-500', icon: <XCircle className="w-4 h-4" /> },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-blue-400' },
  medium: { label: 'Medium', color: 'text-yellow-400' },
  high: { label: 'High', color: 'text-orange-400' },
  critical: { label: 'Critical', color: 'text-red-400' },
};

export function GuestTicketViewPage() {
  const { accessToken } = useParams<{ accessToken: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<guestApi.GuestTicket | null>(null);

  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Fetch ticket
  const fetchTicket = async () => {
    if (!accessToken) {
      setError('Invalid ticket link');
      setLoading(false);
      return;
    }

    try {
      const data = await guestApi.viewGuestTicket(accessToken);
      setTicket(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [accessToken]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError(null);

    if (!newComment.trim()) {
      setCommentError('Please enter a message');
      return;
    }

    setSubmittingComment(true);
    try {
      await guestApi.addGuestComment(accessToken!, newComment);
      setNewComment('');
      // Refresh ticket to show new comment
      await fetchTicket();
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading ticket...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
            <div className="inline-flex items-center justify-center p-3 bg-red-500/10 rounded-full mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">
              Ticket Not Found
            </h1>
            <p className="text-gray-400 mb-6">{error || 'Unable to load ticket'}</p>
            <Link
              to="/support/guest"
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Support
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const status = statusConfig[ticket.status] || statusConfig.open;
  const priority = priorityConfig[ticket.priority] || priorityConfig.medium;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Back Link */}
        <Link
          to="/support/guest"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Support
        </Link>

        {/* Ticket Header */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Ticket #{ticket.ticket_number}</p>
              <h1 className="text-xl font-bold text-white">{ticket.title}</h1>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${status.color}`}>
              {status.icon}
              <span className="text-sm font-medium text-white">{status.label}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Category</p>
              <p className="text-white capitalize">{ticket.category.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-gray-400">Priority</p>
              <p className={priority.color}>{priority.label}</p>
            </div>
            <div>
              <p className="text-gray-400">Created</p>
              <p className="text-white">{formatDate(ticket.created_at)}</p>
            </div>
            <div>
              <p className="text-gray-400">Last Updated</p>
              <p className="text-white">{formatDate(ticket.updated_at)}</p>
            </div>
          </div>
        </div>

        {/* Original Description */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <User className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-white font-medium">{ticket.guest_name}</p>
              <p className="text-sm text-gray-400">{ticket.guest_email}</p>
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-gray-300 whitespace-pre-wrap">{ticket.description}</p>
          </div>
        </div>

        {/* Comments/Conversation */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Conversation</h2>
            <span className="text-sm text-gray-400">({ticket.comments.length})</span>
          </div>

          {ticket.comments.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No responses yet</p>
              <p className="text-sm text-gray-500">Our team will respond as soon as possible.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {ticket.comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-4 ${comment.is_staff ? 'bg-slate-700/30' : ''}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${
                      comment.is_staff ? 'bg-green-500/10' : 'bg-orange-500/10'
                    }`}>
                      {comment.is_staff ? (
                        <Headphones className="w-4 h-4 text-green-400" />
                      ) : (
                        <User className="w-4 h-4 text-orange-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{comment.author_name}</p>
                      <p className="text-xs text-gray-400">{formatDate(comment.created_at)}</p>
                    </div>
                    {comment.is_staff && (
                      <span className="ml-auto text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded">
                        Support Staff
                      </span>
                    )}
                  </div>
                  <p className="text-gray-300 whitespace-pre-wrap pl-11">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Comment Form */}
        {ticket.status !== 'closed' ? (
          <form onSubmit={handleAddComment} className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Reply</h3>

            {commentError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500 rounded-lg mb-4">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="text-red-400 text-sm">{commentError}</p>
              </div>
            )}

            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Type your message..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none mb-4"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingComment}
                className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingComment ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Reply
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center">
            <XCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400">This ticket is closed and cannot receive new messages.</p>
            <Link
              to="/support/guest"
              className="inline-block mt-4 text-orange-400 hover:text-orange-300"
            >
              Create a new ticket →
            </Link>
          </div>
        )}

        {/* Bookmark reminder */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Bookmark this page to easily access your ticket later.
        </p>
      </div>
    </div>
  );
}

export default GuestTicketViewPage;
