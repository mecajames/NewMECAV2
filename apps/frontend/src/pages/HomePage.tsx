import { Calendar, Trophy, Users, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsApi, Event } from '../api-client/events.api-client';
import { siteSettingsApi, SiteSetting } from '../api-client/site-settings.api-client';

export default function HomePage() {
  const navigate = useNavigate();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentEventSlide, setCurrentEventSlide] = useState(0);
  const [heroSettings, setHeroSettings] = useState({
    image_urls: ['https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1920'],
    title: 'MECACARAUDIO.COM',
    subtitle: 'The Premier Platform for Car Audio Competition Management',
    button_text: 'View Events',
    carousel_speed: 5000,
    carousel_direction: 'left' as 'left' | 'right' | 'top' | 'bottom',
  });

  const [youtubeVideos, setYoutubeVideos] = useState({
    active: false,
    videos: [
      { url: '', title: '' },
      { url: '', title: '' },
      { url: '', title: '' },
      { url: '', title: '' },
    ],
  });

  useEffect(() => {
    fetchUpcomingEvents();
    fetchHeroSettings();
    fetchYoutubeSettings();
  }, []);

  useEffect(() => {
    if (heroSettings.image_urls.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroSettings.image_urls.length);
    }, heroSettings.carousel_speed);

    return () => clearInterval(interval);
  }, [heroSettings.image_urls.length, heroSettings.carousel_speed]);

  // Auto-slide events carousel every 5 seconds
  useEffect(() => {
    if (upcomingEvents.length <= 3) return;

    const interval = setInterval(() => {
      setCurrentEventSlide((prev) => (prev + 1) % Math.ceil(upcomingEvents.length / 3));
    }, 5000);

    return () => clearInterval(interval);
  }, [upcomingEvents.length]);

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

  const fetchYoutubeSettings = async () => {
    try {
      const data = await siteSettingsApi.getAll();

      // Filter for YouTube settings
      const youtubeKeys = [
        'youtube_section_active',
        'youtube_video_1_url', 'youtube_video_1_title',
        'youtube_video_2_url', 'youtube_video_2_title',
        'youtube_video_3_url', 'youtube_video_3_title',
        'youtube_video_4_url', 'youtube_video_4_title'
      ];
      const youtubeData = data.filter((setting: SiteSetting) => youtubeKeys.includes(setting.setting_key));

      if (youtubeData && youtubeData.length > 0) {
        const settings: any = {};
        youtubeData.forEach((setting: SiteSetting) => {
          settings[setting.setting_key] = setting.setting_value;
        });

        setYoutubeVideos({
          active: settings['youtube_section_active'] === 'true',
          videos: [
            {
              url: settings['youtube_video_1_url'] || '',
              title: settings['youtube_video_1_title'] || '',
            },
            {
              url: settings['youtube_video_2_url'] || '',
              title: settings['youtube_video_2_title'] || '',
            },
            {
              url: settings['youtube_video_3_url'] || '',
              title: settings['youtube_video_3_title'] || '',
            },
            {
              url: settings['youtube_video_4_url'] || '',
              title: settings['youtube_video_4_title'] || '',
            },
          ].filter(video => video.url), // Only include videos with URLs
        });
      }
    } catch (error) {
      console.error('Error fetching YouTube settings:', error);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const data = await eventsApi.getAll(1, 1000);

      // Filter for upcoming events (not completed)
      const now = new Date().toISOString();
      const upcoming = data
        .filter(e => e.status !== 'completed' && e.event_date >= now)
        .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
        .slice(0, 12); // Get up to 12 events for carousel rotation

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

  const nextEventSlide = () => {
    setCurrentEventSlide((prev) => (prev + 1) % Math.ceil(upcomingEvents.length / 3));
  };

  const prevEventSlide = () => {
    setCurrentEventSlide((prev) =>
      prev === 0 ? Math.ceil(upcomingEvents.length / 3) - 1 : prev - 1
    );
  };

  const getCurrentEvents = () => {
    const startIndex = currentEventSlide * 3;
    return upcomingEvents.slice(startIndex, startIndex + 3);
  };

  const totalSlides = Math.ceil(upcomingEvents.length / 3);

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
            <div className="relative">
              {/* Carousel Container */}
              <div className="overflow-hidden">
                <div
                  className="transition-transform duration-500 ease-in-out"
                  style={{
                    transform: `translateX(-${currentEventSlide * 100}%)`,
                    display: 'flex',
                  }}
                >
                  {Array.from({ length: totalSlides }).map((_, slideIndex) => (
                    <div
                      key={slideIndex}
                      className="flex-shrink-0 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                      {upcomingEvents.slice(slideIndex * 3, slideIndex * 3 + 3).map((event) => (
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
                            <p className="text-gray-400 text-sm mb-2">
                              {new Date(event.event_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                            <p className="text-gray-300 mb-3">{event.venue_name}</p>

                            {/* Multiplier Badge - First Line */}
                            {event.points_multiplier !== undefined && event.points_multiplier !== null && (
                              <div className="flex flex-wrap gap-2 mb-2">
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-500/10 text-orange-400 border border-orange-500">
                                  {event.points_multiplier}X Points Event
                                </span>
                              </div>
                            )}

                            {/* Format Badges - Second Line */}
                            {event.formats && event.formats.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {event.formats.map((format) => (
                                  <span
                                    key={format}
                                    className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500"
                                  >
                                    {format}
                                  </span>
                                ))}
                              </div>
                            )}

                            <button className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors">
                              View Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Arrows - Only show if more than 3 events */}
              {upcomingEvents.length > 3 && (
                <>
                  <button
                    onClick={prevEventSlide}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-full shadow-lg transition-all transform hover:scale-110 z-10"
                    aria-label="Previous events"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextEventSlide}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-full shadow-lg transition-all transform hover:scale-110 z-10"
                    aria-label="Next events"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>

                  {/* Carousel Indicators */}
                  <div className="flex justify-center gap-2 mt-6">
                    {Array.from({ length: totalSlides }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentEventSlide(index)}
                        className={`h-2 rounded-full transition-all ${
                          index === currentEventSlide
                            ? 'bg-orange-600 w-8'
                            : 'bg-gray-600 w-2 hover:bg-gray-500'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-800 rounded-xl">
              <Calendar className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No upcoming events at this time.</p>
            </div>
          )}
        </div>

        {/* MECA Information Section */}
        <div className="mb-16 bg-slate-800 rounded-2xl p-8 md:p-12">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-8 text-center">
              MECA Car Audio Competitions
            </h2>

            <div className="prose prose-invert max-w-none">
              <div className="text-gray-300 space-y-6 leading-relaxed">
                <p>
                  <strong className="text-white">Car Audio Competitions.</strong><br />
                  MECA is the abbreviation for Mobile Electronics Competition Association, which is a club and contest organization that has been promoting car audio competitions for over 25+ years. MECA leads the industry to promote car shows and events with music, fair and fun contests for people who love loud and clear audio in their cars and trucks.
                </p>

                <h3 className="text-2xl font-bold text-white mt-8 mb-4">
                  Sound Pressure League Competitions
                </h3>
                <p>
                  Contests are designed for all levels of competition, from the beginner to advanced professionals.
                </p>
                <p>
                  Sound Pressure League contests are not solely dependent on how much money you've spent and what brand equipment you run in your vehicle. The classifications are based on design complexity, vehicle type, and potential to make "bass" that is fair and fun for our members.
                </p>
                <p>
                  Sound Pressure format uses the clamp meter to measure true power output, combined with woofer cone surface area, the "Pressure Class Formula", is how the classes are bracketed in each Division. If you're still asking yourself, "Should I compete?" the answer should be a resounding YES! our rules afford everyone a fair chance.
                </p>
                <p>
                  The{' '}
                  <button
                    onClick={() => navigate('/rulebooks')}
                    className="text-orange-400 hover:text-orange-300 underline font-semibold"
                  >
                    MECA SPL Rule Book
                  </button>
                  {' '}includes a Quick-Reference guide, as well as{' '}
                  <button
                    onClick={() => navigate('/class-calculator')}
                    className="text-orange-400 hover:text-orange-300 underline font-semibold"
                  >
                    Class Calculators
                  </button>
                  {' '}which can help you to determine your class.
                </p>
                <p>
                  We offer MECA Kids, which is our bass music contest using power wheels toys with our MECA Kids operating their audio systems.
                </p>
                <p>
                  We also offer 2 additional formats which is our Park and Pound and Dueling Demos competitions and as of the start of the 2022 season we had overhauled the Dueling Demos format and have now added a new score sheet which makes this a more competitive format.
                </p>

                <h3 className="text-2xl font-bold text-white mt-8 mb-4">
                  Sound Quality League Competitions
                </h3>
                <p>
                  Competing in MECA's Sound Quality League is all about sound quality and excellence of installation. It's not about product, personalities, or politics. It's about performance. Live, rich, full-balanced sound is what we listen for. Safety and outstanding appearance are what we look for, displaying the talents and skills of our Members, and our Retail Members who provide professional installation services.
                </p>
                <p>
                  The SQ League offers several formats including, Install, RTA, Sound Quality, Ride the Light and Show and Shine.
                </p>
                <p>
                  All the above formats for both SPL and SQL are offered for Cars, Trucks and Motorcycles.
                </p>
                <p>
                  Thanks to our Competitors, Judges, Retail Members, Manufacturer Members and Fans for all the support and participation that brings us together.
                </p>
                <p>
                  Everyone is invited to participate in our club and contest activities. MECA State Champion credentials earn bragging rights, and our World Champions are recognized among the most accomplished competitors in organized car audio sports around the world.
                </p>

                <h3 className="text-2xl font-bold text-white mt-8 mb-4">
                  Car Audio Competitions Near Me?
                </h3>
                <p>
                  This is probably the number one question we get asked, "when will there be a MECA car audio event near me" The simple answer is we will have them anywhere, anytime, we just need the locations to have the competition events and this is where you come in, if you are a shop looking to host a show, you can submit the online submission form,{' '}
                  <button
                    onClick={() => navigate('/host-event')}
                    className="text-orange-400 hover:text-orange-300 underline font-semibold"
                  >
                    "Wanna Host a MECA Event"
                  </button>
                  {' '}or if you are a competitor and know of a shop or a location to host an event let us know, provide their contact information and we can do the rest, just fill out the{' '}
                  <button
                    onClick={() => navigate('/contact')}
                    className="text-orange-400 hover:text-orange-300 underline font-semibold"
                  >
                    Contact us
                  </button>
                  {' '}form with their details. Keep in mind that SPL competitions need a location that can accommodate high volumes of bass and sound pressure.
                </p>
                <p>
                  We also suggest keeping an eye on the{' '}
                  <button
                    onClick={() => navigate('/events')}
                    className="text-orange-400 hover:text-orange-300 underline font-semibold"
                  >
                    MECA events calendar
                  </button>
                  {' '}as we update the calendar often and typically hold 100 to 150+ events per season and we are still growing!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Section */}
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

        {/* YouTube Videos Section */}
        {youtubeVideos.active && youtubeVideos.videos.length > 0 && (
          <div className="mb-20">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold text-white mb-4">Latest from MECA</h2>
              <p className="text-gray-300 text-lg">
                Check out our latest videos and event highlights
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {youtubeVideos.videos.map((video, index) => (
                <div key={index} className="bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2">
                  <div className="relative aspect-video">
                    <iframe
                      src={video.url}
                      title={video.title || `MECA Video ${index + 1}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                  {video.title && (
                    <div className="p-4">
                      <h3 className="text-white font-semibold text-sm line-clamp-2">
                        {video.title}
                      </h3>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Are you ready to be a MECA World Champion?</h2>
          <p className="text-xl mb-8">
            Join thousands of car audio enthusiasts and showcase your skills
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="px-8 py-4 bg-white text-orange-600 font-semibold rounded-lg text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
          >
            Start Your Journey Today!
          </button>
        </div>
      </div>
    </div>
  );
}
