import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, Users, MessageSquare, MapPin, Gavel, Building2, Factory, UserCheck } from 'lucide-react';
import { VotingAnswerType } from '@newmeca/shared';
import type { VotingSessionResults } from '@newmeca/shared';
import { finalsVotingApi } from '../../api-client/finals-voting.api-client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const CHART_COLORS = ['#f97316', '#06b6d4', '#8b5cf6', '#22c55e', '#eab308', '#ec4899', '#14b8a6', '#f43f5e'];

// Profile-based answer types that use member_votes
const PROFILE_TYPES = new Set<string>([
  VotingAnswerType.MEMBER,
  VotingAnswerType.JUDGE,
  VotingAnswerType.EVENT_DIRECTOR,
]);

// Text-entity answer types that use venue_votes display (business/venue name with vote counts)
const TEXT_ENTITY_TYPES = new Set<string>([
  VotingAnswerType.RETAILER,
  VotingAnswerType.MANUFACTURER,
  VotingAnswerType.VENUE,
]);

const answerTypeBadge: Record<string, { label: string; color: string; icon: typeof Users }> = {
  [VotingAnswerType.MEMBER]: { label: 'Member', color: 'bg-blue-500/20 text-blue-400', icon: Users },
  [VotingAnswerType.JUDGE]: { label: 'Judge', color: 'bg-amber-500/20 text-amber-400', icon: Gavel },
  [VotingAnswerType.EVENT_DIRECTOR]: { label: 'Event Director', color: 'bg-teal-500/20 text-teal-400', icon: UserCheck },
  [VotingAnswerType.RETAILER]: { label: 'Retailer', color: 'bg-green-500/20 text-green-400', icon: Building2 },
  [VotingAnswerType.MANUFACTURER]: { label: 'Manufacturer', color: 'bg-indigo-500/20 text-indigo-400', icon: Factory },
  [VotingAnswerType.VENUE]: { label: 'Venue', color: 'bg-pink-500/20 text-pink-400', icon: MapPin },
  [VotingAnswerType.TEAM]: { label: 'Team', color: 'bg-cyan-500/20 text-cyan-400', icon: Users },
  [VotingAnswerType.TEXT]: { label: 'Text', color: 'bg-purple-500/20 text-purple-400', icon: MessageSquare },
};

