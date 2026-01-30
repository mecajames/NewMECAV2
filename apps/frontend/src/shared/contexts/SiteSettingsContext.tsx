import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { siteSettingsApi, SiteSetting } from '@/site-settings/site-settings.api-client';

interface SiteSettingsContextType {
  settings: SiteSetting[];
  loading: boolean;
  error: string | null;
  getSetting: (key: string) => string | undefined;
  getSettingsByPrefix: (prefix: string) => SiteSetting[];
  refresh: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await siteSettingsApi.getAll();
      setSettings(data);
    } catch (err) {
      console.error('Error fetching site settings:', err);
      setError('Failed to load site settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const getSetting = useCallback((key: string): string | undefined => {
    const setting = settings.find(s => s.setting_key === key);
    return setting?.setting_value;
  }, [settings]);

  const getSettingsByPrefix = useCallback((prefix: string): SiteSetting[] => {
    return settings.filter(s => s.setting_key.startsWith(prefix));
  }, [settings]);

  const refresh = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  return (
    <SiteSettingsContext.Provider
      value={{
        settings,
        loading,
        error,
        getSetting,
        getSettingsByPrefix,
        refresh,
      }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (context === undefined) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return context;
}
