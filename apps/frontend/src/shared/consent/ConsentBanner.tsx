import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';
import axios from '@/lib/axios';
import { useSiteSettings } from '@/shared/contexts';
import { updateAnalyticsConsent } from '@/lib/gtag';
import { getStoredConsent, saveConsent, getVisitorId, ConsentState } from './consentStorage';

/** Window event that re-opens the preferences dialog (footer "Cookie Preferences" link). */
export const OPEN_CONSENT_PREFERENCES_EVENT = 'meca:open-consent-preferences';

/**
 * Cookie-consent banner (the site's CMP). Google Consent Mode v2 "advanced":
 * GA4 always runs, but cookieless/denied until the visitor grants analytics
 * here. Choices persist in localStorage and are audit-logged server-side.
 * Admin-managed via site settings (Privacy & Consent): enable/disable + text.
 */
export default function ConsentBanner() {
  const { getSetting, loading } = useSiteSettings();
  const [showBanner, setShowBanner] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefAnalytics, setPrefAnalytics] = useState(true);

  const enabled = getSetting('consent_banner_enabled') !== 'false';
  const title = getSetting('consent_banner_title') || 'We value your privacy';
  const message =
    getSetting('consent_banner_message') ||
    'We use cookies to keep you signed in, process payments, and understand how the site is used. ' +
    'Analytics cookies are only set if you allow them — declining still lets you use everything on the site.';

  // Apply the stored/derived consent once settings are known.
  useEffect(() => {
    if (loading) return;
    if (!enabled) {
      // Banner turned off by the admin: analytics runs as before (site
      // owner's explicit choice in Privacy & Consent settings).
      updateAnalyticsConsent(true);
      setShowBanner(false);
      return;
    }
    const stored = getStoredConsent();
    if (stored) {
      updateAnalyticsConsent(stored.analytics);
      setShowBanner(false);
    } else {
      setShowBanner(true);
    }
  }, [loading, enabled]);

  // Footer "Cookie Preferences" link re-opens the dialog any time.
  useEffect(() => {
    const open = () => {
      const stored = getStoredConsent();
      setPrefAnalytics(stored ? stored.analytics : true);
      setShowPrefs(true);
    };
    window.addEventListener(OPEN_CONSENT_PREFERENCES_EVENT, open);
    return () => window.removeEventListener(OPEN_CONSENT_PREFERENCES_EVENT, open);
  }, []);

  const applyChoice = (choice: ConsentState['choice'], analytics: boolean, functional: boolean) => {
    saveConsent({ choice, analytics, functional });
    updateAnalyticsConsent(analytics);
    // Audit log — fire-and-forget; consent applies regardless.
    axios.post('/api/consent-log', {
      visitorId: getVisitorId(),
      choice,
      analytics,
      functional,
    }).catch(() => {});
    setShowBanner(false);
    setShowPrefs(false);
  };

  if (!enabled || (!showBanner && !showPrefs)) return null;

  return (
    <>
      {/* Bottom banner */}
      {showBanner && !showPrefs && (
        <div className="fixed bottom-0 inset-x-0 z-[70] p-3 sm:p-4">
          <div className="max-w-4xl mx-auto bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Cookie className="h-6 w-6 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold">{title}</h3>
                <p className="text-gray-300 text-sm mt-1">
                  {message}{' '}
                  <Link to="/cookie-notice" className="text-orange-400 hover:text-orange-300 underline">Cookie Notice</Link>
                  {' · '}
                  <Link to="/privacy-policy" className="text-orange-400 hover:text-orange-300 underline">Privacy Policy</Link>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => applyChoice('accepted_all', true, true)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={() => applyChoice('necessary_only', false, false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Necessary Only
                  </button>
                  <button
                    onClick={() => { setPrefAnalytics(true); setShowPrefs(true); }}
                    className="px-4 py-2 text-gray-300 hover:text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Cookie Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preferences dialog */}
      {showPrefs && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Cookie className="h-5 w-5 text-orange-500" />
                Cookie Preferences
              </h3>
              <button
                onClick={() => setShowPrefs(false)}
                className="text-gray-400 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium">Strictly Necessary</span>
                  <span className="text-xs text-gray-400 bg-slate-600 px-2 py-0.5 rounded-full">Always on</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Sign-in sessions, shopping cart, payment processing (Stripe/PayPal), security and
                  fraud prevention. The site cannot function without these.
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium">Analytics</span>
                  <button
                    onClick={() => setPrefAnalytics(!prefAnalytics)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${prefAnalytics ? 'bg-orange-600' : 'bg-slate-600'}`}
                    role="switch"
                    aria-checked={prefAnalytics}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 bg-white rounded-full transition-all ${prefAnalytics ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Google Analytics cookies that help us understand how the site is used. When off,
                  only anonymous, cookieless statistics are collected.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => applyChoice('accepted_all', true, true)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Accept All
              </button>
              <button
                onClick={() => applyChoice(prefAnalytics ? 'custom' : 'necessary_only', prefAnalytics, prefAnalytics)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
