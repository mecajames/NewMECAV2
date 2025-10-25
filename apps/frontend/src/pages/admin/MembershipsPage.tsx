import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ManageMembershipTypesPage from './ManageMembershipTypesPage';

export default function MembershipsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'types' | 'subscriptions'>('types');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Memberships Management</h1>
            <p className="text-gray-400">Manage membership types and member subscriptions</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </button>
        </div>

        <div className="mb-6 border-b border-slate-700">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('types')}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'types'
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Membership Types
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'subscriptions'
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Member Subscriptions
            </button>
          </nav>
        </div>

        <div>
          {activeTab === 'types' && <ManageMembershipTypesPage />}
          {activeTab === 'subscriptions' && (
            <div className="bg-slate-800 rounded-xl p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-4">Member Subscriptions</h3>
              <p className="text-gray-400">
                View and manage individual member subscription records. This section will display
                all active and expired memberships, renewal dates, and subscription history.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
