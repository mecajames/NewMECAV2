import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Flame, ArrowLeft, Trophy, Star, Target, Calendar } from 'lucide-react';
import { foreverMembersApi, ForeverMember } from '../forever-members.api-client';
import { getStorageUrl } from '@/lib/storage';

export default function ForeverMemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<ForeverMember | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    foreverMembersApi.getById(id).then(setMember).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-gray-400">Memorial not found.</p>
      </div>
    );
  }

  const stats = member.stats;
  const birthYear = member.date_of_birth ? new Date(member.date_of_birth).getFullYear() : null;
  const passingYear = member.date_of_passing ? new Date(member.date_of_passing).getFullYear() : null;
  const yearsDisplay = birthYear && passingYear ? `${birthYear} – ${passingYear}` : passingYear ? `† ${passingYear}` : '';
  const memberSinceYear = member.member_since ? new Date(member.member_since).getFullYear() : null;

  const totalTrophies = stats ? stats.firstPlace + stats.secondPlace + stats.thirdPlace : 0;

  return (
    <div className="min-h-screen bg-slate-900 relative">
      {/* Angel Wings Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
        style={{
          backgroundImage: 'url(/angel-wings.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center 30%',
          backgroundSize: '70% auto',
        }}
      />

      {/* Back link */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        <button
          onClick={() => navigate('/forever-members')}
          className="flex items-center gap-2 text-amber-500/70 hover:text-amber-400 transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Forever Members
        </button>
      </div>

      {/* Memorial Header */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-slate-800/60 border border-amber-900/20 rounded-2xl overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Photo */}
            <div className="md:w-80 flex-shrink-0">
              {member.photo_url ? (
                <img
                  src={getStorageUrl(member.photo_url)}
                  alt={member.full_name}
                  className="w-full h-64 md:h-full object-cover"
                />
              ) : (
                <div className="w-full h-64 md:h-full bg-slate-700 flex items-center justify-center">
                  <Flame className="h-20 w-20 text-amber-600/20" />
                </div>
              )}
            </div>

            {/* Name & Dates */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <Flame className="h-6 w-6 text-amber-500" />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                  {member.full_name}
                </h1>
              </div>
              {yearsDisplay && (
                <p className="text-amber-200/60 text-lg ml-9">{yearsDisplay}</p>
              )}
              <div className="mt-4 ml-9 space-y-1">
                <p className="text-amber-600 text-sm font-mono">
                  Forever MECA ID #{member.meca_id}
                </p>
                {memberSinceYear && (
                  <p className="text-gray-500 text-sm flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    MECA member since {memberSinceYear}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quote */}
      {member.quote && (
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-6">
          <blockquote className="border-l-4 border-amber-600/40 pl-6 py-3 bg-slate-800/30 rounded-r-lg">
            <p className="text-amber-100/80 italic text-lg leading-relaxed">"{member.quote}"</p>
          </blockquote>
        </div>
      )}

      {/* Bio */}
      {member.bio && (
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-8">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 md:p-8">
            <h2 className="text-lg font-semibold text-amber-400 mb-4">In Memoriam</h2>
            <div className="text-gray-300 leading-relaxed whitespace-pre-line">{member.bio}</div>
          </div>
        </div>
      )}

      {/* Competition Stats */}
      {stats && stats.totalEvents > 0 && (
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-12">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 md:p-8">
            <h2 className="text-lg font-semibold text-amber-400 mb-6 flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Career Highlights
            </h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-700/40 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-white">{stats.totalEvents}</p>
                <p className="text-xs text-gray-400 mt-1">Events Competed</p>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{stats.totalPoints.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">Career Points</p>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">{totalTrophies}</p>
                <p className="text-xs text-gray-400 mt-1">Podium Finishes</p>
              </div>
              {stats.yearsActive && (
                <div className="bg-slate-700/40 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">
                    {stats.yearsActive.last - stats.yearsActive.first + 1}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Years Competing</p>
                </div>
              )}
            </div>

            {/* Placements Breakdown */}
            {totalTrophies > 0 && (
              <div className="flex flex-wrap gap-4 mb-6">
                {stats.firstPlace > 0 && (
                  <div className="flex items-center gap-2 bg-yellow-600/10 border border-yellow-600/20 rounded-lg px-4 py-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="text-yellow-400 font-semibold">{stats.firstPlace}</span>
                    <span className="text-yellow-200/60 text-sm">1st Place</span>
                  </div>
                )}
                {stats.secondPlace > 0 && (
                  <div className="flex items-center gap-2 bg-gray-400/10 border border-gray-400/20 rounded-lg px-4 py-2">
                    <Star className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-300 font-semibold">{stats.secondPlace}</span>
                    <span className="text-gray-400/60 text-sm">2nd Place</span>
                  </div>
                )}
                {stats.thirdPlace > 0 && (
                  <div className="flex items-center gap-2 bg-amber-700/10 border border-amber-700/20 rounded-lg px-4 py-2">
                    <Star className="h-5 w-5 text-amber-600" />
                    <span className="text-amber-500 font-semibold">{stats.thirdPlace}</span>
                    <span className="text-amber-400/60 text-sm">3rd Place</span>
                  </div>
                )}
              </div>
            )}

            {/* Best Scores by Format */}
            {stats.bestScoresByFormat.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-1.5">
                  <Target className="h-4 w-4" />
                  Best Scores by Format
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {stats.bestScoresByFormat.map((entry) => (
                    <div key={entry.format} className="bg-slate-700/30 rounded-lg p-3">
                      <p className="text-xs text-amber-400/70 uppercase tracking-wide">{entry.format}</p>
                      <p className="text-xl font-bold text-white mt-1">{entry.bestScore.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formats */}
            {stats.formatsCompeted.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <p className="text-xs text-gray-500">
                  Competed in: {stats.formatsCompeted.join(', ')}
                  {stats.yearsActive && ` (${stats.yearsActive.first}–${stats.yearsActive.last})`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
