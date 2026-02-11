import { useState, useEffect, ReactNode } from 'react';
import { Wrench, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { siteSettingsApi } from '@/site-settings';

interface MaintenanceModeGuardProps {
  children: ReactNode;
}

interface MaintenanceSettings {
  enabled: boolean;
  message: string;
}

export default function MaintenanceModeGuard({ children }: MaintenanceModeGuardProps) {
  const { profile, loading: authLoading } = useAuth();
  const [maintenanceSettings, setMaintenanceSettings] = useState<MaintenanceSettings>({
    enabled: false,
    message: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        const settings = await siteSettingsApi.getAll();
        const settingsMap: Record<string, string> = {};
        settings.forEach(s => {
          settingsMap[s.setting_key] = s.setting_value;
        });

        setMaintenanceSettings({
          enabled: settingsMap['maintenance_mode_enabled'] === 'true',
          message: settingsMap['maintenance_mode_message'] ||
            'The system is currently undergoing scheduled maintenance. Please check back later.',
        });
      } catch (error) {
        console.error('Error checking maintenance mode:', error);
        // On error, assume not in maintenance mode to avoid blocking users
        setMaintenanceSettings({ enabled: false, message: '' });
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
  const isAdmin = profile?.role === 'admin';
  const showMaintenancePage = maintenanceSettings.enabled && !isAdmin;

  if (showMaintenancePage) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          {/* Maintenance Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-32 h-32 bg-orange-600/20 rounded-full flex items-center justify-center">
                <Wrench className="h-16 w-16 text-orange-500 animate-pulse" />
              </div>
              <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-2">
                <AlertTriangle className="h-6 w-6 text-black" />
              </div>
            </div>
          </div>

          {/* Maintenance Card */}
          <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
            <h1 className="text-3xl font-bold text-white text-center mb-4">
              System Maintenance
            </h1>

            <div className="bg-orange-900/30 border border-orange-600 rounded-lg p-4 mb-6">
              <p className="text-orange-200 text-center">
                {maintenanceSettings.message}
              </p>
            </div>

            <div className="space-y-4 text-gray-400 text-sm">
              <p className="text-center">
                We apologize for any inconvenience. Our team is working hard to improve your experience.
              </p>

              <div className="border-t border-slate-700 pt-4">
                <p className="text-center text-xs">
                  If you need immediate assistance, please contact us at{' '}
                  <a
                    href="mailto:support@mecacaraudio.com"
                    className="text-orange-400 hover:text-orange-300"
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
                className="text-orange-400 hover:text-orange-300 underline"
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
