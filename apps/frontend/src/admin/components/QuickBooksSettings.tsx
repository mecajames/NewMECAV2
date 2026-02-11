import { useState, useEffect } from 'react';
import { Link2, Link2Off, RefreshCw, Building2, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface QuickBooksCompanyInfo {
  companyName: string;
  realmId: string;
  isConnected: boolean;
  lastSyncAt?: string;
}

interface QuickBooksStatus {
  connected: boolean;
  company: QuickBooksCompanyInfo | null;
}

export default function QuickBooksSettings() {
  const [status, setStatus] = useState<QuickBooksStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();

    // Check for connection result from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const quickbooksStatus = urlParams.get('quickbooks');
    if (quickbooksStatus === 'connected') {
      // Remove the query param and refresh status
      window.history.replaceState({}, '', window.location.pathname);
      fetchStatus();
    } else if (quickbooksStatus === 'error') {
      setError('Failed to connect QuickBooks. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/quickbooks/status`);
      if (!response.ok) {
        throw new Error('Failed to fetch QuickBooks status');
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching QuickBooks status:', err);
      setError('Failed to check QuickBooks connection status');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = `${API_URL}/api/quickbooks/connect`;
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect QuickBooks? Sales receipts will no longer be created automatically.')) {
      return;
    }

    try {
      setDisconnecting(true);
      const response = await fetch(`${API_URL}/api/quickbooks/disconnect`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect QuickBooks');
      }

      await fetchStatus();
    } catch (err) {
      console.error('Error disconnecting QuickBooks:', err);
      setError('Failed to disconnect QuickBooks');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 text-orange-500 animate-spin" />
          <span className="ml-2 text-gray-400">Loading QuickBooks status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-green-500" />
            QuickBooks Integration
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Connect QuickBooks to automatically create sales receipts for membership payments
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {status?.connected && status.company ? (
        <div className="space-y-4">
          {/* Connected Status */}
          <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div>
              <p className="text-green-400 font-medium">Connected to QuickBooks</p>
              <p className="text-sm text-gray-400">
                Company: <span className="text-white">{status.company.companyName}</span>
              </p>
            </div>
          </div>

          {/* Connection Details */}
          <div className="bg-slate-700 rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Company Name</span>
              <span className="text-white">{status.company.companyName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Realm ID</span>
              <span className="text-white font-mono text-xs">{status.company.realmId}</span>
            </div>
            {status.company.lastSyncAt && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Last Sync</span>
                <span className="text-white">
                  {new Date(status.company.lastSyncAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {disconnecting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Link2Off className="h-4 w-4" />
              )}
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
            <a
              href="https://qbo.intuit.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Open QuickBooks
            </a>
          </div>

          {/* How It Works */}
          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">How it works:</h4>
            <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
              <li>When a membership payment succeeds via Stripe, a sales receipt is automatically created in QuickBooks</li>
              <li>Customer records are created or matched by email address</li>
              <li>Configure QuickBooks Item IDs in Membership Type settings for proper categorization</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Not Connected */}
          <div className="flex items-center gap-2 p-4 bg-slate-700 rounded-lg">
            <Link2Off className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-gray-300 font-medium">Not Connected</p>
              <p className="text-sm text-gray-400">
                Connect your QuickBooks Online account to enable automatic bookkeeping
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Benefits of connecting QuickBooks:</h4>
            <ul className="text-sm text-gray-400 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Automatic sales receipt creation for every membership payment</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Customer records synced automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Accurate financial reporting and tax preparation</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Revenue categorized by membership type</span>
              </li>
            </ul>
          </div>

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
          >
            <Link2 className="h-5 w-5" />
            Connect QuickBooks
          </button>

          {/* Setup Note */}
          <p className="text-xs text-gray-500">
            Note: You'll need QuickBooks Online credentials and admin access to connect.
            Make sure the backend has QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET, and QUICKBOOKS_REDIRECT_URI configured.
          </p>
        </div>
      )}
    </div>
  );
}
