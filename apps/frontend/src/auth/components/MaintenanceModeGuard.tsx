import { useState, useEffect, ReactNode } from 'react';
import { Wrench, AlertTriangle, Rocket } from 'lucide-react';
import axios from '@/lib/axios';
import { useAuth } from '../contexts/AuthContext';

// Routes that must remain accessible during maintenance mode so admins can log in
const MAINTENANCE_EXEMPT_PATHS = ['/login', '/auth/callback', '/change-password'];

interface MaintenanceModeGuardProps {
  children: ReactNode;
}

interface MaintenanceSettings {
  enabled: boolean;
  message: string;
  displayMode: 'maintenance' | 'coming_soon';
}

export default function MaintenanceModeGuard({ children }: MaintenanceModeGuardProps) {
  const { profile, loading: authLoading } = useAuth();
  // Capture the initial pathname on mount so re-renders don't lose the exempt check
  const [initialPath] = useState(() => window.location.pathname);
  const [maintenanceSettings, setMaintenanceSettings] = useState<MaintenanceSettings>({
    enabled: false,
    message: '',
    displayMode: 'maintenance',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        const { data: settings } = await axios.get('/api/site-settings', { _background: true } as any);
        const settingsMap: Record<string, string> = {};
        settings.forEach(s => {
          settingsMap[s.setting_key] = s.setting_value;
        });

        setMaintenanceSettings({
          enabled: settingsMap['maintenance_mode_enabled'] === 'true',
          message: settingsMap['maintenance_mode_message'] || '',
          displayMode: (settingsMap['maintenance_mode_display'] as any) || 'maintenance',
        });
      } catch (error) {
        console.error('Error checking maintenance mode:', error);
        // On error, assume not in maintenance mode to avoid blocking users
        setMaintenanceSettings({ enabled: false, message: '', displayMode: 'maintenance' });
      } finally {
        setLoading(false);
      }
    };

    checkMaintenanceMode();

    // Re-check maintenance mode every 5 minutes
    const interval = setInterval(checkMaintenanceMode, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Show loading spinner while checking
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  // Check if maintenance mode is enabled and user is not an admin
  const isAdmin = profile?.role === 'admin' || profile?.is_staff === true;
  const isExemptPath = MAINTENANCE_EXEMPT_PATHS.some(p => initialPath.startsWith(p));
  const showMaintenancePage = maintenanceSettings.enabled && !isAdmin && !isExemptPath;

  if (showMaintenancePage) {
    const isComingSoon = maintenanceSettings.displayMode === 'coming_soon';
    const defaultMessage = isComingSoon
      ? 'We are building something amazing! Our new website is under construction and will be launching soon.'
      : 'The system is currently undergoing scheduled maintenance. Please check back later.';
    const displayMessage = maintenanceSettings.message || defaultMessage;

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              {isComingSoon ? (
                <div className="w-32 h-32 bg-blue-600/20 rounded-full flex items-center justify-center">
                  <Rocket className="h-16 w-16 text-blue-400 animate-bounce" />
                </div>
              ) : (
                <>
                  <div className="w-32 h-32 bg-orange-600/20 rounded-full flex items-center justify-center">
                    <Wrench className="h-16 w-16 text-orange-500 animate-pulse" />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-2">
                    <AlertTriangle className="h-6 w-6 text-black" />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Card */}
          <div className={`bg-slate-800 rounded-2xl p-8 shadow-2xl border ${isComingSoon ? 'border-blue-500/30' : 'border-slate-700'}`}>
            <h1 className="text-3xl font-bold text-white text-center mb-4">
              {isComingSoon ? 'New Website Coming Soon!' : 'System Maintenance'}
            </h1>

            <div className={`rounded-lg p-4 mb-6 ${isComingSoon ? 'bg-blue-900/30 border border-blue-500/40' : 'bg-orange-900/30 border border-orange-600'}`}>
              <p className={`text-center ${isComingSoon ? 'text-blue-200' : 'text-orange-200'}`}>
                {displayMessage}
              </p>
            </div>

            <div className="space-y-4 text-gray-400 text-sm">
              <p className="text-center">
                {isComingSoon
                  ? 'Stay tuned for an exciting new experience. We can\'t wait to show you what we\'ve been working on!'
                  : 'We apologize for any inconvenience. Our team is working hard to improve your experience.'}
              </p>

              <div className="border-t border-slate-700 pt-4">
                <p className="text-center text-xs">
                  If you need immediate assistance, please contact us at{' '}
                  <a
                    href="mailto:support@mecacaraudio.com"
                    className={`hover:opacity-80 ${isComingSoon ? 'text-blue-400' : 'text-orange-400'}`}
                  >
                    support@mecacaraudio.com
                  </a>
                </p>
              </div>
            </div>

            {/* MECA Logo/Branding */}
            <div className="mt-8 pt-6 border-t border-slate-700">
              <p className="text-center text-gray-500 text-sm">
                MECA - Mobile Electronics Competition Association
              </p>
            </div>
          </div>

          {/* Admin Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Administrator?{' '}
              <a
                href="/login"
                className={`underline ${isComingSoon ? 'text-blue-400 hover:text-blue-300' : 'text-orange-400 hover:text-orange-300'}`}
              >
                Login here
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show admin banner if in maintenance mode but user is admin
  if (maintenanceSettings.enabled && isAdmin) {
    return (
      <>
        <div className="bg-orange-600 text-white text-center py-2 px-4 text-sm font-medium sticky top-0 z-50 flex items-center justify-center gap-2">
          <Wrench className="h-4 w-4" />
          <span>MAINTENANCE MODE ACTIVE - Only administrators can access the site</span>
        </div>
        {children}
      </>
    );
  }

  // Normal operation - render children
  return <>{children}</>;
}
