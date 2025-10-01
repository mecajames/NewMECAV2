import { Menu, X, User, Calendar, Trophy, LogOut, LayoutDashboard, BookOpen, Award, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Rulebook } from '../lib/supabase';

interface NavbarProps {
  onNavigate: (page: string, data?: any) => void;
  currentPage: string;
}

export default function Navbar({ onNavigate, currentPage }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rulebooksMenuOpen, setRulebooksMenuOpen] = useState(false);
  const [activeRulebooks, setActiveRulebooks] = useState<Rulebook[]>([]);
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    fetchActiveRulebooks();
  }, []);

  const fetchActiveRulebooks = async () => {
    const { data } = await supabase
      .from('rulebooks')
      .select('*')
      .eq('status', 'active')
      .order('category')
      .order('season', { ascending: false });

    if (data) {
      setActiveRulebooks(data);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onNavigate('home');
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: null },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'results', label: 'Results', icon: Trophy },
    { id: 'standings', label: 'Standings', icon: Award },
    { id: 'leaderboard', label: 'Top 10', icon: Trophy },
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
            className="flex items-center cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            <img
              src="/meca-logo-transparent.png"
              alt="MECA - Mobile Electronics Competition Association"
              className="h-12 w-auto"
            />
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.label}
              </button>
            ))}

            <div className="relative"
              onMouseEnter={() => setRulebooksMenuOpen(true)}
              onMouseLeave={() => setRulebooksMenuOpen(false)}
            >
              <button
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
                      onNavigate('rulebooks');
                      setRulebooksMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    All Rulebooks
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('rulebook-archive');
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
                            onNavigate('rulebook-detail', { rulebookId: rulebook.id });
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
              <div className="flex items-center gap-4">
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === 'dashboard'
                      ? 'bg-orange-600 text-white'
                      : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => onNavigate('login')}
                  className="px-4 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onNavigate('signup')}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-orange-600 hover:bg-orange-700 transition-colors"
                >
                  Sign Up
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
                  onNavigate(item.id);
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

            {user ? (
              <>
                <button
                  onClick={() => {
                    onNavigate('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-base font-medium ${
                    currentPage === 'dashboard'
                      ? 'bg-orange-600 text-white'
                      : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Dashboard
                </button>
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
                    onNavigate('login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-slate-700 hover:text-white"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    onNavigate('signup');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-md text-base font-medium bg-orange-600 hover:bg-orange-700"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
