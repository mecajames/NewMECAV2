import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Trophy, TrendingUp, Medal, Zap, Activity, MapPin, Calendar, Crown,
  BarChart3, Music, Volume2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TeamAnalytics } from '../teams.api-client';
import { MecaIdLink } from '@/competition-results/components/MecaIdLink';

interface Props {
  analytics: TeamAnalytics | null;
  loading: boolean;
}

function MemberName({ name, mecaId, className }: { name: string; mecaId?: string; className?: string }) {
  if (!mecaId) return <span className={className}>{name}</span>;
  return <MecaIdLink mecaId={mecaId} displayText={name} className={className} />;
}

export default function TeamAnalyticsSection({ analytics, loading }: Props) {
  const navigate = useNavigate();

  if (!analytics) return null;
  const a = analytics;
  const hasResults = a.memberLeaderboard.some(m => m.competitions > 0);
  const dimmed = loading ? 'opacity-50' : '';

  if (!hasResults && !a.upcomingEvents.length) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
          <BarChart3 className="h-5 w-5 text-orange-500" /> Team Analytics
        </h2>
        <p className="text-gray-400 text-sm">No competition results for this team in the selected season yet.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 mb-6 ${dimmed}`}>
      {/* Rank banner + season comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {a.teamRank && (
          <div className="bg-gradient-to-br from-orange-500/20 to-slate-800 border border-orange-500/40 rounded-xl p-6 text-center">
            <Trophy className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <div className="text-3xl font-extrabold text-white">#{a.teamRank.rank}</div>
            <div className="text-sm text-gray-300">of {a.teamRank.totalTeams} teams by points</div>
            <div className="text-xs text-gray-500 mt-1">{a.teamRank.points.toLocaleString()} team points</div>
          </div>
        )}
        {a.seasonComparison && (
          <div className="md:col-span-2 bg-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              {a.seasonComparison.current.seasonName}
              {a.seasonComparison.previous && <span className="text-gray-500">vs {a.seasonComparison.previous.seasonName}</span>}
            </h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              {(['points', 'competitions', 'podiums', 'events'] as const).map(key => {
                const curr = a.seasonComparison!.current[key];
                const prev = a.seasonComparison!.previous?.[key];
                const delta = prev !== undefined && prev !== null ? curr - prev : null;
                return (
                  <div key={key} className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xl font-bold text-white">{curr.toLocaleString()}</div>
                    <div className="text-xs text-gray-400 capitalize">{key}</div>
                    {delta !== null && (
                      <div className={`text-xs mt-1 font-medium ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                        {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {delta !== 0 ? Math.abs(delta).toLocaleString() : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Member contribution leaderboard */}
      {hasResults && (
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <Medal className="h-5 w-5 text-yellow-500" /> Member Leaderboard
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-slate-700">
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">Member</th>
                  <th className="py-2 pr-3 font-medium text-right">Points</th>
                  <th className="py-2 pr-3 font-medium text-center">Comps</th>
                  <th className="py-2 pr-3 font-medium text-center">1st/2nd/3rd</th>
                  <th className="py-2 pr-3 font-medium text-right">Best SPL</th>
                  <th className="py-2 pr-3 font-medium text-right">Avg SPL</th>
                  <th className="py-2 pr-3 font-medium text-right">Best SQ</th>
                  <th className="py-2 pr-0 font-medium text-right">Avg SQ</th>
                </tr>
              </thead>
              <tbody>
                {a.memberLeaderboard.filter(m => m.competitions > 0).map((m, i) => (
                  <tr key={m.userId} className="border-b border-slate-700/40">
                    <td className="py-2 pr-3">
                      {i === 0 ? <Crown className="h-4 w-4 text-yellow-500" /> : <span className="text-gray-500">{i + 1}</span>}
                    </td>
                    <td className="py-2 pr-3">
                      <MemberName name={m.name} mecaId={m.mecaId} className="text-white font-medium" />
                      {i === 0 && <span className="ml-2 text-xs bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded-full">MVP</span>}
                    </td>
                    <td className="py-2 pr-3 text-right text-orange-400 font-semibold">{m.points.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-center text-gray-300">{m.competitions}</td>
                    <td className="py-2 pr-3 text-center text-gray-300">
                      <span className="text-yellow-400">{m.first}</span> / <span className="text-gray-300">{m.second}</span> / <span className="text-amber-600">{m.third}</span>
                    </td>
                    <td className="py-2 pr-3 text-right text-red-400">{m.bestSpl !== null ? `${m.bestSpl.toFixed(1)}` : '—'}</td>
                    <td className="py-2 pr-3 text-right text-gray-300">{m.avgSpl !== null ? m.avgSpl.toFixed(1) : '—'}</td>
                    <td className="py-2 pr-3 text-right text-green-400">{m.bestSq !== null ? m.bestSq.toFixed(1) : '—'}</td>
                    <td className="py-2 pr-0 text-right text-gray-300">{m.avgSq !== null ? m.avgSq.toFixed(1) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cumulative points chart */}
      {a.pointsOverTime.length > 1 && (
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-orange-500" /> Team Points Over Time
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={a.pointsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value: number, key: string) => [value.toLocaleString(), key === 'cumulative' ? 'Total Points' : 'Event Points']}
              />
              <Line type="monotone" dataKey="cumulative" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="cumulative" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Format breakdown + Wattage & Frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {a.formatBreakdown.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-cyan-400" /> Format Breakdown
            </h2>
            <div className="space-y-3">
              {a.formatBreakdown.map(f => (
                <div key={f.format} className="bg-slate-700/40 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white font-medium">{f.format}</span>
                    <span className="text-xs text-gray-400">{f.competitions} comps · {f.points.toLocaleString()} pts</span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>Win rate <span className="text-yellow-400 font-semibold">{f.winRate}%</span></span>
                    <span>Podiums <span className="text-gray-200">{f.podiums}</span></span>
                    <span>Avg <span className="text-gray-200">{f.avgScore.toFixed(1)}</span></span>
                    <span>Best <span className="text-orange-400">{f.bestScore.toFixed(1)}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(a.wattageFrequency.avgWattage !== null || a.wattageFrequency.avgFrequency !== null) && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-yellow-400" /> Wattage & Frequency
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-yellow-400">
                  {a.wattageFrequency.avgWattage !== null ? `${a.wattageFrequency.avgWattage.toLocaleString()} W` : '—'}
                </div>
                <div className="text-xs text-gray-400">Avg Wattage</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-cyan-400">
                  {a.wattageFrequency.avgFrequency !== null ? `${a.wattageFrequency.avgFrequency} Hz` : '—'}
                </div>
                <div className="text-xs text-gray-400">
                  Avg Frequency
                  {a.wattageFrequency.minFrequency !== null && a.wattageFrequency.maxFrequency !== null &&
                    ` (${a.wattageFrequency.minFrequency}–${a.wattageFrequency.maxFrequency} Hz)`}
                </div>
              </div>
            </div>
            {a.wattageFrequency.topWattageByMember.length > 0 && (
              <>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Biggest Systems</h4>
                {a.wattageFrequency.topWattageByMember.map((w, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-slate-700/40 last:border-0">
                    <MemberName name={w.name} mecaId={w.mecaId} className="text-gray-300" />
                    <span className="text-yellow-400 font-semibold">{w.wattage.toLocaleString()} W</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Class leaders */}
      {a.classLeaders.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <Medal className="h-5 w-5 text-orange-500" /> Class Leaders
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-slate-700">
                  <th className="py-2 pr-3 font-medium">Class</th>
                  <th className="py-2 pr-3 font-medium text-center">Entries</th>
                  <th className="py-2 pr-3 font-medium text-center">Members</th>
                  <th className="py-2 pr-3 font-medium text-right">Avg Score</th>
                  <th className="py-2 pr-3 font-medium">Points Leader</th>
                  <th className="py-2 pr-0 font-medium">Top Score</th>
                </tr>
              </thead>
              <tbody>
                {a.classLeaders.map(c => (
                  <tr key={c.className} className="border-b border-slate-700/40">
                    <td className="py-2 pr-3">
                      <span className="text-white font-medium">{c.className}</span>
                      {c.format && <span className="text-xs text-gray-500 ml-2">{c.format}</span>}
                    </td>
                    <td className="py-2 pr-3 text-center text-gray-300">{c.entries}</td>
                    <td className="py-2 pr-3 text-center text-gray-300">{c.members}</td>
                    <td className="py-2 pr-3 text-right text-gray-300">{c.avgScore.toFixed(1)}{c.isSpl ? ' dB' : ''}</td>
                    <td className="py-2 pr-3">
                      {c.pointsLeader ? (
                        <>
                          <MemberName name={c.pointsLeader.name} mecaId={c.pointsLeader.mecaId} className="text-orange-400" />
                          <span className="text-xs text-gray-500 ml-1">({c.pointsLeader.points} pts)</span>
                        </>
                      ) : '—'}
                    </td>
                    <td className="py-2 pr-0">
                      {c.scoreLeader ? (
                        <>
                          <MemberName name={c.scoreLeader.name} mecaId={c.scoreLeader.mecaId} className={c.isSpl ? 'text-red-400' : 'text-green-400'} />
                          <span className="text-xs text-gray-400 ml-1">{c.scoreLeader.score.toFixed(1)}{c.isSpl ? ' dB' : ''}</span>
                        </>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All-time records board */}
      {(a.records.bestSpl || a.records.bestSq || a.records.maxWattage || a.records.biggestEventPoints) && (
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
            <Trophy className="h-5 w-5 text-yellow-500" /> Team Records
          </h2>
          <p className="text-xs text-gray-500 mb-4">All-time — not affected by the season filter</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {a.records.bestSpl && (
              <div className="bg-gradient-to-br from-red-500/15 to-slate-700/40 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-400 text-xs font-semibold mb-1"><Volume2 className="h-3.5 w-3.5" /> LOUDEST SPL</div>
                <div className="text-2xl font-extrabold text-white">{a.records.bestSpl.score?.toFixed(1)} dB</div>
                <div className="text-sm text-gray-300 mt-1"><MemberName name={a.records.bestSpl.name} mecaId={a.records.bestSpl.mecaId} /></div>
                <div className="text-xs text-gray-500">{a.records.bestSpl.eventName}{a.records.bestSpl.date ? ` · ${a.records.bestSpl.date}` : ''}</div>
              </div>
            )}
            {a.records.bestSq && (
              <div className="bg-gradient-to-br from-green-500/15 to-slate-700/40 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-400 text-xs font-semibold mb-1"><Music className="h-3.5 w-3.5" /> BEST SQ</div>
                <div className="text-2xl font-extrabold text-white">{a.records.bestSq.score?.toFixed(1)}</div>
                <div className="text-sm text-gray-300 mt-1"><MemberName name={a.records.bestSq.name} mecaId={a.records.bestSq.mecaId} /></div>
                <div className="text-xs text-gray-500">{a.records.bestSq.eventName}{a.records.bestSq.date ? ` · ${a.records.bestSq.date}` : ''}</div>
              </div>
            )}
            {a.records.maxWattage && (
              <div className="bg-gradient-to-br from-yellow-500/15 to-slate-700/40 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-400 text-xs font-semibold mb-1"><Zap className="h-3.5 w-3.5" /> MAX WATTAGE</div>
                <div className="text-2xl font-extrabold text-white">{a.records.maxWattage.value?.toLocaleString()} W</div>
                <div className="text-sm text-gray-300 mt-1"><MemberName name={a.records.maxWattage.name} mecaId={a.records.maxWattage.mecaId} /></div>
                <div className="text-xs text-gray-500">{a.records.maxWattage.eventName}{a.records.maxWattage.date ? ` · ${a.records.maxWattage.date}` : ''}</div>
              </div>
            )}
            {a.records.biggestEventPoints && (
              <div className="bg-gradient-to-br from-orange-500/15 to-slate-700/40 rounded-lg p-4">
                <div className="flex items-center gap-2 text-orange-400 text-xs font-semibold mb-1"><Trophy className="h-3.5 w-3.5" /> BIGGEST EVENT HAUL</div>
                <div className="text-2xl font-extrabold text-white">{a.records.biggestEventPoints.points} pts</div>
                <div className="text-sm text-gray-300 mt-1"><MemberName name={a.records.biggestEventPoints.name} mecaId={a.records.biggestEventPoints.mecaId} /></div>
                <div className="text-xs text-gray-500">{a.records.biggestEventPoints.eventName}{a.records.biggestEventPoints.date ? ` · ${a.records.biggestEventPoints.date}` : ''}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* States footprint + upcoming events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {a.states.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-purple-400" /> Where We've Competed
            </h2>
            <div className="flex flex-wrap gap-2">
              {a.states.map(s => (
                <span key={s.state} className="bg-slate-700/60 text-gray-200 text-sm px-3 py-1.5 rounded-full">
                  {s.state} <span className="text-gray-500">· {s.events} event{s.events !== 1 ? 's' : ''}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        {a.upcomingEvents.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-green-400" /> Upcoming Events
            </h2>
            <div className="space-y-2">
              {a.upcomingEvents.map(e => (
                <div
                  key={e.id}
                  onClick={() => navigate(`/events/${e.id}`)}
                  className="flex items-center justify-between bg-slate-700/40 rounded-lg px-4 py-2.5 cursor-pointer hover:bg-slate-700 transition-colors"
                >
                  <div>
                    <div className="text-white text-sm font-medium">{e.name}</div>
                    <div className="text-xs text-gray-400">{e.date}{e.location ? ` · ${e.location}` : ''}</div>
                  </div>
                  <span className="text-sm text-green-400 font-medium whitespace-nowrap">
                    {e.membersRegistered} member{e.membersRegistered !== 1 ? 's' : ''} going
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
