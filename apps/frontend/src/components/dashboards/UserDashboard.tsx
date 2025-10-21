import { useEffect, useState } from 'react';
import { User, Calendar, Trophy, Award, CreditCard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, EventRegistration, CompetitionResult } from '../../lib/supabase';

interface UserDashboardProps {
  onNavigate: (page: string, data?: any) => void;
}

export default function UserDashboard({ onNavigate }: UserDashboardProps) {
  const { profile } = useAuth();
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalPoints: 0,
    bestPlacement: null as number | null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchUserData();
    }
  }, [profile]);

  const fetchUserData = async () => {
    const [regData, resultsData] = await Promise.all([
      supabase
        .from('event_registrations')
        .select('*, event:events(*)')
        .eq('user_id', profile!.id)
        .order('registration_date', { ascending: false }),
      supabase
        .from('competition_results')
        .select('*, event:events(*)')
        .eq('competitor_id', profile!.id)
        .order('created_at', { ascending: false }),
    ]);

    if (regData.data) setRegistrations(regData.data);
    if (resultsData.data) {
      setResults(resultsData.data);

      const totalPoints = resultsData.data.reduce(
        (sum, r) => sum + r.points_earned,
        0
      );
      const bestPlacement =
        resultsData.data.length > 0
          ? Math.min(...resultsData.data.map((r) => r.placement))
          : null;

      setStats({
        totalEvents: resultsData.data.length,
        totalPoints,
        bestPlacement,
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My MECA</h1>
          <p className="text-gray-400">Welcome back, {profile?.full_name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <User className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Membership</p>
                <p className="text-white font-semibold capitalize">
                  {profile?.membership_status}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Events</p>
                <p className="text-white font-semibold text-2xl">{stats.totalEvents}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Points</p>
                <p className="text-white font-semibold text-2xl">{stats.totalPoints}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Best Place</p>
                <p className="text-white font-semibold text-2xl">
                  {stats.bestPlacement ? `#${stats.bestPlacement}` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {profile?.membership_status === 'none' && (
          <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl p-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Become a Member Today
                </h3>
                <p className="text-white/90">
                  Get access to exclusive features, event discounts, and more
                </p>
              </div>
              <button className="px-6 py-3 bg-white text-orange-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Purchase Membership
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-orange-500" />
              My Event Registrations
            </h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
              </div>
            ) : registrations.length > 0 ? (
              <div className="space-y-4">
                {registrations.slice(0, 5).map((reg) => (
                  <div
                    key={reg.id}
                    className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors cursor-pointer"
                    onClick={() =>
                      reg.event && onNavigate('event-detail', { eventId: reg.event.id })
                    }
                  >
                    <h4 className="font-semibold text-white mb-2">
                      {reg.event?.title}
                    </h4>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">
                        {reg.event &&
                          new Date(reg.event.event_date).toLocaleDateString()}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          reg.status === 'confirmed'
                            ? 'bg-green-500/10 text-green-400'
                            : reg.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {reg.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No event registrations yet</p>
                <button
                  onClick={() => onNavigate('events')}
                  className="mt-4 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Browse Events
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Trophy className="h-6 w-6 text-orange-500" />
              My Competition Results
            </h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-4">
                {results.slice(0, 5).map((result) => (
                  <div
                    key={result.id}
                    className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-white">
                        {result.event?.title}
                      </h4>
                      <span className="text-2xl font-bold text-orange-500">
                        #{result.placement}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>{result.competition_class}</span>
                      <span className="flex items-center gap-1 text-orange-400 font-semibold">
                        <Award className="h-4 w-4" />
                        {result.points_earned} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No competition results yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
