import { Menu, X, User, Calendar, Trophy, LogOut, LayoutDashboard, BookOpen, Award, ChevronDown, Bell, Users, ClipboardList, Shield, ShoppingBag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth';
import { rulebooksApi, Rulebook } from '@/rulebooks';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/notifications';
import { CartIcon } from '@/shop/components/CartIcon';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rulebooksMenuOpen, setRulebooksMenuOpen] = useState(false);
  const [membersMenuOpen, setMembersMenuOpen] = useState(false);
  const [resultsMenuOpen, setResultsMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeRulebooks, setActiveRulebooks] = useState<Rulebook[]>([]);
  const { user, profile, signOut } = useAuth();

  // Use API hooks instead of direct Supabase calls
  const { notifications, refetch: refetchNotifications } = useNotifications(user?.id);
  const { markAsRead } = useMarkAsRead();
  const { markAllAsRead } = useMarkAllAsRead();
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    fetchActiveRulebooks();
  }, [user]);

  const fetchActiveRulebooks = async () => {
    try {
      const data = await rulebooksApi.getActiveRulebooks();
      setActiveRulebooks(data);
    } catch (error) {
      console.error('Failed to fetch rulebooks:', error);
      setActiveRulebooks([]);
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    if (!user) return;
    await markAsRead(notificationId, user.id);
    refetchNotifications();
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!user) return;
    await markAllAsRead(user.id);
    refetchNotifications();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  };

  // Helper function to get the current page from the URL
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/events')) return 'events';
    if (path.startsWith('/results')) return 'results';
    if (path.startsWith('/standings')) return 'standings';
    if (path.startsWith('/leaderboard')) return 'leaderboard';
    if (path.startsWith('/rulebooks')) return 'rulebooks';
    if (path.startsWith('/members')) return 'members';
    if (path.startsWith('/teams')) return 'teams';
    if (path === '/shop' || path.startsWith('/shop/products')) return 'shop';
    if (path.startsWith('/shop/')) return 'cart'; // cart/checkout/orders - no nav highlight
    if (path.startsWith('/dashboard')) return 'dashboard';
    if (path.startsWith('/membership')) return 'membership';
    if (path.startsWith('/login')) return 'login';
    if (path.startsWith('/admin')) return 'admin';
    return 'home';
  };

  const currentPage = getCurrentPage();

  // Results and Members dropdowns are handled separately
  const navItems = [
    { id: 'home', label: 'Home', icon: null, path: '/' },
    { id: 'events', label: 'Events', icon: Calendar, path: '/events' },
    { id: 'shop', label: 'MECA Shop', icon: ShoppingBag, path: '/shop' },
  ];

  const groupedRulebooks = activeRulebooks.reduce((acc, rulebook) => {
    if (!acc[rulebook.category]) {
      acc[rulebook.category] = [];
    }
    acc[rulebook.category].push(rulebook);
    return acc;
  }, {} as Record<string, Rulebook[]>);

  return (
    <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div
            className="flex items-center cursor-pointer flex-shrink-0"
            onClick={() => navigate('/')}
          >
            <img
              src="/meca-logo-transparent.png"
              alt="MECA - Mobile Electronics Competition Association"
              className="h-12 w-auto"
            />
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  currentPage === item.id
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.label}
              </button>
            ))}

            {/* Results Dropdown */}
            <div className="relative"
              onMouseEnter={() => setResultsMenuOpen(true)}
              onMouseLeave={() => setResultsMenuOpen(false)}
            >
              <button
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  currentPage === 'results' || currentPage === 'standings' || currentPage === 'leaderboard'
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Trophy className="h-4 w-4" />
                Results
                <ChevronDown className="h-4 w-4" />
              </button>

              {resultsMenuOpen && (
                <div className="absolute top-full left-0 mt-0 pt-2 w-56">
                  <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2">
                    <button
                      onClick={() => {
                        navigate('/results');
                        setResultsMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap"
                    >
                      <Trophy className="h-4 w-4" />
                      Competition Results
                    </button>
                    <button
                      onClick={() => {
                        navigate('/standings');
                        setResultsMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap"
                    >
                      <Award className="h-4 w-4" />
                      Standings
                    </button>
                    <button
                      onClick={() => {
                        navigate('/leaderboard');
                        setResultsMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap"
                    >
                      <Trophy className="h-4 w-4" />
                      Top 10
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Members Dropdown */}
            <div className="relative"
              onMouseEnter={() => setMembersMenuOpen(true)}
              onMouseLeave={() => setMembersMenuOpen(false)}
            >
              <button
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  currentPage === 'members' || currentPage === 'teams'
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Users className="h-4 w-4" />
                Members
                <ChevronDown className="h-4 w-4" />
              </button>

              {membersMenuOpen && (
                <div className="absolute top-full left-0 mt-0 pt-2 w-56">
                  <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2">
                    <button
                      onClick={() => {
                        navigate('/members');
                        setMembersMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap"
                    >
                      <Users className="h-4 w-4" />
                      Members Directory
                    </button>
                    <button
                      onClick={() => {
                        navigate('/teams');
                        setMembersMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap"
                    >
                      <Shield className="h-4 w-4" />
                      Teams Directory
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Rulebooks Dropdown */}
            <div className="relative"
              onMouseEnter={() => setRulebooksMenuOpen(true)}
              onMouseLeave={() => setRulebooksMenuOpen(false)}
            >
              <button
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  currentPage === 'rulebooks' || currentPage.startsWith('rulebook-')
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Rulebooks
                <ChevronDown className="h-4 w-4" />
              </button>

              {rulebooksMenuOpen && (
                <div className="absolute top-full left-0 mt-0 pt-2 w-64">
                  <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2">
                  <button
                    onClick={() => {
                      navigate('/rulebooks');
                      setRulebooksMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    All Rulebooks
                  </button>
                  <button
                    onClick={() => {
                      navigate('/rulebooks/archive');
                      setRulebooksMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700 pb-2 mb-2"
                  >
                    Archive
                  </button>

                  {Object.entries(groupedRulebooks).map(([category, rulebooks]) => (
                    <div key={category} className="px-2">
                      <div className="text-xs font-semibold text-orange-500 px-2 py-1 uppercase tracking-wide">
                        {category}
                      </div>
                      {rulebooks.map((rulebook) => (
                        <button
                          key={rulebook.id}
                          onClick={() => {
                            navigate(`/rulebooks/${rulebook.id}`);
                            setRulebooksMenuOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                        >
                          {rulebook.season}
                        </button>
                      ))}
                    </div>
                  ))}

                  {activeRulebooks.length === 0 && (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      No active rulebooks
                    </div>
                  )}
                  </div>
                </div>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                {/* Cart Icon */}
                <CartIcon />

                <button
                  onClick={() => navigate('/dashboard')}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    currentPage === 'dashboard'
                      ? 'bg-orange-600 text-white'
                      : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </button>

                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    className="relative p-2 text-gray-300 hover:text-white transition-colors"
                    onMouseEnter={() => {
                      setNotificationsOpen(true);
                      refetchNotifications(); // Refresh notifications when opening dropdown
                    }}
                    onClick={() => {
                      setNotificationsOpen(!notificationsOpen);
                      if (!notificationsOpen) {
                        refetchNotifications();
                      }
                    }}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notificationsOpen && (
                    <>
                      {/* Invisible bridge to prevent dropdown from closing */}
                      <div className="absolute top-full right-0 h-2 w-full" />
                      <div
                        className="absolute top-full right-0 mt-2 w-80"
                        onMouseLeave={() => setNotificationsOpen(false)}
                      >
                      <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 max-h-96 overflow-y-auto">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
                          <h3 className="font-semibold text-white">Notifications</h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllNotificationsRead}
                              className="text-xs text-orange-500 hover:text-orange-400"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>

                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-gray-500">
                            No notifications
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <button
                              key={notification.id}
                              onClick={() => {
                                handleMarkNotificationRead(notification.id);
                                if (notification.link) {
                                  // If link is "dashboard", navigate to mymeca dashboard overview tab instead of letting it redirect
                                  const targetPath = notification.link === 'dashboard' ? '/dashboard/mymeca?tab=overview' : `/${notification.link}`;
                                  navigate(targetPath);
                                  setNotificationsOpen(false);
                                }
                              }}
                              className={`block w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0 ${
                                !notification.read ? 'bg-slate-750' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-medium text-white">
                                      {notification.title}
                                    </h4>
                                    {!notification.read && (
                                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {notification.message}
                                  </p>
                                  {notification.fromUser && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      From: {`${notification.fromUser.first_name || ''} ${notification.fromUser.last_name || ''}`.trim() || notification.fromUser.email}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(notification.createdAt).toLocaleDateString()} {new Date(notification.createdAt).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                      </div>
                    </>
                  )}
                </div>

                {/* User Menu */}
                <div className="relative"
                  onMouseEnter={() => setUserMenuOpen(true)}
                  onMouseLeave={() => setUserMenuOpen(false)}
                >
                  <button className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition-colors">
                    <User className="h-4 w-4" />
                    {profile?.first_name || profile?.email || 'Account'}
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute top-full right-0 mt-0 pt-2 w-48">
                      <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2">
                        <button
                          onClick={() => {
                            navigate('/dashboard/mymeca');
                            setUserMenuOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            My MECA
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            navigate('/my-registrations');
                            setUserMenuOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" />
                            My Registrations
                          </div>
                        </button>
                        {profile?.role === 'admin' && (
                          <button
                            onClick={() => {
                              navigate('/dashboard/admin');
                              setUserMenuOpen(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <LayoutDashboard className="h-4 w-4" />
                              Admin Dashboard
                            </div>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            navigate('/public-profile');
                            setUserMenuOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Public Profile
                          </div>
                        </button>
                        <div className="border-t border-slate-700 mt-2 pt-2">
                          <button
                            onClick={handleSignOut}
                            className="block w-full text-left px-4 py-2 text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <LogOut className="h-4 w-4" />
                              Sign Out
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                {/* Cart Icon for non-logged in users */}
                <CartIcon />
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/membership')}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-orange-600 hover:bg-orange-700 transition-colors"
                >
                  Join
                </button>
              </div>
            )}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-800">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-base font-medium ${
                  currentPage === item.id
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {item.icon && <item.icon className="h-5 w-5" />}
                {item.label}
              </button>
            ))}

            {/* Results Section */}
            <button
              onClick={() => {
                navigate('/results');
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-base font-medium ${
                currentPage === 'results'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Trophy className="h-5 w-5" />
              Competition Results
            </button>
            <button
              onClick={() => {
                navigate('/standings');
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-base font-medium ${
                currentPage === 'standings'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Award className="h-5 w-5" />
              Standings
            </button>
            <button
              onClick={() => {
                navigate('/leaderboard');
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-base font-medium ${
                currentPage === 'leaderboard'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Trophy className="h-5 w-5" />
              Top 10
            </button>

            {/* Members Directory */}
            <button
              onClick={() => {
                navigate('/members');
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-base font-medium ${
                currentPage === 'members'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Users className="h-5 w-5" />
              Members Directory
            </button>

            {/* Teams Directory */}
            <button
              onClick={() => {
                navigate('/teams');
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-base font-medium ${
                currentPage === 'teams'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Shield className="h-5 w-5" />
              Teams Directory
            </button>

            {user ? (
              <>
                <button
                  onClick={() => {
                    navigate('/dashboard/mymeca');
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-base font-medium ${
                    currentPage === 'dashboard'
                      ? 'bg-orange-600 text-white'
                      : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <User className="h-5 w-5" />
                  My MECA
                </button>
                <button
                  onClick={() => {
                    navigate('/my-registrations');
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-slate-700 hover:text-white"
                >
                  <ClipboardList className="h-5 w-5" />
                  My Registrations
                </button>
                {profile?.role === 'admin' && (
                  <button
                    onClick={() => {
                      navigate('/dashboard/admin');
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-slate-700 hover:text-white"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    Admin Dashboard
                  </button>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-slate-700 hover:text-white"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    navigate('/login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-slate-700 hover:text-white"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    navigate('/membership');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-md text-base font-medium bg-orange-600 hover:bg-orange-700"
                >
                  Join
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