export default function VotingResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<VotingSessionResults | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadResults(sessionId);
    }
  }, [sessionId]);

  const loadResults = async (id: string) => {
    try {
      setLoading(true);
      const data = await finalsVotingApi.getPublicResults(id);
      setResults(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Results are not yet available');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent" />
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Trophy className="h-16 w-16 text-slate-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Results Not Available</h1>
          <p className="text-slate-400 mb-6">{error || 'The results for this voting session are not yet published.'}</p>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Trophy className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{results.session.title}</h1>
          {results.session.description && <p className="text-slate-400 text-lg">{results.session.description}</p>}
          <p className="text-sm text-slate-500 mt-2">{results.total_voters} total voters</p>
        </div>

        {/* Categories */}
        <div className="space-y-12">
          {results.categories.map((cat) => (
            <div key={cat.category_id}>
              <h2 className="text-2xl font-bold text-white mb-2">{cat.category_name}</h2>
              {cat.category_description && <p className="text-slate-400 mb-6">{cat.category_description}</p>}

              <div className="space-y-6">
                {cat.questions.map((q) => {
                  const badge = answerTypeBadge[q.answer_type] || answerTypeBadge[VotingAnswerType.TEXT];
                  const BadgeIcon = badge.icon;
                  const isProfileType = PROFILE_TYPES.has(q.answer_type);

                  return (
                    <div key={q.question_id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                      {/* Question header */}
                      <div className="p-6 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                          {q.question_image_url && (
                            <img src={q.question_image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                          )}
                          <div>
                            <h3 className="text-lg font-bold text-white">{q.question_title}</h3>
                            {q.question_description && <p className="text-slate-400 mt-1 text-sm">{q.question_description}</p>}
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
                                <BadgeIcon className="h-3 w-3" /> {badge.label}
                              </span>
                              <span className="text-sm text-slate-500">{q.total_responses} responses</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Profile-based Results (member, judge, event_director) */}
                      {isProfileType && q.member_votes && q.member_votes.length > 0 && (
                        <>
                          {/* Winner */}
                          {q.member_votes[0].vote_count > 0 && (
                            <div className="p-6 bg-gradient-to-r from-orange-500/10 to-transparent border-b border-slate-700">
                              <div className="flex items-center gap-4">
                                <div className="flex-shrink-0">
                                  <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                                    <Trophy className="h-6 w-6 text-orange-500" />
                                  </div>
                                </div>
                                {q.member_votes[0].member_avatar_url && (
                                  <img src={q.member_votes[0].member_avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                                )}
                                <div>
                                  <p className="text-sm text-orange-400 font-medium uppercase tracking-wider">Winner</p>
                                  <p className="text-xl font-bold text-white">
                                    {q.member_votes[0].member_name}
                                    {q.member_votes[0].member_meca_id && (
                                      <span className="text-slate-400 text-base ml-2">(#{q.member_votes[0].member_meca_id})</span>
                                    )}
                                  </p>
                                  <p className="text-sm text-slate-500 mt-1">
                                    {q.member_votes[0].vote_count} votes ({q.total_responses > 0 ? Math.round((q.member_votes[0].vote_count / q.total_responses) * 100) : 0}%)
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Chart */}
                          <div className="p-6">
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={q.member_votes.slice(0, 10).map(mv => ({
                                    name: mv.member_name.length > 15 ? mv.member_name.substring(0, 15) + '...' : mv.member_name,
                                    votes: mv.vote_count,
                                    fullName: `${mv.member_name}${mv.member_meca_id ? ` (#${mv.member_meca_id})` : ''}`,
                                  }))}
                                  layout="vertical"
                                  margin={{ left: 20 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                  <XAxis type="number" stroke="#94a3b8" allowDecimals={false} tick={{ fill: '#94a3b8' }} />
                                  <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                  <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '8px' }}
                                    formatter={(value: number, _name: string, props: { payload?: { fullName?: string } }) => [value, props.payload?.fullName || 'Votes']}
                                  />
                                  <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={24}>
                                    {q.member_votes.slice(0, 10).map((_, idx) => (
                                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* All results list */}
                          <div className="border-t border-slate-700">
                            {q.member_votes.map((mv, idx) => (
                              <div key={mv.member_id} className={`flex items-center gap-4 p-4 ${idx < q.member_votes!.length - 1 ? 'border-b border-slate-700/50' : ''}`}>
                                <div className="w-8 h-8 flex items-center justify-center text-sm font-bold rounded-full" style={{ backgroundColor: `${CHART_COLORS[idx % CHART_COLORS.length]}20`, color: CHART_COLORS[idx % CHART_COLORS.length] }}>
                                  {idx + 1}
                                </div>
                                {mv.member_avatar_url ? (
                                  <img src={mv.member_avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-slate-400" />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <p className="text-white font-medium">{mv.member_name}</p>
                                  {mv.member_meca_id && <p className="text-xs text-slate-400">MECA #{mv.member_meca_id}</p>}
                                </div>
                                <div className="text-right">
                                  <p className="text-white font-medium">{mv.vote_count}</p>
                                  <p className="text-xs text-slate-400">{q.total_responses > 0 ? Math.round((mv.vote_count / q.total_responses) * 100) : 0}%</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Team Results */}
                      {q.answer_type === VotingAnswerType.TEAM && q.team_votes && q.team_votes.length > 0 && (
                        <>
                          {/* Winner */}
                          {q.team_votes[0].vote_count > 0 && (
                            <div className="p-6 bg-gradient-to-r from-orange-500/10 to-transparent border-b border-slate-700">
                              <div className="flex items-center gap-4">
                                <div className="flex-shrink-0">
                                  <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                                    <Trophy className="h-6 w-6 text-orange-500" />
                                  </div>
                                </div>
                                {q.team_votes[0].team_logo_url && (
                                  <img src={q.team_votes[0].team_logo_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                                )}
                                <div>
                                  <p className="text-sm text-orange-400 font-medium uppercase tracking-wider">Winner</p>
                                  <p className="text-xl font-bold text-white">{q.team_votes[0].team_name}</p>
                                  <p className="text-sm text-slate-500 mt-1">
                                    {q.team_votes[0].vote_count} votes ({q.total_responses > 0 ? Math.round((q.team_votes[0].vote_count / q.total_responses) * 100) : 0}%)
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Chart */}
                          <div className="p-6">
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={q.team_votes.slice(0, 10).map(tv => ({
                                    name: tv.team_name.length > 15 ? tv.team_name.substring(0, 15) + '...' : tv.team_name,
                                    votes: tv.vote_count,
                                    fullName: tv.team_name,
                                  }))}
                                  layout="vertical"
                                  margin={{ left: 20 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                  <XAxis type="number" stroke="#94a3b8" allowDecimals={false} tick={{ fill: '#94a3b8' }} />
                                  <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                  <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '8px' }}
                                    formatter={(value: number, _name: string, props: { payload?: { fullName?: string } }) => [value, props.payload?.fullName || 'Votes']}
                                  />
                                  <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={24}>
                                    {q.team_votes.slice(0, 10).map((_, idx) => (
                                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* All results list */}
                          <div className="border-t border-slate-700">
                            {q.team_votes.map((tv, idx) => (
                              <div key={tv.team_id} className={`flex items-center gap-4 p-4 ${idx < q.team_votes!.length - 1 ? 'border-b border-slate-700/50' : ''}`}>
                                <div className="w-8 h-8 flex items-center justify-center text-sm font-bold rounded-full" style={{ backgroundColor: `${CHART_COLORS[idx % CHART_COLORS.length]}20`, color: CHART_COLORS[idx % CHART_COLORS.length] }}>
                                  {idx + 1}
                                </div>
                                {tv.team_logo_url ? (
                                  <img src={tv.team_logo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-slate-400" />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <p className="text-white font-medium">{tv.team_name}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-white font-medium">{tv.vote_count}</p>
                                  <p className="text-xs text-slate-400">{q.total_responses > 0 ? Math.round((tv.vote_count / q.total_responses) * 100) : 0}%</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Text-Entity Results (retailer, manufacturer, venue) */}
                      {TEXT_ENTITY_TYPES.has(q.answer_type) && q.venue_votes && q.venue_votes.length > 0 && (
                        <>
                          {/* Winner */}
                          {q.venue_votes[0].vote_count > 0 && (
                            <div className="p-6 bg-gradient-to-r from-orange-500/10 to-transparent border-b border-slate-700">
                              <div className="flex items-center gap-4">
                                <div className="flex-shrink-0">
                                  <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                                    <Trophy className="h-6 w-6 text-orange-500" />
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm text-orange-400 font-medium uppercase tracking-wider">Winner</p>
                                  <p className="text-xl font-bold text-white">{q.venue_votes[0].venue_name}</p>
                                  <p className="text-sm text-slate-500 mt-1">
                                    {q.venue_votes[0].vote_count} votes ({q.total_responses > 0 ? Math.round((q.venue_votes[0].vote_count / q.total_responses) * 100) : 0}%)
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Chart */}
                          <div className="p-6">
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={q.venue_votes.slice(0, 10).map(vv => ({
                                    name: vv.venue_name.length > 15 ? vv.venue_name.substring(0, 15) + '...' : vv.venue_name,
                                    votes: vv.vote_count,
                                    fullName: vv.venue_name,
                                  }))}
                                  layout="vertical"
                                  margin={{ left: 20 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                  <XAxis type="number" stroke="#94a3b8" allowDecimals={false} tick={{ fill: '#94a3b8' }} />
                                  <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                  <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '8px' }}
                                    formatter={(value: number, _name: string, props: { payload?: { fullName?: string } }) => [value, props.payload?.fullName || 'Votes']}
                                  />
                                  <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={24}>
                                    {q.venue_votes.slice(0, 10).map((_, idx) => (
                                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* All results list */}
                          <div className="border-t border-slate-700">
                            {q.venue_votes.map((vv, idx) => {
                              const EntityIcon = badge.icon;
                              return (
                              <div key={vv.venue_name} className={`flex items-center gap-4 p-4 ${idx < q.venue_votes!.length - 1 ? 'border-b border-slate-700/50' : ''}`}>
                                <div className="w-8 h-8 flex items-center justify-center text-sm font-bold rounded-full" style={{ backgroundColor: `${CHART_COLORS[idx % CHART_COLORS.length]}20`, color: CHART_COLORS[idx % CHART_COLORS.length] }}>
                                  {idx + 1}
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                  <EntityIcon className="h-5 w-5 text-slate-400" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-white font-medium">{vv.venue_name}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-white font-medium">{vv.vote_count}</p>
                                  <p className="text-xs text-slate-400">{q.total_responses > 0 ? Math.round((vv.vote_count / q.total_responses) * 100) : 0}%</p>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {/* Text Answer Results */}
                      {q.answer_type === VotingAnswerType.TEXT && q.text_answers && q.text_answers.length > 0 && (
                        <div className="p-6">
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {q.text_answers.map((answer, idx) => (
                              <div key={idx} className="p-3 bg-slate-700/50 rounded-lg">
                                <p className="text-slate-200 text-sm">{answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No responses */}
                      {q.total_responses === 0 && (
                        <div className="p-6 text-center text-slate-400">
                          No responses for this question.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Back button */}
        <div className="mt-8 text-center">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">
            <ArrowLeft className="h-5 w-5" /> Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
