import { Link } from 'react-router-dom';
import { Cookie, Settings } from 'lucide-react';
import { OPEN_CONSENT_PREFERENCES_EVENT } from '@/shared/consent/ConsentBanner';

/**
 * Cookie Notice — the page the Privacy Policy references. Lists the cookies
 * and similar technologies the site actually uses, by category, and lets the
 * visitor re-open the consent preferences dialog at any time.
 */
export default function CookieNoticePage() {
  const openPreferences = () => {
    window.dispatchEvent(new Event(OPEN_CONSENT_PREFERENCES_EVENT));
  };

  const row = (name: string, provider: string, purpose: string, duration: string) => (
    <tr className="border-b border-slate-700/60">
      <td className="px-4 py-3 text-sm font-mono text-orange-300 whitespace-nowrap">{name}</td>
      <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{provider}</td>
      <td className="px-4 py-3 text-sm text-gray-400">{purpose}</td>
      <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">{duration}</td>
    </tr>
  );

  const tableHead = (
    <thead className="bg-slate-800">
      <tr>
        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Provider</th>
        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Purpose</th>
        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Duration</th>
      </tr>
    </thead>
  );

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Cookie className="h-8 w-8 text-orange-500" />
          <h1 className="text-3xl font-bold text-white">Cookie Notice</h1>
        </div>
        <p className="text-gray-400 mb-8">Last updated: July 9, 2026</p>

        <div className="space-y-8">
          <section className="bg-slate-800 rounded-xl p-6">
            <p className="text-gray-300">
              This notice explains the cookies and similar technologies used on mecacaraudio.com,
              what they do, and the choices you have. It supplements our{' '}
              <Link to="/privacy-policy" className="text-orange-500 hover:text-orange-400 underline">Privacy Policy</Link>.
            </p>
            <button
              onClick={openPreferences}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Settings className="h-4 w-4" />
              Manage Cookie Preferences
            </button>
          </section>

          <section className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-2">Strictly Necessary</h2>
            <p className="text-gray-400 text-sm mb-4">
              Required for the site to function — signing in, keeping your cart, taking payments, and
              protecting the site from abuse. These cannot be switched off; without them the site
              simply doesn&apos;t work.
            </p>
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="min-w-[640px] w-full">
                {tableHead}
                <tbody>
                  {row('sb-*-auth-token', 'MECA', 'Keeps you signed in to your member account.', 'Session / persistent')}
                  {row('meca_cookie_consent_v1', 'MECA', 'Remembers your cookie choices so we don’t ask again.', '12 months')}
                  {row('meca_visitor_id', 'MECA', 'Anonymous random id used only to record your consent choice.', 'Persistent')}
                  {row('Cart & preferences storage', 'MECA', 'Shopping cart contents and interface preferences (browser localStorage).', 'Persistent')}
                  {row('__stripe_mid / __stripe_sid', 'Stripe', 'Payment processing and fraud prevention during checkout.', '1 year / 30 min')}
                  {row('PayPal cookies', 'PayPal', 'Payment processing when you pay with PayPal.', 'Varies')}
                  {row('__cf_bm / cf_clearance', 'Security provider (CDN)', 'Security — bot detection and site protection.', '30 min / varies')}
                  {row('_GRECAPTCHA', 'Google reCAPTCHA', 'Spam and abuse prevention on forms (login, contact, applications). Loads only on pages with protected forms.', '6 months')}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-2">Analytics (only with your consent)</h2>
            <p className="text-gray-400 text-sm mb-4">
              Help us understand how the site is used so we can improve it. These cookies are{' '}
              <span className="text-gray-200 font-medium">only set if you allow them</span> in the
              consent banner. If you decline, we receive only anonymous, cookieless statistics that
              cannot identify you.
            </p>
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="min-w-[640px] w-full">
                {tableHead}
                <tbody>
                  {row('_ga', 'Google Analytics', 'Distinguishes visitors for usage statistics.', '2 years')}
                  {row('_ga_*', 'Google Analytics', 'Keeps session state for usage statistics.', '2 years')}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-2">Signed-in Member Activity</h2>
            <p className="text-gray-400 text-sm">
              Separate from cookies: while you are signed in to your member account, the platform
              records which pages you visit as part of providing the membership service (for
              security auditing and improving member features). This is first-party data that is
              never shared with advertisers. See the{' '}
              <Link to="/privacy-policy" className="text-orange-500 hover:text-orange-400 underline">Privacy Policy</Link>{' '}
              for details and how to request deletion of your data.
            </p>
          </section>

          <section className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-2">Your Choices</h2>
            <ul className="list-disc list-inside text-gray-400 text-sm space-y-1.5">
              <li>
                Change your cookie choices any time with the{' '}
                <button onClick={openPreferences} className="text-orange-500 hover:text-orange-400 underline">Manage Cookie Preferences</button>{' '}
                button (also linked in the site footer).
              </li>
              <li>Your browser can also block or delete cookies — note that blocking strictly necessary cookies will break sign-in and checkout.</li>
              <li>
                Questions or data requests: contact us via the{' '}
                <Link to="/member-support" className="text-orange-500 hover:text-orange-400 underline">Support Desk</Link>{' '}
                or the contact details in the Privacy Policy.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
