import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Trophy, Plus, QrCode } from 'lucide-react';
import { useAuth } from '@/auth';
import { supabase, Event } from '@/lib/supabase';

interface EventDirectorDashboardProps {
  onNavigate: (page: string, data?: any) => void;
}

export default function EventDirectorDashboard({ onNavigate }: EventDirectorDashboardProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    totalRegistrations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchEventDirectorData();
    }
  }, [profile]);

  const fetchEventDirectorData = async () => {
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('event_director_id', profile!.id)
      .order('event_date', { ascending: false });

    if (events) {
      setMyEvents(events);

      const upcoming = events.filter((e) => e.status === 'upcoming').length;

      let totalRegs = 0;
      for (const event of events) {
        const { count } = await supabase
          .from('event_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', event.id);
        totalRegs += count || 0;
      }

      setStats({
        totalEvents: events.length,
        upcomingEvents: upcoming,
        totalRegistrations: totalRegs,
      });
    }

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-500/10 text-blue-400';
      case 'ongoing':
        return 'bg-green-500/10 text-green-400';
      case 'completed':
        return 'bg-gray-500/10 text-gray-400';
      case 'cancelled':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Event Director Dashboard</h1>
          <p className="text-gray-400">Manage your competition events and results</p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">My Events</p>
                    <p className="text-white font-semibold text-2xl">{stats.totalEvents}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Upcoming</p>
                    <p className="text-white font-semibold text-2xl">
                      {stats.upcomingEvents}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Total Registrations</p>
                    <p className="text-white font-semibold text-2xl">
                      {stats.totalRegistrations}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button className="bg-slate-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-left">
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                    <Plus className="h-6 w-6 text-orange-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Create New Event</h3>
                  <p className="text-gray-400 text-sm">
                    Set up a new competition event
                  </p>
                </button>

                <button className="bg-slate-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-left">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Enter Results</h3>
                  <p className="text-gray-400 text-sm">
                    Add competition results for your events
                  </p>
                </button>

                <button
                  onClick={() => {
                    const activeEvent = myEvents.find(e => e.status === 'ongoing' || e.status === 'upcoming');
                    if (activeEvent) {
                      navigate(`/events/${activeEvent.id}/check-in`);
                    }
                  }}
                  disabled={!myEvents.some(e => e.status === 'ongoing' || e.status === 'upcoming')}
                  className="bg-slate-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
                >
                  <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4">
                    <QrCode className="h-6 w-6 text-cyan-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">QR Check-In</h3>
                  <p className="text-gray-400 text-sm">
                    Scan competitor QR codes at your event
                  </p>
                </button>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">My Events</h2>
              </div>

              {myEvents.length > 0 ? (
                <div className="space-y-4">
                  {myEvents.map((event) => (
                    <div
                      key={event.id}
                      className="bg-slate-700 rounded-lg p-6 hover:bg-slate-600 transition-colors cursor-pointer"
                      onClick={() => onNavigate('event-detail', { eventId: event.id })}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-2">
                            {event.title}
                          </h3>
                          <p className="text-gray-400">
                            {new Date(event.event_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {(event.status === 'upcoming' || event.status === 'ongoing') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/events/${event.id}/check-in`);
                              }}
                              className="flex items-center gap-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold rounded-full transition-colors"
                            >
                              <QrCode className="h-3 w-3" />
                              Check-In
                            </button>
                          )}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                              event.status
                            )}`}
                          >
                            {event.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {event.venue_name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No events created yet</p>
                  <button className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors">
                    Create Your First Event
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
