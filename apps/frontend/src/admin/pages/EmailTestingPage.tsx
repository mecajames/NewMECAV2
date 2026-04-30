import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Send, Loader2, CheckCircle2, AlertTriangle, User, Users, FileText } from 'lucide-react';
import axios from '@/lib/axios';
import { useAuth } from '@/auth/contexts/AuthContext';

type TestResult = {
  scope: string;
  target: string;
  success: boolean;
  sent?: string[];
  error?: string;
  timestamp: string;
};

export default function EmailTestingPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const myEmail = profile?.email || '';

  const [customEmail, setCustomEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);

  const log = (entry: TestResult) => {
    setResults(prev => [entry, ...prev].slice(0, 20));
  };

  const runAlertTest = async (scope: string, target: string, body: { email?: string }) => {
    setBusy(scope);
    try {
      const res = await axios.post('/api/admin-notifications/test', body);
      log({
        scope,
        target,
        success: true,
        sent: res.data?.sent || [],
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      log({
        scope,
        target,
        success: false,
        error: err.response?.data?.message || err.message || 'Unknown error',
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setBusy(null);
    }
  };

  const runDigestTest = async (scope: string, target: string, body: { email?: string }) => {
    setBusy(scope);
    try {
      await axios.post('/api/admin-notifications/test-digest', body);
      log({
        scope,
        target,
        success: true,
        sent: ['Weekly Digest (sample)'],
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      log({
        scope,
        target,
        success: false,
        error: err.response?.data?.message || err.message || 'Unknown error',
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Mail className="h-8 w-8 text-orange-400" />
              Email Testing
            </h1>
            <p className="text-gray-400 mt-2">
              Diagnose admin email delivery. Each test sends 5 sample admin alerts (membership, shop order, renewal, cancellations).
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>

        {/* Explanation */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">What these tests tell you</h2>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex gap-2"><span className="text-orange-400">•</span><span><strong className="text-white">Send to me</strong> — sends to the email on your admin account, bypassing the admin lookup. If this works, the email service itself is fine.</span></li>
            <li className="flex gap-2"><span className="text-orange-400">•</span><span><strong className="text-white">Send to all admins</strong> — uses the backend's actual admin lookup. If this fails but "Send to me" works, the lookup is broken (the suspected role-mismatch bug).</span></li>
            <li className="flex gap-2"><span className="text-orange-400">•</span><span><strong className="text-white">Send to custom email</strong> — useful to test deliverability to a specific inbox (gmail, outlook, etc).</span></li>
            <li className="flex gap-2"><span className="text-orange-400">•</span><span><strong className="text-white">Weekly digest</strong> — sends the Monday-morning summary email so you can verify formatting and the data inside.</span></li>
          </ul>
        </div>

        {/* Test Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Send to Me */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <User className="h-6 w-6 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Send to Me</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Sends 5 sample admin alerts to <span className="text-white font-mono">{myEmail || '(unknown)'}</span>.
              Bypasses the admin lookup.
            </p>
            <button
              onClick={() => runAlertTest('me-alerts', myEmail, { email: myEmail })}
              disabled={!myEmail || busy !== null}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {busy === 'me-alerts' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send 5 Sample Alerts
            </button>
            <button
              onClick={() => runDigestTest('me-digest', myEmail, { email: myEmail })}
              disabled={!myEmail || busy !== null}
              className="w-full mt-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {busy === 'me-digest' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Send Weekly Digest Sample
            </button>
          </div>

          {/* Send to All Admins */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Users className="h-6 w-6 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">Send to All Admins</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Uses the actual <span className="text-white font-mono">getAdminEmails()</span> lookup.
              Tests the production path.
            </p>
            <button
              onClick={() => runAlertTest('all-alerts', 'all admins', {})}
              disabled={busy !== null}
              className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {busy === 'all-alerts' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send 5 Sample Alerts
            </button>
            <button
              onClick={() => runDigestTest('all-digest', 'all admins', {})}
              disabled={busy !== null}
              className="w-full mt-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {busy === 'all-digest' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Send Weekly Digest Sample
            </button>
          </div>
        </div>

        {/* Custom Email */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Mail className="h-6 w-6 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Send to Custom Email</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Test deliverability to any specific inbox.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <button
              onClick={() => runAlertTest('custom-alerts', customEmail, { email: customEmail })}
              disabled={!customEmail || busy !== null}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              {busy === 'custom-alerts' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Alerts
            </button>
            <button
              onClick={() => runDigestTest('custom-digest', customEmail, { email: customEmail })}
              disabled={!customEmail || busy !== null}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              {busy === 'custom-digest' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Send Digest
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Test Runs</h2>
            {results.length > 0 && (
              <button
                onClick={() => setResults([])}
                className="text-gray-400 hover:text-white text-sm"
              >
                Clear
              </button>
            )}
          </div>
          {results.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              No tests run yet. Click a button above to send a test email.
            </p>
          ) : (
            <div className="space-y-3">
              {results.map((r, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg p-4 border ${
                    r.success
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {r.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-white font-medium text-sm">
                          {r.success ? 'Sent' : 'Failed'} — {r.scope}
                        </p>
                        <span className="text-gray-500 text-xs whitespace-nowrap">{r.timestamp}</span>
                      </div>
                      <p className="text-gray-400 text-xs mt-1">
                        Target: <span className="font-mono text-gray-300">{r.target || '(default admins)'}</span>
                      </p>
                      {r.success && r.sent && r.sent.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {r.sent.map((s, i) => (
                            <li key={i} className="text-xs text-gray-400 font-mono truncate">{s}</li>
                          ))}
                        </ul>
                      )}
                      {!r.success && r.error && (
                        <p className="text-red-300 text-xs mt-2 font-mono break-all">{r.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
