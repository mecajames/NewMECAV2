import { useNavigate } from 'react-router-dom';
import { CreditCard, FileText, Clock, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/auth';

export default function BillingPage() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  if (!profile || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-xl mb-4">Please sign in to view billing</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Dashboard
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="h-10 w-10 text-orange-500" />
            <h1 className="text-4xl font-bold text-white">Billing</h1>
          </div>
          <p className="text-gray-400">Manage your payments and view invoices</p>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-slate-800 rounded-xl p-12 shadow-lg text-center">
          <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-6">
            <Clock className="h-10 w-10 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Coming Soon</h2>
          <p className="text-gray-400 max-w-md mx-auto mb-8">
            The billing portal is currently under development. Soon you'll be able to view your payment history, manage subscriptions, and download invoices.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <CreditCard className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <h3 className="text-white font-medium mb-1">Payment Methods</h3>
              <p className="text-gray-400 text-sm">Manage your saved cards</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <FileText className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <h3 className="text-white font-medium mb-1">Invoices</h3>
              <p className="text-gray-400 text-sm">Download past invoices</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <Clock className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <h3 className="text-white font-medium mb-1">Subscriptions</h3>
              <p className="text-gray-400 text-sm">Manage your membership</p>
            </div>
          </div>
        </div>

        {/* Current Membership Status */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg mt-6">
          <h2 className="text-xl font-bold text-white mb-4">Current Membership</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Status</p>
              <p className={`text-lg font-semibold capitalize ${
                profile.membership_status === 'active' ? 'text-green-400' : 'text-gray-400'
              }`}>
                {profile.membership_status || 'None'}
              </p>
            </div>
            {profile.membership_expiry && (
              <div className="text-right">
                <p className="text-gray-400 text-sm">Expires</p>
                <p className="text-lg font-semibold text-white">
                  {new Date(profile.membership_expiry).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
