import { Calendar, Trophy, Users, Award } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsApi, Event } from '../api-client/events.api-client';
import { siteSettingsApi, SiteSetting } from '../api-client/site-settings.api-client';

export default function HomePage() {
  const navigate = useNavigate();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [heroSettings, setHeroSettings] = useState({
    image_urls: ['https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1920'],
    title: 'MECACARAUDIO.COM',
    subtitle: 'The Premier Platform for Car Audio Competition Management',
    button_text: 'View Events',
    carousel_speed: 5000,
    carousel_direction: 'left' as 'left' | 'right' | 'top' | 'bottom',
  });

  useEffect(() => {
    fetchUpcomingEvents();
    fetchHeroSettings();
  }, []);

  useEffect(() => {
    if (heroSettings.image_urls.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroSettings.image_urls.length);
    }, heroSettings.carousel_speed);

    return () => clearInterval(interval);
  }, [heroSettings.image_urls.length, heroSettings.carousel_speed]);

  const fetchHeroSettings = async () => {
    try {
      const data = await siteSettingsApi.getAll();

      // Filter for hero settings
      const heroKeys = ['hero_image_urls', 'hero_title', 'hero_subtitle', 'hero_button_text', 'hero_carousel_speed', 'hero_carousel_direction'];
      const heroData = data.filter((setting: SiteSetting) => heroKeys.includes(setting.setting_key));

      if (heroData && heroData.length > 0) {
        const settings: any = {};
        heroData.forEach((setting: SiteSetting) => {
          settings[setting.setting_key] = setting.setting_value;
        });

        // Parse hero_image_urls as JSON array
        let imageUrls: string[] = heroSettings.image_urls;
        try {
          const urlsValue = settings['hero_image_urls'] || '[]';
          imageUrls = JSON.parse(urlsValue);
          if (!Array.isArray(imageUrls)) {
            imageUrls = [urlsValue];
          }
        } catch {
          imageUrls = settings['hero_image_urls'] ? [settings['hero_image_urls']] : heroSettings.image_urls;
        }

        setHeroSettings({
          image_urls: imageUrls.length > 0 ? imageUrls : heroSettings.image_urls,
          title: settings['hero_title'] || heroSettings.title,
          subtitle: settings['hero_subtitle'] || heroSettings.subtitle,
          button_text: settings['hero_button_text'] || heroSettings.button_text,
          carousel_speed: parseInt(settings['hero_carousel_speed'] || '5000'),
          carousel_direction: settings['hero_carousel_direction'] || 'left',
        });
      }
    } catch (error) {
      console.error('Error fetching hero settings:', error);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const data = await eventsApi.getAll(1, 1000);

      // Filter for upcoming events
      const now = new Date().toISOString();
      const upcoming = data
        .filter(e => e.status === 'upcoming' && e.event_date >= now)
        .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
        .slice(0, 3);

      setUpcomingEvents(upcoming);
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
    }
    setLoading(false);
  };

  const features = [
    {
      icon: Calendar,
      title: 'Event Calendar',
      description: 'Browse and register for upcoming car audio competitions across the country.',
      page: 'events',
    },
    {
      icon: Trophy,
      title: 'Competition Results',
      description: 'View detailed results from past events and track competitor performance.',
      page: 'results',
    },
    {
      icon: Award,
      title: 'Leaderboard Rankings',
      description: 'See who are the top competitors based on points earned throughout the season.',
      page: 'leaderboard',
    },
    {
      icon: Users,
      title: 'Membership Benefits',
      description: 'Join our community and get access to exclusive features and event discounts.',
      page: 'membership',
    },
  ];

  const getSlideAnimation = () => {
    switch (heroSettings.carousel_direction) {
      case 'left':
        return 'animate-slide-left';
      case 'right':
        return 'animate-slide-right';
      case 'top':
        return 'animate-slide-top';
      case 'bottom':
        return 'animate-slide-bottom';
      default:
        return 'animate-slide-left';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="relative h-[600px] flex items-center justify-center overflow-hidden">
        {/* Carousel Images */}
        {heroSettings.image_urls.map((url, index) => (
          <div
            key={index}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              index === currentImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${url})`,
            }}
          />
        ))}

        {/* Content Overlay */}
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            {heroSettings.title}
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-200">
            {heroSettings.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/events')}
              className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              {heroSettings.button_text}
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-4 bg-white hover:bg-gray-100 text-slate-900 font-semibold rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              Become a Member
            </button>
          </div>
        </div>

        {/* Carousel Indicators */}
        {heroSettings.image_urls.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
            {heroSettings.image_urls.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentImageIndex
                    ? 'bg-orange-600 w-8'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {features.map((feature, index) => (
            <div
              key={index}
              onClick={() => navigate(`/${feature.page}`)}
              className="bg-slate-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 cursor-pointer"
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
              onClick={() => navigate('/events')}
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
                  onClick={() => navigate(`/events/${event.id}`)}
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
            onClick={() => navigate('/signup')}
            className="px-8 py-4 bg-white text-orange-600 font-semibold rounded-lg text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
          >
            Get Started Today
          </button>
        </div>
      </div>
    </div>
  );
}
