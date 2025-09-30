import { Calendar, Trophy, Users, Award } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase, Event } from '../lib/supabase';

interface HomePageProps {
  onNavigate: (page: string, data?: any) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  const fetchUpcomingEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*, event_director:profiles!events_event_director_id_fkey(*)')
      .eq('status', 'upcoming')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(3);

    if (!error && data) {
      setUpcomingEvents(data);
    }
    setLoading(false);
  };

  const features = [
    {
      icon: Calendar,
      title: 'Event Calendar',
      description: 'Browse and register for upcoming car audio competitions across the country.',
    },
    {
      icon: Trophy,
      title: 'Competition Results',
      description: 'View detailed results from past events and track competitor performance.',
    },
    {
      icon: Award,
      title: 'Leaderboard Rankings',
      description: 'See who are the top competitors based on points earned throughout the season.',
    },
    {
      icon: Users,
      title: 'Membership Benefits',
      description: 'Join our community and get access to exclusive features and event discounts.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div
        className="relative bg-cover bg-center h-[600px] flex items-center justify-center"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1920)',
        }}
      >
        <div className="text-center text-white px-4">
          <img
            src="https://i0.wp.com/mecacaraudio.com/wp-content/uploads/2021/09/Meca_Logo_350v6.png?w=303&ssl=1"
            alt="MECA Car Audio"
            className="h-32 md:h-40 w-auto mx-auto mb-6"
          />
          <p className="text-xl md:text-2xl mb-8 text-gray-200">
            The Premier Platform for Car Audio Competition Management
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('events')}
              className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              View Events
            </button>
            <button
              onClick={() => onNavigate('signup')}
              className="px-8 py-4 bg-white hover:bg-gray-100 text-slate-900 font-semibold rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              Become a Member
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-slate-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2"
            >
              <feature.icon className="h-12 w-12 text-orange-500 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mb-16">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-white">Upcoming Events</h2>
            <button
              onClick={() => onNavigate('events')}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              View All Events
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-slate-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all transform hover:-translate-y-1 cursor-pointer"
                  onClick={() => onNavigate('event-detail', { eventId: event.id })}
                >
                  {event.flyer_url ? (
                    <img
                      src={event.flyer_url}
                      alt={event.title}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-r from-orange-600 to-red-600 flex items-center justify-center">
                      <Calendar className="h-16 w-16 text-white opacity-50" />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {event.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">
                      {new Date(event.event_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-gray-300 mb-4">{event.venue_name}</p>
                    <button className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-800 rounded-xl">
              <Calendar className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No upcoming events at this time.</p>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Compete?</h2>
          <p className="text-xl mb-8">
            Join thousands of car audio enthusiasts and showcase your skills
          </p>
          <button
            onClick={() => onNavigate('signup')}
            className="px-8 py-4 bg-white text-orange-600 font-semibold rounded-lg text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
          >
            Get Started Today
          </button>
        </div>
      </div>
    </div>
  );
}
