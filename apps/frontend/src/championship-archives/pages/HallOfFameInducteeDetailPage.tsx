import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, ArrowLeft, Trophy, Users, Store, Gavel, Award, MapPin, MessageCircle, Trash2, Send } from 'lucide-react';
import { hallOfFameApi, type HallOfFameInductee, type HallOfFameComment } from '@/hall-of-fame/hall-of-fame.api-client';
import { getStorageUrl } from '@/lib/storage';
import { useAuth } from '@/auth';
import { isAdminUser } from '@/auth/isAdminUser';

const KNOWN_ICONS: Record<string, typeof Trophy> = {
  competitors: Trophy,
  teams: Users,
  retailers: Store,
  judges: Gavel,
};

function formatLabel(key: string) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function HallOfFameInducteeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [inductee, setInductee] = useState<HallOfFameInductee | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [comments, setComments] = useState<HallOfFameComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = isAdminUser(profile as any);
  const isActiveMember =
    isAdmin ||
    ((profile as any)?.membership_status || '').toLowerCase() === 'active';

  const loadComments = useCallback(async () => {
    if (!id) return;
    setCommentsLoading(true);
    try {
      const list = await hallOfFameApi.listComments(id);
      setComments(list);
    } catch (e) {
      console.error('Failed to load comments', e);
    } finally {
      setCommentsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    hallOfFameApi
      .getById(id)
      .then((data) => setInductee(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    loadComments();
  }, [id, loadComments]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !draft.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await hallOfFameApi.createComment(id, draft.trim());
      setComments((prev) => [...prev, created]);
      setDraft('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to post comment. Please try again.';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!id) return;
    if (!confirm('Delete this comment?')) return;
    try {
      await hallOfFameApi.deleteComment(id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment', err);
      alert('Could not delete comment.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-r-transparent" />
      </div>
    );
  }

  if (notFound || !inductee) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6 text-center">
        <Award className="w-12 h-12 text-gray-500 mb-4" />
        <p className="text-gray-300 text-lg mb-4">Hall of Fame inductee not found.</p>
        <Link
          to="/hall-of-fame"
          className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Hall of Fame
        </Link>
      </div>
    );
  }

  const CategoryIcon = KNOWN_ICONS[inductee.category] || Award;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <button
          onClick={() => navigate('/hall-of-fame')}
          className="flex items-center gap-2 text-orange-400/80 hover:text-orange-300 text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Hall of Fame
        </button>

        {/* Header card */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-72 flex-shrink-0 bg-slate-900/40">
              {inductee.image_url ? (
                <img
                  src={getStorageUrl(inductee.image_url)}
                  alt={inductee.name}
                  className="w-full h-64 md:h-full object-cover"
                />
              ) : (
                <div className="w-full h-64 md:h-full flex items-center justify-center">
                  <CategoryIcon className="w-20 h-20 text-slate-600" />
                </div>
              )}
            </div>

            <div className="flex-1 p-6 md:p-8">
              <div className="flex items-center gap-2 text-orange-400 text-sm uppercase tracking-wide mb-2">
                <CategoryIcon className="w-4 h-4" />
                <span>{formatLabel(inductee.category)}</span>
                <span className="text-slate-500">·</span>
                <Star className="w-4 h-4 text-yellow-400" />
                <span>Inducted {inductee.induction_year}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">{inductee.name}</h1>

              <div className="mt-4 space-y-1 text-gray-300 text-sm">
                {inductee.team_affiliation && (
                  <p className="text-orange-300/80">{inductee.team_affiliation}</p>
                )}
                {(inductee.location || inductee.state) && (
                  <p className="flex items-center gap-1.5 text-gray-400">
                    <MapPin className="w-4 h-4" />
                    {[inductee.location, inductee.state].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {inductee.bio && (
          <div className="mt-6 bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 md:p-8">
            <h2 className="text-lg font-semibold text-orange-400 mb-3">Biography</h2>
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">{inductee.bio}</p>
          </div>
        )}

        {/* Comments */}
        <div className="mt-6 bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 md:p-8">
          <h2 className="text-lg font-semibold text-orange-400 mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Member Tributes
            <span className="text-xs text-gray-500 font-normal ml-1">({comments.length})</span>
          </h2>

          {commentsLoading ? (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-r-transparent" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-gray-500 text-sm italic mb-6">
              No tributes yet. Be the first to share a memory.
            </p>
          ) : (
            <ul className="space-y-4 mb-6">
              {comments.map((c) => {
                const canDelete = isAdmin || c.author.id === user?.id;
                const displayName =
                  c.author.full_name?.trim() ||
                  [c.author.first_name, c.author.last_name].filter(Boolean).join(' ').trim() ||
                  'MECA Member';
                return (
                  <li
                    key={c.id}
                    className="bg-slate-900/40 border border-slate-700/40 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      {c.author.avatar_url ? (
                        <img
                          src={getStorageUrl(c.author.avatar_url)}
                          alt={displayName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-600 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-orange-400 font-semibold flex-shrink-0">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <p className="font-medium text-white text-sm">{displayName}</p>
                            {c.author.meca_id && (
                              <span className="text-xs text-orange-500/60 font-mono">
                                #{c.author.meca_id}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {formatDate(c.created_at)}
                            </span>
                          </div>
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="text-gray-500 hover:text-red-400 transition-colors"
                              title="Delete comment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-gray-300 text-sm mt-1 whitespace-pre-line break-words">
                          {c.body}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Composer */}
          {!user ? (
            <div className="border-t border-slate-700/50 pt-4 text-center">
              <p className="text-gray-400 text-sm mb-2">
                Active MECA members can leave a tribute.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 text-sm font-medium"
              >
                Sign in to comment
              </Link>
            </div>
          ) : !isActiveMember ? (
            <div className="border-t border-slate-700/50 pt-4 text-center">
              <p className="text-gray-400 text-sm mb-2">
                Only active MECA members can leave tributes.
              </p>
              <Link
                to="/membership"
                className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 text-sm font-medium"
              >
                Become a member
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="border-t border-slate-700/50 pt-4">
              <label htmlFor="comment-body" className="block text-sm text-gray-300 mb-2">
                Share a memory or tribute
              </label>
              <textarea
                id="comment-body"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Write your tribute…"
                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg p-3 text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:border-orange-500/60 resize-y"
                disabled={submitting}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">{draft.length}/2000</span>
                <button
                  type="submit"
                  disabled={submitting || !draft.trim()}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Posting…' : 'Post Tribute'}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
